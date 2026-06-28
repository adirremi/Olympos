import { createClient } from "@/lib/supabase/server";

export async function acceptPendingInvitations(userId: string, email: string | undefined) {
  if (!email) {
    return;
  }

  const supabase = await createClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: invitations } = await supabase
    .from("business_invitations")
    .select("id, business_id, role")
    .eq("status", "pending")
    .ilike("email", normalizedEmail)
    .gt("expires_at", new Date().toISOString());

  if (!invitations?.length) {
    return;
  }

  for (const invitation of invitations) {
    await supabase.from("business_members").upsert(
      {
        business_id: invitation.business_id,
        user_id: userId,
        role: invitation.role,
      },
      { onConflict: "business_id,user_id" },
    );

    await supabase
      .from("business_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);
  }
}
