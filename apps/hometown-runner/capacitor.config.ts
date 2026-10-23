/**
 * Capacitor shell for submitting Hometown Runner to the App Store and Play.
 * Dependency-free on purpose: the Next.js app keeps using server actions, so
 * the native binary loads the live site instead of a static export.
 *
 * Store listing URLs (same origin the shell opens):
 *   App:     https://www.cinchseed.com/hometown
 *   Privacy: https://www.cinchseed.com/hometown/privacy
 *   Support: https://www.cinchseed.com/hometown
 * Bundle id: com.hometownrunner.app
 *
 * Build on a machine with the store toolchain (macOS + Xcode for iOS):
 *
 *   cd apps/hometown-runner
 *   npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
 *   npx cap add ios
 *   npx cap add android
 *   npx cap sync
 *   npx cap open ios       # archive in Xcode, upload with an Apple Developer account
 *   npx cap open android   # signed AAB in Android Studio, upload in Play Console
 *
 * App Store Connect and Play Console still need the privacy URL, screenshots,
 * age rating, and a 1024×1024 icon exported from public/hometown-icon.svg.
 * This repo cannot sign or upload those binaries.
 */

type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir: string;
  server?: { url?: string; cleartext?: boolean; androidScheme?: string };
};

const config: CapacitorConfig = {
  appId: "com.hometownrunner.app",
  appName: "Hometown Runner",
  webDir: "public",
  server: {
    url: "https://www.cinchseed.com/hometown",
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;
