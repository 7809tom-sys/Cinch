import { resolveKitchenActor } from "./hometown-kitchen-session";
import { getHometownRoleSession, type HometownRoleSession } from "./hometown-role";
import type { KitchenActor } from "./hometown-kitchen-access";
import { ensureDeliveryOpsInSeed } from "./seed-delivery-io";
import type { DeliveryOps } from "./seed-delivery";
import { getProject } from "./store";

export type HometownLiveContext =
  | {
      ok: true;
      ops: DeliveryOps;
      session: HometownRoleSession | null;
      actor: KitchenActor | null;
    }
  | { ok: false; status: 404; error: string };

export async function loadHometownLiveContext(
  projectId: string,
): Promise<HometownLiveContext> {
  const project = await getProject(projectId);
  if (!project) return { ok: false, status: 404, error: "Town not found." };
  const ops = await ensureDeliveryOpsInSeed(project);
  if (!ops) {
    return {
      ok: false,
      status: 404,
      error: "Hometown portals are not on this Seed.",
    };
  }
  const [session, actor] = await Promise.all([
    getHometownRoleSession(projectId),
    resolveKitchenActor(projectId),
  ]);
  return { ok: true, ops, session, actor };
}
