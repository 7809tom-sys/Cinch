import type { NextConfig } from "next";
import { cinchHostedCloneRedirects } from "./src/lib/hosted-site";

const nextConfig: NextConfig = {
  // Local agents hit 127.0.0.1. hometownrunner.com is mapped here only
  // while checking the vanity host rewrite.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "hometownrunner.com",
    "www.hometownrunner.com",
  ],
  // unpdf embeds PDF.js. Keep it on the server so the Writer crew can read PDFs.
  serverExternalPackages: ["unpdf"],
  experimental: {
    // 2–3 compressed menu photos or one PDF on the kitchen parse action.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
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
