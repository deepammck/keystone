import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LinksTool } from "@/components/LinksTool";
import { LocalLinks } from "@/components/LocalLinks";
import { ThemeSync } from "@/components/ThemeSync";
import { isLocalMode } from "@/lib/local-mode";
import type { Link } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  if (isLocalMode()) return <LocalLinks />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from("links")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("theme").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <>
      <ThemeSync theme={profile?.theme ?? "dark"} />
      <LinksTool userId={user.id} initialLinks={(data ?? []) as Link[]} />
    </>
  );
}
