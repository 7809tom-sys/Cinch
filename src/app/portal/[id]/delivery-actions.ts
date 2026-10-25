"use server";

import { revalidatePath } from "next/cache";
import {
  connectRestaurantWebsite,
  downloadPublicMenuPhoto,
  fetchRestaurantMenuPage,
  isStoredMenuPhotoUrl,
  syncRestaurantMenuFromWebsite,
} from "@/lib/hometown-menu-crawler";
import {
  applyCrawledRestaurantProfile,
  parseRestaurantProfile,
  type RestaurantProfileDraft,
} from "@/lib/hometown-restaurant-profile";
import { hometownMenuPhotoSaver } from "@/lib/seed-delivery-io";
import { publishOwnerKitchen } from "@/lib/hometown-kitchen-access";
import {
  kitchenProfileGapMessage,
  kitchenProfileGaps,
} from "@/lib/kitchen-profile-gaps";
import {
  requireDriverActor,
  requireKitchenWrite,
  requireMenuIngest,
} from "@/lib/hometown-kitchen-session";
import {
  acceptDriverRun,
  advanceDriverArrived,
  advanceDriverRun,
  approveMenuDraft,
  assignRestaurantScout,
  confirmRestaurantMenuPrice,
  flagDinerIssue,
  inferredMenuUploadKind,
  ingestMenuPhotos,
  menuUploadFileNames,
  rateDinerOrder,
  reviewRestaurantMenuItem,
  setMenuItemEightySixed,
  toggleFavoriteKitchen,
  uploadRestaurantMenuItem,
  validatePaperMenuUpload,
  setDriverOnline,
  setMerchantTicketStatus,
  setRestaurantPaused,
  type DeliveryOps,
  type DropoffInstruction,
  type GeoPoint,
  type MenuModifierGroup,
  type MenuUploadInput,
  type MerchantTicketStatus,
} from "@/lib/seed-delivery";
import { kitchenFacingVisionError } from "@/lib/menu-vision-copy";
import { parsePaperMenuWithVision } from "@/lib/menu-vision";
import {
  extractMenuDocument,
  planUploadedMenuPhotos,
  type ExtractedMenuImage,
} from "@/lib/menu-document-extract";
import type { MenuPhotoFlag, ParsedMenuJson } from "@/lib/seed-delivery";
import { isDurableStoreConfigured } from "@/lib/kv-store";
import {
  commitWebsiteMenuSync,
  ensureDeliveryOpsInSeed,
  saveDeliveryOps as persistDeliveryOps,
} from "@/lib/seed-delivery-io";
import { getProject } from "@/lib/store";

function revalidateDelivery(projectId: string) {
  revalidatePath(`/portal/${projectId}/restaurant`);
  revalidatePath(`/portal/${projectId}/drive`);
  revalidatePath(`/portal/${projectId}`);
  revalidatePath(`/site/${projectId}/merchant`);
  revalidatePath(`/site/${projectId}/drive`);
  revalidatePath(`/site/${projectId}/admin`);
  revalidatePath(`/site/${projectId}/shop`);
}

async function loadOps(projectId: string) {
  const project = await getProject(projectId);
  if (!project) return { ok: false as const, error: "Seed not found." };
  const ops = await ensureDeliveryOpsInSeed(project);
  if (!ops) {
    return { ok: false as const, error: "Hometown portals are not on this Seed." };
  }
  return { ok: true as const, ops };
}

async function saveDeliveryOps(
  projectId: string,
  ops: DeliveryOps,
  message: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const result = await persistDeliveryOps(projectId, ops, message);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error?.trim() || "Could not save this kitchen.",
      };
    }
    if (result.error && !result.durable && isDurableStoreConfigured()) {
      return { ok: false, error: result.error };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not save this kitchen.",
    };
  }
}

