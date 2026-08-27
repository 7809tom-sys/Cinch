import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { SUB_TIERS, type SubTierId } from "@/lib/lockgm/config";

/**
 * Admin-editable marketing copy for the LockGM platform product.
 * LockGM's pages are static TSX (see src/app/lockgm/*), but read their
 * headline/body copy through this store so admins can edit it from
 * CinchSeed without a code deploy — mirrors the pattern in site-settings.ts.
 *
 * Not covered: the interactive tools themselves (draft board, cap/trade
 * desk, scouting pipeline) and the /draft, /cap, /scouting page headers,
 * which are generated per-sport from src/lib/lockgm/sports.ts rather than
 * static copy.
 */

export type LockgmHeroContent = {
  headline: string;
  subhead: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
};

export type LockgmFeatureCard = {
  title: string;
  body: string;
};

export type LockgmFrontOfficeContent = {
  headline: string;
  body: string;
};

export type LockgmSectionIntro = {
  kicker: string;
  headline: string;
  body: string;
};

export type LockgmReportsContent = LockgmSectionIntro & {
  aiHeadline: string;
  aiBody: string;
  boardHeadline: string;
  boardBody: string;
};

export type LockgmTierOverride = {
  blurb: string;
  perks: string[];
  cta: string;
};

export type LockgmContent = {
  hero: LockgmHeroContent;
  features: LockgmFeatureCard[];
  worldSports: { kicker: string; headline: string };
  frontOffice: LockgmFrontOfficeContent;
  pricingIntro: LockgmSectionIntro;
  officeIntro: LockgmSectionIntro;
  reportsIntro: LockgmReportsContent;
  tiers: Record<SubTierId, LockgmTierOverride>;
  updatedAt: string;
};

/**
 * Validates AI-drafted content before it's shown to an admin for review.
 * Mirrors `LockgmContent` minus `updatedAt` (which the store sets itself).
 * Kept intentionally strict (non-empty strings, exactly 3 feature cards) so
 * a malformed or partial model response fails loudly instead of silently
 * blanking out sections of the live page.
 */
const nonEmptyString = z.string().trim().min(1);

export const lockgmContentDraftSchema = z.object({
  hero: z.object({
    headline: nonEmptyString,
    subhead: nonEmptyString,
    primaryCtaLabel: nonEmptyString,
    secondaryCtaLabel: nonEmptyString,
  }),
  features: z
    .array(z.object({ title: nonEmptyString, body: nonEmptyString }))
    .length(3),
  worldSports: z.object({ kicker: nonEmptyString, headline: nonEmptyString }),
  frontOffice: z.object({ headline: nonEmptyString, body: nonEmptyString }),
  pricingIntro: z.object({
    kicker: nonEmptyString,
    headline: nonEmptyString,
    body: nonEmptyString,
  }),
  officeIntro: z.object({
    kicker: nonEmptyString,
    headline: nonEmptyString,
    body: nonEmptyString,
  }),
  reportsIntro: z.object({
    kicker: nonEmptyString,
    headline: nonEmptyString,
    body: nonEmptyString,
    aiHeadline: nonEmptyString,
    aiBody: nonEmptyString,
    boardHeadline: nonEmptyString,
    boardBody: nonEmptyString,
  }),
  tiers: z.object({
    free: z.object({
      blurb: nonEmptyString,
      perks: z.array(nonEmptyString).min(1),
      cta: nonEmptyString,
    }),
    pro: z.object({
      blurb: nonEmptyString,
      perks: z.array(nonEmptyString).min(1),
      cta: nonEmptyString,
    }),
    pipeline: z.object({
      blurb: nonEmptyString,
      perks: z.array(nonEmptyString).min(1),
      cta: nonEmptyString,
    }),
  }),
});

export type LockgmContentDraft = z.infer<typeof lockgmContentDraftSchema>;

