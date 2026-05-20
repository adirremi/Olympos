import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyTrainingLevel } from "@/lib/classify";
import { normalizeIsraeliPhoneForWhatsApp } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

const onboardingSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(9),
  region: z.string().optional(),
  recruitmentTarget: z.string().min(1),
  run2kMinutes: z.coerce.number().min(5).max(30),
  maxPullups: z.coerce.number().min(0).max(50),
  maxPushups: z.coerce.number().min(0).max(150),
  weeklyTrainingDays: z.coerce.number().min(0).max(7),
  motivationLevel: z.coerce.number().min(1).max(5),
  hasInjury: z.boolean(),
  injuryDetails: z.string().optional(),
  targetEventDate: z.string().optional(),
  gibushDate: z.string().optional(),
  sayeretDayDate: z.string().optional(),
  acceptedHealthDeclaration: z.boolean(),
});

export async function POST(request: Request) {
  const payload = onboardingSchema.parse(await request.json());
  let normalizedPhone: string;

  if (!payload.acceptedHealthDeclaration) {
    return NextResponse.json(
      { error: "Health declaration required" },
      { status: 400 },
    );
  }

  try {
    normalizedPhone = normalizeIsraeliPhoneForWhatsApp(payload.phone);
  } catch {
    return NextResponse.json(
      { error: "מספר WhatsApp חייב להיות מספר נייד ישראלי תקין, למשל 05XXXXXXXX" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const level = classifyTrainingLevel({
    run2kMinutes: payload.run2kMinutes,
    maxPullups: payload.maxPullups,
    maxPushups: payload.maxPushups,
    weeklyTrainingDays: payload.weeklyTrainingDays,
    motivationLevel: payload.motivationLevel,
    hasInjury: payload.hasInjury,
  });

  const { error } = await supabase.rpc("complete_onboarding", {
    p_user_id: user.id,
    p_full_name: payload.fullName,
    p_phone: normalizedPhone,
    p_region: payload.region || null,
    p_recruitment_target: payload.recruitmentTarget,
    p_training_level: level,
    p_questionnaire_data: { ...payload, phone: normalizedPhone },
    p_target_event_date: payload.targetEventDate || null,
    p_gibush_date: payload.gibushDate || null,
    p_sayeret_day_date: payload.sayeretDayDate || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, level });
}
