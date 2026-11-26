/**
 * The hand-written questions of the second reasoning batch (direction sense,
 * coding-decoding, order and ranking, cubes and dice, mirror images and paper
 * folding), in structured form.
 *
 * Each entry has
 *   id       the question
 *   texts    phrases built from the structure (with the same functions the
 *            generators use) that must appear, in this order, in the question's
 *            context and text, so the printed question is the one solved here
 *   answer   works the answer out from the structure, by brute force or exact
 *            computation (an option's text, a number, or a list of option texts
 *            for multiple choice); tests/reasoning-more-content.test.js compares
 *            it with the keyed answer
 *   figure   (optional) the figure the question must carry
 */

import { DIRS, directionOf, facingFromShadowBrute, stepText, walkRouteComplex } from '../../src/utils/reasoning/direction.js';
import { codesFor, numberCodeByTable, opposite, pos, shiftLetter, solveSentences, wordsFor, ALPHABET, NUMBER_KINDS } from '../../src/utils/reasoning/coding.js';
import { countBetween, countFrom, layOut, ordinal, orderByChaining, solveComparisons, solveRow } from '../../src/utils/reasoning/ranking.js';
import { netOppositesByRolling, oppositeOfByVectors, paintedCounts, solveDiceByVectors } from '../../src/utils/reasoning/cubes.js';
import {
  holesByReflection,
  looksSameInMirrorByGlyphs,
  looksSameInWaterByGlyphs,
  mirrorSymmetric,
  mirrorTimeByHands,
  timeText,
  waterSymmetric
} from '../../src/utils/reasoning/mirror.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** One value, or an error if the solutions disagree. */
export function only(values) {
  const set = new Set(values.map((v) => JSON.stringify(v)));
  if (!values.length) throw new Error('no solution at all');
  if (set.size !== 1) throw new Error(`answer differs between solutions: ${[...set].join(' | ')}`);
  return values[0];
}

/* ------------------------------ direction sense ------------------------------ */

const route = (start, steps, verb = 'walks') => ({ start, steps, verb });
const routeTexts = (r) => r.steps.map((s) => stepText(s, 'km', r.verb));
const facingOf = (r) => cap(DIRS[walkRouteComplex(r).facing]);
const distanceOf = (r) => {
  const { x, y } = walkRouteComplex(r);
  return Math.sqrt(x * x + y * y);
};
const whereOf = (r) => {
  const { x, y } = walkRouteComplex(r);
  return cap(directionOf(x, y));
};

const D1 = route('north', [{ turn: 'right' }, { turn: 'right' }, { turn: 'left' }]);
const D2 = route('west', [{ rot: 'cw', deg: 135 }]);
const D3 = route('north', [{ head: 'north', go: 6 }, { turn: 'right', go: 8 }]);
const D5 = route('south', [{ head: 'south', go: 5 }, { turn: 'left', go: 3 }]);
const D6 = route('south-east', [{ rot: 'cw', deg: 90 }]);
const D8 = route('east', [{ head: 'east', go: 9 }, { turn: 'left', go: 5 }, { turn: 'left', go: 3 }, { turn: 'right', go: 3 }]);
const D9 = route('west', [{ head: 'west', go: 4 }, { turn: 'right', go: 6 }, { turn: 'right', go: 9 }, { turn: 'right', go: 2 }]);
const D10 = route('north', [{ head: 'north', go: 12 }, { turn: 'back', go: 7 }, { turn: 'left', go: 12 }]);
const D11 = route('north', [{ rot: 'cw', deg: 90 }, { rot: 'acw', deg: 225 }, { rot: 'cw', deg: 45 }]);
const D14 = {
  Left: route('north', [{ turn: 'left' }]),
  'Right, right and right again': route('north', [{ turn: 'right' }, { turn: 'right' }, { turn: 'right' }]),
  'An about turn, then left': route('north', [{ turn: 'back' }, { turn: 'left' }]),
  '135° clockwise, then 45° clockwise': route('north', [{ rot: 'cw', deg: 135 }, { rot: 'cw', deg: 45 }]),
  '45° anticlockwise, twice': route('north', [{ rot: 'acw', deg: 45 }, { rot: 'acw', deg: 45 }])
};
const D15 = route('north', [{ head: 'north', go: 3 }, { turn: 'right', go: 2 }, { turn: 'right', go: 7 }, { turn: 'left', go: 4 }, { turn: 'right', go: 4 }]);
const D16 = route('south', [{ head: 'south', go: 9 }, { turn: 'left', go: 8 }, { turn: 'right', go: 6 }], 'cycles');
const D18 = route('west', [{ go: 2 }, { turn: 'left', go: 1 }]);
const D19 = route('east', [{ rot: 'cw', deg: 1035 }]);
const D20 = route('north', [{ head: 'north', go: 12 }, { turn: 'right', go: 10 }, { turn: 'right', go: 4 }, { turn: 'left', go: 5 }], 'goes');

