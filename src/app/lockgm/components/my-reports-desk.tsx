"use client";

import { useEffect, useMemo, useState } from "react";
import { useSport } from "@/lib/lockgm/sport-context";
import {
  formatReportNumber,
  loadNotebook,
  nextReportNumber,
  saveNotebook,
  type PersonalReport,
  type ScoutNotebook,
} from "@/lib/lockgm/scout-notebook";

export function MyReportsDesk() {
  const { sportId, franchise } = useSport();
  const [notebook, setNotebook] = useState<ScoutNotebook>(empty);
  const [scoutNumber, setScoutNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [prospectId, setProspectId] = useState("");
  const [body, setBody] = useState("");
  const [grade, setGrade] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "locked_for_draft">(
    "all",
  );

  useEffect(() => {
    const n = loadNotebook();
    setNotebook(n);
    setScoutNumber(n.identity.scoutNumber);
    setDisplayName(n.identity.displayName);
  }, []);

  useEffect(() => {
    setProspectId(franchise.prospects[0]?.id ?? "");
  }, [sportId, franchise.prospects]);

  function persist(next: ScoutNotebook) {
    setNotebook(next);
    saveNotebook(next);
  }

  function saveIdentity() {
    persist({
      ...notebook,
      identity: {
        scoutNumber: scoutNumber.trim().toUpperCase() || "SC-0000",
        displayName: displayName.trim() || "Shadow GM",
      },
    });
  }

  function addTypedReport() {
    const prospect =
      franchise.prospects.find((p) => p.id === prospectId) ??
      franchise.prospects[0];
    if (!prospect || !body.trim()) return;
    const latest = loadNotebook();
    const identity = {
      scoutNumber:
        scoutNumber.trim().toUpperCase() ||
        latest.identity.scoutNumber ||
        "SC-0000",
      displayName:
        displayName.trim() || latest.identity.displayName || "Shadow GM",
    };
    const number = nextReportNumber(latest.reports);
    const report: PersonalReport = {
      id: `rep_${Date.now()}`,
      number,
      prospectId: prospect.id,
      prospectName: prospect.name,
      position: prospect.position,
      sportId,
      body: body.trim(),
      grade: grade ? Number(grade) : null,
      agents: [],
      status: "ready",
      updatedAt: new Date().toISOString(),
    };
    persist({
      ...latest,
      identity,
      reports: [report, ...latest.reports],
    });
    setScoutNumber(identity.scoutNumber);
    setDisplayName(identity.displayName);
    setBody("");
    setGrade("");
  }

  function setStatus(id: string, status: PersonalReport["status"]) {
    const latest = loadNotebook();
    persist({
      ...latest,
      reports: latest.reports.map((r) =>
        r.id === id
          ? { ...r, status, updatedAt: new Date().toISOString() }
          : r,
      ),
    });
  }

  function removeReport(id: string) {
    const latest = loadNotebook();
    persist({
      ...latest,
      reports: latest.reports.filter((r) => r.id !== id),
    });
  }

  const listed = useMemo(() => {
    return notebook.reports
      .filter((r) => (filter === "all" ? true : r.status === filter))
      .filter((r) => r.sportId === sportId || filter === "all")
      .sort((a, b) => b.number - a.number);
  }, [notebook.reports, filter, sportId]);

  const readyCount = notebook.reports.filter(
    (r) => r.status === "ready" || r.status === "locked_for_draft",
  ).length;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm sm:col-span-1">
          <span className="font-bold text-[color:var(--lg-mute)]">
            Your scout / customer #
          </span>
          <input
            value={scoutNumber}
            onChange={(e) => setScoutNumber(e.target.value)}
            placeholder="SC-1042"
            className="mt-2 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm sm:col-span-1">
          <span className="font-bold text-[color:var(--lg-mute)]">
            Display name
          </span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Shadow GM"
            className="mt-2 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 py-2 text-sm"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={saveIdentity}
            className="h-10 w-full rounded-md border border-[color:var(--lg-line)] text-sm font-bold hover:border-[color:var(--lg-accent)]"
          >
            Save identity
          </button>
        </div>
      </div>

      <p className="text-sm text-[color:var(--lg-mute)]">
        {notebook.identity.scoutNumber ? (
          <>
            Board owned by{" "}
            <span className="font-bold text-[color:var(--lg-accent)]">
              {notebook.identity.scoutNumber}
            </span>
            {notebook.identity.displayName
              ? ` · ${notebook.identity.displayName}`
              : ""}{" "}
            · {readyCount} report{readyCount === 1 ? "" : "s"} tabulated for
            draft day
          </>
        ) : (
          <>Key in your customer / scout number so every SR-### report is yours.</>
        )}
      </p>

      <div className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] px-4 py-5">
        <p className="lockgm-display text-sm font-bold tracking-[0.16em] text-[color:var(--lg-accent)]">
          TYPE YOUR REPORT
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-[color:var(--lg-mute)]">Prospect</span>
            <select
              value={prospectId}
              onChange={(e) => setProspectId(e.target.value)}
              className="mt-1 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 py-2"
            >
              {franchise.prospects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.position}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-[color:var(--lg-mute)]">Your grade (optional)</span>
            <input
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              type="number"
              min={50}
              max={99}
              placeholder="88"
              className="mt-1 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 py-2"
            />
          </label>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Word it in — strengths, risks, scheme fit, draft-day plan…"
          className="mt-3 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 py-3 text-sm leading-relaxed"
        />
        <button
          type="button"
          onClick={addTypedReport}
          disabled={!body.trim()}
          className="mt-3 inline-flex h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)] disabled:opacity-40"
        >
          Tabulate as {formatReportNumber(nextReportNumber(notebook.reports))}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All reports"],
            ["ready", "Ready"],
            ["locked_for_draft", "Locked for draft day"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              filter === id
                ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
                : "border border-[color:var(--lg-line)] text-[color:var(--lg-mute)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-[color:var(--lg-line)] border-t border-[color:var(--lg-line)]">
        {listed.length === 0 ? (
          <li className="py-8 text-sm text-[color:var(--lg-mute)]">
            No reports yet — run the AI scouts or type one in and tabulate it.
          </li>
        ) : (
          listed.map((report) => (
            <li key={report.id} className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="lockgm-display text-xl font-bold text-[color:var(--lg-accent)]">
                    {formatReportNumber(report.number)}
                  </p>
                  <p className="mt-1 font-bold">
                    {report.prospectName}{" "}
                    <span className="text-[color:var(--lg-mute)]">
                      · {report.position}
                      {report.grade != null ? ` · grade ${report.grade}` : ""}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--lg-mute)]">
                    Status: {report.status.replaceAll("_", " ")}
                    {report.agents.length
                      ? ` · AI: ${report.agents.join(" + ")}`
                      : " · handwritten"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.status !== "locked_for_draft" ? (
                    <button
                      type="button"
                      onClick={() => setStatus(report.id, "locked_for_draft")}
                      className="rounded-md bg-[color:var(--lg-accent)] px-3 py-1.5 text-xs font-bold text-[color:var(--lg-bg)]"
                    >
                      Lock for draft day
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStatus(report.id, "ready")}
                      className="rounded-md border border-[color:var(--lg-line)] px-3 py-1.5 text-xs font-bold"
                    >
                      Unlock
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeReport(report.id)}
                    className="rounded-md border border-[color:var(--lg-line)] px-3 py-1.5 text-xs font-bold text-[color:var(--lg-warn)]"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--lg-mute)]">
                {report.body}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function empty(): ScoutNotebook {
  return {
    identity: { scoutNumber: "", displayName: "" },
    reports: [],
    draftBeats: 0,
    draftMisses: 0,
  };
}
