import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { metaConfigured, sendTemplate, sendText } from "./whatsapp.ts";

export type SendOutboxResult = {
  user_id: string;
  phone: string;
  status: string;
  messageId: string | null;
};

export type TemplateSpec = {
  name: string;
  language: string;
  parameters: string[];
};

export type OutboxOptions<T> = {
  rows: T[];
  intent: string;
  buildMessage: (row: T) => string;
  buildTemplate?: (row: T) => TemplateSpec | null;
};

export async function sendOutbox<T extends { user_id: string; phone: string }>(
  supabase: SupabaseClient,
  options: OutboxOptions<T>,
): Promise<{ dryRun: boolean; results: SendOutboxResult[] }> {
  const dryRun = !metaConfigured();
  const results: SendOutboxResult[] = [];

  for (const row of options.rows) {
    const body = options.buildMessage(row);
    const template = options.buildTemplate ? options.buildTemplate(row) : null;

    let messageId: string | null = null;
    let status = "queued";
    let raw: unknown = { dryRun: true, body, template };

    if (!dryRun) {
      const sent = template
        ? await sendTemplate(row.phone, template.name, template.language, template.parameters)
        : await sendText(row.phone, body);
      messageId = sent.messageId;
      raw = sent.raw;
      status = sent.ok ? "sent" : "failed";
      if (!sent.ok) {
        console.error("meta send failed", row.user_id, sent.status, sent.raw);
      }
    }

    await supabase.rpc("log_whatsapp_outbound", {
      p_user_id: row.user_id,
      p_phone_number: row.phone,
      p_body: body,
      p_intent: options.intent,
      p_whatsapp_message_id: messageId,
      p_raw_payload: raw as Record<string, unknown>,
    });

    results.push({
      user_id: row.user_id,
      phone: row.phone,
      status,
      messageId,
    });
  }

  return { dryRun, results };
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}
