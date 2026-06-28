"use client";

import { useState } from "react";

export function EmbedCode({
  businessId,
  baseUrl,
}: {
  businessId: string;
  baseUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  const widgetUrl = `${baseUrl}/widget/${businessId}`;
  const snippet = `<iframe src="${widgetUrl}" width="100%" height="600" style="border:0;border-radius:12px" loading="lazy"></iframe>`;

  return (
    <div className="space-y-3">
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
      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
        {snippet}
      </pre>
    </div>
  );
}
