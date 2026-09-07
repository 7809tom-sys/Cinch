"use client";

import { useEffect, useState, useTransition } from "react";
import type { LocalAd } from "@/lib/lockgm/local-ads";
import {
  listLocalAdsAction,
  upsertLocalAdAction,
} from "@/app/lockgm/live/actions";

/** Lightweight host desk to assemble local ads that feed the scoreboard ribbon. */
export function LocalAdsDesk() {
  const [ads, setAds] = useState<LocalAd[]>([]);
  const [sponsor, setSponsor] = useState("");
  const [headline, setHeadline] = useState("");
  const [href, setHref] = useState("");
  const [market, setMarket] = useState("local");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void listLocalAdsAction().then((result) => {
      if (result.ok) setAds(result.ads);
    });
  }, []);

  function saveAd() {
    startTransition(async () => {
      const result = await upsertLocalAdAction({
        sponsor,
        headline,
        href,
        market,
        active: true,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setAds((current) => [result.ad, ...current.filter((ad) => ad.id !== result.ad.id)]);
      setSponsor("");
      setHeadline("");
      setHref("");
      setMessage("Local ad saved — it will rotate on the live ribbon.");
    });
  }

  return (
    <section className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-6">
      <p className="text-xs font-bold tracking-[0.18em] text-[color:var(--lg-accent)]">
        LOCAL AD RIBBON · REVENUE
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--lg-mute)]">
        Put neighborhood sponsors above the scoreboard. Active ads for the room
        market rotate during the shared live broadcast.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-1">
          <span className="font-bold">Sponsor</span>
          <input
            value={sponsor}
            onChange={(e) => setSponsor(e.target.value)}
            className="mt-2 block min-h-11 w-full rounded-md border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3"
          />
        </label>
        <label className="text-sm">
          <span className="font-bold">Market</span>
          <input
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="mt-2 block min-h-11 w-full rounded-md border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="font-bold">Headline</span>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="mt-2 block min-h-11 w-full rounded-md border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="font-bold">Link</span>
          <input
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://…"
            className="mt-2 block min-h-11 w-full rounded-md border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={pending || !sponsor.trim() || !headline.trim()}
        onClick={saveAd}
        className="mt-5 inline-flex min-h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add local ad"}
      </button>
      {message ? (
        <p className="mt-3 text-sm text-[color:var(--lg-accent)]" role="status">
          {message}
        </p>
      ) : null}

      {ads.length > 0 ? (
        <ul className="mt-6 space-y-2 border-t border-[color:var(--lg-line)] pt-4">
          {ads.slice(0, 8).map((ad) => (
            <li key={ad.id} className="text-sm text-[color:var(--lg-mute)]">
              <span className="font-semibold text-[color:var(--lg-text)]">
                {ad.sponsor}
              </span>{" "}
              · {ad.market} · {ad.impressions} views / {ad.clicks} clicks
              {!ad.active ? " · paused" : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
