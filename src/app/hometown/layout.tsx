import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { HOMETOWN_APP_NAME } from "@/lib/hometown-store";

export const metadata: Metadata = {
  title: HOMETOWN_APP_NAME,
  description:
    "Hometown Runner — order from a kitchen in town, run the kitchen desk, or drive.",
  applicationName: HOMETOWN_APP_NAME,
  manifest: "/hometown/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: HOMETOWN_APP_NAME,
  },
  icons: {
    icon: [{ url: "/hometown-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/hometown-icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b2e2a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function HometownLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
