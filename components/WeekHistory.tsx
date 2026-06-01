"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  hoursLabel,
  addWeeks,
  weekDatesFromStart,
  formatWeekRange,
} from "@/lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

type Props = {
  userId: string;
  currentWeekStart: string;
  weekDates: string[];
  weekFocusByDate: Record<string, number>;
  completedTaskDates: string[];
  weekHabitsDone: number;
  totalHabitsPerWeek: number;
};

type WeekData = {
  weekStart: string;
  weekDates: string[];
  focusByDate: Record<string, number>;
  completedTaskDates: string[];
  weekHabitsDone: number;
};

export function WeekHistory({
  userId,
  currentWeekStart,
  weekDates,
  weekFocusByDate,
  completedTaskDates,
  weekHabitsDone,
  totalHabitsPerWeek,
}: Props) {
  const [open, setOpen] = useState(false);
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(false);
  // Which week is being viewed, and the fetched data for past weeks only.
  // The current week is never stored in state — it's derived from props on
  // every render so live edits (habits/tasks/focus) stay in sync.
  const [viewWeekStart, setViewWeekStart] = useState(currentWeekStart);
  const [pastData, setPastData] = useState<WeekData | null>(null);

  const view: WeekData =
    viewWeekStart === currentWeekStart || !pastData
      ? {
          weekStart: currentWeekStart,
          weekDates,
          focusByDate: weekFocusByDate,
          completedTaskDates,
          weekHabitsDone,
        }
      : pastData;

  async function goToWeek(weekStart: string) {
    if (weekStart === currentWeekStart) {
      setViewWeekStart(currentWeekStart);
      setPastData(null);
      return;
    }
    setLoading(true);
    const dates = weekDatesFromStart(weekStart);
    const weekEnd = addWeeks(weekStart, 1);
    const [focusRes, tasksRes, logsRes] = await Promise.all([
      supabase
        .from("focus_sessions")
        .select("duration_seconds, date")
        .eq("user_id", userId)
        .gte("date", weekStart)
        .lt("date", weekEnd),
      supabase
        .from("tasks")
        .select("date")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("date", weekStart)
        .lt("date", weekEnd),
      supabase
        .from("habit_logs")
        .select("date")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("date", weekStart)
        .lt("date", weekEnd),
    ]);

    const focusByDate: Record<string, number> = {};
    for (const r of (focusRes.data ?? []) as {
      duration_seconds: number;
      date: string;
    }[]) {
      focusByDate[r.date] = (focusByDate[r.date] ?? 0) + r.duration_seconds;
    }
    const taskDates = Array.from(
      new Set(((tasksRes.data ?? []) as { date: string }[]).map((r) => r.date)),
    );

    setPastData({
      weekStart,
      weekDates: dates,
      focusByDate,
      completedTaskDates: taskDates,
      weekHabitsDone: (logsRes.data ?? []).length,
    });
    setViewWeekStart(weekStart);
    setLoading(false);
  }

  const completedSet = new Set(view.completedTaskDates);
  const filled = view.weekDates.map(
    (d) => completedSet.has(d) && (view.focusByDate[d] ?? 0) > 0,
  );
  const completedDays = filled.filter(Boolean).length;
  const totalFocus = Object.values(view.focusByDate).reduce((a, b) => a + b, 0);
  const isCurrent = view.weekStart === currentWeekStart;

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="press flex min-h-11 items-center gap-1 text-sm text-muted transition-colors hover:text-text"
      >
        Past weeks{" "}
        <span className={`transition-transform duration-300 ${open ? "rotate-90" : ""}`}>
          ▸
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="card rounded-2xl bg-tint px-6 py-6">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => goToWeek(addWeeks(view.weekStart, -1))}
                className="min-h-9 px-2 text-muted"
                aria-label="Previous week"
              >
                ‹
              </button>
              <span className="text-sm font-medium">
                {isCurrent ? "This week" : formatWeekRange(view.weekStart)}
              </span>
              <button
                onClick={() => goToWeek(addWeeks(view.weekStart, 1))}
                disabled={isCurrent}
                className="min-h-9 px-2 text-muted disabled:opacity-30"
                aria-label="Next week"
              >
                ›
              </button>
            </div>

            <div
              className={`flex justify-between ${loading ? "opacity-40" : ""}`}
            >
              {view.weekDates.map((d, i) => (
                <div key={d} className="flex flex-col items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full transition-all ${
                      filled[i]
                        ? "bg-accent shadow-[0_0_10px] shadow-accent/50"
                        : "border border-border bg-tint-strong"
                    }`}
                  />
                  <span className="text-xs text-muted">{DAY_LABELS[i]}</span>
                </div>
              ))}
            </div>

            <p className="mt-5 text-sm text-muted">
              {completedDays}/7 completed · {hoursLabel(totalFocus)} focused ·{" "}
              {view.weekHabitsDone}/{totalHabitsPerWeek} habits
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
