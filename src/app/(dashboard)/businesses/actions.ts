"use server";

import { revalidatePath } from "next/cache";
import { fetchGoogleBusinessLocations } from "@/lib/google-business/api";
import { getValidGoogleAccessToken } from "@/lib/google-business/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { GmbLocation } from "@/lib/google-business/api";

export async function createBusiness(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Business name is required." };
  }

  const { data, error } = await supabase
    .from("businesses")
    .insert({ user_id: user.id, name: trimmed })
    .select("id, name, created_at")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/businesses");
  revalidatePath("/dashboard");
  return { data };
}

export async function deleteBusiness(businessId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("businesses")
    .delete()
    .eq("id", businessId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/businesses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function inviteBusinessMember(businessId: string, email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!business) {
    return { error: "Business not found." };
  }

  const { data: invitation, error } = await supabase
    .from("business_invitations")
    .insert({
      business_id: businessId,
      email: normalizedEmail,
      invited_by: user.id,
      role: "member",
    })
    .select("id, email, status, expires_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "This email was already invited to this business." };
    }
    return { error: error.message };
  }

  try {
    const admin = createAdminClient();
    await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/auth/callback`,
    });
  } catch {
    // User may already exist in auth — membership is still granted on next login.
  }

  revalidatePath("/businesses");
  return { data: invitation };
}

export async function revokeInvitation(invitationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("business_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/businesses");
  return { success: true };
}

export async function listGoogleBusinessLocations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const accessToken = await getValidGoogleAccessToken(user.id);
  if (!accessToken) {
    return { error: "Connect Google Business first." };
  }

  try {
    const locations = await fetchGoogleBusinessLocations(accessToken);
    return { data: locations };
  } catch (listError) {
    return {
      error:
        listError instanceof Error
          ? listError.message
          : "Failed to load Google Business locations.",
    };
  }
}

export async function importGoogleBusinessLocation(location: GmbLocation) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("gmb_location_id", location.locationId)
    .maybeSingle();

  if (existing) {
    return { error: "This Google location is already imported." };
  }

  const { data: business, error } = await supabase
    .from("businesses")
    .insert({
      user_id: user.id,
      name: location.locationName,
      source: "google",
      address: location.address,
      gmb_account_id: location.accountId,
      gmb_location_id: location.locationId,
      google_place_id: location.placeId,
    })
    .select("id, name")
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from("platform_connections").upsert(
    {
      business_id: business.id,
      provider: "gmb",
      account_id: location.locationId,
      account_name: location.locationName,
      status: "connected",
      metadata: {
        accountId: location.accountId,
        accountName: location.accountName,
        address: location.address,
        placeId: location.placeId,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id,provider" },
  );

  revalidatePath("/businesses");
  revalidatePath("/dashboard");
  revalidatePath("/connections");
  return { data: business };
}
