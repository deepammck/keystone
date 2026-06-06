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
  const { links, addLink, updateLink, deleteLink } = useLinks(
    initialLinks,
    userId,
  );
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
      {/* Two-column on desktop: a sticky left rail holds capture + search while the
          cards flow into a masonry on the right. Widths match the AppSwitcher
          (1080/1240/1400) so the nav and content align and the old dead space on
          either side of the narrow column is filled. Collapses to a single stack
          below lg. */}
      <main className="relative z-10 mx-auto flex max-w-[1080px] flex-col gap-4 px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-6 lg:grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:max-w-[1240px] xl:max-w-[1400px]">
      <div className="reveal lg:col-span-2">
        <OfflineIndicator online={online} />
        <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
          Link Dump
        </h1>
      </div>

      <div
        className="reveal flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start"
        style={{ animationDelay: "0.06s" }}
      >
        <AddLinkForm onAdd={addLink} />

        {/* Search only earns its place once the list is long enough to need it —
            but also whenever a filter is active (e.g. you clicked a tag), so the
            clear button is always reachable and you're never stuck filtered. */}
        {(links.length >= 5 || query.trim()) && (
          <SearchBar value={query} onChange={setQuery} />
        )}
      </div>

      <div className="reveal" style={{ animationDelay: "0.18s" }}>
        <LinkList
          links={filtered}
          totalCount={links.length}
          query={query}
          onEdit={updateLink}
          onDelete={deleteLink}
          onTagClick={setQuery}
        />
      </div>
    </main>
    </>
  );
}
