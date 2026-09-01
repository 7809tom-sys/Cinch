import { getSourceBundle, upsertSourceFile } from "./seed-source";
import {
  briefAsksForBusinessAdmin,
  briefAsksForEcommerce,
  customerFacingAdminCopy,
  customerFacingShopCopy,
  customerFacingSiteCopy,
  looksLikeAgentTaskCopy,
  seedAdminCopyJson,
  seedAdminPageSource,
  seedCommerceAdminBoard,
  seedHomePageSource,
  seedLandingCopyJson,
  seedLandingCopyMismatchesIndustry,
  seedNeedsBusinessAdmin,
  seedPublicSiteCss,
  seedShopCopyJson,
  seedShopPageSource,
  type SeedAdminCopy,
  type SeedService,
  type SeedShopCopy,
  type SeedSiteCopy,
} from "./seed-site-copy";
import type { SeedProject } from "./store";

export type SeedSitePreview = SeedSiteCopy & {
  css: string;
  published: boolean;
};

export {
  briefAsksForBusinessAdmin,
  briefAsksForEcommerce,
  customerFacingAdminCopy,
  customerFacingCta,
  customerFacingHeadline,
  customerFacingHeroImage,
  customerFacingShopCopy,
  customerFacingSiteCopy,
  customerFacingSupport,
  looksLikeAgentTaskCopy,
  seedAdminCopyJson,
  seedAdminPageSource,
  seedCommerceAdminBoard,
  seedHomePageSource,
  seedLandingCopyJson,
  seedLandingCopyMismatchesIndustry,
  seedIndustryKey,
  seedNeedsBusinessAdmin,
  seedPublicSiteCss,
  seedResponsiveGlobalsCss,
  seedShopCopyJson,
  seedShopPageSource,
} from "./seed-site-copy";

export type {
  SeedAdminCommerce,
  SeedAdminCopy,
  SeedService,
  SeedShopCopy,
  SeedSiteCopy,
} from "./seed-site-copy";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeCopy(copy: SeedSiteCopy): SeedSiteCopy {
  return {
    ...copy,
    brand: escapeHtml(copy.brand),
    headline: escapeHtml(copy.headline),
    support: escapeHtml(copy.support),
    cta: escapeHtml(copy.cta),
    navLabel: escapeHtml(copy.navLabel),
    servicesEyebrow: escapeHtml(copy.servicesEyebrow),
    servicesHeadline: escapeHtml(copy.servicesHeadline),
    services: copy.services.map((service) => ({
      title: escapeHtml(service.title),
      detail: escapeHtml(service.detail),
    })),
    aboutEyebrow: escapeHtml(copy.aboutEyebrow),
    aboutHeadline: escapeHtml(copy.aboutHeadline),
    aboutBody: escapeHtml(copy.aboutBody),
    bookEyebrow: escapeHtml(copy.bookEyebrow),
    bookHeadline: escapeHtml(copy.bookHeadline),
    bookBody: escapeHtml(copy.bookBody),
    bookNote: escapeHtml(copy.bookNote),
    footerNote: escapeHtml(copy.footerNote),
  };
}

function fileContent(
  files: Array<{ path: string; content: string }>,
  path: string,
): string | null {
  return files.find((file) => file.path === path)?.content ?? null;
}

function brandFromProject(project: SeedProject): string {
  return project.name.replace(/\s+Seed$/i, "").trim() || project.name;
}

function customerCopyFromProject(project: SeedProject): SeedSiteCopy {
  return customerFacingSiteCopy(project.name, project.brief);
}

