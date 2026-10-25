/**
 * Driver location pings: the wrong driver is rejected, the pin TTL is two
 * hours, and a delivered run clears the pin. Directions results are not stored.
 */
import { randomBytes } from "crypto";
import {
  createMemoryLocationStore,
  decideDriverPing,
  decideLocationRead,
  driverLocationFix,
  recordDriverPing,
  releaseLocationForFinishedRun,
} from "../src/lib/hometown-driver-location";
import { liveEta } from "../src/lib/hometown-live-eta";
import {
  DIRECTIONS_MIN_INTERVAL_MS,
  DRIVER_LOCATION_TTL_SECONDS,
  etaRequestGate,
  haversineMeters,
  shouldSendLocationPing,
  straightLineEta,
  type EtaRequestGate,
} from "../src/lib/hometown-live-tracking";
import {
  deleteExpiringJson,
  readExpiringJson,
  writeExpiringJson,
} from "../src/lib/kv-store";
import { starterDeliveryOps } from "../src/lib/seed-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
const projectId = "hometown-live-test";
const ops = starterDeliveryOps("Hometown Runner");
ops.drivers = ops.drivers.map((driver) => {
  if (driver.id === "drv-maya") return { ...driver, email: "maya@example.com" };
  if (driver.id === "drv-jordan") return { ...driver, email: "jordan@example.com" };
  return driver;
});
ops.restaurants = ops.restaurants.map((restaurant) =>
  restaurant.id === "rest-pilot"
    ? { ...restaurant, ownerEmail: "kitchen@example.com" }
    : restaurant,
);
ops.runs = ops.runs.map((run) =>
  run.id === "run-sample-pilot"
    ? { ...run, driverId: "drv-maya", status: "picked_up" as const }
    : run,
);

const maya = { email: "maya@example.com", scope: "driver" as const };
const jordan = { email: "jordan@example.com", scope: "driver" as const };

const wrongDriver = decideDriverPing({
  actor: jordan,
  ops,
  runId: "run-sample-pilot",
  driverId: "drv-jordan",
});
assert(!wrongDriver.ok, "wrong driver is rejected");
if (!wrongDriver.ok) {
  assert(
    wrongDriver.error === "This run is assigned to another driver.",
    "wrong driver error names the assignment",
  );
  assert(wrongDriver.status === 403, "wrong driver is forbidden");
}

const impersonated = decideDriverPing({
  actor: jordan,
  ops,
  runId: "run-sample-pilot",
  driverId: "drv-maya",
});
assert(!impersonated.ok, "another account cannot ping as the assigned driver");

const unsigned = decideDriverPing({
  actor: null,
  ops,
  runId: "run-sample-pilot",
  driverId: "drv-maya",
});
assert(!unsigned.ok && unsigned.status === 401, "a signed-out ping is rejected");

const deliveredOps = {
  ...ops,
  runs: ops.runs.map((run) =>
    run.id === "run-sample-pilot" ? { ...run, status: "delivered" as const } : run,
  ),
};
const finished = decideDriverPing({
  actor: maya,
  ops: deliveredOps,
  runId: "run-sample-pilot",
  driverId: "drv-maya",
});
assert(!finished.ok, "a delivered run does not accept a ping");

const allowed = decideDriverPing({
  actor: maya,
  ops,
  runId: "run-sample-pilot",
  driverId: "drv-maya",
});
assert(allowed.ok, "the assigned driver can ping");

