"use server";

import { revalidatePath } from "next/cache";
import {
  acceptDriverRun,
  advanceDriverArrived,
  advanceDriverRun,
  assignRestaurantScout,
  confirmRestaurantMenuPrice,
  uploadRestaurantMenuItem,
  setDriverOnline,
  setMerchantTicketStatus,
  setRestaurantPaused,
  type GeoPoint,
  type MerchantTicketStatus,
} from "@/lib/seed-delivery";
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
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  await saveDeliveryOps(
    projectId,
    confirmRestaurantMenuPrice(loaded.ops, restaurantId, itemId, priceUsd),
    "Merchant confirmed a crawled menu price",
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

export async function advanceDriverRunAction(
  projectId: string,
  runId: string,
  driverId: string,
  next: "picked_up" | "delivered",
  location?: GeoPoint | null,
) {
  const loaded = await loadOps(projectId);
  if (!loaded.ok) return loaded;
  const result = advanceDriverRun(
    loaded.ops,
    runId,
    driverId,
    next,
    location,
  );
  if (!result.ok) return result;
  await saveDeliveryOps(
    projectId,
    result.ops,
    next === "picked_up" ? "Driver confirmed pickup" : "Driver completed dropoff",
  );
  revalidateDelivery(projectId);
  return { ok: true as const };
}
