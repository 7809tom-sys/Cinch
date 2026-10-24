import {
  tickHometownMenuCrawls,
  type MenuPhotoStore,
} from "./hometown-menu-crawler";
import { storeSeedProductPhoto } from "./seed-product-media";
import {
  DELIVERY_OPS_PATH,
  deliveryOpsJson,
  parseDeliveryOps,
  applyDriverSubscriptionPolicies,
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

export function hometownMenuPhotoSaver(projectId: string): MenuPhotoStore {
  return async ({ itemId, bytes, mime }) => {
    const stored = await storeSeedProductPhoto({
      projectId,
      productId: itemId,
      file: new Blob([Buffer.from(bytes)], { type: mime }),
      fileName: `${itemId}.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "jpg"}`,
    });
    if (!stored.ok) {
      console.error("[hometown-menu-crawler] could not store menu photo", {
        itemId,
        detail: stored.error,
      });
      return null;
    }
    if (!stored.url.startsWith("/site/")) {
      console.error("[hometown-menu-crawler] refused a photo that is not app storage", {
        itemId,
        url: stored.url,
      });
      return null;
    }
    return stored.url;
  };
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
  if (!css.includes("seed-run") || !css.includes("seed-run-party")) {
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
  if (existing) {
    const ops = applyDriverSubscriptionPolicies(existing);
    try {
      const ticked = await tickHometownMenuCrawls({
        ops,
        storePhoto: hometownMenuPhotoSaver(project.id),
      });
      if (ticked.changed || ticked.ops !== ops) {
        await saveDeliveryOps(
          project.id,
          ticked.ops,
          ticked.changed
            ? "Website crawl updated live menu prices"
            : "Website crawl checked the connected menu page",
        );
        return ticked.ops;
      }
    } catch (error) {
      console.error("[hometown-menu-crawler] background crawl failed", {
        detail: error instanceof Error ? error.message : "crawl",
      });
    }
    return ops;
  }

  const ops = starterDeliveryOps(project.name);
  await saveDeliveryOps(
    project.id,
    ops,
    "Grew Hometown Runner merchant, driver, and ledger into the Seed",
  );
  return ops;
}
