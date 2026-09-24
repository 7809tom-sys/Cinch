/**
 * Hometown Runner v1 — hyper-local food delivery ops (not a restaurant).
 *
 * HARD RULES:
 * - Restaurant pays 10% of delivery GMV.
 * - 5% platform / 5% originating scout residual (scout_id is immutable).
 * - Drivers keep 100% of delivery fee + tip. Never skim.
 * - Card processing (~2.9%) comes out of the restaurant, not the platform 5%.
 * - Freeze a driver for compliance without moving scout ownership.
 * - Residual examples use $500 / $800 / $1,000 / $2,000 weekly GMV as
 *   inputs — never a $2,000/week default promise.
 */

export const DELIVERY_OPS_PATH = "content/delivery.ops.json";
export const RESTAURANT_COMMISSION_RATE = 0.1;
export const PLATFORM_SHARE_RATE = 0.05;
export const SCOUT_RESIDUAL_RATE = 0.05;
export const PROCESSOR_RATE = 0.029;
export const DRIVER_SOFTWARE_USD_PER_YEAR = 900;
export const WEEKLY_GMV_EXAMPLES = [500, 800, 1000, 2000] as const;
export const DEFAULT_WEEKLY_GMV_EXAMPLE = 500;

export type DeliveryDriverStatus = "pending" | "approved" | "frozen";
export type MerchantTicketStatus =
  | "incoming"
  | "accepted"
  | "ready"
  | "completed"
  | "declined";
export type DriverRunStatus =
  | "offered"
  | "accepted"
  | "picked_up"
  | "delivered"
  | "cancelled";

export type DeliveryRestaurant = {
  id: string;
  name: string;
  neighborhood: string;
  /** Originating scout — locked when the restaurant first goes active. */
  scoutId: string;
  active: boolean;
  /** DoorDash-style store pause — does not move scout_id. */
  paused: boolean;
};

export type DeliveryDriver = {
  id: string;
  name: string;
  status: DeliveryDriverStatus;
  licenseOk: boolean;
  insuranceOk: boolean;
  softwareUsdPerYear: number;
  /** DoorDash-style “Dash now” — offline drivers do not see offers. */
  online: boolean;
};

export type DeliveryLedgerSplit = {
  gmvUsd: number;
  restaurantCommissionUsd: number;
  platformGrossUsd: number;
  scoutResidualUsd: number;
  deliveryFeeUsd: number;
  tipUsd: number;
  taxUsd: number;
  processorFeeUsd: number;
  /** GMV minus 10% commission minus processor — restaurant pays card fees. */
  restaurantNetUsd: number;
  platformNetUsd: number;
};

export type DeliveryLedgerRow = DeliveryLedgerSplit & {
  id: string;
  orderId: string;
  restaurantId: string;
  scoutId: string;
  driverId: string | null;
  customerName: string;
  createdAt: string;
};

export type MerchantTicket = {
  id: string;
  orderId: string;
  restaurantId: string;
  customerName: string;
  items: Array<{ title: string; qty: number; priceUsd: number }>;
  gmvUsd: number;
  status: MerchantTicketStatus;
  createdAt: string;
};

export type DriverRun = {
  id: string;
  orderId: string;
  restaurantId: string;
  driverId: string | null;
  customerName: string;
  dropoffZip: string;
  deliveryFeeUsd: number;
  tipUsd: number;
  status: DriverRunStatus;
  createdAt: string;
};

export type DeliveryOps = {
  city: string;
  restaurants: DeliveryRestaurant[];
  drivers: DeliveryDriver[];
  ledger: DeliveryLedgerRow[];
  tickets: MerchantTicket[];
  runs: DriverRun[];
};

