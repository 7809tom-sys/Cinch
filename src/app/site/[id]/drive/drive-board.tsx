"use client";

import { useMemo, useState, useTransition } from "react";
import type { DeliveryOps } from "@/lib/seed-delivery";
import {
  DEFAULT_WEEKLY_GMV_EXAMPLE,
  driverCanDispatch,
  scoutResidualForWeeklyGmv,
  weeklyScoutResidualExamples,
} from "@/lib/seed-delivery";
import { acceptDriverRunAction, advanceDriverRunAction } from "./actions";

export function SeedDriveBoard({
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
  const canDispatch = driver ? driverCanDispatch(driver) : false;
  const scouted = ops.restaurants.filter((row) => row.scoutId === driverId);
  const offered = ops.runs.filter((row) => row.status === "offered");
  const mine = ops.runs.filter((row) => row.driverId === driverId);
  const examples = useMemo(() => weeklyScoutResidualExamples(), []);

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
    <>
      <section className="seed-run-panel">
        <p className="seed-eyebrow">Driver</p>
        <label className="seed-run-field">
          Who’s driving
          <select
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
        {driver ? (
          <p className="seed-run-meta">
            Software ~${driver.softwareUsdPerYear}/year. You keep 100% of the
            delivery fee and tip. License{" "}
            {driver.licenseOk ? "current" : "missing"} · insurance{" "}
            {driver.insuranceOk ? "current" : "expired"}.
            {canDispatch
              ? " Dispatch open."
              : " Dispatch blocked — freeze does not move scout residuals."}
          </p>
        ) : null}
      </section>

      <section className="seed-run-panel">
        <p className="seed-eyebrow">Dispatch</p>
        <h2>Open runs</h2>
        {offered.length === 0 ? (
          <p className="seed-run-empty">No open runs in this town right now.</p>
        ) : (
          <ul className="seed-run-list">
            {offered.map((run) => (
              <li key={run.id}>
                <div>
                  <p className="seed-run-kicker">
                    {ops.restaurants.find((row) => row.id === run.restaurantId)
                      ?.name ?? "Restaurant"}
                  </p>
                  <h3>{run.customerName}</h3>
                  <p className="seed-run-money">
                    You keep fee ${run.deliveryFeeUsd.toFixed(2)} + tip $
                    {run.tipUsd.toFixed(2)}
                  </p>
                  <p className="seed-run-meta">Drop-off ZIP {run.dropoffZip}</p>
                </div>
                <button
                  type="button"
                  className="cta"
                  disabled={pending || !canDispatch}
                  onClick={() =>
                    runAction(() =>
                      acceptDriverRunAction(projectId, run.id, driverId),
                    )
                  }
                >
                  {canDispatch ? "Accept run" : "Blocked"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="seed-run-panel">
        <p className="seed-eyebrow">Your bag</p>
        <h2>Accepted and on the road</h2>
        {mine.length === 0 ? (
          <p className="seed-run-empty">No runs on this driver yet.</p>
        ) : (
          <ul className="seed-run-list">
            {mine.map((run) => (
              <li key={run.id}>
                <div>
                  <p className="seed-run-kicker">{run.status.replace("_", " ")}</p>
                  <h3>{run.customerName}</h3>
                  <p className="seed-run-money">
                    Fee ${run.deliveryFeeUsd.toFixed(2)} + tip $
                    {run.tipUsd.toFixed(2)} — yours
                  </p>
                </div>
                {run.status === "accepted" ? (
                  <button
                    type="button"
                    className="cta"
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
                    Picked up
                  </button>
                ) : null}
                {run.status === "picked_up" ? (
                  <button
                    type="button"
                    className="cta"
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
                    Delivered
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {error ? (
          <p className="seed-admin-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="seed-run-panel">
        <p className="seed-eyebrow">Scout residual</p>
        <h2>Restaurants you activated</h2>
        <p className="seed-run-note">
          5% of that restaurant’s delivery GMV, perpetual while you stay on the
          platform. Examples at $500 / $800 / $1,000 / $2,000 weekly GMV — not a
          $2,000 default promise.
        </p>
        {scouted.length === 0 ? (
          <p className="seed-run-empty">
            This driver has not originated a restaurant yet.
          </p>
        ) : (
          <ul className="seed-run-list">
            {scouted.map((row) => (
              <li key={row.id}>
                <div>
                  <h3>{row.name}</h3>
                  <p className="seed-run-meta">
                    {row.neighborhood} · scout_id locked
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <label className="seed-run-field">
          Weekly delivery GMV example
          <input
            type="number"
            min={0}
            step={50}
            value={weeklyGmv}
            onChange={(event) =>
              setWeeklyGmv(Number(event.target.value) || 0)
            }
          />
        </label>
        <p className="seed-run-money">
          Residual at ${weeklyGmv.toFixed(0)}/week GMV = $
          {scoutResidualForWeeklyGmv(weeklyGmv).toFixed(2)}
        </p>
        <ul className="seed-run-examples">
          {examples.map((row) => (
            <li key={row.weeklyGmvUsd}>
              ${row.weeklyGmvUsd.toLocaleString()} GMV → ${row.residualUsd.toFixed(2)}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
