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
          Files upload to Supabase Storage and save in the database for the widget.
        </p>
      </div>

      <input
        type="file"
        multiple
        accept="image/*,video/*"
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

            const results: UploadedMedia[] = [];

            for (const [index, original] of files.entries()) {
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
                  sort_order: index,
                  file_size_bytes: file.size,
                  mime_type: file.type,
                })
                .select("id, image_url, media_type")
                .single();

              if (insertError) {
                setError(insertError.message);
                return;
              }

              results.push(mediaRow as UploadedMedia);
            }

            setUploaded((current) => [...current, ...results]);
            onComplete?.(results);
            event.target.value = "";
          });
        }}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {uploaded.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {uploaded.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-md border border-slate-200 bg-white">
              {item.media_type === "video" ? (
                <video src={item.image_url} controls className="h-24 w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt="" className="h-24 w-full object-cover" />
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