export function money(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 10% / 5% / 5% split. Fee + tip stay with the driver. Processor from restaurant. */
export function splitDeliveryLedger(input: {
  gmvUsd: number;
  deliveryFeeUsd: number;
  tipUsd: number;
  taxUsd: number;
}): DeliveryLedgerSplit {
  const gmvUsd = money(Math.max(0, input.gmvUsd));
  const deliveryFeeUsd = money(Math.max(0, input.deliveryFeeUsd));
  const tipUsd = money(Math.max(0, input.tipUsd));
  const taxUsd = money(Math.max(0, input.taxUsd));
  const restaurantCommissionUsd = money(gmvUsd * RESTAURANT_COMMISSION_RATE);
  const platformGrossUsd = money(gmvUsd * PLATFORM_SHARE_RATE);
  const scoutResidualUsd = money(gmvUsd * SCOUT_RESIDUAL_RATE);
  const chargedUsd = money(gmvUsd + taxUsd + deliveryFeeUsd + tipUsd);
  const processorFeeUsd = money(chargedUsd * PROCESSOR_RATE);
  const restaurantNetUsd = money(
    gmvUsd - restaurantCommissionUsd - processorFeeUsd,
  );
  return {
    gmvUsd,
    restaurantCommissionUsd,
    platformGrossUsd,
    scoutResidualUsd,
    deliveryFeeUsd,
    tipUsd,
    taxUsd,
    processorFeeUsd,
    restaurantNetUsd,
    platformNetUsd: platformGrossUsd,
  };
}

/** Restaurant payout: GMV − 10% − ~2.9% processor. Platform 5% stays whole. */
export function restaurantNetFromSplit(split: DeliveryLedgerSplit): number {
  return money(
    split.restaurantNetUsd ??
      split.gmvUsd - split.restaurantCommissionUsd - split.processorFeeUsd,
  );
}

/** Scout residual at a weekly GMV input — never implied as a default promise. */
export function scoutResidualForWeeklyGmv(weeklyGmvUsd: number): number {
  return money(Math.max(0, weeklyGmvUsd) * SCOUT_RESIDUAL_RATE);
}

export function weeklyScoutResidualExamples(): Array<{
  weeklyGmvUsd: number;
  residualUsd: number;
}> {
  return WEEKLY_GMV_EXAMPLES.map((weeklyGmvUsd) => ({
    weeklyGmvUsd,
    residualUsd: scoutResidualForWeeklyGmv(weeklyGmvUsd),
  }));
}

export function driverCanDispatch(driver: DeliveryDriver): boolean {
  return (
    driver.status === "approved" &&
    driver.licenseOk &&
    driver.insuranceOk &&
    driver.online
  );
}

export function restaurantForShopItems(
  ops: DeliveryOps,
  items: Array<{ productId?: string; title?: string }>,
): DeliveryRestaurant {
  const blob = items
    .map((item) => `${item.productId ?? ""} ${item.title ?? ""}`)
    .join(" ")
    .toLowerCase();
  if (/taco|street/.test(blob)) {
    return (
      ops.restaurants.find((row) => row.id === "rest-tacos") ??
      ops.restaurants[0]
    );
  }
  if (/deli|river/.test(blob)) {
    return (
      ops.restaurants.find((row) => row.id === "rest-deli") ??
      ops.restaurants[0]
    );
  }
  return (
    ops.restaurants.find((row) => row.id === "rest-pilot") ??
    ops.restaurants.find((row) => row.active) ??
    ops.restaurants[0]
  );
}

export function starterDeliveryOps(projectName: string): DeliveryOps {
  const brand = projectName.replace(/\s+Seed$/i, "").trim() || projectName;
  const createdAt = "2026-09-23T18:00:00.000Z";
  const sampleItems = [
    { title: "Pilot Kitchen · Warm grain bowl", qty: 1, priceUsd: 14 },
    { title: "Pilot Kitchen · Market sandwich", qty: 1, priceUsd: 12 },
  ];
  const split = splitDeliveryLedger({
    gmvUsd: 26,
    deliveryFeeUsd: 5,
    tipUsd: 4,
    taxUsd: 2.15,
  });
  const orderId = "ord-sample-pilot";
  return {
    city: `${brand} · one town`,
    restaurants: [
      {
        id: "rest-pilot",
        name: "Pilot Kitchen",
        neighborhood: "Market Street",
        scoutId: "drv-maya",
        active: true,
        paused: false,
      },
      {
        id: "rest-tacos",
        name: "Second Street Tacos",
        neighborhood: "Second Street",
        scoutId: "drv-maya",
        active: true,
        paused: false,
      },
      {
        id: "rest-deli",
        name: "River Market Deli",
        neighborhood: "Riverwalk",
        scoutId: "drv-riley",
        active: true,
        paused: false,
      },
    ],
    drivers: [
      {
        id: "drv-maya",
        name: "Maya Chen",
        status: "approved",
        licenseOk: true,
        insuranceOk: true,
        softwareUsdPerYear: DRIVER_SOFTWARE_USD_PER_YEAR,
        online: true,
      },
      {
        id: "drv-jordan",
        name: "Jordan Hale",
        status: "approved",
        licenseOk: true,
        insuranceOk: true,
        softwareUsdPerYear: DRIVER_SOFTWARE_USD_PER_YEAR,
        online: true,
      },
      {
        id: "drv-riley",
        name: "Riley Frost",
        status: "frozen",
        licenseOk: true,
        insuranceOk: false,
        softwareUsdPerYear: DRIVER_SOFTWARE_USD_PER_YEAR,
        online: false,
      },
    ],
    ledger: [
      {
        ...split,
        id: "led-sample-pilot",
        orderId,
        restaurantId: "rest-pilot",
        scoutId: "drv-maya",
        driverId: null,
        customerName: "Alex Rivera",
        createdAt,
      },
    ],
    tickets: [
      {
        id: "tkt-sample-pilot",
        orderId,
        restaurantId: "rest-pilot",
        customerName: "Alex Rivera",
        items: sampleItems,
        gmvUsd: split.gmvUsd,
        status: "incoming",
        createdAt,
      },
    ],
    runs: [
      {
        id: "run-sample-pilot",
        orderId,
        restaurantId: "rest-pilot",
        driverId: null,
        customerName: "Alex Rivera",
        dropoffZip: "10001",
        deliveryFeeUsd: split.deliveryFeeUsd,
        tipUsd: split.tipUsd,
        status: "offered",
        createdAt,
      },
    ],
  };
}

export function parseDeliveryOps(raw: string): DeliveryOps | null {
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as DeliveryOps;
    if (
      !parsed ||
      !Array.isArray(parsed.restaurants) ||
      !Array.isArray(parsed.drivers) ||
      !Array.isArray(parsed.ledger) ||
      !Array.isArray(parsed.tickets) ||
      !Array.isArray(parsed.runs)
    ) {
      return null;
    }
    return {
      city: parsed.city || "One town",
      restaurants: parsed.restaurants.map((row) => ({
        ...row,
        paused: Boolean(row.paused),
      })),
      drivers: parsed.drivers.map((row) => ({
        ...row,
        online:
          typeof row.online === "boolean"
            ? row.online
            : row.status === "approved",
      })),
      ledger: parsed.ledger,
      tickets: parsed.tickets,
      runs: parsed.runs,
    };
  } catch {
    return null;
  }
}

