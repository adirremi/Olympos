"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateReadinessLevel(formData: FormData) {
  const value = Number(formData.get("level"));
  if (Number.isNaN(value) || value < 0 || value > 100) {
    throw new Error("Invalid readiness level");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("user_profile")
    .update({ readiness_level: value })
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

export async function updateEventDates(formData: FormData) {
  const enlistmentDate = (formData.get("enlistmentDate") as string) || null;
  const gibushDate = (formData.get("gibushDate") as string) || null;
  const sayeretDayDate = (formData.get("sayeretDayDate") as string) || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("user_profile")
    .update({
      target_event_date: enlistmentDate || null,
      gibush_date: gibushDate || null,
      sayeret_day_date: sayeretDayDate || null,
    })
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}
