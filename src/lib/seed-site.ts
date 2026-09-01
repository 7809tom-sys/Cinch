import { getSourceBundle } from "./seed-source";
import type { SeedProject } from "./store";

export type SeedSitePreview = {
  brand: string;
  headline: string;
  support: string;
  cta: string;
  css: string;
  published: boolean;
};

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

/** Build a public preview model from the Seed project + source tree. */
export async function buildSeedSitePreview(
  project: SeedProject,
): Promise<SeedSitePreview> {
  const bundle = await getSourceBundle(project.id);
  const files = bundle?.files ?? [];

  let brand = project.name;
  let headline = project.name;
  let support = project.brief;
  let cta = "Get started";

  const copyRaw = fileContent(files, "content/landing.copy.json");
  if (copyRaw) {
    try {
      const copy = JSON.parse(copyRaw) as {
        headline?: string;
        support?: string;
        cta?: string;
      };
      if (copy.headline?.trim()) headline = copy.headline.trim();
      if (copy.support?.trim()) support = copy.support.trim();
      if (copy.cta?.trim()) cta = copy.cta.trim();
    } catch {
      // Fall back to project fields when copy JSON is still drafting.
    }
  } else {
    const page = fileContent(files, "app/page.tsx") ?? "";
    const h1 = page.match(/<h1>([\s\S]*?)<\/h1>/)?.[1]?.trim();
    const supportMatch = page.match(
      /className="support">([\s\S]*?)<\/p>/,
    )?.[1]?.trim();
    const brandMatch = page.match(/className="brand">([\s\S]*?)<\/p>/)?.[1]?.trim();
    if (brandMatch) brand = brandMatch;
    if (h1) headline = h1;
    if (supportMatch) support = supportMatch;
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
