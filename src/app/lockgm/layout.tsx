import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Sans } from "next/font/google";
import { LockgmChrome } from "./components/lockgm-chrome";
import "./lockgm.css";

const display = Barlow_Condensed({
  variable: "--lockgm-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = IBM_Plex_Sans({
  variable: "--lockgm-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LockGM — Shadow GM draft & scouting",
  description:
    "Live draft simulator and scouting platform where fans act as Shadow GMs — sync drafts, track the salary cap, and follow prospects from high school to the league.",
};

export default function LockgmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${display.variable} ${body.variable} lockgm-root min-h-full`}
    >
      <LockgmChrome>{children}</LockgmChrome>
    </div>
  );
}
