"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSport } from "@/lib/lockgm/sport-context";
import {
  formatReportNumber,
  loadNotebook,
  saveNotebook,
  type ScoutNotebook,
} from "@/lib/lockgm/scout-notebook";
import type { Prospect } from "@/lib/lockgm/sport-catalog";

type PickRow = {
  pick: number;
  team: string;
  prospect: Prospect | null;
  at: string;
  shadowResult: "beat" | "miss" | "none";
  shadowPickName?: string;
};

const PICK_WINDOW_MS = 6500;

export function LiveDraftBoard() {
  const { sport, franchise, sportId } = useSport();
  const teams = franchise.teams;
  const prospects = franchise.prospects;

  const [pickIndex, setPickIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [picks, setPicks] = useState<PickRow[]>([]);
  const [available, setAvailable] = useState(
    () => new Set(prospects.map((p) => p.id)),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lockedThisPick, setLockedThisPick] = useState(false);
  const [shadowLock, setShadowLock] = useState<Prospect | null>(null);
  const [clockMs, setClockMs] = useState(PICK_WINDOW_MS);
  const [notebook, setNotebook] = useState<ScoutNotebook | null>(null);
  const [, startTransition] = useTransition();

  const shadowLockRef = useRef<Prospect | null>(null);
  const notebookRef = useRef<ScoutNotebook | null>(null);
  const maxPicks = Math.min(24, Math.max(12, teams.length));

  useEffect(() => {
    const n = loadNotebook();
    setNotebook(n);
    notebookRef.current = n;
  }, []);

  useEffect(() => {
    setPickIndex(0);
    setPicks([]);
    setAvailable(new Set(prospects.map((p) => p.id)));
    setSelectedId(null);
    setLockedThisPick(false);
    setShadowLock(null);
    shadowLockRef.current = null;
    setClockMs(PICK_WINDOW_MS);
    setRunning(true);
  }, [sportId, prospects]);

  const board = useMemo(
    () =>
      [...prospects]
        .filter((p) => available.has(p.id))
        .sort((a, b) => a.rank - b.rank),
    [available, prospects],
  );

  const myLockedReports = useMemo(() => {
    if (!notebook) return [];
    return notebook.reports.filter(
      (r) =>
        r.status === "locked_for_draft" &&
        r.sportId === sportId &&
        available.has(r.prospectId),
    );
  }, [notebook, sportId, available]);

  const onClockTeam = teams[pickIndex % teams.length];
  const roundDone = pickIndex >= maxPicks || board.length === 0;

  useEffect(() => {
    if (!running || roundDone) return;

    setClockMs(PICK_WINDOW_MS);
    const started = Date.now();
    const tick = window.setInterval(() => {
      setClockMs(Math.max(0, PICK_WINDOW_MS - (Date.now() - started)));
    }, 100);

    const timer = window.setTimeout(() => {
      const next = board[0];
      if (!next) return;
      const team = teams[pickIndex % teams.length]!;
      const locked = shadowLockRef.current;
      let result: PickRow["shadowResult"] = "none";
      let shadowPickName: string | undefined;
      if (locked) {
        shadowPickName = locked.name;
        result = locked.id === next.id ? "beat" : "miss";
      }

      startTransition(() => {
        setAvailable((prev) => {
          const copy = new Set(prev);
          copy.delete(next.id);
          return copy;
        });
        setPicks((prev) => [
          {
            pick: pickIndex + 1,
            team,
            prospect: next,
            at: new Date().toLocaleTimeString(),
            shadowResult: result,
            shadowPickName,
          },
          ...prev,
        ]);
        if (notebookRef.current && result !== "none") {
          const updated: ScoutNotebook = {
            ...notebookRef.current,
            draftBeats:
              notebookRef.current.draftBeats + (result === "beat" ? 1 : 0),
            draftMisses:
              notebookRef.current.draftMisses + (result === "miss" ? 1 : 0),
          };
          notebookRef.current = updated;
          setNotebook(updated);
          saveNotebook(updated);
        }
        setPickIndex((n) => n + 1);
        setLockedThisPick(false);
        setShadowLock(null);
        shadowLockRef.current = null;
        setSelectedId(null);
      });
    }, PICK_WINDOW_MS);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timer);
    };
  }, [running, pickIndex, roundDone, board, teams, maxPicks]);

  function lockPick() {
    if (!selectedId || lockedThisPick || !running || roundDone) return;
    const prospect = board.find((p) => p.id === selectedId);
    if (!prospect) return;
    shadowLockRef.current = prospect;
    setShadowLock(prospect);
    setLockedThisPick(true);
  }

  function reset() {
    setRunning(false);
    setPickIndex(0);
    setPicks([]);
    setAvailable(new Set(prospects.map((p) => p.id)));
    setSelectedId(null);
    setLockedThisPick(false);
    setShadowLock(null);
    shadowLockRef.current = null;
    setClockMs(PICK_WINDOW_MS);
    window.setTimeout(() => setRunning(true), 200);
  }

  const seconds = (clockMs / 1000).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full bg-[color:var(--lg-accent)] ${running && !roundDone ? "lg-live" : ""}`}
          />
          <p className="text-sm font-semibold text-[color:var(--lg-text)]">
            {roundDone
              ? `${sport.entryEvent} segment complete`
              : running
                ? `LIVE · Pick ${pickIndex + 1} · ${onClockTeam} on the clock · ${seconds}s`
                : "Paused"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRunning((v) => !v)}
            className="rounded-md border border-[color:var(--lg-line)] px-3 py-1.5 text-sm font-bold"
          >
            {running ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-[color:var(--lg-accent)] px-3 py-1.5 text-sm font-bold text-[color:var(--lg-bg)]"
          >
            Restart draft day
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border-t border-[color:var(--lg-line)] pt-3">
          <p className="text-[11px] font-bold tracking-[0.16em] text-[color:var(--lg-mute)] uppercase">
            Your beats
          </p>
          <p className="lockgm-display mt-1 text-3xl font-extrabold text-[color:var(--lg-accent)]">
            {notebook?.draftBeats ?? 0}
          </p>
        </div>
        <div className="border-t border-[color:var(--lg-line)] pt-3">
          <p className="text-[11px] font-bold tracking-[0.16em] text-[color:var(--lg-mute)] uppercase">
            Misses
          </p>
          <p className="lockgm-display mt-1 text-3xl font-extrabold text-[color:var(--lg-warn)]">
            {notebook?.draftMisses ?? 0}
          </p>
        </div>
        <div className="border-t border-[color:var(--lg-line)] pt-3">
          <p className="text-[11px] font-bold tracking-[0.16em] text-[color:var(--lg-mute)] uppercase">
            Scout #
          </p>
          <p className="lockgm-display mt-1 text-2xl font-extrabold">
            {notebook?.identity.scoutNumber || "—"}
          </p>
        </div>
      </div>

      <div className="border border-[color:var(--lg-accent)]/40 bg-[color:var(--lg-accent)]/5 px-4 py-4">
        <p className="lockgm-display text-sm font-bold tracking-[0.16em] text-[color:var(--lg-accent)]">
          BEAT THE PICK
        </p>
        <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
          Lock the player you think <strong className="text-[color:var(--lg-text)]">{onClockTeam}</strong> will
          take — <strong className="text-[color:var(--lg-text)]">before</strong> their
          clock hits zero. Call the same name and you beat the room.
        </p>
        {myLockedReports.length > 0 ? (
          <p className="mt-2 text-xs text-[color:var(--lg-mute)]">
            Ready from your board:{" "}
            {myLockedReports
              .map((r) => `${formatReportNumber(r.number)} ${r.prospectName}`)
              .join(" · ")}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={selectedId ?? ""}
            disabled={lockedThisPick || !running || roundDone}
            onChange={(e) => setSelectedId(e.target.value || null)}
            className="min-w-[14rem] border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 py-2 text-sm"
          >
            <option value="">Select prospect…</option>
            {board.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.rank} {p.name} · {p.position}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedId || lockedThisPick || !running || roundDone}
            onClick={lockPick}
            className="inline-flex h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)] disabled:opacity-40"
          >
            {lockedThisPick
              ? `LOCKED · ${shadowLock?.name}`
              : "Lock my pick now"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)]">
          <div className="border-b border-[color:var(--lg-line)] px-4 py-3">
            <p className="lockgm-display text-sm font-bold tracking-[0.16em] text-[color:var(--lg-accent)]">
              AVAILABLE BOARD
            </p>
            <p className="mt-1 text-xs text-[color:var(--lg-mute)]">
              Auto-removes the moment a player is drafted
            </p>
          </div>
          <ul className="max-h-[32rem] overflow-y-auto">
            {board.map((prospect, index) => (
              <li key={prospect.id}>
                <button
                  type="button"
                  onClick={() =>
                    !lockedThisPick && setSelectedId(prospect.id)
                  }
                  className={`flex w-full items-start justify-between gap-3 border-b border-[color:var(--lg-line)] px-4 py-3 text-left text-sm ${
                    selectedId === prospect.id
                      ? "bg-[color:var(--lg-accent)]/15"
                      : index === 0 && running
                        ? "bg-[color:var(--lg-accent)]/10"
                        : "hover:bg-white/5"
                  }`}
                >
                  <div>
                    <p className="font-bold text-[color:var(--lg-text)]">
                      <span className="text-[color:var(--lg-mute)]">
                        #{prospect.rank}
                      </span>{" "}
                      {prospect.name}
                    </p>
                    <p className="text-xs text-[color:var(--lg-mute)]">
                      {prospect.position} · {prospect.school} · grade{" "}
                      {prospect.grade}
                    </p>
                  </div>
                  {index === 0 && running ? (
                    <span className="shrink-0 text-[10px] font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
                      Consensus #1
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
            {board.length === 0 ? (
              <li className="px-4 py-8 text-sm text-[color:var(--lg-mute)]">
                Board cleared.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)]">
          <div className="border-b border-[color:var(--lg-line)] px-4 py-3">
            <p className="lockgm-display text-sm font-bold tracking-[0.16em] text-[color:var(--lg-accent)]">
              PICK FEED
            </p>
            <p className="mt-1 text-xs text-[color:var(--lg-mute)]">
              Live {sport.entryEvent.toLowerCase()} · your beat/miss logged
            </p>
          </div>
          <ul className="max-h-[32rem] overflow-y-auto">
            {picks.length === 0 ? (
              <li className="px-4 py-8 text-sm text-[color:var(--lg-mute)]">
                Waiting for the first pick…
              </li>
            ) : (
              picks.map((row) => (
                <li
                  key={`${row.pick}-${row.prospect?.id}`}
                  className="border-b border-[color:var(--lg-line)] px-4 py-3 text-sm"
                >
                  <p className="font-bold text-[color:var(--lg-text)]">
                    Pick {row.pick} · {row.team}
                  </p>
                  <p className="mt-1 text-[color:var(--lg-accent)]">
                    {row.prospect?.name}{" "}
                    <span className="text-[color:var(--lg-mute)]">
                      {row.prospect?.position} · {row.prospect?.school}
                    </span>
                  </p>
                  <p className="mt-1 text-[10px] text-[color:var(--lg-mute)]">
                    {row.at} · removed from all boards
                    {row.shadowResult === "beat"
                      ? ` · YOU BEAT IT (${row.shadowPickName})`
                      : row.shadowResult === "miss"
                        ? ` · miss (you locked ${row.shadowPickName})`
                        : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
