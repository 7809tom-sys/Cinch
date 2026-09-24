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
  WEEKLY_GMV_EXAMPLES,
  acceptDriverRun,
  applyDriverSubscriptionPolicies,
  approveDeliveryDriver,
  classifyDriverHours,
  driverCanDispatch,
  driverSoftwareAnnualUsd,
  driverSoftwareFeeUsd,
  freezeDeliveryDriver,
  recordDeliveryOrder,
  setDriverOnline,
  setMerchantTicketStatus,
  setRestaurantPaused,
  scoutResidualForWeeklyGmv,
  driverPayoutFromSplit,
  splitDeliveryLedger,
  starterDeliveryOps,
  weeklyScoutResidualExamples,
  withDeliveryDriverPolicyBrief,
} from "../src/lib/seed-delivery";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

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
  "driver ACH is fee + tip + 5% commission",
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
  /\$39\/month/.test(withDeliveryDriverPolicyBrief("Hometown delivery")) &&
    /1099/.test(withDeliveryDriverPolicyBrief("Hometown delivery")) &&
    /keeps \$0/.test(withDeliveryDriverPolicyBrief("Hometown delivery")),
  "delivery brief appends $0 platform economics and 1099 rules",
);

const ops = starterDeliveryOps("Hometown Runner");
const riley = ops.drivers.find((row) => row.id === "drv-riley");
const maya = ops.drivers.find((row) => row.id === "drv-maya");
const jordan = ops.drivers.find((row) => row.id === "drv-jordan");
const casey = ops.drivers.find((row) => row.id === "drv-casey");
const deli = ops.restaurants.find((row) => row.id === "rest-deli");
assert(Boolean(riley && riley.status === "frozen"), "Riley starts frozen");
assert(
  maya?.classification === "full_time" &&
    maya.softwareUsdPerYear === 948,
  "Maya is full-time at $79/month",
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
    /1099/.test(deliveryLib),
  "delivery engine encodes $39/$79 software and restaurant 1099s",
);
assert(
  /\$39\/month/.test(siteCopy) &&
    /1099/.test(siteCopy) &&
    !/\$900\/year/.test(siteCopy),
  "landing copy retired $900/year for the subscription + 1099 rules",
);
const restaurantDesk = readFileSync(
  join(process.cwd(), "src/components/delivery/restaurant-portal.tsx"),
  "utf8",
);
assert(
  /issue the 1099/.test(restaurantDesk) &&
    /keeps\s+\$0/.test(restaurantDesk) &&
    /automatically routed to the\s+driver/.test(restaurantDesk) &&
    /pay ~2\.9% processing/.test(restaurantDesk) &&
    !/The 10% on GMV is ACH/.test(restaurantDesk),
  "restaurant portal informs the kitchen: Stripe, 2.9%, $0 platform, fee+tip to driver, 1099",
);
assert(
  /keeps \$0/.test(deliveryLib) &&
    /DRIVER_COMMISSION_RATE/.test(deliveryLib) &&
    /keeps \$0/.test(siteCopy),
  "orders send $0 to the platform and 5% to the driver",
);
assert(shopAction.includes("recordDeliveryOrder"), "customer checkout writes the ledger");
assert(landing.includes("merchantHref") && landing.includes("driveHref"), "landing links the apps");

if (process.exitCode) {
  console.error("\nHometown Runner guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll Hometown Runner guards passed.");
