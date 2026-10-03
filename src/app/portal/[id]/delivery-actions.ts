"use server";

import { revalidatePath } from "next/cache";
import {
  connectRestaurantWebsite,
  syncRestaurantMenuFromWebsite,
} from "@/lib/hometown-menu-crawler";
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
  type DropoffInstruction,
  type GeoPoint,
  type MenuModifierGroup,
  type MenuUploadInput,
  type MerchantTicketStatus,
} from "@/lib/seed-delivery";
import { kitchenFacingVisionError } from "@/lib/menu-vision-copy";
import { parsePaperMenuWithVision } from "@/lib/menu-vision";
import {
  ensureDeliveryOpsInSeed,
  saveDeliveryOps,
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
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Name the plate." };
  await saveDeliveryOps(
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
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  const reviewed =
    review?.modifierText !== undefined
      ? reviewRestaurantMenuItem(loaded.ops, restaurantId, itemId, {
          draftPriceUsd: priceUsd,
          modifierText: review.modifierText,
        })
      : loaded.ops;
  await saveDeliveryOps(
    projectId,
    confirmRestaurantMenuPrice(reviewed, restaurantId, itemId, priceUsd),
    "Merchant confirmed a crawled menu price",
  );
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}

export async function ingestMenuPhotosAction(
  projectId: string,
  restaurantId: string,
  input: MenuUploadInput = {},
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  const checked = validatePaperMenuUpload(input);
  if (!checked.ok) return checked;

  const fileNames = menuUploadFileNames(input);
  let nextInput: MenuUploadInput = {
    ...input,
    fileNames,
    kind: inferredMenuUploadKind(input),
  };
  const canVision =
    !nextInput.useFixture &&
    !nextInput.parsed &&
    !nextInput.rawJson?.trim() &&
    (nextInput.attachments ?? []).some((file) => file.dataBase64?.trim());

  if (canVision) {
    const vision = await parsePaperMenuWithVision(nextInput.attachments ?? []);
    if (vision.ok) {
      nextInput = {
        ...nextInput,
        parsed: vision.parsed,
        parseNote: `Vision parse (${vision.model}) from ${fileNames.join(", ")}. Review prices and modifiers, then Approve.`,
      };
    } else {
      nextInput = {
        ...nextInput,
        useFixture: true,
        parseNote: kitchenFacingVisionError(vision.error),
      };
    }
  } else if (
    nextInput.useFixture ||
    (!nextInput.parsed && !nextInput.rawJson?.trim())
  ) {
    nextInput = {
      ...nextInput,
      useFixture: true,
      parseNote:
        nextInput.parseNote?.trim() ||
        (fileNames.length
          ? `Saved ${fileNames.join(", ")}. Seed parse writes a paper-menu fixture until a vision API key is wired. Review prices and modifiers, then Approve.`
          : "Seed paper-menu fixture ready for review."),
    };
  }

  await saveDeliveryOps(
    projectId,
    ingestMenuPhotos(loaded.ops, restaurantId, nextInput),
    "Scout or merchant ingested a paper-menu draft",
  );
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
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  await saveDeliveryOps(
    projectId,
    reviewRestaurantMenuItem(loaded.ops, restaurantId, itemId, patch),
    "Merchant reviewed a draft price or modifiers",
  );
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}

export async function approveMenuDraftAction(
  projectId: string,
  restaurantId: string,
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  await saveDeliveryOps(
    projectId,
    approveMenuDraft(loaded.ops, restaurantId),
    "Scout or owner approved the menu draft",
  );
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}

export async function connectRestaurantWebsiteAction(
  projectId: string,
  restaurantId: string,
  websiteUrl: string,
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  const connected = connectRestaurantWebsite(
    loaded.ops,
    restaurantId,
    websiteUrl,
  );
  if ("error" in connected) return { ok: false as const, error: connected.error };
  const synced = await syncRestaurantMenuFromWebsite({
    ops: connected,
    restaurantId,
    force: true,
  });
  await saveDeliveryOps(
    projectId,
    synced.ops,
    synced.changed
      ? "Website crawl wrote live prices from the connected menu page"
      : "Kitchen connected a public menu page",
  );
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  if (synced.error && !synced.changed) {
    return { ok: false as const, error: synced.error };
  }
  return { ok: true as const };
}

export async function syncRestaurantMenuFromWebsiteAction(
  projectId: string,
  restaurantId: string,
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  const synced = await syncRestaurantMenuFromWebsite({
    ops: loaded.ops,
    restaurantId,
    force: true,
  });
  if (synced.changed || synced.ops !== loaded.ops) {
    await saveDeliveryOps(
      projectId,
      synced.ops,
      synced.changed
        ? "Website crawl updated live menu prices"
        : "Website crawl checked the connected menu page",
    );
  }
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  if (synced.error && !synced.changed) {
    return { ok: false as const, error: synced.error };
  }
  return { ok: true as const };
}

export async function setMenuItemEightySixedAction(
  projectId: string,
  restaurantId: string,
  itemId: string,
  eightySixed: boolean,
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  await saveDeliveryOps(
    projectId,
    setMenuItemEightySixed(loaded.ops, restaurantId, itemId, eightySixed),
    eightySixed
      ? "Merchant 86'd a plate during service"
      : "Merchant restored a plate",
  );
  revalidateDelivery(projectId);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}

export async function assignRestaurantScoutAction(
  projectId: string,
  restaurantId: string,
  driverId: string,
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  const result = assignRestaurantScout(loaded.ops, restaurantId, driverId);
  if (!result.ok) return result;
  await saveDeliveryOps(
    projectId,
    result.ops,
    "Scout signed an unsigned kitchen",
  );
  revalidateDelivery(projectId);
  return { ok: true as const };
}

export async function setRestaurantPausedAction(
  projectId: string,
  restaurantId: string,
  paused: boolean,
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  await saveDeliveryOps(
    projectId,
    setRestaurantPaused(loaded.ops, restaurantId, paused),
    paused ? "Restaurant paused incoming orders" : "Restaurant is open",
  );
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
  await saveDeliveryOps(
    projectId,
    setMerchantTicketStatus(loaded.ops, ticketId, status),
    `Restaurant marked order ${status}`,
  );
  revalidateDelivery(projectId);
  return { ok: true as const };
}

export async function setDriverOnlineAction(
  projectId: string,
  driverId: string,
  online: boolean,
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  await saveDeliveryOps(
    projectId,
    setDriverOnline(loaded.ops, driverId, online),
    online ? "Driver went online" : "Driver went offline",
  );
  revalidateDelivery(projectId);
  return { ok: true as const };
}

export async function acceptDriverRunAction(
  projectId: string,
  runId: string,
  driverId: string,
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  const result = acceptDriverRun(loaded.ops, runId, driverId);
  if (!result.ok) return result;
  await saveDeliveryOps(projectId, result.ops, "Driver accepted an offer");
  revalidateDelivery(projectId);
  return { ok: true as const };
}

export async function advanceDriverArrivedAction(
  projectId: string,
  runId: string,
  driverId: string,
  location: GeoPoint,
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  const result = advanceDriverArrived(loaded.ops, runId, driverId, location);
  if (!result.ok) return result;
  await saveDeliveryOps(
    projectId,
    result.ops,
    "Driver arrived — kitchen stages the bag",
  );
  revalidateDelivery(projectId);
  return { ok: true as const };
}

export async function toggleFavoriteKitchenAction(
  projectId: string,
  restaurantId: string,
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  await saveDeliveryOps(
    projectId,
    toggleFavoriteKitchen(loaded.ops, restaurantId),
    "Diner toggled a favorite kitchen",
  );
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
  await saveDeliveryOps(projectId, result.ops, "Diner flagged a missing item");
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
  await saveDeliveryOps(projectId, result.ops, "Diner rated a bag");
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
  const loaded = await loadOps(projectId);
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
  await saveDeliveryOps(
    projectId,
    result.ops,
    next === "picked_up" ? "Driver confirmed pickup" : "Driver completed drop-off",
  );
  revalidateDelivery(projectId);
  return { ok: true as const };
}
