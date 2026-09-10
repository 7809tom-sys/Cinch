/**
 * Talk to a Seed on its dialog page. The Seed answers about THIS host.
 * Just Putz It: propose in-place dating/activity updates. Do not rebuild.
 */
import { getProjectManager } from "./agents";
import { planInPlaceImprovements } from "./connect-improvements";
import {
  listMessagesForSeed,
  seedDialogCustomerId,
  sendMessage,
  type Message,
} from "./messages";
import {
  JUST_PUTZIT_LIVE,
  LIVE_UPDATE_REQUIRES_APPROVAL,
} from "./seed-connect";
import { getProject } from "./store";

export const SEED_DIALOG_RULE =
  "Talk to the Seed on its dialog page. The Seed answers about this live host. Just Putz It: propose in-place dating and activity updates. Do not rebuild. No final update without owner approval.";

export function seedDialogUrl(projectId: string): string {
  return `/admin/projects/${projectId}/dialog`;
}

export function portalSeedDialogUrl(projectId: string): string {
  return `/portal/${projectId}/dialog`;
}

export function seedAsksToImprove(text: string): boolean {
  return /\b(improv(?:e|ing|ement)?|update the site|how (?:do|can|should) (?:we|i|you)|grow(?:th)?|what(?:'s| is) next|propos(?:e|al)|make (?:it|the site) better)\b/i.test(
    text,
  );
}

export function composeSeedReply(input: {
  name: string;
  brief?: string | null;
  seedMode?: string | null;
  liveUrl?: string | null;
  githubRepoUrl?: string | null;
  incoming: string;
}): string {
  const pm = getProjectManager();
  const host = input.liveUrl?.trim() || "the live host";
  const plan = planInPlaceImprovements({
    name: input.name,
    brief: input.brief,
    liveUrl: input.liveUrl,
    githubRepoUrl: input.githubRepoUrl,
  });
  const connect = input.seedMode === "connect" || host === JUST_PUTZIT_LIVE;

  if (seedAsksToImprove(input.incoming)) {
    const lines = plan.improvements
      .map((item, index) => `${index + 1}. ${item.title} — ${item.why}`)
      .join("\n");
    return [
      `Hi — ${pm.name} on Seed “${input.name}”. You asked how to improve the site.`,
      plan.headline + ".",
      connect
        ? `We look at and administer ${host} in place. We do not rebuild it or invent a Cinch copy.`
        : `We grow this Seed in place.`,
      "",
      lines,
      "",
      LIVE_UPDATE_REQUIRES_APPROVAL,
    ].join("\n");
  }

  return [
    `Hi — ${pm.name} here. This is the dialog for Seed “${input.name}”.`,
    connect
      ? `Ask anything about ${host}. I will propose in-place updates only — no rebuild.`
      : `Ask anything about this Seed and I will answer on this thread.`,
    "Try: how do we improve the site?",
    LIVE_UPDATE_REQUIRES_APPROVAL,
  ].join(" ");
}

export async function sendSeedDialogTurn(input: {
  projectId: string;
  customerId?: string | null;
  sender: "customer" | "admin";
  body: string;
}): Promise<{ ok: true; messages: Message[] } | { ok: false; error: string }> {
  const project = await getProject(input.projectId);
  if (!project) return { ok: false, error: "Seed not found." };

  const customerId =
    input.customerId?.trim() || seedDialogCustomerId(project.id);
  const incoming = input.body.trim();
  if (!incoming) return { ok: false, error: "Message can't be empty." };

  await sendMessage({
    customerId,
    projectId: project.id,
    sender: input.sender,
    body: incoming,
  });

  const reply = composeSeedReply({
    name: project.name,
    brief: project.brief,
    seedMode: project.seedMode,
    liveUrl: project.referenceUrl,
    githubRepoUrl: project.githubRepoUrl,
    incoming,
  });

  await sendMessage({
    customerId,
    projectId: project.id,
    sender: "admin",
    body: reply,
  });

  return { ok: true, messages: await listMessagesForSeed(project.id) };
}
