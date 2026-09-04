/**
 * HARD RULE — AI-grown Seeds must beat 2020-era template websites.
 *
 * Parallel: kitchen design software went from ~30+ minute 2020 workflows to
 * ~4 minute AI designs with instant invoices. The same leap applies to every
 * customer Seed — Harrison Lawn, an auto garage, a salon, a pizza shop.
 *
 * Every public Seed must be thorough, ship concrete numbers (not vague
 * adjectives), and grow operator help that maximizes profit potential.
 * Thin WordPress-style stubs fail this rule.
 */
export const SEED_AI_THOROUGH_RULE = {
  id: "seed-ai-thorough-beats-2020",
  summary:
    "Every Seed site must beat 2020 templates: thorough pages, concrete numbers, and profit-maximizing operator help — the same AI leap as kitchen design software.",
  requirements: [
    "Full business site depth (hero, services, gallery, process, proof, area, book)",
    "Results band with at least 3 concrete numeric stats for the industry",
    "Profit plays band with at least 3 operator levers that cite dollars, %, or time",
    "Industry-true copy (lawn ≠ garage ≠ pizza ≠ salon) — never rename-only",
    "Admin tips that help the owner capture more revenue or cut dead time",
  ],
} as const;

export type SeedResultStat = {
  value: string;
  label: string;
  detail: string;
};

export type SeedProfitPlay = {
  title: string;
  detail: string;
};

export type SeedGrowthBoard = {
  resultsEyebrow: string;
  resultsHeadline: string;
  resultsSupport: string;
  results: SeedResultStat[];
  profitEyebrow: string;
  profitHeadline: string;
  profitSupport: string;
  profitPlays: SeedProfitPlay[];
};

/**
 * Concrete numbers + profit levers per industry.
 * Stats are operator targets / benchmarks the Seed helps chase — not fake
 * claims about a specific company unless the brief supplies them.
 */
