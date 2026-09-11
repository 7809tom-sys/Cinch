/**
 * HARD RULE: a Seed develops a project as a playbook, not as a dumped file
 * on cinchseed.com. Several specialists write chapter scripts. Senti reads
 * every chapter and compiles one sendable instruction pack (interactive /
 * print-to-PDF). Random one-off prompts are not the method.
 */
import { planInPlaceImprovements } from "./connect-improvements";
import {
  JUST_PUTZIT_NOT_ON_SEED,
  LIVE_UPDATE_REQUIRES_APPROVAL,
  isJustPutzItSeedProject,
} from "./seed-connect";

export const SENTI_NAME = "Senti";

export const SEED_PLAYBOOK_RULE =
  "Prep work is everything. Describe the chat before the chat happens. Spec website, admin, accounting, CRM, and delivery — or mark N/A — before Conductor builds. Senti holds that brief on the Seed. Do not dump a suggestion file on cinchseed.com. Do not open AI cold.";

export function seedPlaybookUrl(projectId: string): string {
  return `/admin/projects/${projectId}/playbook`;
}

export function portalSeedPlaybookUrl(projectId: string): string {
  return `/portal/${projectId}/playbook`;
}

export const SENTI_DESK_PATH = "/senti";

export type PlaybookChapterId =
  | "discover"
  | "atlas"
  | "pixel"
  | "quill"
  | "lumen"
  | "sentry"
  | "compile";

export type PlaybookChapter = {
  id: PlaybookChapterId;
  n: number;
  agent: string;
  title: string;
  script: string;
  status: "ready" | "proposed";
};

export type PlaybookMethodStep = {
  id: string;
  title: string;
  detail: string;
};

export const PLAYBOOK_METHOD: PlaybookMethodStep[] = [
  {
    id: "prep",
    title: "Describe the chat before the chat",
    detail:
      "Write intent, in/out scope, source of truth, non-negotiables, and what done looks like. Exact inputs win.",
  },
  {
    id: "lanes",
    title: "Spec every lane",
    detail:
      "Website, admin, accounting, CRM, and delivery — all addressed or explicitly N/A. A pretty homepage alone is not a website.",
  },
  {
    id: "lock",
    title: "Lock delivery and money",
    detail:
      "Check the fulfillment mode and fee rules before coding. If money is unclear, fail closed.",
  },
  {
    id: "paste",
    title: "Paste one job into Conductor",
    detail:
      "Senti holds the brief. Conductor sequences one task at a time. Do not open a wandering chat.",
  },
];

export type SeedPlaybook = {
  seedName: string;
  liveUrl: string | null;
  headline: string;
  summary: string;
  method: PlaybookMethodStep[];
  chapters: PlaybookChapter[];
  compiledTitle: string;
  compiledBody: string;
  awaitingOwnerApproval: boolean;
  filledCount: number;
};

export type PlaybookChapterDraft = {
  script: string;
  status: "draft" | "ready";
};

export type SeedPlaybookDraft = {
  chapters: Partial<Record<PlaybookChapterId, PlaybookChapterDraft>>;
  methodStepId: string;
  currentChapterId: PlaybookChapterId;
  updatedAt: string;
};

export const PLAYBOOK_CHAPTER_IDS: PlaybookChapterId[] = [
  "discover",
  "atlas",
  "pixel",
  "quill",
  "lumen",
  "sentry",
  "compile",
];

export function isPlaybookChapterId(value: string): value is PlaybookChapterId {
  return PLAYBOOK_CHAPTER_IDS.includes(value as PlaybookChapterId);
}

export const METHOD_CHAPTERS: Record<string, PlaybookChapterId[]> = {
  prep: ["discover"],
  lanes: ["atlas", "pixel", "lumen"],
  lock: ["quill", "sentry"],
  paste: ["compile"],
};

export type ChapterPrompt = {
  prompt: string;
  blanks: string[];
  starter: string;
};

