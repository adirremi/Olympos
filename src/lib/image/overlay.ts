import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROBOTO_BASE64 } from "./font";

function escapeMarkup(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// librsvg (used by sharp for SVG) ignores @font-face and serverless hosts ship
// no system fonts, so SVG <text> renders nothing. Instead we render text with
// sharp's Pango path pointed at an explicit font file written to /tmp, with a
// minimal fontconfig so it's fast and error-free.
let fontFilePath: string | null = null;
function ensureFont(): string {
  if (fontFilePath) {
    return fontFilePath;
  }
  const dir = path.join(os.tmpdir(), "fc-fonts");
  fs.mkdirSync(dir, { recursive: true });
  const fontPath = path.join(dir, "Roboto.ttf");
  if (!fs.existsSync(fontPath)) {
    fs.writeFileSync(fontPath, Buffer.from(ROBOTO_BASE64, "base64"));
  }
  const cacheDir = path.join(os.tmpdir(), "fc-cache");
  fs.mkdirSync(cacheDir, { recursive: true });
  const confPath = path.join(os.tmpdir(), "fc-fonts.conf");
  if (!fs.existsSync(confPath)) {
    fs.writeFileSync(
      confPath,
      `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${dir}</dir><cachedir>${cacheDir}</cachedir></fontconfig>`,
    );
  }
  process.env.FONTCONFIG_FILE = confPath;
  fontFilePath = fontPath;
  return fontPath;
}

// Builds a rounded translucent badge with white text, sized to fit the text.
async function makeLabel(
  text: string,
  fontSize: number,
  fontPath: string,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const textImage = await sharp({
    text: {
      text: `<span foreground="white" size="${Math.round(fontSize * 1024)}">${escapeMarkup(text)}</span>`,
      fontfile: fontPath,
      font: "Roboto Medium",
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer();

  const textMeta = await sharp(textImage).metadata();
  const textWidth = textMeta.width ?? 0;
  const textHeight = textMeta.height ?? 0;

  const padX = Math.round(fontSize * 0.5);
  const padY = Math.round(fontSize * 0.32);
  const boxWidth = textWidth + padX * 2;
  const boxHeight = textHeight + padY * 2;
  const radius = Math.round(boxHeight / 5);

  const rect = Buffer.from(
    `<svg width="${boxWidth}" height="${boxHeight}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="${radius}" ry="${radius}" fill="black" fill-opacity="0.45"/></svg>`,
  );

  const buffer = await sharp(rect)
    .composite([{ input: textImage, left: padX, top: padY }])
    .png()
    .toBuffer();

  return { buffer, width: boxWidth, height: boxHeight };
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
      const fontPath = ensureFont();
      const fontSize = Math.max(22, Math.round(width / 26));
      const margin = Math.round(width / 36);
      const composites: Parameters<ReturnType<typeof sharp>["composite"]>[0] =
        [];

      if (businessName) {
        const label = await makeLabel(businessName, fontSize, fontPath);
        composites.push({
          input: label.buffer,
          top: margin,
          left: Math.max(margin, width - label.width - margin),
        });
      }

      if (locationLabel) {
        const label = await makeLabel(
          locationLabel,
          Math.round(fontSize * 0.85),
          fontPath,
        );
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
