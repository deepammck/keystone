"use client";

import { useEffect, useState } from "react";
import { formatClock, formatMinutes } from "@/lib/utils";

type Phase = "idle" | "running" | "paused";

type Props = {
  phase: Phase;
  effectiveStart: number | null;
  frozenElapsed: number;
  todaySeconds: number;
  goalMinutes: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: (label: string) => void;
  onCancel: () => void;
  celebrating: boolean;
};

export function FocusTimer({
  phase,
  effectiveStart,
  frozenElapsed,
  todaySeconds,
  goalMinutes,
  onStart,
  onPause,
  onResume,
  onStop,
  onCancel,
  celebrating,
}: Props) {
  const [labeling, setLabeling] = useState(false);
  const [label, setLabel] = useState("");
  const [now, setNow] = useState<number | null>(null);

  // Sample the wall clock every second only while running, so the per-second
  // re-render is confined to this component instead of the whole dashboard.
  // `now` feeds the pure elapsed derivation so Date.now() never runs in render.
  useEffect(() => {
    if (phase !== "running" || effectiveStart == null) return;
    // Seed the first sample from the wall clock so the display doesn't lag 1s.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase, effectiveStart]);

  const elapsed =
    phase === "running" && effectiveStart != null && now != null
      ? Math.max(0, Math.floor((now - effectiveStart) / 1000))
      : phase === "paused"
        ? frozenElapsed
        : 0;

  function confirmStop() {
    onStop(label);
    setLabel("");
    setLabeling(false);
  }

  // Today's progress toward the daily focus goal, shown as a slim bar so the
  // hero action carries a sense of "how far am I". Falls back to a plain total
  // when no goal is set.
  const goalSeconds = goalMinutes * 60;
  const goalPct =
    goalSeconds > 0 ? Math.min(100, (todaySeconds / goalSeconds) * 100) : 0;
  const goalReached = goalSeconds > 0 && todaySeconds >= goalSeconds;
  const progress =
    goalSeconds > 0 ? (
      <div className="mt-1 w-full max-w-xs">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="tabular-nums">
            {formatMinutes(todaySeconds)} of {goalMinutes}m
          </span>
          {goalReached && (
            <span className="font-medium text-accent-soft">Goal met ✓</span>
          )}
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </div>
    ) : (
      <p className="text-xs text-muted">{formatMinutes(todaySeconds)} today</p>
    );

  // At rest the card collapses around a hero "Start" button — no dominant empty
  // 00:00. The tall, breathing treatment is reserved for an actual session.
  if (phase === "idle") {
    return (
      <section
        className={`card flex flex-col items-center gap-3 rounded-2xl bg-tint px-6 py-6 text-center ${
          celebrating ? "celebrate-bloom" : ""
        }`}
      >
        <p className="text-sm text-muted">Ready to focus?</p>
        <button
          onClick={onStart}
          className="press btn-accent flex min-h-12 items-center gap-2 rounded-xl bg-accent px-12 text-base font-semibold text-on-accent"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M7 5v14l12-7z" />
          </svg>
          Start
        </button>
        {progress}
      </section>
    );
  }

  return (
    <section
      className={`card rounded-2xl bg-tint px-6 py-5 text-center ${
        phase === "running" ? "timer-running" : ""
      } ${celebrating ? "celebrate-bloom" : ""}`}
    >
      <div
        className={`text-4xl font-semibold tabular-nums tracking-tight transition-colors duration-500 sm:text-5xl ${
          phase === "running" ? "text-accent-soft" : ""
        }`}
      >
        {formatClock(elapsed)}
      </div>

      {labeling ? (
        <div className="mt-4 flex flex-col items-center gap-3">
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmStop()}
            placeholder="What did you work on? (optional)"
            className="min-h-11 w-full max-w-xs rounded-lg bg-bg px-4 text-center outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
          />
          <button
            onClick={confirmStop}
            className="press min-h-11 rounded-lg bg-text px-8 font-medium text-bg"
          >
            Save session
          </button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            onClick={phase === "running" ? onPause : onResume}
            className="press btn-accent min-h-11 rounded-lg bg-accent px-10 font-medium text-on-accent"
          >
            {phase === "running" ? "Pause" : "Resume"}
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setLabeling(true)}
              className="press min-h-11 rounded-lg border border-border px-6 text-sm font-medium hover:bg-tint-strong"
            >
              Log
            </button>
            <button
              onClick={onCancel}
              className="press min-h-11 rounded-lg border border-border px-6 text-sm font-medium text-muted hover:bg-tint-strong hover:text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-center">{progress}</div>
    </section>
  );
}
