/** Pure helpers for customer-facing Seed website copy (no store imports). */

import {
  SEED_AI_THOROUGH_RULE,
  seedGrowthBoardLooksThin,
  seedIndustryGrowthBoard,
  type SeedGrowthBoard,
  type SeedProfitPlay,
  type SeedResultStat,
} from "./seed-ai-thorough";

export {
  SEED_AI_THOROUGH_RULE,
  seedGrowthBoardLooksThin,
  seedIndustryGrowthBoard,
};
export type { SeedGrowthBoard, SeedProfitPlay, SeedResultStat };

/** True when text looks like an agent task note, not customer website copy. */
export function looksLikeAgentTaskCopy(text: string): boolean {
  return /wave\s*\d+|growth wave|polish mobile|touch targets|cross-device|verify phone|safe-area|44px|installable app manifest|information architecture|qa checklist|ship cross-device|implement frontend|write seed landing|shape information/i.test(
    text,
  );
}

function firstSentences(brief: string, count = 2): string[] {
  const cleaned = brief.replace(/\s+/g, " ").trim();
  const matches = cleaned.match(/[^.!?]+[.!?]+/g);
  if (!matches?.length) return cleaned ? [cleaned.slice(0, 160)] : [];
  return matches.slice(0, count).map((s) => s.trim());
}

/**
 * INDUSTRY COPY RULE (do not regress):
 * - Classify using the Seed name + brief together.
 * - Never match bare substrings like "car" inside "care", or bare "wash"
 *   (hair wash) as auto detailing.
 * - Specific verticals (salon/hair/barber, food/pizza, retail, trades) win before detailing.
 * - Compound forms count: barbershop, hairstylist, hairdresser (not only
 *   spaced “barber shop” / “hair stylist”).
 * - Pizza / pizzeria counts as food — never fall through to generic or salon.
 * - Auto detailing requires clear vehicle context (detailing, car wash,
 *   mobile detail, clean your car, etc.).
 * - Live repair must rewrite landing copy when a salon/hair Seed is still
 *   showing car hero, "Book a detail", retail “Shop now”, or driveway copy.
 * - HARD RULE: never “rename another Seed” — copy must follow THIS brief.
 *   E-commerce that asks the owner to enter/scan items starts with an empty
 *   catalog (not stock serum/mask SKUs from a salon template).
 * - HARD RULE: every Seed must beat 2020-era template sites — thorough pages,
 *   concrete numbers, and profit-maximizing operator help (lawn, garage,
 *   pizza, salon — same bar as AI kitchen design beating 2020 software).
 */
function industryKey(brief: string, name = ""): string {
  const lower = `${name} ${brief}`.toLowerCase();

  // Hair / beauty / barber before retail+auto — briefs often say "wash"
  // (shampoo) or compound words like barbershop / hairstylist.
  if (
    /\b(salon|spa|barber(?:s|shop)?|beauty|nails?|stylists?|hairstylists?|hairdressers?|colorists?|blowouts?|coiffure|fades?|beards?)\b/.test(
      lower,
    ) ||
    /\bhair(?:\s*style|\s*cut|\s*care)?\b/.test(lower) ||
    /barber\s*shop|hair\s*stylist|hair\s*dresser|beauty\s*salon|cuts?\s+and\s+(?:styles?|colors?|fades?)/.test(
      lower,
    )
  ) {
    return "salon";
  }
  // Pizza before generic food so pies don’t get fine-dining “Reserve a table”.
  if (
    /\b(pizza|pizzerias?|pizzeria|neapolitan|pepperoni|calzones?)\b/.test(lower) ||
    /\bpie\s*shop\b|\bslices?\b.*\b(pie|pizza)\b|\bpizza\s*man\b/.test(lower)
  ) {
    return "food";
  }
  if (
    /\b(food|restaurant|menu|kitchen|cafe|bistro|dining|bakery|catering|takeout|take-out|delivery)\b/.test(
      lower,
    )
  ) {
    return "food";
  }
  // Lawn / landscape before generic trade.
  if (
    /\b(lawn|landscap(?:e|ing)?|mow(?:ing)?|turf|sod|yard\s*care|irrigation|grass\s*cut)\b/.test(
      lower,
    )
  ) {
    return "lawn";
  }
  // Auto garage / mechanic before detailing — repair shop ≠ mobile detail.
  if (
    /\b(auto\s*garage|mechanic|auto\s*shop|oil\s*change|brakes?|transmission|car\s*repair|vehicle\s*repair|service\s*bay)\b/.test(
      lower,
    ) ||
    (/\bgarage\b/.test(lower) &&
      /\b(auto|car|truck|vehicle|repair|mechanic)\b/.test(lower))
  ) {
    return "garage";
  }
  // Word boundaries — do not let "shop" inside "barbershop" win as retail.
  if (/\b(shop|store|retail|boutique|florist)\b/.test(lower)) return "retail";
  if (/plumb|hvac|electric|repair|handyman|\btrades?\b/.test(lower)) {
    return "trade";
  }

  // Auto detailing needs vehicle context — not bare "wash" / "car" / "auto".
  if (
    /mobile detail|auto detail|car wash|car detail|detailing|clean your car|vehicle detail/.test(
      lower,
    ) ||
    (/\bdetail(?:ing|s)?\b/.test(lower) &&
      /\b(car|auto|vehicle|truck|suv|driveway)\b/.test(lower))
  ) {
    return "detail";
  }

  return "generic";
}

/** Pizza / pizzeria vertical inside food — name or brief. */
export function briefIsPizza(projectName: string, brief: string): boolean {
  const lower = `${projectName} ${brief}`.toLowerCase();
  return (
    /\b(pizza|pizzerias?|pizzeria|neapolitan|pepperoni|calzones?)\b/.test(lower) ||
    /\bpie\s*shop\b|\bpizza\s*man\b/.test(lower)
  );
}

/** Public industry classifier — name + brief, never bare "car" inside "care". */
export function seedIndustryKey(projectName: string, brief: string): string {
  return industryKey(brief, projectName);
}

/**
 * True when saved landing copy is the wrong vertical — e.g. a hair salon Seed
 * still showing the car hero or "Book a detail".
 */
