"use client";

import { useState } from "react";
import { WidgetMap } from "./widget-map";
import type { WidgetCheckIn, WidgetData } from "@/types/database";

type LightboxMedia = { url: string; type: "image" | "video" };

export function WidgetView({ data }: { data: WidgetData }) {
  const [active, setActive] = useState<WidgetCheckIn | null>(
    data.check_ins[0] ?? null,
  );
  const [lightbox, setLightbox] = useState<LightboxMedia | null>(null);

  if (data.check_ins.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center text-sm text-slate-500">
        No published check-ins yet.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <div className="h-64 w-full bg-slate-100 lg:h-screen lg:w-1/2">
        <WidgetMap checkIns={data.check_ins} onSelect={setActive} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:h-screen lg:w-1/2">
        <header className="mb-4">
          <h1 className="text-lg font-semibold text-slate-900">
            {data.business?.name ?? "Our work"}
          </h1>
          <p className="text-sm text-slate-500">
            {data.check_ins.length} recent jobs
          </p>
        </header>

        <ul className="space-y-3">
          {data.check_ins.map((checkIn) => (
            <li
              key={checkIn.id}
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                active?.id === checkIn.id
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
              onClick={() => setActive(checkIn)}
            >
              <p className="text-sm font-medium text-slate-900">
                {checkIn.full_address}
              </p>
              {checkIn.description ? (
                <p className="mt-1 text-sm text-slate-600">{checkIn.description}</p>
              ) : null}

              {checkIn.media.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {checkIn.media.slice(0, 6).map((media, index) => (
                    <button
                      type="button"
                      key={`${checkIn.id}-${index}`}
                      className="group relative overflow-hidden rounded-lg bg-slate-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        setLightbox({ url: media.url, type: media.type });
                      }}
                    >
                      {media.type === "video" ? (
                        <video
                          src={media.url}
                          className="h-20 w-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={media.url}
                          alt=""
                          loading="lazy"
                          className="h-20 w-full object-cover transition-transform group-hover:scale-105"
                        />
                      )}
                      <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                    </button>
                  ))}
                </div>
              ) : null}

              <p className="mt-2 text-xs text-slate-400">
                {new Date(checkIn.created_at).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          {lightbox.type === "video" ? (
            <video
              src={lightbox.url}
              controls
              autoPlay
              className="max-h-[90vh] max-w-[95vw] rounded-lg"
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightbox.url}
              alt=""
              className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
