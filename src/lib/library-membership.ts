/**
 * Library membership — how creators make money with Cinch Seed.
 *
 * Feature: every finished modular auto-joins the shared library under
 * the creator's library account.
 *
 * Advantage: later Seeds reuse that modular at 85% of (create + AI merge)
 * instead of paying full first-build cost again.
 *
 * Benefit: the original creator earns an 8% credit of each reuse fee
 * back into their library account — so funding a modular can become
 * ongoing income as the network grows.
 *
 * Future members don't just consume the library — they can earn from it.
 */

import {
  MODULE_CREATOR_CREDIT_RATE,
  MODULE_REUSE_RATE,
  formatUsd,
  moduleReuseFee,
} from "./pricing";
import {
  listCreatorCredits,
  listLibraryModules,
  type LibraryModule,
} from "./module-library";

export const LIBRARY_MEMBER_EARN_RATE = MODULE_CREATOR_CREDIT_RATE;
export const LIBRARY_REUSE_RATE = MODULE_REUSE_RATE;

export type LibraryMemberPitch = {
  headline: string;
  feature: string;
  advantage: string;
  benefit: string;
  earnRateLabel: string;
  reuseRateLabel: string;
};

export const LIBRARY_MEMBER_PITCH: LibraryMemberPitch = {
  headline: "Make money with your library account",
  feature:
    "Every modular you fund lands in the shared library under your member account.",
  advantage:
    "When another Seed reuses it, they pay 85% of create + merge — not a full rebuild.",
  benefit:
    "You earn 8% of that reuse fee as credit in your library account — real future income from work you already paid to create.",
  earnRateLabel: "8% creator credit on every reuse",
  reuseRateLabel: "Later Seeds pay 85% of create + merge",
};

/** Estimate what one reuse pays the creator for a modular. */
export function estimateCreatorEarnOnReuse(input: {
  originalModularCostUsd: number;
  aiMergeCostUsd?: number;
}): {
  reuseFeeUsd: number;
  creatorEarnUsd: number;
  formattedEarn: string;
  formattedReuseFee: string;
} {
  const quote = moduleReuseFee({
    originalModularCostUsd: input.originalModularCostUsd,
    aiMergeCostUsd: input.aiMergeCostUsd ?? 0,
  });
  return {
    reuseFeeUsd: quote.feeUsd,
    creatorEarnUsd: quote.creatorCreditUsd,
    formattedEarn: formatUsd(quote.creatorCreditUsd),
    formattedReuseFee: formatUsd(quote.feeUsd),
  };
}

export type LibraryMemberSnapshot = {
  moduleCount: number;
  balanceUsd: number;
  earnedUsd: number;
  topEarners: Array<{
    id: string;
    title: string;
    timesUsed: number;
    earnedUsd: number;
    balanceUsd: number;
  }>;
  pitch: LibraryMemberPitch;
};

export async function getLibraryMemberSnapshot(
  creatorAccountId?: string | null,
): Promise<LibraryMemberSnapshot> {
  const modules = await listLibraryModules();
  const scoped = creatorAccountId
    ? modules.filter(
        (module) =>
          (module.creatorAccountId || module.sourceProjectId) ===
          creatorAccountId,
      )
    : modules;

  let balanceUsd = 0;
  let earnedUsd = 0;

  if (creatorAccountId) {
    const credits = await listCreatorCredits(creatorAccountId);
    balanceUsd = credits.balanceUsd;
    earnedUsd = credits.earnedUsd;
  } else {
    balanceUsd = scoped.reduce(
      (sum, module) => sum + (module.creatorCreditBalanceUsd || 0),
      0,
    );
    earnedUsd = scoped.reduce(
      (sum, module) => sum + (module.creatorCreditEarnedUsd || 0),
      0,
    );
  }

  const topEarners = [...scoped]
    .sort(
      (a, b) =>
        (b.creatorCreditEarnedUsd || 0) - (a.creatorCreditEarnedUsd || 0),
    )
    .slice(0, 5)
    .map((module: LibraryModule) => ({
      id: module.id,
      title: module.title,
      timesUsed: module.timesUsed || 0,
      earnedUsd: module.creatorCreditEarnedUsd || 0,
      balanceUsd: module.creatorCreditBalanceUsd || 0,
    }));

  return {
    moduleCount: scoped.length,
    balanceUsd: Math.round(balanceUsd * 100) / 100,
    earnedUsd: Math.round(earnedUsd * 100) / 100,
    topEarners,
    pitch: LIBRARY_MEMBER_PITCH,
  };
}
