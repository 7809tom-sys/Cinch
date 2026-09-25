"use client";

import { useMemo, useState, useTransition } from "react";
import type { DeliveryOps, DriverRun } from "@/lib/seed-delivery";
import {
  DEFAULT_WEEKLY_GMV_EXAMPLE,
  DRIVER_PAYOUT_MIN_BALANCE_USD,
  FEDERAL_MILEAGE_USD,
  TRIP_BASE_USD,
  TRIP_PER_MILE_USD,
  driverCanDispatch,
  driverSoftwareFeeUsd,
  scoutEligibleToBePaid,
  scoutPayoutDriverId,
  scoutResidualForWeeklyGmv,
  shouldTriggerDriverPayout,
  weeklyScoutResidualExamples,
} from "@/lib/seed-delivery";
import {
  acceptDriverRunAction,
  advanceDriverRunAction,
  setDriverOnlineAction,
} from "@/app/portal/[id]/delivery-actions";

export function HometownDriverPortal({
  projectId,
  ops,
}: {
  projectId: string;
  ops: DeliveryOps;
}) {
  const [driverId, setDriverId] = useState(
    ops.drivers.find((row) => row.status === "approved")?.id ??
      ops.drivers[0]?.id ??
      "",
  );
  const [weeklyGmv, setWeeklyGmv] = useState(DEFAULT_WEEKLY_GMV_EXAMPLE);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const driver = ops.drivers.find((row) => row.id === driverId);
  const online = Boolean(driver?.online);
  const canDispatch = driver ? driverCanDispatch(driver) : false;
  const scouted = ops.restaurants.filter((row) => row.scoutId === driverId);
  const owned = ops.restaurants.filter((row) => row.ownerDriverId === driverId);
  const scoutEligible = scoutEligibleToBePaid(ops, driverId);
  const paidThisMonth = ops.restaurants.filter(
    (row) => scoutPayoutDriverId(ops, row.id) === driverId,
  );
  const offered = ops.runs.filter((row) => row.status === "offered");
  const active = ops.runs.filter(
    (row) =>
      row.driverId === driverId &&
      (row.status === "accepted" || row.status === "picked_up"),
  );
  const delivered = ops.runs.filter(
    (row) => row.driverId === driverId && row.status === "delivered",
  );
  const earned = [...active, ...delivered].reduce(
    (sum, row) =>
      sum +
      row.deliveryFeeUsd +
      row.tipUsd +
      (row.driverCommissionUsd ?? 0),
    0,
  );
  const examples = useMemo(() => weeklyScoutResidualExamples(), []);
  const pendingPayoutUsd = driver?.pendingPayoutUsd ?? 0;
  const payoutReady = driver
    ? shouldTriggerDriverPayout({
        pendingUsd: pendingPayoutUsd,
        trigger: driver.payoutTrigger,
        lastPayoutAt: driver.lastPayoutAt,
      })
    : false;

  function runAction(
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-brand/15 bg-brand-deep p-5 text-foam">
        <p className="text-xs font-bold tracking-[0.14em] text-accent uppercase">
          Driver portal
        </p>
        <label className="mt-3 block text-sm font-semibold">
          Who’s dashing
          <select
            className="mt-1 block min-h-11 w-full min-w-56 rounded-md border-0 bg-white px-3 text-base text-brand-deep"
            value={driverId}
            onChange={(event) => setDriverId(event.target.value)}
          >
            {ops.drivers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} · {row.status}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-3 text-sm text-mist">
          Same idea as DoorDash Dasher: go online, take an offer, pick up,
          drop off. You keep 100% of the delivery fee, tip, and a 5%
          commission share — Stripe Connect pays you directly, not through
          the restaurant. Trip is ${TRIP_BASE_USD.toFixed(2)} plus $
          {TRIP_PER_MILE_USD.toFixed(2)} a mile (clears the $
          {FEDERAL_MILEAGE_USD.toFixed(2)} federal mileage rate). Software is $
          {driver
            ? driverSoftwareFeeUsd(
                driver.classification,
                driver.softwareCadence,
              ).toFixed(2)
            : "39.00"}
          /{driver?.softwareCadence === "weekly" ? "week" : "month"} (
          {driver?.classification === "full_time" ? "full-time" : "part-time"}
          ). Weekly installments are $9.99 part-time or $19.99 full-time.
          You manage your own tax forms on Connect.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending || driver?.status !== "approved"}
            onClick={() =>
              driver &&
              runAction(() =>
                setDriverOnlineAction(projectId, driver.id, !online),
              )
            }
            className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold disabled:opacity-50 ${
              online ? "bg-accent text-brand-deep" : "bg-white text-brand-deep"
            }`}
          >
            {driver?.status === "suspended"
              ? "Account suspended (60 days off)"
              : driver?.status !== "approved"
                ? "Dispatch frozen"
                : online
                  ? "You’re online · go offline"
                  : "Go online"}
          </button>
          <p className="text-sm text-mist">
            License {driver?.licenseOk ? "ok" : "missing"} · insurance{" "}
            {driver?.insuranceOk ? "ok" : "expired"}
          </p>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-white/10 px-3 py-3">
            <dt className="text-xs font-bold tracking-wide text-mist uppercase">
              Today you keep
            </dt>
            <dd className="mt-1 text-xl font-extrabold">${earned.toFixed(2)}</dd>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-3">
            <dt className="text-xs font-bold tracking-wide text-mist uppercase">
              Connect payout
            </dt>
            <dd className="mt-1 text-xl font-extrabold">
              ${pendingPayoutUsd.toFixed(2)}
            </dd>
            <p className="mt-1 text-xs text-mist">
              {payoutReady
                ? "Transfer firing — $25 min or weekly"
                : `Auto at $${DRIVER_PAYOUT_MIN_BALANCE_USD.toFixed(0)} or weekly`}
              {driver?.connectAccountId
                ? ` · ${driver.connectAccountId}`
                : ""}
            </p>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-3">
            <dt className="text-xs font-bold tracking-wide text-mist uppercase">
              Active dash
            </dt>
            <dd className="mt-1 text-xl font-extrabold">{active.length}</dd>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-3">
            <dt className="text-xs font-bold tracking-wide text-mist uppercase">
              Completed
            </dt>
            <dd className="mt-1 text-xl font-extrabold">{delivered.length}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-brand/15 bg-foam p-5">
        <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
          Offers nearby
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
          Accept a dash
        </h2>
        {!online ? (
          <p className="mt-3 text-sm text-muted">
            Go online to see offers — same as Dash Now. Frozen or expired papers
            stay blocked and do not move scout residuals.
          </p>
        ) : offered.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No open offers in this town right now.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {offered.map((run) => (
              <OfferCard
                key={run.id}
                run={run}
                restaurantName={
                  ops.restaurants.find((row) => row.id === run.restaurantId)
                    ?.name ?? "Restaurant"
                }
                pending={pending}
                canDispatch={canDispatch}
                onAccept={() =>
                  runAction(() =>
                    acceptDriverRunAction(projectId, run.id, driverId),
                  )
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-brand/15 bg-foam p-5">
        <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
          Current dash
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
          Pickup, then dropoff
        </h2>
        {active.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No active dash yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {active.map((run) => (
              <li
                key={run.id}
                className="rounded-lg border border-brand/10 bg-white px-4 py-4"
              >
                <p className="text-xs font-bold tracking-wide text-muted uppercase">
                  {run.status === "accepted"
                    ? "1 · Head to restaurant"
                    : "2 · Head to customer"}
                </p>
                <h3 className="mt-1 font-bold text-brand-deep">
                  {ops.restaurants.find((row) => row.id === run.restaurantId)
                    ?.name ?? "Restaurant"}{" "}
                  → {run.customerName}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Drop-off ZIP {run.dropoffZip}
                </p>
                <p className="mt-2 text-sm font-bold text-brand-deep">
                  You keep ${run.deliveryFeeUsd.toFixed(2)} fee + $
                  {run.tipUsd.toFixed(2)} tip
                  {run.driverCommissionUsd
                    ? ` + $${run.driverCommissionUsd.toFixed(2)} of the 10%`
                    : ""}
                </p>
                {run.status === "accepted" ? (
                  <button
                    type="button"
                    className="mt-3 inline-flex min-h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
                    disabled={pending}
                    onClick={() =>
                      runAction(() =>
                        advanceDriverRunAction(
                          projectId,
                          run.id,
                          driverId,
                          "picked_up",
                        ),
                      )
                    }
                  >
                    Confirm pickup
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mt-3 inline-flex min-h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
                    disabled={pending}
                    onClick={() =>
                      runAction(() =>
                        advanceDriverRunAction(
                          projectId,
                          run.id,
                          driverId,
                          "delivered",
                        ),
                      )
                    }
                  >
                    Complete dropoff
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {error ? (
          <p className="mt-3 text-sm font-semibold text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-brand/15 bg-foam p-5">
        <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
          Scout residual
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
          Restaurants you activated
        </h2>
        <p className="mt-2 text-sm text-muted">
          5% of that restaurant’s delivery GMV, perpetual while you stay on the
          platform. Examples at $500 / $800 / $1,000 / $2,000 weekly GMV — not a
          $2,000 default promise. Riley’s job starts in the dining room: send
          the kitchen customers (seven couples in a week is the example).
          Full-service traffic is about 70% dine-in and only 5% delivery, so
          that relationship is the advantage DoorDash does not have. When those
          same couples later want the bag at the door, the order goes through
          Riley — that is the payback. Make one delivery a month or the 5%
          rolls to the next most-active scout at that kitchen (someone who
          already signed a restaurant). A restaurateur can sign other kitchens
          after one delivery. scout_id stays put.
        </p>
        <p className="mt-3 text-sm font-semibold text-brand-deep">
          {scoutEligible
            ? "Eligible this month — you made one delivery."
            : "Not eligible this month — make one delivery to keep or collect the 5%."}
        </p>
        {owned.length > 0 ? (
          <p className="mt-2 text-sm text-muted">
            You own {owned.map((row) => row.name).join(", ")}. Sign another
            kitchen as a scout after one delivery this month.
          </p>
        ) : null}
        {paidThisMonth.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {paidThisMonth.map((row) => (
              <li key={`paid-${row.id}`} className="text-sm font-semibold text-brand-deep">
                {row.name} · paid the 5% this month
                {row.scoutId !== driverId ? " (cascade)" : ""}
              </li>
            ))}
          </ul>
        ) : null}
        {scouted.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            This driver has not originated a restaurant yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {scouted.map((row) => (
              <li key={row.id} className="text-sm font-semibold text-brand-deep">
                {row.name} · {row.neighborhood} · scout_id locked
                {paidThisMonth.some((item) => item.id === row.id)
                  ? ""
                  : " · rolled this month"}
              </li>
            ))}
          </ul>
        )}
        <label className="mt-4 block max-w-xs text-sm font-semibold text-brand-deep">
          Weekly delivery GMV example
          <input
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
            type="number"
            min={0}
            step={50}
            value={weeklyGmv}
            onChange={(event) => setWeeklyGmv(Number(event.target.value) || 0)}
          />
        </label>
        <p className="mt-2 text-sm font-bold text-brand-deep">
          Residual at ${weeklyGmv.toFixed(0)}/week GMV = $
          {scoutResidualForWeeklyGmv(weeklyGmv).toFixed(2)}
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {examples.map((row) => (
            <li key={row.weeklyGmvUsd}>
              ${row.weeklyGmvUsd.toLocaleString()} → ${row.residualUsd.toFixed(2)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function OfferCard({
  run,
  restaurantName,
  pending,
  canDispatch,
  onAccept,
}: {
  run: DriverRun;
  restaurantName: string;
  pending: boolean;
  canDispatch: boolean;
  onAccept: () => void;
}) {
  const keep =
    run.deliveryFeeUsd + run.tipUsd + (run.driverCommissionUsd ?? 0);
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-brand/10 bg-white px-4 py-4">
      <div>
        <p className="text-xs font-bold tracking-wide text-muted uppercase">
          {restaurantName}
        </p>
        <h3 className="mt-1 font-bold text-brand-deep">{run.customerName}</h3>
        <p className="mt-1 text-sm text-muted">Drop-off ZIP {run.dropoffZip}</p>
        <p className="mt-2 text-sm font-bold text-brand-deep">
          You keep ${keep.toFixed(2)} (fee ${run.deliveryFeeUsd.toFixed(2)} +
          tip ${run.tipUsd.toFixed(2)}
          {run.driverCommissionUsd
            ? ` + 5% $${run.driverCommissionUsd.toFixed(2)}`
            : ""}
          )
        </p>
      </div>
      <button
        type="button"
        className="inline-flex min-h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
        disabled={pending || !canDispatch}
        onClick={onAccept}
      >
        {canDispatch ? "Accept offer" : "Blocked"}
      </button>
    </li>
  );
}
