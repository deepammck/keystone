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
  onDelete: (id: string) => void;
  onTagClick: (tag: string) => void;
};

export function LinkItem({ link, onDelete, onTagClick }: Props) {
  const host = hostname(link.url);
  const [armed, setArmed] = useState(false);

  // Arm-then-confirm so a stray click can't hard-delete a saved link; the armed
  // state disarms itself shortly after.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);

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

      {/* Delete is hidden until hover and asks once before removing. */}
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
        <button
          type="button"
          onClick={() => setArmed(true)}
          aria-label="Delete link"
          title="Delete"
          className="press absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-md text-muted opacity-0 transition-opacity hover:bg-bg hover:text-text focus-visible:opacity-100 group-hover:opacity-100"
        >
          ✕
        </button>
      )}
    </li>
  );
}
