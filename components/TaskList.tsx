"use client";

import { memo, useState } from "react";
import type { Task } from "@/lib/types";
import { TaskItem } from "@/components/TaskItem";
import { ChevronDownIcon } from "@/components/icons";

type Props = {
  tasks: Task[];
  inbox: Task[];
  limitMessage: string;
  onAdd: (text: string) => void;
  onAddToInbox: (text: string) => void;
  onMoveToToday: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

// Memoized so an unrelated Dashboard re-render (per-second focus-timer tick,
// habit toggle) doesn't repaint the whole task list. Props are useCallback /
// useState stable, so it only re-renders when tasks actually change.
function TaskListInner({
  tasks,
  inbox,
  limitMessage,
  onAdd,
  onAddToInbox,
  onMoveToToday,
  onToggle,
  onDelete,
}: Props) {
  const [draft, setDraft] = useState("");
  const [inboxDraft, setInboxDraft] = useState("");
  const [showInbox, setShowInbox] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onAdd(draft);
    setDraft("");
  }

  function submitInbox(e: React.FormEvent) {
    e.preventDefault();
    onAddToInbox(inboxDraft);
    setInboxDraft("");
  }

  const empty = tasks.length === 0;
  // The cap is on *active* today tasks (max 5); completed ones stay inline but
  // don't count. Surfacing "x of 5" makes the constraint visible before the
  // 6th-task message appears.
  const activeCount = tasks.filter((t) => !t.completed).length;

  return (
    <section className="flex flex-col gap-1">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="section-title font-mono text-base font-medium uppercase tracking-[0.1em]">Today</h2>
        {!empty && (
          <span
            className={`text-xs font-medium tabular-nums ${
              activeCount >= 5 ? "text-accent-soft" : "text-muted"
            }`}
          >
            {activeCount} of 5
          </span>
        )}
      </div>


      <ul className="flex flex-col">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </ul>

      <form onSubmit={submit} className="mt-2">
        <input
          // An empty Today is the highest-intent moment — drop the cursor in the
          // field on load so the user can just start typing.
          autoFocus={empty}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task…"
          className={`min-h-11 w-full rounded-lg bg-tint px-4 outline-none placeholder:text-muted focus:ring-2 focus:ring-ring ${
            empty ? "text-base ring-1 ring-border" : ""
          }`}
        />
      </form>

      {limitMessage && (
        <p className="mt-1 text-sm text-accent-soft">{limitMessage}</p>
      )}

      {/* Inbox / upcoming backlog — a clearer rule sets the unlimited backlog
          apart from the capped Today list above. */}
      <div className="mt-3 border-t border-border pt-3">
        <button
          onClick={() => setShowInbox((v) => !v)}
          aria-expanded={showInbox}
          className="flex min-h-11 w-full items-center justify-between text-sm text-muted transition-colors hover:text-text"
        >
          <span>Inbox · {inbox.length}</span>
          <ChevronDownIcon
            className={`transition-transform duration-200 ${showInbox ? "rotate-180" : ""}`}
          />
        </button>
        {showInbox && (
          <>
            {inbox.length === 0 && (
              <p className="py-2 text-sm text-muted">
                Empty. Capture upcoming work here, pull it into Today when ready.
              </p>
            )}
            <ul className="flex flex-col">
              {inbox.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onMoveToToday={onMoveToToday}
                />
              ))}
            </ul>
            <form onSubmit={submitInbox} className="mt-2">
              <input
                value={inboxDraft}
                onChange={(e) => setInboxDraft(e.target.value)}
                placeholder="Add to inbox…"
                className="min-h-11 w-full rounded-lg bg-tint px-4 outline-none placeholder:text-muted focus:ring-2 focus:ring-ring"
              />
            </form>
          </>
        )}
      </div>
    </section>
  );
}

export const TaskList = memo(TaskListInner);
