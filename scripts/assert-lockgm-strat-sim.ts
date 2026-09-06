/**
 * Guard: LockGM Classic Matchup foundation.
 * Run: npm run assert:lockgm-strat-sim
 */
import {
  BREWERS_1985,
  CLASSIC_TEAMS,
  DEFAULT_SALARY_CAP,
  REDS_1975,
  ROSTER_SIZE,
  YANKEES_1927,
  aiSetLineup,
  applyManagerCard,
  attemptSignFreeAgent,
  checkSalaryCap,
  claimTeam,
  classicTeamById,
  countOutsRecorded,
  createClassicLeague,
  makeCapBusterFreeAgent,
  simulateGame,
  simulateLeagueRound,
  simulateSeries,
  teamPayroll,
  tryAddPlayer,
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
  assert(team.players.length === ROSTER_SIZE, `${team.id} is 30-man`);
  assert(team.lineup.length === 9, `${team.id} has 9-man lineup`);
  assert(team.rotation.length >= 3, `${team.id} has rotation`);
  assert(team.bullpen.length >= 2, `${team.id} has bullpen`);
  assert(team.salaryCap === DEFAULT_SALARY_CAP || team.salaryCap > 0, `${team.id} has hard cap`);
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
    team.players.every((p) => typeof p.salary === "number" && p.salary > 0),
    `${team.id} binding salaries present`,
  );
  const cap = checkSalaryCap(team);
  assert(cap.ok, `${team.id} under hard cap ($${cap.payroll}M / $${cap.cap}M)`);
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

// Hard cap blocks overspend
const buster = makeCapBusterFreeAgent();
const blocked = tryAddPlayer(BREWERS_1985, buster);
assert(!blocked.ok, "hard cap blocks $45M free agent on Brewers");
assert(/overspend|cap|Blocked/i.test(blocked.message), "block message mentions cap");

const seed = 424242;
const game = simulateGame(BREWERS_1985, YANKEES_1927, { seed });

assert(typeof game.summary === "string" && game.summary.length > 0, "summary");
assert(game.seed === seed, "seed echoed");
assert(game.plays.length > 40, "play log has many PA");
assert(
  game.plays.every((p) => typeof p.radioCall === "string" && p.radioCall.length > 10),
  "radio calls on every play",
);
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

// Platoon / defense: AI card should still sim cleanly
const aiCard = aiSetLineup(REDS_1975);
const aiReds = applyManagerCard(REDS_1975, aiCard);
const gAi = simulateGame(BREWERS_1985, aiReds, { seed: 55 });
assert(gAi.plays.length > 30, "AI-managed lineup produces a full game");

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

// League claim + AI + cap buster
let league = createClassicLeague(3);
assert(league.slots.length === 3, "league has 3 classic clubs");
assert(league.rosterSize === 30, "league uses 30-man structure");
const claimed = claimTeam(league, "brewers-1985");
assert(claimed.ok, "human can claim Brewers");
league = claimed.league;
assert(league.humanTeamId === "brewers-1985", "human team recorded");
assert(
  league.slots.filter((s) => s.claimedBy === "ai").length === 2,
  "empty clubs become AI managers",
);
const signed = attemptSignFreeAgent(league, buster);
assert(!signed.ok, "league signing blocked by hard cap");
assert(/overspend|cap|Blocked/i.test(signed.message), "league block cites salary cap");
league = simulateLeagueRound(signed.league, 11);
assert(
  league.slots.some((s) => s.wins + s.losses + s.ties > 0),
  "league round updates standings",
);
assert(teamPayroll(BREWERS_1985) > 0, "payroll helper works");

// Trademark-safety smoke: user-facing strings in this module surface should not say Strat-O-Matic
const brandBlob = JSON.stringify({
  a: BREWERS_1985.blurb,
  b: YANKEES_1927.blurb,
  c: REDS_1975.blurb,
});
assert(!/Strat-O-Matic/i.test(brandBlob), "classic blurbs avoid Strat-O-Matic");

if (process.exitCode) {
  console.error("assert:lockgm-strat-sim failed");
  process.exit(1);
}
console.log("assert:lockgm-strat-sim passed");