const DEFAULT_CONTENT: LockgmContent = {
  hero: {
    headline: "Be the Shadow GM.",
    subhead:
      "AI scout research, your numbered reports, and draft-day races — across the world’s biggest team sports.",
    primaryCtaLabel: "Open my reports",
    secondaryCtaLabel: "Enter draft day",
  },
  features: [
    {
      title: "AI scout pair",
      body: "Assign Scout Alpha (tape) and Scout Beta (comps) to dig — then claim the merge as your SR-###.",
    },
    {
      title: "Your numbered board",
      body: "Key in a customer / scout number. Type reports by hand or from AI. Lock them for draft day.",
    },
    {
      title: "Beat the pick",
      body: "On draft day, lock your call before the team on the clock. Right name, early lock — you beat the room.",
    },
  ],
  worldSports: {
    kicker: "WORLD TEAM SPORTS",
    headline: "One war room. Eight sports.",
  },
  frontOffice: {
    headline: "Needs, assets, wage ceilings.",
    body: "Sit in the GM office, stress-test the budget desk, and follow the pipeline — the same tools a professional front office lives in.",
  },
  pricingIntro: {
    kicker: "SUBSCRIPTIONS",
    headline: "Pick your seat in the war room",
    body: "Draft day is free. The upgrade is scouting reports — $20/yr for one sport, $59/yr when you want every sport on the calendar.",
  },
  officeIntro: {
    kicker: "GM OFFICE",
    headline: "Run it like a pro",
    body: "Franchise mode, roster needs, assets, and a decision log — switch sports in the bar above to sit in a different front office.",
  },
  reportsIntro: {
    kicker: "SCOUT NOTEBOOK",
    headline: "Your numbered board",
    body: "Assign Scout Alpha (tape) and Scout Beta (comps) to research a prospect, or type the report yourself. Every report gets an SR-### tied to your customer / scout number — tabulate, lock for draft day, then beat the pick live.",
    aiHeadline: "AI research pair",
    aiBody:
      "Two dedicated research AIs. Run one or both, edit the merge, claim it onto your board.",
    boardHeadline: "Tabulate & wait for draft day",
    boardBody:
      "Key in your customer number, write freeform reports, and mark them locked when you’re ready for the live clock.",
  },
  tiers: Object.fromEntries(
    SUB_TIERS.map((tier) => [
      tier.id,
      { blurb: tier.blurb, perks: [...tier.perks], cta: tier.cta },
    ]),
  ) as Record<SubTierId, LockgmTierOverride>,
  updatedAt: new Date(0).toISOString(),
};

const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", "cinch-seed-data")
    : path.join(process.cwd(), ".data");
const CONTENT_PATH = path.join(DATA_DIR, "lockgm-content.json");

let memoryContent: LockgmContent | null = null;

function mergeTiers(
  parsedTiers: Partial<Record<SubTierId, Partial<LockgmTierOverride>>> | undefined,
): Record<SubTierId, LockgmTierOverride> {
  const merged = structuredClone(DEFAULT_CONTENT.tiers);
  for (const tier of SUB_TIERS) {
    const override = parsedTiers?.[tier.id];
    if (!override) continue;
    merged[tier.id] = {
      blurb:
        typeof override.blurb === "string" && override.blurb.trim()
          ? override.blurb
          : merged[tier.id].blurb,
      perks: Array.isArray(override.perks) && override.perks.length
        ? override.perks
        : merged[tier.id].perks,
      cta:
        typeof override.cta === "string" && override.cta.trim()
          ? override.cta
          : merged[tier.id].cta,
    };
  }
  return merged;
}

async function ensureContent(): Promise<LockgmContent> {
  if (memoryContent) return memoryContent;
  try {
    const raw = await fs.readFile(CONTENT_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<LockgmContent>;
    memoryContent = {
      hero: { ...DEFAULT_CONTENT.hero, ...(parsed.hero ?? {}) },
      features:
        Array.isArray(parsed.features) && parsed.features.length === 3
          ? (parsed.features as LockgmFeatureCard[])
          : structuredClone(DEFAULT_CONTENT.features),
      worldSports: { ...DEFAULT_CONTENT.worldSports, ...(parsed.worldSports ?? {}) },
      frontOffice: { ...DEFAULT_CONTENT.frontOffice, ...(parsed.frontOffice ?? {}) },
      pricingIntro: {
        ...DEFAULT_CONTENT.pricingIntro,
        ...(parsed.pricingIntro ?? {}),
      },
      officeIntro: {
        ...DEFAULT_CONTENT.officeIntro,
        ...(parsed.officeIntro ?? {}),
      },
      reportsIntro: {
        ...DEFAULT_CONTENT.reportsIntro,
        ...(parsed.reportsIntro ?? {}),
      },
      tiers: mergeTiers(parsed.tiers),
      updatedAt: parsed.updatedAt ?? DEFAULT_CONTENT.updatedAt,
    };
    return memoryContent;
  } catch {
    memoryContent = structuredClone(DEFAULT_CONTENT);
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(
        CONTENT_PATH,
        JSON.stringify(memoryContent, null, 2),
        "utf8",
      );
    } catch {
      // memory-only on read-only hosts
    }
    return memoryContent;
  }
}

