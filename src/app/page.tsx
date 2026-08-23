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
          <nav className="flex items-center gap-6 text-sm font-semibold text-brand-deep/70">
            <a href="#how" className="transition-colors hover:text-brand-deep">
              How it grows
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
        {/* Hero: one composition — brand + line + support + CTAs; laptop stays right */}
        <section className="relative isolate min-h-[100svh] overflow-hidden bg-brand-deep">
          <div className="absolute inset-0">
            <Image
              src="/hero-scene.svg"
              alt="Warm studio light with a sprouting seed and a Cinch workspace glowing on a laptop"
              fill
              priority
              className="hero-media object-cover object-[78%_center] sm:object-[70%_center] lg:object-center"
            />
            {/* Wide left veil so copy never sits on the laptop screen */}
            <div className="absolute inset-0 bg-[linear-gradient(100deg,#f3efe6_0%,#f3efe6_34%,rgba(243,239,230,0.82)_48%,rgba(243,239,230,0.2)_64%,rgba(11,46,42,0.35)_100%)] sm:bg-[linear-gradient(105deg,#f3efe6_0%,#f3efe6_30%,rgba(243,239,230,0.75)_44%,rgba(243,239,230,0.12)_62%,rgba(11,46,42,0.28)_100%)]" />
            <div className="grain pointer-events-none absolute inset-0" />
            <div className="hero-glow pointer-events-none absolute right-[12%] top-[18%] h-48 w-48 rounded-full bg-accent/40 blur-3xl sm:h-64 sm:w-64" />
          </div>

          <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-center px-6 pb-24 pt-28 sm:px-8">
            <div className="max-w-[22rem] sm:max-w-md lg:max-w-lg">
              <p className="animate-rise font-[family-name:var(--font-display)] text-6xl font-extrabold leading-none tracking-tight text-brand-deep sm:text-8xl">
                Cinch
              </p>
              <h1 className="animate-rise-delay mt-6 font-[family-name:var(--font-display)] text-3xl font-bold leading-[1.1] tracking-tight text-brand-deep sm:text-5xl">
                Your site that keeps growing.
              </h1>
              <p className="animate-rise-delay-2 mt-5 max-w-sm text-base leading-relaxed text-muted sm:text-lg">
                A Seed improves functionality, efficiency, and customer care on
                the live site — so tools keep working and visitors feel looked
                after.
              </p>
              <div className="animate-sprout mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/admin"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-6 text-sm font-bold text-brand-deep transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-accent-deep hover:text-foam"
                >
                  Start growing
                </Link>
                <a
                  href="#how"
                  className="inline-flex h-12 items-center justify-center rounded-md border border-brand-deep/15 bg-foam/70 px-5 text-sm font-bold text-brand-deep backdrop-blur-sm transition-colors hover:bg-foam"
                >
                  See the Seed
                </a>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how"
          className="relative overflow-hidden border-t border-brand-deep/10 bg-foam px-6 py-24 sm:px-8"
        >
          <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-leaf/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.2em] text-accent-deep">
              WHY SEED
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
              It grows with your customers.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Embed once on WordPress, Magento, Shopify, or any site. The Seed
              watches critical tools — like a kitchen designer — and keeps
              adapting better experiences in place.
            </p>
          </div>

          <ol className="relative mx-auto mt-16 grid max-w-5xl gap-10 sm:grid-cols-3 sm:gap-8">
            {[
              {
                step: "01",
                title: "Functionality",
                copy: "Keep the software customers rely on healthy — and ship new capability when a modular is ready.",
              },
              {
                step: "02",
                title: "Efficiency",
                copy: "Find friction, cut waste, and push leaner paths from the shared module library.",
              },
              {
                step: "03",
                title: "Customer care",
                copy: "Clarify help and trust cues so people feel guided, not stuck.",
              },
            ].map((item) => (
              <li key={item.step} className="text-left">
                <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
                  {item.step}
                </p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
                  {item.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted">
                  {item.copy}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="relative overflow-hidden bg-[linear-gradient(165deg,#0b2e2a_0%,#1a7a6d_48%,#c47a2c_140%)] px-6 py-24 text-foam sm:px-8">
          <div className="grain pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-soft-light" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
                Watch it grow from Admin.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-mist">
                See agents at work, modulars landing in the library, and live
                growth signals from the sites you already run.
              </p>
              <Link
                href="/admin"
                className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-bold text-brand-deep transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-foam"
              >
                Open administration
              </Link>
            </div>
            <div className="relative mx-auto w-full max-w-lg">
              <Image
                src="/hosting-flow.svg"
                alt="Diagram of a customer site pointing at Cinch Seed hosting"
                width={640}
                height={360}
                className="h-auto w-full opacity-95"
              />
            </div>
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
              Start at {CINCH_SEED_DOMAIN}. Plant a Seed once — it keeps growing
              the live site for you.
            </p>
            <Link
              href="/admin"
              className="mt-9 inline-flex h-12 items-center justify-center rounded-md bg-brand-deep px-7 text-sm font-bold text-foam transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-brand"
            >
              Plant your Seed
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
