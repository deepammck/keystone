"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Habit } from "@/lib/types";

const THEMES = ["light", "dark", "brown", "mocha"] as const;

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
const hhmmToMinutes = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

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

  async function save() {
    setSaving(true);
    const goal = Math.max(0, Math.round(Number(focusGoal) || 0));

    // Reconcile habits against the original set: delete rows the user removed,
    // update renamed ones, and insert new ones (position = list order).
    const originalIds = new Set(habits.map((h) => h.id));
    const keptIds = new Set(habitRows.map((r) => r.id));
    const habitOps: PromiseLike<unknown>[] = [];
    for (const h of habits) {
      if (!keptIds.has(h.id)) {
        habitOps.push(supabase.from("habits").delete().eq("id", h.id));
      }
    }
    habitRows.forEach((row, i) => {
      const name = row.name.trim();
      if (!name) return;
      if (originalIds.has(row.id)) {
        const original = habits.find((h) => h.id === row.id);
        if (original && original.name !== name) {
          habitOps.push(
            supabase.from("habits").update({ name }).eq("id", row.id),
          );
        }
      } else {
        habitOps.push(
          supabase
            .from("habits")
            .insert({ user_id: userId, name, position: i }),
        );
      }
    });

    await Promise.all([
      ...habitOps,
      tz !== timezone
        ? supabase.from("profiles").update({ timezone: tz }).eq("id", userId)
        : Promise.resolve(),
      hhmmToMinutes(wake) !== wakeMinute ||
      hhmmToMinutes(sleep) !== sleepMinute
        ? supabase
            .from("profiles")
            .update({
              wake_minute: hhmmToMinutes(wake),
              sleep_minute: hhmmToMinutes(sleep),
            })
            .eq("id", userId)
        : Promise.resolve(),
      goal !== focusGoalMinutes
        ? supabase
            .from("profiles")
            .update({ focus_goal_minutes: goal })
            .eq("id", userId)
        : Promise.resolve(),
    ]);
    window.location.reload();
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-text/30 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-bg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl font-semibold">Settings</h2>
          {/* X saves and closes: there's no separate Save button anymore, so the
              close action must persist habits/timezone/waking-hours/focus-goal
              (theme already auto-saves live). */}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            aria-label="Close settings"
            className="press -mr-1 min-h-11 px-2 text-2xl leading-none text-muted hover:text-text disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="mt-5">
          <label className="text-sm text-muted">Habits</label>
          <div className="mt-2 flex flex-col gap-2">
            {habitRows.map((row, i) => (
              <div key={row.id} className="flex items-center gap-2">
                <input
                  value={row.name}
                  onChange={(e) =>
                    setHabitRows((prev) =>
                      prev.map((r, j) =>
                        j === i ? { ...r, name: e.target.value } : r,
                      ),
                    )
                  }
                  placeholder="New habit"
                  className="min-h-11 flex-1 rounded-lg bg-tint px-4 outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() =>
                    setHabitRows((prev) => prev.filter((_, j) => j !== i))
                  }
                  aria-label="Remove habit"
                  className="press min-h-11 px-2 text-xl leading-none text-muted hover:text-text"
                >
                  ×
                </button>
              </div>
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
            className="mt-2 min-h-11 w-full rounded-lg bg-tint px-4 outline-none focus:ring-2 focus:ring-accent"
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
              className="min-h-11 flex-1 rounded-lg bg-tint px-4 outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              type="time"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              aria-label="Sleep time"
              className="min-h-11 flex-1 rounded-lg bg-tint px-4 outline-none focus:ring-2 focus:ring-accent"
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
            className="mt-2 min-h-11 w-full rounded-lg bg-tint px-4 outline-none focus:ring-2 focus:ring-accent"
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
