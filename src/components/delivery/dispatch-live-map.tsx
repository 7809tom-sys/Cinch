"use client";

import { useMemo } from "react";
import { HometownMapboxMap } from "@/components/delivery/hometown-mapbox-map";
import type { HometownMapMarker } from "@/components/delivery/hometown-mapbox-canvas";
import { useLivePoll } from "@/components/delivery/use-live-poll";
import type { DispatchLiveResponse } from "@/lib/hometown-live-tracking";

function ago(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (!Number.isFinite(seconds)) return "";
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)} min ago`;
}

export function DispatchLiveMap({ projectId }: { projectId: string }) {
  const { data, error } = useLivePoll<DispatchLiveResponse>(
    `/api/hometown/${projectId}/dispatch/live`,
  );
  const markers = useMemo(() => {
    const pins: HometownMapMarker[] = [];
    for (const driver of data?.drivers ?? []) {
      if (driver.kitchen) {
        pins.push({
          id: `kitchen-${driver.runId}`,
          lat: driver.kitchen.lat,
          lng: driver.kitchen.lng,
          kind: "kitchen",
          label: driver.kitchen.name,
        });
      }
      if (driver.dropoff) {
        pins.push({
          id: `dropoff-${driver.runId}`,
          lat: driver.dropoff.lat,
          lng: driver.dropoff.lng,
          kind: "dropoff",
          label: `${driver.driverName} drop-off`,
        });
      }
      if (driver.sharing && driver.lat != null && driver.lng != null) {
        pins.push({
          id: `driver-${driver.runId}`,
          lat: driver.lat,
          lng: driver.lng,
          kind: "driver",
          label: driver.driverName,
        });
      }
    }
    return pins;
  }, [data]);

  return (
    <section
      className="rounded-xl border border-brand/15 bg-foam p-5"
      aria-labelledby="dispatch-live-heading"
      data-testid="dispatch-live-map"
    >
      <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
        Dispatch
      </p>
      <h2
        id="dispatch-live-heading"
        className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep"
      >
        Drivers on a dash
      </h2>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : !data ? (
        <p className="mt-2 text-sm text-muted" role="status">
          Checking active dashes…
        </p>
      ) : data.drivers.length === 0 ? (
        <p className="mt-2 text-sm text-muted" role="status">
          No driver is on an active dash.
        </p>
      ) : (
        <ul className="mt-3 space-y-1 text-sm">
          {data.drivers.map((driver) => (
            <li key={driver.runId}>
              <span className="font-semibold text-brand-deep">{driver.driverName}</span>
              {" · "}
              {driver.restaurantName}
              {" · "}
              {driver.sharing && driver.recordedAt
                ? `sharing · ${ago(driver.recordedAt)}`
                : "not sharing"}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <HometownMapboxMap markers={markers} route={null} />
      </div>
    </section>
  );
}
