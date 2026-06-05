"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { runOrQueue } from "@/lib/offline-queue";

// A generic per-user collection hook for the College Tracker modules. Same
// shape as useEvents/useLinks (realtime + optimistic writes through runOrQueue),
// but parameterized by table so the nine modules don't each repeat it.
//
// Rows are kept oldest-first (forms append to the bottom); ordering within a
// module that needs something else (e.g. grouping by tier) is done in the view.
type BaseRow = { id: string; user_id: string; created_at: string };

function sortByCreated<T extends BaseRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function useCollection<T extends BaseRow>(
  table: string,
  initial: T[],
  userId: string,
) {
  const [items, setItems] = useState<T[]>(sortByCreated(initial));
  const [supabase] = useState(() => createClient());

  const refetch = useCallback(async () => {
    const { data } = await supabase.from(table).select("*").eq("user_id", userId);
    if (data) setItems(sortByCreated(data as T[]));
  }, [supabase, table, userId]);

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, table, userId, refetch]);

  // Insert. The caller passes the column values; id/user_id/created_at are
  // filled in here so the optimistic row matches what the DB will store.
  const add = useCallback(
    async (fields: Partial<T>): Promise<T> => {
      const row = {
        id: crypto.randomUUID(),
        user_id: userId,
        created_at: new Date().toISOString(),
        ...fields,
      } as T;
      setItems((prev) => sortByCreated([...prev, row]));
      await runOrQueue(supabase, {
        table,
        op: "insert",
        payload: row as Record<string, unknown>,
      });
      return row;
    },
    [supabase, table, userId],
  );

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
      await runOrQueue(supabase, {
        table,
        op: "update",
        payload: patch as Record<string, unknown>,
        match: { id },
      });
    },
    [supabase, table],
  );

  const remove = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((r) => r.id !== id));
      await runOrQueue(supabase, { table, op: "delete", match: { id } });
    },
    [supabase, table],
  );

  return { items, add, update, remove };
}
