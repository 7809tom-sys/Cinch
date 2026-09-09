import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import {
  JUST_PUTZIT_GITHUB,
  JUST_PUTZIT_LIVE,
} from "@/lib/seed-connect";
import { planInPlaceImprovements } from "@/lib/connect-improvements";
import { growthAxisMeta } from "@/lib/seed-growth";

export const metadata: Metadata = {
  title: "How Cinch improves Just Putz It — Cinch Seed",
  description:
    "Just Putz It is a social-activity and dating site. Cinch Seed improves it in place on Vercel — it does not rewrite the copy or rebuild the site.",
};

export default function ImproveJustPutzItPage() {
  const plan = planInPlaceImprovements({
    name: "Just Putz It",
    brief:
      "Social activity and dating website. Meet locals for real dates and activities.",
    liveUrl: JUST_PUTZIT_LIVE,
  });

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
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-brand-deep"
            >
              justputzit.com
            </a>
            <Link href="/scripts" className="transition-colors hover:text-brand-deep">
              Scripts
            </Link>
            <Link href="/login" className="rounded-md bg-brand-deep px-3.5 py-1.5 text-foam">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14 sm:px-8 sm:py-20">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          CONNECT · IN PLACE
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          {plan.headline}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {plan.summary}
        </p>
        <p className="mt-4 text-sm text-brand-deep">
          Live host:{" "}
          <a
            href={JUST_PUTZIT_LIVE}
            className="font-semibold underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {JUST_PUTZIT_LIVE}
          </a>
          {" · "}
          GitHub:{" "}
          <a
            href={JUST_PUTZIT_GITHUB}
            className="font-semibold underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            7809tom-sys/just-putzit
          </a>
          {" · "}
          Hosting: Vercel
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plan.axes.map((axis) => {
            const items = plan.improvements.filter(
              (item) => item.growthAxis === axis.id,
            );
            return (
              <section
                key={axis.id}
                className="border border-brand/10 bg-foam px-5 py-6"
              >
                <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
                  {axis.short}
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
                  {axis.label}
                </h2>
                <ul className="mt-4 space-y-5">
                  {items.map((item) => (
                    <li key={item.id}>
                      <p className="font-semibold text-brand-deep">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {item.why}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-brand-deep">
                        On the live site: {item.liveChange}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-muted">
          {growthAxisMeta("functionality").blurb.replace(
            "Critical software (a kitchen designer, checkout, configurators)",
            "Critical software (Matches, Community, Activity Board)",
          )}{" "}
          Manus 1.6 may only commit the watch.js widget so these adaptations
          can land. It must not rewrite Vercel copy.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
