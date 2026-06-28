"use server";

import { revalidatePath } from "next/cache";
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
