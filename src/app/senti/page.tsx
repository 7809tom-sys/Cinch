import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SeedPlaybookPack } from "@/components/seed-playbook-pack";
import { exampleJustPutzItPlaybook, SEED_PLAYBOOK_RULE } from "@/lib/seed-playbook";

export const metadata: Metadata = {
  title: "Senti — how a Seed develops a project",
  description:
    "Talk to several AIs, keep chapter scripts on the Seed, then Senti compiles one instruction pack you can print or send. Not a dumped file on cinchseed.com.",
};

export default function SentiDeskPage() {
  const pack = exampleJustPutzItPlaybook();

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
            <Link href="/suggestions" className="hover:text-brand-deep">
              Suggestions
            </Link>
            <Link href="/improve" className="hover:text-brand-deep">
              Improve
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
          SENTI · SEED PLAYBOOK
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          How a Seed develops a project
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {SEED_PLAYBOOK_RULE}
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-brand-deep">
          Suggestions do not become a file on cinchseed.com. They become
          chapters on the Seed. Open a Seed’s playbook from{" "}
          <Link href="/portal" className="font-semibold underline">
            Portal
          </Link>{" "}
          or Admin after you sign in.
        </p>

        <section className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
            Example pack — Just Putz It
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {pack.summary} Interactive on this page. Print to PDF or download
            the compiled instruction.
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
