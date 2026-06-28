"use client";

export default function CheckInsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-red-200 bg-red-50 p-6">
      <h1 className="text-lg font-semibold text-red-900">
        Could not load check-ins
      </h1>
      <p className="text-sm text-red-800">
        {error.message || "Unknown server error."}
      </p>
      {error.digest ? (
        <p className="text-xs text-red-700">Error ID: {error.digest}</p>
      ) : null}
      <div className="space-y-2 text-sm text-red-900">
        <p>Checklist:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Run SQL migrations 000, 002, 003, 005, 007 in Supabase</li>
          <li>Add SUPABASE_SERVICE_ROLE_KEY in Vercel</li>
          <li>Redeploy after env changes</li>
        </ul>
      </div>
      <button
        type="button"
        onClick={reset}
        className="h-10 rounded-lg bg-red-900 px-4 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
