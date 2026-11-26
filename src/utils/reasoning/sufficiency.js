/**
 * Data sufficiency for reasoning: are the statements enough to settle an
 * arrangement, a ranking, a family relation or a direction?
 *
 * The idea is the same as quant DS, done by brute force. Every "world" the
 * question's own information allows is listed (every seating, every order,
 * every starting direction...). Each statement keeps the worlds it is true in.
 * For each combination (none, (1) alone, (2) alone, both) the asked answer is
 * read in every surviving world; the combination is sufficient exactly when one
 * answer is left. A definite "No" to a yes/no question is one answer, so it is
 * sufficient.
 *
 * Four kinds of question, each worked two independent ways (the tests hold the
 * two to each other):
 *   arrangements  rows, floors, days and circles, as seating puzzles
 *                 A: seating.js clueHolds (step tables)   B: clueHoldsGeometric (left hands on a map)
 *   ranking       "A is taller than B" comparisons
 *                 A: every order (ranking.js solveComparisons)
 *                 B: who is surely above whom (transitive closure): a person's possible
 *                    places run from (number surely above + 1) to (n − number surely below)
 *   relations     family statements (family.js)
 *                 A: relationByStructure   B: relationByPath
 *   directions    a walk with an unknown start or an unknown turn
 *                 A: walkRoute (direction table)   B: walkRouteComplex (complex numbers)
 */

import { allArrangements, clueHolds, clueHoldsGeometric, clueText, ordinal as seatOrdinal } from './seating.js';
import { solveComparisons } from './ranking.js';
import { buildFamily, relationByPath, relationByStructure } from './family.js';
import { DIRS, directionByAngle, directionOf, walkRoute, walkRouteComplex } from './direction.js';

/* ------------------------------ the five answers ------------------------------ */

/** The five standard choices, in their standard order (the same words as quant DS). */
export const DS_CHOICES = [
  'Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.',
  'Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.',
  'BOTH statements TOGETHER are sufficient, but NEITHER statement alone is sufficient.',
  'EACH statement ALONE is sufficient.',
  'Statements (1) and (2) TOGETHER are still NOT sufficient.'
];
export const DS_LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** The choice (0..4) from the three judgements. */
export function dsChoiceIndex(alone1, alone2, both) {
  if (alone1 && alone2) return 3;
  if (alone1) return 0;
  if (alone2) return 1;
  return both ? 2 : 4;
}

/** One answer left, and it is a real answer (null marks "cannot be told in this world"). */
export const settled = (answers) => answers.length === 1 && answers[0] !== null;

/** The choice from the answer sets of a problem: { one, two, both } lists of possible answers. */
export function verdict(sets) {
  return dsChoiceIndex(settled(sets.one), settled(sets.two), settled(sets.both));
}

const key = (v) => JSON.stringify(v);
/** Distinct values, in a fixed order. */
export function distinct(values) {
  const seen = new Map();
  for (const v of values) if (!seen.has(key(v))) seen.set(key(v), v);
  return [...seen.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, v]) => v);
}

/**
 * The generic method: worlds, two statement tests and the asked value.
 * Returns the distinct answers with no statement, each alone and both.
 */
export function answerSets(worlds, holds1, holds2, ask) {
  const read = (list) => distinct(list.map(ask));
  const w1 = worlds.filter(holds1);
  const w2 = worlds.filter(holds2);
  return { none: read(worlds), one: read(w1), two: read(w2), both: read(w1.filter(holds2)), counts: { none: worlds.length, one: w1.length, two: w2.length, both: w1.filter(holds2).length } };
}

/** A problem is fair when no combination is a contradiction (every one leaves some world). */
export const consistent = (sets) => sets.counts.none > 0 && sets.counts.one > 0 && sets.counts.two > 0 && sets.counts.both > 0;

/* ------------------------------ arrangements ------------------------------ */

/**
 * An arrangement problem: { layout: 'row' | 'circle', setting: 'row' | 'floors' | 'days' | 'circle',
 * people, base: [clue], one: [clue], two: [clue], ask }, clues as in seating.js.
 * In a row, seat 0 is the left end, the ground floor or the first day.
 * Asks:
 *   { q: 'at', seat }               who is in that seat (0-based)
 *   { q: 'pos', p }                 p's seat, counted from 1 (left end / floor / day)
 *   { q: 'side', p, side, k }       who is k-th to p's side (circle; in a row, null off the end)
 *   { q: 'opp', p }                 who sits opposite p (circle of an even number)
 *   { q: 'gap', p, r }              how many sit between p and r (row)
 *   { q: 'yes', clue }              does the clue hold? 'Yes' or 'No'
 */
