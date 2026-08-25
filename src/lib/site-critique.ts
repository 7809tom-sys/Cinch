import { SEED_SITE_PRICE_USD } from "./site-url";
import { formatUsd } from "./pricing";

export type CritiqueSeverity = "high" | "medium" | "low" | "strength";

export type SiteCritiqueFinding = {
  area: string;
  severity: CritiqueSeverity;
  note: string;
};

export type SiteBuildEstimate = {
  pageCount: number;
  minutesMin: number;
  minutesMax: number;
  /** Estimated provider/API cost to build (before retail markup) */
  buildCostMinUsd: number;
  buildCostMaxUsd: number;
  seedPriceUsd: number;
  /** Short line for the purchase UI */
  summaryLabel: string;
};

export type SiteCritique = {
  url: string;
  title: string;
  fetched: boolean;
  fetchNote: string | null;
  pageCountEstimate: number;
  overview: string;
  findings: SiteCritiqueFinding[];
  improvements: string[];
  estimate: SiteBuildEstimate;
  critiquedAt: string;
};

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickMeta(html: string, name: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) ?? []).length;
}

/**
 * Rough build sizing for a typical small-business site.
 * Tuned for 6–7 page Seeds (~15–25 min, ~$6–12 API).
 */
export function estimateBuildForPages(pageCount: number): SiteBuildEstimate {
  const pages = Math.max(1, Math.min(20, Math.round(pageCount)));

  let minutesMin: number;
  let minutesMax: number;
  let buildCostMinUsd: number;
  let buildCostMaxUsd: number;

  if (pages <= 3) {
    minutesMin = 8;
    minutesMax = 12;
    buildCostMinUsd = 3;
    buildCostMaxUsd = 6;
  } else if (pages <= 5) {
    minutesMin = 12;
    minutesMax = 18;
    buildCostMinUsd = 5;
    buildCostMaxUsd = 10;
  } else if (pages <= 7) {
    minutesMin = 15;
    minutesMax = 25;
    buildCostMinUsd = 6;
    buildCostMaxUsd = 12;
  } else {
    minutesMin = 20;
    minutesMax = 35;
    buildCostMinUsd = 10;
    buildCostMaxUsd = 18;
  }

  const midMinutes = Math.round((minutesMin + minutesMax) / 2);
  const costLabel =
    buildCostMinUsd === buildCostMaxUsd
      ? formatUsd(buildCostMinUsd)
      : `${formatUsd(buildCostMinUsd)}–${formatUsd(buildCostMaxUsd)}`;

  return {
    pageCount: pages,
    minutesMin,
    minutesMax,
    buildCostMinUsd,
    buildCostMaxUsd,
    seedPriceUsd: SEED_SITE_PRICE_USD,
    summaryLabel: `~${midMinutes} min · est. ${costLabel} to build · Seed ${formatUsd(SEED_SITE_PRICE_USD)}`,
  };
}

function estimatePageCountFromHtml(html: string, baseUrl: string): number {
  const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) =>
    (m[1] ?? "").trim(),
  );
  const origins = new Set<string>();
  let baseOrigin = "";
  try {
    baseOrigin = new URL(baseUrl).origin;
  } catch {
    baseOrigin = "";
  }

  for (const href of hrefs) {
    try {
      const absolute = new URL(href, baseUrl);
      if (baseOrigin && absolute.origin !== baseOrigin) continue;
      const path = absolute.pathname.replace(/\/+$/, "") || "/";
      if (
        path.match(
          /\.(css|js|png|jpe?g|gif|svg|webp|ico|pdf|xml|json|woff2?)$/i,
        )
      ) {
        continue;
      }
      origins.add(path.toLowerCase());
    } catch {
      // ignore bad hrefs
    }
  }

  // Home + unique internal paths, capped for small-business sites.
  const counted = Math.max(1, Math.min(12, origins.size || 1));
  // Many marketing sites under-link; bias toward a 5–7 page Seed when sparse.
  if (counted <= 2) return 6;
  if (counted <= 4) return Math.max(counted, 5);
  return counted;
}

