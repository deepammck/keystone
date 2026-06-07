"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { runOrQueue } from "@/lib/offline-queue";
import type { Habit } from "@/lib/types";

// Habit completion is one row per (habit, date). Today's checkbox is "on" when
// a row exists with completed = true. Midnight reset is automatic: a new day
// has no rows yet, so everything reads as unchecked.
export function useHabits(
  habits: Habit[],
  initialDoneIds: string[],
  userId: string,
  today: string,
) {
  const [doneIds, setDoneIds] = useState<Set<string>>(
    new Set(initialDoneIds),
  );
  const [supabase] = useState(() => createClient());
  // Marks a short window after the user's own write. The upsert echoes straight
  // back through the postgres_changes subscription; without this guard every
  // toggle would trigger a full refetch + Set rebuild a few hundred ms later —
  // a second whole-Dashboard re-render that reads as lag. The optimistic update
  // already holds the correct state, so we skip the echo and only refetch for
  // genuinely external changes (another device/tab).
  const writingUntil = useRef(0);
  // Mirror of doneIds so `toggle` can read current state without listing it as a
  // dependency — keeping the callback identity stable so memoized HabitList
  // isn't re-created (and re-rendered) on unrelated Dashboard updates.
  const doneIdsRef = useRef(doneIds);
  useEffect(() => {
    doneIdsRef.current = doneIds;
  }, [doneIds]);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("habit_logs")
      .select("habit_id, completed")
      .eq("user_id", userId)
      .eq("date", today);
    if (data) {
      setDoneIds(
        new Set(
          data
            .filter((r) => r.completed)
            .map((r) => r.habit_id as string),
        ),
      );
    }
  }, [supabase, userId, today]);

  const refetchRef = useRef(refetch);
  useEffect(() => { refetchRef.current = refetch; }, [refetch]);

  useEffect(() => {
    const channel = supabase
      .channel("habit-log-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "habit_logs",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (Date.now() < writingUntil.current) return;
          refetchRef.current();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const toggle = useCallback(
    async (habitId: string) => {
      const next = !doneIdsRef.current.has(habitId);
      // Suppress the postgres_changes echo of this very write (see writingUntil).
      writingUntil.current = Date.now() + 2000;
      setDoneIds((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(habitId);
        else copy.delete(habitId);
        return copy;
      });
      await runOrQueue(supabase, {
        table: "habit_logs",
        op: "upsert",
        payload: {
          habit_id: habitId,
          user_id: userId,
          date: today,
          completed: next,
        },
        onConflict: "habit_id,date",
      });
    },
    [supabase, today, userId],
  );

  return { doneIds, toggle, doneCount: doneIds.size, total: habits.length };
}