const puzzleOf = (problem) => ({ layout: problem.layout, people: problem.people });

function askDirect(puzzle, arrangement, ask) {
  const n = arrangement.seats.length;
  const where = arrangement.seats.indexOf.bind(arrangement.seats);
  switch (ask.q) {
    case 'at':
      return arrangement.seats[ask.seat];
    case 'pos':
      return where(ask.p) + 1;
    case 'side': {
      for (let r = 0; r < n; r++) if (r !== ask.p && clueHolds(puzzle, arrangement, { t: 'side', p: r, q: ask.p, side: ask.side, k: ask.k })) return r;
      return null;
    }
    case 'opp':
      return arrangement.seats[(where(ask.p) + n / 2) % n];
    case 'gap':
      return Math.abs(where(ask.p) - where(ask.r)) - 1;
    case 'yes':
      return clueHolds(puzzle, arrangement, ask.clue) ? 'Yes' : 'No';
    default:
      throw new Error(`unknown ask ${ask.q}`);
  }
}

/** The same asks, read only through the geometric clue reader. */
function askGeometric(puzzle, arrangement, ask) {
  const n = arrangement.seats.length;
  const people = Array.from({ length: n }, (_, i) => i);
  const holds = (clue) => clueHoldsGeometric(puzzle, arrangement, clue);
  switch (ask.q) {
    case 'at':
      return people.find((r) => holds({ t: 'pos', p: r, k: ask.seat + 1, from: 'left' }));
    case 'pos':
      return people.map((_, k) => k + 1).find((k) => holds({ t: 'pos', p: ask.p, k, from: 'left' }));
    case 'side':
      return people.find((r) => r !== ask.p && holds({ t: 'side', p: r, q: ask.p, side: ask.side, k: ask.k })) ?? null;
    case 'opp':
      return people.find((r) => r !== ask.p && holds({ t: 'opp', p: r, q: ask.p }));
    case 'gap':
      return people.map((_, k) => k).find((k) => holds({ t: 'gap', p: ask.p, q: ask.r, k }));
    case 'yes':
      return holds(ask.clue) ? 'Yes' : 'No';
    default:
      throw new Error(`unknown ask ${ask.q}`);
  }
}

/** Method A: the step-table reading of every clue. */
export function arrangementSets(problem) {
  const puzzle = puzzleOf(problem);
  const all = (clues) => (a) => clues.every((c) => clueHolds(puzzle, a, c));
  const worlds = allArrangements(puzzle).filter(all(problem.base || []));
  return answerSets(worlds, all(problem.one), all(problem.two), (a) => askDirect(puzzle, a, problem.ask));
}

/** Method B: the geometric reading of every clue and of the question. */
export function arrangementSetsGeometric(problem) {
  const puzzle = puzzleOf(problem);
  const all = (clues) => (a) => clues.every((c) => clueHoldsGeometric(puzzle, a, c));
  const worlds = allArrangements(puzzle).filter(all(problem.base || []));
  return answerSets(worlds, all(problem.one), all(problem.two), (a) => askGeometric(puzzle, a, problem.ask));
}

/** The arrangements left by some statements (for the simulation's picture). */
export function arrangementsLeft(problem, { one = false, two = false } = {}) {
  const puzzle = puzzleOf(problem);
  const clues = [...(problem.base || []), ...(one ? problem.one : []), ...(two ? problem.two : [])];
  return allArrangements(puzzle).filter((a) => clues.every((c) => clueHolds(puzzle, a, c)));
}

export { askDirect as arrangementAnswer };

/* ------------------------------ ranking ------------------------------ */

/**
 * A ranking problem: { people: [names], base: [{ more: [a, b] }], one, two, ask }.
 * { more: [a, b] }: a has more (is taller, scored more...) than b. Asks:
 *   { q: 'kth', k }        who is k-th from the top (1 = most)
 *   { q: 'rank', p }       p's place from the top
 *   { q: 'more', a, b }    does a have more than b? 'Yes' or 'No'
 */
