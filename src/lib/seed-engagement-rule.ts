/**
 * HARD RULE: Seed agents must collaborate on visitor engagement & conversion.
 * Docs: docs/seed-engagement-collaborate.md
 *
 * One specialist alone cannot produce an extraordinary site. Quill, Atlas,
 * Pixel, Lumen, and Sentry must work a shared engagement loop — psychology of
 * why a visitor calls, books, or buys — then leave a trail for the next agent.
 */
import { randomUUID } from "crypto";
import type { AgentSkill } from "./agents";

export const SEED_ENGAGEMENT_COLLABORATE_RULE = {
  id: "seed-engagement-collaborate",
  summary:
    "HARD RULE: Seed agents must collaborate on visitor engagement and conversion psychology — why someone calls, books, or buys. No single agent ships that alone; Quill, Atlas, Pixel, Lumen, and Sentry leave a shared trail so the crew does something extraordinary together.",
  steps: [
    "Quill names the visitor’s fear, desire, and one clear offer (call / book / buy).",
    "Atlas designs the desire path — hero → proof → CTA hierarchy that pulls the eye.",
    "Pixel removes friction — tap targets, form length, mobile book/order path.",
    "Lumen adds trust & findability — reviews, area, titles that match intent.",
    "Sentry signs off that a stranger can complete the conversion path in under a minute.",
  ],
  whyTogether:
    "Copy without design fails. Design without psychology is decoration. Frontend without a clear ask wastes traffic. SEO without trust doesn’t convert. QA alone cannot invent the offer. Together they beat what any one model can do.",
} as const;

export const ENGAGEMENT_COLLAB_TITLE_PREFIX = "Engagement collab";

export type EngagementCollabPhase =
  | "psychology"
  | "desire-path"
  | "friction"
  | "trust"
  | "sign-off";

export type EngagementCollabTaskDraft = {
  id: string;
  title: string;
  detail: string;
  requiredSkills: AgentSkill[];
  minSkillLevel: number;
  status: "queued";
  assigneeId: null;
  assignedBy: null;
  updatedAt: string;
  /** Shared notebook path agents append to — how they “talk.” */
  collabPath: string;
  phase: EngagementCollabPhase;
};

const COLLAB_NOTEBOOK = "docs/engagement-collab.md";

function stamp() {
  return new Date().toISOString();
}

function phaseTask(
  phase: EngagementCollabPhase,
  title: string,
  detail: string,
  requiredSkills: AgentSkill[],
  minSkillLevel: number,
): EngagementCollabTaskDraft {
  const rule = SEED_ENGAGEMENT_COLLABORATE_RULE.summary;
  return {
    id: randomUUID(),
    title,
    detail: `${rule} Phase: ${phase}. Append findings to ${COLLAB_NOTEBOOK} for the next specialist. ${detail}`,
    requiredSkills,
    minSkillLevel,
    status: "queued",
    assigneeId: null,
    assignedBy: null,
    updatedAt: stamp(),
    collabPath: COLLAB_NOTEBOOK,
    phase,
  };
}

/**
 * Ordered multi-agent engagement chain — Conductor queues these so specialists
 * collaborate on conversion psychology instead of shipping siloed lanes.
 */
