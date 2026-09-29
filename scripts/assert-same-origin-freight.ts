/**
 * Guard: cabinets from the same warehouse ship as one freight load.
 * Run: npx tsx scripts/assert-same-origin-freight.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  SAME_ORIGIN_FREIGHT_NOTE,
  SPLIT_ORIGIN_FREIGHT_NOTE,
  consolidateSameOriginFreight,
  freightShipsTogetherLabel,
  originZipFromFreightLabel,
  palletCountFromFreightLabel,
} from "../src/lib/same-origin-freight";
import { buildWatchClientJs } from "../src/lib/watch-client";
import { seedParcelShippingModes } from "../src/lib/seed-site-copy";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

const split = [
  {
    originZip: "60448",
    label:
      "Plan A live · Aero Blanc (Preston) · origin 60448 · TAX AIRFREIGHT · 2 pallets",
    amountCents: 74061,
    palletCount: 2,
    source: "live",
  },
  {
    originZip: "60448",
    label:
      "Plan A live · Cobalt Abyss (Preston) · origin 60448 · XPO Logistics · 1 pallet",
    amountCents: 25943,
    palletCount: 1,
    source: "live",
  },
];

assert(
  originZipFromFreightLabel(split[0].label) === "60448" &&
    palletCountFromFreightLabel(split[0].label) === 2 &&
    palletCountFromFreightLabel(split[1].label) === 1,
  "freight labels expose origin ZIP and pallet count",
);

const together = consolidateSameOriginFreight(split);
assert(together.length === 1, "same origin 60448 becomes one shipment");
assert(together[0]?.originZip === "60448", "combined load keeps origin 60448");
assert(together[0]?.palletCount === 3, "2 pallets + 1 pallet ship as 3 pallets");
assert(
  together[0]?.amountCents === 74061 + 25943,
  "combined load keeps the quoted freight cents",
);
assert(
  together[0]?.label ===
    freightShipsTogetherLabel({
      originZip: "60448",
      palletCount: 3,
      place: "Preston",
    }),
  "combined label says ships together from Preston",
);

const mixed = consolidateSameOriginFreight([
  ...split,
  {
    originZip: "90210",
    label: "Plan A live · Other · origin 90210 · XPO Logistics · 1 pallet",
    amountCents: 18000,
    palletCount: 1,
  },
]);
assert(
  mixed.length === 2 &&
    mixed.some((item) => item.originZip === "60448" && item.palletCount === 3) &&
    mixed.some((item) => item.originZip === "90210" && item.palletCount === 1),
  "a different origin stays its own pickup",
);

const watchJs = buildWatchClientJs({
  origin: "https://www.cinchseed.com",
  defaultTools: [],
});
assert(
  watchJs.includes("paintSameOriginFreight") &&
    watchJs.includes("Same origin ships together") &&
    watchJs.includes(SPLIT_ORIGIN_FREIGHT_NOTE.slice(0, 24)),
  "watch.js merges same-origin freight on the live checkout",
);

assert(
  seedParcelShippingModes().some((mode) =>
    /one quote per origin ZIP|ships together/i.test(mode.notes),
  ),
  "Seed LTL copy says same warehouse ships together",
);

assert(
  /same-origin cabinets together/.test(
    readFileSync(
      join(process.cwd(), "src/lib/connect-improvements.ts"),
      "utf8",
    ),
  ) && SAME_ORIGIN_FREIGHT_NOTE.includes("one pickup"),
  "Connect plan tells Cinch to stop splitting one warehouse",
);

if (process.exitCode) {
  console.error("same-origin-freight assertions failed");
} else {
  console.log("same-origin-freight assertions passed");
}