function askOrder(order, ask) {
  if (ask.q === 'kth') return order[ask.k - 1];
  if (ask.q === 'rank') return order.indexOf(ask.p) + 1;
  if (ask.q === 'more') return order.indexOf(ask.a) < order.indexOf(ask.b) ? 'Yes' : 'No';
  throw new Error(`unknown ask ${ask.q}`);
}

/** Method A: every order of the people that fits the comparisons. */
export function rankingSets(problem) {
  const n = problem.people.length;
  const fits = (facts) => (order) => facts.every((f) => order.indexOf(f.more[0]) < order.indexOf(f.more[1]));
  const worlds = solveComparisons(n, problem.base || []);
  return answerSets(worlds, fits(problem.one), fits(problem.two), (order) => askOrder(order, problem.ask));
}

/** Who is surely above whom: above[x] = everyone who must have more than x. */
export function surelyAbove(n, facts) {
  const above = Array.from({ length: n }, () => new Set());
  for (const f of facts) above[f.more[1]].add(f.more[0]);
  let changed = true;
  while (changed) {
    changed = false;
    for (let x = 0; x < n; x++) for (const y of [...above[x]]) for (const z of above[y]) if (!above[x].has(z)) {
      above[x].add(z);
      changed = true;
    }
  }
  return above;
}

/** The places p can take: from (surely above + 1) to (n − surely below). */
export function placeRange(n, above, p) {
  const below = above.filter((set) => set.has(p)).length;
  return [above[p].size + 1, n - below];
}

function answersByClosure(n, facts, ask) {
  const above = surelyAbove(n, facts);
  // A cycle (a > b > a) means the comparisons contradict each other.
  if (above.some((set, x) => set.has(x))) return [];
  const people = Array.from({ length: n }, (_, i) => i);
  if (ask.q === 'kth') {
    return distinct(people.filter((x) => {
      const [lo, hi] = placeRange(n, above, x);
      return lo <= ask.k && ask.k <= hi;
    }));
  }
  if (ask.q === 'rank') {
    const [lo, hi] = placeRange(n, above, ask.p);
    return distinct(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i));
  }
  if (above[ask.b].has(ask.a)) return ['Yes'];
  if (above[ask.a].has(ask.b)) return ['No'];
  return ['No', 'Yes'];
}

/** Method B: no orders listed at all, only the chains of comparisons. */
export function rankingSetsByClosure(problem) {
  const n = problem.people.length;
  const base = problem.base || [];
  return {
    none: answersByClosure(n, base, problem.ask),
    one: answersByClosure(n, [...base, ...problem.one], problem.ask),
    two: answersByClosure(n, [...base, ...problem.two], problem.ask),
    both: answersByClosure(n, [...base, ...problem.one, ...problem.two], problem.ask)
  };
}

/* ------------------------------ relations ------------------------------ */

/**
 * A relation problem: { n, people, base: [statement], one, two, ask: { x, y } }, statements as in
 * family.js ({ a, rel, b }: a is the rel of b). The answer is how x is related to y, or null when
 * the statements do not tie them together or leave x's gender open ("son or daughter").
 */
function relationAnswer(read, n, statements, ask) {
  const relation = read(buildFamily(n, statements), ask.x, ask.y);
  return relation && !relation.includes(' or ') ? relation : null;
}

function relationSetsWith(read, problem) {
  const base = problem.base || [];
  const at = (extra) => [relationAnswer(read, problem.n, [...base, ...extra], problem.ask)];
  // The statements are facts about one family, so no combination is empty.
  return { none: at([]), one: at(problem.one), two: at(problem.two), both: at([...problem.one, ...problem.two]), counts: { none: 1, one: 1, two: 1, both: 1 } };
}

export const relationSets = (problem) => relationSetsWith(relationByStructure, problem);
export const relationSetsByPath = (problem) => relationSetsWith(relationByPath, problem);

/** The relation (or "x or y" phrase) the statements give, for explanations. */
export function relationPhrase(problem, statements) {
  return relationByStructure(buildFamily(problem.n, [...(problem.base || []), ...statements]), problem.ask.x, problem.ask.y);
}

/* ------------------------------ directions ------------------------------ */

