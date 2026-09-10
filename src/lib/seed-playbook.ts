/**
 * HARD RULE: a Seed develops a project as a playbook, not as a dumped file
 * on cinchseed.com. Several specialists write chapter scripts. Senti reads
 * every chapter and compiles one sendable instruction pack (interactive /
 * print-to-PDF). Random one-off prompts are not the method.
 */
import { planInPlaceImprovements } from "./connect-improvements";
import {
  JUST_PUTZIT_LIVE,
  LIVE_UPDATE_REQUIRES_APPROVAL,
  isJustPutzItHost,
} from "./seed-connect";

export const SENTI_NAME = "Senti";

export const SEED_PLAYBOOK_RULE =
  "Develop a project on the Seed playbook — not by adding a suggestion file on cinchseed.com. Talk to several AIs, keep the chapter scripts together, then Senti compiles every chapter into one instruction pack you can print, upload, and send. Do not fix the same site with a new random prompt every time.";

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
    id: "talk",
    title: "Talk to several AIs",
    detail:
      "Conductor, Atlas, Pixel, Quill, Lumen, and Sentry each take one chapter. They do not overwrite each other.",
  },
  {
    id: "keep",
    title: "Keep the chapter scripts together",
    detail:
      "Every chapter stays on this Seed. Reviews, Chief of Staff notes, and dialog turns become chapters — not files on the public homepage.",
  },
  {
    id: "compile",
    title: "Senti compiles one pack",
    detail:
      "Senti reads every chapter at once and writes a single instruction. That is the repeatable method — not a new random prompt each time something breaks.",
  },
  {
    id: "send",
    title: "Print, upload, and send",
    detail:
      "The pack is interactive on the Seed and prints as a PDF you can upload to another AI or send to a teammate.",
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
};

