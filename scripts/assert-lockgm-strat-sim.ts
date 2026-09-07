/**
 * Guard: LockGM Classic Matchup foundation.
 * Run: npm run assert:lockgm-strat-sim
 */
import {
  ANGELS_1982,
  BLUE_JAYS_1985,
  BRAVES_1982,
  BREWERS_1982,
  BREWERS_1985,
  CARDINALS_1982,
  CARDINALS_1985,
  CLASSIC_TEAMS,
  DEFAULT_SALARY_CAP,
  DODGERS_1985,
  PLAYOFF_1982_TEAM_IDS,
  PLAYOFF_1982_TEAMS,
  PLAYOFF_1985_TEAM_IDS,
  PLAYOFF_1985_TEAMS,
  REDS_1975,
  ROSTER_SIZE,
  ROYALS_1985,
  YANKEES_1927,
  aiSetLineup,
  applyManagerCard,
  attemptSignFreeAgent,
  checkSalaryCap,
  claimTeam,
  classicTeamById,
  countOutsRecorded,
  createClassicLeague,
  defaultManagerCard,
  makeCapBusterFreeAgent,
  moveBullpenArm,
  playoffSeriesScoreLine,
  selectStartingPitcher,
  setStarterInningsTarget,
  simulateBestOf,
  simulateGame,
  simulateLeagueRound,
  simulatePlayoffs1982,
  simulatePlayoffs1985,
  simulateSeries,
  teamPayroll,
  tryAddPlayer,
  validatePitching,
  validateDefense,
  effectiveDefenseAt,
  eligibilityBadge,
  isEligibleAt,
  isOutOfPosition,
  OOP_DEFENSE_RATING,
  fieldersForPosition,
  countOutOfPosition,
} from "../src/lib/lockgm/strat-sim";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(CLASSIC_TEAMS.length >= 11, "at least 11 classic team packs");
assert(!!classicTeamById("brewers-1985"), "1985 Brewers pack loads");
assert(!!classicTeamById("yankees-1927"), "1927 Yankees pack loads");
assert(!!classicTeamById("reds-1975"), "1975 Reds pack loads");
assert(!!classicTeamById("blue-jays-1985"), "1985 Blue Jays pack loads");
assert(!!classicTeamById("royals-1985"), "1985 Royals pack loads");
assert(!!classicTeamById("cardinals-1985"), "1985 Cardinals pack loads");
assert(!!classicTeamById("dodgers-1985"), "1985 Dodgers pack loads");
assert(!!classicTeamById("brewers-1982"), "1982 Brewers pack loads");
assert(!!classicTeamById("angels-1982"), "1982 Angels pack loads");
assert(!!classicTeamById("cardinals-1982"), "1982 Cardinals pack loads");
assert(!!classicTeamById("braves-1982"), "1982 Braves pack loads");
assert(PLAYOFF_1985_TEAMS.length === 4, "1985 playoff field has 4 clubs");
assert(
  PLAYOFF_1985_TEAM_IDS.every((id) => !!classicTeamById(id)),
  "all 1985 playoff ids resolve",
);
assert(PLAYOFF_1982_TEAMS.length === 4, "1982 playoff field has 4 clubs");
assert(
  PLAYOFF_1982_TEAM_IDS.every((id) => !!classicTeamById(id)),
  "all 1982 playoff ids resolve",
);

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
assert(
  BLUE_JAYS_1985.players.some((p) => /Stieb/i.test(p.name)),
  "Blue Jays pack includes Stieb",
);
assert(
  ROYALS_1985.players.some((p) => /Brett/i.test(p.name)),
  "Royals pack includes Brett",
);
assert(
  CARDINALS_1985.players.some((p) => /Ozzie Smith/i.test(p.name)),
  "Cardinals pack includes Ozzie Smith",
);
assert(
  DODGERS_1985.players.some((p) => /Hershiser/i.test(p.name)),
  "Dodgers pack includes Hershiser",
);
assert(
  BREWERS_1982.players.some((p) => /Yount/i.test(p.name)),
  "1982 Brewers pack includes Yount",
);
assert(
  ANGELS_1982.players.some((p) => /Carew/i.test(p.name)),
  "1982 Angels pack includes Carew",
);
assert(
  CARDINALS_1982.players.some((p) => /Ozzie Smith/i.test(p.name)),
  "1982 Cardinals pack includes Ozzie Smith",
);
assert(
  BRAVES_1982.players.some((p) => /Murphy/i.test(p.name)),
  "1982 Braves pack includes Murphy",
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

// Starter selection changes seeded first pitcher
const brewCard = defaultManagerCard(BREWERS_1985);
const defaultStarterId = BREWERS_1985.rotation[0]!;
const altStarterId = BREWERS_1985.rotation[1]!;
assert(defaultStarterId !== altStarterId, "Brewers rotation has alternate SP");
const defaultStarterName = BREWERS_1985.players.find(
  (p) => p.id === defaultStarterId,
)!.name;
const altStarterName = BREWERS_1985.players.find(
  (p) => p.id === altStarterId,
)!.name;
const brewDefault = applyManagerCard(BREWERS_1985, brewCard);
const gSpDefault = simulateGame(REDS_1975, brewDefault, { seed: 4242 });
assert(
  gSpDefault.plays[0]?.pitcher === defaultStarterName,
  "default rotation[0] starts (home fielding in top 1)",
);
assert(
  gSpDefault.home.pitchers[0]?.playerId === defaultStarterId,
  "box starter id matches default rotation[0]",
);

const brewAltCard = selectStartingPitcher(brewCard, BREWERS_1985, altStarterId);
assert(brewAltCard.rotation?.[0] === altStarterId, "selectStartingPitcher promotes SP");
const brewAlt = applyManagerCard(BREWERS_1985, brewAltCard);
const gSpAlt = simulateGame(REDS_1975, brewAlt, { seed: 4242 });
assert(
  gSpAlt.home.pitchers[0]?.playerId === altStarterId,
  "alternate starter appears first in home pitching box",
);
assert(
  gSpAlt.plays[0]?.pitcher === altStarterName,
  "alternate starter faces first PA at same seed",
);
assert(
  gSpAlt.home.pitchers[0]?.playerId !== gSpDefault.home.pitchers[0]?.playerId,
  "starter selection changes seeded game pitching",
);

// Bullpen order is modeled — reversing entry order changes first reliever when plan hooks early
const shortPlan = setStarterInningsTarget(brewCard, 1);
const pen = [...(shortPlan.bullpen ?? BREWERS_1985.bullpen)];
assert(pen.length >= 2, "Brewers bullpen has 2+ arms for order test");
const firstPen = pen[0]!;
let reversed = shortPlan;
for (let i = 0; i < pen.length - 1; i++) {
  reversed = moveBullpenArm(reversed, BREWERS_1985, 0, pen.length - 1);
}
assert(
  reversed.bullpen?.[0] !== firstPen,
  "moveBullpenArm reorders pen away from original first call",
);
const gPenA = simulateGame(
  REDS_1975,
  applyManagerCard(BREWERS_1985, shortPlan),
  { seed: 777 },
);
const gPenB = simulateGame(
  REDS_1975,
  applyManagerCard(BREWERS_1985, reversed),
  { seed: 777 },
);
const relieverA = gPenA.home.pitchers[1]?.playerId;
const relieverB = gPenB.home.pitchers[1]?.playerId;
assert(
  !!relieverA && !!relieverB,
  "short IP plan brings a reliever into the box",
);
assert(
  relieverA === shortPlan.bullpen?.[0],
  "first-call bullpen arm is the first reliever after early hook",
);
assert(
  relieverB === reversed.bullpen?.[0],
  "reordered bullpen changes which arm enters first",
);
assert(relieverA !== relieverB, "bullpen order affects seeded relief appearance");

const pitchOk = validatePitching(
  BREWERS_1985,
  brewAltCard.rotation!,
  brewAltCard.bullpen!,
  brewAltCard.pitchingPlan,
);
assert(pitchOk.ok, "validatePitching accepts managed staff");

// --- Position eligibility + OOP defense penalties ---
const white = ROYALS_1985.players.find((p) => /Frank White/i.test(p.name))!;
const mcrae = ROYALS_1985.players.find((p) => /Hal McRae/i.test(p.name))!;
const brett = ROYALS_1985.players.find((p) => /George Brett/i.test(p.name))!;
assert(isEligibleAt(white, "2B"), "Frank White eligible at 2B");
assert(!isEligibleAt(white, "SS"), "Frank White not eligible at SS (no rating)");
assert(!isEligibleAt(mcrae, "LF"), "DH-only McRae not eligible in LF");
assert(eligibilityBadge(white) === "2B", "White eligibility badge is 2B");
assert(
  eligibilityBadge(brett) === "3B/1B",
  "Brett eligibility badge lists 3B/1B",
);
assert(
  effectiveDefenseAt(white, "2B") === white.batter!.defense,
  "eligible assignment keeps published defense",
);
assert(
  effectiveDefenseAt(white, "SS") === OOP_DEFENSE_RATING,
  "ineligible SS assignment collapses to OOP floor",
);
assert(
  isOutOfPosition(mcrae, "CF"),
  "McRae at CF is out-of-position",
);

const { eligible: eligible2b, ineligible: ineligible2b } = fieldersForPosition(
  ROYALS_1985,
  "2B",
);
assert(
  eligible2b.some((p) => p.id === white.id),
  "fieldersForPosition lists White as eligible 2B",
);
assert(
  !eligible2b.some((p) => p.id === mcrae.id),
  "McRae not in eligible 2B pool",
);
assert(
  ineligible2b.some((p) => p.id === mcrae.id),
  "McRae available only as OOP injury fill-in at 2B",
);

// Pack defaults should be fully eligible
for (const team of CLASSIC_TEAMS) {
  const oop = countOutOfPosition(team.players, team.defense);
  assert(oop === 0, `${team.id} default defense has zero OOP`);
  const defOk = validateDefense(team, team.defense);
  assert(defOk.ok && (defOk.oopCount ?? 0) === 0, `${team.id} defense validates clean`);
}

// Forced OOP card: McRae at SS — still sims, but glove dies (errors/hits rise)
const royalsCard = defaultManagerCard(ROYALS_1985);
const oopCard = {
  ...royalsCard,
  defense: { ...royalsCard.defense, SS: mcrae.id },
};
const oopVal = validateDefense(ROYALS_1985, oopCard.defense);
assert(oopVal.ok, "OOP injury fill-in is allowed (not hard-blocked)");
assert((oopVal.oopCount ?? 0) >= 1, "validateDefense reports OOP count");
assert(/OOP|injury/i.test(oopVal.message), "OOP warning message surfaced");

// Extreme injury card: unrated DH at every field spot — “scores real bad”
const allOopDefense = {
  C: mcrae.id,
  "1B": mcrae.id,
  "2B": mcrae.id,
  "3B": mcrae.id,
  SS: mcrae.id,
  LF: mcrae.id,
  CF: mcrae.id,
  RF: mcrae.id,
} as const;
assert(
  countOutOfPosition(ROYALS_1985.players, allOopDefense) === 8,
  "all-OOP card marks 8 ineligible assignments",
);

const cleanRoyals = applyManagerCard(ROYALS_1985, royalsCard);
const oopRoyals = applyManagerCard(ROYALS_1985, {
  ...royalsCard,
  defense: { ...allOopDefense },
});
const singleOopRoyals = applyManagerCard(ROYALS_1985, oopCard);
const seedOop = 19850901;
let cleanErrors = 0;
let oopErrors = 0;
let cleanRunsAllowed = 0;
let oopRunsAllowed = 0;
for (let s = seedOop; s < seedOop + 24; s++) {
  // Away bats vs home fielding — home is Royals gloves under test
  const gClean = simulateGame(BREWERS_1985, cleanRoyals, { seed: s });
  const gOop = simulateGame(BREWERS_1985, oopRoyals, { seed: s });
  cleanErrors += gClean.home.errors;
  oopErrors += gOop.home.errors;
  cleanRunsAllowed += gClean.away.runs;
  oopRunsAllowed += gOop.away.runs;
}
assert(
  oopErrors > cleanErrors,
  `OOP defense allows more errors (${oopErrors} > ${cleanErrors}) across seeded sample`,
);
assert(
  oopRunsAllowed > cleanRunsAllowed,
  `OOP defense allows more runs (${oopRunsAllowed} > ${cleanRunsAllowed}) — scores real bad`,
);
assert(
  simulateGame(BREWERS_1985, singleOopRoyals, { seed: seedOop }).plays.length >
    30,
  "single-spot OOP card still produces a full seeded game",
);

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

const alcs = simulateBestOf(BLUE_JAYS_1985, ROYALS_1985, 1985, 4);
assert(alcs.games.length >= 4 && alcs.games.length <= 7, "ALCS best-of-7 length");
assert(
  alcs.higherWins === 4 || alcs.lowerWins === 4 || alcs.championId === null,
  "best-of reaches 4 wins or unresolved ties",
);
assert(
  alcs.games[0]?.homeTeamId === BLUE_JAYS_1985.id,
  "higher seed hosts game 1 (2-3-2)",
);

const bracket = simulatePlayoffs1985(19851027);
assert(bracket.alcs.series.games.length >= 4, "bracket ALCS played");
assert(bracket.nlcs.series.games.length >= 4, "bracket NLCS played");
assert(!!bracket.worldSeries, "World Series scheduled after LCS");
assert(
  typeof playoffSeriesScoreLine(bracket.alcs) === "string" &&
    playoffSeriesScoreLine(bracket.alcs).includes("–"),
  "series score line formats",
);
const bracket2 = simulatePlayoffs1985(19851027);
assert(
  bracket.championId === bracket2.championId &&
    bracket.alcs.series.higherWins === bracket2.alcs.series.higherWins &&
    bracket.nlcs.series.lowerWins === bracket2.nlcs.series.lowerWins,
  "same seed reproduces 1985 playoff bracket",
);
assert(
  bracket.featuredGame != null &&
    bracket.featuredGame.plays.every((p) => p.radioCall.length > 10),
  "featured playoff game has radio calls",
);

const bracket82 = simulatePlayoffs1982(19821020);
assert(bracket82.year === 1982, "1982 bracket year tag");
assert(bracket82.alcs.series.games.length >= 4, "1982 bracket ALCS played");
assert(bracket82.nlcs.series.games.length >= 4, "1982 bracket NLCS played");
assert(!!bracket82.worldSeries, "1982 World Series scheduled after LCS");
assert(
  bracket82.alcs.series.games[0]?.homeTeamId === BREWERS_1982.id,
  "1982 ALCS higher seed Brewers host G1",
);
assert(
  bracket82.nlcs.series.games[0]?.homeTeamId === CARDINALS_1982.id,
  "1982 NLCS higher seed Cardinals host G1",
);
const bracket82b = simulatePlayoffs1982(19821020);
assert(
  bracket82.championId === bracket82b.championId &&
    bracket82.alcs.series.higherWins === bracket82b.alcs.series.higherWins &&
    bracket82.nlcs.series.lowerWins === bracket82b.nlcs.series.lowerWins,
  "same seed reproduces 1982 playoff bracket",
);
assert(
  bracket82.featuredGame != null &&
    bracket82.featuredGame.plays.every((p) => p.radioCall.length > 10),
  "1982 featured playoff game has radio calls",
);

// League claim + AI + cap buster
let league = createClassicLeague(3);
assert(
  league.slots.length === CLASSIC_TEAMS.length,
  `league has ${CLASSIC_TEAMS.length} classic clubs`,
);
assert(league.rosterSize === 30, "league uses 30-man structure");
const claimed = claimTeam(league, "brewers-1985");
assert(claimed.ok, "human can claim Brewers");
league = claimed.league;
assert(league.humanTeamId === "brewers-1985", "human team recorded");
assert(
  league.slots.filter((s) => s.claimedBy === "ai").length ===
    CLASSIC_TEAMS.length - 1,
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
  d: BLUE_JAYS_1985.blurb,
  e: ROYALS_1985.blurb,
  f: CARDINALS_1985.blurb,
  g: DODGERS_1985.blurb,
  h: BREWERS_1982.blurb,
  i: ANGELS_1982.blurb,
  j: CARDINALS_1982.blurb,
  k: BRAVES_1982.blurb,
});
assert(!/Strat-O-Matic/i.test(brandBlob), "classic blurbs avoid Strat-O-Matic");
assert(
  /LockedGM/.test(BREWERS_1982.blurb) && /LockedGM/.test(ANGELS_1982.blurb),
  "1982 packs use LockedGM brand in blurbs",
);
if (process.exitCode) {
  console.error("assert:lockgm-strat-sim failed");
  process.exit(1);
}
console.log("assert:lockgm-strat-sim passed");
