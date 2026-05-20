import { authorizeRequest } from "../_shared/auth.ts";
import { jsonResponse, sendOutbox } from "../_shared/send-outbox.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { buildMorningMessage, MorningRow } from "../_shared/workout-message.ts";

const INTENT = "morning_workout";
// daily_workout_he is still PENDING in Meta — send free text until APPROVED.
// Do NOT use evening_reminder_he here (wrong copy + wrong {{3}} meaning).

Deno.serve(async (request) => {
  if (!authorizeRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("get_whatsapp_morning_outbox");

  if (error) {
    console.error("rpc error", error);
    return jsonResponse(500, { error: error.message });
  }

  const rows = (data ?? []) as MorningRow[];
  const { dryRun, results } = await sendOutbox(supabase, {
    rows,
    intent: INTENT,
    buildMessage: buildMorningMessage,
  });

  return jsonResponse(200, { dryRun, total: rows.length, results });
});