export function seedIndustryGrowthBoard(
  key: string,
  brand: string,
  projectName: string,
  brief: string,
): SeedGrowthBoard {
  const pizza = /\b(pizza|pie|oven)\b/i.test(`${projectName} ${brief} ${brand}`);

  if (key === "lawn") {
    return {
      resultsEyebrow: "By the numbers",
      resultsHeadline: "Targets that keep routes profitable",
      resultsSupport: `${brand}’s Seed ships the math — not a three-bullet WordPress stub from 2020.`,
      results: [
        {
          value: "12–18",
          label: "stops / crew / day",
          detail: "Route density goal before overtime eats the margin.",
        },
        {
          value: "$45–$85",
          label: "avg weekly cut",
          detail: "Baseline ticket before fertilizer or aeration add-ons.",
        },
        {
          value: "3 seasons",
          label: "retained client",
          detail: "Roughly $1,200–$2,400 lifetime value on a recurring lawn.",
        },
        {
          value: "8%",
          label: "attach rate lift",
          detail: "One add-on offer per invoice — often +$15–$25 per stop.",
        },
      ],
      profitEyebrow: "Grow the yard book",
      profitHeadline: "Levers that put more money on the truck",
      profitSupport:
        "AI-grown ops tips with dollars and minutes — the same standard that made kitchen design software leap past 2020.",
      profitPlays: [
        {
          title: "Cluster the route",
          detail:
            "Batch ZIP clusters so windshield time drops under ~12 minutes between stops — recovers 1–2 jobs/day.",
        },
        {
          title: "Seasonal prepay",
          detail:
            "Offer 10% off a 12-cut prepay; cash in spring covers crew weeks when rain cancels.",
        },
        {
          title: "One add-on script",
          detail:
            "Ask every invoice: fertilizer, edging, or leaf cleanup — an 8% yes rate at +$20 is ~$160/day on 10 stops.",
        },
      ],
    };
  }

  if (key === "garage") {
    return {
      resultsEyebrow: "By the numbers",
      resultsHeadline: "Bay math that pays the rent",
      resultsSupport: `${brand} gets a shop-floor site with real service dollars — not a 2020 “Contact Us” template.`,
      results: [
        {
          value: "$89–$129",
          label: "diagnostic fee",
          detail: "Paid diagnosis that converts ~55–65% into repair work.",
        },
        {
          value: "1.4×",
          label: "parts × labor",
          detail: "Healthy mix keeps average repair tickets near $380–$520.",
        },
        {
          value: "72%",
          label: "bay utilization",
          detail: "Target booked hours vs open bay time across a 5-day week.",
        },
        {
          value: "48 hrs",
          label: "follow-up window",
          detail: "Missed-approve estimates recover ~15–20% when called twice.",
        },
      ],
      profitEyebrow: "Fill the bays",
      profitHeadline: "How the garage captures more ticket value",
      profitSupport:
        "Concrete operator plays — the Seed should help maximize profit, not just look pretty.",
      profitPlays: [
        {
          title: "Always charge the diag",
          detail:
            "Waive only when the customer approves the repair same day — protects ~$100 that used to vanish.",
        },
        {
          title: "Maintenance menu on every RO",
          detail:
            "Fluids, filters, wipers as a $49–$89 attach — lifts ticket without another bay hour.",
        },
        {
          title: "Approve-by-text",
          detail:
            "Photo + estimate in under 20 minutes; shops that approve same-day clear ~30% more ROs/week.",
        },
      ],
    };
  }

  if (key === "detail") {
    return {
      resultsEyebrow: "By the numbers",
      resultsHeadline: "Driveway throughput that beats a shop wait",
      resultsSupport: `${brand}’s Seed prices packages and route math like a real mobile detail — not a 2020 brochure.`,
      results: [
        {
          value: "$89–$129",
          label: "express detail",
          detail: "Fast exterior that fills gaps between full packages.",
        },
        {
          value: "$189–$249",
          label: "full detail",
          detail: "Interior + exterior ticket that funds a proper stop.",
        },
        {
          value: "4 stops",
          label: "per tech / day",
          detail: "Mobile route target vs ~2 drop-offs at a fixed bay.",
        },
        {
          value: "+$150–$300",
          label: "ceramic upsell",
          detail: "Protection add-on on roughly 1 in 5 full details.",
        },
      ],
      profitEyebrow: "More shine, more margin",
      profitHeadline: "Packages and follow-ups that print money",
      profitSupport:
        "Operator levers with dollars — prove AI-built sites help the business win.",
      profitPlays: [
        {
          title: "Quote three tiers every time",
          detail:
            "Express / full / ceramic — anchoring lifts average ticket ~18–25% vs a single price.",
        },
        {
          title: "90-day rebook",
          detail:
            "Text at day 75; a 40% return rate on full details is ~$75–$100 of profit per original job.",
        },
        {
          title: "Condo / office clusters",
          detail:
            "Two cars in one lot cut travel to near zero — aim for one cluster block daily.",
        },
      ],
    };
  }

  if (key === "food") {
    return {
      resultsEyebrow: "By the numbers",
      resultsHeadline: pizza
        ? "Ticket math that keeps the oven busy"
        : "Covers and tickets that pay the room",
      resultsSupport: pizza
        ? `${brand} ships priced menu + order flow — Domino’s-grade clarity, not a 2020 placeholder.`
        : `${brand} shows real hospitality density — prices, proof, and booking that convert.`,
      results: pizza
        ? [
            {
              value: "$28–$42",
              label: "online avg ticket",
              detail: "Online orders typically run $6–$12 above walk-up alone.",
            },
            {
              value: "$4.50",
              label: "delivery fee",
              detail: "Keeps driver cost off the pie margin when priced right.",
            },
            {
              value: "22 min",
              label: "carryout target",
              detail: "Promise windows guests trust — faster than most 2020 sites even stated.",
            },
            {
              value: "2×",
              label: "lunch fill",
              detail: "Express lunch slots before 2 fill dead oven hours.",
            },
          ]
        : [
            {
              value: "$48–$72",
              label: "avg check",
              detail: "Dinner check target with beverage attach.",
            },
            {
              value: "1.3×",
              label: "turns Fri–Sat",
              detail: "Table turns on peak nights without rushing the room.",
            },
            {
              value: "18%",
              label: "bar attach",
              detail: "Cocktail / wine share that lifts contribution margin.",
            },
            {
              value: "48 hrs",
              label: "reserve lead",
              detail: "Most booked covers land inside two days — answer fast.",
            },
          ],
      profitEyebrow: "Fill every ticket",
      profitHeadline: pizza
        ? "Kitchen levers that raise nightly sales"
        : "Hospitality levers that raise contribution",
      profitSupport:
        "Concrete plays so the business sees why an AI-grown Seed beats a 2020 template.",
      profitPlays: pizza
        ? [
            {
              title: "Bundle sides on every pie",
              detail:
                "Knots or salad prompt at checkout — a 15% attach at $5–$6 is ~$75–$90 per 100 pies.",
            },
            {
              title: "Own the lunch dead zone",
              detail:
                "Personal pie + drink before 2 — recovers oven hours that used to sit cold.",
            },
            {
              title: "Route delivery by neighborhood",
              detail:
                "Batch 3–4 drops per loop; shaving 8 minutes/route funds another ticket/hour.",
            },
          ]
        : [
            {
              title: "Prix fixe midweek",
              detail:
                "Three courses at a set price fills Tue–Wed covers that otherwise stay dark.",
            },
            {
              title: "Bar first for walk-ins",
              detail:
                "Seat the bar while tables turn — captures $11–$16/cover you’d otherwise refuse.",
            },
            {
              title: "Confirm reservations twice",
              detail:
                "SMS day-of cuts no-shows ~20–30% on weekend books.",
            },
          ],
    };
  }

  if (key === "salon") {
    return {
      resultsEyebrow: "By the numbers",
      resultsHeadline: "Chair economics that fund the studio",
      resultsSupport: `${brand} gets appointment-first density with retail math — not a 2020 “Call for hours” page.`,
      results: [
        {
          value: "70%+",
          label: "chair utilization",
          detail: "Booked hours target that supports ~$4k–$7k/week per stylist.",
        },
        {
          value: "$28–$45",
          label: "retail attach",
          detail: "Home-care ticket add when the consult recommends one product.",
        },
        {
          value: "6–8 wks",
          label: "color return",
          detail: "Recurring color cadence that compounds annual revenue.",
        },
        {
          value: "12%",
          label: "rebooking lift",
          detail: "Book-next before they leave vs hoping they remember.",
        },
      ],
      profitEyebrow: "Fill the book",
      profitHeadline: "Studio plays that raise weekly revenue",
      profitSupport:
        "Operator tips with dollars — AI should help the salon make more, not just look nicer.",
      profitPlays: [
        {
          title: "Book the next visit in the chair",
          detail:
            "A 12% rebook lift on color clients is multiple full tickets every month.",
        },
        {
          title: "One product, every ticket",
          detail:
            "Recommend a single home-care SKU — $35 attach on 1 in 3 tickets is ~$350 per 30 clients.",
        },
        {
          title: "Protect peak hours",
          detail:
            "Keep Sat AM for high-ticket color; move express cuts to Tue–Thu gaps.",
        },
      ],
    };
  }

  if (key === "retail") {
    return {
      resultsEyebrow: "By the numbers",
      resultsHeadline: "Floor metrics that beat endless aisles",
      resultsSupport: `${brand} shows visit math and basket targets — denser than a 2020 Shopify theme dump.`,
      results: [
        {
          value: "$42–$68",
          label: "avg basket",
          detail: "In-store target when essentials + one impulse sit together.",
        },
        {
          value: "2.4",
          label: "units / ticket",
          detail: "Healthy mix vs single-item grab-and-go.",
        },
        {
          value: "18 min",
          label: "visit length",
          detail: "Curated floor — in and out without warehouse fatigue.",
        },
        {
          value: "22%",
          label: "repeat in 30 days",
          detail: "Neighborhood loyalty goal for a tight assortment.",
        },
      ],
      profitEyebrow: "Raise the basket",
      profitHeadline: "Merchandising levers that grow margin",
      profitSupport:
        "Concrete retail plays — prove the AI-grown Seed helps the register.",
      profitPlays: [
        {
          title: "Staff-pick endcap",
          detail:
            "Rotate one featured table weekly — lifts attach ~10–15% on those SKUs.",
        },
        {
          title: "Hold + text",
          detail:
            "Reserve an item for 24 hours; converts browsers who would bounce to big-box.",
        },
        {
          title: "Ship the heavy",
          detail:
            "Offer parcel on bulky gifts — captures tickets you’d lose to “I’ll think about it.”",
        },
      ],
    };
  }

  if (key === "trade") {
    return {
      resultsEyebrow: "By the numbers",
      resultsHeadline: "Call economics that keep trucks busy",
      resultsSupport: `${brand} ships diagnostic and close-rate math — not a 2020 contractor flyer PDF.`,
      results: [
        {
          value: "$89–$129",
          label: "diagnostic",
          detail: "Paid visit that converts ~60% into repair work.",
        },
        {
          value: "$29–$49",
          label: "maintenance / mo",
          detail: "Contract that smooths cash when emergency calls slow.",
        },
        {
          value: "90 min",
          label: "first-visit resolve",
          detail: "Target for common fixes — fewer second trips.",
        },
        {
          value: "24 hrs",
          label: "quote follow-up",
          detail: "Same-day or next-morning call recovers stalled approvals.",
        },
      ],
      profitEyebrow: "Win more jobs",
      profitHeadline: "Field plays that raise close rate and LTV",
      profitSupport:
        "Dollar and hour levers — AI-grown help for the owner, not filler tips.",
      profitPlays: [
        {
          title: "Price before tear-in",
          detail:
            "Clear approve/decline cuts unpaid labor that used to vanish into “looking at it.”",
        },
        {
          title: "Sell the maintenance plan",
          detail:
            "One plan per 5 service calls at $39/mo is ~$2,300/year recurring from that cohort.",
        },
        {
          title: "Photo proof on every RO",
          detail:
            "Before/after on the phone builds trust — shops using proof close ~10–15% more upsells.",
        },
      ],
    };
  }

  return {
    resultsEyebrow: "By the numbers",
    resultsHeadline: "Proof this isn’t a 2020 template",
    resultsSupport: `${brand}’s Seed ships measurable operating targets — the same AI thoroughness that cut kitchen design from 30+ minutes to minutes.`,
    results: [
      {
        value: "<5 min",
        label: "lead response",
        detail: "Speed-to-lead lifts close rates roughly 20–30% vs overnight replies.",
      },
      {
        value: "3×",
        label: "site depth",
        detail: "Sections visitors expect from a real business — not a hero stub.",
      },
      {
        value: "1 book path",
        label: "clear CTA",
        detail: "One primary action so prospects aren’t hunting a phone number.",
      },
      {
        value: "24/7",
        label: "always on",
        detail: "The Seed works while the owner is on the job.",
      },
    ],
    profitEyebrow: "Grow the book",
    profitHeadline: "Levers that turn visits into revenue",
    profitSupport:
      "Every Seed should help the company maximize profit potential — concrete plays, not fluff.",
    profitPlays: [
      {
        title: "Answer while it’s hot",
        detail:
          "Reply to web leads inside 5 minutes — the deal often cools after the first hour.",
      },
      {
        title: "One offer, one follow-up",
        detail:
          "A single clear next step plus one reminder recovers ~15% of silent leads.",
      },
      {
        title: "Show proof early",
        detail:
          "Put results and process above the fold path — visitors decide in under a minute.",
      },
    ],
  };
}

/** True when landing copy is missing the AI-thorough results / profit bands. */
export function seedGrowthBoardLooksThin(copy: {
  results?: unknown[];
  profitPlays?: unknown[];
}): boolean {
  return (
    !Array.isArray(copy.results) ||
    copy.results.length < 3 ||
    !Array.isArray(copy.profitPlays) ||
    copy.profitPlays.length < 3
  );
}
