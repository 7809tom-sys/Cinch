import { getSourceBundle, upsertSourceFile } from "./seed-source";
import {
  customerFacingCta,
  customerFacingHeadline,
  customerFacingHeroImage,
  customerFacingSupport,
  looksLikeAgentTaskCopy,
  seedHomePageSource,
  seedLandingCopyJson,
  seedPublicSiteCss,
} from "./seed-site-copy";
import type { SeedProject } from "./store";

export type SeedSitePreview = {
  brand: string;
  headline: string;
  support: string;
  cta: string;
  heroImage: string;
  css: string;
  published: boolean;
};

export {
  customerFacingCta,
  customerFacingHeadline,
  customerFacingHeroImage,
  customerFacingSupport,
  looksLikeAgentTaskCopy,
  seedHomePageSource,
  seedLandingCopyJson,
  seedPublicSiteCss,
  seedResponsiveGlobalsCss,
} from "./seed-site-copy";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function customerCopyFromProject(project: SeedProject) {
  const brand = brandFromProject(project);
  return {
    brand,
    headline: customerFacingHeadline(project.name, project.brief),
    support: customerFacingSupport(project.brief),
    cta: customerFacingCta(project.brief),
    heroImage: customerFacingHeroImage(project.brief),
  };
}

/** Build a public website preview from the Seed — real brand site, not a stub. */
export async function buildSeedSitePreview(
  project: SeedProject,
): Promise<SeedSitePreview> {
  const bundle = await getSourceBundle(project.id);
  const files = bundle?.files ?? [];
  const fallback = customerCopyFromProject(project);

  let brand = fallback.brand;
  let headline = fallback.headline;
  let support = fallback.support;
  let cta = fallback.cta;
  let heroImage = fallback.heroImage;

  const copyRaw = fileContent(files, "content/landing.copy.json");
  if (copyRaw) {
    try {
      const copy = JSON.parse(copyRaw) as {
        brand?: string;
        headline?: string;
        support?: string;
        cta?: string;
        heroImage?: string;
      };
      if (
        copy.headline?.trim() &&
        !looksLikeAgentTaskCopy(copy.headline) &&
        copy.headline.trim().toLowerCase() !== brand.toLowerCase() &&
        copy.headline.trim().toLowerCase() !== "cinch"
      ) {
        headline = copy.headline.trim();
      }
      if (copy.support?.trim() && !looksLikeAgentTaskCopy(copy.support)) {
        support = customerFacingSupport(copy.support.trim());
      }
      if (copy.cta?.trim() && !looksLikeAgentTaskCopy(copy.cta)) {
        cta = copy.cta.trim();
      }
      if (copy.heroImage?.trim()?.startsWith("http")) {
        heroImage = copy.heroImage.trim();
      }
      if (
        copy.brand?.trim() &&
        !looksLikeAgentTaskCopy(copy.brand) &&
        copy.brand.trim().toLowerCase() !== "cinch"
      ) {
        brand = copy.brand.trim();
      }
    } catch {
      // Fall back to project fields.
    }
  }

  // Never let brand and headline be identical — looks like a stub.
  if (headline.trim().toLowerCase() === brand.trim().toLowerCase()) {
    headline = customerFacingHeadline(project.name, project.brief);
  }

  const css = fileContent(files, "app/globals.css") ?? seedPublicSiteCss();

  return {
    brand: escapeHtml(brand),
    headline: escapeHtml(headline),
    support: escapeHtml(support),
    cta: escapeHtml(cta),
    heroImage,
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
      };
      const brand = brandFromProject(project);
      copyLooksBad = Boolean(
        (copy.headline && looksLikeAgentTaskCopy(copy.headline)) ||
          (copy.support && looksLikeAgentTaskCopy(copy.support)) ||
          (copy.headline &&
            copy.headline.trim().toLowerCase() === brand.toLowerCase()) ||
          !copy.heroImage,
      );
    } catch {
      copyLooksBad = true;
    }
  }

  const pageLooksBad =
    !page ||
    looksLikeAgentTaskCopy(page) ||
    /className="brand">\s*Cinch\s*</i.test(page) ||
    !page.includes("seed-hero");

  const cssLooksBad = !css || !css.includes("seed-hero");

  if (!pageLooksBad && !copyLooksBad && !cssLooksBad) return;

  const copy = customerCopyFromProject(project);

  await upsertSourceFile({
    projectId: project.id,
    path: "app/globals.css",
    content: seedPublicSiteCss(),
    status: "ready",
    message: "Restored full-bleed website styles",
    agentName: "Conductor",
  });
  await upsertSourceFile({
    projectId: project.id,
    path: "app/page.tsx",
    content: seedHomePageSource(copy),
    status: "ready",
    message: "Restored customer website landing",
    agentName: "Conductor",
  });
  await upsertSourceFile({
    projectId: project.id,
    path: "content/landing.copy.json",
    content: seedLandingCopyJson(copy),
    status: "ready",
    message: "Restored customer landing copy",
    agentName: "Conductor",
  });
}
