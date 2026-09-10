/**
 * Guard: every Seed has a dialog. Just Putz It answers in place.
 * Run: npx tsx scripts/assert-seed-dialog.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  JUST_PUTZIT_CONNECT_SEED_ID,
  JUST_PUTZIT_LIVE,
} from "../src/lib/seed-connect";
import {
  SEED_DIALOG_RULE,
  composeSeedReply,
  portalSeedDialogUrl,
  seedAsksToImprove,
  seedDialogUrl,
} from "../src/lib/seed-dialog";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(
  /dialog page|do not rebuild/i.test(SEED_DIALOG_RULE),
  "Seed dialog rule forbids rebuilding the live host",
);
assert(
  seedDialogUrl(JUST_PUTZIT_CONNECT_SEED_ID) ===
    `/admin/projects/${JUST_PUTZIT_CONNECT_SEED_ID}/dialog`,
  "admin Seed dialog lives on the Seed desk",
);
assert(
  portalSeedDialogUrl(JUST_PUTZIT_CONNECT_SEED_ID) ===
    `/portal/${JUST_PUTZIT_CONNECT_SEED_ID}/dialog`,
  "portal Seed dialog is per Seed",
);
assert(
  seedAsksToImprove("i requested on how to improve the site"),
  "an improve-the-site request is recognized",
);
assert(!seedAsksToImprove("what is the weather"), "unrelated talk is not an improve request");

const reply = composeSeedReply({
  name: "Just Putz It",
  brief: "Connect the existing dating and activity site",
  seedMode: "connect",
  liveUrl: JUST_PUTZIT_LIVE,
  incoming: "how do we improve the site?",
});
assert(/just putz/i.test(reply), "Seed names Just Putz It in the improve reply");
assert(
  /do not rebuild/i.test(reply) && /justputzit\.com/i.test(reply),
  "improve reply stays on justputzit.com and does not rebuild",
);
assert(
  /Community and tonight/i.test(reply) && /Matches, Activity Board/i.test(reply),
  "improve reply lists dating and activity proposals",
);
assert(/owner approv/i.test(reply), "improve reply waits for owner approval");

const hello = composeSeedReply({
  name: "Just Putz It",
  seedMode: "connect",
  liveUrl: JUST_PUTZIT_LIVE,
  incoming: "hello",
});
assert(
  /improve the site/i.test(hello),
  "a hello still points the owner at an improve question",
);

const files = [
  "src/app/dialog/page.tsx",
  "src/app/admin/(gated)/dialog/page.tsx",
  "src/app/admin/(gated)/projects/[id]/dialog/page.tsx",
  "src/app/portal/[id]/dialog/page.tsx",
  "src/components/seed-dialog-panel.tsx",
];
for (const file of files) {
  const text = readFileSync(join(process.cwd(), file), "utf8");
  assert(text.includes("Dialog") || text.includes("dialog"), `${file} is a Seed dialog surface`);
}

const adminDesk = readFileSync(
  join(process.cwd(), "src/app/admin/(gated)/projects/[id]/page.tsx"),
  "utf8",
);
assert(
  adminDesk.includes("/dialog") && adminDesk.includes("Talk to this Seed"),
  "admin Seed desk links to the dialog",
);

const portalDesk = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/page.tsx"),
  "utf8",
);
assert(
  portalDesk.includes("/dialog") && portalDesk.includes("Talk to this Seed"),
  "portal Seed desk links to the dialog",
);

if (process.exitCode) {
  console.error("seed-dialog assertions failed");
} else {
  console.log("seed-dialog assertions passed");
}
