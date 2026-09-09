import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { planInPlaceImprovements } from "@/lib/connect-improvements";
import { growthAxisMeta } from "@/lib/seed-growth";
import {
  JUST_PUTZIT_ADMIN,
  JUST_PUTZIT_GITHUB,
  JUST_PUTZIT_LIVE,
  JUST_PUTZIT_MANUS,
  LIVE_UPDATE_REQUIRES_APPROVAL,
} from "@/lib/seed-connect";
import {
  JUST_PUTZIT_LOOK_PATHS,
  lookAtJustPutzitLive,
} from "@/lib/just-putzit-look";

export const metadata: Metadata = {
  title: "Look at and administer Just Putz It — Cinch Seed",
  description:
    "Just Putz It is a social-activity and dating site hosted by manus.im. cinchseed.com looks at and administers it. Proposed updates wait for owner approval.",
};

export const dynamic = "force-dynamic";

export default async function ImproveJustPutzItPage() {
  const look = await lookAtJustPutzitLive();
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
            <Link href="/admin" className="transition-colors hover:text-brand-deep">
              Seed admin
            </Link>
            <Link href="/login" className="rounded-md bg-brand-deep px-3.5 py-1.5 text-foam">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-14 sm:px-8 sm:py-20">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          LOOK · ADMINISTER · PROPOSE
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          {plan.headline}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {plan.summary}
        </p>
        <p className="mt-3 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-brand-deep">
          {LIVE_UPDATE_REQUIRES_APPROVAL}
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
          Hosting:{" "}
          <a
            href={JUST_PUTZIT_MANUS}
            className="font-semibold underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            manus.im
          </a>
        </p>

        <section className="mt-12 border border-brand/10 bg-foam px-5 py-6">
          <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
            Look
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
            Live justputzit.com
          </h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Reachable</dt>
              <dd className="font-semibold text-brand-deep">
                {look.ok ? "Yes" : look.error ?? "No"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Host</dt>
              <dd className="font-semibold text-brand-deep">
                {look.hostedOnManus ? "manus.im" : "Not Manus headers"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Title</dt>
              <dd className="font-semibold text-brand-deep">
                {look.title ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">watch.js</dt>
              <dd className="font-semibold text-brand-deep">
                {look.watchJsPresent
                  ? "On the live page"
                  : "Not on the live page yet"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {look.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {JUST_PUTZIT_LOOK_PATHS.map((item) => (
              <a
                key={item.path}
                href={`${JUST_PUTZIT_LIVE}${item.path === "/" ? "" : item.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-brand/20 px-3 py-1.5 text-xs font-semibold text-brand-deep hover:border-brand/40"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="mt-5 overflow-hidden border border-brand/10 bg-mist/30">
            <iframe
              title="justputzit.com"
              src={JUST_PUTZIT_LIVE}
              className="h-[28rem] w-full bg-foam"
            />
          </div>
        </section>

        <section className="mt-8 border border-brand/10 bg-foam px-5 py-6">
          <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
            Administer
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
            Seed desk for Just Putz It
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            manus.im put the site on GitHub so Cinch can work it. Open the
            live admin, the GitHub export, or a Connect Seed. Widget commits
            stay queued until you approve a publish. Cinch will not commit
            watch.js, push to GitHub, or ask Manus to publish until then.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={JUST_PUTZIT_ADMIN}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam"
            >
              Live admin
            </a>
            <a
              href={JUST_PUTZIT_GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-md border border-brand/20 px-4 text-sm font-semibold text-brand-deep"
            >
              GitHub export
            </a>
            <Link
              href="/admin"
              className="inline-flex h-11 items-center rounded-md border border-brand/20 px-4 text-sm font-semibold text-brand-deep"
            >
              Connect a Seed
            </Link>
          </div>
        </section>

        <p className="mt-12 font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          Proposed updates
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          These stay on the Seed desk until you approve a final update. Nothing
          is committed, pushed, or published on justputzit.com before that.
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
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
                        Proposed: {item.liveChange}
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
          {LIVE_UPDATE_REQUIRES_APPROVAL}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
