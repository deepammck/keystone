"use client";

import { useEffect } from "react";

// The profile theme is the source of truth. The inline <head> script paints
// from the localStorage cache for an instant, flash-free load; this reconciles
// to the DB value so the theme survives a wiped/evicted cache and follows the
// account across devices. Rendered by every tool's page (not just Keystone) so
// /links and /college can't drift back to the default theme.
export function ThemeSync({ theme }: { theme: string }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("keystone:theme", theme);
    } catch {}
  }, [theme]);
  return null;
}
