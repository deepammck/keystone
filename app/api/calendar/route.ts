// Serves the signed-in user's deadlines as an iCalendar file download.
// The EventList "Export" button (client-side blob) does the same thing without
// a round trip; this route exists for browser-bar / scripted access in
// Supabase mode. Local mode has no server-side events to serve.
import { createClient } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/local-mode";
import { eventsToIcs, ICS_FILENAME } from "@/lib/ics";
import type { Event } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  if (isLocalMode()) {
    return Response.json(
      { error: "not-available-in-local-mode" },
      { status: 404 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id)
    .order("due_at", { ascending: true });
  if (error) {
    return Response.json({ error: "fetch-failed" }, { status: 500 });
  }

  return new Response(eventsToIcs((data ?? []) as Event[], Date.now()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ICS_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
