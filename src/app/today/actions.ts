"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function upsertTodayLog(status: "completed" | "missed"): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("cohort_id")
    .eq("user_id", user.id)
    .maybeSingle<{ cohort_id: string | null }>();

  const cohortId = enrollment?.cohort_id ?? null;
  const currentDay = new Date().getDay() + 1;

  const { data: plan } = cohortId
    ? await supabase
        .from("training_plans")
        .select("id, details")
        .eq("cohort_id", cohortId)
        .eq("week_number", 1)
        .eq("day_in_week", currentDay)
        .maybeSingle<{ id: string; details: unknown }>()
    : { data: null };

  const today = new Date().toISOString().slice(0, 10);

  const { data: upserted, error } = await supabase
    .from("training_log")
    .upsert(
      {
        user_id: user.id,
        plan_id: plan?.id ?? null,
        scheduled_for: today,
        workout_snapshot: plan?.details ?? {},
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,scheduled_for" },
    )
    .select("id")
    .single<{ id: string }>();

  if (error || !upserted) {
    throw new Error(error?.message ?? "Failed to save training log");
  }

  revalidatePath("/today");
  revalidatePath("/dashboard");

  return upserted.id;
}

export async function markWorkoutCompleted() {
  const logId = await upsertTodayLog("completed");
  redirect(`/today/debrief?log=${logId}`);
}

export async function markWorkoutMissed() {
  await upsertTodayLog("missed");
  redirect("/dashboard?missed=1");
}

// Kept for backwards compatibility with the WhatsApp pipeline
// (older inbound webhook still calls this name).
export async function markWorkoutStatus(status: "completed" | "missed") {
  const logId = await upsertTodayLog(status);
  if (status === "completed") {
    redirect(`/today/debrief?log=${logId}`);
  }
  redirect("/dashboard?missed=1");
}

export type PerceivedPace = "cant_keep_up" | "on_target" | "could_do_more";

const VALID_PAIN_LOCATIONS = new Set([
  "knee_right",
  "knee_left",
  "lower_back",
  "upper_back",
  "shoulder_right",
  "shoulder_left",
  "shin_right",
  "shin_left",
  "ankle_right",
  "ankle_left",
  "hip",
  "neck",
  "other",
]);

export async function submitDebrief(logId: string, formData: FormData) {
  const rpe = Number(formData.get("rpe"));
  const perceivedPace = String(formData.get("pace") ?? "");
  const hasPain = String(formData.get("hasPain") ?? "") === "yes";
  const coachNoteRaw = String(formData.get("coachNote") ?? "").trim();
  const coachNote = coachNoteRaw.length ? coachNoteRaw.slice(0, 600) : null;

  if (!Number.isFinite(rpe) || rpe < 1 || rpe > 10) {
    throw new Error("מדד עומס לא תקין");
  }
  if (
    perceivedPace !== "cant_keep_up" &&
    perceivedPace !== "on_target" &&
    perceivedPace !== "could_do_more"
  ) {
    throw new Error("Invalid perceived pace");
  }

  const painLocations = hasPain
    ? Array.from(new Set(formData.getAll("painLocations").map(String)))
        .filter((loc) => VALID_PAIN_LOCATIONS.has(loc))
    : [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase.from("training_debriefs").upsert(
    {
      user_id: user.id,
      training_log_id: logId,
      rpe,
      perceived_pace: perceivedPace,
      has_pain: hasPain,
      pain_locations: painLocations,
      coach_note: coachNote,
    },
    { onConflict: "training_log_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  redirect(`/today/debrief?log=${logId}&done=1`);
}
