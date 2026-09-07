"use client";

import { useMemo, useState, useTransition } from "react";
import {
  MLB_2026_DIVISIONS,
  classicTeamById,
  classicTeamLabel,
} from "@/lib/lockgm/strat-sim";
import type { Mlb2026LeagueBoard } from "@/lib/lockgm/mlb-2026-league";
import {
  assign2026ClubToAiAction,
  claim2026ClubAction,
} from "./actions";

function statusLabel(status: "open" | "claimed" | "ai"): string {
  if (status === "claimed") return "Claimed";
  if (status === "ai") return "AI";
  return "Open";
}

export function Mlb2026ClaimBoard({
  gmId,
  initialBoard,
}: {
  gmId: string;
  initialBoard: Mlb2026LeagueBoard;
}) {
  const [board, setBoard] = useState(initialBoard);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mine = useMemo(
    () => board.slots.find((slot) => slot.gmId === gmId) ?? null,
    [board.slots, gmId],
  );

  function run(
    action: Promise<{ ok: boolean; board?: Mlb2026LeagueBoard; error?: string }>,
  ) {
    startTransition(async () => {
      const result = await action;
      if (!result.ok) {
        setMessage(result.error ?? "Action failed.");
        return;
      }
      if (result.board) setBoard(result.board);
      setMessage(null);
    });
  }

  return (
    <div className="space-y-10">
      <p className="text-sm text-[color:var(--lg-mute)]">
        Signed in as <span className="font-bold text-[color:var(--lg-text)]">{gmId}</span>
        {mine
          ? ` · you claimed ${classicTeamById(mine.teamId) ? classicTeamLabel(classicTeamById(mine.teamId)!) : mine.teamId}`
          : " · pick one club"}
        . One GM per team. Open clubs can be claimed or assigned to an AI manager.
      </p>
      {message ? (
        <p className="text-sm text-[color:var(--lg-accent)]" role="status">
          {message}
        </p>
      ) : null}

      {Object.entries(MLB_2026_DIVISIONS).map(([division, ids]) => (
        <section key={division}>
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            {division}
          </p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ids.map((teamId) => {
              const slot = board.slots.find((row) => row.teamId === teamId);
              const team = classicTeamById(teamId);
              if (!slot || !team) return null;
              const mineHere = slot.gmId === gmId;
              return (
                <li
                  key={teamId}
                  className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="lockgm-display text-xl font-extrabold">
                        {team.abbrev}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--lg-text)]">
                        {classicTeamLabel(team)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[11px] font-bold uppercase tracking-wide ${
                        slot.status === "open"
                          ? "text-[color:var(--lg-accent)]"
                          : "text-[color:var(--lg-mute)]"
                      }`}
                    >
                      {statusLabel(slot.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[color:var(--lg-mute)]">
                    {slot.status === "claimed"
                      ? slot.displayName || slot.gmId
                      : slot.status === "ai"
                        ? "AI manager"
                        : "Available"}
                  </p>
                  {slot.status === "open" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {mine ? null : (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(claim2026ClubAction(teamId))}
                          className="inline-flex min-h-10 items-center rounded-md bg-[color:var(--lg-accent)] px-3 text-xs font-bold text-[color:var(--lg-bg)] disabled:opacity-50"
                        >
                          Claim {team.abbrev}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(assign2026ClubToAiAction(teamId))}
                        className="inline-flex min-h-10 items-center rounded-md border border-[color:var(--lg-line)] px-3 text-xs font-bold disabled:opacity-50"
                      >
                        Assign AI
                      </button>
                    </div>
                  ) : mineHere ? (
                    <p className="mt-3 text-xs font-bold text-[color:var(--lg-accent)]">
                      Your club
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
