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
            className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-brand-deep"
          >
            Cinch
          </a>
          <nav className="flex items-center gap-6 text-sm font-medium text-muted">
            <a href="#how" className="transition-colors hover:text-brand-deep">
              How it works
            </a>
            <Link href="/admin" className="transition-colors hover:text-brand-deep">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="relative isolate min-h-[100svh] overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/hero-scene.svg"
              alt="A calm desk with an open notebook and laptop showing a clean Cinch workspace"
              fill
              priority
              className="hero-media object-cover object-[68%_center] sm:object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(238,246,242,0.94)_0%,rgba(238,246,242,0.78)_38%,rgba(238,246,242,0.18)_68%,rgba(15,61,53,0.12)_100%)]" />
            <div className="hero-glow pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
          </div>

          <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-center px-6 pb-20 pt-28 sm:px-8">
            <div className="max-w-xl">
              <p className="animate-rise font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-tight text-brand-deep sm:text-7xl">
                Cinch
              </p>
              <h1 className="animate-rise-delay mt-5 max-w-lg font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight tracking-tight text-brand-deep sm:text-4xl">
                Invite AI agents. Grow from a Seed.
              </h1>
              <p className="animate-rise-delay-2 mt-5 max-w-md text-lg leading-relaxed text-muted">
                We call it a Seed because it grows — improving functionality,
                efficiency, and customer care on the live site at{" "}
                <a
                  href={CINCH_SEED_ORIGIN}
                  className="font-semibold text-brand-deep underline-offset-2 hover:underline"
                >
                  {CINCH_SEED_DOMAIN}
                </a>
                . Agents build modulars; the Seed keeps adapting them in place.
              </p>
              <div className="animate-rise-delay-2 mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/admin"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-6 text-sm font-semibold text-foam transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-brand-deep"
                >
                  Open admin studio
                </Link>
                <a
                  href="#how"
                  className="inline-flex h-12 items-center justify-center rounded-md px-5 text-sm font-semibold text-brand-deep transition-colors hover:bg-mist/70"
                >
                  See how Seed works
                </a>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how"
          className="border-t border-brand/10 bg-foam px-6 py-24 sm:px-8"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-brand-deep sm:text-4xl">
              One Seed. Continuous growth.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted">
              Build on {CINCH_SEED_DOMAIN}, or embed the watch script on
              WordPress, Magento, Shopify, or any HTML host. The Seed watches
              critical tools — like a kitchen designer — and keeps growing the
              live site.
            </p>
          </div>

          <ol className="mx-auto mt-16 grid max-w-5xl gap-12 sm:grid-cols-3 sm:gap-8">
            {[
              {
                step: "01",
                title: "Functionality",
                copy: "Critical software stays healthy. When something breaks or a better modular is ready, the Seed adapts it onto the existing site.",
              },
              {
                step: "02",
                title: "Efficiency",
                copy: "The Seed looks for friction and waste, then pushes leaner paths from the module library.",
              },
              {
                step: "03",
                title: "Customer care",
                copy: "Help, trust, and support cues stay clear and welcoming — growth that feels friendly to customers.",
              },
            ].map((item) => (
              <li key={item.step} className="text-left sm:text-center">
                <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent">
                  {item.step}
                </p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold text-brand-deep">
                  {item.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted">
                  {item.copy}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="overflow-hidden bg-[linear-gradient(180deg,#f7fbf9_0%,#e8f3ee_100%)]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-24 sm:px-8 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-brand-deep sm:text-4xl">
                Administration you can trust
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
                See which agents are on the job, what they were assigned, and
                what landed in the module library — while the Seed stays the
                source of truth.
              </p>
              <Link
                href="/admin"
                className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-foam transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-brand-deep"
              >
                Enter administration
              </Link>
            </div>
            <div className="relative -mx-6 min-h-64 sm:-mx-8 lg:mx-0 lg:min-h-80">
              <Image
                src="/hero-scene.svg"
                alt="Cinch product workspace preview"
                fill
                className="object-cover object-left"
              />
            </div>
          </div>
        </section>

        <section
          id="start"
          className="bg-brand-deep px-6 py-24 text-foam sm:px-8"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              Cinch Seed — $99
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-mist">
              Get started at {CINCH_SEED_DOMAIN}. A Seed is a living core that
              grows your site — watching tools, adapting modulars, and improving
              functionality, efficiency, and customer care over time.
            </p>
            <Link
              href="/admin"
              className="mt-9 inline-flex h-12 items-center justify-center rounded-md bg-foam px-6 text-sm font-semibold text-brand-deep transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-mist"
            >
              Start a Seed project
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-brand/10 bg-foam px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 text-sm text-muted sm:flex-row sm:items-center">
          <p className="font-[family-name:var(--font-display)] font-bold text-brand-deep">
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
