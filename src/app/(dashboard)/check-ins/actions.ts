"use server";

import { revalidatePath } from "next/cache";
import { publishCheckInToMeta } from "@/lib/meta/publish";
import type { MetaPlatform, PublishResult } from "@/lib/meta/types";
import { createClient } from "@/lib/supabase/server";
import type { CheckInCtaType } from "@/types/database";

type CreateCheckInInput = {
  businessId: string;
  fullAddress: string;
  lat: number;
  lng: number;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  description?: string;
  ctaType: CheckInCtaType;
  keywords?: string[];
};

export async function createCheckIn(input: CreateCheckInInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", input.businessId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!business) {
    return { error: "Business not found." };
  }

  if (!input.fullAddress.trim()) {
    return { error: "Address is required." };
  }

  const baseRow = {
    business_id: input.businessId,
    full_address: input.fullAddress.trim(),
    lat: input.lat,
    lng: input.lng,
    description: input.description?.trim() || null,
    cta_type: input.ctaType,
    status: "draft" as const,
  };

  // Try with address components + keywords; fall back if migrations 008/009
  // haven't run yet.
  let inserted = await supabase
    .from("check_ins")
    .insert({
      ...baseRow,
      city: input.city ?? null,
      region: input.region ?? null,
      country: input.country ?? null,
      keywords: input.keywords ?? [],
    })
    .select("*")
    .single();

  if (inserted.error) {
    inserted = await supabase
      .from("check_ins")
      .insert(baseRow)
      .select("*")
      .single();
  }

  const { data, error } = inserted;

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/check-ins");
  revalidatePath("/dashboard");
  revalidatePath("/map");
  return { data };
}

export async function updateCheckInStatus(
  checkInId: string,
  status: "draft" | "published" | "archived",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("check_ins")
    .update({ status })
    .eq("id", checkInId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/check-ins");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function saveBusinessKeywords(
  businessId: string,
  keywords: string[],
): Promise<{ error?: string; keywords?: string[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const cleaned = Array.from(
    new Set(
      keywords
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length > 0),
    ),
  ).slice(0, 50);

  const { error } = await supabase
    .from("businesses")
    .update({ keywords: cleaned })
    .eq("id", businessId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/check-ins");
  return { keywords: cleaned };
}

export async function publishCheckInToSocial(
  checkInId: string,
  platforms: MetaPlatform[] = ["facebook", "instagram"],
): Promise<{ error?: string; results?: PublishResult }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data: checkIn } = await supabase
    .from("check_ins")
    .select("id, business_id, businesses!inner ( user_id )")
    .eq("id", checkInId)
    .maybeSingle();

  if (!checkIn) {
    return { error: "Check-in not found." };
  }

  const owner = Array.isArray(checkIn.businesses)
    ? checkIn.businesses[0]?.user_id
    : (checkIn.businesses as { user_id: string } | null)?.user_id;

  if (owner !== user.id) {
    return { error: "Not allowed." };
  }

  if (platforms.length === 0) {
    return { error: "Select at least one platform." };
  }

  try {
    const results = await publishCheckInToMeta(checkInId, platforms);
    if (!results.facebook && !results.instagram) {
      return {
        error: "No matching Facebook/Instagram connection for this business.",
      };
    }
    return { results };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Publish failed." };
  }
}
