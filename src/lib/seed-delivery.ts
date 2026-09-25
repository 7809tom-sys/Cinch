/**
 * Hometown Runner v1 — hyper-local food delivery ops (not a restaurant).
 *
 * HARD RULES:
 * - Three role-based logins: customer, merchant, driver.
 * - Menu: AI crawls the restaurant website for a draft; the merchant
 *   confirms each price before it sells.
 * - Platform keeps $0 from restaurant orders. Revenue is driver
 *   subscriptions only ($39/month part-time, $79/month full-time).
 * - Restaurant pays 10% of delivery GMV. That 10% is fully distributed:
 *   5% originating scout residual + 5% driver commission. Scout_id
 *   is immutable on freeze.
 * - Drivers keep 100% of delivery fee + tip + the 5% commission share.
 *   Stripe Connect split: fee, tip, and 5% transfer directly to the
 *   driver — not through the restaurant — so platform tax/legal
 *   liability stays low.
 * - Restaurant collects the food total. Processing (~2.9%)
 *   comes out of the restaurant. The other 5% of GMV routes to the scout.
 * - Payouts fire automatically at a $25 minimum balance or on the
 *   weekly schedule. Drivers manage their own tax forms on Connect.
 * - Trip charge is $4.50 base + $1.50 per mile so drivers clear the
 *   $0.76 federal mileage rate.
 * - Weekly installments $9.99 / $19.99. Full-time = app open more than
 *   30 hours in a week, or more than 120 hours in 4 weeks.
 * - 60 days without opening the app → account auto-suspended.
 * - Residual examples use $500 / $800 / $1,000 / $2,000 weekly GMV as
 *   inputs — never a $2,000/week default promise.
 */

export const DELIVERY_OPS_PATH = "content/delivery.ops.json";
export const RESTAURANT_COMMISSION_RATE = 0.1;
/** $0 from restaurant orders — platform money is subscriptions only. */
export const PLATFORM_SHARE_RATE = 0;
export const SCOUT_RESIDUAL_RATE = 0.05;
export const DRIVER_COMMISSION_RATE = 0.05;
export const PROCESSOR_RATE = 0.029;
export const DRIVER_SOFTWARE = {
  partTime: { monthlyUsd: 39, weeklyUsd: 9.99 },
  fullTime: { monthlyUsd: 79, weeklyUsd: 19.99 },
} as const;
export const FULL_TIME_HOURS_PER_WEEK = 30;
export const FULL_TIME_HOURS_PER_4_WEEKS = 120;
export const DRIVER_INACTIVE_SUSPEND_DAYS = 60;
/** Trip: $4.50 base + $1.50/mile so the per-mile rate clears IRS $0.76. */
export const TRIP_BASE_USD = 4.5;
export const TRIP_PER_MILE_USD = 1.5;
export const FEDERAL_MILEAGE_USD = 0.76;
export const DEFAULT_TOWN_TRIP_MILES = 3;
/** Auto-payout when the driver's Connect balance hits this, or weekly. */
export const DRIVER_PAYOUT_MIN_BALANCE_USD = 25;
export const DRIVER_PAYOUT_WEEK_MS = 7 * 86_400_000;
/** @deprecated Prefer DRIVER_SOFTWARE. Full-time monthly × 12. */
export const DRIVER_SOFTWARE_USD_PER_YEAR = DRIVER_SOFTWARE.fullTime.monthlyUsd * 12;
export const WEEKLY_GMV_EXAMPLES = [500, 800, 1000, 2000] as const;
export const DEFAULT_WEEKLY_GMV_EXAMPLE = 500;

export const PAYMENT_ECONOMICS_BRIEF_BLOCK = `Payment & Economics:
- Platform revenue: Hometown Runner keeps $0 from restaurant orders. Revenue is driver subscriptions only ($39/month part-time, $79/month full-time).
- Order commission: the 10% on delivery GMV is fully distributed — 5% scout residual, 5% driver. Not a platform cut.
- Payment flow: split-architecture via Stripe Connect. The restaurant collects the food total and pays the ~2.9% processor. Fee, tip, and the 5% driver share transfer directly to the driver's Connect account — not through the restaurant — so the platform's tax and legal liability stays low. The other 5% routes to the scout.
- Payouts: automatic when the driver hits a $25 minimum balance, or on the weekly schedule.
- Tax forms: drivers manage their own tax forms on Stripe Connect. The restaurant does not issue 1099s.
- Trip: $4.50 base plus $1.50 per mile so drivers clear the $0.76 federal mileage rate.`;

