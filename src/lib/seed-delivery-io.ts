import {
  DELIVERY_OPS_PATH,
  deliveryOpsJson,
  parseDeliveryOps,
  starterDeliveryOps,
  type DeliveryOps,
} from "./seed-delivery";
import { briefIsDeliveryPlatform, seedPublicSiteCss } from "./seed-site-copy";
import { getSourceBundle, upsertSourceFile } from "./seed-source";
import type { SeedProject } from "./store";

export function seedNeedsDeliveryOps(
  projectName: string,
  brief: string,
): boolean {
  return briefIsDeliveryPlatform(projectName, brief);
}

export async function saveDeliveryOps(
  projectId: string,
  ops: DeliveryOps,
  message = "Updated Hometown Runner ledger",
): Promise<void> {
  await upsertSourceFile({
    projectId,
    path: DELIVERY_OPS_PATH,
    content: deliveryOpsJson(ops),
    status: "ready",
    message,
    agentName: "Hometown Runner",
  });
}

export async function ensureDeliveryOpsInSeed(
  project: SeedProject,
): Promise<DeliveryOps | null> {
  if (!seedNeedsDeliveryOps(project.name, project.brief)) return null;

  const bundle = await getSourceBundle(project.id);
  const raw =
    bundle?.files.find((file) => file.path === DELIVERY_OPS_PATH)?.content ??
    "";
  const css =
    bundle?.files.find((file) => file.path === "app/globals.css")?.content ??
    "";
  if (!css.includes("seed-run")) {
    await upsertSourceFile({
      projectId: project.id,
      path: "app/globals.css",
      content: seedPublicSiteCss(),
      status: "ready",
      message: "Grew Hometown Runner app styles into the Seed",
      agentName: "Conductor",
    });
  }

  const existing = parseDeliveryOps(raw);
  if (existing) return existing;

  const ops = starterDeliveryOps(project.name);
  await saveDeliveryOps(
    project.id,
    ops,
    "Grew Hometown Runner merchant, driver, and ledger into the Seed",
  );
  return ops;
}
