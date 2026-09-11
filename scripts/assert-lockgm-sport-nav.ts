/**
 * Guard: LockedGM is organized by sport — hubs, scoped nav, no mixed desks.
 * Run: npm run assert:lockgm-sport-nav
 */
import { SPORTS, isSportId } from "../src/lib/lockgm/sports";
import {
  ACCOUNT_NAV,
  BASEBALL_DESKS,
  FOOTBALL_DESKS,
  SHARED_DESKS,
  SPORT_HUBS,
  desksForSport,
  deskFromPath,
  isDeskForSport,
  sportHubPath,
  sportIdFromPath,
  sportSwitcherHref,
} from "../src/lib/lockgm/sport-nav";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(SPORTS.length === 8, "eight sports ship in the directory");
assert(
  SPORTS.every((sport) => isSportId(sport.id) && SPORT_HUBS[sport.id]),
  "every sport has hub copy",
);
assert(
  SPORTS.every((sport) => sportHubPath(sport.id) === `/lockgm/${sport.id}`),
  "every sport has a /lockgm/{id} hub path",
);

for (const sport of SPORTS) {
  const desks = desksForSport(sport.id);
  assert(
    SHARED_DESKS.every((desk) => desks.some((item) => item.id === desk.id)),
    `${sport.id} includes the shared GM desks`,
  );
}

assert(
  BASEBALL_DESKS.every((desk) => isDeskForSport("baseball", desk.id)),
  "baseball exposes league, sim, live, and ratings",
);
assert(
  !isDeskForSport("basketball", "sim") &&
    !isDeskForSport("football", "league") &&
    !isDeskForSport("soccer", "ratings"),
  "baseball-only desks stay off other sports",
);
assert(
  isDeskForSport("football", "fantasy-football") &&
    !isDeskForSport("baseball", "fantasy-football"),
  "fantasy pulse lives on football only",
);
assert(
  FOOTBALL_DESKS.some((desk) => desk.id === "fantasy-football"),
  "football extra desk is fantasy pulse",
);

assert(sportIdFromPath("/lockgm/baseball") === "baseball", "hub path maps sport");
assert(sportIdFromPath("/lockgm/scouting") === null, "desk path is not a sport");
assert(deskFromPath("/lockgm/scouting") === "scouting", "desk path maps desk");
assert(deskFromPath("/lockgm/live/abc") === "live", "nested live stays live");
assert(deskFromPath("/lockgm/baseball") === null, "hub path is not a desk");

assert(
  sportSwitcherHref("football", "/lockgm/scouting") ===
    "/lockgm/scouting?sport=football",
  "shared desk keeps you on the desk when switching sports",
);
assert(
  sportSwitcherHref("basketball", "/lockgm/sim") === "/lockgm/basketball",
  "leaving a baseball-only desk opens the new sport hub",
);
assert(
  sportSwitcherHref("baseball", "/lockgm") === "/lockgm/baseball",
  "home chips go to the sport hub",
);

assert(
  !ACCOUNT_NAV.some((item) =>
    desksForSport("baseball").some((desk) => desk.href === item.href),
  ),
  "account links are not mixed into the baseball desk list",
);
assert(
  !SPORTS.some((sport) => /LockGM/.test(SPORT_HUBS[sport.id].tagline)),
  "hub copy uses LockedGM brand, not LockGM",
);
assert(
  sportSwitcherHref("soccer", "/lockgm/") === "/lockgm/soccer",
  "all-sports home still routes chips to a hub",
);

if (process.exitCode) {
  console.error("\nLockedGM sport-nav guards failed.");
  process.exit(process.exitCode);
}

console.log("\nAll LockedGM sport-nav guards passed.");
