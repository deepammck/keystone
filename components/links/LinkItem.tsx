"use client";

import { useEffect, useState } from "react";
import type { Link } from "@/lib/types";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

type Props = {
  link: Link;
  onEdit: (
    id: string,
    input: { url: string; note: string; tags: string[] },
  ) => void;
  onDelete: (id: string) => void;
  onTagClick: (tag: string) => void;
};

export function LinkItem({ link, onEdit, onDelete, onTagClick }: Props) {
  const host = hostname(link.url);
  const [armed, setArmed] = useState(false);
  const [editing, setEditing] = useState(false);

  // Arm-then-confirm so a stray click can't hard-delete a saved link; the armed
  // state disarms itself shortly after.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);

  if (editing) {
    return (
      <LinkEditForm
        link={link}
        onSave={(input) => {
          onEdit(link.id, input);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <li className="card group relative rounded-2xl bg-tint p-4 pr-11">
      {/* Source identity leads — favicon + domain — so the list scans like a
          set of sources, the title is the primary line, the summary is quiet. */}
      <div className="flex items-center gap-2 text-xs text-muted">
        {/* A tiny decorative third-party favicon — next/image's optimizer +
            remote-pattern config would be overkill for a 16px hint glyph. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`}
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 shrink-0 rounded-sm"
          loading="lazy"
        />
        <span className="truncate">{host}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={link.created_at} className="shrink-0">
          {relativeTime(link.created_at)}
        </time>
      </div>

      <a
        href={link.url}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-1.5 block break-words font-medium leading-snug text-text underline-offset-2 hover:underline"
      >
        {link.title || host}
      </a>

      <p className="mt-1.5 leading-snug text-muted">{link.note}</p>

      {link.summary && (
        <p className="mt-1.5 text-sm leading-snug text-muted/80">
          {link.summary}
        </p>
      )}

      {link.tags?.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {link.tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onTagClick(tag)}
                className="press rounded-full bg-bg px-2.5 py-0.5 text-xs font-medium text-muted transition-colors hover:bg-accent hover:text-on-accent"
              >
                #{tag}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Edit + delete are hidden until hover; delete asks once before removing. */}
      {armed ? (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDelete(link.id)}
            className="press rounded-md bg-danger/15 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/25"
          >
            Delete?
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            aria-label="Keep"
            className="press rounded-md px-1.5 py-1 text-xs text-muted hover:text-text"
          >
            Keep
          </button>
        </div>
      ) : (
        <div className="absolute right-2 top-2 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit link"
            title="Edit"
            className="press grid h-9 w-9 place-items-center rounded-md text-muted opacity-0 transition-opacity hover:bg-bg hover:text-text focus-visible:opacity-100 group-hover:opacity-100"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setArmed(true)}
            aria-label="Delete link"
            title="Delete"
            className="press grid h-9 w-9 place-items-center rounded-md text-muted opacity-0 transition-opacity hover:bg-bg hover:text-text focus-visible:opacity-100 group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}

// Inline editor — mirrors AddLinkForm's fields/styling but pre-filled and
// scoped to one card. Title/summary aren't shown: they're derived from the URL
// (re-fetched on save when the URL changes), not user-authored.
function LinkEditForm({
  link,
  onSave,
  onCancel,
}: {
  link: Link;
  onSave: (input: { url: string; note: string; tags: string[] }) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(link.url);
  const [note, setNote] = useState(link.note);
  const [tags, setTags] = useState((link.tags ?? []).join(", "));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    const trimmedNote = note.trim();
    if (!trimmedUrl || !trimmedNote) return;
    onSave({
      url: trimmedUrl,
      note: trimmedNote,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  return (
    <li className="card rounded-2xl bg-tint p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <input
          type="url"
          inputMode="url"
          autoFocus
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label="URL"
          className="min-h-11 w-full rounded-lg bg-bg px-4 text-base font-medium outline-none focus:ring-2 focus:ring-accent"
        />
        <textarea
          rows={3}
          placeholder="What made this worth keeping?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Note"
          className="w-full resize-y rounded-lg bg-bg px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          type="text"
          placeholder="tags, comma, separated (optional)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          aria-label="Tags"
          className="min-h-11 w-full rounded-lg bg-bg px-4 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="press btn-accent min-h-11 self-start rounded-lg bg-text px-5 font-medium text-bg"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="press min-h-11 self-start rounded-lg px-4 text-sm font-medium text-muted hover:text-text"
          >
            Cancel
          </button>
        </div>
      </form>
    </li>
  );
}
