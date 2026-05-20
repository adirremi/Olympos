import { optionalEnv, requireEnv } from "./env.ts";

const META_BASE = "https://graph.facebook.com/v20.0";

export function metaConfigured(): boolean {
  return Boolean(
    optionalEnv("META_WHATSAPP_TOKEN") && optionalEnv("META_PHONE_NUMBER_ID"),
  );
}

export type SendResult = {
  ok: boolean;
  messageId: string | null;
  status: number;
  raw: unknown;
};

export async function sendText(to: string, body: string): Promise<SendResult> {
  const token = requireEnv("META_WHATSAPP_TOKEN");
  const phoneId = requireEnv("META_PHONE_NUMBER_ID");

  const response = await fetch(`${META_BASE}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  const raw = await response.json().catch(() => ({}));
  const messageId = (raw as { messages?: Array<{ id: string }> }).messages?.[0]?.id ?? null;

  return {
    ok: response.ok,
    messageId,
    status: response.status,
    raw,
  };
}

export async function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParameters: string[],
): Promise<SendResult> {
  const token = requireEnv("META_WHATSAPP_TOKEN");
  const phoneId = requireEnv("META_PHONE_NUMBER_ID");

  const response = await fetch(`${META_BASE}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: "body",
            parameters: bodyParameters.map((text) => ({ type: "text", text })),
          },
        ],
      },
    }),
  });

  const raw = await response.json().catch(() => ({}));
  const messageId = (raw as { messages?: Array<{ id: string }> }).messages?.[0]?.id ?? null;

  return {
    ok: response.ok,
    messageId,
    status: response.status,
    raw,
  };
}
