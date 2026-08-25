"use client";

import { useEffect, useState } from "react";
import { useSport } from "@/lib/lockgm/sport-context";
import {
  AI_SCOUT_PROFILES,
  formatReportNumber,
  loadNotebook,
  nextReportNumber,
  saveNotebook,
  type PersonalReport,
  type ScoutNotebook,
} from "@/lib/lockgm/scout-notebook";
import type { Prospect } from "@/lib/lockgm/sport-catalog";

type AgentBusy = {
  alpha: boolean;
  beta: boolean;
};

type ResearchJob = {
  prospectId: string;
  agent: "alpha" | "beta";
  lines: string[];
  done: boolean;
};

function alphaResearch(p: Prospect): string[] {
  return [
    `Tape pass 1 — ${p.name} (${p.position}): ${p.reportTeaser}`,
    `Traits tagged: ${p.traits.join(", ") || "pending"}.`,
    `Athletic note: ${p.metric != null ? `metric ${p.metric}` : "N/A"} · grade seed ${p.grade}.`,
    `Alpha draft: ${p.reportPremium.slice(0, 160)}…`,
  ];
}

function betaResearch(p: Prospect): string[] {
  return [
    `Comp grid — ${p.name} vs scheme needs.`,
    `Pipeline: ${p.pipelineNote}`,
    `Risk / value: projected hit $${p.capHitM}M · stage ${p.stage}.`,
    `Beta draft: Fit for win-now vs develop — recommend tabulating before draft day.`,
  ];
}

