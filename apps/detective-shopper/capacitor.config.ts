/**
 * Capacitor configuration for packaging Detective Shopper as native iOS/Android
 * apps. This file is dependency-free so the web build never requires the native
 * toolchain; the CapacitorConfig type is provided by @capacitor/cli once you
 * install Capacitor on a machine with Xcode / Android Studio.
 *
 * Because Detective Shopper uses Next.js server components + server actions
 * (dynamic), the native shell loads the deployed web app via `server.url`
 * rather than a static export. Update the URL for preview builds if needed.
 *
 * Native build steps (run on macOS for iOS; macOS/Windows/Linux for Android):
 *
 *   npm install @capacitor/core @capacitor/cli @capacitor/camera \
 *     @capacitor-community/barcode-scanner
 *   npm install @capacitor/ios @capacitor/android
 *   npx cap add ios
 *   npx cap add android
 *   npx cap sync
 *   npx cap open ios       # build/run in Xcode (needs an Apple Developer acct)
 *   npx cap open android   # build/run in Android Studio
 *
 * In the native shell, swap the browser BarcodeDetector for the native scanner
 * (@capacitor-community/barcode-scanner) for zero-latency continuous scanning.
 */

type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir: string;
  server?: { url?: string; cleartext?: boolean; androidScheme?: string };
  plugins?: Record<string, unknown>;
};

const config: CapacitorConfig = {
  appId: "com.detectiveshopper.app",
  appName: "Detective Shopper",
  // Placeholder for `cap sync`; the app is served from server.url at runtime.
  webDir: "public",
  server: {
    url: "https://www.detectiveshopper.com",
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;
