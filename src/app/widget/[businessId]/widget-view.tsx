"use client";

import { useState } from "react";
import { WidgetMap } from "./widget-map";
import type { WidgetCheckIn, WidgetData } from "@/types/database";

export function WidgetView({ data }: { data: WidgetData }) {
  const [active, setActive] = useState<WidgetCheckIn | null>(
    data.check_ins[0] ?? null,
  );

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
                    <div
                      key={`${checkIn.id}-${index}`}
                      className="overflow-hidden rounded-lg bg-slate-100"
                    >
                      {media.type === "video" ? (
                        <video
                          src={media.url}
                          controls
                          className="h-20 w-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={media.url}
                          alt=""
                          loading="lazy"
                          className="h-20 w-full object-cover"
                        />
                      )}
                    </div>
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
    </div>
  );
}