export const directionSets = [
  { id: 'direction-sense-q-001', texts: ['facing north', ...routeTexts(D1)], answer: () => facingOf(D1) },
  { id: 'direction-sense-q-002', texts: ['facing west', ...routeTexts(D2)], answer: () => facingOf(D2) },
  { id: 'direction-sense-q-003', texts: routeTexts(D3), answer: () => `${distanceOf(D3)} km` },
  { id: 'direction-sense-q-004', texts: ['morning', 'in front of'], answer: () => cap(only(facingFromShadowBrute('morning', 'front'))) },
  { id: 'direction-sense-q-005', texts: routeTexts(D5), answer: () => whereOf(D5) },
  { id: 'direction-sense-q-006', texts: ['facing south-east', ...routeTexts(D6)], answer: () => facingOf(D6) },
  { id: 'direction-sense-q-007', texts: ['evening', 'to his right'], answer: () => cap(only(facingFromShadowBrute('evening', 'right'))) },
  { id: 'direction-sense-q-008', texts: routeTexts(D8), answer: () => distanceOf(D8) },
  { id: 'direction-sense-q-009', texts: routeTexts(D9), answer: () => whereOf(D9) },
  { id: 'direction-sense-q-010', texts: routeTexts(D10), answer: () => `${distanceOf(D10)} km` },
  { id: 'direction-sense-q-011', texts: ['facing north', ...routeTexts(D11)], answer: () => facingOf(D11) },
  // Vikram's shadow on his right in the morning; Sunita faces him.
  {
    id: 'direction-sense-q-012',
    texts: ['morning', 'facing each other', 'exactly to his right', 'Sunita'],
    answer: () => cap(DIRS[(DIRS.indexOf(only(facingFromShadowBrute('morning', 'right'))) + 4) % 8])
  },
  // P is 6 km north of Q; R is 8 km east of Q. R from P.
  { id: 'direction-sense-q-013', texts: ['6 km north of Q', '8 km east of Q', 'from P'], answer: () => `${Math.hypot(8 - 0, 0 - 6)} km ${directionOf(8 - 0, 0 - 6)}` },
  {
    id: 'direction-sense-q-014',
    texts: ['facing north', 'west'],
    answer: () => Object.entries(D14).filter(([, r]) => DIRS[walkRouteComplex(r).facing] === 'west').map(([text]) => text)
  },
  { id: 'direction-sense-q-015', texts: routeTexts(D15), answer: () => `${distanceOf(D15)} km` },
  {
    id: 'direction-sense-q-016',
    texts: routeTexts(D16),
    answer: () => `${distanceOf(D16)} km ${directionOf(walkRouteComplex(D16).x, walkRouteComplex(D16).y)}`
  },
  // From one point: Asha 7 km east; Bhanu 4 km north, then right 4 km. Asha from Bhanu.
  {
    id: 'direction-sense-q-017',
    texts: ['7 km east', ...routeTexts(route('north', [{ head: 'north', go: 4 }, { turn: 'right', go: 4 }]))],
    answer: () => {
      const b = walkRouteComplex(route('north', [{ head: 'north', go: 4 }, { turn: 'right', go: 4 }]));
      const [dx, dy] = [7 - b.x, 0 - b.y];
      return `${Math.hypot(dx, dy)} km ${directionOf(dx, dy)}`;
    }
  },
  // Just after sunrise, she walks towards her shadow, then turns left.
  {
    id: 'direction-sense-q-018',
    texts: ['sunrise', 'towards her shadow', ...routeTexts(D18).slice(1)],
    answer: () => facingOf({ ...D18, start: only(facingFromShadowBrute('morning', 'front')) })
  },
  { id: 'direction-sense-q-019', texts: ['facing east', ...routeTexts(D19)], answer: () => facingOf(D19) },
  { id: 'direction-sense-q-020', texts: routeTexts(D20), answer: () => distanceOf(D20) },
  // A is 4 m west of B; C is 4 m north of B. A from C.
  { id: 'direction-sense-q-021', texts: ['4 m west of B', '4 m north of B', 'from C'], answer: () => cap(directionOf(-4 - 0, 0 - 4)) }
];

