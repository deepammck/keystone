"use client";

import { memo, useState } from "react";
import type { Goal } from "@/lib/types";
import { PlusIcon, XIcon } from "@/components/icons";

type Props = {
  goals: Goal[];
  onAdd: (title: string) => void;
  onDelete: (id: string) => void;
};

// An always-visible "things I want to achieve" surface that lives in the Header's
// middle band (between the progress chips and the settings gear). Goals here are
// aspirations you read every time you open the app — not a checklist, so there is
// no checkbox and no completed state; you only add a goal or remove it with the ×.
// Styled to match the Header's chip language (rounded-full pills on tint).
function GoalBannerInner({ goals, onAdd, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    onAdd(trimmed);
    setTitle("");
    // Stay in add mode so several goals can be entered in a row.
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
      {goals.map((goal) => (
        <span
          key={goal.id}
          className="group inline-flex items-center gap-1 rounded-full bg-tint py-1 pl-2.5 pr-1 text-xs font-medium text-muted"
        >
          <span className="max-w-[14rem] truncate">{goal.title}</span>
          <button
            aria-label={`Remove goal: ${goal.title}`}
            onClick={() => onDelete(goal.id)}
            className="press flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted opacity-100 transition-opacity hover:bg-tint-strong hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
          >
            <XIcon size={13} />
          </button>
        </span>
      ))}

      {adding ? (
        <form onSubmit={submit}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={submit}
            autoFocus
            placeholder="What do you want to achieve?"
            className="min-h-8 w-48 rounded-full bg-tint px-3 text-xs outline-none placeholder:text-muted focus:ring-2 focus:ring-ring"
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="press inline-flex items-center gap-1 rounded-full bg-tint px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-tint-strong hover:text-text"
        >
          <PlusIcon size={12} />
          {goals.length > 0 ? "goal" : "Set a goal"}
        </button>
      )}
    </div>
  );
}

export const GoalBanner = memo(GoalBannerInner);
