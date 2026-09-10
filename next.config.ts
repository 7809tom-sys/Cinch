import type { NextConfig } from "next";
import { cinchHostedCloneRedirects } from "./src/lib/hosted-site";

const nextConfig: NextConfig = {
  // Playwright / local agents often hit 127.0.0.1; allow HMR + static chunks.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return cinchHostedCloneRedirects();
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
