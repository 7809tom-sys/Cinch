import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Sans } from "next/font/google";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getMasterSession } from "@/lib/master-auth";
import { SportProvider } from "@/lib/lockgm/sport-context";
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
    "Multi-sport Shadow GM platform: AI scout research, personal numbered reports, salary/wage desks, and draft-day beat-the-pick races.",
};

export default async function LockgmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [master, customer] = await Promise.all([
    getMasterSession(),
    getCurrentCustomer(),
  ]);

  return (
    <div
      className={`${display.variable} ${body.variable} lockgm-root min-h-full`}
    >
      <SportProvider>
        <LockgmChrome isAdmin={Boolean(master)} isSignedIn={Boolean(customer)}>
          {children}
        </LockgmChrome>
      </SportProvider>
    </div>
  );
}
