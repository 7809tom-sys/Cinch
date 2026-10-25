/**
 * A diner invite opens the diner's mail app addressed to the restaurant.
 *
 * Run: npx tsx scripts/assert-restaurant-invite.ts
 */
import { readFileSync } from "fs";
import {
  restaurantInviteMailto,
  restaurantInviteSignupUrl,
  suggestPublicContactEmail,
  withInviteJoined,
  type RestaurantInvite,
} from "../src/lib/restaurant-invite";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const signup = restaurantInviteSignupUrl({
  projectId: "hometown-home",
  inviteId: "inv-abc",
});
assert(
  signup ===
    "https://hometownrunner.com/site/hometown-home/enter?role=merchant&src=diner-invite&r=inv-abc",
  "the kitchen sign-up link carries the invite id",
);

const mailto = restaurantInviteMailto({
  dinerName: "Ada Lovelace",
  restaurantName: "Pilot & Pie",
  restaurantEmail: "owner@pilot.test",
  signupUrl: signup,
});
assert(mailto.startsWith("mailto:owner@pilot.test?"), "the message is addressed to the restaurant");
assert(!mailto.startsWith("mailto:?"), "the message is not an email to a friend");
const params = new URLSearchParams(mailto.slice(mailto.indexOf("?") + 1));
assert(
  params.get("subject") ===
    "Your customer Ada Lovelace wants to order from you on Hometown Runner",
  "the subject names the diner",
);
const body = params.get("body") ?? "";
assert(
  body ===
    `Hi Pilot & Pie, your favorite customer Ada would like to use Hometown Runner to order from you. Sign up free: ${signup}`,
  "the body greets the restaurant and includes the sign-up link",
);
assert(
  mailto.includes(encodeURIComponent("Pilot & Pie")) &&
    mailto.includes(encodeURIComponent(signup)),
  "the subject and body are URL-encoded",
);

const html = `
  <a href="mailto:owner@cafe.test">Email</a>
  <img src="logo@2x.png" />
  noreply@cafe.test
`;
assert(
  suggestPublicContactEmail(html) === "owner@cafe.test" &&
    suggestPublicContactEmail("<p>No address here</p>") === null,
  "a public contact email is suggested only when the page has one",
);

const invite: RestaurantInvite = {
  id: "inv-abc",
  dinerEmail: "ada@town.test",
  dinerName: "Ada Lovelace",
  restaurantName: "Pilot & Pie",
  restaurantEmail: "owner@pilot.test",
  createdAt: "2026-10-25T00:00:00.000Z",
};
const joined = withInviteJoined([invite], "inv-abc", "rest-owner-1", new Date("2026-10-25T12:00:00.000Z"));
assert(
  joined[0]?.joinedRestaurantId === "rest-owner-1" &&
    withInviteJoined(joined, "inv-abc", "rest-other")[0]?.joinedRestaurantId === "rest-owner-1",
  "a later sign-up is recorded once",
);

const form = readFileSync("src/components/delivery/restaurant-invite-form.tsx", "utf8");
const admin = readFileSync("src/app/site/[id]/admin/page.tsx", "utf8");
const shop = readFileSync("src/app/site/[id]/shop/page.tsx", "utf8");
const account = readFileSync("src/app/hometown/account/page.tsx", "utf8");
assert(
  form.includes("Invite my favorite restaurant") &&
    form.includes("result.mailto") &&
    !form.includes("mailto:?") &&
    shop.includes("RestaurantInviteForm") &&
    shop.includes('query.invite === "1"') &&
    account.includes("RestaurantInviteForm") &&
    admin.includes("Restaurant invites"),
  "sign-up, the account page, and master admin share the restaurant invite",
);

console.log("restaurant invite assertions passed");
