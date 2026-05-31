// Local mode runs the whole app off localStorage with no auth and no Supabase.
// It auto-activates when real credentials are absent, so the app is usable
// before any Supabase project exists. Force it on/off with NEXT_PUBLIC_LOCAL_MODE.
export function isLocalMode(): boolean {
  const flag = process.env.NEXT_PUBLIC_LOCAL_MODE;
  if (flag === "true") return true;
  if (flag === "false") return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes("placeholder");
}

export const LOCAL_USER_ID = "local-user";
