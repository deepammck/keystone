"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { runOrQueue } from "@/lib/offline-queue";
import type { FocusSession } from "@/lib/types";
import {
  hoursLabel,
  addWeeks,
  weekDatesFromStart,
  formatWeekRange,
  formatDayLabel,
  formatMinutes,
  formatTime24InTz,
} from "@/lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

type Props = {
  userId: string;
  timezone: string;
  today: string;
  currentWeekStart: string;
  weekDates: string[];
  weekFocusByDate: Record<string, number>;
  completedTaskDates: string[];
  weekHabitsDone: number;
  totalHabitsPerWeek: number;
  onTodaySessionDeleted: (seconds: number) => void;
};

type WeekData = {
  weekStart: string;
  weekDates: string[];
  focusByDate: Record<string, number>;
  completedTaskDates: string[];
  weekHabitsDone: number;
  sessions: FocusSession[];
};

function byDate(sessions: FocusSession[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions) {
    out[s.date] = (out[s.date] ?? 0) + s.duration_seconds;
  }
  return out;
}

export function WeekHistory({
  userId,
  timezone,
  today,
  currentWeekStart,
  weekDates,
  weekFocusByDate,
  completedTaskDates,
  weekHabitsDone,
  totalHabitsPerWeek,
  onTodaySessionDeleted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(false);
  // Which week is being viewed, and the fetched data for past weeks only.
  // The current week is never stored in state — it's derived from props on
  // every render so live edits (habits/tasks/focus) stay in sync.
  const [viewWeekStart, setViewWeekStart] = useState(currentWeekStart);
  const [pastData, setPastData] = useState<WeekData | null>(null);
  // The current week's individual sessions are fetched lazily (props only carry
  // per-day aggregates). `currentLoaded` gates deriving dots from them so we
  // don't flash an empty week before the fetch lands.
  const [currentSessions, setCurrentSessions] = useState<FocusSession[]>([]);
  const [currentLoaded, setCurrentLoaded] = useState(false);
  // Ids deleted this session, so a racing refetch can't resurrect them.
  const deletedIds = useRef<Set<string>>(new Set());

  const isViewingCurrent = viewWeekStart === currentWeekStart || !pastData;
  const todayFocus = weekFocusByDate[today] ?? 0;

  // Fetch the current week's sessions when the panel is open. Re-runs when
  // today's focus total changes (a session was logged or deleted) so the list
  // stays current.
  useEffect(() => {
    if (!open || viewWeekStart !== currentWeekStart) return;
    let cancelled = false;
    const weekEnd = addWeeks(currentWeekStart, 1);
    supabase
      .from("focus_sessions")
      .select("id, started_at, duration_seconds, label, date")
      .eq("user_id", userId)
      .gte("date", currentWeekStart)
      .lt("date", weekEnd)
      .then(({ data }) => {
        if (cancelled) return;
        setCurrentSessions(
          ((data ?? []) as FocusSession[]).filter(
            (s) => !deletedIds.current.has(s.id),
          ),
        );
        setCurrentLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, viewWeekStart, currentWeekStart, todayFocus, supabase, userId]);

  // Current-week dots come from the fetched sessions once loaded (so deletes
  // reflect immediately on every day), but today is overlaid from props so a
  // freshly-logged session shows without waiting on the refetch.
  const currentFocusByDate = currentLoaded
    ? { ...byDate(currentSessions), [today]: todayFocus }
    : weekFocusByDate;

  const view: WeekData =
    viewWeekStart === currentWeekStart || !pastData
      ? {
          weekStart: currentWeekStart,
          weekDates,
          focusByDate: currentFocusByDate,
          completedTaskDates,
          weekHabitsDone,
          sessions: currentSessions,
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
        .select("id, started_at, duration_seconds, label, date")
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

    const sessions = ((focusRes.data ?? []) as FocusSession[]).filter(
      (s) => !deletedIds.current.has(s.id),
    );
    const taskDates = Array.from(
      new Set(((tasksRes.data ?? []) as { date: string }[]).map((r) => r.date)),
    );

    setPastData({
      weekStart,
      weekDates: dates,
      focusByDate: byDate(sessions),
      completedTaskDates: taskDates,
      weekHabitsDone: (logsRes.data ?? []).length,
      sessions,
    });
    setViewWeekStart(weekStart);
    setLoading(false);
  }

  async function deleteSession(s: FocusSession) {
    deletedIds.current.add(s.id);
    if (isViewingCurrent) {
      setCurrentSessions((arr) => arr.filter((x) => x.id !== s.id));
    } else {
      setPastData((pd) => {
        if (!pd) return pd;
        const sessions = pd.sessions.filter((x) => x.id !== s.id);
        return { ...pd, sessions, focusByDate: byDate(sessions) };
      });
    }
    if (s.date === today) onTodaySessionDeleted(s.duration_seconds);
    await runOrQueue(supabase, {
      table: "focus_sessions",
      op: "delete",
      match: { id: s.id },
    });
  }

  const completedSet = new Set(view.completedTaskDates);
  const filled = view.weekDates.map(
    (d) => completedSet.has(d) && (view.focusByDate[d] ?? 0) > 0,
  );
  const completedDays = filled.filter(Boolean).length;
  const totalFocus = Object.values(view.focusByDate).reduce((a, b) => a + b, 0);
  const isCurrent = view.weekStart === currentWeekStart;

  const sortedSessions = [...view.sessions].sort((a, b) =>
    a.started_at < b.started_at ? 1 : a.started_at > b.started_at ? -1 : 0,
  );

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="press flex min-h-11 w-full items-center gap-1.5 py-2 text-sm font-medium text-muted transition-colors hover:text-text"
      >
        <span
          className={`text-xs transition-transform duration-300 ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          ▸
        </span>
        {open ? "Hide past weeks" : "View past weeks"}
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="card rounded-2xl bg-tint px-6 py-5">
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

            <div className={`mt-5 border-t border-border pt-4 ${loading ? "opacity-40" : ""}`}>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                Focus sessions
              </p>
              {sortedSessions.length === 0 ? (
                <p className="text-sm text-muted">No sessions logged.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {sortedSessions.map((s) => (
                    <li
                      key={s.id}
                      className="group flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">{s.label || "Focus"}</p>
                        <p className="text-xs text-muted">
                          {formatDayLabel(s.date)} ·{" "}
                          {formatTime24InTz(
                            timezone,
                            new Date(s.started_at).getTime(),
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm tabular-nums text-muted">
                          {formatMinutes(s.duration_seconds)}
                        </span>
                        <button
                          onClick={() => deleteSession(s)}
                          aria-label="Delete session"
                          className="press flex h-7 w-7 items-center justify-center rounded-md text-muted opacity-0 transition-opacity hover:bg-tint-strong hover:text-text group-hover:opacity-100"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
