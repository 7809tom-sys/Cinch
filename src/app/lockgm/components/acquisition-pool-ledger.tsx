"use client";

import { useState } from "react";
import {
  ACQUISITION_POOL,
  cutDeadMoney,
  expireUnusedAcquisition,
  farmGraduation,
  mlbCareerPointsOnFarm,
  refreshAcquisitionPool,
  spendAcquisitionPoints,
} from "@/lib/lockgm/roster-economics";

type FarmSignee = {
  id: string;
  name: string;
  kind: "draft" | "intl";
  cost: number;
  milbYears: number;
  graduated: boolean;
};

const BOARD: { name: string; kind: "draft" | "intl"; cost: number }[] = [
  { name: "Prep SS — first-round ask", kind: "draft", cost: 4 },
  { name: "College RHP — day-two arm", kind: "draft", cost: 3 },
  { name: "Intl OF — bonus-pool flyer", kind: "intl", cost: 2 },
  { name: "HS catcher — late-round ink", kind: "draft", cost: 1 },
];

const CUT_REMAINING_POINTS = 4;
const CUT_YEARS_LEFT = 3;

export function AcquisitionPoolLedger() {
  const [remaining, setRemaining] = useState(refreshAcquisitionPool);
  const [vanished, setVanished] = useState(0);
  const [periodClosed, setPeriodClosed] = useState(false);
  const [farm, setFarm] = useState<FarmSignee[]>([]);
  const [careerCharged, setCareerCharged] = useState(0);
  const [deadMoney, setDeadMoney] = useState(0);
  const [log, setLog] = useState<string[]>([
    "Offseason refresh: 10 acquisition points. Farm is empty. MLB career cap is untouched.",
  ]);

  const farmCost = farm.length * mlbCareerPointsOnFarm();

  function pushLog(line: string) {
    setLog((prev) => [line, ...prev].slice(0, 8));
  }

  function signAmateur(slot: (typeof BOARD)[number]) {
    if (periodClosed) return;
    const result = spendAcquisitionPoints(remaining, slot.cost);
    if (!result.ok) {
      pushLog(result.reason);
      return;
    }
    const signee: FarmSignee = {
      id: `${slot.name}-${farm.length}`,
      name: slot.name,
      kind: slot.kind,
      cost: slot.cost,
      milbYears: 0,
      graduated: false,
    };
    setRemaining(result.remaining);
    setFarm((prev) => [...prev, signee]);
    pushLog(
      `Signed ${slot.name} for ${slot.cost} acquisition ${slot.cost === 1 ? "point" : "points"}. Sits on the 50-man at 0 MLB career points.`,
    );
  }

  function closeSigningPeriod() {
    if (periodClosed) return;
    const expired = expireUnusedAcquisition(remaining);
    setRemaining(expired.remaining);
    setVanished(expired.vanished);
    setPeriodClosed(true);
    pushLog(
      expired.vanished > 0
        ? `Signing period closed. ${expired.vanished} unused point${expired.vanished === 1 ? "" : "s"} vanished. Next year resets to ${expired.nextSeasonPool}.`
        : `Signing period closed. Pool spent in full. Next year still resets to ${expired.nextSeasonPool}.`,
    );
  }

  function graduateFirst() {
    const target = farm.find((p) => !p.graduated);
    if (!target) {
      pushLog("No farm player to promote.");
      return;
    }
    const result = farmGraduation({
      milbYears: target.milbYears,
      promotedTo30Man: true,
    });
    setFarm((prev) =>
      prev.map((p) => (p.id === target.id ? { ...p, graduated: true } : p)),
    );
    setCareerCharged((n) => n + 1);
    pushLog(
      `Promoted ${target.name} to the 30-man. ${result.serviceClockYears}-year service clock starts. First MLB career point charged.`,
    );
  }

  function forceFourYear() {
    const target = farm.find((p) => !p.graduated);
    if (!target) {
      pushLog("No farm player to force onto the 30-man.");
      return;
    }
    const result = farmGraduation({
      milbYears: 4,
      promotedTo30Man: false,
    });
    setFarm((prev) =>
      prev.map((p) =>
        p.id === target.id ? { ...p, graduated: true, milbYears: 4 } : p,
      ),
    );
    setCareerCharged((n) => n + 1);
    pushLog(
      `4-year MiLB limit: ${target.name} is forced onto the 30-man (${result.trigger}). Service clock starts. MLB career points now apply.`,
    );
  }

  function cutGraduated() {
    const target = farm.find((p) => p.graduated);
    if (!target) {
      pushLog("Graduate someone to the 30-man before a career-point cut.");
      return;
    }
    const cut = cutDeadMoney({
      remainingPoints: CUT_REMAINING_POINTS,
      yearsLeft: CUT_YEARS_LEFT,
    });
    setDeadMoney((n) => roundDisplay(n + cut.totalDead));
    pushLog(
      `Cut ${target.name} with ${CUT_REMAINING_POINTS} points left. Default 85% same-year dead money = ${cut.totalDead} charged now (not stretched).`,
    );
  }

  function resetSeason() {
    setRemaining(refreshAcquisitionPool());
    setVanished(0);
    setPeriodClosed(false);
    setFarm([]);
    setCareerCharged(0);
    setDeadMoney(0);
    setLog([
      "New offseason. Acquisition Pool refreshed to 10. Unused points from last year are gone.",
    ]);
  }

  return (
    <div className="mt-8 border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-5 py-6 sm:px-6">
      <p className="lockgm-display text-xs font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        LEDGER · USE-IT-OR-LOSE-IT
      </p>
      <h3 className="mt-2 lockgm-display text-xl font-extrabold text-[color:var(--lg-text)]">
        Run a signing period
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--lg-mute)]">
        Spend the {ACQUISITION_POOL.annualPoints}-point pool, close the period,
        then graduate or cut. The 30-man career-point cap does not move until a
        farm body is forced or promoted.
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-4">
        <Stat
          label="Acquisition left"
          value={remaining}
          warn={periodClosed && remaining === 0}
        />
        <Stat label="Vanished" value={vanished} warn={vanished > 0} />
        <Stat label="MLB points on farm" value={farmCost} />
        <Stat
          label="Career + dead"
          value={roundDisplay(careerCharged + deadMoney)}
        />
      </dl>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {BOARD.map((slot) => (
          <button
            key={slot.name}
            type="button"
            disabled={periodClosed || remaining < slot.cost}
            onClick={() => signAmateur(slot)}
            className="border border-[color:var(--lg-line)] px-4 py-3 text-left text-sm transition-colors hover:border-[color:var(--lg-accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="font-bold text-[color:var(--lg-text)]">
              {slot.name}
            </span>
            <span className="mt-1 block text-xs font-semibold tracking-wide text-[color:var(--lg-accent)] uppercase">
              {slot.kind === "draft" ? "Amateur draft" : "International"} ·{" "}
              {slot.cost} pt{slot.cost === 1 ? "" : "s"}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={periodClosed}
          onClick={closeSigningPeriod}
          className="rounded-md bg-[color:var(--lg-accent)] px-4 py-2 text-sm font-bold text-[color:var(--lg-bg)] disabled:opacity-40"
        >
          Close signing period
        </button>
        <button
          type="button"
          onClick={graduateFirst}
          className="rounded-md border border-[color:var(--lg-line)] px-4 py-2 text-sm font-bold text-[color:var(--lg-text)] hover:border-[color:var(--lg-accent)]"
        >
          Promote to 30-man
        </button>
        <button
          type="button"
          onClick={forceFourYear}
          className="rounded-md border border-[color:var(--lg-line)] px-4 py-2 text-sm font-bold text-[color:var(--lg-text)] hover:border-[color:var(--lg-accent)]"
        >
          Force 4-year call-up
        </button>
        <button
          type="button"
          onClick={cutGraduated}
          className="rounded-md border border-[color:var(--lg-warn)] px-4 py-2 text-sm font-bold text-[color:var(--lg-text)]"
        >
          Cut (85% same-year)
        </button>
        <button
          type="button"
          onClick={resetSeason}
          className="rounded-md border border-[color:var(--lg-line)] px-4 py-2 text-sm font-bold text-[color:var(--lg-mute)]"
        >
          New offseason
        </button>
      </div>

      {farm.length > 0 ? (
        <ul className="mt-5 space-y-2 text-sm">
          {farm.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[color:var(--lg-line)] pt-2"
            >
              <span className="font-semibold text-[color:var(--lg-text)]">
                {p.name}
              </span>
              <span className="text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
                {p.graduated
                  ? "30-man · service clock on"
                  : `50-man · ${p.cost} acq · 0 MLB pts`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-[color:var(--lg-mute)]">
        {log.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
        {label}
      </dt>
      <dd
        className={`mt-1 lockgm-display text-3xl font-extrabold ${
          warn ? "text-[color:var(--lg-warn)]" : "text-[color:var(--lg-text)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function roundDisplay(value: number): number {
  return Math.round(value * 100) / 100;
}
