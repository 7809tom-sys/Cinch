import Link from "next/link";
import { CINCH_SEED_DOMAIN } from "@/lib/domain";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "About us — Cinch Seed",
  description:
    "Cinch Seed is on the side of small businesses — helping owners build, update, and protect their sites without getting overrun by high-priced agencies.",
};

export default function AboutPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand-deep/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight text-brand-deep"
          >
            Cinch
          </Link>
          <nav className="flex items-center gap-5 text-sm font-semibold text-brand-deep/75">
            <Link href="/browse" className="transition-colors hover:text-brand-deep">
              Browse
            </Link>
            <Link href="/legal" className="transition-colors hover:text-brand-deep">
              Legal
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 sm:px-8 sm:py-24">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          ABOUT US
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          On your side. Built for small business.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          Cinch Seed exists for the owners who get squeezed — the shops,
          studios, and local brands trying to grow online while higher-priced
          companies sell packages that eat the margin before the site ever
          pays for itself.
        </p>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          We look for <span className="font-semibold text-brand-deep">your</span>{" "}
          benefit first. In a taxing economy — rising ads, rising tools, rising
          “must-have” agency fees — we stay on your side of the ledger. Seed
          is meant to build your site, keep updating it, and protect it from
          outside the live server, without locking you into a luxury-priced
          rebuild cycle.
        </p>

        <div className="mt-12 space-y-8 border-t border-brand-deep/10 pt-12">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
              Dedicated to the underdog online
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              Big firms can outspend you. They should not out-survive you.
              Seed gives small businesses an all-star group of AI agents, a
              living core, and off-server protection — so you can compete
              without becoming someone else&apos;s billable hours forever.
            </p>
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
              Your benefit, not our bill pad
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              We design Seed so finished work can join a shared library and
              earn when others reuse it. Growth should compound for the people
              who create value — not only for the companies that charge the
              most to touch a homepage.
            </p>
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
              Always on your side of the economy
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              Taxes, fees, platforms, and agencies all take a cut. Cinch is
              here to tilt the next cut back toward you — clearer tools, a
              fairer path to improve, and a Seed that stays ready when the
              live host fails.
            </p>
          </div>
        </div>

        <p className="mt-12 text-base leading-relaxed text-muted">
          Learn more at{" "}
          <Link href="/" className="font-semibold text-brand underline-offset-2 hover:underline">
            {CINCH_SEED_DOMAIN}
          </Link>
          , or read our{" "}
          <Link href="/legal" className="font-semibold text-brand underline-offset-2 hover:underline">
            Legal
          </Link>{" "}
          page for how we handle your information and the terms of use.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
