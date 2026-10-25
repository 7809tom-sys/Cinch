/**
 * Driver sign-up and the driver portal share one document desk.
 * A new email gets a pending driver row. Seeded dispatch drivers stay.
 *
 * Run: npx tsx scripts/assert-driver-signup.ts
 */
import { readFileSync } from "fs";
import {
  driverForEmail,
  ensureSignedInDriver,
  signedInDriverId,
} from "../src/lib/hometown-driver-account";
import {
  driverCanDispatch,
  driverOnboardingComplete,
  starterDeliveryOps,
} from "../src/lib/seed-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const ops = starterDeliveryOps("Hometown Runner");
const before = ops.drivers.length;
const first = ensureSignedInDriver(ops, "  New.Driver@Town.test ");
assert(first.created && first.driver, "a new email opens a driver row");
assert(
  first.driver!.id === signedInDriverId("new.driver@town.test") &&
    first.driver!.email === "new.driver@town.test" &&
    first.driver!.status === "pending" &&
    first.driver!.licenseOk === false &&
    first.driver!.insuranceOk === false &&
    first.driver!.existingPlatformActive === false &&
    first.driver!.online === false &&
    !driverOnboardingComplete(first.driver!) &&
    !driverCanDispatch(first.driver!),
  "sign-up does not mark license, insurance, or platform activity",
);
assert(
  first.ops.drivers.length === before + 1 &&
    ops.drivers.every((row) => first.ops.drivers.some((next) => next.id === row.id)),
  "seeded drivers stay on the list",
);

const again = ensureSignedInDriver(first.ops, "new.driver@town.test");
assert(
  !again.created &&
    again.driver?.id === first.driver!.id &&
    again.ops.drivers.length === first.ops.drivers.length,
  "the same email reopens the same driver",
);

const named = ensureSignedInDriver(
  {
    ...ops,
    drivers: ops.drivers.map((row) =>
      row.id === "drv-maya" ? { ...row, email: "maya@town.test" } : row,
    ),
  },
  "maya@town.test",
);
assert(
  !named.created && named.driver?.id === "drv-maya",
  "an email already on a driver does not create a second row",
);
assert(
  ensureSignedInDriver(ops, "not-an-email").driver === null,
  "a value without an email does not become a driver",
);
assert(
  driverForEmail(ops, "new.driver@town.test") === null,
  "seeded drivers have no email until someone signs up with it",
);

const enter = readFileSync("src/app/site/[id]/enter/page.tsx", "utf8");
const enterAction = readFileSync("src/app/site/[id]/enter/actions.ts", "utf8");
const siteDrive = readFileSync("src/app/site/[id]/drive/page.tsx", "utf8");
const portalDrive = readFileSync("src/app/portal/[id]/drive/page.tsx", "utf8");
const portal = readFileSync("src/components/delivery/driver-portal.tsx", "utf8");
const desk = readFileSync("src/components/delivery/driver-documents.tsx", "utf8");
const session = readFileSync("src/lib/hometown-kitchen-session.ts", "utf8");
assert(
  enter.includes("DriverDocumentDesk") &&
    enterAction.includes("prepareDriverAccount") &&
    siteDrive.includes("HometownDriverPortal") &&
    siteDrive.includes("prepareDriverAccount") &&
    portalDrive.includes("HometownDriverPortal") &&
    portalDrive.includes("prepareDriverAccount") &&
    portal.includes("DriverDocumentDesk") &&
    desk.includes("export function DriverDocumentDesk"),
  "sign-up and both driver portals render the same document desk",
);
assert(
  (portal.match(/<DriverDocumentDesk/g) ?? []).length === 1 &&
    (desk.match(/export function DriverDocumentDesk/g) ?? []).length === 1,
  "the document desk is defined once and mounted once in the portal",
);
assert(
  session.includes("isMasterEmail(email)") &&
    session.includes("Opened a driver account"),
  "a non-master sign-up is saved, and the master does not get a new driver row",
);

console.log("driver signup packet assertions passed");
