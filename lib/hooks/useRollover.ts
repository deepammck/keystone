"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// On load, if the local date has advanced since we last saw it, carry any
// incomplete past tasks forward to today by moving their `date`. Completed
// tasks keep their original date as the silent archive. Moving the row forward
// (rather than duplicating) avoids re-creating the same task every midnight.
export function useRollover(userId: string, today: string, onRolled: () => void) {
  useEffect(() => {
    // Namespaced per user so two accounts in one browser don't suppress each
    // other's rollover.
    const key = `keystone:last-date:${userId}`;
    if (localStorage.getItem(key) === today) return;

    const supabase = createClient();
    (async () => {
      const { data, error } = await supabase
        .from("tasks")
        .update({ date: today })
        .eq("user_id", userId)
        .eq("completed", false)
        .lt("date", today)
        .select("id");
      // Failed/offline: leave the marker unset so the rollover retries on the
      // next load instead of being recorded as done without ever applying.
      if (error) return;
      localStorage.setItem(key, today);
      // Only reload when something actually moved — otherwise the first load
      // of every day would always trigger an immediate second page load.
      if ((data ?? []).length > 0) onRolled();
    })();
  }, [userId, today, onRolled]);
}
