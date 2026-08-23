import Image from "next/image";
import Link from "next/link";
import { CINCH_SEED_DOMAIN, CINCH_SEED_ORIGIN } from "@/lib/domain";

const FAB_ROWS = [
  {
    feature: "Live Seed watch on your existing site",
    advantage:
      "Works with WordPress, Magento, Shopify, or any HTML host — no rip-and-replace.",
    benefit:
      "You keep the traffic and tools you already earned, while the site keeps getting better.",
  },
  {
    feature: "Critical-tool health probes",
    advantage:
      "Spots failures in software customers rely on — like a kitchen designer — before they become lost sales.",
    benefit:
      "Peace of mind: the tools that make you money stay up, and fixes land on the live site.",
  },
  {
    feature: "Modular library that adapts in place",
    advantage:
      "New capability is pushed onto the live site; later Seeds reuse proven modulars at lower cost.",
    benefit:
      "Every improvement compounds — you get ahead now, and stay cheaper and faster to improve later.",
  },
  {
    feature: "Growth across three axes",
    advantage:
      "Functionality, efficiency, and customer care improve together — not as separate projects.",
    benefit:
      "Customers feel a site that works, moves quickly, and treats them well — so they come back.",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-8">
          <a
            href="#top"
            className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight text-brand-deep"
          >
            Cinch
          </a>
          <nav className="flex items-center gap-6 text-sm font-semibold text-brand-deep/70">
            <a href="#fab" className="transition-colors hover:text-brand-deep">
              Feature · Advantage · Benefit
            </a>
            <Link
              href="/admin"
              className="transition-colors hover:text-brand-deep"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* Hero stays benefit-led; detail lives in FAB below */}
        <section className="relative isolate min-h-[100svh] overflow-hidden bg-brand-deep">
          <div className="absolute inset-0">
            <Image
              src="/cinch-hero.jpg"
              alt="Sunlit desk with a sprouting seed and a Cinch growth dashboard on a laptop"
              fill
              priority
              sizes="100vw"
              className="hero-media object-cover object-[72%_center] sm:object-[65%_center] lg:object-center"
            />
            {/* Soft left veil keeps copy readable without covering the photo */}
            <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(243,239,230,0.92)_0%,rgba(243,239,230,0.78)_32%,rgba(243,239,230,0.28)_52%,rgba(11,46,42,0.2)_100%)] sm:bg-[linear-gradient(105deg,rgba(243,239,230,0.9)_0%,rgba(243,239,230,0.72)_28%,rgba(243,239,230,0.18)_50%,rgba(11,46,42,0.18)_100%)]" />
            <div className="grain pointer-events-none absolute inset-0" />
            <div className="hero-glow pointer-events-none absolute right-[18%] top-[22%] h-48 w-48 rounded-full bg-accent/30 blur-3xl sm:h-64 sm:w-64" />
          </div>

          <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-center px-6 pb-24 pt-28 sm:px-8">
            <div className="max-w-[22rem] sm:max-w-md lg:max-w-lg">
              <p className="animate-rise font-[family-name:var(--font-display)] text-6xl font-extrabold leading-none tracking-tight text-brand-deep sm:text-8xl">
                Cinch
              </p>
              <h1 className="animate-rise-delay mt-6 font-[family-name:var(--font-display)] text-3xl font-bold leading-[1.1] tracking-tight text-brand-deep sm:text-5xl">
                Buy the benefit. Keep the advantage.
              </h1>
              <p className="animate-rise-delay-2 mt-5 max-w-sm text-base leading-relaxed text-muted sm:text-lg">
                Feature → Advantage → Benefit. See exactly what Seed is, why it
                wins, and what you gain on the live site.
              </p>
              <div className="animate-sprout mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/admin"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-6 text-sm font-bold text-brand-deep transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-accent-deep hover:text-foam"
                >
                  Get the benefits
                </Link>
                <a
                  href="#fab"
                  className="inline-flex h-12 items-center justify-center rounded-md border border-brand-deep/15 bg-foam/70 px-5 text-sm font-bold text-brand-deep backdrop-blur-sm transition-colors hover:bg-foam"
                >
                  See FAB
                </a>
              </div>
            </div>
          </div>
        </section>

        <section
          id="fab"
          className="relative overflow-hidden border-t border-brand-deep/10 bg-foam px-6 py-24 sm:px-8"
        >
          <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-leaf/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.2em] text-accent-deep">
              FEATURE · ADVANTAGE · BENEFIT
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
              What it is. Why it wins. What you get.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
              People buy benefits. Advantages make those benefits believable.
              Features are how Seed delivers them.
            </p>
          </div>

          {/* Legend */}
          <div className="relative mx-auto mt-12 flex max-w-5xl flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-semibold">
            <p>
              <span className="text-accent-deep">Feature</span>
              <span className="text-muted"> — what Seed has</span>
            </p>
            <p>
              <span className="text-brand">Advantage</span>
              <span className="text-muted"> — why that matters vs. rebuilds</span>
            </p>
            <p>
              <span className="text-brand-deep">Benefit</span>
              <span className="text-muted"> — what you personally gain</span>
            </p>
          </div>

          <ol className="relative mx-auto mt-14 max-w-5xl space-y-10">
            {FAB_ROWS.map((row, index) => (
              <li
                key={row.feature}
                className="border-t border-brand-deep/10 pt-10 first:border-t-0 first:pt-0"
              >
                <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <div className="mt-4 grid gap-6 md:grid-cols-3 md:gap-8">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-deep">
                      Feature
                    </p>
                    <p className="mt-2 font-[family-name:var(--font-display)] text-lg font-bold leading-snug text-brand-deep">
                      {row.feature}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                      Advantage
                    </p>
                    <p className="mt-2 text-base leading-relaxed text-muted">
                      {row.advantage}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">
                      Benefit
                    </p>
                    <p className="mt-2 text-base font-semibold leading-relaxed text-brand-deep">
                      {row.benefit}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="future"
          className="relative isolate overflow-hidden px-6 py-28 text-foam sm:px-8"
        >
          <div className="absolute inset-0">
            <Image
              src="/cinch-growth.jpg"
              alt="A young seedling in warm light — growth and future advantage"
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(11,46,42,0.88)_0%,rgba(26,122,109,0.72)_45%,rgba(196,122,44,0.55)_100%)]" />
            <div className="grain pointer-events-none absolute inset-0 opacity-[0.1] mix-blend-soft-light" />
          </div>

          <div className="relative mx-auto max-w-3xl text-center">
            <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.2em] text-accent">
              FUTURE EDGE
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-5xl">
              Advantages that stack over time.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-mist">
              Feature: a shared modular library. Advantage: reuse costs less
              than first build. Benefit: you stay cheaper and faster to improve
              than competitors who start over.
            </p>
            <Link
              href="/admin"
              className="mt-10 inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-bold text-brand-deep transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-foam"
            >
              Open administration
            </Link>
          </div>
        </section>

        <section
          id="start"
          className="bg-[linear-gradient(180deg,#fffaf2_0%,#f3efe6_100%)] px-6 py-24 sm:px-8"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
              Cinch Seed — $99
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Start at {CINCH_SEED_DOMAIN}. Buy the benefit today — healthier
              tools, smoother visits, friendlier care — and keep the advantage
              as the Seed grows.
            </p>
            <Link
              href="/admin"
              className="mt-9 inline-flex h-12 items-center justify-center rounded-md bg-brand-deep px-7 text-sm font-bold text-foam transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-brand"
            >
              Claim your benefits
            </Link>
            <p className="mt-4 text-sm text-muted">
              <a
                href={CINCH_SEED_ORIGIN}
                className="font-semibold text-brand underline-offset-2 hover:underline"
              >
                {CINCH_SEED_DOMAIN}
              </a>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-deep/10 bg-foam px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 text-sm text-muted sm:flex-row sm:items-center">
          <p className="font-[family-name:var(--font-display)] font-extrabold text-brand-deep">
            Cinch
          </p>
          <div className="flex flex-wrap gap-4">
            <a href={CINCH_SEED_ORIGIN} className="hover:text-brand-deep">
              {CINCH_SEED_DOMAIN}
            </a>
            <Link href="/admin" className="hover:text-brand-deep">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
