"use client";

import { useEffect, useRef, useState } from "react";
import {
  recordRibbonClickAction,
  recordRibbonImpressionAction,
} from "@/app/lockgm/live/actions";

export type RibbonAd = {
  id: string;
  sponsor: string;
  headline: string;
  href: string;
  market: string;
};

/**
 * Full-bleed local-ad ribbon that sits above the live scoreboard.
 * Rotates sponsors to generate local revenue during real-time matchups.
 */
export function AdRibbon({
  ads,
  label = "Local partners",
}: {
  ads: RibbonAd[];
  label?: string;
}) {
  const [index, setIndex] = useState(0);
  const seen = useRef(new Set<string>());
  const active = ads.length > 0 ? ads[index % ads.length]! : null;

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % ads.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [ads.length]);

  useEffect(() => {
    if (!active) return;
    if (seen.current.has(active.id)) return;
    seen.current.add(active.id);
    void recordRibbonImpressionAction(active.id);
  }, [active]);

  if (!active) {
    return (
      <div className="lg-ad-ribbon border border-[color:var(--lg-line)] bg-[color:var(--lg-field)] px-4 py-3">
        <p className="text-xs font-bold tracking-[0.18em] text-[color:var(--lg-accent)] uppercase">
          {label}
        </p>
        <p className="mt-1 text-sm text-[color:var(--lg-mute)]">
          Local ad slots open — host a matchup and sell the ribbon.
        </p>
      </div>
    );
  }

  return (
    <div
      className="lg-ad-ribbon overflow-hidden border border-[color:var(--lg-line)] bg-gradient-to-r from-[#10281c] via-[color:var(--lg-field)] to-[#1a3d2a] px-4 py-3 sm:px-5"
      role="complementary"
      aria-label="Local advertising ribbon"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold tracking-[0.22em] text-[color:var(--lg-accent)] uppercase">
          {label} · {active.market}
        </p>
        {ads.length > 1 ? (
          <p className="text-[10px] tabular-nums text-[color:var(--lg-mute)]">
            {(index % ads.length) + 1}/{ads.length}
          </p>
        ) : null}
      </div>
      <div key={active.id} className="lg-ad-slide mt-2 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="lockgm-display text-xl font-extrabold text-[color:var(--lg-text)] sm:text-2xl">
            {active.sponsor}
          </p>
          <p className="mt-1 max-w-3xl text-sm leading-snug text-[color:var(--lg-mute)]">
            {active.headline}
          </p>
        </div>
        <a
          href={active.href}
          onClick={() => {
            void recordRibbonClickAction(active.id);
          }}
          className="inline-flex h-10 shrink-0 items-center rounded-md border border-[color:var(--lg-accent)]/70 px-4 text-xs font-bold text-[color:var(--lg-accent)] transition-colors hover:bg-[color:var(--lg-accent)] hover:text-[color:var(--lg-bg)]"
        >
          Visit sponsor
        </a>
      </div>
    </div>
  );
}
