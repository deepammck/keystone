"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { runOrQueue } from "@/lib/offline-queue";
import type { Event } from "@/lib/types";

function sortByDue(events: Event[]): Event[] {
  return [...events].sort((a, b) => a.due_at.localeCompare(b.due_at));
}

export function useEvents(initial: Event[], userId: string) {
  const [events, setEvents] = useState<Event[]>(sortByDue(initial));
  const [supabase] = useState(() => createClient());

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", userId);
    if (data) setEvents(sortByDue(data as Event[]));
  }, [supabase, userId]);

  useEffect(() => {
    const channel = supabase
      .channel("events-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `user_id=eq.${userId}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, refetch]);

  const addEvent = useCallback(
    async (title: string, dueAtIso: string) => {
      const trimmed = title.trim();
      if (!trimmed || !dueAtIso) return;
      const optimistic: Event = {
        id: crypto.randomUUID(),
        user_id: userId,
        title: trimmed,
        due_at: new Date(dueAtIso).toISOString(),
        created_at: new Date().toISOString(),
      };
      setEvents((prev) => sortByDue([...prev, optimistic]));
      await runOrQueue(supabase, {
        table: "events",
        op: "insert",
        payload: {
          id: optimistic.id,
          user_id: userId,
          title: optimistic.title,
          due_at: optimistic.due_at,
        },
      });
    },
    [supabase, userId],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      await runOrQueue(supabase, {
        table: "events",
        op: "delete",
        match: { id },
      });
    },
    [supabase],
  );

  return { events, addEvent, deleteEvent };
}
