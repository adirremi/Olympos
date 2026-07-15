"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UploadedMedia = {
  id: string;
  image_url: string;
  media_type: "image" | "video";
};

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const COMPRESS_TIMEOUT_MS = 20_000;
const UPLOAD_TIMEOUT_MS = 90_000;

const ALLOWED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const ALLOWED_VIDEO = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function mediaTypeFromMime(mime: string): "image" | "video" {
  return mime.startsWith("video/") ? "video" : "image";
}

function guessMime(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".webm")) return "video/webm";
  if (name.endsWith(".mov")) return "video/quicktime";
  return "";
}

function isAllowedMime(mime: string): boolean {
  return ALLOWED_IMAGE.has(mime) || ALLOWED_VIDEO.has(mime);
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// Compress still images in the browser. HEIC/HEIF and GIFs are left alone
// (HEIC often hangs createImageBitmap on Safari — we skip compression).
async function compressImage(file: File, mime: string): Promise<File> {
  if (
    !mime.startsWith("image/") ||
    mime === "image/gif" ||
    mime === "image/heic" ||
    mime === "image/heif"
  ) {
    return file;
  }

  try {
    const bitmap = await withTimeout(
      createImageBitmap(file, { imageOrientation: "from-image" }),
      COMPRESS_TIMEOUT_MS,
      "Image processing timed out. Try a smaller photo.",
    );

    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const targetWidth = Math.round(bitmap.width * scale);
    const targetHeight = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    let blob = await withTimeout(
      new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
      ),
      COMPRESS_TIMEOUT_MS,
      "Image encoding timed out.",
    );
    let extension = "webp";
    let outMime = "image/webp";

    if (!blob || blob.type !== "image/webp") {
      blob = await withTimeout(
        new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
        ),
        COMPRESS_TIMEOUT_MS,
        "Image encoding timed out.",
      );
      extension = "jpg";
      outMime = "image/jpeg";
    }

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const newName = file.name.replace(/\.[^.]+$/, "") + "." + extension;
    return new File([blob], newName, { type: outMime });
  } catch (err) {
    // Compression failed / timed out — fall back to the original so upload
    // still proceeds instead of hanging forever.
    if (err instanceof Error && err.message.includes("timed out")) {
      return file;
    }
    return file;
  }
}

export function CheckInMediaUpload({
  checkInId,
  onComplete,
}: {
  checkInId: string;
  onComplete?: (media: UploadedMedia[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedMedia[]>([]);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleFiles(files: File[], input: HTMLInputElement) {
    setError(null);
    setProgress("Preparing…");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Not authenticated.");
        return;
      }

      const { data: existing } = await supabase
        .from("check_in_media")
        .select("sort_order")
        .eq("check_in_id", checkInId)
        .order("sort_order", { ascending: false })
        .limit(1);
      let nextOrder =
        typeof existing?.[0]?.sort_order === "number"
          ? (existing[0].sort_order as number) + 1
          : 0;

      const results: UploadedMedia[] = [];

      for (const [index, original] of files.entries()) {
        const mime = guessMime(original);
        const label = original.name || `file ${index + 1}`;

        if (!isAllowedMime(mime)) {
          setError(
            `"${label}" is not supported. Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV.`,
          );
          return;
        }
        if (original.size > MAX_FILE_BYTES) {
          setError(
            `"${label}" is over 50 MB. Compress it or pick a smaller file.`,
          );
          return;
        }

        setProgress(
          `Processing ${index + 1}/${files.length}: ${label.slice(0, 40)}`,
        );
        const file = await compressImage(original, mime);

        // HEIC is not in the bucket allow-list — refuse with a clear message
        // instead of a cryptic storage error after a long upload.
        const outMime = file.type || mime;
        if (outMime === "image/heic" || outMime === "image/heif") {
          setError(
            `"${label}" is HEIC. Convert it to JPG on your phone (Settings → Camera → Most Compatible) or export as JPG.`,
          );
          return;
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${user.id}/${checkInId}/${Date.now()}-${index}-${safeName}`;

        setProgress(
          `Uploading ${index + 1}/${files.length}: ${label.slice(0, 40)}`,
        );

        const { error: uploadError } = await withTimeout(
          supabase.storage.from("check-in-media").upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: outMime || file.type || "application/octet-stream",
          }),
          UPLOAD_TIMEOUT_MS,
          `"${label}" upload timed out. Check your connection and try again.`,
        );

        if (uploadError) {
          setError(uploadError.message);
          return;
        }

        const { data: publicUrl } = supabase.storage
          .from("check-in-media")
          .getPublicUrl(storagePath);

        const { data: mediaRow, error: insertError } = await supabase
          .from("check_in_media")
          .insert({
            check_in_id: checkInId,
            image_url: publicUrl.publicUrl,
            storage_path: storagePath,
            media_type: mediaTypeFromMime(outMime),
            sort_order: nextOrder,
            file_size_bytes: file.size,
            mime_type: outMime,
          })
          .select("id, image_url, media_type")
          .single();

        if (insertError) {
          await supabase.storage.from("check-in-media").remove([storagePath]);
          setError(insertError.message);
          return;
        }

        nextOrder += 1;
        results.push(mediaRow as UploadedMedia);
        setUploaded((current) => [...current, mediaRow as UploadedMedia]);
      }

      onComplete?.(results);
      input.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="text-sm font-medium text-slate-900">Photos & videos</p>
        <p className="text-xs text-slate-500">
          Select multiple photos or a video. Photos publish as a Facebook album /
          Instagram carousel. A video publishes as a Facebook video / Instagram
          Reel. Max 50&nbsp;MB · JPG, PNG, WebP, GIF, MP4, WebM, MOV.
        </p>
      </div>

      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov"
        disabled={busy}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (!files.length) return;
          void handleFiles(files, event.target);
        }}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white disabled:opacity-60"
      />

      {progress ? (
        <p className="text-xs font-medium text-blue-700">{progress}</p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {uploaded.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {uploaded.map((item) => (
            <li
              key={item.id}
              className="overflow-hidden rounded-md border border-slate-200 bg-white"
            >
              {item.media_type === "video" ? (
                <video
                  src={item.image_url}
                  controls
                  className="h-24 w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt=""
                  className="h-24 w-full object-cover"
                />
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
