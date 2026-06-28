"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsScript } from "@/lib/google-maps";
import { cn } from "@/lib/utils";
import type { AddressSelection } from "@/types/location";

type AddressAutocompleteProps = {
  onSelect: (selection: AddressSelection) => void;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
};

export function AddressAutocomplete({
  onSelect,
  placeholder = "Search for an address…",
  className,
  defaultValue = "",
  disabled = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMapsScript()
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch((loadError: Error) => {
        if (!cancelled) {
          setError(loadError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) {
      return;
    }

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry"],
      types: ["address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const fullAddress = place.formatted_address;
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();

      if (!fullAddress || lat == null || lng == null) {
        setError("Could not read the selected address. Try another result.");
        return;
      }

      setError(null);
      onSelect({ fullAddress, lat, lng });
    });

    autocompleteRef.current = autocomplete;
  }, [ready, onSelect]);

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled || !ready}
        autoComplete="off"
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
          "placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
      {!ready && !error ? (
        <p className="text-xs text-slate-500">Loading Google Maps…</p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
