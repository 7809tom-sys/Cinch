import { NextResponse } from "next/server";
import { HOMETOWN_APP_NAME, HOMETOWN_STORE_PATH } from "@/lib/hometown-store";

export function GET() {
  return NextResponse.json(
    {
      name: HOMETOWN_APP_NAME,
      short_name: "Hometown",
      description:
        "Order dinner from a kitchen in town, run the kitchen desk, or drive.",
      start_url: HOMETOWN_STORE_PATH,
      scope: HOMETOWN_STORE_PATH,
      display: "standalone",
      orientation: "portrait",
      background_color: "#fffaf2",
      theme_color: "#0b2e2a",
      categories: ["food", "lifestyle"],
      icons: [
        {
          src: "/hometown-icon.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
      },
    },
  );
}
