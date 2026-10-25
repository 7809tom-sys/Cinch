import type { DriverLocationStore } from "./hometown-driver-location";
import {
  DIRECTIONS_MIN_INTERVAL_MS,
  etaGateIsOpen,
  etaProviderFromEnv,
  etaRequestGate,
  straightLineEta,
  type LatLng,
  type LineStringGeometry,
  type LiveEtaPayload,
} from "./hometown-live-tracking";
import { DELIVERY_RADIUS_APPROX_MPH } from "./seed-delivery";

export type LiveEtaResult = LiveEtaPayload & {
  route: LineStringGeometry | null;
};

type MapboxLeg = {
  minutes: number;
  miles: number;
  route: LineStringGeometry;
};

/**
 * Same-instance de-dupe for requests that overlap before the timestamp gate
 * is written. The promise is dropped when it settles. The route is not
 * written to Redis or disk.
 */
const inflight = new Map<string, Promise<MapboxLeg | null>>();

function mapboxServerToken(env: {
  MAPBOX_SECRET_TOKEN?: string;
  NEXT_PUBLIC_MAPBOX_TOKEN?: string;
}): string {
  return (
    env.MAPBOX_SECRET_TOKEN?.trim() ||
    env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ||
    ""
  );
}

async function fetchDrivingLeg(
  from: LatLng,
  to: LatLng,
  token: string,
  fetchImpl: typeof fetch,
): Promise<MapboxLeg | null> {
  const path = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${path}`,
  );
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "simplified");
  url.searchParams.set("access_token", token);
  const response = await fetchImpl(url, { cache: "no-store" });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    routes?: Array<{
      duration?: number;
      distance?: number;
      geometry?: { type?: string; coordinates?: [number, number][] };
    }>;
  };
  const route = body.routes?.[0];
  const geometry = route?.geometry;
  if (
    !route ||
    typeof route.duration !== "number" ||
    typeof route.distance !== "number" ||
    geometry?.type !== "LineString" ||
    !Array.isArray(geometry.coordinates)
  ) {
    return null;
  }
  return {
    minutes: Math.max(1, Math.round(route.duration / 60)),
    miles: Math.round((route.distance / 1609.344) * 10) / 10,
    route: { type: "LineString", coordinates: geometry.coordinates },
  };
}

/**
 * ETA for one open tracking request. Estimate never calls Mapbox.
 * Mapbox runs only when HOMETOWN_ETA_PROVIDER=mapbox, a token exists,
 * and this order has not requested Directions in the last 60 seconds.
 * The stored gate is a timestamp. The route is returned to this caller only.
 */
export async function liveEta(input: {
  projectId: string;
  orderId: string;
  from: LatLng;
  to: LatLng;
  store: DriverLocationStore;
  now?: number;
  fetchImpl?: typeof fetch;
  env?: {
    HOMETOWN_ETA_PROVIDER?: string;
    MAPBOX_SECRET_TOKEN?: string;
    NEXT_PUBLIC_MAPBOX_TOKEN?: string;
  };
}): Promise<LiveEtaResult> {
  const estimate = straightLineEta(input.from, input.to, DELIVERY_RADIUS_APPROX_MPH);
  const fallback: LiveEtaResult = { ...estimate, source: "estimate", route: null };
  const env = input.env ?? {
    HOMETOWN_ETA_PROVIDER: process.env.HOMETOWN_ETA_PROVIDER,
    MAPBOX_SECRET_TOKEN: process.env.MAPBOX_SECRET_TOKEN,
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  };
  if (etaProviderFromEnv(env.HOMETOWN_ETA_PROVIDER) !== "mapbox") return fallback;
  const token = mapboxServerToken(env);
  if (!token) return fallback;

  const now = input.now ?? Date.now();
  const gate = await input.store.readEtaGate(input.projectId, input.orderId);
  if (!etaGateIsOpen(gate, now)) return fallback;

  const key = `${input.projectId}:${input.orderId}`;
  let pending = inflight.get(key);
  if (!pending) {
    pending = fetchDrivingLeg(
      input.from,
      input.to,
      token,
      input.fetchImpl ?? fetch,
    ).finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, pending);
  }
  let leg: MapboxLeg | null = null;
  try {
    leg = await pending;
  } catch {
    leg = null;
  }
  if (!leg) return fallback;
  await input.store.writeEtaGate(
    input.projectId,
    input.orderId,
    etaRequestGate(now),
    DIRECTIONS_MIN_INTERVAL_MS / 1000,
  );
  return {
    minutes: leg.minutes,
    miles: leg.miles,
    source: "mapbox",
    route: leg.route,
  };
}
