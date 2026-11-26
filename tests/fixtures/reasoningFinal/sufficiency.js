/**
 * The hand-written questions of reasoning data sufficiency, in structured form.
 *
 * PROBLEMS holds each question as data (src/utils/reasoning/sufficiency.js has
 * the shapes): the worlds the question allows, the two statements and what is
 * asked. Each entry of `sets` has
 *   id       the question
 *   texts    sentences built from the structure (with the same functions the
 *            generators use) that must appear, in this order, in the question's
 *            context and text
 *   answer   the keyed answer worked out by brute force; for a DS question the
 *            choice must also come out the same by the second method
 *            (checkedChoice throws otherwise)
 */

import {
  DS_CHOICES,
  arrangementAskText,
  arrangementClueText,
  arrangementSets,
  arrangementSetsGeometric,
  checkedChoice,
  comparisonText,
  directionFactText,
  directionSets,
  directionSetsComplex,
  rankingAskText,
  rankingSets,
  rankingSetsByClosure,
  settled
} from '../../../src/utils/reasoning/sufficiency.js';

const more = (a, b) => ({ more: [a, b] });
const pos = (p, k, from = 'left') => ({ t: 'pos', p, k, from });
const side = (p, q, s, k = 1) => ({ t: 'side', p, q, side: s, k });
const ARR = (setting, people, base, one, two, ask) => ({ kind: 'arrangement', layout: setting === 'circle' ? 'circle' : 'row', setting, people, base, one, two, ask });
const RANK = (people, base, one, two, ask) => ({ kind: 'ranking', people, base, one, two, ask });
const REL = (people, base, one, two, ask) => ({ kind: 'relation', n: people.length, people, base, one, two, ask });
const COMPASS = ['north', 'east', 'south', 'west'];
const DIR = (walker, steps, one, two, ask) => ({ kind: 'direction', starts: COMPASS, steps, base: [], one, two, ask, ...walker });

export const OLDER = { more: 'older', less: 'younger', most: 'oldest', least: 'youngest' };
export const TALLER = { more: 'taller', less: 'shorter', most: 'tallest', least: 'shortest' };
export const HEAVIER = { more: 'heavier', less: 'lighter', most: 'heaviest', least: 'lightest' };

const id = (n) => `reasoning-data-sufficiency-q-${String(n).padStart(3, '0')}`;

