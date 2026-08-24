import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "./sw-register";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Detective Shopper — Investigate before you buy",
  description:
    "Scan a barcode to compare local and online prices and stack every coupon into one out-of-pocket total.",
  applicationName: "Detective Shopper",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Detective Shopper",
  },
};

export const viewport: Viewport = {
  themeColor: "#121c27",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
