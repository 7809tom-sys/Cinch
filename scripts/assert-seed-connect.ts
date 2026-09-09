/**
 * Guard: connecting cinchseed.com to a live host is not a site rebuild.
 * Run: npx tsx scripts/assert-seed-connect.ts
 */
import { createContext, runInContext } from "vm";
import { liveWebsiteUrl, seedEmbedSnippet } from "../src/lib/domain";
import { PLATFORM_ADAPTERS } from "../src/lib/platforms";
import { buildWatchClientJs } from "../src/lib/watch-client";
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
  !briefAsksToConnectExistingSite("Community feature"),
  "a URL or brand name alone does not invent a connect host",
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

const visit = liveWebsiteUrl({
  id: "seed-does-not-matter",
  name: "Just Putz It",
  customDomain: null,
  seedMode: "connect",
  referenceUrl: "https://justputzit.com",
});
assert(
  visit === "https://justputzit.com",
  "Visit website opens the real live host, not a Cinch /site/ copy",
);
assert(
  !visit.includes("/site/"),
  "connect Visit URL is not a fake Cinch-hosted site",
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

const snippet = seedEmbedSnippet("seed-demo", "key-demo");
assert(snippet.includes("data-seed=\"seed-demo\""), "official snippet includes data-seed");
assert(snippet.includes("data-key=\"key-demo\""), "official snippet includes data-key");
assert(snippet.includes("data-mark=\"true\""), "official snippet asks the Community card to show");
assert(
  PLATFORM_ADAPTERS.every((adapter) =>
    /data-key=/.test(adapter.installSnippet("seed-demo", "key-demo")),
  ),
  "every platform snippet carries the Connect Key",
);

const watchJs = buildWatchClientJs({
  origin: "https://www.cinchseed.com",
  defaultTools: [],
});
assert(watchJs.includes("findScript"), "watch.js finds the tag without currentScript");
assert(watchJs.includes("cinch-seed-community"), "watch.js paints a Community card");
assert(watchJs.includes("data-key is missing"), "watch.js explains a missing Connect Key");

function runWatch(scriptEl: { src?: string; attrs: Record<string, string> }) {
  const created: Array<{ id?: string; text?: string }> = [];
  const fakeScript = {
    src: scriptEl.src || "https://www.cinchseed.com/v1/watch.js",
    getAttribute(name: string) {
      return scriptEl.attrs[name] || "";
    },
  };
  const body = {
    appendChild(node: { id?: string }) {
      created.push(node);
      return node;
    },
  };
  const store: Record<string, string> = {};
  const context = createContext({
    window: { __CINCH_SEED_BOOT__: undefined } as Record<string, unknown>,
    document: {
      currentScript: null,
      body,
      querySelectorAll() {
        return [fakeScript];
      },
      querySelector() {
        return fakeScript;
      },
      getElementById() {
        return null;
      },
      createElement(tag: string) {
        const node: Record<string, unknown> = {
          tag,
          style: { cssText: "" },
          textContent: "",
          setAttribute() {},
          addEventListener() {},
          appendChild() {},
          remove() {},
        };
        return node;
      },
      addEventListener() {},
    },
    location: { href: "https://justputzit.com/" },
    navigator: { userAgent: "assert" },
    console,
    sessionStorage: {
      getItem(key: string) {
        return store[key] ?? null;
      },
      setItem(key: string, value: string) {
        store[key] = value;
      },
    },
    fetch() {
      return Promise.resolve({
        status: 401,
        json: async () => ({ ok: false, error: "Invalid or missing Connect key." }),
      });
    },
    setInterval() {
      return 0;
    },
    encodeURIComponent,
    JSON,
    URLSearchParams,
    String,
  });
  (context.window as { document: unknown }).document = context.document;
  (context.window as { location: unknown }).location = context.location;
  (context.window as { navigator: unknown }).navigator = context.navigator;
  runInContext(watchJs, context);
  return { created, window: context.window as { __CINCH_SEED__?: { seed: string } } };
}

const painted = runWatch({
  attrs: { "data-seed": "seed-demo", "data-key": "key-demo", "data-mark": "true" },
});
assert(
  painted.created.some((node) => node.id === "cinch-seed-community"),
  "Community card mounts when currentScript is null",
);
assert(painted.window.__CINCH_SEED__?.seed === "seed-demo", "watch runtime exposes the Seed id");

const missingKey = runWatch({
  attrs: { "data-seed": "seed-demo" },
});
assert(
  missingKey.created.some((node) => node.id === "cinch-seed-community"),
  "Community card still shows when Manus omitted data-key",
);

if (process.exitCode) {
  console.error("seed-connect assertions failed");
} else {
  console.log("seed-connect assertions passed");
}
