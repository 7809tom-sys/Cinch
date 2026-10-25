/**
 * A restaurant website pre-fills empty profile fields and never
 * replaces what the owner already typed.
 *
 * Run: npx tsx scripts/assert-hometown-restaurant-profile.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { blankOwnerKitchen } from "../src/lib/hometown-kitchen-access";
import {
  applyCrawledRestaurantProfile,
  parseRestaurantProfile,
} from "../src/lib/hometown-restaurant-profile";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const html = readFileSync(
  join(process.cwd(), "scripts/fixtures/restaurant-jsonld.html"),
  "utf8",
);
const profile = parseRestaurantProfile(
  html,
  "https://lakeside.example/",
);
assert(profile.name === "Lakeside Supper Club", "JSON-LD name");
assert(
  profile.address === "18 Lake Street, Pewaukee, WI, 53072",
  `address was ${profile.address}`,
);
assert(
  profile.phone === "(262) 555-0144",
  `phone was ${profile.phone}`,
);
assert(
  profile.hours?.includes("Mon 11:00–21:00") === true &&
    profile.hours.includes("Tue 11:00–21:00"),
  `hours were ${profile.hours}`,
);
assert(
  profile.headerImageUrl === "https://lakeside.example/images/dining-room.jpg",
  "the restaurant image is the header, not the logo",
);
assert(
  profile.logoUrl === "https://lakeside.example/images/logo.png",
  "the logo is kept separate from the header",
);
assert(profile.lat === 43.0806 && profile.lng === -88.2612, "geo is the location");

const kitchen = blankOwnerKitchen("owner@lakeside.test");
const filled = applyCrawledRestaurantProfile(
  kitchen,
  profile,
  { name: "", address: "", hours: "", phone: "" },
);
assert(
  filled.restaurant.name === "Lakeside Supper Club" &&
    filled.restaurant.address?.includes("18 Lake Street") === true &&
    filled.restaurant.hours?.includes("Mon 11:00") === true &&
    filled.restaurant.phone === "(262) 555-0144" &&
    filled.restaurant.lat === 43.0806 &&
    filled.filled.includes("name") &&
    filled.headerSourceUrl === profile.headerImageUrl &&
    (filled.restaurant.menu?.items.length ?? 1) === 0,
  "empty fields are filled and the menu stays empty",
);

const kept = applyCrawledRestaurantProfile(
  { ...kitchen, name: "My Typed Name", phone: "555-0100" },
  profile,
  { name: "My Typed Name", address: "", hours: "By appointment", phone: "555-0100" },
);
assert(
  kept.restaurant.name === "My Typed Name" &&
    kept.restaurant.phone === "555-0100" &&
    kept.restaurant.hours === "By appointment" &&
    kept.restaurant.address?.includes("18 Lake Street") === true &&
    kept.kept.includes("name") &&
    kept.kept.includes("hours") &&
    kept.filled.includes("address"),
  "typed name, phone, and hours stay; the empty address is filled",
);

const footerOnly = parseRestaurantProfile(
  `<html><head><title>Home</title></head><body><footer>Call (414) 555-0199</footer></body></html>`,
  "https://corner.example/",
);
assert(
  !footerOnly.name && footerOnly.phone === "(414) 555-0199",
  "a generic title is not a name, and a footer phone is kept",
);
assert(!footerOnly.hours && !footerOnly.address, "missing hours and address stay missing");

console.log("hometown restaurant profile ok");
