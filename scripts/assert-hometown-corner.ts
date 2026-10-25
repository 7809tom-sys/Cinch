/**
 * Hometown surfaces say Hometown Runners. Other Seeds still say Your Seed.
 *
 * Run: npx tsx scripts/assert-hometown-corner.ts
 */
import { readFileSync } from "fs";
import { HOMETOWN_CORNER_LABEL } from "../src/lib/hometown-brand";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(
  HOMETOWN_CORNER_LABEL === "Hometown Runners",
  "the corner label is Hometown Runners",
);

const chrome = readFileSync("src/app/site/[id]/owner-chrome.tsx", "utf8");
const site = readFileSync("src/app/site/[id]/page.tsx", "utf8");
const layout = readFileSync("src/app/site/[id]/layout.tsx", "utf8");
assert(
  chrome.includes('cornerLabel = "Your Seed"') &&
    chrome.includes("{cornerLabel}") &&
    !chrome.includes(">Your Seed<"),
  "the shared chrome keeps Your Seed as the default and prints the passed label",
);
assert(
  site.includes("deliveryPlatform ? HOMETOWN_CORNER_LABEL") &&
    !site.includes("Seed ID"),
  "only a delivery project passes the Hometown label",
);
assert(
  layout.includes("briefIsDeliveryPlatform") &&
    layout.includes("HOMETOWN_CORNER_LABEL") &&
    layout.includes("return {}"),
  "other Seeds do not inherit the Hometown document name",
);

for (const file of [
  "src/components/delivery/hometown-diner.tsx",
  "src/components/delivery/kitchen-welcome.tsx",
  "src/components/delivery/restaurant-portal.tsx",
  "src/components/delivery/driver-portal.tsx",
  "src/app/site/[id]/admin/page.tsx",
]) {
  const source = readFileSync(file, "utf8");
  assert(
    source.includes("HometownCornerLabel") && !source.includes("Seed ID"),
    `${file} shows the Hometown corner label`,
  );
}

console.log("hometown corner assertions passed");
