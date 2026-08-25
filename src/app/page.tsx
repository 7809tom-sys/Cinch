import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { AGENT_CATALOG } from "@/lib/agents";
import { CINCH_SEED_DOMAIN, CINCH_SEED_ORIGIN } from "@/lib/domain";

const AGENT_TEAM = AGENT_CATALOG.map((agent) => ({
  name: agent.name,
  role: agent.role,
  excels: agent.specialty,
}));

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
            <a href="#team" className="transition-colors hover:text-brand-deep">
              All-stars
            </a>
            <Link href="/browse" className="transition-colors hover:text-brand-deep">
              Browse
            </Link>
            <Link href="/about" className="transition-colors hover:text-brand-deep">
              About
            </Link>
            <Link href="/login" className="transition-colors hover:text-brand-deep">
              Log in
            </Link>
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
        {/* Split hero: solid copy column — never over the laptop screen */}
        <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#fffaf2]">
          <div className="absolute inset-y-0 right-0 w-full lg:w-[58%]">
            <Image
              src="/cinch-hero-bold.jpg"
              alt="Cinematic desk with a glowing Cinch workspace and a living sprout"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="hero-media object-cover object-[72%_center] sm:object-[65%_center]"
            />
            {/* Mobile/tablet: opaque left slab so type never shades into the screen */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#fffaf2_0%,#fffaf2_42%,rgba(255,250,242,0.92)_52%,rgba(255,250,242,0.15)_68%,transparent_82%)] lg:hidden" />
            {/* Desktop: soft edge only where the solid column meets the photo */}
            <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-[#fffaf2] to-transparent lg:block" />
            <div className="grain pointer-events-none absolute inset-0 opacity-[0.04]" />
          </div>

          <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl items-center px-6 pb-24 pt-28 sm:px-8">
            <div className="w-full max-w-[22rem] rounded-none bg-[#fffaf2]/95] py-2 sm:max-w-md lg:max-w-[28rem] lg:bg-[#fffaf2] lg:pr-8">
              <p className="animate-rise font-[family-name:var(--font-display)] text-6xl font-extrabold leading-none tracking-tight text-brand-deep sm:text-8xl">
                Cinch
              </p>
              <h1 className="animate-rise-delay mt-5 font-[family-name:var(--font-display)] text-[2rem] font-bold leading-[1.05] tracking-tight text-brand-deep sm:text-5xl">
                Builds. Updates. Protects.
              </h1>
              <p className="animate-rise-delay-2 mt-5 text-base leading-relaxed text-muted sm:text-lg">
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
                  href="#team"
                  className="inline-flex h-12 items-center justify-center rounded-md px-4 text-sm font-bold text-brand-deep transition-colors hover:text-brand"
                >
                  Meet the all-stars →
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="team" className="bg-foam px-6 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
              YOUR ALL-STAR GROUP OF AI AGENTS
            </p>
            <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
              Meet your all-star group of AI agents — and what each one excels
              at.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              With your API keys in place, Seed puts this all-star group on the
              job. Each agent owns a lane so the site gets built, updated, and
              protected without you juggling every task.
            </p>

            <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {AGENT_TEAM.map((agent) => (
                <li key={agent.name} className="border-t border-brand-deep/15 pt-5">
                  <p className="font-[family-name:var(--font-display)] text-xl font-extrabold text-brand-deep">
                    {agent.name}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-accent-deep">
                    {agent.role}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-muted">
                    Excels at {agent.excels.charAt(0).toLowerCase()}
                    {agent.excels.slice(1)}.
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="build" className="bg-background">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <div className="order-2 lg:order-1">
              <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
                BUILDS YOUR SITE
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
                Your all-star group of AI agents assembles the site from a
                living Seed.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
                Conductor assigns the work. Design, code, copy, SEO, and QA each
                take their lane. Finished modulars land in your core — a durable
                build, not a one-time launch.
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
            </div>
          </div>
        </section>

        <section
          id="protect"
          className="relative isolate min-h-[70svh] overflow-hidden"
        >
          <div className="absolute inset-0">
            <Image
              src="/cinch-growth.jpg"
              alt="Seedling in warm light — protection apart from the live server"
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(11,46,42,0.92)_0%,rgba(11,46,42,0.62)_42%,rgba(196,122,44,0.5)_100%)]" />
          </div>
          <div className="relative mx-auto flex min-h-[70svh] max-w-6xl flex-col justify-end px-6 py-20 sm:px-8 lg:justify-center">
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
                or restore when hosting fails — so a downed server does not take
                your future with it.
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
              When later Seeds reuse it, you earn credit back — so your library
              account can make money as the network grows.
            </p>
          </div>
        </section>

        <section
          id="browse"
          className="relative overflow-hidden bg-brand-deep px-6 py-24 text-foam sm:px-8"
        >
          <div className="pointer-events-none absolute -left-10 top-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative mx-auto max-w-6xl">
            <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent">
              DROP A SITE · CUSTOMER PORTAL
            </p>
            <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-5xl">
              Drop a website you like. Log in to watch it become your Seed.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-mist">
              Paste or drag an existing site into the drop zone, preview it, and
              purchase. Your portal shows what agents are working on — and a
              live source page streams the code as it is written.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/browse"
                className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-6 text-sm font-bold text-brand-deep transition-transform hover:-translate-y-0.5"
              >
                Open the drop zone
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-md border border-foam/30 px-6 text-sm font-bold text-foam transition-colors hover:bg-foam/10"
              >
                Customer login
              </Link>
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
              Plant it on {CINCH_SEED_DOMAIN}. Your all-star group of AI agents
              builds the site, updates it live, and protects it from outside the
              live server.
            </p>
            <Link
              href="/admin"
              className="mt-10 inline-flex h-14 items-center justify-center rounded-md bg-brand-deep px-8 text-base font-bold text-foam transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-brand"
            >
              Meet the all-stars and start
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

      <SiteFooter />
    </div>
  );
}
