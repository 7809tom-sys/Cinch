/**
 * Guard: the owner can Please-do suggestions on Just Putz It.
 * Run: npx tsx scripts/assert-seed-suggestions.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { JUST_PUTZIT_LIVE } from "../src/lib/seed-connect";
import {
  SEED_SUGGESTIONS_PATH,
  suggestionsForJustPutzIt,
} from "../src/lib/seed-suggestions";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(SEED_SUGGESTIONS_PATH === "/suggestions", "suggestions live at /suggestions");
const plan = suggestionsForJustPutzIt();
assert(plan.improvements.length >= 6, "Just Putz It has please-do suggestions");
assert(
  plan.improvements.some((item) => /Community/i.test(item.title)),
  "suggestions include Community on Home",
);
assert(/justputzit\.com/i.test(plan.summary), "suggestions stay on justputzit.com");

const page = readFileSync(join(process.cwd(), "src/app/suggestions/page.tsx"), "utf8");
assert(
  page.includes("Please do these") && page.includes("SeedSuggestionsBoard"),
  "suggestions page is the please-do box",
);

const board = readFileSync(
  join(process.cwd(), "src/components/seed-suggestions-board.tsx"),
  "utf8",
);
assert(
  board.includes("Please do this") && board.includes("Your own suggestion"),
  "each suggestion has a Please do this button and a freeform box",
);

const improve = readFileSync(join(process.cwd(), "src/app/improve/page.tsx"), "utf8");
assert(
  improve.includes("SeedSuggestionsBoard") && improve.includes("/suggestions"),
  "Improve page shows please-do suggestions",
);

const footer = readFileSync(join(process.cwd(), "src/components/site-footer.tsx"), "utf8");
assert(footer.includes("/suggestions"), "footer links to Suggestions");

const adminDesk = readFileSync(
  join(process.cwd(), "src/app/admin/(gated)/projects/[id]/page.tsx"),
  "utf8",
);
assert(
  adminDesk.includes("Please do suggestions"),
  "admin Seed desk points at Suggestions",
);

assert(JUST_PUTZIT_LIVE === "https://justputzit.com", "live host is justputzit.com");

if (process.exitCode) {
  console.error("seed-suggestions assertions failed");
} else {
  console.log("seed-suggestions assertions passed");
}
