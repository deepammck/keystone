"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// The umbrella nav above the three tools. Keystone itself stays a single page;
// this switcher is an approved layer ABOVE it (see CLAUDE.md), not a section.
// Each tab is a real route so links are bookmarkable and back/forward work.
const TABS = [
  { key: "keystone", label: "Keystone", href: "/dashboard" },
  { key: "links", label: "Links", href: "/links" },
  { key: "college", label: "College", href: "/college" },
] as const;

export function AppSwitcher({ userId }: { userId: string }) {
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());

  // Remember the last tool opened (localStorage for instant use, profile for
  // cross-device) — mirrors how the theme setting is persisted.
  function remember(key: string) {
    try {
      localStorage.setItem("keystone:last-app", key);
    } catch {}
    // Best-effort; not awaited — navigation shouldn't wait on the write.
    void supabase.from("profiles").upsert({ id: userId, last_app: key });
  }

  // A segmented control on a tint track (the active tool is a raised chip), with
  // a hairline below to separate the umbrella nav from the tool's own UI — so
  // "I'm switching apps" reads differently from in-page filters.
  return (
    <nav
      className="mb-5 flex items-center border-b border-border pb-3"
      aria-label="Apps"
    >
      <div className="inline-flex items-center gap-1 rounded-full bg-tint p-1">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              onClick={() => remember(tab.key)}
              aria-current={active ? "page" : undefined}
              className={`press rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-bg text-text shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
