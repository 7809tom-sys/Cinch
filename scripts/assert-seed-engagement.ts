/**
 * Guard: multi-agent engagement collaboration HARD RULE.
 * Run: npx tsx scripts/assert-seed-engagement.ts
 */
import {
  engagementCollabPhaseFromTitle,
  planEngagementCollaborationChain,
  projectHasEngagementCollab,
  SEED_ENGAGEMENT_COLLABORATE_RULE,
  taskIsEngagementCollab,
} from "../src/lib/seed-engagement-rule";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(
  /collaborat|psychology|conversion/i.test(SEED_ENGAGEMENT_COLLABORATE_RULE.summary),
  "rule summary requires collaboration + psychology/conversion",
);
assert(
  SEED_ENGAGEMENT_COLLABORATE_RULE.steps.length >= 5,
  "rule has a full 5-specialist chain",
);
assert(
  /together|alone/i.test(SEED_ENGAGEMENT_COLLABORATE_RULE.whyTogether),
  "rule explains why agents must work together",
);

const chain = planEngagementCollaborationChain({
  brandHint: "Harrison Lawn",
  briefHint: "Weekly mowing. Get homeowners to call for a quote.",
});
assert(chain.length === 5, "engagement chain has 5 phases");
assert(
  chain.every((t) => taskIsEngagementCollab(t.title)),
  "every chain task is recognized as engagement collab",
);
assert(
  engagementCollabPhaseFromTitle(chain[0].title) === "psychology",
  "phase 1 is psychology",
);
assert(
  engagementCollabPhaseFromTitle(chain[1].title) === "desire-path",
  "phase 2 is desire path",
);
assert(
  engagementCollabPhaseFromTitle(chain[2].title) === "friction",
  "phase 3 is friction",
);
assert(
  engagementCollabPhaseFromTitle(chain[3].title) === "trust",
  "phase 4 is trust",
);
assert(
  engagementCollabPhaseFromTitle(chain[4].title) === "sign-off",
  "phase 5 is sign-off",
);

const skills = chain.map((t) => t.requiredSkills.join("+"));
assert(
  skills[0].includes("copy") &&
    skills[1].includes("ui") &&
    skills[2].includes("frontend") &&
    skills[3].includes("seo") &&
    skills[4].includes("qa"),
  "chain covers Quill→Atlas→Pixel→Lumen→Sentry skill lanes",
);
assert(
  chain.every((t) => /engagement-collab\.md/i.test(t.detail)),
  "each task points agents at the shared notebook",
);
assert(
  projectHasEngagementCollab(chain),
  "projectHasEngagementCollab detects the chain",
);
assert(
  !projectHasEngagementCollab([{ title: "Write Seed landing copy" }]),
  "plain copy task is not the collab chain",
);

if (process.exitCode) {
  console.error("\nEngagement collab guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll engagement collab guards passed.");
