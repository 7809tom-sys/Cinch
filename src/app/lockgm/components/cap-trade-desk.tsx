"use client";

import { useMemo, useState } from "react";
import {
  ROSTER_CAP_HITS,
  TEAM_CAP_CEILING_M,
  TEAM_STARTING_USED_M,
  TRADE_MARKET,
} from "@/lib/lockgm/config";

export function CapTradeDesk() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const delta = useMemo(() => {
    let sum = 0;
    for (const piece of TRADE_MARKET) {
      if (selected.has(piece.id)) sum += piece.capDeltaM;
    }
    return Math.round(sum * 10) / 10;
  }, [selected]);

  const used = Math.round((TEAM_STARTING_USED_M + delta) * 10) / 10;
  const room = Math.round((TEAM_CAP_CEILING_M - used) * 10) / 10;
  const over = room < 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border-t border-[color:var(--lg-line)] pt-3">
          <p className="text-[11px] font-bold tracking-[0.16em] text-[color:var(--lg-mute)] uppercase">
            Cap ceiling
          </p>
          <p className="lockgm-display mt-1 text-3xl font-extrabold text-[color:var(--lg-text)]">
            ${TEAM_CAP_CEILING_M}M
          </p>
        </div>
        <div className="border-t border-[color:var(--lg-line)] pt-3">
          <p className="text-[11px] font-bold tracking-[0.16em] text-[color:var(--lg-mute)] uppercase">
            Used after trade
          </p>
          <p className="lockgm-display mt-1 text-3xl font-extrabold text-[color:var(--lg-text)]">
            ${used}M
          </p>
        </div>
        <div className="border-t border-[color:var(--lg-line)] pt-3">
          <p className="text-[11px] font-bold tracking-[0.16em] text-[color:var(--lg-mute)] uppercase">
            Cap room
          </p>
          <p
            className={`lockgm-display mt-1 text-3xl font-extrabold ${
              over
                ? "text-[color:var(--lg-warn)]"
                : "text-[color:var(--lg-accent)]"
            }`}
          >
            {over ? "-" : ""}${Math.abs(room)}M
          </p>
        </div>
      </div>

      <div className="h-3 overflow-hidden rounded-sm bg-[color:var(--lg-bg)]">
        <div
          className={`h-full transition-all duration-500 ${
            over ? "bg-[color:var(--lg-warn)]" : "bg-[color:var(--lg-accent)]"
          }`}
          style={{
            width: `${Math.min(100, (used / TEAM_CAP_CEILING_M) * 100)}%`,
          }}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="lockgm-display text-xl font-bold text-[color:var(--lg-accent)]">
            Current charges
          </h3>
          <ul className="mt-4 divide-y divide-[color:var(--lg-line)] border-t border-[color:var(--lg-line)]">
            {ROSTER_CAP_HITS.map((row) => (
              <li
                key={row.id}
                className="flex justify-between gap-3 py-3 text-sm"
              >
                <span>
                  <span className="font-semibold text-[color:var(--lg-text)]">
                    {row.name}
                  </span>
                  <span className="text-[color:var(--lg-mute)]">
                    {" "}
                    · {row.position}
                  </span>
                </span>
                <span className="font-bold">${row.capHitM}M</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="lockgm-display text-xl font-bold text-[color:var(--lg-accent)]">
            Trade sandbox
          </h3>
          <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
            Toggle pieces. Cap delta updates live — stay under the ceiling.
          </p>
          <ul className="mt-4 space-y-2">
            {TRADE_MARKET.map((piece) => {
              const on = selected.has(piece.id);
              return (
                <li key={piece.id}>
                  <button
                    type="button"
                    onClick={() => toggle(piece.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                      on
                        ? "border-[color:var(--lg-accent)] bg-[color:var(--lg-accent)]/10"
                        : "border-[color:var(--lg-line)] hover:border-[color:var(--lg-accent)]/50"
                    }`}
                  >
                    <span className="font-semibold">{piece.label}</span>
                    <span
                      className={
                        piece.capDeltaM < 0
                          ? "text-[color:var(--lg-accent)]"
                          : piece.capDeltaM > 0
                            ? "text-[color:var(--lg-warn)]"
                            : "text-[color:var(--lg-mute)]"
                      }
                    >
                      {piece.capDeltaM > 0 ? "+" : ""}
                      {piece.capDeltaM === 0
                        ? "pick"
                        : `$${piece.capDeltaM}M`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm font-bold">
            Trade delta:{" "}
            <span
              className={
                delta <= 0
                  ? "text-[color:var(--lg-accent)]"
                  : "text-[color:var(--lg-warn)]"
              }
            >
              {delta > 0 ? "+" : ""}
              {delta}M
            </span>
            {over ? " · over the cap" : " · legal under ceiling"}
          </p>
        </div>
      </div>
    </div>
  );
}
