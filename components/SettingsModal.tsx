"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { runOrQueue } from "@/lib/offline-queue";
import type { Habit } from "@/lib/types";
import { XIcon } from "@/components/icons";

const THEMES = ["mocha", "dark"] as const;

const TIMEZONES = [
  { value: "America/New_York", label: "EST" },
  { value: "America/Chicago", label: "CST" },
  { value: "America/Denver", label: "MST" },
  { value: "America/Los_Angeles", label: "PST" },
  { value: "Europe/London", label: "GMT" },
  { value: "Europe/Berlin", label: "CET" },
  { value: "Asia/Kolkata", label: "IST" },
  { value: "Asia/Singapore", label: "SGT" },
  { value: "Australia/Sydney", label: "AEST" },
  { value: "UTC", label: "UTC" },
];

type Props = {
  userId: string;
  habits: Habit[];
  timezone: string;
  wakeMinute: number;
  sleepMinute: number;
  focusGoalMinutes: number;
  initialTheme: string;
  onClose: () => void;
};

const minutesToHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
// Returns null for an empty/malformed value so callers can skip the write
// instead of persisting NaN (a cleared time input used to write wake/sleep NaN).
const hhmmToMinutes = (s: string): number | null => {
  const [h, m] = s.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

// One habit row: rename inline; the X on a saved habit arms a "Remove?" confirm
// (its log history is deleted with it), an unsaved row is removed immediately.
function HabitRow({
  name,
  isSaved,
  onRename,
  onRemove,
}: {
  name: string;
  isSaved: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <div className="flex items-center gap-2">
      <input
        value={name}
        onChange={(e) => onRename(e.target.value)}
        placeholder="New habit"
        className="min-h-11 min-w-0 flex-1 rounded-lg bg-tint px-4 outline-none focus:ring-2 focus:ring-ring"
      />
      {armed ? (
        <button
          type="button"
          onClick={onRemove}
          className="press shrink-0 rounded-md bg-danger/15 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/25"
        >
          Remove? History goes too
        </button>
      ) : (
        <button
          type="button"
          onClick={() => (isSaved ? setArmed(true) : onRemove())}
          aria-label="Remove habit"
          className="press grid h-11 w-11 shrink-0 place-items-center text-muted hover:text-text"
        >
          <XIcon size={18} />
        </button>
      )}
    </div>
  );
}

export function SettingsModal({
  userId,
  habits,
  timezone,
  wakeMinute,
  sleepMinute,
  focusGoalMinutes,
  initialTheme,
  onClose,
}: Props) {
  // Habit rows carry a client id (the real DB id for existing habits, a fresh
  // uuid for unsaved ones) purely for stable React keys. Whether a row is an
  // insert vs. an update is decided in save() by checking against the original
  // habit ids — not by this id.
  const [habitRows, setHabitRows] = useState(() =>
    habits.map((h) => ({ id: h.id, name: h.name })),
  );
  const [tz, setTz] = useState(timezone);
  const [wake, setWake] = useState(minutesToHHMM(wakeMinute));
  const [sleep, setSleep] = useState(minutesToHHMM(sleepMinute));
  const [focusGoal, setFocusGoal] = useState(String(focusGoalMinutes));
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<string>(initialTheme);
  const supabase = createClient();

  // Apply the theme live (no Save needed) and cache it for instant paint on the
  // next load.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("keystone:theme", theme);
    } catch {}
  }, [theme]);

  // Persist the picked theme to the profile so it's the source of truth and
  // survives a wiped localStorage cache. Routed through here (not the effect
  // above) to avoid a redundant write on mount.
  async function selectTheme(next: string) {
    const prev = theme;
    setTheme(next); // live preview via the effect above
    // Must await: Supabase/local-client query builders are lazy and only fire
    // when the promise is consumed — a dangling call never writes, so the theme
    // would revert to the stale DB value on the post-save reload. upsert (not
    // update) also creates the profile row if it's somehow missing, killing the
    // silent 0-row no-op case.
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, theme: next });
    if (error) {
      // Don't leave the UI showing a theme that didn't actually persist.
      setTheme(prev);
      console.error("Failed to save theme", error);
    }
  }

  // Guard against a double-save (X click + the backdrop/Escape handlers all
  // route here). Saving + reloading once is enough.
  const savingRef = useRef(false);

  async function save() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const goal = Math.max(0, Math.round(Number(focusGoal) || 0));

    // Reconcile habits against the original set: delete rows the user removed,
    // update renamed ones, and insert new ones (position = list order). All
    // writes go through runOrQueue so they're optimistic + survive offline
    // (raw supabase calls used to fail silently with no connection).
    const originalIds = new Set(habits.map((h) => h.id));
    const keptIds = new Set(habitRows.map((r) => r.id));
    const ops: Promise<unknown>[] = [];
    for (const h of habits) {
      if (!keptIds.has(h.id)) {
        ops.push(runOrQueue(supabase, { table: "habits", op: "delete", match: { id: h.id } }));
      }
    }
    habitRows.forEach((row, i) => {
      const name = row.name.trim();
      if (!name) return;
      if (originalIds.has(row.id)) {
        const original = habits.find((h) => h.id === row.id);
        if (original && original.name !== name) {
          ops.push(
            runOrQueue(supabase, {
              table: "habits",
              op: "update",
              payload: { name },
              match: { id: row.id },
            }),
          );
        }
      } else {
        ops.push(
          runOrQueue(supabase, {
            table: "habits",
            op: "insert",
            payload: { id: crypto.randomUUID(), user_id: userId, name, position: i },
          }),
        );
      }
    });

    // Coalesce all profile-field changes into one upsert (skipping NaN times).
    const profilePatch: Record<string, unknown> = {};
    if (tz !== timezone) profilePatch.timezone = tz;
    const wakeMin = hhmmToMinutes(wake);
    const sleepMin = hhmmToMinutes(sleep);
    if (wakeMin != null && wakeMin !== wakeMinute) profilePatch.wake_minute = wakeMin;
    if (sleepMin != null && sleepMin !== sleepMinute) profilePatch.sleep_minute = sleepMin;
    if (goal !== focusGoalMinutes) profilePatch.focus_goal_minutes = goal;
    if (Object.keys(profilePatch).length > 0) {
      ops.push(
        runOrQueue(supabase, {
          table: "profiles",
          op: "upsert",
          payload: { id: userId, ...profilePatch },
        }),
      );
    }

    // Nothing changed — just close, no need to reload the whole app.
    if (ops.length === 0) {
      savingRef.current = false;
      onClose();
      return;
    }
    await Promise.all(ops);
    window.location.reload();
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  // Save-and-close on Escape (matches the X button — there's no separate Save),
  // and keep Tab cycling inside the dialog so keyboard focus can't wander into
  // the page underneath while the modal is open.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // Move focus into the dialog on open; restore it on close.
    const prior = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        save();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prior?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save is stable enough for this lifetime
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-text/30 p-4 sm:items-center"
      onClick={save}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-bg p-6 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-mono text-xl font-medium uppercase tracking-[0.1em]">Settings</h2>
          {/* X saves and closes: there's no separate Save button anymore, so the
              close action must persist habits/timezone/waking-hours/focus-goal
              (theme already auto-saves live). */}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            aria-label="Close settings"
            className="press -mr-1 grid h-11 w-11 place-items-center text-muted hover:text-text disabled:opacity-50"
          >
            <XIcon size={20} />
          </button>
        </div>

        <div className="mt-5">
          <label className="text-sm text-muted">Habits</label>
          <div className="mt-2 flex flex-col gap-2">
            {habitRows.map((row, i) => (
              <HabitRow
                key={row.id}
                name={row.name}
                // Removing a saved habit cascades its whole log history away on
                // save, so the X arms a confirm instead of deleting outright.
                isSaved={habits.some((h) => h.id === row.id)}
                onRename={(name) =>
                  setHabitRows((prev) =>
                    prev.map((r, j) => (j === i ? { ...r, name } : r)),
                  )
                }
                onRemove={() =>
                  setHabitRows((prev) => prev.filter((_, j) => j !== i))
                }
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setHabitRows((prev) => [
                ...prev,
                { id: crypto.randomUUID(), name: "" },
              ])
            }
            className="mt-2 text-sm text-muted underline-offset-2 hover:underline"
          >
            + Add habit
          </button>
        </div>

        <div className="mt-5">
          <label className="text-sm text-muted">Theme</label>
          <div className="mt-2 flex gap-5">
            {THEMES.map((t) => (
              <button
                key={t}
                onClick={() => selectTheme(t)}
                className={`text-sm capitalize underline-offset-4 ${
                  theme === t ? "text-text underline" : "text-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm text-muted">Timezone</label>
          <select
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg bg-tint px-4 outline-none focus:ring-2 focus:ring-ring"
          >
            {TIMEZONES.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5">
          <label className="text-sm text-muted">Waking hours</label>
          <div className="mt-2 flex gap-3">
            <input
              type="time"
              value={wake}
              onChange={(e) => setWake(e.target.value)}
              aria-label="Wake time"
              className="min-h-11 flex-1 rounded-lg bg-tint px-4 outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="time"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              aria-label="Sleep time"
              className="min-h-11 flex-1 rounded-lg bg-tint px-4 outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm text-muted">Daily focus goal (minutes)</label>
          <input
            type="number"
            min={0}
            step={15}
            value={focusGoal}
            onChange={(e) => setFocusGoal(e.target.value)}
            aria-label="Daily focus goal in minutes"
            className="mt-2 min-h-11 w-full rounded-lg bg-tint px-4 outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={signOut}
            className="text-sm text-muted underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
