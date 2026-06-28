let loadPromise: Promise<void> | null = null;

function isMapsLoaded(): boolean {
  const maps = (window as unknown as { google?: { maps?: unknown } }).google
    ?.maps as { importLibrary?: unknown } | undefined;
  return typeof maps?.importLibrary === "function";
}

function ensureGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }

  if (isMapsLoaded()) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable."),
    );
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps="true"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Maps script.")),
        { once: true },
      );
      return;
    }

    const callbackName = "__googleMapsReady";
    (window as unknown as Record<string, () => void>)[callbackName] = () =>
      resolve();

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    script.onerror = () =>
      reject(new Error("Failed to load Google Maps script."));
    document.head.appendChild(script);
  });

  return loadPromise;
}

// Loads core map libraries. Existing callers rely on google.maps.Map / Marker
// being available after this resolves.
export async function loadGoogleMapsScript(): Promise<void> {
  await ensureGoogleMaps();
  await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
  ]);
}

// Loads and returns the Places library (new Places API).
export async function importPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  await ensureGoogleMaps();
  return (await google.maps.importLibrary(
    "places",
  )) as google.maps.PlacesLibrary;
}
