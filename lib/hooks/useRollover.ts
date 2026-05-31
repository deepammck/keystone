"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const KEY = "keystone:last-date";

// On load, if the local date has advanced since we last saw it, carry any
// incomplete past tasks forward to today by moving their `date`. Completed
// tasks keep their original date as the silent archive. Moving the row forward
// (rather than duplicating) avoids re-creating the same task every midnight.
export function useRollover(userId: string, today: string, onRolled: () => void) {
  useEffect(() => {
    const last = localStorage.getItem(KEY);
    if (last === today) return;

    const supabase = createClient();
    (async () => {
      await supabase
        .from("tasks")
        .update({ date: today })
        .eq("user_id", userId)
        .eq("completed", false)
        .lt("date", today);
      localStorage.setItem(KEY, today);
      onRolled();
    })();
  }, [userId, today, onRolled]);
}