export const CHAPTER_PROMPTS: Record<PlaybookChapterId, ChapterPrompt> = {
  discover: {
    prompt:
      "Describe the chat before the chat happens. One sentence for intent. One line for done.",
    blanks: ["ONE-SENTENCE INTENT", "DONE LOOKS LIKE", "HOST / SITE"],
    starter:
      "ONE-SENTENCE INTENT:\nDONE LOOKS LIKE:\nHOST / SITE:\n",
  },
  atlas: {
    prompt: "One job only. Name what is in scope and what AI must not invent.",
    blanks: ["IN SCOPE", "OUT OF SCOPE", "SOURCE OF TRUTH"],
    starter: "IN SCOPE:\nOUT OF SCOPE:\nSOURCE OF TRUTH:\n",
  },
  pixel: {
    prompt: "Name who lands on the public site, the one job they finish, and what sits behind login.",
    blanks: ["PUBLIC JOB", "BEHIND LOGIN", "SOFT GATES"],
    starter: "PUBLIC JOB:\nBEHIND LOGIN:\nSOFT GATES (email required / name optional):\n",
  },
  quill: {
    prompt: "Hard rules. Fail closed if a rule is unclear. Do not invent conflicting copy.",
    blanks: ["BRAND / CAPS", "VOIDS", "FEES"],
    starter: "BRAND / CAPS:\nVOIDS:\nFEES:\n",
  },
  lumen: {
    prompt:
      "Spec administration, accounting, CRM/ops, and fulfillment — or mark N/A. A pretty homepage is not a website.",
    blanks: ["ADMIN", "ACCOUNTING / MONEY", "CRM / OPS", "DELIVERY"],
    starter:
      "ADMIN:\nACCOUNTING / MONEY:\nCRM / OPS:\nDELIVERY (or N/A):\n",
  },
  sentry: {
    prompt: "A human can click the done-looks-like tests in under five minutes.",
    blanks: ["FIVE-MINUTE TEST", "FAIL IF BLANK"],
    starter: "FIVE-MINUTE TEST:\nFAIL IF BLANK:\n",
  },
  compile: {
    prompt:
      "Read every chapter as one brief. Write the single instruction Conductor should paste. Do not open AI cold.",
    blanks: ["PASTE-READY JOB"],
    starter: "PASTE-READY JOB:\n",
  },
};

export function emptyPlaybookDraft(): SeedPlaybookDraft {
  return {
    chapters: {},
    methodStepId: "prep",
    currentChapterId: "discover",
    updatedAt: new Date().toISOString(),
  };
}

export function chapterIsFilled(script: string | undefined): boolean {
  const text = script?.trim() ?? "";
  if (text.length < 12) return false;
  const labelsOnly = text
    .replace(/^[A-Z0-9 /()&-]+:\s*$/gm, "")
    .replace(/\n+/g, "")
    .trim();
  return labelsOnly.length >= 8;
}

export function mergePlaybookChapters(
  generated: PlaybookChapter[],
  draft?: SeedPlaybookDraft | null,
): PlaybookChapter[] {
  return generated.map((chapter) => {
    const saved = draft?.chapters[chapter.id];
    if (!saved?.script.trim()) return chapter;
    const filled = chapterIsFilled(saved.script);
    return {
      ...chapter,
      script: saved.script.trim(),
      status: saved.status === "ready" || filled ? "ready" : "proposed",
    };
  });
}

function genericChapters(input: {
  name: string;
  brief?: string | null;
  liveUrl?: string | null;
}): PlaybookChapter[] {
  const site = input.name.trim() || "this Seed";
  const brief = input.brief?.trim() || "the brief on this Seed";
  const host = input.liveUrl?.trim() || "the live host";
  return [
    {
      id: "discover",
      n: 1,
      agent: "Conductor",
      title: "Intent and done line",
      script: `Prep first for ${site}. Brief: ${brief}. Write the one-sentence intent and what done looks like before any page is drawn. Host: ${host}.`,
      status: "ready",
    },
    {
      id: "atlas",
      n: 2,
      agent: "Atlas",
      title: "In scope / out of scope",
      script: `One job only for ${site}. List in-scope pages and tools. List what AI must not invent. No while-you-are-in-there pile-ons.`,
      status: "proposed",
    },
    {
      id: "pixel",
      n: 3,
      agent: "Pixel",
      title: "Website vs logged-in product",
      script: `Name who lands on ${host}, the one job they finish, and what sits behind login. Soft gates (email required / name optional) stay in the brief.`,
      status: "proposed",
    },
    {
      id: "quill",
      n: 4,
      agent: "Quill",
      title: "Non-negotiables",
      script: `Hard rules for ${site}: brand, caps, voids, fees. Fail closed if a rule is unclear. Do not invent conflicting copy.`,
      status: "proposed",
    },
    {
      id: "lumen",
      n: 5,
      agent: "Lumen",
      title: "Admin, money, CRM, delivery",
      script: `Spec administration, accounting, CRM/ops, and fulfillment for ${site} — or mark N/A. A pretty homepage with no money trail is not a website.`,
      status: "proposed",
    },
    {
      id: "sentry",
      n: 6,
      agent: "Sentry",
      title: "Acceptance in five minutes",
      script: `A human can click the done-looks-like tests in under five minutes. Fail if any lane is blank and still needed.`,
      status: "proposed",
    },
    {
      id: "compile",
      n: 7,
      agent: SENTI_NAME,
      title: "Compile the paste-ready brief",
      script:
        "Read every chapter as one brief. Write a single instruction Conductor can paste. Do not open AI cold.",
      status: "ready",
    },
  ];
}

