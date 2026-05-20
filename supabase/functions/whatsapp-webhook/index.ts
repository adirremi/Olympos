import { createServiceClient } from "../_shared/supabase.ts";
import { optionalEnv } from "../_shared/env.ts";

type ParsedInbound = {
  phone: string;
  messageId: string | null;
  body: string;
  status: "completed" | "missed" | null;
};

Deno.serve(async (request) => {
  const url = new URL(request.url);

  if (request.method === "GET") {
    return handleVerify(url);
  }

  if (request.method === "POST") {
    return handleInbound(request);
  }

  return new Response("Method Not Allowed", { status: 405 });
});

function handleVerify(url: URL): Response {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = optionalEnv("META_VERIFY_TOKEN");

  if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

async function handleInbound(request: Request): Promise<Response> {
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return new Response("Bad Request", { status: 400 });
  }

  const parsed = extractInbound(payload);
  if (!parsed) {
    return new Response("OK", { status: 200 });
  }

  const supabase = createServiceClient();

  await supabase.rpc("log_whatsapp_inbound", {
    p_phone_number: parsed.phone,
    p_body: parsed.body,
    p_whatsapp_message_id: parsed.messageId,
    p_raw_payload: payload,
    p_intent: parsed.status,
  });

  if (parsed.status) {
    await supabase.rpc("mark_training_from_whatsapp", {
      p_phone_number: parsed.phone,
      p_status: parsed.status,
    });
  }

  return new Response("OK", { status: 200 });
}

function extractInbound(payload: unknown): ParsedInbound | null {
  const root = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<Record<string, unknown>>;
        };
      }>;
    }>;
  };

  const message = root.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return null;

  const phone = String(message.from ?? "");
  const messageId = message.id ? String(message.id) : null;
  const body = extractBody(message);
  const status = parseStatus(body, message);

  if (!phone) return null;

  return { phone, messageId, body, status };
}

function extractBody(message: Record<string, unknown>): string {
  if (message.type === "text") {
    const text = message.text as { body?: string } | undefined;
    return text?.body?.trim() ?? "";
  }

  if (message.type === "button") {
    const button = message.button as { text?: string; payload?: string } | undefined;
    return button?.text?.trim() ?? button?.payload?.trim() ?? "";
  }

  if (message.type === "interactive") {
    const interactive = message.interactive as {
      type?: string;
      button_reply?: { id?: string; title?: string };
      list_reply?: { id?: string; title?: string };
    };

    if (interactive.button_reply) {
      return interactive.button_reply.title ?? interactive.button_reply.id ?? "";
    }

    if (interactive.list_reply) {
      return interactive.list_reply.title ?? interactive.list_reply.id ?? "";
    }
  }

  return "";
}

function parseStatus(
  body: string,
  message: Record<string, unknown>,
): "completed" | "missed" | null {
  const normalized = body.trim().toLowerCase();

  if (message.type === "button") {
    const button = message.button as { text?: string; payload?: string } | undefined;
    const label = (button?.text ?? button?.payload ?? "").trim().toLowerCase();
    if (label.includes("ביצעתי")) return "completed";
    if (label.includes("לא הספקתי")) return "missed";
  }

  if (message.type === "interactive") {
    const interactive = message.interactive as {
      button_reply?: { id?: string; title?: string };
      list_reply?: { id?: string; title?: string };
    };
    const id = interactive.button_reply?.id ?? interactive.list_reply?.id ?? "";
    const title = (interactive.button_reply?.title ?? interactive.list_reply?.title ?? "").toLowerCase();
    if (id === "completed" || id === "1" || title.includes("ביצעתי")) return "completed";
    if (id === "missed" || id === "2" || title.includes("לא הספקתי")) return "missed";
  }

  if (normalized === "1" || normalized.includes("ביצעתי")) return "completed";
  if (normalized === "2" || normalized.includes("לא הספקתי")) return "missed";

  return null;
}
