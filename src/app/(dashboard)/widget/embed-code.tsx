"use client";

import { useState } from "react";

type Tab = "script" | "iframe";

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

  const snippet = tab === "script" ? scriptSnippet : iframeSnippet;

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setTab("script")}
          className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
            tab === "script"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Script — best for SEO
        </button>
        <button
          type="button"
          onClick={() => setTab("iframe")}
          className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
            tab === "iframe"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          iframe — quick
        </button>
      </div>

      <p className="text-xs text-slate-500">
        {tab === "script"
          ? "Injects your jobs as real HTML + structured data into your page, so Google indexes them as part of your own site. Works on Next.js, Astro, WordPress, and any website."
          : "Simplest option. Note: content inside an iframe is not credited to your domain by Google, so it won't help your SEO."}
      </p>

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