/* ------------------------------ coding-decoding ------------------------------ */

const ex = (word, code) => ({ word, code });
const encode = (examples, target) => only(codesFor(examples, target));
const decode = (examples, code) => only(wordsFor(examples, code));
const numberFor = (word, value, target) => only(NUMBER_KINDS.filter((k) => numberCodeByTable(word, k) === value).map((k) => numberCodeByTable(target, k)));

const S12 = [
  { words: ['pick', 'and', 'drop'], codes: ['ta', 'na', 'pa'] },
  { words: ['drop', 'the', 'ball'], codes: ['ka', 'ta', 'zo'] },
  { words: ['pick', 'the', 'flower'], codes: ['zo', 'ri', 'na'] }
];
const S13 = [
  { words: ['monsoon', 'rain', 'is', 'heavy'], codes: ['zu', 'pi', 'ko', 'ra'] },
  { words: ['heavy', 'traffic', 'is', 'slow'], codes: ['ra', 'mi', 'ko', 'fe'] },
  { words: ['slow', 'rain', 'falls'], codes: ['fe', 'tu', 'pi'] }
];
const S19 = [
  { words: ['cats', 'eat', 'fish'], codes: ['mo', 'ri', 'ta'] },
  { words: ['dogs', 'eat', 'bones'], codes: ['ta', 've', 'su'] },
  { words: ['cats', 'chase', 'dogs'], codes: ['su', 'lo', 'ri'] }
];
const sentenceTexts = (ss) => ss.map((s) => `‘${s.words.join(' ')}’ is written as ‘${s.codes.join(' ')}’`);
const codeOf = (ss, word) => only(solveSentences(ss).map((m) => m.get(word)));

export const codingSets = [
  { id: 'coding-decoding-q-001', texts: ['COLD', 'DPME', 'WARM'], answer: () => encode(ex('COLD', 'DPME'), 'WARM') },
  { id: 'coding-decoding-q-002', texts: ['TRAIN', 'QOXFK', 'PLANE'], answer: () => encode(ex('TRAIN', 'QOXFK'), 'PLANE') },
  { id: 'coding-decoding-q-003', texts: ['GOLD', 'TLOW', 'SILK'], answer: () => encode(ex('GOLD', 'TLOW'), 'SILK') },
  { id: 'coding-decoding-q-004', texts: ['CAT', '3-1-20', 'DOG'], answer: () => (numberCodeByTable('CAT', 'positions') === '3-1-20' ? numberCodeByTable('DOG', 'positions') : null) },
  { id: 'coding-decoding-q-005', texts: ['MOTHER', 'REHTOM', 'FATHER'], answer: () => encode(ex('MOTHER', 'REHTOM'), 'FATHER') },
  { id: 'coding-decoding-q-006', texts: ['A ↔ Z', 'B ↔ Y'], answer: () => ([...ALPHABET].filter((ch) => opposite(ch) === ch).length ? 'some' : 'No letter') },
  { id: 'coding-decoding-q-007', texts: ['BAD', '7', 'CAB'], answer: () => numberFor('BAD', 7, 'CAB') },
  { id: 'coding-decoding-q-008', texts: ['GARDEN', 'HZSCFM', 'FLOWER'], answer: () => encode(ex('GARDEN', 'HZSCFM'), 'FLOWER') },
  { id: 'coding-decoding-q-009', texts: ['BRAIN', 'OJBSC', 'TRAIN'], answer: () => encode(ex('BRAIN', 'OJBSC'), 'TRAIN') },
  { id: 'coding-decoding-q-010', texts: ['FRIEND', 'WMVRIU', 'ENEMY'], answer: () => encode(ex('FRIEND', 'WMVRIU'), 'ENEMY') },
  { id: 'coding-decoding-q-011', texts: ['PEN', '105', 'INK'], answer: () => numberFor('PEN', 105, 'INK') },
  { id: 'coding-decoding-q-012', texts: [...sentenceTexts(S12), '‘ball’'], answer: () => `‘${codeOf(S12, 'ball')}’` },
  { id: 'coding-decoding-q-013', texts: [...sentenceTexts(S13), '‘monsoon’'], answer: () => `‘${codeOf(S13, 'monsoon')}’` },
  {
    id: 'coding-decoding-q-014',
    texts: sentenceTexts(S13),
    answer: () => {
      const sols = solveSentences(S13);
      return [...sols[0].keys()].filter((w) => new Set(sols.map((m) => m.get(w))).size > 1).map((w) => `‘${w}’`);
    }
  },
  { id: 'coding-decoding-q-015', texts: ['PAPER', 'BQFQS', 'MQUBF'], answer: () => decode(ex('PAPER', 'BQFQS'), 'MQUBF') },
  { id: 'coding-decoding-q-016', texts: ['BEST', 'CGVX', 'WORK'], answer: () => encode(ex('BEST', 'CGVX'), 'WORK') },
  { id: 'coding-decoding-q-017', texts: ['ACE', '72', 'BIG'], answer: () => numberFor('ACE', 72, 'BIG') },
  { id: 'coding-decoding-q-018', texts: ['SPRING', 'ELGPNQ', 'AUTUMN'], answer: () => encode(ex('SPRING', 'ELGPNQ'), 'AUTUMN') },
  {
    id: 'coding-decoding-q-019',
    texts: [...sentenceTexts(S19), '‘ve’'],
    answer: () => `‘${only(solveSentences(S19).map((m) => [...m].find(([, c]) => c === 've')[0]))}’`
  },
  // Each letter becomes its opposite, then moves one place forward.
  { id: 'coding-decoding-q-020', texts: ['opposite', 'one place forward', 'KING'], answer: () => [...'KING'].map((ch) => shiftLetter(opposite(ch), 1)).join('') },
  // A = 26, B = 25, ..., Z = 1.
  { id: 'coding-decoding-q-021', texts: ['A = 26', 'Z = 1', 'BAT'], answer: () => [...'BAT'].reduce((sum, ch) => sum + 27 - pos(ch), 0) }
];

