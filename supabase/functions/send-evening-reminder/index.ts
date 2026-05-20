import { authorizeRequest } from "../_shared/auth.ts";
import { jsonResponse, sendOutbox } from "../_shared/send-outbox.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import {
  buildEveningMessage,
  buildEveningTemplateParams,
  EveningRow,
} from "../_shared/workout-message.ts";

const INTENT = "evening_reminder";
const TEMPLATE_NAME = "evening_reminder_he";
const TEMPLATE_LANGUAGE = "he";

Deno.serve(async (request) => {
  if (!authorizeRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("get_whatsapp_evening_outbox");

  if (error) {
    console.error("rpc error", error);
    return jsonResponse(500, { error: error.message });
  }

  const rows = (data ?? []) as EveningRow[];
  const { dryRun, results } = await sendOutbox(supabase, {
    rows,
    intent: INTENT,
    buildMessage: buildEveningMessage,
    buildTemplate: (row) => ({
      name: TEMPLATE_NAME,
      language: TEMPLATE_LANGUAGE,
      parameters: buildEveningTemplateParams(row),
    }),
  });

  return jsonResponse(200, { dryRun, total: rows.length, results });
});
