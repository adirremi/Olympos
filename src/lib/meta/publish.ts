import { createAdminClient } from "@/lib/supabase/admin";
import { publishImageToInstagram, publishToFacebookPage } from "./api";

type PublishResult = {
  facebook?: { ok: boolean; id?: string; error?: string };
  instagram?: { ok: boolean; id?: string; error?: string };
};

type ConnectionRow = {
  id: string;
  provider: "facebook" | "instagram";
  account_id: string | null;
  metadata: Record<string, unknown> | null;
};

// Publishes a check-in to the business's connected Meta platforms.
// Facebook: text post (description + address). Instagram: first image + caption.
export async function publishCheckInToMeta(
  checkInId: string,
): Promise<PublishResult> {
  const admin = createAdminClient();

  const { data: checkIn, error: checkInError } = await admin
    .from("check_ins")
    .select("id, business_id, full_address, description")
    .eq("id", checkInId)
    .single();

  if (checkInError || !checkIn) {
    throw new Error(checkInError?.message ?? "Check-in not found.");
  }

  const { data: media } = await admin
    .from("check_in_media")
    .select("image_url, media_type, sort_order")
    .eq("check_in_id", checkInId)
    .eq("media_type", "image")
    .order("sort_order")
    .limit(1);

  const imageUrl = media?.[0]?.image_url as string | undefined;

  const { data: connections } = await admin
    .from("platform_connections")
    .select("id, provider, account_id, metadata")
    .eq("business_id", checkIn.business_id)
    .in("provider", ["facebook", "instagram"])
    .eq("status", "connected");

  const rows = (connections ?? []) as ConnectionRow[];
  const result: PublishResult = {};

  const caption = [checkIn.description, checkIn.full_address]
    .filter(Boolean)
    .join("\n\n");

  for (const connection of rows) {
    const { data: secret } = await admin
      .from("platform_connection_secrets")
      .select("access_token")
      .eq("connection_id", connection.id)
      .maybeSingle();

    const pageToken = (secret as { access_token: string } | null)?.access_token;
    if (!pageToken) {
      continue;
    }

    if (connection.provider === "facebook" && connection.account_id) {
      try {
        const id = await publishToFacebookPage(
          connection.account_id,
          pageToken,
          caption || checkIn.full_address,
        );
        result.facebook = { ok: true, id };
      } catch (error) {
        result.facebook = {
          ok: false,
          error: error instanceof Error ? error.message : "Failed.",
        };
      }
    }

    if (connection.provider === "instagram" && connection.account_id) {
      if (!imageUrl) {
        result.instagram = {
          ok: false,
          error: "Instagram requires at least one image on the check-in.",
        };
        continue;
      }
      try {
        const id = await publishImageToInstagram(
          connection.account_id,
          pageToken,
          imageUrl,
          caption || checkIn.full_address,
        );
        result.instagram = { ok: true, id };
      } catch (error) {
        result.instagram = {
          ok: false,
          error: error instanceof Error ? error.message : "Failed.",
        };
      }
    }
  }

  return result;
}
