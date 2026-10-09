/**
 * HARD RULE: Writer Seed — AI agents collaborate to write a book or a song.
 * Docs: docs/seed-writer-collaborate.md
 *
 * One specialist alone cannot ship extraordinary long-form. Quill, Atlas,
 * Lumen, and Sentry share a notebook and grow a living manuscript or lyric
 * sheet together — the same “better than one model alone” idea as engagement
 * collaboration on website Seeds.
 */
import { randomUUID } from "crypto";
import type { AgentSkill } from "./agents";

export type SeedKind = "website" | "writer";
export type WriterForm = "book" | "song";

export const SEED_WRITER_COLLABORATE_RULE = {
  id: "seed-writer-collaborate",
  summary:
    "HARD RULE: Writer Seed agents must collaborate to write a book or a song. No single agent ships the whole work alone; Quill, Atlas, Lumen, and Sentry leave a shared trail so the crew does something extraordinary together.",
  steps: [
    "Quill names premise, voice, audience, and emotional promise.",
    "Atlas designs structure — chapters/acts for a book, or verse/chorus/bridge for a song.",
    "Quill drafts the living pages or verses into the Seed source tree.",
    "Lumen polishes memorable lines, titles, and thematic clarity.",
    "Sentry signs off that the work reads complete, consistent, and ready for the owner.",
  ],
  whyTogether:
    "Premise without structure rambles. Structure without voice is outline-only. Draft without polish is rough. Polish without QA misses holes. Together they beat what any one model can do.",
} as const;

export const WRITER_COLLAB_TITLE_PREFIX = "Writer collab";
export const WRITER_COLLAB_NOTEBOOK = "docs/writer-collab.md";

export type WriterCollabPhase =
  | "premise"
  | "structure"
  | "draft"
  | "polish"
  | "sign-off";

export type WriterCollabTaskDraft = {
  id: string;
  title: string;
  detail: string;
  requiredSkills: AgentSkill[];
  minSkillLevel: number;
  status: "queued";
  assigneeId: null;
  assignedBy: null;
  updatedAt: string;
  collabPath: string;
  phase: WriterCollabPhase;
};

export const WRITER_SEED_PRICE_USD = 99;

function stamp() {
  return new Date().toISOString();
}

export function isWriterSeedKind(
  kind: string | null | undefined,
): kind is "writer" {
  return kind === "writer";
}

export function resolveSeedKind(input: {
  seedKind?: string | null;
  writerForm?: string | null;
  brief?: string | null;
}): SeedKind {
  if (input.seedKind === "writer" || input.seedKind === "website") {
    return input.seedKind;
  }
  if (input.writerForm === "book" || input.writerForm === "song") {
    return "writer";
  }
  const brief = (input.brief ?? "").toLowerCase();
  if (
    /\bwriter seed\b/.test(brief) ||
    /\b(write|writing)\s+(a\s+)?(book|novel|song|lyrics)\b/.test(brief) ||
    /\b(book|novel|song)\s+seed\b/.test(brief)
  ) {
    return "writer";
  }
  return "website";
}

export function resolveWriterForm(input: {
  writerForm?: string | null;
  brief?: string | null;
  name?: string | null;
}): WriterForm {
  if (input.writerForm === "book" || input.writerForm === "song") {
    return input.writerForm;
  }
  const hay = `${input.name ?? ""} ${input.brief ?? ""}`.toLowerCase();
  if (/\b(song|lyric|lyrics|verse|chorus|ballad)\b/.test(hay)) {
    return "song";
  }
  return "book";
}

