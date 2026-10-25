import {
  actorCanDrive,
  actorMayOperateDriver,
  kitchensOwnedBy,
  type KitchenActor,
} from "./hometown-kitchen-access";
import {
  deleteExpiringJson,
  readExpiringJson,
  writeExpiringJson,
} from "./kv-store";
import type { DeliveryOps, DriverRun } from "./seed-delivery";
import {
  assertEtaGateShape,
  DRIVER_LOCATION_TTL_SECONDS,
  isActiveLocationRun,
  LOCATION_SERVER_MIN_MS,
  normalizeViewerEmail,
  ORDER_VIEWER_TTL_SECONDS,
  runReleasesLocation,
  type EtaRequestGate,
  type LatLng,
} from "./hometown-live-tracking";

export type DriverLocationFix = {
  projectId: string;
  runId: string;
  orderId: string;
  driverId: string;
  driverName: string;
  restaurantId: string;
  lat: number;
  lng: number;
  accuracyM: number | null;
  recordedAt: string;
  ttlSeconds: number;
  expiresAt: string;
};

export type DriverPingDecision =
  | { ok: true; run: DriverRun }
  | { ok: false; status: 401 | 403 | 404 | 409; error: string };

/**
 * Only the driver assigned to an active run may publish a pin.
 * Master and the seed operator may publish as that assigned driver
 * (the desk already lets them run the dash). A different driver is rejected.
 */
export function decideDriverPing(input: {
  actor: KitchenActor | null;
  ops: Pick<DeliveryOps, "drivers" | "runs">;
  runId: string;
  driverId: string;
}): DriverPingDecision {
  if (!input.actor || !actorCanDrive(input.actor)) {
    return { ok: false, status: 401, error: "Sign in as a driver." };
  }
  const driverId = input.driverId.trim();
  if (!driverId) {
    return { ok: false, status: 403, error: "Sign in as that driver." };
  }
  const run = input.ops.runs.find((row) => row.id === input.runId) ?? null;
  if (!run) {
    return { ok: false, status: 404, error: "That run is not on this town." };
  }
  if (!isActiveLocationRun(run.status)) {
    return {
      ok: false,
      status: 409,
      error: "Location sharing is only for an active dash.",
    };
  }
  if (run.driverId !== driverId) {
    return {
      ok: false,
      status: 403,
      error: "This run is assigned to another driver.",
    };
  }
  if (!actorMayOperateDriver(input.actor, input.ops, driverId)) {
    return { ok: false, status: 403, error: "Sign in as that driver." };
  }
  return { ok: true, run };
}

export function decideLocationRead(input: {
  actor: KitchenActor | null;
  session: { role: string; email: string; scope: string } | null;
  ops: Pick<DeliveryOps, "restaurants">;
  restaurantId: string;
  viewerEmails: string[];
}): { ok: true } | { ok: false; error: string } {
  const sessionScope = input.session?.scope;
  const actorScope = input.actor?.scope;
  if (
    sessionScope === "master" ||
    actorScope === "master" ||
    actorScope === "operator"
  ) {
    return { ok: true };
  }
  if (input.actor?.scope === "owner") {
    const owns = kitchensOwnedBy(input.ops, input.actor.email).some(
      (row) => row.id === input.restaurantId,
    );
    if (owns) return { ok: true };
  }
  const email = normalizeViewerEmail(input.session?.email);
  if (
    input.session?.role === "customer" &&
    email &&
    input.viewerEmails.includes(email)
  ) {
    return { ok: true };
  }
  return {
    ok: false,
    error: "Sign in as the customer on this order, or as the kitchen, to see the driver.",
  };
}

export function decideDispatchRead(input: {
  actor: KitchenActor | null;
  session: { role: string; scope: string } | null;
}): { ok: true; scope: "all" | "owner" } | { ok: false; error: string } {
  if (
    input.session?.scope === "master" ||
    input.actor?.scope === "master" ||
    input.actor?.scope === "operator"
  ) {
    return { ok: true, scope: "all" };
  }
  if (input.actor?.scope === "owner" || input.session?.role === "merchant") {
    return { ok: true, scope: "owner" };
  }
  return {
    ok: false,
    error: "Sign in as the kitchen or admin to see drivers.",
  };
}

