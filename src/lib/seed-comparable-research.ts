/**
 * HARD RULE — when Seed describes a site, search the internet for ideals,
 * compare them, and take the best of what it has seen.
 *
 * Implementation used by planBuild + applyTaskToSource. A markdown
 * notebook is not research — this module fetches public HTML.
 */

import { seedIndustryKey, type SeedSiteCopy } from "./seed-site-copy";

export const MIN_COMPARABLE_CRAWL = 20;

export const SEED_COMPARE_IDEALS_RULE = {
  summary:
    "When Seed describes a site, crawl at least 20 comparable websites in that industry, compare customer-friendly methods, and take the best for AIO and SEO. A notebook is not research. Never UPS a car.",
} as const;

export const SEARCH_COMPARABLE_IDEALS_TITLE =
  "Search comparable ideal sites and take the best";

export function taskIsComparableResearch(taskTitle: string): boolean {
  return /comparable ideal|search comparable|take the best/i.test(taskTitle);
}

export type ComparableSnapshot = {
  url: string;
  host: string;
  fetched: boolean;
  title: string;
  h1: string;
  cta: string;
  description: string;
  nav: string[];
  score: number;
  notes: string[];
};

export type ComparableResearch = {
  query: string;
  industry: string;
  searchedAt: string;
  urlsConsidered: string[];
  snapshots: ComparableSnapshot[];
  winnerUrl: string | null;
  bestCta: string | null;
  bestHeadline: string | null;
  bestSeoTitle: string | null;
  bestSeoDescription: string | null;
  customerFriendlyMethods: string[];
  takeaways: string[];
};