export function deliveryOpsJson(ops: DeliveryOps): string {
  return `${JSON.stringify(ops, null, 2)}\n`;
}

/** Freeze stops dispatch only — scout_id on restaurants does not move. */
export function freezeDeliveryDriver(
  ops: DeliveryOps,
  driverId: string,
): DeliveryOps {
  const scoutLocks = ops.restaurants.map((row) => row.scoutId);
  return {
    ...ops,
    drivers: ops.drivers.map((driver) =>
      driver.id === driverId
        ? { ...driver, status: "frozen" as const, online: false }
        : driver,
    ),
    restaurants: ops.restaurants.map((row, index) => ({
      ...row,
      scoutId: scoutLocks[index] ?? row.scoutId,
    })),
  };
}

export function approveDeliveryDriver(
  ops: DeliveryOps,
  driverId: string,
): DeliveryOps {
  const scoutLocks = ops.restaurants.map((row) => row.scoutId);
  return {
    ...ops,
    drivers: ops.drivers.map((driver) =>
      driver.id === driverId
        ? {
            ...driver,
            status: "approved" as const,
            licenseOk: true,
            insuranceOk: true,
          }
        : driver,
    ),
    restaurants: ops.restaurants.map((row, index) => ({
      ...row,
      scoutId: scoutLocks[index] ?? row.scoutId,
    })),
  };
}

