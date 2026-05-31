"use client";

import { useCallback, useEffect, useState } from "react";
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
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, refetch]);

  const toggle = useCallback(
    async (habitId: string) => {
      const next = !doneIds.has(habitId);
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
    [doneIds, supabase, today, userId],
  );

  return { doneIds, toggle, doneCount: doneIds.size, total: habits.length };
}