/* ------------------------------ order and ranking ------------------------------ */

const rowN = (facts, people = 1, maxN = 80, swap = null) => only(solveRow({ people, facts, swap, maxN }).map((s) => s.n));
const L = (p, k) => ({ p, k, from: 'left' });
const R = (p, k) => ({ p, k, from: 'right' });
const order = (n, facts) => only(solveComparisons(n, facts).map((o) => o.join()));
const nthOf = (names, facts, k) => {
  const o = only(solveComparisons(names.length, facts));
  const chained = orderByChaining(names.length, facts);
  if (chained && chained.join() !== o.join()) throw new Error('the two methods disagree');
  return names[o[k - 1]];
};
const more = (a, b) => ({ more: [a, b] });

export const rankingSets = [
  { id: 'order-ranking-q-001', texts: ['Radha', ordinal(9), 'from the left', ordinal(14), 'from the right'], answer: () => rowN([L(0, 9), R(0, 14)]) },
  { id: 'order-ranking-q-002', texts: ['45', ordinal(12), 'from the top'], answer: () => countFrom(layOut(45, [12], ['A']), 'A', 'right') },
  { id: 'order-ranking-q-003', texts: ['30', 'Vikram', ordinal(17), 'from the front'], answer: () => String(countFrom(layOut(30, [17], ['V']), 'V', 'right')) },
  // Anu > Bala, Chitra > Anu, Bala > Deepa (Deepa shorter than Bala). Shortest.
  { id: 'order-ranking-q-004', texts: ['Anu is taller than Bala', 'Chitra is taller than Anu', 'Deepa is shorter than Bala'], answer: () => nthOf(['Anu', 'Bala', 'Chitra', 'Deepa'], [more(0, 1), more(2, 0), more(1, 3)], 4) },
  { id: 'order-ranking-q-005', texts: ['Ravi', ordinal(6), 'from the left', 'Mohan', ordinal(14), 'from the left'], answer: () => countBetween(layOut(20, [6, 14], ['R', 'M']), 'R', 'M') },
  { id: 'order-ranking-q-006', texts: ['Seema', ordinal(18), 'from either end'], answer: () => rowN([L(0, 18), R(0, 18)]) },
  // Kiran < Meena, Kiran > Lata, Naveen > Meena. Second highest.
  { id: 'order-ranking-q-007', texts: ['Kiran scored more than Lata but less than Meena', 'Naveen scored more than Meena'], answer: () => nthOf(['Kiran', 'Lata', 'Meena', 'Naveen'], [more(0, 1), more(2, 0), more(3, 2)], 2) },
  { id: 'order-ranking-q-008', texts: ['40', 'Rohit', ordinal(11), 'from the left', 'Sameer', ordinal(16), 'from the right'], answer: () => only(solveRow({ people: 2, facts: [{ total: 40 }, L(0, 11), R(1, 16)], maxN: 40 }).map((s) => Math.abs(s.seats[0] - s.seats[1]) - 1)) },
  { id: 'order-ranking-q-009', texts: ['25', 'Tara', ordinal(15), 'from the left', 'Uday', ordinal(18), 'from the right'], answer: () => only(solveRow({ people: 2, facts: [{ total: 25 }, L(0, 15), R(1, 18)], maxN: 25 }).map((s) => Math.abs(s.seats[0] - s.seats[1]) - 1)) },
  { id: 'order-ranking-q-010', texts: ['Nisha', ordinal(10), 'from the left', 'Om', ordinal(15), 'from the right', 'interchange', ordinal(18), 'from the left'], answer: () => rowN([L(0, 10), R(1, 15), { ...L(0, 18), after: true }], 2, 80, [0, 1]) },
  {
    id: 'order-ranking-q-011',
    texts: ['30', 'Gita', ordinal(7), 'from the left', 'Hari', ordinal(12), 'from the right', 'interchange'],
    answer: () => only(solveRow({ people: 2, facts: [{ total: 30 }, L(0, 7), R(1, 12)], swap: [0, 1], maxN: 30 }).map((s) => s.seats[1]))
  },
  // Pavan > Qadir; Rekha < Sonu, Rekha > Pavan; Tanu < Qadir. Middle (3rd of 5).
  { id: 'order-ranking-q-012', texts: ['Pavan is taller than Qadir', 'Rekha is shorter than Sonu but taller than Pavan', 'Tanu is shorter than Qadir'], answer: () => nthOf(['Pavan', 'Qadir', 'Rekha', 'Sonu', 'Tanu'], [more(0, 1), more(3, 2), more(2, 0), more(1, 4)], 3) },
  { id: 'order-ranking-q-013', texts: ['Leela', ordinal(8), 'from the top', ordinal(27), 'from the bottom', '6 students failed', '3 were absent'], answer: () => rowN([L(0, 8), R(0, 27)]) + 6 + 3 },
  { id: 'order-ranking-q-014', texts: ['Kamal', ordinal(10), 'from the left', '26'], answer: () => countFrom(layOut(26, [10], ['K']), 'K', 'right') - 1 },
  {
    id: 'order-ranking-q-015',
    texts: ['Jaya', ordinal(9), 'from the front', 'Kunal', ordinal(8), 'from the back', '4 people'],
    answer: () => Math.min(...solveRow({ people: 2, facts: [L(0, 9), R(1, 8), { between: [0, 1], k: 4 }], maxN: 60 }).map((s) => s.n))
  },
  {
    id: 'order-ranking-q-016',
    texts: ['Arun', ordinal(6), 'from the front', 'Bina', ordinal(10), 'from the back', '3 people'],
    answer: () => [...new Set(solveRow({ people: 2, facts: [L(0, 6), R(1, 10), { between: [0, 1], k: 3 }], maxN: 60 }).map((s) => String(s.n)))]
  },
  {
    id: 'order-ranking-q-017',
    texts: ['P is', ordinal(14), 'from the left', 'Q is', ordinal(8), 'from the right', 'interchange', ordinal(21), 'from the left'],
    answer: () => only(solveRow({ people: 2, facts: [L(0, 14), R(1, 8), { ...L(0, 21), after: true }], swap: [0, 1], maxN: 80 }).map((s) => s.n - s.seats[0] + 1))
  },
  // Esha earns the most; Arjun more than Bhanu and Charu; Dev less than Charu, more than Bhanu.
  {
    id: 'order-ranking-q-018',
    texts: ['Arjun earns more than Bhanu and Charu', 'Dev earns less than Charu but more than Bhanu', 'Esha earns the most'],
    answer: () => nthOf(['Arjun', 'Bhanu', 'Charu', 'Dev', 'Esha'], [more(0, 1), more(0, 2), more(2, 3), more(3, 1), more(4, 0), more(4, 1), more(4, 2), more(4, 3)], 5)
  },
  { id: 'order-ranking-q-019', texts: ['41', 'Ritu', ordinal(12), 'from the left', 'Sanjay', '6 places to the right of Ritu'], answer: () => countFrom(layOut(41, [12, 18], ['R', 'S']), 'S', 'right') },
  {
    id: 'order-ranking-q-020',
    texts: ['Ramesh', ordinal(13), 'from the front', ordinal(17), 'from the back'],
    answer: () => {
      const n = rowN([L(0, 13), R(0, 17)]);
      const row = layOut(n, [13], ['R']);
      const statements = {
        [`There are ${n} people in the queue.`]: true,
        'Exactly 12 people are ahead of Ramesh.': countFrom(row, 'R', 'left') - 1 === 12,
        'Exactly 17 people are behind Ramesh.': countFrom(row, 'R', 'right') - 1 === 17,
        'Ramesh is exactly in the middle of the queue.': countFrom(row, 'R', 'left') === countFrom(row, 'R', 'right')
      };
      return Object.keys(statements).filter((s) => statements[s]);
    }
  },
  // Sunil older than Tanvi, younger than Uday; Vani older than Uday. Second oldest.
  { id: 'order-ranking-q-021', texts: ['Sunil is older than Tanvi but younger than Uday', 'Vani is older than Uday'], answer: () => nthOf(['Sunil', 'Tanvi', 'Uday', 'Vani'], [more(0, 1), more(2, 0), more(3, 2)], 2) }
];
export const rankingOrderCheck = order;

