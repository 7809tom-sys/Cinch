/**
 * HARD RULE — before one word of design or website code is written for a
 * website Seed, DeepSeek reviews 50 websites in the same genre (pages that
 * actually returned HTML in the crawl) and reports how this website should
 * be made, taking the best feature of every one. No report, no design, no
 * code. DeepSeek only — no failover to another provider for this report.
 *
 * Only public competitor HTML plus the Seed name and brief go to DeepSeek.
 * Never send customer PII, invoices, or affiliate data in this prompt.
 */

import { extractJsonText, generateWithDeepSeek } from "./ai-generate";
import {
  fetchedCompetitorHosts,
  MIN_COMPARABLE_CRAWL,
  type ComparableResearch,
  type ComparableSnapshot,
} from "./seed-comparable-research";
import { isWriterSeedKind } from "./seed-writer";

export const MIN_DESIGN_REPORT_SITES = MIN_COMPARABLE_CRAWL;

export const MIN_DESIGN_REPORT_FEATURES = 5;

export const DESIGN_REPORT_PATH = "content/design-report.json";

export const DESIGN_REPORT_DOC_PATH = "docs/design-report.md";

export const DEEPSEEK_DESIGN_REPORT_TITLE =
  "DeepSeek design report from 50 genre sites";

export const DEEPSEEK_DESIGN_REPORT_RULE = {
  summary:
    "HARD-CODED: before any design or website code, DeepSeek reviews 50 websites in this Seed’s genre that actually returned a page, and reports how this website should be made from the best features of every one. No DeepSeek report, no design, no code.",
} as const;

export type DesignReportSiteNote = {
  host: string;
  url: string;
  bestFeature: string;
};

export type DesignReportFeature = {
  feature: string;
  fromHost: string;
  why: string;
};

export const DESIGN_BLUEPRINT_KEYS = [
  "layout",
  "hero",
  "navigation",
  "primaryCta",
  "trustAndProof",
  "conversionPath",
  "mobile",
  "seoAio",
  "visualStyle",
] as const;

export type DesignBlueprintKey = (typeof DESIGN_BLUEPRINT_KEYS)[number];

export type DesignBlueprint = Record<DesignBlueprintKey, string>;

const BLUEPRINT_LABELS: Record<DesignBlueprintKey, string> = {
  layout: "Layout",
  hero: "Hero",
  navigation: "Navigation",
  primaryCta: "Primary call to action",
  trustAndProof: "Trust and proof",
  conversionPath: "Conversion path",
  mobile: "Phone, tablet, and app",
  seoAio: "SEO / AIO",
  visualStyle: "Visual style",
};

export type DeepSeekDesignReport = {
  provider: "deepseek";
  model: string;
  industry: string;
  generatedAt: string;
  /** Ties the report to the crawl it read. A new crawl needs a new report. */
  researchSearchedAt: string;
  sitesReviewed: DesignReportSiteNote[];
  summary: string;
  blueprint: DesignBlueprint;
  sectionOrder: string[];
  mustHaveFeatures: DesignReportFeature[];
  avoid: string[];
};

export type DesignReportResult =
  | { ok: true; report: DeepSeekDesignReport }
  | { ok: false; error: string };

/** Website Seeds only. Writer Seeds write books; connect Seeds never rebuild. */
export function seedNeedsDesignReport(project: {
  seedMode?: string | null;
  seedKind?: string | null;
}): boolean {
  return project.seedMode !== "connect" && !isWriterSeedKind(project.seedKind);
}

export function taskIsDesignReport(taskTitle: string): boolean {
  return /deepseek design report/i.test(taskTitle);
}

/** Prep, crawl, and the report itself run before the report passes. */
export function taskRunsBeforeDesignReport(taskTitle: string): boolean {
  return (
    taskIsDesignReport(taskTitle) ||
    /comparable ideal|search comparable|take the best/i.test(taskTitle) ||
    /hold the prep brief|spec website vs admin|lock delivery and money|lock crm and fulfillment/i.test(
      taskTitle,
    )
  );
}

