import Image from "next/image";
import Link from "next/link";
import { CINCH_SEED_DOMAIN, CINCH_SEED_ORIGIN } from "@/lib/domain";

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
          <nav className="flex items-center gap-5 text-sm font-semibold text-brand-deep/75">
            <a href="#why" className="transition-colors hover:text-brand-deep">
              Why Seed
            </a>
            <Link
              href="/admin"
              className="rounded-md bg-brand-deep px-3 py-1.5 text-foam transition-colors hover:bg-brand"
            >
              Start
            </Link>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* One composition: brand + line + support + CTA + full-bleed photo */}
        <section className="relative isolate min-h-[100svh] overflow-hidden bg-brand-deep">
          <div className="absolute inset-0">
            <Image
              src="/cinch-hero-bold.jpg"
              alt="Cinematic desk with a glowing Cinch workspace and a living sprout"
              fill
              priority
              sizes="100vw"
              className="hero-media object-cover object-[80%_center] sm:object-[70%_center] lg:object-[60%_center]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(255,250,242,0.94)_0%,rgba(255,250,242,0.82)_28%,rgba(255,250,242,0.35)_48%,rgba(11,46,42,0.25)_100%)]" />
            <div className="grain pointer-events-none absolute inset-0" />
            <div className="hero-glow pointer-events-none absolute right-[20%] top-[30%] h-56 w-56 rounded-full bg-accent/35 blur-3xl" />
          </div>

          <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-center px-6 pb-24 pt-28 sm:px-8">
            <div className="max-w-[20rem] sm:max-w-md lg:max-w-xl">
              <p className="animate-rise font-[family-name:var(--font-display)] text-6xl font-extrabold leading-none tracking-tight text-brand-deep sm:text-8xl md:text-9xl">
                Cinch
              </p>
              <h1 className="animate-rise-delay mt-5 font-[family-name:var(--font-display)] text-[2rem] font-bold leading-[1.05] tracking-tight text-brand-deep sm:text-5xl lg:text-6xl">
                A site people want to buy from.
              </h1>
              <p className="animate-rise-delay-2 mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
                Seed keeps your live site exciting, working, and ahead —
                because if we can&apos;t make this look worth buying, we
                shouldn&apos;t touch yours.
              </p>
              <div className="animate-sprout mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/admin"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-7 text-sm font-bold text-brand-deep shadow-[0_10px_30px_rgba(232,165,75,0.35)] transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-accent-deep hover:text-foam"
                >
                  Plant a Seed — $99
                </Link>
                <a
                  href="#why"
                  className="inline-flex h-12 items-center justify-center rounded-md px-4 text-sm font-bold text-brand-deep transition-colors hover:text-brand"
                >
                  See why it sells →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Broken-up story panels — not a textbook grid */}
        <section id="why" className="bg-foam">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <div className="order-2 lg:order-1">
              <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
                STAYS UP
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
                The tools that make money keep working.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
                Kitchen designers. Configurators. Checkout. Seed watches the
                software your customers depend on — and pushes fixes onto the
                live site before a quiet failure costs you a sale.
              </p>
              <p className="mt-4 max-w-md text-base font-semibold leading-relaxed text-brand-deep">
                You buy peace of mind. Your customers buy with confidence.
              </p>
            </div>
            <div className="relative order-1 aspect-[4/3] overflow-hidden lg:order-2">
              <Image
                src="/cinch-tools.jpg"
                alt="Premium kitchen design tool glowing on a display in a warm showroom"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
            </div>
          </div>
        </section>

        <section className="bg-brand-deep text-foam">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="/cinch-customers.jpg"
                alt="Bright modern workspace with a large screen and warm sun — visits that feel easy"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent">
                FEELS GOOD
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-5xl">
                Faster paths. Friendlier care. More return visits.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-mist">
                Seed doesn&apos;t just patch bugs. It tightens friction and
                clarifies help so people feel looked after — the difference
                between a browse and a buy.
              </p>
              <p className="mt-4 max-w-md text-base font-semibold leading-relaxed text-foam">
                Advantage: one living system. Benefit: customers who come back.
              </p>
            </div>
          </div>
        </section>

        <section className="relative isolate min-h-[70svh] overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/cinch-growth.jpg"
              alt="Seedling in warm light — compounding growth"
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(11,46,42,0.9)_0%,rgba(11,46,42,0.55)_40%,rgba(196,122,44,0.45)_100%)]" />
          </div>
          <div className="relative mx-auto flex min-h-[70svh] max-w-6xl flex-col justify-end px-6 py-20 sm:px-8 lg:justify-center">
            <div className="max-w-xl">
              <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent">
                KEEPS GROWING
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-foam sm:text-5xl">
                Every modular makes the next win cheaper.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-mist">
                First builds fund the library. Later adaptations reuse what
                already works. That is the future advantage — you get ahead
                now, and stay cheaper to improve than anyone starting over.
              </p>
            </div>
          </div>
        </section>

        <section
          id="start"
          className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_#fff6e8_0%,_#f3efe6_55%,_#e7ddd0_100%)] px-6 py-28 sm:px-8"
        >
          <div className="pointer-events-none absolute -right-10 top-10 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-brand/15 blur-3xl" />
          <div className="relative mx-auto max-w-3xl text-center">
            <p className="font-[family-name:var(--font-display)] text-6xl font-extrabold tracking-tight text-brand-deep sm:text-8xl">
              Cinch
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
              Seed — $99
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-muted">
              Plant it on {CINCH_SEED_DOMAIN}. Prove the look, the feel, and
              the buy — then grow the same standard onto every site you run.
            </p>
            <Link
              href="/admin"
              className="mt-10 inline-flex h-14 items-center justify-center rounded-md bg-brand-deep px-8 text-base font-bold text-foam transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-brand"
            >
              Start growing today
            </Link>
            <p className="mt-5 text-sm text-muted">
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
