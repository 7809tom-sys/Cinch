/**
 * Guard: LockedGM Classic Matchup foundation.
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
  DEFAULT_MATCHUP_AWAY_ID,
  DEFAULT_MATCHUP_HOME_ID,
  DEFAULT_SALARY_CAP,
  MATCHUP_TEAMS,
  MLB_2026_TEAMS,
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
  simulateLeaguePlayoffs,
  simulateLeagueRound,
  simulatePlayoffs1982,
  simulatePlayoffs1985,
  simulateSeries,
  seriesRotation,
  rotationSizeForTeam,
  rotationSizeForYear,
  CLASSIC_ROTATION_SIZE,
  MODERN_ROTATION_SIZE,
  PLAYOFF_WINS_NEEDED,
  PLAYOFF_MAX_GAMES,
  boxHomeRuns,
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
  canEnter,
  pickBullpenArm,
  recordOutings,
  dropGradeTiers,
  emptyRestBook,
  findPinchHitRecommendation,
  startLiveGame,
  CLEAR_SPLIT_EDGE,
  PINCH_HIT_FROM_INNING,
  pitchesForPa,
  relieverOutingLimits,
  RELIEVER_MAX_OUTS,
  FIREMAN_THREE_IP_OUTS,
  createRng,
  MLB_SEASON_GAMES,
  buildMlb2026Schedule,
  simulateMlb2026Season,
  gamesPlayedByTeam,
  IL_STINTS_PER_162,
  injuryRoleFor,
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
assert(MLB_2026_TEAMS.length === 30, "all 30 MLB clubs for 2026");
assert(
  MATCHUP_TEAMS.length === MLB_2026_TEAMS.length + CLASSIC_TEAMS.length,
  "matchup list is 2026 plus classic",
);
assert(
  new Set(MLB_2026_TEAMS.map((t) => t.id)).size === 30,
  "2026 team ids are unique",
);
assert(
  classicTeamById(DEFAULT_MATCHUP_AWAY_ID)?.id === "yankees-2026",
  "default matchup away is 2026 Yankees",
);
assert(
  classicTeamById(DEFAULT_MATCHUP_HOME_ID)?.id === "dodgers-2026",
  "default matchup home is 2026 Dodgers",
);

for (const team of MLB_2026_TEAMS) {
  assert(team.year === 2026, `${team.id} is 2026`);
  assert(rotationSizeForTeam(team) === 5, `${team.id} five-man`);
  assert(seriesRotation(team).length === 5, `${team.id} series rotation is five`);
  assert(team.rotation.length >= 5, `${team.id} authored five SPs`);
  assert(team.players.length === ROSTER_SIZE, `${team.id} is 30-man`);
  assert(team.lineup.length === 9, `${team.id} has 9-man lineup`);
  const ids = new Set(team.players.map((p) => p.id));
  assert(
    team.lineup.every((id) => ids.has(id)),
    `${team.id} lineup players exist`,
  );
  assert(
    team.rotation.every((id) => ids.has(id)),
    `${team.id} rotation players exist`,
  );
  const cap = checkSalaryCap(team);
  assert(cap.ok, `${team.id} under hard cap ($${cap.payroll}M / $${cap.cap}M)`);
  assert(!!classicTeamById(team.id), `${team.id} lookup`);
}

const mets26 = classicTeamById("mets-2026")!;
assert(!!mets26, "Mets 2026 pack loads");
assert(
  !mets26.players.some((p) => /d[ií]az/i.test(p.name) && p.pitcher?.role === "RP"),
  "Mets 2026 do not still list Díaz in the pen",
);
const athletics26 = classicTeamById("athletics-2026")!;
assert(athletics26.city === "Sacramento", "2026 Athletics are Sacramento");
const nyy26 = classicTeamById("yankees-2026")!;
assert(
  nyy26.players.some((p) => p.id === "nyy26-aaron-judge"),
  "2026 Yankees include Judge",
);
const lad26 = classicTeamById("dodgers-2026")!;
const ohtani = lad26.players.find((p) => p.id === "lad26-shohei-ohtani");
assert(!!ohtani?.batter && !!ohtani.pitcher, "Ohtani is two-way");
assert((ohtani!.batter!.power ?? 0) >= 16, "Ohtani keeps hitter power grades");
assert(ohtani!.pitcher!.role === "SP", "Ohtani is an SP");
assert(lad26.rotation.includes("lad26-shohei-ohtani"), "Ohtani is in LAD rotation");
assert(lad26.lineup.includes("lad26-shohei-ohtani"), "Ohtani hits in LAD lineup");

const modernSeries = simulateBestOf(nyy26, lad26, 20260327, 4);
assert(modernSeries.higherRotation.length === 5, "2026 series uses five-man");
assert(modernSeries.lowerRotation.length === 5, "2026 visitor also five-man");
assert(
  modernSeries.games.length >= 4 && modernSeries.games.length <= 7,
  "Yankees-Dodgers 2026 series is best of 7",
);
assert(
  MLB_2026_TEAMS.every((t) => /LockedGM/.test(t.blurb)),
  "2026 packs use LockedGM brand in blurbs",
);
assert(
  !JSON.stringify(MLB_2026_TEAMS.map((t) => t.blurb)).match(/Strat-O-Matic/i),
  "2026 blurbs avoid Strat-O-Matic",
);

const mil26 = classicTeamById("brewers-2026")!;
assert(
  mil26.players.some((p) => p.id === "mil26-cooper-pratt"),
  "2026 Brewers include Cooper Pratt",
);
assert(mil26.lineup.includes("mil26-cooper-pratt"), "Pratt hits in MIL lineup");
assert(mil26.defense.SS === "mil26-cooper-pratt", "Pratt is the Brewers shortstop");
assert(
  mil26.players.some((p) => p.id === "mil26-jackson-chourio"),
  "2026 Brewers include Chourio",
);
const pit26 = classicTeamById("pirates-2026")!;
assert(
  pit26.players.some((p) => p.id === "pit26-konnor-griffin"),
  "2026 Pirates include Konnor Griffin",
);
const min26 = classicTeamById("twins-2026")!;
assert(
  min26.players.some((p) => /culpepper/i.test(p.name)),
  "Twins include July+ call-up Culpepper",
);
assert(
  min26.players.some((p) => /jenkins/i.test(p.name)),
  "Twins include July+ call-up Walker Jenkins",
);
const sea26 = classicTeamById("mariners-2026")!;
assert(
  sea26.players.some((p) => /kade anderson/i.test(p.name) && p.pitcher?.role === "SP"),
  "Mariners include Kade Anderson",
);
const sd26 = classicTeamById("padres-2026")!;
assert(
  sd26.players.some((p) => /ethan salas/i.test(p.name)),
  "Padres include Ethan Salas",
);
assert(IL_STINTS_PER_162.SP > IL_STINTS_PER_162.INF, "SP IL rate exceeds infielders");
assert(
  injuryRoleFor(mil26.players.find((p) => p.id === "mil26-cooper-pratt")!) === "INF",
  "Pratt IL role is infielder",
);

const slate = buildMlb2026Schedule(2026);
assert(slate.length === (30 * MLB_SEASON_GAMES) / 2, "2430-game MLB slate");
for (const team of MLB_2026_TEAMS) {
  const g = slate.filter((x) => x.awayId === team.id || x.homeId === team.id).length;
  assert(g === MLB_SEASON_GAMES, `${team.id} is scheduled 162 games`);
}

const skipPratt = aiSetLineup(mil26, new Set(["mil26-cooper-pratt"]));
assert(
  !skipPratt.lineup.includes("mil26-cooper-pratt"),
  "IL skip drops Pratt from the card",
);

const season26 = simulateMlb2026Season(26);
assert(season26.gamesPlayed === slate.length, "season plays the full slate");
assert(
  MLB_2026_TEAMS.every((t) => gamesPlayedByTeam(season26, t.id) === MLB_SEASON_GAMES),
  "every club logs 162 decisions",
);
const prattLine = season26.batters.find((b) => b.playerId === "mil26-cooper-pratt");
assert(!!prattLine && prattLine.ab > 200, "Pratt accumulates season at-bats");
assert(
  season26.pitchers.some((p) => p.ipOuts > 300),
  "starters log season-long innings",
);
assert(season26.injuryLog.length > 0, "IL wire records last-decade-rate draws");
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
assert(game.away.batters.length >= 9, "away batter lines");
assert(game.home.batters.length >= 9, "home batter lines");
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
  relieverA === shortPlan.bullpen?.[1],
  "early hook skips the fireman and calls setup/long relief first",
);
assert(
  relieverA !== firstPen,
  "fireman (bullpen[0]) is not burned on a 1st-inning hook",
);
assert(
  relieverB === reversed.bullpen?.[1],
  "reordered bullpen changes which setup arm enters first",
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

assert(rotationSizeForYear(1985) === CLASSIC_ROTATION_SIZE, "1985 uses four-man");
assert(rotationSizeForYear(1994) === MODERN_ROTATION_SIZE, "1994+ uses five-man");
assert(rotationSizeForTeam(BREWERS_1985) === 4, "classic Brewers are four-man");
assert(
  seriesRotation(BREWERS_1985).length === 4,
  "classic series rotation is four starters",
);
assert(
  seriesRotation(BREWERS_1985).join() === BREWERS_1985.rotation.slice(0, 4).join(),
  "classic rotation keeps authored order",
);

const modernBrewers = { ...BREWERS_1985, year: 2024 };
const modernReds = { ...REDS_1975, year: 2024 };
const modernBrewRot = seriesRotation(modernBrewers);
assert(modernBrewRot.length === 5, "modern-year club fills a five-man");
assert(
  modernBrewRot.slice(0, 4).join() === BREWERS_1985.rotation.slice(0, 4).join(),
  "modern five-man keeps the four authored SPs in front",
);
assert(
  !BREWERS_1985.bullpen.includes(modernBrewRot[4]!),
  "fifth starter is not the fireman",
);

const sevenClassic = simulateSeries(BREWERS_1985, REDS_1975, 198510, 7);
const brewExpected = seriesRotation(BREWERS_1985);
const cinExpected = seriesRotation(REDS_1975);
for (let i = 0; i < 7; i++) {
  const g = sevenClassic.results[i]!;
  assert(
    g.away.starterId === brewExpected[i % 4],
    `Brewers G${i + 1} starter is four-man slot ${i % 4}`,
  );
  assert(
    g.home.starterId === cinExpected[i % 4],
    `Reds G${i + 1} starter is four-man slot ${i % 4}`,
  );
}

const sevenModern = simulateSeries(modernBrewers, modernReds, 202410, 7);
const brew5 = seriesRotation(modernBrewers);
const cin5 = seriesRotation(modernReds);
for (let i = 0; i < 7; i++) {
  const g = sevenModern.results[i]!;
  assert(
    g.away.starterId === brew5[i % 5],
    `modern Brewers G${i + 1} starter is five-man slot ${i % 5}`,
  );
  assert(
    g.home.starterId === cin5[i % 5],
    `modern Reds G${i + 1} starter is five-man slot ${i % 5}`,
  );
}

const bo7 = simulateBestOf(BLUE_JAYS_1985, ROYALS_1985, 19851031, PLAYOFF_WINS_NEEDED);
assert(bo7.winsNeeded === 4, "playoff series is first-to-4");
assert(
  bo7.games.length >= 4 && bo7.games.length <= PLAYOFF_MAX_GAMES,
  "best-of-7 lasts 4–7 games",
);
assert(
  bo7.higherRotation.length === 4 && bo7.lowerRotation.length === 4,
  "1985 LCS uses four-man staffs",
);
const jaysSlots = seriesRotation(BLUE_JAYS_1985);
for (let i = 0; i < bo7.games.length; i++) {
  const g = bo7.games[i]!;
  const jaysStarter =
    g.homeTeamId === BLUE_JAYS_1985.id ? g.homeStarterId : g.awayStarterId;
  assert(
    jaysStarter === jaysSlots[i % 4],
    `ALCS G${i + 1} Jays starter follows four-man (${jaysSlots[i % 4]})`,
  );
}

function hrsScoredRuns(game: ReturnType<typeof simulateGame>): boolean {
  let prevAway = 0;
  let prevHome = 0;
  for (const p of game.plays) {
    if (p.outcome === "HR") {
      const battingAway = p.half === "top";
      const before = battingAway ? prevAway : prevHome;
      const after = battingAway ? p.score.away : p.score.home;
      if (after <= before) return false;
    }
    prevAway = p.score.away;
    prevHome = p.score.home;
  }
  return true;
}

const hrGame = simulateGame(YANKEES_1927, CARDINALS_1985, { seed: 1927 });
assert(hrsScoredRuns(hrGame), "every home run plates at least one run");
assert(
  typeof hrGame.away.starterId === "string" && hrGame.away.starterId.length > 0,
  "box records the starting pitcher",
);

function seriesHr(series: ReturnType<typeof simulateBestOf>, teamId: string) {
  let n = 0;
  for (const g of series.games) {
    const box =
      g.result.home.teamId === teamId ? g.result.home : g.result.away;
    n += boxHomeRuns(box);
  }
  return n;
}

let seriesNotByHr = false;
for (let s = 1; s <= 60; s++) {
  const ser = simulateBestOf(CARDINALS_1985, YANKEES_1927, 27000 + s, 4);
  if (!ser.championId) continue;
  const loser =
    ser.championId === ser.higherSeedId ? ser.lowerSeedId : ser.higherSeedId;
  if (seriesHr(ser, loser) > seriesHr(ser, ser.championId)) {
    seriesNotByHr = true;
    break;
  }
}
assert(
  seriesNotByHr,
  "a club can win a seven-game series without winning the home-run column",
);

let octLeague = createClassicLeague(9);
const octClaim = claimTeam(octLeague, "cardinals-1985");
assert(octClaim.ok, "human can claim Cardinals for October");
octLeague = simulateLeagueRound(octClaim.league, 44);
octLeague = simulateLeaguePlayoffs(octLeague, 198510);
assert(!!octLeague.playoffs, "league October bracket is stored");
assert(
  octLeague.playoffs!.semifinalA.winsNeeded === 4,
  "league semis are best-of-7",
);
assert(
  !!octLeague.playoffs!.championship &&
    octLeague.playoffs!.championship.winsNeeded === 4,
  "league final is best-of-7",
);
assert(
  octLeague.playoffs!.semifinalA.higherRotation.length === 4,
  "league October uses four-man on classic clubs",
);

const brewAiCard = aiSetLineup(BREWERS_1985);
assert(brewAiCard.rotation?.length === 4, "AI classic card is a four-man");
const aiModern = aiSetLineup(modernBrewers);
assert(aiModern.rotation?.length === 5, "AI modern card is a five-man");

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
assert(
  BREWERS_1982.bullpen[0] === "mil82-fingers" &&
    BREWERS_1982.bullpen.includes("mil82-bernard") &&
    BREWERS_1982.bullpen.includes("mil82-ladd") &&
    BREWERS_1982.bullpen.includes("mil82-mcclure") &&
    BREWERS_1982.bullpen.includes("mil82-slaton"),
  "1982 Brewers pen is Kuenn fireman hierarchy (Fingers, Bernard, Ladd, McClure, Slaton)",
);

// Fireman rest is engine law — 3+ IP sits two games; never 3 days in a row
const rest0 = emptyRestBook();
const after3 = recordOutings(rest0, [{ id: "mil82-fingers", outs: 9 }], [
  "mil82-fingers",
  "mil82-bernard",
]);
assert(!canEnter(after3, "mil82-fingers").ok, "3.0 IP fireman sits the next game");
assert(canEnter(after3, "mil82-bernard").ok, "unused setup arm is eligible next game");
const afterSit1 = recordOutings(after3, [{ id: "mil82-bernard", outs: 3 }], [
  "mil82-fingers",
  "mil82-bernard",
]);
assert(!canEnter(afterSit1, "mil82-fingers").ok, "3.0 IP still sitting game 2 of rest");
const afterSit2 = recordOutings(afterSit1, [{ id: "mil82-bernard", outs: 3 }], [
  "mil82-fingers",
  "mil82-bernard",
]);
assert(canEnter(afterSit2, "mil82-fingers").ok, "fireman eligible after two sit games");

const afterShort = recordOutings(emptyRestBook(), [{ id: "arm", outs: 3 }]);
const day2short = recordOutings(afterShort, [{ id: "arm", outs: 3 }]);
assert(!canEnter(day2short, "arm").ok, "two consecutive 1.0 IP days lock the 3rd");
assert(
  pickBullpenArm(["arm"], new Set(), day2short, 9, 0) == null,
  "third consecutive fireman is not an emergency option",
);

assert(dropGradeTiers(15) <= 9, "fatigue drops plus grades two classroom tiers");

const five = simulateSeries(BREWERS_1982, YANKEES_1927, 1982, 5);
const fingersMask = five.results.map((g) =>
  [...g.away.pitchers, ...g.home.pitchers].some((p) => p.playerId === "mil82-fingers"),
);
assert(
  fingersMask.filter(Boolean).length < five.results.length,
  "Fingers does not pitch all five games of a series",
);
for (let i = 0; i < fingersMask.length - 2; i++) {
  assert(
    !(fingersMask[i] && fingersMask[i + 1] && fingersMask[i + 2]),
    `Fingers never works three series games in a row (games ${i + 1}-${i + 3})`,
  );
}

const royalsPen = simulateGame(
  REDS_1975,
  applyManagerCard(ROYALS_1985, setStarterInningsTarget(defaultManagerCard(ROYALS_1985), 1)),
  { seed: 777 },
);
assert(
  royalsPen.home.pitchers[1]?.playerId !== ROYALS_1985.bullpen[0],
  "Royals fireman is also skipped on an early hook — rest rules are not Brewers-only",
);

const pitchRng = createRng(11);
assert(pitchesForPa("K", pitchRng) >= 4, "strikeouts cost real pitches");
assert(pitchesForPa("BB", pitchRng) >= 5, "walks cost real pitches");
const firemanLimits = relieverOutingLimits({
  penIndex: 0,
  stamina: 8,
  fatigued: false,
});
assert(firemanLimits.outsBudget <= 4, "fireman outing is about one inning");
assert(firemanLimits.pitchCap <= 30, "fireman pitch count is a short burst");
const longLimits = relieverOutingLimits({
  penIndex: 4,
  stamina: 9,
  fatigued: false,
});
assert(longLimits.outsBudget <= RELIEVER_MAX_OUTS, "long relief never starts a 3rd inning");
assert(longLimits.outsBudget < FIREMAN_THREE_IP_OUTS, "relievers do not go 3.0 IP");

for (let seed = 1; seed <= 24; seed++) {
  const counted = simulateGame(BREWERS_1985, YANKEES_1927, { seed: seed * 17 });
  for (const box of [counted.away, counted.home]) {
    for (const arm of box.pitchers) {
      const faced =
        arm.ipOuts > 0 || arm.h > 0 || arm.bb > 0 || arm.so > 0 || arm.hr > 0;
      if (faced) {
        assert(arm.p > 0, `${arm.name} records a pitch count`);
      }
      if (arm.playerId !== box.starterId && faced) {
        assert(
          arm.ipOuts < FIREMAN_THREE_IP_OUTS,
          `${arm.name} reliever outing ${arm.ipOuts} outs is under 3.0 IP`,
        );
        assert(
          arm.ipOuts <= RELIEVER_MAX_OUTS,
          `${arm.name} reliever does not start a third inning`,
        );
      }
    }
  }
}

// 7th-inning pinch-hit: clear split pauses / auto takes it
const weakLeft = {
  id: "test-weak-lhb",
  name: "Weak Lefty",
  bats: "L" as const,
  throws: "R" as const,
  positions: ["DH" as const],
  salary: 0.5,
  batter: {
    contact: 10,
    power: 8,
    eye: 8,
    speed: 8,
    defense: 8,
    arm: 8,
    platoonVsL: -3,
    platoonVsR: 2,
  },
};
const splitHammer = {
  id: "test-ph-rhb",
  name: "Split Hammer",
  bats: "R" as const,
  throws: "R" as const,
  positions: ["DH" as const, "LF" as const],
  salary: 0.5,
  batter: {
    contact: 13,
    power: 12,
    eye: 10,
    speed: 9,
    defense: 9,
    arm: 9,
    platoonVsL: 3,
    platoonVsR: -1,
  },
};
const lhp = BREWERS_1985.players.find((p) => p.id === "mil85-higuera")!;
const tinyPhTeam = {
  ...YANKEES_1927,
  players: [weakLeft, splitHammer],
  lineup: Array(9).fill(weakLeft.id) as string[],
};
const phRecEarly = findPinchHitRecommendation({
  inning: 6,
  half: "top",
  outs: 0,
  score: { away: 2, home: 2 },
  battingTeam: tinyPhTeam,
  lineup: tinyPhTeam.lineup,
  lineupIdx: 0,
  pitcher: lhp,
});
assert(phRecEarly == null, "no pinch-hit rec before the 7th");

const phRec7 = findPinchHitRecommendation({
  inning: PINCH_HIT_FROM_INNING,
  half: "top",
  outs: 1,
  score: { away: 3, home: 3 },
  battingTeam: tinyPhTeam,
  lineup: tinyPhTeam.lineup,
  lineupIdx: 0,
  pitcher: lhp,
});
assert(!!phRec7, "7th-inning scan finds a pinch-hit vs LHP");
assert(phRec7!.recommendedId === splitHammer.id, "AI recommends the +split RHB");
assert(phRec7!.edge >= CLEAR_SPLIT_EDGE, "recommendation meets the clear-edge bar");

const yankPhTeam = {
  ...YANKEES_1927,
  players: [...YANKEES_1927.players, weakLeft, splitHammer],
  lineup: [weakLeft.id, ...YANKEES_1927.lineup.slice(1)],
};

const brewLhp = applyManagerCard(
  BREWERS_1985,
  selectStartingPitcher(defaultManagerCard(BREWERS_1985), BREWERS_1985, "mil85-higuera"),
);
const live = startLiveGame(yankPhTeam, brewLhp, {
  seed: 1918,
  pinchHitMode: "pause",
});
let paused = false;
let liveRecId: string | undefined;
for (let i = 0; i < 400; i++) {
  const step = live.step();
  if (step.kind === "pinch-hit") {
    paused = true;
    liveRecId = step.rec.recommendedId;
    assert(step.rec.inning >= 7, "live pause is 7th inning or later");
    live.acceptPinchHit();
    break;
  }
  if (step.kind === "done") break;
}
assert(paused, "pause-mode live game stops for a pinch-hit recommendation");
assert(!!liveRecId, "pause names a bench bat");
const afterPh = simulateGame(yankPhTeam, brewLhp, {
  seed: 1918,
  pinchHitMode: "auto",
});
assert(
  afterPh.plays.some((p) => p.substitution?.kind === "pinch-hit"),
  "auto mode records the pinch-hit substitution in the play log",
);
assert(
  afterPh.away.batters.some((b) => b.pinchHit) ||
    afterPh.home.batters.some((b) => b.pinchHit),
  "pinch hitter appears in the batting box",
);

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
