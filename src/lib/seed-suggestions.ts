/**
 * Owner suggestions for a connected Seed.
 * Just Putz It: please-do buttons queue in-place dating/activity work.
 * Do not rebuild. No publish until the owner approves.
 */
import { planInPlaceImprovements } from "./connect-improvements";
import {
  JUST_PUTZIT_NOT_ON_SEED,
  isJustPutzItSeedProject,
} from "./seed-connect";
import { sendSeedDialogTurn } from "./seed-dialog";
import { getProject } from "./store";
import {
  listPendingImprovements,
  queueSiteImprovement,
} from "./seed-watch";

export const SEED_SUGGESTIONS_PATH = "/suggestions";

export function suggestionsForJustPutzIt() {
  return planInPlaceImprovements({
    name: "Just Putz It",
    brief:
      "Social activity and dating website. Meet locals for real dates and activities.",
    liveUrl: "https://example.com",
  });
}

export async function requestedSuggestionTitles(
  projectId: string,
): Promise<string[]> {
  if (isJustPutzItSeedProject({ id: projectId })) return [];
  const pending = await listPendingImprovements(projectId);
  return pending.map((item) => item.moduleTitle);
}

export async function requestSeedSuggestion(input: {
  projectId?: string;
  improvementId?: string | null;
  title?: string;
  body?: string;
}): Promise<
  | { ok: true; title: string; already: boolean }
  | { ok: false; error: string }
> {
  const projectId = input.projectId?.trim();
  if (!projectId || isJustPutzItSeedProject({ id: projectId })) {
    return { ok: false, error: JUST_PUTZIT_NOT_ON_SEED };
  }
  const plan = suggestionsForJustPutzIt();
  const catalog = plan.improvements.find(
    (item) => item.id === input.improvementId,
  );
  const title = (catalog?.title || input.title || "").trim();
  const body = (catalog?.liveChange || input.body || "").trim();
  if (!title || !body) {
    return { ok: false, error: "Write a suggestion first." };
  }

  const pending = await listPendingImprovements(projectId);
  const already = pending.some((item) => item.moduleTitle === title);
  if (!already) {
    await queueSiteImprovement({
      seedId: projectId,
      moduleTitle: title,
      growthAxis: catalog?.growthAxis ?? "functionality",
      kind: "note",
      payload: body,
      notes: "Owner asked: please do this. Queue only — no publish yet.",
    });
  }

  const project = await getProject(projectId);
  if (project) {
    await sendSeedDialogTurn({
      projectId,
      sender: "customer",
      body: `Please do this: ${title}. ${body}`,
    });
  }

  return { ok: true, title, already };
}

export const SUGGESTIONS_OWNER_NOTE = JUST_PUTZIT_NOT_ON_SEED;
