"use client";

import { useEffect, useState } from "react";
import { formatClock, formatMinutes } from "@/lib/utils";

type Phase = "idle" | "running" | "paused";

type Props = {
  phase: Phase;
  effectiveStart: number | null;
  frozenElapsed: number;
  todaySeconds: number;
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
          {phase === "idle" && (
            <button
              onClick={onStart}
              className="press btn-accent min-h-11 rounded-lg bg-accent px-10 font-medium text-on-accent"
            >
              Start
            </button>
          )}
          {phase !== "idle" && (
            <>
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
            </>
          )}
        </div>
      )}

      <p className="mt-6 text-sm text-muted">
        {formatMinutes(todaySeconds)} today
      </p>
    </section>
  );
}