/**
 * A direction problem: { starts: ['north', 'east', ...], steps, one: [fact], two: [fact], ask }.
 * `starts` are the directions the walker may have started facing (the question does not say which);
 * a step `{ turn: '?', go }` is a 90° turn whose side (left or right) is not given.
 * Facts about a world:
 *   { t: 'start', dir }      the walker started facing dir
 *   { t: 'leg', i, dir }     the i-th walk (from 0) was towards dir
 *   { t: 'end', dir }        at the end the walker faced dir
 *   { t: 'where', dir }      the end point lies dir of the start (north-east and so on)
 *   { t: 'turn', i, side }   the i-th unknown turn was to that side
 * Asks: { q: 'where' } the end point's direction from the start; { q: 'facing' } the final facing.
 */
export function directionWorlds(problem) {
  const unknown = problem.steps.filter((s) => s.turn === '?').length;
  const worlds = [];
  for (const start of problem.starts) {
    for (let mask = 0; mask < 2 ** unknown; mask++) {
      const sides = Array.from({ length: unknown }, (_, i) => ((mask >> i) & 1 ? 'right' : 'left'));
      let u = 0;
      const steps = problem.steps.map((s) => (s.turn === '?' ? { ...s, turn: sides[u++] } : s));
      worlds.push({ start, sides, route: { start, steps } });
    }
  }
  return worlds;
}

/** Method A reads a world with the direction table. */
function directionFactA(world, fact) {
  if (fact.t === 'start') return world.start === fact.dir;
  if (fact.t === 'turn') return world.sides[fact.i] === fact.side;
  const walk = walkRoute(world.route);
  if (fact.t === 'end') return DIRS[walk.facing] === fact.dir;
  if (fact.t === 'where') return directionOf(walk.x, walk.y) === fact.dir;
  if (fact.t === 'leg') {
    const [x0, y0] = walk.points[fact.i];
    const [x1, y1] = walk.points[fact.i + 1];
    return directionOf(x1 - x0, y1 - y0) === fact.dir;
  }
  throw new Error(`unknown fact ${fact.t}`);
}

/** Method B: complex numbers, the angle reader, and the route cut short for a leg. */
function legsComplex(route) {
  const ends = [[0, 0]];
  route.steps.forEach((step, i) => {
    if (!step.go) return;
    const at = walkRouteComplex({ start: route.start, steps: route.steps.slice(0, i + 1) });
    ends.push([at.x, at.y]);
  });
  return ends;
}
function directionFactB(world, fact) {
  if (fact.t === 'start') return world.route.start === fact.dir;
  if (fact.t === 'turn') return world.sides[fact.i] === fact.side;
  const walk = walkRouteComplex(world.route);
  if (fact.t === 'end') return DIRS[walk.facing] === fact.dir;
  if (fact.t === 'where') return directionByAngle(walk.x, walk.y) === fact.dir;
  if (fact.t === 'leg') {
    const ends = legsComplex(world.route);
    return directionByAngle(ends[fact.i + 1][0] - ends[fact.i][0], ends[fact.i + 1][1] - ends[fact.i][1]) === fact.dir;
  }
  throw new Error(`unknown fact ${fact.t}`);
}

function directionSetsWith(problem, holds, ask) {
  const all = (facts) => (w) => facts.every((f) => holds(w, f));
  return answerSets(directionWorlds(problem).filter(all(problem.base || [])), all(problem.one), all(problem.two), ask);
}

export function directionSets(problem) {
  return directionSetsWith(problem, directionFactA, (w) => {
    const walk = walkRoute(w.route);
    return problem.ask.q === 'facing' ? DIRS[walk.facing] : directionOf(walk.x, walk.y);
  });
}

export function directionSetsComplex(problem) {
  return directionSetsWith(problem, directionFactB, (w) => {
    const walk = walkRouteComplex(w.route);
    return problem.ask.q === 'facing' ? DIRS[walk.facing] : directionByAngle(walk.x, walk.y);
  });
}

/* ------------------------------ one entry point ------------------------------ */

/** Both methods for any problem ({ kind: 'arrangement' | 'ranking' | 'relation' | 'direction', ... }). */
export function solveBothWays(problem) {
  switch (problem.kind) {
    case 'arrangement':
      return [arrangementSets(problem), arrangementSetsGeometric(problem)];
    case 'ranking':
      return [rankingSets(problem), rankingSetsByClosure(problem)];
    case 'relation':
      return [relationSets(problem), relationSetsByPath(problem)];
    case 'direction':
      return [directionSets(problem), directionSetsComplex(problem)];
    default:
      throw new Error(`unknown problem kind ${problem.kind}`);
  }
}

