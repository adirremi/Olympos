import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type OverlayInput = {
  imageUrl: string;
  businessName: string;
  locationLabel: string | null;
  checkInId: string;
};

// Draws the business name (top-right) and city/region (bottom-left) onto the
// image, uploads the result to storage, and returns its public URL.
// Returns the original URL if anything fails (best-effort, never blocks publishing).
export async function buildOverlayImageUrl({
  imageUrl,
  businessName,
  locationLabel,
  checkInId,
}: OverlayInput): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return imageUrl;
    }
    const inputBuffer = Buffer.from(await response.arrayBuffer());

    // Normalize: respect EXIF rotation, cap size, flatten transparency to white
    // and re-encode so the output is always a clean JPEG (Instagram requires it).
    const normalized = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1440, height: 1440, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 90 })
      .toBuffer();

    const normMeta = await sharp(normalized).metadata();
    const srcWidth = normMeta.width ?? 1080;
    const srcHeight = normMeta.height ?? 1080;

    // Instagram feed accepts aspect ratios from 4:5 (0.8) to 1.91:1.
    // Pad out-of-range images onto a blurred background so nothing is cropped.
    const MIN_RATIO = 0.8;
    const MAX_RATIO = 1.91;
    const ratio = srcWidth / srcHeight;

    let canvasBuffer = normalized;
    let width = srcWidth;
    let height = srcHeight;

    if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
      if (ratio < MIN_RATIO) {
        width = Math.round(srcHeight * MIN_RATIO);
        height = srcHeight;
      } else {
        width = srcWidth;
        height = Math.round(srcWidth / MAX_RATIO);
      }

      const background = await sharp(normalized)
        .resize({ width, height, fit: "cover" })
        .blur(40)
        .modulate({ brightness: 0.85 })
        .jpeg({ quality: 80 })
        .toBuffer();

      const left = Math.round((width - srcWidth) / 2);
      const top = Math.round((height - srcHeight) / 2);

      canvasBuffer = await sharp(background)
        .composite([{ input: normalized, top, left }])
        .jpeg({ quality: 90 })
        .toBuffer();
    }

    const fontSize = Math.max(24, Math.round(width / 24));
    const pad = Math.round(width / 36);
    const strokeWidth = Math.max(2, Math.round(fontSize / 12));

    const nameText = escapeXml(businessName);
    const locText = locationLabel ? escapeXml(locationLabel) : "";

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .label {
            font-family: Arial, Helvetica, sans-serif;
            font-weight: 700;
            fill: #ffffff;
            stroke: rgba(0,0,0,0.55);
            stroke-width: ${strokeWidth};
            paint-order: stroke;
          }
        </style>
        <text x="${width - pad}" y="${pad + fontSize}" text-anchor="end"
          font-size="${fontSize}" class="label">${nameText}</text>
        ${
          locText
            ? `<text x="${pad}" y="${height - pad}" text-anchor="start"
                font-size="${Math.round(fontSize * 0.8)}" class="label">${locText}</text>`
            : ""
        }
      </svg>`;

    let outputBuffer: Buffer;
    try {
      outputBuffer = await sharp(canvasBuffer)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .jpeg({ quality: 88 })
        .toBuffer();
    } catch {
      // If drawing text fails, still publish the clean (padded) JPEG.
      outputBuffer = canvasBuffer;
    }

    const admin = createAdminClient();
    const path = `overlays/${checkInId}/${Date.now()}.jpg`;
    const { error } = await admin.storage
      .from("check-in-media")
      .upload(path, outputBuffer, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "3600",
      });

    if (error) {
      return imageUrl;
    }

    const { data } = admin.storage.from("check-in-media").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return imageUrl;
  }
}
