"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { NFL_TEAMS } from "@/lib/lockgm/config";
import { PROSPECTS, type Prospect } from "@/lib/lockgm/prospects";

type PickRow = {
  pick: number;
  team: string;
  prospect: Prospect | null;
  at: string;
};

const PICK_INTERVAL_MS = 2800;

export function LiveDraftBoard() {
  const [pickIndex, setPickIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [picks, setPicks] = useState<PickRow[]>([]);
  const [available, setAvailable] = useState(() => new Set(PROSPECTS.map((p) => p.id)));
  const [, startTransition] = useTransition();

  const board = useMemo(
    () =>
      [...PROSPECTS]
        .filter((p) => available.has(p.id))
        .sort((a, b) => a.rank - b.rank),
    [available],
  );

  useEffect(() => {
    if (!running) return;
    if (pickIndex >= 32) {
      setRunning(false);
      return;
    }
    if (board.length === 0) {
      setRunning(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const next = board[0];
      if (!next) return;
      const team = NFL_TEAMS[pickIndex % NFL_TEAMS.length]!;
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
          },
          ...prev,
        ]);
        setPickIndex((n) => n + 1);
      });
    }, PICK_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [running, pickIndex, board]);

  function reset() {
    setRunning(false);
    setPickIndex(0);
    setPicks([]);
    setAvailable(new Set(PROSPECTS.map((p) => p.id)));
    window.setTimeout(() => setRunning(true), 200);
  }

  const onClockTeam = NFL_TEAMS[pickIndex % NFL_TEAMS.length];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full bg-[color:var(--lg-accent)] ${running ? "lg-live" : ""}`}
          />
          <p className="text-sm font-semibold text-[color:var(--lg-text)]">
            {running
              ? `LIVE · Pick ${pickIndex + 1} · ${onClockTeam} on the clock`
              : pickIndex >= 32
                ? "Round 1 complete"
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
            Restart sync
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
              <li
                key={prospect.id}
                className={`flex items-start justify-between gap-3 border-b border-[color:var(--lg-line)] px-4 py-3 text-sm ${
                  index === 0 && running
                    ? "bg-[color:var(--lg-accent)]/10"
                    : ""
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
                    Next up
                  </span>
                ) : null}
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
              Synced across Shadow GM rooms
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
