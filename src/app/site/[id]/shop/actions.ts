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
import { getProject } from "@/lib/store";

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
  const project = await getProject(projectId);
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
  const cartRaw = String(formData.get("cartJson") ?? "").trim();
  if (!customerName || !contact || !shipToState || !shipToZip) {
    return {
      ok: false as const,
      error: "Name, contact, ship-to state, and ZIP are required.",
    };
  }

  let items: SeedShopCopy["orders"][number]["items"] = [];
  try {
    const parsed = JSON.parse(cartRaw) as Array<{
      productId: string;
      qty: number;
    }>;
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
  const shippingUsd = mode.baseRateUsd;
  const totalUsd =
    Math.round((subtotalUsd + taxUsd + shippingUsd) * 100) / 100;

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
      status: "new" as const,
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

  revalidatePath(`/site/${projectId}/shop`);
  return {
    ok: true as const,
    totalUsd,
    taxUsd,
    shippingUsd,
  };
}
