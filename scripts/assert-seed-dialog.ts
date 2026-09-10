/**
 * Guard: every Seed has a dialog. Just Putz It answers in place.
 * Run: npx tsx scripts/assert-seed-dialog.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  JUST_PUTZIT_CONNECT_SEED_ID,
  JUST_PUTZIT_LIVE,
  JUST_PUTZIT_NOT_ON_SEED,
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
  /dialog page|do not rebuild|not a Cinch Seed/i.test(SEED_DIALOG_RULE),
  "Seed dialog rule forbids rebuilding or staffing Just Putz It",
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
assert(
  reply === JUST_PUTZIT_NOT_ON_SEED,
  "Just Putz It dialog does not spend AI time on pretend updates",
);

const hello = composeSeedReply({
  name: "Just Putz It",
  seedMode: "connect",
  liveUrl: JUST_PUTZIT_LIVE,
  incoming: "hello",
});
assert(
  hello === JUST_PUTZIT_NOT_ON_SEED,
  "a hello on Just Putz It still refuses pretend updates",
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
