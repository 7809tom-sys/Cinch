"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CLASSIC_TEAMS, classicTeamById, classicTeamLabel } from "@/lib/lockgm/strat-sim";
import {
  broadcastPlayIndex,
  isBroadcastComplete,
  type PublicLiveMatchup,
} from "@/lib/lockgm/live-matchup-shared";
import {
  claimLiveMatchupAction,
  createLiveMatchupAction,
  inviteMemberByGmIdAction,
  pickTeamAction,
  refreshLiveMatchupAction,
  setReadyAction,
  startMatchupAction,
} from "@/app/lockgm/live/actions";
import { AdRibbon } from "@/app/lockgm/components/ad-ribbon";

export function LiveMatchupLobby({
  gmId,
  initialRooms,
}: {
  gmId: string;
  initialRooms: PublicLiveMatchup[];
}) {
  const router = useRouter();
  const [rooms, setRooms] = useState(initialRooms);
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
      setMessage("Room opened — invite a GM or share the link.");
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
          Invite a signed-up GM by public ID, or share a link so a friend can
          create an account, claim a seat, and pick a classic club. The local
          ad ribbon sits above the scoreboard once you go live.
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
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [nowMs, setNowMs] = useState(() => Date.now());

  const mySeat =
    room.seats.away.gmId === gmId
      ? room.seats.away
      : room.seats.home.gmId === gmId
        ? room.seats.home
        : null;
  const isHost = room.hostGmId === gmId;

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

  function run(action: Promise<{ ok: boolean; room?: PublicLiveMatchup; error?: string }>) {
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
      setMessage("Invite link copied — send it to a signed-up GM or a new signup.");
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
            live={room.status !== "lobby"}
          />
          <SeatCard
            title="Home"
            seat={room.seats.home}
            teamLabel={homeTeam ? classicTeamLabel(homeTeam) : null}
            score={score.home}
            live={room.status !== "lobby"}
          />
        </div>

        {room.status === "lobby" && mySeat ? (
          <div className="mt-6 space-y-4 border-t border-[color:var(--lg-line)] pt-5">
            <label className="block text-sm">
              <span className="font-bold">Pick your classic club</span>
              <select
                value={mySeat.teamId ?? ""}
                onChange={(e) => {
                  if (!e.target.value) return;
                  run(pickTeamAction(room.id, e.target.value));
                }}
                className="mt-2 block min-h-11 w-full rounded-md border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 text-[color:var(--lg-text)]"
              >
                <option value="">Select a club…</option>
                {CLASSIC_TEAMS.map((team) => (
                  <option key={team.id} value={team.id}>
                    {classicTeamLabel(team)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={pending || !mySeat.teamId}
                onClick={() => run(setReadyAction(room.id, !mySeat.ready))}
                className="inline-flex min-h-11 items-center rounded-md border border-[color:var(--lg-line)] px-4 text-sm font-bold disabled:opacity-60"
              >
                {mySeat.ready ? "Unready" : "Ready up"}
              </button>
              {isHost ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(startMatchupAction(room.id))}
                  className="inline-flex min-h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)] disabled:opacity-60"
                >
                  First pitch
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
        {seat.ready ? "Ready" : "Not ready"}
      </p>
    </div>
  );
}
