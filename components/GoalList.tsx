"use client";

import { memo, useState } from "react";
import type { Goal } from "@/lib/types";
import { CheckIcon, ChevronDownIcon, XIcon } from "@/components/icons";

type Props = {
  goals: Goal[];
  onAdd: (title: string) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
};

// A collapsible "things I want to achieve" checklist. This is deliberately a
// sub-area rendered INSIDE the Deadlines <section> (no card/section wrapper of
// its own) — Goals is not a seventh Keystone section. Ordering is created_at
// (oldest-first, set by useCollection); completing a goal strikes it through in
// place and never reorders the list.
function GoalListInner({ goals, onAdd, onToggle, onDelete }: Props) {
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setTitle("");
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 py-1 text-left text-muted transition-colors hover:text-text"
      >
        <ChevronDownIcon
          size={15}
          className={`shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
        />
        <span className="section-title font-mono text-sm font-medium uppercase tracking-[0.12em]">
          Goals
        </span>
        {goals.length > 0 && (
          <span className="font-mono text-xs text-muted">({goals.length})</span>
        )}
      </button>

      {open && (
        <>
          {goals.length > 0 && (
          <ul className="mt-1 flex flex-col">
            {goals.map((goal) => (
              <li key={goal.id} className="group flex items-center gap-2">
                <button
                  aria-label={
                    goal.completed ? "Mark goal undone" : "Mark goal done"
                  }
                  aria-pressed={goal.completed}
                  onClick={() => onToggle(goal.id, goal.completed)}
                  className="press flex h-11 w-11 shrink-0 items-center justify-center"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                      goal.completed
                        ? "border-accent bg-accent text-on-accent"
                        : "border-border text-transparent"
                    }`}
                  >
                    <CheckIcon size={13} />
                  </span>
                </button>
                <span
                  className={`min-w-0 flex-1 truncate leading-tight transition-colors ${
                    goal.completed ? "text-muted line-through" : ""
                  }`}
                >
                  {goal.title}
                </span>
                <button
                  aria-label="Delete goal"
                  onClick={() => onDelete(goal.id)}
                  className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted opacity-100 transition-opacity hover:bg-tint-strong hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <XIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
          )}

          <form onSubmit={submit} className={goals.length > 0 ? "mt-2" : "mt-1"}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                goals.length > 0 ? "+ add a goal" : "What do you want to achieve?"
              }
              className="min-h-11 w-full rounded-lg bg-bg px-4 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-ring"
            />
          </form>
        </>
      )}
    </div>
  );
}

export const GoalList = memo(GoalListInner);
