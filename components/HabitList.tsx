"use client";

import { useEffect, useRef, useState } from "react";
import type { Habit } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { addDaysIso } from "@/lib/utils";

type Props = {
  habits: Habit[];
  doneIds: Set<string>;
  userId: string;
  today: string;
  onToggle: (habitId: string) => void;
};

// Trailing 7-day window ending today (oldest first), so the rightmost dot is
// always "today" and the strip reads as recent momentum.
function last7Days(today: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysIso(today, i - 6));
}

export function HabitList({ habits, doneIds, userId, today, onToggle }: Props) {
  const [supabase] = useState(() => createClient());
  // habitId -> set of ISO dates it was completed within the trailing window.
  const [history, setHistory] = useState<Record<string, Set<string>>>({});

  const week = last7Days(today);

  useEffect(() => {
    if (habits.length === 0) return;
    let cancelled = false;
    const start = week[0];
    const end = addDaysIso(today, 1);
    supabase
      .from("habit_logs")
      .select("habit_id, date")
      .eq("user_id", userId)
      .eq("completed", true)
      .gte("date", start)
      .lt("date", end)
      .then(({ data }) => {
        if (cancelled) return;
        const out: Record<string, Set<string>> = {};
        for (const r of (data ?? []) as { habit_id: string; date: string }[]) {
          (out[r.habit_id] ??= new Set()).add(r.date);
        }
        setHistory(out);
      });
    return () => {
      cancelled = true;
    };
    // `today` anchors the window; habits.length re-runs after habits load.
  }, [supabase, userId, today, habits.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (habits.length === 0) return null;

  return (
    <section className="flex flex-col gap-1">
      <h2 className="section-title mb-2 font-serif text-xl font-semibold">Habits</h2>
      <ul className="flex flex-col">
        {habits.map((habit) => {
          const done = doneIds.has(habit.id);
          // Overlay today's live state over the fetched history so a fresh
          // check/uncheck reflects in the strip and streak immediately.
          const days = week.map((d) =>
            d === today ? done : (history[habit.id]?.has(d) ?? false),
          );
          let streak = 0;
          for (let i = days.length - 1; i >= 0 && days[i]; i--) streak++;
          return (
            <HabitItem
              key={habit.id}
              habit={habit}
              done={done}
              days={days}
              streak={streak}
              onToggle={() => onToggle(habit.id)}
            />
          );
        })}
      </ul>
    </section>
  );
}

function HabitItem({
  habit,
  done,
  days,
  streak,
  onToggle,
}: {
  habit: Habit;
  done: boolean;
  days: boolean[];
  streak: number;
  onToggle: () => void;
}) {
  const [pop, setPop] = useState(false);
  const prevDone = useRef(done);

  // Animate only when the user marks it done, not on initial mount.
  useEffect(() => {
    if (!prevDone.current && done) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 360);
      prevDone.current = done;
      return () => clearTimeout(t);
    }
    prevDone.current = done;
  }, [done]);

  return (
    <li>
      <button
        onClick={onToggle}
        className="group flex min-h-11 w-full items-center gap-3 py-1 text-left"
      >
        <span
          className={`press flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all duration-150 group-hover:border-accent ${
            done
              ? "scale-105 border-accent bg-accent text-on-accent"
              : "border-muted/50 bg-transparent"
          } ${pop ? "habit-pop" : ""}`}
        >
          {done && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path className="check-path" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
        <span
          className={`flex-1 leading-tight transition-opacity ${
            done ? "strike text-muted opacity-50" : ""
          } ${pop ? "strike-draw" : ""}`}
        >
          {habit.name}
        </span>

        {streak > 0 && (
          <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium tabular-nums text-accent-soft">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2c1 3-1 4-1 6a3 3 0 0 0 6 0c0-1 0-2-.5-3 2 1.5 3.5 4 3.5 7a8 8 0 0 1-16 0c0-3.5 2.5-6 4-8 .5 1.5 1.5 2 2 3 .5-1.5 0-3-2-5z" />
            </svg>
            {streak}
          </span>
        )}

        {/* 7-day momentum strip; the last dot is today. */}
        <span className="flex shrink-0 items-center gap-1" aria-hidden>
          {days.map((on, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                on
                  ? "bg-accent"
                  : i === days.length - 1
                    ? "ring-1 ring-inset ring-border"
                    : "bg-tint-strong"
              }`}
            />
          ))}
        </span>
      </button>
    </li>
  );
}
