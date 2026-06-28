import { parse, type Font } from "opentype.js";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROBOTO_BASE64 } from "./font";

// Parse the embedded font once. We convert text to vector <path> geometry, so
// rendering needs NO system fonts / Pango / fontconfig — librsvg always draws
// paths. This is the only approach that reliably shows text on serverless hosts
// (sharp's prebuilt binary lacks text support; librsvg ignores @font-face).
let cachedFont: Font | null = null;
function getFont(): Font {
  if (cachedFont) {
    return cachedFont;
  }
  const raw = Buffer.from(ROBOTO_BASE64, "base64");
  cachedFont = parse(
    raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
  );
  return cachedFont;
}

// Builds a rounded translucent badge with white text (drawn as vector paths).
function makeLabel(
  text: string,
  fontSize: number,
): { buffer: Buffer; width: number; height: number } {
  const font = getFont();
  const glyphPath = font.getPath(text, 0, fontSize, fontSize);
  const pathData = glyphPath.toPathData(2);
  const advance = font.getAdvanceWidth(text, fontSize);

  const padX = Math.round(fontSize * 0.5);
  const padY = Math.round(fontSize * 0.32);
  const boxWidth = Math.ceil(advance) + padX * 2;
  const boxHeight = Math.round(fontSize * 1.32) + padY * 2;
  const radius = Math.round(boxHeight / 5);
  const textTop = padY + Math.round(fontSize * 0.15);

  const svg = `<svg width="${boxWidth}" height="${boxHeight}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="${radius}" ry="${radius}" fill="black" fill-opacity="0.45"/><g transform="translate(${padX},${textTop})"><path d="${pathData}" fill="white"/></g></svg>`;

  return { buffer: Buffer.from(svg), width: boxWidth, height: boxHeight };
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
        composites.push({
          input: label.buffer,
          top: margin,
          left: Math.max(margin, width - label.width - margin),
        });
      }

      if (locationLabel) {
        const label = makeLabel(locationLabel, Math.round(fontSize * 0.85));
        composites.push({
          input: label.buffer,
          top: Math.max(margin, height - label.height - margin),
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
    // Upload as a Blob, not a Node Buffer: in some serverless runtimes (Vercel)
    // a Buffer body gets coerced through a UTF-8 string, which corrupts the
    // binary JPEG (header bytes become U+FFFD) and makes Meta reject it.
    const blob = new Blob([new Uint8Array(outputBuffer)], {
      type: "image/jpeg",
    });
    const { error } = await admin.storage
      .from("check-in-media")
      .upload(path, blob, {
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
