import { getSourceBundle, upsertSourceFile } from "./seed-source";
import {
  customerFacingCta,
  customerFacingHeadline,
  customerFacingSupport,
  looksLikeAgentTaskCopy,
  seedHomePageSource,
  seedLandingCopyJson,
} from "./seed-site-copy";
import type { SeedProject } from "./store";

export type SeedSitePreview = {
  brand: string;
  headline: string;
  support: string;
  cta: string;
  css: string;
  published: boolean;
};

export {
  customerFacingCta,
  customerFacingHeadline,
  customerFacingSupport,
  looksLikeAgentTaskCopy,
  seedHomePageSource,
  seedLandingCopyJson,
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

/** Build a public website preview from the Seed — customer copy only. */
export async function buildSeedSitePreview(
  project: SeedProject,
): Promise<SeedSitePreview> {
  const bundle = await getSourceBundle(project.id);
  const files = bundle?.files ?? [];

  const brand = project.name.replace(/\s+Seed$/i, "").trim() || project.name;
  let headline = customerFacingHeadline(project.name);
  let support = customerFacingSupport(project.brief);
  let cta = customerFacingCta(project.brief);

  const copyRaw = fileContent(files, "content/landing.copy.json");
  if (copyRaw) {
    try {
      const copy = JSON.parse(copyRaw) as {
        brand?: string;
        headline?: string;
        support?: string;
        cta?: string;
      };
      if (
        copy.headline?.trim() &&
        !looksLikeAgentTaskCopy(copy.headline) &&
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
    } catch {
      // Fall back to project fields.
    }
  }

  const css =
    fileContent(files, "app/globals.css") ??
    `body{margin:0;font-family:system-ui,sans-serif;background:#fffaf2;color:#0b2e2a}
.seed-home{min-height:100dvh;display:grid;align-content:center;gap:1rem;padding:2rem 1.25rem}
.seed-home .brand{font-size:clamp(2rem,8vw,3.5rem);font-weight:800;margin:0}
.seed-home h1{font-size:clamp(1.6rem,5vw,2.75rem);margin:0;line-height:1.15}
.seed-home .support{max-width:36rem;color:#5a635e;line-height:1.55;margin:0}
.seed-home .cta{display:inline-flex;align-items:center;justify-content:center;min-height:2.75rem;padding:0.85rem 1.4rem;border-radius:0.5rem;background:#e8a54b;color:#0b2e2a;text-decoration:none;font-weight:700;margin-top:0.5rem}`;

  return {
    brand: escapeHtml(brand),
    headline: escapeHtml(headline),
    support: escapeHtml(support),
    cta: escapeHtml(cta),
    css,
    published: Boolean(project.sitePublishedAt),
  };
}

/** Rewrite landing files when agents overwrote them with task titles. */
export async function repairCustomerLandingIfNeeded(
  project: SeedProject,
): Promise<void> {
  const bundle = await getSourceBundle(project.id);
  const page = bundle?.files.find((file) => file.path === "app/page.tsx")?.content ?? "";
  const copyRaw =
    bundle?.files.find((file) => file.path === "content/landing.copy.json")
      ?.content ?? "";

  let copyLooksBad = false;
  if (copyRaw) {
    try {
      const copy = JSON.parse(copyRaw) as { headline?: string; support?: string };
      copyLooksBad = Boolean(
        (copy.headline && looksLikeAgentTaskCopy(copy.headline)) ||
          (copy.support && looksLikeAgentTaskCopy(copy.support)),
      );
    } catch {
      copyLooksBad = true;
    }
  }

  const pageLooksBad =
    !page ||
    looksLikeAgentTaskCopy(page) ||
    /className="brand">\s*Cinch\s*</i.test(page);

  if (!pageLooksBad && !copyLooksBad && copyRaw) return;

  const brand = project.name.replace(/\s+Seed$/i, "").trim() || project.name;
  const headline = customerFacingHeadline(project.name);
  const support = customerFacingSupport(project.brief);
  const cta = customerFacingCta(project.brief);

  await upsertSourceFile({
    projectId: project.id,
    path: "app/page.tsx",
    content: seedHomePageSource({ brand, headline, support, cta }),
    status: "ready",
    message: "Restored customer website landing",
    agentName: "Conductor",
  });
  await upsertSourceFile({
    projectId: project.id,
    path: "content/landing.copy.json",
    content: seedLandingCopyJson({ brand, headline, support, cta }),
    status: "ready",
    message: "Restored customer landing copy",
    agentName: "Conductor",
  });
}
