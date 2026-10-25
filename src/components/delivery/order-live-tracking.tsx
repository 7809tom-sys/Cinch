"use client";

import { useEffect, useMemo, useState } from "react";
import { HometownMapboxMap } from "@/components/delivery/hometown-mapbox-map";
import type { HometownMapMarker } from "@/components/delivery/hometown-mapbox-canvas";
import { useLivePoll } from "@/components/delivery/use-live-poll";
import type {
  LineStringGeometry,
  OrderLiveResponse,
} from "@/lib/hometown-live-tracking";

function ago(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (!Number.isFinite(seconds)) return "";
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)} min ago`;
}

type HeldDriving = {
  minutes: number;
  miles: number;
  route: LineStringGeometry | null;
  at: number;
};

export function OrderLiveTracking({
  projectId,
  orderId,
}: {
  projectId: string;
  orderId: string | null;
}) {
  const url = orderId
    ? `/api/hometown/${projectId}/orders/${encodeURIComponent(orderId)}/live`
    : null;
  const { data, error } = useLivePoll<OrderLiveResponse>(url);
  const [driving, setDriving] = useState<HeldDriving | null>(null);

  useEffect(() => {
    if (!data || data.eta?.source !== "mapbox") return;
    setDriving({
      minutes: data.eta.minutes,
      miles: data.eta.miles,
      route: data.route,
      at: Date.now(),
    });
  }, [data]);

  const freshDriving =
    driving && Date.now() - driving.at < 90_000 ? driving : null;
  const shown = freshDriving ?? (data?.eta ?? null);
  const route = freshDriving?.route ?? null;
  const markers = useMemo(() => markersFor(data), [data]);

  return (
    <section
      className="rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(26,23,20,0.06)]"
      aria-labelledby="live-driver-heading"
      data-testid="order-live-tracking"
    >
      <h2
        id="live-driver-heading"
        className="font-[family-name:var(--font-display)] text-xl font-bold text-[#0b2e2a]"
      >
        Driver on the map
      </h2>
      {!orderId ? (
        <p className="mt-2 text-sm text-[#5c564f]">
          When a delivery is on the way, the driver shows up here.
        </p>
      ) : error ? (
        <p className="mt-2 text-sm font-semibold text-[#8a3b24]" role="alert">
          {error}
        </p>
      ) : !data ? (
        <p className="mt-2 text-sm text-[#5c564f]" role="status">
          Checking for a driver…
        </p>
      ) : (
        <div className="mt-2 space-y-2 text-sm text-[#3c3834]">
          <p role="status" data-testid="driver-share-status">
            {data.sharing && data.driver
              ? `${data.driver.name} is sharing · updated ${ago(data.driver.recordedAt)}`
              : data.runStatus === "delivered" || data.runStatus === "cancelled"
                ? "This delivery is finished."
                : "The driver has not shared a location yet."}
          </p>
          {shown ? (
            <p role="status" data-testid="driver-eta">
              About {shown.minutes} min · {shown.miles} miles
              {freshDriving
                ? " by car"
                : " · straight-line estimate at 25 mph, not a driving route"}
            </p>
          ) : null}
          <HometownMapboxMap markers={markers} route={route} />
        </div>
      )}
    </section>
  );
}

function markersFor(data: OrderLiveResponse | null): HometownMapMarker[] {
  if (!data) return [];
  const markers: HometownMapMarker[] = [];
  if (data.kitchen) {
    markers.push({
      id: "kitchen",
      lat: data.kitchen.lat,
      lng: data.kitchen.lng,
      kind: "kitchen",
      label: data.kitchen.name,
    });
  }
  if (data.dropoff) {
    markers.push({
      id: "dropoff",
      lat: data.dropoff.lat,
      lng: data.dropoff.lng,
      kind: "dropoff",
      label: "Drop-off",
    });
  }
  if (data.driver) {
    markers.push({
      id: "driver",
      lat: data.driver.lat,
      lng: data.driver.lng,
      kind: "driver",
      label: data.driver.name,
    });
  }
  return markers;
}
