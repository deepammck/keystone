"use client";

import { useMemo, useState } from "react";
import type { Link } from "@/lib/types";
import { useLinks } from "@/lib/hooks/useLinks";
import { useOnline } from "@/lib/hooks/useOnline";
import { AppSwitcher } from "@/components/AppSwitcher";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AddLinkForm } from "@/components/links/AddLinkForm";
import { SearchBar } from "@/components/links/SearchBar";
import { LinkList } from "@/components/links/LinkList";

type Props = {
  userId: string;
  initialLinks: Link[];
};

export function LinksTool({ userId, initialLinks }: Props) {
  const online = useOnline();
  const { links, addLink, deleteLink } = useLinks(initialLinks, userId);
  const [query, setQuery] = useState("");

  // Client-side, case-insensitive substring match over the user's own note +
  // the fetched title/summary + tags — the point is searching your reasons.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return links;
    return links.filter((l) => {
      const haystack = [l.note, l.title, l.summary, (l.tags ?? []).join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [links, query]);

  return (
    <>
      <AppSwitcher userId={userId} />
      <main className="relative z-10 mx-auto flex max-w-[640px] flex-col gap-4 px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-6">
      <div className="reveal">
        <OfflineIndicator online={online} />
        <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
          Link Dump
        </h1>
      </div>

      <div className="reveal" style={{ animationDelay: "0.06s" }}>
        <AddLinkForm onAdd={addLink} />
      </div>

      {/* Search only earns its place once the list is long enough to need it. */}
      {links.length >= 5 && (
        <div className="reveal" style={{ animationDelay: "0.12s" }}>
          <SearchBar value={query} onChange={setQuery} />
        </div>
      )}

      <div className="reveal" style={{ animationDelay: "0.18s" }}>
        <LinkList
          links={filtered}
          totalCount={links.length}
          query={query}
          onDelete={deleteLink}
          onTagClick={setQuery}
        />
      </div>
    </main>
    </>
  );
}
