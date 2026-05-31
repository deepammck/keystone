"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { flushQueue } from "@/lib/offline-queue";

// Tracks connectivity and replays any queued writes when the connection
// returns.
export function useOnline() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Sync the initial state from the browser's connectivity status.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    const supabase = createClient();

    async function goOnline() {
      setOnline(true);
      await flushQueue(supabase);
    }
    function goOffline() {
      setOnline(false);
    }

    // Attempt a flush on mount in case writes were queued in a prior session.
    if (navigator.onLine) flushQueue(supabase);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
