/**
 * Scout work stays inside driver sign-in. There is no scout account,
 * login, or route.
 *
 * Run: npx tsx scripts/assert-driver-scout.ts
 */
import { existsSync, readFileSync } from "fs";
import { HOMETOWN_ROLES } from "../src/lib/hometown-role";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(
  HOMETOWN_ROLES.length === 3 &&
    HOMETOWN_ROLES.includes("customer") &&
    HOMETOWN_ROLES.includes("merchant") &&
    HOMETOWN_ROLES.includes("driver") &&
    !(HOMETOWN_ROLES as readonly string[]).includes("scout"),
  "sign-in roles stay customer, merchant, and driver",
);

const login = readFileSync("src/components/delivery/role-login.tsx", "utf8");
const portal = readFileSync("src/components/delivery/driver-portal.tsx", "utf8");
assert(
  login.includes('["customer", "merchant", "driver"]') &&
    !login.includes("scout"),
  "the role cards do not add a scout login",
);
assert(
  portal.includes('data-work-mode="driver"') &&
    portal.includes('data-work-mode="scout"') &&
    portal.includes('useState<"driver" | "scout">("driver")') &&
    portal.includes("Scout residual") &&
    portal.includes("Sign as scout") &&
    portal.includes("ScoutPaperMenuDesk") &&
    portal.includes('workMode === "driver"'),
  "the driver portal toggles into the existing scout desk",
);
assert(
  !existsSync("src/app/site/[id]/scout/page.tsx") &&
    !existsSync("src/app/portal/[id]/scout/page.tsx") &&
    !portal.includes("/scout"),
  "there is no separate scout route",
);

console.log("driver scout toggle assertions passed");
