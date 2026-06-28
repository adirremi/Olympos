import { createAdminClient } from "@/lib/supabase/admin";
import { buildOverlayImageUrl } from "@/lib/image/overlay";
import {
  publishImageToInstagram,
  publishPhotoToFacebookPage,
  publishToFacebookPage,
} from "./api";
import type { MetaPlatform, PublishResult } from "./types";

export type { MetaPlatform, PublishResult } from "./types";

type ConnectionRow = {
  id: string;
  provider: MetaPlatform;
  account_id: string | null;
};

function locationLabel(checkIn: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string | null {
  const parts = [checkIn.city, checkIn.region, checkIn.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

// Publishes a check-in to the selected Meta platforms. Overlays the business
// name + location onto the image before posting.
export async function publishCheckInToMeta(
  checkInId: string,
  platforms: MetaPlatform[] = ["facebook", "instagram"],
): Promise<PublishResult> {
  const admin = createAdminClient();

  const { data: checkIn, error: checkInError } = await admin
    .from("check_ins")
    .select(
      "id, business_id, full_address, description, city, region, country, businesses ( name )",
    )
    .eq("id", checkInId)
    .single();

  if (checkInError || !checkIn) {
    throw new Error(checkInError?.message ?? "Check-in not found.");
  }

  const businessName = Array.isArray(checkIn.businesses)
    ? checkIn.businesses[0]?.name
    : (checkIn.businesses as { name?: string } | null)?.name;

  const { data: media } = await admin
    .from("check_in_media")
    .select("image_url, media_type, sort_order")
    .eq("check_in_id", checkInId)
    .eq("media_type", "image")
    .order("sort_order")
    .limit(1);

  const originalImageUrl = media?.[0]?.image_url as string | undefined;
  const label = locationLabel(checkIn);

  // Build the overlay image once and reuse for both platforms.
  let postImageUrl = originalImageUrl;
  if (originalImageUrl) {
    postImageUrl = await buildOverlayImageUrl({
      imageUrl: originalImageUrl,
      businessName: businessName ?? "",
      locationLabel: label,
      checkInId,
    });
  }

  const { data: connections } = await admin
    .from("platform_connections")
    .select("id, provider, account_id")
    .eq("business_id", checkIn.business_id)
    .in("provider", platforms)
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
        const id = postImageUrl
          ? await publishPhotoToFacebookPage(
              connection.account_id,
              pageToken,
              postImageUrl,
              caption || checkIn.full_address,
            )
          : await publishToFacebookPage(
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
      if (!postImageUrl) {
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
          postImageUrl,
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
