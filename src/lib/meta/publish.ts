import { createAdminClient } from "@/lib/supabase/admin";
import { buildOverlayImageUrl } from "@/lib/image/overlay";
import { keywordsToHashtags } from "@/lib/keywords";
import {
  publishAlbumToFacebookPage,
  publishCarouselToInstagram,
  publishPhotoToFacebookPage,
  publishToFacebookPage,
  publishVideoToFacebookPage,
  publishVideoToInstagram,
} from "./api";
import type { MetaPlatform, PublishResult } from "./types";

export type { MetaPlatform, PublishResult } from "./types";

type ConnectionRow = {
  id: string;
  provider: MetaPlatform;
  account_id: string | null;
};

type MediaRow = {
  image_url: string;
  media_type: "image" | "video";
  sort_order: number | null;
  created_at: string;
};

const MAX_CAROUSEL = 10;

function locationLabel(checkIn: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string | null {
  const parts = [checkIn.city, checkIn.region, checkIn.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

async function isReachable(url: string): Promise<boolean> {
  try {
    let res = await fetch(url, { method: "HEAD" });
    if (!res.ok) {
      res = await fetch(url, { method: "GET" });
    }
    return res.ok;
  } catch {
    return false;
  }
}

async function filterReachable(urls: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const url of urls) {
    if (await isReachable(url)) {
      out.push(url);
    }
  }
  return out;
}

// Publishes a check-in to the selected Meta platforms.
// - Multiple images → Facebook album + Instagram carousel (with overlays)
// - Single image → single photo post
// - Video only (or video with no reachable images) → Facebook video + IG Reel
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

  const { data: mediaRows } = await admin
    .from("check_in_media")
    .select("image_url, media_type, sort_order, created_at")
    .eq("check_in_id", checkInId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const media = (mediaRows ?? []) as MediaRow[];
  const imageCandidates = media
    .filter((m) => m.media_type === "image" && m.image_url)
    .map((m) => m.image_url);
  const videoCandidates = media
    .filter((m) => m.media_type === "video" && m.image_url)
    .map((m) => m.image_url);

  const reachableImages = (
    await filterReachable(imageCandidates)
  ).slice(0, MAX_CAROUSEL);
  const reachableVideo = (await filterReachable(videoCandidates))[0];

  if (imageCandidates.length > 0 && reachableImages.length === 0) {
    throw new Error(
      "The image file is missing from storage. Please re-upload the photo to this check-in and try again.",
    );
  }
  if (
    imageCandidates.length === 0 &&
    videoCandidates.length > 0 &&
    !reachableVideo
  ) {
    throw new Error(
      "The video file is missing from storage. Please re-upload the video to this check-in and try again.",
    );
  }
  if (reachableImages.length === 0 && !reachableVideo) {
    throw new Error(
      "Add at least one photo or video to this check-in before publishing.",
    );
  }

  const label = locationLabel(checkIn);

  // Prefer photos when present (album/carousel). Video-only falls through to
  // the video path. Mixed check-ins: photos go to Meta; video stays on widget.
  const mode: "images" | "video" =
    reachableImages.length > 0 ? "images" : "video";

  const overlayPaths: string[] = [];
  let postImageUrls: string[] = [];

  if (mode === "images") {
    // Overlay in parallel (capped) so multi-photo publishes don't sit on
    // Vercel long enough to look "stuck" / hit the function timeout.
    const overlays = await Promise.all(
      reachableImages.map((url) =>
        buildOverlayImageUrl({
          imageUrl: url,
          businessName: businessName ?? "",
          locationLabel: label,
          checkInId,
        }),
      ),
    );
    postImageUrls = overlays.map((o) => o.url);
    for (const o of overlays) {
      if (o.path) overlayPaths.push(o.path);
    }
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
    try {
      await admin.from("check_in_publications").insert({
        check_in_id: checkInId,
        provider,
        status: outcome.ok ? "success" : "error",
        external_id: outcome.id ?? null,
        error: outcome.error ?? null,
        caption,
        image_url:
          mode === "images"
            ? (postImageUrls[0] ?? null)
            : (reachableVideo ?? null),
      });
    } catch {
      // ignore logging failures
    }
  }

  for (const connection of rows) {
    const { data: secret } = await admin
      .from("platform_connection_secrets")
      .select("access_token")
      .eq("connection_id", connection.id)
      .maybeSingle();

    const pageToken = (secret as { access_token: string } | null)?.access_token;
    if (!pageToken || !connection.account_id) {
      continue;
    }

    if (connection.provider === "facebook") {
      try {
        let id: string;
        if (mode === "images") {
          id =
            postImageUrls.length > 1
              ? await publishAlbumToFacebookPage(
                  connection.account_id,
                  pageToken,
                  postImageUrls,
                  caption || checkIn.full_address,
                )
              : await publishPhotoToFacebookPage(
                  connection.account_id,
                  pageToken,
                  postImageUrls[0],
                  caption || checkIn.full_address,
                );
        } else if (reachableVideo) {
          id = await publishVideoToFacebookPage(
            connection.account_id,
            pageToken,
            reachableVideo,
            caption || checkIn.full_address,
          );
        } else {
          id = await publishToFacebookPage(
            connection.account_id,
            pageToken,
            caption || checkIn.full_address,
          );
        }
        result.facebook = { ok: true, id };
      } catch (error) {
        result.facebook = {
          ok: false,
          error: error instanceof Error ? error.message : "Failed.",
        };
      }
      await logPublication("facebook", result.facebook);
    }

    if (connection.provider === "instagram") {
      try {
        let id: string;
        if (mode === "images") {
          id = await publishCarouselToInstagram(
            connection.account_id,
            pageToken,
            postImageUrls,
            caption || checkIn.full_address,
          );
        } else if (reachableVideo) {
          id = await publishVideoToInstagram(
            connection.account_id,
            pageToken,
            reachableVideo,
            caption || checkIn.full_address,
          );
        } else {
          throw new Error(
            "Instagram requires at least one photo or video on the check-in.",
          );
        }
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

  if (overlayPaths.length > 0) {
    try {
      await admin.storage.from("check-in-media").remove(overlayPaths);
    } catch {
      // best-effort cleanup
    }
  }

  return result;
}
