/**
 * Guard: a Seed develops a project as a Senti playbook, not a dumped file.
 * Run: npx tsx scripts/assert-seed-playbook.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { composeSeedReply } from "../src/lib/seed-dialog";
import { JUST_PUTZIT_LIVE } from "../src/lib/seed-connect";
import {
  PLAYBOOK_METHOD,
  SEED_PLAYBOOK_RULE,
  SENTI_DESK_PATH,
  SENTI_NAME,
  compileSeedPlaybook,
  exampleJustPutzItPlaybook,
  playbookDownloadFilename,
  portalSeedPlaybookUrl,
  seedAsksForPlaybook,
  seedPlaybookUrl,
} from "../src/lib/seed-playbook";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(
  /not by adding a suggestion file on cinchseed\.com/i.test(SEED_PLAYBOOK_RULE),
  "playbook rule forbids dumping a suggestion file on cinchseed.com",
);
assert(SENTI_NAME === "Senti", "compiler is named Senti");
assert(SENTI_DESK_PATH === "/senti", "Senti desk is /senti");
assert(PLAYBOOK_METHOD.length === 4, "method has talk → keep → compile → send");
assert(
  PLAYBOOK_METHOD.some((step) => /several AIs/i.test(step.title)),
  "method talks to several AIs",
);
assert(
  PLAYBOOK_METHOD.some((step) => /chapter scripts/i.test(step.title)),
  "method keeps chapter scripts together",
);
assert(
  PLAYBOOK_METHOD.some((step) => /Senti compiles/i.test(step.title)),
  "method compiles with Senti",
);
assert(
  PLAYBOOK_METHOD.some((step) => /Print, upload, and send/i.test(step.title)),
  "method ends in a sendable pack",
);

assert(seedAsksForPlaybook("how do we develop a project"), "playbook ask is recognized");
assert(seedAsksForPlaybook("open the instruction pack"), "instruction pack is a playbook ask");
assert(!seedAsksForPlaybook("what is the weather"), "unrelated talk is not a playbook ask");

const pack = exampleJustPutzItPlaybook();
assert(pack.chapters.length === 7, "Just Putz It playbook has seven chapters");
assert(
  pack.chapters.some((chapter) => /Manus sign-in/i.test(chapter.script)),
  "Chief of Staff Manus sign-in note is a Seed chapter",
);
assert(
  pack.chapters.some((chapter) => /Gym Buddy/i.test(chapter.script)),
  "Gym Buddy / New Date fold note is a Seed chapter",
);
assert(
  pack.chapters.some((chapter) => /privacy/i.test(chapter.script + chapter.title)),
  "privacy template note is a Seed chapter",
);
assert(
  pack.chapters.every((chapter) => chapter.script.length > 40),
  "every chapter script is a real brief, not an empty placeholder",
);
assert(pack.chapters.at(-1)?.agent === "Senti", "last chapter is the Senti compile");
assert(pack.awaitingOwnerApproval, "Just Putz It pack waits for owner approval");
assert(
  /not a dumped file|not as a file on cinchseed/i.test(pack.summary + SEED_PLAYBOOK_RULE),
  "Just Putz It pack stays off the homepage file dump",
);
assert(
  pack.compiledBody.includes("Chapter scripts") &&
    pack.compiledBody.includes("Senti compiled instruction"),
  "compiled pack concatenates chapters into one instruction",
);
assert(
  playbookDownloadFilename("Just Putz It") === "just-putz-it-senti-instruction.md",
  "download filename is a sendable markdown pack",
);

const generic = compileSeedPlaybook({
  name: "Acme Cabinets",
  brief: "Kitchen designer",
  seedMode: "build",
  liveUrl: "https://example.com",
});
assert(
  !generic.chapters.some((chapter) => /Manus sign-in/i.test(chapter.script)),
  "a cabinet Seed does not inherit Just Putz It chapters",
);
assert(
  generic.compiledBody.includes("Acme Cabinets"),
  "generic compile names the Seed",
);

assert(
  seedPlaybookUrl("seed-1") === "/admin/projects/seed-1/playbook",
  "admin playbook lives on the Seed desk",
);
assert(
  portalSeedPlaybookUrl("seed-1") === "/portal/seed-1/playbook",
  "portal playbook is per Seed",
);

const reply = composeSeedReply({
  name: "Just Putz It",
  seedMode: "connect",
  liveUrl: JUST_PUTZIT_LIVE,
  incoming: "how do we develop a project?",
});
assert(/do not add a suggestion file/i.test(reply), "dialog refuses a cinchseed.com dump file");
assert(/Senti/i.test(reply) && /chapter scripts/i.test(reply), "dialog points at Senti chapters");

const files = [
  "src/app/senti/page.tsx",
  "src/app/admin/(gated)/projects/[id]/playbook/page.tsx",
  "src/app/portal/[id]/playbook/page.tsx",
  "src/components/seed-playbook-pack.tsx",
];
for (const file of files) {
  const text = readFileSync(join(process.cwd(), file), "utf8");
  assert(/Senti|playbook/i.test(text), `${file} is a Senti playbook surface`);
}

const packUi = readFileSync(
  join(process.cwd(), "src/components/seed-playbook-pack.tsx"),
  "utf8",
);
assert(
  packUi.includes("Print interactive PDF") && packUi.includes("Download instruction pack"),
  "pack can print as PDF and download as a sendable file",
);
assert(packUi.includes("perspective"), "pack uses a 3D stage for chapters");

const adminDesk = readFileSync(
  join(process.cwd(), "src/app/admin/(gated)/projects/[id]/page.tsx"),
  "utf8",
);
assert(adminDesk.includes("/playbook"), "admin Seed desk links to the playbook");

const portalDesk = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/page.tsx"),
  "utf8",
);
assert(portalDesk.includes("/playbook"), "portal Seed desk links to the playbook");

if (process.exitCode) {
  console.error("seed-playbook assertions failed");
} else {
  console.log("seed-playbook assertions passed");
}
