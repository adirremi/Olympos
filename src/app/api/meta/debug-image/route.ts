import { NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Diagnostic: inspect the first image of a check-in and whether sharp can
// process it. Visit /api/meta/debug-image?checkInId=...
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const checkInId = new URL(request.url).searchParams.get("checkInId");
  if (!checkInId) {
    return NextResponse.json({ error: "Pass ?checkInId=" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: media } = await admin
    .from("check_in_media")
    .select("image_url, media_type, mime_type, sort_order")
    .eq("check_in_id", checkInId)
    .eq("media_type", "image")
    .order("sort_order")
    .limit(1);

  const imageUrl = media?.[0]?.image_url as string | undefined;
  if (!imageUrl) {
    return NextResponse.json({ error: "No image on this check-in." });
  }

  const report: Record<string, unknown> = {
    image_url: imageUrl,
    stored_mime_type: media?.[0]?.mime_type ?? null,
  };

  try {
    const response = await fetch(imageUrl);
    report.fetch_status = response.status;
    report.fetched_content_type = response.headers.get("content-type");
    const buffer = Buffer.from(await response.arrayBuffer());
    report.bytes = buffer.length;

    try {
      report.sharp_version = sharp.versions?.sharp ?? "unknown";
      const meta = await sharp(buffer).metadata();
      report.image_format = meta.format;
      report.width = meta.width;
      report.height = meta.height;
      report.color_space = meta.space;

      const jpeg = await sharp(buffer)
        .rotate()
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 90 })
        .toBuffer();
      report.sharp_jpeg_bytes = jpeg.length;
      report.sharp_ok = true;
    } catch (sharpError) {
      report.sharp_ok = false;
      report.sharp_error =
        sharpError instanceof Error ? sharpError.message : String(sharpError);
    }
  } catch (fetchError) {
    report.fetch_error =
      fetchError instanceof Error ? fetchError.message : String(fetchError);
  }

  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  });
}
