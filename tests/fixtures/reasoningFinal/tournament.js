/**
 * The hand-written logical-sets questions in structured form (see
 * tests/reasoning-final-content.test.js): `texts` must appear in order in the
 * printed context and question, and `answer()` works the keyed answer out
 * again with the second, independent methods of utils/reasoning/tournament.js
 * (walking pairs, playing knockouts round by round, counting through every
 * set of results, walking every route, building the fixture list).
 * `table` (optional) is the points table the question must print.
 */

import {
  SCORINGS,
  circleSchedule,
  daysLowerBound,
  drawsByTrying,
  gridRoutesByWalking,
  knockoutBySimulation,
  listRoutes,
  meetRoundByHalving,
  pairs,
  pointsOf,
  qualifyByBrute,
  recordOf,
  resultBetween,
  roundNames,
  scheduleProblems,
  solveTableByCounting
} from '../../../src/utils/reasoning/tournament.js';

const S210 = SCORINGS['2-1-0'];
const S310 = SCORINGS['3-1-0'];

/** One value, or an error if the solutions disagree. */
function only(values) {
  const set = new Set(values.map((v) => JSON.stringify(v)));
  if (!values.length) throw new Error('no solution at all');
  if (set.size !== 1) throw new Error(`answer differs between solutions: ${[...set].join(' | ')}`);
  return values[0];
}

/** Least days by building the fixture list, checked against the lower bound. */
function days(n, legs) {
  const fixture = circleSchedule(n);
  if (scheduleProblems(n, fixture).length) throw new Error('bad fixture list');
  if (fixture.length * legs !== daysLowerBound(n, legs)) throw new Error('fixture list longer than the bound');
  return fixture.length * legs;
}

/* Set A: Assam, Bihar, Goa, Kerala (3-1-0). */
const A = ['Assam', 'Bihar', 'Goa', 'Kerala'];
const A_POINTS = [7, 5, 4, 0];
const solveA = () => solveTableByCounting({ n: 4, points: A_POINTS, scoring: S310 });

/* Set B: Odisha, Punjab, Haryana, Jharkhand (smudged), Karnataka (3-1-0), exactly 3 draws. */
const B = ['Odisha', 'Punjab', 'Haryana', 'Jharkhand', 'Karnataka'];
const B_POINTS = [10, 4, 4, null, 4];
const threeDraws = (results) => results.filter((r) => r === 'd').length === 3;
const solveB = () => solveTableByCounting({ n: 5, points: B_POINTS, scoring: S310, check: threeDraws });
const B_CLAIMS = [
  ['Odisha did not lose a match.', (r) => recordOf(5, r, 0).lost === 0],
  ['Jharkhand drew two of its matches.', (r) => recordOf(5, r, 3).drawn === 2],
  ['Odisha beat Punjab.', (r) => resultBetween(5, r, 0, 1) === 'h'],
  ['Karnataka won exactly one match.', (r) => recordOf(5, r, 4).won === 1],
  ['Punjab beat Haryana.', (r) => resultBetween(5, r, 1, 2) === 'h']
];

const ROADS_14 = [
  ['Ambattur', 'Anna Nagar'],
  ['Ambattur', 'Vadapalani'],
  ['Anna Nagar', 'Vadapalani'],
  ['Anna Nagar', 'T. Nagar'],
  ['Vadapalani', 'T. Nagar'],
  ['Vadapalani', 'Guindy'],
  ['T. Nagar', 'Guindy']
];
const ROADS_16 = [
  ['Alur', 'Belur', 7],
  ['Alur', 'Chandur', 4],
  ['Chandur', 'Belur', 2],
  ['Belur', 'Dharur', 5],
  ['Chandur', 'Dharur', 9],
  ['Dharur', 'Hosur', 3],
  ['Belur', 'Hosur', 10]
];

const KO_24 = knockoutBySimulation(24);
const KO_CLAIMS = [
  ['23 matches are played in all.', KO_24.matches === 23],
  ['8 players get a bye.', KO_24.byes === 8],
  ['12 matches are played in the first round.', KO_24.firstRoundMatches === 12],
  ['The tournament has 6 rounds.', KO_24.rounds === 6],
  ['The tournament has 5 rounds.', KO_24.rounds === 5]
];