/** Every hand-written question's structure, by number. */
export const PROBLEMS = {
  // Easy
  1: { ...RANK(['Arjun', 'Bina', 'Charu', 'Dev'], [], [more(0, 1), more(0, 2)], [more(3, 0)], { q: 'kth', k: 1 }), quality: TALLER },
  2: ARR('row', ['Esha', 'Farhan', 'Gauri', 'Hari'], [], [side(0, 1, 'left')], [], { q: 'at', seat: 3 }),
  3: ARR('floors', ['Jatin', 'Kavya', 'Lata', 'Mohan'], [], [side(1, 0, 'right'), pos(0, 3)], [pos(2, 1)], { q: 'at', seat: 3 }),
  4: { ...RANK(['Neha', 'Om', 'Priya', 'Ravi'], [more(0, 1)], [more(2, 1)], [more(3, 0), more(3, 2)], { q: 'kth', k: 1 }), quality: OLDER },
  5: REL(['P', 'Q', 'R'], [], [{ a: 0, rel: 'child', b: 2 }], [{ a: 2, rel: 'father', b: 1 }], { x: 0, y: 1 }),
  6: DIR({ name: 'Kiran', pronoun: 'he' }, [{ go: 5 }, { turn: 'left', go: 3 }], [{ t: 'start', dir: 'north' }], [{ t: 'end', dir: 'west' }], { q: 'where' }),
  7: ARR('row', ['Meena', 'Nikhil', 'Om', 'Pallavi'], [], [{ t: 'end', p: 0 }, side(1, 0, 'right')], [], { q: 'at', seat: 0 }),
  // Medium
  8: ARR('days', ['Sunita', 'Tarun', 'Usha', 'Vinod', 'Waseem'], [pos(1, 2)], [side(0, 1, 'right', 2)], [side(0, 4, 'left'), pos(4, 5)], { q: 'pos', p: 0 }),
  9: ARR('row', ['Aditi', 'Bhuvan', 'Chandra', 'Deepak', 'Eswar'], [pos(2, 3)], [side(0, 2, 'left')], [{ t: 'end', p: 3 }, { t: 'adj', p: 3, q: 0 }], { q: 'at', seat: 0 }),
  10: {
    kind: 'ranking-mc',
    people: ['Faiz', 'Gita', 'Hema', 'Irfan'],
    quality: OLDER,
    base: [more(0, 1)],
    facts: [more(2, 0), more(0, 3)],
    options: [{ q: 'kth', k: 1 }, { q: 'kth', k: 2 }, { q: 'kth', k: 4 }, { q: 'more', a: 1, b: 3 }, { q: 'more', a: 2, b: 3 }]
  },
  11: REL(['K', 'M', 'N'], [], [{ a: 1, rel: 'wife', b: 0 }, { a: 0, rel: 'son', b: 2 }], [{ a: 2, rel: 'mother', b: 0 }], { x: 1, y: 2 }),
  12: DIR({ name: 'Pooja', pronoun: 'she' }, [{ go: 6 }, { turn: '?', go: 4 }], [{ t: 'start', dir: 'east' }], [{ t: 'leg', i: 1, dir: 'north' }], { q: 'facing' }),
  13: { ...RANK(['Tara', 'Uma', 'Varsha', 'Yash'], [], [more(1, 2), more(2, 0)], [more(3, 0)], { q: 'more', a: 0, b: 1 }), quality: OLDER },
  14: {
    ...ARR('row', ['Kunal', 'Lakshmi', 'Manoj', 'Nandini'], [{ t: 'notEnd', p: 2 }], [], [], { q: 'at', seat: 0 }),
    kind: 'arrangement-mc',
    candidates: [[side(2, 0, 'right'), { t: 'end', p: 0 }], [{ t: 'adj', p: 1, q: 3 }], [side(3, 2, 'right', 2)], [side(1, 2, 'left', 2)]]
  },
  // Complex
  15: ARR('circle', ['Anand', 'Bharti', 'Chirag', 'Divya', 'Eknath', 'Fatima'], [{ t: 'opp', p: 0, q: 3 }], [side(1, 0, 'right')], [{ t: 'adj', p: 4, q: 0 }], { q: 'opp', p: 1 }),
  16: ARR('floors', ['Gopal', 'Hina', 'Ishaan', 'Jaya', 'Kiran'], [{ t: 'notEnd', p: 0 }], [side(0, 2, 'left'), side(2, 4, 'left', 2)], [{ t: 'gap', p: 0, q: 4, k: 2 }, side(4, 1, 'right')], { q: 'at', seat: 4 }),
  17: { ...RANK(['Lalit', 'Madhu', 'Nirmal', 'Oviya', 'Pranav'], [more(0, 1), more(2, 3)], [more(1, 2)], [more(4, 0)], { q: 'kth', k: 3 }), quality: HEAVIER },
  18: REL(['A', 'B', 'C', 'D'], [], [{ a: 0, rel: 'father', b: 1 }, { a: 1, rel: 'sister', b: 2 }], [{ a: 2, rel: 'mother', b: 3 }], { x: 0, y: 3 }),
  19: DIR({ name: 'Suresh', pronoun: 'he' }, [{ go: 4 }, { turn: '?', go: 3 }, { turn: '?', go: 4 }], [{ t: 'start', dir: 'north' }], [{ t: 'end', dir: 'south' }], { q: 'where' }),
  20: DIR({ name: 'Rekha', pronoun: 'she' }, [{ go: 7 }, { turn: '?', go: 2 }, { turn: '?', go: 3 }], [{ t: 'start', dir: 'north' }], [], { q: 'where' }),
  21: ARR('row', ['Imran', 'Jyoti', 'Karan', 'Leela', 'Mahesh'], [pos(1, 2)], [{ t: 'adj', p: 0, q: 1 }, { t: 'notAdj', p: 0, q: 2 }], [side(0, 3, 'right', 2)], { q: 'yes', clue: { t: 'end', p: 0 } })
};

/* ------------------------------ sentences ------------------------------ */

