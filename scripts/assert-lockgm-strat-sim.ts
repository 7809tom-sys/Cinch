/**
 * Guard: LockGM Strat-inspired sim foundation.
 * Run: npm run assert:lockgm-strat-sim
 */
import {
  BREWERS_1985,
  CLASSIC_TEAMS,
  REDS_1975,
  YANKEES_1927,
  classicTeamById,
  countOutsRecorded,
  simulateGame,
  simulateSeries,
} from "../src/lib/lockgm/strat-sim";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(CLASSIC_TEAMS.length >= 3, "at least 3 classic team packs");
assert(!!classicTeamById("brewers-1985"), "1985 Brewers pack loads");
assert(!!classicTeamById("yankees-1927"), "1927 Yankees pack loads");
assert(!!classicTeamById("reds-1975"), "1975 Reds pack loads");

for (const team of CLASSIC_TEAMS) {
  assert(team.lineup.length === 9, `${team.id} has 9-man lineup`);
  assert(team.rotation.length >= 3, `${team.id} has rotation`);
  assert(team.bullpen.length >= 2, `${team.id} has bullpen`);
  const ids = new Set(team.players.map((p) => p.id));
  assert(
    team.lineup.every((id) => ids.has(id)),
    `${team.id} lineup players exist`,
  );
  assert(
    team.rotation.every((id) => ids.has(id)),
    `${team.id} rotation players exist`,
  );
  assert(
    team.players.filter((p) => p.batter).length >= 9,
    `${team.id} has batter ratings`,
  );
  assert(
    team.players.filter((p) => p.pitcher).length >= 5,
    `${team.id} has pitcher ratings`,
  );
}

assert(
  BREWERS_1985.players.some((p) => /Yount/i.test(p.name)),
  "Brewers pack includes Yount",
);
assert(
  YANKEES_1927.players.some((p) => /Ruth/i.test(p.name)),
  "Yankees pack includes Ruth",
);
assert(
  REDS_1975.players.some((p) => /Bench/i.test(p.name)),
  "Reds pack includes Bench",
);

const seed = 424242;
const game = simulateGame(BREWERS_1985, YANKEES_1927, { seed });

assert(typeof game.summary === "string" && game.summary.length > 0, "summary");
assert(game.seed === seed, "seed echoed");
assert(game.plays.length > 40, "play log has many PA");
assert(game.away.batters.length === 9, "away batter lines");
assert(game.home.batters.length === 9, "home batter lines");
assert(game.away.pitchers.length >= 1, "away pitchers logged");
assert(game.home.pitchers.length >= 1, "home pitchers logged");
assert(game.away.runs >= 0 && game.home.runs >= 0, "non-negative runs");
assert(
  game.away.hits === game.away.batters.reduce((s, b) => s + b.h, 0),
  "away hits match batter totals",
);
assert(
  game.home.hits === game.home.batters.reduce((s, b) => s + b.h, 0),
  "home hits match batter totals",
);

const awayOuts = countOutsRecorded(game.away);
const homeOuts = countOutsRecorded(game.home);
assert(awayOuts % 3 === 0 || game.winner === "home", "away outs clean or walk-off");
assert(homeOuts % 3 === 0 || game.winner === "away", "home outs clean or skip/walk-off nuance");

// In a full 9-inning game with both halves completed and no walk-off mid-inning,
// each staff records 27 outs. Find a seed that behaves that way, or validate structure.
let foundFullNine = false;
for (let s = 1000; s < 1300; s++) {
  const g = simulateGame(BREWERS_1985, REDS_1975, { seed: s });
  const aOut = countOutsRecorded(g.away);
  const hOut = countOutsRecorded(g.home);
  if (
    g.innings === 9 &&
    g.away.lineScore.length === 9 &&
    g.home.lineScore.length === 9 &&
    aOut === 27 &&
    hOut === 27
  ) {
    foundFullNine = true;
    assert(true, `full 9-inning 27-out game at seed ${s}`);
    // Reproducibility
    const g2 = simulateGame(BREWERS_1985, REDS_1975, { seed: s });
    assert(
      g2.summary === g.summary &&
        g2.away.runs === g.away.runs &&
        g2.home.runs === g.home.runs &&
        g2.plays.length === g.plays.length,
      "same seed reproduces box score",
    );
    break;
  }
}
assert(foundFullNine, "found a regulation 9-inning game with 27 outs/side");

// Extras or early end should still produce a decisive or tied winner field
const long = simulateGame(YANKEES_1927, REDS_1975, {
  seed: 7,
  maxInnings: 18,
});
assert(
  long.winner === "away" || long.winner === "home" || long.winner === "tie",
  "winner field valid",
);
assert(long.innings >= 9, "at least regulation length attempted");

const series = simulateSeries(BREWERS_1985, REDS_1975, 99, 10);
assert(series.results.length === 10, "sim 10 returns 10 games");
assert(
  series.awayWins + series.homeWins + series.ties === 10,
  "series tallies sum to 10",
);

if (process.exitCode) {
  console.error("assert:lockgm-strat-sim failed");
  process.exit(1);
}
console.log("assert:lockgm-strat-sim passed");
