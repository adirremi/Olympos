import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "אולימפוס · הכנה לקרבי",
    short_name: "אולימפוס",
    description: "אימונים, ביצועים ותחקור יומי להכנה לשירות קרבי.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    dir: "rtl",
    lang: "he",
    background_color: "#0a2540",
    theme_color: "#0a2540",
    icons: [
      {
        src: "/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
