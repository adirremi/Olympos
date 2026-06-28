"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type OnboardingInput = {
  fullName: string;
  phone?: string;
  businessName: string;
};

export async function completeOnboarding(input: OnboardingInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = input.fullName.trim();
  const businessName = input.businessName.trim();
  const phone = input.phone?.trim() || null;

  if (!fullName || !businessName) {
    return { error: "Full name and business name are required." };
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      full_name: fullName,
      phone,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    return { error: profileError.message };
  }

  const { data: existingBusiness } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!existingBusiness) {
    const { error: businessError } = await supabase.from("businesses").insert({
      user_id: user.id,
      name: businessName,
    });

    if (businessError) {
      return { error: businessError.message };
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