function phaseTask(
  phase: WriterCollabPhase,
  title: string,
  detail: string,
  requiredSkills: AgentSkill[],
  minSkillLevel: number,
): WriterCollabTaskDraft {
  const rule = SEED_WRITER_COLLABORATE_RULE.summary;
  return {
    id: randomUUID(),
    title,
    detail: `${rule} Phase: ${phase}. Append findings to ${WRITER_COLLAB_NOTEBOOK} for the next specialist. ${detail}`,
    requiredSkills,
    minSkillLevel,
    status: "queued",
    assigneeId: null,
    assignedBy: null,
    updatedAt: stamp(),
    collabPath: WRITER_COLLAB_NOTEBOOK,
    phase,
  };
}

/**
 * Ordered multi-agent writing chain — Conductor queues these so specialists
 * collaborate on the book or song instead of one model dumping the whole work.
 */
export function planWriterCollaborationChain(input: {
  form: WriterForm;
  titleHint?: string;
  briefHint?: string;
}): WriterCollabTaskDraft[] {
  const work = input.form === "song" ? "song" : "book";
  const title = input.titleHint?.trim() || `this ${work}`;
  const brief = input.briefHint?.trim() || "";
  const context = brief
    ? `Brief context: ${brief.slice(0, 280)}`
    : `Work must fit “${title}”.`;

  if (input.form === "song") {
    return [
      phaseTask(
        "premise",
        `${WRITER_COLLAB_TITLE_PREFIX} · song premise & emotional promise`,
        `Name the listener’s feeling, the one hook idea, and the emotional promise in one sentence each. Pick voice (intimate / anthemic / story). ${context}`,
        ["copy", "research"],
        2,
      ),
      phaseTask(
        "structure",
        `${WRITER_COLLAB_TITLE_PREFIX} · song structure`,
        `Read Quill’s premise. Design verse → pre-chorus → chorus → bridge (or justified variant). Mark where the hook lands and what each section must do.`,
        ["architecture", "ui"],
        3,
      ),
      phaseTask(
        "draft",
        `${WRITER_COLLAB_TITLE_PREFIX} · draft lyrics`,
        `Read structure notes. Draft full lyrics into lyrics/song.md — verses, chorus, bridge. Keep lines singable; one clear story or feeling.`,
        ["copy"],
        3,
      ),
      phaseTask(
        "polish",
        `${WRITER_COLLAB_TITLE_PREFIX} · polish hook & title`,
        `Read the draft. Tighten the chorus, title options, and memorable lines. Cut filler that weakens the hook.`,
        ["seo", "copy"],
        2,
      ),
      phaseTask(
        "sign-off",
        `${WRITER_COLLAB_TITLE_PREFIX} · lyric QA sign-off`,
        `As a first listener: does the song have a clear feeling, a sticky hook, and complete sections? Fail if premise, structure, or draft notes are missing from ${WRITER_COLLAB_NOTEBOOK}.`,
        ["qa", "research"],
        3,
      ),
    ];
  }

  return [
    phaseTask(
      "premise",
      `${WRITER_COLLAB_TITLE_PREFIX} · book premise & voice`,
      `Name the central conflict, protagonist desire, and reader promise in one sentence each. Lock voice and genre lane. ${context}`,
      ["copy", "research"],
      2,
    ),
    phaseTask(
      "structure",
      `${WRITER_COLLAB_TITLE_PREFIX} · chapter architecture`,
      `Read Quill’s premise. Design acts and chapter list (target 8–12 chapters for a short book). Each chapter needs a purpose beat.`,
      ["architecture", "research"],
      3,
    ),
    phaseTask(
      "draft",
      `${WRITER_COLLAB_TITLE_PREFIX} · draft manuscript chapters`,
      `Read structure notes. Draft living chapters under manuscript/chapters/ and keep manuscript/BOOK.md as the compiled reading copy.`,
      ["copy"],
      3,
    ),
    phaseTask(
      "polish",
      `${WRITER_COLLAB_TITLE_PREFIX} · polish prose & titles`,
      `Read the draft. Strengthen chapter titles, opening hooks, and closing turns. Cut repetition; keep voice consistent.`,
      ["seo", "copy"],
      2,
    ),
    phaseTask(
      "sign-off",
      `${WRITER_COLLAB_TITLE_PREFIX} · manuscript QA sign-off`,
      `As a first reader: does the book open with promise, move through conflict, and land a satisfying close? Fail if premise, structure, or draft notes are missing from ${WRITER_COLLAB_NOTEBOOK}.`,
      ["qa", "research"],
      3,
    ),
  ];
}