/* ------------------------------ cubes and dice ------------------------------ */

const v = (top, front, right) => ({ top, front, right });
const oppositeIn = (labels, views, label) => only(oppositeOfByVectors(labels, views, label).map((x) => [x]))[0];
const LETTERS6 = ['A', 'B', 'C', 'D', 'E', 'F'];
const PQ = ['P', 'Q', 'R', 'S', 'T', 'U'];
const NUM6 = ['1', '2', '3', '4', '5', '6'];
const V5 = [v('A', 'B', 'C'), v('A', 'E', 'D')];
const V9 = [v('P', 'Q', 'R'), v('P', 'T', 'S'), v('U', 'T', 'R')];
const V15 = [v('1', '3', '2'), v('2', '4', '5')];
const V19 = [v('A', 'D', 'B'), v('E', 'A', 'C')];
const NET7 = [[1, 0, 'A'], [0, 1, 'B'], [1, 1, 'C'], [2, 1, 'D'], [3, 1, 'E'], [1, 2, 'F']];
const NET21 = [[0, 0, 'P'], [1, 0, 'Q'], [1, 1, 'R'], [2, 1, 'S'], [2, 2, 'T'], [3, 2, 'U']];
const count = (n, k, faces) => paintedCounts(n, n, n, faces)[k];
// A standard die: 1–6, 2–5, 3–4 opposite (found here by trying every pairing).
const STANDARD = (() => {
  const all = [];
  const go = (left, pairs) => {
    if (!left.length) return all.push(pairs);
    const [a, ...rest] = left;
    rest.forEach((b, i) => go(rest.filter((_, j) => j !== i), [...pairs, [a, b]]));
  };
  go([1, 2, 3, 4, 5, 6], []);
  return only(all.filter((pairs) => pairs.every(([a, b]) => a + b === 7)));
})();
const standardOpposite = (x) => STANDARD.flatMap(([a, b]) => (a === x ? [b] : b === x ? [a] : []))[0];

