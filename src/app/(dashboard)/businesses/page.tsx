import { BusinessManager } from "./business-manager";
import { createClient } from "@/lib/supabase/server";

export default async function BusinessesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: businesses } = await supabase
    .from("businesses")
    .select(
      `
      id,
      user_id,
      name,
      created_at,
      business_invitations (
        id,
        email,
        status,
        expires_at,
        invited_by,
        role,
        token,
        accepted_at,
        created_at,
        business_id
      )
    `,
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">My Businesses</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create businesses, invite teammates, and connect social accounts later.
        </p>
      </header>

      <BusinessManager businesses={businesses ?? []} />
    </div>
  );
}
