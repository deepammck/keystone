import { createBrowserClient } from "@supabase/ssr";
import { isLocalMode } from "@/lib/local-mode";
import { createLocalClient } from "@/lib/local-client";

function realClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export function createClient() {
  if (isLocalMode()) {
    // Cast to the real client's inferred type so callers keep full typing.
    return createLocalClient() as unknown as ReturnType<typeof realClient>;
  }
  return realClient();
}
