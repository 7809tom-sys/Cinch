import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { JUST_PUTZIT_NOT_ON_SEED } from "@/lib/seed-connect";

export function JustPutzItNotOnSeedPage({
  title,
}: {
  title: string;
}) {
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
            <Link href="/senti" className="hover:text-brand-deep">
              Senti
            </Link>
            <Link href="/dialog" className="hover:text-brand-deep">
              Dialog
            </Link>
            <Link href="/lockgm" className="hover:text-brand-deep">
              LockedGM
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-brand-deep px-3.5 py-1.5 text-foam"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14 sm:px-8 sm:py-20">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          NOT A SEED
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {JUST_PUTZIT_NOT_ON_SEED}
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-brand-deep">
          Suggestions, Improve, and dialog on this desk used to queue pretend
          dating-site work. That burns AI money and does not change the live
          host. Open LockedGM or a Seed Cinch can actually build.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/lockgm"
            className="inline-flex h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam"
          >
            LockedGM
          </Link>
          <Link
            href="/admin"
            className="inline-flex h-11 items-center rounded-md border border-brand/20 px-4 text-sm font-semibold text-brand-deep"
          >
            Seed admin
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
