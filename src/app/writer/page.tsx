import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { getBrowseSnapshot } from "@/app/portal/actions";
import { WriterPlantForm } from "./writer-plant-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Writer Seed — Cinch",
  description:
    "Plant a Writer Seed. Quill, Atlas, Lumen, and Sentry collaborate to write a book or a song together.",
};

export default async function WriterPage() {
  const { customer } = await getBrowseSnapshot();

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
            {customer ? (
              <Link
                href="/portal"
                className="rounded-md bg-brand-deep px-3 py-1.5 text-foam transition-colors hover:bg-brand"
              >
                My Seeds
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-brand-deep px-3 py-1.5 text-foam transition-colors hover:bg-brand"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#fff6e8_0%,_transparent_55%),linear-gradient(180deg,#f7f1e8_0%,#efe6d8_100%)]" />
        <div className="pointer-events-none absolute -right-16 top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-10 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-6xl px-6 py-14 sm:px-8 sm:py-20">
          <p className="animate-rise font-[family-name:var(--font-display)] text-6xl font-extrabold tracking-tight text-brand-deep sm:text-7xl">
            Cinch
          </p>
          <h1 className="animate-rise-delay mt-4 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
            Writer Seed — AI that writes together.
          </h1>
          <p className="animate-rise-delay-2 mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Plant a Seed for a book or a song. Quill, Atlas, Lumen, and Sentry
            share one notebook — premise, structure, draft, polish, sign-off —
            so the work is better than any single model alone.
          </p>

          <div className="animate-sprout mt-12 rounded-md border border-brand-deep/10 bg-foam/80 p-6 backdrop-blur-sm sm:p-8">
            <WriterPlantForm
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
