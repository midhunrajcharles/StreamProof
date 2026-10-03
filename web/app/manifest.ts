import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StreamProof",
    short_name: "StreamProof",
    description: "Report a stream, see how trustworthy the evidence is, and review it. A trust add-on for OneAquaHealth.",
    id: "/reports",
    start_url: "/reports",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "any",
    background_color: "#f5f5f7",
    theme_color: "#f5f5f7",
    categories: ["utilities", "education", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Report a stream", short_name: "Report", url: "/report", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Review queue", short_name: "Review", url: "/review", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
