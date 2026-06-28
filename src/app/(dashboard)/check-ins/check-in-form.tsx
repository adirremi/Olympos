"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { CheckInMediaUpload } from "@/components/check-in-media-upload";
import { createCheckIn, saveBusinessKeywords } from "./actions";
import { suggestKeywords } from "@/lib/keywords";
import type { AddressSelection } from "@/types/location";
import type { Business, CheckInCtaType } from "@/types/database";

const ctaOptions: { value: CheckInCtaType; label: string }[] = [
  { value: "none", label: "No CTA" },
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "website", label: "Website" },
];

export function CheckInForm({ businesses }: { businesses: Business[] }) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [selection, setSelection] = useState<AddressSelection | null>(null);
  const [savedCheckInId, setSavedCheckInId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [savedByBusiness, setSavedByBusiness] = useState<Record<string, string[]>>(
    () =>
      Object.fromEntries(
        businesses.map((business) => [business.id, business.keywords ?? []]),
      ),
  );
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState("");
  const [isSavingKeyword, startKeywordTransition] = useTransition();

  useEffect(() => {
    setSelectedKeywords([]);
  }, [businessId]);

  const selectedBusiness = businesses.find((b) => b.id === businessId);
  const savedKeywords = savedByBusiness[businessId] ?? [];

  const suggestions = useMemo(() => {
    if (!selectedBusiness) {
      return [];
    }
    return suggestKeywords(
      selectedBusiness.name,
      selection?.city,
      selection?.region,
    );
  }, [selectedBusiness, selection?.city, selection?.region]);

  const allKeywords = useMemo(() => {
    return Array.from(new Set([...savedKeywords, ...suggestions]));
  }, [savedKeywords, suggestions]);

  function toggleKeyword(keyword: string) {
    setSelectedKeywords((prev) =>
      prev.includes(keyword)
        ? prev.filter((k) => k !== keyword)
        : [...prev, keyword],
    );
  }

  function addCustomKeyword() {
    const keyword = customKeyword.trim();
    if (!keyword || !businessId) {
      return;
    }
    const next = Array.from(new Set([...savedKeywords, keyword]));
    setCustomKeyword("");
    setSelectedKeywords((prev) =>
      prev.includes(keyword) ? prev : [...prev, keyword],
    );
    startKeywordTransition(async () => {
      const result = await saveBusinessKeywords(businessId, next);
      if (result.keywords) {
        setSavedByBusiness((prev) => ({
          ...prev,
          [businessId]: result.keywords as string[],
        }));
      }
    });
  }

  if (businesses.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        Create a business first before logging check-ins.
      </p>
    );
  }

  return (
    <form
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);

        if (!selection) {
          setError("Select an address from the suggestions.");
          return;
        }

        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await createCheckIn({
            businessId,
            fullAddress: selection.fullAddress,
            lat: selection.lat,
            lng: selection.lng,
            city: selection.city ?? null,
            region: selection.region ?? null,
            country: selection.country ?? null,
            description: String(formData.get("description") ?? ""),
            ctaType: String(formData.get("ctaType")) as CheckInCtaType,
            keywords: selectedKeywords,
          });

          if (result.error) {
            setError(result.error);
            return;
          }

          setSavedCheckInId(result.data?.id ?? null);
          setMessage("Check-in saved. Add photos or videos below.");
          setSelection(null);
        });
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="businessId" className="text-sm font-medium text-slate-700">
          Business
        </label>
        <select
          id="businessId"
          name="businessId"
          required
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
          value={businessId}
          onChange={(event) => setBusinessId(event.target.value)}
        >
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>
              {business.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Address</label>
        <AddressAutocomplete
          key={selection?.fullAddress ?? "empty"}
          onSelect={setSelection}
          placeholder="Search address…"
        />
        {selection ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p className="font-medium text-slate-800">{selection.fullAddress}</p>
            <p className="mt-0.5">
              {[selection.city, selection.region, selection.country]
                .filter(Boolean)
                .join(", ") || "—"}{" "}
              · {selection.lat.toFixed(5)}, {selection.lng.toFixed(5)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Keywords{" "}
          <span className="font-normal text-slate-400">
            (added as hashtags to posts)
          </span>
        </label>

        {allKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allKeywords.map((keyword) => {
              const active = selectedKeywords.includes(keyword);
              return (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => toggleKeyword(keyword)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {keyword}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Pick an address to see suggestions, or add your own below.
          </p>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={customKeyword}
            onChange={(event) => setCustomKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustomKeyword();
              }
            }}
            placeholder="Add a custom keyword…"
            className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
          />
          <button
            type="button"
            onClick={addCustomKeyword}
            disabled={isSavingKeyword || !customKeyword.trim()}
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {isSavingKeyword ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="What was done at this job site?"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ctaType" className="text-sm font-medium text-slate-700">
          Call to action
        </label>
        <select
          id="ctaType"
          name="ctaType"
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
          defaultValue="none"
        >
          {ctaOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save check-in"}
      </button>

      {savedCheckInId ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900">
            Add photos & videos
          </p>
          <CheckInMediaUpload checkInId={savedCheckInId} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
          Save the check-in first, then upload photos &amp; videos here.
        </div>
      )}
    </form>
  );
}