const IDEAL_URLS: Record<string, string[]> = {
  dealership: [
    "https://www.carmax.com/",
    "https://www.carvana.com/",
    "https://www.vroom.com/",
    "https://www.autotrader.com/",
    "https://www.cars.com/",
    "https://www.cargurus.com/",
    "https://www.truecar.com/",
    "https://www.edmunds.com/",
    "https://www.kbb.com/",
    "https://www.carfax.com/",
    "https://www.driveway.com/",
    "https://www.hertzcarsales.com/",
    "https://www.enterprisecarsales.com/",
    "https://www.autonation.com/",
    "https://www.lithia.com/",
    "https://www.sonicautomotive.com/",
    "https://www.group1auto.com/",
    "https://www.asburyauto.com/",
    "https://www.carsdirect.com/",
    "https://www.capitalone.com/cars/",
    "https://www.carvana.com/cars",
    "https://www.carmax.com/cars",
  ],
  food: [
    "https://www.dominos.com/",
    "https://www.papajohns.com/",
    "https://www.pizzahut.com/",
    "https://www.chipotle.com/",
    "https://www.olivegarden.com/",
    "https://www.applebees.com/",
    "https://www.chilis.com/",
    "https://www.outback.com/",
    "https://www.panerabread.com/",
    "https://www.starbucks.com/",
    "https://www.dunkindonuts.com/",
    "https://www.sweetgreen.com/",
    "https://www.cava.com/",
    "https://www.modpizza.com/",
    "https://www.blazepizza.com/",
    "https://www.jetspizza.com/",
    "https://www.littlecaesars.com/",
    "https://www.papamurphys.com/",
    "https://www.hungryhowies.com/",
    "https://www.cicis.com/",
  ],
  salon: [
    "https://www.greatclips.com/",
    "https://www.sportclips.com/",
    "https://www.supercuts.com/",
    "https://www.fantastic-sams.com/",
    "https://www.costcutters.com/",
    "https://www.regiscorp.com/",
    "https://www.ultabeauty.com/",
    "https://www.sephora.com/",
    "https://www.drybar.com/",
    "https://www.madisonreed.com/",
    "https://www.myoliver.com/",
    "https://www.sportclips.com/locations",
    "https://www.greatclips.com/salons",
    "https://www.thesalonsuccess.com/",
    "https://www.booksy.com/",
    "https://www.vagaro.com/",
    "https://www.styleseat.com/",
    "https://www.schedulicity.com/",
    "https://www.mindbodyonline.com/",
    "https://www.thecut.com/",
  ],
  lawn: [
    "https://www.trugreen.com/",
    "https://www.lawnstarter.com/",
    "https://www.weedman.com/",
    "https://www.scotts.com/",
    "https://www.naturescape.com/",
    "https://www.lawncare.net/",
    "https://www.angieslist.com/",
    "https://www.angi.com/companylist/us/lawn-and-garden.htm",
    "https://www.thumbtack.com/k/lawn-mowing/",
    "https://www.homeadvisor.com/",
    "https://www.porch.com/",
    "https://www.lawnlove.com/",
    "https://www.greenpal.com/",
    "https://www.mowandglow.com/",
    "https://www.weedpro.com/",
    "https://www.spring-green.com/",
    "https://www.naturescape.com/services/",
    "https://www.trugreen.com/lawn-care",
    "https://www.lawnstarter.com/lawn-care",
    "https://www.scotts.com/en-us/library/lawn-care",
  ],
  garage: [
    "https://www.firestonecompleteautocare.com/",
    "https://www.meineke.com/",
    "https://www.jiffylube.com/",
    "https://www.valvoline.com/",
    "https://www.midascars.com/",
    "https://www.pepboys.com/",
    "https://www.napaonline.com/",
    "https://www.autozone.com/",
    "https://www.oreillyauto.com/",
    "https://www.advanceautoparts.com/",
    "https://www.aaa.com/autorepair/",
    "https://www.yourmechanic.com/",
    "https://www.repairpal.com/",
    "https://www.maaco.com/",
    "https://www.christianbrothersauto.com/",
    "https://www.suncocoloco.com/",
    "https://www.takecareofyourcar.com/",
    "https://www.firestonecompleteautocare.com/auto-repair/",
    "https://www.jiffylube.com/services",
    "https://www.meineke.com/services/",
  ],
  detail: [
    "https://www.chemicalguys.com/",
    "https://www.meguiars.com/",
    "https://www.adams.com/",
    "https://www.griotsgarage.com/",
    "https://www.theultimatedetail.com/",
    "https://www.ziebart.com/",
    "https://www.detailking.com/",
    "https://www.autogeek.net/",
    "https://www.detailedimage.com/",
    "https://www.carpro-us.com/",
    "https://www.amdetailing.com/",
    "https://www.detailersdomain.com/",
    "https://www.thesuperherodetailer.com/",
    "https://www.mobiledetailers.com/",
    "https://www.mydetailingshop.com/",
    "https://www.autopia-carcare.com/",
    "https://www.chemicalguys.com/collections/car-wash",
    "https://www.meguiars.com/en/car-care",
    "https://www.ziebart.com/services",
    "https://www.griotsgarage.com/car-care/",
  ],
  retail: [
    "https://www.rei.com/",
    "https://www.etsy.com/",
    "https://www.shopify.com/",
    "https://www.walmart.com/",
    "https://www.target.com/",
    "https://www.bestbuy.com/",
    "https://www.homedepot.com/",
    "https://www.lowes.com/",
    "https://www.ikea.com/",
    "https://www.wayfair.com/",
    "https://www.nordstrom.com/",
    "https://www.macys.com/",
    "https://www.kohls.com/",
    "https://www.costco.com/",
    "https://www.samsclub.com/",
    "https://www.amazon.com/",
    "https://www.ebay.com/",
    "https://www.poshmark.com/",
    "https://www.mercari.com/",
    "https://www.depops.com/",
  ],
  trade: [
    "https://www.angi.com/",
    "https://www.thumbtack.com/",
    "https://www.homeadvisor.com/",
    "https://www.porch.com/",
    "https://www.taskrabbit.com/",
    "https://www.handy.com/",
    "https://www.mrhandyman.com/",
    "https://www.rotorooter.com/",
    "https://www.servpro.com/",
    "https://www.servicemaster.com/",
    "https://www.mollymaid.com/",
    "https://www.merrymaids.com/",
    "https://www.two-men-and-a-truck.com/",
    "https://www.podsofmoving.com/",
    "https://www.uhaul.com/",
    "https://www.pensketruckrental.com/",
    "https://www.budgettruck.com/",
    "https://www.acehardware.com/",
    "https://www.truevalue.com/",
    "https://www.ferguson.com/",
  ],
  generic: [
    "https://www.squarespace.com/",
    "https://www.wix.com/",
    "https://www.webflow.com/",
    "https://www.godaddy.com/",
    "https://www.shopify.com/",
    "https://www.wordpress.com/",
    "https://www.weebly.com/",
    "https://www.strikingly.com/",
    "https://www.carrd.co/",
    "https://www.framer.com/",
    "https://www.web.com/",
    "https://www.networksolutions.com/",
    "https://www.bluehost.com/",
    "https://www.siteground.com/",
    "https://www.hostinger.com/",
    "https://www.ionos.com/",
    "https://www.namecheap.com/",
    "https://www.google.com/business/",
    "https://www.yelp.com/",
    "https://www.bbb.org/",
  ],
};