export function AiScoutAgents({
  onClaimed,
}: {
  onClaimed?: (report: PersonalReport) => void;
}) {
  const { sport, franchise, sportId } = useSport();
  const [notebook, setNotebook] = useState<ScoutNotebook>(() => emptySafe());
  const [targetId, setTargetId] = useState(franchise.prospects[0]?.id ?? "");
  const [busy, setBusy] = useState<AgentBusy>({ alpha: false, beta: false });
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [mergedText, setMergedText] = useState("");
  const [agentsUsed, setAgentsUsed] = useState<Array<"alpha" | "beta">>([]);

  useEffect(() => {
    setNotebook(loadNotebook());
  }, []);

  useEffect(() => {
    setTargetId(franchise.prospects[0]?.id ?? "");
    setJobs([]);
    setMergedText("");
    setAgentsUsed([]);
  }, [sportId, franchise.prospects]);

  const prospect =
    franchise.prospects.find((p) => p.id === targetId) ??
    franchise.prospects[0];

  function persist(next: ScoutNotebook) {
    setNotebook(next);
    saveNotebook(next);
  }

  function runAgent(agent: "alpha" | "beta") {
    if (!prospect || busy[agent]) return;
    setBusy((b) => ({ ...b, [agent]: true }));
    const lines =
      agent === "alpha" ? alphaResearch(prospect) : betaResearch(prospect);
    const job: ResearchJob = {
      prospectId: prospect.id,
      agent,
      lines: [],
      done: false,
    };
    setJobs((prev) => [...prev.filter((j) => !(j.agent === agent && j.prospectId === prospect.id)), job]);

    let i = 0;
    const tick = window.setInterval(() => {
      i += 1;
      setJobs((prev) =>
        prev.map((j) =>
          j.agent === agent && j.prospectId === prospect.id
            ? {
                ...j,
                lines: lines.slice(0, i),
                done: i >= lines.length,
              }
            : j,
        ),
      );
      if (i >= lines.length) {
        window.clearInterval(tick);
        setBusy((b) => ({ ...b, [agent]: false }));
        setAgentsUsed((prev) =>
          prev.includes(agent) ? prev : [...prev, agent],
        );
        setMergedText((prev) => {
          const block = lines.join("\n");
          const header = `\n\n— ${agent === "alpha" ? "Scout Alpha" : "Scout Beta"} —\n`;
          return (prev + header + block).trim();
        });
      }
    }, 550);
  }

  function claimAsMyReport() {
    if (!prospect || !mergedText.trim()) return;
    const number = nextReportNumber(notebook.reports);
    const report: PersonalReport = {
      id: `rep_${Date.now()}`,
      number,
      prospectId: prospect.id,
      prospectName: prospect.name,
      position: prospect.position,
      sportId,
      body: mergedText.trim(),
      grade: prospect.grade,
      agents: [...agentsUsed],
      status: "ready",
      updatedAt: new Date().toISOString(),
    };
    const next: ScoutNotebook = {
      ...notebook,
      reports: [report, ...notebook.reports],
    };
    persist(next);
    onClaimed?.(report);
    setMergedText("");
    setAgentsUsed([]);
    setJobs([]);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {AI_SCOUT_PROFILES.map((agent) => (
          <div
            key={agent.id}
            className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] px-4 py-4"
          >
            <p className="lockgm-display text-sm font-bold tracking-[0.16em] text-[color:var(--lg-accent)]">
              {agent.name.toUpperCase()}
            </p>
            <p className="mt-1 text-xs font-semibold text-[color:var(--lg-mute)]">
              {agent.role} · assigned research AI
            </p>
            <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
              {agent.blurb}
            </p>
            <button
              type="button"
              disabled={!prospect || busy[agent.id]}
              onClick={() => runAgent(agent.id)}
              className="mt-4 inline-flex h-10 items-center rounded-md bg-[color:var(--lg-accent)] px-4 text-sm font-bold text-[color:var(--lg-bg)] disabled:opacity-40"
            >
              {busy[agent.id]
                ? "Researching…"
                : `Run ${agent.name} on ${prospect?.name ?? "prospect"}`}
            </button>
          </div>
        ))}
      </div>

      <label className="block text-sm">
        <span className="font-bold text-[color:var(--lg-mute)]">
          Assign research target ({sport.name})
        </span>
        <select
          value={prospect?.id ?? ""}
          onChange={(e) => {
            setTargetId(e.target.value);
            setJobs([]);
            setMergedText("");
            setAgentsUsed([]);
          }}
          className="mt-2 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 py-2 text-sm text-[color:var(--lg-text)]"
        >
          {franchise.prospects.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.rank} {p.name} · {p.position}
            </option>
          ))}
        </select>
      </label>

      {jobs.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {jobs.map((job) => (
            <div
              key={`${job.agent}-${job.prospectId}`}
              className="border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-4 py-3 font-mono text-xs leading-relaxed text-[color:var(--lg-mute)]"
            >
              <p className="mb-2 font-bold text-[color:var(--lg-accent)]">
                {job.agent === "alpha" ? "Scout Alpha" : "Scout Beta"}
                {job.done ? " · complete" : " · live"}
              </p>
              {job.lines.map((line) => (
                <p key={line} className="mb-1">
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <p className="text-sm font-bold text-[color:var(--lg-mute)]">
          Merged research (edit before claiming)
        </p>
        <textarea
          value={mergedText}
          onChange={(e) => setMergedText(e.target.value)}
          rows={8}
          placeholder="Run Alpha and/or Beta, then edit this text — or type your own scouting report from scratch."
          className="mt-2 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] px-3 py-3 text-sm leading-relaxed text-[color:var(--lg-text)] placeholder:text-[color:var(--lg-mute)]"
        />
        <button
          type="button"
          disabled={!mergedText.trim()}
          onClick={claimAsMyReport}
          className="mt-3 inline-flex h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)] disabled:opacity-40"
        >
          Claim as{" "}
          {formatReportNumber(nextReportNumber(notebook.reports))} on my board
        </button>
      </div>
    </div>
  );
}

function emptySafe() {
  return {
    identity: { scoutNumber: "", displayName: "" },
    reports: [] as PersonalReport[],
    draftBeats: 0,
    draftMisses: 0,
  };
}