/**
 * Source paths that are website design or code. Docs, research, ops data,
 * and owner product photos are not.
 */
export function pathIsSiteDesignOrCode(path: string): boolean {
  if (path.startsWith("public/products/")) return false;
  if (path.startsWith("app/") || path.startsWith("public/")) return true;
  return /^content\/[^/]+\.copy\.json$/.test(path);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function clip(value: string | null | undefined, max: number): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** The 50 highest-scoring sites that returned a page, one per host. */
export function designReportSites(
  research: ComparableResearch,
): ComparableSnapshot[] {
  const seen = new Set<string>();
  const picked: ComparableSnapshot[] = [];
  const ranked = [...research.snapshots]
    .filter((snap) => snap.fetched && snap.url)
    .sort((a, b) => b.score - a.score);
  for (const snap of ranked) {
    const host = snap.host || hostOf(snap.url);
    if (!host || seen.has(host)) continue;
    seen.add(host);
    picked.push({ ...snap, host });
    if (picked.length >= MIN_DESIGN_REPORT_SITES) break;
  }
  return picked;
}

function siteLine(snap: ComparableSnapshot): string {
  return [
    `host: ${snap.host}`,
    `title: ${clip(snap.title, 90)}`,
    `h1: ${clip(snap.h1, 90)}`,
    `cta: ${clip(snap.cta, 40)}`,
    `nav: ${clip(snap.nav.join(", "), 120)}`,
    `description: ${clip(snap.description, 160)}`,
  ].join(" | ");
}

function seedContext(input: { projectName: string; brief: string; industry: string }) {
  return `Seed: ${clip(input.projectName, 120)}\nGenre: ${input.industry}\nBrief: ${clip(input.brief, 1200)}`;
}

const NOTES_SYSTEM = `You are DeepSeek, the design researcher for Cinch Seed. You study competitor websites in one genre before any design or code exists.
For EVERY site you are given, name the single best feature this new website should take from it — structure, flow, or method, not its slogan.
Never copy a competitor headline or brand name into the feature. Keep each feature under 20 words.
Reply with JSON only: {"sites":[{"host":"example.com","bestFeature":"..."}]}. One entry per host given, using the exact host string.`;

const BLUEPRINT_SYSTEM = `You are DeepSeek, the design researcher for Cinch Seed. You have reviewed 50 websites in this genre. Write the report that says how the new website must be made, taking the best features of every site.
Rules: attribute every must-have feature to the host it came from. Do not paste competitor headlines or brand names into the plan. Phone, tablet, laptop, and installable app must all work.
Reply with JSON only:
{"summary":"3-5 sentences","blueprint":{"layout":"","hero":"","navigation":"","primaryCta":"","trustAndProof":"","conversionPath":"","mobile":"","seoAio":"","visualStyle":""},"sectionOrder":["..."],"mustHaveFeatures":[{"feature":"","fromHost":"","why":""}],"avoid":["..."]}
Give at least 8 mustHaveFeatures, at least 5 sectionOrder entries, and at least 3 avoid entries.`;

type NotesPayload = { sites?: Array<{ host?: unknown; bestFeature?: unknown }> };

async function noteSites(
  context: string,
  sites: ComparableSnapshot[],
): Promise<{ notes: Map<string, string>; error: string | null }> {
  const notes = new Map<string, string>();
  const result = await generateWithDeepSeek({
    systemPrompt: NOTES_SYSTEM,
    userPrompt: `${context}\n\nSites (${sites.length}):\n${sites.map(siteLine).join("\n")}`,
    maxTokens: 4000,
    temperature: 0.3,
  });
  if (!result.ok) return { notes, error: result.error };
  try {
    const parsed = JSON.parse(extractJsonText(result.text)) as NotesPayload;
    const wanted = new Set(sites.map((snap) => snap.host));
    for (const row of parsed.sites ?? []) {
      const host = String(row.host ?? "").replace(/^www\./, "").trim();
      const feature = clip(String(row.bestFeature ?? ""), 200);
      if (wanted.has(host) && feature.length >= 8) notes.set(host, feature);
    }
    return { notes, error: null };
  } catch {
    return { notes, error: "DeepSeek returned site notes that were not JSON." };
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => clip(String(item ?? ""), 200))
    .filter((item) => item.length > 0)
    .slice(0, max);
}

/** Ask DeepSeek to review the 50 sites and write the build report. */
export async function buildDeepSeekDesignReport(input: {
  projectName: string;
  brief: string;
  research: ComparableResearch;
}): Promise<DesignReportResult> {
  const sites = designReportSites(input.research);
  if (sites.length < MIN_DESIGN_REPORT_SITES) {
    return {
      ok: false,
      error: `Only ${sites.length} of ${MIN_DESIGN_REPORT_SITES} ${input.research.industry} websites returned a page. DeepSeek needs 50 real sites before design starts.`,
    };
  }
  const context = seedContext({ ...input, industry: input.research.industry });

  const notes = new Map<string, string>();
  const batches = await Promise.all(
    chunk(sites, 25).map((batch) => noteSites(context, batch)),
  );
  for (const batch of batches) {
    for (const [host, feature] of batch.notes) notes.set(host, feature);
  }
  let missing = sites.filter((snap) => !notes.has(snap.host));
  if (missing.length > 0) {
    const retry = await noteSites(context, missing);
    for (const [host, feature] of retry.notes) notes.set(host, feature);
    missing = sites.filter((snap) => !notes.has(snap.host));
  }
  if (missing.length > 0) {
    const firstError = batches.find((batch) => batch.error)?.error;
    return {
      ok: false,
      error:
        firstError ??
        `DeepSeek reviewed ${sites.length - missing.length} of ${MIN_DESIGN_REPORT_SITES} sites. Missing: ${missing
          .slice(0, 5)
          .map((snap) => snap.host)
          .join(", ")}.`,
    };
  }

  const sitesReviewed: DesignReportSiteNote[] = sites.map((snap) => ({
    host: snap.host,
    url: snap.url,
    bestFeature: notes.get(snap.host) ?? "",
  }));

  const blueprintCall = await generateWithDeepSeek({
    systemPrompt: BLUEPRINT_SYSTEM,
    userPrompt: `${context}\n\nBest feature of each of the ${sitesReviewed.length} sites you reviewed:\n${sitesReviewed
      .map((site) => `- ${site.host}: ${site.bestFeature}`)
      .join("\n")}\n\nRaw page facts:\n${sites.map(siteLine).join("\n")}`,
    maxTokens: 4000,
    temperature: 0.4,
  });
  if (!blueprintCall.ok) return { ok: false, error: blueprintCall.error };

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJsonText(blueprintCall.text)) as Record<
      string,
      unknown
    >;
  } catch {
    return { ok: false, error: "DeepSeek returned a report that was not JSON." };
  }

  const rawBlueprint = (parsed.blueprint ?? {}) as Record<string, unknown>;
  const blueprint = Object.fromEntries(
    DESIGN_BLUEPRINT_KEYS.map((key) => [key, clip(String(rawBlueprint[key] ?? ""), 800)]),
  ) as DesignBlueprint;
  const reviewedHosts = new Set(sitesReviewed.map((site) => site.host));
  const mustHaveFeatures: DesignReportFeature[] = (
    Array.isArray(parsed.mustHaveFeatures) ? parsed.mustHaveFeatures : []
  )
    .map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        feature: clip(String(item.feature ?? ""), 240),
        fromHost: String(item.fromHost ?? "").replace(/^www\./, "").trim(),
        why: clip(String(item.why ?? ""), 240),
      };
    })
    .filter((item) => item.feature && reviewedHosts.has(item.fromHost))
    .slice(0, 20);

  const report: DeepSeekDesignReport = {
    provider: "deepseek",
    model: blueprintCall.model,
    industry: input.research.industry,
    generatedAt: new Date().toISOString(),
    researchSearchedAt: input.research.searchedAt,
    sitesReviewed,
    summary: clip(String(parsed.summary ?? ""), 1200),
    blueprint,
    sectionOrder: stringList(parsed.sectionOrder, 14),
    mustHaveFeatures,
    avoid: stringList(parsed.avoid, 12),
  };
  const problem = designReportProblem(report, input.research);
  if (problem) return { ok: false, error: problem };
  return { ok: true, report };
}

