import { kitchensOwnedBy } from "./hometown-kitchen-access";
import type { KitchenActor } from "./hometown-kitchen-access";
import {
  decideDispatchRead,
  decideLocationRead,
  getDriverLocationStore,
  releaseLocationForFinishedRun,
  type DriverLocationStore,
} from "./hometown-driver-location";
import { liveEta } from "./hometown-live-eta";
import {
  isActiveLocationRun,
  type DispatchLiveResponse,
  type OrderLiveResponse,
} from "./hometown-live-tracking";
import type { HometownRoleSession } from "./hometown-role";
import {
  restaurantGeo,
  runDropoffGeo,
  type DeliveryOps,
} from "./seed-delivery";

function restaurantPin(ops: DeliveryOps, restaurantId: string) {
  const restaurant = ops.restaurants.find((row) => row.id === restaurantId);
  if (!restaurant) return null;
  const point = restaurantGeo(restaurant);
  return { name: restaurant.name, lat: point.lat, lng: point.lng };
}

/**
 * One order, for a page that is open. Directions runs inside liveEta only
 * when that function is called — there is no timer here.
 */
export async function orderLivePayload(input: {
  projectId: string;
  orderId: string;
  ops: DeliveryOps;
  session: HometownRoleSession | null;
  actor: KitchenActor | null;
  store?: DriverLocationStore;
}): Promise<
  | { ok: true; body: OrderLiveResponse }
  | { ok: false; status: 403 | 404; error: string }
> {
  const store = input.store ?? getDriverLocationStore();
  const runs = input.ops.runs.filter((row) => row.orderId === input.orderId);
  const run =
    runs.find((row) => isActiveLocationRun(row.status)) ?? runs[0] ?? null;
  const ticket = input.ops.tickets.find((row) => row.orderId === input.orderId);
  const restaurantId = run?.restaurantId ?? ticket?.restaurantId ?? "";
  if (!restaurantId) {
    return { ok: false, status: 404, error: "Order not found." };
  }
  const viewers = await store.viewersFor(input.projectId, input.orderId);
  const allowed = decideLocationRead({
    actor: input.actor,
    session: input.session,
    ops: input.ops,
    restaurantId,
    viewerEmails: viewers,
  });
  if (!allowed.ok) return { ok: false, status: 403, error: allowed.error };

  if (run) await releaseLocationForFinishedRun(store, input.projectId, run);
  const active = Boolean(run && isActiveLocationRun(run.status));
  const fix = active
    ? await store.get(input.projectId, run!.id)
    : null;
  const restaurant = input.ops.restaurants.find((row) => row.id === restaurantId);
  const kitchen = restaurantPin(input.ops, restaurantId);
  const dropoff = run
    ? runDropoffGeo(run, restaurant)
    : null;
  let eta: OrderLiveResponse["eta"] = null;
  let route: OrderLiveResponse["route"] = null;
  if (fix && dropoff) {
    const result = await liveEta({
      projectId: input.projectId,
      orderId: input.orderId,
      from: { lat: fix.lat, lng: fix.lng },
      to: dropoff,
      store,
    });
    eta = {
      minutes: result.minutes,
      miles: result.miles,
      source: result.source,
    };
    route = result.source === "mapbox" ? result.route : null;
  }
  return {
    ok: true,
    body: {
      ok: true,
      orderId: input.orderId,
      runStatus: run?.status ?? null,
      sharing: Boolean(fix),
      driver: fix
        ? {
            name: fix.driverName,
            lat: fix.lat,
            lng: fix.lng,
            recordedAt: fix.recordedAt,
          }
        : null,
      kitchen,
      dropoff,
      eta,
      route,
    },
  };
}

/** Positions only. Dispatch does not call Directions. */
export async function dispatchLivePayload(input: {
  projectId: string;
  ops: DeliveryOps;
  session: HometownRoleSession | null;
  actor: KitchenActor | null;
  store?: DriverLocationStore;
}): Promise<
  | { ok: true; body: DispatchLiveResponse }
  | { ok: false; status: 403; error: string }
> {
  const decision = decideDispatchRead({
    actor: input.actor,
    session: input.session,
  });
  if (!decision.ok) return { ok: false, status: 403, error: decision.error };
  const store = input.store ?? getDriverLocationStore();
  const owned =
    decision.scope === "owner" && input.actor
      ? new Set(kitchensOwnedBy(input.ops, input.actor.email).map((row) => row.id))
      : null;
  const active = input.ops.runs.filter(
    (row) =>
      isActiveLocationRun(row.status) &&
      row.fulfillment !== "pickup" &&
      (!owned || owned.has(row.restaurantId)),
  );
  const fixes = await store.list(input.projectId);
  const byRun = new Map(fixes.map((fix) => [fix.runId, fix]));
  return {
    ok: true,
    body: {
      ok: true,
      drivers: active.map((run) => {
        const fix = byRun.get(run.id) ?? null;
        const restaurant = input.ops.restaurants.find(
          (row) => row.id === run.restaurantId,
        );
        const driver = input.ops.drivers.find((row) => row.id === run.driverId);
        const kitchen = restaurant
          ? {
              name: restaurant.name,
              ...restaurantGeo(restaurant),
            }
          : null;
        return {
          runId: run.id,
          orderId: run.orderId,
          driverName: fix?.driverName || driver?.name || "Driver",
          restaurantName: restaurant?.name ?? "Kitchen",
          status: run.status,
          sharing: Boolean(fix),
          recordedAt: fix?.recordedAt ?? null,
          lat: fix?.lat ?? null,
          lng: fix?.lng ?? null,
          kitchen,
          dropoff: runDropoffGeo(run, restaurant),
        };
      }),
    },
  };
}
