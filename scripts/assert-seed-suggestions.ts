/**
 * Guard: Just Putz It is not a please-do Seed.
 * Run: npx tsx scripts/assert-seed-suggestions.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { JUST_PUTZIT_NOT_ON_SEED } from "../src/lib/seed-connect";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

const page = readFileSync(join(process.cwd(), "src/app/suggestions/page.tsx"), "utf8");
assert(
  page.includes("JustPutzItNotOnSeedPage") || page.includes("not a Cinch Seed"),
  "Suggestions page does not queue Just Putz It please-do work",
);

const improve = readFileSync(join(process.cwd(), "src/app/improve/page.tsx"), "utf8");
assert(
  improve.includes("JustPutzItNotOnSeedPage") && !improve.includes("<iframe"),
  "Improve page does not embed or staff Just Putz It",
);

const footer = readFileSync(join(process.cwd(), "src/components/site-footer.tsx"), "utf8");
assert(!footer.includes("/suggestions"), "footer dropped the Just Putz It Suggestions link");

const adminDesk = readFileSync(
  join(process.cwd(), "src/app/admin/(gated)/projects/[id]/page.tsx"),
  "utf8",
);
assert(
  !adminDesk.includes("Please do suggestions"),
  "admin Seed desk does not send people to pretend Just Putz It updates",
);

assert(/not a Cinch Seed/i.test(JUST_PUTZIT_NOT_ON_SEED), "Just Putz It stays off the Seed");

if (process.exitCode) {
  console.error("seed-suggestions assertions failed");
} else {
  console.log("seed-suggestions assertions passed");
}
