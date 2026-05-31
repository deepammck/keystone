import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isLocalMode } from "@/lib/local-mode";

export default async function proxy(request: NextRequest) {
  if (isLocalMode()) return NextResponse.next();
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets, the service worker, manifest,
     * and image files.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
