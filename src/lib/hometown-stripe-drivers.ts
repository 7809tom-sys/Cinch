import { DELIVERY_OPS_PATH, parseDeliveryOps } from "./seed-delivery";
import { seedNeedsDeliveryOps } from "./seed-delivery-io";
import { getSourceBundle, upsertSourceFile } from "./seed-source";
import { listProjects } from "./store";
import {
  linkSubscribers,
  patchDeliveryOpsDriverIdentity,
  type DriverCandidate,
  type DriverIdentityPatch,
  type DriverLink,
  type SubscriberRecord,
} from "./hometown-stripe";

export async function loadHometownDriverCandidates(): Promise<DriverCandidate[]> {
  const projects = await listProjects();
  const candidates: DriverCandidate[] = [];
  for (const project of projects) {
    if (!seedNeedsDeliveryOps(project.name, project.brief)) continue;
    const bundle = await getSourceBundle(project.id);
    const raw =
      bundle?.files.find((file) => file.path === DELIVERY_OPS_PATH)?.content ?? "";
    const ops = parseDeliveryOps(raw);
    if (!ops) continue;
    for (const driver of ops.drivers) {
      candidates.push({
        driverId: driver.id,
        driverName: driver.name,
        projectId: project.id,
        townName: project.name,
        email: driver.email?.trim().toLowerCase() || null,
        stripeCustomerId: driver.stripeCustomerId?.trim() || null,
      });
    }
  }
  return candidates;
}

export async function persistDriverStripeIdentities(
  patches: DriverIdentityPatch[],
): Promise<number> {
  const byProject = new Map<string, DriverIdentityPatch[]>();
  for (const patch of patches) {
    const list = byProject.get(patch.projectId) ?? [];
    list.push(patch);
    byProject.set(patch.projectId, list);
  }
  let writes = 0;
  for (const [projectId, list] of byProject) {
    const bundle = await getSourceBundle(projectId);
    const file = bundle?.files.find((item) => item.path === DELIVERY_OPS_PATH);
    if (!file?.content) continue;
    let next = file.content;
    for (const patch of list) {
      const patched = patchDeliveryOpsDriverIdentity(next, patch);
      if (patched) next = patched;
    }
    if (next === file.content) continue;
    await upsertSourceFile({
      projectId,
      path: DELIVERY_OPS_PATH,
      content: next,
      status: "ready",
      message: "Stored Stripe customer id on the driver account",
      agentName: "Hometown Runner",
    });
    writes += 1;
  }
  return writes;
}

export async function relinkHometownSubscribers(
  subscribers: SubscriberRecord[],
  storedLinks: DriverLink[],
): Promise<{ links: DriverLink[]; patches: DriverIdentityPatch[] }> {
  const drivers = await loadHometownDriverCandidates();
  const linked = linkSubscribers(subscribers, drivers, storedLinks);
  await persistDriverStripeIdentities(linked.patches);
  return linked;
}
