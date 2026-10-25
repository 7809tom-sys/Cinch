import {
  storeCrawledMenuPhotos,
  tickHometownMenuCrawls,
  type CrawledMenuItem,
  type MenuPhotoStore,
} from "./hometown-menu-crawler";
import {
  lastJsonStoreWriteResult,
  menuStoreFailureMessage,
  type JsonStoreWriteResult,
} from "./kv-store";
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
): Promise<JsonStoreWriteResult> {
  await upsertSourceFile({
    projectId,
    path: DELIVERY_OPS_PATH,
    content: deliveryOpsJson(ops),
    status: "ready",
    message,
    agentName: "Hometown Runner",
  });
  return (
    lastJsonStoreWriteResult() ?? {
      ok: false,
      durable: false,
      error: "The menu store write did not report a result.",
    }
  );
}

function opsWithStoreError(
  ops: DeliveryOps,
  restaurantId: string,
  message: string,
): DeliveryOps {
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) =>
      row.id === restaurantId ? { ...row, lastCrawlError: message } : row,
    ),
  };
}

/**
 * Save the crawled menu text first, then photos. A photo payload that Redis
 * rejects must not be the only copy of the dish list.
 */
export async function commitWebsiteMenuSync(input: {
  projectId: string;
  restaurantId: string;
  ops: DeliveryOps;
  crawled: CrawledMenuItem[];
  message: string;
}): Promise<{ ops: DeliveryOps; storeError: string | null }> {
  const saved = await saveDeliveryOps(input.projectId, input.ops, input.message);
  const textFailure = menuStoreFailureMessage(saved);
  if (textFailure) {
    const stamped = opsWithStoreError(input.ops, input.restaurantId, textFailure);
    await saveDeliveryOps(
      input.projectId,
      stamped,
      "Menu crawl could not be stored durably",
    );
    return { ops: stamped, storeError: textFailure };
  }

  if (input.crawled.length === 0) return { ops: input.ops, storeError: null };
  const restaurant = input.ops.restaurants.find(
    (row) => row.id === input.restaurantId,
  );
  if (!restaurant) return { ops: input.ops, storeError: null };

  const withPhotos = await storeCrawledMenuPhotos({
    restaurant,
    crawled: input.crawled,
    storePhoto: hometownMenuPhotoSaver(input.projectId),
  });
  const photographed: DeliveryOps = {
    ...input.ops,
    restaurants: input.ops.restaurants.map((row) =>
      row.id === restaurant.id ? withPhotos : row,
    ),
  };
  const photoSaved = await saveDeliveryOps(
    input.projectId,
    photographed,
    "Website crawl stored dish photos in the Seed",
  );
  const photoFailure = menuStoreFailureMessage(photoSaved);
  if (photoFailure) {
    const stamped = opsWithStoreError(
      input.ops,
      input.restaurantId,
      `The dishes are saved. Photos did not fit in this server's store, so they may be missing after a refresh. ${photoFailure}`,
    );
    await saveDeliveryOps(
      input.projectId,
      stamped,
      "Menu text kept; dish photos were not stored",
    );
    return { ops: stamped, storeError: stamped.restaurants.find((row) => row.id === input.restaurantId)?.lastCrawlError ?? photoFailure };
  }
  return { ops: photographed, storeError: null };
}

/**
 * A menu crawl holds one snapshot, then fetches pages. Driver sign-up and
 * document saves land in that window. Keep those rows from the latest copy
 * and take restaurant menu fields from the crawl.
 */
export function rebaseCrawlOntoLatest(
  latest: DeliveryOps,
  crawled: DeliveryOps,
): DeliveryOps {
  const crawledById = new Map(
    crawled.restaurants.map((row) => [row.id, row]),
  );
  const seen = new Set<string>();
  const restaurants = latest.restaurants.map((row) => {
    seen.add(row.id);
    return crawledById.get(row.id) ?? row;
  });
  for (const row of crawled.restaurants) {
    if (!seen.has(row.id)) restaurants.push(row);
  }
  return { ...latest, restaurants };
}

export async function ensureDeliveryOpsInSeed(
  project: SeedProject,
  options?: { crawl?: boolean },
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
    if (options?.crawl === false) return ops;
    try {
      const ticked = await tickHometownMenuCrawls({
        ops,
        storePhoto: hometownMenuPhotoSaver(project.id),
      });
      if (ticked.changed || ticked.ops !== ops) {
        const freshBundle = await getSourceBundle(project.id);
        const freshRaw =
          freshBundle?.files.find((file) => file.path === DELIVERY_OPS_PATH)
            ?.content ?? "";
        const fresh = parseDeliveryOps(freshRaw);
        const merged = fresh
          ? rebaseCrawlOntoLatest(applyDriverSubscriptionPolicies(fresh), ticked.ops)
          : ticked.ops;
        await saveDeliveryOps(
          project.id,
          merged,
          ticked.changed
            ? "Website crawl updated live menu prices"
            : "Website crawl checked the connected menu page",
        );
        return merged;
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
