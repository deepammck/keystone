import { createBrowserClient } from "@supabase/ssr";
import { isLocalMode } from "@/lib/local-mode";
import { createLocalClient } from "@/lib/local-client";

// Wrapper so ReturnType captures the fully-resolved generic return type
// (with inferred Database/Schema params) rather than the raw generic
// signature of createBrowserClient itself — preserving query type inference.
function _mkRealClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
type BrowserClient = ReturnType<typeof _mkRealClient>;

// Module-level singletons so every hook shares a single connection and
// subscription transport instead of opening a new WebSocket per hook.
let _realClient: BrowserClient | null = null;
let _localClient: BrowserClient | null = null;

export function createClient(): BrowserClient {
  if (isLocalMode()) {
    if (!_localClient) {
      _localClient = createLocalClient() as unknown as BrowserClient;
    }
    return _localClient;
  }
  if (!_realClient) {
    _realClient = _mkRealClient();
  }
  return _realClient;
}
