"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WidgetCheckIn } from "@/types/database";

type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  count: number;
  jobs: WidgetCheckIn[];
};

function locationLabel(job: WidgetCheckIn): string {
  const parts = [job.city, job.region].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : job.full_address;
}

/** One map pin per job at its exact lat/lng. */
function groupPoints(checkIns: WidgetCheckIn[]): MapPoint[] {
  const points: MapPoint[] = [];

  for (const job of checkIns) {
    if (typeof job.lat !== "number" || typeof job.lng !== "number") continue;
    points.push({
      id: job.id,
      lat: job.lat,
      lng: job.lng,
      label: locationLabel(job),
      count: 1,
      jobs: [job],
    });
  }

  return points;
}

function thumbOf(job: WidgetCheckIn): string | null {
  const img = job.media.find((m) => m.type === "image");
  if (img) return img.url;
  return job.media.find((m) => m.type === "video")?.url ?? null;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).L) {
      resolve((window as any).L);
      return;
    }
    if (!document.querySelector('link[data-olv-leaflet]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.setAttribute("data-olv-leaflet", "1");
      document.head.appendChild(link);
    }
    const existing = document.querySelector(
      "script[data-olv-leaflet]",
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        if ((window as any).L) resolve((window as any).L);
        else reject(new Error("Leaflet failed to load"));
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.setAttribute("data-olv-leaflet", "1");
    script.onload = () => {
      if ((window as any).L) resolve((window as any).L);
      else reject(new Error("Leaflet failed to load"));
    };
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.head.appendChild(script);
  });
}

export function WidgetMap({
  checkIns,
  onSelectJob,
}: {
  checkIns: WidgetCheckIn[];
  activeId?: string | null;
  onSelectJob: (job: WidgetCheckIn) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  const points = useMemo(() => groupPoints(checkIns), [checkIns]);
  const totalJobs = checkIns.length;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!mapRef.current || points.length === 0) return;
      try {
        const L = await loadLeaflet();
        if (cancelled || !mapRef.current) return;

        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }

        const map = L.map(mapRef.current, {
          scrollWheelZoom: false,
          attributionControl: true,
        }).setView([points[0].lat, points[0].lng], 11);
        mapInstance.current = map;

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19,
          },
        ).addTo(map);

        const bounds: [number, number][] = [];

        for (const point of points) {
          const job = point.jobs[0];
          const title = job?.description || point.label;
          const addr = job?.full_address;
          const thumb = job ? thumbOf(job) : null;
          const shot = thumb
            ? `<button type="button" class="olv-jm-shot" data-job-id="${esc(job!.id)}" title="${esc(title)}"><img src="${esc(thumb)}" alt="" loading="lazy" width="120" height="90"></button>`
            : "";

          const html =
            `<div class="olv-jm-pop">` +
            `<strong class="olv-jm-title">${esc(point.label)}</strong>` +
            (addr && addr !== point.label
              ? `<span class="olv-jm-addr">${esc(addr)}</span>`
              : "") +
            (job?.description
              ? `<span class="olv-jm-sub">${esc(job.description.slice(0, 120))}</span>`
              : "") +
            `<div class="olv-jm-shots">${shot}</div>` +
            `</div>`;

          const icon = L.divIcon({
            className: "olv-jm-pin",
            html: `<span class="olv-jm-pin-dot" aria-hidden="true"></span>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            popupAnchor: [0, -12],
          });

          const marker = L.marker([point.lat, point.lng], { icon }).addTo(map);
          marker.bindPopup(html, { minWidth: 220, maxWidth: 280 });
          marker.on("popupopen", () => {
            mapRef.current
              ?.querySelectorAll<HTMLButtonElement>(".olv-jm-shot[data-job-id]")
              .forEach((btn) => {
                btn.onclick = () => {
                  const id = btn.getAttribute("data-job-id");
                  const job = checkIns.find((c) => c.id === id);
                  if (job) onSelectJob(job);
                };
              });
          });

          bounds.push([point.lat, point.lng]);
        }

        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Map failed to load.");
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [points, checkIns, onSelectJob]);

  if (error) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
        {error}
      </div>
    );
  }

  if (points.length === 0) {
    return null;
  }

  return (
    <section className="olv-map-section" aria-labelledby="olv-map-title">
      <h2 id="olv-map-title" className="olv-map-title">
        Where We&apos;ve Worked Recently
      </h2>
      <p className="olv-map-intro">
        {totalJobs} recent job{totalJobs === 1 ? "" : "s"} on the map — one pin
        per job. Tap a pin to see the work.
      </p>
      <div ref={mapRef} className="olv-jm-map" role="application" />
    </section>
  );
}
