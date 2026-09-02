"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import {
  customerOwnsProject,
  getCurrentCustomer,
} from "@/lib/customer-auth";
import { getMasterSession, isMasterEmail } from "@/lib/master-auth";
import { storeSeedProductPhoto, storeSeedProductPhotoFromUrl } from "@/lib/seed-product-media";
import { lookupSeedProductByUpc } from "@/lib/seed-upc-catalog";
import {
  buildSeedAdminPreview,
  buildSeedShopPreview,
  saveSeedAdminCopy,
  saveSeedShopCopy,
  type SeedAdminCopy,
} from "@/lib/seed-site";
import { getProject } from "@/lib/store";
import type { SeedShopOrder } from "@/lib/seed-site-copy";

async function requireBusinessAdmin(projectId: string) {
  const [customer, master] = await Promise.all([
    getCurrentCustomer(),
    getMasterSession(),
  ]);
  if (!customer && !master) {
    return { ok: false as const, error: "Sign in required." };
  }
  const project = await getProject(projectId);
  if (!project) {
    return { ok: false as const, error: "Seed not found." };
  }
  const owns = Boolean(
    (customer &&
      (customerOwnsProject(customer, projectId) ||
        project.customerEmail === customer.email ||
        isMasterEmail(customer.email))) ||
      (master && isMasterEmail(master.email)),
  );
  if (!owns) {
    return { ok: false as const, error: "Not your business admin." };
  }
  return { ok: true as const, project };
}

async function loadBoard(projectId: string): Promise<SeedAdminCopy | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  const preview = await buildSeedAdminPreview(project);
  if (!preview) return null;
  const { css: _css, ...copy } = preview;
  return copy;
}

