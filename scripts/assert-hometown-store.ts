/**
 * Guard: Hometown Runner has one store shell the native app can open.
 * Run: npx tsx scripts/assert-hometown-store.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";
import {
  HOMETOWN_APP_ID,
  HOMETOWN_APP_NAME,
  HOMETOWN_PRIVACY_URL,
  HOMETOWN_STORE_PATH,
  HOMETOWN_STORE_URL,
  HOMETOWN_SUPPORT_URL,
} from "../src/lib/hometown-store";
import { isHometownRunnerHost, proxy } from "../src/proxy";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const capacitor = read("apps/hometown-runner/capacitor.config.ts");
const home = read("src/app/hometown/page.tsx");
const privacy = read("src/app/hometown/privacy/page.tsx");
const account = read("src/app/hometown/account/page.tsx");
const actions = read("src/app/hometown/actions.ts");

assert(HOMETOWN_APP_ID === "com.hometownrunner.app", "bundle id");
assert(HOMETOWN_APP_NAME === "Hometown Runner", "app name");
assert(HOMETOWN_STORE_PATH === "/hometown", "start path");
assert(
  HOMETOWN_STORE_URL === "https://www.cinchseed.com/hometown",
  "store URL",
);
assert(
  HOMETOWN_PRIVACY_URL === "https://www.cinchseed.com/hometown/privacy",
  "privacy URL",
);
assert(HOMETOWN_SUPPORT_URL === HOMETOWN_STORE_URL, "support URL is the app");
assert(capacitor.includes(`appId: "${HOMETOWN_APP_ID}"`), "capacitor app id");
assert(
  capacitor.includes(`url: "${HOMETOWN_STORE_URL}"`),
  "capacitor opens the store URL",
);
assert(home.includes("Open a market"), "launcher can open a town");
assert(home.includes("HOMETOWN_PUBLIC_WELCOME"), "launcher sounds like the town");
assert(
  !/HOMETOWN_DRIVER_PAY_PROMISE|HOMETOWN_KITCHEN_LINE|MERCHANT_DENSITY|Market code|\bSeed\b|5%|\$4\.50/.test(
    home,
  ),
  "public launcher does not teach pay, density, or Seed jargon",
);
assert(home.includes("HOMETOWN_PRIVACY_PATH"), "launcher links privacy");
assert(home.includes("HOMETOWN_ACCOUNT_PATH"), "launcher links account deletion");
assert(privacy.includes("session cookie"), "privacy describes the login cookie");
assert(
  privacy.includes("does not collect continuous GPS"),
  "privacy does not claim background location",
);
assert(privacy.includes("HOMETOWN_ACCOUNT_PATH"), "privacy links deletion");
assert(account.includes("Delete login on this device"), "deletion screen");
assert(
  actions.includes("clearHometownRoleSession"),
  "deletion clears the role session",
);
assert(
  actions.includes("/site/${project.id}/shop"),
  "guest orders open the diner desk",
);
assert(isHometownRunnerHost("hometownrunner.com"), "apex host");
assert(isHometownRunnerHost("www.hometownrunner.com:443"), "www host");
assert(!isHometownRunnerHost("cinchseed.com"), "cinch host is not hometown");

function proxyFor(url: string, host: string) {
  return proxy(new NextRequest(url, { headers: { host } }));
}

const apex = proxyFor("https://hometownrunner.com/", "hometownrunner.com");
assert(apex.headers.get("x-middleware-rewrite")?.endsWith("/hometown") === true, "apex rewrites to /hometown");
const privacyRewrite = proxyFor(
  "https://www.hometownrunner.com/privacy",
  "www.hometownrunner.com",
);
assert(
  privacyRewrite.headers.get("x-middleware-rewrite")?.endsWith("/hometown/privacy") === true,
  "privacy rewrites under /hometown",
);
const prefixed = proxyFor(
  "https://hometownrunner.com/hometown/account",
  "hometownrunner.com",
);
assert(prefixed.status === 308, "prefixed hometown path redirects");
assert(
  prefixed.headers.get("location")?.endsWith("/account") === true,
  "prefixed account path becomes /account",
);
const shop = proxyFor(
  "https://hometownrunner.com/site/town/shop",
  "hometownrunner.com",
);
assert(shop.headers.get("x-middleware-rewrite") == null, "market shop stays /site");
assert(shop.headers.get("location") == null, "market shop is not redirected");
const cinch = proxyFor("https://www.cinchseed.com/", "www.cinchseed.com");
assert(cinch.headers.get("x-middleware-rewrite") == null, "cinch home is not rewritten");
assert(cinch.status !== 308, "cinch home is not redirected");

if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log("assert:hometown-store passed");