function buildFindings(input: {
  html: string;
  text: string;
  title: string;
  description: string | null;
}): SiteCritiqueFinding[] {
  const { html, text, title, description } = input;
  const findings: SiteCritiqueFinding[] = [];
  const lower = html.toLowerCase();

  if (!title || title.length < 3) {
    findings.push({
      area: "Brand",
      severity: "high",
      note: "No clear page title — the brand signal is weak in the browser tab and search results.",
    });
  } else if (title.length < 12) {
    findings.push({
      area: "Brand",
      severity: "medium",
      note: `Title “${title}” is thin. A stronger brand-first title would help.`,
    });
  } else {
    findings.push({
      area: "Brand",
      severity: "strength",
      note: `Title “${title}” gives visitors an immediate brand cue.`,
    });
  }

  if (!description || description.length < 40) {
    findings.push({
      area: "SEO",
      severity: "medium",
      note: "Missing or short meta description — search snippets will look thin.",
    });
  } else {
    findings.push({
      area: "SEO",
      severity: "strength",
      note: "Meta description is present and can carry into the improved Seed.",
    });
  }

  if (!/name=["']viewport["']/i.test(html)) {
    findings.push({
      area: "Mobile",
      severity: "high",
      note: "No viewport meta tag detected — mobile layout may break.",
    });
  }

  const h1Count = countMatches(html, /<h1\b/gi);
  if (h1Count === 0) {
    findings.push({
      area: "Hierarchy",
      severity: "medium",
      note: "No H1 found — the first viewport likely lacks a clear headline.",
    });
  } else if (h1Count > 2) {
    findings.push({
      area: "Hierarchy",
      severity: "low",
      note: "Multiple H1s compete for attention; we’ll simplify the landing story.",
    });
  }

  const hasCta =
    /\b(get started|contact|book|buy|shop|call|schedule|sign up|start)\b/i.test(
      text,
    ) || /<(a|button)[^>]*>[^<]*(start|contact|book|buy|call)[^<]*</i.test(html);
  if (!hasCta) {
    findings.push({
      area: "CTA",
      severity: "high",
      note: "No obvious call-to-action language — visitors may not know the next step.",
    });
  } else {
    findings.push({
      area: "CTA",
      severity: "strength",
      note: "CTA language is present; we’ll keep one primary path on the new Seed.",
    });
  }

  if (
    lower.includes("wordpress") ||
    lower.includes("wp-content") ||
    lower.includes("shopify") ||
    lower.includes("wix.com") ||
    lower.includes("squarespace")
  ) {
    findings.push({
      area: "Platform",
      severity: "low",
      note: "Looks like a common site builder/CMS — Seed can rebuild a cleaner durable core off-server.",
    });
  }

  const scriptHeavy = countMatches(html, /<script\b/gi);
  if (scriptHeavy > 25) {
    findings.push({
      area: "Speed",
      severity: "medium",
      note: `Heavy script load (~${scriptHeavy} tags). We’ll aim for a leaner front page.`,
    });
  }

  if (text.length < 280) {
    findings.push({
      area: "Content",
      severity: "medium",
      note: "Very little readable copy on the landing page — trust and offer clarity will need work.",
    });
  }

  if (findings.length < 3) {
    findings.push({
      area: "Opportunity",
      severity: "medium",
      note: "Solid base to improve — we’ll strengthen brand-first hero, navigation, and conversion path.",
    });
  }

  return findings;
}

function improvementsFromFindings(
  findings: SiteCritiqueFinding[],
  pageCount: number,
): string[] {
  const improvements = [
    `Rebuild as a focused ~${pageCount}-page Seed with a brand-first hero and one clear CTA.`,
    "Keep Seed outside the live server so updates and restore stay available if hosting fails.",
  ];
  for (const finding of findings) {
    if (finding.severity === "strength") continue;
    if (finding.area === "Brand") {
      improvements.push("Make the brand the dominant first-viewport signal.");
    } else if (finding.area === "CTA") {
      improvements.push("Put a single primary action above the fold.");
    } else if (finding.area === "Mobile") {
      improvements.push("Ship a mobile-first layout with a proper viewport.");
    } else if (finding.area === "SEO") {
      improvements.push("Write titles and meta that match each page’s job.");
    } else if (finding.area === "Speed") {
      improvements.push("Cut unnecessary scripts and keep the first paint light.");
    } else if (finding.area === "Content") {
      improvements.push("Clarify offer, proof, and next step in plain language.");
    }
  }
  return [...new Set(improvements)].slice(0, 6);
}

async function fetchSiteHtml(
  url: string,
): Promise<{ html: string; note: string | null } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "CinchSeedCritique/1.0 (+https://cinchseed.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      return {
        html: "",
        note: "URL did not return HTML — estimate uses a typical 6-page Seed.",
      };
    }
    const html = (await response.text()).slice(0, 400_000);
    return { html, note: null };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Critique a public URL and size the Seed build (time + cost). */
