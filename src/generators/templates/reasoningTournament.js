/**
 * Logical-sets templates (CAT-style DILR): round-robin matches and points,
 * draws from the points total, knockouts (matches, byes, rounds, who can meet
 * whom), qualification thresholds, results read from a points table, and
 * routes and schedules.
 *
 * Answers come from the rules in utils/reasoning/tournament.js; `verify` uses
 * the independent method beside each rule: walking every pair, trying every
 * draw count, playing the knockout round by round, halving the draw, playing
 * every possible season, counting through all 3^m results, walking every
 * route, listing every road route, and building the fixture list.
 */

import {
  SCORINGS,
  circleSchedule,
  countRoutes,
  daysLowerBound,
  drawsByTrying,
  drawsFromTotal,
  gridRoutesAll,
  gridRoutesByWalking,
  gridRoutesThrough,
  knockoutBySimulation,
  knockoutFormula,
  listRoutes,
  matchCount,
  meetRound,
  meetRoundByHalving,
  minDays,
  pairs,
  pointsOf,
  qualifyByBrute,
  qualifyFormula,
  recordOf,
  resultBetween,
  roundNames,
  scheduleProblems,
  shortestRoute,
  solveTable,
  solveTableByCounting,
  totalPoints
} from '../../utils/reasoning/tournament.js';
import { NAMES, pickNames } from './reasoningShared.js';

const TOPIC = 'logical-sets';

const LEAGUES = [
  { event: 'an inter-college kabaddi league', unit: 'colleges' },
  { event: 'a district cricket league', unit: 'teams' },
  { event: 'a company chess round robin', unit: 'players' },
  { event: 'a state hockey league', unit: 'teams' },
  { event: 'a school volleyball league', unit: 'houses' }
];
const GAMES = ['badminton', 'table tennis', 'chess', 'tennis', 'carrom'];
const STATES = ['Assam', 'Bihar', 'Goa', 'Kerala', 'Manipur', 'Odisha', 'Punjab', 'Tripura', 'Haryana', 'Sikkim', 'Delhi', 'Mizoram', 'Nagaland', 'Uttarakhand'];
const TOWNS = ['Alur', 'Belur', 'Chandur', 'Dharur', 'Ennore', 'Fatehpur', 'Gokak', 'Hosur', 'Itarsi', 'Jalna', 'Karur', 'Latur', 'Malur', 'Nandur', 'Palani', 'Ramnad', 'Sirsi', 'Tumkur'];

const S310 = SCORINGS['3-1-0'];
const plural = (k, word, many = `${word}s`) => `${k} ${k === 1 ? word : many}`;
const recordText = (r) => `${plural(r.won, 'win')}, ${plural(r.drawn, 'draw')}, ${plural(r.lost, 'loss', 'losses')}`;
const resultText = (names, a, b, r) => (r === 'd' ? 'The match was drawn' : `${names[r === 'h' ? a : b]} won`);
const CANNOT = 'Cannot be determined from the table';
const FOOTBALL = 'played a football round robin: each pair met once. A win earned 3 points, a draw 1 point to each team and a loss 0.';

/** A random four-team football round robin (3-1-0) and every set of results its points table allows. */
function footballSet(rng) {
  const names = pickNames(rng, 4, STATES);
  const results = pairs(4).map(() => (rng.chance(0.3) ? 'd' : rng.pick(['h', 'a'])));
  const points = pointsOf(4, results, S310);
  const sols = solveTable({ n: 4, points, scoring: S310 });
  return { names, results, points, sols };
}

function pointsTable(names, points) {
  const order = names.map((_, t) => t).sort((x, y) => points[y] - points[x] || x - y);
  return {
    caption: 'Final points table (3 for a win, 1 for a draw, 0 for a loss)',
    headers: ['Team', 'Played', 'Points'],
    rows: order.map((t) => [names[t], '3', String(points[t])])
  };
}

/** Each team's record, when every set of results that fits gives the same one. */
function recordLines(names, sols) {
  return names.flatMap((name, t) => {
    const recs = new Set(sols.map((r) => JSON.stringify(recordOf(4, r, t))));
    return recs.size === 1 ? [`${name} ${recordText(JSON.parse([...recs][0]))}`] : [];
  });
}

