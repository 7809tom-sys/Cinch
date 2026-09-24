"use server";

import { revalidatePath } from "next/cache";
import { acceptDriverRun, advanceDriverRun } from "@/lib/seed-delivery";
import {
  ensureDeliveryOpsInSeed,
  saveDeliveryOps,
} from "@/lib/seed-delivery-io";
import { getProject } from "@/lib/store";

export async function acceptDriverRunAction(
  projectId: string,
  runId: string,
  driverId: string,
) {
  const project = await getProject(projectId);
  if (!project) return { ok: false as const, error: "Seed not found." };
  const ops = await ensureDeliveryOpsInSeed(project);
  if (!ops) return { ok: false as const, error: "Driver app is not on this Seed." };

  const result = acceptDriverRun(ops, runId, driverId);
  if (!result.ok) return result;

  await saveDeliveryOps(projectId, result.ops, "Driver accepted a run");
  revalidatePath(`/site/${projectId}/drive`);
  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}

export async function advanceDriverRunAction(
  projectId: string,
  runId: string,
  driverId: string,
  next: "picked_up" | "delivered",
) {
  const project = await getProject(projectId);
  if (!project) return { ok: false as const, error: "Seed not found." };
  const ops = await ensureDeliveryOpsInSeed(project);
  if (!ops) return { ok: false as const, error: "Driver app is not on this Seed." };

  const result = advanceDriverRun(ops, runId, driverId, next);
  if (!result.ok) return result;

  await saveDeliveryOps(
    projectId,
    result.ops,
    next === "picked_up" ? "Driver picked up" : "Driver delivered",
  );
  revalidatePath(`/site/${projectId}/drive`);
  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}
