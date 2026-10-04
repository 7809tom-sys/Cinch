/**
 * Guard: connecting cinchseed.com to a live host is not a site rebuild.
 * Run: npx tsx scripts/assert-seed-connect.ts
 */
import { createContext, runInContext } from "vm";
import {
  canonicalizeCinchSeedOrigin,
  CINCH_SEED_ORIGIN,
  liveWebsiteUrl,
  seedEmbedSnippet,
} from "../src/lib/domain";
import {
  isHostBrandLogo,
  isHostBrandText,
  replaceHostBrandText,
  shouldHideHostBrandElement,
  whiteLabelDocumentTitle,
} from "../src/lib/affiliate-host-brand";
import {
  affiliateLogoName,
  buildAffiliateLogoSvg,
  isAffiliateStorefrontPage,
  isAffiliateWatchPage,
  isWhiteLabelAffiliatePage,
} from "../src/lib/affiliate-logo";
import {
  currentShopStep,
  isDesignerShopPage,
  isShopPathPage,
  shopPathSteps,
} from "../src/lib/shop-path-links";
import { GET as healthGet } from "../src/app/v1/health/route";
import { GET as logoGet } from "../src/app/v1/logo/route";
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
  JUST_PUTZIT_NOT_ON_SEED,
  JUST_PUTZIT_ON_SEED,
  isJustPutzItSeedProject,
  mayDeliverLiveImprovements,
  planConnectExistingSiteTasks,
  resolveConnectTargets,
  resolveSeedMode,
} from "../src/lib/seed-connect";
import { lookAtJustPutzitLive } from "../src/lib/just-putzit-look";
import {
  JUST_PUTZIT_HOSTED_CLONE_PATH,
  cinchHostedCloneRedirects,
  forbidsCinchHostedSite,
  liveHostInsteadOfCinchClone,
} from "../src/lib/hosted-site";
import {
  CONNECT_KEY_PATTERN,
  JUST_PUTZIT_EMBED_CONFIG_URL,
  fetchPublishedJustPutzItConnectKey,
  isConnectKeyFormat,
  parsePublishedEmbedConfig,
  resetPublishedConnectKeyCache,
  shouldAdoptPublishedConnectKey,
} from "../src/lib/connect-key";
import { readFileSync } from "fs";
import { join } from "path";

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
  JUST_PUTZIT_ON_SEED === false &&
    /not a Cinch Seed/i.test(JUST_PUTZIT_NOT_ON_SEED),
  "Just Putz It is not a Cinch Seed",
);
assert(
  isJustPutzItSeedProject({
    id: JUST_PUTZIT_CONNECT_SEED_ID,
    name: "Just Putz It",
    liveUrl: JUST_PUTZIT_LIVE,
  }),
  "leftover Just Putz It id is recognized so AI work can be refused",
);
assert(
  /not a Cinch Seed/i.test(SEED_CONNECT_EXISTING_RULE.summary),
  "connect rule refuses Just Putz It as a Seed",
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
const cabinetPlan = planInPlaceImprovements({
  name: "Cabinet Dealz",
  brief: "Affiliate storefronts and a kitchen designer",
  liveUrl: "https://www.cabinetdealz.com/affiliate",
});
assert(
  cabinetPlan.improvements.some((item) => /white-label the affiliate site/i.test(item.title)),
  "generic live hosts white-label affiliate storefronts",
);
assert(
  cabinetPlan.improvements.some((item) => /store logo on the affiliate page/i.test(item.title)),
  "generic live hosts get an affiliate-page logo improvement",
);
assert(
  cabinetPlan.improvements.some((item) => /same-origin cabinets together/i.test(item.title)),
  "cabinet hosts combine freight from the same warehouse",
);
assert(
  cabinetPlan.improvements.some((item) => /find affiliate designs in the crm/i.test(item.title)),
  "affiliate kitchens are listed in the CRM",
);
assert(
  cabinetPlan.improvements.some((item) => /designer to cart and cabinet styles/i.test(item.title)),
  "shoppers can go back from designer to cart and cabinet styles",
);
assert(
  cabinetPlan.improvements.some((item) => /3D designer more canvas/i.test(item.title)),
  "cabinet hosts reclaim the designer canvas",
);
assert(
  isShopPathPage("/design") &&
    isShopPathPage("/cart") &&
    isShopPathPage("/styles") &&
    isShopPathPage("/store/kathmandu/design") &&
    !isShopPathPage("/") &&
    !isShopPathPage("/affiliate") &&
    currentShopStep("/design") === "designer" &&
    isDesignerShopPage("/design") &&
    !isDesignerShopPage("/styles") &&
    shopPathSteps("/design").some((step) => step.href === "/styles") &&
    shopPathSteps("/design").some((step) => step.href === "/cart") &&
    shopPathSteps("/store/kathmandu/design").some(
      (step) => step.href === "/store/kathmandu/cart",
    ),
  "designer, cart, and cabinet styles stay linked both ways",
);
assert(
  isAffiliateWatchPage("/store/kathmandu", "") &&
    isAffiliateWatchPage("/affiliate", "") &&
    isAffiliateWatchPage("/", "?viewAs=kathmandu") &&
    !isAffiliateWatchPage("/", "") &&
    isAffiliateStorefrontPage("/store/spartan-cabinets", "") &&
    !isAffiliateStorefrontPage("/affiliate", "") &&
    !isAffiliateStorefrontPage("/affiliate", "?viewAs=8250001") &&
    isWhiteLabelAffiliatePage({ pathname: "/store/kathmandu" }) &&
    !isWhiteLabelAffiliatePage({
      pathname: "/",
      hostname: "www.cabinetdealz.com",
      storeName: "Spartan Cabinets",
    }),
  "affiliate logo and white-label only target affiliate and storefront pages",
);
assert(
  affiliateLogoName({ pathname: "/store/kathmandu" }) === "Kathmandu" &&
    affiliateLogoName({
      pathname: "/affiliate",
      title: "CabinetDealz | Cabinets, Countertops & More",
    }) === "Store" &&
    affiliateLogoName({
      pathname: "/store/kathmandu",
      storeName: "Spartan Cabinets",
    }) === "Spartan Cabinets" &&
    /Kathmandu/.test(buildAffiliateLogoSvg("Kathmandu")),
  "affiliate wordmark uses the store name",
);
assert(
  isHostBrandText("CabinetDealz") &&
    isHostBrandText("Cabinet Dealz") &&
    !isHostBrandText("Spartan Cabinets"),
  "host-brand detector only matches the platform name",
);
assert(
  whiteLabelDocumentTitle(
    "CabinetDealz | Cabinets, Countertops & Kitchen Design",
    "Spartan Cabinets",
  ) === "Spartan Cabinets" &&
    replaceHostBrandText(
      "Plan your complete kitchen with CabinetDealz",
      "Spartan Cabinets",
    ) === "Plan your complete kitchen with Spartan Cabinets" &&
    shouldHideHostBrandElement("Cabinet Dealz") &&
    shouldHideHostBrandElement("Powered by Cabinet Dealz") &&
    isHostBrandLogo(
      "https://cdn.example.com/cabinet-dealz-og.png",
      "Cabinet Dealz",
    ),
  "affiliate pages rename or hide host-brand copy",
);
assert(
  buildAffiliateLogoSvg("Kathmandu").includes(">K<") &&
    buildAffiliateLogoSvg("<script>").includes("&lt;script&gt;"),
  "affiliate wordmark escapes store names and shows a monogram",
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

assert(
  planConnectExistingSiteTasks({
    siteName: "Just Putz It",
    liveUrl: "https://justputzit.com",
  }).length === 0,
  "Just Putz It gets no connect tasks — no pretend AI work",
);
const tasks = planConnectExistingSiteTasks({
  siteName: "Acme Live",
  liveUrl: "https://example.com",
  githubRepoUrl: "https://github.com/acme/live-site",
});
assert(
  tasks.some((task) =>
    /look at and administer|after owner approval|do not rewrite live copy/i.test(task.detail),
  ),
  "connect plan for a real host waits for owner approval",
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
assert(
  liveHostInsteadOfCinchClone(JUST_PUTZIT_CONNECT_SEED_ID, null) ===
    JUST_PUTZIT_LIVE,
  "deleted /site clone redirects to justputzit.com even if the Seed row is gone",
);
assert(
  liveHostInsteadOfCinchClone("pizza", {
    id: "pizza",
    name: "Pizza Man",
    seedMode: "build",
  }) === null,
  "normal Cinch-hosted Seeds are not redirected away from /site/",
);
const cloneRedirects = cinchHostedCloneRedirects();
assert(
  cloneRedirects.some(
    (rule) =>
      rule.source === JUST_PUTZIT_HOSTED_CLONE_PATH &&
      rule.destination === JUST_PUTZIT_LIVE &&
      rule.permanent,
  ),
  "config redirect sends the leftover /site clone to justputzit.com",
);
assert(
  cloneRedirects.some((rule) =>
    rule.source.startsWith(`${JUST_PUTZIT_HOSTED_CLONE_PATH}/`),
  ),
  "config redirect also covers leftover /site clone subpaths",
);
const nextConfigSource = readFileSync(
  join(process.cwd(), "next.config.ts"),
  "utf8",
);
assert(
  nextConfigSource.includes("cinchHostedCloneRedirects"),
  "next.config applies the leftover /site clone redirect",
);
const vercelRoutes = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
assert(
  vercelRoutes.includes(JUST_PUTZIT_CONNECT_SEED_ID) &&
    vercelRoutes.includes("justputzit.com"),
  "Vercel edge redirect sends the leftover /site clone to justputzit.com",
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

assert(
  canonicalizeCinchSeedOrigin("https://cinchseed.com") === CINCH_SEED_ORIGIN,
  "apex cinchseed.com Connect API origin becomes www",
);
assert(
  canonicalizeCinchSeedOrigin("https://www.cinchseed.com") === CINCH_SEED_ORIGIN,
  "www cinchseed.com Connect API origin stays www",
);
const apexWatch = buildWatchClientJs({
  origin: "https://cinchseed.com",
  defaultTools: [],
});
assert(
  apexWatch.includes('var origin = "https://www.cinchseed.com"'),
  "watch.js posts health to www even when built with apex origin",
);
assert(
  !/"https:\/\/cinchseed\.com"/.test(apexWatch),
  "watch.js origin is not apex cinchseed.com",
);

const watchJs = buildWatchClientJs({
  origin: "https://www.cinchseed.com",
  defaultTools: [],
});
assert(watchJs.includes("findScript"), "watch.js finds the tag without currentScript");
assert(watchJs.includes("cinch-seed-community"), "watch.js paints a Community card");
assert(watchJs.includes("data-key is missing"), "watch.js explains a missing Connect Key");
assert(
  watchJs.includes("Use the key already on this live site"),
  "watch.js explains a Connect key mismatch without asking to rebuild",
);
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

const sampleConnectKey = `cs_${"ab".repeat(24)}`;
const otherConnectKey = `cs_${"cd".repeat(24)}`;
assert(
  CONNECT_KEY_PATTERN.test(sampleConnectKey) && isConnectKeyFormat(sampleConnectKey),
  "generated-style Connect keys match cs_ + 48 hex",
);
assert(
  !isConnectKeyFormat("not-a-key") && !isConnectKeyFormat("cs_short"),
  "malformed Connect keys are rejected",
);
assert(
  JUST_PUTZIT_EMBED_CONFIG_URL ===
    `${JUST_PUTZIT_LIVE}/api/trpc/cinchSeed.getEmbedConfig`,
  "leftover Just Putz It embed URL is known so Cinch can refuse it",
);

const superjsonEmbed = parsePublishedEmbedConfig({
  result: {
    data: {
      json: {
        seedId: JUST_PUTZIT_CONNECT_SEED_ID,
        connectKey: sampleConnectKey,
        scriptUrl: "https://cinchseed.com/v1/watch.js",
      },
    },
  },
});
assert(
  superjsonEmbed?.seedId === JUST_PUTZIT_CONNECT_SEED_ID &&
    superjsonEmbed.connectKey === sampleConnectKey,
  "parses Just Putz It tRPC superjson embed config",
);
assert(
  parsePublishedEmbedConfig({
    result: {
      data: {
        seedId: JUST_PUTZIT_CONNECT_SEED_ID,
        connectKey: sampleConnectKey,
      },
    },
  })?.connectKey === sampleConnectKey,
  "parses a plain tRPC embed config",
);
assert(
  shouldAdoptPublishedConnectKey({
    projectId: JUST_PUTZIT_CONNECT_SEED_ID,
    incomingKey: sampleConnectKey,
    published: superjsonEmbed,
  }),
  "adopts the key Just Putz It already publishes",
);
assert(
  !shouldAdoptPublishedConnectKey({
    projectId: JUST_PUTZIT_CONNECT_SEED_ID,
    incomingKey: otherConnectKey,
    published: superjsonEmbed,
  }),
  "does not adopt an invented Connect key",
);
assert(
  !shouldAdoptPublishedConnectKey({
    projectId: "another-seed",
    incomingKey: sampleConnectKey,
    published: superjsonEmbed,
  }),
  "does not adopt a published key onto a different Seed",
);

resetPublishedConnectKeyCache();
const publishedKeyFetch = fetchPublishedJustPutzItConnectKey(async (url) => {
  assert(
    String(url) === JUST_PUTZIT_EMBED_CONFIG_URL,
    "live-key fetch hits justputzit.com embed config",
  );
  return new Response(
    JSON.stringify({
      result: {
        data: {
          json: {
            seedId: JUST_PUTZIT_CONNECT_SEED_ID,
            connectKey: sampleConnectKey,
            scriptUrl: "https://cinchseed.com/v1/watch.js",
          },
        },
      },
    }),
    { headers: { "content-type": "application/json" } },
  );
}).then((fetched) => {
  assert(
    fetched?.connectKey === sampleConnectKey,
    "fetches and caches the published Just Putz It Connect key",
  );
});

const adminControls = readFileSync(
  join(
    process.cwd(),
    "src/app/admin/(gated)/projects/[id]/connect-api-controls.tsx",
  ),
  "utf8",
);
assert(
  !adminControls.includes("Use key already on justputzit.com") &&
    adminControls.includes("Set existing key"),
  "admin Seed desk does not pull a Just Putz It live key",
);

const portalControls = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/connect-panel.tsx"),
  "utf8",
);
assert(
  !portalControls.includes("Use key already on justputzit.com") &&
    portalControls.includes("Set existing key"),
  "portal Connect panel does not pull a Just Putz It live key",
);
assert(
  portalControls.includes(
    'href="https://www.cabinetdealz.com/affiliate?viewAs=8250001"',
  ),
  "the affiliate desk URL is a hyperlink",
);

function makeDomNode(input: {
  tag: string;
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
  attrs?: Record<string, string>;
}) {
  const attrs: Record<string, string> = { ...(input.attrs ?? {}) };
  const node: {
    tag: string;
    tagName: string;
    href?: string;
    src?: string;
    alt?: string;
    textContent: string;
    style: { cssText: string; display?: string };
    children: unknown[];
    childNodes: Array<{ nodeType: number; nodeValue: string }>;
    getAttribute(name: string): string;
    setAttribute(name: string, value: string): void;
  } = {
    tag: input.tag,
    tagName: input.tag.toUpperCase(),
    href: input.href,
    src: input.src,
    alt: input.alt,
    textContent: input.text ?? "",
    style: { cssText: "" },
    children: [],
    childNodes: input.text
      ? [{ nodeType: 3, nodeValue: input.text }]
      : [],
    getAttribute(name: string) {
      if (name === "src") return this.src || attrs.src || "";
      if (name === "alt") return this.alt || attrs.alt || "";
      if (name === "href") return this.href || attrs.href || "";
      return attrs[name] || "";
    },
    setAttribute(name: string, value: string) {
      attrs[name] = value;
      if (name === "alt") this.alt = value;
      if (name === "src") this.src = value;
    },
  };
  return node;
}

function runWatch(scriptEl: {
  src?: string;
  attrs: Record<string, string>;
  host?: string;
  path?: string;
  search?: string;
  title?: string;
  hasLogoImg?: boolean;
  hostBrand?: {
    heading?: string;
    link?: string;
    footer?: string;
    logoSrc?: string;
    logoAlt?: string;
    metas?: Array<{ property?: string; name?: string; content: string }>;
  };
}) {
  const created: Array<{ id?: string; text?: string; innerHTML?: string }> = [];
  const fetches: string[] = [];
  const fakeScript = {
    src: scriptEl.src || "https://www.cinchseed.com/v1/watch.js",
    getAttribute(name: string) {
      return scriptEl.attrs[name] || "";
    },
  };
  const logoImg = makeDomNode({
    tag: "img",
    src: scriptEl.hostBrand?.logoSrc || "/manus-storage/logo.png",
    alt: scriptEl.hostBrand?.logoAlt || (scriptEl.hasLogoImg ? "Store logo" : ""),
  });
  const heading = makeDomNode({
    tag: "h1",
    text:
      scriptEl.hostBrand?.heading ??
      "Plan your complete kitchen with CabinetDealz",
  });
  const brandLink = makeDomNode({
    tag: "a",
    text: scriptEl.hostBrand?.link ?? "CabinetDealz",
    href: "/",
  });
  const footer = makeDomNode({
    tag: "p",
    text: scriptEl.hostBrand?.footer ?? "© 2026 Cabinet Dealz",
  });
  const metas = (scriptEl.hostBrand?.metas ?? [
    { property: "og:site_name", content: "Cabinet Dealz" },
    {
      property: "og:title",
      content: "CabinetDealz | Cabinets, Countertops & Kitchen Design",
    },
  ]).map((meta) => {
    const attrs: Record<string, string> = {
      content: meta.content,
      ...(meta.property ? { property: meta.property } : {}),
      ...(meta.name ? { name: meta.name } : {}),
    };
    return {
      getAttribute(name: string) {
        return attrs[name] || "";
      },
      setAttribute(name: string, value: string) {
        attrs[name] = value;
      },
      attrs,
    };
  });
  const documentElement = {
    attrs: {} as Record<string, string>,
    getAttribute(name: string) {
      return this.attrs[name] || "";
    },
    setAttribute(name: string, value: string) {
      this.attrs[name] = value;
    },
  };
  const body = {
    appendChild(node: { id?: string }) {
      created.push(node);
      return node;
    },
    insertBefore(node: { id?: string }) {
      created.push(node);
      return node;
    },
  };
  const header = {
    firstChild: null,
    insertBefore(node: { id?: string }) {
      created.push(node);
      return node;
    },
    appendChild(node: { id?: string }) {
      created.push(node);
      return node;
    },
  };
  const store: Record<string, string> = {};
  const path = scriptEl.path ?? "/";
  const search = scriptEl.search ?? "";
  const host = scriptEl.host ?? "justputzit.com";
  const useHostBrand = Boolean(scriptEl.hostBrand) || /\/store\//.test(path);
  const context = createContext({
    window: { __CINCH_SEED_BOOT__: undefined } as Record<string, unknown>,
    document: {
      currentScript: null,
      body,
      documentElement,
      title: scriptEl.title ?? "",
      querySelectorAll(sel: string) {
        const needle = String(sel);
        if (needle.includes("watch.js") || needle.includes("script[src")) {
          return [fakeScript];
        }
        if (needle.includes('script[type="application/ld+json"]')) {
          return [];
        }
        if (needle.includes("meta")) {
          return useHostBrand ? metas : [];
        }
        if (needle.includes("img")) {
          if (scriptEl.hasLogoImg || scriptEl.hostBrand?.logoSrc) return [logoImg];
          return [];
        }
        if (
          needle.includes("h1") ||
          needle.includes("a,") ||
          needle.includes("footer")
        ) {
          return useHostBrand ? [heading, brandLink, footer] : [];
        }
        return [];
      },
      querySelector(sel: string) {
        const needle = String(sel);
        if (needle === "header" || needle === "nav") return header;
        if (needle.includes("watch.js") || needle.includes("data-seed") || needle.includes("script")) {
          return fakeScript;
        }
        if (needle.includes("img") && (scriptEl.hasLogoImg || scriptEl.hostBrand?.logoSrc)) {
          return logoImg;
        }
        if (needle === "[data-cinch-white-label='on']") {
          return documentElement.getAttribute("data-cinch-white-label") === "on"
            ? documentElement
            : null;
        }
        return null;
      },
      getElementById() {
        return null;
      },
      createElement(tag: string) {
        const node: Record<string, unknown> = {
          tag,
          id: "",
          attrs: {} as Record<string, string>,
          style: { cssText: "" },
          textContent: "",
          innerHTML: "",
          setAttribute(name: string, value: string) {
            (this.attrs as Record<string, string>)[name] = value;
            if (name === "id") this.id = value;
          },
          addEventListener() {},
          appendChild() {},
          remove() {},
        };
        return node;
      },
      addEventListener() {},
    },
    location: {
      href: `https://${host}${path}${search}`,
      hostname: host,
      pathname: path,
      search,
    },
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
    fetch(url: string, init?: { method?: string }) {
      fetches.push(String(url));
      if (
        String(url).includes("/v1/design") &&
        String(init?.method || "GET").toUpperCase() !== "POST"
      ) {
        return Promise.resolve({
          status: 200,
          json: async () => ({
            ok: true,
            designs: [
              {
                storeName: "Spartan Cabinets",
                storeSlug: "kathmandu",
                title: "Aero Blanc kitchen",
                customerName: "Pat",
                contact: "pat@example.com",
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        status: 401,
        json: async () => ({ ok: false, error: "Invalid or missing Connect key." }),
      });
    },
    setInterval() {
      return 0;
    },
    encodeURIComponent,
    decodeURIComponent,
    JSON,
    URLSearchParams,
    String,
  });
  (context.window as { document: unknown }).document = context.document;
  (context.window as { location: unknown }).location = context.location;
  (context.window as { navigator: unknown }).navigator = context.navigator;
  runInContext(watchJs, context);
  return {
    created,
    window: context.window as { __CINCH_SEED__?: { seed: string } },
    fetches,
    title: (context.document as { title?: string }).title ?? "",
    heading,
    brandLink,
    footer,
    metas,
    logoImg,
    documentElement,
  };
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
  watchJs.includes("paintAffiliateLogo") &&
    watchJs.includes("cinch-seed-affiliate-logo") &&
    watchJs.includes("affiliate-logo") &&
    watchJs.includes("stripHostBrandOnAffiliate") &&
    watchJs.includes("data-cinch-white-label") &&
    watchJs.includes("paintAffiliateDesignCrm") &&
    watchJs.includes("/v1/design") &&
    watchJs.includes("https://www.cabinetdealz.com/affiliate?viewAs=") &&
    watchJs.includes("text-decoration:underline") &&
    watchJs.includes("paintShopPathLinks") &&
    watchJs.includes("cinch-seed-shop-path") &&
    watchJs.includes("data-cinch-designer-chrome") &&
    watchJs.includes("designer-canvas"),
  "watch.js can make a store logo on an affiliate page",
);

const affiliatePaint = runWatch({
  host: "www.cabinetdealz.com",
  path: "/store/kathmandu",
  title: "CabinetDealz | Cabinets, Countertops & Kitchen Design",
  attrs: { "data-seed": "seed-demo", "data-key": "key-demo", "data-mark": "true" },
});
assert(
  affiliatePaint.created.some((node) => node.id === "cinch-seed-affiliate-logo"),
  "watch.js paints a store logo on the affiliate storefront",
);
assert(
  !affiliatePaint.created.some((node) => node.id === "cinch-seed-community"),
  "white-label storefronts do not show the Cinch Community card",
);
assert(
  !affiliatePaint.created.some((node) => node.id === "cinch-seed-design-crm"),
  "public storefronts do not show the affiliate design CRM",
);
assert(
  affiliatePaint.title === "Kathmandu" &&
    /Kathmandu/.test(affiliatePaint.heading.textContent) &&
    !isHostBrandText(affiliatePaint.heading.textContent) &&
    affiliatePaint.brandLink.style.display === "none" &&
    affiliatePaint.footer.textContent === "© 2026 Kathmandu" &&
    affiliatePaint.metas[0]?.attrs.content === "Kathmandu" &&
    !isHostBrandText(affiliatePaint.metas[1]?.attrs.content) &&
    affiliatePaint.documentElement.attrs["data-cinch-white-label"] === "on",
  "watch.js white-labels titles, headers, and footers on the storefront",
);

const spartanPaint = runWatch({
  host: "www.cabinetdealz.com",
  path: "/store/kathmandu",
  title: "CabinetDealz | Cabinets, Countertops & Kitchen Design",
  hostBrand: {
    heading: "Plan your complete kitchen with CabinetDealz",
    link: "CabinetDealz",
    footer: "© 2026 Cabinet Dealz",
    logoSrc: "https://cdn.example.com/cabinet-dealz-og.png",
    logoAlt: "Cabinet Dealz",
  },
  attrs: {
    "data-seed": "seed-demo",
    "data-key": "key-demo",
    "data-mark": "true",
    "data-store-name": "Spartan Cabinets",
  },
});
assert(
  spartanPaint.title === "Spartan Cabinets" &&
    spartanPaint.heading.textContent ===
      "Plan your complete kitchen with Spartan Cabinets" &&
    !isHostBrandText(spartanPaint.heading.textContent) &&
    !isHostBrandText(spartanPaint.footer.textContent) &&
    spartanPaint.logoImg.style.display === "none" &&
    spartanPaint.created.some((node) => node.id === "cinch-seed-affiliate-logo"),
  "Spartan Cabinets storefronts stay white-label even when the slug differs",
);

const alreadyHasLogo = runWatch({
  host: "www.cabinetdealz.com",
  path: "/affiliate",
  hasLogoImg: true,
  attrs: { "data-seed": "seed-demo", "data-key": "key-demo", "data-mark": "true" },
});
assert(
  !alreadyHasLogo.created.some((node) => node.id === "cinch-seed-affiliate-logo"),
  "watch.js does not replace an uploaded affiliate logo",
);
assert(
  alreadyHasLogo.created.some((node) => node.id === "cinch-seed-community"),
  "affiliate dashboard still shows the Connect widget",
);
assert(
  alreadyHasLogo.created.some((node) => node.id === "cinch-seed-design-crm"),
  "affiliate dashboard lists designs in the CRM",
);
assert(
  alreadyHasLogo.fetches.some((url) => url.includes("/v1/design")),
  "watch.js loads affiliate designs for the CRM",
);

const viewAsDesk = runWatch({
  host: "www.cabinetdealz.com",
  path: "/affiliate",
  search: "?viewAs=8250001",
  attrs: {
    "data-seed": "seed-demo",
    "data-key": "key-demo",
    "data-mark": "true",
    "data-store-name": "Spartan Cabinets",
  },
});
assert(
  viewAsDesk.created.some((node) => node.id === "cinch-seed-design-crm"),
  "viewAs=8250001 still shows the affiliate design CRM",
);
assert(
  viewAsDesk.fetches.some((url) => url.includes("store=8250001")),
  "the CRM loads designs for affiliate 8250001",
);
assert(
  viewAsDesk.created.some((node) => node.id === "cinch-seed-community"),
  "the affiliate desk still shows the Connect widget",
);

const homeNoLogo = runWatch({
  host: "www.cabinetdealz.com",
  path: "/",
  attrs: { "data-seed": "seed-demo", "data-key": "key-demo", "data-mark": "true" },
});
assert(
  !homeNoLogo.created.some((node) => node.id === "cinch-seed-affiliate-logo"),
  "watch.js does not invent a logo on the marketing homepage",
);
assert(
  !homeNoLogo.created.some((node) => node.id === "cinch-seed-shop-path"),
  "watch.js does not put shop-path links on the marketing homepage",
);

const designPath = runWatch({
  host: "www.cabinetdealz.com",
  path: "/design",
  attrs: { "data-seed": "seed-demo", "data-key": "key-demo", "data-mark": "true" },
});
const designNav = designPath.created.find((node) => node.id === "cinch-seed-shop-path") as
  | { id?: string; style?: { cssText?: string }; attrs?: Record<string, string> }
  | undefined;
assert(
  Boolean(designNav) &&
    designNav?.attrs?.["data-cinch-designer-chrome"] === "compact" &&
    /margin-left:auto/.test(designNav?.style?.cssText ?? "") &&
    /background:transparent/.test(designNav?.style?.cssText ?? ""),
  "watch.js paints compact back links in the designer header",
);
assert(
  !designPath.created.some((node) => node.id === "cinch-seed-community"),
  "the Connect card stays off the 3D designer canvas",
);

const stylesPath = runWatch({
  host: "www.cabinetdealz.com",
  path: "/styles",
  attrs: { "data-seed": "seed-demo", "data-key": "key-demo", "data-mark": "true" },
});
const stylesNav = stylesPath.created.find((node) => node.id === "cinch-seed-shop-path") as
  | { style?: { cssText?: string }; attrs?: Record<string, string> }
  | undefined;
assert(
  Boolean(stylesNav) &&
    stylesNav?.attrs?.["data-cinch-designer-chrome"] !== "compact" &&
    /background:#f7f4ee/.test(stylesNav?.style?.cssText ?? ""),
  "styles and cart keep the full shop-path bar",
);

const storeDesignPath = runWatch({
  host: "www.cabinetdealz.com",
  path: "/store/kathmandu/design",
  attrs: { "data-seed": "seed-demo", "data-key": "key-demo", "data-mark": "true" },
});
assert(
  storeDesignPath.created.some((node) => node.id === "cinch-seed-shop-path"),
  "watch.js paints back links on the affiliate designer",
);

const homeKeepBrand = runWatch({
  host: "www.cabinetdealz.com",
  path: "/",
  title: "CabinetDealz | Cabinets, Countertops & Kitchen Design",
  hostBrand: {
    heading: "Plan your complete kitchen with CabinetDealz",
    link: "CabinetDealz",
    footer: "© 2026 Cabinet Dealz",
  },
  attrs: {
    "data-seed": "seed-demo",
    "data-key": "key-demo",
    "data-mark": "true",
    "data-store-name": "Spartan Cabinets",
  },
});
assert(
  homeKeepBrand.title === "CabinetDealz | Cabinets, Countertops & Kitchen Design" &&
    /CabinetDealz/.test(homeKeepBrand.heading.textContent),
  "the host marketing homepage keeps its own brand",
);

assert(
  /after owner approval/i.test(PLACE_WIDGET_TITLE),
  "widget install is queued until owner approval",
);
assert(
  tasks.some((task) => task.detail.includes(LIVE_UPDATE_REQUIRES_APPROVAL)),
  "connect plan repeats the owner-approval rule",
);

Promise.all([
  publishedKeyFetch,
  healthGet().then(async (response) => {
    const body = (await response.json()) as { ok?: boolean; service?: string };
    assert(response.ok, "GET /v1/health is allowed");
    assert(body.ok === true, "GET /v1/health reports ok");
    assert(
      body.service === "cinch-seed-connect",
      "GET /v1/health names the Connect API",
    );
  }),
  logoGet(
    new Request("https://www.cinchseed.com/v1/logo?name=Kathmandu"),
  ).then(async (response) => {
    const body = await response.text();
    assert(response.ok, "GET /v1/logo is allowed");
    assert(
      response.headers.get("content-type")?.includes("image/svg+xml") === true,
      "GET /v1/logo serves an SVG wordmark",
    );
    assert(/Kathmandu/.test(body), "GET /v1/logo uses the store name");
  }),
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
  }).then((look) => {
    assert(look.ok, "look helper reaches a live HTML response");
    assert(look.hostedOnManus, "look helper recognizes the Manus host");
    assert(!look.watchJsPresent, "look helper reports missing watch.js");
    assert(/just putzit/i.test(look.title ?? ""), "look helper reads the live title");
  }),
])
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
