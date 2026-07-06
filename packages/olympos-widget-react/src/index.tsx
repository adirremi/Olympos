import * as React from "react";

export type OlymposMedia = { url: string; type: "image" | "video" };

export type OlymposJob = {
  id: string;
  full_address: string;
  lat: number;
  lng: number;
  description: string | null;
  cta_type: string;
  created_at: string;
  media: OlymposMedia[];
};

export type OlymposData = {
  business: { id: string; name: string } | null;
  check_ins: OlymposJob[];
};

export interface OlymposJobsProps {
  /** The business id from your Olympos Sync dashboard. */
  businessId: string;
  /** Olympos deployment origin. Defaults to the hosted instance. */
  baseUrl?: string;
  /** Optionally cap how many jobs to render. */
  limit?: number;
  /** Next.js ISR revalidate window in seconds (default 300). */
  revalidate?: number;
  /** Optional wrapper className for layout control. */
  className?: string;
}

const DEFAULT_ORIGIN = "https://olympossync.com";

const CSS = `
.olv{--olv-radius:14px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a}
.olv *{box-sizing:border-box}
.olv__head{margin:0 0 16px}
.olv__title{font-size:1.25rem;font-weight:700;margin:0}
.olv__sub{font-size:.875rem;color:#64748b;margin:2px 0 0}
.olv__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.olv__card{border:1px solid #e2e8f0;border-radius:var(--olv-radius);overflow:hidden;background:#fff;display:flex;flex-direction:column;transition:box-shadow .2s,transform .2s}
.olv__card:hover{box-shadow:0 10px 25px -5px rgba(15,23,42,.12);transform:translateY(-2px)}
.olv__cover{position:relative;aspect-ratio:4/3;background:#f1f5f9;overflow:hidden;display:block}
.olv__cover img,.olv__cover video{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s}
.olv__cover:hover img{transform:scale(1.05)}
.olv__badge{position:absolute;left:10px;top:10px;background:rgba(15,23,42,.78);color:#fff;font-size:.7rem;font-weight:600;padding:3px 8px;border-radius:999px}
.olv__body{padding:14px;display:flex;flex-direction:column;gap:6px;flex:1}
.olv__addr{font-size:.95rem;font-weight:600;margin:0;line-height:1.3}
.olv__desc{font-size:.85rem;color:#475569;margin:0;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.olv__thumbs{display:flex;gap:6px;margin-top:4px}
.olv__thumb{width:44px;height:44px;border-radius:8px;overflow:hidden;background:#f1f5f9;flex:0 0 auto;display:block}
.olv__thumb img,.olv__thumb video{width:100%;height:100%;object-fit:cover;display:block}
.olv__date{font-size:.75rem;color:#94a3b8;margin:auto 0 0}
.olv__foot{margin-top:16px;text-align:right}
.olv__foot a{font-size:.75rem;color:#94a3b8;text-decoration:none}
.olv__foot a:hover{color:#475569}
.olv__empty{padding:32px;text-align:center;color:#64748b;font-size:.9rem;border:1px dashed #cbd5e1;border-radius:var(--olv-radius)}
`;

async function fetchData(
  businessId: string,
  baseUrl: string,
  revalidate: number,
): Promise<OlymposData> {
  try {
    const res = await fetch(
      `${baseUrl}/api/widget/${encodeURIComponent(businessId)}`,
      // `next` is ignored outside Next.js; harmless elsewhere.
      { next: { revalidate } } as RequestInit,
    );
    if (!res.ok) {
      return { business: null, check_ins: [] };
    }
    return (await res.json()) as OlymposData;
  } catch {
    return { business: null, check_ins: [] };
  }
}

function Media({ media }: { media: OlymposMedia }) {
  if (media.type === "video") {
    return <video src={media.url} muted playsInline />;
  }
  return <img src={media.url} alt="" loading="lazy" />;
}

function buildJsonLd(business: { name: string }, jobs: OlymposJob[]) {
  const images = jobs
    .flatMap((job) => job.media.filter((m) => m.type === "image").map((m) => m.url))
    .slice(0, 30);
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    image: images,
    subjectOf: jobs.slice(0, 30).map((job) => ({
      "@type": "CreativeWork",
      about: job.description || job.full_address,
      contentLocation: { "@type": "Place", address: job.full_address },
      dateCreated: job.created_at,
    })),
  };
}

/**
 * Server Component. Renders a business's published check-ins as a real,
 * crawlable HTML gallery plus JSON-LD structured data — directly inside your
 * page's HTML, so Google indexes the jobs on your own domain.
 *
 * Usage (Next.js App Router):
 *   import { OlymposJobs } from "@olympos/widget-react";
 *   export default function Page() {
 *     return <OlymposJobs businessId="YOUR_BUSINESS_ID" />;
 *   }
 */
export async function OlymposJobs({
  businessId,
  baseUrl = DEFAULT_ORIGIN,
  limit,
  revalidate = 300,
  className,
}: OlymposJobsProps) {
  const data = await fetchData(businessId, baseUrl, revalidate);
  const business = data.business;
  const jobs = limit ? data.check_ins.slice(0, limit) : data.check_ins;

  if (!business || jobs.length === 0) {
    return (
      <div className={["olv", className].filter(Boolean).join(" ")}>
        <div className="olv__empty">No published jobs yet.</div>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </div>
    );
  }

  const jsonLd = buildJsonLd(business, jobs);

  return (
    <div className={["olv", className].filter(Boolean).join(" ")}>
      <div className="olv__head">
        <h2 className="olv__title">{business.name}</h2>
        <p className="olv__sub">
          {jobs.length} recent job{jobs.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="olv__grid">
        {jobs.map((job) => {
          const cover = job.media[0];
          const extra = job.media.slice(1, 5);
          return (
            <article className="olv__card" key={job.id}>
              {cover ? (
                <a
                  className="olv__cover"
                  href={cover.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Media media={cover} />
                  <span className="olv__badge">
                    {job.media.length > 1
                      ? `${job.media.length} photos`
                      : "1 photo"}
                  </span>
                </a>
              ) : null}
              <div className="olv__body">
                <p className="olv__addr">{job.full_address}</p>
                {job.description ? (
                  <p className="olv__desc">{job.description}</p>
                ) : null}
                {extra.length > 0 ? (
                  <div className="olv__thumbs">
                    {extra.map((m, i) => (
                      <a
                        className="olv__thumb"
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={`${job.id}-${i}`}
                      >
                        <Media media={m} />
                      </a>
                    ))}
                  </div>
                ) : null}
                <p className="olv__date">
                  {new Date(job.created_at).toLocaleDateString()}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="olv__foot">
        <a href={baseUrl} target="_blank" rel="noopener noreferrer">
          Powered by Olympos Sync
        </a>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </div>
  );
}

export default OlymposJobs;