export const cubeSets = [
  { id: 'cubes-dice-q-001', texts: ['side 4 cm', 'all', 'exactly three'], answer: () => count(4, 3) },
  { id: 'cubes-dice-q-002', texts: ['side 5 cm', 'all', 'exactly two'], answer: () => count(5, 2) },
  { id: 'cubes-dice-q-003', texts: ['side 6 cm', 'all', 'no face'], answer: () => count(6, 0) },
  { id: 'cubes-dice-q-004', texts: ['standard die', '3'], answer: () => String(standardOpposite(3)) },
  { id: 'cubes-dice-q-005', texts: ['opposite B'], figure: { type: 'dice', views: V5 }, answer: () => oppositeIn(LETTERS6, V5, 'B') },
  {
    id: 'cubes-dice-q-006',
    texts: ['3 cuts'],
    answer: () => {
      let pieces = 0;
      for (let i = 0; i <= 3; i++) for (let j = 0; j <= 3; j++) for (let k = 0; k <= 3; k++) pieces++;
      return pieces;
    }
  },
  { id: 'cubes-dice-q-007', texts: ['opposite C'], figure: { type: 'dice', net: NET7 }, answer: () => netOppositesByRolling(NET7).C },
  { id: 'cubes-dice-q-008', texts: ['125', 'exactly one face'], answer: () => count(5, 1) },
  { id: 'cubes-dice-q-009', texts: ['opposite R'], figure: { type: 'dice', views: V9 }, answer: () => oppositeIn(PQ, V9, 'R') },
  {
    id: 'cubes-dice-q-010',
    texts: ['touch the face R'],
    figure: { type: 'dice', views: V9 },
    answer: () => {
      const dice = solveDiceByVectors(PQ, V9);
      return only(dice.map(({ pairs }) => PQ.filter((l) => l !== 'R' && !pairs.some(([a, b]) => (a === 'R' && b === l) || (b === 'R' && a === l))).join())).split(',');
    }
  },
  { id: 'cubes-dice-q-011', texts: ['4 cm × 3 cm × 3 cm', 'exactly two'], answer: () => paintedCounts(4, 3, 3)[2] },
  { id: 'cubes-dice-q-012', texts: ['Three standard dice', 'shows 5'], answer: () => [1, 2, 3].reduce((sum) => sum + 7, 0) - 5 },
  {
    id: 'cubes-dice-q-013',
    texts: ['red on two opposite faces', 'blue on the other four', '64'],
    answer: () => {
      // n = 4; red on top and bottom, blue on the four sides.
      let both = 0;
      for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++) {
        const red = z === 0 || z === 3;
        const blue = x === 0 || x === 3 || y === 0 || y === 3;
        if (red && blue) both++;
      }
      return both;
    }
  },
  { id: 'cubes-dice-q-014', texts: ['side 5 cm', 'at least one face'], answer: () => 125 - count(5, 0) },
  { id: 'cubes-dice-q-015', texts: ['opposite 5'], figure: { type: 'dice', views: V15 }, answer: () => oppositeIn(NUM6, V15, '5') },
  { id: 'cubes-dice-q-016', texts: ['side 5 cm', 'except the bottom', 'no paint'], answer: () => count(5, 0, ['top', 'front', 'back', 'left', 'right']) },
  { id: 'cubes-dice-q-017', texts: ['6 cm × 4 cm × 2 cm', 'exactly one face'], answer: () => paintedCounts(6, 4, 2)[1] },
  { id: 'cubes-dice-q-018', texts: ['standard die', 'touch the face showing 1'], answer: () => [2, 3, 4, 5, 6].filter((x) => x !== standardOpposite(1)).reduce((a, b) => a + b, 0) },
  { id: 'cubes-dice-q-019', texts: ['D is on the top face'], figure: { type: 'dice', views: V19 }, answer: () => oppositeIn(LETTERS6, V19, 'D') },
  {
    id: 'cubes-dice-q-020',
    texts: ['96'],
    answer: () => {
      const n = only([...Array(20).keys()].filter((m) => m >= 2 && paintedCounts(m)[1] === 96));
      return n ** 3;
    }
  },
  { id: 'cubes-dice-q-021', texts: ['opposite P'], figure: { type: 'dice', net: NET21 }, answer: () => netOppositesByRolling(NET21).P }
];

