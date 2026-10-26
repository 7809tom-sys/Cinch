"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import {
  buildSeedAdminPreview,
  buildSeedShopPreview,
  saveSeedAdminCopy,
  saveSeedShopCopy,
  type SeedShopCopy,
} from "@/lib/seed-site";
import {
  HOMETOWN_HOME_TOWN_ID,
  ensureHometownHomeTown,
} from "@/lib/hometown-home-town";
import { rememberOrderViewers } from "@/lib/hometown-driver-location";
import { getHometownRoleSession } from "@/lib/hometown-role";
import { getProject } from "@/lib/store";

function optionalCoord(value: FormDataEntryValue | null): number | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function loadShop(projectId: string): Promise<SeedShopCopy | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  const preview = await buildSeedShopPreview(project);
  if (!preview) return null;
  const { css: _css, ...copy } = preview;
  return copy;
}

export async function placeSeedShopOrderAction(
  projectId: string,
  formData: FormData,
) {
  let project = await getProject(projectId);
  if (!project && projectId === HOMETOWN_HOME_TOWN_ID) {
    project = await ensureHometownHomeTown();
  }
  if (!project) return { ok: false as const, error: "Seed not found." };

  const shop = await loadShop(projectId);
  if (!shop) {
    return { ok: false as const, error: "Shop is not in this Seed yet." };
  }

  const customerName = String(formData.get("customerName") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const shipToState = String(formData.get("shipToState") ?? "")
    .trim()
    .toUpperCase();
  const shipToZip = String(formData.get("shipToZip") ?? "").trim();
  const shippingModeId = String(formData.get("shippingModeId") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "invoice")
    .trim()
    .toLowerCase();
  const cartRaw = String(formData.get("cartJson") ?? "").trim();
  if (!customerName || !contact || !shipToState || !shipToZip) {
    return {
      ok: false as const,
      error: "Name, contact, ship-to state, and ZIP are required.",
    };
  }

  const { briefIsDeliveryPlatform } = await import("@/lib/seed-site-copy");
  const deliveryPlatform = briefIsDeliveryPlatform(project.name, project.brief);

  let items: SeedShopCopy["orders"][number]["items"] = [];
  try {
    const parsed = JSON.parse(cartRaw) as Array<{
      productId: string;
      qty: number;
    }>;
    if (deliveryPlatform) {
      const { deliveryCartLinesFromShop } = await import("@/lib/seed-delivery");
      const { ensureDeliveryOpsInSeed } = await import("@/lib/seed-delivery-io");
      const ops = await ensureDeliveryOpsInSeed(project);
      items = ops ? deliveryCartLinesFromShop(ops, parsed) : [];
    }
    if (!deliveryPlatform) {
      items = parsed
        .map((line) => {
          const product = shop.products.find((item) => item.id === line.productId);
          if (!product || line.qty < 1) return null;
          const qty = Math.min(
            product.stockQty,
            Math.min(20, Math.floor(line.qty)),
          );
          if (qty < 1) return null;
          return {
            productId: product.id,
            title: product.title,
            priceUsd: product.priceUsd,
            qty,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
    }
  } catch {
    return { ok: false as const, error: "Cart is invalid." };
  }

  if (items.length === 0) {
    return { ok: false as const, error: "Add something to the cart first." };
  }

  const needsLtl = items.some((item) => {
    const product = shop.products.find((row) => row.id === item.productId);
    return product?.shipClass === "ltl";
  });
  const mode =
    shop.shippingModes.find((item) => item.id === shippingModeId) ??
    shop.shippingModes.find((item) =>
      needsLtl ? item.kind === "ltl" : item.kind === "parcel",
    ) ??
    shop.shippingModes[0];
  if (!mode) {
    return { ok: false as const, error: "No shipping modes in this Seed." };
  }
  if (needsLtl && mode.kind !== "ltl") {
    return {
      ok: false as const,
      error: "Cart includes LTL items — choose LTL freight.",
    };
  }

  const subtotalUsd = items.reduce(
    (sum, item) => sum + item.priceUsd * item.qty,
    0,
  );
  const taxApplies =
    shop.salesTax.enabled &&
    !shop.salesTax.taxInclusive &&
    shop.salesTax.nexusStates.includes(shipToState);
  const taxUsd = taxApplies
    ? Math.round(subtotalUsd * (shop.salesTax.ratePct / 100) * 100) / 100
    : 0;
  const hometownDelivery =
    deliveryPlatform && /delivery/i.test(`${mode.id} ${mode.label}`);
  const hometownPickup =
    deliveryPlatform && /pickup/i.test(`${mode.id} ${mode.label}`);
  let shippingUsd = hometownDelivery
    ? 0
    : hometownPickup
      ? 0
      : mode.baseRateUsd;
  let compliantLat: number | undefined;
  let compliantLng: number | undefined;
  if (hometownDelivery) {
    const {
      deliveryReachMiles,
      dropoffCompliance,
      restaurantForShopItems,
      restaurantGeo,
    } = await import("@/lib/seed-delivery");
    const { ensureDeliveryOpsInSeed } = await import("@/lib/seed-delivery-io");
    const ops = await ensureDeliveryOpsInSeed(project);
    if (!ops) {
      return { ok: false as const, error: "This town isn't taking orders yet." };
    }
    const restaurant = restaurantForShopItems(ops, items);
    const lat = optionalCoord(formData.get("dropoffLat"));
    const lng = optionalCoord(formData.get("dropoffLng"));
    const reach = deliveryReachMiles(restaurant);
    const compliance = dropoffCompliance({
      kitchen: restaurantGeo(restaurant),
      zip: shipToZip,
      lat,
      lng,
      radiusMiles: reach.miles,
      clampRadius: !reach.approximate,
    });
    if (!compliance.ok) {
      return { ok: false as const, error: compliance.error };
    }
    shippingUsd = compliance.feeUsd;
    compliantLat = compliance.point.lat;
    compliantLng = compliance.point.lng;
  }
  const tipUsd = hometownPickup
    ? 0
    : Math.max(
        0,
        Math.round(Number(formData.get("tipUsd") ?? 0) * 100) / 100,
      );
  const scheduledWindow = String(formData.get("scheduledWindow") ?? "ASAP").trim();
  const dropoffInstruction =
    String(formData.get("dropoffInstruction") ?? "hand_to_customer") ===
    "leave_at_door"
      ? ("leave_at_door" as const)
      : ("hand_to_customer" as const);
  const totalUsd =
    Math.round((subtotalUsd + taxUsd + shippingUsd + tipUsd) * 100) / 100;

  for (const item of items) {
    const product = shop.products.find((row) => row.id === item.productId);
    if (!product) continue;
    product.stockQty = Math.max(0, product.stockQty - item.qty);
  }

  shop.orders = [
    {
      id: randomUUID(),
      customerName,
      contact,
      shipToState,
      shipToZip,
      shippingModeId: mode.id,
      shippingLabel: mode.label,
      shippingKind: mode.kind,
      subtotalUsd: Math.round(subtotalUsd * 100) / 100,
      taxUsd,
      shippingUsd,
      items,
      totalUsd,
      createdAt: new Date().toISOString(),
      // Seed-grown card checkout stub — not a Cinch platform Stripe charge.
      status: paymentMethod === "card" ? ("paid" as const) : ("new" as const),
      tipUsd,
    },
    ...shop.orders,
  ].slice(0, 100);

  await saveSeedShopCopy(projectId, shop);

  const adminPreview = await buildSeedAdminPreview(project);
  if (adminPreview?.commerce) {
    const { css: _css, ...admin } = adminPreview;
    admin.commerce!.inventory = admin.commerce!.inventory.map((row) => {
      const product = shop.products.find((item) => item.id === row.productId);
      if (!product) return row;
      return { ...row, onHand: product.stockQty };
    });
    await saveSeedAdminCopy(projectId, admin);
    revalidatePath(`/site/${projectId}/admin`);
  }

  if (briefIsDeliveryPlatform(project.name, project.brief)) {
    const { randomUUID } = await import("crypto");
    const { dinerOrderTrack, recordDeliveryOrder } = await import(
      "@/lib/seed-delivery"
    );
    const { ensureDeliveryOpsInSeed, saveDeliveryOps } = await import(
      "@/lib/seed-delivery-io"
    );
    const ops = await ensureDeliveryOpsInSeed(project);
    if (ops) {
      const orderId = shop.orders[0]?.id ?? randomUUID();
      const nextOps = recordDeliveryOrder(ops, {
          ledgerId: randomUUID(),
          ticketId: randomUUID(),
          runId: randomUUID(),
          orderId,
          customerName,
          dropoffZip: shipToZip,
          dropoffLat: compliantLat,
          dropoffLng: compliantLng,
          items,
          gmvUsd: subtotalUsd,
          deliveryFeeUsd: shippingUsd,
          tipUsd,
          taxUsd,
          fulfillment: hometownPickup ? "pickup" : "delivery",
          scheduledWindow: scheduledWindow || "ASAP",
          dropoffInstruction: hometownPickup
            ? undefined
            : dropoffInstruction,
      });
      const track = dinerOrderTrack(nextOps, orderId);
      if (!track) {
        return {
          ok: false as const,
          error: "We can't reach that address from this kitchen tonight.",
        };
      }
      await saveDeliveryOps(
        projectId,
        nextOps,
        "Wrote Hometown Runner ledger from a customer order",
      );
      if (!hometownPickup) {
        const session = await getHometownRoleSession(projectId);
        const emails = [contact];
        if (session?.role === "customer") emails.push(session.email);
        await rememberOrderViewers(projectId, orderId, emails);
      }
      revalidatePath(`/site/${projectId}/merchant`);
      revalidatePath(`/site/${projectId}/drive`);
      revalidatePath(`/site/${projectId}/admin`);
      revalidatePath(`/site/${projectId}/shop`);
      revalidatePath(`/hometown`);
      return {
        ok: true as const,
        totalUsd,
        taxUsd,
        shippingUsd,
        tipUsd,
        orderId,
        track,
      };
    }
  }

  revalidatePath(`/site/${projectId}/shop`);
  return {
    ok: true as const,
    totalUsd,
    taxUsd,
    shippingUsd,
    tipUsd,
    orderId: shop.orders[0]?.id,
  };
}
