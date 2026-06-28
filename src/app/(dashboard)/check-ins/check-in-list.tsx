"use client";

import { useState, useTransition } from "react";
import { publishCheckInToSocial, updateCheckInStatus } from "./actions";
import type { MetaPlatform, PublishResult } from "@/lib/meta/types";
import type { CheckIn } from "@/types/database";

type Media = { image_url: string; media_type: "image" | "video"; sort_order: number };

type CheckInRow = CheckIn & {
  businesses: { name: string } | { name: string }[] | null;
  check_in_media?: Media[] | null;
};

function businessName(businesses: CheckInRow["businesses"]): string {
  if (!businesses) {
    return "Business";
  }
  if (Array.isArray(businesses)) {
    return businesses[0]?.name ?? "Business";
  }
  return businesses.name;
}

function PublishControls({ checkInId }: { checkInId: string }) {
  const [isPending, startTransition] = useTransition();
  const [platforms, setPlatforms] = useState<Record<MetaPlatform, boolean>>({
    facebook: true,
    instagram: true,
  });
  const [results, setResults] = useState<PublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(platform: MetaPlatform) {
    setPlatforms((prev) => ({ ...prev, [platform]: !prev[platform] }));
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs font-medium text-slate-700">Publish to:</span>
        {(["facebook", "instagram"] as MetaPlatform[]).map((platform) => (
          <label
            key={platform}
            className="flex items-center gap-1.5 text-xs text-slate-700"
          >
            <input
              type="checkbox"
              checked={platforms[platform]}
              onChange={() => toggle(platform)}
              className="h-3.5 w-3.5"
            />
            <span className="capitalize">{platform}</span>
          </label>
        ))}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null);
            setResults(null);
            const selected = (Object.keys(platforms) as MetaPlatform[]).filter(
              (platform) => platforms[platform],
            );
            startTransition(async () => {
              const response = await publishCheckInToSocial(checkInId, selected);
              if (response.error) {
                setError(response.error);
                return;
              }
              setResults(response.results ?? null);
            });
          }}
          className="ml-auto rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Publishing…" : "Publish"}
        </button>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {results ? (
        <ul className="space-y-1">
          {(["facebook", "instagram"] as MetaPlatform[]).map((platform) => {
            const result = results[platform];
            if (!result) {
              return null;
            }
            return (
              <li
                key={platform}
                className={`flex items-center gap-2 text-xs ${
                  result.ok ? "text-green-700" : "text-red-600"
                }`}
              >
                <span className="font-medium capitalize">{platform}:</span>
                <span>{result.ok ? "posted ✓" : result.error}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function CheckInList({ checkIns }: { checkIns: CheckInRow[] }) {
  const [isPending, startTransition] = useTransition();

  if (checkIns.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        No check-ins yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
      {checkIns.map((checkIn) => {
        const media = [...(checkIn.check_in_media ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        );

        return (
          <li key={checkIn.id} className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">
                  {businessName(checkIn.businesses)}
                </p>
                <p className="mt-1 text-sm text-slate-600">{checkIn.full_address}</p>
                {checkIn.description ? (
                  <p className="mt-2 text-sm text-slate-500">{checkIn.description}</p>
                ) : null}
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
                {checkIn.status}
              </span>
            </div>

            {media.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {media.map((item, index) => (
                  <div
                    key={`${checkIn.id}-${index}`}
                    className="overflow-hidden rounded-lg bg-slate-100"
                  >
                    {item.media_type === "video" ? (
                      <video src={item.image_url} className="h-20 w-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt=""
                        loading="lazy"
                        className="h-20 w-full object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {checkIn.status !== "published" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await updateCheckInStatus(checkIn.id, "published");
                    });
                  }}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Mark published
                </button>
              ) : null}
              {checkIn.status !== "archived" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await updateCheckInStatus(checkIn.id, "archived");
                    });
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  Archive
                </button>
              ) : null}
            </div>

            <PublishControls checkInId={checkIn.id} />
          </li>
        );
      })}
    </ul>
  );
}
