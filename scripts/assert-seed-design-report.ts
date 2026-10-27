/**
 * Guard: DeepSeek reviews 50 genre websites and reports how the site
 * should be made before any design or website code is written.
 * Run: npx tsx scripts/assert-seed-design-report.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  MIN_COMPARABLE_CRAWL,
  researchPoolForIndustry,
  uniqueCompetitorHosts,
  type ComparableResearch,
  type ComparableSnapshot,
} from "../src/lib/seed-comparable-research";
import {
  buildDeepSeekDesignReport,
  DEEPSEEK_DESIGN_REPORT_RULE,
  DEEPSEEK_DESIGN_REPORT_TITLE,
  DESIGN_BLUEPRINT_KEYS,
  designReportMeetsHardRule,
  designReportProblem,
  designReportSites,
  MIN_DESIGN_REPORT_SITES,
  pathIsSiteDesignOrCode,
  seedNeedsDesignReport,
  taskIsDesignReport,
  taskRunsBeforeDesignReport,
  type DeepSeekDesignReport,
} from "../src/lib/seed-design-report";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

assert(
  /DeepSeek/.test(DEEPSEEK_DESIGN_REPORT_RULE.summary) &&
    /50 websites/.test(DEEPSEEK_DESIGN_REPORT_RULE.summary) &&
    /before any design or website code/i.test(DEEPSEEK_DESIGN_REPORT_RULE.summary) &&
    /best features of every one/i.test(DEEPSEEK_DESIGN_REPORT_RULE.summary),
  "rule: DeepSeek reviews 50 genre websites before design or code and takes the best of every one",
);
assert(MIN_DESIGN_REPORT_SITES === 50, "the report floor is 50 websites");

for (const industry of [
  "dealership",
  "delivery",
  "food",
  "salon",
  "lawn",
  "garage",
  "detail",
  "retail",
  "trade",
  "generic",
  "club",
]) {
  assert(
    uniqueCompetitorHosts(researchPoolForIndustry(industry)).length >= 75,
    `${industry} crawl pool has headroom past 50 sites that return a page`,
  );
}

assert(
  pathIsSiteDesignOrCode("app/page.tsx") &&
    pathIsSiteDesignOrCode("app/globals.css") &&
    pathIsSiteDesignOrCode("public/manifest.webmanifest") &&
    pathIsSiteDesignOrCode("content/landing.copy.json") &&
    pathIsSiteDesignOrCode("content/shop.copy.json"),
  "pages, styles, public files, and site copy count as design or code",
);
assert(
  !pathIsSiteDesignOrCode("docs/design-report.md") &&
    !pathIsSiteDesignOrCode("content/design-report.json") &&
    !pathIsSiteDesignOrCode("content/comparable-research.json") &&
    !pathIsSiteDesignOrCode("content/delivery.ops.json") &&
    !pathIsSiteDesignOrCode("public/products/sku-1.jpg") &&
    !pathIsSiteDesignOrCode("README.md"),
  "docs, research, the report, ops data, and owner product photos still save",
);

assert(
  seedNeedsDesignReport({ seedMode: "build", seedKind: "website" }) &&
    !seedNeedsDesignReport({ seedMode: "connect", seedKind: "website" }) &&
    !seedNeedsDesignReport({ seedMode: "build", seedKind: "writer" }),
  "website Seeds need the report; connect and Writer Seeds do not",
);

assert(
  taskIsDesignReport(DEEPSEEK_DESIGN_REPORT_TITLE) &&
    taskRunsBeforeDesignReport(DEEPSEEK_DESIGN_REPORT_TITLE) &&
    taskRunsBeforeDesignReport("Search comparable ideal sites and take the best") &&
    taskRunsBeforeDesignReport("Hold the prep brief — do not open AI cold"),
  "prep, the crawl, and the report run before the report passes",
);
for (const title of [
  "Build the whole site",
  "Shape information architecture",
  "Write Seed landing copy",
  "Implement frontend shell",
  "Ship cross-device responsive experience",
  "Build Seed shop e-commerce",
  "SEO and metadata pass",
]) {
  assert(!taskRunsBeforeDesignReport(title), `“${title}” waits for the DeepSeek report`);
}

function snapshot(i: number, fetched = true): ComparableSnapshot {
  return {
    url: `https://www.site${i}.com/`,
    host: `site${i}.com`,
    fetched,
    title: `Site ${i} title`,
    h1: `Site ${i} headline`,
    cta: "Book now",
    description: "A description long enough to be useful for the research pass.",
    nav: ["Home", "Services", "About", "Contact"],
    score: 100 - i,
    notes: [],
  };
}

function research(fetchedCount: number, total = 70): ComparableResearch {
  return {
    query: "best salon website",
    industry: "salon",
    searchedAt: "2026-10-27T00:00:00.000Z",
    urlsConsidered: Array.from({ length: total }, (_, i) => snapshot(i).url),
    snapshots: Array.from({ length: total }, (_, i) => snapshot(i, i < fetchedCount)),
    winnerUrl: null,
    bestCta: null,
    bestHeadline: null,
    bestSeoTitle: null,
    bestSeoDescription: null,
    customerFriendlyMethods: [],
    takeaways: [],
  };
}

const crawl = research(60);
assert(
  designReportSites(crawl).length === 50 &&
    designReportSites(crawl).every((snap) => snap.fetched),
  "DeepSeek reads the 50 best sites that returned a page — not catalog-only entries",
);

function passingReport(): DeepSeekDesignReport {
  return {
    provider: "deepseek",
    model: "deepseek-chat",
    industry: "salon",
    generatedAt: "2026-10-27T00:01:00.000Z",
    researchSearchedAt: crawl.searchedAt,
    sitesReviewed: designReportSites(crawl).map((snap) => ({
      host: snap.host,
      url: snap.url,
      bestFeature: `Feature taken from ${snap.host}`,
    })),
    summary: "Book-first salon site.",
    blueprint: Object.fromEntries(
      DESIGN_BLUEPRINT_KEYS.map((key) => [key, `${key} plan`]),
    ) as DeepSeekDesignReport["blueprint"],
    sectionOrder: ["Hero", "Services", "Stylists", "Reviews", "Book"],
    mustHaveFeatures: Array.from({ length: 8 }, (_, i) => ({
      feature: `Feature ${i}`,
      fromHost: `site${i}.com`,
      why: "Customers finish the job faster.",
    })),
    avoid: ["Phone tag", "Hidden prices", "Stock photos"],
  };
}

assert(!designReportMeetsHardRule(null, crawl), "no report blocks design");
assert(designReportMeetsHardRule(passingReport(), crawl), "a full DeepSeek report on 50 sites passes");
assert(
  !designReportMeetsHardRule(
    { ...passingReport(), provider: "openai" as "deepseek" },
    crawl,
  ),
  "a report from another provider does not count",
);
assert(
  !designReportMeetsHardRule(
    { ...passingReport(), sitesReviewed: passingReport().sitesReviewed.slice(0, 49) },
    crawl,
  ),
  "49 reviewed sites is not 50",
);
assert(
  !designReportMeetsHardRule(passingReport(), { ...crawl, searchedAt: "2026-10-28T00:00:00.000Z" }),
  "a new crawl needs a new report",
);
assert(
  !designReportMeetsHardRule(
    { ...passingReport(), blueprint: { ...passingReport().blueprint, hero: "" } },
    crawl,
  ),
  "a blank blueprint section fails",
);
assert(
  /reviewed 0 of 50/.test(
    designReportProblem(
      {
        ...passingReport(),
        sitesReviewed: passingReport().sitesReviewed.map((site) => ({
          ...site,
          host: `other-${site.host}`,
        })),
      },
      crawl,
    ) ?? "",
  ),
  "reviewed sites must be ones the crawl actually fetched",
);

const store = read("src/lib/store.ts");
const researchAt = store.indexOf('title: "Search comparable ideal sites and take the best"');
const reportAt = store.indexOf("title: DEEPSEEK_DESIGN_REPORT_TITLE");
const adoptAt = store.indexOf('title: "Adopt existing library modulars"');
assert(
  researchAt > 0 && reportAt > researchAt && adoptAt > reportAt,
  "the build plan runs the crawl, then the DeepSeek report, then everything else",
);
assert(
  /taskIsDesignReport\(item\.title\)\) \+ 1/.test(store),
  "a whole-site build is queued after the DeepSeek report",
);
const pm = read("src/lib/project-manager.ts");
assert(
  (pm.match(/designReportAllowsTask\(project, /g) ?? []).length >= 4,
  "the project manager holds starts and sign-offs until the report passes",
);
const source = read("src/lib/seed-source.ts");
assert(
  /const held = await designReportHoldsWrite\(input, bundle\);/.test(source),
  "every source write checks the DeepSeek report gate",
);

async function main() {
  const realFetch = globalThis.fetch;
  const savedKey = process.env.DEEPSEEK_API_KEY;

  delete process.env.DEEPSEEK_API_KEY;
  const thin = await buildDeepSeekDesignReport({
    projectName: "Shear Joy Salon",
    brief: "Hair salon. Book online.",
    research: research(MIN_COMPARABLE_CRAWL - 3),
  });
  assert(
    !thin.ok && /Only 47 of 50/.test(thin.error),
    "fewer than 50 sites that returned a page blocks the report",
  );

  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "sk-test-openai";
  const noDeepSeek = await buildDeepSeekDesignReport({
    projectName: "Shear Joy Salon",
    brief: "Hair salon. Book online.",
    research: crawl,
  });
  assert(
    !noDeepSeek.ok && /DeepSeek is not configured/.test(noDeepSeek.error),
    "no DeepSeek key blocks the report — no failover to another provider",
  );

  process.env.DEEPSEEK_API_KEY = "sk-test-deepseek";
  const deepseekCalls: string[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const href = String(url);
    if (!href.startsWith("https://api.deepseek.com/")) {
      throw new Error(`unexpected fetch ${href}`);
    }
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      messages: Array<{ role: string; content: string }>;
    };
    const system = body.messages[0]?.content ?? "";
    const user = body.messages[1]?.content ?? "";
    deepseekCalls.push(system.includes('"sites"') ? "notes" : "blueprint");
    const content = system.includes('"sites"')
      ? JSON.stringify({
          sites: [...user.matchAll(/host: (\S+)/g)].map((m) => ({
            host: m[1],
            bestFeature: `Take the booking flow from ${m[1]}`,
          })),
        })
      : JSON.stringify({
          summary: "Book-first salon site built from the best of 50.",
          blueprint: Object.fromEntries(
            DESIGN_BLUEPRINT_KEYS.map((key) => [key, `${key} from the best sites`]),
          ),
          sectionOrder: ["Hero", "Services", "Stylists", "Reviews", "Book"],
          mustHaveFeatures: Array.from({ length: 8 }, (_, i) => ({
            feature: `Feature ${i}`,
            fromHost: `site${i}.com`,
            why: "Guests book faster.",
          })),
          avoid: ["Phone tag", "Hidden prices", "Stock photos"],
        });
    return new Response(
      JSON.stringify({ choices: [{ message: { content } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  const built = await buildDeepSeekDesignReport({
    projectName: "Shear Joy Salon",
    brief: "Hair salon. Book online.",
    research: crawl,
  });
  assert(
    built.ok &&
      built.report.provider === "deepseek" &&
      built.report.sitesReviewed.length === 50 &&
      built.report.researchSearchedAt === crawl.searchedAt &&
      designReportMeetsHardRule(built.report, crawl),
    "DeepSeek reviews all 50 sites and writes a passing report",
  );
  assert(
    deepseekCalls.filter((call) => call === "notes").length === 2 &&
      deepseekCalls.at(-1) === "blueprint",
    "DeepSeek notes every site first, then writes the blueprint from those notes",
  );

  globalThis.fetch = realFetch;
  if (savedKey) process.env.DEEPSEEK_API_KEY = savedKey;
  else delete process.env.DEEPSEEK_API_KEY;

  if (process.exitCode) {
    console.error("\nDeepSeek design report guards failed.");
    process.exit(process.exitCode);
  }
  console.log("\nAll DeepSeek design report guards passed.");
}

void main();
