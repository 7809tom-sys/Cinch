/**
 * Guard: Prep Work Is Everything is baked into Cinch Seed builds.
 * Run: npx tsx scripts/assert-seed-prep.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  PREP_LANES,
  PREP_RULE,
  composePrepBrief,
  emptyPrepBrief,
  missingPrepFields,
  planPrepBuildTasks,
  prepBriefLooksComplete,
} from "../src/lib/seed-prep";
import { PLAYBOOK_METHOD, SEED_PLAYBOOK_RULE } from "../src/lib/seed-playbook";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(/prep work is everything/i.test(PREP_RULE), "prep rule is the playbook");
assert(
  /describe the chat before the chat/i.test(PREP_RULE),
  "prep describes the chat before the chat",
);
assert(PREP_LANES.length === 5, "five lanes: website admin money CRM delivery");

const incomplete = emptyPrepBrief("Northside Bakery");
assert(missingPrepFields(incomplete).length > 3, "empty worksheet is not ready");

const filled = {
  ...incomplete,
  intent: "A neighbor can order tomorrow’s loaf before 8pm.",
  inScope: "Menu, pickup window, owner admin.",
  outOfScope: "No dating site. No justputzit.com.",
  sourceOfTruth: "Prep-Work-Is-Everything playbook",
  nonNegotiables: "Fail closed if money is unclear.",
  deliveryModes: ["service" as const],
  deliveryNotes: "Pickup only. Owner owns a missed pickup.",
  moneyNotes: "$8 loaf. No platform cut on cash pickup.",
  crmAdmin: "Owner reviews orders each morning.",
  doneLooksLike: "Order a loaf and see it on the admin list in under 5 minutes.",
  lanes: {
    website: "addressed" as const,
    admin: "addressed" as const,
    accounting: "addressed" as const,
    crm: "addressed" as const,
    delivery: "addressed" as const,
  },
};
const brief = composePrepBrief(filled);
assert(prepBriefLooksComplete(brief), "filled worksheet composes a complete brief");
assert(/OUT OF SCOPE:/.test(brief), "brief keeps out of scope");
assert(!/just putz it is a cinch seed/i.test(brief), "brief does not put Just Putz It on the Seed");

const tasks = planPrepBuildTasks(brief);
assert(tasks.length === 4, "build plan starts with four prep tasks");
assert(
  tasks.some((task) => /do not open AI cold/i.test(task.title)),
  "first jobs refuse a cold AI chat",
);
assert(
  tasks.some((task) => /delivery and money/i.test(task.title)),
  "prep locks delivery and money before coding fees",
);

assert(
  PLAYBOOK_METHOD.some((step) => /describe the chat/i.test(step.title)),
  "Senti method starts with describe-the-chat",
);
assert(/prep work is everything/i.test(SEED_PLAYBOOK_RULE), "Senti rule is the playbook");

const form = readFileSync(
  join(process.cwd(), "src/app/admin/create-seed-form.tsx"),
  "utf8",
);
assert(
  form.includes("SeedPrepWorksheet") && form.includes('"build"'),
  "Create Seed defaults to build and uses the prep worksheet",
);
assert(!form.includes("https://justputzit.com"), "Create Seed does not use justputzit.com as the example");

const senti = readFileSync(join(process.cwd(), "src/app/senti/page.tsx"), "utf8");
assert(
  senti.includes("PREP_RULE") && senti.includes("Make a good website"),
  "Senti desk is the prep playbook",
);

const header = readFileSync(join(process.cwd(), "src/components/site-header.tsx"), "utf8");
assert(header.includes("/senti"), "home nav points at Senti, not Improve");
assert(!header.includes("/improve"), "home nav dropped the Just Putz It Improve desk");

const home = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
assert(home.includes("/senti"), "homepage links to Senti prep");

if (process.exitCode) {
  console.error("seed-prep assertions failed");
} else {
  console.log("seed-prep assertions passed");
}
