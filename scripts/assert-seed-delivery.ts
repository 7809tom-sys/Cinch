/**
 * Guard: Hometown Runner v1 is a delivery platform the Seed actually builds.
 * Ledger is 10% → 5% scout / 5% driver, $0 platform on orders;
 * drivers keep fee+tip+5%; freeze does not move scout.
 * Residual examples use $500 / $800 / $1,000 / $2,000 — never a $2,000 default.
 * Run: npx tsx scripts/assert-seed-delivery.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  DEFAULT_WEEKLY_GMV_EXAMPLE,
  DRIVER_SOFTWARE,
  DRIVER_SOFTWARE_FREE_DAYS,
  WEEKLY_GMV_EXAMPLES,
  acceptDriverRun,
  advanceDriverRun,
  applyDriverSubscriptionPolicies,
  approveDeliveryDriver,
  availableDispatchDrivers,
  classifyDriverHours,
  driverInFreeTrial,
  driverCanDispatch,
  driverPhotoId,
  driverSoftwareAnnualUsd,
  driverSoftwareFeeUsd,
  driverSoftwareFreeUntil,
  firstSuccessfulDriveAt,
  freezeDeliveryDriver,
  recordDeliveryOrder,
  setDriverOnline,
  setMerchantTicketStatus,
  setRestaurantPaused,
  scoutEligibleToBePaid,
  scoutPayoutDriverId,
  scoutResidualForWeeklyGmv,
  deliveryDriverDisplayName,
  deliveryOpsJson,
  driverAttributedPayoutUsd,
  confirmRestaurantMenuPrice,
  crawlRestaurantMenuDraft,
  findSellableMenuItems,
  threePartyStripeSplit,
  uploadRestaurantMenuItem,
  hometownDeliveryFeeUsd,
  sellableRestaurantMenu,
  shouldTriggerDriverPayout,
  tripChargeUsd,
  tripClearsFederalMileage,
  TRIP_BASE_USD,
  TRIP_PER_MILE_USD,
  FEDERAL_MILEAGE_USD,
  DRIVER_PAYOUT_MIN_BALANCE_USD,
  DOORDASH_AOV_RAKUTEN_USD,
  DOORDASH_AOV_OVER_50_SHARE,
  DOORDASH_AOV_Q4_2025_USD,
  DOORDASH_Q4_2025_GOV_USD,
  DOORDASH_Q4_2025_ORDERS,
  DOORDASH_US_DRIVERS_2025,
  DOORDASH_WORLD_DRIVERS_2025,
  DOORDASH_TYPICAL_ACTIVE_WEEKS,
  DOORDASH_TYPICAL_HOURS_PER_WEEK,
  FULL_SERVICE_DINE_IN_SHARE,
  FULL_SERVICE_DELIVERY_SHARE,
  FULL_SERVICE_DELIVERY_SHARE_2019,
  INDEPENDENT_MEDIAN_REVENUE_USD,
  FULL_SERVICE_PRETAX_MARGIN,
  LIMITED_SERVICE_PRETAX_MARGIN,
  SCOUT_DINE_IN_EXAMPLE_COUPLES,
  SCOUT_MIN_DELIVERIES_PER_MONTH,
  assignRestaurantScout,
  canSignRestaurantAsScout,
  fullServiceTrafficAddsToOne,
  qsrTrafficAddsToOne,
  driverPayoutFromSplit,
  ledgerRunDriverId,
  ledgerScoutPaidDriverId,
  parseDeliveryOps,
  softwareFeeUsd,
  splitDeliveryLedger,
  starterDeliveryOps,
  ticketAssignedDriver,
  unsignedRestaurants,
  weeklyScoutResidualExamples,
  withDeliveryDriverPolicyBrief,
} from "../src/lib/seed-delivery";
import {
  customerFacingShopCopy,
  customerFacingSiteCopy,
  deliveryLandingLooksLikeOpsEconomics,
} from "../src/lib/seed-site-copy";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(TRIP_BASE_USD === 4.5 && TRIP_PER_MILE_USD === 1.5, "trip is $4.50 + $1.50/mile");
assert(FEDERAL_MILEAGE_USD === 0.76, "federal mileage rate is $0.76");
assert(tripChargeUsd(0) === 4.5 && tripChargeUsd(2) === 7.5, "trip math is base plus miles");
assert(
  tripClearsFederalMileage(1) && tripClearsFederalMileage(10),
  "per-mile $1.50 clears the $0.76 federal mileage rate",
);
assert(
  hometownDeliveryFeeUsd("10001") === tripChargeUsd(2),
  "ZIP 10001 estimates 2 town miles",
);
assert(
  DRIVER_PAYOUT_MIN_BALANCE_USD === 25 &&
    shouldTriggerDriverPayout({ pendingUsd: 25, trigger: "min_balance" }) &&
    !shouldTriggerDriverPayout({ pendingUsd: 24, trigger: "min_balance" }) &&
    shouldTriggerDriverPayout({
      pendingUsd: 10,
      trigger: "weekly",
      lastPayoutAt: null,
    }),
  "payouts fire at $25 or on the weekly schedule",
);
const split = splitDeliveryLedger({
  gmvUsd: 100,
  deliveryFeeUsd: 5,
  tipUsd: 4,
  taxUsd: 8.25,
});
assert(split.restaurantCommissionUsd === 10, "restaurant takes 10% of GMV");
assert(split.platformGrossUsd === 0 && split.platformNetUsd === 0, "platform keeps $0 on the order");
assert(split.scoutResidualUsd === 5, "scout residual is 5% of GMV");
assert(split.driverCommissionUsd === 5, "driver commission is the other 5% of GMV");
assert(split.deliveryFeeUsd === 5 && split.tipUsd === 4, "fee + tip stay whole");
assert(
  driverPayoutFromSplit(split) === 14,
  "driver Connect payout is fee + tip + 5% commission",
);
assert(
  split.processorFeeUsd ===
    Math.round((100 + 8.25 + 5 + 4) * 0.029 * 100) / 100,
  "processor is ~2.9% of the charged total",
);
assert(
  split.restaurantNetUsd ===
    Math.round((100 - 10 - split.processorFeeUsd) * 100) / 100,
  "processor comes out of the restaurant",
);

assert(DEFAULT_WEEKLY_GMV_EXAMPLE === 500, "default weekly GMV example is $500");
assert(
  WEEKLY_GMV_EXAMPLES.join(",") === "500,800,1000,2000",
  "examples are $500 / $800 / $1,000 / $2,000",
);
assert(
  scoutResidualForWeeklyGmv(500) === 25 &&
    scoutResidualForWeeklyGmv(800) === 40 &&
    scoutResidualForWeeklyGmv(1000) === 50 &&
    scoutResidualForWeeklyGmv(2000) === 100,
  "residuals are 5% × weekly GMV at each example",
);
assert(
  weeklyScoutResidualExamples()[0]?.weeklyGmvUsd === 500,
  "example list does not start at $2,000",
);

assert(
  classifyDriverHours(29, 120) === "part_time" &&
    classifyDriverHours(31, 10) === "full_time" &&
    classifyDriverHours(10, 121) === "full_time",
  "full-time is >30 hours/week or >120 hours in 4 weeks",
);
assert(
  driverSoftwareFeeUsd("part_time", "monthly") ===
    DRIVER_SOFTWARE.partTime.monthlyUsd &&
    driverSoftwareFeeUsd("full_time", "monthly") ===
      DRIVER_SOFTWARE.fullTime.monthlyUsd &&
    driverSoftwareFeeUsd("part_time", "weekly") ===
      DRIVER_SOFTWARE.partTime.weeklyUsd &&
    driverSoftwareFeeUsd("full_time", "weekly") ===
      DRIVER_SOFTWARE.fullTime.weeklyUsd,
  "software is $39/$79 monthly or $9.99/$19.99 weekly",
);
assert(
  driverSoftwareAnnualUsd("full_time", "monthly") === 948,
  "full-time monthly annualizes to $948",
);
assert(
  DOORDASH_AOV_RAKUTEN_USD === 37.28 &&
    DOORDASH_AOV_OVER_50_SHARE === 0.2 &&
    DOORDASH_AOV_Q4_2025_USD === 33 &&
    Math.round(DOORDASH_Q4_2025_GOV_USD / DOORDASH_Q4_2025_ORDERS) === 33,
  "DoorDash AOV proxies are $37.28 Rakuten and ~$33 Q4 2025 implied",
);
assert(
  DOORDASH_US_DRIVERS_2025 === 8_000_000 &&
    DOORDASH_WORLD_DRIVERS_2025 === 9_000_000 &&
    DOORDASH_TYPICAL_ACTIVE_WEEKS === 10 &&
    DOORDASH_TYPICAL_HOURS_PER_WEEK === 4,
  "DoorDash 2025 driver counts and typical hours are encoded",
);
assert(
  fullServiceTrafficAddsToOne() &&
    qsrTrafficAddsToOne() &&
    FULL_SERVICE_DINE_IN_SHARE === 0.7 &&
    FULL_SERVICE_DELIVERY_SHARE === 0.05 &&
    FULL_SERVICE_DELIVERY_SHARE_2019 === 0.02,
  "full-service mix is 70% dine-in / 5% delivery (2% in 2019)",
);
assert(
  INDEPENDENT_MEDIAN_REVENUE_USD === 850_000 &&
    FULL_SERVICE_PRETAX_MARGIN === 0.028 &&
    LIMITED_SERVICE_PRETAX_MARGIN === 0.04 &&
    SCOUT_DINE_IN_EXAMPLE_COUPLES === 7,
  "independent median $850K, NRA margins, and Riley’s seven couples",
);
assert(
  /\$39\/month/.test(withDeliveryDriverPolicyBrief("Hometown delivery")) &&
    /Stripe Connect/.test(withDeliveryDriverPolicyBrief("Hometown delivery")) &&
    /does not issue 1099s/.test(withDeliveryDriverPolicyBrief("Hometown delivery")) &&
    /\$4\.50/.test(withDeliveryDriverPolicyBrief("Hometown delivery")) &&
    /three distinct/.test(withDeliveryDriverPolicyBrief("Hometown delivery")) &&
    /\$37\.28/.test(withDeliveryDriverPolicyBrief("Hometown delivery")) &&
    /seven couples/.test(withDeliveryDriverPolicyBrief("Hometown delivery")) &&
    /one delivery a month/.test(withDeliveryDriverPolicyBrief("Hometown delivery")) &&
    /three-party/.test(withDeliveryDriverPolicyBrief("Hometown delivery")) &&
    /cannot keep the 5% on their own/.test(
      withDeliveryDriverPolicyBrief("Hometown delivery"),
    ) &&
    /keeps \$0/.test(withDeliveryDriverPolicyBrief("Hometown delivery")) &&
    /60 days free/.test(withDeliveryDriverPolicyBrief("Hometown delivery")) &&
    /first successful drive/.test(
      withDeliveryDriverPolicyBrief("Hometown delivery"),
    ) &&
    /status === "delivered"/.test(
      withDeliveryDriverPolicyBrief("Hometown delivery"),
    ),
  "delivery brief appends $0 platform, three-party Stripe, research, scout-pay, and 60 days free from first delivered run",
);

const ops = starterDeliveryOps("Hometown Runner");
const riley = ops.drivers.find((row) => row.id === "drv-riley");
const maya = ops.drivers.find((row) => row.id === "drv-maya");
const jordan = ops.drivers.find((row) => row.id === "drv-jordan");
const casey = ops.drivers.find((row) => row.id === "drv-casey");
const deli = ops.restaurants.find((row) => row.id === "rest-deli");
const deliLedger = ops.ledger.find((row) => row.orderId === "ord-sample-deli");
assert(Boolean(riley && riley.status === "frozen"), "Riley starts frozen");
assert(
  availableDispatchDrivers(ops).length === 2 &&
    availableDispatchDrivers(ops).every((row) =>
      ["drv-maya", "drv-jordan"].includes(row.id),
    ),
  "kitchen sees two available drivers (Maya and Jordan)",
);
const deliTicket = ops.tickets.find((row) => row.id === "tkt-sample-deli");
const pilotTicket = ops.tickets.find((row) => row.id === "tkt-sample-pilot");
assert(
  ticketAssignedDriver(ops, deliTicket ?? { orderId: "ord-sample-deli" })
    ?.name === "Maya Chen" &&
    Boolean(maya) &&
    driverPhotoId(maya as NonNullable<typeof maya>).photoIdNumber.includes(
      "4481",
    ) &&
    /^https?:\/\//.test(driverPhotoId(maya as NonNullable<typeof maya>).photoUrl),
  "accepted deli ticket shows Maya’s name and photo ID",
);
assert(
  ticketAssignedDriver(ops, pilotTicket ?? { orderId: "ord-sample-pilot" }) ===
    null,
  "unassigned incoming ticket waits for a driver to accept",
);
assert(
  Boolean(riley) &&
    driverPhotoId(riley as NonNullable<typeof riley>).photoIdNumber.includes(
      "7714",
    ),
  "Riley’s scout photo ID is gettable (DL ·••7714)",
);
assert(
  deliLedger?.scoutId === "drv-riley" &&
    deliLedger.driverId === "drv-maya" &&
    deliveryDriverDisplayName(ops.drivers, deliLedger.driverId) ===
      "Maya Chen",
  "delivered deli row attributes the run to Maya, not the originating scout",
);
const now = new Date("2026-09-25T00:00:00.000Z");
assert(
  SCOUT_MIN_DELIVERIES_PER_MONTH === 1,
  "one delivery a month keeps scout pay",
);
assert(
  !scoutEligibleToBePaid(ops, "drv-riley", now) &&
    scoutEligibleToBePaid(ops, "drv-maya", now) &&
    !scoutEligibleToBePaid(ops, "drv-jordan", now),
  "Riley and Jordan missed September; Maya delivered",
);
assert(
  scoutPayoutDriverId(ops, "rest-deli", now) === "drv-maya" &&
    deli?.scoutId === "drv-riley" &&
    ledgerScoutPaidDriverId(deliLedger ?? { restaurantId: "rest-deli", scoutId: "drv-riley" }, ops, now) ===
      "drv-maya",
  "deli 5% cascades to Maya; scout_id stays Riley",
);
assert(
  !canSignRestaurantAsScout(ops, "drv-jordan", now) &&
    !assignRestaurantScout(ops, "rest-deli", "drv-jordan", now).ok,
  "restaurateur Jordan cannot scout without a delivery, and cannot overwrite Riley",
);
const jordanDash = {
  ...ops,
  runs: [
    ...ops.runs,
    {
      id: "run-jordan-sep",
      orderId: "ord-jordan-sep",
      restaurantId: "rest-pilot",
      driverId: "drv-jordan",
      customerName: "Pat Lee",
      dropoffZip: "10001",
      deliveryFeeUsd: 7.5,
      tipUsd: 3,
      driverCommissionUsd: 1.3,
      status: "delivered" as const,
      createdAt: "2026-09-25T12:00:00.000Z",
    },
  ],
};
assert(
  canSignRestaurantAsScout(jordanDash, "drv-jordan", now),
  "after one delivery Jordan can sign a kitchen as a scout",
);
assert(
  unsignedRestaurants(ops).some((row) => row.id === "rest-bakery"),
  "unsigned bakery is waiting for a scout",
);
const signedBakery = assignRestaurantScout(
  jordanDash,
  "rest-bakery",
  "drv-jordan",
  now,
);
assert(
  signedBakery.ok &&
    signedBakery.ops.restaurants.find((row) => row.id === "rest-bakery")
      ?.scoutId === "drv-jordan",
  "restaurateur Jordan signs the unsigned bakery after one delivery",
);
assert(
  signedBakery.ok &&
    scoutPayoutDriverId(signedBakery.ops, "rest-pilot", now) === "drv-maya" &&
    scoutPayoutDriverId(signedBakery.ops, "rest-pilot", now) !== "drv-jordan",
  "Jordan cannot keep the 5% on Pilot Kitchen — his own restaurant",
);
const ownKitchen = assignRestaurantScout(
  signedBakery.ok
    ? {
        ...signedBakery.ops,
        restaurants: signedBakery.ops.restaurants.map((row) =>
          row.id === "rest-pilot" ? { ...row, scoutId: "" } : row,
        ),
      }
    : jordanDash,
  "rest-pilot",
  "drv-jordan",
  now,
);
assert(
  !ownKitchen.ok,
  "assignRestaurantScout refuses the owner’s own kitchen",
);
const ownerAsScout = {
  ...ops,
  restaurants: ops.restaurants.map((row) =>
    row.id === "rest-pilot" ? { ...row, scoutId: "drv-jordan" } : row,
  ),
  runs: jordanDash.runs,
};
assert(
  scoutPayoutDriverId(ownerAsScout, "rest-pilot", now) === "drv-maya",
  "if Jordan is listed as Pilot scout, pay still cascades off his own 5%",
);
const uploaded = uploadRestaurantMenuItem(ops, "rest-pilot", {
  title: "Citrus greens",
  category: "Plates",
  priceUsd: 13,
  aliases: ["salad", "greens"],
});
assert(
  findSellableMenuItems(ops, "grain bowl").some(
    (item) => item.title === "Warm grain bowl",
  ) &&
    findSellableMenuItems(uploaded, "salad").some(
      (item) => item.title === "Citrus greens",
    ) &&
    !findSellableMenuItems(ops, "salad").some(
      (item) => item.title === "Citrus greens",
    ),
  "diners find crawled plates by alias and newly uploaded items",
);
const deliSplit = deliLedger
  ? threePartyStripeSplit(ops, deliLedger, now)
  : null;
assert(
  Boolean(deliSplit) &&
    deliSplit?.restaurant.connectAccountId === "acct_restdeli" &&
    deliSplit?.scout.driverId === "drv-maya" &&
    deliSplit?.scout.connectAccountId === "acct_drvmaya" &&
    deliSplit?.driver.driverId === "drv-maya" &&
    deliSplit?.driver.connectAccountId === "acct_drvmaya" &&
    (deliSplit?.restaurant.amountUsd ?? 0) > 0 &&
    (deliSplit?.scout.amountUsd ?? 0) > 0 &&
    (deliSplit?.driver.amountUsd ?? 0) > 0,
  "three-party Stripe pays restaurant, scout, and driver on their own accounts",
);
const cascadeRank = signedBakery.ok
  ? {
      ...signedBakery.ops,
      runs: [
        ...signedBakery.ops.runs,
        {
          id: "run-jordan-deli",
          orderId: "ord-jordan-deli",
          restaurantId: "rest-deli",
          driverId: "drv-jordan",
          customerName: "Pat Lee",
          dropoffZip: "10003",
          deliveryFeeUsd: 7.5,
          tipUsd: 3,
          driverCommissionUsd: 0.55,
          status: "delivered" as const,
          createdAt: "2026-09-24T16:00:00.000Z",
        },
        {
          id: "run-jordan-deli-2",
          orderId: "ord-jordan-deli-2",
          restaurantId: "rest-deli",
          driverId: "drv-jordan",
          customerName: "Pat Lee",
          dropoffZip: "10003",
          deliveryFeeUsd: 7.5,
          tipUsd: 3,
          driverCommissionUsd: 0.55,
          status: "delivered" as const,
          createdAt: "2026-09-24T18:00:00.000Z",
        },
      ],
    }
  : bakeryOps;
assert(
  scoutEligibleToBePaid(cascadeRank, "drv-maya", now) &&
    scoutPayoutDriverId(cascadeRank, "rest-deli", now) === "drv-jordan",
  "when Riley misses, 5% goes to the signed scout who delivered most to that kitchen",
);
const nextBelow = {
  ...cascadeRank,
  runs: cascadeRank.runs.filter((row) => row.driverId !== "drv-jordan"),
};
assert(
  scoutPayoutDriverId(nextBelow, "rest-deli", now) === "drv-maya",
  "if that scout also misses, 5% goes to the next signed scout below",
);
const deliPayout = deliLedger ? driverPayoutFromSplit(deliLedger) : null;
assert(
  deliPayout !== null &&
    driverAttributedPayoutUsd(ops, "drv-maya") === deliPayout &&
    driverAttributedPayoutUsd(ops, "drv-riley") === 0,
  "fee + tip + 5% sit on the driver who ran the bag",
);
const staleLedger = parseDeliveryOps(
  deliveryOpsJson({
    ...ops,
    ledger: ops.ledger.map((row) =>
      row.orderId === "ord-sample-deli" ? { ...row, driverId: null } : row,
    ),
  }),
);
assert(
  ledgerRunDriverId(
    { orderId: "ord-sample-deli", driverId: null },
    ops.runs,
  ) === "drv-maya" &&
    staleLedger?.ledger.find((row) => row.orderId === "ord-sample-deli")
      ?.driverId === "drv-maya",
  "parse heals a ledger row that forgot the driver already on the run",
);
const oldFlat = parseDeliveryOps(
  deliveryOpsJson({
    ...ops,
    ledger: ops.ledger.map((row) =>
      row.orderId === "ord-sample-pilot"
        ? { ...row, deliveryFeeUsd: 5 }
        : row,
    ),
    runs: ops.runs.map((row) =>
      row.orderId === "ord-sample-pilot"
        ? { ...row, deliveryFeeUsd: 5, dropoffZip: "10001" }
        : row,
    ),
    drivers: ops.drivers.map((row) =>
      row.id === "drv-maya"
        ? { ...row, pendingPayoutUsd: 0, lastPayoutAt: null }
        : row,
    ),
  }),
);
assert(
  oldFlat?.ledger.find((row) => row.orderId === "ord-sample-pilot")
    ?.deliveryFeeUsd === hometownDeliveryFeeUsd("10001") &&
    oldFlat?.runs.find((row) => row.orderId === "ord-sample-pilot")
      ?.deliveryFeeUsd === hometownDeliveryFeeUsd("10001"),
  "parse remints the old $5 flat onto $4.50 + $1.50/mile",
);
assert(
  (oldFlat?.drivers.find((row) => row.id === "drv-maya")?.pendingPayoutUsd ??
    0) > 0,
  "parse heals a missing Connect balance from the driver’s attributed runs",
);
const stalePilotOnly = parseDeliveryOps(
  deliveryOpsJson({
    ...ops,
    restaurants: ops.restaurants.map((row) =>
      row.id === "rest-pilot" ? { ...row, ownerDriverId: null } : row,
    ),
    ledger: ops.ledger.filter((row) => row.orderId !== "ord-sample-deli"),
    tickets: ops.tickets.filter((row) => row.orderId !== "ord-sample-deli"),
    runs: ops.runs.filter((row) => row.orderId !== "ord-sample-deli"),
  }),
);
assert(
  stalePilotOnly?.restaurants.find((row) => row.id === "rest-pilot")
    ?.ownerDriverId === "drv-jordan" &&
    stalePilotOnly.runs.some(
      (row) =>
        row.orderId === "ord-sample-deli" &&
        row.status === "delivered" &&
        row.driverId === "drv-maya",
    ) &&
    scoutPayoutDriverId(stalePilotOnly, "rest-deli", now) === "drv-maya" &&
    unsignedRestaurants(stalePilotOnly).some((row) => row.id === "rest-bakery"),
  "parse remints the deli cascade sample, Jordan as Pilot owner, and the unsigned bakery",
);
const missingBakery = parseDeliveryOps(
  deliveryOpsJson({
    ...ops,
    restaurants: ops.restaurants.filter((row) => row.id !== "rest-bakery"),
  }),
);
assert(
  missingBakery?.restaurants.some(
    (row) => row.id === "rest-bakery" && !row.scoutId,
  ),
  "parse remints Third Street Bakery as unsigned so a restaurateur can sign it",
);
assert(
  stalePilotOnly?.drivers
    .find((row) => row.id === "drv-maya")
    ?.firstDeliveredAt?.startsWith("2026-09-23") &&
    !stalePilotOnly.drivers.find((row) => row.id === "drv-jordan")
      ?.firstDeliveredAt,
  "parse heals Maya’s firstDeliveredAt from the reminted delivered run; Jordan’s clock stays off",
);
const missingFirstDelivered = parseDeliveryOps(
  deliveryOpsJson({
    ...ops,
    drivers: ops.drivers.map((row) =>
      row.id === "drv-maya" ? { ...row, firstDeliveredAt: null } : row,
    ),
  }),
);
assert(
  missingFirstDelivered?.drivers
    .find((row) => row.id === "drv-maya")
    ?.firstDeliveredAt?.startsWith("2026-09-23"),
  "parse heals a missing firstDeliveredAt from Maya’s delivered deli run",
);
assert(
  maya?.classification === "full_time" &&
    maya.softwareUsdPerYear === 948,
  "Maya is full-time at $79/month",
);
assert(
  DRIVER_SOFTWARE_FREE_DAYS === 60,
  "everybody gets 60 days free after the first successful drive",
);
const mayaFirstDrive = firstSuccessfulDriveAt(ops, "drv-maya");
const jordanFirstDrive = firstSuccessfulDriveAt(ops, "drv-jordan");
const trialNow = new Date("2026-09-24T12:00:00.000Z");
const afterTrial = new Date("2026-11-23T00:00:00.000Z");
assert(
  Boolean(mayaFirstDrive?.startsWith("2026-09-23")) &&
    maya?.firstDeliveredAt?.startsWith("2026-09-23") &&
    driverSoftwareFreeUntil(mayaFirstDrive)?.startsWith("2026-11-22"),
  "Maya’s free window starts on her delivered deli run (2026-09-23)",
);
assert(
  driverInFreeTrial({ firstDeliveredAt: mayaFirstDrive }, trialNow) &&
    softwareFeeUsd(
      "full_time",
      "monthly",
      { firstDeliveredAt: mayaFirstDrive },
      trialNow,
    ) === 0,
  "Maya is in the 60-day free trial — software fee is $0",
);
assert(
  !driverInFreeTrial({ firstDeliveredAt: mayaFirstDrive }, afterTrial) &&
    softwareFeeUsd(
      "full_time",
      "monthly",
      { firstDeliveredAt: mayaFirstDrive },
      afterTrial,
    ) === DRIVER_SOFTWARE.fullTime.monthlyUsd,
  "after day 60 Maya pays $79/month",
);
assert(
  jordanFirstDrive == null &&
    !jordan?.firstDeliveredAt &&
    !driverInFreeTrial({ firstDeliveredAt: jordanFirstDrive }, trialNow) &&
    softwareFeeUsd(
      "part_time",
      "weekly",
      { firstDeliveredAt: jordanFirstDrive },
      trialNow,
    ) === 0,
  "Jordan has no delivered run — clock not started, not in the paid window, fee $0",
);
assert(
  jordan?.classification === "part_time" &&
    jordan.softwareCadence === "weekly",
  "Jordan is part-time on the weekly installment",
);
assert(
  casey?.status === "suspended" && !driverCanDispatch(casey),
  "Casey starts suspended after 60 days off the app",
);
const stale = applyDriverSubscriptionPolicies(
  {
    ...ops,
    drivers: ops.drivers.map((row) =>
      row.id === "drv-jordan"
        ? { ...row, lastAppOpenAt: "2026-07-01T00:00:00.000Z", status: "approved" }
        : row,
    ),
  },
  new Date("2026-09-24T00:00:00.000Z"),
);
assert(
  stale.drivers.find((row) => row.id === "drv-jordan")?.status === "suspended",
  "60 days without opening the app auto-suspends an approved driver",
);
assert(
  Boolean(deli && deli.scoutId === "drv-riley"),
  "River Market Deli scout is Riley",
);
assert(
  Boolean(deli?.menu?.items.length) &&
    sellableRestaurantMenu(deli ?? { menu: undefined }).some(
      (item) => item.title === "Soup and half",
    ),
  "AI crawl drafts the deli menu and the merchant-confirmed soup sells",
);
const tacoDraft = crawlRestaurantMenuDraft({
  restaurantName: "Second Street Tacos",
});
assert(
  tacoDraft.items.every((item) => item.confirmedPriceUsd == null) &&
    tacoDraft.items[0]?.source === "ai_crawl",
  "taco crawl stays a draft until the merchant confirms prices",
);
const confirmedTacos = confirmRestaurantMenuPrice(
  ops,
  "rest-tacos",
  "menu-taco-street",
  13,
);
assert(
  confirmedTacos.restaurants
    .find((row) => row.id === "rest-tacos")
    ?.menu?.items.find((item) => item.id === "menu-taco-street")
    ?.confirmedPriceUsd === 13,
  "merchant confirm writes the selling price",
);
assert(
  maya?.taxFormsSelfManaged === true &&
    Boolean(maya?.connectAccountId) &&
    shouldTriggerDriverPayout({
      pendingUsd: maya?.pendingPayoutUsd ?? 0,
      trigger: maya?.payoutTrigger,
      lastPayoutAt: maya?.lastPayoutAt,
    }),
  "Maya’s Connect balance is ready to payout; she files her own tax forms",
);
assert(
  riley ? !driverCanDispatch(riley) : false,
  "frozen / expired insurance cannot dispatch",
);

const frozen = freezeDeliveryDriver(ops, "drv-maya");
assert(
  frozen.restaurants.every(
    (row, index) => row.scoutId === ops.restaurants[index]?.scoutId,
  ),
  "freezing Maya does not move any scout_id",
);
assert(
  frozen.drivers.find((row) => row.id === "drv-maya")?.status === "frozen",
  "Maya is frozen for dispatch",
);

const approved = approveDeliveryDriver(frozen, "drv-maya");
assert(
  approved.restaurants.find((row) => row.id === "rest-deli")?.scoutId ===
    "drv-riley",
  "approving Maya still leaves Riley as deli scout",
);

const blocked = acceptDriverRun(ops, "run-sample-pilot", "drv-riley");
assert(!blocked.ok, "frozen Riley cannot accept a run");

const paused = setRestaurantPaused(ops, "rest-pilot", true);
assert(
  paused.restaurants.find((row) => row.id === "rest-pilot")?.paused === true,
  "restaurant can pause incoming like DoorDash",
);
const offline = setDriverOnline(ops, "drv-jordan", false);
assert(
  offline.drivers.find((row) => row.id === "drv-jordan")?.online === false,
  "driver can go offline",
);
const offlineBlock = acceptDriverRun(offline, "run-sample-pilot", "drv-jordan");
assert(!offlineBlock.ok, "offline driver cannot accept an offer");

const declined = setMerchantTicketStatus(ops, "tkt-sample-pilot", "declined");
assert(
  declined.tickets.find((row) => row.id === "tkt-sample-pilot")?.status ===
    "declined",
  "restaurant can decline an order",
);
assert(
  declined.runs.find((row) => row.id === "run-sample-pilot")?.status ===
    "cancelled",
  "declining an order cancels the offered dash",
);

const taken = acceptDriverRun(ops, "run-sample-pilot", "drv-jordan");
assert(taken.ok, "approved Jordan can accept a run");
if (taken.ok) {
  assert(
    taken.ops.runs.find((row) => row.id === "run-sample-pilot")?.driverId ===
      "drv-jordan",
    "accepted run is assigned to Jordan",
  );
  assert(
    taken.ops.ledger.find((row) => row.orderId === "ord-sample-pilot")
      ?.scoutId === "drv-maya",
    "accepting a run does not rewrite the originating scout",
  );
  assert(
    taken.ops.ledger.find((row) => row.orderId === "ord-sample-pilot")
      ?.driverId === "drv-jordan",
    "accepting a run writes Jordan onto the ledger Driver column",
  );
  assert(
    !taken.ops.drivers.find((row) => row.id === "drv-jordan")
      ?.firstDeliveredAt,
    "accepting an offer does not start the 60-day software clock",
  );
  const picked = advanceDriverRun(
    taken.ops,
    "run-sample-pilot",
    "drv-jordan",
    "picked_up",
  );
  assert(picked.ok, "Jordan can mark pickup");
  if (picked.ok) {
    const dropped = advanceDriverRun(
      picked.ops,
      "run-sample-pilot",
      "drv-jordan",
      "delivered",
    );
    assert(dropped.ok, "Jordan can complete dropoff");
    if (dropped.ok) {
      const started = dropped.ops.drivers.find((row) => row.id === "drv-jordan")
        ?.firstDeliveredAt;
      assert(
        Boolean(started) &&
          driverInFreeTrial({ firstDeliveredAt: started }) &&
          softwareFeeUsd(
            "part_time",
            "weekly",
            { firstDeliveredAt: started },
          ) === 0,
        "Jordan’s first delivered run starts 60 days free and keeps software at $0",
      );
    }
  }
}

const afterOrder = recordDeliveryOrder(ops, {
  ledgerId: "led-test",
  ticketId: "tkt-test",
  runId: "run-test",
  orderId: "ord-test",
  customerName: "Sam",
  dropoffZip: "10002",
  items: [
    {
      productId: "run-pilot-bowl",
      title: "Pilot Kitchen · Warm grain bowl",
      qty: 1,
      priceUsd: 14,
    },
  ],
  gmvUsd: 14,
  deliveryFeeUsd: 5,
  tipUsd: 3,
  taxUsd: 1.16,
});
const row = afterOrder.ledger.find((item) => item.id === "led-test");
assert(Boolean(row), "customer order writes a ledger row");
assert(row?.restaurantId === "rest-pilot", "pilot SKU maps to Pilot Kitchen");
assert(row?.scoutId === "drv-maya", "ledger scout_id is the restaurant lock");
assert(
  row?.scoutPaidDriverId === "drv-maya",
  "new Pilot order pays Maya — she dashed this month",
);
assert(row?.deliveryFeeUsd === 5 && row?.tipUsd === 3, "fee and tip posted whole");
assert(
  afterOrder.tickets.some((item) => item.id === "tkt-test"),
  "merchant ticket is created",
);
assert(
  afterOrder.runs.some((item) => item.id === "run-test" && item.status === "offered"),
  "driver run is offered",
);

const merchantPage = readFileSync(
  join(process.cwd(), "src/app/site/[id]/merchant/page.tsx"),
  "utf8",
);
const drivePage = readFileSync(
  join(process.cwd(), "src/app/site/[id]/drive/page.tsx"),
  "utf8",
);
const enterPage = readFileSync(
  join(process.cwd(), "src/app/site/[id]/enter/page.tsx"),
  "utf8",
);
const roleLogin = readFileSync(
  join(process.cwd(), "src/components/delivery/role-login.tsx"),
  "utf8",
);
const adminPage = readFileSync(
  join(process.cwd(), "src/app/site/[id]/admin/page.tsx"),
  "utf8",
);
const shopAction = readFileSync(
  join(process.cwd(), "src/app/site/[id]/shop/actions.ts"),
  "utf8",
);
const landing = readFileSync(
  join(process.cwd(), "src/app/site/[id]/page.tsx"),
  "utf8",
);
const restaurantPortal = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/restaurant/page.tsx"),
  "utf8",
);
const driverPortal = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/drive/page.tsx"),
  "utf8",
);
const seedPortal = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/page.tsx"),
  "utf8",
);
assert(merchantPage.includes("Restaurant portal"), "restaurant portal is a live Seed surface");
assert(drivePage.includes("Driver portal"), "driver portal is a live Seed surface");
assert(restaurantPortal.includes("Restaurant portal"), "portal has a restaurant DoorDash desk");
assert(driverPortal.includes("Driver portal"), "portal has a driver DoorDash desk");
assert(
  seedPortal.includes("/restaurant") && seedPortal.includes("/drive"),
  "Seed portal links restaurant and driver portals",
);
assert(adminPage.includes("SeedDeliveryLedger"), "admin mounts the ledger");
const deliveryLib = readFileSync(
  join(process.cwd(), "src/lib/seed-delivery.ts"),
  "utf8",
);
const ledgerUi = readFileSync(
  join(process.cwd(), "src/app/site/[id]/admin/delivery-ledger.tsx"),
  "utf8",
);
assert(
  /<th>Driver<\/th>/.test(ledgerUi) &&
    /ledgerRunDriverId/.test(ledgerUi) &&
    /colSpan=\{12\}/.test(ledgerUi),
  "admin ledger table has a Driver column next to Scout",
);
assert(
  /seed-run-party-open/.test(ledgerUi) &&
    /Photo ID · \{role\}/.test(ledgerUi) &&
    /role="Scout"/.test(ledgerUi),
  "admin ledger opens scout and driver photo ID on the row",
);
const siteCopy = readFileSync(
  join(process.cwd(), "src/lib/seed-site-copy.ts"),
  "utf8",
);
assert(
  /comes out of the restaurant/.test(deliveryLib) &&
    /comes out of the\s+restaurant/.test(ledgerUi) &&
    /comes out of the restaurant/.test(siteCopy),
  "ledger rule says processor comes out of the restaurant",
);
assert(
  !/comes out of the platform 5%\./.test(deliveryLib) &&
    !/comes out of the platform 5%\./.test(ledgerUi) &&
    !/comes out of the platform 5%\./.test(siteCopy),
  "ledger no longer takes processor from the platform 5%",
);
assert(
  /\$39\/month/.test(deliveryLib) &&
    /\$79\/month/.test(deliveryLib) &&
    /does not issue 1099s/.test(deliveryLib) &&
    /Stripe Connect/.test(deliveryLib) &&
    /TRIP_BASE_USD/.test(deliveryLib),
  "delivery engine encodes $39/$79 software, Connect payouts, and trip math",
);
assert(
  /\$39\/month/.test(siteCopy) &&
    /1099/.test(siteCopy) &&
    !/\$900\/year/.test(siteCopy),
  "ops surfaces retired $900/year for the subscription + 1099 rules",
);
const dinerLanding = customerFacingSiteCopy(
  "Hometown Runner",
  "Hyper-local food delivery platform. Order nearby.",
);
const dinerShop = customerFacingShopCopy(
  "Hometown Runner",
  "Hyper-local food delivery platform. Order nearby.",
);
const dinerBlob = [
  dinerLanding.headline,
  dinerLanding.support,
  dinerLanding.aboutBody,
  dinerLanding.resultsHeadline,
  dinerLanding.resultsSupport,
  dinerLanding.profitHeadline,
  dinerLanding.profitSupport,
  ...dinerLanding.results.flatMap((item) => [item.label, item.detail]),
  ...dinerLanding.profitPlays.flatMap((item) => [item.title, item.detail]),
  dinerShop.support,
  ...dinerShop.products.map((item) => item.detail),
].join(" ");
assert(
  !deliveryLandingLooksLikeOpsEconomics(dinerBlob) &&
    !/Flat 10% on delivery GMV/.test(landing) &&
    !/Flat 10% on delivery GMV/.test(siteCopy),
  "diner landing and shop stay guest-facing — no 1099 / $39 / GMV / research leak",
);
assert(
  deliveryLandingLooksLikeOpsEconomics(
    "Everybody gets 60 days free starting the first successful drive. Software free until the first delivered run. After the free trial, $39/month.",
  ) &&
    !deliveryLandingLooksLikeOpsEconomics(dinerBlob),
  "diner-leak patterns catch 60 days free / first successful drive without flagging guest copy",
);
assert(
  /customerFacingSupport\(project\.brief\)/.test(landing) &&
    !/project\.brief\.slice\(0,\s*160\)/.test(landing),
  "diner page metadata uses guest support, not the ops brief",
);
assert(
  !/href=\{`\/site\/\$\{project\.id\}\/admin`\}>Admin ledger/.test(landing),
  "Admin ledger is not a guest hero link",
);
const restaurantDesk = readFileSync(
  join(process.cwd(), "src/components/delivery/restaurant-portal.tsx"),
  "utf8",
);
assert(
  /three-party/.test(restaurantDesk) &&
    /keeps\s+\$0/.test(restaurantDesk) &&
    /manage their own tax forms/.test(restaurantDesk) &&
    /pay ~2\.9% processing/.test(restaurantDesk) &&
    /Upload like DoorDash/.test(restaurantDesk) &&
    /uploadRestaurantMenuItemAction/.test(restaurantDesk) &&
    /confirmRestaurantMenuPriceAction/.test(restaurantDesk) &&
    !/You issue the 1099/.test(restaurantDesk) &&
    !/The 10% on GMV is ACH/.test(restaurantDesk) &&
    /Your Stripe/.test(restaurantDesk) &&
    /connectAccountId/.test(restaurantDesk),
  "restaurant portal informs the kitchen: Connect, 2.9%, $0 platform, tax forms on the driver, menu confirm",
);
assert(
  /Drivers available/.test(restaurantDesk) &&
    /Photo ID/.test(restaurantDesk) &&
    /ticketAssignedDriver/.test(restaurantDesk) &&
    /availableDispatchDrivers/.test(restaurantDesk),
  "restaurant portal shows available drivers and accepted-driver photo ID",
);
assert(
  /keeps \$0/.test(deliveryLib) &&
    /DRIVER_COMMISSION_RATE/.test(deliveryLib) &&
    /keeps \$0/.test(siteCopy),
  "orders send $0 to the platform and 5% to the driver",
);
assert(shopAction.includes("recordDeliveryOrder"), "customer checkout writes the ledger");
const shopBoard = readFileSync(
  join(process.cwd(), "src/app/site/[id]/shop/shop-board.tsx"),
  "utf8",
);
assert(
  /Find an item/.test(shopBoard) &&
    /findSellableMenuItems/.test(
      readFileSync(join(process.cwd(), "src/app/site/[id]/shop/page.tsx"), "utf8"),
    ),
  "diner shop finds confirmed and uploaded plates",
);
assert(landing.includes("merchantHref") && landing.includes("driveHref"), "landing links the apps");
assert(
  enterPage.includes("Role-based login") &&
    enterPage.includes("customer, merchant, or driver") &&
    /HometownRoleLogin/.test(enterPage) &&
    /"customer", "merchant", "driver"/.test(roleLogin) &&
    /Sign in as merchant/.test(deliveryLib) &&
    /Sign in as driver/.test(deliveryLib),
  "three distinct role-based logins for customer, merchant, and driver",
);
assert(
  merchantPage.includes("enter?role=merchant") &&
    drivePage.includes("enter?role=driver"),
  "merchant and driver desks require their own role login",
);
const driverDesk = readFileSync(
  join(process.cwd(), "src/components/delivery/driver-portal.tsx"),
  "utf8",
);
assert(
  /Stripe Connect/.test(driverDesk) &&
    /tax forms/.test(driverDesk) &&
    /TRIP_BASE_USD/.test(driverDesk) &&
    /shouldTriggerDriverPayout/.test(driverDesk) &&
    /seven couples/.test(driverDesk) &&
    /70% dine-in/.test(driverDesk) &&
    /one delivery a month/.test(driverDesk) &&
    /paid the 5% this month/.test(driverDesk) &&
    /cannot keep the 5% on their own kitchen/.test(driverDesk) &&
    /60 days free/.test(driverDesk) &&
    /first successful drive/.test(driverDesk) &&
    /softwareFeeUsd/.test(driverDesk) &&
    /firstSuccessfulDriveAt/.test(driverDesk) &&
    /assignRestaurantScoutAction/.test(driverDesk) &&
    /Sign as scout/.test(driverDesk),
  "driver portal shows Connect payouts, trip math, tax forms, Riley, no own-kitchen 5%, and 60 days free from first successful drive",
);
assert(
  /\$37\.28/.test(ledgerUi) &&
    /seven couples/.test(ledgerUi) &&
    /one delivery a month/i.test(ledgerUi) &&
    /Paid: \{paidTo\}/.test(ledgerUi) &&
    /tip-riley/.test(siteCopy) &&
    /tip-market/.test(siteCopy) &&
    /tip-scout/.test(siteCopy) &&
    /three-party/.test(ledgerUi) &&
    /cannot keep the 5%/.test(ledgerUi) &&
    /60 days free/.test(ledgerUi) &&
    /first successful drive/.test(ledgerUi) &&
    /first successful drive/.test(siteCopy) &&
    /threePartyStripeSplit/.test(ledgerUi) &&
    /Stripe three-party/.test(ledgerUi),
  "ledger and playbook tips carry research, Riley, three-party Stripe, no own-kitchen 5%, and 60 days free from first successful drive",
);
const deliveryActions = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/delivery-actions.ts"),
  "utf8",
);
assert(
  /assignRestaurantScoutAction/.test(deliveryActions) &&
    /revalidatePath\(`\/site\/\$\{projectId\}\/shop`\)/.test(deliveryActions),
  "merchant confirm and upload refresh diner shop; restaurateurs can sign an unsigned kitchen",
);

if (process.exitCode) {
  console.error("\nHometown Runner guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll Hometown Runner guards passed.");
