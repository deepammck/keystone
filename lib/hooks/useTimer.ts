"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { runOrQueue } from "@/lib/offline-queue";

type Phase = "idle" | "running" | "paused";

// `timer_started_at` on the profile is the *effective* start: elapsed is always
// now - effectiveStart while running. Pausing freezes the elapsed value and,
// on resume, we shift the effective start forward so the math stays simple and
// survives page reloads / device switches.
export function useTimer(
  userId: string,
  initialStartedAt: string | null,
  initialTodaySeconds: number,
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

  const start = useCallback(async () => {
    const now = Date.now();
    setEffectiveStart(now);
    setFrozenElapsed(0);
    setPhase("running");
    await runOrQueue(supabase, {
      table: "profiles",
      op: "update",
      payload: { timer_started_at: new Date(now).toISOString() },
      match: { id: userId },
    });
  }, [supabase, userId]);

  const pause = useCallback(() => {
    if (effectiveStart == null) return;
    setFrozenElapsed(Math.floor((Date.now() - effectiveStart) / 1000));
    setPhase("paused");
  }, [effectiveStart]);

  const resume = useCallback(async () => {
    const newStart = Date.now() - frozenElapsed * 1000;
    setEffectiveStart(newStart);
    setPhase("running");
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
      const startedAtIso = new Date(
        effectiveStart ?? Date.now() - seconds * 1000,
      ).toISOString();

      setPhase("idle");
      setEffectiveStart(null);
      setFrozenElapsed(0);
      if (seconds > 0) setTodaySeconds((s) => s + seconds);

      if (seconds > 0) {
        await runOrQueue(supabase, {
          table: "focus_sessions",
          op: "insert",
          payload: {
            user_id: userId,
            started_at: startedAtIso,
            duration_seconds: seconds,
            label: label.trim() || null,
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
    [effectiveStart, frozenElapsed, phase, supabase, userId],
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