export const sets = [
  { id: 'logical-sets-q-001', texts: ['8 colleges', 'every other college exactly once'], answer: () => pairs(8).length },
  { id: 'logical-sets-q-002', texts: ['32 players', 'knockout'], answer: () => String(knockoutBySimulation(32).matches) },
  { id: 'logical-sets-q-003', texts: ['6 teams', 'twice'], answer: () => pairs(6).length * 2 },
  { id: 'logical-sets-q-004', texts: ['20 players', 'bye', 'power of 2'], answer: () => String(knockoutBySimulation(20).byes) },
  {
    id: 'logical-sets-q-005',
    texts: ['5 teams', 'each pair meets once', '2 points', '1 point'],
    answer: () => only(solveTableByCounting({ n: 5, points: [null, null, null, null, null], scoring: S210 }).map((r) => pointsOf(5, r, S210).reduce((s, p) => s + p, 0)))
  },
  { id: 'logical-sets-q-006', texts: ['3 blocks east', '2 blocks north', 'only east or north'], answer: () => gridRoutesByWalking(3, 2) },
  { id: 'logical-sets-q-007', texts: ['6 teams', 'each pair meets once', 'more than one match'], answer: () => String(days(6, 1)) },
  { id: 'logical-sets-q-008', texts: ['6 teams', 'each pair meets once', '3 points', '1 point', '41', 'drawn'], answer: () => only(drawsByTrying(15, 41, S310)) },
  { id: 'logical-sets-q-009', texts: ['16-player', '1 plays 2, 3 plays 4', 'player 3 meet player 6'], answer: () => roundNames(16)[meetRoundByHalving(3, 6) - 1] },
  { id: 'logical-sets-q-010', texts: ['6 teams', 'each pair meets once', '2 points', 'no match can be tied', 'top 4', 'against the team', 'greatest'], answer: () => qualifyByBrute(6, 4, S210, false).maxOut },
  { id: 'logical-sets-q-011', texts: ['6 teams', 'each pair meets once', '2 points', 'no match can be tied', 'top 3', 'against the team', 'least'], answer: () => qualifyByBrute(6, 3, S210, false).minSafe },
  {
    id: 'logical-sets-q-012',
    texts: [...A.slice(0, 3), 'and Kerala', 'each pair met once', '3 points', '1 point', 'Bihar and Goa'],
    table: [A, A_POINTS],
    answer: () => {
      const r = only(solveA().map((res) => resultBetween(4, res, 1, 2)));
      return r === 'd' ? 'The match was drawn' : `${A[r === 'h' ? 1 : 2]} won`;
    }
  },
  { id: 'logical-sets-q-013', texts: [...A, 'each pair met once', 'Goa win'], table: [A, A_POINTS], answer: () => only(solveA().map((res) => recordOf(4, res, 2).won)) },
  { id: 'logical-sets-q-014', texts: [...ROADS_14.map(([a, b]) => `${a} → ${b}`), 'from Ambattur to Guindy'], answer: () => listRoutes(ROADS_14, 'Ambattur', 'Guindy', true).length },
  { id: 'logical-sets-q-015', texts: ['4 blocks east', '3 blocks north', 'only east or north', '2 blocks east and 1 block north', 'closed'], answer: () => gridRoutesByWalking(4, 3, [[2, 1]]) },
  {
    id: 'logical-sets-q-016',
    texts: [...ROADS_16.map(([a, b, km]) => `${a} – ${b}: ${km} km`), 'from Alur to Hosur'],
    answer: () => `${Math.min(...listRoutes(ROADS_16, 'Alur', 'Hosur', false).map((r) => r.km))} km`
  },
  { id: 'logical-sets-q-017', texts: ['5 teams', 'each pair meets once', '3 points', '1 point', 'top 2', 'against the team', 'greatest'], answer: () => qualifyByBrute(5, 2, S310, true).maxOut },
  {
    id: 'logical-sets-q-018',
    texts: [...B, 'each pair met once', '3 points', '1 point', 'Exactly 3 matches were drawn', 'smudged', 'must be true'],
    table: [B, B_POINTS],
    answer: () => {
      const sols = solveB();
      return B_CLAIMS.filter(([, holds]) => sols.every(holds)).map(([text]) => text);
    }
  },
  { id: 'logical-sets-q-019', texts: ['24 players', 'Byes', 'power of 2'], answer: () => KO_CLAIMS.filter(([, truth]) => truth).map(([text]) => text) },
  {
    id: 'logical-sets-q-020',
    texts: [...B, 'Exactly 3 matches were drawn', 'smudged', 'Jharkhand score'],
    table: [B, B_POINTS],
    answer: () => only(solveB().map((r) => pointsOf(5, r, S310)[3]))
  },
  { id: 'logical-sets-q-021', texts: ['9 teams', 'twice', 'more than one match'], answer: () => days(9, 2) }
];

/** Claims offered in q-018 that do not have to hold, for the test that each is really open. */
export const openClaims = () => {
  const sols = solveB();
  return B_CLAIMS.filter(([, holds]) => !sols.every(holds)).map(([text, holds]) => ({ text, someTrue: sols.some(holds) }));
};