async function storeExtractedMenuImages(
  projectId: string,
  restaurantId: string,
  parsed: ParsedMenuJson,
  matched: { itemName: string; image: ExtractedMenuImage }[],
  flagged: { image: ExtractedMenuImage; reason: MenuPhotoFlag["reason"] }[],
): Promise<{ parsed: ParsedMenuJson; photoReview: MenuPhotoFlag[] }> {
  const store = hometownMenuPhotoSaver(projectId);
  const photoByName = new Map<string, string>();
  for (const row of matched) {
    const stored = await store({
      itemId: `upload-${restaurantId}-${row.itemName}`,
      bytes: row.image.bytes,
      mime: row.image.mime,
    });
    if (stored) photoByName.set(row.itemName, stored);
  }
  const photoReview: MenuPhotoFlag[] = [];
  for (const row of flagged) {
    const stored = await store({
      itemId: `upload-review-${restaurantId}-${row.image.name}`,
      bytes: row.image.bytes,
      mime: row.image.mime,
    });
    photoReview.push({
      sourceUrl: row.image.name,
      reason: row.reason,
      ...(stored ? { storedUrl: stored } : {}),
    });
  }
  return {
    parsed: {
      items: parsed.items.map((item) => {
        const photoUrl = photoByName.get(item.item_name);
        return photoUrl ? { ...item, photoUrl } : item;
      }),
    },
    photoReview,
  };
}

async function pricedMenuFromPdf(input: MenuUploadInput) {
  return extractMenuDocument(input);
}