export function taskIsWriterCollab(title: string): boolean {
  return /writer collab/i.test(title);
}

export function writerCollabPhaseFromTitle(
  title: string,
): WriterCollabPhase | null {
  const lower = title.toLowerCase();
  if (!taskIsWriterCollab(title)) return null;
  if (lower.includes("premise") || lower.includes("emotional promise") || lower.includes("voice")) {
    return "premise";
  }
  if (lower.includes("structure") || lower.includes("architecture")) {
    return "structure";
  }
  if (lower.includes("draft")) return "draft";
  if (lower.includes("polish")) return "polish";
  if (lower.includes("sign-off") || lower.includes("qa")) return "sign-off";
  return null;
}

export function projectHasWriterCollab(
  tasks: Array<{ title: string }>,
): boolean {
  return tasks.some((task) => taskIsWriterCollab(task.title));
}

export function writerCollabNotebookPath(): string {
  return WRITER_COLLAB_NOTEBOOK;
}

export function writerWorkRoot(form: WriterForm): string {
  return form === "song" ? "lyrics" : "manuscript";
}

export function writerPrimaryPath(form: WriterForm): string {
  return form === "song" ? "lyrics/song.md" : "manuscript/BOOK.md";
}

/** Section body each specialist appends — the shared “conversation.” */
export function writerCollabSectionMarkdown(input: {
  phase: WriterCollabPhase;
  form: WriterForm;
  agentName: string;
  taskTitle: string;
  taskDetail: string;
  projectName: string;
  brief: string;
  status: "building" | "ready";
}): string {
  const work = input.form === "song" ? "song" : "book";
  const prompts: Record<WriterCollabPhase, string[]> = {
    premise:
      input.form === "song"
        ? [
            `- Listener feeling:`,
            `- Hook idea (one line):`,
            `- Emotional promise:`,
            `- Voice: intimate | anthemic | story`,
          ]
        : [
            `- Central conflict:`,
            `- Protagonist desire:`,
            `- Reader promise:`,
            `- Voice / genre lane:`,
          ],
    structure:
      input.form === "song"
        ? [
            `- Section order:`,
            `- Where the hook lands:`,
            `- What verse / chorus / bridge must do:`,
          ]
        : [
            `- Act breakdown:`,
            `- Chapter list with purpose beats:`,
            `- Turning points:`,
          ],
    draft: [
      `- Draft landed at: \`${writerPrimaryPath(input.form)}\``,
      `- Sections completed:`,
      `- Open questions for polish:`,
    ],
    polish: [
      `- Title options:`,
      `- Strongest lines kept:`,
      `- Cuts made:`,
    ],
    "sign-off": [
      `- First-reader / first-listener pass: yes/no`,
      `- Promise delivered for this ${work}? yes/no`,
      `- Blockers (if any):`,
      `- Extraordinary bar met (better together than alone)? yes/no`,
    ],
  };

  const bullets = prompts[input.phase]
    .map((line) => (line.endsWith(":") ? `${line} _(filled by ${input.agentName})_` : line))
    .join("\n");

  return `## ${input.phase} — ${input.agentName}

**Task:** ${input.taskTitle}
**Status:** ${input.status}

${bullets}

_Context from brief:_ ${input.brief.slice(0, 240) || input.projectName}
`;
}

