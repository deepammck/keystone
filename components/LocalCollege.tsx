"use client";

import { useRef, useSyncExternalStore } from "react";
import { loadLocalCollege } from "@/lib/local-client";
import { LOCAL_USER_ID } from "@/lib/local-mode";
import type { CollegeData } from "@/lib/types";
import { CollegeTool } from "@/components/CollegeTool";

const noopSubscribe = () => () => {};

// Loads initial College data from localStorage. localStorage is browser-only, so
// we read it through useSyncExternalStore with a null server snapshot: the server
// and first client paint both render null (no hydration mismatch), then React
// re-renders on the client with the loaded data. The ref caches the snapshot so
// getSnapshot returns a stable reference.
export function LocalCollege() {
  const cache = useRef<CollegeData | null>(null);
  const data = useSyncExternalStore(
    noopSubscribe,
    () => (cache.current ??= loadLocalCollege() as CollegeData),
    () => null,
  );

  if (!data) return null;
  return <CollegeTool userId={LOCAL_USER_ID} data={data} />;
}