let now = Date.parse("2026-10-25T20:00:00.000Z");
const store = createMemoryLocationStore(() => now);
if (!allowed.ok) throw new Error("assigned driver was rejected");
const fix = driverLocationFix({
  projectId,
  run: allowed.run,
  driverName: "Maya Chen",
  point: { lat: 40.08, lng: -83.14 },
  accuracyM: 12,
  now,
});
assert(fix.ttlSeconds === DRIVER_LOCATION_TTL_SECONDS, "TTL is two hours");
assert(
  Date.parse(fix.expiresAt) - now === DRIVER_LOCATION_TTL_SECONDS * 1000,
  "expiry is now plus the TTL",
);
const saved = await recordDriverPing(store, fix, now);
assert(!saved.skipped, "first ping is stored");
const stored = await store.get(projectId, allowed.run.id);
assert(stored?.ttlSeconds === 7200, "stored pin keeps the two-hour TTL");
assert(stored?.lat === 40.08, "stored pin keeps the latest point");

const burst = await recordDriverPing(
  store,
  { ...fix, lat: 40.081, recordedAt: new Date(now + 1000).toISOString() },
  now + 1000,
);
assert(burst.skipped, "a burst inside four seconds does not overwrite the pin");

now += DRIVER_LOCATION_TTL_SECONDS * 1000 + 1;
assert(
  (await store.get(projectId, allowed.run.id)) === null,
  "a pin past its TTL is gone",
);

now = Date.parse("2026-10-25T20:05:00.000Z");
await store.put(fix);
const cleared = await releaseLocationForFinishedRun(store, projectId, {
  id: allowed.run.id,
  status: "delivered",
});
assert(cleared, "delivery clears the pin");
assert(
  (await store.get(projectId, allowed.run.id)) === null,
  "delivered run has no stored location",
);
await store.put(fix);
const cancelled = await releaseLocationForFinishedRun(store, projectId, {
  id: allowed.run.id,
  status: "cancelled",
});
assert(cancelled, "cancellation clears the pin");
assert((await store.get(projectId, allowed.run.id)) === null, "cancelled run has no stored location");

const customerAllowed = decideLocationRead({
  actor: null,
  session: { role: "customer", email: "Alex@Example.com", scope: "customer" },
  ops,
  restaurantId: "rest-pilot",
  viewerEmails: ["alex@example.com"],
});
assert(customerAllowed.ok, "the customer on the order can see the driver");
const stranger = decideLocationRead({
  actor: null,
  session: { role: "customer", email: "sam@example.com", scope: "customer" },
  ops,
  restaurantId: "rest-pilot",
  viewerEmails: ["alex@example.com"],
});
assert(!stranger.ok, "a different customer cannot see the driver");
const otherKitchen = decideLocationRead({
  actor: { email: "other@example.com", scope: "owner" },
  session: { role: "merchant", email: "other@example.com", scope: "owner" },
  ops,
  restaurantId: "rest-pilot",
  viewerEmails: [],
});
assert(!otherKitchen.ok, "another kitchen cannot see the driver");
const kitchen = decideLocationRead({
  actor: { email: "kitchen@example.com", scope: "owner" },
  session: { role: "merchant", email: "kitchen@example.com", scope: "owner" },
  ops,
  restaurantId: "rest-pilot",
  viewerEmails: [],
});
assert(kitchen.ok, "the kitchen on the order can see the driver");

const previous = { at: 0, lat: 40, lng: -83 };
assert(shouldSendLocationPing(null, previous, 0), "the first fix is sent");
assert(!shouldSendLocationPing(previous, previous, 4_000), "a fix under five seconds waits");
assert(shouldSendLocationPing(previous, previous, 8_000), "a fix at eight seconds is sent");
const movedMeters = haversineMeters({ lat: 40, lng: -83 }, { lat: 40.0003, lng: -83 });
assert(movedMeters >= 25, "0.0003 degrees of latitude is at least 25 meters");
const moved = straightLineEta({ lat: 40, lng: -83 }, { lat: 40.01, lng: -83 }, 25);
assert(moved.miles > 0 && moved.minutes >= 1, "straight-line ETA returns miles and minutes");
assert(
  shouldSendLocationPing(previous, { lat: 40.0003, lng: -83 }, 5_000),
  "25 meters of movement sends a ping after five seconds",
);

