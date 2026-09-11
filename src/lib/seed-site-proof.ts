/**
 * HARD RULE — Seed and Conductor must proof the live site against the brief.
 *
 * A markdown checklist is not proof. Compare landing + shop copy to the
 * Seed name and brief. Wrong-industry chrome (restaurant plates on a
 * used-car lot) is a fail — rewrite from the brief.
 *
 * Implementation: `collectSeedSiteProofFailures`, `proofAndRepairSeedSite`.
 * Guard: `npm run assert:seed-industry`.
 */

import {
  briefAsksForEcommerce,
  seedLandingCopyMismatchesIndustry,
  seedShopMismatchesIndustry,
} from "./seed-site-copy";

export const SEED_SITE_MUST_PROOF_RULE = {
  summary:
    "Seed and Conductor must proof the live site against the brief. A checklist is not proof. Wrong-industry shop or landing is a fail — rewrite from name + brief.",
} as const;

export type SeedSiteProofFailure = {
  surface: "landing" | "shop";
  reason: string;
};

export function collectSeedSiteProofFailures(
  projectName: string,
  brief: string,
  input: {
    landing?: {
      cta?: string;
      heroImage?: string;
      services?: Array<{ title?: string; detail?: string }>;
      aboutBody?: string;
      support?: string;
      footerNote?: string;
      servicesHeadline?: string;
    } | null;
    shop?: {
      title?: string;
      support?: string;
      cta?: string;
      products?: Array<{ id?: string; title?: string; detail?: string }>;
      shippingModes?: Array<{ id?: string; label?: string; carrier?: string }>;
    } | null;
  },
): SeedSiteProofFailure[] {
  const failures: SeedSiteProofFailure[] = [];

  if (
    input.landing &&
    seedLandingCopyMismatchesIndustry(projectName, brief, input.landing)
  ) {
    failures.push({
      surface: "landing",
      reason: "Landing copy is the wrong industry for this brief.",
    });
  }

  if (input.shop && seedShopMismatchesIndustry(projectName, brief, input.shop)) {
    failures.push({
      surface: "shop",
      reason:
        "Shop catalog or copy does not match this brief (restaurant plates or kitchen tickets on a used-car lot is a fail).",
    });
  } else if (briefAsksForEcommerce(brief) && !input.shop) {
    failures.push({
      surface: "shop",
      reason: "Brief asks for e-commerce but shop copy is missing.",
    });
  }

  return failures;
}
