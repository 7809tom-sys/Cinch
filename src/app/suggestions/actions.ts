"use server";

import { revalidatePath } from "next/cache";
import { JUST_PUTZIT_NOT_ON_SEED, isJustPutzItSeedProject } from "@/lib/seed-connect";
import { requestSeedSuggestion } from "@/lib/seed-suggestions";

export async function requestSeedSuggestionAction(input: {
  projectId?: string;
  improvementId?: string | null;
  title?: string;
  body?: string;
}) {
  if (isJustPutzItSeedProject({ id: input.projectId })) {
    return { ok: false as const, error: JUST_PUTZIT_NOT_ON_SEED };
  }
  const result = await requestSeedSuggestion(input);
  if (!result.ok) return result;

  const projectId = input.projectId?.trim();
  if (!projectId) {
    return { ok: false as const, error: JUST_PUTZIT_NOT_ON_SEED };
  }
  revalidatePath("/suggestions");
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/dialog`);
  revalidatePath(`/portal/${projectId}/dialog`);
  return result;
}
