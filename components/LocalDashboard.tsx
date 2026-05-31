"use client";

import { useState } from "react";
import { loadLocalInitial } from "@/lib/local-client";
import { Dashboard } from "@/components/Dashboard";

// Loads initial state from localStorage on the client (the server has no
// localStorage), then renders the same Dashboard used in Supabase mode.
export function LocalDashboard() {
  const [props] = useState(() => {
    if (typeof window === "undefined") return null;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return loadLocalInitial(tz);
  });

  if (!props) return null;
  return <Dashboard {...props} />;
}