function mergeStoredCopy(
  projectName: string,
  brief: string,
  fallback: SeedSiteCopy,
  raw: string,
): SeedSiteCopy {
  try {
    const copy = JSON.parse(raw) as Partial<SeedSiteCopy>;

    // Never keep car/detailing (or other wrong-vertical) copy over a correct fallback.
    if (seedLandingCopyMismatchesIndustry(projectName, brief, copy)) {
      return fallback;
    }

    const next = { ...fallback };

    if (
      copy.headline?.trim() &&
      !looksLikeAgentTaskCopy(copy.headline) &&
      copy.headline.trim().toLowerCase() !== fallback.brand.toLowerCase() &&
      copy.headline.trim().toLowerCase() !== "cinch"
    ) {
      next.headline = copy.headline.trim();
    }
    if (copy.support?.trim() && !looksLikeAgentTaskCopy(copy.support)) {
      next.support = copy.support.trim();
    }
    if (copy.cta?.trim() && !looksLikeAgentTaskCopy(copy.cta)) {
      next.cta = copy.cta.trim();
    }
    if (copy.heroImage?.trim()?.startsWith("http")) {
      next.heroImage = copy.heroImage.trim();
    }
    if (
      copy.brand?.trim() &&
      !looksLikeAgentTaskCopy(copy.brand) &&
      copy.brand.trim().toLowerCase() !== "cinch"
    ) {
      next.brand = copy.brand.trim();
    }
    if (
      Array.isArray(copy.services) &&
      copy.services.length >= 2 &&
      copy.services.every(
        (service) =>
          service?.title?.trim() &&
          service?.detail?.trim() &&
          !looksLikeAgentTaskCopy(service.title) &&
          !looksLikeAgentTaskCopy(service.detail),
      )
    ) {
      next.services = copy.services.map((service) => ({
        title: service.title.trim(),
        detail: service.detail.trim(),
      }));
    }
    for (const key of [
      "servicesEyebrow",
      "servicesHeadline",
      "aboutEyebrow",
      "aboutHeadline",
      "aboutBody",
      "bookEyebrow",
      "bookHeadline",
      "bookBody",
      "bookNote",
      "footerNote",
    ] as const) {
      const value = copy[key];
      if (typeof value === "string" && value.trim() && !looksLikeAgentTaskCopy(value)) {
        next[key] = value.trim();
      }
    }

    if (next.headline.trim().toLowerCase() === next.brand.trim().toLowerCase()) {
      next.headline = fallback.headline;
    }

    // Final guard after merge — stored fields can still combine into a mismatch.
    if (seedLandingCopyMismatchesIndustry(projectName, brief, next)) {
      return fallback;
    }
    return next;
  } catch {
    return fallback;
  }
}

