import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SeedSuggestionsBoard } from "@/components/seed-suggestions-board";
import {
  JUST_PUTZIT_CONNECT_SEED_ID,
  JUST_PUTZIT_LIVE,
} from "@/lib/seed-connect";
import {
  requestedSuggestionTitles,
  suggestionsForJustPutzIt,
} from "@/lib/seed-suggestions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suggestions — Just Putz It — Cinch Seed",
  description:
    "Please-do suggestions for justputzit.com. Cinch queues in-place dating and activity updates. No rebuild. No publish until you approve.",
};

export default async function SuggestionsPage() {
  const plan = suggestionsForJustPutzIt();
  const requested = await requestedSuggestionTitles(JUST_PUTZIT_CONNECT_SEED_ID);

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
            <a
              href={JUST_PUTZIT_LIVE}
              className="hover:text-brand-deep"
              target="_blank"
              rel="noopener noreferrer"
            >
              justputzit.com
            </a>
            <Link href="/improve" className="hover:text-brand-deep">
              Improve
            </Link>
            <Link href="/dialog" className="hover:text-brand-deep">
              Dialog
            </Link>
            <Link
              href="/admin"
              className="rounded-md bg-brand-deep px-3.5 py-1.5 text-foam"
            >
              Seed admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14 sm:px-8 sm:py-20">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          SUGGESTIONS
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          Please do these on Just Putz It
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          This is the box. Click <strong>Please do this</strong> on a
          suggestion, or write your own. Work stays on{" "}
          <a
            href={JUST_PUTZIT_LIVE}
            className="font-semibold text-brand-deep underline"
          >
            justputzit.com
          </a>
          . We do not rebuild the site. Please-do queues the suggestion
          on the Seed — it does not start a loop looking for an AI.
        </p>
        <p className="mt-3 text-sm text-muted">
          The Seed will also answer on{" "}
          <Link
            href={`/admin/projects/${JUST_PUTZIT_CONNECT_SEED_ID}/dialog`}
            className="font-semibold text-brand-deep underline"
          >
            the Just Putz It dialog
          </Link>
          .
        </p>
        <div className="mt-10">
          <SeedSuggestionsBoard
            projectId={JUST_PUTZIT_CONNECT_SEED_ID}
            headline={plan.headline}
            summary={plan.summary}
            improvements={plan.improvements}
            requestedTitles={requested}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
