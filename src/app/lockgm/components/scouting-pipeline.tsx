"use client";

import { useMemo, useState } from "react";
import {
  PROSPECTS,
  STAGE_LABEL,
  type PlayerStage,
  type Prospect,
} from "@/lib/lockgm/prospects";
import type { SubTierId } from "@/lib/lockgm/config";

const STAGES: Array<PlayerStage | "all"> = [
  "all",
  "high_school",
  "college",
  "declare",
  "pro_ready",
];

export function ScoutingPipeline({
  tier = "free",
}: {
  tier?: SubTierId;
}) {
  const [stage, setStage] = useState<(typeof STAGES)[number]>("all");
  const [activeId, setActiveId] = useState<string | null>(PROSPECTS[0]?.id ?? null);
  const canReadPremium = tier === "pro" || tier === "pipeline";
  const canSeeHsDeep = tier === "pipeline";

  const list = useMemo(() => {
    return [...PROSPECTS]
      .filter((p) => (stage === "all" ? true : p.stage === stage))
      .sort((a, b) => a.rank - b.rank);
  }, [stage]);

  const active: Prospect | null =
    list.find((p) => p.id === activeId) ?? list[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {STAGES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStage(key)}
            className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide uppercase ${
              stage === key
                ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
                : "border border-[color:var(--lg-line)] text-[color:var(--lg-mute)]"
            }`}
          >
            {key === "all" ? "All stages" : STAGE_LABEL[key]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <ul className="max-h-[36rem] overflow-y-auto border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)]">
          {list.map((prospect) => (
            <li key={prospect.id}>
              <button
                type="button"
                onClick={() => setActiveId(prospect.id)}
                className={`flex w-full items-start justify-between gap-3 border-b border-[color:var(--lg-line)] px-4 py-3 text-left text-sm ${
                  active?.id === prospect.id
                    ? "bg-[color:var(--lg-accent)]/10"
                    : "hover:bg-white/5"
                }`}
              >
                <div>
                  <p className="font-bold">
                    #{prospect.rank} {prospect.name}
                  </p>
                  <p className="text-xs text-[color:var(--lg-mute)]">
                    {prospect.position} · {prospect.school} ·{" "}
                    {STAGE_LABEL[prospect.stage]}
                  </p>
                </div>
                <span className="text-xs font-bold text-[color:var(--lg-accent)]">
                  {prospect.grade}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {active ? (
          <article className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] px-5 py-5">
            <p className="lockgm-display text-sm font-bold tracking-[0.16em] text-[color:var(--lg-accent)]">
              SCOUTING REPORT
            </p>
            <h3 className="lockgm-display mt-2 text-3xl font-extrabold">
              {active.name}
            </h3>
            <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
              {active.position} · {active.school} · {active.height} ·{" "}
              {active.weight} lbs
              {active.forty ? ` · ${active.forty} forty` : ""} · grade{" "}
              {active.grade}
            </p>
            <p className="mt-4 text-base text-[color:var(--lg-text)]">
              {active.reportTeaser}
            </p>

            <div className="mt-5 border-t border-[color:var(--lg-line)] pt-4">
              <p className="text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
                Premium write-up
              </p>
              {canReadPremium ? (
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--lg-text)]">
                  {active.reportPremium}
                </p>
              ) : (
                <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
                  Locked — upgrade to <strong>War Room</strong> or{" "}
                  <strong>Pipeline</strong> for full reports.
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-[color:var(--lg-line)] pt-4">
              <p className="text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
                Multi-stage pipeline
              </p>
              {canSeeHsDeep || active.stage !== "high_school" ? (
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--lg-text)]">
                  {active.pipelineNote}
                </p>
              ) : (
                <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
                  HS deep tracking is a Pipeline tier feature.
                </p>
              )}
            </div>

            <ul className="mt-5 flex flex-wrap gap-2">
              {active.traits.map((trait) => (
                <li
                  key={trait}
                  className="border border-[color:var(--lg-line)] px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[color:var(--lg-accent)]"
                >
                  {trait}
                </li>
              ))}
            </ul>
          </article>
        ) : null}
      </div>
    </div>
  );
}
