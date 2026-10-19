/**
 * Guard: Writer Seed multi-agent book/song collaboration HARD RULE.
 * Run: npx tsx scripts/assert-seed-writer.ts
 */
import {
  buildBookChapterPlan,
  composeWriterBrief,
  draftSongLyricsMarkdown,
  parseOutlineChaptersFromText,
  planWriterBuildBacklog,
  planWriterCollaborationChain,
  projectHasWriterCollab,
  resolveSeedKind,
  resolveWriterForm,
  SEED_WRITER_COLLABORATE_RULE,
  taskIsWriterCollab,
  writerCollabPhaseFromTitle,
  writerPrimaryPath,
} from "../src/lib/seed-writer";
import { readFileSync } from "fs";
import { join } from "path";
import {
  liveWebsiteUrl,
  publicWebsiteUrl,
  writerSeedPortalPath,
} from "../src/lib/domain";
import {
  knownWriterOutlineForDriveFile,
  WRITER_CONCEPTS,
} from "../src/lib/writer-concepts";
import { absorbRemoteProjects, type SeedProject } from "../src/lib/store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(
  /collaborat|book|song/i.test(SEED_WRITER_COLLABORATE_RULE.summary),
  "rule summary requires collaboration + book/song",
);
assert(
  SEED_WRITER_COLLABORATE_RULE.steps.length >= 5,
  "rule has a full 5-specialist chain",
);
assert(
  /together|alone/i.test(SEED_WRITER_COLLABORATE_RULE.whyTogether),
  "rule explains why agents must work together",
);

assert(resolveSeedKind({ seedKind: "writer" }) === "writer", "seedKind writer");
assert(
  resolveSeedKind({ brief: "Write a book about rivers" }) === "writer",
  "brief can infer writer kind",
);
assert(resolveSeedKind({ seedKind: "website" }) === "website", "website default");
assert(resolveWriterForm({ writerForm: "song" }) === "song", "song form");
assert(
  resolveWriterForm({ brief: "a chorus that sticks" }) === "song",
  "lyrics language infers song",
);
assert(
  resolveWriterForm({ brief: "a novel about gardens" }) === "book",
  "book is default creative form",
);

const bookChain = planWriterCollaborationChain({
  form: "book",
  titleHint: "The Last Greenhouse",
  briefHint: "A botanist inherits a remembering greenhouse.",
});
assert(bookChain.length === 5, "book chain has 5 phases");
assert(
  bookChain.every((t) => taskIsWriterCollab(t.title)),
  "every book chain task is writer collab",
);
assert(
  writerCollabPhaseFromTitle(bookChain[0].title) === "premise",
  "phase 1 is premise",
);
assert(
  writerCollabPhaseFromTitle(bookChain[1].title) === "structure",
  "phase 2 is structure",
);
assert(
  writerCollabPhaseFromTitle(bookChain[2].title) === "draft",
  "phase 3 is draft",
);
assert(
  writerCollabPhaseFromTitle(bookChain[3].title) === "polish",
  "phase 4 is polish",
);
assert(
  writerCollabPhaseFromTitle(bookChain[4].title) === "sign-off",
  "phase 5 is sign-off",
);

const songChain = planWriterCollaborationChain({
  form: "song",
  titleHint: "Midnight on the River",
});
assert(songChain.length === 5, "song chain has 5 phases");
assert(
  songChain.some((t) => /lyric|song/i.test(t.title + t.detail)),
  "song chain mentions lyrics/song",
);

const backlog = planWriterBuildBacklog({
  form: "book",
  projectName: "Greenhouse Writer Seed",
  brief: "Write a book about a remembering greenhouse.",
});
assert(backlog.length >= 7, "writer backlog includes prep + research + chain + compile");
assert(
  projectHasWriterCollab(backlog),
  "backlog is detected as writer collab project",
);
assert(
  backlog.some((t) => /compile final manuscript/i.test(t.title)),
  "book backlog compiles manuscript",
);

