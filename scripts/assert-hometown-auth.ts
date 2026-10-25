/**
 * Hometown sign-in must check a real password. A master email with no
 * password does not become master. A forged role cookie is rejected.
 */
import { randomBytes } from "crypto";
import { accountHasPassword } from "../src/lib/customers";
import {
  actorMayOperateDriver,
  hometownIdentityClaimed,
} from "../src/lib/hometown-kitchen-access";
import {
  authenticateHometownAdmin,
  authenticateHometownRole,
  clearHometownAuthFailures,
  HOMETOWN_AUTH_ERROR,
  HOMETOWN_AUTH_MAX_FAILURES,
  HOMETOWN_CODE_ERROR,
  HOMETOWN_LOCKED_ERROR,
  issueHometownSetPasswordCode,
  redeemHometownSetPasswordCode,
} from "../src/lib/hometown-auth";
import {
  decodeHometownRoleToken,
  encodeHometownRoleToken,
  hometownRoleCredentialStillValid,
  kitchenActorFromHometownSession,
  type HometownRoleSession,
} from "../src/lib/hometown-role";
import { masterIdentityVerified, masterPassword } from "../src/lib/master-auth";
import { PLATFORM_OWNER_EMAIL } from "../src/lib/access";
import { starterDeliveryOps } from "../src/lib/seed-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function email(label: string): string {
  return `${label}-${randomBytes(4).toString("hex")}@example.com`;
}

