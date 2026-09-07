"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useSport } from "@/lib/lockgm/sport-context";
import { SportSwitcher } from "./sport-switcher";

const NAV = [
  { href: "/lockgm/office", label: "GM office" },
  { href: "/lockgm/reports", label: "My reports" },
  { href: "/lockgm/draft", label: "Draft day" },
  { href: "/lockgm/sim", label: "Classic Matchup" },
  { href: "/lockgm/league", label: "2026 League" },
  { href: "/lockgm/live", label: "Live Matchup" },
  { href: "/lockgm/ratings", label: "Ratings" },
  { href: "/lockgm/cap", label: "Budget" },
  { href: "/lockgm/scouting", label: "Scouting" },
  { href: "/lockgm/fantasy-football", label: "Fantasy pulse" },
  { href: "/lockgm/friends", label: "Invite friends" },
  { href: "/lockgm/pricing", label: "Tiers" },
  { href: "/lockgm/profile", label: "My profile" },
] as const;

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-3.5 w-5" aria-hidden="true">
      <span
        className={`absolute left-0 top-0 block h-0.5 w-5 origin-center bg-[color:var(--lg-text)] transition-transform duration-200 ${
          open ? "translate-y-[6px] rotate-45" : ""
        }`}
      />
      <span
        className={`absolute left-0 top-[6px] block h-0.5 w-5 bg-[color:var(--lg-text)] transition-opacity duration-200 ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute left-0 top-[12px] block h-0.5 w-5 origin-center bg-[color:var(--lg-text)] transition-transform duration-200 ${
          open ? "-translate-y-[6px] -rotate-45" : ""
        }`}
      />
    </span>
  );
}

/**
 * Sign in / account link — kept OUTSIDE the collapsible tools nav and always
 * rendered at every screen size (including mobile, next to the hamburger),
 * because it's the one action a logged-out visitor needs to be able to find
 * without opening a menu first.
 */
function AccountLink({
  isSignedIn,
  onClick,
}: {
  isSignedIn: boolean;
  onClick?: () => void;
}) {
  if (isSignedIn) {
    return (
      <Link
        href="/lockgm/profile"
        onClick={onClick}
        className="inline-flex h-10 items-center rounded-md border border-[color:var(--lg-line)] px-3 text-sm font-bold text-[color:var(--lg-text)] transition-colors hover:border-[color:var(--lg-accent)]"
      >
        My account
      </Link>
    );
  }
  return (
    <Link
      href="/login"
      onClick={onClick}
      className="inline-flex h-10 items-center rounded-md border border-[color:var(--lg-accent)] px-3 text-sm font-bold text-[color:var(--lg-accent)] transition-colors hover:bg-[color:var(--lg-accent)] hover:text-[color:var(--lg-bg)]"
    >
      Sign in
    </Link>
  );
}

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
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-[color:var(--lg-line)] bg-[color:var(--lg-bg)]/95 backdrop-blur">
        <div className="relative z-50 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div>
            <Link
              href="/lockgm"
              onClick={close}
              className="lockgm-display text-2xl font-extrabold tracking-tight text-[color:var(--lg-accent)]"
            >
              LockedGM
            </Link>
            <p className="text-[10px] font-semibold tracking-wide text-[color:var(--lg-mute)] uppercase">
              {franchise.abbrev} · {sport.roleTitle}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Full tools nav — only shown once there's comfortable room for
                all 11+ links in one row. Everything below that breakpoint
                gets the hamburger menu instead of a cramped wrap. */}
            <nav
              className="hidden items-center gap-4 text-sm font-semibold text-[color:var(--lg-mute)] xl:flex"
              aria-label="LockedGM tools"
            >
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap transition-colors hover:text-[color:var(--lg-text)]"
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin ? (
                <Link
                  href="/lockgm/admin"
                  className="whitespace-nowrap font-bold text-[color:var(--lg-accent)] transition-colors hover:text-[color:var(--lg-text)]"
                >
                  GM admin
                </Link>
              ) : null}
            </nav>

            <AccountLink isSignedIn={isSignedIn} />

            <Link
              href="/lockgm/draft"
              className="hidden h-10 items-center rounded-md bg-[color:var(--lg-accent)] px-3.5 text-sm font-bold text-[color:var(--lg-bg)] transition-transform hover:-translate-y-0.5 xl:inline-flex"
            >
              Enter war room
            </Link>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[color:var(--lg-text)] transition-colors hover:bg-white/5 xl:hidden"
              aria-controls={menuId}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((value) => !value)}
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              <HamburgerIcon open={open} />
            </button>
          </div>
        </div>
        <SportSwitcher />

        <div
          id={menuId}
          className={`xl:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        >
          <button
            type="button"
            aria-label="Close menu overlay"
            className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 ${
              open ? "opacity-100" : "opacity-0"
            }`}
            onClick={close}
          />
          <nav
            aria-label="LockedGM mobile"
            className={`absolute inset-x-0 top-full z-50 origin-top border-b border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-5 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.5)] transition-[opacity,transform] duration-200 sm:px-8 ${
              open
                ? "translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-2 opacity-0"
            }`}
          >
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  href="/lockgm/draft"
                  onClick={close}
                  className="lockgm-display block rounded-md bg-[color:var(--lg-accent)] px-3 py-3 text-center text-lg font-bold text-[color:var(--lg-bg)]"
                >
                  Enter war room
                </Link>
              </li>
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className="block rounded-md px-3 py-3 text-base font-bold text-[color:var(--lg-text)] transition-colors hover:bg-white/5"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {isAdmin ? (
                <li>
                  <Link
                    href="/lockgm/admin"
                    onClick={close}
                    className="block rounded-md px-3 py-3 text-base font-bold text-[color:var(--lg-accent)] transition-colors hover:bg-white/5"
                  >
                    GM admin
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
        </div>
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
