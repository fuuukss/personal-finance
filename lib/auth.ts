import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getOwnerSession = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isOwner, error } = await supabase.rpc("is_current_owner");
  if (error || !isOwner) return null;
  return { user, supabase };
});

export async function requireOwner() {
  const session = await getOwnerSession();
  if (!session) redirect("/login");
  return session;
}