export function recordDeliveryOrder(
  ops: DeliveryOps,
  input: {
    ledgerId: string;
    ticketId: string;
    runId: string;
    orderId: string;
    customerName: string;
    dropoffZip: string;
    items: Array<{
      productId?: string;
      title: string;
      qty: number;
      priceUsd: number;
    }>;
    gmvUsd: number;
    deliveryFeeUsd: number;
    tipUsd: number;
    taxUsd: number;
    createdAt?: string;
  },
): DeliveryOps {
  const restaurant = restaurantForShopItems(ops, input.items);
  const split = splitDeliveryLedger({
    gmvUsd: input.gmvUsd,
    deliveryFeeUsd: input.deliveryFeeUsd,
    tipUsd: input.tipUsd,
    taxUsd: input.taxUsd,
  });
  const createdAt = input.createdAt ?? new Date().toISOString();
  const row: DeliveryLedgerRow = {
    ...split,
    id: input.ledgerId,
    orderId: input.orderId,
    restaurantId: restaurant.id,
    scoutId: restaurant.scoutId,
    driverId: null,
    customerName: input.customerName,
    createdAt,
  };
  const ticket: MerchantTicket = {
    id: input.ticketId,
    orderId: input.orderId,
    restaurantId: restaurant.id,
    customerName: input.customerName,
    items: input.items.map((item) => ({
      title: item.title,
      qty: item.qty,
      priceUsd: item.priceUsd,
    })),
    gmvUsd: split.gmvUsd,
    status: "incoming",
    createdAt,
  };
  const run: DriverRun = {
    id: input.runId,
    orderId: input.orderId,
    restaurantId: restaurant.id,
    driverId: null,
    customerName: input.customerName,
    dropoffZip: input.dropoffZip,
    deliveryFeeUsd: split.deliveryFeeUsd,
    tipUsd: split.tipUsd,
    status: "offered",
    createdAt,
  };
  return {
    ...ops,
    ledger: [row, ...ops.ledger].slice(0, 200),
    tickets: [ticket, ...ops.tickets].slice(0, 200),
    runs: [run, ...ops.runs].slice(0, 200),
  };
}

export function setRestaurantPaused(
  ops: DeliveryOps,
  restaurantId: string,
  paused: boolean,
): DeliveryOps {
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) =>
      row.id === restaurantId ? { ...row, paused } : row,
    ),
  };
}

export function setDriverOnline(
  ops: DeliveryOps,
  driverId: string,
  online: boolean,
): DeliveryOps {
  return {
    ...ops,
    drivers: ops.drivers.map((driver) =>
      driver.id === driverId
        ? {
            ...driver,
            online: online && driver.status === "approved",
          }
        : driver,
    ),
  };
}