export function planEngagementCollaborationChain(input?: {
  brandHint?: string;
  briefHint?: string;
}): EngagementCollabTaskDraft[] {
  const brand = input?.brandHint?.trim() || "this business";
  const brief = input?.briefHint?.trim() || "";
  const offerHint = brief
    ? `Brief context: ${brief.slice(0, 220)}`
    : `Offer must fit ${brand} — call, book, order, or buy.`;

  return [
    phaseTask(
      "psychology",
      `${ENGAGEMENT_COLLAB_TITLE_PREFIX} · visitor psychology & offer`,
      `Name the visitor’s fear and desire in one sentence each. Define ONE primary ask (call / book / order / buy) and the proof that makes it safe. ${offerHint}`,
      ["copy", "research"],
      2,
    ),
    phaseTask(
      "desire-path",
      `${ENGAGEMENT_COLLAB_TITLE_PREFIX} · design the desire path`,
      `Read Quill’s psychology notes. Compose hero → proof → CTA so the primary ask is inevitable on phone and laptop — brand first, no clutter competing with conversion.`,
      ["ui", "frontend"],
      3,
    ),
    phaseTask(
      "friction",
      `${ENGAGEMENT_COLLAB_TITLE_PREFIX} · remove path friction`,
      `Read Atlas’s desire path. Shorten forms, grow tap targets, keep book/order within one scroll of the hero on mobile. Wire the CTA to the real conversion surface.`,
      ["frontend", "ui"],
      3,
    ),
    phaseTask(
      "trust",
      `${ENGAGEMENT_COLLAB_TITLE_PREFIX} · trust & findability`,
      `Read prior notes. Add service-area clarity, review/proof cues, and metadata that match search intent so the right visitors arrive ready to act.`,
      ["seo", "copy"],
      2,
    ),
    phaseTask(
      "sign-off",
      `${ENGAGEMENT_COLLAB_TITLE_PREFIX} · conversion QA sign-off`,
      `As a stranger: can you find the offer and complete call/book/buy in under 60 seconds on ~375px and ~1280px? Fail the build if psychology, path, friction, or trust notes are missing from ${COLLAB_NOTEBOOK}.`,
      ["qa", "research"],
      3,
    ),
  ];
}

export function taskIsEngagementCollab(title: string): boolean {
  return /engagement collab/i.test(title);
}

export function engagementCollabPhaseFromTitle(
  title: string,
): EngagementCollabPhase | null {
  const lower = title.toLowerCase();
  if (!taskIsEngagementCollab(title)) return null;
  if (lower.includes("psychology") || lower.includes("offer")) {
    return "psychology";
  }
  if (lower.includes("desire path") || lower.includes("desire-path")) {
    return "desire-path";
  }
  if (lower.includes("friction")) return "friction";
  if (lower.includes("trust") || lower.includes("findability")) return "trust";
  if (lower.includes("sign-off") || lower.includes("qa")) return "sign-off";
  return null;
}

/** True when the project already has the engagement collab chain queued or done. */
export function projectHasEngagementCollab(tasks: Array<{ title: string }>): boolean {
  return tasks.some((task) => taskIsEngagementCollab(task.title));
}

export function engagementCollabNotebookPath(): string {
  return COLLAB_NOTEBOOK;
}

/** Section body each specialist appends — the shared “conversation.” */
export function engagementCollabSectionMarkdown(input: {
  phase: EngagementCollabPhase;
  agentName: string;
  taskTitle: string;
  taskDetail: string;
  projectName: string;
  brief: string;
  status: "building" | "ready";
}): string {
  const prompts: Record<EngagementCollabPhase, string[]> = {
    psychology: [
      `- Visitor fear: (what they worry happens if they wait)`,
      `- Visitor desire: (the outcome they want for ${input.projectName})`,
      `- Primary ask: call | book | order | buy — pick one`,
      `- Proof that makes the ask safe:`,
    ],
    "desire-path": [
      `- Hero hierarchy: brand → outcome → CTA`,
      `- Proof placement before the ask:`,
      `- Competing clutter removed:`,
    ],
    friction: [
      `- Mobile path length (hero → convert):`,
      `- Form fields kept / cut:`,
      `- CTA targets wired to:`,
    ],
    trust: [
      `- Service area / hours cue:`,
      `- Review or social proof cue:`,
      `- Title/meta intent match:`,
    ],
    "sign-off": [
      `- 375px: found offer and CTA in <60s? yes/no`,
      `- 1280px: found offer and CTA in <60s? yes/no`,
      `- Blockers (if any):`,
      `- Extraordinary bar met (better together than alone)? yes/no`,
    ],
  };

  return `## ${input.phase} — ${input.agentName}

**Task:** ${input.taskTitle}
**Status:** ${input.status}

### Brief reminder

${input.brief.slice(0, 400) || "(brief pending)"}

### Collaboration notes

${prompts[input.phase].join("\n")}

### From the task

${input.taskDetail.slice(0, 500)}

`;
}