const fileKey = `hometown-live-assert:${randomBytes(4).toString("hex")}`;
const fileNow = Date.now();
try {
  await writeExpiringJson(
    fileKey,
    { ttlSeconds: DRIVER_LOCATION_TTL_SECONDS },
    DRIVER_LOCATION_TTL_SECONDS,
    fileNow,
  );
  const fresh = await readExpiringJson<{ ttlSeconds: number }>(fileKey, fileNow);
  assert(fresh?.ttlSeconds === 7200, "expiring store records the two-hour TTL");
  const expired = await readExpiringJson(
    fileKey,
    fileNow + DRIVER_LOCATION_TTL_SECONDS * 1000 + 1,
  );
  assert(expired === null, "expiring store drops the value after the TTL");
} finally {
  await deleteExpiringJson(fileKey);
}

const etaStore = createMemoryLocationStore(() => Date.parse("2026-10-25T21:00:00.000Z"));
const directionCalls = { n: 0 };
const fetchImpl: typeof fetch = async () => {
  directionCalls.n += 1;
  return new Response(
    JSON.stringify({
      routes: [
        {
          duration: 600,
          distance: 8000,
          geometry: {
            type: "LineString",
            coordinates: [
              [-83.14, 40.08],
              [-83.15, 40.09],
            ],
          },
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};
const quiet = await liveEta({
  projectId,
  orderId: "ord-1",
  from: { lat: 40.08, lng: -83.14 },
  to: { lat: 40.09, lng: -83.15 },
  store: etaStore,
  now: Date.parse("2026-10-25T21:00:00.000Z"),
  fetchImpl,
  env: {},
});
const directionCallCount = () => directionCalls.n;
if (directionCallCount() !== 0) throw new Error("the default ETA does not call Directions");
assert(quiet.source === "estimate", "missing provider flag uses the straight-line estimate");
assert(quiet.route === null, "the estimate does not include a route");

const etaNow = Date.parse("2026-10-25T21:00:00.000Z");
const driving = await liveEta({
  projectId,
  orderId: "ord-1",
  from: { lat: 40.08, lng: -83.14 },
  to: { lat: 40.09, lng: -83.15 },
  store: etaStore,
  now: etaNow,
  fetchImpl,
  env: { HOMETOWN_ETA_PROVIDER: "mapbox", MAPBOX_SECRET_TOKEN: "test-token" },
});
if (directionCallCount() !== 1) throw new Error("mapbox mode calls Directions once");
assert(driving.source === "mapbox", "mapbox mode returns a driving ETA");
const gate = await etaStore.readEtaGate(projectId, "ord-1");
assert(gate !== null, "a timestamp gate is recorded");
assert(
  gate !== null && Object.keys(gate).join(",") === "requestedAt",
  "the gate does not store a Directions result",
);
assert(
  !JSON.stringify(gate).includes("coordinates"),
  "stored gate has no route geometry",
);
const held = await liveEta({
  projectId,
  orderId: "ord-1",
  from: { lat: 40.081, lng: -83.141 },
  to: { lat: 40.09, lng: -83.15 },
  store: etaStore,
  now: etaNow + 10_000,
  fetchImpl,
  env: { HOMETOWN_ETA_PROVIDER: "mapbox", MAPBOX_SECRET_TOKEN: "test-token" },
});
if (directionCallCount() !== 1) {
  throw new Error("a second view inside 60 seconds does not call Directions");
}
assert(held.source === "estimate", "a gated view falls back to the estimate");
assert(held.route === null, "a gated view does not replay a stored route");
assert(DIRECTIONS_MIN_INTERVAL_MS === 60_000, "Directions floor is 60 seconds");

let threw = false;
try {
  await etaStore.writeEtaGate(
    projectId,
    "ord-2",
    { requestedAt: etaRequestGate().requestedAt, geometry: [] } as EtaRequestGate,
    60,
  );
} catch {
  threw = true;
}
assert(threw, "a Directions payload is refused by the gate");

console.log("hometown driver location ok");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