/** Why a report fails the hard rule, or null when it passes. */
export function designReportProblem(
  report: DeepSeekDesignReport | null | undefined,
  research?: ComparableResearch | null,
): string | null {
  if (!report) return "No DeepSeek design report yet.";
  if (report.provider !== "deepseek") return "The design report did not come from DeepSeek.";
  const fetched = research ? new Set(fetchedCompetitorHosts(research)) : null;
  const reviewed = new Set(
    (report.sitesReviewed ?? [])
      .filter((site) => (site.bestFeature ?? "").trim().length >= 8)
      .map((site) => site.host)
      .filter((host) => !fetched || fetched.has(host)),
  );
  if (reviewed.size < MIN_DESIGN_REPORT_SITES) {
    return `DeepSeek reviewed ${reviewed.size} of ${MIN_DESIGN_REPORT_SITES} genre websites.`;
  }
  if (research && report.researchSearchedAt !== research.searchedAt) {
    return "The competitor crawl changed after the design report. DeepSeek must report again.";
  }
  const blank = DESIGN_BLUEPRINT_KEYS.filter(
    (key) => !(report.blueprint?.[key] ?? "").trim(),
  );
  if (blank.length > 0) {
    return `The design report is missing: ${blank.map((key) => BLUEPRINT_LABELS[key]).join(", ")}.`;
  }
  if (!report.summary?.trim()) return "The design report has no summary.";
  if ((report.mustHaveFeatures ?? []).length < MIN_DESIGN_REPORT_FEATURES) {
    return `The design report names ${(report.mustHaveFeatures ?? []).length} attributed features; it needs ${MIN_DESIGN_REPORT_FEATURES}.`;
  }
  return null;
}