const intro = (names) => `Four teams, ${names.slice(0, 3).join(', ')} and ${names[3]}, ${FOOTBALL}`;

export const tournamentTemplates = [
  {
    id: 'ls-gen-matches',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ls-round-robin',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['ls-matches-f'],
    estimatedSeconds: 35,
    params(rng) {
      return { league: rng.pick(LEAGUES), n: rng.int(5, 20), legs: rng.pick([1, 1, 2]) };
    },
    answer: ({ n, legs }) => matchCount(n, legs),
    verify: ({ n, legs }, value) => pairs(n).length * legs === value,
    render({ league, n, legs }) {
      const once = (n * (n - 1)) / 2;
      return {
        question: `In ${league.event} there are ${n} ${league.unit}, and every one plays every other ${legs === 2 ? 'twice (home and away)' : 'exactly once'}. How many matches are played in all?`,
        explanation: `A match is a pair of ${league.unit}, so a single round robin has ${n}C2 = ${n} × ${n - 1} ÷ 2 = ${once} matches.${legs === 2 ? ` Playing twice doubles it: ${2 * once}.` : ''}`,
        solutionSteps: [`Each of the ${n} plays ${n - 1} others: ${n} × ${n - 1} = ${n * (n - 1)}.`, `Every match was counted from both sides, so halve it: ${once}.`, ...(legs === 2 ? [`Home and away: ${once} × 2 = ${2 * once}.`] : [])],
        method: 'Matches in a round robin = nC2 = n(n − 1)/2 (twice that if every pair meets twice).',
        hints: [`How many opponents does each of the ${n} ${league.unit} play?`, 'Multiply, then halve: each match has two sides.'],
        commonMistakes: [`Answering ${n * (n - 1)}, forgetting that each match was counted twice.`, legs === 2 ? `Answering ${once}, forgetting the return matches.` : `Answering ${n - 1}, the matches of just one of them.`]
      };
    }
  },
  {
    id: 'ls-gen-draws',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ls-round-robin',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['ls-points-f', 'ls-sc-draws'],
    estimatedSeconds: 60,
    params(rng) {
      const n = rng.int(4, 10);
      const m = matchCount(n);
      const draws = rng.int(1, Math.floor(m / 2));
      return { n, m, draws, total: totalPoints(m, draws, S310), ask: rng.pick(['draws', 'decisive']) };
    },
    answer: ({ m, total, ask }) => (ask === 'draws' ? drawsFromTotal(m, total, S310) : m - drawsFromTotal(m, total, S310)),
    verify: ({ m, total, ask }, value) => {
      const found = drawsByTrying(m, total, S310);
      return found.length === 1 && (ask === 'draws' ? found[0] : m - found[0]) === value;
    },
    render({ n, m, draws, total, ask }) {
      return {
        question: `${n} teams play a football league in which every pair meets once. A win earns 3 points, a draw 1 point to each side and a loss nothing. The final points table adds up to ${total}. How many matches ${ask === 'draws' ? 'ended in a draw' : 'had a winner'}?`,
        explanation: `There are ${n}C2 = ${m} matches. A match with a winner gives out 3 points and a draw only 2, so every draw takes 1 point off the 3 × ${m} = ${3 * m} maximum: ${3 * m} − ${total} = ${draws} draws${ask === 'draws' ? '' : `, and ${m} − ${draws} = ${m - draws} matches had a winner`}.`,
        solutionSteps: [`Matches: ${n} × ${n - 1} ÷ 2 = ${m}.`, `If every match had a winner the total would be 3 × ${m} = ${3 * m}.`, `Each draw gives 2 instead of 3: draws = ${3 * m} − ${total} = ${draws}.`, ...(ask === 'draws' ? [] : [`Matches with a winner: ${m} − ${draws} = ${m - draws}.`])],
        method: 'With 3-1-0 scoring, total points = 3 × matches − draws.',
        hints: ['How many points does a match with a winner give out? And a draw?', `Start from 3 × ${m}, the total if no match were drawn.`],
        commonMistakes: [ask === 'draws' ? `Answering ${m - draws}, the matches that had a winner.` : `Answering ${draws}, the number of draws.`, 'Counting 2 points lost per draw instead of 1.']
      };
    }
  },
  {
    id: 'ls-gen-knockout',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ls-knockout',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['ls-knockout-f'],
    estimatedSeconds: 45,
    params(rng) {
      const n = rng.int(6, 120);
      const ask = rng.pick(['matches', 'byes', 'rounds', 'firstRoundMatches']);
      if ((ask === 'byes' || ask === 'firstRoundMatches') && Number.isInteger(Math.log2(n))) return null;
      return { n, ask, game: rng.pick(GAMES) };
    },
    answer: ({ n, ask }) => knockoutFormula(n)[ask],
    verify: ({ n, ask }, value) => knockoutBySimulation(n)[ask] === value,
    render({ n, ask, game }) {
      const { matches, rounds, byes, firstRoundMatches } = knockoutFormula(n);
      const size = 2 ** rounds;
      const start = `${n} players enter a knockout ${game} tournament: whoever loses a match is out.`;
      const byeRule = ' Some players get a bye in the first round so that the second round starts with a power of 2 players.';
      const questions = {
        matches: `${start} How many matches are played to find the champion?`,
        byes: `${start}${byeRule} How many byes are given?`,
        rounds: `${start} How many rounds are needed, counting the final?`,
        firstRoundMatches: `${start}${byeRule} How many matches are played in the first round?`
      };
      const why = {
        matches: `Every match knocks out exactly one player, and ${n} − 1 = ${matches} players must go out to leave one champion.`,
        byes: `The next power of 2 at or above ${n} is ${size}, so ${size} − ${n} = ${byes} places in the draw are empty: those are the byes.`,
        rounds: `Each round halves the field (rounding up), so the rounds are the smallest r with 2^r ≥ ${n}: 2^${rounds} = ${size}, so ${rounds} rounds.`,
        firstRoundMatches: `The draw has ${size} places, so ${byes} players get byes and the other ${n - byes} play: ${n - byes} ÷ 2 = ${firstRoundMatches} matches.`
      };
      const mistakes = {
        matches: [`Answering ${n}, or ${Math.floor(n / 2)} (only the first round).`],
        byes: [`Answering ${n - 2 ** (rounds - 1)}, the players to remove to get down to ${2 ** (rounds - 1)}.`, `Answering ${n - byes}, the players who do play in the first round.`],
        rounds: [`Answering ${Math.floor(Math.log2(n))}, rounding log₂ ${n} down.`],
        firstRoundMatches: [`Answering ${n - byes}, the players (not the matches) in the first round.`, `Answering ${Math.floor(n / 2)}, ignoring the byes.`]
      };
      return {
        question: questions[ask],
        explanation: why[ask],
        solutionSteps: [`Next power of 2 at or above ${n}: ${size} = 2^${rounds}.`, `Byes = ${size} − ${n} = ${byes}; first-round matches = (${n} − ${byes}) ÷ 2 = ${firstRoundMatches}.`, `Matches in all = ${n} − 1 = ${matches}; rounds = ${rounds}.`],
        method: 'Knockout: matches = n − 1, rounds = ⌈log₂ n⌉, byes = 2^rounds − n.',
        hints: ask === 'matches' ? ['How many players does each match knock out?', 'Everyone except the champion is knocked out exactly once.'] : [`What is the smallest power of 2 that is at least ${n}?`, 'Byes fill the empty places in a draw of that size.'],
        commonMistakes: mistakes[ask]
      };
    }
  },
  {
    id: 'ls-gen-meet',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ls-knockout',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ls-meet-f'],
    formatValue: (v) => v,
    estimatedSeconds: 70,
    params(rng) {
      const size = rng.pick([16, 32, 64]);
      const r = rng.int(1, Math.log2(size));
      const block = 2 ** r;
      const half = block / 2;
      const a0 = rng.int(0, size - 1);
      const base = Math.floor(a0 / block) * block;
      const b0 = base + (a0 - base < half ? half : 0) + rng.int(0, half - 1);
      const [a, b] = [a0 + 1, b0 + 1].sort((x, y) => x - y);
      return { size, a, b, game: rng.pick(GAMES) };
    },
    answer: ({ size, a, b }) => roundNames(size)[meetRound(a, b) - 1],
    distractors: ({ size, a, b }) => {
      const names = roundNames(size);
      const k = meetRound(a, b) - 1;
      return [names[k - 1], names[k + 1], names[k - 2], names[k + 2], ...names].map((value) => ({ value, why: 'a neighbouring round' }));
    },
    verify: ({ size, a, b }, value) => roundNames(size)[meetRoundByHalving(a, b) - 1] === value,
    render({ size, a, b, game }, { fmt }) {
      const r = meetRound(a, b);
      const block = 2 ** r;
      const lo = Math.floor((a - 1) / block) * block + 1;
      const name = roundNames(size)[r - 1];
      return {
        question: `In a knockout ${game} draw of ${size} players, the players are numbered 1 to ${size} down the draw: 1 plays 2, 3 plays 4, and so on, and the winners of neighbouring matches meet in the next round. If both keep winning, in which round can player ${a} meet player ${b}?`,
        explanation: `After round k each player has come through a block of 2^k neighbouring places. Players ${a} and ${b} first share a block of ${block} (places ${lo} to ${lo + block - 1}), one in each half of it, so they meet in round ${r}: ${fmt(name)}.`,
        solutionSteps: [`Blocks of 2: are ${a} and ${b} together? Then blocks of 4, 8, ...`, `The first block holding both is places ${lo}–${lo + block - 1}, of size ${block} = 2^${r}.`, `So they meet in round ${r} of ${Math.log2(size)}: ${name}.`],
        method: 'Two players meet in the round whose block (2, 4, 8, ... neighbouring places) first contains both.',
        hints: [`Which players can ${a} meet in round 1? In round 2?`, 'Keep doubling the block of places around each player until both are in it.'],
        commonMistakes: ['Using the gap between the two numbers instead of the blocks of the draw.', 'Numbering the rounds back from the final.']
      };
    }
  },
  {
    id: 'ls-gen-qualify',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ls-qualify',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['ls-qualify-f'],
    estimatedSeconds: 120,
    params(rng) {
      const n = rng.int(4, 6);
      return { n, k: rng.int(2, n - 2), win: rng.pick([2, 3]), ask: rng.pick(['maxOut', 'minSafe']), sport: rng.pick(['cricket', 'hockey', 'kabaddi', 'volleyball']) };
    },
    answer: ({ n, k, win, ask }) => qualifyFormula(n, k, win)[ask],
    verify: ({ n, k, win, ask }, value) => qualifyByBrute(n, k, { win, draw: 0, loss: 0 }, false)[ask] === value,
    render({ n, k, win, ask, sport }) {
      const { maxOut, minSafe } = qualifyFormula(n, k, win);
      const strongWins = n - k - 1 + Math.floor(k / 2);
      const inner = ((k + 1) * k) / 2;
      return {
        question: `${n} teams play a ${sport} league: each pair meets once, a win earns ${win} points, a loss 0, and no match can be tied. The top ${k} go through to the play-offs, and if teams finish level on points, assume the tie is broken against the team in question. What is the ${ask === 'maxOut' ? 'greatest number of points a team can score and still miss the play-offs' : 'least number of points that guarantees a place in the play-offs'}?`,
        explanation: `To keep a high score out, let ${k + 1} teams beat the other ${n - k - 1} and share their own ${inner} matches as evenly as possible: the weakest of them still has ${n - k - 1} + ${Math.floor(k / 2)} = ${strongWins} wins, ${maxOut} points, and finishes ${k + 1}th. ${ask === 'maxOut' ? `So ${maxOut} points can still miss out.` : `With one more win, ${minSafe} points, ${k} other teams cannot all reach that score, so ${minSafe} is always enough.`}`,
        solutionSteps: [`To miss out with many points, ${k + 1} teams must all score well.`, `Each of them beats the other ${n - k - 1} teams, and they split their ${inner} matches among themselves: the weakest gets at least ${Math.floor(k / 2)}.`, `Weakest of them: ${strongWins} wins = ${maxOut} points, and it can still be ${k + 1}th.`, ...(ask === 'minSafe' ? [`One more win: ${maxOut} + ${win} = ${minSafe} points is safe.`] : [])],
        method: `Most points and still out = ${win} × (n − k − 1 + ⌊k/2⌋); one more win is safe.`,
        hints: [`How many teams must finish level with or above a team for it to miss the top ${k}?`, `Let ${k + 1} strong teams beat everyone else, and split the matches among themselves evenly.`],
        commonMistakes: [`Making only ${k} teams strong (it takes ${k + 1} to push one out).`, 'Forgetting the matches the strong teams play against each other.', ask === 'maxOut' ? `Answering ${minSafe}, the safe score.` : `Answering ${maxOut}, which can still miss out.`]
      };
    }
  },
  {
    id: 'ls-gen-table',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ls-table',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ls-table-f', 'ls-sc-extremes', 'ls-sc-draws'],
    formatValue: (v) => v,
    estimatedSeconds: 150,
    params(rng) {
      const { names, results, points, sols } = footballSet(rng);
      const list = pairs(4);
      const extreme = (t) => points[t] === 0 || points[t] === 9;
      const good = list.map((_, k) => k).filter((k) => new Set(sols.map((r) => r[k])).size === 1 && !extreme(list[k][0]) && !extreme(list[k][1]));
      if (!good.length) return null;
      const k = rng.pick(good);
      const [a, b] = rng.chance(0.5) ? list[k] : [list[k][1], list[k][0]];
      return { names, points, a, b, result: resultBetween(4, results, a, b) };
    },
    answer: ({ names, a, b, result }) => resultText(names, a, b, result),
    distractors: ({ names, a, b }) => [...['h', 'a', 'd'].map((r) => ({ value: resultText(names, a, b, r), why: 'another result' })), { value: CANNOT, why: 'stopped before using the totals' }],
    verify: ({ names, points, a, b }, value) => {
      const seen = new Set(solveTableByCounting({ n: 4, points, scoring: S310 }).map((r) => resultText(names, a, b, resultBetween(4, r, a, b))));
      return seen.size === 1 && seen.has(value);
    },
    render({ names, points, a, b, result }, { fmt }) {
      const total = points.reduce((s, p) => s + p, 0);
      const draws = 18 - total;
      const lines = recordLines(names, solveTable({ n: 4, points, scoring: S310 }));
      return {
        context: intro(names),
        table: pointsTable(names, points),
        question: `What was the result of the match between ${names[a]} and ${names[b]}?`,
        explanation: `The six matches would give 18 points with no draws; the table adds up to ${total}, so ${plural(draws, 'match', 'matches')} ${draws === 1 ? 'was' : 'were'} drawn. Reading each total as 3 × wins + draws from three matches: ${lines.length ? lines.join('; ') : 'the totals leave more than one record for some teams'}. Every set of results that fits the table gives the same answer: ${fmt(resultText(names, a, b, result))}.`,
        solutionSteps: [`Total ${total} = 18 − draws, so ${plural(draws, 'draw')}.`, 'Split each team’s points into wins and draws (3W + D, from 3 matches).', 'Start with the teams that have only one way to make their points, and place their results.', `What is left forces ${names[a]} v ${names[b]}: ${resultText(names, a, b, result).toLowerCase()}.`],
        method: 'Draws from the total; each team’s points as 3W + D; then place the forced results.',
        hints: ['How many points would six matches give if none were drawn?', `Write each team’s points as 3 × wins + draws. Whom could ${names[a]} have drawn with, and whom beaten?`],
        commonMistakes: ['Choosing "cannot be determined" before using the total and each team’s 3W + D.', 'Forgetting that a draw is counted in both teams’ points.']
      };
    }
  },
  {
    id: 'ls-gen-record',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ls-table',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['ls-table-f', 'ls-sc-draws'],
    estimatedSeconds: 90,
    params(rng) {
      const { names, points, sols } = footballSet(rng);
      const ask = rng.pick(['won', 'drawn', 'lost']);
      const choices = names.map((_, t) => t).filter((t) => points[t] > 0 && points[t] < 9 && new Set(sols.map((r) => recordOf(4, r, t)[ask])).size === 1);
      if (!choices.length) return null;
      const team = rng.pick(choices);
      return { names, points, team, ask, value: recordOf(4, sols[0], team)[ask] };
    },
    answer: ({ value }) => value,
    verify: ({ points, team, ask }, value) => {
      const seen = new Set(solveTableByCounting({ n: 4, points, scoring: S310 }).map((r) => recordOf(4, r, team)[ask]));
      return seen.size === 1 && seen.has(value);
    },
    render({ names, points, team, ask, value }) {
      const total = points.reduce((s, p) => s + p, 0);
      const p = points[team];
      const ways = [];
      for (let w = 0; w <= 3; w++) for (let d = 0; w + d <= 3; d++) if (3 * w + d === p) ways.push(`${plural(w, 'win')} and ${plural(d, 'draw')}`);
      const verb = ask === 'won' ? 'win' : ask === 'drawn' ? 'draw' : 'lose';
      return {
        context: intro(names),
        table: pointsTable(names, points),
        question: `How many matches did ${names[team]} ${verb}?`,
        explanation: `${names[team]} has ${p} points from 3 matches: ${ways.join(', or ')}.${ways.length > 1 ? ` The table shows ${18 - total} draws in all (18 − ${total}), and only one of these fits the other teams’ points.` : ''} So the answer is ${value}.`,
        solutionSteps: ['Points = 3 × wins + draws, from 3 matches.', `${p} = ${ways.join(' or ')}.`, ...(ways.length > 1 ? [`Draws in all: 18 − ${total} = ${18 - total}; check which split fits the other teams.`] : []), `Matches ${ask}: ${value}.`],
        method: 'Split the points into 3 × wins + draws; use the total draws when two splits are possible.',
        hints: [`Write ${p} as 3 × wins + draws, with at most 3 matches.`, 'If two splits work, count the draws in the whole table: 18 minus the total.'],
        commonMistakes: ['Reading points as wins (one point a win).', 'Forgetting that each team plays only 3 matches.']
      };
    }
  },
  {
    id: 'ls-gen-grid',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ls-routes',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['ls-grid-f', 'ls-sc-avoid', 'ls-sc-dp'],
    estimatedSeconds: 80,
    params(rng) {
      const east = rng.int(2, 5);
      const north = rng.int(2, 4);
      const ask = rng.pick(['any', 'avoid', 'avoid', 'through']);
      const x = rng.int(0, east);
      const y = rng.int(0, north);
      if ((x === 0 && y === 0) || (x === east && y === north)) return null;
      return { east, north, ask, x, y, name: rng.pick(NAMES) };
    },
    answer: ({ east, north, ask, x, y }) => (ask === 'any' ? gridRoutesAll(east, north) : ask === 'through' ? gridRoutesThrough(east, north, [x, y]) : gridRoutesAll(east, north) - gridRoutesThrough(east, north, [x, y])),
    verify: ({ east, north, ask, x, y }, value) => gridRoutesByWalking(east, north, ask === 'avoid' ? [[x, y]] : [], ask === 'through' ? [x, y] : null) === value,
    render({ east, north, ask, x, y, name }) {
      const all = gridRoutesAll(east, north);
      const via = gridRoutesThrough(east, north, [x, y]);
      const spot = `${plural(x, 'block')} east and ${plural(y, 'block')} north of home`;
      const extra = ask === 'avoid' ? ` The junction ${spot} is closed for repairs.` : ask === 'through' ? ` On the way ${name} must stop at a shop at the junction ${spot}.` : '';
      const toX = `C(${x + y}, ${x})`;
      const fromX = `C(${east - x + north - y}, ${east - x})`;
      return {
        question: `The streets of a town form a square grid. ${name}’s school is ${plural(east, 'block')} east and ${plural(north, 'block')} north of home, and ${name} walks only east or north, so every route is a shortest one.${extra} How many different routes can ${name} take?`,
        explanation:
          ask === 'any'
            ? `Every route is ${east + north} blocks long with exactly ${east} of them east, so a route is a choice of which ${east} blocks go east: C(${east + north}, ${east}) = ${all}.`
            : ask === 'through'
              ? `Routes to the shop: ${toX}; routes from the shop to school: ${fromX}. Every pair makes one route, so multiply: ${via}.`
              : `All routes: C(${east + north}, ${east}) = ${all}. Routes through the closed junction: ${toX} × ${fromX} = ${via}. Avoiding it: ${all} − ${via} = ${all - via}.`,
        solutionSteps: [
          `All shortest routes: C(${east + north}, ${east}) = ${all}.`,
          ...(ask === 'any' ? [] : [`Through the junction: ${toX} × ${fromX} = ${via}.`]),
          ...(ask === 'avoid' ? [`Avoiding it: ${all} − ${via} = ${all - via}.`] : []),
          'Check: add the routes into each junction from the west and from the south.'
        ],
        method: ask === 'avoid' ? 'Routes avoiding a junction = all routes − routes through it.' : 'Shortest grid routes = C(east + north, east); through a point, multiply the two parts.',
        hints: ['How many blocks long is every route, and how many of them go east?', ask === 'avoid' ? 'Count the routes that do pass the closed junction, and take them away.' : ask === 'through' ? 'Count home → shop and shop → school separately, then multiply.' : 'Choose which blocks of the route go east.'],
        commonMistakes: [ask === 'avoid' ? `Answering ${via}, the routes that do pass the junction.` : ask === 'through' ? 'Adding the two parts instead of multiplying.' : `Answering ${east * north} or ${east + north}.`, 'Counting routes that go west or south, which are not shortest.']
      };
    }
  },
  {
    id: 'ls-gen-network',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ls-routes',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['ls-sc-dp'],
    estimatedSeconds: 110,
    params(rng) {
      const towns = rng.shuffle(TOWNS).slice(0, 6);
      const roads = [];
      for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) if (j - i <= 2 ? rng.chance(0.75) : rng.chance(0.2)) roads.push([towns[i], towns[j]]);
      if (roads.some(([a, b]) => a === towns[0] && b === towns[5])) return null;
      const count = countRoutes(roads, towns[0], towns[5]);
      if (count < 3 || count > 20) return null;
      return { towns, roads: rng.shuffle(roads) };
    },
    answer: ({ towns, roads }) => countRoutes(roads, towns[0], towns[5]),
    verify: ({ towns, roads }, value) => listRoutes(roads, towns[0], towns[5], true).length === value,
    render({ towns, roads }) {
      const counts = towns
        .slice(0, 5)
        .map((t) => `${t} ${countRoutes(roads, t, towns[5])}`)
        .reverse();
      const start = countRoutes(roads, towns[0], towns[5]);
      return {
        context: `A district has these one-way roads (each runs only in the direction shown):\n${roads.map(([a, b]) => `${a} → ${b}`).join('\n')}`,
        question: `How many different routes are there from ${towns[0]} to ${towns[5]}?`,
        explanation: `Work backwards from ${towns[5]}: the number of routes from a town is the sum of the routes from the towns its roads lead to. Routes to ${towns[5]} from ${counts.join(', ')}. So there are ${start} routes from ${towns[0]}.`,
        solutionSteps: [`From ${towns[5]} itself: 1.`, 'For each town, add the routes from every town one road ahead.', `Routes to ${towns[5]}: ${counts.join(', ')}.`],
        method: 'Routes from a town = sum of the routes from the towns its roads lead to.',
        hints: [`Which towns have a road straight to ${towns[5]}? Each has 1 route from there.`, 'Work backwards, adding up the routes out of each town.'],
        commonMistakes: ['Counting roads instead of routes.', 'Missing a route that skips a town, or using a one-way road the wrong way.']
      };
    }
  },
  {
    id: 'ls-gen-shortest',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ls-routes',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'km',
    formulaIds: ['ls-shortest-f'],
    estimatedSeconds: 110,
    params(rng) {
      const towns = rng.shuffle(TOWNS).slice(0, 5);
      // A two-road route through one town, with long roads, and a chain of short roads through the others;
      // then a few more roads at random.
      const mid = rng.int(1, 3);
      const chain = [0, ...[1, 2, 3].filter((i) => i !== mid), 4];
      const roads = [
        [towns[0], towns[mid], rng.int(7, 14)],
        [towns[mid], towns[4], rng.int(7, 14)],
        ...chain.slice(1).map((t, i) => [towns[chain[i]], towns[t], rng.int(2, 6)])
      ];
      const has = (i, j) => roads.some(([x, y]) => (x === towns[i] && y === towns[j]) || (x === towns[j] && y === towns[i]));
      for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) if (!(i === 0 && j === 4) && !has(i, j) && rng.chance(0.35)) roads.push([towns[i], towns[j], rng.int(3, 15)]);
      const d = shortestRoute(roads, towns[0], towns[4]);
      if (!Number.isFinite(d)) return null;
      const routes = listRoutes(roads, towns[0], towns[4], false);
      if (routes.length < 3) return null;
      // The route with the fewest roads must not be a shortest one, so counting roads does not work.
      const fewest = Math.min(...routes.map((r) => r.path.length));
      if (routes.some((r) => r.km === d && r.path.length === fewest)) return null;
      return { towns, roads: rng.shuffle(roads) };
    },
    answer: ({ towns, roads }) => shortestRoute(roads, towns[0], towns[4]),
    verify: ({ towns, roads }, value) => Math.min(...listRoutes(roads, towns[0], towns[4], false).map((r) => r.km)) === value,
    render({ towns, roads }) {
      const routes = listRoutes(roads, towns[0], towns[4], false).sort((a, b) => a.km - b.km);
      const best = routes[0];
      const fewest = [...routes].sort((a, b) => a.path.length - b.path.length || a.km - b.km)[0];
      return {
        context: `Roads between five towns (each can be used in both directions):\n${roads.map(([a, b, km]) => `${a} – ${b}: ${km} km`).join('\n')}`,
        question: `What is the length of the shortest route from ${towns[0]} to ${towns[4]}?`,
        explanation: `Settle the nearest towns first (Dijkstra’s method) or compare the routes: the shortest is ${best.path.join(' → ')}, ${best.km} km. The route with the fewest roads, ${fewest.path.join(' → ')}, is ${fewest.km} km, which is longer.`,
        solutionSteps: [`From ${towns[0]}, write the distance to each neighbour.`, 'Repeatedly fix the nearest unfixed town and update the distances through it.', `Shortest: ${best.path.join(' → ')} = ${best.km} km.`],
        method: 'Fix the nearest town each time and update its neighbours (or compare every route).',
        hints: ['A route with more roads can still be shorter: compare kilometres, not roads.', `Work out the shortest distance from ${towns[0]} to each town in turn.`],
        commonMistakes: [`Taking the route with the fewest roads (${fewest.km} km).`, 'Stopping at the first route found.']
      };
    }
  },
  {
    id: 'ls-gen-days',
    version: 1,
    topicId: TOPIC,
    conceptId: 'ls-routes',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['ls-days-f'],
    estimatedSeconds: 50,
    params(rng) {
      return { n: rng.int(4, 14), legs: rng.pick([1, 1, 2]), league: rng.pick(LEAGUES) };
    },
    answer: ({ n, legs }) => minDays(n, legs),
    verify: ({ n, legs }, value) => {
      const days = circleSchedule(n);
      return scheduleProblems(n, days).length === 0 && days.length * legs === value && daysLowerBound(n, legs) === value;
    },
    render({ n, legs, league }) {
      const m = matchCount(n, legs);
      const perDay = Math.floor(n / 2);
      return {
        question: `In ${league.event} there are ${n} ${league.unit}, and every one plays every other ${legs === 2 ? 'twice' : 'once'}. No one plays more than one match a day. What is the least number of days needed?`,
        explanation: `There are ${m} matches and at most ${perDay} fit in a day (two per match${n % 2 ? ', with one left over to rest' : ''}), so at least ${m} ÷ ${perDay} = ${m / perDay} days. The circle method (fix one, rotate the rest one place a day) reaches it.`,
        solutionSteps: [`Matches: ${legs === 2 ? '2 × ' : ''}${n}C2 = ${m}.`, `Most matches in a day: ⌊${n}/2⌋ = ${perDay}.`, `Days ≥ ${m} ÷ ${perDay} = ${m / perDay}, and a rotating fixture list reaches it.`],
        method: 'Least days = n − 1 for an even number of teams, n for an odd number (for each round robin).',
        hints: ['How many matches can be played on one day if nobody plays twice?', 'Divide the number of matches by that.'],
        commonMistakes: [`Answering ${m}, one match a day.`, n % 2 ? `Answering ${legs * (n - 1)}, forgetting that one of them rests each day.` : `Answering ${legs * n}, as if one rested every day.`]
      };
    }
  }
];