function justPutzItChapters(): PlaybookChapter[] {
  return [
    {
      id: "discover",
      n: 1,
      agent: "Conductor",
      title: "What we already know",
      script:
        "Just Putz It is live and sharp: Don’t Swipe. Show Up. Events are real (1,717 Milwaukee listings). Gym Buddy has its own page. Main pushes are Start Your Journey / Join Free Today. The Seed looks at justputzit.com in place. Do not rebuild it on cinchseed.com.",
      status: "ready",
    },
    {
      id: "pixel",
      n: 2,
      agent: "Pixel",
      title: "Stop the Manus sign-in trap",
      script:
        "The homepage kicked a reviewer to a Manus sign-in while scrolling. That kills first visits. Keep the public dating/activity page on justputzit.com. Auth belongs behind an intentional join or admin path — never on a scroll of Home.",
      status: "proposed",
    },
    {
      id: "atlas",
      n: 3,
      agent: "Atlas",
      title: "Put Gym Buddy and New Date above the fold",
      script:
        "The product is deeper than the hero sells. Gym Buddy and New Date barely show above the fold. Keep Sally’s front (Don’t Swipe. Show Up.) and lift those two products into the first viewport so a visitor sees a real outing, not only a slogan.",
      status: "proposed",
    },
    {
      id: "quill",
      n: 4,
      agent: "Quill",
      title: "Privacy is not a template",
      script:
        "The privacy page still says it is a template. A lawyer should review it before any gym or dating contract language. Replace leftover template copy in the live site’s own voice. Do not invent a second Cinch privacy page.",
      status: "proposed",
    },
    {
      id: "lumen",
      n: 5,
      agent: "Lumen",
      title: "Trust and findability stay on the live host",
      script:
        "Events, Gym Buddy, and New Date are the offer. Titles and trust cues should match a social-activity dating site. Do not write a suggestion file on cinchseed.com — keep this chapter on the Seed.",
      status: "proposed",
    },
    {
      id: "sentry",
      n: 6,
      agent: "Sentry",
      title: "Sign-off before a live update",
      script:
        "Fail the pack if Home still routes a scroller to Manus sign-in, if Gym Buddy and New Date stay below the fold, or if Privacy still reads as a template. No final update lands without owner approval.",
      status: "proposed",
    },
    {
      id: "compile",
      n: 7,
      agent: SENTI_NAME,
      title: "Compile the instruction pack",
      script:
        "Read every chapter above as one brief. Write a single instruction an owner can print or upload. Queue only — do not publish to justputzit.com until the owner approves.",
      status: "ready",
    },
  ];
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
      title: "Frame the project",
      script: `Name the visitor, the offer, and the live host for ${site}. Brief: ${brief}. Work ${host} in place. Do not dump a suggestion file on cinchseed.com.`,
      status: "ready",
    },
    {
      id: "atlas",
      n: 2,
      agent: "Atlas",
      title: "Desire path",
      script: `Design hero → proof → ask for ${site} so the product is visible above the fold.`,
      status: "proposed",
    },
    {
      id: "pixel",
      n: 3,
      agent: "Pixel",
      title: "Remove friction",
      script: `Shorten the path on ${host}. Kill accidental sign-in walls, dead taps, and extra screens.`,
      status: "proposed",
    },
    {
      id: "quill",
      n: 4,
      agent: "Quill",
      title: "Voice and legal-safe copy",
      script: `Write in the site’s own voice. Replace leftover template language. Do not invent a second homepage on Cinch.`,
      status: "proposed",
    },
    {
      id: "lumen",
      n: 5,
      agent: "Lumen",
      title: "Trust and findability",
      script: `Match titles and proof to what the visitor is actually trying to do on ${host}.`,
      status: "proposed",
    },
    {
      id: "sentry",
      n: 6,
      agent: "Sentry",
      title: "Sign-off",
      script: `A stranger can complete the primary ask in under a minute. Fail if any chapter is missing from this Seed.`,
      status: "proposed",
    },
    {
      id: "compile",
      n: 7,
      agent: SENTI_NAME,
      title: "Compile the instruction pack",
      script:
        "Read every chapter as one brief. Write a single instruction the owner can print, upload, or send.",
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

export function compileSeedPlaybook(input: {
  name?: string | null;
  brief?: string | null;
  seedMode?: string | null;
  liveUrl?: string | null;
  githubRepoUrl?: string | null;
}): SeedPlaybook {
  const seedName = input.name?.trim() || "this Seed";
  const jpi = isJustPutzItHost({
    liveUrl: input.liveUrl,
    githubRepoUrl: input.githubRepoUrl,
  });
  const plan = planInPlaceImprovements({
    name: input.name,
    brief: input.brief,
    liveUrl: input.liveUrl,
    githubRepoUrl: input.githubRepoUrl,
  });
  const chapters = jpi
    ? justPutzItChapters()
    : genericChapters({
        name: seedName,
        brief: input.brief,
        liveUrl: plan.liveUrl,
      });
  const awaitingOwnerApproval =
    jpi || input.seedMode === "connect" || plan.kind === "social_activity_dating";

  return {
    seedName,
    liveUrl: plan.liveUrl ?? input.liveUrl?.trim() ?? null,
    headline: jpi
      ? "Senti holds the Just Putz It project on this Seed"
      : `Senti holds the ${seedName} project on this Seed`,
    summary: jpi
      ? "Chief of Staff notes stay here as chapter scripts — not as a file on cinchseed.com. Senti compiles them into one instruction. Live updates wait for owner approval."
      : "Several AIs write chapters. Senti compiles one instruction pack you can print or send. The method lives on the Seed, not as a dumped file on cinchseed.com.",
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
  };
}

export function seedAsksForPlaybook(text: string): boolean {
  return /\b(playbook|how (?:do|to) (?:we |i )?(?:run|develop|do) (?:a )?project|chapter scripts|instruction pack|senti|compile (?:the )?(?:chapters|scripts)|interactive pdf)\b/i.test(
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

export function exampleJustPutzItPlaybook(): SeedPlaybook {
  return compileSeedPlaybook({
    name: "Just Putz It",
    brief:
      "Social activity and dating website. Meet locals for real dates and activities.",
    seedMode: "connect",
    liveUrl: JUST_PUTZIT_LIVE,
  });
}
