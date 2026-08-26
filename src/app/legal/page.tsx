import Link from "next/link";
import { CINCH_SEED_DOMAIN, CINCH_SEED_ORIGIN } from "@/lib/domain";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Legal — Cinch Seed",
  description:
    "Privacy and terms for Cinch Seed — written for small businesses using Seed to build, update, and protect their sites.",
};

export default function LegalPage() {
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
            <Link href="/about" className="transition-colors hover:text-brand-deep">
              About us
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 sm:px-8 sm:py-24">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          LEGAL
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          Privacy &amp; terms
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          Cinch Seed ({CINCH_SEED_DOMAIN}) is built for small businesses. This
          page explains how we handle information and the basics of using the
          service. It is not a substitute for advice from your own counsel.
        </p>
        <p className="mt-3 text-sm text-muted">
          Last updated: August 23, 2026
        </p>

        <section className="mt-14 space-y-4 border-t border-brand-deep/10 pt-12">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
            Privacy
          </h2>
          <p className="text-base leading-relaxed text-muted">
            We collect what we need to run Seed: account details you provide,
            project briefs, site settings you save in Admin, and technical
            signals from the watch script (such as health checks) when you
            install it on a live site.
          </p>
          <p className="text-base leading-relaxed text-muted">
            We use that information to build, update, and protect your sites;
            to operate the modular library and member credits; and to keep the
            platform secure. We do not sell your customer lists or project
            contents as a product.
          </p>
          <p className="text-base leading-relaxed text-muted">
            API keys you add stay in your hosting environment (for example
            Vercel environment variables). We ask you to keep those keys
            private and rotate them if they are exposed.
          </p>
          <p className="text-base leading-relaxed text-muted">
            Questions about privacy: contact us through{" "}
            <a
              href={CINCH_SEED_ORIGIN}
              className="font-semibold text-brand underline-offset-2 hover:underline"
            >
              {CINCH_SEED_DOMAIN}
            </a>
            .
          </p>
        </section>

        <section className="mt-14 space-y-4 border-t border-brand-deep/10 pt-12">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
            Terms of use
          </h2>
          <p className="text-base leading-relaxed text-muted">
            By using Cinch Seed you agree to use the service lawfully, keep
            credentials secure, and only connect Seed to sites and data you
            have the right to manage.
          </p>
          <p className="text-base leading-relaxed text-muted">
            Seed helps build, update, and protect sites, including from a
            separate cell outside your live host. You remain responsible for
            your business content, compliance in your industry, and final
            decisions about what goes live.
          </p>
          <p className="text-base leading-relaxed text-muted">
            Library membership may credit creators when modulars are reused.
            Credits and fees are described in Admin and may change as the
            network grows. Paid plans (including Seed at the stated price) are
            billed according to the checkout or invoice path you complete.
          </p>
          <p className="text-base leading-relaxed text-muted">
            The service is provided as available. We work hard for small
            businesses, but we cannot guarantee uninterrupted hosting,
            third-party APIs, or outcomes from AI agents. To the fullest extent
            allowed by law, Cinch is not liable for indirect or consequential
            losses from use of the platform.
          </p>
          <p className="text-base leading-relaxed text-muted">
            If a term cannot be enforced, the rest still apply. These terms are
            governed by the laws applicable to where Cinch operates its primary
            business, unless your local consumer law requires otherwise.
          </p>
        </section>

        <p className="mt-14 text-base leading-relaxed text-muted">
          Read more about who we are on{" "}
          <Link
            href="/about"
            className="font-semibold text-brand underline-offset-2 hover:underline"
          >
            About us
          </Link>
          .
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