export async function addSeedAdminAppointmentAction(
  projectId: string,
  formData: FormData,
) {
  const access = await requireBusinessAdmin(projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const board = await loadBoard(projectId);
  if (!board) {
    return { ok: false as const, error: "Business admin is not in this Seed." };
  }

  const at = String(formData.get("at") ?? "").trim();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const service = String(formData.get("service") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!at || !customerName || !contact || !service) {
    return {
      ok: false as const,
      error: "Date, name, contact, and service are required.",
    };
  }

  board.appointments = [
    {
      id: randomUUID(),
      at: new Date(at).toISOString(),
      customerName,
      contact,
      service,
      location,
      notes,
      status: "scheduled" as const,
    },
    ...board.appointments,
  ].sort((a, b) => a.at.localeCompare(b.at));

  await saveSeedAdminCopy(projectId, board);
  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}

export async function setSeedAdminAppointmentStatusAction(
  projectId: string,
  appointmentId: string,
  status: "scheduled" | "done" | "canceled",
) {
  const access = await requireBusinessAdmin(projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const board = await loadBoard(projectId);
  if (!board) {
    return { ok: false as const, error: "Business admin is not in this Seed." };
  }

  const appointment = board.appointments.find(
    (item) => item.id === appointmentId,
  );
  if (!appointment) {
    return { ok: false as const, error: "Appointment not found." };
  }
  appointment.status = status;
  await saveSeedAdminCopy(projectId, board);
  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}

export async function saveSeedCommerceInventoryAction(
  projectId: string,
  formData: FormData,
) {
  const access = await requireBusinessAdmin(projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const board = await loadBoard(projectId);
  if (!board?.commerce) {
    return { ok: false as const, error: "Commerce ops are not in this Seed." };
  }

  board.commerce.inventory = board.commerce.inventory.map((row) => {
    const onHand = Number(formData.get(`onHand-${row.productId}`));
    const reorderAt = Number(formData.get(`reorderAt-${row.productId}`));
    const weightLb = Number(formData.get(`weightLb-${row.productId}`));
    const title = String(formData.get(`title-${row.productId}`) ?? row.title).trim();
    const shipClassRaw = String(
      formData.get(`shipClass-${row.productId}`) ?? row.shipClass,
    );
    const shipClass = shipClassRaw === "ltl" ? "ltl" : "parcel";
    return {
      ...row,
      title: title || row.title,
      // Photos are uploaded via ProductPhotoUploader — keep stored media URL.
      imageUrl: row.imageUrl || "",
      onHand: Number.isFinite(onHand) ? Math.max(0, Math.floor(onHand)) : row.onHand,
      reorderAt: Number.isFinite(reorderAt)
        ? Math.max(0, Math.floor(reorderAt))
        : row.reorderAt,
      weightLb: Number.isFinite(weightLb) ? Math.max(0.1, weightLb) : row.weightLb,
      shipClass,
    };
  });

  await saveSeedAdminCopy(projectId, board);

  const shopPreview = await buildSeedShopPreview(access.project);
  if (shopPreview) {
    const { css: _css, ...shop } = shopPreview;
    shop.products = shop.products.map((product) => {
      const row = board.commerce!.inventory.find(
        (item) => item.productId === product.id,
      );
      if (!row) return product;
      return {
        ...product,
        title: row.title,
        stockQty: row.onHand,
        weightLb: row.weightLb,
        shipClass: row.shipClass,
        sku: row.sku || product.sku,
        imageUrl: row.imageUrl || "",
      };
    });
    await saveSeedShopCopy(projectId, shop);
    revalidatePath(`/site/${projectId}/shop`);
  }

  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}

export async function addSeedCommerceProductAction(
  projectId: string,
  formData: FormData,
) {
  const access = await requireBusinessAdmin(projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const board = await loadBoard(projectId);
  if (!board?.commerce) {
    return { ok: false as const, error: "Commerce ops are not in this Seed." };
  }

  const title = String(formData.get("newTitle") ?? "").trim();
  const detail = String(formData.get("newDetail") ?? "").trim();
  const priceUsd = Number(formData.get("newPriceUsd"));
  const onHand = Number(formData.get("newOnHand"));
  const skuRaw = String(formData.get("newSku") ?? "").trim();
  const upc = String(formData.get("newUpc") ?? "").replace(/\D/g, "");
  const catalogImageUrl = String(formData.get("catalogImageUrl") ?? "").trim();
  const image = formData.get("image");

  if (!title || !Number.isFinite(priceUsd) || priceUsd < 0) {
    return {
      ok: false as const,
      error: "Title and a valid price are required to add an item.",
    };
  }

  const productId = `prod-${randomUUID().slice(0, 8)}`;
  let imageUrl = "";

  if (image instanceof File && image.size > 0) {
    const stored = await storeSeedProductPhoto({
      projectId,
      productId,
      file: image,
      fileName: image.name,
    });
    if (!stored.ok) {
      return { ok: false as const, error: stored.error };
    }
    imageUrl = stored.url;
  } else if (catalogImageUrl) {
    const stored = await storeSeedProductPhotoFromUrl({
      projectId,
      productId,
      imageUrl: catalogImageUrl,
    });
    if (!stored.ok) {
      return { ok: false as const, error: stored.error };
    }
    imageUrl = stored.url;
  } else {
    return {
      ok: false as const,
      error:
        "Scan a barcode for manufacturer images, or upload a product photo.",
    };
  }

  const sku =
    skuRaw ||
    (upc ? upc : `SKU-${productId.replace(/^prod-/, "").toUpperCase()}`);
  const stock = Number.isFinite(onHand) ? Math.max(0, Math.floor(onHand)) : 0;

  board.commerce.inventory = [
    {
      productId,
      sku,
      title,
      onHand: stock,
      reorderAt: Math.max(2, Math.floor(stock / 5) || 2),
      shipClass: "parcel",
      weightLb: 1,
      imageUrl,
    },
    ...board.commerce.inventory,
  ];

  await saveSeedAdminCopy(projectId, board);

  const shopPreview = await buildSeedShopPreview(access.project);
  if (shopPreview) {
    const { css: _css, ...shop } = shopPreview;
    shop.products = [
      {
        id: productId,
        title,
        detail: detail || title,
        priceUsd: Math.round(priceUsd * 100) / 100,
        sku,
        stockQty: stock,
        weightLb: 1,
        shipClass: "parcel",
        imageUrl,
      },
      ...shop.products,
    ];
    await saveSeedShopCopy(projectId, shop);
    revalidatePath(`/site/${projectId}/shop`);
  }

  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}

/** Scan / type a barcode → manufacturer title, description, images. */
export async function lookupSeedProductUpcAction(
  projectId: string,
  rawUpc: string,
) {
  const access = await requireBusinessAdmin(projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  return lookupSeedProductByUpc(rawUpc);
}

/** Replace a product photo from the admin uploader (immediate save). */
export async function uploadSeedProductPhotoAction(
  projectId: string,
  productId: string,
  formData: FormData,
) {
  const access = await requireBusinessAdmin(projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const board = await loadBoard(projectId);
  if (!board?.commerce) {
    return { ok: false as const, error: "Commerce ops are not in this Seed." };
  }

  const image = formData.get("image");
  if (!(image instanceof File) || image.size <= 0) {
    return { ok: false as const, error: "Choose a photo to upload." };
  }

  const row = board.commerce.inventory.find((item) => item.productId === productId);
  if (!row) {
    return { ok: false as const, error: "Product not found." };
  }

  const stored = await storeSeedProductPhoto({
    projectId,
    productId,
    file: image,
    fileName: image.name,
  });
  if (!stored.ok) {
    return { ok: false as const, error: stored.error };
  }

  row.imageUrl = stored.url;
  await saveSeedAdminCopy(projectId, board);

  const shopPreview = await buildSeedShopPreview(access.project);
  if (shopPreview) {
    const { css: _css, ...shop } = shopPreview;
    shop.products = shop.products.map((product) =>
      product.id === productId
        ? { ...product, imageUrl: stored.url }
        : product,
    );
    await saveSeedShopCopy(projectId, shop);
    revalidatePath(`/site/${projectId}/shop`);
  }

  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const, url: stored.url };
}

export async function clearSeedProductPhotoAction(
  projectId: string,
  productId: string,
) {
  const access = await requireBusinessAdmin(projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const board = await loadBoard(projectId);
  if (!board?.commerce) {
    return { ok: false as const, error: "Commerce ops are not in this Seed." };
  }

  const row = board.commerce.inventory.find((item) => item.productId === productId);
  if (!row) {
    return { ok: false as const, error: "Product not found." };
  }

  row.imageUrl = "";
  await saveSeedAdminCopy(projectId, board);

  const shopPreview = await buildSeedShopPreview(access.project);
  if (shopPreview) {
    const { css: _css, ...shop } = shopPreview;
    shop.products = shop.products.map((product) =>
      product.id === productId ? { ...product, imageUrl: "" } : product,
    );
    await saveSeedShopCopy(projectId, shop);
    revalidatePath(`/site/${projectId}/shop`);
  }

  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}

export async function saveSeedCommerceShippingTaxAction(
  projectId: string,
  formData: FormData,
) {
  const access = await requireBusinessAdmin(projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const board = await loadBoard(projectId);
  if (!board?.commerce) {
    return { ok: false as const, error: "Commerce ops are not in this Seed." };
  }

  const originZip = String(formData.get("originZip") ?? "").trim();
  const taxRatePct = Number(formData.get("taxRatePct"));
  const nexusStates = String(formData.get("nexusStates") ?? "")
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  const taxNotes = String(formData.get("taxNotes") ?? "").trim();

  if (!originZip || !Number.isFinite(taxRatePct) || nexusStates.length === 0) {
    return {
      ok: false as const,
      error: "Origin ZIP, tax rate, and nexus states are required.",
    };
  }

  board.commerce.originZip = originZip;
  board.commerce.salesTax = {
    ...board.commerce.salesTax,
    enabled: true,
    ratePct: Math.max(0, taxRatePct),
    nexusStates,
    notes: taxNotes || board.commerce.salesTax.notes,
  };
  board.commerce.shippingModes = board.commerce.shippingModes.map((mode) => {
    const rate = Number(formData.get(`shipRate-${mode.id}`));
    return {
      ...mode,
      baseRateUsd: Number.isFinite(rate) ? Math.max(0, rate) : mode.baseRateUsd,
    };
  });

  await saveSeedAdminCopy(projectId, board);

  const shopPreview = await buildSeedShopPreview(access.project);
  if (shopPreview) {
    const { css: _css, ...shop } = shopPreview;
    shop.originZip = board.commerce.originZip;
    shop.salesTax = board.commerce.salesTax;
    shop.shippingModes = board.commerce.shippingModes;
    await saveSeedShopCopy(projectId, shop);
    revalidatePath(`/site/${projectId}/shop`);
  }

  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}

export async function setSeedShopOrderStatusAction(
  projectId: string,
  orderId: string,
  status: SeedShopOrder["status"],
) {
  const access = await requireBusinessAdmin(projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const shopPreview = await buildSeedShopPreview(access.project);
  if (!shopPreview) {
    return { ok: false as const, error: "Shop is not in this Seed." };
  }
  const { css: _css, ...shop } = shopPreview;
  const order = shop.orders.find((item) => item.id === orderId);
  if (!order) {
    return { ok: false as const, error: "Order not found." };
  }
  order.status = status;
  await saveSeedShopCopy(projectId, shop);
  revalidatePath(`/site/${projectId}/admin`);
  revalidatePath(`/site/${projectId}/shop`);
  return { ok: true as const };
}
