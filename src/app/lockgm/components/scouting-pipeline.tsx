"use client";

import { useEffect, useMemo, useState } from "react";
import { useSport } from "@/lib/lockgm/sport-context";
import type { SubTierId } from "@/lib/lockgm/config";
import type { Prospect } from "@/lib/lockgm/sport-catalog";
import {
  BASKETBALL_HS_BOARD_YEAR,
  BASEBALL_MILB_BOARD_YEAR,
} from "@/lib/lockgm/sport-catalog";

function youtubeEmbedSrc(prospect: Prospect): string | null {
  if (prospect.highlightVideoId) {
    return `https://www.youtube-nocookie.com/embed/${prospect.highlightVideoId}`;
  }
  return null;
}

export function ScoutingPipeline({ tier = "free" }: { tier?: SubTierId }) {
  const { sport, franchise } = useSport();
  const stages = sport.stageOrder;
  const isHoopsBoard = sport.id === "basketball";
  const isMilbBoard = sport.id === "baseball";
  const [stage, setStage] = useState<string>(
    isHoopsBoard ? "high_school" : isMilbBoard ? "minors" : "all",
  );
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(
    franchise.prospects[0]?.id ?? null,
  );
  const canReadPremium = tier === "pro" || tier === "pipeline";
  const canSeeDeep = tier === "pipeline";

  useEffect(() => {
    setStage(
      sport.id === "basketball"
        ? "high_school"
        : sport.id === "baseball"
          ? "minors"
          : "all",
    );
    setQuery("");
    setActiveId(franchise.prospects[0]?.id ?? null);
  }, [franchise.prospects, sport.id]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...franchise.prospects]
      .filter((p) => (stage === "all" ? true : p.stage === stage))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.school.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q) ||
          String(p.rank).includes(q)
        );
      })
      .sort((a, b) => a.rank - b.rank);
  }, [franchise.prospects, stage, query]);

  const active: Prospect | null =
    list.find((p) => p.id === activeId) ?? list[0] ?? null;

  const earlyStage = stages[0];
  const embedSrc = active ? youtubeEmbedSrc(active) : null;

  return (
    <div className="space-y-6">
      {isHoopsBoard ? (
        <p className="text-sm text-[color:var(--lg-mute)]">
          <span className="font-bold text-[color:var(--lg-accent)]">
            HS Top {franchise.prospects.length}
          </span>{" "}
          · Class of {BASKETBALL_HS_BOARD_YEAR} national scouting board for
          Shadow GM work — search, grade, watch highlights, and write reports.
        </p>
      ) : null}
      {isMilbBoard ? (
        <p className="text-sm text-[color:var(--lg-mute)]">
          <span className="font-bold text-[color:var(--lg-accent)]">
            MiLB Top {franchise.prospects.length}
          </span>{" "}
          · {BASEBALL_MILB_BOARD_YEAR} minor-league board for Shadow GM work —
          search, grade, watch YouTube / MLB highlights, and write reports.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStage("all")}
          className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide uppercase ${
            stage === "all"
              ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
              : "border border-[color:var(--lg-line)] text-[color:var(--lg-mute)]"
          }`}
        >
          All stages
        </button>
        {stages.map((key) => (
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
            {sport.stages[key] ?? key}
          </button>
        ))}
      </div>

      <label className="block max-w-md text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
        Search board
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, school, position, or rank…"
          className="mt-1.5 w-full rounded-md border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 py-2 text-sm font-normal normal-case tracking-normal text-[color:var(--lg-text)]"
        />
      </label>

      <p className="text-xs text-[color:var(--lg-mute)]">
        Showing {list.length} of {franchise.prospects.length} prospects
      </p>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <ul className="max-h-[36rem] overflow-y-auto border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)]">
          {list.length === 0 ? (
            <li className="px-4 py-6 text-sm text-[color:var(--lg-mute)]">
              No prospects match that search.
            </li>
          ) : (
            list.map((prospect) => (
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
                      {prospect.highlightUrl ? (
                        <span
                          className="ml-2 text-[10px] font-bold tracking-wide text-[color:var(--lg-accent)] uppercase"
                          title="Highlights available"
                        >
                          ▶ clip
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[color:var(--lg-mute)]">
                      {prospect.position} · {prospect.school} ·{" "}
                      {sport.stages[prospect.stage] ?? prospect.stage}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[color:var(--lg-accent)]">
                    {prospect.grade}
                  </span>
                </button>
              </li>
            ))
          )}
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
              {active.metric != null
                ? ` · ${sport.metricLabel} ${active.metric}`
                : ""}{" "}
              · grade {active.grade}
            </p>
            <p className="mt-4 text-base text-[color:var(--lg-text)]">
              {active.reportTeaser}
            </p>

            {(active.highlightUrl ||
              active.highlightAltUrl ||
              embedSrc) && (
              <div className="mt-5 border-t border-[color:var(--lg-line)] pt-4">
                <p className="text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
                  Video highlights
                </p>
                {embedSrc ? (
                  <div className="mt-3 aspect-video w-full overflow-hidden border border-[color:var(--lg-line)] bg-black">
                    <iframe
                      title={`${active.name} highlights`}
                      src={embedSrc}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="mt-3 flex aspect-video w-full flex-col items-center justify-center gap-3 border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-4 text-center">
                    <p className="lockgm-display text-2xl font-extrabold text-[color:var(--lg-accent)]">
                      ▶
                    </p>
                    <p className="max-w-sm text-sm text-[color:var(--lg-mute)]">
                      Open highlight film for {active.name} on YouTube or MLB
                      Video — fresh search for this prospect.
                    </p>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {active.highlightUrl ? (
                    <a
                      href={active.highlightUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md bg-[color:var(--lg-accent)] px-3 py-2 text-xs font-bold tracking-wide text-[color:var(--lg-bg)] uppercase"
                    >
                      YouTube highlights
                    </a>
                  ) : null}
                  {active.highlightAltUrl ? (
                    <a
                      href={active.highlightAltUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-[color:var(--lg-line)] px-3 py-2 text-xs font-bold tracking-wide text-[color:var(--lg-text)] uppercase"
                    >
                      {isMilbBoard ? "MLB.com video" : "More film"}
                    </a>
                  ) : null}
                </div>
              </div>
            )}

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
                  Locked — upgrade to <strong>Reports</strong> or{" "}
                  <strong>All-Sports</strong> for full scouting write-ups.
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-[color:var(--lg-line)] pt-4">
              <p className="text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
                Multi-stage pipeline
              </p>
              {canSeeDeep || active.stage !== earlyStage ? (
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--lg-text)]">
                  {active.pipelineNote}
                </p>
              ) : (
                <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
                  Deep early-stage tracking is an All-Sports tier feature.
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