/** The statement sentences of a problem (or of any list of its facts). */
export function say(problem, facts) {
  if (problem.kind.startsWith('arrangement')) return facts.map((c) => arrangementClueText(problem, c));
  if (problem.kind.startsWith('ranking')) return facts.map((f) => comparisonText(problem.people, f, problem.quality));
  if (problem.kind === 'relation') return facts.map(({ a, rel, b }) => `${problem.people[a]} is the ${rel} of ${problem.people[b]}.`);
  return facts.map((f) => directionFactText(problem.name, f, problem.pronoun));
}

/** The question asked (for a ranking, with the problem's own quality). */
export function askText(problem, ask = problem.ask) {
  if (problem.kind.startsWith('arrangement')) return arrangementAskText({ ...problem, ask });
  if (problem.kind.startsWith('ranking')) return rankingAskText({ ...problem, ask }, problem.quality);
  return null;
}

/** The texts a DS question must contain: what is given, the question, then (1) and (2). */
function dsTexts(problem) {
  return [...say(problem, problem.base), ...(askText(problem) ? [askText(problem)] : []), ...say(problem, problem.one), ...say(problem, problem.two)];
}

/* ------------------------------ answers ------------------------------ */

/** The DS choice, by brute force, checked by the second method. */
export function dsAnswer(problem) {
  const choice = checkedChoice(problem);
  if (choice === null) throw new Error('the two methods disagree');
  return DS_CHOICES[choice];
}

/** Possible answers with statement (1) alone, the same both ways. */
function possibleWithOne(problem) {
  const [a, b] =
    problem.kind === 'arrangement' ? [arrangementSets(problem), arrangementSetsGeometric(problem)] : [directionSets(problem), directionSetsComplex(problem)];
  if (JSON.stringify(a.one) !== JSON.stringify(b.one)) throw new Error('the two methods disagree');
  return a;
}

export const Q7_OPTIONS = [
  'Yes: every seating it leaves has Meena at the left end.',
  'No: it leaves two seatings, so it cannot be sufficient.',
  'No: Nikhil could also sit at the left end.',
  'Yes, because it fixes the whole row.'
];

/** Which questions the facts settle (ranking, multiple choice), both ways. */
function rankingSettles(problem) {
  return problem.options.filter((ask) => {
    const p = { kind: 'ranking', people: problem.people, base: [...problem.base, ...problem.facts], one: [], two: [], ask };
    const a = settled(rankingSets(p).none);
    if (a !== settled(rankingSetsByClosure(p).none)) throw new Error('the two methods disagree');
    return a;
  });
}

/** Which candidate statements alone settle the question (arrangement, multiple choice), both ways. */
function candidatesThatSettle(problem) {
  return problem.candidates.filter((clues) => {
    const p = { ...problem, kind: 'arrangement', one: clues, two: clues };
    const a = settled(arrangementSets(p).one);
    if (a !== settled(arrangementSetsGeometric(p).one)) throw new Error('the two methods disagree');
    return a;
  });
}

const P = PROBLEMS;
const DS = [1, 3, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 17, 18, 19, 21];

export const sets = [
  ...DS.map((n) => ({ id: id(n), texts: dsTexts(P[n]), answer: () => dsAnswer(P[n]) })),
  { id: id(2), texts: [...say(P[2], P[2].one), askText(P[2])], answer: () => possibleWithOne(P[2]).one.length },
  {
    id: id(7),
    texts: [askText(P[7]), ...say(P[7], P[7].one)],
    answer: () => {
      const sets1 = possibleWithOne(P[7]);
      if (!settled(sets1.one)) return Q7_OPTIONS[1];
      return sets1.counts.one > 1 ? Q7_OPTIONS[0] : Q7_OPTIONS[3];
    }
  },
  {
    id: id(10),
    texts: [...say(P[10], P[10].base), ...say(P[10], P[10].facts)],
    answer: () => rankingSettles(P[10]).map((ask) => askText(P[10], ask))
  },
  {
    id: id(14),
    texts: [...say(P[14], P[14].base), askText(P[14])],
    answer: () => candidatesThatSettle(P[14]).map((clues) => say(P[14], clues).join(' '))
  },
  { id: id(20), texts: say(P[20], P[20].one), answer: () => possibleWithOne(P[20]).one.length }
];
