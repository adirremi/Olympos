"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { importPlacesLibrary } from "@/lib/google-maps";
import { cn } from "@/lib/utils";
import type { AddressSelection } from "@/types/location";

type AddressAutocompleteProps = {
  onSelect: (selection: AddressSelection) => void;
  placeholder?: string;
  className?: string;
};

export function AddressAutocomplete({
  onSelect,
  placeholder = "Search for an address…",
  className,
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let appended: HTMLElement | null = null;

    function parseComponents(place: any) {
      const components: any[] =
        place?.addressComponents ?? place?.address_components ?? [];

      function find(type: string, short = false): string | null {
        const match = components.find((c) => (c?.types ?? []).includes(type));
        if (!match) {
          return null;
        }
        return short
          ? match.shortText ?? match.short_name ?? null
          : match.longText ?? match.long_name ?? null;
      }

      const city =
        find("locality") ??
        find("postal_town") ??
        find("sublocality_level_1") ??
        find("sublocality") ??
        find("administrative_area_level_2");
      const region = find("administrative_area_level_1");
      const country = find("country");

      return { city, region, country };
    }

    async function emitFromPlace(place: any) {
      try {
        if (place?.fetchFields) {
          await place.fetchFields({
            fields: ["formattedAddress", "location", "addressComponents"],
          });
        }
        const fullAddress = place?.formattedAddress ?? place?.formatted_address;
        const lat = place?.location?.lat?.() ?? place?.geometry?.location?.lat?.();
        const lng = place?.location?.lng?.() ?? place?.geometry?.location?.lng?.();

        if (!fullAddress || lat == null || lng == null) {
          setError("Could not read the selected address. Try another result.");
          return;
        }

        const { city, region, country } = parseComponents(place);

        setError(null);
        onSelectRef.current({ fullAddress, lat, lng, city, region, country });
      } catch (fieldError) {
        setError(
          fieldError instanceof Error
            ? fieldError.message
            : "Could not read the selected address.",
        );
      }
    }

    (async () => {
      try {
        const places: any = await importPlacesLibrary();
        if (cancelled || !containerRef.current) {
          return;
        }

        // Preferred: new Places API web component.
        if (places.PlaceAutocompleteElement) {
          const element: any = new places.PlaceAutocompleteElement();
          element.style.width = "100%";
          if (placeholder) {
            element.setAttribute("placeholder", placeholder);
          }

          const handleSelect = async (event: any) => {
            const prediction =
              event?.placePrediction ?? event?.detail?.placePrediction;
            if (prediction?.toPlace) {
              await emitFromPlace(prediction.toPlace());
              return;
            }
            const place = event?.place ?? event?.detail?.place;
            if (place) {
              await emitFromPlace(place);
            }
          };

          element.addEventListener("gmp-select", handleSelect);
          element.addEventListener("gmp-placeselect", handleSelect);

          containerRef.current.appendChild(element);
          appended = element;
          setReady(true);
          return;
        }

        // Fallback: legacy Autocomplete (older API keys).
        if (places.Autocomplete) {
          const input = document.createElement("input");
          input.type = "text";
          input.placeholder = placeholder;
          input.autocomplete = "off";
          input.className =
            "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";
          containerRef.current.appendChild(input);
          appended = input;

          const autocomplete = new places.Autocomplete(input, {
            fields: ["formatted_address", "geometry", "address_components"],
            types: ["address"],
          });
          autocomplete.addListener("place_changed", () => {
            void emitFromPlace(autocomplete.getPlace());
          });

          setReady(true);
          return;
        }

        setError("Address search is unavailable for this API key.");
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load address search.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (appended && appended.parentNode) {
        appended.parentNode.removeChild(appended);
      }
    };
  }, [placeholder]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div ref={containerRef} />
      {!ready && !error ? (
        <p className="text-xs text-slate-500">Loading address search…</p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
