"use client";

import { useEffect, useState } from "react";
import { formatClock, formatMinutes } from "@/lib/utils";
import { CheckIcon, PlayIcon, PauseIcon, XIcon } from "@/components/icons";

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
      <div className="mt-3 w-full">
        <div className="flex items-center justify-between font-mono text-xs text-muted">
          <span className="tabular-nums">
            {formatMinutes(todaySeconds)} of {goalMinutes}m
          </span>
          {goalReached && (
            <span className="inline-flex items-center gap-1 font-medium text-accent-soft">
              <CheckIcon size={13} /> Goal met
            </span>
          )}
        </div>
        <div className="neu-track mt-1.5 h-2 w-full overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </div>
    ) : (
      <p className="mt-3 font-mono text-[11px] text-muted">
        {formatMinutes(todaySeconds)} today
      </p>
    );

  const statusLabel =
    phase === "running"
      ? "Focusing"
      : phase === "paused"
        ? "Paused"
        : "Ready to focus";

  // Transport availability per phase.
  const canPlay = phase !== "running"; // start (idle) or resume (paused)
  const canPause = phase === "running";
  const canLog = phase === "running" || phase === "paused";

  return (
    <section
      className={`card flex flex-col items-center rounded-3xl bg-tint px-4 py-3.5 ${
        phase === "running" ? "timer-running" : ""
      } ${celebrating ? "celebrate-bloom" : ""}`}
    >
      {/* Skeuomorphic LCD screen: recessed panel, faint sheen, big mono digits. */}
      <div className="neu-screen relative w-full rounded-2xl px-5 pb-3.5 pt-3">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          {statusLabel}
        </p>
        <div
          className={`text-center font-mono text-5xl font-medium tabular-nums tracking-tight transition-colors duration-500 ${
            phase === "running" ? "text-accent-soft" : "text-text"
          }`}
        >
          {formatClock(elapsed)}
        </div>
      </div>

      {labeling ? (
        <div className="mt-3 flex w-full flex-col items-center gap-2.5">
          <input
            autoFocus
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmStop()}
            placeholder="What did you work on? (optional)"
            className="min-h-12 w-full rounded-xl bg-tint px-4 text-center font-mono text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={confirmStop}
            className="neu-btn press min-h-12 w-full rounded-xl px-8 font-mono text-sm font-medium uppercase tracking-[0.1em]"
          >
            Save session
          </button>
          <button
            onClick={() => setLabeling(false)}
            className="font-mono text-xs uppercase tracking-[0.1em] text-muted hover:text-text"
          >
            Back
          </button>
        </div>
      ) : (
        <>
          {/* Transport row: play / pause / check, each a soft raised pill. */}
          <div className="mt-3 grid w-full grid-cols-3 gap-2.5">
            <TransportButton
              label={phase === "paused" ? "Resume" : "Start"}
              onClick={phase === "idle" ? onStart : onResume}
              disabled={!canPlay}
            >
              <PlayIcon size={20} />
            </TransportButton>
            <TransportButton label="Pause" onClick={onPause} disabled={!canPause}>
              <PauseIcon size={20} />
            </TransportButton>
            <TransportButton
              label="Log session"
              onClick={() => setLabeling(true)}
              disabled={!canLog}
            >
              <CheckIcon size={20} />
            </TransportButton>
          </div>

          {canLog && (
            <button
              onClick={onCancel}
              className="mt-2.5 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted hover:text-text"
            >
              <XIcon size={13} /> Cancel
            </button>
          )}
        </>
      )}

      {progress}
    </section>
  );
}

function TransportButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="neu-btn press flex min-h-12 items-center justify-center rounded-xl text-text disabled:cursor-not-allowed disabled:text-muted disabled:opacity-45 disabled:shadow-none"
    >
      {children}
    </button>
  );
}