export function composeWriterBrief(input: {
  form: WriterForm;
  title: string;
  premise: string;
  audience?: string;
  tone?: string;
  notes?: string;
}): string {
  const formLabel = input.form === "song" ? "song" : "book";
  const lines = [
    `Writer Seed — collaborate to write a ${formLabel}.`,
    "",
    `Title: ${input.title.trim()}`,
    `Form: ${formLabel}`,
    `Premise: ${input.premise.trim()}`,
  ];
  if (input.audience?.trim()) {
    lines.push(`Audience: ${input.audience.trim()}`);
  }
  if (input.tone?.trim()) {
    lines.push(`Tone / voice: ${input.tone.trim()}`);
  }
  if (input.notes?.trim()) {
    lines.push("", "Owner notes:", input.notes.trim());
  }
  lines.push(
    "",
    SEED_WRITER_COLLABORATE_RULE.summary,
    "Agents must append to docs/writer-collab.md and grow the living work in Seed source.",
  );
  return lines.join("\n");
}

export function extractWriterTitle(name: string, brief: string): string {
  const fromBrief = brief.match(/^\s*Title:\s*(.+)$/im)?.[1]?.trim();
  if (fromBrief) return fromBrief.slice(0, 120);
  return name.replace(/\s+Seed$/i, "").trim() || name;
}

export function extractWriterPremise(brief: string, fallback: string): string {
  const fromBrief = brief.match(/^\s*Premise:\s*(.+)$/im)?.[1]?.trim();
  if (fromBrief) return fromBrief;
  const cleaned = brief
    .replace(/Writer Seed[^\n]*/i, "")
    .replace(/HARD RULE:[\s\S]*/i, "")
    .trim();
  return (cleaned.slice(0, 280) || fallback).trim();
}

function slugWord(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join(" ");
}

/**
 * Pull "Chapter N: Title" headings from an owner outline / PDF excerpt so the
 * living manuscript follows their structure instead of a generic plot template.
 */
export function parseOutlineChaptersFromText(
  text: string,
): Array<{ number: number; title: string; purpose: string }> {
  const chapters: Array<{ number: number; title: string; purpose: string }> =
    [];
  // Prefer a clean title like "The Wish Book (The Rise)" even when PDF text
  // scrape joins the next sentence onto the same line. Stop before the next
  // "Chapter N" so later chapters are not swallowed into the title capture.
  const re =
    /Chapter\s+(\d+)\s*[:.\-—–]\s*([\s\S]*?)(?=Chapter\s+\d+\s*[:.\-—–]|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const number = Number(match[1]);
    const block = match[2]!.replace(/\s+/g, " ").trim();
    if (!number || !block) continue;
    if (chapters.some((chapter) => chapter.number === number)) continue;

    const withParen = block.match(/^(.{2,90}?\([^)]+\))/);
    let title = withParen?.[1]?.trim() || "";
    if (!title) {
      title =
        block.split(/\bOpening scene\b|[.](?:\s|$)/i)[0]?.trim() ||
        block.slice(0, 80);
    }
    title = title.replace(/[.:;\-—–]+$/g, "").trim().slice(0, 80);
    if (title.length < 2) continue;

    const afterTitle = block.slice(block.toLowerCase().indexOf(title.toLowerCase()) + title.length);
    const purpose =
      afterTitle
        .replace(/^\s*[:.\-—–]?\s*/, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 280) ||
      `Follow the owner outline for Chapter ${number}: ${title}.`;
    chapters.push({ number, title, purpose });
  }
  return chapters.sort((a, b) => a.number - b.number);
}

