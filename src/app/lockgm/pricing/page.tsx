import Link from "next/link";
import { SUB_TIERS } from "@/lib/lockgm/config";

export const metadata = {
  title: "Tiers — LockGM",
  description:
    "Shadow, War Room, and Pipeline subscription tiers for LockGM.",
};

export default function LockgmPricingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        SUBSCRIPTIONS
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        Pick your seat in the war room
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Annual seats — cheap enough to stay year-round. $20 for your home sport,
        $59 when you want every war room on the calendar.
      </p>

      <ul className="mt-12 grid gap-8 lg:grid-cols-3">
        {SUB_TIERS.map((tier) => (
          <li
            key={tier.id}
            className="flex flex-col border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] px-6 py-6"
          >
            <p className="lockgm-display text-sm font-bold tracking-[0.16em] text-[color:var(--lg-accent)]">
              {tier.name.toUpperCase()}
            </p>
            <p className="lockgm-display mt-3 text-4xl font-extrabold">
              {tier.priceLabel}
            </p>
            {tier.billing === "year" ? (
              <p className="mt-1 text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
                Billed yearly
              </p>
            ) : null}
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--lg-mute)]">
              {tier.blurb}
            </p>
            <ul className="mt-6 flex-1 space-y-2">
              {tier.perks.map((perk) => (
                <li key={perk} className="text-sm text-[color:var(--lg-text)]">
                  · {perk}
                </li>
              ))}
            </ul>
            <Link
              href={
                tier.id === "free"
                  ? "/lockgm/draft"
                  : tier.id === "pro"
                    ? "/lockgm/cap"
                    : "/lockgm/scouting"
              }
              className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-[color:var(--lg-accent)] px-4 text-sm font-bold text-[color:var(--lg-bg)]"
            >
              {tier.cta}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
