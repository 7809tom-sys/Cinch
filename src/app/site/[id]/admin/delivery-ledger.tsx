"use client";

import { useState, useTransition } from "react";
import type { DeliveryOps } from "@/lib/seed-delivery";
import {
  DEFAULT_WEEKLY_GMV_EXAMPLE,
  scoutResidualForWeeklyGmv,
  summarizeDeliveryLedger,
  weeklyScoutResidualExamples,
} from "@/lib/seed-delivery";
import {
  approveDeliveryDriverAction,
  freezeDeliveryDriverAction,
} from "./actions";

export function SeedDeliveryLedger({
  projectId,
  ops,
}: {
  projectId: string;
  ops: DeliveryOps;
}) {
  const [weeklyGmv, setWeeklyGmv] = useState(DEFAULT_WEEKLY_GMV_EXAMPLE);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const totals = summarizeDeliveryLedger(ops);
  const examples = weeklyScoutResidualExamples();

  function run(
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <section className="seed-admin-section" id="ledger">
      <p className="seed-eyebrow">Ledger</p>
      <h2>GMV, 10% → 5% scout / 5% driver, fee, tip, processor</h2>
      <p className="seed-admin-support">
        Restaurant 10% is fully distributed — 5% scout, 5% driver. Platform
        keeps $0 on the order (subscriptions only). Drivers keep fee + tip +
        the 5% share via ACH. Processing (~2.9%) comes out of the restaurant.
        Driver software is $39/month part-time or $79/month full-time ($9.99 /
        $19.99 weekly). 60 days off the app suspends the driver. The
        restaurant issues 1099s.
      </p>
      <dl className="seed-run-stats">
        <div>
          <dt>GMV</dt>
          <dd>${totals.gmvUsd.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Restaurant 10%</dt>
          <dd>${totals.restaurantCommissionUsd.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Restaurant net</dt>
          <dd>${totals.restaurantNetUsd.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Platform on orders</dt>
          <dd>${totals.platformGrossUsd.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Scout 5%</dt>
          <dd>${totals.scoutResidualUsd.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Driver 5%</dt>
          <dd>${totals.driverCommissionUsd.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Fee (drivers)</dt>
          <dd>${totals.deliveryFeeUsd.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Tip (drivers)</dt>
          <dd>${totals.tipUsd.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Processor</dt>
          <dd>${totals.processorFeeUsd.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Platform net</dt>
          <dd>${totals.platformNetUsd.toFixed(2)}</dd>
        </div>
      </dl>

      <div className="seed-run-table-wrap">
        <table className="seed-run-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Restaurant</th>
              <th>Scout</th>
              <th>GMV</th>
              <th>10%</th>
              <th>Plat $0</th>
              <th>Scout 5%</th>
              <th>Drv 5%</th>
              <th>Fee</th>
              <th>Tip</th>
              <th>Proc</th>
            </tr>
          </thead>
          <tbody>
            {ops.ledger.length === 0 ? (
              <tr>
                <td colSpan={11}>No orders on the ledger yet.</td>
              </tr>
            ) : (
              ops.ledger.map((row) => (
                <tr key={row.id}>
                  <td>{row.customerName}</td>
                  <td>
                    {ops.restaurants.find((item) => item.id === row.restaurantId)
                      ?.name ?? row.restaurantId}
                  </td>
                  <td>
                    {ops.drivers.find((item) => item.id === row.scoutId)?.name ??
                      row.scoutId}
                  </td>
                  <td>${row.gmvUsd.toFixed(2)}</td>
                  <td>${row.restaurantCommissionUsd.toFixed(2)}</td>
                  <td>${row.platformGrossUsd.toFixed(2)}</td>
                  <td>${row.scoutResidualUsd.toFixed(2)}</td>
                  <td>
                    $
                    {(
                      row.driverCommissionUsd ??
                      Math.round(row.gmvUsd * 5) / 100
                    ).toFixed(2)}
                  </td>
                  <td>${row.deliveryFeeUsd.toFixed(2)}</td>
                  <td>${row.tipUsd.toFixed(2)}</td>
                  <td>${row.processorFeeUsd.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h3 className="seed-run-subhead">Drivers — freeze does not move scout</h3>
      <ul className="seed-run-list">
        {ops.drivers.map((driver) => {
          const scouted = ops.restaurants.filter(
            (row) => row.scoutId === driver.id,
          );
          return (
            <li key={driver.id}>
              <div>
                <p className="seed-run-kicker">{driver.status}</p>
                <h3>{driver.name}</h3>
                <p className="seed-run-meta">
                  License {driver.licenseOk ? "ok" : "missing"} · insurance{" "}
                  {driver.insuranceOk ? "ok" : "expired"} ·{" "}
                  {driver.classification === "full_time"
                    ? "full-time $79/mo"
                    : "part-time $39/mo"}
                  {scouted.length
                    ? ` · scout lock: ${scouted.map((row) => row.name).join(", ")}`
                    : " · no originating restaurants"}
                </p>
              </div>
              {driver.status === "frozen" || driver.status === "suspended" ? (
                <button
                  type="button"
                  className="cta"
                  disabled={pending}
                  onClick={() =>
                    run(() => approveDeliveryDriverAction(projectId, driver.id))
                  }
                >
                  Approve
                </button>
              ) : (
                <button
                  type="button"
                  className="cta"
                  disabled={pending}
                  onClick={() =>
                    run(() => freezeDeliveryDriverAction(projectId, driver.id))
                  }
                >
                  Freeze dispatch
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <h3 className="seed-run-subhead">Scout lock (immutable)</h3>
      <ul className="seed-run-list">
        {ops.restaurants.map((row) => (
          <li key={row.id}>
            <div>
              <h3>{row.name}</h3>
              <p className="seed-run-meta">
                scout_id {row.scoutId} ·{" "}
                {ops.drivers.find((item) => item.id === row.scoutId)?.name ??
                  "unknown"}{" "}
                — cannot silently edit the 50/50 split
              </p>
            </div>
          </li>
        ))}
      </ul>

      <h3 className="seed-run-subhead">Weekly residual examples</h3>
      <p className="seed-run-note">
        Inputs, not a promise. Default example is $500/week GMV — never $2,000
        as the default.
      </p>
      <label className="seed-run-field">
        Weekly delivery GMV
        <input
          type="number"
          min={0}
          step={50}
          value={weeklyGmv}
          onChange={(event) => setWeeklyGmv(Number(event.target.value) || 0)}
        />
      </label>
      <p className="seed-run-money">
        5% residual = ${scoutResidualForWeeklyGmv(weeklyGmv).toFixed(2)}
      </p>
      <ul className="seed-run-examples">
        {examples.map((row) => (
          <li key={row.weeklyGmvUsd}>
            ${row.weeklyGmvUsd.toLocaleString()} → ${row.residualUsd.toFixed(2)}
          </li>
        ))}
      </ul>
      {error ? (
        <p className="seed-admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
