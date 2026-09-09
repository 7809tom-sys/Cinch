/**
 * Guard: Conductor multi-provider routing (cost-down, failover, lanes).
 * Run: npx tsx scripts/assert-conductor-routing.ts
 */
import {
  CONDUCTOR_ROUTING_TABLE,
  EXCLUDED_SEED_PROVIDERS,
  MAX_FAILOVER_ATTEMPTS,
  PROVIDER_MODELS,
  inferTaskTags,
  isExcludedSeedProvider,
  isRouteBlocked,
  routeConductorTask,
  sampleConductorRoutes,
  type SeedProviderId,
} from "../src/lib/conductor-routing";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

const ALL: SeedProviderId[] = [
  "anthropic",
  "openai",
  "deepseek",
  "google",
  "manus",
];

const opts = {
  configuredProviders: ALL,
  requireConfigured: true,
};

assert(
  CONDUCTOR_ROUTING_TABLE.policy.costDownMandatory,
  "cost-down is mandatory",
);
assert(
  CONDUCTOR_ROUTING_TABLE.excluded.includes("cursor"),
  "Cursor is excluded from the Seed provider roster",
);
assert(
  !CONDUCTOR_ROUTING_TABLE.providers.some((p) => p.id === ("cursor" as never)),
  "routing table does not list Cursor as a provider",
);
assert(isExcludedSeedProvider("cursor"), "cursor helper rejects Cursor");
assert(
  !isExcludedSeedProvider("deepseek"),
  "DeepSeek is a real Seed provider",
);

const samples = sampleConductorRoutes(opts);
const byLabel = Object.fromEntries(samples.map((s) => [s.label, s.result]));

const cheapPixel = byLabel["Pixel easy / boilerplate"];
assert(!isRouteBlocked(cheapPixel), "easy Pixel routes");
if (!isRouteBlocked(cheapPixel)) {
  assert(cheapPixel.agentName === "Pixel", "easy Pixel → Pixel");
  assert(cheapPixel.providerId === "deepseek", "easy Pixel → DeepSeek");
  assert(cheapPixel.lane === "cheap", "easy Pixel is cheap lane");
}

const heavyPixel = byLabel["Pixel/Forge rule_heavy (SB36 + island wall 30)"];
assert(!isRouteBlocked(heavyPixel), "rule-heavy Pixel routes");
if (!isRouteBlocked(heavyPixel)) {
  assert(
    heavyPixel.tags.includes("cabinet_rules") &&
      heavyPixel.tags.includes("rule_heavy") &&
      heavyPixel.tags.includes("placement"),
    "SB36 / island wall 30 tags as cabinet_rules + rule_heavy + placement",
  );
  assert(
    heavyPixel.providerId === "anthropic" || heavyPixel.providerId === "openai",
    "rule-heavy Pixel → Claude or GPT",
  );
  assert(heavyPixel.lane === "expensive", "rule-heavy Pixel is expensive lane");
}

const quill = byLabel["Quill copy"];
assert(!isRouteBlocked(quill), "Quill routes");
if (!isRouteBlocked(quill)) {
  assert(quill.agentName === "Quill", "copy → Quill");
  assert(quill.providerId === "anthropic", "Quill → Claude");
  assert(quill.lane === "expensive", "Quill uses the Claude/expensive lane");
}

const atlas = byLabel["Atlas vision"];
assert(!isRouteBlocked(atlas), "Atlas vision routes");
if (!isRouteBlocked(atlas)) {
  assert(atlas.agentName === "Atlas", "UI + vision → Atlas");
  assert(atlas.providerId === "google", "vision prefers Flash-class");
  assert(atlas.lane === "cheap", "Atlas vision stays cheap");
}

const lumen = byLabel["Lumen checklist"];
assert(!isRouteBlocked(lumen), "Lumen checklist routes");
if (!isRouteBlocked(lumen)) {
  assert(lumen.agentName === "Lumen", "SEO checklist → Lumen");
  assert(lumen.lane === "cheap", "Lumen checklist is cheap");
  assert(
    lumen.providerId === "deepseek" || lumen.providerId === "google",
    "Lumen checklist stays on a cheap provider",
  );
}

