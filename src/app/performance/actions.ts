"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  currentMonthStart,
  parseRunTimeToSeconds,
} from "@/lib/performance";
import { createClient } from "@/lib/supabase/server";

export async function submitMonthlyPerformance(formData: FormData) {
  const run2000Seconds = parseRunTimeToSeconds(
    formData.get("runMinutes"),
    formData.get("runSeconds"),
  );
  const pullups = Number(formData.get("pullups"));
  const pushups = Number(formData.get("pushups"));

  if (
    run2000Seconds === null ||
    !Number.isInteger(pullups) ||
    !Number.isInteger(pushups) ||
    pullups < 0 ||
    pushups < 0
  ) {
    throw new Error("Invalid monthly test values");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("submit_monthly_performance_test", {
    p_user_id: user.id,
    p_test_month: currentMonthStart(),
    p_run_2000_seconds: run2000Seconds,
    p_pullups: pullups,
    p_pushups: pushups,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/performance");
  revalidatePath("/dashboard");
}
