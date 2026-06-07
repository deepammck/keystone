"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addWeeks,
  weekDatesFromStart,
  formatWeekRange,
  formatDayLabel,
  formatMinutes,
} from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKS = 6;

// Per-day combined-activity score. Each signal contributes 0..1, so points
// land in [0,3]; tweak the caps/weights here to retune intensity.
const TASK_CAP = 5; // tasks at/above this count max out the task signal
const FOCUS_CAP_H = 2; // hours of focus that max out the focus signal

// Tailwind needs whole class strings (no runtime concatenation), so map each
// intensity level to a static class. 0 = empty, 4 = fullest.
const LEVEL_CLASS = [
  "bg-tint-strong border border-border/50",
  "bg-accent/30",
  "bg-accent/55",
  "bg-accent/80",
  "bg-accent shadow-[0_0_8px] shadow-accent/40",
];

type Props = {
  userId: string;
  today: string;
  currentWeekStart: string;
  totalHabits: number;
  // Live overlay so today's cell reflects the in-session state immediately.
  todayFocusSeconds: number;
  todayTasksCompleted: number;
  todayHabitsDone: number;
};

type DayStats = { focusSeconds: number; tasks: number; habits: number };

function HeatmapInner({
  userId,
  today,
  currentWeekStart,
  totalHabits,
  todayFocusSeconds,
  todayTasksCompleted,
  todayHabitsDone,
}: Props) {
  const [supabase] = useState(() => createClient());
  // Which week-start anchors the bottom row of the grid.
  const [windowEndWeek, setWindowEndWeek] = useState(currentWeekStart);
  const [stats, setStats] = useState<Record<string, DayStats>>({});
  // The window whose data is currently in `stats`; the grid is "loading"
  // whenever this lags the selected window (avoids setState-in-effect).
  const [loadedWindow, setLoadedWindow] = useState<string | null>(null);

  const firstWeek = addWeeks(windowEndWeek, -(WEEKS - 1));
  const isCurrentWindow = windowEndWeek === currentWeekStart;
  const loading = loadedWindow !== windowEndWeek;

  // The 6 week rows (oldest on top), each a Mon..Sun list of ISO dates.
  const weeks = useMemo(
    () => Array.from({ length: WEEKS }, (_, i) =>
      weekDatesFromStart(addWeeks(windowEndWeek, -(WEEKS - 1 - i))),
    ),
    [windowEndWeek],
  );

  const allDates = useMemo(() => weeks.flat(), [weeks]);

  useEffect(() => {
    let cancelled = false;
    const rangeStart = firstWeek;
    const rangeEnd = addWeeks(windowEndWeek, 1);
    Promise.all([
      supabase
        .from("focus_sessions")
        .select("duration_seconds, date")
        .eq("user_id", userId)
        .gte("date", rangeStart)
        .lt("date", rangeEnd),
      supabase
        .from("tasks")
        .select("date")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("date", rangeStart)
        .lt("date", rangeEnd),
      supabase
        .from("habit_logs")
        .select("date")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("date", rangeStart)
        .lt("date", rangeEnd),
    ]).then(([focusRes, tasksRes, logsRes]) => {
      if (cancelled) return;
      const out: Record<string, DayStats> = {};
      const get = (d: string) =>
        (out[d] ??= { focusSeconds: 0, tasks: 0, habits: 0 });
      for (const r of (focusRes.data ?? []) as {
        duration_seconds: number;
        date: string;
      }[]) {
        get(r.date).focusSeconds += r.duration_seconds;
      }
      for (const r of (tasksRes.data ?? []) as { date: string }[]) {
        get(r.date).tasks += 1;
      }
      for (const r of (logsRes.data ?? []) as { date: string }[]) {
        get(r.date).habits += 1;
      }
      setStats(out);
      setLoadedWindow(windowEndWeek);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, windowEndWeek, firstWeek]);

  // Memoize all per-cell computations so changes to only one live counter
  // (e.g. todayFocusSeconds ticking every second) don't recompute every cell.
  const cellData = useMemo(() => {
    return weeks.flatMap((week) => week.map((d) => {
      const base = stats[d] ?? { focusSeconds: 0, tasks: 0, habits: 0 };
      const s: DayStats = (d === today && isCurrentWindow)
        ? { focusSeconds: todayFocusSeconds, tasks: todayTasksCompleted, habits: todayHabitsDone }
        : base;
      const points =
        Math.min(s.tasks, TASK_CAP) / TASK_CAP +
        Math.min(s.focusSeconds / 3600, FOCUS_CAP_H) / FOCUS_CAP_H +
        (totalHabits ? Math.min(s.habits, totalHabits) / totalHabits : 0);
      const lvl = points === 0 ? 0 : Math.min(4, Math.ceil((points / 3) * 4));
      return { d, s, lvl, future: d > today };
    }));
  }, [weeks, stats, today, isCurrentWindow, todayFocusSeconds, todayTasksCompleted, todayHabitsDone, totalHabits]);

  const streak = useMemo(() => {
    let count = 0;
    for (let i = allDates.length - 1; i >= 0; i--) {
      const d = allDates[i];
      if (d > today) continue;
      const base = stats[d] ?? { focusSeconds: 0, tasks: 0, habits: 0 };
      const s: DayStats = (d === today && isCurrentWindow)
        ? { focusSeconds: todayFocusSeconds, tasks: todayTasksCompleted, habits: todayHabitsDone }
        : base;
      const points =
        Math.min(s.tasks, TASK_CAP) / TASK_CAP +
        Math.min(s.focusSeconds / 3600, FOCUS_CAP_H) / FOCUS_CAP_H +
        (totalHabits ? Math.min(s.habits, totalHabits) / totalHabits : 0);
      if (points > 0) count++;
      else break;
    }
    return count;
  }, [allDates, stats, today, isCurrentWindow, todayFocusSeconds, todayTasksCompleted, todayHabitsDone, totalHabits]);

  const { thisWeek, windowTotals } = useMemo(() => {
    const currentWeekDates = weekDatesFromStart(currentWeekStart);
    let twTasks = 0, twFocus = 0, wtTasks = 0, wtFocus = 0;
    for (const cell of cellData) {
      if (!cell.future) {
        wtTasks += cell.s.tasks;
        wtFocus += cell.s.focusSeconds;
        if (currentWeekDates.includes(cell.d)) {
          twTasks += cell.s.tasks;
          twFocus += cell.s.focusSeconds;
        }
      }
    }
    return {
      thisWeek: { tasks: twTasks, focusSeconds: twFocus },
      windowTotals: { tasks: wtTasks, focusSeconds: wtFocus },
    };
  }, [cellData, currentWeekStart]);

  return (
    <section>
      <div className="card rounded-2xl bg-tint px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Progress</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">
              {formatWeekRange(firstWeek).split(" – ")[0]} –{" "}
              {formatWeekRange(windowEndWeek).split(" – ")[1]}
            </span>
            <button
              onClick={() => setWindowEndWeek((w) => addWeeks(w, -WEEKS))}
              className="grid h-11 w-11 place-items-center text-muted transition-colors hover:text-text"
              aria-label="Earlier weeks"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={() => setWindowEndWeek((w) => addWeeks(w, WEEKS))}
              disabled={isCurrentWindow}
              className="grid h-11 w-11 place-items-center text-muted transition-colors hover:text-text disabled:opacity-30 disabled:hover:text-muted"
              aria-label="Later weeks"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
          <div className={loading ? "opacity-40 transition-opacity" : "transition-opacity"}>
            <div className="grid w-max grid-cols-7 gap-2">
              {DAY_LABELS.map((label, i) => (
                <span key={i} className="w-4 text-center text-2xs text-muted">
                  {label}
                </span>
              ))}
              {cellData.map(({ d, s, lvl, future }) => (
                <span
                  key={d}
                  title={
                    future
                      ? formatDayLabel(d)
                      : `${formatDayLabel(d)} · ${s.tasks} tasks · ${formatMinutes(
                          s.focusSeconds,
                        )} · ${s.habits}/${totalHabits} habits`
                  }
                  className={`h-4 w-4 rounded transition-all ${
                    future
                      ? "border border-border/50 bg-tint-strong opacity-40"
                      : LEVEL_CLASS[lvl]
                  }`}
                />
              ))}
            </div>

            {/* Intensity legend so the colour ramp reads as a scale, like the
                GitHub contribution graph. */}
            <div className="mt-3 flex items-center gap-1 text-2xs text-muted">
              <span>Less</span>
              {LEVEL_CLASS.map((cls, i) => (
                <span key={i} className={`h-3 w-3 rounded ${cls}`} aria-hidden />
              ))}
              <span>More</span>
            </div>
          </div>

          {/* sm:mt-5 drops the stat column below the day-label row so its first
              baseline lines up with the grid's top row of cells. */}
          <div className="flex flex-1 flex-col gap-4 sm:mt-5">
            {isCurrentWindow ? (
              <>
                {streak > 0 ? (
                  <Stat
                    icon={<FlameIcon />}
                    label="Current streak"
                    value={`${streak} ${streak === 1 ? "day" : "days"}`}
                    accent
                  />
                ) : (
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-muted">
                      <FlameIcon />
                    </span>
                    <div className="text-sm text-muted">Start a streak today</div>
                  </div>
                )}
                <Stat icon={<CheckIcon />} label="This week" value={`${thisWeek.tasks} tasks`} />
                <Stat
                  icon={<ClockIcon />}
                  label="Focused this week"
                  value={formatMinutes(thisWeek.focusSeconds)}
                />
              </>
            ) : (
              <>
                <Stat icon={<CheckIcon />} label="Tasks done" value={`${windowTotals.tasks}`} />
                <Stat icon={<ClockIcon />} label="Focused" value={formatMinutes(windowTotals.focusSeconds)} />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export const Heatmap = memo(HeatmapInner);

// A unit-appropriate glyph + a label under the number so the eye can tell
// streak (flame) from count (check) from duration (clock) at a glance.
function Stat({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted">{icon}</span>
      <div>
        <div
          className={`text-lg font-semibold tabular-nums ${accent ? "text-accent-soft" : ""}`}
        >
          {value}
        </div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2c1 3-1 4-1 6a3 3 0 0 0 6 0c0-1 0-2-.5-3 2 1.5 3.5 4 3.5 7a8 8 0 0 1-16 0c0-3.5 2.5-6 4-8 .5 1.5 1.5 2 2 3 .5-1.5 0-3-2-5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
