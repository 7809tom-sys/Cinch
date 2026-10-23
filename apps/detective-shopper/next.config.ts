import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local agents and browsers often use 127.0.0.1, which Next treats as a
  // different origin from localhost and blocks for dev assets and actions.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.spoonacular.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
