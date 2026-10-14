/**
 * Talk to a Seed on its dialog page. The Seed answers about THIS host.
 * Just Putz It is not a Cinch Seed — refuse pretend updates.
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
  JUST_PUTZIT_NOT_ON_SEED,
  LIVE_UPDATE_REQUIRES_APPROVAL,
  isJustPutzItSeedProject,
} from "./seed-connect";
import { extractGoogleDriveFileIds } from "./google-drive";
import { SENTI_DESK_PATH, seedAsksForPlaybook } from "./seed-playbook";
import { attachDriveShareLinkToProject } from "./seed-drive-refs";
import { getProject } from "./store";

export const SEED_DIALOG_RULE =
  "Talk to the Seed on its dialog page. The Seed answers about this live host. Just Putz It is not a Cinch Seed — do not spend AI time on pretend updates. Do not rebuild. No final update without owner approval.";

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

export type ReceivedSeedReference = {
  name: string;
  sourcePath: string | null;
  /** True when the document body was copied into the Seed. */
  bodySynced: boolean;
  error?: string | null;
};

/** What the Seed says after a dialog message includes a Drive/Docs link. */
export function formatSeedReferenceReceipt(
  references: ReceivedSeedReference[],
): string {
  if (references.length === 0) return "";
  const lines = references.map((ref) => {
    if (ref.error) {
      return `I saw “${ref.name}” but could not file it: ${ref.error}`;
    }
    const where = ref.sourcePath || "docs/references/";
    if (ref.bodySynced) {
      return `Received “${ref.name}”. The full text is filed at ${where}.`;
    }
    return `Received “${ref.name}” and filed the link at ${where}. The file is still private, so the body is not in this Seed yet. Connect Google Drive on this Seed, or share the file with that Google account, and I will pull the text.`;
  });
  const anyBody = references.some((ref) => ref.bodySynced && !ref.error);
  return [
    ...lines,
    anyBody
      ? "Open the Seed desk to keep, drop, or rewrite those lines, then build. No live update on another host until you approve."
      : "No live update on another host until you approve.",
  ].join("\n");
}

export function composeSeedReply(input: {
  name: string;
  brief?: string | null;
  seedMode?: string | null;
  liveUrl?: string | null;
  githubRepoUrl?: string | null;
  incoming: string;
  receivedReferences?: ReceivedSeedReference[] | null;
}): string {
  const pm = getProjectManager();
  if (
    isJustPutzItSeedProject({
      name: input.name,
      liveUrl: input.liveUrl,
      githubRepoUrl: input.githubRepoUrl,
    })
  ) {
    return JUST_PUTZIT_NOT_ON_SEED;
  }
  const host = input.liveUrl?.trim() || "the live host";
  const plan = planInPlaceImprovements({
    name: input.name,
    brief: input.brief,
    liveUrl: input.liveUrl,
    githubRepoUrl: input.githubRepoUrl,
  });
  const connect = input.seedMode === "connect";
  const receipt = formatSeedReferenceReceipt(input.receivedReferences ?? []);
  const withReceipt = (reply: string) =>
    receipt ? `${receipt}\n\n${reply}` : reply;

  if (seedAsksForPlaybook(input.incoming)) {
    return withReceipt(
      [
        `Hi — ${pm.name} on Seed “${input.name}”. You asked how we develop a project.`,
        "We do not add a suggestion file on cinchseed.com.",
        "Several specialists write chapter scripts on this Seed. Senti compiles them into one instruction pack you can print or send.",
        `Open the playbook: ${SENTI_DESK_PATH} (method) or this Seed’s pack on portal/admin.`,
        LIVE_UPDATE_REQUIRES_APPROVAL,
      ].join(" "),
    );
  }

  if (seedAsksToImprove(input.incoming)) {
    const lines = plan.improvements
      .map((item, index) => `${index + 1}. ${item.title} — ${item.why}`)
      .join("\n");
    return withReceipt(
      [
        `Hi — ${pm.name} on Seed “${input.name}”. You asked how to improve the site.`,
        plan.headline + ".",
        connect
          ? `We look at and administer ${host} in place. We do not rebuild it or invent a Cinch copy.`
          : `We grow this Seed in place.`,
        "",
        lines,
        "",
        LIVE_UPDATE_REQUIRES_APPROVAL,
      ].join("\n"),
    );
  }

  if (receipt && !seedAsksToImprove(input.incoming)) {
    return [
      `Hi — ${pm.name} on Seed “${input.name}”.`,
      receipt,
    ].join("\n");
  }

  return withReceipt(
    [
      `Hi — ${pm.name} here. This is the dialog for Seed “${input.name}”.`,
      connect
        ? `Ask anything about ${host}. I will propose in-place updates only — no rebuild.`
        : `Ask anything about this Seed and I will answer on this thread.`,
      "Paste a Google Doc link and I will file it on this Seed. Or ask: how do we improve the site?",
      LIVE_UPDATE_REQUIRES_APPROVAL,
    ].join(" "),
  );
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

  const receivedReferences = isJustPutzItSeedProject(project)
    ? []
    : await fileDialogDriveLinks({
        projectId: project.id,
        projectName: project.name,
        customerId,
        body: incoming,
      });

  const reply = composeSeedReply({
    name: project.name,
    brief: project.brief,
    seedMode: project.seedMode,
    liveUrl: project.referenceUrl,
    githubRepoUrl: project.githubRepoUrl,
    incoming,
    receivedReferences,
  });

  await sendMessage({
    customerId,
    projectId: project.id,
    sender: "admin",
    body: reply,
  });

  return { ok: true, messages: await listMessagesForSeed(project.id) };
}

/** Paste a Docs/Drive link in the dialog and the Seed files it under references. */
export async function fileDialogDriveLinks(input: {
  projectId: string;
  projectName: string;
  customerId: string;
  body: string;
}): Promise<ReceivedSeedReference[]> {
  const links = extractGoogleDriveFileIds(input.body);
  const received: ReceivedSeedReference[] = [];
  for (const link of links) {
    const result = await attachDriveShareLinkToProject({
      projectId: input.projectId,
      projectName: input.projectName,
      customerId: input.customerId,
      shareUrl: link.url,
    });
    if (!result.ok) {
      received.push({
        name: link.url,
        sourcePath: null,
        bodySynced: false,
        error: result.error,
      });
      continue;
    }
    received.push({
      name: result.reference.name,
      sourcePath: result.reference.sourcePath,
      bodySynced: Boolean(result.reference.excerpt?.trim()),
    });
  }
  return received;
}
