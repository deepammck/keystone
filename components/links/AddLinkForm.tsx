"use client";

import { useState } from "react";

const empty = { url: "", note: "", tags: "" };

type Props = {
  onAdd: (input: { url: string; note: string; tags: string[] }) => Promise<void>;
};

export function AddLinkForm({ onAdd }: Props) {
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof empty) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = form.url.trim();
    const note = form.note.trim();
    if (!url || !note) {
      setError("A URL and a note are both required.");
      return;
    }
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setSubmitting(true);
    setError(null);
    try {
      await onAdd({ url, note, tags });
      setForm(empty);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the link.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card flex flex-col gap-2.5 rounded-2xl bg-tint p-4"
    >
      {/* The URL is the entry point — make it the prominent first field and
          drop the cursor here on load for instant capture. */}
      <input
        type="url"
        inputMode="url"
        autoFocus
        placeholder="https://…"
        value={form.url}
        onChange={update("url")}
        disabled={submitting}
        aria-label="URL"
        className="min-h-12 w-full rounded-lg bg-bg px-4 text-base font-medium outline-none focus:ring-2 focus:ring-ring"
      />
      {/* The note is the differentiator vs a plain bookmark, so it gets room and
          a labelled, warmer prompt rather than reading like an afterthought. */}
      <label className="flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted">
        <svg
          width="13"
          height="13"
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
        Why this matters
      </label>
      <textarea
        rows={3}
        placeholder="What made this worth keeping? What do you want to do with it?"
        value={form.note}
        onChange={update("note")}
        disabled={submitting}
        aria-label="Note"
        className="w-full resize-y rounded-lg bg-bg px-4 py-2.5 outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        type="text"
        placeholder="tags, comma, separated (optional)"
        value={form.tags}
        onChange={update("tags")}
        disabled={submitting}
        aria-label="Tags"
        className="min-h-11 w-full rounded-lg bg-bg px-4 text-base outline-none focus:ring-2 focus:ring-ring sm:text-sm"
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="press btn-accent min-h-11 self-start rounded-lg bg-text px-5 font-medium text-bg disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save link"}
      </button>
    </form>
  );
}