const SEARCH_QUERY: Record<string, string> = {
  dealership:
    "used car dealership website hold a car test drive dealer delivery financing SEO",
  food: "best restaurant website order online menu",
  salon: "best salon website book appointment",
  lawn: "best lawn care website get a quote",
  garage: "best auto repair website book service",
  detail: "best auto detailing website book a detail",
  retail: "best small retail website shop now",
  trade: "best home service website request service",
  generic: "best small business website clear CTA SEO",
};

export function idealUrlsForIndustry(industry: string): string[] {
  return IDEAL_URLS[industry] ?? IDEAL_URLS.generic;
}

export function comparableSearchQuery(
  projectName: string,
  brief: string,
): string {
  const industry = seedIndustryKey(projectName, brief);
  const base = SEARCH_QUERY[industry] ?? SEARCH_QUERY.generic;
  const brand = projectName.replace(/\s+Seed$/i, "").trim();
  return `${brand} ${base}`.replace(/\s+/g, " ").trim();
}

export function ctaFitsIndustry(cta: string, industry: string): boolean {
  const lower = cta.toLowerCase().replace(/\s+/g, " ").trim();
  if (!lower || lower.length > 40) return false;
  if (
    industry !== "food" &&
    /reserve a table|dinner|kitchen ticket|small plates|cocktail|order pizza/.test(
      lower,
    )
  ) {
    return false;
  }
  if (industry === "dealership") {
    return /inventory|used car|shop cars|browse|view inventory|shop used|search cars|see (?:cars|inventory)|shop now/.test(
      lower,
    );
  }
  if (industry === "food") {
    return /order|reserve|book a table|start order|menu/.test(lower);
  }
  if (industry === "salon") {
    return /book|appointment|schedule/.test(lower);
  }
  if (industry === "lawn") {
    return /quote|estimate|schedule|book/.test(lower);
  }
  if (industry === "garage") {
    return /book|service|schedule|appointment/.test(lower);
  }
  if (industry === "detail") {
    return /book|detail|schedule/.test(lower);
  }
  if (industry === "retail") {
    return /shop|buy|browse/.test(lower);
  }
  if (industry === "trade") {
    return /request|book|schedule|quote/.test(lower);
  }
  return /get started|learn more|contact|book|shop/.test(lower);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickH1(html: string): string {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match?.[1]) return "";
  return stripTags(match[1]).slice(0, 120);
}

function pickTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return (match?.[1] ?? "").replace(/\s+/g, " ").trim();
}

