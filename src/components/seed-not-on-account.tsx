import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

/**
 * Signed-in visitor opened a Seed desk that this account cannot see.
 * Next's generic 404 ("This page could not be found") hides the way back
 * to My Seeds and the Writer plant form.
 */
export function SeedNotOnAccount() {
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
          <Link
            href="/portal"
            className="text-sm font-semibold text-brand-deep/75 transition-colors hover:text-brand-deep"
          >
            My Seeds
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-6 py-16 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          SEED DESK
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-4xl">
          This Seed is not on this sign-in
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          The desk opens for the account that planted it. If you just planted
          a book, it is under My Seeds. To write from the Google Doc, start
          on Writer Seed.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/portal"
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand-deep px-5 text-sm font-bold text-foam transition-colors hover:bg-brand"
          >
            My Seeds
          </Link>
          <Link
            href="/writer"
            className="inline-flex h-11 items-center justify-center rounded-md border border-brand/20 bg-foam px-5 text-sm font-semibold text-brand-deep transition-colors hover:border-brand/40"
          >
            Plant a Writer Seed
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
