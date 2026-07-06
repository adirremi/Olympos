"use client";

import { useState } from "react";

type Tab = "script" | "nextjs" | "astro" | "iframe";

const TABS: { id: Tab; label: string }[] = [
  { id: "script", label: "Script — any site" },
  { id: "nextjs", label: "Next.js" },
  { id: "astro", label: "Astro" },
  { id: "iframe", label: "iframe — quick" },
];

const DESCRIPTIONS: Record<Tab, string> = {
  script:
    "Drop-in for any website (WordPress, plain HTML, etc.). Injects your jobs as real HTML + structured data, so Google indexes them as part of your own site.",
  nextjs:
    "Server Component for Next.js (App Router). Renders on the server for full SEO — no iframe, no client JavaScript required.",
  astro:
    "Astro component. Server-rendered at build/request time for full SEO — no iframe.",
  iframe:
    "Simplest option. Note: content inside an iframe is not credited to your domain by Google, so it won't help your SEO.",
};

export function EmbedCode({
  businessId,
  baseUrl,
}: {
  businessId: string;
  baseUrl: string;
}) {
  const [tab, setTab] = useState<Tab>("script");
  const [copied, setCopied] = useState(false);

  const widgetUrl = `${baseUrl}/widget/${businessId}`;

  const scriptSnippet = `<div data-olympos-widget="${businessId}"></div>\n<script src="${baseUrl}/embed.js" async></script>`;
  const iframeSnippet = `<iframe src="${widgetUrl}" width="100%" height="600" style="border:0;border-radius:12px" loading="lazy"></iframe>`;
  const nextSnippet = `// 1. npm install @olympos/widget-react\n// 2. Use it in any Server Component:\nimport { OlymposJobs } from "@olympos/widget-react";\n\nexport default function OurWorkPage() {\n  return <OlymposJobs businessId="${businessId}" />;\n}`;
  const astroSnippet = `---\n// npm install @olympos/widget-astro\nimport OlymposJobs from "@olympos/widget-astro/OlymposJobs.astro";\n---\n\n<OlymposJobs businessId="${businessId}" />`;

  const snippet =
    tab === "script"
      ? scriptSnippet
      : tab === "nextjs"
        ? nextSnippet
        : tab === "astro"
          ? astroSnippet
          : iframeSnippet;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 transition-colors ${
              tab === t.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">{DESCRIPTIONS[tab]}</p>

      <div className="flex flex-wrap gap-2">
        <a
          href={widgetUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Preview widget
        </a>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
        >
          {copied ? "Copied!" : "Copy embed code"}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
        {snippet}
      </pre>
    </div>
  );
}