const songBacklog = planWriterBuildBacklog({
  form: "song",
  projectName: "River Song Seed",
  brief: "Write a song about hope after a hard year.",
});
assert(
  songBacklog.some((t) => /compile final lyric sheet/i.test(t.title)),
  "song backlog compiles lyric sheet",
);

assert(writerPrimaryPath("book") === "manuscript/BOOK.md", "book primary path");
assert(writerPrimaryPath("song") === "lyrics/song.md", "song primary path");
assert(
  writerSeedPortalPath("seed-writer-1") === "/portal/seed-writer-1/writer",
  "writer seeds open in the portal, not /site/",
);
assert(
  liveWebsiteUrl({
    id: "seed-writer-1",
    name: "Greenhouse Writer Seed",
    customDomain: null,
    seedKind: "writer",
  }) === "/portal/seed-writer-1/writer" &&
    !liveWebsiteUrl({
      id: "seed-writer-1",
      name: "Greenhouse Writer Seed",
      customDomain: null,
      seedKind: "writer",
    }).includes("/site/") &&
    publicWebsiteUrl({
      id: "seed-writer-1",
      name: "Greenhouse Writer Seed",
      customDomain: null,
      seedKind: "writer",
    }).endsWith("/portal/seed-writer-1/writer"),
  "Visit website for a Writer Seed opens the manuscript desk",
);
const siteLayout = readFileSync(
  join(process.cwd(), "src/app/site/[id]/layout.tsx"),
  "utf8",
);
const domainSrc = readFileSync(
  join(process.cwd(), "src/lib/domain.ts"),
  "utf8",
);
assert(
  siteLayout.includes("writerSeedPortalPath") &&
    siteLayout.includes("isWriterSeedKind") &&
    !domainSrc.includes('from "./seed-writer"'),
  "Writer Seeds redirect off /site/[id] without pulling Node crypto into domain.ts",
);

const brief = composeWriterBrief({
  form: "book",
  title: "The Last Greenhouse",
  premise: "A botanist inherits a greenhouse that remembers visitors.",
  audience: "Adult literary readers",
  tone: "Warm and spare",
});
assert(/Writer Seed/i.test(brief), "composed brief names Writer Seed");
assert(/Form: book/i.test(brief), "composed brief locks form");
assert(/HARD RULE/i.test(brief), "composed brief carries the HARD RULE");

const lyrics = draftSongLyricsMarkdown({
  title: "Midnight on the River",
  premise: "Choosing hope after a hard year.",
  status: "ready",
});
assert(/Chorus/i.test(lyrics), "song draft includes a chorus");
assert(/Verse 1/i.test(lyrics), "song draft includes verse 1");

const outline = `
Chapter 3: The Wish Book (The Rise)
Opening scene. North Redwood, Minnesota, 1886.
Chapter 4: The Paper Tiger (The Fall)
Opening scene. 1993. Sears shuts down its big general catalog.
`;
const parsed = parseOutlineChaptersFromText(outline);
assert(parsed.length === 2, "outline parser finds two Sears chapters");
assert(parsed[0]?.title.includes("Wish Book"), "chapter 3 title from outline");
assert(parsed[1]?.title.includes("Paper Tiger"), "chapter 4 title from outline");
const planned = buildBookChapterPlan({
  title: "MBA Disease and the PIE Effect",
  premise: "PIE Effect decay in American retail.",
  outlineText: outline,
});
assert(
  planned.some((c) => /Wish Book/i.test(c.title)) &&
    planned.some((c) => /Paper Tiger/i.test(c.title)),
  "book plan prefers owner outline chapters over generic plot",
);

const worded = parseOutlineChaptersFromText(
  "Chapter Two: The Illusion of the Paper Tiger\nThe spreadsheet covers the rot.",
);
assert(
  worded.length === 1 && worded[0]?.number === 2 && /Paper Tiger/i.test(worded[0].title),
  "outline parser accepts Chapter Two",
);