export const HOMETOWN_PLATFORM_BRIEF_BLOCK = `Hometown platform:
- Role logins: three distinct sign-ins — customer (order), merchant (kitchen + menu confirm), and driver (dash + Connect payouts).
- Menu: AI crawls the restaurant website for an initial draft; the merchant confirms each price before it sells.`;

export const DRIVER_POLICY_BRIEF_BLOCK = `Driver subscriptions & policies:
- Fees: weekly installments $9.99 part-time or $19.99 full-time ($39 / $79 monthly).
- Full-time: app open more than 30 hours a week, or more than 120 hours in 4 weeks. Below that is part-time.
- If a driver does not open the app for 60 days, the account is automatically suspended.`;

export type DeliveryDriverStatus =
  | "pending"
  | "approved"
  | "frozen"
  | "suspended";
export type DriverClassification = "part_time" | "full_time";
export type DriverSoftwareCadence = "monthly" | "weekly";
export type DriverPayoutTrigger = "min_balance" | "weekly";
export type HometownRole = "customer" | "merchant" | "driver";

export function hometownRoleCopy(role: HometownRole): {
  title: string;
  support: string;
  cta: string;
} {
  if (role === "merchant") {
    return {
      title: "Merchant login",
      support:
        "Kitchen desk: confirm AI-crawled menu prices, take tickets, hand bags to a Hometown driver.",
      cta: "Sign in as merchant",
    };
  }
  if (role === "driver") {
    return {
      title: "Driver login",
      support:
        "Go online, take offers, and get fee + tip + 5% on Stripe Connect. You manage your own tax forms.",
      cta: "Sign in as driver",
    };
  }
  return {
    title: "Customer login",
    support: "Order nearby kitchens. A driver from this town brings dinner.",
    cta: "Sign in as customer",
  };
}
export type RestaurantMenuItem = {
  id: string;
  title: string;
  category: string;
  draftPriceUsd: number;
  confirmedPriceUsd: number | null;
  source: "ai_crawl" | "merchant";
};
export type RestaurantMenuDraft = {
  sourceUrl: string;
  crawledAt: string;
  items: RestaurantMenuItem[];
};
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
  /** Public site AI crawls for the first menu draft. */
  websiteUrl?: string;
  /** Hybrid menu: AI draft, then merchant confirms prices. */
  menu?: RestaurantMenuDraft;
};

export type DeliveryDriver = {
  id: string;
  name: string;
  status: DeliveryDriverStatus;
  licenseOk: boolean;
  insuranceOk: boolean;
  classification: DriverClassification;
  softwareCadence: DriverSoftwareCadence;
  hoursOpenThisWeek: number;
  hoursOpenLast4Weeks: number;
  lastAppOpenAt: string | null;
  softwareUsdPerYear: number;
  /** DoorDash-style “Dash now” — offline drivers do not see offers. */
  online: boolean;
  /** Headshot used as photo ID at restaurant handoff. */
  photoUrl?: string;
  /** Short license/ID code shown with the photo. */
  photoIdNumber?: string;
  /** Stripe Connect account — fee/tip/5% land here, not the restaurant. */
  connectAccountId?: string;
  payoutTrigger?: DriverPayoutTrigger;
  pendingPayoutUsd?: number;
  lastPayoutAt?: string | null;
  /** Drivers file their own Connect tax forms — restaurant does not 1099. */
  taxFormsSelfManaged?: boolean;
};

