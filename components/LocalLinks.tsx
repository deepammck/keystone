"use client";

import { useRef, useSyncExternalStore } from "react";
import { loadLocalLinks } from "@/lib/local-client";
import { LOCAL_USER_ID } from "@/lib/local-mode";
import type { Link } from "@/lib/types";
import { LinksTool } from "@/components/LinksTool";

const noopSubscribe = () => () => {};

// Loads initial links from localStorage. localStorage is browser-only, so we
// read it through useSyncExternalStore with a null server snapshot: the server
// and first client paint both render null (no hydration mismatch), then React
// re-renders on the client with the loaded data. The ref caches the snapshot so
// getSnapshot returns a stable reference.
export function LocalLinks() {
  const cache = useRef<Link[] | null>(null);
  const initial = useSyncExternalStore(
    noopSubscribe,
    () => (cache.current ??= loadLocalLinks() as Link[]),
    () => null,
  );

  if (!initial) return null;
  return <LinksTool userId={LOCAL_USER_ID} initialLinks={initial} />;
}
