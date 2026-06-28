"use client";

import { useState, useTransition } from "react";
import { completeOnboarding } from "./actions";

export function OnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await completeOnboarding({
            fullName: String(formData.get("fullName") ?? ""),
            phone: String(formData.get("phone") ?? ""),
            businessName: String(formData.get("businessName") ?? ""),
          });

          if (result?.error) {
            setError(result.error);
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          required
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
          placeholder="John Cohen"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium text-slate-700">
          Phone (optional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
          placeholder="050-1234567"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="businessName"
          className="text-sm font-medium text-slate-700"
        >
          Business name
        </label>
        <input
          id="businessName"
          name="businessName"
          required
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
          placeholder="Cohen Plumbing Ltd."
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-11 w-full rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Continue to dashboard"}
      </button>
    </form>
  );
}
