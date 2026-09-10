"use server";

import { revalidatePath } from "next/cache";
import { JUST_PUTZIT_CONNECT_SEED_ID } from "@/lib/seed-connect";
import { requestSeedSuggestion } from "@/lib/seed-suggestions";

export async function requestSeedSuggestionAction(input: {
  projectId?: string;
  improvementId?: string | null;
  title?: string;
  body?: string;
}) {
  const result = await requestSeedSuggestion(input);
  if (!result.ok) return result;

  const projectId = input.projectId?.trim() || JUST_PUTZIT_CONNECT_SEED_ID;
  revalidatePath("/suggestions");
  revalidatePath("/improve");
  revalidatePath("/dialog");
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/dialog`);
  revalidatePath(`/portal/${projectId}/dialog`);
  return result;
}
