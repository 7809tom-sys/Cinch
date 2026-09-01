import { randomUUID } from "crypto";
import type { AgentSkill } from "./agents";
import { readJsonStore, writeJsonStore } from "./kv-store";
import { moduleReuseFee } from "./pricing";

export type LibraryModule = {
  id: string;
  /** Stable key used to dedupe/reuse across Seeds */
  slug: string;
  title: string;
  summary: string;
  skills: AgentSkill[];
  sourceProjectId: string;
  sourceProjectName: string;
  sourceTaskId: string;
  /** What the first customer effectively funded to create this modular */
  originalCostUsd: number;
  /** Account that funded creation — receives 8% credit on each reuse */
  creatorAccountId: string;
  /** Running credit balance earned from reuses (USD) */
  creatorCreditBalanceUsd: number;
  /** Lifetime credits issued from reuses (USD) */
  creatorCreditEarnedUsd: number;
  timesUsed: number;
  createdAt: string;
  updatedAt: string;
};

export type CreatorCreditLedgerEntry = {
  id: string;
  moduleId: string;
  moduleTitle: string;
  creatorAccountId: string;
  reuseProjectId: string;
  reuseFeeUsd: number;
  creditUsd: number;
  createdAt: string;
};


type LibraryStore = {
  modules: LibraryModule[];
  creditLedger: CreatorCreditLedgerEntry[];
};

const STORE_KEY = "module-library";

let memory: LibraryStore | null = null;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureLibrary(): Promise<LibraryStore> {
  if (memory) return memory;
  const loaded = await readJsonStore<LibraryStore>(STORE_KEY, {
    modules: [],
    creditLedger: [],
  });
  memory = {
    modules: loaded.modules ?? [],
    creditLedger: loaded.creditLedger ?? [],
  };
  return memory;
}

async function writeLibrary(store: LibraryStore): Promise<void> {
  memory = store;
  await writeJsonStore(STORE_KEY, store);
}