function compileBody(input: {
  seedName: string;
  liveUrl: string | null;
  chapters: PlaybookChapter[];
  awaitingOwnerApproval: boolean;
}): string {
  const host = input.liveUrl || "the live host";
  const lines = [
    `# ${input.seedName} — Seed instruction pack`,
    "",
    SEED_PLAYBOOK_RULE,
    "",
    `Host: ${host}`,
    "",
    "## How this project is developed",
    ...PLAYBOOK_METHOD.map(
      (step, index) => `${index + 1}. ${step.title} — ${step.detail}`,
    ),
    "",
    "## Chapter scripts",
    ...input.chapters.flatMap((chapter) => [
      "",
      `### ${chapter.n}. ${chapter.title} (${chapter.agent})`,
      chapter.script,
    ]),
    "",
    "## Senti compiled instruction",
    `Upload this pack as one brief. Do not start a new random prompt. Work ${host} in place using the chapter scripts above, in order.`,
    input.awaitingOwnerApproval ? "" : null,
    input.awaitingOwnerApproval ? LIVE_UPDATE_REQUIRES_APPROVAL : null,
  ].filter((line): line is string => line !== null);
  return lines.join("\n");
}

export function playbookOwnerFilledCount(
  draft?: SeedPlaybookDraft | null,
): number {
  return PLAYBOOK_CHAPTER_IDS.filter((id) =>
    chapterIsFilled(draft?.chapters[id]?.script),
  ).length;
}

export function compileSeedPlaybook(input: {
  name?: string | null;
  brief?: string | null;
  seedMode?: string | null;
  liveUrl?: string | null;
  githubRepoUrl?: string | null;
  draft?: SeedPlaybookDraft | null;
}): SeedPlaybook {
  const seedName = input.name?.trim() || "this Seed";
  if (
    isJustPutzItSeedProject({
      name: input.name,
      liveUrl: input.liveUrl,
      githubRepoUrl: input.githubRepoUrl,
    })
  ) {
    return {
      seedName,
      liveUrl: null,
      headline: "Just Putz It is not a Cinch Seed",
      summary: JUST_PUTZIT_NOT_ON_SEED,
      method: PLAYBOOK_METHOD,
      chapters: genericChapters({
        name: "a Seed Cinch can update",
        brief: "Do not staff Just Putz It.",
        liveUrl: null,
      }),
      compiledTitle: "Not a Cinch Seed",
      compiledBody: JUST_PUTZIT_NOT_ON_SEED,
      awaitingOwnerApproval: true,
      filledCount: 0,
    };
  }
  const plan = planInPlaceImprovements({
    name: input.name,
    brief: input.brief,
    liveUrl: input.liveUrl,
    githubRepoUrl: input.githubRepoUrl,
  });
  const generated = genericChapters({
    name: seedName,
    brief: input.brief,
    liveUrl: plan.liveUrl,
  });
  const chapters = mergePlaybookChapters(generated, input.draft);
  const awaitingOwnerApproval =
    input.seedMode === "connect" || plan.kind === "social_activity_dating";

  return {
    seedName,
    liveUrl: plan.liveUrl ?? input.liveUrl?.trim() ?? null,
    headline: `Senti holds the ${seedName} project on this Seed`,
    summary:
      "Prep work is everything. Fill each chapter on this Seed — intent, scope, lanes, delivery, money — then Conductor builds one job at a time. Not a dumped file on cinchseed.com.",
    method: PLAYBOOK_METHOD,
    chapters,
    compiledTitle: `${seedName} instruction pack`,
    compiledBody: compileBody({
      seedName,
      liveUrl: plan.liveUrl ?? input.liveUrl?.trim() ?? null,
      chapters,
      awaitingOwnerApproval,
    }),
    awaitingOwnerApproval,
    filledCount: playbookOwnerFilledCount(input.draft),
  };
}

export function seedAsksForPlaybook(text: string): boolean {
  return /\b(playbook|prep work|describe the chat|how (?:do|to) (?:we |i )?(?:run|develop|do) (?:a )?project|chapter scripts|instruction pack|senti|compile (?:the )?(?:chapters|scripts)|interactive pdf)\b/i.test(
    text,
  );
}

export function playbookDownloadFilename(seedName: string): string {
  const slug =
    seedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "seed";
  return `${slug}-senti-instruction.md`;
}

export function exampleSeedPlaybook(): SeedPlaybook {
  return compileSeedPlaybook({
    name: "Northside Bakery",
    brief: "Neighborhood bakery website with morning orders and pickup.",
    seedMode: "build",
    liveUrl: null,
  });
}

/** @deprecated Just Putz It is not a Cinch Seed. */
export function exampleJustPutzItPlaybook(): SeedPlaybook {
  return exampleSeedPlaybook();
}
