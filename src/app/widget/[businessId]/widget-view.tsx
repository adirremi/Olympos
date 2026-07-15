"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WidgetMap } from "./widget-map";
import type { WidgetCheckIn, WidgetData } from "@/types/database";

type LightboxMedia = { url: string; type: "image" | "video"; alt: string };

function locationLabel(job: WidgetCheckIn): string {
  const parts = [job.city, job.region].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : job.full_address;
}

function altFor(businessName: string, job: WidgetCheckIn): string {
  const what = (job.description || "Completed job").replace(/\s+/g, " ").trim();
  const short = what.length > 80 ? `${what.slice(0, 77)}…` : what;
  return `${businessName} — ${short} at ${job.full_address}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function JobCard({
  job,
  index,
  businessName,
  active,
  onActivate,
  onOpenMedia,
}: {
  job: WidgetCheckIn;
  index: number;
  businessName: string;
  active: boolean;
  onActivate: () => void;
  onOpenMedia: (media: LightboxMedia) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const multi = job.media.length > 1;
  const alt = altFor(businessName, job);

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(job.media.length - 1, i));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
    setSlide(clamped);
  };

  return (
    <li
      id={`olv-job-${job.id}`}
      className={`olv-card ${active ? "is-active" : ""}`}
      data-job-index={index}
      onClick={onActivate}
    >
      <figure>
        {job.media.length > 0 ? (
          <div className={`olv-media-wrap ${multi ? "has-carousel" : ""}`}>
            <div
              ref={trackRef}
              className={`olv-media ${multi ? "is-carousel" : ""}`}
              onScroll={() => {
                const track = trackRef.current;
                if (!track) return;
                setSlide(Math.round(track.scrollLeft / track.clientWidth));
              }}
            >
              {job.media.map((m, mediaIndex) =>
                m.type === "video" ? (
                  <div className="olv-slide" key={`${job.id}-v-${mediaIndex}`}>
                    <video
                      className="olv-video"
                      controls
                      preload="none"
                      playsInline
                      aria-label={alt}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <source src={m.url} />
                    </video>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="olv-slide olv-slide-img"
                    key={`${job.id}-i-${mediaIndex}`}
                    aria-label={`Enlarge photo: ${alt}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMedia({ url: m.url, type: "image", alt });
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={alt} loading="lazy" />
                  </button>
                ),
              )}
            </div>
            {multi ? (
              <>
                <button
                  type="button"
                  className="olv-nav olv-prev"
                  aria-label="Previous photo"
                  hidden={slide <= 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(slide - 1);
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="olv-nav olv-next"
                  aria-label="Next photo"
                  hidden={slide >= job.media.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(slide + 1);
                  }}
                >
                  ›
                </button>
                <span className="olv-count" aria-hidden>
                  {slide + 1}/{job.media.length}
                </span>
              </>
            ) : null}
          </div>
        ) : null}
        <figcaption>
          {job.description ? (
            <p className="olv-caption">{job.description}</p>
          ) : null}
          <span className="olv-meta">
            <span className="olv-loc">{locationLabel(job)}</span>
            {job.created_at ? (
              <>
                <span aria-hidden> · </span>
                <time dateTime={job.created_at}>{fmtDate(job.created_at)}</time>
              </>
            ) : null}
          </span>
          <span className="olv-addr">{job.full_address}</span>
        </figcaption>
      </figure>
    </li>
  );
}