const sameSets = (a, b) => ['one', 'two', 'both'].every((k) => key(distinct(a[k])) === key(distinct(b[k])));

/** The DS choice (0..4) found the first way, or null when the second way disagrees anywhere. */
export function checkedChoice(problem) {
  const [a, b] = solveBothWays(problem);
  if (!sameSets(a, b)) return null;
  return verdict(a);
}

/** The DS choice by the first method only. */
export function choiceOf(problem) {
  return verdict(solveBothWays(problem)[0]);
}

/** The DS choice by the second method only. */
export function choiceBySecondMethod(problem) {
  return verdict(solveBothWays(problem)[1]);
}

/* ------------------------------ sentences ------------------------------ */

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
const floorName = (k) => `${seatOrdinal(k)} floor`;

/**
 * An arrangement clue as a sentence for its setting: 'row' and 'circle' use the seating
 * sentences; 'floors' (seat 0 = the first floor, at the bottom) and 'days' (seat 0 = Monday,
 * each person's lecture on one day) have their own.
 */
export function arrangementClueText(problem, clue) {
  const { setting, people } = problem;
  if (setting === 'row' || setting === 'circle') return clueText({ layout: problem.layout, people }, clue);
  const n = people.length;
  const P = people[clue.p];
  const Q = clue.q === undefined ? '' : people[clue.q];
  const seatOfClue = clue.t === 'pos' ? (clue.from === 'left' ? clue.k - 1 : n - clue.k) : null;
  if (setting === 'floors') {
    switch (clue.t) {
      case 'pos':
        return seatOfClue === n - 1 ? `${P} lives on the top floor.` : seatOfClue === 0 ? `${P} lives on the bottom floor.` : `${P} lives on the ${floorName(seatOfClue + 1)}.`;
      case 'end':
        return `${P} lives on either the top floor or the bottom floor.`;
      case 'notEnd':
        return `${P} lives on neither the top floor nor the bottom floor.`;
      case 'side':
        return clue.k === 1 ? `${P} lives immediately ${clue.side === 'right' ? 'above' : 'below'} ${Q}.` : `${P} lives ${NUMBER_WORDS[clue.k]} floors ${clue.side === 'right' ? 'above' : 'below'} ${Q}.`;
      case 'adj':
        return `${P} and ${Q} live on adjacent floors.`;
      case 'notAdj':
        return `${P} and ${Q} do not live on adjacent floors.`;
      case 'gap':
        return clue.k === 0 ? `No one lives between ${P} and ${Q}.` : clue.k === 1 ? `Only one person lives between ${P} and ${Q}.` : `Exactly ${clue.k} people live between ${P} and ${Q}.`;
      default:
        throw new Error(`no floors sentence for ${clue.t}`);
    }
  }
  if (setting === 'days') {
    switch (clue.t) {
      case 'pos':
        return `${P}’s lecture is on ${DAYS[seatOfClue]}.`;
      case 'end':
        return `${P}’s lecture is on either ${DAYS[0]} or ${DAYS[n - 1]}.`;
      case 'notEnd':
        return `${P}’s lecture is on neither ${DAYS[0]} nor ${DAYS[n - 1]}.`;
      case 'side':
        return clue.k === 1
          ? `${P}’s lecture is on the day immediately ${clue.side === 'right' ? 'after' : 'before'} ${Q}’s.`
          : `${P}’s lecture is ${NUMBER_WORDS[clue.k]} days ${clue.side === 'right' ? 'after' : 'before'} ${Q}’s.`;
      case 'adj':
        return `${P} and ${Q} lecture on consecutive days.`;
      case 'notAdj':
        return `${P} and ${Q} do not lecture on consecutive days.`;
      case 'gap':
        return clue.k === 0 ? `${P} and ${Q} lecture on consecutive days.` : clue.k === 1 ? `Only one lecture falls between ${P}’s and ${Q}’s.` : `Exactly ${clue.k} lectures fall between ${P}’s and ${Q}’s.`;
      default:
        throw new Error(`no days sentence for ${clue.t}`);
    }
  }
  throw new Error(`unknown setting ${setting}`);
}

