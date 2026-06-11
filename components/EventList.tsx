"use client";

import { memo, useState } from "react";
import type { Event } from "@/lib/types";
import {
  formatCountdown,
  formatEventTime,
  isoToPickerValue,
  pickerValueToIso,
} from "@/lib/utils";
import { useNow } from "@/lib/hooks/useNow";
import { eventsToIcs, ICS_FILENAME } from "@/lib/ics";
import { DateTimePicker } from "@/components/DateTimePicker";
import { AlertTriangleIcon, PencilIcon, XIcon } from "@/components/icons";

type Props = {
  events: Event[];
  onAdd: (title: string, dueAtIso: string) => void;
  onEdit: (id: string, title: string, dueAtIso: string) => void;
  onDelete: (id: string) => void;
  timezone: string;
};

// Memoized: it self-ticks via useNow for countdowns, so it needn't also repaint
// on every unrelated Dashboard re-render (focus-timer tick, habit/task toggle).
function EventListInner({
  events,
  onAdd,
  onEdit,
  onDelete,
  timezone,
}: Props) {
  const now = useNow(30000);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [adding, setAdding] = useState(false);
  // Inline edit state, keyed by the event being edited (null = none).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");

  // Picker values are wall-clock strings in the PROFILE timezone; convert to a
  // real instant here so the hook/store only ever sees ISO. (Interpreting the
  // wall clock in device-local time shifted deadlines whenever the device tz
  // differed from the profile tz.)
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !due) return;
    onAdd(title, pickerValueToIso(due, timezone));
    setTitle("");
    setDue("");
    setAdding(false);
  }

  function startEdit(ev: Event) {
    setAdding(false);
    setEditingId(ev.id);
    setEditTitle(ev.title);
    setEditDue(isoToPickerValue(ev.due_at, timezone));
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editTitle.trim() || !editDue) return;
    onEdit(editingId, editTitle, pickerValueToIso(editDue, timezone));
    setEditingId(null);
  }

  // Client-side .ics download from the events already in memory — works the
  // same in local and Supabase mode (no round trip to /api/calendar).
  function exportIcs() {
    const blob = new Blob([eventsToIcs(events, Date.now())], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ICS_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card rounded-2xl bg-tint px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title font-mono text-base font-medium uppercase tracking-[0.1em]">Deadlines</h2>
        <div className="flex items-center gap-1">
          {events.length > 0 && (
            <button
              onClick={exportIcs}
              title="Download deadlines as an .ics calendar file"
              className="press rounded-full px-2 py-1 text-sm text-muted transition-colors hover:bg-tint-strong hover:text-text"
            >
              Export
            </button>
          )}
          <button
            onClick={() => setAdding((v) => !v)}
            className="press rounded-full px-2 py-1 text-sm text-muted transition-colors hover:bg-tint-strong hover:text-text"
          >
            {adding ? "Cancel" : "+ Add"}
          </button>
        </div>
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
              ? "text-danger"
              : diffMs < 24 * 3600_000
                ? "text-danger"
                : diffMs < 7 * 24 * 3600_000
                  ? "text-warning"
                  : "text-accent-soft";
          // Within 24h (and overdue): flag with an icon so urgency isn't carried
          // by color alone.
          const urgent = now > 0 && diffMs < 24 * 3600_000;
          if (editingId === ev.id) {
            return (
              <li key={ev.id}>
                <form
                  onSubmit={submitEdit}
                  className="flex flex-col gap-2 rounded-lg bg-bg p-3"
                >
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="What's the deadline?"
                    autoFocus
                    className="min-h-11 w-full rounded-lg bg-tint px-4 outline-none placeholder:text-muted focus:ring-2 focus:ring-ring"
                  />
                  <DateTimePicker
                    value={editDue}
                    onChange={setEditDue}
                    timezone={timezone}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="press btn-accent min-h-11 flex-1 rounded-lg bg-accent px-6 font-medium text-on-accent"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="press min-h-11 rounded-lg px-4 text-muted transition-colors hover:bg-tint-strong hover:text-text"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </li>
            );
          }
          return (
            <li
              key={ev.id}
              className="group flex items-center gap-3"
            >
              <span
                className={`flex w-20 shrink-0 items-center gap-1 font-mono text-sm font-semibold tabular-nums transition-colors ${urgency}`}
              >
                {urgent && <AlertTriangleIcon size={13} />}
                <span>{now === 0 ? "·" : formatCountdown(ev.due_at, now)}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate leading-tight">{ev.title}</p>
                <p className="text-xs text-muted">{formatEventTime(ev.due_at, timezone)}</p>
              </div>
              <button
                aria-label="Edit event"
                onClick={() => startEdit(ev)}
                className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted opacity-100 transition-opacity hover:bg-tint-strong hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
              >
                <PencilIcon size={15} />
              </button>
              <button
                aria-label="Delete event"
                onClick={() => onDelete(ev.id)}
                className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted opacity-100 transition-opacity hover:bg-tint-strong hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
              >
                <XIcon size={16} />
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
            className="min-h-11 w-full rounded-lg bg-bg px-4 outline-none placeholder:text-muted focus:ring-2 focus:ring-ring"
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

export const EventList = memo(EventListInner);
