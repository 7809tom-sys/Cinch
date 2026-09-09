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
  classifyConnectedSite,
  planInPlaceImprovements,
} from "../src/lib/connect-improvements";
import {
  JUST_PUTZIT_CONNECT_SEED_ID,
  JUST_PUTZIT_GITHUB,
  JUST_PUTZIT_LIVE,
  LIVE_UPDATE_OWNER_APPROVED,
  LIVE_UPDATE_REQUIRES_APPROVAL,
  PLACE_WIDGET_TITLE,
  SEED_CONNECT_EXISTING_RULE,
  briefAsksToConnectExistingSite,
  mayDeliverLiveImprovements,
  planConnectExistingSiteTasks,
  resolveConnectTargets,
  resolveSeedMode,
} from "../src/lib/seed-connect";
import { lookAtJustPutzitLive } from "../src/lib/just-putzit-look";
import { forbidsCinchHostedSite } from "../src/lib/hosted-site";

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
  /social-activity and dating/i.test(SEED_CONNECT_EXISTING_RULE.summary),
  "Just Putz It is classified as a social-activity and dating site",
);
assert(
  classifyConnectedSite({
    name: "Just Putz It",
    liveUrl: JUST_PUTZIT_LIVE,
  }) === "social_activity_dating",
  "justputzit.com classifies as social activity + dating",
);
assert(
  classifyConnectedSite({
    name: "Acme Cabinets",
    brief: "Kitchen designer for cabinet shops",
    liveUrl: "https://example.com",
  }) === "generic",
  "a cabinet site is not classified as dating",
);
const datingPlan = planInPlaceImprovements({
  name: "Just Putz It",
  liveUrl: JUST_PUTZIT_LIVE,
});
assert(
  datingPlan.improvements.some((item) => /match|activity|community|date/i.test(item.title)),
  "Just Putz It improvements target dating and activities, not a kitchen designer",
);
assert(
  !datingPlan.improvements.some((item) => /kitchen designer/i.test(item.title)),
  "Just Putz It plan titles are dating and activities, not a kitchen designer",
);
assert(
  LIVE_UPDATE_OWNER_APPROVED === false,
  "live Just Putz It updates stay unapproved until the owner says yes",
);
assert(
  mayDeliverLiveImprovements({ liveUrl: JUST_PUTZIT_LIVE }) === false,
  "Just Putz It does not deliver live patches without owner approval",
);
assert(
  mayDeliverLiveImprovements({ githubRepoUrl: JUST_PUTZIT_GITHUB }) === false,
  "the Just Putz It GitHub export does not deliver live patches without approval",
);
assert(
  mayDeliverLiveImprovements({ liveUrl: "https://example.com" }) === true,
  "unrelated hosts can still receive watch.js patches",
);
assert(
  datingPlan.improvements.every((item) =>
    /owner approv|queue only/i.test(item.liveChange),
  ),
  "every Just Putz It proposal waits in the queue until owner approval",
);
assert(
  /manus/i.test(SEED_CONNECT_EXISTING_RULE.summary) &&
    /owner approval/i.test(SEED_CONNECT_EXISTING_RULE.summary),
  "connect rule uses the Manus host and waits for owner approval",
);
assert(
  SEED_CONNECT_EXISTING_RULE.exampleGithubRepo === JUST_PUTZIT_GITHUB,
  "Just Putz It GitHub repo is the documented source",
);

const fromLive = resolveConnectTargets({ liveUrl: JUST_PUTZIT_LIVE });
assert(
  fromLive.liveUrl === JUST_PUTZIT_LIVE &&
    fromLive.githubRepoUrl === JUST_PUTZIT_GITHUB,
  "justputzit.com infers the GitHub repo Manus exported",
);
const fromGithub = resolveConnectTargets({
  liveUrl: JUST_PUTZIT_GITHUB,
});
assert(
  fromGithub.liveUrl === JUST_PUTZIT_LIVE &&
    fromGithub.githubRepoUrl === JUST_PUTZIT_GITHUB,
  "pasting the GitHub repo still visits justputzit.com, not github.com",
);
assert(
  fromGithub.htmlPath === "client/index.html",
  "Just Putz It widget path is client/index.html",
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
assert(
  tasks.some((task) =>
    /manus\.im hosts|after owner approval|do not rewrite live copy/i.test(task.detail),
  ),
  "connect plan says Manus hosts it and waits for owner approval",
);
assert(
  tasks.some(
    (task) =>
      task.title === PLACE_WIDGET_TITLE &&
      task.tags.includes("manus_github_install"),
  ),
  "Manus 1.6 is assigned only to place watch.js on the GitHub/Manus host after approval",
);
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
  liveWebsiteUrl({
    id: "seed-does-not-matter",
    name: "Just Putz It",
    customDomain: null,
    seedMode: "connect",
    referenceUrl: JUST_PUTZIT_GITHUB,
  }) === JUST_PUTZIT_LIVE,
  "Visit website never opens github.com when Manus hosts the live site",
);
assert(
  !visit.includes("/site/"),
  "connect Visit URL is not a fake Cinch-hosted site",
);

