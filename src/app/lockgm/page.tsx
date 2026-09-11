import Link from "next/link";
import { SPORTS, sportById } from "@/lib/lockgm/sports";
import { franchiseFor } from "@/lib/lockgm/sport-catalog";
import {
  featuredSports,
  otherSports,
  SPORT_HUBS,
  sportHubPath,
} from "@/lib/lockgm/sport-nav";
import { getCurrentCustomer } from "@/lib/customer-auth";

export default async function LockgmHomePage() {
  const customer = await getCurrentCustomer();
  const featured = featuredSports().map((id) => sportById(id));
  const rest = otherSports().map((id) => sportById(id));

  return (
    <main>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(200,245,66,0.16),transparent_45%),radial-gradient(ellipse_at_80%_0%,rgba(20,53,42,0.55),transparent_50%),linear-gradient(160deg,#070b12_0%,#0e1522_55%,#14352a_100%)]" />
        <div className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-20 sm:px-8 sm:pt-24">
          <p className="lg-rise lockgm-display text-6xl font-extrabold leading-none tracking-tight text-[color:var(--lg-accent)] sm:text-8xl">
            LockedGM
          </p>
          <h1 className="lg-rise-2 mt-5 max-w-2xl lockgm-display text-3xl font-bold leading-[1.05] text-[color:var(--lg-text)] sm:text-5xl">
            Pick a sport. Run that front office.
          </h1>
          <p className="lg-rise-3 mt-5 max-w-xl text-base leading-relaxed text-[color:var(--lg-mute)] sm:text-lg">
            Each sport has its own hub — scouting, draft, cap, and the extras
            that belong there. Baseball does not share a menu with volleyball.
          </p>
          {customer ? null : (
            <p className="lg-rise-3 mt-6 text-base">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center rounded-md border border-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-accent)] hover:bg-[color:var(--lg-accent)] hover:text-[color:var(--lg-bg)]"
              >
                Sign in / Create login
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="border-t border-[color:var(--lg-line)] px-6 py-14 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            DEEP BOARDS
          </p>
          <h2 className="mt-2 lockgm-display text-2xl font-extrabold sm:text-3xl">
            Start here
          </h2>
          <ul className="mt-8 grid gap-4 lg:grid-cols-3">
            {featured.map((sport) => {
              const hub = SPORT_HUBS[sport.id];
              const kit = franchiseFor(sport.id);
              return (
                <li key={sport.id}>
                  <Link
                    href={sportHubPath(sport.id)}
                    className="flex h-full flex-col border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] px-5 py-6 transition-colors hover:border-[color:var(--lg-accent)]"
                  >
                    <p className="text-[10px] font-bold tracking-[0.18em] text-[color:var(--lg-accent)] uppercase">
                      {kit.abbrev} · {sport.roleTitle}
                    </p>
                    <h3 className="mt-3 lockgm-display text-2xl font-extrabold text-[color:var(--lg-text)]">
                      {sport.name}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[color:var(--lg-mute)]">
                      {hub.tagline}
                    </p>
                    <p className="mt-4 text-xs font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
                      {hub.board}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="border-t border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] px-6 py-14 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            MORE WAR ROOMS
          </p>
          <h2 className="mt-2 lockgm-display text-2xl font-extrabold sm:text-3xl">
            Same desk, sport-true rules
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((sport) => {
              const hub = SPORT_HUBS[sport.id];
              return (
                <li key={sport.id}>
                  <Link
                    href={sportHubPath(sport.id)}
                    className="flex min-h-28 flex-col justify-between border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-4 py-4 hover:border-[color:var(--lg-accent)]"
                  >
                    <span className="lockgm-display text-xl font-bold text-[color:var(--lg-text)]">
                      {sport.name}
                    </span>
                    <span className="mt-2 text-sm text-[color:var(--lg-mute)]">
                      {hub.board}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-8 text-sm text-[color:var(--lg-mute)]">
            {SPORTS.length} sports. Open one hub — the nav only shows that
            sport’s desks.
          </p>
        </div>
      </section>
    </main>
  );
}
