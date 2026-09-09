/**
 * Guard: script desk lists website + admin for every installed script.
 * Run: npx tsx scripts/assert-script-management.ts
 */
import {
  liveAdminUrl,
  liveWebsiteUrl,
  publicAdminUrl,
  seedDeskUrl,
  seedEmbedSnippet,
} from "../src/lib/domain";
import {
  CINCH_MANAGED_SCRIPTS,
  JUST_PUTZIT_ADMIN,
  JUST_PUTZIT_CONNECT_SEED_ID,
  buildScriptInventory,
  classifyScript,
  findJustPutzItProject,
  hostFromProject,
  justPutzItHost,
  pageHasCinchWatch,
  parseInstalledScripts,
  probeFromHtml,
} from "../src/lib/script-management";
import { JUST_PUTZIT_LIVE } from "../src/lib/seed-connect";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

const connectProject = {
  id: JUST_PUTZIT_CONNECT_SEED_ID,
  name: "Just Putz It",
  customDomain: null,
  seedMode: "connect" as const,
  referenceUrl: JUST_PUTZIT_LIVE,
  githubRepoUrl: null,
};

assert(
  liveWebsiteUrl(connectProject) === JUST_PUTZIT_LIVE,
  "Visit website stays on justputzit.com",
);
assert(
  liveAdminUrl(connectProject) === JUST_PUTZIT_ADMIN,
  "Site admin is justputzit.com/admin, not a Cinch-hosted clone",
);
assert(
  publicAdminUrl(connectProject) === JUST_PUTZIT_ADMIN,
  "Public admin URL is the live host admin",
);
assert(
  seedDeskUrl(connectProject.id) ===
    `/admin/projects/${JUST_PUTZIT_CONNECT_SEED_ID}`,
  "Cinch desk URL is the Seed project page",
);

const buildProject = {
  id: "seed-build-1",
  name: "Pizza Man",
  customDomain: null,
  seedMode: "build" as const,
  referenceUrl: null,
  githubRepoUrl: null,
};
assert(
  liveAdminUrl(buildProject) === "/site/seed-build-1/admin",
  "Cinch-hosted Seeds use /site/[id]/admin",
);

assert(
  CINCH_MANAGED_SCRIPTS.some(
    (script) =>
      script.id === "cinch-watch" &&
      script.requiredOn.includes("website") &&
      script.requiredOn.includes("admin"),
  ),
  "Cinch Seed Watch is required on website and admin",
);

const html = `
<title>Just Putzit</title>
<script defer src="https://cloud.umami.is/script.js" data-website-id="abc"></script>
<script src="https://manus.im/runtime.js"></script>
${seedEmbedSnippet(JUST_PUTZIT_CONNECT_SEED_ID, "cs_test")}
`;
const parsed = parseInstalledScripts(html);
assert(
  parsed.some((script) => script.catalogId === "cinch-watch"),
  "parser finds Cinch Seed Watch",
);
assert(
  parsed.some((script) => script.catalogId === "umami"),
  "parser finds Umami",
);
assert(
  parsed.some((script) => script.catalogId === "manus"),
  "parser finds Manus",
);
assert(pageHasCinchWatch(html), "pageHasCinchWatch is true when watch.js is present");
assert(
  !pageHasCinchWatch("<script src=\"https://cloud.umami.is/script.js\"></script>"),
  "analytics alone is not Cinch Watch",
);
assert(
  classifyScript("https://www.cinchseed.com/v1/watch.js", 'data-seed="x"').catalogId ===
    "cinch-watch",
  "classifyScript recognizes watch.js",
);

const host = hostFromProject(connectProject);
assert(host.websiteUrl === JUST_PUTZIT_LIVE, "host website is the live dating site");
assert(host.adminUrl === JUST_PUTZIT_ADMIN, "host admin is the live /admin");

const inventory = buildScriptInventory(host, [
  probeFromHtml("website", host.websiteUrl, html.replace(seedEmbedSnippet(JUST_PUTZIT_CONNECT_SEED_ID, "cs_test"), "")),
  probeFromHtml("admin", host.adminUrl, html),
]);
const watchRow = inventory.rows.find((row) => row.catalogId === "cinch-watch");
assert(Boolean(watchRow), "inventory always includes Cinch Seed Watch");
assert(
  watchRow?.website === "missing" && watchRow?.admin === "installed",
  "watch can be missing on the website while present on admin",
);
assert(
  inventory.rows.some((row) => row.catalogId === "umami"),
  "inventory lists host scripts already installed",
);

const fallback = justPutzItHost();
assert(fallback.websiteUrl === JUST_PUTZIT_LIVE, "Just Putz It fallback website");
assert(fallback.adminUrl === JUST_PUTZIT_ADMIN, "Just Putz It fallback admin");
assert(
  findJustPutzItProject([connectProject])?.id === JUST_PUTZIT_CONNECT_SEED_ID,
  "findJustPutzItProject matches the connect Seed",
);
assert(
  findJustPutzItProject([buildProject]) === null,
  "a Cinch-hosted pizza Seed is not Just Putz It",
);

if (process.exitCode) {
  console.error("script-management asserts failed");
} else {
  console.log("script-management asserts passed");
}
