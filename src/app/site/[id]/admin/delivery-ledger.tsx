"use client";

import { useState, useTransition } from "react";
import type { DeliveryDriver, DeliveryOps } from "@/lib/seed-delivery";
import {
  DEFAULT_WEEKLY_GMV_EXAMPLE,
  deliveryDriverDisplayName,
  driverAttributedPayoutUsd,
  driverPhotoId,
  ledgerRunDriverId,
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
  const [openParty, setOpenParty] = useState<{
    id: string;
    role: "scout" | "driver";
  } | null>(null);
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
      <style>{`
        .seed-run-party { position: relative; min-width: 9.5rem; }
        .seed-run-party-open { display: flex; align-items: center; gap: 0.5rem; padding: 0; border: 0; background: none; color: inherit; cursor: pointer; text-align: left; white-space: normal; }
        .seed-run-party-open img, .seed-run-party-card img { width: 2.25rem; height: 2.25rem; border-radius: 0.35rem; object-fit: cover; }
        .seed-run-party-open strong, .seed-run-party-open small { display: block; line-height: 1.2; }
        .seed-run-party-open small { font-size: 0.72rem; opacity: 0.72; }
        .seed-run-party-card { position: absolute; z-index: 3; left: 0; top: calc(100% + 0.35rem); display: flex; align-items: center; gap: 0.65rem; min-width: 13rem; padding: 0.55rem 0.7rem; border: 1px solid rgba(11,16,20,0.12); border-radius: 0.5rem; background: #fff; box-shadow: 0 8px 24px rgba(11,16,20,0.12); }
        .seed-run-party-card img { width: 3.5rem; height: 3.5rem; }
        .seed-run-party-card p { margin: 0.1rem 0 0; }
      `}</style>
      <p className="seed-eyebrow">Ledger</p>
      <h2>GMV, 10% → 5% scout / 5% driver, fee, tip, processor</h2>
      <p className="seed-admin-support">
        Restaurant 10% is fully distributed — 5% scout, 5% driver. Platform
        keeps $0 on the order (subscriptions only). Drivers keep fee + tip +
        the 5% share via ACH. Processing (~2.9%) comes out of the restaurant.
        Driver software is $39/month part-time or $79/month full-time ($9.99 /
        $19.99 weekly). 60 days off the app suspends the driver. The
        restaurant issues 1099s. Scout is who signed the kitchen. Driver is
        who ran the bag — fee, tip, and the 5% share belong to that person.
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
              <th>Driver</th>
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
                <td colSpan={12}>No orders on the ledger yet.</td>
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
                    <LedgerPartyId
                      person={ops.drivers.find((item) => item.id === row.scoutId)}
                      role="Scout"
                      fallback={row.scoutId}
                      open={
                        openParty?.role === "scout" &&
                        openParty.id === row.scoutId
                      }
                      onOpen={() =>
                        setOpenParty((current) =>
                          current?.role === "scout" &&
                          current.id === row.scoutId
                            ? null
                            : { id: row.scoutId, role: "scout" },
                        )
                      }
                    />
                  </td>
                  <td>
                    <LedgerPartyId
                      person={ops.drivers.find(
                        (item) => item.id === ledgerRunDriverId(row, ops.runs),
                      )}
                      role="Driver"
                      fallback={deliveryDriverDisplayName(
                        ops.drivers,
                        ledgerRunDriverId(row, ops.runs),
                      )}
                      open={
                        openParty?.role === "driver" &&
                        openParty.id ===
                          (ledgerRunDriverId(row, ops.runs) ?? "")
                      }
                      onOpen={() => {
                        const driverId = ledgerRunDriverId(row, ops.runs);
                        if (!driverId) return;
                        setOpenParty((current) =>
                          current?.role === "driver" &&
                          current.id === driverId
                            ? null
                            : { id: driverId, role: "driver" },
                        );
                      }}
                    />
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
                    : "part-time $39/mo"}{" "}
                  · attributed runs $
                  {driverAttributedPayoutUsd(ops, driver.id).toFixed(2)} (fee +
                  tip + 5%)
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
                scout_id {row.scoutId} · cannot silently edit the 50/50 split
              </p>
              <LedgerPartyId
                person={ops.drivers.find((item) => item.id === row.scoutId)}
                role="Scout"
                fallback={row.scoutId}
                open={
                  openParty?.role === "scout" && openParty.id === row.scoutId
                }
                onOpen={() =>
                  setOpenParty((current) =>
                    current?.role === "scout" && current.id === row.scoutId
                      ? null
                      : { id: row.scoutId, role: "scout" },
                  )
                }
              />
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

function LedgerPartyId({
  person,
  role,
  fallback,
  open,
  onOpen,
}: {
  person?: DeliveryDriver;
  role: "Scout" | "Driver";
  fallback: string;
  open: boolean;
  onOpen: () => void;
}) {
  if (!person) return <span>{fallback}</span>;
  const id = driverPhotoId(person);
  return (
    <div className="seed-run-party">
      <button
        type="button"
        className="seed-run-party-open"
        onClick={onOpen}
        aria-expanded={open}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={id.photoUrl} alt="" />
        <span>
          <strong>{person.name}</strong>
          <small>{id.photoIdNumber}</small>
        </span>
      </button>
      {open ? (
        <aside className="seed-run-party-card" aria-label={`${role} photo ID`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={id.photoUrl} alt={`Photo ID for ${person.name}`} />
          <div>
            <p className="seed-run-kicker">Photo ID · {role}</p>
            <p>{person.name}</p>
            <p>{id.photoIdNumber}</p>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
