"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { runOrQueue } from "@/lib/offline-queue";
import { dateInTz } from "@/lib/utils";

type Phase = "idle" | "running" | "paused";

// A paused timer is persisted here (the profile only stores a *running* start).
// Pausing nulls the DB start — otherwise a reload would resurrect the timer as
// running and silently count the paused gap as focus — and stashes the frozen
// elapsed locally so the same device can restore the paused session.
const PAUSE_KEY = "keystone:timer-paused";

type PausedState = { elapsed: number; startMs: number };

function readPaused(): PausedState | null {
  try {
    const raw = localStorage.getItem(PAUSE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PausedState;
    return typeof parsed.elapsed === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function clearPaused() {
  try {
    localStorage.removeItem(PAUSE_KEY);
  } catch {}
}

// `timer_started_at` on the profile is the *effective* start: elapsed is always
// now - effectiveStart while running. Pausing freezes the elapsed value and,
// on resume, we shift the effective start forward so the math stays simple and
// survives page reloads / device switches.
export function useTimer(
  userId: string,
  initialStartedAt: string | null,
  initialTodaySeconds: number,
  timezone: string,
) {
  const [phase, setPhase] = useState<Phase>(
    initialStartedAt ? "running" : "idle",
  );
  const [effectiveStart, setEffectiveStart] = useState<number | null>(
    initialStartedAt ? new Date(initialStartedAt).getTime() : null,
  );
  const [frozenElapsed, setFrozenElapsed] = useState(0);
  const [todaySeconds, setTodaySeconds] = useState(initialTodaySeconds);
  const [supabase] = useState(() => createClient());

  // Restore a paused session after reload. Runs once on mount (localStorage is
  // browser-only, so this can't be done in the initializers without a
  // hydration mismatch). A running DB timer wins over a stale pause marker.
  useEffect(() => {
    if (initialStartedAt) {
      clearPaused();
      return;
    }
    const saved = readPaused();
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only restore
      setPhase("paused");
      setFrozenElapsed(saved.elapsed);
      if (typeof saved.startMs === "number") setEffectiveStart(saved.startMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only restore
  }, []);

  const start = useCallback(async () => {
    const now = Date.now();
    setEffectiveStart(now);
    setFrozenElapsed(0);
    setPhase("running");
    clearPaused();
    await runOrQueue(supabase, {
      table: "profiles",
      op: "update",
      payload: { timer_started_at: new Date(now).toISOString() },
      match: { id: userId },
    });
  }, [supabase, userId]);

  const pause = useCallback(async () => {
    if (effectiveStart == null) return;
    const elapsed = Math.floor((Date.now() - effectiveStart) / 1000);
    setFrozenElapsed(elapsed);
    setPhase("paused");
    try {
      localStorage.setItem(
        PAUSE_KEY,
        JSON.stringify({ elapsed, startMs: effectiveStart } satisfies PausedState),
      );
    } catch {}
    await runOrQueue(supabase, {
      table: "profiles",
      op: "update",
      payload: { timer_started_at: null },
      match: { id: userId },
    });
  }, [effectiveStart, supabase, userId]);

  const resume = useCallback(async () => {
    const newStart = Date.now() - frozenElapsed * 1000;
    setEffectiveStart(newStart);
    setPhase("running");
    clearPaused();
    await runOrQueue(supabase, {
      table: "profiles",
      op: "update",
      payload: { timer_started_at: new Date(newStart).toISOString() },
      match: { id: userId },
    });
  }, [frozenElapsed, supabase, userId]);

  const stop = useCallback(
    async (label: string) => {
      const seconds =
        phase === "running" && effectiveStart != null
          ? Math.floor((Date.now() - effectiveStart) / 1000)
          : frozenElapsed;
      const startMs = effectiveStart ?? Date.now() - seconds * 1000;
      const startedAtIso = new Date(startMs).toISOString();
      const sessionDate = dateInTz(startMs, timezone);

      setPhase("idle");
      setEffectiveStart(null);
      setFrozenElapsed(0);
      clearPaused();
      // Only credit today's running total when the session is actually attributed
      // to today. A timer left running past midnight belongs to the start date.
      if (seconds > 0 && sessionDate === dateInTz(Date.now(), timezone))
        setTodaySeconds((s) => s + seconds);

      if (seconds > 0) {
        await runOrQueue(supabase, {
          table: "focus_sessions",
          op: "insert",
          payload: {
            // Client-generated id so a double replay from the offline queue
            // (e.g. two tabs flushing) collides on the PK instead of
            // duplicating the session.
            id: crypto.randomUUID(),
            user_id: userId,
            started_at: startedAtIso,
            duration_seconds: seconds,
            label: label.trim() || null,
            date: sessionDate,
          },
        });
      }
      await runOrQueue(supabase, {
        table: "profiles",
        op: "update",
        payload: { timer_started_at: null, timer_label: null },
        match: { id: userId },
      });
    },
    [effectiveStart, frozenElapsed, phase, supabase, userId, timezone],
  );

  // Keep today's running total in sync when a session logged today is deleted
  // from the history view (delta is negative).
  const adjustToday = useCallback((delta: number) => {
    setTodaySeconds((s) => Math.max(0, s + delta));
  }, []);

  const cancel = useCallback(async () => {
    setPhase("idle");
    setEffectiveStart(null);
    setFrozenElapsed(0);
    clearPaused();
    await runOrQueue(supabase, {
      table: "profiles",
      op: "update",
      payload: { timer_started_at: null, timer_label: null },
      match: { id: userId },
    });
  }, [supabase, userId]);

  return {
    phase,
    effectiveStart,
    frozenElapsed,
    todaySeconds,
    start,
    pause,
    resume,
    stop,
    cancel,
    adjustToday,
  };
}
