/**
 * Guard: Writer Seed multi-agent book/song collaboration HARD RULE.
 * Run: npx tsx scripts/assert-seed-writer.ts
 */
import {
  composeWriterBrief,
  draftSongLyricsMarkdown,
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

if (process.exitCode) {
  console.error("assert-seed-writer failed");
  process.exit(process.exitCode);
}
console.log("assert-seed-writer passed");
