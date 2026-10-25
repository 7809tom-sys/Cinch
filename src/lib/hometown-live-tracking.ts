/**
 * Pure helpers for Hometown live tracking. Safe to import from client
 * components. No Mapbox SDK, no Redis, no Directions responses.
 */

export type LatLng = { lat: number; lng: number };

/** Latest driver pin expires after two hours. Not a location history. */
export const DRIVER_LOCATION_TTL_SECONDS = 2 * 60 * 60;

/** Who may open an order's live view. Longer than a pin so checkout still matches. */
export const ORDER_VIEWER_TTL_SECONDS = 12 * 60 * 60;

/** Client sends a ping on this cadence, or sooner after a real move. */
export const LOCATION_PING_MIN_MS = 5_000;
export const LOCATION_PING_INTERVAL_MS = 8_000;
export const LOCATION_PING_MOVE_METERS = 25;

/** Server drops bursts tighter than this so a buggy client cannot stampede Redis. */
export const LOCATION_SERVER_MIN_MS = 4_000;

/**
 * Directions, when enabled, is requested at most this often per order.
 * The gate stores a timestamp only — never a route, duration, or geometry.
 */
export const DIRECTIONS_MIN_INTERVAL_MS = 60_000;

export const ACTIVE_LOCATION_RUN_STATUSES = [
  "accepted",
  "driver_arrived",
  "picked_up",
] as const;

export type LineStringGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

export type LiveEtaPayload = {
  minutes: number;
  miles: number;
  source: "estimate" | "mapbox";
};

export type OrderLiveResponse = {
  ok: true;
  orderId: string;
  runStatus: string | null;
  sharing: boolean;
  driver: null | {
    name: string;
    lat: number;
    lng: number;
    recordedAt: string;
  };
  kitchen: null | { name: string; lat: number; lng: number };
  dropoff: null | { lat: number; lng: number };
  eta: LiveEtaPayload | null;
  route: LineStringGeometry | null;
};

export type DispatchDriverPin = {
  runId: string;
  orderId: string;
  driverName: string;
  restaurantName: string;
  status: string;
  sharing: boolean;
  recordedAt: string | null;
  lat: number | null;
  lng: number | null;
  kitchen: { name: string; lat: number; lng: number } | null;
  dropoff: { lat: number; lng: number } | null;
};

export type DispatchLiveResponse = {
  ok: true;
  drivers: DispatchDriverPin[];
};

export type EtaRequestGate = { requestedAt: string };

const VIEWER_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_ID = /^[a-zA-Z0-9_-]{1,80}$/;

export function safeLiveId(value: string): string | null {
  return SAFE_ID.test(value) ? value : null;
}

export function isActiveLocationRun(status: string): boolean {
  return (ACTIVE_LOCATION_RUN_STATUSES as readonly string[]).includes(status);
}

export function runReleasesLocation(status: string): boolean {
  return status === "delivered" || status === "cancelled";
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const earthMeters = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthMeters * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function parseLatLng(lat: unknown, lng: unknown): LatLng | null {
  const la = typeof lat === "number" ? lat : Number(lat);
  const ln = typeof lng === "number" ? lng : Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
  return { lat: la, lng: ln };
}

export function normalizeViewerEmail(
  value: string | null | undefined,
): string | null {
  const email = value?.trim().toLowerCase() ?? "";
  return VIEWER_EMAIL.test(email) ? email : null;
}

/**
 * Send on the first fix, about every 8s, or after 25m once 5s have passed.
 */
export function shouldSendLocationPing(
  previous: { at: number; lat: number; lng: number } | null,
  next: LatLng,
  now: number,
): boolean {
  if (!previous) return true;
  const elapsed = now - previous.at;
  if (elapsed < LOCATION_PING_MIN_MS) return false;
  if (elapsed >= LOCATION_PING_INTERVAL_MS) return true;
  return haversineMeters(previous, next) >= LOCATION_PING_MOVE_METERS;
}

/**
 * Straight-line miles at a fixed speed. Not a driving route.
 * Hometown already uses 25 mph for delivery-area estimates.
 */
export function straightLineEta(
  from: LatLng,
  to: LatLng,
  speedMph: number,
): { miles: number; minutes: number } {
  const miles = haversineMeters(from, to) / 1609.344;
  const speed = speedMph > 0 ? speedMph : 25;
  const minutes = miles < 0.05 ? 1 : Math.max(1, Math.round((miles / speed) * 60));
  return {
    miles: Math.round(miles * 10) / 10,
    minutes,
  };
}

/**
 * Default is estimate so a missing or unexpected flag does not call Directions.
 */
export function etaProviderFromEnv(
  value: string | undefined | null,
): "estimate" | "mapbox" {
  return value?.trim().toLowerCase() === "mapbox" ? "mapbox" : "estimate";
}

export function etaRequestGate(now = Date.now()): EtaRequestGate {
  return { requestedAt: new Date(now).toISOString() };
}

/** True when a Directions call is allowed. A recent timestamp blocks another call. */
export function etaGateIsOpen(gate: EtaRequestGate | null, now: number): boolean {
  if (!gate) return true;
  const at = Date.parse(gate.requestedAt);
  if (!Number.isFinite(at)) return true;
  return now - at >= DIRECTIONS_MIN_INTERVAL_MS;
}

/**
 * Plain map links for the driver. Not a Mapbox API.
 */
export function externalDirectionsLinks(point: LatLng): {
  google: string;
  apple: string;
} {
  const dest = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`,
    apple: `https://maps.apple.com/?daddr=${encodeURIComponent(dest)}&dirflg=d`,
  };
}

export function assertEtaGateShape(gate: EtaRequestGate): EtaRequestGate {
  const keys = Object.keys(gate);
  if (keys.length !== 1 || keys[0] !== "requestedAt" || typeof gate.requestedAt !== "string") {
    throw new Error("Directions results are not stored.");
  }
  return { requestedAt: gate.requestedAt };
}