/** The question asked, as a sentence. */
export function arrangementAskText(problem) {
  const { setting, people, ask } = problem;
  const n = people.length;
  const P = people[ask.p];
  if (ask.q === 'at') {
    if (setting === 'floors') return ask.seat === n - 1 ? 'Who lives on the top floor?' : ask.seat === 0 ? 'Who lives on the bottom floor?' : `Who lives on the ${floorName(ask.seat + 1)}?`;
    if (setting === 'days') return `Whose lecture is on ${DAYS[ask.seat]}?`;
    if (ask.seat === 0) return 'Who sits at the extreme left end of the row?';
    if (ask.seat === n - 1) return 'Who sits at the extreme right end of the row?';
    if (n % 2 && ask.seat === (n - 1) / 2) return 'Who sits exactly in the middle of the row?';
    return `Who sits ${seatOrdinal(ask.seat + 1)} from the left end of the row?`;
  }
  if (ask.q === 'pos') {
    if (setting === 'floors') return `On which floor does ${P} live?`;
    if (setting === 'days') return `On which day is ${P}’s lecture?`;
    return `What is ${P}’s position from the left end of the row?`;
  }
  if (ask.q === 'side') {
    if (setting === 'floors') return `Who lives immediately ${ask.side === 'right' ? 'above' : 'below'} ${P}?`;
    return ask.k === 1 ? `Who sits immediately to the ${ask.side} of ${P}?` : `Who sits ${seatOrdinal(ask.k)} to the ${ask.side} of ${P}?`;
  }
  if (ask.q === 'opp') return `Who sits opposite ${P}?`;
  if (ask.q === 'gap') return `How many people sit between ${P} and ${people[ask.r]}?`;
  if (ask.q === 'yes') {
    const c = ask.clue;
    const Q = people[c.q];
    if (c.t === 'end') return setting === 'floors' ? `Does ${people[c.p]} live on the top or the bottom floor?` : `Does ${people[c.p]} sit at an end of the row?`;
    if (c.t === 'adj') return setting === 'floors' ? `Do ${people[c.p]} and ${Q} live on adjacent floors?` : `Is ${people[c.p]} an immediate neighbour of ${Q}?`;
    if (c.t === 'side') return `Does ${people[c.p]} sit immediately to the ${c.side} of ${Q}?`;
  }
  throw new Error(`no question text for ${ask.q}`);
}

/** How a value of the asked thing is written (a name, a floor, a day, a number, Yes or No). */
export function arrangementValueText(problem, value) {
  if (value === null || value === undefined) return 'no one';
  if (['at', 'side', 'opp'].includes(problem.ask.q)) return problem.people[value];
  if (problem.ask.q === 'pos') return problem.setting === 'floors' ? floorName(value) : problem.setting === 'days' ? DAYS[value - 1] : seatOrdinal(value);
  return String(value);
}

/** "Comparisons" as sentences: { more: [a, b] } with a quality { more, less }. */
export function comparisonText(people, fact, quality, flipped = false) {
  const [a, b] = fact.more;
  return flipped ? `${people[b]} is ${quality.less} than ${people[a]}.` : `${people[a]} is ${quality.more} than ${people[b]}.`;
}

export function rankingAskText(problem, quality) {
  const { ask, people } = problem;
  const n = people.length;
  if (ask.q === 'kth') return ask.k === 1 ? `Who is the ${quality.most}?` : ask.k === n ? `Who is the ${quality.least}?` : `Who is the ${seatOrdinal(ask.k)} ${quality.most}?`;
  if (ask.q === 'rank') return `What is ${people[ask.p]}’s place, counting from the ${quality.most}?`;
  return `Is ${people[ask.a]} ${quality.more} than ${people[ask.b]}?`;
}

/** A direction fact as a sentence about the walker. */
export function directionFactText(name, fact, pronoun = 'he') {
  const P = pronoun.charAt(0).toUpperCase() + pronoun.slice(1);
  if (fact.t === 'start') return `${name} started out facing ${fact.dir}.`;
  if (fact.t === 'leg') return `${P} walked the ${['first', 'second', 'third', 'fourth'][fact.i]} stretch towards the ${fact.dir}.`;
  if (fact.t === 'end') return `At the end ${pronoun} was facing ${fact.dir}.`;
  if (fact.t === 'where') return `${P} finished to the ${fact.dir} of ${pronoun === 'she' ? 'her' : 'his'} starting point.`;
  if (fact.t === 'turn') return `${P} turned ${fact.side} ${fact.i === 0 ? 'the first time' : 'the second time'}.`;
  throw new Error(`unknown fact ${fact.t}`);
}
