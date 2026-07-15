"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type UploadedMedia = {
  id: string;
  image_url: string;
  media_type: "image" | "video";
};

function mediaTypeFromMime(mime: string): "image" | "video" {
  return mime.startsWith("video/") ? "video" : "image";
}

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;
const MAX_FILE_BYTES = 50 * 1024 * 1024; // matches Supabase bucket limit
const ALLOWED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_VIDEO = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function isAllowedMime(mime: string): boolean {
  return ALLOWED_IMAGE.has(mime) || ALLOWED_VIDEO.has(mime);
}

// Compresses an image in the browser before upload: corrects EXIF orientation,
// caps the longest side, and re-encodes as WebP (much smaller than JPEG) with a
// JPEG fallback for browsers that can't encode WebP. We store only this
// optimized version, so there is never a heavy original to clean up later.
// Videos, GIFs, and non-images are returned unchanged.
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });

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

    // Prefer WebP; browsers that don't support encoding it return a PNG blob
    // (wrong type), so we verify and fall back to JPEG.
    let blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
    let extension = "webp";
    let mime = "image/webp";

    if (!blob || blob.type !== "image/webp") {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
      );
      extension = "jpg";
      mime = "image/jpeg";
    }

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const newName = file.name.replace(/\.[^.]+$/, "") + "." + extension;
    return new File([blob], newName, { type: mime });
  } catch {
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
  const [isPending, startTransition] = useTransition();

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
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        disabled={isPending}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (!files.length) {
            return;
          }

          startTransition(async () => {
            setError(null);
            const supabase = createClient();
            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
              setError("Not authenticated.");
              return;
            }

            // Continue sort_order after any media already on this check-in so a
            // second "Add photos" batch doesn't collide at 0,1,2…
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
              if (!isAllowedMime(original.type)) {
                setError(
                  `"${original.name}" is not supported. Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV.`,
                );
                return;
              }
              if (original.size > MAX_FILE_BYTES) {
                setError(
                  `"${original.name}" is over 50 MB. Compress it or pick a smaller file.`,
                );
                return;
              }

              const file = await compressImage(original);
              const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
              const storagePath = `${user.id}/${checkInId}/${Date.now()}-${index}-${safeName}`;

              const { error: uploadError } = await supabase.storage
                .from("check-in-media")
                .upload(storagePath, file, {
                  cacheControl: "3600",
                  upsert: false,
                  contentType: file.type,
                });

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
                  media_type: mediaTypeFromMime(file.type),
                  sort_order: nextOrder,
                  file_size_bytes: file.size,
                  mime_type: file.type,
                })
                .select("id, image_url, media_type")
                .single();

              if (insertError) {
                // Best-effort: remove the orphaned storage object.
                await supabase.storage
                  .from("check-in-media")
                  .remove([storagePath]);
                setError(insertError.message);
                return;
              }

              nextOrder += 1;
              results.push(mediaRow as UploadedMedia);
            }

            setUploaded((current) => [...current, ...results]);
            onComplete?.(results);
            event.target.value = "";
          });
        }}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
      />

      {isPending ? (
        <p className="text-xs text-slate-500">Uploading…</p>
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
