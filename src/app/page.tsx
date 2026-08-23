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
            <a href="#build" className="transition-colors hover:text-brand-deep">
              Build
            </a>
            <a
              href="#update"
              className="transition-colors hover:text-brand-deep"
            >
              Update
            </a>
            <a
              href="#protect"
              className="transition-colors hover:text-brand-deep"
            >
              Protect
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
                Builds. Updates. Protects.
              </h1>
              <p className="animate-rise-delay-2 mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
                Seed lives outside your live server — so it can grow your site,
                keep improving it, and bring it back if it ever goes down.
              </p>
              <div className="animate-sprout mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/admin"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-7 text-sm font-bold text-brand-deep shadow-[0_10px_30px_rgba(232,165,75,0.35)] transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-accent-deep hover:text-foam"
                >
                  Plant a Seed — $99
                </Link>
                <a
                  href="#build"
                  className="inline-flex h-12 items-center justify-center rounded-md px-4 text-sm font-bold text-brand-deep transition-colors hover:text-brand"
                >
                  See how Seed works →
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="build" className="bg-foam">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <div className="order-2 lg:order-1">
              <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
                BUILDS YOUR SITE
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
                Agents assemble the site from a living Seed.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
                Invite specialists, let the project manager assign work, and
                save finished modulars into your core. Seed is the durable
                build — not a fragile one-time launch.
              </p>
              <p className="mt-4 max-w-md text-base font-semibold leading-relaxed text-brand-deep">
                You get a real site. Seed keeps the blueprint that made it.
              </p>
            </div>
            <div className="relative order-1 aspect-[4/3] overflow-hidden lg:order-2">
              <Image
                src="/cinch-tools.jpg"
                alt="Premium design tools glowing on a display — Seed building capability"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
            </div>
          </div>
        </section>

        <section id="update" className="bg-brand-deep text-foam">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="/cinch-customers.jpg"
                alt="Bright workspace with a live site on screen — continuous updates"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent">
                UPDATES YOUR SITE
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-5xl">
                Keeps improving the live experience in place.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-mist">
                Seed watches what customers feel — functionality, speed, and
                care — then pushes adapted modulars onto the site you already
                run. WordPress, Magento, Shopify, or custom HTML.
              </p>
              <p className="mt-4 max-w-md text-base font-semibold leading-relaxed text-foam">
                No rip-and-replace. The site gets better while it stays open.
              </p>
            </div>
          </div>
        </section>

        <section
          id="protect"
          className="relative isolate min-h-[75svh] overflow-hidden"
        >
          <div className="absolute inset-0">
            <Image
              src="/cinch-growth.jpg"
              alt="Seedling in warm light — protection that lives apart from the live server"
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(11,46,42,0.92)_0%,rgba(11,46,42,0.62)_42%,rgba(196,122,44,0.5)_100%)]" />
          </div>
          <div className="relative mx-auto flex min-h-[75svh] max-w-6xl flex-col justify-end px-6 py-20 sm:px-8 lg:justify-center">
            <div className="max-w-xl">
              <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent">
                PROTECTS YOUR SITE
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-foam sm:text-5xl">
                If the live site goes down, Seed is still standing.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-mist">
                Seed does not live on the same server as your public site. It
                watches from outside, holds the durable core, and can rebuild
                or restore when hosting fails — so a downed server does not
                take your future with it.
              </p>
              <p className="mt-4 text-base font-semibold leading-relaxed text-foam">
                Separate cell. Separate safety. Your Seed stays ready.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-foam px-6 py-20 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
              LIBRARY MEMBERSHIP
            </p>
            <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-4xl">
              Fund a modular once. Earn when others reuse it.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              Finished work joins the shared library under your member account.
              Later Seeds reuse it at 85% of create + merge — and you get 8% of
              that fee credited back. Members can make money with the library.
            </p>
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
              Plant it on {CINCH_SEED_DOMAIN}. One Seed that builds your site,
              updates it in place, and protects it from outside the live
              server.
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
