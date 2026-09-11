/**
 * Guard: a Seed develops a project as a Senti playbook, not a dumped file.
 * Run: npx tsx scripts/assert-seed-playbook.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { composeSeedReply } from "../src/lib/seed-dialog";
import { JUST_PUTZIT_LIVE, JUST_PUTZIT_NOT_ON_SEED } from "../src/lib/seed-connect";
import {
  CHAPTER_PROMPTS,
  PLAYBOOK_CHAPTER_IDS,
  PLAYBOOK_METHOD,
  SEED_PLAYBOOK_RULE,
  SENTI_DESK_PATH,
  SENTI_NAME,
  chapterIsFilled,
  compileSeedPlaybook,
  exampleSeedPlaybook,
  mergePlaybookChapters,
  playbookDownloadFilename,
  playbookOwnerFilledCount,
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
  /prep work is everything/i.test(SEED_PLAYBOOK_RULE),
  "playbook rule is Prep Work Is Everything",
);
assert(SENTI_NAME === "Senti", "compiler is named Senti");
assert(SENTI_DESK_PATH === "/senti", "Senti desk is /senti");
assert(PLAYBOOK_METHOD.length === 4, "method has prep → lanes → lock → paste");
assert(
  PLAYBOOK_METHOD.some((step) => /describe the chat/i.test(step.title)),
  "method describes the chat before the chat",
);
assert(
  PLAYBOOK_METHOD.some((step) => /every lane/i.test(step.title)),
  "method specs website admin money CRM delivery",
);
assert(
  PLAYBOOK_METHOD.some((step) => /delivery and money/i.test(step.title)),
  "method locks delivery and money",
);
assert(
  PLAYBOOK_METHOD.some((step) => /one job/i.test(step.title)),
  "method pastes one job into Conductor",
);

assert(seedAsksForPlaybook("prep work is everything"), "prep-work ask is a playbook ask");
assert(seedAsksForPlaybook("how do we develop a project"), "playbook ask is recognized");
assert(seedAsksForPlaybook("open the instruction pack"), "instruction pack is a playbook ask");
assert(!seedAsksForPlaybook("what is the weather"), "unrelated talk is not a playbook ask");

const pack = exampleSeedPlaybook();
assert(pack.chapters.length === 7, "prep playbook has seven chapters");
assert(
  pack.chapters.some((chapter) => /intent/i.test(chapter.title + chapter.script)),
  "intent is a Seed chapter",
);
assert(
  pack.chapters.some((chapter) => /admin, money, CRM, delivery/i.test(chapter.title)),
  "lanes chapter covers admin money CRM delivery",
);
assert(
  pack.chapters.every((chapter) => chapter.script.length > 40),
  "every chapter script is a real brief, not an empty placeholder",
);
assert(pack.chapters.at(-1)?.agent === "Senti", "last chapter is the Senti compile");
assert(
  PLAYBOOK_CHAPTER_IDS.every((id) => CHAPTER_PROMPTS[id]?.blanks.length > 0),
  "every chapter has fill-in blanks",
);
assert(!chapterIsFilled("ONE-SENTENCE INTENT:\n"), "blank labels are not a filled chapter");
assert(
  chapterIsFilled("ONE-SENTENCE INTENT: Sell morning bread.\nDONE LOOKS LIKE: Orders print."),
  "filled blanks count as a real chapter",
);
const overridden = compileSeedPlaybook({
  name: "Acme Cabinets",
  brief: "Kitchen designer",
  seedMode: "build",
  draft: {
    methodStepId: "prep",
    currentChapterId: "discover",
    updatedAt: "2026-09-11T00:00:00.000Z",
    chapters: {
      discover: {
        script: "ONE-SENTENCE INTENT: Book kitchen consults.\nDONE LOOKS LIKE: A human can request a measure.",
        status: "ready",
      },
    },
  },
});
assert(
  overridden.chapters[0]?.script.includes("Book kitchen consults"),
  "owner chapter text replaces the static template",
);
assert(overridden.filledCount === 1, "compile reports owner-filled chapters");
assert(
  playbookOwnerFilledCount({
    methodStepId: "prep",
    currentChapterId: "discover",
    updatedAt: "2026-09-11T00:00:00.000Z",
    chapters: {
      discover: {
        script: "ONE-SENTENCE INTENT: Book kitchen consults.\nDONE LOOKS LIKE: A human can request a measure.",
        status: "ready",
      },
    },
  }) === 1,
  "one saved chapter counts as owner-filled",
);
assert(
  mergePlaybookChapters(pack.chapters, {
    methodStepId: "prep",
    currentChapterId: "discover",
    updatedAt: "2026-09-11T00:00:00.000Z",
    chapters: {
      atlas: { script: "IN SCOPE: Measure request.\nOUT OF SCOPE: Custom CAD.", status: "ready" },
    },
  }).some((chapter) => chapter.id === "atlas" && /Measure request/.test(chapter.script)),
  "draft merge keeps other generated chapters",
);
assert(
  /prep work is everything|not a dumped file|cinchseed/i.test(pack.summary + SEED_PLAYBOOK_RULE),
  "pack stays off a homepage file dump",
);
assert(
  pack.compiledBody.includes("Chapter scripts") &&
    pack.compiledBody.includes("Senti compiled instruction"),
  "compiled pack concatenates chapters into one instruction",
);
assert(
  playbookDownloadFilename("Northside Bakery") ===
    "northside-bakery-senti-instruction.md",
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
assert(
  reply === JUST_PUTZIT_NOT_ON_SEED,
  "dialog refuses to staff Just Putz It playbook work",
);

const files = [
  "src/app/senti/page.tsx",
  "src/app/admin/(gated)/projects/[id]/playbook/page.tsx",
  "src/app/portal/[id]/playbook/page.tsx",
  "src/components/seed-playbook-pack.tsx",
  "src/components/seed-playbook-builder.tsx",
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

const builderUi = readFileSync(
  join(process.cwd(), "src/components/seed-playbook-builder.tsx"),
  "utf8",
);
assert(
  builderUi.includes("Fill the blanks") &&
    builderUi.includes("Save and next chapter") &&
    builderUi.includes("Method, then chapter"),
  "builder walks method then chapter and saves owner text",
);

const adminPlaybook = readFileSync(
  join(process.cwd(), "src/app/admin/(gated)/projects/[id]/playbook/page.tsx"),
  "utf8",
);
assert(
  adminPlaybook.includes("SeedPlaybookBuilder"),
  "admin playbook is a live builder, not only a viewer",
);

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
