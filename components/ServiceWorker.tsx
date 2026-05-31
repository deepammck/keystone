"use client";

import { useEffect } from "react";

// Registers the hand-written service worker (public/sw.js). Disabled in dev to
// avoid stale-cache surprises while iterating.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
