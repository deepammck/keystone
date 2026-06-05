"use client";

import {
  formatLongDate,
  formatMinutes,
  formatTime24InTz,
  isSleepTime,
  minutesIntoDayInTz,
  wakingPercentLeft,
} from "@/lib/utils";
import { useNow } from "@/lib/hooks/useNow";

type Props = {
  timezone: string;
  today: string;
  completedTasks: number;
  totalTasks: number;
  focusSeconds: number;
  doneHabits: number;
  totalHabits: number;
  wakeMinute: number;
  sleepMinute: number;
  onOpenSettings: () => void;
};

export function Header({
  timezone,
  today,
  completedTasks,
  totalTasks,
  focusSeconds,
  doneHabits,
  totalHabits,
  wakeMinute,
  sleepMinute,
  onOpenSettings,
}: Props) {
  const now = useNow(60000);

  // The date is anchored to the canonical `today` (same value the rest of the
  // app keys off) so it can never drift a day apart from the Notepad; only the
  // clock time ticks from the live wall clock.
  const sleeping =
    now != null &&
    isSleepTime(minutesIntoDayInTz(timezone, now), wakeMinute, sleepMinute);
  const pctLeft =
    now != null
      ? wakingPercentLeft(
          minutesIntoDayInTz(timezone, now),
          wakeMinute,
          sleepMinute,
        )
      : null;

  return (
    <header className="flex items-start justify-between">
      <div>
        {/* The date is orienting context, not the hero — kept to a quiet overline
            so the eye lands on the progress chips (and the work below) first. */}
        <h1 className="font-serif text-[15px] font-medium tracking-wide text-muted">
          {formatLongDate(today)}
          {now != null ? ` · ${formatTime24InTz(timezone, now)}` : ""}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Chip icon={<TaskIcon />}>
            {completedTasks}/{totalTasks} tasks
          </Chip>
          <Chip icon={<ClockIcon />}>{formatMinutes(focusSeconds)} focused</Chip>
          <Chip icon={<HabitIcon />}>
            {doneHabits}/{totalHabits} habits
          </Chip>
          {pctLeft != null && (
            <Chip icon={<SunIcon />} emphasis>
              {sleeping ? "Time to sleep" : `${pctLeft}% of day left`}
            </Chip>
          )}
        </div>
      </div>
      <button
        aria-label="Settings"
        onClick={onOpenSettings}
        className="press mt-1 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint hover:text-text hover:[&_svg]:rotate-45 [&_svg]:transition-transform [&_svg]:duration-300"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </header>
  );
}

// Small header metric. The day-left chip is the motivating number, so it gets
// the filled-accent treatment while the counts stay quiet on tint.
function Chip({
  icon,
  children,
  emphasis = false,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${
        emphasis
          ? "bg-accent text-on-accent"
          : "bg-tint text-muted [&_svg]:text-accent-soft"
      }`}
    >
      <span className="shrink-0 [&_svg]:block">{icon}</span>
      {children}
    </span>
  );
}

function TaskIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function HabitIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  );
}