export function designReportMeetsHardRule(
  report: DeepSeekDesignReport | null | undefined,
  research?: ComparableResearch | null,
): boolean {
  return designReportProblem(report, research) === null;
}

export function parseDesignReport(raw: string): DeepSeekDesignReport | null {
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as DeepSeekDesignReport;
    if (!parsed || parsed.provider !== "deepseek" || !Array.isArray(parsed.sitesReviewed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function designReportJson(report: DeepSeekDesignReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function designReportMarkdown(report: DeepSeekDesignReport): string {
  return `# How this website should be made — DeepSeek report

## HARD RULE

${DEEPSEEK_DESIGN_REPORT_RULE.summary}

Genre: ${report.industry} · Model: ${report.model} · Written: ${report.generatedAt}

## Summary

${report.summary}

## Blueprint

${DESIGN_BLUEPRINT_KEYS.map((key) => `### ${BLUEPRINT_LABELS[key]}\n\n${report.blueprint[key]}`).join("\n\n")}

## Section order

${report.sectionOrder.map((section, index) => `${index + 1}. ${section}`).join("\n") || "- (none)"}

## Must-have features (best of each site)

${report.mustHaveFeatures.map((item) => `- **${item.feature}** — from ${item.fromHost}. ${item.why}`).join("\n")}

## Avoid

${report.avoid.map((line) => `- ${line}`).join("\n") || "- (none)"}

## The ${report.sitesReviewed.length} websites DeepSeek reviewed

${report.sitesReviewed.map((site, index) => `${index + 1}. [${site.host}](${site.url}) — ${site.bestFeature}`).join("\n")}
`;
}
