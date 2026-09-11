"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useSport } from "@/lib/lockgm/sport-context";
import type { SubTierId } from "@/lib/lockgm/config";
import type { Prospect } from "@/lib/lockgm/sport-catalog";
import {
  BASKETBALL_HS_BOARD_YEAR,
  BASEBALL_MILB_BOARD_YEAR,
  FOOTBALL_COLLEGE_BOARD_YEAR,
} from "@/lib/lockgm/sport-catalog";
import {
  applyUpdatedOverlay,
  formatRefreshedAt,
  getUpdatedReport,
  loadUpdatedReports,
  refreshBoardReports,
  refreshOneReport,
  saveUpdatedReports,
  type UpdatedBoardReport,
  type UpdatedReportsStore,
} from "@/lib/lockgm/updated-reports";
import {
  formatReportNumber,
  loadNotebook,
  nextReportNumber,
  saveNotebook,
  type PersonalReport,
} from "@/lib/lockgm/scout-notebook";

function youtubeEmbedSrc(prospect: Prospect): string | null {
  if (prospect.highlightVideoId) {
    return `https://www.youtube-nocookie.com/embed/${prospect.highlightVideoId}`;
  }
  return null;
}

export function ScoutingPipeline({ tier = "free" }: { tier?: SubTierId }) {
  const { sport, franchise, sportId } = useSport();
  const stages = sport.stageOrder;
  const isHoopsBoard = sport.id === "basketball";
  const isMilbBoard = sport.id === "baseball";
  const isCollegeFootballBoard = sport.id === "football";
  const [stage, setStage] = useState<string>(
    isHoopsBoard
      ? "high_school"
      : isMilbBoard
        ? "minors"
        : isCollegeFootballBoard
          ? "all"
          : "all",
  );
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(
    franchise.prospects[0]?.id ?? null,
  );
  const [reportStore, setReportStore] = useState<UpdatedReportsStore>(() =>
    emptySafeStore(),
  );
  const [busy, setBusy] = useState<"one" | "board" | "scout" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canReadPremium = tier === "pro" || tier === "pipeline";
  const canSeeDeep = tier === "pipeline";

  useEffect(() => {
    setReportStore(loadUpdatedReports());
  }, []);

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

  const activeBase: Prospect | null =
    list.find((p) => p.id === activeId) ?? list[0] ?? null;

  const activeOverlay: UpdatedBoardReport | null = activeBase
    ? getUpdatedReport(reportStore, sportId, activeBase.id)
    : null;

  const active: Prospect | null = activeBase
    ? applyUpdatedOverlay(activeBase, activeOverlay)
    : null;

  const earlyStage = stages[0];
  const embedSrc = active ? youtubeEmbedSrc(active) : null;
  const updatedCount = franchise.prospects.filter((p) =>
    Boolean(getUpdatedReport(reportStore, sportId, p.id)),
  ).length;

  function persistStore(next: UpdatedReportsStore) {
    setReportStore(next);
    saveUpdatedReports(next);
  }

  function showFlash(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 3200);
  }

  function refreshActive() {
    if (!activeBase || busy) return;
    setBusy("one");
    startTransition(() => {
      const { store, report } = refreshOneReport(
        loadUpdatedReports(),
        sportId,
        activeBase,
        ["alpha"],
      );
      persistStore(store);
      setBusy(null);
      showFlash(
        `Refreshed report for ${activeBase.name} (pass #${report.refreshCount}).`,
      );
    });
  }

  function runAiScoutOnActive() {
    if (!activeBase || busy) return;
    setBusy("scout");
    startTransition(() => {
      const latestStore = loadUpdatedReports();
      const { store, report } = refreshOneReport(
        latestStore,
        sportId,
        activeBase,
        ["alpha", "beta"],
      );
      persistStore(store);

      // Also tabulate a personal SR so the Reports desk stays in sync.
      const notebook = loadNotebook();
      const personal: PersonalReport = {
        id: `rep_${Date.now()}`,
        number: nextReportNumber(notebook.reports),
        prospectId: activeBase.id,
        prospectName: activeBase.name,
        position: activeBase.position,
        sportId,
        body: [
          `— Scout Alpha + Scout Beta (board refresh) —`,
          report.reportTeaser,
          "",
          report.reportPremium,
        ].join("\n"),
        grade: activeBase.grade,
        agents: ["alpha", "beta"],
        status: "ready",
        updatedAt: report.refreshedAt,
      };
      saveNotebook({
        ...notebook,
        reports: [personal, ...notebook.reports],
      });

      setBusy(null);
      showFlash(
        `AI scout ran on ${activeBase.name} · claimed ${formatReportNumber(personal.number)}.`,
      );
    });
  }

  function refreshEntireBoard() {
    if (busy || franchise.prospects.length === 0) return;
    setBusy("board");
    startTransition(() => {
      const next = refreshBoardReports(
        loadUpdatedReports(),
        sportId,
        franchise.prospects,
        ["alpha", "beta"],
      );
      persistStore(next);
      setBusy(null);
      showFlash(
        `Updated scouting reports for all ${franchise.prospects.length} talents on this board.`,
      );
    });
  }

  return (
    <div className="space-y-6">
      {isHoopsBoard ? (
        <p className="text-sm text-[color:var(--lg-mute)]">
          <span className="font-bold text-[color:var(--lg-accent)]">
            HS Top {franchise.prospects.length}
          </span>{" "}
          · Class of {BASKETBALL_HS_BOARD_YEAR} national scouting board for
          Shadow GM work — search, grade, refresh reports, watch highlights.
        </p>
      ) : null}
      {isMilbBoard ? (
        <p className="text-sm text-[color:var(--lg-mute)]">
          <span className="font-bold text-[color:var(--lg-accent)]">
            MiLB Top {franchise.prospects.length}
          </span>{" "}
          · {BASEBALL_MILB_BOARD_YEAR} minor-league board for Shadow GM work —
          search, grade, refresh reports, watch YouTube / MLB highlights.
        </p>
      ) : null}
      {isCollegeFootballBoard ? (
        <p className="text-sm text-[color:var(--lg-mute)]">
          <span className="font-bold text-[color:var(--lg-accent)]">
            College Top {franchise.prospects.length}
          </span>{" "}
          · {FOOTBALL_COLLEGE_BOARD_YEAR} juniors & seniors for Shadow GM work —
          search, grade, refresh reports, play verified clips.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={Boolean(busy) || franchise.prospects.length === 0}
          onClick={refreshEntireBoard}
          className="rounded-md bg-[color:var(--lg-accent)] px-3 py-2 text-xs font-bold tracking-wide text-[color:var(--lg-bg)] uppercase disabled:opacity-40"
        >
          {busy === "board"
            ? "Refreshing board…"
            : `Refresh all ${franchise.prospects.length} reports`}
        </button>
        <p className="text-xs text-[color:var(--lg-mute)]">
          {updatedCount} of {franchise.prospects.length} talents have a
          refreshed board report
          {pending ? " · working…" : ""}
        </p>
      </div>
      {flash ? (
        <p className="text-sm font-bold text-[color:var(--lg-accent)]">{flash}</p>
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
            list.map((prospect) => {
              const overlay = getUpdatedReport(
                reportStore,
                sportId,
                prospect.id,
              );
              return (
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
                        {prospect.highlightVideoId || prospect.highlightUrl ? (
                          <span
                            className="ml-2 text-[10px] font-bold tracking-wide text-[color:var(--lg-accent)] uppercase"
                            title={
                              prospect.highlightVideoId
                                ? "Verified highlight clip"
                                : "Highlight search available"
                            }
                          >
                            {prospect.highlightVideoId ? "▶ clip" : "▶ film"}
                          </span>
                        ) : null}
                        {overlay ? (
                          <span
                            className="ml-2 text-[10px] font-bold tracking-wide text-[color:var(--lg-accent)] uppercase"
                            title={`Refreshed ${formatRefreshedAt(overlay.refreshedAt)}`}
                          >
                            updated
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
              );
            })
          )}
        </ul>

        {active && activeBase ? (
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

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={refreshActive}
                className="rounded-md bg-[color:var(--lg-accent)] px-3 py-2 text-xs font-bold tracking-wide text-[color:var(--lg-bg)] uppercase disabled:opacity-40"
              >
                {busy === "one" ? "Refreshing…" : "Refresh report"}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={runAiScoutOnActive}
                className="rounded-md border border-[color:var(--lg-line)] px-3 py-2 text-xs font-bold tracking-wide text-[color:var(--lg-text)] uppercase disabled:opacity-40"
              >
                {busy === "scout" ? "Scouting…" : "Run AI scout"}
              </button>
            </div>
            {activeOverlay ? (
              <p className="mt-2 text-xs text-[color:var(--lg-mute)]">
                Updated {formatRefreshedAt(activeOverlay.refreshedAt)} · pass #
                {activeOverlay.refreshCount}
                {activeOverlay.agents.length
                  ? ` · ${activeOverlay.agents.join(" + ")}`
                  : ""}
              </p>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--lg-mute)]">
                Seed teaser — refresh or run AI scout for a fresh LockedGM write-up.
                Shadow can update teasers; Reports / All-Sports unlock full premium
                text.
              </p>
            )}

            <p className="mt-4 text-base text-[color:var(--lg-text)]">
              {active.reportTeaser}
            </p>

            {(active.highlightUrl ||
              active.highlightAltUrl ||
              embedSrc) && (
              <div className="mt-5 border-t border-[color:var(--lg-line)] pt-4">
                <p className="text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
                  Video highlights
                  {embedSrc ? (
                    <span className="ml-2 text-[color:var(--lg-accent)]">
                      · verified clip
                    </span>
                  ) : (
                    <span className="ml-2">· search film</span>
                  )}
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
                      Open highlight film for {active.name} on YouTube
                      {isMilbBoard ? " or MLB Video" : ""} — fresh search for
                      this prospect.
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
                  Shadow still refreshes the public teaser above.
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

function emptySafeStore(): UpdatedReportsStore {
  return { byKey: {} };
}