export async function uploadRestaurantMenuItemAction(
  projectId: string,
  restaurantId: string,
  input: {
    title: string;
    category?: string;
    priceUsd: number;
    description?: string;
    aliases?: string;
    modifierText?: string;
    modifiers?: MenuModifierGroup[];
  },
) {
  const loaded = await requireKitchenWrite(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Name the plate." };
  const saved = await saveDeliveryOps(
    projectId,
    uploadRestaurantMenuItem(loaded.ops, restaurantId, {
      title,
      category: input.category,
      priceUsd: input.priceUsd,
      description: input.description,
      aliases: (input.aliases ?? "")
        .split(",")
        .map((word) => word.trim())
        .filter(Boolean),
      modifierText: input.modifierText,
      modifiers: input.modifiers,
    }),
    "Merchant uploaded a menu item",
  );
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}

export async function confirmRestaurantMenuPriceAction(
  projectId: string,
  restaurantId: string,
  itemId: string,
  priceUsd: number,
  review?: { modifierText?: string },
) {
  const loaded = await requireKitchenWrite(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const reviewed =
    review?.modifierText !== undefined
      ? reviewRestaurantMenuItem(loaded.ops, restaurantId, itemId, {
          draftPriceUsd: priceUsd,
          modifierText: review.modifierText,
        })
      : loaded.ops;
  const saved = await saveDeliveryOps(
    projectId,
    confirmRestaurantMenuPrice(reviewed, restaurantId, itemId, priceUsd),
    "Merchant confirmed a crawled menu price",
  );
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}

export async function ingestMenuPhotosAction(
  projectId: string,
  restaurantId: string,
  input: MenuUploadInput = {},
) {
  const loaded = await requireMenuIngest(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const checked = validatePaperMenuUpload(input);
  if (!checked.ok) return checked;

  const fileNames = menuUploadFileNames(input);
  let nextInput: MenuUploadInput = {
    ...input,
    fileNames,
    kind: inferredMenuUploadKind(input),
  };
  const restaurant = loaded.ops.restaurants.find((row) => row.id === restaurantId);
  const canVision =
    !nextInput.useFixture &&
    !nextInput.parsed &&
    !nextInput.rawJson?.trim() &&
    (nextInput.attachments ?? []).some((file) => file.dataBase64?.trim());

  if (canVision) {
    const vision = await parsePaperMenuWithVision(nextInput.attachments ?? []);
    if (vision.ok && vision.parsed.items.length > 0) {
      const photos = planUploadedMenuPhotos(nextInput, vision.parsed.items);
      const stored = await storeExtractedMenuImages(
        projectId,
        restaurantId,
        vision.parsed,
        photos.matched,
        photos.flagged,
      );
      nextInput = {
        ...nextInput,
        parsed: stored.parsed,
        photoReview: stored.photoReview,
        useFixture: false,
        parseNote: `Vision parse (${vision.model}) from ${fileNames.join(", ")}. Review prices and modifiers, then Approve.`,
      };
    } else {
      const fromPdf = await pricedMenuFromPdf(nextInput);
      if (!fromPdf) {
        return {
          ok: false as const,
          error: kitchenFacingVisionError(
            vision.ok ? "Vision returned no plates." : vision.error,
          ),
        };
      }
      const stored = await storeExtractedMenuImages(
        projectId,
        restaurantId,
        fromPdf.parsed,
        fromPdf.matched,
        fromPdf.flagged,
      );
      nextInput = {
        ...nextInput,
        parsed: stored.parsed,
        photoReview: stored.photoReview,
        useFixture: false,
        parseNote: `Read ${fileNames.join(", ")} from the PDF text. Review prices, then Approve.`,
      };
    }
  } else if (!nextInput.parsed && !nextInput.rawJson?.trim() && !nextInput.useFixture) {
    const fromPdf = await pricedMenuFromPdf(nextInput);
    if (!fromPdf) {
      return {
        ok: false as const,
        error: kitchenFacingVisionError(
          "No Gemini or Claude vision key is wired.",
        ),
      };
    }
    const stored = await storeExtractedMenuImages(
      projectId,
      restaurantId,
      fromPdf.parsed,
      fromPdf.matched,
      fromPdf.flagged,
    );
    nextInput = {
      ...nextInput,
      parsed: stored.parsed,
      photoReview: stored.photoReview,
      useFixture: false,
      parseNote: `Read ${fileNames.join(", ")} from the PDF text. Review prices, then Approve.`,
    };
  } else if (restaurant?.ownerEmail?.trim() && nextInput.useFixture && !nextInput.parsed) {
    return {
      ok: false as const,
      error: "That upload was not read. Nothing was added to your menu.",
    };
  }

  const saved = await saveDeliveryOps(
    projectId,
    ingestMenuPhotos(loaded.ops, restaurantId, nextInput),
    "Scout or merchant ingested a paper-menu draft",
  );
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}

export async function reviewRestaurantMenuItemAction(
  projectId: string,
  restaurantId: string,
  itemId: string,
  patch: {
    title?: string;
    description?: string;
    draftPriceUsd?: number;
    modifierText?: string;
    modifiers?: MenuModifierGroup[];
  },
) {
  const loaded = await requireKitchenWrite(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const saved = await saveDeliveryOps(
    projectId,
    reviewRestaurantMenuItem(loaded.ops, restaurantId, itemId, patch),
    "Merchant reviewed a draft price or modifiers",
  );
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}

export async function approveMenuDraftAction(
  projectId: string,
  restaurantId: string,
) {
  const loaded = await requireKitchenWrite(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const restaurant = loaded.ops.restaurants.find((row) => row.id === restaurantId);
  if (restaurant?.ownerEmail?.trim()) {
    const gaps = kitchenProfileGaps(restaurant);
    if (gaps.length > 0) {
      return { ok: false as const, error: kitchenProfileGapMessage(gaps) };
    }
    if ((restaurant.menu?.items ?? []).length === 0) {
      return {
        ok: false as const,
        error: "Add at least one plate before approving the menu.",
      };
    }
  }
  const saved = await saveDeliveryOps(
    projectId,
    publishOwnerKitchen(approveMenuDraft(loaded.ops, restaurantId), restaurantId),
    "Scout or owner approved the menu draft",
  );
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}

export async function connectRestaurantWebsiteAction(
  projectId: string,
  restaurantId: string,
  websiteUrl: string,
  typed: RestaurantProfileDraft = { name: "", address: "", hours: "", phone: "" },
) {
  const loaded = await requireKitchenWrite(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const connected = connectRestaurantWebsite(
    loaded.ops,
    restaurantId,
    websiteUrl,
  );
  if ("error" in connected) return { ok: false as const, error: connected.error };
  const fetched = await fetchRestaurantMenuPage(websiteUrl);
  const profile = fetched.ok
    ? parseRestaurantProfile(fetched.html, fetched.finalUrl)
    : {};
  const synced = await syncRestaurantMenuFromWebsite({
    ops: connected,
    restaurantId,
    force: true,
    followLinks: true,
    html: fetched.ok ? fetched.html : undefined,
  });
  const current = synced.ops.restaurants.find((row) => row.id === restaurantId);
  const applied = current
    ? applyCrawledRestaurantProfile(current, profile, typed)
    : null;
  let filled = applied?.filled ?? [];
  let nextRestaurant = applied?.restaurant;
  if (nextRestaurant && applied?.headerSourceUrl && !nextRestaurant.coverImageUrl) {
    const photo = await downloadPublicMenuPhoto(
      applied.headerSourceUrl,
      undefined,
      { minBytes: 400, allowLogo: true },
    );
    const stored = photo
      ? await hometownMenuPhotoSaver(projectId)({
          itemId: `cover-${restaurantId}`,
          bytes: photo.bytes,
          mime: photo.mime,
        })
      : null;
    if (stored && isStoredMenuPhotoUrl(stored)) {
      nextRestaurant = { ...nextRestaurant, coverImageUrl: stored };
    } else {
      filled = filled.filter((label) => label !== "header image");
    }
  }
  const profileOps = nextRestaurant
    ? {
        ...synced.ops,
        restaurants: synced.ops.restaurants.map((row) =>
          row.id === restaurantId ? nextRestaurant! : row,
        ),
      }
    : synced.ops;
  const committed = await commitWebsiteMenuSync({
    projectId,
    restaurantId,
    ops: profileOps,
    crawled: synced.crawled,
    message: filled.length
      ? `Website filled ${filled.join(", ")}`
      : synced.changed
        ? "Website crawl wrote live prices from the connected menu page"
        : "Kitchen connected a public menu page",
  });
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  const kept = applied?.kept ?? [];
  const notice = [
    filled.length ? `Filled from the website: ${filled.join(", ")}.` : "",
    kept.length ? `Kept what you typed: ${kept.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (synced.error && !synced.changed && filled.length === 0) {
    return { ok: false as const, error: synced.error };
  }
  if (committed.storeError && filled.length === 0) {
    return { ok: false as const, error: committed.storeError };
  }
  return {
    ok: true as const,
    notice:
      notice ||
      (synced.error
        ? "Menu link saved. Hometown did not find dishes on that page."
        : "Menu link saved."),
  };
}

export async function syncRestaurantMenuFromWebsiteAction(
  projectId: string,
  restaurantId: string,
) {
  const loaded = await requireKitchenWrite(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const synced = await syncRestaurantMenuFromWebsite({
    ops: loaded.ops,
    restaurantId,
    force: true,
  });
  const committed =
    synced.changed || synced.ops !== loaded.ops
      ? await commitWebsiteMenuSync({
          projectId,
          restaurantId,
          ops: synced.ops,
          crawled: synced.crawled,
          message: synced.changed
            ? "Website crawl updated live menu prices"
            : "Website crawl checked the connected menu page",
        })
      : { ops: synced.ops, storeError: null as string | null };
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  if (synced.error && !synced.changed) {
    return { ok: false as const, error: synced.error };
  }
  if (committed.storeError) {
    return { ok: false as const, error: committed.storeError };
  }
  return { ok: true as const };
}

export async function setMenuItemEightySixedAction(
  projectId: string,
  restaurantId: string,
  itemId: string,
  eightySixed: boolean,
) {
  const loaded = await requireKitchenWrite(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const saved = await saveDeliveryOps(
    projectId,
    setMenuItemEightySixed(loaded.ops, restaurantId, itemId, eightySixed),
    eightySixed
      ? "Merchant 86'd a plate during service"
      : "Merchant restored a plate",
  );
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}

export async function assignRestaurantScoutAction(
  projectId: string,
  restaurantId: string,
  driverId: string,
) {
  const loaded = await requireDriverActor(projectId);
  if (!loaded.ok) return loaded;
  const restaurant = loaded.ops.restaurants.find((row) => row.id === restaurantId);
  if (restaurant?.ownerEmail?.trim() && loaded.actor?.scope === "driver") {
    return { ok: false as const, error: "That kitchen isn't on this account." };
  }
  const result = assignRestaurantScout(loaded.ops, restaurantId, driverId);
  if (!result.ok) return result;
  const saved = await saveDeliveryOps(
    projectId,
    result.ops,
    "Scout signed an unsigned kitchen",
  );
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  return { ok: true as const };
}

export async function setRestaurantPausedAction(
  projectId: string,
  restaurantId: string,
  paused: boolean,
) {
  const loaded = await requireKitchenWrite(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const saved = await saveDeliveryOps(
    projectId,
    setRestaurantPaused(loaded.ops, restaurantId, paused),
    paused ? "Restaurant paused incoming orders" : "Restaurant is open",
  );
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  return { ok: true as const };
}

export async function setMerchantTicketStatusAction(
  projectId: string,
  ticketId: string,
  status: MerchantTicketStatus,
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  const ticket = loaded.ops.tickets.find((row) => row.id === ticketId);
  if (!ticket) return { ok: false as const, error: "Order not found." };
  const allowed = await requireKitchenWrite(projectId, ticket.restaurantId);
  if (!allowed.ok) return allowed;
  const saved = await saveDeliveryOps(
    projectId,
    setMerchantTicketStatus(allowed.ops, ticketId, status),
    `Restaurant marked order ${status}`,
  );
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  return { ok: true as const };
}

export async function setDriverOnlineAction(
  projectId: string,
  driverId: string,
  online: boolean,
) {
  const loaded = await requireDriverActor(projectId);
  if (!loaded.ok) return loaded;
  const saved = await saveDeliveryOps(
    projectId,
    setDriverOnline(loaded.ops, driverId, online),
    online ? "Driver went online" : "Driver went offline",
  );
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  return { ok: true as const };
}

export async function acceptDriverRunAction(
  projectId: string,
  runId: string,
  driverId: string,
) {
  const loaded = await requireDriverActor(projectId);
  if (!loaded.ok) return loaded;
  const result = acceptDriverRun(loaded.ops, runId, driverId);
  if (!result.ok) return result;
  const saved = await saveDeliveryOps(projectId, result.ops, "Driver accepted an offer");
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  return { ok: true as const };
}

export async function advanceDriverArrivedAction(
  projectId: string,
  runId: string,
  driverId: string,
  location: GeoPoint,
) {
  const loaded = await requireDriverActor(projectId);
  if (!loaded.ok) return loaded;
  const result = advanceDriverArrived(loaded.ops, runId, driverId, location);
  if (!result.ok) return result;
  const saved = await saveDeliveryOps(
    projectId,
    result.ops,
    "Driver arrived — kitchen stages the bag",
  );
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  return { ok: true as const };
}

export async function toggleFavoriteKitchenAction(
  projectId: string,
  restaurantId: string,
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  const saved = await saveDeliveryOps(
    projectId,
    toggleFavoriteKitchen(loaded.ops, restaurantId),
    "Diner toggled a favorite kitchen",
  );
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}

export async function flagDinerIssueAction(
  projectId: string,
  orderId: string,
  input: { itemTitle: string; note?: string },
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  const result = flagDinerIssue(loaded.ops, orderId, input);
  if (!result.ok) return result;
  const saved = await saveDeliveryOps(projectId, result.ops, "Diner flagged a missing item");
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}

export async function rateDinerOrderAction(
  projectId: string,
  orderId: string,
  input: { foodStars: number; dropStars?: number; note?: string },
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  const result = rateDinerOrder(loaded.ops, orderId, input);
  if (!result.ok) return result;
  const saved = await saveDeliveryOps(projectId, result.ops, "Diner rated a bag");
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}

export async function advanceDriverRunAction(
  projectId: string,
  runId: string,
  driverId: string,
  next: "picked_up" | "delivered",
  location?: GeoPoint | null,
  dropoff?: {
    instruction?: DropoffInstruction;
    photoNote?: string | null;
  } | null,
) {
  const loaded = await requireDriverActor(projectId);
  if (!loaded.ok) return loaded;
  const result = advanceDriverRun(
    loaded.ops,
    runId,
    driverId,
    next,
    location,
    dropoff,
  );
  if (!result.ok) return result;
  const saved = await saveDeliveryOps(
    projectId,
    result.ops,
    next === "picked_up" ? "Driver confirmed pickup" : "Driver completed drop-off",
  );
  if (!saved.ok) return saved;
  revalidateDelivery(projectId);
  return { ok: true as const };
}