assert(
  forbidsCinchHostedSite({
    id: JUST_PUTZIT_CONNECT_SEED_ID,
    name: "Just Putz It",
    seedMode: "build",
  }),
  "the leftover Just Putz It /site/ clone is forbidden even if seedMode was build",
);
assert(
  forbidsCinchHostedSite({
    id: "other",
    name: "Just Putz It",
    seedMode: "build",
    referenceUrl: JUST_PUTZIT_LIVE,
  }),
  "justputzit.com reference forbids a Cinch-hosted copy",
);
assert(
  !forbidsCinchHostedSite({
    id: "pizza",
    name: "Pizza Man",
    seedMode: "build",
  }),
  "Cinch-hosted build Seeds still keep /site/[id]",
);
assert(
  liveWebsiteUrl({
    id: JUST_PUTZIT_CONNECT_SEED_ID,
    name: "Just Putz It",
    customDomain: null,
    seedMode: "build",
    referenceUrl: null,
  }) === JUST_PUTZIT_LIVE,
  "Visit for the leftover clone id opens justputzit.com, not /site/",
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
    const isPlace = task.title === PLACE_WIDGET_TITLE;
    if (isPlace) {
      assert(route.providerId === "manus", "place-widget on Manus/GitHub → Manus");
      assert(route.model === "manus-1.6", "place-widget uses Manus 1.6");
      assert(
        route.tags.includes("manus_github_install"),
        "place-widget keeps manus_github_install",
      );
    } else {
      assert(
        route.providerId !== "manus",
        `Manus stays off non-install connect task: ${task.title}`,
      );
      assert(
        !route.tags.includes("manus_github_install"),
        `Manus install tag stays off: ${task.title}`,
      );
    }
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
assert(
  /justputzit\\.com/.test(watchJs) && watchJs.includes("data-approved"),
  "watch.js withholds live patches on justputzit.com until owner approval",
);
assert(
  PLATFORM_ADAPTERS.find((adapter) => adapter.id === "manus")
    ?.installSnippet("seed-demo", "key-demo")
    .includes('data-require-approval="true"') ?? false,
  "Manus snippet marks watch.js as awaiting owner approval",
);

function runWatch(scriptEl: { src?: string; attrs: Record<string, string>; host?: string }) {
  const created: Array<{ id?: string; text?: string }> = [];
  const fetches: string[] = [];
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
    location: { href: `https://${scriptEl.host ?? "justputzit.com"}/`, hostname: scriptEl.host ?? "justputzit.com" },
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
    fetch(url: string) {
      fetches.push(String(url));
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
  return { created, window: context.window as { __CINCH_SEED__?: { seed: string } }, fetches };
}

const painted = runWatch({
  attrs: { "data-seed": "seed-demo", "data-key": "key-demo", "data-mark": "true" },
});
assert(
  painted.created.some((node) => node.id === "cinch-seed-community"),
  "Community card mounts when currentScript is null",
);
assert(painted.window.__CINCH_SEED__?.seed === "seed-demo", "watch runtime exposes the Seed id");
assert(
  painted.fetches.every((url) => !url.includes("/v1/improve")),
  "watch.js on justputzit.com does not pull live patches without approval",
);

const otherHost = runWatch({
  host: "example.com",
  attrs: { "data-seed": "seed-demo", "data-key": "key-demo", "data-mark": "true" },
});
assert(
  otherHost.fetches.some((url) => url.includes("/v1/improve")),
  "watch.js still pulls patches on hosts that do not require Just Putz It approval",
);

const missingKey = runWatch({
  attrs: { "data-seed": "seed-demo" },
});
assert(
  missingKey.created.some((node) => node.id === "cinch-seed-community"),
  "Community card still shows when Manus omitted data-key",
);

assert(
  /after owner approval/i.test(PLACE_WIDGET_TITLE),
  "widget install is queued until owner approval",
);
assert(
  tasks.some((task) => task.detail.includes(LIVE_UPDATE_REQUIRES_APPROVAL)),
  "connect plan repeats the owner-approval rule",
);

lookAtJustPutzitLive(async () => {
  return new Response(
    `<title>Just Putzit</title><meta name="description" content="Just Putzit — meet locals for real dates and activities." /><img src="/manus-storage/icon.png" />`,
    {
      headers: {
        "x-manus-proxy-mode": "transparent/1",
        "last-modified": "Wed, 09 Sep 2026 17:37:14 GMT",
      },
    },
  );
})
  .then((look) => {
    assert(look.ok, "look helper reaches a live HTML response");
    assert(look.hostedOnManus, "look helper recognizes the Manus host");
    assert(!look.watchJsPresent, "look helper reports missing watch.js");
    assert(/just putzit/i.test(look.title ?? ""), "look helper reads the live title");
  })
  .then(() => {
    if (process.exitCode) {
      console.error("seed-connect assertions failed");
    } else {
      console.log("seed-connect assertions passed");
    }
  })
  .catch((error) => {
    console.error("FAIL: look helper", error);
    process.exitCode = 1;
    console.error("seed-connect assertions failed");
  });