async function main() {
const projectId = "hometown-auth-test";
const password = "correct-horse-battery";
const ops = starterDeliveryOps("Hometown Runner");

const merchantEmail = email("merchant");
const created = await authenticateHometownRole({
  projectId,
  role: "merchant",
  email: merchantEmail,
  password,
  confirmPassword: password,
  mode: "sign-up",
  ops,
});
assert(created.ok, "a new merchant sets a password");
if (!created.ok) throw new Error("unreachable");
assert(created.session.scope === "owner", "a merchant password is owner scope");
assert(created.session.role === "merchant", "the role stays merchant");

const wrong = await authenticateHometownRole({
  projectId,
  role: "merchant",
  email: merchantEmail,
  password: "not-the-password",
  mode: "sign-in",
  ops,
});
assert(!wrong.ok, "a wrong merchant password is rejected");
if (wrong.ok) throw new Error("unreachable");
assert(wrong.error === HOMETOWN_AUTH_ERROR, "the wrong-password error is generic");
assert(
  !/no account|wrong password|sign up|not found/i.test(wrong.error),
  "the error does not say whether the account exists",
);
await clearHometownAuthFailures(merchantEmail);

const again = await authenticateHometownRole({
  projectId,
  role: "merchant",
  email: merchantEmail,
  password,
  mode: "sign-in",
  ops,
});
assert(again.ok && again.session.scope === "owner", "the right merchant password signs in");

const driverEmail = email("driver");
const driver = await authenticateHometownRole({
  projectId,
  role: "driver",
  email: driverEmail,
  password,
  confirmPassword: password,
  mode: "sign-up",
  ops,
});
assert(
  driver.ok && driver.session.scope === "driver" && driver.session.role === "driver",
  "a new driver password signs in as that driver",
);

const adminWrong = await authenticateHometownAdmin(
  PLATFORM_OWNER_EMAIL,
  "not-the-admin-password",
);
assert(!adminWrong.ok, "admin rejects a wrong password");
if (adminWrong.ok) throw new Error("unreachable");
assert(!("scope" in adminWrong), "a failed admin sign-in has no scope");
assert(adminWrong.error === HOMETOWN_AUTH_ERROR, "admin failure is generic");
await clearHometownAuthFailures(PLATFORM_OWNER_EMAIL);

const admin = await authenticateHometownAdmin(
  PLATFORM_OWNER_EMAIL,
  masterPassword(),
);
assert(
  admin.ok && admin.scope === "master" && admin.email === PLATFORM_OWNER_EMAIL,
  "the admin password grants master scope",
);

assert(
  masterIdentityVerified({ email: PLATFORM_OWNER_EMAIL }) === false,
  "a master email with no password is not a verified master",
);
const unverifiedMaster = kitchenActorFromHometownSession({
  role: "merchant",
  email: PLATFORM_OWNER_EMAIL,
  scope: "owner",
});
assert(
  unverifiedMaster?.scope === "owner",
  "a master email without verified master scope stays an owner",
);

const hometownMaster = await authenticateHometownRole({
  projectId,
  role: "merchant",
  email: PLATFORM_OWNER_EMAIL,
  password: "still-not-the-password",
  mode: "sign-in",
  ops,
});
assert(!hometownMaster.ok, "hometown sign-in does not accept a master email without the password");
await clearHometownAuthFailures(PLATFORM_OWNER_EMAIL);

const legacyEmail = email("legacy-kitchen");
const legacyOps = starterDeliveryOps("Hometown Runner");
legacyOps.restaurants[0]!.ownerEmail = legacyEmail;
assert(
  hometownIdentityClaimed(legacyOps, legacyEmail),
  "an existing kitchen email is already claimed",
);
const legacySignup = await authenticateHometownRole({
  projectId,
  role: "merchant",
  email: legacyEmail,
  password,
  confirmPassword: password,
  mode: "sign-up",
  ops: legacyOps,
});
assert(!legacySignup.ok, "a claimed kitchen cannot set a password from the public form");
assert(!(await accountHasPassword(legacyEmail)), "the claimed email still has no password");
await clearHometownAuthFailures(legacyEmail);

const issued = await issueHometownSetPasswordCode(legacyEmail);
assert(issued.ok, "admin can issue a set-password code");
if (!issued.ok) throw new Error("unreachable");
const redeemed = await redeemHometownSetPasswordCode({
  email: legacyEmail,
  code: issued.code,
  password,
  confirmPassword: password,
});
assert(redeemed.ok, "the code sets the first password");
const legacySignIn = await authenticateHometownRole({
  projectId,
  role: "merchant",
  email: legacyEmail,
  password,
  mode: "sign-in",
  ops: legacyOps,
});
assert(
  legacySignIn.ok && legacySignIn.session.scope === "owner",
  "after the code, the password signs the kitchen in",
);
const reused = await redeemHometownSetPasswordCode({
  email: legacyEmail,
  code: issued.code,
  password: "another-password-value",
  confirmPassword: "another-password-value",
});
assert(!reused.ok && reused.error === HOMETOWN_CODE_ERROR, "a set-password code works once");
await clearHometownAuthFailures(legacyEmail);

if (!created.ok) throw new Error("unreachable");
const token = encodeHometownRoleToken(created.session);
const decoded = decodeHometownRoleToken(token, projectId);
assert(
  decoded?.email === merchantEmail && decoded.scope === "owner",
  "a signed role cookie round-trips",
);
assert(
  decodeHometownRoleToken(
    JSON.stringify({
      role: "merchant",
      email: PLATFORM_OWNER_EMAIL,
      projectId,
      scope: "master",
    }),
    projectId,
  ) === null,
  "an unsigned role cookie is rejected",
);

const dot = token.lastIndexOf(".");
const payload = token.slice(0, dot);
const sig = token.slice(dot + 1);
const edited = JSON.parse(
  Buffer.from(payload, "base64url").toString("utf8"),
) as HometownRoleSession & { exp: number };
edited.email = PLATFORM_OWNER_EMAIL;
edited.scope = "master";
const tampered =
  Buffer.from(JSON.stringify(edited)).toString("base64url") + "." + sig;
assert(
  decodeHometownRoleToken(tampered, projectId) === null,
  "an edited role cookie is rejected",
);
const flipped = `${payload}.${sig.slice(0, -1)}${sig.endsWith("a") ? "b" : "a"}`;
assert(
  decodeHometownRoleToken(flipped, projectId) === null,
  "a cookie with a bad signature is rejected",
);

const previousSecret = process.env.AUTH_SECRET;
process.env.AUTH_SECRET = "hometown-auth-test-other-secret";
assert(
  decodeHometownRoleToken(token, projectId) === null,
  "a cookie signed with another secret is rejected",
);
if (previousSecret === undefined) delete process.env.AUTH_SECRET;
else process.env.AUTH_SECRET = previousSecret;

assert(
  (await hometownRoleCredentialStillValid({
    ...created.session,
    passwordTag: "not-the-tag",
  })) === false,
  "a cookie from before a password change is rejected",
);
assert(
  await hometownRoleCredentialStillValid(created.session),
  "the current password still matches its cookie",
);

const lockEmail = email("lock");
const lockSignup = await authenticateHometownRole({
  projectId,
  role: "customer",
  email: lockEmail,
  password,
  confirmPassword: password,
  mode: "sign-up",
  ops,
});
assert(lockSignup.ok, "lockout test account exists");
for (let i = 0; i < HOMETOWN_AUTH_MAX_FAILURES; i += 1) {
  const failed = await authenticateHometownRole({
    projectId,
    role: "customer",
    email: lockEmail,
    password: "wrong-password-attempt",
    mode: "sign-in",
    ops,
  });
  assert(!failed.ok, "repeated wrong passwords fail");
}
const locked = await authenticateHometownRole({
  projectId,
  role: "customer",
  email: lockEmail,
  password,
  mode: "sign-in",
  ops,
});
assert(
  !locked.ok && locked.error === HOMETOWN_LOCKED_ERROR,
  "too many failures lock the email",
);
await clearHometownAuthFailures(lockEmail);
const unlocked = await authenticateHometownRole({
  projectId,
  role: "customer",
  email: lockEmail,
  password,
  mode: "sign-in",
  ops,
});
assert(unlocked.ok, "clearing the lock lets the right password in");

const maya = ops.drivers[0]!;
assert(
  actorMayOperateDriver(
    { email: driverEmail, scope: "driver" },
    ops,
    maya.id,
  ) === false,
  "a driver cannot scout or dash as another driver",
);
assert(
  actorMayOperateDriver(
    { email: PLATFORM_OWNER_EMAIL, scope: "master" },
    ops,
    maya.id,
  ),
  "a verified master can still operate a driver",
);

console.log("hometown auth ok");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
