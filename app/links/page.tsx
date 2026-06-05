import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LinksTool } from "@/components/LinksTool";
import { LocalLinks } from "@/components/LocalLinks";
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

  const { data } = await supabase
    .from("links")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <LinksTool userId={user.id} initialLinks={(data ?? []) as Link[]} />;
}
