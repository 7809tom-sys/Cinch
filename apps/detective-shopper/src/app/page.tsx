import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-8">
          <a
            href="#top"
            className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foam"
          >
            Detective Shopper
          </a>
          <nav className="flex items-center gap-6 text-sm font-medium text-mist">
            <a href="#method" className="transition-colors hover:text-foam">
              Method
            </a>
            <a
              href="#start"
              className="hidden transition-colors hover:text-foam sm:inline"
            >
              Start investigating
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="relative isolate min-h-[100svh] overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/hero-scene.svg"
              alt="A magnifying glass inspecting a shopping bag against a dusk city skyline"
              fill
              priority
              className="hero-media object-cover object-[70%_center] sm:object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(18,28,39,0.94)_0%,rgba(18,28,39,0.78)_42%,rgba(18,28,39,0.28)_72%,rgba(18,28,39,0.55)_100%)]" />
            <div className="hero-glow pointer-events-none absolute right-10 top-24 h-56 w-56 rounded-full bg-brand/30 blur-3xl" />
          </div>

          <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-center px-6 pb-20 pt-28 sm:px-8">
            <div className="max-w-xl">
              <p className="animate-rise font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-foam sm:text-6xl">
                Detective Shopper
              </p>
              <h1 className="animate-rise-delay mt-5 max-w-lg font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight tracking-tight text-foam sm:text-4xl">
                Investigate before you buy.
              </h1>
              <p className="animate-rise-delay-2 mt-5 max-w-md text-lg leading-relaxed text-mist">
                Paste a listing, snap a product, and get a clear read on price,
                provenance, and red flags — before checkout.
              </p>
              <div className="animate-rise-delay-2 mt-9 flex flex-wrap items-center gap-3">
                <a
                  href="#start"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-6 text-sm font-semibold text-background transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-brand-deep"
                >
                  Start a case
                </a>
                <a
                  href="#method"
                  className="inline-flex h-12 items-center justify-center rounded-md px-5 text-sm font-semibold text-foam transition-colors hover:bg-panel/70"
                >
                  See the method
                </a>
              </div>
            </div>
          </div>
        </section>

        <section
          id="method"
          className="border-t border-white/10 bg-panel px-6 py-24 sm:px-8"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-4xl">
              Three checks. One verdict.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-mist">
              Detective Shopper turns a messy product trail into a simple go /
              wait / walk-away call.
            </p>
          </div>

          <ol className="mx-auto mt-16 grid max-w-5xl gap-12 sm:grid-cols-3 sm:gap-8">
            {[
              {
                step: "01",
                title: "Collect",
                copy: "Drop a URL, photo, or screenshot. We pull the signals that matter.",
              },
              {
                step: "02",
                title: "Cross-check",
                copy: "Price history, seller patterns, and lookalike listings get lined up side by side.",
              },
              {
                step: "03",
                title: "Decide",
                copy: "Get a plain-language brief with risks highlighted and better options nearby.",
              },
            ].map((item) => (
              <li key={item.step} className="text-left sm:text-center">
                <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-brand">
                  {item.step}
                </p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold text-foam">
                  {item.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-mist">
                  {item.copy}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="overflow-hidden bg-[linear-gradient(180deg,#1a2a3a_0%,#121c27_100%)]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-24 sm:px-8 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-4xl">
                Shopping with receipts
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-mist">
                No vague trust badges. Just the evidence trail — what checked
                out, what looked off, and what to do next.
              </p>
            </div>
            <div className="relative -mx-6 min-h-64 sm:-mx-8 lg:mx-0 lg:min-h-80">
              <Image
                src="/hero-scene.svg"
                alt="Detective Shopper investigation preview"
                fill
                className="object-cover object-right"
              />
            </div>
          </div>
        </section>

        <section id="start" className="bg-brand px-6 py-24 text-background sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              Open your next case
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-background/80">
              Point Vercel at <code className="font-semibold">apps/detective-shopper</code> and
              this site deploys on its own domain.
            </p>
            <a
              href="https://vercel.com/new"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-9 inline-flex h-12 items-center justify-center rounded-md bg-background px-6 text-sm font-semibold text-foam transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-panel"
            >
              Deploy Detective Shopper
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-background px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 text-sm text-mist sm:flex-row sm:items-center">
          <p className="font-[family-name:var(--font-display)] font-semibold text-foam">
            Detective Shopper
          </p>
          <div className="flex items-center gap-4">
            <p>Investigate before you buy.</p>
            <a href="/admin" className="transition-colors hover:text-foam">
              Admin
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
