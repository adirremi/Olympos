"use server";

import { revalidatePath } from "next/cache";
import { publishCheckInToMeta } from "@/lib/meta/publish";
import { createClient } from "@/lib/supabase/server";
import type { CheckInCtaType } from "@/types/database";

type CreateCheckInInput = {
  businessId: string;
  fullAddress: string;
  lat: number;
  lng: number;
  description?: string;
  ctaType: CheckInCtaType;
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

  const { data, error } = await supabase
    .from("check_ins")
    .insert({
      business_id: input.businessId,
      full_address: input.fullAddress.trim(),
      lat: input.lat,
      lng: input.lng,
      description: input.description?.trim() || null,
      cta_type: input.ctaType,
      status: "draft",
    })
    .select("*")
    .single();

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

export async function publishCheckInToSocial(checkInId: string) {
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

  try {
    const result = await publishCheckInToMeta(checkInId);
    const parts: string[] = [];
    if (result.facebook) {
      parts.push(
        result.facebook.ok
          ? "Facebook: posted"
          : `Facebook: ${result.facebook.error}`,
      );
    }
    if (result.instagram) {
      parts.push(
        result.instagram.ok
          ? "Instagram: posted"
          : `Instagram: ${result.instagram.error}`,
      );
    }
    if (parts.length === 0) {
      return { error: "No Facebook/Instagram connection for this business." };
    }
    return { success: true, message: parts.join(" · ") };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Publish failed." };
  }
}