export type DeliveryLedgerSplit = {
  gmvUsd: number;
  restaurantCommissionUsd: number;
  /** Always $0 on restaurant orders — platform money is subscriptions. */
  platformGrossUsd: number;
  scoutResidualUsd: number;
  /** 5% of GMV — the driver’s half of the 10% commission. */
  driverCommissionUsd: number;
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
  driverCommissionUsd: number;
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

export function briefHasDriverPolicy(brief: string): boolean {
  return /\$39\s*\/\s*month|\$9\.99\s*\/\s*week|60\s*-?\s*days?/i.test(brief);
}

export function briefHasCurrentEconomics(brief: string): boolean {
  return /keeps \$0|\$0 from restaurant|5% goes to the driver|5% driver|stripe connect|\$4\.50/i.test(
    brief,
  );
}

export function briefHasHometownPlatformSpecs(brief: string): boolean {
  return /three distinct|role-based|ai crawls|merchant confirms/i.test(brief);
}

/** Append payment + subscription rules when a delivery brief is missing them. */
export function withDeliveryDriverPolicyBrief(brief: string): string {
  const parts: string[] = [];
  const trimmed = brief.trim();
  if (trimmed) parts.push(trimmed);
  if (!briefHasCurrentEconomics(trimmed)) {
    parts.push(PAYMENT_ECONOMICS_BRIEF_BLOCK);
  }
  if (!briefHasHometownPlatformSpecs(trimmed)) {
    parts.push(HOMETOWN_PLATFORM_BRIEF_BLOCK);
  }
  if (!briefHasDriverPolicy(trimmed)) {
    parts.push(DRIVER_POLICY_BRIEF_BLOCK);
  }
  return parts.join("\n\n");
}

/** $4.50 + $1.50 × miles. Always clears the $0.76 federal mileage rate. */
export function tripChargeUsd(miles: number): number {
  return money(TRIP_BASE_USD + TRIP_PER_MILE_USD * Math.max(0, miles));
}

/** Same-town hop from the drop-off ZIP — 1–6 miles, default 3. */
export function estimateTownTripMiles(zip: string): number {
  const digits = zip.replace(/\D/g, "");
  if (digits.length < 5) return DEFAULT_TOWN_TRIP_MILES;
  return Math.min(6, Math.max(1, (Number(digits.slice(-2)) % 6) + 1));
}

export function hometownDeliveryFeeUsd(zip: string): number {
  return tripChargeUsd(estimateTownTripMiles(zip));
}

export function tripClearsFederalMileage(miles = 1): boolean {
  return (
    TRIP_PER_MILE_USD > FEDERAL_MILEAGE_USD &&
    tripChargeUsd(miles) > money(FEDERAL_MILEAGE_USD * Math.max(0, miles))
  );
}

/** Auto-payout at $25 pending, or every 7 days on the weekly trigger. */
export function shouldTriggerDriverPayout(input: {
  pendingUsd: number;
  trigger?: DriverPayoutTrigger;
  lastPayoutAt?: string | null;
  now?: Date;
}): boolean {
  const pending = money(Math.max(0, input.pendingUsd));
  if (pending <= 0) return false;
  if (pending >= DRIVER_PAYOUT_MIN_BALANCE_USD) return true;
  if (input.trigger !== "weekly") return false;
  if (!input.lastPayoutAt) return true;
  const last = new Date(input.lastPayoutAt).getTime();
  if (Number.isNaN(last)) return true;
  return (input.now ?? new Date()).getTime() - last >= DRIVER_PAYOUT_WEEK_MS;
}

export function defaultDriverConnectAccountId(driverId: string): string {
  return `acct_${driverId.replace(/[^a-z0-9]/gi, "")}`;
}

export function defaultRestaurantWebsiteUrl(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24) || "kitchen";
  return `https://${slug}.example.com/menu`;
}

