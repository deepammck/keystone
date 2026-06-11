"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { runOrQueue } from "@/lib/offline-queue";
import type { Link } from "@/lib/types";

function sortByNewest(links: Link[]): Link[] {
  return [...links].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function useLinks(initial: Link[], userId: string) {
  const [links, setLinks] = useState<Link[]>(sortByNewest(initial));
  const [supabase] = useState(() => createClient());

  // Latest links, readable from callbacks without making them depend on `links`
  // (which would re-create every callback on each edit). updateLink reads this
  // to find the row's current URL and decide whether to re-fetch metadata.
  const linksRef = useRef(links);
  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("links")
      .select("*")
      .eq("user_id", userId);
    if (data) setLinks(sortByNewest(data as Link[]));
  }, [supabase, userId]);

  useEffect(() => {
    const channel = supabase
      .channel("links-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "links", filter: `user_id=eq.${userId}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, refetch]);

  // Add: save immediately (capture must be instant), then enrich with page
  // metadata in the background. A failed/blocked metadata fetch never touches
  // the saved link — it just keeps the user's note without title/summary.
  const addLink = useCallback(
    async ({ url, note, tags }: { url: string; note: string; tags: string[] }) => {
      const trimmedUrl = url.trim();
      const trimmedNote = note.trim();
      if (!trimmedUrl || !trimmedNote) return;

      const optimistic: Link = {
        id: crypto.randomUUID(),
        user_id: userId,
        url: trimmedUrl,
        note: trimmedNote,
        title: null,
        summary: null,
        tags,
        created_at: new Date().toISOString(),
      };
      setLinks((prev) => sortByNewest([optimistic, ...prev]));
      await runOrQueue(supabase, {
        table: "links",
        op: "insert",
        payload: {
          id: optimistic.id,
          user_id: userId,
          url: optimistic.url,
          note: optimistic.note,
          title: null,
          summary: null,
          tags: optimistic.tags,
        },
      });

      // Fire-and-forget enrichment — deliberately not awaited so the add form
      // unblocks as soon as the link itself is saved.
      void (async () => {
        try {
          const res = await fetch(
            `/api/fetch-metadata?url=${encodeURIComponent(trimmedUrl)}`,
          );
          if (!res.ok) return;
          const body = await res.json();
          const title = body.title ?? null;
          const summary = body.summary ?? null;
          if (!title && !summary) return;
          setLinks((prev) =>
            prev.map((l) => (l.id === optimistic.id ? { ...l, title, summary } : l)),
          );
          await runOrQueue(supabase, {
            table: "links",
            op: "update",
            match: { id: optimistic.id },
            payload: { title, summary },
          });
        } catch {
          // offline or function unreachable — the link is already saved
        }
      })();
    },
    [supabase, userId],
  );

  // Edit an existing link's url/note/tags. When the URL changes we re-fetch
  // page metadata so the title/summary stay in sync with the new source; a
  // failed/blocked fetch falls back to clearing them rather than blocking the
  // save. When the URL is unchanged we keep the existing title/summary as-is.
  const updateLink = useCallback(
    async (
      id: string,
      { url, note, tags }: { url: string; note: string; tags: string[] },
    ) => {
      const trimmedUrl = url.trim();
      const trimmedNote = note.trim();
      if (!trimmedUrl || !trimmedNote) return;

      const existing = linksRef.current.find((l) => l.id === id);
      if (!existing) return;

      const urlChanged = trimmedUrl !== existing.url;
      let meta = { title: existing.title, summary: existing.summary };
      if (urlChanged) {
        meta = { title: null, summary: null };
        try {
          const res = await fetch(
            `/api/fetch-metadata?url=${encodeURIComponent(trimmedUrl)}`,
          );
          if (res.ok) {
            const body = await res.json();
            meta = { title: body.title ?? null, summary: body.summary ?? null };
          }
        } catch {
          // offline or function unreachable — save with cleared metadata
        }
      }

      const patch = {
        url: trimmedUrl,
        note: trimmedNote,
        tags,
        title: meta.title,
        summary: meta.summary,
      };
      setLinks((prev) =>
        sortByNewest(prev.map((l) => (l.id === id ? { ...l, ...patch } : l))),
      );
      await runOrQueue(supabase, {
        table: "links",
        op: "update",
        match: { id },
        payload: patch,
      });
    },
    [supabase],
  );

  // Optimistic delete. Like the rest of Keystone, a write that can't go through
  // immediately is parked in the offline queue and replayed later (runOrQueue),
  // so the UI stays optimistic rather than rolling back.
  const deleteLink = useCallback(
    async (id: string) => {
      setLinks((prev) => prev.filter((l) => l.id !== id));
      await runOrQueue(supabase, {
        table: "links",
        op: "delete",
        match: { id },
      });
    },
    [supabase],
  );

  return { links, addLink, updateLink, deleteLink };
}
