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

// A small rounded label (dark translucent background + white text) sized to fit
// the text. Inline attributes only (no CSS classes) for reliable rasterization.
function makeLabel(text: string, fontSize: number): Buffer {
  const padX = Math.round(fontSize * 0.5);
  const padY = Math.round(fontSize * 0.35);
  const charWidth = fontSize * 0.62;
  const boxWidth = Math.round(text.length * charWidth + padX * 2);
  const boxHeight = Math.round(fontSize + padY * 2);
  const baseline = Math.round(padY + fontSize * 0.82);
  const radius = Math.round(boxHeight / 5);

  const svg = `<svg width="${boxWidth}" height="${boxHeight}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="${radius}" ry="${radius}" fill="black" fill-opacity="0.45"/><text x="${padX}" y="${baseline}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white">${escapeXml(text)}</text></svg>`;

  return Buffer.from(svg);
}

type OverlayInput = {
  imageUrl: string;
  businessName: string;
  locationLabel: string | null;
  checkInId: string;
};

// Normalizes the image to a clean JPEG with an Instagram-valid aspect ratio,
// draws the business name (top-right) and city/region (bottom-left), uploads
// the result, and returns its public URL. Returns the original URL on failure.
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
    const MIN_RATIO = 0.8;
    const MAX_RATIO = 1.91;
    const ratio = srcWidth / srcHeight;

    let canvasBuffer = normalized;
    let width = srcWidth;
    let height = srcHeight;

    if (ratio < MIN_RATIO) {
      width = Math.round(srcHeight * MIN_RATIO);
      height = srcHeight;
    } else if (ratio > MAX_RATIO) {
      width = srcWidth;
      height = Math.round(srcWidth / MAX_RATIO);
    }

    if (width !== srcWidth || height !== srcHeight) {
      const background = await sharp(normalized)
        .resize({ width, height, fit: "cover" })
        .blur(40)
        .modulate({ brightness: 0.85 })
        .jpeg({ quality: 80 })
        .toBuffer();

      const left = Math.max(0, Math.round((width - srcWidth) / 2));
      const top = Math.max(0, Math.round((height - srcHeight) / 2));

      canvasBuffer = await sharp(background)
        .composite([{ input: normalized, top, left }])
        .jpeg({ quality: 90 })
        .toBuffer();
    }

    // Text overlay is best-effort: if SVG/text rasterization fails for any
    // reason (e.g. no fonts on the host), we still upload the clean normalized
    // JPEG so publishing succeeds.
    let outputBuffer = canvasBuffer;
    try {
      const fontSize = Math.max(22, Math.round(width / 26));
      const margin = Math.round(width / 36);
      const composites: Parameters<ReturnType<typeof sharp>["composite"]>[0] =
        [];

      if (businessName) {
        const label = makeLabel(businessName, fontSize);
        const meta = await sharp(label).metadata();
        composites.push({
          input: label,
          top: margin,
          left: Math.max(margin, width - (meta.width ?? 0) - margin),
        });
      }

      if (locationLabel) {
        const label = makeLabel(locationLabel, Math.round(fontSize * 0.85));
        const meta = await sharp(label).metadata();
        composites.push({
          input: label,
          top: Math.max(margin, height - (meta.height ?? 0) - margin),
          left: margin,
        });
      }

      if (composites.length > 0) {
        outputBuffer = await sharp(canvasBuffer)
          .composite(composites)
          .jpeg({ quality: 88 })
          .toBuffer();
      }
    } catch {
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