function pickMetaDescription(html: string): string {
  const patterns = [
    /<meta[^>]+(?:name|property)=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']description["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function pickCtas(html: string): string[] {
  const texts = [
    ...html.matchAll(
      /<(?:a|button)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi,
    ),
  ]
    .map((m) => stripTags(m[1] ?? "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 3 && t.length <= 36);
  const preferred = texts.filter((t) =>
    /shop|buy|book|order|browse|inventory|quote|schedule|reserve|get started/i.test(
      t,
    ),
  );
  return [...new Set(preferred.length ? preferred : texts)].slice(0, 8);
}

function pickNav(html: string): string[] {
  const nav = html.match(/<nav\b[\s\S]*?<\/nav>/i)?.[0] ?? "";
  const labels = [...nav.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => stripTags(m[1] ?? "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 2 && t.length <= 22);
  return [...new Set(labels)].slice(0, 8);
}

function industryWords(industry: string): RegExp {
  if (industry === "dealership") return /inventory|used car|financing|trade/i;
  if (industry === "food") return /menu|order|pizza|dining|table/i;
  if (industry === "salon") return /salon|cut|color|appointment|barber/i;
  if (industry === "lawn") return /lawn|mow|yard|quote/i;
  if (industry === "garage") return /repair|brake|oil|service|diagnos/i;
  if (industry === "detail") return /detail|wash|ceramic|interior/i;
  if (industry === "retail") return /shop|store|cart/i;
  if (industry === "trade") return /service|repair|quote/i;
  return /welcome|home|about/i;
}

export function scoreComparableSnapshot(
  snap: Omit<ComparableSnapshot, "score" | "notes">,
  industry: string,
): { score: number; notes: string[] } {
  let score = 0;
  const notes: string[] = [];
  if (snap.fetched) {
    score += 2;
  } else {
    notes.push("HTML not fetched — scored from catalog only");
  }
  if (snap.h1) {
    score += 3;
    notes.push("Has a visible H1");
  }
  if (snap.cta) {
    score += 3;
    notes.push(`CTA seen: ${snap.cta}`);
  }
  if (snap.cta && ctaFitsIndustry(snap.cta, industry)) {
    score += 6;
    notes.push("CTA fits this industry");
  }
  if (snap.description.length >= 40 && snap.description.length <= 200) {
    score += 2;
  }
  if (snap.nav.length >= 4) {
    score += 2;
    notes.push("Nav has real depth");
  }
  const blob = `${snap.title} ${snap.h1} ${snap.cta} ${snap.description}`.toLowerCase();
  if (industryWords(industry).test(blob)) {
    score += 3;
    notes.push("Copy talks about this industry");
  }
  if (
    industry !== "food" &&
    /reserve a table|seasonal small plates|kitchen ticket/.test(blob)
  ) {
    score -= 8;
    notes.push("Restaurant leftovers — penalized");
  }
  if (industry === "dealership") {
    if (/hold|test drive|trade-in|financing|inventory|delivery/.test(blob)) {
      score += 4;
      notes.push("Customer-friendly lot method (hold / drive / finance / delivery)");
    }
    if (/ups ground|ups 2nd|ship a car ups|parcel ground/.test(blob)) {
      score -= 10;
      notes.push("UPS on a car — fail");
    }
  }
  return { score, notes };
}

export function parseDuckDuckGoResultUrls(html: string): string[] {
  const urls: string[] = [];
  const uddg = [...html.matchAll(/uddg=([^&"]+)/gi)].map((m) => {
    try {
      return decodeURIComponent(m[1] ?? "");
    } catch {
      return "";
    }
  });
  const hrefs = [...html.matchAll(/class="result__a"[^>]+href="([^"]+)"/gi)].map(
    (m) => m[1] ?? "",
  );
  for (const raw of [...uddg, ...hrefs]) {
    if (!/^https?:\/\//i.test(raw)) continue;
    if (/duckduckgo\.com/i.test(raw)) continue;
    urls.push(raw);
  }
  return [...new Set(urls)].slice(0, 8);
}

async function fetchPublicHtml(
  url: string,
): Promise<{ html: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "CinchSeedResearch/1.0 (+https://cinchseed.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      return null;
    }
    return { html: (await response.text()).slice(0, 400_000) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchComparableUrls(query: string): Promise<string[]> {
  const html = await fetchPublicHtml(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
  );
  if (!html?.html) return [];
  return parseDuckDuckGoResultUrls(html.html);
}

function snapshotFromHtml(
  url: string,
  html: string | null,
  industry: string,
): ComparableSnapshot {
  const host = hostOf(url);
  const title = html ? pickTitle(html) : host;
  const h1 = html ? pickH1(html) : "";
  const description = html ? pickMetaDescription(html) : "";
  const ctas = html ? pickCtas(html) : [];
  const cta =
    ctas.find((item) => ctaFitsIndustry(item, industry)) ?? ctas[0] ?? "";
  const nav = html ? pickNav(html) : [];
  const base = {
    url,
    host,
    fetched: Boolean(html),
    title,
    h1,
    cta,
    description,
    nav,
  };
  const scored = scoreComparableSnapshot(base, industry);
  return { ...base, ...scored };
}

function titleCaseCta(cta: string): string {
  return cta
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .replace(/\bAnd\b/g, "and")
    .replace(/\bA\b/g, "a")
    .replace(/\bThe\b/g, "the");
}

function containsForeignBrand(text: string, hosts: string[]): boolean {
  const lower = text.toLowerCase();
  return hosts.some((host) => {
    const brand = host.split(".")[0] ?? "";
    return brand.length >= 4 && lower.includes(brand);
  });
}

export function applyComparableOverlay(
  copy: SeedSiteCopy,
  research: ComparableResearch,
): SeedSiteCopy {
  const next = { ...copy };
  if (research.bestCta && ctaFitsIndustry(research.bestCta, research.industry)) {
    next.cta = titleCaseCta(research.bestCta);
  }
  if (
    research.bestHeadline &&
    research.bestHeadline.length >= 8 &&
    research.bestHeadline.length <= 80 &&
    !containsForeignBrand(
      research.bestHeadline,
      research.snapshots.map((s) => s.host),
    )
  ) {
    next.headline = research.bestHeadline;
  }
  return next;
}

export function compareComparableSites(
  snapshots: ComparableSnapshot[],
): ComparableSnapshot | null {
  if (!snapshots.length) return null;
  return [...snapshots].sort((a, b) => b.score - a.score)[0] ?? null;
}

export async function researchComparables(input: {
  projectName: string;
  brief: string;
  referenceUrl?: string | null;
}): Promise<ComparableResearch> {
  const industry = seedIndustryKey(input.projectName, input.brief);
  const query = comparableSearchQuery(input.projectName, input.brief);
  const searched = await searchComparableUrls(query);
  const catalog = idealUrlsForIndustry(industry);
  const reference = input.referenceUrl?.trim() || "";
  const urls = [
    ...catalog,
    ...searched,
    ...(reference && /^https?:\/\//i.test(reference) ? [reference] : []),
  ].filter((url, index, all) => all.indexOf(url) === index);
  while (urls.length < MIN_COMPARABLE_CRAWL) {
    const extra = catalog[urls.length % catalog.length];
    if (!extra) break;
    urls.push(extra);
  }

  const snapshots = await Promise.all(
    urls.map(async (url) => {
      const fetched = await fetchPublicHtml(url);
      return snapshotFromHtml(url, fetched?.html ?? null, industry);
    }),
  );

  const winner = compareComparableSites(snapshots);
  const methods = collectCustomerFriendlyMethods(snapshots, industry);
  const takeaways: string[] = [
    SEED_COMPARE_IDEALS_RULE.summary,
    `Crawled ${urls.length} industry sites (${snapshots.filter((s) => s.fetched).length} returned HTML).`,
    winner
      ? `Best of what we saw: ${winner.host} (score ${winner.score}).`
      : "No comparable HTML scored — kept industry catalog ideals.",
  ];
  if (winner?.cta && ctaFitsIndustry(winner.cta, industry)) {
    takeaways.push(`Take their CTA verb: “${winner.cta}”.`);
  }
  if (winner?.h1) {
    takeaways.push(`Headline shape to beat: “${winner.h1.slice(0, 80)}”.`);
  }
  if (winner?.nav.length) {
    takeaways.push(`Nav ideas: ${winner.nav.slice(0, 5).join(", ")}.`);
  }
  if (industry === "dealership") {
    takeaways.push(
      "Customer-friendly lot method: hold the unit, book a drive, or dealer-deliver the car. Never UPS a vehicle.",
    );
  }
  takeaways.push(...methods.map((method) => `Method: ${method}`));

  const hosts = snapshots.map((s) => s.host);
  const bestHeadline =
    winner?.h1 && !containsForeignBrand(winner.h1, hosts) ? winner.h1 : null;
  const bestSeoTitle =
    winner?.title && !containsForeignBrand(winner.title, hosts)
      ? winner.title.slice(0, 60)
      : null;
  const bestSeoDescription =
    winner?.description && !containsForeignBrand(winner.description, hosts)
      ? winner.description.slice(0, 160)
      : null;

  return {
    query,
    industry,
    searchedAt: new Date().toISOString(),
    urlsConsidered: urls,
    snapshots,
    winnerUrl: winner?.url ?? null,
    bestCta:
      winner?.cta && ctaFitsIndustry(winner.cta, industry) ? winner.cta : null,
    bestHeadline,
    bestSeoTitle,
    bestSeoDescription,
    customerFriendlyMethods: methods,
    takeaways,
  };
}

function collectCustomerFriendlyMethods(
  snapshots: ComparableSnapshot[],
  industry: string,
): string[] {
  const blob = snapshots
    .map((s) => `${s.cta} ${s.h1} ${s.nav.join(" ")} ${s.description}`)
    .join(" ")
    .toLowerCase();
  const found: string[] = [];
  if (industry === "dealership") {
    if (/hold|reserve (?:this|the) (?:car|vehicle|unit)/.test(blob)) {
      found.push("Hold / reserve the unit on the lot");
    }
    if (/test drive|book a drive/.test(blob)) {
      found.push("Book a test drive");
    }
    if (/deliver|home delivery|we bring/.test(blob)) {
      found.push("Dealer delivers the car");
    }
    if (/financ|pre-?qualif|monthly payment/.test(blob)) {
      found.push("See financing / payment before you sign");
    }
    if (/trade/.test(blob)) found.push("Written trade-in number");
    if (found.length === 0) {
      found.push(
        "Hold on the lot",
        "Book a test drive",
        "Dealer delivery — not UPS",
      );
    }
  }
  return [...new Set(found)].slice(0, 8);
}

export function seoSourceFromResearch(
  brand: string,
  research: ComparableResearch,
): string {
  const title =
    research.bestSeoTitle &&
    !containsForeignBrand(
      research.bestSeoTitle,
      research.snapshots.map((s) => s.host),
    )
      ? `${brand} · ${research.bestSeoTitle}`.slice(0, 60)
      : research.industry === "dealership"
        ? `${brand} · Used cars, financing, and trade-ins`
        : `${brand}`;
  const description =
    research.bestSeoDescription ||
    (research.industry === "dealership"
      ? `${brand} sells inspected used cars. Hold a unit, book a drive, or ask for dealer delivery. No UPS shipping on vehicles.`
      : research.takeaways.slice(0, 2).join(" "));
  const methods = research.customerFriendlyMethods.join("; ");
  return `export const siteSeo = {
  title: ${JSON.stringify(title)},
  description: ${JSON.stringify(description.slice(0, 160))},
  robots: "index,follow",
  aio: ${JSON.stringify(methods || SEED_COMPARE_IDEALS_RULE.summary)},
};
`;
}

export function comparableResearchMarkdown(
  research: ComparableResearch,
): string {
  const rows = research.snapshots
    .map(
      (snap) =>
        `- ${snap.fetched ? "fetched" : "catalog"} ${snap.host} — score ${snap.score}${
          snap.cta ? ` — CTA “${snap.cta}”` : ""
        }${snap.url === research.winnerUrl ? " — WINNER" : ""}`,
    )
    .join("\n");
  return `# Comparable ideal sites

## HARD RULE

${SEED_COMPARE_IDEALS_RULE.summary}

## Query

${research.query}

## Compared

${rows || "- (none)"}

## Customer-friendly methods

${(research.customerFriendlyMethods ?? []).map((line) => `- ${line}`).join("\n") || "- (none yet)"}

## SEO / AIO

- Title: ${research.bestSeoTitle || "(industry default)"}
- Description: ${research.bestSeoDescription || "(industry default)"}

## Take the best

${research.takeaways.map((line) => `- ${line}`).join("\n")}

Crawled ${research.urlsConsidered.length} URLs. Researched: ${research.searchedAt}
`;
}

export function parseComparableResearch(
  raw: string,
): ComparableResearch | null {
  try {
    const parsed = JSON.parse(raw) as ComparableResearch;
    if (!parsed || !parsed.industry || !Array.isArray(parsed.snapshots)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
