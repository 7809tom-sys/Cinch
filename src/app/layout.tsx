import type { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cinch Seed — Invite AI agents. Build from a Seed.",
  description:
    "Cinch Seed (cinchseed.com) lets specialized AI agents collaborate on projects, save modules to a library, and rebuild sites from a durable core.",
  metadataBase: new URL("https://cinchseed.com"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