const sentryFail = byLabel["Sentry fail escalates"];
assert(!isRouteBlocked(sentryFail), "Sentry escalate routes");
if (!isRouteBlocked(sentryFail)) {
  assert(sentryFail.agentName === "Sentry", "QA → Sentry");
  assert(sentryFail.lane === "expensive", "Sentry fail escalates to expensive");
  assert(
    sentryFail.providerId === "anthropic" || sentryFail.providerId === "openai",
    "Sentry fail → Claude or GPT",
  );
}

const manus = byLabel["Manus whole-site build"];
assert(!isRouteBlocked(manus), "build-site routes");
if (!isRouteBlocked(manus)) {
  assert(manus.tags.includes("build_site"), "whole-site task tagged build_site");
  assert(manus.providerId === "manus", "build site → Manus");
  assert(manus.model === "manus-1.6", "whole-site build uses Manus 1.6");
  assert(manus.lane === "expensive", "Manus is not the cheap draft lane");
}

const manusWidget = byLabel["Manus 1.6 GitHub/Manus widget install"];
assert(!isRouteBlocked(manusWidget), "Manus/GitHub widget install routes");
if (!isRouteBlocked(manusWidget)) {
  assert(manusWidget.providerId === "manus", "GitHub/Manus widget → Manus");
  assert(manusWidget.model === "manus-1.6", "widget install uses Manus 1.6");
  assert(
    manusWidget.tags.includes("manus_github_install") &&
      !manusWidget.tags.includes("build_site"),
    "widget install is not a full-site rebuild",
  );
}

assert(
  PROVIDER_MODELS.find((spec) => spec.providerId === "manus")?.defaultModel ===
    "manus-1.6",
  "Manus default model is 1.6",
);

const pii = byLabel["PII / invoice — not DeepSeek"];
assert(!isRouteBlocked(pii), "PII copy routes");
if (!isRouteBlocked(pii)) {
  assert(pii.tags.includes("pii_sensitive"), "invoice/customer email is PII");
  assert(pii.providerId !== "deepseek", "DeepSeek never sees PII / invoices");
}

const failover = routeConductorTask(
  {
    title: "Implement frontend shell",
    detail: "Draft boilerplate.",
    requiredSkills: ["frontend"],
    minSkillLevel: 3,
  },
  { ...opts, unavailableProviders: ["deepseek"] },
);
assert(!isRouteBlocked(failover), "failover finds the next cheap provider");
if (!isRouteBlocked(failover)) {
  assert(failover.providerId !== "deepseek", "sleeping DeepSeek is skipped");
  assert(failover.lane === "cheap", "failover stays cheap when still capable");
}

const blocked = routeConductorTask(
  {
    title: "Implement frontend shell",
    detail: "Draft boilerplate.",
    requiredSkills: ["frontend"],
    minSkillLevel: 3,
    failedProviders: ["deepseek", "google", "anthropic", "openai"],
  },
  opts,
);
assert(isRouteBlocked(blocked), "exhausted failover blocks instead of spinning");
if (isRouteBlocked(blocked)) {
  assert(
    /spin|exhaust/i.test(blocked.reason),
    "blocked reason says Conductor will not spin",
  );
}

assert(MAX_FAILOVER_ATTEMPTS <= 4, "failover cap is small and finite");

const tagged = inferTaskTags({
  title: "Privacy policy legal copy",
  detail: "Terms of service disclaimer.",
});
assert(
  tagged.includes("legal_copy") && tagged.includes("rule_heavy"),
  "legal copy escalates",
);

const modularHint = routeConductorTask(
  {
    title: "Adopt existing library modulars",
    detail: "Reuse modulars first; do not regenerate from scratch.",
    requiredSkills: ["architecture", "research"],
    minSkillLevel: 3,
  },
  opts,
);
assert(!isRouteBlocked(modularHint), "modular adopt task routes");
if (!isRouteBlocked(modularHint)) {
  assert(
    /modular/i.test(modularHint.reason),
    "route reason prefers modular library reuse",
  );
}

if (process.exitCode) {
  console.error("conductor routing assertions failed");
} else {
  console.log("conductor routing assertions passed");
}