export function setMerchantTicketStatus(
  ops: DeliveryOps,
  ticketId: string,
  status: MerchantTicketStatus,
): DeliveryOps {
  const ticket = ops.tickets.find((row) => row.id === ticketId);
  return {
    ...ops,
    tickets: ops.tickets.map((row) =>
      row.id === ticketId ? { ...row, status } : row,
    ),
    runs:
      status === "declined" && ticket
        ? ops.runs.map((run) =>
            run.orderId === ticket.orderId && run.status === "offered"
              ? { ...run, status: "cancelled" as const }
              : run,
          )
        : ops.runs,
  };
}

export function acceptDriverRun(
  ops: DeliveryOps,
  runId: string,
  driverId: string,
): { ok: true; ops: DeliveryOps } | { ok: false; error: string } {
  const driver = ops.drivers.find((row) => row.id === driverId);
  if (!driver) return { ok: false, error: "Driver not on this town’s board." };
  if (!driverCanDispatch(driver)) {
    return {
      ok: false,
      error:
        "Dispatch is blocked. License and insurance must be current — a freeze does not move scout residuals.",
    };
  }
  const run = ops.runs.find((row) => row.id === runId);
  if (!run || run.status !== "offered") {
    return { ok: false, error: "That run is no longer offered." };
  }
  return {
    ok: true,
    ops: {
      ...ops,
      runs: ops.runs.map((row) =>
        row.id === runId
          ? { ...row, driverId, status: "accepted" as const }
          : row,
      ),
      ledger: ops.ledger.map((row) =>
        row.orderId === run.orderId ? { ...row, driverId } : row,
      ),
    },
  };
}

export function advanceDriverRun(
  ops: DeliveryOps,
  runId: string,
  driverId: string,
  next: Extract<DriverRunStatus, "picked_up" | "delivered">,
): { ok: true; ops: DeliveryOps } | { ok: false; error: string } {
  const run = ops.runs.find((row) => row.id === runId);
  if (!run || run.driverId !== driverId) {
    return { ok: false, error: "This run is not assigned to you." };
  }
  if (next === "picked_up" && run.status !== "accepted") {
    return { ok: false, error: "Accept the run before pickup." };
  }
  if (next === "delivered" && run.status !== "picked_up") {
    return { ok: false, error: "Mark pickup before you deliver." };
  }
  return {
    ok: true,
    ops: {
      ...ops,
      runs: ops.runs.map((row) =>
        row.id === runId ? { ...row, status: next } : row,
      ),
    },
  };
}

export function summarizeDeliveryLedger(ops: DeliveryOps): {
  gmvUsd: number;
  restaurantCommissionUsd: number;
  restaurantNetUsd: number;
  platformGrossUsd: number;
  scoutResidualUsd: number;
  deliveryFeeUsd: number;
  tipUsd: number;
  processorFeeUsd: number;
  platformNetUsd: number;
} {
  return ops.ledger.reduce(
    (sum, row) => ({
      gmvUsd: money(sum.gmvUsd + row.gmvUsd),
      restaurantCommissionUsd: money(
        sum.restaurantCommissionUsd + row.restaurantCommissionUsd,
      ),
      restaurantNetUsd: money(
        sum.restaurantNetUsd + restaurantNetFromSplit(row),
      ),
      platformGrossUsd: money(sum.platformGrossUsd + row.platformGrossUsd),
      scoutResidualUsd: money(sum.scoutResidualUsd + row.scoutResidualUsd),
      deliveryFeeUsd: money(sum.deliveryFeeUsd + row.deliveryFeeUsd),
      tipUsd: money(sum.tipUsd + row.tipUsd),
      processorFeeUsd: money(sum.processorFeeUsd + row.processorFeeUsd),
      platformNetUsd: money(sum.platformNetUsd + row.platformGrossUsd),
    }),
    {
      gmvUsd: 0,
      restaurantCommissionUsd: 0,
      restaurantNetUsd: 0,
      platformGrossUsd: 0,
      scoutResidualUsd: 0,
      deliveryFeeUsd: 0,
      tipUsd: 0,
      processorFeeUsd: 0,
      platformNetUsd: 0,
    },
  );
}