export function WidgetView({ data }: { data: WidgetData }) {
  const businessName = data.business?.name ?? "Our work";
  const jobs = data.check_ins;
  const [activeId, setActiveId] = useState<string | null>(jobs[0]?.id ?? null);
  const [lightbox, setLightbox] = useState<LightboxMedia | null>(null);

  const selectJob = useCallback((job: WidgetCheckIn) => {
    setActiveId(job.id);
    const el = document.getElementById(`olv-job-${job.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        name: businessName,
        image: jobs
          .flatMap((j) =>
            j.media
              .filter((m) => m.type === "image")
              .map((m) => ({
                "@type": "ImageObject",
                contentUrl: m.url,
                caption: altFor(businessName, j),
                contentLocation: {
                  "@type": "Place",
                  address: j.full_address,
                  ...(typeof j.lat === "number"
                    ? {
                        geo: {
                          "@type": "GeoCoordinates",
                          latitude: j.lat,
                          longitude: j.lng,
                        },
                      }
                    : {}),
                },
                uploadDate: j.created_at,
              })),
          )
          .slice(0, 30),
      },
      {
        "@type": "ItemList",
        numberOfItems: jobs.length,
        itemListElement: jobs.slice(0, 30).map((job, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "CreativeWork",
            name: job.description || `Job at ${job.full_address}`,
            about: job.description || job.full_address,
            locationCreated: {
              "@type": "Place",
              address: job.full_address,
              ...(typeof job.lat === "number"
                ? {
                    geo: {
                      "@type": "GeoCoordinates",
                      latitude: job.lat,
                      longitude: job.lng,
                    },
                  }
                : {}),
            },
            dateCreated: job.created_at,
          },
        })),
      },
    ],
  };

  if (jobs.length === 0) {
    return (
      <div className="olv-empty">No published jobs yet.</div>
    );
  }

  return (
    <div className="olv-page">
      <header className="olv-head">
        <p className="olv-eyebrow">Our Work</p>
        <h1 className="olv-title">Recent jobs — {businessName}</h1>
        <p className="olv-sub">
          {jobs.length} recent job{jobs.length === 1 ? "" : "s"} with photos,
          videos, and locations on the map.
        </p>
      </header>

      <section className="olv-gallery" aria-labelledby="olv-gallery-title">
        <h2 id="olv-gallery-title" className="sr-only">
          Recent job photos and videos
        </h2>
        <ul className="olv-grid">
          {jobs.map((job, index) => (
            <JobCard
              key={job.id}
              job={job}
              index={index}
              businessName={businessName}
              active={activeId === job.id}
              onActivate={() => setActiveId(job.id)}
              onOpenMedia={setLightbox}
            />
          ))}
        </ul>
      </section>

      <WidgetMap
        checkIns={jobs}
        activeId={activeId}
        onSelectJob={selectJob}
      />

      {lightbox ? (
        <div
          className="olv-lb"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="olv-lb-close"
            aria-label="Close"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          {lightbox.type === "video" ? (
            <video
              src={lightbox.url}
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightbox.url}
              alt={lightbox.alt}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .olv-page {
          --olv-navy: #0b2447;
          --olv-muted: #475569;
          --olv-border: #e2e8f0;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          color: var(--olv-navy);
          background: #f8fafc;
          min-height: 100vh;
          padding: 24px 16px 48px;
        }
        .olv-head { max-width: 1100px; margin: 0 auto 28px; }
        .olv-eyebrow { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 8px; color: var(--olv-muted); }
        .olv-title { font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 750; letter-spacing: -0.02em; margin: 0 0 8px; line-height: 1.15; }
        .olv-sub { margin: 0; color: var(--olv-muted); font-size: 0.95rem; }
        .olv-gallery { max-width: 1100px; margin: 0 auto 40px; }
        .olv-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .olv-card { background: #fff; border: 1px solid var(--olv-border); border-radius: 16px; overflow: hidden; cursor: pointer; transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s; }
        .olv-card:hover, .olv-card.is-active { box-shadow: 0 14px 36px rgba(15, 23, 42, 0.12); transform: translateY(-2px); border-color: #cbd5e1; }
        .olv-card figure { margin: 0; display: flex; flex-direction: column; height: 100%; }
        .olv-media-wrap { position: relative; aspect-ratio: 4 / 3; background: #f1f5f9; overflow: hidden; }
        .olv-media { display: flex; width: 100%; height: 100%; overflow: hidden; }
        .olv-media.is-carousel { overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
        .olv-media.is-carousel::-webkit-scrollbar { display: none; }
        .olv-slide { flex: 0 0 100%; scroll-snap-align: start; border: 0; padding: 0; background: transparent; cursor: zoom-in; }
        .olv-slide img, .olv-video { width: 100%; height: 100%; object-fit: cover; display: block; }
        .olv-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: 999px; border: 0; background: rgba(15, 23, 42, 0.7); color: #fff; font-size: 1.25rem; line-height: 1; cursor: pointer; z-index: 2; }
        .olv-prev { left: 8px; } .olv-next { right: 8px; }
        .olv-count { position: absolute; right: 10px; bottom: 10px; background: rgba(15, 23, 42, 0.75); color: #fff; font-size: 0.7rem; font-weight: 600; padding: 3px 8px; border-radius: 999px; }
        .olv-card figcaption { padding: 14px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .olv-caption { margin: 0; font-size: 0.9rem; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .olv-meta { font-size: 0.8rem; color: var(--olv-muted); }
        .olv-loc { font-weight: 600; color: var(--olv-navy); }
        .olv-addr { font-size: 0.75rem; color: #94a3b8; }
        .olv-map-section { max-width: 1100px; margin: 0 auto; }
        .olv-map-title { font-size: clamp(1.25rem, 2vw, 1.6rem); margin: 0 0 6px; }
        .olv-map-intro { margin: 0 0 14px; color: var(--olv-muted); font-size: 0.9rem; }
        .olv-jm-map { height: 420px; border-radius: 16px; overflow: hidden; border: 1px solid var(--olv-border); background: #e2e8f0; z-index: 1; }
        .olv-jm-pin { background: transparent !important; border: 0 !important; }
        .olv-jm-pin-dot { display: block; width: 18px; height: 18px; border-radius: 999px; background: #0b2447; box-shadow: 0 4px 12px rgba(11, 36, 71, 0.35); border: 2px solid #fff; }
        .olv-jm-pop { display: flex; flex-direction: column; gap: 6px; font-family: inherit; }
        .olv-jm-title { font-size: 0.95rem; }
        .olv-jm-addr { font-size: 0.78rem; color: #475569; line-height: 1.35; }
        .olv-jm-sub { font-size: 0.75rem; color: #64748b; }
        .olv-jm-shots { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
        .olv-jm-shot { border: 0; padding: 0; width: 64px; height: 48px; border-radius: 6px; overflow: hidden; cursor: pointer; background: #f1f5f9; }
        .olv-jm-shot img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .olv-jm-more { font-size: 0.7rem; color: #64748b; align-self: center; }
        .olv-lb { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.86); padding: 16px; }
        .olv-lb img, .olv-lb video { max-height: 90vh; max-width: 95vw; border-radius: 12px; object-fit: contain; }
        .olv-lb-close { position: absolute; top: 16px; right: 16px; width: 40px; height: 40px; border-radius: 999px; border: 0; background: rgba(255, 255, 255, 0.12); color: #fff; font-size: 1.5rem; cursor: pointer; }
        .olv-empty { padding: 64px 24px; text-align: center; color: #64748b; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }
      `,
        }}
      />
    </div>
  );
}
