"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CLASSIC_TEAMS,
  classicTeamById,
  classicTeamLabel,
  defaultManagerCard,
  type ManagerCard,
} from "@/lib/lockgm/strat-sim";
import {
  broadcastPlayIndex,
  isBroadcastComplete,
  type LiveStandingRow,
  type PublicLiveMatchup,
} from "@/lib/lockgm/live-matchup-shared";
import {
  claimLiveMatchupAction,
  createLiveMatchupAction,
  inviteMemberByGmIdAction,
  lockCardAction,
  pickTeamAction,
  refreshLiveMatchupAction,
  scheduleMatchupAction,
  startMatchupAction,
  unlockCardAction,
} from "@/app/lockgm/live/actions";
import { AdRibbon } from "@/app/lockgm/components/ad-ribbon";
import { ManagerDesk } from "@/app/lockgm/components/manager-desk";

function recordLine(wins: number, losses: number, ties: number): string {
  return ties > 0 ? `${wins}–${losses}–${ties}` : `${wins}–${losses}`;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LiveStandingsTable({
  standings,
  empty = "Standings are empty until two GMs lock and first pitch runs.",
}: {
  standings: LiveStandingRow[];
  empty?: string;
}) {
  if (standings.length === 0) {
    return <p className="mt-4 text-sm text-[color:var(--lg-mute)]">{empty}</p>;
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[20rem] text-left text-sm">
        <thead>
          <tr className="border-b border-[color:var(--lg-line)] text-xs tracking-wide text-[color:var(--lg-mute)]">
            <th className="py-2 pr-3 font-bold">GM</th>
            <th className="py-2 pr-3 font-bold">Club</th>
            <th className="py-2 pr-3 font-bold">W</th>
            <th className="py-2 pr-3 font-bold">L</th>
            <th className="py-2 font-bold">T</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => {
            const team = classicTeamById(row.teamId);
            return (
              <tr
                key={`${row.gmId}-${row.teamId}`}
                className="border-b border-[color:var(--lg-line)]/70"
              >
                <td className="py-2 pr-3 font-semibold">{row.displayName}</td>
                <td className="py-2 pr-3 text-[color:var(--lg-mute)]">
                  {team ? classicTeamLabel(team) : row.teamId}
                </td>
                <td className="py-2 pr-3 tabular-nums">{row.wins}</td>
                <td className="py-2 pr-3 tabular-nums">{row.losses}</td>
                <td className="py-2 tabular-nums">{row.ties}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LiveMatchupLobby({
  gmId,
  initialRooms,
  initialStandings,
}: {
  gmId: string;
  initialRooms: PublicLiveMatchup[];
  initialStandings: LiveStandingRow[];
}) {
  const router = useRouter();
  const [rooms, setRooms] = useState(initialRooms);
  const [standings] = useState(initialStandings);
  const [name, setName] = useState("Friday Night Live");
  const [market, setMarket] = useState("local");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function createRoom() {
    startTransition(async () => {
      const result = await createLiveMatchupAction({ name, market });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setRooms((current) => [
        result.room,
        ...current.filter((r) => r.id !== result.room.id),
      ]);
      setMessage("Room opened — invite a GM, claim clubs, then schedule.");
      router.push(`/lockgm/live/${result.room.id}`);
    });
  }

  return (
    <div className="space-y-10">
      <section className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-6">
        <p className="text-xs font-bold tracking-[0.18em] text-[color:var(--lg-accent)]">
          HOST A LIVE MATCHUP
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--lg-mute)]">
          Two humans claim classic clubs, one invites or shares a join link,
          you schedule tip-off, both lock the same /sim cards, then first pitch
          runs and the standings move.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-bold">Room name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 block min-h-11 w-full rounded-md border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 text-[color:var(--lg-text)]"
            />
          </label>
          <label className="text-sm">
            <span className="font-bold">Ad market</span>
            <input
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="local"
              className="mt-2 block min-h-11 w-full rounded-md border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 text-[color:var(--lg-text)]"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={createRoom}
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)] disabled:opacity-60"
        >
          {pending ? "Opening…" : "Open live room"}
        </button>
        {message ? (
          <p className="mt-4 text-sm text-[color:var(--lg-accent)]" role="status">
            {message}
          </p>
        ) : null}
      </section>

      <section className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-6">
        <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
          LIVE LEAGUE STANDINGS
        </p>
        <LiveStandingsTable standings={standings} />
      </section>

      <section>
        <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
          YOUR OPEN ROOMS · {gmId}
        </p>
        {rooms.length === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--lg-mute)]">
            No open matchups yet. Host one, or wait for an invite link from a
            fellow GM.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] px-4 py-3"
              >
                <div>
                  <p className="font-bold text-[color:var(--lg-text)]">{room.name}</p>
                  <p className="text-xs text-[color:var(--lg-mute)]">
                    {room.status.toUpperCase()} · {room.code} · market {room.market}
                    {room.scheduledAt
                      ? ` · tip ${new Date(room.scheduledAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <Link
                  href={`/lockgm/live/${room.id}`}
                  className="inline-flex h-10 items-center rounded-md border border-[color:var(--lg-accent)] px-4 text-xs font-bold text-[color:var(--lg-accent)]"
                >
                  Enter room
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function LiveMatchupRoomBoard({
  gmId,
  initialRoom,
}: {
  gmId: string;
  initialRoom: PublicLiveMatchup;
}) {
  const [room, setRoom] = useState(initialRoom);
  const [inviteGmId, setInviteGmId] = useState("");
  const [tipLocal, setTipLocal] = useState(() =>
    toDatetimeLocal(initialRoom.scheduledAt),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [draftCard, setDraftCard] = useState<ManagerCard | null>(null);

  const mySeat =
    room.seats.away.gmId === gmId
      ? room.seats.away
      : room.seats.home.gmId === gmId
        ? room.seats.home
        : null;
  const isHost = room.hostGmId === gmId;
  const myTeam = mySeat?.teamId ? classicTeamById(mySeat.teamId) : null;

  useEffect(() => {
    const poll = window.setInterval(() => {
      void refreshLiveMatchupAction(room.id).then((result) => {
        if (result.ok) setRoom(result.room);
      });
    }, 2500);
    return () => window.clearInterval(poll);
  }, [room.id]);

  useEffect(() => {
    if (room.status !== "live" || !room.broadcast) return;
    const tick = window.setInterval(() => setNowMs(Date.now()), 400);
    return () => window.clearInterval(tick);
  }, [room.status, room.broadcast]);

  useEffect(() => {
    setTipLocal(toDatetimeLocal(room.scheduledAt));
  }, [room.scheduledAt]);

  useEffect(() => {
    if (!myTeam) {
      setDraftCard(null);
      return;
    }
    setDraftCard(mySeat?.card ?? defaultManagerCard(myTeam));
  }, [myTeam?.id, mySeat?.locked]);

  const playIdx = useMemo(() => {
    if (!room.broadcast) return 0;
    return broadcastPlayIndex(
      room.broadcast.startedAt,
      room.broadcast.playCount,
      room.broadcast.msPerPlay,
      nowMs,
    );
  }, [room.broadcast, nowMs]);

  const livePlays = room.broadcast?.result.plays.slice(0, playIdx + 1) ?? [];
  const score = livePlays[livePlays.length - 1]?.score ?? {
    away: 0,
    home: 0,
  };
  const complete =
    room.broadcast &&
    isBroadcastComplete(
      room.broadcast.startedAt,
      room.broadcast.playCount,
      room.broadcast.msPerPlay,
      nowMs,
    );

  function run(
    action: Promise<{ ok: boolean; room?: PublicLiveMatchup; error?: string }>,
  ) {
    startTransition(async () => {
      const result = await action;
      if (!result.ok) {
        setMessage(result.error ?? "Action failed.");
        return;
      }
      if (result.room) setRoom(result.room);
      setMessage(null);
    });
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(room.inviteLink);
      setMessage(
        "Invite link copied — send it to a signed-up GM or a new signup.",
      );
    } catch {
      setMessage("Copy failed. Select the invite link and copy it manually.");
    }
  }

  function inviteMember() {
    startTransition(async () => {
      const result = await inviteMemberByGmIdAction(room.id, inviteGmId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setRoom(result.room);
      setMessage(
        `Reserved a seat for ${result.inviteeDisplayName} (${result.inviteeGmId}). Share their invite link.`,
      );
      try {
        await navigator.clipboard.writeText(result.inviteLink);
      } catch {
        /* ignore */
      }
    });
  }

  const awayTeam = room.seats.away.teamId
    ? classicTeamById(room.seats.away.teamId)
    : null;
  const homeTeam = room.seats.home.teamId
    ? classicTeamById(room.seats.home.teamId)
    : null;
  const bothClaimed = Boolean(
    room.seats.away.gmId &&
      room.seats.home.gmId &&
      room.seats.away.teamId &&
      room.seats.home.teamId,
  );
  const roomStandings: LiveStandingRow[] = [room.seats.away, room.seats.home]
    .filter((seat) => seat.gmId && seat.teamId)
    .map((seat) => ({
      gmId: seat.gmId!,
      displayName: seat.displayName || seat.gmId!,
      teamId: seat.teamId!,
      wins: seat.wins,
      losses: seat.losses,
      ties: seat.ties,
      updatedAt: room.updatedAt,
    }));

  return (
    <div className="space-y-8">
      <AdRibbon ads={room.ads} label="Local ad ribbon" />

      <section className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[color:var(--lg-accent)]">
              LIVE MATCHUP · {room.status.toUpperCase()}
            </p>
            <h2 className="mt-2 lockgm-display text-3xl font-extrabold sm:text-4xl">
              {room.name}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
              Host {room.hostDisplayName} · code {room.code} · seed {room.seed}
              {room.scheduledAt
                ? ` · tip ${new Date(room.scheduledAt).toLocaleString()}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyInvite}
              className="inline-flex h-10 items-center rounded-md border border-[color:var(--lg-line)] px-4 text-xs font-bold"
            >
              Copy invite link
            </button>
            {!mySeat && room.status === "lobby" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(claimLiveMatchupAction(room.code))}
                className="inline-flex h-10 items-center rounded-md bg-[color:var(--lg-accent)] px-4 text-xs font-bold text-[color:var(--lg-bg)] disabled:opacity-60"
              >
                Claim open seat
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SeatCard
            title="Away"
            seat={room.seats.away}
            teamLabel={awayTeam ? classicTeamLabel(awayTeam) : null}
            score={score.away}
            live={room.status === "live" || room.status === "final"}
          />
          <SeatCard
            title="Home"
            seat={room.seats.home}
            teamLabel={homeTeam ? classicTeamLabel(homeTeam) : null}
            score={score.home}
            live={room.status === "live" || room.status === "final"}
          />
        </div>

        {mySeat && room.status !== "live" && room.status !== "final" ? (
          <ClaimBoard
            myTeamId={mySeat.teamId}
            takenTeamId={
              mySeat.side === "away"
                ? room.seats.home.teamId
                : room.seats.away.teamId
            }
            locked={mySeat.locked}
            pending={pending}
            onClaim={(teamId) => run(pickTeamAction(room.id, teamId))}
          />
        ) : null}

        {isHost && room.status === "lobby" ? (
          <div className="mt-6 space-y-3 border-t border-[color:var(--lg-line)] pt-5">
            <p className="text-xs font-bold tracking-[0.16em] text-[color:var(--lg-accent)]">
              SCHEDULE FIRST PITCH
            </p>
            <p className="text-sm text-[color:var(--lg-mute)]">
              Both humans claim a club, then set tip-off. Leave the time blank
              to tip as soon as both cards lock.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="font-bold">Tip-off</span>
                <input
                  type="datetime-local"
                  value={tipLocal}
                  onChange={(e) => setTipLocal(e.target.value)}
                  className="mt-2 block min-h-11 rounded-md border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 text-[color:var(--lg-text)]"
                />
              </label>
              <button
                type="button"
                disabled={pending || !bothClaimed}
                onClick={() =>
                  run(
                    scheduleMatchupAction(
                      room.id,
                      tipLocal ? new Date(tipLocal).toISOString() : null,
                    ),
                  )
                }
                className="inline-flex min-h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)] disabled:opacity-60"
              >
                Schedule game
              </button>
            </div>
          </div>
        ) : null}

        {room.status === "scheduled" && mySeat && myTeam && draftCard ? (
          <div className="mt-6 space-y-4 border-t border-[color:var(--lg-line)] pt-5">
            <p className="text-xs font-bold tracking-[0.16em] text-[color:var(--lg-accent)]">
              PRE-GAME LOCK · SAME CARDS AS /SIM
            </p>
            <p className="text-sm text-[color:var(--lg-mute)]">
              Set lineup, gloves, and pitching, then lock. First pitch runs
              when both GMs are locked and tip-off arrives.
            </p>
            <ManagerDesk
              title={`${myTeam.abbrev} lock card`}
              team={myTeam}
              card={draftCard}
              onChange={setDraftCard}
              disabled={mySeat.locked}
            />
            <div className="flex flex-wrap gap-3">
              {mySeat.locked ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(unlockCardAction(room.id))}
                  className="inline-flex min-h-11 items-center rounded-md border border-[color:var(--lg-line)] px-4 text-sm font-bold disabled:opacity-60"
                >
                  Unlock card
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(lockCardAction(room.id, draftCard))}
                  className="inline-flex min-h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)] disabled:opacity-60"
                >
                  Lock card
                </button>
              )}
              {isHost ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(startMatchupAction(room.id))}
                  className="inline-flex min-h-11 items-center rounded-md border border-[color:var(--lg-accent)] px-4 text-sm font-bold text-[color:var(--lg-accent)] disabled:opacity-60"
                >
                  First pitch now
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {isHost && room.status === "lobby" ? (
          <div className="mt-6 space-y-3 border-t border-[color:var(--lg-line)] pt-5">
            <p className="text-xs font-bold tracking-[0.16em] text-[color:var(--lg-accent)]">
              INVITE A SIGNED-UP GM
            </p>
            <div className="flex flex-wrap gap-3">
              <input
                value={inviteGmId}
                onChange={(e) => setInviteGmId(e.target.value)}
                placeholder="GM-XXXXXXXX"
                className="min-h-11 min-w-[14rem] flex-1 rounded-md border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 text-sm text-[color:var(--lg-text)]"
              />
              <button
                type="button"
                disabled={pending || !inviteGmId.trim()}
                onClick={inviteMember}
                className="inline-flex min-h-11 items-center rounded-md border border-[color:var(--lg-accent)] px-4 text-sm font-bold text-[color:var(--lg-accent)] disabled:opacity-60"
              >
                Reserve seat
              </button>
            </div>
            <p className="text-xs leading-relaxed text-[color:var(--lg-mute)]">
              Already on LockedGM? Invite by public GM ID. New to the site? Share
              the room invite link so they can sign up and pick a team.
            </p>
          </div>
        ) : null}

        {message ? (
          <p className="mt-5 text-sm text-[color:var(--lg-accent)]" role="status">
            {message}
          </p>
        ) : null}
      </section>

      <section className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-5 sm:p-6">
        <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
          ROOM STANDINGS
        </p>
        <LiveStandingsTable
          standings={roomStandings}
          empty="Claim clubs to put both humans on the table. Records move when first pitch runs."
        />
      </section>

      {room.broadcast ? (
        <section className="space-y-6">
          <div className="lg-rise border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-5 sm:p-6">
            <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
              SCOREBOARD
            </p>
            <p className="mt-3 lockgm-display text-4xl font-extrabold tabular-nums sm:text-5xl">
              {awayTeam?.abbrev ?? "AWAY"} {score.away} – {score.home}{" "}
              {homeTeam?.abbrev ?? "HOME"}
            </p>
            <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
              {complete
                ? `Final · ${room.broadcast.summary}`
                : `Live broadcast · PA ${playIdx + 1} / ${room.broadcast.playCount}`}
            </p>
          </div>

          <div className="lg-rise-2 border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] p-4">
            <p className="text-xs font-bold tracking-[0.18em] text-[color:var(--lg-accent)]">
              RADIO BOOTH · SHARED CLOCK
            </p>
            <div className="lg-radio mt-3 max-h-80 space-y-3 overflow-y-auto text-sm leading-relaxed">
              {livePlays.map((play, i) => (
                <p
                  key={`${play.inning}-${play.half}-${i}`}
                  className={
                    i === livePlays.length - 1
                      ? "lg-live text-[color:var(--lg-text)]"
                      : "text-[color:var(--lg-mute)]"
                  }
                >
                  <span className="font-semibold text-[color:var(--lg-accent)]">
                    {play.half === "top" ? "Top" : "Bot"} {play.inning}
                  </span>{" "}
                  · {play.radioCall}{" "}
                  <span className="tabular-nums text-[color:var(--lg-accent)]">
                    ({play.score.away}–{play.score.home})
                  </span>
                </p>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ClaimBoard({
  myTeamId,
  takenTeamId,
  locked,
  pending,
  onClaim,
}: {
  myTeamId: string | null;
  takenTeamId: string | null;
  locked: boolean;
  pending: boolean;
  onClaim: (teamId: string) => void;
}) {
  return (
    <div className="mt-6 space-y-3 border-t border-[color:var(--lg-line)] pt-5">
      <p className="text-xs font-bold tracking-[0.16em] text-[color:var(--lg-accent)]">
        CLAIM BOARD
      </p>
      <p className="text-sm text-[color:var(--lg-mute)]">
        Two humans claim different classic clubs. The other GM&apos;s club stays
        taken.
      </p>
      <div className="flex flex-wrap gap-2">
        {CLASSIC_TEAMS.map((team) => {
          const mine = myTeamId === team.id;
          const taken = takenTeamId === team.id;
          return (
            <button
              key={team.id}
              type="button"
              disabled={pending || locked || taken}
              onClick={() => onClaim(team.id)}
              className={`rounded-md border px-3 py-2 text-sm font-bold disabled:opacity-50 ${
                mine
                  ? "border-[color:var(--lg-accent)] text-[color:var(--lg-accent)]"
                  : "border-[color:var(--lg-line)] hover:border-[color:var(--lg-accent)]"
              }`}
            >
              {mine ? "Your " : taken ? "Taken " : "Claim "}
              {team.abbrev}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SeatCard({
  title,
  seat,
  teamLabel,
  score,
  live,
}: {
  title: string;
  seat: PublicLiveMatchup["seats"]["away"];
  teamLabel: string | null;
  score: number;
  live: boolean;
}) {
  return (
    <div className="border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] p-4">
      <p className="text-xs font-bold tracking-[0.16em] text-[color:var(--lg-mute)]">
        {title}
        {live ? ` · ${score}` : ""}
      </p>
      <p className="mt-2 lockgm-display text-2xl font-extrabold">
        {seat.displayName || seat.reservedGmId || "Open seat"}
      </p>
      <p className="mt-1 text-sm text-[color:var(--lg-mute)]">
        {seat.gmId
          ? seat.gmId
          : seat.reservedGmId
            ? `Reserved for ${seat.reservedGmId}`
            : "Waiting for a GM"}
      </p>
      <p className="mt-3 text-sm font-semibold text-[color:var(--lg-text)]">
        {teamLabel || "No club selected"}
      </p>
      <p className="mt-1 text-xs text-[color:var(--lg-mute)]">
        {seat.locked ? "Card locked" : "Card not locked"}
        {seat.gmId
          ? ` · ${recordLine(seat.wins, seat.losses, seat.ties)}`
          : ""}
      </p>
    </div>
  );
}
