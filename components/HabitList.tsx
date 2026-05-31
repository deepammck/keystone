"use client";

import type { Habit } from "@/lib/types";

type Props = {
  habits: Habit[];
  doneIds: Set<string>;
  onToggle: (habitId: string) => void;
};

export function HabitList({ habits, doneIds, onToggle }: Props) {
  if (habits.length === 0) return null;

  return (
    <section className="flex flex-col gap-1">
      <h2 className="section-title mb-2 font-serif text-xl font-semibold">Habits</h2>
      <ul className="flex flex-col">
        {habits.map((habit) => {
          const done = doneIds.has(habit.id);
          return (
            <li key={habit.id}>
              <button
                onClick={() => onToggle(habit.id)}
                className="group flex min-h-11 w-full items-center gap-3 py-1 text-left"
              >
                <span
                  className={`press flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all duration-150 group-hover:border-accent ${
                    done
                      ? "scale-105 border-accent bg-accent text-bg"
                      : "border-muted/50 bg-transparent"
                  }`}
                >
                  {done && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path className="check-path" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span
                  className={`leading-tight transition-opacity ${
                    done ? "text-muted line-through opacity-50" : ""
                  }`}
                >
                  {habit.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
