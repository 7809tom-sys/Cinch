import { getSourceBundle, upsertSourceFile } from "./seed-source";
import {
  customerFacingSiteCopy,
  looksLikeAgentTaskCopy,
  seedHomePageSource,
  seedLandingCopyJson,
  seedPublicSiteCss,
  type SeedService,
  type SeedSiteCopy,
} from "./seed-site-copy";
import type { SeedProject } from "./store";

export type SeedSitePreview = SeedSiteCopy & {
  css: string;
  published: boolean;
};

export {
  customerFacingCta,
  customerFacingHeadline,
  customerFacingHeroImage,
  customerFacingSiteCopy,
  customerFacingSupport,
  looksLikeAgentTaskCopy,
  seedHomePageSource,
  seedLandingCopyJson,
  seedPublicSiteCss,
  seedResponsiveGlobalsCss,
} from "./seed-site-copy";

export type { SeedService, SeedSiteCopy };

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
  fallback: SeedSiteCopy,
  raw: string,
): SeedSiteCopy {
  try {
    const copy = JSON.parse(raw) as Partial<SeedSiteCopy>;
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
  const copy = copyRaw ? mergeStoredCopy(fallback, copyRaw) : fallback;
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
          copy.services.length < 2,
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
    !page.includes('id="book"');

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
    content: seedHomePageSource(copy),
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
