"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { runOrQueue } from "@/lib/offline-queue";
import { addDaysIso, formatDayLabel } from "@/lib/utils";

type Props = {
  userId: string;
  today: string;
  initialNote: string;
};

export function Notepad({ userId, today, initialNote }: Props) {
  const [date, setDate] = useState(today);
  const [content, setContent] = useState(initialNote);
  // Preview of the day-before's note, surfaced only while the current page is
  // blank so returning users get continuity instead of a void.
  const [prevNote, setPrevNote] = useState("");
  // System-status cue so the user trusts the autosave instead of guessing.
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [supabase] = useState(() => createClient());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  // Pull in the prior day's note whenever the viewed day changes.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("daily_notes")
      .select("content")
      .eq("user_id", userId)
      .eq("date", addDaysIso(date, -1))
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setPrevNote(data?.content ?? "");
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, date]);

  // Flush any pending save, then load the note for a different day.
  async function goTo(nextDate: string) {
    if (nextDate === date) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setDate(nextDate);
    const { data } = await supabase
      .from("daily_notes")
      .select("content")
      .eq("user_id", userId)
      .eq("date", nextDate)
      .maybeSingle();
    setContent(data?.content ?? "");
  }

  function onChange(value: string) {
    setContent(value);
    setSaveState("saving");
    const targetDate = date;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    saveTimer.current = setTimeout(() => {
      runOrQueue(supabase, {
        table: "daily_notes",
        op: "upsert",
        payload: {
          user_id: userId,
          date: targetDate,
          content: value,
          updated_at: new Date().toISOString(),
        },
        onConflict: "user_id,date",
      });
      setSaveState("saved");
      savedTimer.current = setTimeout(() => setSaveState("idle"), 2000);
    }, 800);
  }

  const isToday = date === today;

  return (
    <section className="card flex flex-col rounded-2xl bg-tint px-6 py-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => goTo(addDaysIso(date, -1))}
          className="min-h-9 px-2 text-muted"
          aria-label="Previous day"
        >
          ‹
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{formatDayLabel(date)}</span>
          <span
            className={`text-xs text-muted transition-opacity duration-300 ${
              saveState === "idle" ? "opacity-0" : "opacity-100"
            }`}
            aria-live="polite"
          >
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
          </span>
          {!isToday && (
            <button
              onClick={() => goTo(today)}
              className="text-xs text-muted underline-offset-2 hover:underline"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={() => goTo(addDaysIso(date, 1))}
          disabled={isToday}
          className="min-h-9 px-2 text-muted disabled:opacity-30"
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      {content.trim() === "" && (
        <p className="mt-2 truncate text-xs text-muted/80">
          {prevNote.trim() ? (
            <>
              Yesterday — <span className="italic">{prevNote}</span>
            </>
          ) : (
            "A blank page. What happened today?"
          )}
        </p>
      )}

      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Notes for the day…"
        className="notepad-paper mt-3 min-h-28 flex-1 resize-none rounded-lg bg-bg px-4 py-3 text-sm leading-7 outline-none placeholder:text-muted focus:ring-2 focus:ring-accent lg:min-h-40"
      />
    </section>
  );
}
