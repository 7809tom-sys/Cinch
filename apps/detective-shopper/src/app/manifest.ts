import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Detective Shopper",
    short_name: "Detective",
    description:
      "Scan a barcode to compare local and online prices and stack every coupon into one out-of-pocket total.",
    start_url: "/scan",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#121c27",
    theme_color: "#121c27",
    categories: ["shopping", "productivity", "finance"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