export function seedLandingCopyMismatchesIndustry(
  projectName: string,
  brief: string,
  copy: {
    cta?: string;
    heroImage?: string;
    services?: Array<{ title?: string; detail?: string }>;
    aboutBody?: string;
    support?: string;
    footerNote?: string;
    servicesHeadline?: string;
  },
): boolean {
  const key = industryKey(brief, projectName);
  const blob = [
    copy.cta,
    copy.heroImage,
    copy.aboutBody,
    copy.support,
    copy.footerNote,
    copy.servicesHeadline,
    ...(copy.services ?? []).flatMap((item) => [item.title, item.detail]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const carHero = /photo-1601362840469/.test(copy.heroImage ?? "");
  const looksLikeDetailCopy =
    carHero ||
    /book a detail|driveway|vehicle|clear coat|mobile detailing|car looking|showroom polish|interior reset|express wash|details that travel/.test(
      blob,
    );
  const looksLikeSalonCopy =
    /book an appointment|cut & finish|blowout|colorist|your chair|appointments|fade|barber/.test(
      blob,
    ) || /photo-1560066984/.test(copy.heroImage ?? "");
  const looksLikeRetailCopy =
    /shop now|browse the shelf|retail floor|product aisle/.test(blob) ||
    /photo-1441986300917/.test(copy.heroImage ?? "");
  const looksLikeFineDiningCopy =
    /reserve a table|dinner service|private gatherings|bar & small plates|a room worth dressing|a table worth dressing/.test(
      blob,
    );
  const looksLikePizzaCopy =
    /order pizza|order now|hot pies|delivery|pickup|specialty pies|pizza man|pizzeria/.test(
      blob,
    ) || /photo-1513104890138/.test(copy.heroImage ?? "");

  if (key === "salon" && looksLikeDetailCopy) return true;
  if (key === "salon" && looksLikeRetailCopy) return true;
  if (key === "detail" && looksLikeSalonCopy) return true;
  if (key !== "detail" && looksLikeDetailCopy) return true;
  // Pizza Man / pizzeria stuck on salon, car, or fine-dining rename templates.
  if (briefIsPizza(projectName, brief) && looksLikeSalonCopy) return true;
  if (briefIsPizza(projectName, brief) && looksLikeFineDiningCopy) return true;
  if (briefIsPizza(projectName, brief) && !looksLikePizzaCopy && looksLikeRetailCopy)
    return true;
  return false;
}

/** Benefit-first support line for visitors — not checklist dumps. */
export function customerFacingSupport(brief: string): string {
  const cleaned = brief.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Quality work, done the way you need it.";

  const sentences = firstSentences(cleaned, 3).filter(
    (s) =>
      !looksLikeAgentTaskCopy(s) &&
      !/^(admin|calendar|educate|contact form|live chat|whatsapp)/i.test(s),
  );

  const benefit = sentences.find((s) =>
    /\b(you|your|we|come|goto|go to|clean|care|book|serve|help)\b/i.test(s),
  );
  if (benefit) {
    return benefit
      .replace(/\bgoto\b/gi, "go to")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (sentences[0]) return sentences[0];
  return cleaned.slice(0, 160);
}

/** Distinct headline — never just repeat the brand name. */
export function customerFacingHeadline(
  projectName: string,
  brief: string,
): string {
  const key = industryKey(brief, projectName);

  if (key === "detail") {
    if (/gps|come to you|go to you|goto you|mobile|driveway|your location/i.test(
      `${projectName} ${brief}`,
    )) {
      return "Showroom shine. We come to you.";
    }
    return "Your car. Our care. On your schedule.";
  }
  if (key === "lawn") {
    return "Sharp lawns. Routes that pay.";
  }
  if (key === "garage") {
    return "Diagnose. Approve. Fixed right.";
  }
  if (key === "food") {
    if (briefIsPizza(projectName, brief)) {
      return "Hot pies. Ready when you are.";
    }
    return "A table worth dressing up for.";
  }
  if (key === "salon") {
    if (
      /come to you|go to you|goto you|bye you|by you|mobile|your home|your place|house call/i.test(
        `${projectName} ${brief}`,
      )
    ) {
      return "Your chair. Your place.";
    }
    return "Look put-together. Feel taken care of.";
  }
  if (key === "retail") return "Find what fits — without the noise.";
  if (key === "trade") return "Fixed right. On your time.";

  const name = projectName.replace(/\s+Seed$/i, "").trim() || projectName;
  return `Welcome to ${name}.`;
}

export function customerFacingCta(brief: string, projectName = ""): string {
  const key = industryKey(brief, projectName);
  if (key === "detail") return "Book a detail";
  if (key === "lawn") return "Get a quote";
  if (key === "garage") return "Book service";
  if (key === "food") {
    if (briefIsPizza(projectName, brief)) return "Order pizza";
    return "Reserve a table";
  }
  if (key === "salon") return "Book an appointment";
  if (key === "retail") return "Shop now";
  if (key === "trade") return "Request service";
  return "Get started";
}

/** Atmospheric hero image for the industry — real visual anchor. */
export function customerFacingHeroImage(
  brief: string,
  projectName = "",
): string {
  const key = industryKey(brief, projectName);
  if (key === "detail") {
    return "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1800&q=80";
  }
  if (key === "lawn") {
    return "https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=1800&q=80";
  }
  if (key === "garage") {
    return "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1800&q=80";
  }
  if (key === "food") {
    if (briefIsPizza(projectName, brief)) {
      return "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1800&q=80";
    }
    return "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1800&q=80";
  }
  if (key === "salon") {
    return "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1800&q=80";
  }
  if (key === "retail") {
    return "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=80";
  }
  if (key === "trade") {
    return "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1800&q=80";
  }
  return "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=80";
}

export type SeedService = {
  title: string;
  detail: string;
};

export type SeedProcessStep = {
  title: string;
  detail: string;
};

export type SeedGalleryImage = {
  src: string;
  alt: string;
};

export type SeedProof = {
  quote: string;
  attribution: string;
};

/** Menu-board rows for food / pizza Seeds (chain-site density). */
export type SeedMenuItem = {
  category: string;
  name: string;
  detail: string;
  priceLabel: string;
};

export type SeedSpecial = {
  title: string;
  detail: string;
};

export type SeedSiteCopy = {
  brand: string;
  headline: string;
  support: string;
  cta: string;
  heroImage: string;
  navLabel: string;
  servicesEyebrow: string;
  servicesHeadline: string;
  services: SeedService[];
  /** Atmosphere strip — real place / product visuals after services. */
  galleryEyebrow: string;
  galleryHeadline: string;
  gallery: SeedGalleryImage[];
  /** How working with this business actually goes. */
  processEyebrow: string;
  processHeadline: string;
  process: SeedProcessStep[];
  /** Optional menu board (pizza / restaurant) — not a thin 3-bullet stub. */
  menuEyebrow?: string;
  menuHeadline?: string;
  menuSupport?: string;
  menuItems?: SeedMenuItem[];
  specialsEyebrow?: string;
  specialsHeadline?: string;
  specials?: SeedSpecial[];
  aboutEyebrow: string;
  aboutHeadline: string;
  aboutBody: string;
  aboutImage: string;
  /** One customer voice — denser than a stub landing. */
  proofEyebrow: string;
  proofHeadline: string;
  proof: SeedProof;
  /** Concrete industry numbers — proves AI thoroughness vs 2020 stubs. */
  resultsEyebrow: string;
  resultsHeadline: string;
  resultsSupport: string;
  results: SeedResultStat[];
  /** Operator profit levers with dollars / % / time. */
  profitEyebrow: string;
  profitHeadline: string;
  profitSupport: string;
  profitPlays: SeedProfitPlay[];
  /** Service area / hours / trust band. */
  areaEyebrow: string;
  areaHeadline: string;
  areaBody: string;
  bookEyebrow: string;
  bookHeadline: string;
  bookBody: string;
  bookNote: string;
  footerNote: string;
};

type SeedSiteCopyCore = Omit<
  SeedSiteCopy,
  | "galleryEyebrow"
  | "galleryHeadline"
  | "gallery"
  | "processEyebrow"
  | "processHeadline"
  | "process"
  | "aboutImage"
  | "proofEyebrow"
  | "proofHeadline"
  | "proof"
  | "resultsEyebrow"
  | "resultsHeadline"
  | "resultsSupport"
  | "results"
  | "profitEyebrow"
  | "profitHeadline"
  | "profitSupport"
  | "profitPlays"
  | "areaEyebrow"
  | "areaHeadline"
  | "areaBody"
>;

function withGrowthBoard(
  site: Omit<
    SeedSiteCopy,
    | "resultsEyebrow"
    | "resultsHeadline"
    | "resultsSupport"
    | "results"
    | "profitEyebrow"
    | "profitHeadline"
    | "profitSupport"
    | "profitPlays"
  >,
  key: string,
): SeedSiteCopy {
  const growth = seedIndustryGrowthBoard(
    key,
    site.brand,
    site.brand,
    `${site.servicesHeadline} ${site.footerNote} ${site.aboutBody}`,
  );
  return { ...site, ...growth };
}

/** Extra sections so Seeds feel like full business sites — not hero stubs. */
function withBusinessSiteDepth(
  core: SeedSiteCopyCore,
  key: string,
): SeedSiteCopy {
  const brand = core.brand;
  if (key === "detail") {
    return withGrowthBoard(
      {
      ...core,
      galleryEyebrow: "Results",
      galleryHeadline: "What the driveway looks like after",
      gallery: [
        {
          src: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1200&q=80",
          alt: "Freshly detailed car exterior",
        },
        {
          src: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=80",
          alt: "Clean cabin after interior detail",
        },
        {
          src: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=80",
          alt: "Showroom gloss on clear coat",
        },
      ],
      processEyebrow: "How it works",
      processHeadline: "Booked in three moves",
      process: [
        {
          title: "Share your spot",
          detail: "Drop a pin or address — we plan the route around you.",
        },
        {
          title: "Pick the package",
          detail: "Express, interior, or full polish — priced before we roll.",
        },
        {
          title: "We come to you",
          detail: "Water, power, and product on our truck. You keep your day.",
        },
      ],
      aboutImage:
        "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80",
      proofEyebrow: "From the driveway",
      proofHeadline: "Neighbors notice",
      proof: {
        quote:
          "They finished before my meeting ended. Car looked better than the day I bought it.",
        attribution: "Jordan · mobile detail client",
      },
      areaEyebrow: "Service area",
      areaHeadline: "We roll where you are",
      areaBody: `${brand} covers the metro and nearby suburbs. Same-day windows open when the route allows — ask when you book.`,
      },
      key,
    );
  }
  if (key === "lawn") {
    return withGrowthBoard(
      {
        ...core,
        galleryEyebrow: "The work",
        galleryHeadline: "Edges, stripes, and clean beds",
        gallery: [
          {
            src: "https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=1200&q=80",
            alt: "Freshly mowed lawn stripes",
          },
          {
            src: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80",
            alt: "Trimmed hedge and yard edge",
          },
          {
            src: "https://images.unsplash.com/photo-1466692476866-aefeee23a6b7?auto=format&fit=crop&w=1200&q=80",
            alt: "Green lawn after maintenance",
          },
        ],
        processEyebrow: "How service runs",
        processHeadline: "Quote, schedule, keep it sharp",
        process: [
          {
            title: "Tell us the property",
            detail: "Lot size, frequency, and anything the crew should know.",
          },
          {
            title: "Get a clear price",
            detail: "Weekly or biweekly cut — written before the first visit.",
          },
          {
            title: "We hit the route",
            detail: "Same crew rhythm, same clean edge — rain delays texted.",
          },
        ],
        aboutImage:
          "https://images.unsplash.com/photo-1592419044706-39796d40f98c?auto=format&fit=crop&w=1400&q=80",
        proofEyebrow: "Homeowners",
        proofHeadline: "Why they keep the contract",
        proof: {
          quote:
            "Yard looks intentional every week — and I never have to chase anyone about when they’re coming.",
          attribution: "Pat · recurring lawn client",
        },
        areaEyebrow: "Routes",
        areaHeadline: "Neighborhoods we already run",
        areaBody: `${brand} clusters routes by ZIP so crews stay dense. Ask which days we already serve your block.`,
      },
      key,
    );
  }
  if (key === "garage") {
    return withGrowthBoard(
      {
        ...core,
        galleryEyebrow: "In the bay",
        galleryHeadline: "Diagnostics to done-right repairs",
        gallery: [
          {
            src: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=80",
            alt: "Mechanic working in service bay",
          },
          {
            src: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
            alt: "Vehicle ready after service",
          },
          {
            src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
            alt: "Shop floor tools and lift",
          },
        ],
        processEyebrow: "Service path",
        processHeadline: "From check-in to approval",
        process: [
          {
            title: "Describe the symptom",
            detail: "Noise, light, or leak — enough to book the right bay time.",
          },
          {
            title: "Paid diagnosis",
            detail: "We find the cause and send a clear estimate before tear-in.",
          },
          {
            title: "Approve and finish",
            detail: "Parts + labor with updates — pick up when it’s right.",
          },
        ],
        aboutImage:
          "https://images.unsplash.com/photo-1487754180451-8de083866afe?auto=format&fit=crop&w=1400&q=80",
        proofEyebrow: "Drivers",
        proofHeadline: "Why they come back",
        proof: {
          quote:
            "They showed me the worn part, priced the fix, and had me back on the road the same day. No mystery invoice.",
          attribution: "Casey · service customer",
        },
        areaEyebrow: "Shop hours",
        areaHeadline: "Bays book ahead — walk-ins when we can",
        areaBody: `${brand} prioritizes appointments so diagnostics stay on time. Ask about same-day slots when a bay opens.`,
      },
      key,
    );
  }
  if (key === "food") {
    const pizza = /pizza|pie|oven/i.test(
      `${core.brand} ${core.servicesHeadline} ${core.footerNote}`,
    );
    return withGrowthBoard(
      {
      ...core,
      galleryEyebrow: pizza ? "From the oven" : "The room",
      galleryHeadline: pizza ? "Hot pies, real crust" : "A night worth dressing for",
      gallery: pizza
        ? [
            {
              src: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
              alt: "Fresh pizza from the oven",
            },
            {
              src: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80",
              alt: "Pizza with toppings",
            },
            {
              src: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=1200&q=80",
              alt: "Slices ready for pickup",
            },
          ]
        : [
            {
              src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
              alt: "Dining room table setting",
            },
            {
              src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
              alt: "Plated dinner service",
            },
            {
              src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
              alt: "Restaurant interior atmosphere",
            },
          ],
      processEyebrow: pizza ? "Order flow" : "Your night",
      processHeadline: pizza ? "Pie to door in three steps" : "From reserve to table",
      process: pizza
        ? [
            {
              title: "Build your order",
              detail: "Size, toppings, pickup or delivery — plain language.",
            },
            {
              title: "We fire the oven",
              detail: "Dough and toppings start when your slot is confirmed.",
            },
            {
              title: "Hot handoff",
              detail: "Counter pickup or a driver who knows the neighborhood.",
            },
          ]
        : [
            {
              title: "Reserve",
              detail: "Night and party size — we hold the room.",
            },
            {
              title: "Arrive",
              detail: "Your table is ready; the kitchen already knows the count.",
            },
            {
              title: "Stay awhile",
              detail: "Dinner paced for conversation, not a rush ticket.",
            },
          ],
      aboutImage: pizza
        ? "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1400&q=80"
        : "https://images.unsplash.com/photo-1550963211-0af174ce5f0e?auto=format&fit=crop&w=1400&q=80",
      proofEyebrow: pizza ? "Regulars say" : "Guests say",
      proofHeadline: pizza ? "Worth the pull-over" : "We’ll be back",
      proof: pizza
        ? {
            quote:
              "Crust was right, cheese was right, and it was still hot at the door. That’s the whole job.",
            attribution: "Sam · weekly pickup",
          }
        : {
            quote:
              "Quiet enough to talk, food careful enough that we lingered. Exactly what we wanted.",
            attribution: "Alex · anniversary dinner",
          },
      areaEyebrow: pizza ? "Neighborhood" : "Find us",
      areaHeadline: pizza
        ? "Delivery and pickup nearby"
        : "Reservations and walk-ins",
      areaBody: pizza
        ? `${brand} runs pickup at the counter and delivery on a local route. Ask for today’s windows when you order.`
        : `${brand} takes reservations most evenings. Walk-ins when we have room — call ahead on weekends.`,
      },
      key,
    );
  }
  if (key === "salon") {
    return withGrowthBoard(
      {
      ...core,
      galleryEyebrow: "In the chair",
      galleryHeadline: "Cuts, color, and finish",
      gallery: [
        {
          src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
          alt: "Salon styling station",
        },
        {
          src: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80",
          alt: "Hair color and finish",
        },
        {
          src: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=1200&q=80",
          alt: "Blowout and style",
        },
      ],
      processEyebrow: "Visit flow",
      processHeadline: "From book to blowout",
      process: [
        {
          title: "Book the chair",
          detail: "Pick a service and time that fits your week.",
        },
        {
          title: "Consult in person",
          detail: "We match cut or color to how you actually live in it.",
        },
        {
          title: "Leave ready",
          detail: "Finish you can recreate — plus what to do at home.",
        },
      ],
      aboutImage:
        "https://images.unsplash.com/photo-1521590832167-7bcbfaaae1b0?auto=format&fit=crop&w=1400&q=80",
      proofEyebrow: "Clients",
      proofHeadline: "They keep the chair",
      proof: {
        quote:
          "I stopped explaining what I want. They already know — and my hair finally matches my week.",
        attribution: "Riley · color client",
      },
      areaEyebrow: "Studio",
      areaHeadline: "Appointments first",
      areaBody: `${brand} runs on booked chairs. New clients: arrive a few minutes early so we can start on time.`,
      },
      key,
    );
  }
  if (key === "retail") {
    return withGrowthBoard(
      {
      ...core,
      galleryEyebrow: "On the floor",
      galleryHeadline: "What you’ll actually find",
      gallery: [
        {
          src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
          alt: "Retail floor display",
        },
        {
          src: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80",
          alt: "Product shelves",
        },
        {
          src: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1200&q=80",
          alt: "Gift and essentials table",
        },
      ],
      processEyebrow: "Shopping here",
      processHeadline: "Simple on purpose",
      process: [
        {
          title: "Browse without noise",
          detail: "Tight edits — not endless aisles of almost-the-same.",
        },
        {
          title: "Ask the floor",
          detail: "Staff picks are real recommendations, not scripts.",
        },
        {
          title: "Take it home — or ship",
          detail: "Hold at the counter or ship select items when it helps.",
        },
      ],
      aboutImage:
        "https://images.unsplash.com/photo-1555529902-5261145633bf?auto=format&fit=crop&w=1400&q=80",
      proofEyebrow: "Regulars",
      proofHeadline: "Why people come back",
      proof: {
        quote:
          "I can be in and out in ten minutes and still leave with the right thing. That never happens at bigger stores.",
        attribution: "Morgan · weekly shopper",
      },
      areaEyebrow: "Visit",
      areaHeadline: "Hours that match the neighborhood",
      areaBody: `${brand} is open for walk-ins most days. Message us if you want something held before you come by.`,
      },
      key,
    );
  }
  if (key === "trade") {
    return withGrowthBoard(
      {
      ...core,
      galleryEyebrow: "On the job",
      galleryHeadline: "Clean work, clear sites",
      gallery: [
        {
          src: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
          alt: "Trade professional at work",
        },
        {
          src: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1200&q=80",
          alt: "Tools and repair in progress",
        },
        {
          src: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80",
          alt: "Finished repair detail",
        },
      ],
      processEyebrow: "Service path",
      processHeadline: "Diagnose, fix, follow through",
      process: [
        {
          title: "Tell us what’s wrong",
          detail: "A short description and preferred window is enough to start.",
        },
        {
          title: "We diagnose on site",
          detail: "Real cause first — then a clear price before we tear in.",
        },
        {
          title: "Fix that holds",
          detail: "Clean workmanship and a reachable number after we leave.",
        },
      ],
      aboutImage:
        "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1400&q=80",
      proofEyebrow: "Homeowners",
      proofHeadline: "They call us back",
      proof: {
        quote:
          "Showed up when they said, fixed the real problem, and didn’t leave a mess. That’s rare.",
        attribution: "Chris · service call",
      },
      areaEyebrow: "Coverage",
      areaHeadline: "We work your schedule",
      areaBody: `${brand} books diagnostics and repairs across the local area. Emergency slots when the board allows — ask when you request service.`,
      },
      key,
    );
  }
  return withGrowthBoard(
    {
    ...core,
    galleryEyebrow: "Look closer",
    galleryHeadline: "How the work shows up",
    gallery: [
      {
        src: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
        alt: "Workspace and meeting area",
      },
      {
        src: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=80",
        alt: "Team collaborating",
      },
      {
        src: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80",
        alt: "Customer conversation",
      },
    ],
    processEyebrow: "Working with us",
    processHeadline: "Clear from the first message",
    process: [
      {
        title: "Tell us the goal",
        detail: "What you need and how to reach you — no jargon required.",
      },
      {
        title: "We map the path",
        detail: "Next steps and timing before anything big starts.",
      },
      {
        title: "Follow through",
        detail: "We stay reachable after the first deliverable lands.",
      },
    ],
    aboutImage:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
    proofEyebrow: "Clients",
    proofHeadline: "Why they stay",
    proof: {
      quote:
        "They explained the plan in plain language and actually did what they said. That’s the whole standard.",
      attribution: "Taylor · returning client",
    },
    areaEyebrow: "Reach us",
    areaHeadline: "Built for how you already work",
    areaBody: `${brand} replies during business hours. Share what you need and the best way to follow up.`,
    },
    key,
  );
}

/** Industry-shaped services, about, and booking copy for a full site — not a hero stub. */
export function customerFacingSiteCopy(
  projectName: string,
  brief: string,
): SeedSiteCopy {
  const brand = projectName.replace(/\s+Seed$/i, "").trim() || projectName;
  const key = industryKey(brief, projectName);
  const support = customerFacingSupport(brief);
  const headline = customerFacingHeadline(projectName, brief);
  const cta = customerFacingCta(brief, projectName);
  const heroImage = customerFacingHeroImage(brief, projectName);

  if (key === "detail") {
    return withBusinessSiteDepth(
      {
      brand,
      headline,
      support,
      cta,
      heroImage,
      navLabel: "Menu",
      servicesEyebrow: "Services",
      servicesHeadline: "Details that travel to your driveway",
      services: [
        {
          title: "Express wash & wipe",
          detail:
            "Exterior rinse, foam, dry, and glass — ready when you need the car looking sharp fast.",
        },
        {
          title: "Full interior reset",
          detail:
            "Vacuum, wipe-down, vents, and mats so the cabin feels fresh again.",
        },
        {
          title: "Showroom polish",
          detail:
            "Hand wash, clay, polish, and protectant for deep gloss that holds up on the road.",
        },
      ],
      aboutEyebrow: "How it works",
      aboutHeadline: "We find you. You stay put.",
      aboutBody:
        "Share your location, pick a package, and we roll out with water, power, and product. No shop drop-off. No waiting room — just a cleaner car where you already are.",
      bookEyebrow: "Book",
      bookHeadline: "Ready when you are",
      bookBody:
        "Tell us the vehicle, package, and where to meet you. We’ll confirm a window and come to you.",
      bookNote: "Same-day slots open when the route allows.",
      footerNote: `${brand} · Mobile detailing that comes to you`,
      },
      key,
    );
  }

  if (key === "lawn") {
    return withBusinessSiteDepth(
      {
        brand,
        headline,
        support,
        cta,
        heroImage,
        navLabel: "Services",
        servicesEyebrow: "Yard service",
        servicesHeadline: "Cuts, edges, and seasonal care",
        services: [
          {
            title: "Weekly / biweekly mow",
            detail:
              "Stripe, edge, and blow-off on a route schedule you can count on.",
          },
          {
            title: "Fertilizer & weed control",
            detail:
              "Seasonal applications that keep the lawn thick without guesswork.",
          },
          {
            title: "Cleanup & aeration",
            detail:
              "Leaf, spring, and core aeration windows that protect next season’s growth.",
          },
        ],
        aboutEyebrow: "Crew",
        aboutHeadline: "Routes first. Lawns that look intentional.",
        aboutBody:
          support ||
          `${brand} runs dense neighborhood routes — clear pricing, clean edges, and texts when weather moves the day.`,
        bookEyebrow: "Quote",
        bookHeadline: "Get on the route",
        bookBody:
          "Share your address, lot size, and preferred frequency — we’ll send a written price.",
        bookNote: "New routes open by ZIP cluster so crews stay efficient.",
        footerNote: `${brand} · Lawn care · Recurring routes`,
      },
      key,
    );
  }

  if (key === "garage") {
    return withBusinessSiteDepth(
      {
        brand,
        headline,
        support,
        cta,
        heroImage,
        navLabel: "Services",
        servicesEyebrow: "Shop services",
        servicesHeadline: "Diagnostics, repairs, and maintenance",
        services: [
          {
            title: "Diagnostics",
            detail:
              "Paid inspection that finds the real cause before any tear-in.",
          },
          {
            title: "Brakes, fluids & wear items",
            detail:
              "Clear parts + labor estimates — approve before we start.",
          },
          {
            title: "Maintenance menus",
            detail:
              "Oil, filters, and seasonal checks that keep the bay booked between big jobs.",
          },
        ],
        aboutEyebrow: "The bay",
        aboutHeadline: "Honest estimates. Finished right.",
        aboutBody:
          support ||
          `${brand} runs appointment-first bays — diagnose, approve, and repair without mystery invoices.`,
        bookEyebrow: "Service",
        bookHeadline: "Book a bay",
        bookBody:
          "Tell us the symptom and preferred window — we’ll confirm diagnostic time.",
        bookNote: "Same-day slots when a bay opens.",
        footerNote: `${brand} · Auto garage · Diagnostics & repair`,
      },
      key,
    );
  }

  if (key === "food") {
    if (briefIsPizza(projectName, brief)) {
      return withBusinessSiteDepth(
        {
        brand,
        headline,
        support,
        cta,
        heroImage,
        navLabel: "Menu",
        servicesEyebrow: "Order online",
        servicesHeadline: "Pickup, delivery, and hot pies",
        services: [
          {
            title: "Carryout",
            detail: "Order ahead, skip the line, grab it hot at the counter.",
          },
          {
            title: "Delivery",
            detail: "Local drivers, tracked windows — still hot at your door.",
          },
          {
            title: "Family & group orders",
            detail: "Multi-pie tickets, sides, and drinks for the whole table.",
          },
        ],
        menuEyebrow: "Menu",
        menuHeadline: "Build your order",
        menuSupport:
          "Sizes, crusts, and toppings — priced like a real pizza shop, not a three-bullet stub.",
        menuItems: [
          {
            category: "Classic",
            name: "Cheese",
            detail: "Hand-tossed crust, sauce, mozzarella.",
            priceLabel: "From $11",
          },
          {
            category: "Classic",
            name: "Pepperoni",
            detail: "Extra crisp edges, generous cup-and-char.",
            priceLabel: "From $13",
          },
          {
            category: "Specialty",
            name: "House supreme",
            detail: "Pepperoni, sausage, peppers, onion, mushrooms.",
            priceLabel: "From $16",
          },
          {
            category: "Specialty",
            name: "White pie",
            detail: "Garlic oil, ricotta, mozzarella, herbs.",
            priceLabel: "From $15",
          },
          {
            category: "Sides",
            name: "Garlic knots",
            detail: "Butter, parsley, side of marinara.",
            priceLabel: "$5",
          },
          {
            category: "Sides",
            name: "Garden salad",
            detail: "House greens, tomato, cucumber, vinaigrette.",
            priceLabel: "$6",
          },
        ],
        specialsEyebrow: "Deals",
        specialsHeadline: "Tonight’s specials",
        specials: [
          {
            title: "Two-medium carryout",
            detail: "Two classics, one pickup window — family night without the markup theater.",
          },
          {
            title: "Lunch express",
            detail: "Personal pie + drink when you order before 2.",
          },
        ],
        aboutEyebrow: "Kitchen",
        aboutHeadline: "Dough. Fire. Done right.",
        aboutBody:
          support ||
          `${brand} runs a real pizza line — carryout and delivery with a menu you can order from, not a placeholder paragraph.`,
        bookEyebrow: "Order",
        bookHeadline: "Send the ticket",
        bookBody:
          "Name, phone, pickup or delivery, and what you want on the pie — we’ll confirm the window.",
        bookNote: "Delivery windows open when the route allows. Large orders: call ahead.",
        footerNote: `${brand} · Pizza · Order · Pickup & delivery`,
        },
        key,
      );
    }
    return withBusinessSiteDepth(
      {
      brand,
      headline,
      support,
      cta,
      heroImage,
      navLabel: "Menu",
      servicesEyebrow: "Dining",
      servicesHeadline: "How guests use the room",
      services: [
        {
          title: "Dinner service",
          detail: "Seasonal plates built for a night out — not a rush ticket.",
        },
        {
          title: "Private gatherings",
          detail: "A quieter corner when the occasion needs room to breathe.",
        },
        {
          title: "Bar & small plates",
          detail: "Something cold, something shared, before the main event.",
        },
      ],
      menuEyebrow: "Menu highlights",
      menuHeadline: "What leaves the kitchen",
      menuSupport: "Signature plates and bar notes — a full hospitality site, not three vague bullets.",
      menuItems: [
        {
          category: "Starters",
          name: "Seasonal small plates",
          detail: "Shared bites before the main course.",
          priceLabel: "From $12",
        },
        {
          category: "Mains",
          name: "Chef’s dinner plates",
          detail: "Rotating mains matched to the market list.",
          priceLabel: "From $24",
        },
        {
          category: "Mains",
          name: "Catch of the evening",
          detail: "When the board has fish — ask your server.",
          priceLabel: "Market",
        },
        {
          category: "Bar",
          name: "House cocktails",
          detail: "Short list, careful pours.",
          priceLabel: "From $11",
        },
      ],
      specialsEyebrow: "This week",
      specialsHeadline: "Kitchen notes",
      specials: [
        {
          title: "Prix fixe midweek",
          detail: "Three courses on select nights — ask when you reserve.",
        },
        {
          title: "Late bar",
          detail: "Small plates after the dining room softens.",
        },
      ],
      aboutEyebrow: "About",
      aboutHeadline: "A room worth dressing up for",
      aboutBody: support,
      bookEyebrow: "Reserve",
      bookHeadline: "Save your table",
      bookBody: "Pick a night and party size — we’ll hold the spot.",
      bookNote: "Walk-ins welcome when we have room.",
      footerNote: `${brand} · Reservations & hospitality`,
      },
      key,
    );
  }

  if (key === "salon") {
    return withBusinessSiteDepth(
      {
      brand,
      headline,
      support,
      cta,
      heroImage,
      navLabel: "Menu",
      servicesEyebrow: "Services",
      servicesHeadline: "Care that fits your day",
      services: [
        {
          title: "Cut & finish",
          detail: "Shape, texture, and a style you can recreate at home.",
        },
        {
          title: "Color",
          detail: "Soft refresh or a full change — matched to your hair’s health.",
        },
        {
          title: "Treatments",
          detail: "Repair and shine when the week has been rough on your hair.",
        },
      ],
      aboutEyebrow: "Studio",
      aboutHeadline: "Calm chairs. Clear results.",
      aboutBody: support,
      bookEyebrow: "Book",
      bookHeadline: "Hold your chair",
      bookBody: "Choose a service and time — we’ll confirm shortly.",
      bookNote: "New clients: arrive five minutes early.",
      footerNote: `${brand} · Appointments`,
      },
      key,
    );
  }

  if (key === "retail") {
    return withBusinessSiteDepth(
      {
      brand,
      headline,
      support,
      cta,
      heroImage,
      navLabel: "Shop",
      servicesEyebrow: "Collections",
      servicesHeadline: "What’s on the floor",
      services: [
        {
          title: "New arrivals",
          detail: "Fresh pieces without the clutter of endless options.",
        },
        {
          title: "Essentials",
          detail: "The everyday items people come back for.",
        },
        {
          title: "Staff picks",
          detail: "What we’d take home this week.",
        },
      ],
      aboutEyebrow: "About",
      aboutHeadline: "Curated, not crowded",
      aboutBody: support,
      bookEyebrow: "Visit",
      bookHeadline: "Come see it in person",
      bookBody: "Hours and directions — or message us if you want something held.",
      bookNote: "Shipping available on select items.",
      footerNote: `${brand} · Shop`,
      },
      key,
    );
  }

  if (key === "trade") {
    return withBusinessSiteDepth(
      {
      brand,
      headline,
      support,
      cta,
      heroImage,
      navLabel: "Menu",
      servicesEyebrow: "Services",
      servicesHeadline: "Problems we show up for",
      services: [
        {
          title: "Diagnostics",
          detail: "We find the real issue before we start tearing into walls.",
        },
        {
          title: "Repairs",
          detail: "Clean fixes that hold — not temporary patches.",
        },
        {
          title: "Maintenance",
          detail: "Scheduled checkups so small issues stay small.",
        },
      ],
      aboutEyebrow: "About",
      aboutHeadline: "On your schedule",
      aboutBody: support,
      bookEyebrow: "Request",
      bookHeadline: "Tell us what’s broken",
      bookBody: "Describe the issue and preferred window — we’ll confirm arrival.",
      bookNote: "Emergency slots when available.",
      footerNote: `${brand} · Service requests`,
      },
      key,
    );
  }

  return withBusinessSiteDepth(
    {
    brand,
    headline,
    support,
    cta,
    heroImage,
    navLabel: "Menu",
    servicesEyebrow: "What we offer",
    servicesHeadline: "Built around how you work with us",
    services: [
      {
        title: "Core service",
        detail: support,
      },
      {
        title: "Guidance",
        detail: "Clear next steps so you’re never guessing what comes after.",
      },
      {
        title: "Follow-through",
        detail: "We stay reachable after the first visit.",
      },
    ],
    aboutEyebrow: "About",
    aboutHeadline: `Why ${brand}`,
    aboutBody: support,
    bookEyebrow: "Start",
    bookHeadline: "Let’s get you going",
    bookBody: "Share what you need and the best way to reach you.",
    bookNote: "We reply during business hours.",
    footerNote: `${brand}`,
    },
    key,
  );
}

/** Full public-site CSS — hero + real sections, not a blank stub. */
export function seedPublicSiteCss(): string {
  return `@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap");

:root {
  --ink: #0b1014;
  --panel: #121a20;
  --foam: #f3f6f7;
  --muted: rgba(243, 246, 247, 0.72);
  --muted-strong: rgba(11, 16, 20, 0.62);
  --line: rgba(243, 246, 247, 0.14);
  --line-dark: rgba(11, 16, 20, 0.12);
  --accent: #5eead4;
  --accent-ink: #06201c;
  --tap: 2.75rem;
  --pad-inline: clamp(1.1rem, 4.5vw, 3rem);
  --pad-block: clamp(1.5rem, 5vw, 3.5rem);
  --content: min(68rem, 100%);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  margin: 0;
  min-width: 0;
  overflow-x: clip;
  font-family: "Outfit", system-ui, sans-serif;
  background: var(--ink);
  color: var(--foam);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

a {
  color: inherit;
}

a.cta,
.cta,
.seed-nav a,
button {
  min-height: var(--tap);
}

@keyframes seed-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes seed-zoom {
  from {
    transform: scale(1.08);
  }
  to {
    transform: scale(1);
  }
}

.seed-site {
  min-height: 100svh;
  min-height: 100dvh;
}

.seed-nav {
  position: absolute;
  inset-inline: 0;
  top: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.25rem;
  padding: calc(0.85rem + env(safe-area-inset-top)) var(--pad-inline) 0.85rem;
}

.seed-nav .seed-nav-brand {
  margin: 0;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-size: 1rem;
  text-decoration: none;
}

.seed-nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.seed-nav-links a {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 600;
  color: rgba(243, 246, 247, 0.86);
}

.seed-nav-links a:hover {
  color: var(--foam);
}

.seed-hero {
  position: relative;
  isolation: isolate;
  min-height: 100svh;
  min-height: 100dvh;
  display: grid;
  align-items: end;
  overflow: hidden;
}

.seed-hero-media {
  position: absolute;
  inset: 0;
  z-index: -2;
  background-color: #152028;
  background-size: cover;
  background-position: center;
  animation: seed-zoom 14s ease-out forwards;
}

.seed-hero-scrim {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(180deg, rgba(11, 16, 20, 0.35) 0%, rgba(11, 16, 20, 0.72) 55%, rgba(11, 16, 20, 0.94) 100%),
    radial-gradient(120% 80% at 20% 10%, rgba(94, 234, 212, 0.18), transparent 55%);
}

.seed-hero-copy {
  width: min(40rem, 100%);
  padding: var(--pad-block) var(--pad-inline);
  padding-bottom: calc(var(--pad-block) + env(safe-area-inset-bottom) + 0.5rem);
}

.seed-hero .brand {
  margin: 0;
  font-family: "Outfit", system-ui, sans-serif;
  font-weight: 800;
  letter-spacing: -0.04em;
  font-size: clamp(2.4rem, 9vw, 4.25rem);
  line-height: 0.95;
  overflow-wrap: anywhere;
  animation: seed-rise 0.7s ease both;
}

.seed-hero h1 {
  margin: 0.85rem 0 0;
  font-family: "Source Serif 4", Georgia, serif;
  font-weight: 600;
  font-size: clamp(1.45rem, 4.4vw, 2.35rem);
  line-height: 1.2;
  max-width: 18ch;
  overflow-wrap: anywhere;
  animation: seed-rise 0.7s ease both;
  animation-delay: 0.08s;
}

.seed-hero .support {
  margin: 1rem 0 0;
  max-width: 32rem;
  font-size: clamp(1rem, 2.5vw, 1.15rem);
  line-height: 1.55;
  color: var(--muted);
  overflow-wrap: anywhere;
  animation: seed-rise 0.7s ease both;
  animation-delay: 0.16s;
}

.seed-hero .cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 1.35rem;
  padding: 0.9rem 1.45rem;
  border-radius: 0.35rem;
  background: var(--accent);
  color: var(--accent-ink);
  text-decoration: none;
  font-weight: 700;
  letter-spacing: -0.01em;
  transition: transform 160ms ease, filter 160ms ease;
  animation: seed-rise 0.7s ease both;
  animation-delay: 0.24s;
}

.seed-hero .cta:hover {
  transform: translateY(-2px);
  filter: brightness(1.05);
}

.seed-hero .cta:focus-visible {
  outline: 2px solid var(--foam);
  outline-offset: 3px;
}

.seed-section {
  padding: clamp(3rem, 9vw, 5.5rem) var(--pad-inline);
}

.seed-section-inner {
  width: min(100%, var(--content));
  margin-inline: auto;
}

.seed-eyebrow {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
}

.seed-section h2 {
  margin: 0.75rem 0 0;
  font-family: "Source Serif 4", Georgia, serif;
  font-weight: 600;
  font-size: clamp(1.7rem, 4vw, 2.6rem);
  line-height: 1.15;
  letter-spacing: -0.02em;
  max-width: 18ch;
  overflow-wrap: anywhere;
}

.seed-section .lead {
  margin: 1rem 0 0;
  max-width: 38rem;
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--muted);
  overflow-wrap: anywhere;
}

.seed-services {
  background: var(--panel);
}

.seed-service-list {
  display: grid;
  gap: 0;
  margin: 2.25rem 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}

.seed-service-list li {
  display: grid;
  gap: 0.45rem;
  padding: 1.35rem 0;
  border-bottom: 1px solid var(--line);
}

@media (min-width: 720px) {
  .seed-service-list li {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr);
    gap: 1.5rem;
    align-items: baseline;
  }
}

.seed-service-list h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.seed-service-list p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.seed-about {
  background:
    radial-gradient(90% 70% at 100% 0%, rgba(94, 234, 212, 0.1), transparent 50%),
    var(--ink);
}

.seed-about-grid {
  display: grid;
  gap: 2rem;
  align-items: center;
}

@media (min-width: 860px) {
  .seed-about-grid {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: 3rem;
  }
}

.seed-about-photo {
  margin: 0;
  overflow: hidden;
  border-radius: 0.2rem;
  min-height: 16rem;
  background: var(--panel);
}

.seed-about-photo img {
  width: 100%;
  height: 100%;
  min-height: 16rem;
  object-fit: cover;
  animation: seed-zoom 1.1s ease both;
}

.seed-gallery {
  padding: clamp(2.5rem, 7vw, 4rem) 0 0;
  background: #0e151a;
}

.seed-gallery-intro {
  padding-inline: var(--pad-inline);
  margin-bottom: 1.5rem;
}

.seed-gallery-strip {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.35rem;
  padding-inline: var(--pad-inline);
  padding-bottom: clamp(2rem, 6vw, 3.5rem);
}

@media (min-width: 720px) {
  .seed-gallery-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
  }
}

.seed-gallery-item {
  margin: 0;
  overflow: hidden;
  min-height: 12rem;
  background: var(--panel);
}

.seed-gallery-item img {
  width: 100%;
  height: 100%;
  min-height: 12rem;
  max-height: 18rem;
  object-fit: cover;
  transition: transform 420ms ease;
}

.seed-gallery-item:hover img {
  transform: scale(1.04);
}

.seed-process {
  background: var(--panel);
}

.seed-process-list {
  display: grid;
  gap: 0;
  margin: 2.25rem 0 0;
  padding: 0;
  list-style: none;
  counter-reset: none;
  border-top: 1px solid var(--line);
}

.seed-process-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1rem 1.25rem;
  padding: 1.4rem 0;
  border-bottom: 1px solid var(--line);
}

.seed-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent);
}

.seed-process-list h3 {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.seed-process-list p {
  margin: 0.35rem 0 0;
  color: var(--muted);
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.seed-proof {
  background:
    linear-gradient(180deg, rgba(94, 234, 212, 0.08), transparent 42%),
    var(--ink);
}

.seed-quote {
  margin: 1.5rem 0 0;
  max-width: 40rem;
  padding: 0;
  border: 0;
}

.seed-quote p {
  margin: 0;
  font-family: "Source Serif 4", Georgia, serif;
  font-size: clamp(1.35rem, 3.2vw, 1.85rem);
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.seed-quote footer {
  margin-top: 1.1rem;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--muted);
}

.seed-area {
  background: #101820;
  border-block: 1px solid var(--line);
}

.seed-menu {
  background: #0c1419;
}

.seed-menu-list {
  display: grid;
  gap: 0;
  margin: 2rem 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}

.seed-menu-list li {
  padding: 1.2rem 0;
  border-bottom: 1px solid var(--line);
}

.seed-menu-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.35rem 1rem;
  margin-bottom: 0.35rem;
}

.seed-menu-cat {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}

.seed-menu-price {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--foam);
}

.seed-menu-list h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.seed-menu-list p {
  margin: 0.35rem 0 0;
  color: var(--muted);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.seed-menu-order {
  margin: 1.75rem 0 0;
}

.seed-specials {
  background: var(--panel);
}

.seed-specials-list {
  display: grid;
  gap: 0;
  margin: 2rem 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}

@media (min-width: 720px) {
  .seed-specials-list {
    grid-template-columns: 1fr 1fr;
    gap: 0 2rem;
  }
}

.seed-specials-list li {
  padding: 1.35rem 0;
  border-bottom: 1px solid var(--line);
}

.seed-specials-list h3 {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 700;
}

.seed-specials-list p {
  margin: 0.4rem 0 0;
  color: var(--muted);
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.seed-results {
  background: #0e161c;
  border-block: 1px solid var(--line);
}

.seed-results-grid {
  display: grid;
  gap: 1.25rem;
  margin: 2rem 0 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 720px) {
  .seed-results-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.5rem;
  }
}

.seed-results-grid li {
  padding: 1rem 0 0;
  border-top: 1px solid var(--line);
}

.seed-results-value {
  display: block;
  font-family: "Source Serif 4", Georgia, serif;
  font-size: clamp(1.6rem, 3vw, 2.1rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--accent);
  line-height: 1.1;
}

.seed-results-label {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--foam);
}

.seed-results-grid p {
  margin: 0.45rem 0 0;
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.45;
}

.seed-profit {
  background: var(--panel);
}

.seed-profit-list {
  display: grid;
  gap: 0;
  margin: 2rem 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}

@media (min-width: 720px) {
  .seed-profit-list {
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0 1.75rem;
  }
}

.seed-profit-list li {
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--line);
}

.seed-profit-list h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.seed-profit-list p {
  margin: 0.4rem 0 0;
  color: var(--muted);
  line-height: 1.5;
}

.seed-book {
  background: #e8eef0;
  color: var(--ink);
}

.seed-book .seed-eyebrow {
  color: #0f766e;
}

.seed-book .lead,
.seed-book .book-note {
  color: var(--muted-strong);
}

.seed-book-form {
  display: grid;
  gap: 0.85rem;
  margin-top: 1.75rem;
  max-width: 28rem;
}

.seed-book-form label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 700;
}

.seed-book-form input,
.seed-book-form textarea,
.seed-book-form select {
  width: 100%;
  min-height: var(--tap);
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--line-dark);
  border-radius: 0.35rem;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 16px;
}

.seed-book-form textarea {
  min-height: 6.5rem;
  resize: vertical;
}

.seed-book-form .cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  margin-top: 0.35rem;
  padding: 0.9rem 1.45rem;
  border: 0;
  border-radius: 0.35rem;
  background: var(--accent-ink);
  color: var(--foam);
  font-weight: 700;
  cursor: pointer;
}

.seed-book .book-note {
  margin: 1rem 0 0;
  font-size: 0.9rem;
}

.seed-footer {
  padding: 1.5rem var(--pad-inline) calc(1.5rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: var(--ink);
}

.seed-footer p {
  margin: 0;
  width: min(100%, var(--content));
  margin-inline: auto;
  font-size: 0.9rem;
  color: var(--muted);
}

@media (min-width: 900px) {
  .seed-hero {
    align-items: center;
  }

  .seed-hero-copy {
    padding-block: clamp(3rem, 10vh, 6rem);
  }

  .seed-hero h1 {
    max-width: 16ch;
  }
}

@media (prefers-reduced-motion: reduce) {
  .seed-hero-media,
  .seed-hero .brand,
  .seed-hero h1,
  .seed-hero .support,
  .seed-hero .cta {
    animation: none;
  }
}

/* —— Seed-grown business admin (calendar + education) —— */
.seed-admin {
  min-height: 100dvh;
  background:
    radial-gradient(ellipse 80% 50% at 10% -10%, rgba(94, 234, 212, 0.16), transparent 55%),
    radial-gradient(ellipse 60% 40% at 100% 0%, rgba(18, 26, 32, 0.9), transparent 50%),
    var(--foam);
  color: var(--ink);
  padding: calc(1.25rem + env(safe-area-inset-top)) var(--pad-inline)
    calc(2rem + env(safe-area-inset-bottom));
}

.seed-admin-top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  width: min(100%, var(--content));
  margin: 0 auto 2rem;
}

.seed-admin-kicker {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-strong);
}

.seed-admin-top h1 {
  margin: 0;
  font-family: "Source Serif 4", Georgia, serif;
  font-size: clamp(1.85rem, 5vw, 2.6rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.seed-admin-support {
  margin: 0.65rem 0 0;
  max-width: 36rem;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--muted-strong);
}

.seed-admin-link,
.seed-admin-links a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--tap);
  padding: 0.55rem 1rem;
  border-radius: 0.35rem;
  border: 1px solid var(--line-dark);
  background: #fff;
  color: var(--ink);
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
}

.seed-admin-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.seed-admin-section {
  width: min(100%, var(--content));
  margin: 0 auto 2rem;
  padding: 1.35rem 1.25rem 1.5rem;
  border: 1px solid var(--line-dark);
  border-radius: 0.5rem;
  background: #fff;
  animation: seed-rise 520ms ease both;
}

.seed-admin-section .seed-eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-strong);
}

.seed-admin-section h2 {
  margin: 0 0 1rem;
  font-family: "Source Serif 4", Georgia, serif;
  font-size: clamp(1.35rem, 3.5vw, 1.75rem);
  font-weight: 700;
}

.seed-admin-form {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .seed-admin-form {
    grid-template-columns: 1fr 1fr;
  }

  .seed-admin-span,
  .seed-admin-form .cta {
    grid-column: 1 / -1;
  }
}

.seed-admin-form label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.seed-admin-form input,
.seed-admin-form select {
  min-height: var(--tap);
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--line-dark);
  border-radius: 0.35rem;
  background: var(--foam);
  color: var(--ink);
  font: inherit;
  font-size: 16px;
}

.seed-admin-form .cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  margin-top: 0.25rem;
  padding: 0.85rem 1.35rem;
  border: 0;
  border-radius: 0.35rem;
  background: var(--accent-ink);
  color: var(--foam);
  font-weight: 700;
  cursor: pointer;
}

.seed-admin-empty {
  margin: 1rem 0 0;
  font-size: 0.95rem;
  color: var(--muted-strong);
}

.seed-admin-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.seed-admin-list li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 0;
  border-top: 1px solid var(--line-dark);
}

.seed-admin-list-title {
  margin: 0;
  font-weight: 700;
}

.seed-admin-list-meta {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: var(--muted-strong);
}

.seed-admin-list-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.seed-admin-list-actions button {
  min-height: 2.5rem;
  padding: 0.4rem 0.85rem;
  border-radius: 0.35rem;
  border: 1px solid var(--line-dark);
  background: var(--foam);
  color: var(--ink);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.seed-admin-tips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.seed-admin-tips li h3 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
}

.seed-admin-tips li p {
  margin: 0;
  color: var(--muted-strong);
  line-height: 1.5;
}

.seed-admin-error {
  margin: 0.75rem 0 0;
  color: #9b1c1c;
  font-weight: 600;
  font-size: 0.9rem;
}

.seed-admin-inv-row {
  display: grid;
  gap: 0.65rem;
  margin: 0 0 0.85rem;
  padding: 0.85rem 0.9rem 1rem;
  border: 1px solid var(--line-dark);
  border-radius: 0.4rem;
  background: var(--foam);
}

.seed-admin-inv-row legend {
  padding: 0 0.25rem;
  font-weight: 700;
  font-size: 0.95rem;
}

@media (min-width: 640px) {
  .seed-admin-inv-row {
    grid-template-columns: 1fr 1fr;
  }
}

.seed-admin-add-product {
  margin-bottom: 0.25rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--line-dark);
}

/* Product photo upload — tap / drop / preview (no URL fields) */
.seed-photo-uploader {
  display: grid;
  gap: 0.55rem;
}

.seed-photo-label {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--muted-strong);
}

.seed-photo-drop {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 11rem;
  padding: 0.75rem;
  border: 1.5px dashed color-mix(in srgb, var(--ink) 28%, transparent);
  border-radius: 0.55rem;
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--foam) 88%, #fff), #fff);
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;
  overflow: hidden;
}

.seed-photo-drop:hover,
.seed-photo-drop:focus-visible {
  border-color: color-mix(in srgb, var(--ink) 55%, transparent);
  outline: none;
}

.seed-photo-drop.is-dragging {
  border-color: var(--ink);
  background: color-mix(in srgb, var(--foam) 70%, #dbeafe);
  transform: scale(1.01);
}

.seed-photo-drop.has-photo {
  border-style: solid;
  padding: 0;
  min-height: 12rem;
}

.seed-photo-preview {
  width: 100%;
  height: 100%;
  min-height: 12rem;
  object-fit: cover;
  display: block;
  animation: seed-rise 420ms ease both;
}

.seed-photo-empty {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  text-align: center;
  padding: 0.5rem 0.75rem;
  max-width: 18rem;
}

.seed-photo-empty-title {
  font-weight: 750;
  font-size: 1rem;
  color: var(--ink);
}

.seed-photo-empty-hint {
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--muted-strong);
}

.seed-photo-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.seed-photo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.seed-photo-btn {
  appearance: none;
  border: 1px solid var(--line-dark);
  background: #fff;
  color: var(--ink);
  border-radius: 0.35rem;
  padding: 0.55rem 0.9rem;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 650;
  cursor: pointer;
}

.seed-photo-btn:hover:not(:disabled),
.seed-photo-btn:focus-visible:not(:disabled) {
  border-color: var(--ink);
}

.seed-photo-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.seed-photo-btn-muted {
  background: transparent;
  font-weight: 550;
  color: var(--muted-strong);
}

.seed-scan-intake {
  display: grid;
  gap: 0.55rem;
  margin-bottom: 0.35rem;
}

.seed-scan-camera {
  display: grid;
  gap: 0.5rem;
}

.seed-scan-viewport {
  display: grid;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid var(--line-dark);
  border-radius: 0.5rem;
  background: #0b1210;
}

.seed-scan-video {
  width: 100%;
  min-height: 12rem;
  max-height: 18rem;
  object-fit: cover;
  border-radius: 0.35rem;
  background: #000;
}

.seed-scan-hint {
  margin: 0;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: #e8efe9;
}

.seed-shop-photo-empty {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 0.35rem;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--foam) 80%, #cbd5e1), var(--foam));
  color: var(--muted-strong);
  font-size: 0.85rem;
  font-weight: 600;
}

/* —— Seed-grown shop / e-commerce —— */
.seed-shop {
  min-height: 100dvh;
  background:
    radial-gradient(ellipse 70% 45% at 90% -10%, rgba(94, 234, 212, 0.14), transparent 55%),
    var(--foam);
  color: var(--ink);
  padding: calc(1.25rem + env(safe-area-inset-top)) var(--pad-inline)
    calc(2rem + env(safe-area-inset-bottom));
}

.seed-shop-top {
  width: min(100%, var(--content));
  margin: 0 auto 1.75rem;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.seed-shop-kicker {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-strong);
}

.seed-shop-top h1 {
  margin: 0;
  font-family: "Source Serif 4", Georgia, serif;
  font-size: clamp(1.85rem, 5vw, 2.6rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.seed-shop-support {
  margin: 0.65rem 0 0;
  max-width: 36rem;
  color: var(--muted-strong);
  line-height: 1.5;
}

.seed-shop-grid {
  width: min(100%, var(--content));
  margin: 0 auto;
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .seed-shop-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 960px) {
  .seed-shop-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

.seed-shop-card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1.1rem 1rem 1.15rem;
  border: 1px solid var(--line-dark);
  border-radius: 0.5rem;
  background: #fff;
  animation: seed-rise 520ms ease both;
}

.seed-shop-photo {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 0.35rem;
  background: var(--foam);
}

.seed-shop-card h3 {
  margin: 0;
  font-size: 1.1rem;
}

.seed-shop-card p {
  margin: 0;
  color: var(--muted-strong);
  line-height: 1.45;
  flex: 1;
}

.seed-shop-price {
  margin: 0;
  font-weight: 800;
  font-size: 1.05rem;
}

.seed-shop-meta {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--muted-strong);
}

.seed-shop-card .cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 0.75rem 1.15rem;
  border: 0;
  border-radius: 0.35rem;
  background: var(--accent-ink);
  color: var(--foam);
  font-weight: 700;
  cursor: pointer;
}

.seed-shop-cart {
  width: min(100%, var(--content));
  margin: 2rem auto 0;
  padding: 1.25rem;
  border: 1px solid var(--line-dark);
  border-radius: 0.5rem;
  background: #fff;
}

.seed-shop-cart h2 {
  margin: 0 0 0.75rem;
  font-family: "Source Serif 4", Georgia, serif;
  font-size: 1.35rem;
}

.seed-shop-cart-empty {
  margin: 0;
  color: var(--muted-strong);
}

.seed-shop-cart ul {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.seed-shop-cart li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid var(--line-dark);
}

.seed-shop-checkout {
  display: grid;
  gap: 0.75rem;
}

.seed-shop-checkout label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.seed-shop-checkout input {
  min-height: var(--tap);
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--line-dark);
  border-radius: 0.35rem;
  background: var(--foam);
  color: var(--ink);
  font: inherit;
  font-size: 16px;
}
`;
}

/** Baseline CSS every Seed ships in source — mirrors the public site. */
export function seedResponsiveGlobalsCss(): string {
  return seedPublicSiteCss();
}

function esc(value: string): string {
  return value.replace(/`/g, "'").replace(/\\/g, "\\\\");
}

/** Customer-facing landing page source — full business site, not a thin stub. */
export function seedHomePageSource(
  input: SeedSiteCopy & { includeShop?: boolean },
): string {
  const brand = esc(input.brand);
  const headline = esc(input.headline);
  const support = esc(input.support);
  const cta = esc(input.cta);
  const heroImage = esc(input.heroImage);
  const shopNav = input.includeShop
    ? `
          <li>
            <a href="/shop">${input.menuItems?.length ? "Order" : "Shop"}</a>
          </li>`
    : "";
  const services = input.services
    .map(
      (service) => `          <li>
            <h3>${esc(service.title)}</h3>
            <p>${esc(service.detail)}</p>
          </li>`,
    )
    .join("\n");
  const gallery = input.gallery
    .map(
      (image) => `          <figure className="seed-gallery-item">
            <img src="${esc(image.src)}" alt="${esc(image.alt)}" loading="lazy" />
          </figure>`,
    )
    .join("\n");
  const process = input.process
    .map(
      (step, index) => `          <li>
            <span className="seed-step-num">${index + 1}</span>
            <div>
              <h3>${esc(step.title)}</h3>
              <p>${esc(step.detail)}</p>
            </div>
          </li>`,
    )
    .join("\n");
  const menuItems = input.menuItems ?? [];
  const specials = input.specials ?? [];
  const results = input.results ?? [];
  const profitPlays = input.profitPlays ?? [];
  const menuSection =
    menuItems.length > 0
      ? `
      <section className="seed-section seed-menu" id="menu">
        <div className="seed-section-inner">
          <p className="seed-eyebrow">${esc(input.menuEyebrow ?? "Menu")}</p>
          <h2>${esc(input.menuHeadline ?? "Menu")}</h2>
          ${
            input.menuSupport
              ? `<p className="lead">${esc(input.menuSupport)}</p>`
              : ""
          }
          <ul className="seed-menu-list">
${menuItems
  .map(
    (item) => `            <li>
              <div className="seed-menu-meta">
                <span className="seed-menu-cat">${esc(item.category)}</span>
                <span className="seed-menu-price">${esc(item.priceLabel)}</span>
              </div>
              <h3>${esc(item.name)}</h3>
              <p>${esc(item.detail)}</p>
            </li>`,
  )
  .join("\n")}
          </ul>
          ${
            input.includeShop
              ? `<p className="seed-menu-order">
            <a className="cta" href="/shop">Order from this menu</a>
          </p>`
              : ""
          }
        </div>
      </section>`
      : "";
  const specialsSection =
    specials.length > 0
      ? `
      <section className="seed-section seed-specials" id="specials">
        <div className="seed-section-inner">
          <p className="seed-eyebrow">${esc(input.specialsEyebrow ?? "Specials")}</p>
          <h2>${esc(input.specialsHeadline ?? "Specials")}</h2>
          <ul className="seed-specials-list">
${specials
  .map(
    (item) => `            <li>
              <h3>${esc(item.title)}</h3>
              <p>${esc(item.detail)}</p>
            </li>`,
  )
  .join("\n")}
          </ul>
        </div>
      </section>`
      : "";

  return `export default function HomePage() {
  return (
    <main className="seed-site">
      <nav className="seed-nav" aria-label="Primary">
        <a className="seed-nav-brand" href="#top">
          ${brand}
        </a>
        <ul className="seed-nav-links">
          <li>
            <a href="#services">Order</a>
          </li>
          ${
            menuItems.length > 0
              ? `<li>
            <a href="#menu">Menu</a>
          </li>`
              : ""
          }
          <li>
            <a href="#work">Work</a>
          </li>
          <li>
            <a href="#about">About</a>
          </li>${shopNav}
          <li>
            <a href="#book">${esc(input.cta)}</a>
          </li>
        </ul>
      </nav>
      <section className="seed-hero" id="top">
        <div
          className="seed-hero-media"
          style={{ backgroundImage: \`url("${heroImage}")\` }}
          aria-hidden
        />
        <div className="seed-hero-scrim" aria-hidden />
        <div className="seed-hero-copy">
          <p className="brand">${brand}</p>
          <h1>${headline}</h1>
          <p className="support">${support}</p>
          <a className="cta" href="${input.includeShop ? "/shop" : "#book"}">
            ${cta}
          </a>
        </div>
      </section>
      <section className="seed-section seed-services" id="services">
        <div className="seed-section-inner">
          <p className="seed-eyebrow">${esc(input.servicesEyebrow)}</p>
          <h2>${esc(input.servicesHeadline)}</h2>
          <ul className="seed-service-list">
${services}
          </ul>
        </div>
      </section>${menuSection}${specialsSection}
      <section className="seed-section seed-results" id="results">
        <div className="seed-section-inner">
          <p className="seed-eyebrow">${esc(input.resultsEyebrow)}</p>
          <h2>${esc(input.resultsHeadline)}</h2>
          <p className="lead">${esc(input.resultsSupport)}</p>
          <ul className="seed-results-grid">
${results
  .map(
    (stat) => `            <li>
              <span className="seed-results-value">${esc(stat.value)}</span>
              <span className="seed-results-label">${esc(stat.label)}</span>
              <p>${esc(stat.detail)}</p>
            </li>`,
  )
  .join("\n")}
          </ul>
        </div>
      </section>
      <section className="seed-gallery" id="work" aria-label="${esc(input.galleryHeadline)}">
        <div className="seed-section-inner seed-gallery-intro">
          <p className="seed-eyebrow">${esc(input.galleryEyebrow)}</p>
          <h2>${esc(input.galleryHeadline)}</h2>
        </div>
        <div className="seed-gallery-strip">
${gallery}
        </div>
      </section>
      <section className="seed-section seed-process" id="process">
        <div className="seed-section-inner">
          <p className="seed-eyebrow">${esc(input.processEyebrow)}</p>
          <h2>${esc(input.processHeadline)}</h2>
          <ol className="seed-process-list">
${process}
          </ol>
        </div>
      </section>
      <section className="seed-section seed-profit" id="profit">
        <div className="seed-section-inner">
          <p className="seed-eyebrow">${esc(input.profitEyebrow)}</p>
          <h2>${esc(input.profitHeadline)}</h2>
          <p className="lead">${esc(input.profitSupport)}</p>
          <ul className="seed-profit-list">
${profitPlays
  .map(
    (play) => `            <li>
              <h3>${esc(play.title)}</h3>
              <p>${esc(play.detail)}</p>
            </li>`,
  )
  .join("\n")}
          </ul>
        </div>
      </section>
      <section className="seed-section seed-about" id="about">
        <div className="seed-section-inner seed-about-grid">
          <div>
            <p className="seed-eyebrow">${esc(input.aboutEyebrow)}</p>
            <h2>${esc(input.aboutHeadline)}</h2>
            <p className="lead">${esc(input.aboutBody)}</p>
          </div>
          <figure className="seed-about-photo">
            <img src="${esc(input.aboutImage)}" alt="" loading="lazy" />
          </figure>
        </div>
      </section>
      <section className="seed-section seed-proof" id="proof">
        <div className="seed-section-inner">
          <p className="seed-eyebrow">${esc(input.proofEyebrow)}</p>
          <h2>${esc(input.proofHeadline)}</h2>
          <blockquote className="seed-quote">
            <p>“${esc(input.proof.quote)}”</p>
            <footer>${esc(input.proof.attribution)}</footer>
          </blockquote>
        </div>
      </section>
      <section className="seed-section seed-area" id="area">
        <div className="seed-section-inner">
          <p className="seed-eyebrow">${esc(input.areaEyebrow)}</p>
          <h2>${esc(input.areaHeadline)}</h2>
          <p className="lead">${esc(input.areaBody)}</p>
        </div>
      </section>
      <section className="seed-section seed-book" id="book">
        <div className="seed-section-inner">
          <p className="seed-eyebrow">${esc(input.bookEyebrow)}</p>
          <h2>${esc(input.bookHeadline)}</h2>
          <p className="lead">${esc(input.bookBody)}</p>
          <form className="seed-book-form" action="#" method="post">
            <label>
              Name
              <input name="name" type="text" autoComplete="name" required />
            </label>
            <label>
              Phone or email
              <input name="contact" type="text" autoComplete="tel" required />
            </label>
            <label>
              What do you need?
              <textarea name="notes" rows={4} />
            </label>
            <button className="cta" type="submit">
              ${cta}
            </button>
          </form>
          <p className="book-note">${esc(input.bookNote)}</p>
        </div>
      </section>
      <footer className="seed-footer">
        <p>${esc(input.footerNote)}</p>
      </footer>
    </main>
  );
}
`;
}

export function seedLandingCopyJson(input: SeedSiteCopy): string {
  return `${JSON.stringify(input, null, 2)}\n`;
}

/** Brief asks for a business admin (calendar / schedule / education), not Cinch. */
export function briefAsksForBusinessAdmin(brief: string): boolean {
  return /\b(admin(?:istration|istrator)?|calendar|schedule|educat\w*)\b/i.test(
    brief,
  );
}

/** Brief asks for Seed-grown shop / e-commerce (not Cinch platform checkout). */
export function briefAsksForEcommerce(brief: string): boolean {
  return /\b(e-?commerce|ecommerce|online shop|web shop|storefront|shopping cart|\bcart\b|checkout|sell products|product catalog|online store|buy online|shop online|charge card|credit card|product images?|items with (an? )?image|enter items)\b/i.test(
    brief,
  );
}

/** Brief asks to enter catalog items with images in Seed admin. */
export function briefAsksForProductImages(brief: string): boolean {
  return /\b(product images?|items with (an? )?image|image in the admin|photo(?:s)? for products?|enter items)\b/i.test(
    brief,
  );
}

/**
 * Seed needs its own admin surface: schedule/education brief, or e-commerce
 * (inventory / shipping / sales tax live in that admin — not a Cinch product).
 */
export function seedNeedsBusinessAdmin(brief: string): boolean {
  return briefAsksForBusinessAdmin(brief) || briefAsksForEcommerce(brief);
}

export type SeedAdminAppointment = {
  id: string;
  at: string;
  customerName: string;
  contact: string;
  service: string;
  location: string;
  notes: string;
  status: "scheduled" | "done" | "canceled";
};

export type SeedAdminTip = {
  id: string;
  title: string;
  body: string;
};

/** Parcel (UPS-style) vs LTL freight — grown into Seed admin with e-commerce. */
export type SeedShippingMode = {
  id: string;
  label: string;
  kind: "parcel" | "ltl";
  carrier: string;
  notes: string;
  baseRateUsd: number;
};

export type SeedSalesTaxSettings = {
  enabled: boolean;
  ratePct: number;
  taxInclusive: boolean;
  nexusStates: string[];
  notes: string;
};

export type SeedInventoryRow = {
  productId: string;
  sku: string;
  title: string;
  onHand: number;
  reorderAt: number;
  shipClass: "parcel" | "ltl";
  weightLb: number;
  /** Product photo served from Seed media after admin upload (shown in the shop). */
  imageUrl: string;
};

/** Commerce ops board inside Seed business admin (not a Cinch platform module). */
export type SeedAdminCommerce = {
  eyebrow: string;
  headline: string;
  support: string;
  inventoryEyebrow: string;
  inventoryHeadline: string;
  shippingEyebrow: string;
  shippingHeadline: string;
  taxEyebrow: string;
  taxHeadline: string;
  ordersEyebrow: string;
  ordersHeadline: string;
  originZip: string;
  shippingModes: SeedShippingMode[];
  salesTax: SeedSalesTaxSettings;
  inventory: SeedInventoryRow[];
};

/** Copy + board data that lives in the Seed source tree (`content/admin.copy.json`). */
export type SeedAdminCopy = {
  brand: string;
  title: string;
  support: string;
  scheduleEyebrow: string;
  scheduleHeadline: string;
  tipsEyebrow: string;
  tipsHeadline: string;
  services: string[];
  appointments: SeedAdminAppointment[];
  tips: SeedAdminTip[];
  /** Present when the Seed grew e-commerce — shipping, tax, inventory. */
  commerce: SeedAdminCommerce | null;
};

/** Pickup / delivery modes for pizza & restaurant ordering. */
export function seedRestaurantFulfillmentModes(): SeedShippingMode[] {
  return [
    {
      id: "fulfill-pickup",
      label: "Counter pickup",
      kind: "parcel",
      carrier: "In-store",
      notes: "Customer picks up at the counter — no delivery fee.",
      baseRateUsd: 0,
    },
    {
      id: "fulfill-delivery",
      label: "Local delivery",
      kind: "parcel",
      carrier: "Driver",
      notes: "Neighborhood delivery window — confirm address on the ticket.",
      baseRateUsd: 4.5,
    },
  ];
}

/** Default UPS parcel + LTL modes for retail / shippable catalogs. */
export function seedParcelShippingModes(): SeedShippingMode[] {
  return [
    {
      id: "ship-ups-ground",
      label: "UPS Ground",
      kind: "parcel",
      carrier: "UPS",
      notes: "Packages under parcel limits — tracking on the label.",
      baseRateUsd: 9.5,
    },
    {
      id: "ship-ups-2day",
      label: "UPS 2nd Day Air",
      kind: "parcel",
      carrier: "UPS",
      notes: "Faster parcel when the customer pays for speed.",
      baseRateUsd: 18,
    },
    {
      id: "ship-ltl",
      label: "LTL freight",
      kind: "ltl",
      carrier: "LTL partner",
      notes: "Pallet / oversize — quote class and liftgate as needed.",
      baseRateUsd: 85,
    },
  ];
}

/** Default UPS parcel + LTL + tax + inventory for Seed-grown e-commerce admin. */
export function seedCommerceAdminBoard(
  projectName: string,
  brief: string,
): SeedAdminCommerce {
  const shop = customerFacingShopCopy(projectName, brief);
  const restaurant = seedShopUsesRestaurantFulfillment(projectName, brief);
  return {
    eyebrow: restaurant ? "Orders & money" : "Commerce",
    headline: restaurant ? "Kitchen tickets & menu money" : "Shop operations",
    support: restaurant
      ? "Priced menu items, pickup vs delivery, sales tax, and every ticket total live here — so the restaurant knows what money each order is. Edit prices and stock in inventory; guests order from the Seed shop."
      : "Scan a barcode to fill manufacturer name, description, and images — then set your price and on-hand qty. UPS parcel and LTL shipping, sales tax, and fulfillment stay in this Seed’s admin, not a separate Cinch product.",
    inventoryEyebrow: restaurant ? "Menu" : "Stock",
    inventoryHeadline: restaurant
      ? "Menu items · price & on-hand"
      : "Inventory · scan to add",
    shippingEyebrow: "Fulfillment",
    shippingHeadline: restaurant ? "Pickup & delivery" : "Shipping",
    taxEyebrow: "Compliance",
    taxHeadline: "Sales tax",
    ordersEyebrow: restaurant ? "Money" : "Orders",
    ordersHeadline: restaurant ? "Tickets & order money" : "Open orders",
    originZip: "10001",
    shippingModes: restaurant
      ? seedRestaurantFulfillmentModes()
      : seedParcelShippingModes(),
    salesTax: {
      enabled: true,
      ratePct: 8.25,
      taxInclusive: false,
      nexusStates: ["NY", "NJ", "CT"],
      notes: restaurant
        ? "Collect sales tax on taxable order totals for nexus addresses."
        : "Collect on taxable ship-to addresses in nexus states.",
    },
    inventory: shop.products.map((product) => ({
      productId: product.id,
      sku: product.sku,
      title: product.title,
      onHand: product.stockQty,
      reorderAt: Math.max(2, Math.floor(product.stockQty / 5)),
      shipClass: product.shipClass,
      weightLb: product.weightLb,
      imageUrl: product.imageUrl,
    })),
  };
}

/** Business admin content grown into the Seed — calendar + education tips. */
export function customerFacingAdminCopy(
  projectName: string,
  brief: string,
): SeedAdminCopy {
  const brand = projectName.replace(/\s+Seed$/i, "").trim() || projectName;
  const key = industryKey(brief, projectName);
  const landing = customerFacingSiteCopy(projectName, brief);
  const services = landing.services.map((service) => service.title);
  const wantsShop = briefAsksForEcommerce(brief);

  const tips: SeedAdminTip[] =
    key === "lawn"
      ? [
          {
            id: "tip-route",
            title: "Cluster before you mow",
            body: "Keep windshield time under ~12 minutes between stops — recovering 1–2 jobs/day is real profit.",
          },
          {
            id: "tip-prepay",
            title: "Sell the season",
            body: "Offer ~10% off a 12-cut prepay in spring so rain weeks don’t empty the payroll account.",
          },
          {
            id: "tip-addon",
            title: "One add-on every invoice",
            body: "Fertilizer, edging, or leaf cleanup — an 8% yes at +$20 is ~$160/day on a 10-stop route.",
          },
          {
            id: "tip-crm",
            title: "Text the skip",
            body: "When weather moves a day, text the block — retained seasons are $1,200–$2,400 LTV.",
          },
        ]
      : key === "garage"
        ? [
            {
              id: "tip-diag",
              title: "Always charge the diag",
              body: "Waive only when they approve the repair same day — protects ~$89–$129 that used to vanish.",
            },
            {
              id: "tip-menu",
              title: "Maintenance menu on every RO",
              body: "Fluids/filters/wipers as a $49–$89 attach lifts ticket without another bay hour.",
            },
            {
              id: "tip-approve",
              title: "Approve-by-text in 20 minutes",
              body: "Photo + estimate same morning — shops that approve same-day clear ~30% more ROs/week.",
            },
            {
              id: "tip-follow",
              title: "Call stalled estimates twice",
              body: "Inside 48 hours recovers ~15–20% of silent approvals.",
            },
          ]
      : key === "detail"
      ? [
          {
            id: "tip-tiers",
            title: "Quote three tiers every time",
            body: "Express / full / ceramic — anchoring lifts average ticket ~18–25% vs one price.",
          },
          {
            id: "tip-rebook",
            title: "90-day rebook text",
            body: "Message at day 75; a 40% return on full details is ~$75–$100 profit per original job.",
          },
          {
            id: "tip-cluster",
            title: "Condo / office clusters",
            body: "Two cars in one lot cut travel to near zero — aim for one cluster block daily.",
          },
          {
            id: "tip-shade",
            title: "Shade beats sun",
            body: "Park in shade when you can — hot paint flash-dries soap and leaves spots.",
          },
        ]
      : briefIsPizza(projectName, brief) || key === "food"
        ? [
            {
              id: "tip-ticket",
              title: "Confirm the ticket",
              body: "Name, phone, pickup vs delivery, and pie notes before you fire the oven.",
            },
            {
              id: "tip-bundle",
              title: "Bundle sides on every pie",
              body: "Knots or salad prompt — 15% attach at $5–$6 is ~$75–$90 per 100 pies.",
            },
            {
              id: "tip-lunch",
              title: "Own the lunch dead zone",
              body: "Personal pie + drink before 2 recovers oven hours that used to sit cold.",
            },
            {
              id: "tip-tax",
              title: "Tax on the order",
              body: "Sales tax stays on this Seed’s admin — apply it before the total hits the customer.",
            },
          ]
      : key === "salon"
        ? [
            {
              id: "tip-rebook",
              title: "Book next in the chair",
              body: "A 12% rebook lift on color clients is multiple full tickets every month.",
            },
            {
              id: "tip-retail",
              title: "One product every ticket",
              body: "$35 attach on 1 in 3 tickets is ~$350 per 30 clients — recommend a single SKU.",
            },
            {
              id: "tip-peak",
              title: "Protect Saturday color",
              body: "Keep Sat AM for high-ticket color; move express cuts to Tue–Thu gaps.",
            },
            {
              id: "tip-crm",
              title: "Keep the thread",
              body: "Schedule plus notes are your CRM — capture phone/email on every book.",
            },
          ]
      : wantsShop
        ? [
            {
              id: "tip-pack",
              title: "Pack before you print",
              body: "Confirm on-hand qty and ship class (parcel vs LTL) before buying a UPS label.",
            },
            {
              id: "tip-tax",
              title: "Tax on ship-to",
              body: "Apply nexus sales tax to the taxable subtotal before shipping.",
            },
            {
              id: "tip-ltl",
              title: "When it’s LTL",
              body: "Pallet freight needs class, weight, and liftgate notes — not a small-parcel label.",
            },
            {
              id: "tip-crm",
              title: "Customer follow-up",
              body: "Open orders and contacts live here — use them as your CRM for repeats.",
            },
          ]
        : [
            {
              id: "tip-speed",
              title: "Answer in under 5 minutes",
              body: "Speed-to-lead lifts close rates roughly 20–30% vs overnight replies.",
            },
            {
              id: "tip-offer",
              title: "One offer, one reminder",
              body: "A single clear next step plus one follow-up recovers ~15% of silent leads.",
            },
            {
              id: "tip-care",
              title: "Between visits",
              body: "Share a short tip customers can use until the next appointment.",
            },
            {
              id: "tip-crm",
              title: "Keep the thread",
              body: "Schedule plus notes are your CRM — capture phone/email on every book.",
            },
          ];

  const pizzaOrFood = briefIsPizza(projectName, brief) || key === "food";
  const opsHeavy = pizzaOrFood || key === "lawn" || key === "garage" || key === "detail";

  return {
    brand,
    title: wantsShop
      ? pizzaOrFood
        ? "Business admin · Orders & tax"
        : "Business admin · Commerce"
      : opsHeavy
        ? "Business admin · Profit ops"
        : "Business admin",
    support: wantsShop
      ? pizzaOrFood
        ? "Friendly ops cover: tickets, customers, menu stock, sales tax, and follow-up — grown into this Seed, not a separate product."
        : "Schedule plus inventory, UPS/LTL shipping, sales tax, and customer follow-up — part of your Seed website."
      : key === "lawn"
        ? "Route density, seasonal prepays, and add-on scripts — AI-grown tips so the lawn book makes more money."
        : key === "garage"
          ? "Bay utilization, diagnostic fees, and approve-by-text plays — operator help that maximizes ticket value."
          : key === "detail"
        ? "Package tiers, rebooks, and cluster routes — part of your Seed website."
        : "Schedule, customer follow-up, and care tips — part of your Seed website (CRM-lite, automatic).",
    scheduleEyebrow: pizzaOrFood
      ? "Tickets"
      : key === "lawn" || key === "garage"
        ? "Jobs"
        : "Calendar",
    scheduleHeadline: pizzaOrFood
      ? "Orders & slots"
      : key === "lawn"
        ? "Routes & quotes"
        : key === "garage"
          ? "Bay schedule"
          : "Schedule",
    tipsEyebrow: "Profit",
    tipsHeadline: pizzaOrFood
      ? "Kitchen money tips"
      : key === "lawn"
        ? "Route profit tips"
        : key === "garage"
          ? "Bay profit tips"
          : wantsShop
            ? "Fulfillment tips"
            : key === "detail"
              ? "Detail profit tips"
              : "Customer care tips",
    services,
    appointments: [],
    tips,
    commerce: wantsShop ? seedCommerceAdminBoard(projectName, brief) : null,
  };
}

export function seedAdminCopyJson(input: SeedAdminCopy): string {
  return `${JSON.stringify(input, null, 2)}\n`;
}

/** Seed-grown admin page source (mirrored in the source tree). */
export function seedAdminPageSource(input: SeedAdminCopy): string {
  const brand = esc(input.brand);
  const tips = input.tips
    .map(
      (tip) => `          <li>
            <h3>${esc(tip.title)}</h3>
            <p>${esc(tip.body)}</p>
          </li>`,
    )
    .join("\n");
  const services = input.services
    .map((service) => `              <option value="${esc(service)}">${esc(service)}</option>`)
    .join("\n");

  const commerce = input.commerce;
  const commerceBlock = commerce
    ? `
      <section className="seed-admin-section" id="commerce">
        <p className="seed-eyebrow">${esc(commerce.eyebrow)}</p>
        <h2>${esc(commerce.headline)}</h2>
        <p className="seed-admin-support">${esc(commerce.support)}</p>
      </section>

      <section className="seed-admin-section" id="inventory">
        <p className="seed-eyebrow">${esc(commerce.inventoryEyebrow)}</p>
        <h2>${esc(commerce.inventoryHeadline)}</h2>
        <ul className="seed-admin-list">
${commerce.inventory
  .map(
    (row) => `          <li>
            <div>
              <p className="seed-admin-list-title">${esc(row.title)} · ${esc(row.sku)}</p>
              <p className="seed-admin-list-meta">${row.onHand} on hand · reorder at ${row.reorderAt} · ${row.shipClass} · ${row.weightLb} lb${row.imageUrl ? " · photo set" : ""}</p>
${
  row.imageUrl
    ? `            <img className="seed-shop-photo" src="${esc(row.imageUrl)}" alt="${esc(row.title)}" />`
    : ""
}
            </div>
          </li>`,
  )
  .join("\n")}
        </ul>
      </section>

      <section className="seed-admin-section" id="shipping">
        <p className="seed-eyebrow">${esc(commerce.shippingEyebrow)}</p>
        <h2>${esc(commerce.shippingHeadline)}</h2>
        <p className="seed-admin-list-meta">Ship-from ZIP ${esc(commerce.originZip)}</p>
        <ul className="seed-admin-list">
${commerce.shippingModes
  .map(
    (mode) => `          <li>
            <div>
              <p className="seed-admin-list-title">${esc(mode.label)} · ${esc(mode.carrier)}</p>
              <p className="seed-admin-list-meta">${mode.kind.toUpperCase()} · from $${mode.baseRateUsd.toFixed(2)} · ${esc(mode.notes)}</p>
            </div>
          </li>`,
  )
  .join("\n")}
        </ul>
      </section>

      <section className="seed-admin-section" id="sales-tax">
        <p className="seed-eyebrow">${esc(commerce.taxEyebrow)}</p>
        <h2>${esc(commerce.taxHeadline)}</h2>
        <p className="seed-admin-list-meta">
          ${commerce.salesTax.enabled ? "Collecting" : "Off"} · ${commerce.salesTax.ratePct}%${commerce.salesTax.taxInclusive ? " inclusive" : ""} · nexus ${esc(commerce.salesTax.nexusStates.join(", "))}
        </p>
        <p className="seed-admin-support">${esc(commerce.salesTax.notes)}</p>
      </section>`
    : "";

  return `export default function AdminPage() {
  return (
    <main className="seed-admin">
      <header className="seed-admin-top">
        <div>
          <p className="seed-admin-kicker">${esc(input.title)}</p>
          <h1>${brand}</h1>
          <p className="seed-admin-support">${esc(input.support)}</p>
        </div>
        <a className="seed-admin-link" href="/">
          View website
        </a>
      </header>

      <section className="seed-admin-section" id="schedule">
        <p className="seed-eyebrow">${esc(input.scheduleEyebrow)}</p>
        <h2>${esc(input.scheduleHeadline)}</h2>
        <form className="seed-admin-form" action="#" method="post">
          <label>
            When
            <input name="at" type="datetime-local" required />
          </label>
          <label>
            Customer
            <input name="customerName" type="text" required />
          </label>
          <label>
            Phone or email
            <input name="contact" type="text" required />
          </label>
          <label>
            Service
            <select name="service">
${services}
            </select>
          </label>
          <label className="seed-admin-span">
            Location
            <input name="location" type="text" placeholder="Driveway, lot, or pin" />
          </label>
          <label className="seed-admin-span">
            Notes
            <input name="notes" type="text" placeholder="Vehicle, gate code…" />
          </label>
          <button className="cta" type="submit">
            Add appointment
          </button>
        </form>
        <p className="seed-admin-empty">No jobs on the calendar yet.</p>
      </section>
${commerceBlock}

      <section className="seed-admin-section" id="educate">
        <p className="seed-eyebrow">${esc(input.tipsEyebrow)}</p>
        <h2>${esc(input.tipsHeadline)}</h2>
        <ul className="seed-admin-tips">
${tips}
        </ul>
      </section>
    </main>
  );
}
`;
}

export type SeedShopProduct = {
  id: string;
  title: string;
  detail: string;
  priceUsd: number;
  sku: string;
  stockQty: number;
  weightLb: number;
  shipClass: "parcel" | "ltl";
  /** Product photo — enter/edit the URL in Seed admin inventory. */
  imageUrl: string;
};

export type SeedShopOrder = {
  id: string;
  customerName: string;
  contact: string;
  shipToState: string;
  shipToZip: string;
  shippingModeId: string;
  shippingLabel: string;
  shippingKind: "parcel" | "ltl";
  subtotalUsd: number;
  taxUsd: number;
  shippingUsd: number;
  items: Array<{
    productId: string;
    title: string;
    priceUsd: number;
    qty: number;
  }>;
  totalUsd: number;
  createdAt: string;
  status: "new" | "paid" | "fulfilled";
};

/** Shop catalog that lives in the Seed source tree (`content/shop.copy.json`). */
export type SeedShopCopy = {
  brand: string;
  title: string;
  support: string;
  cta: string;
  products: SeedShopProduct[];
  orders: SeedShopOrder[];
  /** Checkout pulls rates/tax from Seed admin commerce settings. */
  originZip: string;
  shippingModes: SeedShippingMode[];
  salesTax: SeedSalesTaxSettings;
};

function withInventory(
  product: Omit<
    SeedShopProduct,
    "sku" | "stockQty" | "weightLb" | "shipClass" | "imageUrl"
  > &
    Partial<
      Pick<
        SeedShopProduct,
        "sku" | "stockQty" | "weightLb" | "shipClass" | "imageUrl"
      >
    >,
): SeedShopProduct {
  const sku =
    product.sku ??
    product.id.replace(/^prod-/, "SKU-").toUpperCase();
  return {
    ...product,
    sku,
    stockQty: product.stockQty ?? 24,
    weightLb: product.weightLb ?? 2,
    shipClass: product.shipClass ?? "parcel",
    imageUrl: product.imageUrl ?? "",
  };
}

/** Brief wants the owner to stock the catalog (scan / enter items) — not stock SKUs. */
export function briefAsksForOwnerStockedCatalog(brief: string): boolean {
  return (
    briefAsksForProductImages(brief) ||
    /\b(scan|barcode|upc|enter items|add items|my (?:own )?products|own catalog|charge card)\b/i.test(
      brief,
    )
  );
}

/** True when this brief must start with an empty shop catalog (owner stocks it). */
export function seedShopShouldStartEmpty(
  projectName: string,
  brief: string,
): boolean {
  if (!briefAsksForEcommerce(brief)) return false;
  // Pizza / restaurant menus are the catalog — orderable with prices so the
  // kitchen sees money per ticket. Empty+scan is for retail inventory intake.
  if (briefIsPizza(projectName, brief)) return false;
  if (industryKey(brief, projectName) === "food") return false;
  if (briefAsksForOwnerStockedCatalog(brief)) return true;
  return false;
}

/** Pizza / restaurant e-com uses pickup & delivery — not UPS/LTL parcel. */
export function seedShopUsesRestaurantFulfillment(
  projectName: string,
  brief: string,
): boolean {
  if (!briefAsksForEcommerce(brief)) return false;
  return (
    briefIsPizza(projectName, brief) ||
    industryKey(brief, projectName) === "food"
  );
}

const STOCK_CATALOG_FINGERPRINT =
  /prod-serum|prod-mask|prod-brush|prod-spray|prod-towel|prod-kit|prod-one|prod-two|prod-three|daily shine serum|repair mask|studio paddle|signature item|everyday essential|gift set|detail spray|microfiber set|driveway kit|between-appointment gloss|clear coat/;

function shopProductsLookLikeStockCatalog(
  products: Array<{ id?: string; title?: string; detail?: string }>,
): boolean {
  if (!products.length) return false;
  const blob = products
    .map((p) => `${p.id ?? ""} ${p.title ?? ""} ${p.detail ?? ""}`)
    .join(" ")
    .toLowerCase();
  return STOCK_CATALOG_FINGERPRINT.test(blob);
}

/** True when shipping modes look like retail UPS/LTL instead of restaurant pickup. */
export function seedShopFulfillmentMismatchesBrief(
  projectName: string,
  brief: string,
  modes: Array<{ id?: string; label?: string; carrier?: string }>,
): boolean {
  if (!seedShopUsesRestaurantFulfillment(projectName, brief)) return false;
  if (!modes.length) return true;
  const blob = modes
    .map((m) => `${m.id ?? ""} ${m.label ?? ""} ${m.carrier ?? ""}`)
    .join(" ")
    .toLowerCase();
  return /ups|ltl|freight|parcel ground|2nd day/.test(blob);
}

/**
 * True when stored shop products look wrong for this brief:
 * - Owner-stocked empty catalogs with renamed stock SKUs from another vertical
 * - Pizza / restaurant e-com with empty catalog or salon/retail stock SKUs
 */
export function seedShopCatalogMismatchesBrief(
  projectName: string,
  brief: string,
  products: Array<{ id?: string; title?: string; detail?: string }>,
): boolean {
  if (seedShopUsesRestaurantFulfillment(projectName, brief)) {
    if (!products.length) return true;
    return shopProductsLookLikeStockCatalog(products);
  }

  if (!seedShopShouldStartEmpty(projectName, brief)) return false;
  if (!products.length) return false;
  return shopProductsLookLikeStockCatalog(products);
}

/**
 * Orderable menu products for pizza / restaurant Seeds — priced so checkout
 * tracks money per order in Seed admin.
 */
export function seedRestaurantMenuProducts(
  projectName: string,
  brief: string,
): SeedShopProduct[] {
  if (briefIsPizza(projectName, brief)) {
    return [
      withInventory({
        id: "menu-cheese",
        title: "Cheese pizza",
        detail: "Hand-tossed crust, sauce, mozzarella.",
        priceUsd: 11,
        sku: "MENU-CHEESE",
        stockQty: 99,
        weightLb: 1.5,
        imageUrl:
          "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
      }),
      withInventory({
        id: "menu-pepperoni",
        title: "Pepperoni pizza",
        detail: "Extra crisp edges, generous cup-and-char.",
        priceUsd: 13,
        sku: "MENU-PEP",
        stockQty: 99,
        weightLb: 1.6,
        imageUrl:
          "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80",
      }),
      withInventory({
        id: "menu-supreme",
        title: "House supreme",
        detail: "Pepperoni, sausage, peppers, onion, mushrooms.",
        priceUsd: 16,
        sku: "MENU-SUP",
        stockQty: 99,
        weightLb: 2,
        imageUrl:
          "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
      }),
      withInventory({
        id: "menu-white",
        title: "White pie",
        detail: "Garlic oil, ricotta, mozzarella, herbs.",
        priceUsd: 15,
        sku: "MENU-WHITE",
        stockQty: 99,
        weightLb: 1.7,
        imageUrl:
          "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80",
      }),
      withInventory({
        id: "menu-knots",
        title: "Garlic knots",
        detail: "Butter, parsley, side of marinara.",
        priceUsd: 5,
        sku: "MENU-KNOTS",
        stockQty: 99,
        weightLb: 0.8,
        imageUrl:
          "https://images.unsplash.com/photo-1615478503562-a2eaedb45eae?auto=format&fit=crop&w=800&q=80",
      }),
      withInventory({
        id: "menu-salad",
        title: "Garden salad",
        detail: "House greens, tomato, cucumber, vinaigrette.",
        priceUsd: 6,
        sku: "MENU-SALAD",
        stockQty: 99,
        weightLb: 0.9,
        imageUrl:
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
      }),
    ];
  }

  if (industryKey(brief, projectName) === "food") {
    return [
      withInventory({
        id: "menu-starter",
        title: "Seasonal small plates",
        detail: "Shared bites before the main course.",
        priceUsd: 12,
        sku: "MENU-START",
        stockQty: 40,
        weightLb: 1,
      }),
      withInventory({
        id: "menu-main",
        title: "Chef’s dinner plate",
        detail: "Rotating mains matched to the market list.",
        priceUsd: 24,
        sku: "MENU-MAIN",
        stockQty: 40,
        weightLb: 1.5,
      }),
      withInventory({
        id: "menu-cocktail",
        title: "House cocktail",
        detail: "Short list, careful pours.",
        priceUsd: 11,
        sku: "MENU-DRINK",
        stockQty: 80,
        weightLb: 0.5,
      }),
    ];
  }

  return [];
}

/** Money rollup so the restaurant sees what each ticket is worth. */
export function summarizeSeedOrderMoney(orders: SeedShopOrder[]): {
  openCount: number;
  openUsd: number;
  paidCount: number;
  paidUsd: number;
  fulfilledCount: number;
  fulfilledUsd: number;
  allTicketUsd: number;
} {
  let openUsd = 0;
  let paidUsd = 0;
  let fulfilledUsd = 0;
  let openCount = 0;
  let paidCount = 0;
  let fulfilledCount = 0;
  for (const order of orders) {
    if (order.status === "new") {
      openCount += 1;
      openUsd += order.totalUsd;
    } else if (order.status === "paid") {
      paidCount += 1;
      paidUsd += order.totalUsd;
    } else if (order.status === "fulfilled") {
      fulfilledCount += 1;
      fulfilledUsd += order.totalUsd;
    }
  }
  return {
    openCount,
    openUsd: Math.round(openUsd * 100) / 100,
    paidCount,
    paidUsd: Math.round(paidUsd * 100) / 100,
    fulfilledCount,
    fulfilledUsd: Math.round(fulfilledUsd * 100) / 100,
    allTicketUsd: Math.round((openUsd + paidUsd + fulfilledUsd) * 100) / 100,
  };
}

/**
 * HARD RULE: do not rename another Seed’s stock catalog onto this one.
 * When the brief says the owner enters/scans items, start empty so they add
 * real products — never ship salon serum/mask or “Signature item” fillers.
 * Pizza / restaurant e-com ships the priced menu so orders track money.
 */
export function seedStarterShopProducts(
  projectName: string,
  brief: string,
): SeedShopProduct[] {
  if (briefAsksForEcommerce(brief)) {
    const menu = seedRestaurantMenuProducts(projectName, brief);
    if (menu.length > 0) return menu;
  }

  if (seedShopShouldStartEmpty(projectName, brief)) {
    return [];
  }

  const key = industryKey(brief, projectName);
  if (key === "salon") {
    return [
      withInventory({
        id: "prod-serum",
        title: "Daily shine serum",
        detail: "Lightweight finish for between-appointment gloss.",
        priceUsd: 28,
        stockQty: 40,
        weightLb: 0.6,
        imageUrl:
          "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
      }),
      withInventory({
        id: "prod-mask",
        title: "Repair mask",
        detail: "Weekly deep care when color or heat has been hard on hair.",
        priceUsd: 34,
        stockQty: 28,
        weightLb: 1.2,
        imageUrl:
          "https://images.unsplash.com/photo-1571781926291-c77df8097c1f?auto=format&fit=crop&w=800&q=80",
      }),
      withInventory({
        id: "prod-brush",
        title: "Studio paddle brush",
        detail: "The brush we reach for in the chair — now for home.",
        priceUsd: 22,
        stockQty: 18,
        weightLb: 0.8,
        imageUrl:
          "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80",
      }),
    ];
  }
  if (key === "detail") {
    return [
      withInventory({
        id: "prod-spray",
        title: "Detail spray",
        detail: "Quick wipe-down between full visits.",
        priceUsd: 18,
        stockQty: 36,
        weightLb: 1,
        imageUrl:
          "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80",
      }),
      withInventory({
        id: "prod-towel",
        title: "Microfiber set",
        detail: "Soft towels that won’t haze clear coat.",
        priceUsd: 24,
        stockQty: 30,
        weightLb: 1.5,
        imageUrl:
          "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=800&q=80",
      }),
      withInventory({
        id: "prod-kit",
        title: "Driveway kit",
        detail: "Foam, mitt, and dry towel for a light touch-up.",
        priceUsd: 49,
        stockQty: 12,
        weightLb: 8,
        shipClass: "parcel",
        imageUrl:
          "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80",
      }),
    ];
  }
  return [
    withInventory({
      id: "prod-one",
      title: "Signature item",
      detail: "What customers ask for most.",
      priceUsd: 29,
      stockQty: 32,
      weightLb: 2,
      imageUrl:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    }),
    withInventory({
      id: "prod-two",
      title: "Everyday essential",
      detail: "A reliable pick for repeat buyers.",
      priceUsd: 19,
      stockQty: 48,
      weightLb: 1,
      imageUrl:
        "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80",
    }),
    withInventory({
      id: "prod-three",
      title: "Gift set",
      detail: "Ready to wrap — or ship.",
      priceUsd: 45,
      stockQty: 16,
      weightLb: 5,
      imageUrl:
        "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80",
    }),
  ];
}

/** Seed-grown shop content — products + cart board for this business. */
export function customerFacingShopCopy(
  projectName: string,
  brief: string,
): SeedShopCopy {
  const brand = projectName.replace(/\s+Seed$/i, "").trim() || projectName;
  const restaurant = seedShopUsesRestaurantFulfillment(projectName, brief);
  const commerce = {
    originZip: "10001",
    shippingModes: restaurant
      ? seedRestaurantFulfillmentModes()
      : seedParcelShippingModes(),
    salesTax: {
      enabled: true,
      ratePct: 8.25,
      taxInclusive: false,
      nexusStates: ["NY", "NJ", "CT"],
      notes: restaurant
        ? "Collect sales tax on taxable order totals for nexus addresses."
        : "Collect on taxable ship-to addresses in nexus states.",
    },
  };

  const products = seedStarterShopProducts(projectName, brief);
  const ownerStocks = products.length === 0;

  return {
    brand,
    title: restaurant ? "Order" : "Shop",
    support: ownerStocks
      ? "Your catalog starts empty. Scan a barcode or add items in admin, then set price and inventory."
      : restaurant
        ? "Order from the menu — priced items go to the kitchen ticket with tax and pickup or delivery so the restaurant sees the money."
        : "Products from this business — grown into the Seed website with inventory, UPS/LTL shipping, and sales tax in admin.",
    cta: restaurant ? "Add to order" : "Add to cart",
    products,
    orders: [],
    ...commerce,
  };
}

export function seedShopCopyJson(input: SeedShopCopy): string {
  return `${JSON.stringify(input, null, 2)}\n`;
}

/** Seed-grown shop page source (mirrored in the source tree). */
export function seedShopPageSource(input: SeedShopCopy): string {
  const products = input.products
    .map(
      (product) => `        <article className="seed-shop-card">
${
  product.imageUrl
    ? `          <img className="seed-shop-photo" src="${esc(product.imageUrl)}" alt="${esc(product.title)}" />\n`
    : `          <div className="seed-shop-photo-empty" aria-hidden>Photo coming soon</div>\n`
}          <h3>${esc(product.title)}</h3>
          <p>${esc(product.detail)}</p>
          <p className="seed-shop-price">$${product.priceUsd.toFixed(2)}</p>
          <p className="seed-shop-meta">${esc(product.sku)} · ${product.stockQty} in stock · ${product.shipClass} · ${product.weightLb} lb</p>
          <button type="button" className="cta">${esc(input.cta)}</button>
        </article>`,
    )
    .join("\n");

  const modes = (input.shippingModes ?? [])
    .map(
      (mode) =>
        `            <option value="${esc(mode.id)}">${esc(mode.label)} (${mode.kind}) · $${mode.baseRateUsd.toFixed(2)}</option>`,
    )
    .join("\n");

  return `export default function ShopPage() {
  return (
    <main className="seed-shop">
      <header className="seed-shop-top">
        <div>
          <p className="seed-shop-kicker">${esc(input.title)}</p>
          <h1>${esc(input.brand)}</h1>
          <p className="seed-shop-support">${esc(input.support)}</p>
        </div>
        <a className="seed-admin-link" href="/">
          View website
        </a>
      </header>
      <div className="seed-shop-grid">
${products}
      </div>
      <section className="seed-shop-cart" id="cart">
        <h2>Cart</h2>
        <p className="seed-shop-cart-empty">Your cart is empty.</p>
        <p className="seed-shop-meta">Ship-from ${esc(input.originZip)} · tax ${input.salesTax?.ratePct ?? 0}% · UPS parcel + LTL in Seed admin.</p>
        <label>
          Shipping
          <select name="shippingModeId">
${modes}
          </select>
        </label>
      </section>
    </main>
  );
}
`;
}
