import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return data;
}

export async function requireOnboarding(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  return Boolean(profile?.onboarding_completed_at);
}

export async function getUserBusinessIds(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data: owned } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId);

  const { data: memberOf } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", userId);

  const ids = new Set<string>();
  owned?.forEach((row) => ids.add(row.id));
  memberOf?.forEach((row) => ids.add(row.business_id));

  return Array.from(ids);
}
