import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Saldo — Personal Finance", short_name: "Saldo", description: "Private personal finance tracking.",
    start_url: "/", display: "standalone", background_color: "#0b0d10", theme_color: "#0b0d10",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
