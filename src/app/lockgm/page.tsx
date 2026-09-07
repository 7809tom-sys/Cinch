import Link from "next/link";
import { SPORTS } from "@/lib/lockgm/sports";
import { getCurrentCustomer } from "@/lib/customer-auth";

const MORE_TOOLS = [
  { href: "/lockgm/reports", label: "Scout Alpha / SR-###" },
  { href: "/lockgm/reports", label: "Numbered board" },
  { href: "/lockgm/draft", label: "Draft day" },
  { href: "/lockgm/office", label: "GM office" },
  { href: "/lockgm/pricing", label: "Tiers" },
  { href: "/lockgm/profile", label: "Build identity" },
] as const;

export default async function LockgmHomePage() {
  const customer = await getCurrentCustomer();

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
            LockedGM
          </p>
          <h1 className="lg-rise-2 mt-5 max-w-xl lockgm-display text-3xl font-bold leading-[1.05] text-[color:var(--lg-text)] sm:text-5xl">
            Claim a 2026 club. Call the games.
          </h1>
          <p className="lg-rise-3 mt-5 max-w-lg text-base leading-relaxed text-[color:var(--lg-mute)] sm:text-lg">
            Thirty MLB teams. One GM each. Lineups lock on Classic Matchup.
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
          <div className="lg-rise-3 mt-6 flex flex-wrap gap-3">
            <Link
              href="/lockgm/league"
              className="inline-flex h-12 items-center rounded-md bg-[color:var(--lg-accent)] px-6 text-sm font-bold text-[color:var(--lg-bg)] transition-transform hover:-translate-y-0.5"
            >
              Claim your 2026 club
            </Link>
            <Link
              href="/lockgm/sim"
              className="inline-flex h-12 items-center rounded-md bg-[color:var(--lg-accent)] px-6 text-sm font-bold text-[color:var(--lg-bg)] transition-transform hover:-translate-y-0.5"
            >
              Classic Matchup sim
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--lg-line)] px-6 py-12 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--lg-mute)]">
            Eight sports
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {SPORTS.map((s) => (
              <li
                key={s.id}
                className="border border-[color:var(--lg-line)] px-3 py-1.5 text-sm text-[color:var(--lg-mute)]"
              >
                {s.name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            MORE TOOLS
          </p>
          <h2 className="mt-3 max-w-xl lockgm-display text-2xl font-extrabold sm:text-3xl">
            Scouting, draft, and the front office.
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MORE_TOOLS.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex min-h-12 items-center border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-4 text-sm font-bold text-[color:var(--lg-text)] hover:border-[color:var(--lg-accent)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
