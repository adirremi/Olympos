"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsScript } from "@/lib/google-maps";
import type { WidgetCheckIn } from "@/types/database";

export function WidgetMap({
  checkIns,
  onSelect,
}: {
  checkIns: WidgetCheckIn[];
  onSelect: (checkIn: WidgetCheckIn) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMapsScript()
      .then(() => {
        if (cancelled || !mapRef.current || checkIns.length === 0) {
          return;
        }

        const bounds = new google.maps.LatLngBounds();
        const map = new google.maps.Map(mapRef.current, {
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        checkIns.forEach((checkIn) => {
          const position = { lat: checkIn.lat, lng: checkIn.lng };
          const marker = new google.maps.Marker({
            position,
            map,
            title: checkIn.full_address,
          });
          marker.addListener("click", () => onSelect(checkIn));
          bounds.extend(position);
        });

        map.fitBounds(bounds);

        if (checkIns.length === 1) {
          google.maps.event.addListenerOnce(map, "idle", () => {
            map.setZoom(15);
          });
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
  }, [checkIns, onSelect]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500">
        {error}
      </div>
    );
  }

  return <div ref={mapRef} className="h-full w-full" />;
}
