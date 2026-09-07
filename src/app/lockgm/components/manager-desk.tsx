"use client";

import {
  FIELD_ORDER,
  bullpenRoleLabel,
  eligibilityBadge,
  fieldersForPosition,
  isEligibleAt,
  moveBullpenArm,
  rosterPitchers,
  rotationLabel,
  rotationSizeForTeam,
  selectStartingPitcher,
  seriesRotation,
  setBullpenSlot,
  setStarterInningsTarget,
  validateDefense,
  validateLineup,
  validatePitching,
  type ClassicTeam,
  type ManagerCard,
} from "@/lib/lockgm/strat-sim";

function lastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

function playerName(team: ClassicTeam | undefined, id: string): string {
  return team?.players.find((p) => p.id === id)?.name ?? id;
}

/** Same manager cards as Classic Matchup `/sim` — reused on the Live lock screen. */
export function ManagerDesk({
  title,
  team,
  card,
  onChange,
  disabled = false,
}: {
  title: string;
  team: ClassicTeam;
  card: ManagerCard;
  onChange: (c: ManagerCard) => void;
  disabled?: boolean;
}) {
  const batters = team.players.filter((p) => p.batter);
  const arms = rosterPitchers(team);
  const rotation = card.rotation ?? team.rotation;
  const bullpen = card.bullpen ?? team.bullpen;
  const starterId = rotation[0] ?? "";
  const planTarget = card.pitchingPlan?.starterInningsTarget ?? 6;
  const lineupCheck = validateLineup(team, card.lineup);
  const defCheck = validateDefense(team, card.defense);
  const pitchCheck = validatePitching(team, rotation, bullpen, card.pitchingPlan);
  const cardHealthy =
    lineupCheck.ok && defCheck.ok && pitchCheck.ok && !(defCheck.oopCount ?? 0);

  function setLineupSlot(idx: number, playerId: string) {
    if (disabled) return;
    const next = [...card.lineup];
    const swapAt = next.indexOf(playerId);
    if (swapAt >= 0) next[swapAt] = next[idx]!;
    next[idx] = playerId;
    onChange({ ...card, lineup: next });
  }

  function setDefense(pos: (typeof FIELD_ORDER)[number], playerId: string) {
    if (disabled) return;
    onChange({ ...card, defense: { ...card.defense, [pos]: playerId } });
  }

  function pitcherLabel(p: (typeof arms)[number]) {
    const pit = p.pitcher!;
    return `${p.name} (${p.throws}/${pit.role}) St${pit.stuff} Ct${pit.control} Sta${pit.stamina}`;
  }

  return (
    <div className="border border-[color:var(--lg-line)] p-4">
      <p className="lockgm-display text-lg font-bold">{title}</p>
      <p className="mt-1 text-xs text-[color:var(--lg-mute)]">
        Lineup + fielders + pitching · L/R platoon baked into every AB ·
        eligible gloves only · OOP injury fill-ins crush defense · fireman rest
        every game · 7th-inning+ pinch-hit pause on a clear split
        {disabled ? " · locked for first pitch" : ""}
      </p>

      <div className="mt-4 border-t border-[color:var(--lg-line)]/70 pt-3">
        <p className="text-xs font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
          Pitching card
        </p>
        <p className="mt-1 text-[11px] text-[color:var(--lg-mute)]">
          {rotationLabel(rotationSizeForTeam(team))} for series / October
          {seriesRotation(team).length
            ? `: ${seriesRotation(team)
                .map((id) => lastName(playerName(team, id)))
                .join(" → ")}`
            : ""}
        </p>
        <label className="mt-2 block text-xs">
          <span className="font-bold text-[color:var(--lg-mute)]">
            Starting pitcher
          </span>
          <select
            className="mt-1 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-2 py-1.5"
            value={starterId}
            disabled={disabled}
            onChange={(e) =>
              onChange(selectStartingPitcher(card, team, e.target.value))
            }
          >
            {arms.map((p) => (
              <option key={p.id} value={p.id}>
                {pitcherLabel(p)}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-xs">
          <span className="font-bold text-[color:var(--lg-mute)]">
            Pitching change plan · starter IP target
          </span>
          <select
            className="mt-1 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-2 py-1.5"
            value={planTarget}
            disabled={disabled}
            onChange={(e) =>
              onChange(setStarterInningsTarget(card, Number(e.target.value)))
            }
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                Hook after ~{n} IP (fatigue/blowups still pull earlier)
              </option>
            ))}
          </select>
        </label>
        <p className="mt-1 text-[11px] leading-snug text-[color:var(--lg-mute)]">
          Engine follows this plan between ABs. From the 7th on, a clear
          platoon edge stops the game for a pinch-hit. Fireman rest (innings
          scale, no 3 days in a row) applies to every game, not just a series.
        </p>

        <p className="mt-3 text-xs font-bold text-[color:var(--lg-mute)]">
          Bullpen roles (fireman first)
        </p>
        <p className="mt-0.5 text-[11px] text-[color:var(--lg-mute)]">
          Fireman is saved for high leverage 7th–9th. Early hooks go to setup /
          long relief. Tired arms sit; an emergency appearance is crushed two
          grade tiers.
        </p>
        <div className="mt-2 space-y-2">
          {bullpen.map((id, idx) => {
            const options = arms.filter(
              (p) => p.id === id || p.id !== starterId,
            );
            const arm = team.players.find((p) => p.id === id);
            const role = bullpenRoleLabel(idx, arm?.throws);
            return (
              <div key={`bp-${idx}`} className="flex items-center gap-1.5">
                <span className="w-[4.6rem] shrink-0 text-[11px] font-bold text-[color:var(--lg-accent)]">
                  {role}
                </span>
                <select
                  className="min-w-0 flex-1 border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-2 py-1.5 text-xs"
                  value={id}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange(setBullpenSlot(card, team, idx, e.target.value))
                  }
                >
                  {options.map((p) => (
                    <option key={p.id} value={p.id}>
                      {pitcherLabel(p)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Move bullpen arm up"
                  disabled={disabled || idx === 0}
                  onClick={() =>
                    onChange(moveBullpenArm(card, team, idx, idx - 1))
                  }
                  className="border border-[color:var(--lg-line)] px-1.5 py-1 text-xs font-bold disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move bullpen arm down"
                  disabled={disabled || idx >= bullpen.length - 1}
                  onClick={() =>
                    onChange(moveBullpenArm(card, team, idx, idx + 1))
                  }
                  className="border border-[color:var(--lg-line)] px-1.5 py-1 text-xs font-bold disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-[color:var(--lg-line)]/70 pt-3">
        <p className="text-xs font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
          Batting order
        </p>
        <div className="mt-2 space-y-2">
          {card.lineup.map((id, idx) => (
            <label key={`lu-${idx}`} className="flex items-center gap-2 text-xs">
              <span className="w-5 font-bold text-[color:var(--lg-accent)]">
                {idx + 1}
              </span>
              <select
                className="flex-1 border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-2 py-1.5"
                value={id}
                disabled={disabled}
                onChange={(e) => setLineupSlot(idx, e.target.value)}
              >
                {batters.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{eligibilityBadge(p)}] ({p.bats}) C
                    {p.batter?.contact}/P{p.batter?.power} $
                    {p.salary.toFixed(1)}M
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-[color:var(--lg-line)]/70 pt-3">
        <p className="text-xs font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
          Fielders
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--lg-mute)]">
          Eligible gloves only have LockedGM positional ratings. Injury OOP
          fill-ins are allowed but score real bad (errors + range collapse).
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {FIELD_ORDER.map((pos) => {
            const assignedId = card.defense[pos] || "";
            const assigned = team.players.find((p) => p.id === assignedId);
            const oop = assigned != null && !isEligibleAt(assigned, pos);
            const { eligible, ineligible } = fieldersForPosition(team, pos);
            return (
              <label key={pos} className="text-xs">
                <span className="flex items-center justify-between gap-1 font-bold text-[color:var(--lg-mute)]">
                  <span>{pos}</span>
                  {oop ? (
                    <span className="text-[10px] font-bold tracking-wide text-[color:var(--lg-warn)] uppercase">
                      OOP
                    </span>
                  ) : null}
                </span>
                <select
                  className={`mt-1 w-full border bg-[color:var(--lg-bg)] px-2 py-1.5 ${
                    oop
                      ? "border-[color:var(--lg-warn)]"
                      : "border-[color:var(--lg-line)]"
                  }`}
                  value={assignedId}
                  disabled={disabled}
                  onChange={(e) => setDefense(pos, e.target.value)}
                >
                  <optgroup label={`Eligible at ${pos}`}>
                    {eligible.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{eligibilityBadge(p)}] D
                        {p.batter?.defense ?? "-"}
                      </option>
                    ))}
                  </optgroup>
                  {ineligible.length > 0 ? (
                    <optgroup label="Injury fill-in (OOP — severe penalty)">
                      {ineligible.map((p) => (
                        <option key={p.id} value={p.id}>
                          ⚠ {p.name} [{eligibilityBadge(p)}] unrated@{pos}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>
            );
          })}
        </div>
      </div>

      <p
        className={`mt-3 text-xs ${
          cardHealthy
            ? "text-[color:var(--lg-mute)]"
            : "text-[color:var(--lg-warn)]"
        }`}
      >
        {lineupCheck.message} · {defCheck.message} · {pitchCheck.message}
      </p>
    </div>
  );
}