export function driverLocationFix(input: {
  projectId: string;
  run: Pick<DriverRun, "id" | "orderId" | "driverId" | "restaurantId">;
  driverName: string;
  point: LatLng;
  accuracyM: number | null;
  now?: number;
}): DriverLocationFix {
  const now = input.now ?? Date.now();
  return {
    projectId: input.projectId,
    runId: input.run.id,
    orderId: input.run.orderId,
    driverId: input.run.driverId ?? "",
    driverName: input.driverName,
    restaurantId: input.run.restaurantId,
    lat: input.point.lat,
    lng: input.point.lng,
    accuracyM: input.accuracyM,
    recordedAt: new Date(now).toISOString(),
    ttlSeconds: DRIVER_LOCATION_TTL_SECONDS,
    expiresAt: new Date(now + DRIVER_LOCATION_TTL_SECONDS * 1000).toISOString(),
  };
}

export interface DriverLocationStore {
  put(fix: DriverLocationFix): Promise<void>;
  get(projectId: string, runId: string): Promise<DriverLocationFix | null>;
  clear(projectId: string, runId: string): Promise<void>;
  list(projectId: string): Promise<DriverLocationFix[]>;
  rememberViewers(
    projectId: string,
    orderId: string,
    emails: string[],
    ttlSeconds: number,
  ): Promise<void>;
  viewersFor(projectId: string, orderId: string): Promise<string[]>;
  readEtaGate(projectId: string, orderId: string): Promise<EtaRequestGate | null>;
  writeEtaGate(
    projectId: string,
    orderId: string,
    gate: EtaRequestGate,
    ttlSeconds: number,
  ): Promise<void>;
}

function fixKey(projectId: string, runId: string): string {
  return `${projectId}:${runId}`;
}

export function createMemoryLocationStore(
  now: () => number = Date.now,
): DriverLocationStore {
  const fixes = new Map<string, DriverLocationFix>();
  const viewers = new Map<string, { emails: string[]; expiresAt: number }>();
  const gates = new Map<string, { gate: EtaRequestGate; expiresAt: number }>();

  return {
    async put(fix) {
      fixes.set(fixKey(fix.projectId, fix.runId), fix);
    },
    async get(projectId, runId) {
      const key = fixKey(projectId, runId);
      const fix = fixes.get(key);
      if (!fix) return null;
      if (Date.parse(fix.expiresAt) <= now()) {
        fixes.delete(key);
        return null;
      }
      return fix;
    },
    async clear(projectId, runId) {
      fixes.delete(fixKey(projectId, runId));
    },
    async list(projectId) {
      const rows: DriverLocationFix[] = [];
      for (const fix of fixes.values()) {
        if (fix.projectId !== projectId) continue;
        if (Date.parse(fix.expiresAt) <= now()) {
          fixes.delete(fixKey(fix.projectId, fix.runId));
          continue;
        }
        rows.push(fix);
      }
      return rows;
    },
    async rememberViewers(projectId, orderId, emails, ttlSeconds) {
      const key = `${projectId}:${orderId}`;
      const current = viewers.get(key);
      const merged = new Set(
        current && current.expiresAt > now() ? current.emails : [],
      );
      for (const email of emails) {
        const normalized = normalizeViewerEmail(email);
        if (normalized) merged.add(normalized);
      }
      viewers.set(key, {
        emails: [...merged],
        expiresAt: now() + ttlSeconds * 1000,
      });
    },
    async viewersFor(projectId, orderId) {
      const row = viewers.get(`${projectId}:${orderId}`);
      if (!row || row.expiresAt <= now()) return [];
      return row.emails;
    },
    async readEtaGate(projectId, orderId) {
      const row = gates.get(`${projectId}:${orderId}`);
      if (!row || row.expiresAt <= now()) return null;
      return row.gate;
    },
    async writeEtaGate(projectId, orderId, gate, ttlSeconds) {
      const stored = assertEtaGateShape(gate);
      gates.set(`${projectId}:${orderId}`, {
        gate: stored,
        expiresAt: now() + ttlSeconds * 1000,
      });
    },
  };
}

function liveKey(projectId: string, runId: string): string {
  return `hometown-live:${projectId}:${runId}`;
}

function indexKey(projectId: string): string {
  return `hometown-live-index:${projectId}`;
}

