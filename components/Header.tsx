"use client";

import {
  formatHeaderDate,
  formatMinutes,
  formatTime24InTz,
  isSleepTime,
  minutesIntoDayInTz,
  wakingPercentLeft,
} from "@/lib/utils";
import { useNow } from "@/lib/hooks/useNow";

type Props = {
  timezone: string;
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

  return (
    <header className="flex items-start justify-between">
      <div>
        <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
          {now ? formatHeaderDate(timezone, now) : ""}
          {now ? ` · ${formatTime24InTz(timezone, now)}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {completedTasks}/{totalTasks} tasks · {formatMinutes(focusSeconds)}{" "}
          focused · {doneHabits}/{totalHabits} habits
          {now
            ? isSleepTime(
                minutesIntoDayInTz(timezone, now),
                wakeMinute,
                sleepMinute,
              )
              ? " · Go to sleep"
              : ` · ${wakingPercentLeft(
                  minutesIntoDayInTz(timezone, now),
                  wakeMinute,
                  sleepMinute,
                )}% of day left`
            : ""}
        </p>
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
