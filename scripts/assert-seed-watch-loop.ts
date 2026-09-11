/**
 * Guard: Seed watch must stop looking for an AI instead of restaffing forever.
 * Run: npx tsx scripts/assert-seed-watch-loop.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { ADMIN_PROVIDER_KEYS_HREF } from "../src/lib/provider-keys";
import {
  WATCH_IDLE_LINE,
  WATCH_NO_AI_LINE,
  projectHasOpenWork,
  projectWorkComplete,
} from "../src/lib/project-manager";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(
  /Stopped looking for an AI/.test(WATCH_IDLE_LINE),
  "idle line stops the AI hunt",
);
assert(
  /Stopped looking for an AI/.test(WATCH_NO_AI_LINE),
  "blocked line stops the AI hunt",
);

assert(
  !projectHasOpenWork({ tasks: [] }),
  "an empty board has no open AI work",
);
assert(
  !projectHasOpenWork({
    tasks: [{ status: "done" }],
  }),
  "done-only tasks are not open work",
);
assert(
  projectHasOpenWork({
    tasks: [{ status: "queued" }],
  }),
  "queued work is open",
);
assert(
  !projectWorkComplete({
    tasks: [],
  }),
  "empty board is not complete — it is idle",
);

const ticker = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/watch-ticker.tsx"),
  "utf8",
);
assert(
  ticker.includes("if (stuck || idle || localComplete) return"),
  "portal ticker stops when idle, stuck, or complete",
);
assert(
  !ticker.includes("setStuck(false);\n              refreshNow"),
  "Refresh status does not clear stuck and restart the hunt",
);
assert(
  ticker.includes("will not keep looking for an AI"),
  "portal explains the hunt stopped",
);
assert(
  ADMIN_PROVIDER_KEYS_HREF === "/admin#agents",
  "provider keys href points at the admin agents section",
);
assert(
  ticker.includes("ADMIN_PROVIDER_KEYS_HREF") &&
    ticker.includes("Update API keys"),
  "portal stuck state links admin to API keys",
);

const admin = readFileSync(
  join(process.cwd(), "src/app/admin/(gated)/projects/[id]/project-controls.tsx"),
  "utf8",
);
assert(
  admin.includes("restaffedOnce"),
  "admin restaffs at most once on load",
);
assert(
  admin.includes("will not keep restocking") ||
    admin.includes("Stopped looking for an AI"),
  "admin copy stops the restock loop",
);
assert(
  admin.includes("ADMIN_PROVIDER_KEYS_HREF") &&
    admin.includes("Update API keys"),
  "admin stuck state links to provider API keys",
);

const portal = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/page.tsx"),
  "utf8",
);
assert(
  portal.includes("will not keep looking for an AI"),
  "empty Seed desk does not say Conductor is still staffing",
);

if (process.exitCode) {
  console.error("seed-watch-loop assertions failed");
} else {
  console.log("seed-watch-loop assertions passed");
}