/* ------------------------------ mirror images and paper folding ------------------------------ */

const mirrorOf = (h, m) => timeText(mirrorTimeByHands(h, m));
const holes = (folds, punches) => holesByReflection(4, folds, punches).join(', ');
const paper = (folds, punches) => ({ type: 'paper', size: 4, folds, punches });

export const mirrorSets = [
  { id: 'mirror-paper-folding-q-001', texts: ['4:20'], figure: { type: 'clock', hour: 4, minute: 20 }, answer: () => mirrorOf(4, 20) },
  { id: 'mirror-paper-folding-q-002', texts: ['mirror'], answer: () => only(['T', 'E', 'K', 'B'].filter(mirrorSymmetric)) },
  { id: 'mirror-paper-folding-q-003', texts: ['water'], answer: () => only(['D', 'A', 'M', 'T'].filter(waterSymmetric)) },
  { id: 'mirror-paper-folding-q-004', texts: ['left half', 'right half'], figure: paper(['left'], ['C2']), answer: () => holesByReflection(4, ['left'], ['C2']).length },
  // STAR seen in a mirror placed to its right: the image read left to right.
  { id: 'mirror-paper-folding-q-005', texts: ['STAR', 'right'], answer: () => [...'STAR'].reverse().join(', ') },
  { id: 'mirror-paper-folding-q-006', texts: ['9:15'], figure: { type: 'clock', hour: 9, minute: 15 }, answer: () => mirrorOf(9, 15) },
  { id: 'mirror-paper-folding-q-007', texts: ['top half', 'left half'], figure: paper(['top', 'left'], ['C3']), answer: () => holesByReflection(4, ['top', 'left'], ['C3']).length },
  { id: 'mirror-paper-folding-q-008', texts: ['1:25'], answer: () => mirrorOf(1, 25) },
  { id: 'mirror-paper-folding-q-009', texts: ['mirror placed beside'], answer: () => ['MOM', 'WOW', 'TOOT', 'NOON', 'BOB'].filter(looksSameInMirrorByGlyphs) },
  { id: 'mirror-paper-folding-q-010', texts: ['water'], answer: () => only(['CHOICE', 'MOTHER', 'WATER', 'TOMATO'].filter(looksSameInWaterByGlyphs)) },
  { id: 'mirror-paper-folding-q-011', texts: ['top half', 'B3'], figure: paper(['top'], ['B3']), answer: () => holes(['top'], ['B3']) },
  { id: 'mirror-paper-folding-q-012', texts: ['left half', 'top half', 'diagonal'], figure: paper(['left', 'top', 'diag'], ['C4']), answer: () => holesByReflection(4, ['left', 'top', 'diag'], ['C4']).length },
  { id: 'mirror-paper-folding-q-013', texts: ['mirror'], answer: () => only(['6:00', '3:30', '9:30', '4:30'].filter((t) => mirrorOf(...t.split(':').map(Number)) === t)) },
  { id: 'mirror-paper-folding-q-014', texts: ['PARLIAMENT'], answer: () => [...'PARLIAMENT'].filter(mirrorSymmetric).length },
  { id: 'mirror-paper-folding-q-015', texts: ['left half', 'top half', 'D4'], figure: paper(['left', 'top'], ['D4']), answer: () => holes(['left', 'top'], ['D4']) },
  { id: 'mirror-paper-folding-q-016', texts: ['right half', 'bottom half', 'diagonal', 'B2'], figure: paper(['right', 'bottom', 'anti'], ['B2']), answer: () => holes(['right', 'bottom', 'anti'], ['B2']) },
  {
    id: 'mirror-paper-folding-q-017',
    texts: ['3:48', '25 minutes'],
    answer: () => {
      const actual = mirrorTimeByHands(3, 48);
      const t = (actual.hour % 12) * 60 + actual.minute + 25;
      return timeText({ hour: Math.floor(t / 60) % 12 || 12, minute: t % 60 });
    }
  },
  { id: 'mirror-paper-folding-q-018', texts: ['mirror', 'water'], answer: () => ['H', 'A', 'O', 'B', 'X'].filter((c) => mirrorSymmetric(c) && waterSymmetric(c)) },
  { id: 'mirror-paper-folding-q-019', texts: ['bottom half', 'right half', 'top half', 'A2'], figure: paper(['bottom', 'right', 'top'], ['A2']), answer: () => holesByReflection(4, ['bottom', 'right', 'top'], ['A2']).length },
  {
    id: 'mirror-paper-folding-q-020',
    texts: ['4:50', '8:00'],
    answer: () => {
      const actual = mirrorTimeByHands(4, 50);
      return 8 * 60 - ((actual.hour % 12) * 60 + actual.minute);
    }
  },
  { id: 'mirror-paper-folding-q-021', texts: ['water'], answer: () => ['BED', 'CAKE', 'BOOK', 'MOOD', 'CODE'].filter(looksSameInWaterByGlyphs) }
];

export const ALL_SETS = { 'direction-sense': directionSets, 'coding-decoding': codingSets, 'order-ranking': rankingSets, 'cubes-dice': cubeSets, 'mirror-paper-folding': mirrorSets };
