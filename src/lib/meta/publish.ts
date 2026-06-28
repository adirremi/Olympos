import { createAdminClient } from "@/lib/supabase/admin";
import { buildOverlayImageUrl } from "@/lib/image/overlay";
import { keywordsToHashtags } from "@/lib/keywords";
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

// Returns the first URL whose object actually exists (HTTP 200). Meta fetches
// images server-side, so a 404 URL fails the whole publish.
async function firstReachableUrl(urls: string[]): Promise<string | undefined> {
  for (const url of urls) {
    try {
      let res = await fetch(url, { method: "HEAD" });
      if (!res.ok) {
        res = await fetch(url, { method: "GET" });
      }
      if (res.ok) {
        return url;
      }
    } catch {
      // try the next candidate
    }
  }
  return undefined;
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
      "id, business_id, full_address, description, city, region, country, keywords, businesses ( name )",
    )
    .eq("id", checkInId)
    .single();

  if (checkInError || !checkIn) {
    throw new Error(checkInError?.message ?? "Check-in not found.");
  }

  const hashtags = keywordsToHashtags(
    Array.isArray(checkIn.keywords) ? (checkIn.keywords as string[]) : [],
  );

  const businessName = Array.isArray(checkIn.businesses)
    ? checkIn.businesses[0]?.name
    : (checkIn.businesses as { name?: string } | null)?.name;

  const { data: media } = await admin
    .from("check_in_media")
    .select("image_url, media_type, sort_order, created_at")
    .eq("check_in_id", checkInId)
    .eq("media_type", "image")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  // A check-in can have stale rows whose storage object was removed. Pick the
  // first image whose file is actually reachable so we never hand Meta a dead
  // URL (which surfaces as "media could not be fetched" / "invalid image").
  const candidateUrls = (media ?? [])
    .map((m) => m.image_url as string)
    .filter(Boolean);
  const originalImageUrl = await firstReachableUrl(candidateUrls);
  const label = locationLabel(checkIn);

  // Build the overlay image once and reuse for both platforms.
  let postImageUrl = originalImageUrl;
  let overlayPath: string | null = null;
  if (originalImageUrl) {
    const overlay = await buildOverlayImageUrl({
      imageUrl: originalImageUrl,
      businessName: businessName ?? "",
      locationLabel: label,
      checkInId,
    });
    postImageUrl = overlay.url;
    overlayPath = overlay.path;
  }

  const { data: connections } = await admin
    .from("platform_connections")
    .select("id, provider, account_id")
    .eq("business_id", checkIn.business_id)
    .in("provider", platforms)
    .eq("status", "connected");

  const rows = (connections ?? []) as ConnectionRow[];
  const result: PublishResult = {};

  const caption = [checkIn.description, checkIn.full_address, hashtags]
    .filter(Boolean)
    .join("\n\n");

  async function logPublication(
    provider: MetaPlatform,
    outcome: { ok: boolean; id?: string; error?: string },
  ) {
    // Best-effort; never block on logging.
    try {
      await admin.from("check_in_publications").insert({
        check_in_id: checkInId,
        provider,
        status: outcome.ok ? "success" : "error",
        external_id: outcome.id ?? null,
        error: outcome.error ?? null,
        caption,
        image_url: postImageUrl ?? null,
      });
    } catch {
      // ignore logging failures (e.g. migration 010 not run yet)
    }
  }

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
      await logPublication("facebook", result.facebook);
    }

    if (connection.provider === "instagram" && connection.account_id) {
      if (!postImageUrl) {
        result.instagram = {
          ok: false,
          error: "Instagram requires at least one image on the check-in.",
        };
        await logPublication("instagram", result.instagram);
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
      await logPublication("instagram", result.instagram);
    }
  }

  // Meta has fetched the image by now (FB downloads during /photos, IG during
  // container processing which we waited for), so the overlay is no longer
  // needed. Delete it to avoid keeping a second copy of every image.
  if (overlayPath) {
    try {
      await admin.storage.from("check-in-media").remove([overlayPath]);
    } catch {
      // best-effort cleanup
    }
  }

  return result;
}