export async function critiqueWebsite(rawUrl: string): Promise<SiteCritique> {
  const url = rawUrl.trim();
  const fetched = await fetchSiteHtml(url);
  const critiquedAt = new Date().toISOString();

  if (!fetched || !fetched.html) {
    const pageCountEstimate = 6;
    const estimate = estimateBuildForPages(pageCountEstimate);
    const findings: SiteCritiqueFinding[] = [
      {
        area: "Access",
        severity: "medium",
        note:
          fetched?.note ||
          "We couldn’t fully read the live HTML (blocked, slow, or non-HTML). Critique uses a typical small-business baseline.",
      },
      {
        area: "Opportunity",
        severity: "medium",
        note: "We’ll improve brand-first landing, clearer CTA, and a durable off-server Seed core.",
      },
      {
        area: "Structure",
        severity: "low",
        note: "Assuming a ~6-page site (home, about, services, proof, contact, plus one more).",
      },
    ];
    return {
      url,
      title: safeHostname(url),
      fetched: false,
      fetchNote: fetched?.note ?? "Live HTML unavailable for deep parse.",
      pageCountEstimate,
      overview:
        "We’ll treat this as a typical 6-page small-business site and rebuild an improved Seed from the reference URL.",
      findings,
      improvements: improvementsFromFindings(findings, pageCountEstimate),
      estimate,
      critiquedAt,
    };
  }

  const html = fetched.html;
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = (titleMatch?.[1] ?? "").replace(/\s+/g, " ").trim() || safeHostname(url);
  const description =
    pickMeta(html, "description") || pickMeta(html, "og:description");
  const text = stripTags(html).slice(0, 8000);
  const pageCountEstimate = estimatePageCountFromHtml(html, url);
  const findings = buildFindings({ html, text, title, description });
  const estimate = estimateBuildForPages(pageCountEstimate);
  const issueCount = findings.filter((f) => f.severity !== "strength").length;

  return {
    url,
    title,
    fetched: true,
    fetchNote: fetched.note,
    pageCountEstimate,
    overview: `We reviewed ${title} and see about ${pageCountEstimate} pages worth of structure, with ${issueCount} improvement area${issueCount === 1 ? "" : "s"} to tackle in the new Seed.`,
    findings,
    improvements: improvementsFromFindings(findings, pageCountEstimate),
    estimate,
    critiquedAt,
  };
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Reference site";
  }
}

export function critiqueToBrief(critique: SiteCritique): string {
  const findingLines = critique.findings
    .map((f) => `- [${f.severity}] ${f.area}: ${f.note}`)
    .join("\n");
  const improveLines = critique.improvements.map((item) => `- ${item}`).join("\n");
  return [
    `Customer dropped ${critique.url} for critique-and-rebuild.`,
    critique.overview,
    `Build estimate: ${critique.estimate.summaryLabel}`,
    "",
    "Critique findings:",
    findingLines,
    "",
    "Improve by:",
    improveLines,
  ].join("\n");
}
