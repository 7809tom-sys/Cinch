"use client";

import Link from "next/link";
import { useSport } from "@/lib/lockgm/sport-context";

const PRIORITY_COLOR = {
  critical: "text-[color:var(--lg-warn)]",
  high: "text-[color:var(--lg-accent)]",
  medium: "text-[color:var(--lg-mute)]",
};

export function GmOffice() {
  const { sport, franchise } = useSport();

  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            {franchise.abbrev} · {sport.league}
          </p>
          <h2 className="mt-2 lockgm-display text-3xl font-extrabold sm:text-4xl">
            {franchise.clubName}
          </h2>
          <p className="mt-3 text-sm font-bold uppercase tracking-wide text-[color:var(--lg-mute)]">
            Mode: {franchise.mode}
          </p>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-[color:var(--lg-mute)]">
            {franchise.modeBlurb}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/lockgm/reports"
              className="inline-flex h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)]"
            >
              Open my reports
            </Link>
            <Link
              href="/lockgm/draft"
              className="inline-flex h-11 items-center rounded-md border border-[color:var(--lg-line)] px-5 text-sm font-bold"
            >
              Go to draft day
            </Link>
          </div>
        </div>

        <div className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] px-5 py-5">
          <p className="lockgm-display text-sm font-bold tracking-[0.16em] text-[color:var(--lg-accent)]">
            ASSETS
          </p>
          <ul className="mt-3 space-y-2">
            {franchise.assets.map((asset) => (
              <li key={asset} className="text-sm text-[color:var(--lg-text)]">
                · {asset}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="lockgm-display text-xl font-bold text-[color:var(--lg-accent)]">
            Roster needs
          </h3>
          <ul className="mt-4 divide-y divide-[color:var(--lg-line)] border-t border-[color:var(--lg-line)]">
            {franchise.needs.map((need) => (
              <li key={need.id} className="py-3">
                <p className="font-bold">
                  {need.position}{" "}
                  <span
                    className={`text-xs uppercase tracking-wide ${PRIORITY_COLOR[need.priority]}`}
                  >
                    {need.priority}
                  </span>
                </p>
                <p className="mt-1 text-sm text-[color:var(--lg-mute)]">
                  {need.note}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="lockgm-display text-xl font-bold text-[color:var(--lg-accent)]">
            Decision log
          </h3>
          <ul className="mt-4 divide-y divide-[color:var(--lg-line)] border-t border-[color:var(--lg-line)]">
            {franchise.decisions.map((d) => (
              <li key={d.id} className="py-3">
                <p className="text-[10px] font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
                  {d.when}
                </p>
                <p className="mt-1 font-bold">{d.title}</p>
                <p className="mt-1 text-sm text-[color:var(--lg-mute)]">
                  {d.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