export async function listLibraryModules(): Promise<LibraryModule[]> {
  const store = await ensureLibrary();
  return [...store.modules].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

/**
 * HARD BUILD RULE — modulars first:
 * When deciding how to build a Seed site, go to the existing library modulars
 * right away, adopt what fits, and only custom-build the gaps.
 */
export const SEED_BUILD_MODULARS_FIRST_RULE = {
  summary:
    "Survey existing library modulars first, adopt matches, then custom-build only what remains.",
  steps: [
    "Open the shared modular library before inventing new work.",
    "Adopt every modular that fits the Seed brief (reuse fee, not a rebuild).",
    "Custom-build only the gaps modulars do not cover.",
  ],
} as const;

function scoreModuleForBrief(
  module: LibraryModule,
  brief: string,
  projectName: string,
): number {
  const hay = `${projectName} ${brief}`.toLowerCase();
  const parts = `${module.title} ${module.summary} ${module.skills.join(" ")}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3);
  let score = 0;
  const seen = new Set<string>();
  for (const token of parts) {
    if (seen.has(token)) continue;
    seen.add(token);
    if (hay.includes(token)) score += 2;
  }
  // Universal site modulars — always useful when present.
  if (
    /responsive|cross-device|booking|contact|seo|trust|health|polish mobile|landing|shell|frontend/i.test(
      module.title,
    )
  ) {
    score += 3;
  }
  score += Math.min(3, module.timesUsed);
  return score;
}

/**
 * Pick library modulars for a Seed before any custom plan.
 * Prefers brief matches; falls back to universal site modulars.
 */
export async function selectModulesForSeedBuild(input: {
  brief: string;
  projectName: string;
  limit?: number;
}): Promise<LibraryModule[]> {
  const limit = input.limit ?? 8;
  const all = await listLibraryModules();
  if (all.length === 0) return [];

  const scored = all
    .map((module) => ({
      module,
      score: scoreModuleForBrief(module, input.brief, input.projectName),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.module.timesUsed - a.module.timesUsed ||
        b.module.updatedAt.localeCompare(a.module.updatedAt),
    );

  const matched = scored.filter((item) => item.score > 0).map((item) => item.module);
  if (matched.length > 0) return matched.slice(0, limit);

  return all
    .filter((module) =>
      /responsive|booking|contact|seo|trust|health|landing|shell|polish mobile/i.test(
        module.title,
      ),
    )
    .slice(0, limit);
}

/**
 * Every finished modular automatically lands in the shared library.
 * Same title/slug updates the existing entry so future builds can reuse it.
 */
export async function upsertLibraryModule(input: {
  title: string;
  summary: string;
  skills: AgentSkill[];
  sourceProjectId: string;
  sourceProjectName: string;
  sourceTaskId: string;
  originalCostUsd?: number;
  creatorAccountId?: string;
}): Promise<LibraryModule> {
  const store = await ensureLibrary();
  const slug = slugify(input.title) || randomUUID();
  const stamp = new Date().toISOString();
  const existing = store.modules.find((module) => module.slug === slug);

  if (existing) {
    existing.title = input.title.trim();
    existing.summary = input.summary.trim();
    existing.skills = input.skills;
    existing.sourceProjectId = input.sourceProjectId;
    existing.sourceProjectName = input.sourceProjectName;
    existing.sourceTaskId = input.sourceTaskId;
    // Keep the first-customer creation cost; don't overwrite on reuse.
    if (
      (!existing.originalCostUsd || existing.originalCostUsd <= 0) &&
      typeof input.originalCostUsd === "number"
    ) {
      existing.originalCostUsd = Math.max(0, input.originalCostUsd);
    }
    if (!existing.creatorAccountId) {
      existing.creatorAccountId = (
        input.creatorAccountId ||
        input.sourceProjectId ||
        existing.sourceProjectId
      ).trim();
    }
    existing.creatorCreditBalanceUsd = existing.creatorCreditBalanceUsd ?? 0;
    existing.creatorCreditEarnedUsd = existing.creatorCreditEarnedUsd ?? 0;
    existing.timesUsed += 1;
    existing.updatedAt = stamp;
    await writeLibrary(store);
    return existing;
  }

  const module: LibraryModule = {
    id: randomUUID(),
    slug,
    title: input.title.trim(),
    summary: input.summary.trim(),
    skills: input.skills,
    sourceProjectId: input.sourceProjectId,
    sourceProjectName: input.sourceProjectName,
    sourceTaskId: input.sourceTaskId,
    originalCostUsd: Math.max(0, Number(input.originalCostUsd) || 0),
    creatorAccountId: (input.creatorAccountId || input.sourceProjectId).trim(),
    creatorCreditBalanceUsd: 0,
    creatorCreditEarnedUsd: 0,
    timesUsed: 1,
    createdAt: stamp,
    updatedAt: stamp,
  };
  store.modules.unshift(module);
  store.modules = store.modules.slice(0, 200);
  await writeLibrary(store);
  return module;
}

/** Mark a library module as referenced by a later Seed build. */
export async function recordLibraryReuse(moduleId: string): Promise<void> {
  const store = await ensureLibrary();
  const module = store.modules.find((item) => item.id === moduleId);
  if (!module) return;
  module.timesUsed += 1;
  module.updatedAt = new Date().toISOString();
  await writeLibrary(store);
}


/** Quote reuse of a library modular for a later Seed (85% of create + merge). */
export async function quoteModuleReuse(input: {
  moduleId: string;
  aiMergeCostUsd: number;
}): Promise<{
  module: LibraryModule;
  originalCostUsd: number;
  aiMergeCostUsd: number;
  basisUsd: number;
  feeUsd: number;
  creatorCreditUsd: number;
  rate: number;
  creatorCreditRate: number;
} | null> {
  const store = await ensureLibrary();
  const module = store.modules.find((item) => item.id === input.moduleId);
  if (!module) return null;
  const quote = moduleReuseFee({
    originalModularCostUsd: module.originalCostUsd || 0,
    aiMergeCostUsd: input.aiMergeCostUsd,
  });
  return {
    module,
    originalCostUsd: module.originalCostUsd || 0,
    aiMergeCostUsd: Math.max(0, Number(input.aiMergeCostUsd) || 0),
    ...quote,
  };
}

/**
 * Apply a reuse: charge the later Seed the reuse fee, and credit 8%
 * back to the original creator's account balance.
 */
export async function applyModuleReuse(input: {
  moduleId: string;
  reuseProjectId: string;
  aiMergeCostUsd: number;
}): Promise<{
  module: LibraryModule;
  feeUsd: number;
  creatorCreditUsd: number;
  ledgerEntry: CreatorCreditLedgerEntry;
} | null> {
  const store = await ensureLibrary();
  const module = store.modules.find((item) => item.id === input.moduleId);
  if (!module) return null;

  const quote = moduleReuseFee({
    originalModularCostUsd: module.originalCostUsd || 0,
    aiMergeCostUsd: input.aiMergeCostUsd,
  });

  module.timesUsed += 1;
  module.creatorCreditBalanceUsd =
    Math.round(
      ((module.creatorCreditBalanceUsd || 0) + quote.creatorCreditUsd) * 100,
    ) / 100;
  module.creatorCreditEarnedUsd =
    Math.round(
      ((module.creatorCreditEarnedUsd || 0) + quote.creatorCreditUsd) * 100,
    ) / 100;
  module.updatedAt = new Date().toISOString();

  const ledgerEntry: CreatorCreditLedgerEntry = {
    id: randomUUID(),
    moduleId: module.id,
    moduleTitle: module.title,
    creatorAccountId: module.creatorAccountId || module.sourceProjectId,
    reuseProjectId: input.reuseProjectId,
    reuseFeeUsd: quote.feeUsd,
    creditUsd: quote.creatorCreditUsd,
    createdAt: new Date().toISOString(),
  };
  store.creditLedger = store.creditLedger ?? [];
  store.creditLedger.unshift(ledgerEntry);
  store.creditLedger = store.creditLedger.slice(0, 500);

  await writeLibrary(store);
  return {
    module,
    feeUsd: quote.feeUsd,
    creatorCreditUsd: quote.creatorCreditUsd,
    ledgerEntry,
  };
}

export async function listCreatorCredits(
  creatorAccountId: string,
): Promise<{
  balanceUsd: number;
  earnedUsd: number;
  entries: CreatorCreditLedgerEntry[];
}> {
  const store = await ensureLibrary();
  const entries = (store.creditLedger ?? []).filter(
    (entry) => entry.creatorAccountId === creatorAccountId,
  );
  const modules = store.modules.filter(
    (module) =>
      (module.creatorAccountId || module.sourceProjectId) === creatorAccountId,
  );
  const balanceUsd = modules.reduce(
    (sum, module) => sum + (module.creatorCreditBalanceUsd || 0),
    0,
  );
  const earnedUsd = modules.reduce(
    (sum, module) => sum + (module.creatorCreditEarnedUsd || 0),
    0,
  );
  return {
    balanceUsd: Math.round(balanceUsd * 100) / 100,
    earnedUsd: Math.round(earnedUsd * 100) / 100,
    entries,
  };
}

export async function listCreditLedger(
  limit = 50,
): Promise<CreatorCreditLedgerEntry[]> {
  const store = await ensureLibrary();
  return [...(store.creditLedger ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

