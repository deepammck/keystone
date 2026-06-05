"use client";

import { useState } from "react";
import type { Event } from "@/lib/types";
import { formatCountdown, formatEventTime } from "@/lib/utils";
import { useNow } from "@/lib/hooks/useNow";
import { DateTimePicker } from "@/components/DateTimePicker";

type Props = {
  events: Event[];
  onAdd: (title: string, dueAtIso: string) => void;
  onDelete: (id: string) => void;
  timezone: string;
};

export function EventList({ events, onAdd, onDelete, timezone }: Props) {
  const now = useNow(30000);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [adding, setAdding] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !due) return;
    onAdd(title, due);
    setTitle("");
    setDue("");
    setAdding(false);
  }

  return (
    <section className="card rounded-2xl bg-tint px-6 py-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title font-serif text-xl font-semibold">Deadlines</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="press rounded-full px-2 py-1 text-sm text-muted transition-colors hover:bg-tint-strong hover:text-text"
        >
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {events.length === 0 && !adding && (
        <p className="py-1 text-sm text-muted">Nothing on the horizon.</p>
      )}

      <ul className="flex flex-col gap-2.5">
        {events.map((ev) => {
          // The remaining time is the whole point of a deadline, so it leads:
          // pulled left, scaled up, and color-coded by how soon it lands.
          const diffMs =
            now > 0 ? new Date(ev.due_at).getTime() - now : Infinity;
          const urgency =
            diffMs <= 0
              ? "text-red-500"
              : diffMs < 24 * 3600_000
                ? "text-red-500"
                : diffMs < 7 * 24 * 3600_000
                  ? "text-amber-500"
                  : "text-accent-soft";
          return (
            <li
              key={ev.id}
              className="group flex items-center gap-3"
            >
              <span
                className={`w-16 shrink-0 font-mono text-sm font-semibold tabular-nums transition-colors ${urgency}`}
              >
                {now === 0 ? "·" : formatCountdown(ev.due_at, now)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate leading-tight">{ev.title}</p>
                <p className="text-xs text-muted">{formatEventTime(ev.due_at)}</p>
              </div>
              <button
                aria-label="Delete event"
                onClick={() => onDelete(ev.id)}
                className="h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:bg-tint-strong hover:text-text group-hover:opacity-100 sm:flex"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      {adding && (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's the deadline?"
            className="min-h-11 w-full rounded-lg bg-bg px-4 outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
          />
          <DateTimePicker value={due} onChange={setDue} timezone={timezone} />
          <button
            type="submit"
            className="press btn-accent min-h-11 rounded-lg bg-accent px-6 font-medium text-on-accent"
          >
            Add deadline
          </button>
        </form>
      )}
    </section>
  );
}