/** Deterministic chapter outline for book Seeds (no API key required). */
export function buildBookChapterPlan(input: {
  title: string;
  premise: string;
  /** Owner outline / PDF excerpt — preferred when it names Chapter N headings. */
  outlineText?: string | null;
}): Array<{ number: number; title: string; purpose: string }> {
  const fromOutline = parseOutlineChaptersFromText(input.outlineText || "");
  if (fromOutline.length >= 2) return fromOutline;

  const topic = slugWord(input.premise) || slugWord(input.title) || "the journey";
  const bases = [
    { title: "The spark", purpose: `Open on the world of ${topic} and the ache that starts the story.` },
    { title: "What they want", purpose: "Show desire clearly — and the cost of not acting." },
    { title: "First turn", purpose: "Force a choice that cannot be undone." },
    { title: "Allies and friction", purpose: "Bring help and opposition into the same room." },
    { title: "The middle pressure", purpose: "Raise stakes; old tactics stop working." },
    { title: "False calm", purpose: "A brief win that hides the real problem." },
    { title: "The break", purpose: "Lose something important; truth becomes unavoidable." },
    { title: "Gathering courage", purpose: "Rebuild with a clearer plan and harder honesty." },
    { title: "The confrontation", purpose: "Face the central conflict head-on." },
    { title: "After the light", purpose: "Land the promise — change that sticks." },
  ];
  return bases.map((chapter, index) => ({
    number: index + 1,
    title: chapter.title,
    purpose: chapter.purpose,
  }));
}

export function draftBookChapterMarkdown(input: {
  title: string;
  premise: string;
  chapter: { number: number; title: string; purpose: string };
  status: "building" | "ready";
  outlineText?: string | null;
}): string {
  const voice =
    input.status === "ready"
      ? "polished for a first reader"
      : "drafted for crew review";
  const outline = (input.outlineText || "").trim();
  const nonfiction =
    /\b(MBA|PIE Effect|footnote|\[verify\]|annual report|catalog|founder)\b/i.test(
      `${input.title}\n${input.premise}\n${outline}`,
    );

  if (nonfiction) {
    return `# Chapter ${input.chapter.number}: ${input.chapter.title}

> ${input.chapter.purpose}

**${input.title}** — narrative nonfiction draft.

${input.premise}

## Beat sheet (from owner outline)

${input.chapter.purpose}

Keep floor-level scenes concrete. Flag unsourced facts as \`[verify]\`. Target 5,000–7,000 words before polish. Every hard number and date needs a footnote before print.

## Draft

Open on the scene the outline demands. Stay with people who ran the floor — not the vocabulary of the top floor — until the hinge forces the turn.

---

_${voice} by the Writer Seed crew — better together than alone. Follow docs/references/ before inventing structure._
`;
  }

  return `# Chapter ${input.chapter.number}: ${input.chapter.title}

> ${input.chapter.purpose}

The story of **${input.title}** turns here. ${input.premise}

In this chapter, the characters lean into ${slugWord(input.premise) || "what matters"}, and the reader feels the cost of waiting. Scenes stay concrete: a place, a choice, a line someone cannot take back.

---

_${voice} by the Writer Seed crew — better together than alone._
`;
}

export function compileBookManuscript(input: {
  title: string;
  premise: string;
  chapters: Array<{ number: number; title: string; body: string }>;
  status: "building" | "ready";
}): string {
  const toc = input.chapters
    .map((chapter) => `${chapter.number}. ${chapter.title}`)
    .join("\n");
  const bodies = input.chapters.map((chapter) => chapter.body.trim()).join("\n\n---\n\n");
  return `# ${input.title}

*A Writer Seed book — agents collaborating on cinchseed.com*

## Premise

${input.premise}

## Contents

${toc}

---

${bodies}

---

## Status

${input.status === "ready" ? "Ready for the owner to read." : "Still growing with the Writer Seed crew."}
`;
}

