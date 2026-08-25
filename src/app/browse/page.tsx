import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { getBrowseSnapshot } from "@/app/portal/actions";
import { SiteDropZone } from "./site-drop-zone";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Browse & buy — Cinch Seed",
  description:
    "Drop an existing website into Cinch Seed, get a critique with time and build-cost estimates, then purchase an improved Seed.",
};

export default async function BrowsePage() {
  const { sites, customer } = await getBrowseSnapshot();

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
            <Link href="/login" className="transition-colors hover:text-brand-deep">
              Log in
            </Link>
            {customer ? (
              <Link
                href="/portal"
                className="rounded-md bg-brand-deep px-3 py-1.5 text-foam transition-colors hover:bg-brand"
              >
                My Seeds
              </Link>
            ) : (
              <Link
                href="/admin"
                className="rounded-md bg-brand-deep px-3 py-1.5 text-foam transition-colors hover:bg-brand"
              >
                Start
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_#fff6e8_0%,_transparent_70%)]" />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-14 sm:px-8 sm:py-20">
          <p className="animate-rise font-[family-name:var(--font-display)] text-6xl font-extrabold tracking-tight text-brand-deep sm:text-7xl">
            Cinch
          </p>
          <h1 className="animate-rise-delay mt-4 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
            Drop a site. Get a critique. Buy the improved Seed.
          </h1>
          <p className="animate-rise-delay-2 mt-5 max-w-xl text-lg leading-relaxed text-muted">
            We review the live page, show time and build cost up front, then
            plant a Seed that improves on what you dropped — with portal status
            and live source while agents work.
          </p>

          <div className="mt-12">
            <SiteDropZone
              sites={sites}
              defaultEmail={customer?.email}
              defaultName={customer?.name}
            />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
