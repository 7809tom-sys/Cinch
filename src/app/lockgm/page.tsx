import Link from "next/link";
import { SPORTS } from "@/lib/lockgm/sports";

export default function LockgmHomePage() {
  return (
    <main>
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(200,245,66,0.16),transparent_45%),radial-gradient(ellipse_at_80%_0%,rgba(20,53,42,0.55),transparent_50%),linear-gradient(160deg,#070b12_0%,#0e1522_55%,#14352a_100%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8f542' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-end px-6 pb-20 pt-28 sm:justify-center sm:px-8">
          <p className="lg-rise lockgm-display text-6xl font-extrabold leading-none tracking-tight text-[color:var(--lg-accent)] sm:text-8xl">
            LockGM
          </p>
          <h1 className="lg-rise-2 mt-5 max-w-xl lockgm-display text-3xl font-bold leading-[1.05] text-[color:var(--lg-text)] sm:text-5xl">
            Be the Shadow GM.
          </h1>
          <p className="lg-rise-3 mt-5 max-w-lg text-base leading-relaxed text-[color:var(--lg-mute)] sm:text-lg">
            AI scout research, your numbered reports, and draft-day races —
            across the world’s biggest team sports.
          </p>
          <div className="lg-rise-3 mt-9 flex flex-wrap gap-3">
            <Link
              href="/lockgm/reports"
              className="inline-flex h-12 items-center rounded-md bg-[color:var(--lg-accent)] px-6 text-sm font-bold text-[color:var(--lg-bg)] transition-transform hover:-translate-y-0.5"
            >
              Open my reports
            </Link>
            <Link
              href="/lockgm/draft"
              className="inline-flex h-12 items-center rounded-md border border-[color:var(--lg-line)] px-5 text-sm font-bold text-[color:var(--lg-text)] hover:border-[color:var(--lg-accent)]"
            >
              Enter draft day
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--lg-line)] px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            WORLD TEAM SPORTS
          </p>
          <h2 className="mt-3 max-w-2xl lockgm-display text-3xl font-extrabold sm:text-4xl">
            One war room. Eight sports.
          </h2>
          <ul className="mt-8 flex flex-wrap gap-3">
            {SPORTS.map((s) => (
              <li
                key={s.id}
                className="border border-[color:var(--lg-line)] px-3 py-2 text-sm font-bold text-[color:var(--lg-text)]"
              >
                {s.name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[color:var(--lg-panel)] px-6 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            HOW PRO GMS WORK HERE
          </p>
          <h2 className="mt-3 max-w-2xl lockgm-display text-3xl font-extrabold sm:text-4xl">
            Research. Tabulate. Beat the clock.
          </h2>
          <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "AI scout pair",
                body: "Assign Scout Alpha (tape) and Scout Beta (comps) to dig — then claim the merge as your SR-###.",
                href: "/lockgm/reports",
              },
              {
                title: "Your numbered board",
                body: "Key in a customer / scout number. Type reports by hand or from AI. Lock them for draft day.",
                href: "/lockgm/reports",
              },
              {
                title: "Beat the pick",
                body: "On draft day, lock your call before the team on the clock. Right name, early lock — you beat the room.",
                href: "/lockgm/draft",
              },
            ].map((item) => (
              <li
                key={item.title}
                className="border-t border-[color:var(--lg-line)] pt-5"
              >
                <p className="lockgm-display text-2xl font-bold text-[color:var(--lg-accent)]">
                  {item.title}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--lg-mute)]">
                  {item.body}
                </p>
                <Link
                  href={item.href}
                  className="mt-4 inline-flex text-sm font-bold text-[color:var(--lg-text)] hover:text-[color:var(--lg-accent)]"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            FRONT OFFICE
          </p>
          <h2 className="mt-3 max-w-xl lockgm-display text-3xl font-extrabold sm:text-4xl">
            Needs, assets, wage ceilings.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[color:var(--lg-mute)]">
            Sit in the GM office, stress-test the budget desk, and follow the
            pipeline — the same tools a professional front office lives in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/lockgm/office"
              className="inline-flex h-12 items-center rounded-md bg-[color:var(--lg-accent)] px-6 text-sm font-bold text-[color:var(--lg-bg)]"
            >
              Open GM office
            </Link>
            <Link
              href="/lockgm/pricing"
              className="inline-flex h-12 items-center rounded-md border border-[color:var(--lg-line)] px-5 text-sm font-bold"
            >
              See tiers
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
