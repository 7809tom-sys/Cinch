/**
 * HARD RULE — when Seed describes a site, crawl at least 20 competitor
 * websites in that industry and take the best of EACH: CTA from one,
 * headline from another, fulfillment from a third, SEO/AIO from the set.
 * A notebook is not research — this module fetches public HTML.
 */

import {
  seedIndustryKey,
  type SeedShopCopy,
  type SeedSiteCopy,
} from "./seed-site-copy";

export const MIN_COMPARABLE_CRAWL = 20;

export const SEED_COMPARE_IDEALS_RULE = {
  summary:
    "HARD-CODED: crawl at least 20 competitor websites in this industry and take the best of EACH — CTA, headline, fulfillment, and SEO/AIO from different sites. A notebook is not research. Never UPS a car.",
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

export type BestOfPiece = {
  value: string;
  fromHost: string;
  fromUrl: string;
};

export type BestOfEach = {
  cta: BestOfPiece | null;
  headline: BestOfPiece | null;
  seoTitle: BestOfPiece | null;
  seoDescription: BestOfPiece | null;
  nav: BestOfPiece | null;
  methods: BestOfPiece[];
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
  bestOfEach?: BestOfEach;
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
    "https://www.thesaltcave.com/",
    "https://www.mytime.com/",
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
    "https://www.lawncare.com/",
    "https://www.milorganite.com/",
    "https://www.pennington.com/",
    "https://www.natureslawn.com/",
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
    "https://www.aamco.com/",
    "https://www.monro.com/",
    "https://www.bridgestonetire.com/",
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
    "https://www.adamspolishes.com/",
    "https://www.mothers.com/",
    "https://www.turtlewax.com/",
    "https://www.p21s.com/",
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

export function uniqueCompetitorHosts(urls: string[]): string[] {
  return [...new Set(urls.map((url) => hostOf(url)).filter(Boolean))];
}

export function researchMeetsHardRule(
  research: ComparableResearch | null | undefined,
): boolean {
  if (!research) return false;
  return (
    uniqueCompetitorHosts(research.urlsConsidered).length >= MIN_COMPARABLE_CRAWL
  );
}

function uniqueUrlsByHost(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const host = hostOf(url);
    if (!host || seen.has(host)) continue;
    seen.add(host);
    out.push(url);
  }
  return out;
}

export function composeBestOfEach(
  snapshots: ComparableSnapshot[],
  industry: string,
): BestOfEach {
  const ranked = [...snapshots].sort((a, b) => b.score - a.score);
  const used = new Set<string>();
  const otherHosts = (self: string) =>
    snapshots.map((item) => item.host).filter((host) => host && host !== self);

  function take(
    pick: (snap: ComparableSnapshot) => string,
  ): BestOfPiece | null {
    const unused = ranked.filter((snap) => !used.has(snap.host));
    for (const snap of [...unused, ...ranked]) {
      const value = pick(snap).replace(/\s+/g, " ").trim();
      if (!value) continue;
      if (containsForeignBrand(value, otherHosts(snap.host))) continue;
      used.add(snap.host);
      return { value, fromHost: snap.host, fromUrl: snap.url };
    }
    return null;
  }

  return {
    cta: take((snap) =>
      snap.cta && ctaFitsIndustry(snap.cta, industry) ? snap.cta : "",
    ),
    headline: take((snap) =>
      snap.h1.length >= 8 && snap.h1.length <= 80 ? snap.h1 : "",
    ),
    seoTitle: take((snap) =>
      snap.title.length >= 8 ? snap.title.slice(0, 60) : "",
    ),
    seoDescription: take((snap) =>
      snap.description.length >= 40 ? snap.description.slice(0, 160) : "",
    ),
    nav: take((snap) =>
      snap.nav.length >= 3 ? snap.nav.slice(0, 6).join(", ") : "",
    ),
    methods: collectAttributedMethods(ranked, industry),
  };
}

export function applyComparableOverlay(
  copy: SeedSiteCopy,
  research: ComparableResearch,
): SeedSiteCopy {
  const next = { ...copy };
  const cta = research.bestOfEach?.cta?.value ?? research.bestCta;
  const headline = research.bestOfEach?.headline?.value ?? research.bestHeadline;
  if (cta && ctaFitsIndustry(cta, research.industry)) {
    next.cta = titleCaseCta(cta);
  }
  if (
    headline &&
    headline.length >= 8 &&
    headline.length <= 80 &&
    !containsForeignBrand(
      headline,
      research.snapshots.map((snap) => snap.host),
    )
  ) {
    next.headline = headline;
  }
  const methods = research.customerFriendlyMethods;
  if (research.industry === "dealership" && methods.length > 0) {
    next.support = `Inspected used cars with the price on the card. ${methods.slice(0, 3).join(". ")}.`;
    next.aboutBody = next.support;
    next.bookHeadline = "Hold a car or book a drive";
  }
  return next;
}

export function applyComparableOverlayToShop(
  shop: SeedShopCopy,
  research: ComparableResearch | null,
): SeedShopCopy {
  if (!research || research.industry !== "dealership") return shop;
  const methods = research.customerFriendlyMethods;
  if (!methods.length) return shop;
  return {
    ...shop,
    support: `Inspected units from this lot — ${methods.slice(0, 3).join(" · ")}. We do not ship cars UPS.`,
  };
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
  const urls = uniqueUrlsByHost([
    ...catalog,
    ...searched,
    ...(reference && /^https?:\/\//i.test(reference) ? [reference] : []),
  ]);
  for (const extra of catalog) {
    if (urls.length >= MIN_COMPARABLE_CRAWL) break;
    if (!urls.includes(extra)) urls.push(extra);
  }

  const snapshots = await Promise.all(
    urls.map(async (url) => {
      const fetched = await fetchPublicHtml(url);
      return snapshotFromHtml(url, fetched?.html ?? null, industry);
    }),
  );

  const winner = compareComparableSites(snapshots);
  const bestOfEach = composeBestOfEach(snapshots, industry);
  const methods = bestOfEach.methods.map((piece) => piece.value);
  const takeaways: string[] = [
    SEED_COMPARE_IDEALS_RULE.summary,
    `Crawled ${uniqueCompetitorHosts(urls).length} competitor hosts (${snapshots.filter((s) => s.fetched).length} returned HTML).`,
  ];
  if (bestOfEach.cta) {
    takeaways.push(
      `Best CTA from ${bestOfEach.cta.fromHost}: “${bestOfEach.cta.value}”.`,
    );
  }
  if (bestOfEach.headline) {
    takeaways.push(
      `Best headline from ${bestOfEach.headline.fromHost}: “${bestOfEach.headline.value.slice(0, 80)}”.`,
    );
  }
  if (bestOfEach.seoTitle) {
    takeaways.push(
      `Best SEO title from ${bestOfEach.seoTitle.fromHost}: “${bestOfEach.seoTitle.value}”.`,
    );
  }
  if (bestOfEach.nav) {
    takeaways.push(
      `Best nav from ${bestOfEach.nav.fromHost}: ${bestOfEach.nav.value}.`,
    );
  }
  if (industry === "dealership") {
    takeaways.push(
      "Customer-friendly lot method: hold the unit, book a drive, or dealer-deliver the car. Never UPS a vehicle.",
    );
  }
  takeaways.push(
    ...bestOfEach.methods.map(
      (piece) => `Best method from ${piece.fromHost}: ${piece.value}`,
    ),
  );
  if (winner) {
    takeaways.push(`Highest overall score: ${winner.host} (${winner.score}).`);
  }

  return {
    query,
    industry,
    searchedAt: new Date().toISOString(),
    urlsConsidered: urls,
    snapshots,
    winnerUrl: winner?.url ?? null,
    bestCta: bestOfEach.cta?.value ?? null,
    bestHeadline: bestOfEach.headline?.value ?? null,
    bestSeoTitle: bestOfEach.seoTitle?.value ?? null,
    bestSeoDescription: bestOfEach.seoDescription?.value ?? null,
    customerFriendlyMethods: methods,
    bestOfEach,
    takeaways,
  };
}

function collectAttributedMethods(
  snapshots: ComparableSnapshot[],
  industry: string,
): BestOfPiece[] {
  const patterns: { test: RegExp; value: string }[] =
    industry === "dealership"
      ? [
          {
            test: /hold|reserve (?:this|the)? ?(?:car|vehicle|unit)/,
            value: "Hold / reserve the unit on the lot",
          },
          {
            test: /test drive|book a drive/,
            value: "Book a test drive",
          },
          {
            test: /deliver|home delivery|we bring/,
            value: "Dealer delivers the car",
          },
          {
            test: /financ|pre-?qualif|monthly payment/,
            value: "See financing before you sign",
          },
          {
            test: /trade/,
            value: "Written trade-in number",
          },
          {
            test: /inspect|certified|carfax/,
            value: "Inspected history on the card",
          },
        ]
      : industry === "food"
        ? [
            { test: /order online|start order/, value: "Order online" },
            { test: /pickup|carryout/, value: "Pickup at the counter" },
            { test: /deliver/, value: "Local delivery" },
          ]
        : [];

  const found: BestOfPiece[] = [];
  const seen = new Set<string>();
  for (const snap of snapshots) {
    const blob =
      `${snap.cta} ${snap.h1} ${snap.nav.join(" ")} ${snap.description}`.toLowerCase();
    for (const pattern of patterns) {
      if (seen.has(pattern.value)) continue;
      if (!pattern.test.test(blob)) continue;
      seen.add(pattern.value);
      found.push({
        value: pattern.value,
        fromHost: snap.host,
        fromUrl: snap.url,
      });
    }
  }
  if (industry === "dealership" && found.length === 0) {
    return [
      {
        value: "Hold on the lot",
        fromHost: "industry-default",
        fromUrl: "",
      },
      {
        value: "Book a test drive",
        fromHost: "industry-default",
        fromUrl: "",
      },
      {
        value: "Dealer delivery — not UPS",
        fromHost: "industry-default",
        fromUrl: "",
      },
    ];
  }
  return found.slice(0, 8);
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

## Best of each competitor

${
  research.bestOfEach
    ? [
        research.bestOfEach.cta &&
          `- CTA from ${research.bestOfEach.cta.fromHost}: “${research.bestOfEach.cta.value}”`,
        research.bestOfEach.headline &&
          `- Headline from ${research.bestOfEach.headline.fromHost}: “${research.bestOfEach.headline.value}”`,
        research.bestOfEach.seoTitle &&
          `- SEO title from ${research.bestOfEach.seoTitle.fromHost}: “${research.bestOfEach.seoTitle.value}”`,
        research.bestOfEach.seoDescription &&
          `- SEO description from ${research.bestOfEach.seoDescription.fromHost}: “${research.bestOfEach.seoDescription.value}”`,
        research.bestOfEach.nav &&
          `- Nav from ${research.bestOfEach.nav.fromHost}: ${research.bestOfEach.nav.value}`,
        ...research.bestOfEach.methods.map(
          (piece) => `- Method from ${piece.fromHost}: ${piece.value}`,
        ),
      ]
        .filter(Boolean)
        .join("\n")
    : "- (compose after crawl)"
}

## Customer-friendly methods

${(research.customerFriendlyMethods ?? []).map((line) => `- ${line}`).join("\n") || "- (none yet)"}

## SEO / AIO

- Title: ${research.bestSeoTitle || "(industry default)"}
- Description: ${research.bestSeoDescription || "(industry default)"}

## Take the best of each

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
