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

            for (const [index, file] of files.entries()) {
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
