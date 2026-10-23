/**
 * Guard: Hometown Runner has one store shell the native app can open.
 * Run: npx tsx scripts/assert-hometown-store.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  HOMETOWN_APP_ID,
  HOMETOWN_APP_NAME,
  HOMETOWN_PRIVACY_URL,
  HOMETOWN_STORE_PATH,
  HOMETOWN_STORE_URL,
  HOMETOWN_SUPPORT_URL,
} from "../src/lib/hometown-store";

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

if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log("assert:hometown-store passed");