async function writeContent(content: LockgmContent): Promise<void> {
  memoryContent = content;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CONTENT_PATH, JSON.stringify(content, null, 2), "utf8");
  } catch {
    // keep memory copy
  }
}

export async function getLockgmContent(): Promise<LockgmContent> {
  return ensureContent();
}

export async function updateLockgmContent(input: {
  hero: LockgmHeroContent;
  features: LockgmFeatureCard[];
  worldSports: { kicker: string; headline: string };
  frontOffice: LockgmFrontOfficeContent;
  pricingIntro: LockgmSectionIntro;
  officeIntro: LockgmSectionIntro;
  reportsIntro: LockgmReportsContent;
  tiers: Record<SubTierId, LockgmTierOverride>;
}): Promise<LockgmContent> {
  const current = await ensureContent();

  const clean = (value: string, fallback: string) =>
    value.trim() ? value.trim() : fallback;

  const cleanIntro = (
    incoming: LockgmSectionIntro,
    existing: LockgmSectionIntro,
  ): LockgmSectionIntro => ({
    kicker: clean(incoming.kicker, existing.kicker),
    headline: clean(incoming.headline, existing.headline),
    body: clean(incoming.body, existing.body),
  });

  const next: LockgmContent = {
    hero: {
      headline: clean(input.hero.headline, current.hero.headline),
      subhead: clean(input.hero.subhead, current.hero.subhead),
      primaryCtaLabel: clean(
        input.hero.primaryCtaLabel,
        current.hero.primaryCtaLabel,
      ),
      secondaryCtaLabel: clean(
        input.hero.secondaryCtaLabel,
        current.hero.secondaryCtaLabel,
      ),
    },
    features: current.features.map((existing, index) => {
      const incoming = input.features[index];
      if (!incoming) return existing;
      return {
        title: clean(incoming.title, existing.title),
        body: clean(incoming.body, existing.body),
      };
    }),
    worldSports: {
      kicker: clean(input.worldSports.kicker, current.worldSports.kicker),
      headline: clean(
        input.worldSports.headline,
        current.worldSports.headline,
      ),
    },
    frontOffice: {
      headline: clean(input.frontOffice.headline, current.frontOffice.headline),
      body: clean(input.frontOffice.body, current.frontOffice.body),
    },
    pricingIntro: cleanIntro(input.pricingIntro, current.pricingIntro),
    officeIntro: cleanIntro(input.officeIntro, current.officeIntro),
    reportsIntro: {
      ...cleanIntro(input.reportsIntro, current.reportsIntro),
      aiHeadline: clean(
        input.reportsIntro.aiHeadline,
        current.reportsIntro.aiHeadline,
      ),
      aiBody: clean(input.reportsIntro.aiBody, current.reportsIntro.aiBody),
      boardHeadline: clean(
        input.reportsIntro.boardHeadline,
        current.reportsIntro.boardHeadline,
      ),
      boardBody: clean(
        input.reportsIntro.boardBody,
        current.reportsIntro.boardBody,
      ),
    },
    tiers: mergeTiers(input.tiers),
    updatedAt: new Date().toISOString(),
  };

  await writeContent(next);
  return next;
}

export async function resetLockgmContent(): Promise<LockgmContent> {
  const next = { ...structuredClone(DEFAULT_CONTENT), updatedAt: new Date().toISOString() };
  await writeContent(next);
  return next;
}
