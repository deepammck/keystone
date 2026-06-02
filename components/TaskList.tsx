"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { TaskItem } from "@/components/TaskItem";

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

export function TaskList({
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

  return (
    <section className="flex flex-col gap-1">
      <h2 className="section-title mb-2 font-serif text-xl font-semibold">Today</h2>

      {empty && (
        <p className="py-2 font-serif text-base text-text/80">
          What&apos;s the one thing today?
        </p>
      )}

      <ul className="flex flex-col">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => onToggle(task.id)}
            onDelete={() => onDelete(task.id)}
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
          className={`min-h-11 w-full rounded-lg bg-tint px-4 outline-none placeholder:text-muted focus:ring-2 focus:ring-accent ${
            empty ? "text-base ring-1 ring-border" : ""
          }`}
        />
      </form>

      {limitMessage && (
        <p className="mt-1 text-sm text-accent-soft">{limitMessage}</p>
      )}

      {/* Inbox / upcoming backlog */}
      <div className="mt-3 border-t border-tint-strong pt-2">
        <button
          onClick={() => setShowInbox((v) => !v)}
          className="flex w-full items-center justify-between py-1 text-sm text-muted transition-colors hover:text-text"
        >
          <span>Inbox · {inbox.length}</span>
          <span>{showInbox ? "–" : "+"}</span>
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
                  onToggle={() => onToggle(task.id)}
                  onDelete={() => onDelete(task.id)}
                  onMoveToToday={() => onMoveToToday(task.id)}
                />
              ))}
            </ul>
            <form onSubmit={submitInbox} className="mt-2">
              <input
                value={inboxDraft}
                onChange={(e) => setInboxDraft(e.target.value)}
                placeholder="Add to inbox…"
                className="min-h-11 w-full rounded-lg bg-tint px-4 outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
              />
            </form>
          </>
        )}
      </div>
    </section>
  );
}
