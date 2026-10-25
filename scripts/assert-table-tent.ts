/**
 * A table tent QR points at the restaurant's Hometown Runner ordering page.
 *
 * Run: npx tsx scripts/assert-table-tent.ts
 */
import { readFileSync } from "fs";
import QRCode from "qrcode";
import { tableTentCta, tableTentOrderUrl } from "../src/lib/table-tent";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const url = tableTentOrderUrl({
  projectId: "hometown-home",
  restaurantId: "rest-pilot",
});
assert(
  url ===
    "https://hometownrunner.com/site/hometown-home/shop?kitchen=rest-pilot&src=table",
  "the table tent links to hometownrunner.com with the kitchen and src=table",
);
assert(
  tableTentCta("Pilot Kitchen") === "Scan to order from Pilot Kitchen" &&
    tableTentCta("  ") === "Scan to order",
  "the card names the restaurant",
);

const qr = QRCode.create(url);
const encoded = Buffer.from(qr.segments[0]?.data ?? []).toString();
assert(encoded === url, "the QR encodes that ordering URL");

const page = readFileSync("src/app/site/[id]/table-tent/[restaurantId]/page.tsx", "utf8");
const welcome = readFileSync("src/components/delivery/kitchen-welcome.tsx", "utf8");
const desk = readFileSync("src/components/delivery/restaurant-portal.tsx", "utf8");
const admin = readFileSync("src/app/site/[id]/admin/page.tsx", "utf8");
const banner = readFileSync("src/components/delivery/testing-banner.tsx", "utf8");
assert(
  page.includes("QRCode.toDataURL") &&
    page.includes("tableTentOrderUrl") &&
    page.includes("tent-face-top") &&
    page.includes("Hometown Runner") &&
    page.includes(">Fold<") &&
    page.includes(">Cut<") &&
    page.includes("@media print") &&
    welcome.includes("/table-tent/") &&
    desk.includes("/table-tent/") &&
    admin.includes("/table-tent/") &&
    banner.includes("print:hidden"),
  "the kitchen desk, master admin, and print card share the local QR",
);
assert(
  !page.includes("api.qrserver.com") && !page.includes("chart.googleapis.com"),
  "the QR is not loaded from a third-party image API",
);

console.log("table tent assertions passed");
