"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { GmbLocation } from "@/lib/google-business/api";
import { importGoogleBusinessLocation, listGoogleBusinessLocations } from "./actions";

export function GoogleBusinessImport({
  isConnected,
  googleStatus,
  googleError,
}: {
  isConnected: boolean;
  googleStatus?: string;
  googleError?: string;
}) {
  const [locations, setLocations] = useState<GmbLocation[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(googleError ?? null);
  const [isPending, startTransition] = useTransition();

  const loadLocations = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const result = await listGoogleBusinessLocations();
      if (result.error) {
        setError(result.error);
        return;
      }
      setLocations(result.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (isConnected || googleStatus === "connected") {
      setMessage("Google Business connected. Choose locations to import.");
      loadLocations();
    }
  }, [isConnected, googleStatus, loadLocations]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Import from Google Business</h2>
          <p className="mt-1 text-sm text-slate-600">
            Connect the same Google account that manages your Business Profile,
            then import locations as businesses.
          </p>
        </div>
        <Link
          href="/api/google-business/connect"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          {isConnected ? "Reconnect Google" : "Connect Google Business"}
        </Link>
      </div>

      {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {isConnected ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={isPending}
            onClick={loadLocations}
            className="text-sm font-medium text-slate-700 underline"
          >
            Refresh locations
          </button>
        </div>
      ) : null}

      {locations.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {locations.map((location) => (
            <li
              key={location.locationId}
              className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">{location.locationName}</p>
                {location.address ? (
                  <p className="mt-1 text-sm text-slate-600">{location.address}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  Account: {location.accountName}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    setError(null);
                    const result = await importGoogleBusinessLocation(location);
                    if (result.error) {
                      setError(result.error);
                      return;
                    }
                    setMessage(`Imported "${result.data?.name}".`);
                  });
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Import
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
