/**
 * Guard: connecting cinchseed.com to a live host is not a site rebuild.
 * Run: npx tsx scripts/assert-seed-connect.ts
 */
import {
  isRouteBlocked,
  routeConductorTask,
  type SeedProviderId,
} from "../src/lib/conductor-routing";
import {
  SEED_CONNECT_EXISTING_RULE,
  briefAsksToConnectExistingSite,
  planConnectExistingSiteTasks,
  resolveSeedMode,
} from "../src/lib/seed-connect";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(
  /do not rebuild|not a site rebuild|watch\.js/i.test(
    SEED_CONNECT_EXISTING_RULE.summary,
  ),
  "connect rule forbids rebuilding the live site",
);
assert(
  /justputzit\.com/i.test(SEED_CONNECT_EXISTING_RULE.exampleHost),
  "Just Putz It is the documented connect example",
);

assert(
  briefAsksToConnectExistingSite(
    "Connect cinchseed.com to justputzit.com. Do not rebuild.",
  ),
  "connect brief is recognized",
);
assert(
  briefAsksToConnectExistingSite("Community feature", "https://justputzit.com"),
  "justputzit.com reference is a connect job",
);
assert(
  resolveSeedMode({
    brief: "Connect cinchseed.com to justputzit.com",
    referenceUrl: "https://justputzit.com",
  }) === "connect",
  "resolveSeedMode → connect for Just Putz It",
);
assert(
  resolveSeedMode({
    seedMode: "build",
    brief: "Connect cinchseed.com to justputzit.com",
    referenceUrl: "https://justputzit.com",
  }) === "build",
  "explicit build mode is honored",
);

const tasks = planConnectExistingSiteTasks({
  siteName: "Just Putz It",
  liveUrl: "https://justputzit.com",
});
assert(tasks.length >= 4, "connect plan has widget + place + heartbeat tasks");
assert(
  tasks.every((task) => task.tags.includes("connect_existing")),
  "every connect task is tagged connect_existing",
);
assert(
  tasks.every((task) => !task.tags.includes("build_site")),
  "connect plan never tags build_site",
);
assert(
  tasks.every(
    (task) =>
      !/write seed landing|build the whole site|shop e-commerce/i.test(
        task.title,
      ),
  ),
  "connect plan has no hosted-site build backlog",
);
assert(
  tasks.some((task) => /watch\.js|widget/i.test(task.title + task.detail)),
  "connect plan issues the watch.js widget",
);

const all: SeedProviderId[] = [
  "anthropic",
  "openai",
  "deepseek",
  "google",
  "manus",
];
for (const task of tasks) {
  const route = routeConductorTask(
    {
      title: task.title,
      detail: task.detail,
      requiredSkills: task.requiredSkills,
      minSkillLevel: task.minSkillLevel,
      tags: task.tags,
    },
    { configuredProviders: all, requireConfigured: true },
  );
  assert(!isRouteBlocked(route), `connect task routes: ${task.title}`);
  if (!isRouteBlocked(route)) {
    assert(
      route.providerId !== "manus",
      `Manus stays off connect task: ${task.title}`,
    );
    assert(
      route.tags.includes("connect_existing"),
      `routed tags keep connect_existing: ${task.title}`,
    );
    assert(
      !route.tags.includes("build_site"),
      `routed tags drop build_site: ${task.title}`,
    );
  }
}

if (process.exitCode) {
  console.error("seed-connect assertions failed");
} else {
  console.log("seed-connect assertions passed");
}
