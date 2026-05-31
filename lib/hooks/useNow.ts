"use client";

import { useEffect, useState } from "react";

// Current epoch ms, refreshed on an interval. The initial value is set in an
// effect (not during render) to keep render pure per React 19 rules.
export function useNow(intervalMs = 60000): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}
