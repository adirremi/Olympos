import { createClient } from "@/lib/supabase/server";

const fullBusinessSelect = `
  id,
  user_id,
  name,
  source,
  address,
  gmb_location_id,
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
`;

const basicBusinessSelect = `
  id,
  user_id,
  name,
  created_at
`;

export async function getBusinessesForUser(userId: string) {
  const supabase = await createClient();

  const full = await supabase
    .from("businesses")
    .select(fullBusinessSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!full.error) {
    return {
      businesses: (full.data ?? []).map((business) => ({
        ...business,
        source: business.source ?? "manual",
        address: business.address ?? null,
        gmb_location_id: business.gmb_location_id ?? null,
        business_invitations: Array.isArray(business.business_invitations)
          ? business.business_invitations
          : [],
      })),
      dbWarning: null,
    };
  }

  const basic = await supabase
    .from("businesses")
    .select(basicBusinessSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (basic.error) {
    return {
      businesses: [],
      dbWarning: `Database error: ${basic.error.message}. Run migrations 000, 002, and 003 in Supabase.`,
    };
  }

  return {
    businesses: (basic.data ?? []).map((business) => ({
      ...business,
      source: "manual",
      address: null,
      gmb_location_id: null,
      business_invitations: [],
    })),
    dbWarning:
      "Some database migrations may be missing. Run 002 and 003 in Supabase SQL Editor.",
  };
}