/** AI crawl of the restaurant website — draft prices the merchant must confirm. */
export function crawlRestaurantMenuDraft(input: {
  restaurantName: string;
  websiteUrl?: string;
  crawledAt?: string;
}): RestaurantMenuDraft {
  const slug = input.restaurantName.toLowerCase();
  const items: RestaurantMenuItem[] = /taco/.test(slug)
    ? [
        {
          id: "menu-taco-street",
          title: "Street tacos",
          category: "Plates",
          draftPriceUsd: 12,
          confirmedPriceUsd: null,
          source: "ai_crawl",
        },
        {
          id: "menu-taco-agua",
          title: "Agua fresca",
          category: "Drinks",
          draftPriceUsd: 4,
          confirmedPriceUsd: null,
          source: "ai_crawl",
        },
      ]
    : /deli/.test(slug)
      ? [
          {
            id: "menu-deli-soup",
            title: "Soup and half",
            category: "Lunch",
            draftPriceUsd: 11,
            confirmedPriceUsd: 11,
            source: "merchant",
          },
          {
            id: "menu-deli-pickle",
            title: "House pickle jar",
            category: "Sides",
            draftPriceUsd: 4,
            confirmedPriceUsd: null,
            source: "ai_crawl",
          },
        ]
      : [
          {
            id: "menu-pilot-bowl",
            title: "Warm grain bowl",
            category: "Plates",
            draftPriceUsd: 14,
            confirmedPriceUsd: 14,
            source: "merchant",
          },
          {
            id: "menu-pilot-sandwich",
            title: "Market sandwich",
            category: "Plates",
            draftPriceUsd: 12,
            confirmedPriceUsd: null,
            source: "ai_crawl",
          },
        ];
  return {
    sourceUrl:
      input.websiteUrl?.trim() ||
      defaultRestaurantWebsiteUrl(input.restaurantName),
    crawledAt: input.crawledAt ?? "2026-09-23T18:00:00.000Z",
    items,
  };
}

export function sellableRestaurantMenu(
  restaurant: Pick<DeliveryRestaurant, "menu">,
): Array<RestaurantMenuItem & { priceUsd: number }> {
  return (restaurant.menu?.items ?? [])
    .filter((item) => item.confirmedPriceUsd != null)
    .map((item) => ({
      ...item,
      priceUsd: money(item.confirmedPriceUsd as number),
    }));
}

export function confirmRestaurantMenuPrice(
  ops: DeliveryOps,
  restaurantId: string,
  itemId: string,
  priceUsd: number,
): DeliveryOps {
  const confirmed = money(Math.max(0, priceUsd));
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) => {
      if (row.id !== restaurantId) return row;
      const menu =
        row.menu ??
        crawlRestaurantMenuDraft({
          restaurantName: row.name,
          websiteUrl: row.websiteUrl,
        });
      return {
        ...row,
        menu: {
          ...menu,
          items: menu.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  confirmedPriceUsd: confirmed,
                  source: "merchant" as const,
                }
              : item,
          ),
        },
      };
    }),
  };
}

export function normalizeDeliveryRestaurant(
  row: DeliveryRestaurant,
): DeliveryRestaurant {
  const websiteUrl =
    row.websiteUrl?.trim() || defaultRestaurantWebsiteUrl(row.name);
  const menu =
    row.menu && Array.isArray(row.menu.items) && row.menu.items.length > 0
      ? row.menu
      : crawlRestaurantMenuDraft({
          restaurantName: row.name,
          websiteUrl,
        });
  return {
    ...row,
    paused: Boolean(row.paused),
    websiteUrl,
    menu,
  };
}

export function classifyDriverHours(
  hoursThisWeek: number,
  hoursLast4Weeks: number,
): DriverClassification {
  if (
    hoursThisWeek > FULL_TIME_HOURS_PER_WEEK ||
    hoursLast4Weeks > FULL_TIME_HOURS_PER_4_WEEKS
  ) {
    return "full_time";
  }
  return "part_time";
}

export function driverSoftwareFeeUsd(
  classification: DriverClassification,
  cadence: DriverSoftwareCadence,
): number {
  const plan =
    classification === "full_time"
      ? DRIVER_SOFTWARE.fullTime
      : DRIVER_SOFTWARE.partTime;
  return cadence === "weekly" ? plan.weeklyUsd : plan.monthlyUsd;
}

export function driverSoftwareAnnualUsd(
  classification: DriverClassification,
  cadence: DriverSoftwareCadence,
): number {
  const fee = driverSoftwareFeeUsd(classification, cadence);
  return money(fee * (cadence === "weekly" ? 52 : 12));
}

export function driverInactiveTooLong(
  lastAppOpenAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (!lastAppOpenAt) return false;
  const last = new Date(lastAppOpenAt).getTime();
  if (Number.isNaN(last)) return false;
  const days = (now.getTime() - last) / 86_400_000;
  return days >= DRIVER_INACTIVE_SUSPEND_DAYS;
}