function viewerKey(projectId: string, orderId: string): string {
  return `hometown-order-viewers:${projectId}:${orderId}`;
}

function gateKey(projectId: string, orderId: string): string {
  return `hometown-eta-gate:${projectId}:${orderId}`;
}

export function createKvLocationStore(): DriverLocationStore {
  return {
    async put(fix) {
      await writeExpiringJson(liveKey(fix.projectId, fix.runId), fix, fix.ttlSeconds);
      const index =
        (await readExpiringJson<string[]>(indexKey(fix.projectId))) ?? [];
      if (!index.includes(fix.runId)) index.push(fix.runId);
      await writeExpiringJson(
        indexKey(fix.projectId),
        index,
        DRIVER_LOCATION_TTL_SECONDS,
      );
    },
    async get(projectId, runId) {
      return readExpiringJson<DriverLocationFix>(liveKey(projectId, runId));
    },
    async clear(projectId, runId) {
      await deleteExpiringJson(liveKey(projectId, runId));
      const index = (await readExpiringJson<string[]>(indexKey(projectId))) ?? [];
      await writeExpiringJson(
        indexKey(projectId),
        index.filter((id) => id !== runId),
        DRIVER_LOCATION_TTL_SECONDS,
      );
    },
    async list(projectId) {
      const index = (await readExpiringJson<string[]>(indexKey(projectId))) ?? [];
      const fixes: DriverLocationFix[] = [];
      const keep: string[] = [];
      for (const runId of index) {
        const fix = await readExpiringJson<DriverLocationFix>(
          liveKey(projectId, runId),
        );
        if (!fix) continue;
        fixes.push(fix);
        keep.push(runId);
      }
      if (keep.length !== index.length) {
        await writeExpiringJson(indexKey(projectId), keep, DRIVER_LOCATION_TTL_SECONDS);
      }
      return fixes;
    },
    async rememberViewers(projectId, orderId, emails, ttlSeconds) {
      const key = viewerKey(projectId, orderId);
      const current =
        (await readExpiringJson<{ emails: string[] }>(key)) ?? { emails: [] };
      const merged = new Set(current.emails);
      for (const email of emails) {
        const normalized = normalizeViewerEmail(email);
        if (normalized) merged.add(normalized);
      }
      await writeExpiringJson(key, { emails: [...merged] }, ttlSeconds);
    },
    async viewersFor(projectId, orderId) {
      const row = await readExpiringJson<{ emails: string[] }>(
        viewerKey(projectId, orderId),
      );
      return row?.emails ?? [];
    },
    async readEtaGate(projectId, orderId) {
      return readExpiringJson<EtaRequestGate>(gateKey(projectId, orderId));
    },
    async writeEtaGate(projectId, orderId, gate, ttlSeconds) {
      const stored = assertEtaGateShape(gate);
      await writeExpiringJson(gateKey(projectId, orderId), stored, ttlSeconds);
    },
  };
}

let singleton: DriverLocationStore | null = null;

export function getDriverLocationStore(): DriverLocationStore {
  if (!singleton) singleton = createKvLocationStore();
  return singleton;
}

export async function clearDriverLocation(
  projectId: string,
  runId: string,
): Promise<void> {
  await getDriverLocationStore().clear(projectId, runId);
}

export async function rememberOrderViewers(
  projectId: string,
  orderId: string,
  emails: string[],
): Promise<void> {
  await getDriverLocationStore().rememberViewers(
    projectId,
    orderId,
    emails,
    ORDER_VIEWER_TTL_SECONDS,
  );
}

export async function recordDriverPing(
  store: DriverLocationStore,
  fix: DriverLocationFix,
  now = Date.now(),
): Promise<{ skipped: boolean }> {
  const existing = await store.get(fix.projectId, fix.runId);
  if (existing) {
    const age = now - Date.parse(existing.recordedAt);
    if (age >= 0 && age < LOCATION_SERVER_MIN_MS) return { skipped: true };
  }
  await store.put(fix);
  return { skipped: false };
}

export async function releaseLocationForFinishedRun(
  store: DriverLocationStore,
  projectId: string,
  run: { id: string; status: string } | null,
): Promise<boolean> {
  if (!run || !runReleasesLocation(run.status)) return false;
  await store.clear(projectId, run.id);
  return true;
}
