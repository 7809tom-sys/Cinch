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
import { briefIsDeliveryPlatform } from "./seed-site-copy";

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

export const SENTI_THINKS_DELIVERY_RULE =
  "HARD RULE: a delivery-platform Seed (Hometown Runner, Home Town Runnner) is DoorDash-style — three role-based logins (customer, merchant, driver), restaurant portal, driver/scout portal, admin ledger. Senti must think through those apps. Platform keeps $0 on restaurant orders (subscriptions only). The 10% is 5% scout + 5% driver. Stripe three-party Connect: restaurant, scout, and driver each have a Stripe account. Menu is DoorDash-style upload + find. Trip is $4.50 + $1.50/mile. Driver software ($39/$79) after 60 days free from the first successful drive. 60-day suspend. Scout moat: Riley sends dine-in customers (e.g. seven couples/week) because FSR traffic is ~70% dine-in and only ~5% delivery. Scout pay: one delivery a month or the 5% cascades to the next most-active signed scout at that kitchen. A restaurateur can scout another kitchen after one delivery — they cannot keep the 5% on their own. Do not copy a dining-room, bakery, or pizza restaurant format.";

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

function deliveryChapters(input: {
  name: string;
  brief?: string | null;
  liveUrl?: string | null;
}): PlaybookChapter[] {
  const site = input.name.trim() || "this Seed";
  const host = input.liveUrl?.trim() || "the live host";
  return [
    {
      id: "discover",
      n: 1,
      agent: "Conductor",
      title: "Intent and done line",
      script: `Think first for ${site}. This is a hyper-local food delivery platform (DoorDash concept): customer order nearby, restaurant portal, driver/scout portal, and admin ledger. It is not a restaurant dining room, bakery, or pizza shop. Do not copy another restaurant format. Host: ${host}. Done looks like: a guest orders nearby food, a restaurant accepts the ticket on the portal, a driver takes the run, and admin shows 10% → 5% scout / 5% driver, $0 platform on the order.`,
      status: "ready",
    },
    {
      id: "atlas",
      n: 2,
      agent: "Atlas",
      title: "In scope / out of scope",
      script: `One job only for ${site}: the marketplace. IN SCOPE: customer order nearby, /portal restaurant desk (pause/online, accept/decline tickets), /portal driver desk (go online, accept run, pickup/drop), admin ledger. OUT OF SCOPE: reserve a table, pizza with personality, chef’s dinner plates, kitchen-ticket single-room copy, a $2,000/week restaurant promise. Source of truth is the product brief — not a restaurant website template.`,
      status: "proposed",
    },
    {
      id: "pixel",
      n: 3,
      agent: "Pixel",
      title: "Website vs logged-in product",
      script: `Public job on ${host}: find nearby kitchens and order. Three role-based logins: customer, merchant, driver. Behind login: restaurant portal (AI menu draft + merchant confirm) and driver portal (DoorDash-style desk + Stripe Connect payouts), plus ops admin. Soft gates: email for a customer order; merchant and driver accounts for the portals. Do not draw a plated-menu dining room on the public landing.`,
      status: "proposed",
    },
    {
      id: "quill",
      n: 4,
      agent: "Quill",
      title: "Non-negotiables",
      script: `Hard rules for ${site}: platform keeps $0 from restaurant orders (revenue is driver subscriptions); restaurants pay 10% on delivery GMV fully split 5% scout + 5% driver; drivers keep 100% of fee + tip + the 5% share via Stripe Connect (direct to the driver); restaurant collects the food total and pays ~2.9% processor; trip is $4.50 + $1.50/mile so drivers clear the $0.76 federal mileage rate; payouts fire at a $25 minimum balance or weekly; drivers manage their own tax forms (restaurant does not issue 1099s); everybody gets 60 days free starting the first successful drive (a delivered run — not signup, first login, or first offer); after day 60 driver software is $39/month part-time or $79/month full-time (weekly $9.99 / $19.99); full-time is app-open more than 30 hours/week or 120 hours in 4 weeks; 60 days without opening the app auto-suspends the driver. Fail closed if money is unclear. Do not invent “Reserve a table”, “Pizza With Personality”, “how guests use the room”, or kitchen-ticket chrome.`,
      status: "proposed",
    },
    {
      id: "lumen",
      n: 5,
      agent: "Lumen",
      title: "Admin, money, CRM, delivery",
      script: `Admin is the ops ledger — not a host stand. Accounting is 10% fully split 5% scout / 5% driver, $0 platform on the order. CRM/ops is the restaurant roster plus scout attribution. Market: DoorDash has no published US AOV (Rakuten $37.28; Q4 2025 implied ~$33 global); 8M+ US / 9M+ world Dashers in 2025, typical ~10 weeks / 4 hours. FSR mix 70% dine-in / 5% delivery. Independent median ~$850K (rough). Riley sends dine-in first (seven couples in a week), then those tables become delivery through Riley. Delivery is the product: restaurant portal + driver portal, DoorDash concept. Do not mark delivery N/A. Do not spec a single dining room.`,
      status: "proposed",
    },
    {
      id: "sentry",
      n: 6,
      agent: "Sentry",
      title: "Acceptance in five minutes",
      script: `Five-minute test: land on Order nearby (not Reserve a table); shop is nearby kitchens / Pilot Kitchen, not seasonal small plates; restaurant portal accepts a ticket; driver portal takes a run; admin shows $0 platform and 5% scout / 5% driver. Fail if pizza-with-personality, dinner service, or dining-room copy appears on ${site}.`,
      status: "proposed",
    },
    {
      id: "compile",
      n: 7,
      agent: SENTI_NAME,
      title: "Compile the paste-ready brief",
      script:
        "Read every chapter as one brief. Write a single instruction Conductor can paste: build the four apps (customer, restaurant portal, driver portal, admin ledger). Do not open AI cold. Do not stamp a restaurant format.",
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
  deliveryPlatform?: boolean;
}): string {
  const host = input.liveUrl || "the live host";
  const lines = [
    `# ${input.seedName} — Seed instruction pack`,
    "",
    SEED_PLAYBOOK_RULE,
    input.deliveryPlatform ? SENTI_THINKS_DELIVERY_RULE : null,
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
  const deliveryPlatform = briefIsDeliveryPlatform(seedName, input.brief ?? "");
  const generated = deliveryPlatform
    ? deliveryChapters({
        name: seedName,
        brief: input.brief,
        liveUrl: plan.liveUrl,
      })
    : genericChapters({
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
    headline: deliveryPlatform
      ? `Senti compiles ${seedName} as a delivery platform — not a restaurant`
      : `Senti holds the ${seedName} project on this Seed`,
    summary: deliveryPlatform
      ? "Think through the four apps. Do not stamp a dining-room or pizza template. Customer order, restaurant portal, driver portal, admin ledger. Platform $0 on orders. 10% → 5% scout / 5% driver. Drivers keep fee, tip, and the 5% share."
      : "Prep work is everything. Fill each chapter on this Seed — intent, scope, lanes, delivery, money — then Conductor builds one job at a time. Not a dumped file on cinchseed.com.",
    method: PLAYBOOK_METHOD,
    chapters,
    compiledTitle: `${seedName} instruction pack`,
    compiledBody: compileBody({
      seedName,
      liveUrl: plan.liveUrl ?? input.liveUrl?.trim() ?? null,
      chapters,
      awaitingOwnerApproval,
      deliveryPlatform,
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
    name: "Hometown Runner",
    brief:
      "Hometown Runner is a hyper-local food delivery platform. Three role-based logins. Platform keeps $0 on restaurant orders. The 10% is 5% scout + 5% driver. Stripe three-party Connect: restaurant, scout, and driver each have a Stripe account. Menu is DoorDash-style upload + find. Trip is $4.50 + $1.50/mile. Everybody gets 60 days free from the first successful drive; after that driver software is $39/month part-time or $79/month full-time. Drivers manage their own tax forms. Riley sends dine-in customers (seven couples in a week) because full-service traffic is about 70% dine-in and only 5% delivery. Scout pay: one delivery a month or the 5% cascades to the next most-active signed scout at that kitchen. A restaurateur can scout another kitchen after one delivery — they cannot keep the 5% on their own.",
    seedMode: "build",
    liveUrl: null,
  });
}

/** @deprecated Just Putz It is not a Cinch Seed. */
export function exampleJustPutzItPlaybook(): SeedPlaybook {
  return exampleSeedPlaybook();
}
