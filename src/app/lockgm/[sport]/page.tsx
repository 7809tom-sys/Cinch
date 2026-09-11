import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isSportId, sportById, SPORTS } from "@/lib/lockgm/sports";
import { franchiseFor } from "@/lib/lockgm/sport-catalog";
import {
  desksForSport,
  deskHref,
  SPORT_HUBS,
} from "@/lib/lockgm/sport-nav";

export function generateStaticParams() {
  return SPORTS.map((sport) => ({ sport: sport.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string }>;
}): Promise<Metadata> {
  const { sport: slug } = await params;
  if (!isSportId(slug)) return { title: "LockedGM" };
  const sport = sportById(slug);
  return {
    title: `${sport.name} — LockedGM`,
    description: SPORT_HUBS[slug].tagline,
  };
}

export default async function SportHubPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport: slug } = await params;
  if (!isSportId(slug)) notFound();

  const sport = sportById(slug);
  const hub = SPORT_HUBS[slug];
  const kit = franchiseFor(slug);
  const desks = desksForSport(slug);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        {sport.name.toUpperCase()} · {kit.abbrev}
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold text-[color:var(--lg-text)] sm:text-5xl">
        {sport.roleTitle} desk
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        {hub.tagline}
      </p>
      <p className="mt-3 text-sm font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
        {hub.board}
      </p>
      <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
        {kit.clubName} · {kit.modeBlurb}
      </p>

      <section className="mt-10">
        <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
          THIS SPORT
        </p>
        <h2 className="mt-2 lockgm-display text-2xl font-extrabold">
          Open a desk
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {desks.map((desk) => (
            <li key={desk.id}>
              <Link
                href={deskHref(desk.id, slug)}
                className="flex min-h-20 items-center border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] px-4 text-sm font-bold text-[color:var(--lg-text)] hover:border-[color:var(--lg-accent)]"
              >
                {desk.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-sm text-[color:var(--lg-mute)]">
        Switch sports in the bar above. Desks that belong to one sport stay on that hub.
      </p>
    </main>
  );
}