const masterDoc = `
# **MBA Disease and the PIE Effect: Structural Outline**

## **I. Core Thesis: The Great Decoupling**

The disease is leadership leaving the floor.

## **Chapter Two: The Illusion of the Paper Tiger**

Chapter Two explores how bad data covers the rot.

* **General Motors: The Blueprint of Disconnect** (Applying the 5-part architecture)
* **CHABoeing: The Engineering Migration**
  * **1\\. Founder’s Genesis:** The Engineer-King.
* **Intel: The Paralysis of Advantage** (Applying the 5-part architecture)

**The Founder’s Genesis: Tactile Obsession**
`;
const fromDoc = parseOutlineChaptersFromText(masterDoc);
assert(
  fromDoc.some((c) => c.number === 1 && /Great Decoupling/i.test(c.title)),
  "master outline promotes the thesis to chapter 1",
);
assert(
  fromDoc.some((c) => c.number === 2 && /Paper Tiger/i.test(c.title)),
  "master outline keeps Chapter Two",
);
assert(
  fromDoc.some((c) => /General Motors/i.test(c.title)) &&
    fromDoc.some((c) => /^Boeing:/.test(c.title)) &&
    fromDoc.some((c) => /Engineer-King|737/.test(
      fromDoc.find((c) => /^Boeing:/.test(c.title))?.purpose || "",
    )) &&
    fromDoc.some((c) => /Intel/i.test(c.title)),
  "master outline turns case studies into chapters",
);
assert(
  !fromDoc.some((c) => /Founder.s Genesis/i.test(c.title) && c.title.startsWith("1")),
  "five-part sub-beats stay inside the case study",
);
assert(
  fromDoc.some((c) => /Tactile Obsession/i.test(c.title)),
  "framework section becomes its own chapter",
);

const mba = WRITER_CONCEPTS.find((c) => c.id === "mba-disease-pie-effect");
const planted = parseOutlineChaptersFromText(mba?.outlineText || "");
assert(planted.length >= 8, "featured book outline has the full chapter list");
assert(
  planted.some((c) => /Great Decoupling/i.test(c.title)) &&
    planted.some((c) => /Boeing/i.test(c.title)) &&
    planted.some((c) => /Sears and Kodak/i.test(c.title)),
  "featured outline names the decoupling, Boeing, and Sears",
);
assert(
  knownWriterOutlineForDriveFile(
    "1gR1Zr4ucrejgD2TOUargIFe7E7_V8I3W8nhHClj2wVw",
  )?.concept.id === "mba-disease-pie-effect",
  "the master Google Doc id maps to the featured book",
);
assert(
  /driveLink/.test(
    readFileSync(join(process.cwd(), "src/app/writer/writer-plant-form.tsx"), "utf8"),
  ),
  "writer plant form accepts a Google Doc link",
);
assert(
  /location\.assign/.test(
    readFileSync(join(process.cwd(), "src/app/writer/writer-plant-form.tsx"), "utf8"),
  ),
  "planting opens the desk with a full page load",
);

const localOnly = {
  id: "local-seed",
  name: "Local",
  updatedAt: "2026-10-18T00:00:00.000Z",
} as SeedProject;
const remoteNewer = {
  id: "planted-on-other-instance",
  name: "MBA Disease Writer Seed",
  updatedAt: "2026-10-18T01:00:00.000Z",
  seedKind: "writer",
} as SeedProject;
const remoteOlder = {
  id: "local-seed",
  name: "Stale remote",
  updatedAt: "2026-10-17T00:00:00.000Z",
} as SeedProject;
const absorbed = absorbRemoteProjects([localOnly], [remoteNewer, remoteOlder]);
assert(
  absorbed.some((project) => project.id === "planted-on-other-instance") &&
    absorbed.some((project) => project.id === "local-seed" && project.name === "Local"),
  "a Seed planted on another instance is visible without dropping newer local edits",
);
assert(
  absorbRemoteProjects([localOnly], []).length === 1,
  "an empty remote read does not wipe cached Seeds",
);

if (process.exitCode) {
  console.error("assert-seed-writer failed");
  process.exit(process.exitCode);
}
console.log("assert-seed-writer passed");