/** Build a public website preview from the Seed — full site, not a stub. */
export async function buildSeedSitePreview(
  project: SeedProject,
): Promise<SeedSitePreview> {
  const bundle = await getSourceBundle(project.id);
  const files = bundle?.files ?? [];
  const fallback = customerCopyFromProject(project);
  const copyRaw = fileContent(files, "content/landing.copy.json");
  const copy = copyRaw
    ? mergeStoredCopy(project.name, project.brief, fallback, copyRaw)
    : fallback;
  const css = fileContent(files, "app/globals.css") ?? seedPublicSiteCss();

  // Do not HTML-escape here — React text nodes escape safely on render.
  // Escaping first caused visible "&amp;" in titles like "Express wash & wipe".
  return {
    ...copy,
    heroImage: copy.heroImage.replace(/"/g, "%22"),
    css,
    published: Boolean(project.sitePublishedAt),
  };
}

/** Rewrite landing files when agents overwrote them with task titles or stub copy. */
export async function repairCustomerLandingIfNeeded(
  project: SeedProject,
): Promise<void> {
  const bundle = await getSourceBundle(project.id);
  const page =
    bundle?.files.find((file) => file.path === "app/page.tsx")?.content ?? "";
  const copyRaw =
    bundle?.files.find((file) => file.path === "content/landing.copy.json")
      ?.content ?? "";
  const css =
    bundle?.files.find((file) => file.path === "app/globals.css")?.content ??
    "";

  let copyLooksBad = !copyRaw;
  if (copyRaw) {
    try {
      const copy = JSON.parse(copyRaw) as {
        headline?: string;
        support?: string;
        brand?: string;
        heroImage?: string;
        cta?: string;
        aboutBody?: string;
        footerNote?: string;
        servicesHeadline?: string;
        services?: SeedService[];
      };
      const brand = brandFromProject(project);
      copyLooksBad = Boolean(
        (copy.headline && looksLikeAgentTaskCopy(copy.headline)) ||
          (copy.support && looksLikeAgentTaskCopy(copy.support)) ||
          (copy.headline &&
            copy.headline.trim().toLowerCase() === brand.toLowerCase()) ||
          !copy.heroImage ||
          !Array.isArray(copy.services) ||
          copy.services.length < 2 ||
          seedLandingCopyMismatchesIndustry(project.name, project.brief, copy),
      );
    } catch {
      copyLooksBad = true;
    }
  }

  const pageLooksBad =
    !page ||
    looksLikeAgentTaskCopy(page) ||
    /className="brand">\s*Cinch\s*</i.test(page) ||
    !page.includes("seed-hero") ||
    !page.includes('id="services"') ||
    !page.includes('id="book"') ||
    (/Book a detail|Express wash|Showroom polish|Details that travel/i.test(
      page,
    ) &&
      seedLandingCopyMismatchesIndustry(project.name, project.brief, {
        cta: /Book a detail/i.test(page) ? "Book a detail" : undefined,
        servicesHeadline: /Details that travel/i.test(page)
          ? "Details that travel to your driveway"
          : undefined,
      }));

  const cssLooksBad =
    !css || !css.includes("seed-hero") || !css.includes("seed-services");

  if (!pageLooksBad && !copyLooksBad && !cssLooksBad) return;

  const copy = customerCopyFromProject(project);

  await upsertSourceFile({
    projectId: project.id,
    path: "app/globals.css",
    content: seedPublicSiteCss(),
    status: "ready",
    message: "Restored full website styles",
    agentName: "Conductor",
  });
  await upsertSourceFile({
    projectId: project.id,
    path: "app/page.tsx",
    content: seedHomePageSource({
      ...copy,
      includeShop: briefAsksForEcommerce(project.brief),
    }),
    status: "ready",
    message: "Restored full customer website",
    agentName: "Conductor",
  });
  await upsertSourceFile({
    projectId: project.id,
    path: "content/landing.copy.json",
    content: seedLandingCopyJson(copy),
    status: "ready",
    message: "Restored full customer site copy",
    agentName: "Conductor",
  });
}

/**
 * When the brief asked for admin/calendar/education or e-commerce, ensure
 * admin pages exist in the Seed source (grown into the Seed — not Cinch).
 * E-commerce also grows inventory, UPS/LTL shipping, and sales tax into admin.
 */
export async function ensureBusinessAdminInSeed(
  project: SeedProject,
): Promise<SeedAdminCopy | null> {
  if (!seedNeedsBusinessAdmin(project.brief)) return null;

  const wantsCommerce = briefAsksForEcommerce(project.brief);
  const bundle = await getSourceBundle(project.id);
  const copyRaw =
    bundle?.files.find((file) => file.path === "content/admin.copy.json")
      ?.content ?? "";
  const page =
    bundle?.files.find((file) => file.path === "app/admin/page.tsx")
      ?.content ?? "";
  const css =
    bundle?.files.find((file) => file.path === "app/globals.css")?.content ??
    "";

  let existing: SeedAdminCopy | null = null;
  if (copyRaw) {
    try {
      const parsed = JSON.parse(copyRaw) as SeedAdminCopy;
      if (
        parsed &&
        typeof parsed.brand === "string" &&
        Array.isArray(parsed.tips) &&
        Array.isArray(parsed.appointments)
      ) {
        existing = {
          ...parsed,
          commerce: parsed.commerce ?? null,
        };
      }
    } catch {
      existing = null;
    }
  }

  const missingCommerce =
    wantsCommerce &&
    (!existing?.commerce ||
      !Array.isArray(existing.commerce.shippingModes) ||
      !Array.isArray(existing.commerce.inventory) ||
      !existing.commerce.salesTax);

  const needsWrite =
    !existing ||
    !page ||
    !page.includes("seed-admin") ||
    !css.includes("seed-admin") ||
    missingCommerce ||
    (wantsCommerce && !page.includes("id=\"shipping\""));

  if (!needsWrite && existing) return existing;

  let admin = existing ?? customerFacingAdminCopy(project.name, project.brief);
  if (wantsCommerce) {
    const fresh = customerFacingAdminCopy(project.name, project.brief);
    admin = {
      ...admin,
      title: fresh.title,
      support: fresh.support,
      tipsEyebrow: admin.tipsEyebrow || fresh.tipsEyebrow,
      tipsHeadline: admin.tipsHeadline || fresh.tipsHeadline,
      tips: admin.tips.length > 0 ? admin.tips : fresh.tips,
      commerce:
        missingCommerce || !admin.commerce
          ? seedCommerceAdminBoard(project.name, project.brief)
          : admin.commerce,
    };
  }

  if (!css.includes("seed-admin")) {
    await upsertSourceFile({
      projectId: project.id,
      path: "app/globals.css",
      content: seedPublicSiteCss(),
      status: "ready",
      message: "Grew business admin styles into the Seed",
      agentName: "Conductor",
    });
  }

  await upsertSourceFile({
    projectId: project.id,
    path: "app/admin/page.tsx",
    content: seedAdminPageSource(admin),
    status: "ready",
    message: wantsCommerce
      ? "Grew Seed admin with commerce ops (inventory, UPS/LTL, tax)"
      : "Grew business admin into the Seed",
    agentName: "Conductor",
  });
  await upsertSourceFile({
    projectId: project.id,
    path: "content/admin.copy.json",
    content: seedAdminCopyJson(admin),
    status: "ready",
    message: wantsCommerce
      ? "Grew Seed admin commerce board into the source tree"
      : "Grew business admin copy into the Seed",
    agentName: "Conductor",
  });

  return admin;
}

export async function buildSeedAdminPreview(
  project: SeedProject,
): Promise<(SeedAdminCopy & { css: string }) | null> {
  const admin = await ensureBusinessAdminInSeed(project);
  if (!admin) return null;

  const bundle = await getSourceBundle(project.id);
  const css =
    bundle?.files.find((file) => file.path === "app/globals.css")?.content ??
    seedPublicSiteCss();
  const copyRaw =
    bundle?.files.find((file) => file.path === "content/admin.copy.json")
      ?.content ?? "";

  let copy = admin;
  if (copyRaw) {
    try {
      copy = { ...admin, ...(JSON.parse(copyRaw) as SeedAdminCopy) };
    } catch {
      /* keep admin */
    }
  }

  return { ...copy, css };
}

/** Persist schedule / tips back into the Seed source tree. */
export async function saveSeedAdminCopy(
  projectId: string,
  copy: SeedAdminCopy,
): Promise<void> {
  await upsertSourceFile({
    projectId,
    path: "content/admin.copy.json",
    content: seedAdminCopyJson(copy),
    status: "ready",
    message: "Updated Seed business admin board",
    agentName: "Owner",
  });
  await upsertSourceFile({
    projectId,
    path: "app/admin/page.tsx",
    content: seedAdminPageSource(copy),
    status: "ready",
    message: "Synced Seed business admin page",
    agentName: "Owner",
  });
}

/**
 * When the brief asks for e-commerce, ensure shop files exist in the Seed
 * source (grown by the Seed — not a separate Cinch platform checkout).
 */
function normalizeShopCopy(
  project: SeedProject,
  raw: Partial<SeedShopCopy> | null,
): SeedShopCopy {
  const fresh = customerFacingShopCopy(project.name, project.brief);
  if (!raw) return fresh;

  const products: SeedShopCopy["products"] = (raw.products ?? fresh.products).map(
    (product, index) => {
      const fallback = fresh.products[index] ?? fresh.products[0]!;
      return {
        id: product.id || fallback.id,
        title: product.title || fallback.title,
        detail: product.detail || fallback.detail,
        priceUsd: Number(product.priceUsd) || fallback.priceUsd,
        sku: product.sku || fallback.sku,
        stockQty:
          typeof product.stockQty === "number"
            ? product.stockQty
            : fallback.stockQty,
        weightLb:
          typeof product.weightLb === "number"
            ? product.weightLb
            : fallback.weightLb,
        shipClass: (product.shipClass === "ltl" ? "ltl" : "parcel") as
          | "parcel"
          | "ltl",
      };
    },
  );

  return {
    brand: raw.brand || fresh.brand,
    title: raw.title || fresh.title,
    support: raw.support || fresh.support,
    cta: raw.cta || fresh.cta,
    products,
    orders: Array.isArray(raw.orders) ? raw.orders : [],
    originZip: raw.originZip || fresh.originZip,
    shippingModes:
      Array.isArray(raw.shippingModes) && raw.shippingModes.length > 0
        ? raw.shippingModes
        : fresh.shippingModes,
    salesTax: raw.salesTax ?? fresh.salesTax,
  };
}

export async function ensureShopInSeed(
  project: SeedProject,
): Promise<SeedShopCopy | null> {
  if (!briefAsksForEcommerce(project.brief)) return null;

  // E-commerce always grows commerce ops into Seed admin (shipping / tax / stock).
  await ensureBusinessAdminInSeed(project);

  const bundle = await getSourceBundle(project.id);
  const copyRaw =
    bundle?.files.find((file) => file.path === "content/shop.copy.json")
      ?.content ?? "";
  const page =
    bundle?.files.find((file) => file.path === "app/shop/page.tsx")?.content ??
    "";
  const css =
    bundle?.files.find((file) => file.path === "app/globals.css")?.content ??
    "";

  let parsed: Partial<SeedShopCopy> | null = null;
  if (copyRaw) {
    try {
      parsed = JSON.parse(copyRaw) as SeedShopCopy;
    } catch {
      parsed = null;
    }
  }

  const existing = parsed ? normalizeShopCopy(project, parsed) : null;
  const home =
    bundle?.files.find((file) => file.path === "app/page.tsx")?.content ?? "";

  const needsWrite =
    !existing ||
    !page ||
    !page.includes("seed-shop") ||
    !css.includes("seed-shop") ||
    !home.includes('href="/shop"') ||
    !existing.shippingModes?.length ||
    !existing.salesTax ||
    existing.products.some((product) => !product.sku);

  if (!needsWrite && existing) return existing;

  const shop = existing ?? customerFacingShopCopy(project.name, project.brief);

  if (!css.includes("seed-shop")) {
    await upsertSourceFile({
      projectId: project.id,
      path: "app/globals.css",
      content: seedPublicSiteCss(),
      status: "ready",
      message: "Grew shop styles into the Seed",
      agentName: "Conductor",
    });
  }

  await upsertSourceFile({
    projectId: project.id,
    path: "app/shop/page.tsx",
    content: seedShopPageSource(shop),
    status: "ready",
    message: "Grew Seed shop e-commerce into the source tree",
    agentName: "Conductor",
  });
  await upsertSourceFile({
    projectId: project.id,
    path: "content/shop.copy.json",
    content: seedShopCopyJson(shop),
    status: "ready",
    message: "Grew Seed shop catalog into the source tree",
    agentName: "Conductor",
  });
  const landing = customerFacingSiteCopy(project.name, project.brief);
  await upsertSourceFile({
    projectId: project.id,
    path: "app/page.tsx",
    content: seedHomePageSource({ ...landing, includeShop: true }),
    status: "ready",
    message: "Linked Shop in Seed home nav",
    agentName: "Conductor",
  });

  return shop;
}

export async function buildSeedShopPreview(
  project: SeedProject,
): Promise<(SeedShopCopy & { css: string }) | null> {
  const shop = await ensureShopInSeed(project);
  if (!shop) return null;

  const bundle = await getSourceBundle(project.id);
  const css =
    bundle?.files.find((file) => file.path === "app/globals.css")?.content ??
    seedPublicSiteCss();
  const copyRaw =
    bundle?.files.find((file) => file.path === "content/shop.copy.json")
      ?.content ?? "";

  let copy = shop;
  if (copyRaw) {
    try {
      copy = { ...shop, ...(JSON.parse(copyRaw) as SeedShopCopy) };
    } catch {
      /* keep shop */
    }
  }

  return { ...copy, css };
}

/** Persist cart orders back into the Seed source tree. */
export async function saveSeedShopCopy(
  projectId: string,
  copy: SeedShopCopy,
): Promise<void> {
  await upsertSourceFile({
    projectId,
    path: "content/shop.copy.json",
    content: seedShopCopyJson(copy),
    status: "ready",
    message: "Updated Seed shop orders",
    agentName: "Customer",
  });
  await upsertSourceFile({
    projectId,
    path: "app/shop/page.tsx",
    content: seedShopPageSource(copy),
    status: "ready",
    message: "Synced Seed shop page",
    agentName: "Customer",
  });
}
