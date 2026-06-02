"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addWeeks,
  weekDatesFromStart,
  formatWeekRange,
  formatDayLabel,
  formatMinutes,
} from "@/lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKS = 6;

// Per-day combined-activity score. Each signal contributes 0..1, so points
// land in [0,3]; tweak the caps/weights here to retune intensity.
const TASK_CAP = 5; // tasks at/above this count max out the task signal
const FOCUS_CAP_H = 2; // hours of focus that max out the focus signal

// Tailwind needs whole class strings (no runtime concatenation), so map each
// intensity level to a static class. 0 = empty, 4 = fullest.
const LEVEL_CLASS = [
  "bg-tint-strong border border-border",
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

export function Heatmap({
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
  const weeks = Array.from({ length: WEEKS }, (_, i) =>
    weekDatesFromStart(addWeeks(windowEndWeek, -(WEEKS - 1 - i))),
  );

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

  function dayStats(d: string): DayStats {
    const base = stats[d] ?? { focusSeconds: 0, tasks: 0, habits: 0 };
    // Overlay today's live values when the current window is in view.
    if (d === today && isCurrentWindow) {
      return {
        focusSeconds: todayFocusSeconds,
        tasks: todayTasksCompleted,
        habits: todayHabitsDone,
      };
    }
    return base;
  }

  function level(s: DayStats): number {
    const points =
      Math.min(s.tasks, TASK_CAP) / TASK_CAP +
      Math.min(s.focusSeconds / 3600, FOCUS_CAP_H) / FOCUS_CAP_H +
      (totalHabits ? Math.min(s.habits, totalHabits) / totalHabits : 0);
    return points === 0 ? 0 : Math.min(4, Math.ceil((points / 3) * 4));
  }

  return (
    <section>
      <div className="card rounded-2xl bg-tint px-6 py-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">Progress</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">
              {formatWeekRange(firstWeek).split(" – ")[0]} –{" "}
              {formatWeekRange(windowEndWeek).split(" – ")[1]}
            </span>
            <button
              onClick={() => setWindowEndWeek((w) => addWeeks(w, -WEEKS))}
              className="min-h-9 px-2 text-muted"
              aria-label="Earlier weeks"
            >
              ‹
            </button>
            <button
              onClick={() => setWindowEndWeek((w) => addWeeks(w, WEEKS))}
              disabled={isCurrentWindow}
              className="min-h-9 px-2 text-muted disabled:opacity-30"
              aria-label="Later weeks"
            >
              ›
            </button>
          </div>
        </div>

        <div className={loading ? "opacity-40 transition-opacity" : "transition-opacity"}>
          <div className="grid w-max grid-cols-7 gap-1.5">
            {DAY_LABELS.map((label, i) => (
              <span key={i} className="w-4 text-center text-[10px] text-muted">
                {label}
              </span>
            ))}
            {weeks.flatMap((week) =>
              week.map((d) => {
                const future = d > today;
                const s = dayStats(d);
                const lvl = level(s);
                return (
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
                        ? "border border-border bg-tint-strong opacity-40"
                        : LEVEL_CLASS[lvl]
                    }`}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
