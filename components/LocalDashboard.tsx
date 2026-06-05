"use client";

import { useRef, useSyncExternalStore } from "react";
import { loadLocalInitial } from "@/lib/local-client";
import { Dashboard } from "@/components/Dashboard";

const noopSubscribe = () => () => {};

// Loads initial state from localStorage. localStorage is browser-only, so we
// read it through useSyncExternalStore with a null server snapshot: the server
// and first client paint both render null (no hydration mismatch), then React
// re-renders on the client with the loaded data. The ref caches the snapshot so
// getSnapshot returns a stable reference.
export function LocalDashboard() {
  const cache = useRef<ReturnType<typeof loadLocalInitial> | null>(null);
  const props = useSyncExternalStore(
    noopSubscribe,
    () =>
      (cache.current ??= loadLocalInitial(
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      )),
    () => null,
  );

  if (!props) return null;
  return <Dashboard {...props} />;
}