const DRIVER_PHOTO_IDS: Record<
  string,
  { photoUrl: string; photoIdNumber: string }
> = {
  "drv-maya": {
    photoUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&h=200&q=80",
    photoIdNumber: "DL ·••4481",
  },
  "drv-jordan": {
    photoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80",
    photoIdNumber: "DL ·••2290",
  },
  "drv-riley": {
    photoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80",
    photoIdNumber: "DL ·••7714",
  },
  "drv-casey": {
    photoUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&h=200&q=80",
    photoIdNumber: "DL ·••9052",
  },
};

/** Name-card photo + short ID for kitchen handoff verification. */
export function driverPhotoId(
  driver: Pick<DeliveryDriver, "id" | "name" | "photoUrl" | "photoIdNumber">,
): { photoUrl: string; photoIdNumber: string } {
  const seeded = DRIVER_PHOTO_IDS[driver.id];
  const digits = driver.id.replace(/\D/g, "").slice(-4).padStart(4, "0");
  const fallbackNumber = `DL ·••${digits}`;
  const fallbackPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=0b2e2a&color=fff&size=128`;
  return {
    photoUrl:
      driver.photoUrl && /^https?:\/\//.test(driver.photoUrl)
        ? driver.photoUrl
        : (seeded?.photoUrl ?? fallbackPhoto),
    photoIdNumber:
      driver.photoIdNumber?.trim() || seeded?.photoIdNumber || fallbackNumber,
  };
}

export function availableDispatchDrivers(ops: DeliveryOps): DeliveryDriver[] {
  return ops.drivers.filter((driver) => driverCanDispatch(driver));
}

/** Driver who accepted the run — not the originating scout. */
export function ticketAssignedDriver(
  ops: DeliveryOps,
  ticket: Pick<MerchantTicket, "orderId">,
): DeliveryDriver | null {
  const run = ops.runs.find((row) => row.orderId === ticket.orderId);
  if (run && (run.status === "offered" || run.status === "cancelled")) {
    return null;
  }
  const driverId =
    run?.driverId ??
    ops.ledger.find((row) => row.orderId === ticket.orderId)?.driverId ??
    null;
  if (!driverId) return null;
  return ops.drivers.find((row) => row.id === driverId) ?? null;
}

export function normalizeDeliveryDriver(
  row: DeliveryDriver,
  now = new Date(),
): DeliveryDriver {
  const hoursOpenThisWeek = Math.max(0, Number(row.hoursOpenThisWeek) || 0);
  const hoursOpenLast4Weeks = Math.max(0, Number(row.hoursOpenLast4Weeks) || 0);
  const classification =
    row.classification === "full_time" || row.classification === "part_time"
      ? row.classification
      : classifyDriverHours(hoursOpenThisWeek, hoursOpenLast4Weeks);
  const softwareCadence =
    row.softwareCadence === "weekly" ? "weekly" : "monthly";
  const inactive = driverInactiveTooLong(row.lastAppOpenAt, now);
  let status = row.status;
  if (status === "approved" && inactive) status = "suspended";
  if (status !== "approved" && status !== "pending") {
    // frozen / suspended stay offline
  }
  return {
    ...row,
    classification,
    softwareCadence,
    hoursOpenThisWeek,
    hoursOpenLast4Weeks,
    lastAppOpenAt: row.lastAppOpenAt ?? null,
    softwareUsdPerYear: driverSoftwareAnnualUsd(classification, softwareCadence),
    status,
    online: status === "approved" ? Boolean(row.online) : false,
    connectAccountId:
      row.connectAccountId?.trim() || defaultDriverConnectAccountId(row.id),
    payoutTrigger: row.payoutTrigger === "weekly" ? "weekly" : "min_balance",
    pendingPayoutUsd: money(Math.max(0, Number(row.pendingPayoutUsd) || 0)),
    lastPayoutAt: row.lastPayoutAt ?? null,
    taxFormsSelfManaged: true,
    ...driverPhotoId(row),
  };
}

export function applyDriverSubscriptionPolicies(
  ops: DeliveryOps,
  now = new Date(),
): DeliveryOps {
  return {
    ...ops,
    drivers: ops.drivers.map((driver) => normalizeDeliveryDriver(driver, now)),
  };
}

/** 10% restaurant commission → 5% scout + 5% driver. Platform $0 on the order. */
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
  const scoutResidualUsd = money(gmvUsd * SCOUT_RESIDUAL_RATE);
  const driverCommissionUsd = money(gmvUsd * DRIVER_COMMISSION_RATE);
  const chargedUsd = money(gmvUsd + taxUsd + deliveryFeeUsd + tipUsd);
  const processorFeeUsd = money(chargedUsd * PROCESSOR_RATE);
  const restaurantNetUsd = money(
    gmvUsd - restaurantCommissionUsd - processorFeeUsd,
  );
  return {
    gmvUsd,
    restaurantCommissionUsd,
    platformGrossUsd: 0,
    scoutResidualUsd,
    driverCommissionUsd,
    deliveryFeeUsd,
    tipUsd,
    taxUsd,
    processorFeeUsd,
    restaurantNetUsd,
    platformNetUsd: 0,
  };
}

/** Restaurant payout: GMV − 10% − ~2.9% processor. */
export function restaurantNetFromSplit(split: DeliveryLedgerSplit): number {
  return money(
    split.restaurantNetUsd ??
      split.gmvUsd - split.restaurantCommissionUsd - split.processorFeeUsd,
  );
}

/** Driver Connect payout: fee + tip + 5% commission share. */
export function driverPayoutFromSplit(split: {
  deliveryFeeUsd: number;
  tipUsd: number;
  driverCommissionUsd?: number;
  gmvUsd: number;
}): number {
  const commission =
    split.driverCommissionUsd ?? money(split.gmvUsd * DRIVER_COMMISSION_RATE);
  return money(split.deliveryFeeUsd + split.tipUsd + commission);
}

/** Who ran the bag — ledger driverId, else the matching run. Scout is not a fallback. */
export function ledgerRunDriverId(
  row: Pick<DeliveryLedgerRow, "orderId" | "driverId">,
  runs: Array<Pick<DriverRun, "orderId" | "driverId">>,
): string | null {
  if (row.driverId) return row.driverId;
  return runs.find((item) => item.orderId === row.orderId)?.driverId ?? null;
}

export function deliveryDriverDisplayName(
  drivers: Array<Pick<DeliveryDriver, "id" | "name">>,
  driverId: string | null,
): string {
  if (!driverId) return "Unassigned";
  return drivers.find((item) => item.id === driverId)?.name ?? driverId;
}

/** Fee + tip + 5% for rows attributed to this driver (not the originating scout). */
export function driverAttributedPayoutUsd(
  ops: DeliveryOps,
  driverId: string,
): number {
  return money(
    ops.ledger
      .filter((row) => ledgerRunDriverId(row, ops.runs) === driverId)
      .reduce((sum, row) => sum + driverPayoutFromSplit(row), 0),
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
    deliveryFeeUsd: hometownDeliveryFeeUsd("10001"),
    tipUsd: 4,
    taxUsd: 2.15,
  });
  const orderId = "ord-sample-pilot";
  const deliveredSplit = splitDeliveryLedger({
    gmvUsd: 11,
    deliveryFeeUsd: hometownDeliveryFeeUsd("10003"),
    tipUsd: 3,
    taxUsd: 0.91,
  });
  const deliveredAt = "2026-09-23T19:10:00.000Z";
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
        websiteUrl: defaultRestaurantWebsiteUrl("Pilot Kitchen"),
        menu: crawlRestaurantMenuDraft({
          restaurantName: "Pilot Kitchen",
          websiteUrl: defaultRestaurantWebsiteUrl("Pilot Kitchen"),
        }),
      },
      {
        id: "rest-tacos",
        name: "Second Street Tacos",
        neighborhood: "Second Street",
        scoutId: "drv-maya",
        active: true,
        paused: false,
        websiteUrl: defaultRestaurantWebsiteUrl("Second Street Tacos"),
        menu: crawlRestaurantMenuDraft({
          restaurantName: "Second Street Tacos",
          websiteUrl: defaultRestaurantWebsiteUrl("Second Street Tacos"),
        }),
      },
      {
        id: "rest-deli",
        name: "River Market Deli",
        neighborhood: "Riverwalk",
        scoutId: "drv-riley",
        active: true,
        paused: false,
        websiteUrl: defaultRestaurantWebsiteUrl("River Market Deli"),
        menu: crawlRestaurantMenuDraft({
          restaurantName: "River Market Deli",
          websiteUrl: defaultRestaurantWebsiteUrl("River Market Deli"),
        }),
      },
    ],
    drivers: [
      {
        id: "drv-maya",
        name: "Maya Chen",
        status: "approved",
        licenseOk: true,
        insuranceOk: true,
        classification: "full_time",
        softwareCadence: "monthly",
        hoursOpenThisWeek: 36,
        hoursOpenLast4Weeks: 140,
        lastAppOpenAt: createdAt,
        softwareUsdPerYear: driverSoftwareAnnualUsd("full_time", "monthly"),
        online: true,
        connectAccountId: defaultDriverConnectAccountId("drv-maya"),
        payoutTrigger: "min_balance",
        pendingPayoutUsd: money(
          Math.max(DRIVER_PAYOUT_MIN_BALANCE_USD, driverPayoutFromSplit(deliveredSplit)),
        ),
        lastPayoutAt: null,
        taxFormsSelfManaged: true,
      },
      {
        id: "drv-jordan",
        name: "Jordan Hale",
        status: "approved",
        licenseOk: true,
        insuranceOk: true,
        classification: "part_time",
        softwareCadence: "weekly",
        hoursOpenThisWeek: 12,
        hoursOpenLast4Weeks: 40,
        lastAppOpenAt: createdAt,
        softwareUsdPerYear: driverSoftwareAnnualUsd("part_time", "weekly"),
        online: true,
        connectAccountId: defaultDriverConnectAccountId("drv-jordan"),
        payoutTrigger: "weekly",
        pendingPayoutUsd: 12,
        lastPayoutAt: createdAt,
        taxFormsSelfManaged: true,
      },
      {
        id: "drv-riley",
        name: "Riley Frost",
        status: "frozen",
        licenseOk: true,
        insuranceOk: false,
        classification: "part_time",
        softwareCadence: "monthly",
        hoursOpenThisWeek: 8,
        hoursOpenLast4Weeks: 20,
        lastAppOpenAt: createdAt,
        softwareUsdPerYear: driverSoftwareAnnualUsd("part_time", "monthly"),
        online: false,
        connectAccountId: defaultDriverConnectAccountId("drv-riley"),
        payoutTrigger: "min_balance",
        pendingPayoutUsd: 0,
        lastPayoutAt: null,
        taxFormsSelfManaged: true,
      },
      {
        id: "drv-casey",
        name: "Casey Quinn",
        status: "suspended",
        licenseOk: true,
        insuranceOk: true,
        classification: "part_time",
        softwareCadence: "monthly",
        hoursOpenThisWeek: 0,
        hoursOpenLast4Weeks: 6,
        lastAppOpenAt: "2026-07-20T18:00:00.000Z",
        softwareUsdPerYear: driverSoftwareAnnualUsd("part_time", "monthly"),
        online: false,
        connectAccountId: defaultDriverConnectAccountId("drv-casey"),
        payoutTrigger: "weekly",
        pendingPayoutUsd: 0,
        lastPayoutAt: "2026-07-20T18:00:00.000Z",
        taxFormsSelfManaged: true,
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
      {
        ...deliveredSplit,
        id: "led-sample-deli",
        orderId: "ord-sample-deli",
        restaurantId: "rest-deli",
        scoutId: "drv-riley",
        driverId: "drv-maya",
        customerName: "Sam Ortiz",
        createdAt: deliveredAt,
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
      {
        id: "tkt-sample-deli",
        orderId: "ord-sample-deli",
        restaurantId: "rest-deli",
        customerName: "Sam Ortiz",
        items: [
          {
            title: "River Market Deli · Soup and half",
            qty: 1,
            priceUsd: 11,
          },
        ],
        gmvUsd: deliveredSplit.gmvUsd,
        status: "completed",
        createdAt: deliveredAt,
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
        driverCommissionUsd: split.driverCommissionUsd,
        status: "offered",
        createdAt,
      },
      {
        id: "run-sample-deli",
        orderId: "ord-sample-deli",
        restaurantId: "rest-deli",
        driverId: "drv-maya",
        customerName: "Sam Ortiz",
        dropoffZip: "10003",
        deliveryFeeUsd: deliveredSplit.deliveryFeeUsd,
        tipUsd: deliveredSplit.tipUsd,
        driverCommissionUsd: deliveredSplit.driverCommissionUsd,
        status: "delivered",
        createdAt: deliveredAt,
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
    const remintTripFee = (orderId: string, zip: string | undefined, current: number) => {
      if (zip && (current === 5 || /^ord-sample-/.test(orderId))) {
        return hometownDeliveryFeeUsd(zip);
      }
      return money(Math.max(0, current));
    };
    const ledger = parsed.ledger.map((row) => {
      const run = parsed.runs.find((item) => item.orderId === row.orderId);
      const remint = splitDeliveryLedger({
        gmvUsd: row.gmvUsd,
        deliveryFeeUsd: remintTripFee(
          row.orderId,
          run?.dropoffZip,
          row.deliveryFeeUsd,
        ),
        tipUsd: row.tipUsd,
        taxUsd: row.taxUsd ?? 0,
      });
      return {
        ...row,
        ...remint,
        driverId: row.driverId ?? run?.driverId ?? null,
      };
    });
    const runs = parsed.runs.map((row) => {
      const led = ledger.find((item) => item.orderId === row.orderId);
      return {
        ...row,
        deliveryFeeUsd: remintTripFee(
          row.orderId,
          row.dropoffZip,
          row.deliveryFeeUsd,
        ),
        driverCommissionUsd:
          typeof row.driverCommissionUsd === "number" && row.deliveryFeeUsd !== 5
            ? row.driverCommissionUsd
            : money((led?.gmvUsd ?? 0) * DRIVER_COMMISSION_RATE),
      };
    });
    const ops: DeliveryOps = {
      city: parsed.city || "One town",
      restaurants: parsed.restaurants.map((row) =>
        normalizeDeliveryRestaurant(row),
      ),
      drivers: parsed.drivers.map((row) =>
        normalizeDeliveryDriver({
          ...row,
          online:
            typeof row.online === "boolean"
              ? row.online
              : row.status === "approved",
        }),
      ),
      ledger,
      tickets: parsed.tickets,
      runs,
    };
    return {
      ...ops,
      drivers: ops.drivers.map((driver) => {
        const attributed = driverAttributedPayoutUsd(ops, driver.id);
        if (
          (driver.pendingPayoutUsd ?? 0) === 0 &&
          !driver.lastPayoutAt &&
          attributed > 0
        ) {
          return { ...driver, pendingPayoutUsd: attributed };
        }
        return driver;
      }),
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
            lastAppOpenAt: new Date().toISOString(),
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
    driverCommissionUsd: split.driverCommissionUsd,
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
            lastAppOpenAt:
              online && driver.status === "approved"
                ? new Date().toISOString()
                : driver.lastAppOpenAt,
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
  driverCommissionUsd: number;
  driverPayoutUsd: number;
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
      platformGrossUsd: 0,
      scoutResidualUsd: money(sum.scoutResidualUsd + row.scoutResidualUsd),
      driverCommissionUsd: money(
        sum.driverCommissionUsd +
          (row.driverCommissionUsd ?? money(row.gmvUsd * DRIVER_COMMISSION_RATE)),
      ),
      driverPayoutUsd: money(
        sum.driverPayoutUsd + driverPayoutFromSplit(row),
      ),
      deliveryFeeUsd: money(sum.deliveryFeeUsd + row.deliveryFeeUsd),
      tipUsd: money(sum.tipUsd + row.tipUsd),
      processorFeeUsd: money(sum.processorFeeUsd + row.processorFeeUsd),
      platformNetUsd: 0,
    }),
    {
      gmvUsd: 0,
      restaurantCommissionUsd: 0,
      restaurantNetUsd: 0,
      platformGrossUsd: 0,
      scoutResidualUsd: 0,
      driverCommissionUsd: 0,
      driverPayoutUsd: 0,
      deliveryFeeUsd: 0,
      tipUsd: 0,
      processorFeeUsd: 0,
      platformNetUsd: 0,
    },
  );
}

