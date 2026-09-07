"use client";

import Link from "next/link";
import { useSport } from "@/lib/lockgm/sport-context";
import { SportSwitcher } from "./sport-switcher";

const NAV = [
  { href: "/lockgm/office", label: "GM office" },
  { href: "/lockgm/reports", label: "My reports" },
  { href: "/lockgm/draft", label: "Draft day" },
  { href: "/lockgm/sim", label: "Classic Matchup" },
  { href: "/lockgm/ratings", label: "Ratings" },
  { href: "/lockgm/cap", label: "Budget" },
  { href: "/lockgm/scouting", label: "Scouting" },
  { href: "/lockgm/fantasy-football", label: "Fantasy pulse" },
  { href: "/lockgm/friends", label: "Invite friends" },
  { href: "/lockgm/pricing", label: "Tiers" },
  { href: "/lockgm/profile", label: "My profile" },
];

export function LockgmChrome({
  children,
  isAdmin,
  isSignedIn,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
  isSignedIn: boolean;
}) {
  const { sport, franchise } = useSport();

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-[color:var(--lg-line)] bg-[color:var(--lg-bg)]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <div>
            <Link
              href="/lockgm"
              className="lockgm-display text-2xl font-extrabold tracking-tight text-[color:var(--lg-accent)]"
            >
              LockedGM
            </Link>
            <p className="text-[10px] font-semibold tracking-wide text-[color:var(--lg-mute)] uppercase">
              {franchise.abbrev} · {sport.roleTitle}
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-end gap-3 text-sm font-semibold text-[color:var(--lg-mute)] sm:gap-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-[color:var(--lg-text)]"
              >
                {item.label}
              </Link>
            ))}
            {isAdmin ? (
              <Link
                href="/lockgm/admin"
                className="font-bold text-[color:var(--lg-accent)] transition-colors hover:text-[color:var(--lg-text)]"
              >
                GM admin
              </Link>
            ) : null}
            {isSignedIn ? null : (
              <Link
                href="/login"
                className="rounded-md border border-[color:var(--lg-accent)] px-3 py-1.5 font-bold text-[color:var(--lg-accent)] transition-colors hover:bg-[color:var(--lg-accent)] hover:text-[color:var(--lg-bg)]"
              >
                Sign in / Create login
              </Link>
            )}
            <Link
              href="/lockgm/draft"
              className="rounded-md bg-[color:var(--lg-accent)] px-3 py-1.5 text-[color:var(--lg-bg)] transition-transform hover:-translate-y-0.5"
            >
              Enter war room
            </Link>
          </nav>
        </div>
        <SportSwitcher />
      </header>
      {children}
      <footer className="border-t border-[color:var(--lg-line)] px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 text-sm text-[color:var(--lg-mute)] sm:flex-row sm:items-center">
          <p className="lockgm-display text-lg font-bold text-[color:var(--lg-accent)]">
            LockedGM
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="hover:text-[color:var(--lg-text)]">
              Built on Cinch Seed
            </Link>
            {isSignedIn ? null : (
              <Link href="/login" className="hover:text-[color:var(--lg-text)]">
                Sign in / Create login
              </Link>
            )}
            <Link
              href="/lockgm/reports"
              className="hover:text-[color:var(--lg-text)]"
            >
              My reports
            </Link>
            <Link
              href="/lockgm/profile"
              className="hover:text-[color:var(--lg-text)]"
            >
              My profile
            </Link>
            <Link
              href="/lockgm/pricing"
              className="hover:text-[color:var(--lg-text)]"
            >
              Subscriptions
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
