import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SeedPlaybookPack } from "@/components/seed-playbook-pack";
import { exampleSeedPlaybook, SEED_PLAYBOOK_RULE } from "@/lib/seed-playbook";
import { PREP_LANES, PREP_RULE } from "@/lib/seed-prep";

export const metadata: Metadata = {
  title: "Senti — prep work is everything — Cinch Seed",
  description:
    "Describe the chat before the chat happens. Spec website, admin, money, CRM, and delivery, then build a good website.",
};

export default function SentiDeskPage() {
  const pack = exampleSeedPlaybook();

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
            <Link href="/admin" className="hover:text-brand-deep">
              Build a Seed
            </Link>
            <Link href="/dialog" className="hover:text-brand-deep">
              Dialog
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

      <main className="mx-auto max-w-6xl px-6 py-14 sm:px-8 sm:py-20">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          SENTI · PREP WORK IS EVERYTHING
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          Make a good website
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {PREP_RULE}
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-brand-deep">
          {SEED_PLAYBOOK_RULE} Open a Seed playbook and fill each chapter
          there — method by method — before Conductor builds. Just Putz It is
          not a Cinch Seed.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-5">
          {PREP_LANES.map((lane) => (
            <li
              key={lane.id}
              className="border border-brand/10 bg-foam px-3 py-3 text-sm font-semibold text-brand-deep"
            >
              {lane.label}
            </li>
          ))}
        </ul>

        <section className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
            Method demo — build your pack on a Seed
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            This bakery pack is a walkthrough of the method. Your real
            instruction pack is filled chapter by chapter on{" "}
            <Link href="/admin" className="font-semibold underline">
              Seed admin
            </Link>{" "}
            or the owner portal — then print or download.
          </p>
          <div className="mt-6">
            <SeedPlaybookPack pack={pack} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