export function draftSongLyricsMarkdown(input: {
  title: string;
  premise: string;
  status: "building" | "ready";
}): string {
  const hook = extractHookLine(input.premise, input.title);
  const topic = slugWord(input.premise) || "tonight";
  return `# ${input.title}

*A Writer Seed song — agents collaborating on cinchseed.com*

## Premise

${input.premise}

## Lyrics

### Verse 1
I kept your name in the quiet places  
Where ${topic} still knows my face  
Every almost turned into a reason  
Not to leave an empty space  

### Pre-chorus
If the night asks what I’m made of  
I won’t answer with a lie  

### Chorus
${hook}  
${hook}  
Hold the feeling till it answers  
Don’t let the soft part die  

### Verse 2
We learned the map by breaking pieces  
Still the road remembers how  
If tomorrow wants a harder story  
Let it start from here and now  

### Bridge
Not a perfect ending — just a truer sound  
Something small enough to carry  
Something loud enough to count  

### Chorus
${hook}  
${hook}  
Hold the feeling till it answers  
Don’t let the soft part die  

---

## Status

${input.status === "ready" ? "Ready for the owner to sing through." : "Still growing with the Writer Seed crew."}
`;
}

function extractHookLine(premise: string, title: string): string {
  const first = premise
    .split(/[.!?]/)
    .map((part) => part.trim())
    .find((part) => part.length > 8);
  if (first) {
    const clipped = first.length > 64 ? `${first.slice(0, 61).trim()}…` : first;
    return clipped;
  }
  return `Stay with ${title}`;
}

export function writerBootstrapReadme(input: {
  title: string;
  form: WriterForm;
  brief: string;
}): string {
  const work = input.form === "song" ? "song" : "book";
  return `# ${input.title}

Writer Seed for this ${work}.

## Brief

${input.brief}

## How the crew writes

${SEED_WRITER_COLLABORATE_RULE.summary}

1. Premise & voice (Quill)
2. Structure (Atlas)
3. Draft into \`${writerPrimaryPath(input.form)}\`
4. Polish (Lumen)
5. QA sign-off (Sentry)

Agents append to \`${WRITER_COLLAB_NOTEBOOK}\` so the next specialist can continue the same work — not start over.
`;
}

export function planWriterBuildBacklog(input: {
  form: WriterForm;
  projectName: string;
  brief: string;
}): Array<{
  title: string;
  detail: string;
  requiredSkills: AgentSkill[];
  minSkillLevel: number;
}> {
  const form = input.form;
  const work = form === "song" ? "song" : "book";
  const primary = writerPrimaryPath(form);
  const rule = SEED_WRITER_COLLABORATE_RULE.summary;

  const prep = {
    title: "Lock Writer Seed brief",
    detail: `${rule} Confirm form (${work}), title, premise, audience, and tone from the owner brief before drafting.`,
    requiredSkills: ["research", "orchestration"] as AgentSkill[],
    minSkillLevel: 2,
  };

  const research = {
    title:
      form === "song"
        ? "Study comparable songs and take the best"
        : "Study comparable books and take the best",
    detail:
      form === "song"
        ? `${rule} Prefer owner Google Drive refs in docs/references/ first. Then note hooks, structures, and emotional turns from strong comparable songs — take the best of each, invent only gaps. Capture notes in docs/writer-research.md.`
        : `${rule} Prefer owner Google Drive refs in docs/references/ first. Then note openings, chapter cadence, and voice from strong comparable books — take the best of each, invent only gaps. Capture notes in docs/writer-research.md.`,
    requiredSkills: ["copy", "research"] as AgentSkill[],
    minSkillLevel: 3,
  };

  const compile = {
    title:
      form === "song"
        ? "Compile final lyric sheet"
        : "Compile final manuscript",
    detail: `${rule} Assemble the living ${work} at ${primary}. Owner should be able to read the whole work in one file.`,
    requiredSkills: ["copy", "architecture"] as AgentSkill[],
    minSkillLevel: 3,
  };

  const chain = planWriterCollaborationChain({
    form,
    titleHint: input.projectName,
    briefHint: input.brief,
  }).map(({ collabPath: _c, phase: _p, ...task }) => ({
    title: task.title,
    detail: task.detail,
    requiredSkills: task.requiredSkills,
    minSkillLevel: task.minSkillLevel,
  }));

  return [prep, research, ...chain, compile];
}
