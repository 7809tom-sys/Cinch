import { promises as fs } from "fs";
import path from "path";
import { SUB_TIERS, type SubTierId } from "@/lib/lockgm/config";

/**
 * Admin-editable marketing copy for the LockGM platform product.
 * LockGM's pages are static TSX (see src/app/lockgm/*), but read their
 * headline/body copy through this store so admins can edit it from
 * CinchSeed without a code deploy — mirrors the pattern in site-settings.ts.
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

export type LockgmTierOverride = {
  blurb: string;
  perks: string[];
  cta: string;
};

export type LockgmContent = {
  hero: LockgmHeroContent;
  features: LockgmFeatureCard[];
  frontOffice: LockgmFrontOfficeContent;
  tiers: Record<SubTierId, LockgmTierOverride>;
  updatedAt: string;
};

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
  frontOffice: {
    headline: "Needs, assets, wage ceilings.",
    body: "Sit in the GM office, stress-test the budget desk, and follow the pipeline — the same tools a professional front office lives in.",
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
      frontOffice: { ...DEFAULT_CONTENT.frontOffice, ...(parsed.frontOffice ?? {}) },
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
  frontOffice: LockgmFrontOfficeContent;
  tiers: Record<SubTierId, LockgmTierOverride>;
}): Promise<LockgmContent> {
  const current = await ensureContent();

  const clean = (value: string, fallback: string) =>
    value.trim() ? value.trim() : fallback;

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
    frontOffice: {
      headline: clean(input.frontOffice.headline, current.frontOffice.headline),
      body: clean(input.frontOffice.body, current.frontOffice.body),
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
