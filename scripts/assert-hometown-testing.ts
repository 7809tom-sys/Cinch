/**
 * Site-wide Testing is on until the master turns it off.
 * A kitchen checkbox stays on after go-live, and so do the rows it wrote.
 *
 * Run: npx tsx scripts/assert-hometown-testing.ts
 */
import { readFileSync } from "fs";
import {
  kitchenIsTesting,
  hometownSiteTesting,
  recordIsTest,
  setHometownTesting,
  setKitchenTesting,
} from "../src/lib/hometown-testing";
import {
  parseDeliveryOps,
  recordDeliveryOrder,
  starterDeliveryOps,
  type DeliveryOps,
} from "../src/lib/seed-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function order(ops: DeliveryOps, id: string, title = "Pilot Kitchen · Warm grain bowl") {
  return recordDeliveryOrder(ops, {
    ledgerId: `led-${id}`,
    ticketId: `tkt-${id}`,
    runId: `run-${id}`,
    orderId: `ord-${id}`,
    customerName: "Sam",
    dropoffZip: "10002",
    dropoffLat: 40.0755,
    dropoffLng: -83.13,
    items: [{ productId: "run-pilot-bowl", title, qty: 1, priceUsd: 14 }],
    gmvUsd: 14,
    deliveryFeeUsd: 5,
    tipUsd: 2,
    taxUsd: 1,
  });
}

const fresh = starterDeliveryOps("Hometown Runner");
assert(
  hometownSiteTesting(fresh) &&
    fresh.restaurants.every((row) => kitchenIsTesting(row) === false),
  "a new market is in Testing, and a new kitchen is not",
);

const during = order(fresh, "during");
const duringRow = during.ledger.find((row) => row.id === "led-during");
const duringTicket = during.tickets.find((row) => row.id === "tkt-during");
const duringRun = during.runs.find((row) => row.id === "run-during");
assert(
  duringRow?.test === true &&
    duringTicket?.test === true &&
    duringRun?.test === true &&
    recordIsTest(during, during.restaurants[0], duringRow),
  "an order placed while Testing is on is stamped on the ledger, ticket, and run",
);

const live = setHometownTesting(during, false);
assert(hometownSiteTesting(live) === false, "the master can turn Testing off");
assert(
  live.ledger.every((row) => row.test === true) &&
    live.tickets.every((row) => row.test === true) &&
    live.runs.every((row) => row.test === true),
  "going live freezes the rows that already existed as test records",
);

const after = order(live, "after");
const afterRow = after.ledger.find((row) => row.id === "led-after");
assert(
  afterRow?.test === false &&
    recordIsTest(after, after.restaurants[0], afterRow) === false &&
    recordIsTest(after, after.restaurants[0], duringRow) === true,
  "a live order is not a test record, and the earlier order stays one",
);

const marked = setKitchenTesting(after, "rest-pilot", true);
const kitchenOrder = order(marked, "kitchen");
const kitchenRow = kitchenOrder.ledger.find((row) => row.id === "led-kitchen");
assert(
  kitchenIsTesting(marked.restaurants.find((row) => row.id === "rest-pilot")) &&
    kitchenRow?.test === true &&
    recordIsTest(
      kitchenOrder,
      kitchenOrder.restaurants.find((row) => row.id === "rest-pilot"),
      kitchenRow,
    ),
  "a testing kitchen still writes test orders after the site is live",
);

const cleared = setKitchenTesting(kitchenOrder, "rest-pilot", false);
const roundTrip = parseDeliveryOps(JSON.stringify(cleared));
assert(roundTrip, "testing flags survive a save");
assert(
  roundTrip.hometownTesting === false &&
    roundTrip.restaurants.find((row) => row.id === "rest-pilot")?.testing !==
      true &&
    roundTrip.ledger.find((row) => row.id === "led-kitchen")?.test === true &&
    roundTrip.ledger.find((row) => row.id === "led-after")?.test === false,
  "saved JSON keeps the site switch, the kitchen checkbox, and each row's test mark",
);

const backOn = setHometownTesting(roundTrip, true);
const stillLive = backOn.ledger.find((row) => row.id === "led-after");
assert(
  hometownSiteTesting(backOn) &&
    stillLive?.test === false &&
    recordIsTest(backOn, backOn.restaurants[0], stillLive),
  "turning Testing back on shows every row as test without relabeling a live order",
);

const welcome = readFileSync(
  "src/components/delivery/kitchen-welcome.tsx",
  "utf8",
);
const portal = readFileSync(
  "src/components/delivery/restaurant-portal.tsx",
  "utf8",
);
const diner = readFileSync("src/components/delivery/hometown-diner.tsx", "utf8");
const driver = readFileSync("src/components/delivery/driver-portal.tsx", "utf8");
const admin = readFileSync("src/app/site/[id]/admin/page.tsx", "utf8");
assert(
  welcome.includes("KitchenTestingToggle") &&
    welcome.includes("TestingBanner") &&
    portal.includes("KitchenTestingToggle") &&
    diner.includes("TestingBanner") &&
    driver.includes("TestingBanner") &&
    admin.includes("SiteTestingSwitch") &&
    admin.includes("KitchenTestingToggle"),
  "diner, kitchen welcome, kitchen desk, driver portal, and master admin show Testing",
);

console.log("hometown testing assertions passed");
