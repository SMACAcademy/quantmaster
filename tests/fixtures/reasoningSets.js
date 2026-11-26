/**
 * The hand-written reasoning questions, in structured form. Each set holds the
 * puzzle exactly as its questions print it (the clue sentences are generated
 * from these objects, and tests/reasoning-content.test.js checks that every
 * sentence appears in the question), and each question has a function that
 * works its answer out by brute force over every arrangement the clues allow.
 *
 * An answer function receives the list of solutions and returns the keyed
 * answer: an option's text, a number, or (multiple choice) a list of option
 * texts. `only()` insists every solution gives the same value.
 */

import { personOpposite, personToSide, peopleBetween, solveSeating, solveSeatingGeometric, seatOf } from '../../src/utils/reasoning/seating.js';
import { solvePuzzle, solvePuzzleByHolders } from '../../src/utils/reasoning/puzzles.js';
import { ATTRS } from '../../src/utils/reasoning/puzzleText.js';
import { follows, verdict } from '../../src/utils/reasoning/syllogism.js';
import { chainRelations, iqVerdict, pathRelation } from '../../src/utils/reasoning/inequality.js';
import { buildFamily, generations, relationByPath } from '../../src/utils/reasoning/family.js';

export function only(values) {
  const set = new Set(values.map((v) => JSON.stringify(v)));
  if (values.length === 0) throw new Error('no solution at all');
  if (set.size !== 1) throw new Error(`answer differs between solutions: ${[...set].join(' | ')}`);
  return values[0];
}

/* ------------------------------ seating ------------------------------ */

const side = (pz, p, s, k) => (a) => pz.people[personToSide(pz, a, p, s, k)];

const S1 = { layout: 'row', people: ['Asha', 'Bharat', 'Chitra', 'Dev', 'Esha'], clues: [
  { t: 'pos', p: 2, k: 3, from: 'left' }, { t: 'side', p: 3, q: 2, side: 'right', k: 1 }, { t: 'pos', p: 0, k: 1, from: 'left' }, { t: 'notAdj', p: 4, q: 3 }] };
const S2 = { layout: 'row', people: ['Pallavi', 'Qasim', 'Rohit', 'Shalini', 'Tejas', 'Usman'], clues: [
  { t: 'pos', p: 2, k: 3, from: 'left' }, { t: 'gap', p: 2, q: 5, k: 1 }, { t: 'notEnd', p: 5 }, { t: 'side', p: 0, q: 5, side: 'left', k: 1 }, { t: 'side', p: 4, q: 2, side: 'left', k: 2 }, { t: 'notAdj', p: 1, q: 2 }] };
const S3 = { layout: 'rows', rowOne: [0, 1, 2, 3], people: ['Amit', 'Bina', 'Charan', 'Disha', 'Pavan', 'Qadir', 'Rani', 'Sona'], clues: [
  { t: 'opp', p: 0, q: 4 }, { t: 'side', p: 4, q: 5, side: 'left', k: 2 }, { t: 'end', p: 5 }, { t: 'opp', p: 6, q: 3 }, { t: 'end', p: 1 }, { t: 'side', p: 2, q: 0, side: 'left', k: 1 }] };
const S4 = { layout: 'circle', people: ['Gita', 'Hari', 'Indu', 'Jay', 'Kiran', 'Lata'], clues: [
  { t: 'side', p: 1, q: 0, side: 'left', k: 2 }, { t: 'opp', p: 3, q: 0 }, { t: 'adj', p: 2, q: 0 }, { t: 'side', p: 5, q: 1, side: 'right', k: 1 }] };
const S5 = { layout: 'circle', people: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], clues: [
  { t: 'opp', p: 0, q: 4 }, { t: 'side', p: 1, q: 4, side: 'left', k: 1 }, { t: 'side', p: 6, q: 1, side: 'left', k: 1 }, { t: 'side', p: 2, q: 0, side: 'left', k: 2 }, { t: 'opp', p: 3, q: 7 }, { t: 'side', p: 7, q: 4, side: 'right', k: 1 }] };
const S6 = { layout: 'circle', mixed: true, people: ['Om', 'Priya', 'Ravi', 'Sara', 'Tara', 'Usha'], clues: [
  { t: 'face', p: 0, dir: 'in' }, { t: 'side', p: 1, q: 0, side: 'left', k: 1 }, { t: 'side', p: 2, q: 1, side: 'right', k: 1 }, { t: 'side', p: 4, q: 2, side: 'left', k: 2 },
  { t: 'side', p: 4, q: 5, side: 'right', k: 1 }, { t: 'side', p: 3, q: 4, side: 'left', k: 1 }, { t: 'opp', p: 3, q: 0 }, { t: 'face', p: 3, dir: 'in' }] };
const S7 = { layout: 'row', people: ['Kiran', 'Latha', 'Mohan', 'Neel', 'Om'], clues: [
  { t: 'end', p: 0 }, { t: 'side', p: 1, q: 0, side: 'right', k: 1 }, { t: 'notEnd', p: 2 }] };

export const seatingSets = [
  {
    id: 'S1', puzzle: S1, intro: 'Five friends, Asha, Bharat, Chitra, Dev and Esha, sit in a row facing north.',
    questions: {
      'seating-arrangement-q-001': (sols) => only(sols.map((a) => S1.people[a.seats[4]])),
      'seating-arrangement-q-002': (sols) => only(sols.map(side(S1, 2, 'left', 1))),
      'seating-arrangement-q-003': (sols) => only(sols.map((a) => peopleBetween(S1, a, 0, 3)))
    }
  },
  {
    id: 'S2', puzzle: S2, intro: 'Six colleagues, Pallavi, Qasim, Rohit, Shalini, Tejas and Usman, sit in a row facing north.',
    questions: {
      'seating-arrangement-q-007': (sols) => only(sols.map((a) => S2.people[a.seats[5]])),
      'seating-arrangement-q-008': (sols) => only(sols.map((a) => S2.people[a.seats[(seatOf(a.seats)[4] + seatOf(a.seats)[2]) / 2]])),
      'seating-arrangement-q-009': (sols) => only(sols.map((a) => 5 - seatOf(a.seats)[0])),
      'seating-arrangement-q-010': (sols) => {
        const pairs = { 'Shalini and Rohit': [3, 2], 'Pallavi and Usman': [0, 5], 'Tejas and Qasim': [4, 1], 'Rohit and Usman': [2, 5] };
        return only(sols.map((a) => Object.keys(pairs).filter((k) => Math.abs(seatOf(a.seats)[pairs[k][0]] - seatOf(a.seats)[pairs[k][1]]) === 1)));
      }
    }
  },
  {
    id: 'S3', puzzle: S3,
    intro: 'Eight people sit in two parallel rows of four, facing each other. Amit, Bina, Charan and Disha sit in Row 1 and face south. Pavan, Qadir, Rani and Sona sit in Row 2 and face north. Each person faces exactly one person in the other row.',
    questions: {
      'seating-arrangement-q-011': (sols) => only(sols.map((a) => S3.people[personOpposite(S3, a, 2)])),
      'seating-arrangement-q-012': (sols) => only(sols.map(side(S3, 0, 'right', 1))),
      // Disha's diagonal opposite: the other end of the other row.
      'seating-arrangement-q-013': (sols) => only(sols.map((a) => {
        const s = seatOf(a.seats)[3];
        const column = s % 4;
        return S3.people[a.seats[4 + (3 - column)]];
      }))
    }
  },
  {
    id: 'S4', puzzle: S4, intro: 'Six friends, Gita, Hari, Indu, Jay, Kiran and Lata, sit around a circular table facing the centre.',
    questions: {
      'seating-arrangement-q-004': (sols) => only(sols.map((a) => S4.people[personOpposite(S4, a, 1)])),
      'seating-arrangement-q-005': (sols) => only(sols.map(side(S4, 3, 'left', 1))),
      'seating-arrangement-q-006': (sols) => only(sols.map(side(S4, 4, 'right', 2)))
    }
  },
  {
    id: 'S5', puzzle: S5, intro: 'Eight people, A, B, C, D, E, F, G and H, sit around a circular table facing the centre.',
    questions: {
      'seating-arrangement-q-014': (sols) => only(sols.map(side(S5, 0, 'right', 1))),
      'seating-arrangement-q-015': (sols) => only(sols.map((a) => {
        // Counting from C's left (clockwise) until G.
        for (let k = 1; k < 8; k++) if (personToSide(S5, a, 2, 'left', k) === 6) return k - 1;
        return null;
      })),
      'seating-arrangement-q-016': (sols) => only(sols.map(side(S5, 5, 'left', 3)))
    }
  },
  {
    id: 'S6', puzzle: S6, intro: 'Six friends, Om, Priya, Ravi, Sara, Tara and Usha, sit around a circular table. Some of them face the centre and the others face away from it.',
    questions: {
      'seating-arrangement-q-017': (sols) => only(sols.map((a) => a.facing.filter((f) => f === 'in').length)),
      'seating-arrangement-q-018': (sols) => only(sols.map(side(S6, 4, 'right', 1))),
      'seating-arrangement-q-019': (sols) => only(sols.map(side(S6, 5, 'left', 2)))
    }
  },
  {
    id: 'S7', puzzle: S7, intro: 'Five people, Kiran, Latha, Mohan, Neel and Om, sit in a row facing north.',
    questions: {
      'seating-arrangement-q-020': (sols) => sols.length,
      'seating-arrangement-q-021': (sols) => {
        const options = {
          'Kiran sits at the extreme left end.': (a) => a.seats[0] === 0,
          'Mohan sits in the middle of the row.': (a) => a.seats[2] === 2,
          'Om sits at the extreme right end.': (a) => a.seats[4] === 4,
          'Neel sits next to Latha.': (a) => Math.abs(seatOf(a.seats)[3] - seatOf(a.seats)[1]) === 1
        };
        const must = Object.keys(options).filter((k) => sols.every(options[k]));
        return only([must.length === 1 ? must[0] : must]);
      }
    }
  }
];

/** The "k-th to the left / right" mirror rule, checked on every seating of eight around a table. */
export const seatingRule = {
  id: 'seating-arrangement-q-022',
  answer() {
    const pz = { layout: 'circle', people: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] };
    const all = solveSeating({ ...pz, clues: [{ t: 'side', p: 0, q: 1, side: 'left', k: 3 }] });
    return only(all.map((a) => (personToSide(pz, a, 0, 'right', 3) === 1 ? '3rd to the right of A' : 'something else')));
  }
};

/* ------------------------------ puzzles ------------------------------ */

const P = (p) => ({ p });
const V = (a, v) => ({ a, v });
const colourSpec = { ...ATTRS.colour, values: ['red', 'blue', 'green', 'yellow', 'white', 'black'] };
const citySpec = { ...ATTRS.city, values: ['Chennai', 'Delhi', 'Kolkata', 'Mumbai'] };
const fruitSpec = { ...ATTRS.fruit, values: ['apple', 'banana', 'mango', 'guava'] };
const floorOf = (s, p) => s.slot[p] + 1;
const at = (pz, s, k) => pz.people[s.slot.indexOf(k)];

const P1 = { kind: 'floors', slots: true, people: ['Anu', 'Bala', 'Chandra', 'Deepa', 'Elango'], attrs: [], attrSpecs: [], clues: [
  { t: 'at', x: P(0), k: 2 }, { t: 'at', x: P(1), k: 4 }, { t: 'justAbove', x: P(3), y: P(0) }, { t: 'above', x: P(4), y: P(2) }] };
const P2 = { kind: 'floors', slots: true, people: ['Kavin', 'Latha', 'Manoj', 'Nila', 'Om', 'Padma'], attrs: ['colour'], attrSpecs: [colourSpec], clues: [
  { t: 'gap', x: P(0), y: P(4), k: 2 }, { t: 'justAbove', x: P(0), y: V(0, 0) }, { t: 'at', x: P(2), k: 5 }, { t: 'same', x: P(2), y: V(0, 3) }, { t: 'same', x: P(3), y: V(0, 5) },
  { t: 'above', x: P(3), y: P(0) }, { t: 'same', x: P(1), y: V(0, 1) }, { t: 'diff', x: P(4), y: V(0, 2) }, { t: 'above', x: P(5), y: P(4) }] };
const P3 = { kind: 'boxes', slots: true, people: ['P', 'Q', 'R', 'S', 'T', 'U'], attrs: [], attrSpecs: [], clues: [
  { t: 'gap', x: P(0), y: P(4), k: 2 }, { t: 'above', x: P(2), y: P(4) }, { t: 'at', x: P(1), k: 5 }, { t: 'justAbove', x: P(1), y: P(3) }, { t: 'justAbove', x: P(5), y: P(2) }] };
const P4 = { kind: 'days', slots: true, people: ['Ajay', 'Bhanu', 'Chitra', 'Dinesh', 'Ekta', 'Firoz', 'Gita'], attrs: [], attrSpecs: [], clues: [
  { t: 'at', x: P(0), k: 2 }, { t: 'gap', x: P(0), y: P(5), k: 2 }, { t: 'above', x: P(2), y: P(5) }, { t: 'justAbove', x: P(5), y: P(1) }, { t: 'justAbove', x: P(6), y: P(3) }] };
const P5 = { kind: 'grid', slots: false, people: ['Arjun', 'Bhumi', 'Chirag', 'Dimple'], attrs: ['city', 'fruit'], attrSpecs: [citySpec, fruitSpec], clues: [
  { t: 'diff', x: P(1), y: V(0, 3) }, { t: 'same', x: V(0, 2), y: V(1, 2) }, { t: 'same', x: P(2), y: V(1, 3) }, { t: 'same', x: P(0), y: V(0, 0) }, { t: 'diff', x: P(3), y: V(1, 1) }, { t: 'same', x: V(0, 1), y: V(1, 1) }] };
const P6 = { kind: 'floors', slots: true, people: ['Rhea', 'Sahil', 'Tara', 'Uday', 'Vani', 'Wasim'], attrs: [], attrSpecs: [], clues: [
  { t: 'at', x: P(2), k: 3 }, { t: 'gap', x: P(2), y: P(3), k: 1 }, { t: 'justAbove', x: P(0), y: P(1) }, { t: 'justAbove', x: P(4), y: P(2) }, { t: 'above', x: P(2), y: P(5) }] };
const P7 = { kind: 'months', slots: true, slotNames: ['January', 'March', 'June', 'August', 'November'], people: ['Ishaan', 'Jaya', 'Kunal', 'Leela', 'Manav'], attrs: [], attrSpecs: [], clues: [
  { t: 'at', x: P(1), k: 2 }, { t: 'above', x: P(1), y: P(2) }, { t: 'justAbove', x: P(3), y: P(1) }, { t: 'gap', x: P(2), y: P(0), k: 2 }] };
const P8 = { kind: 'floors', slots: true, people: ['Xavier', 'Yash', 'Zubin', 'Aditi', 'Bela', 'Charu', 'Dhruv'], attrs: [], attrSpecs: [], clues: [
  { t: 'at', x: P(0), k: 1 }, { t: 'gap', x: P(0), y: P(1), k: 2 }] };

export const puzzleSets = [
  { id: 'P1', puzzle: P1, intro: 'Five friends, Anu, Bala, Chandra, Deepa and Elango, live on the five floors of a building, one on each floor. The lowest floor is floor 1 and the top floor is floor 5.', questions: {
    'puzzles-q-001': (sols) => only(sols.map((s) => at(P1, s, 1))),
    'puzzles-q-002': (sols) => only(sols.map((s) => at(P1, s, s.slot[1] - 1))),
    'puzzles-q-003': (sols) => only(sols.map((s) => Math.abs(s.slot[2] - s.slot[3]) - 1))
  } },
  { id: 'P8', puzzle: P8, intro: 'Seven people, Xavier, Yash, Zubin, Aditi, Bela, Charu and Dhruv, live on the seven floors of a building, one on each floor. The lowest floor is floor 1.', questions: {
    'puzzles-q-004': (sols) => only(sols.map((s) => floorOf(s, 1)))
  } },
  { id: 'P4', puzzle: P4, intro: 'Seven patients, Ajay, Bhanu, Chitra, Dinesh, Ekta, Firoz and Gita, visit a clinic on the seven days of one week, Monday to Sunday, one patient a day.', questions: {
    'puzzles-q-005': (sols) => only(sols.map((s) => at(P4, s, 3))),
    'puzzles-q-006': (sols) => only(sols.map((s) => Math.abs(s.slot[6] - s.slot[1]) - 1)),
    'puzzles-q-007': (sols) => only(sols.map((s) => at(P4, s, s.slot[0] - 1)))
  } },
  { id: 'P3', puzzle: P3, intro: 'Six boxes, P, Q, R, S, T and U, are stacked one above another. The bottom box is at position 1 and the top box at position 6.', questions: {
    'puzzles-q-008': (sols) => only(sols.map((s) => `Box ${at(P3, s, 0)}`)),
    'puzzles-q-009': (sols) => only(sols.map((s) => Math.abs(s.slot[2] - s.slot[1]) - 1)),
    'puzzles-q-010': (sols) => only(sols.map((s) => `Box ${at(P3, s, s.slot[5] + 1)}`))
  } },
  { id: 'P7', puzzle: P7, intro: 'Five friends, Ishaan, Jaya, Kunal, Leela and Manav, were born in January, March, June, August and November of the same year, one in each month.', questions: {
    'puzzles-q-011': (sols) => only(sols.map((s) => P7.slotNames[s.slot[4]])),
    'puzzles-q-012': (sols) => only(sols.map((s) => at(P7, s, s.slot[1] - 1)))
  } },
  { id: 'P5', puzzle: P5, intro: 'Four friends, Arjun, Bhumi, Chirag and Dimple, live in four different cities (Chennai, Delhi, Kolkata and Mumbai), and each likes a different fruit (apple, banana, mango and guava).', questions: {
    'puzzles-q-013': (sols) => only(sols.map((s) => P5.people[s.attr[1].indexOf(2)])),
    'puzzles-q-014': (sols) => only(sols.map((s) => citySpec.values[s.attr[0][1]])),
    'puzzles-q-015': (sols) => only(sols.map((s) => fruitSpec.values[s.attr[1][0]])),
    'puzzles-q-016': (sols) => {
      const combos = { 'Chirag – Mumbai – guava': [2, 3, 3], 'Dimple – Delhi – mango': [3, 1, 2], 'Arjun – Chennai – apple': [0, 0, 0], 'Bhumi – Kolkata – banana': [1, 2, 1] };
      return only(sols.map((s) => Object.keys(combos).filter((k) => s.attr[0][combos[k][0]] === combos[k][1] && s.attr[1][combos[k][0]] === combos[k][2])));
    }
  } },
  { id: 'P2', puzzle: P2, intro: 'Six people, Kavin, Latha, Manoj, Nila, Om and Padma, live on the six floors of a building, one on each floor (floor 1 is the lowest, floor 6 the top). Each likes a different colour: red, blue, green, yellow, white or black.', questions: {
    'puzzles-q-017': (sols) => only(sols.map((s) => at(P2, s, 2))),
    'puzzles-q-018': (sols) => only(sols.map((s) => colourSpec.values[s.attr[0][4]])),
    'puzzles-q-019': (sols) => only(sols.map((s) => P2.people[s.attr[0].indexOf(2)])),
    'puzzles-q-020': (sols) => only(sols.map((s) => Math.abs(s.slot[s.attr[0].indexOf(1)] - s.slot[s.attr[0].indexOf(5)]) - 1))
  } },
  { id: 'P6', puzzle: P6, intro: 'Six neighbours, Rhea, Sahil, Tara, Uday, Vani and Wasim, live on the six floors of a building, one on each floor. Floor 1 is the lowest and floor 6 the top.', questions: {
    'puzzles-q-021': (sols) => {
      if (sols.length < 2) throw new Error('this set is meant to have more than one case');
      return only(sols.map((s) => at(P6, s, 5)));
    },
    'puzzles-q-022': (sols) => {
      const floors = new Set(sols.map((s) => floorOf(s, 5)));
      return ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 5'].filter((f) => floors.has(Number(f.slice(6))));
    }
  } }
];

/* ------------------------------ syllogism ------------------------------ */

const c = (q, a, b, possible) => (possible ? { q, a, b, possible: true } : { q, a, b });

/** Two-conclusion questions: { id, terms, statements, conclusions: [I, II] }; the key is the standard verdict. */
export const syllogismSets = [
  { id: 'syllogism-q-004', terms: ['pens', 'pencils', 'erasers'], statements: [c('all', 0, 1), c('all', 1, 2)], conclusions: [c('all', 0, 2), c('some', 2, 0)] },
  { id: 'syllogism-q-005', terms: ['cups', 'plates', 'bowls'], statements: [c('some', 0, 1), c('all', 1, 2)], conclusions: [c('some', 0, 2), c('all', 2, 1)] },
  { id: 'syllogism-q-006', terms: ['roses', 'flowers', 'trees'], statements: [c('all', 0, 1), c('no', 1, 2)], conclusions: [c('no', 0, 2), c('some', 2, 0)] },
  { id: 'syllogism-q-007', terms: ['doctors', 'teachers', 'singers'], statements: [c('some', 0, 1), c('no', 1, 2)], conclusions: [c('someNot', 0, 2), c('no', 0, 2)] },
  { id: 'syllogism-q-008', terms: ['cars', 'buses', 'trains'], statements: [c('no', 0, 1), c('some', 1, 2)], conclusions: [c('someNot', 2, 0), c('some', 0, 2)] },
  { id: 'syllogism-q-009', terms: ['pens', 'books', 'bags'], statements: [c('some', 0, 1), c('some', 1, 2)], conclusions: [c('some', 0, 2), c('no', 0, 2)] },
  { id: 'syllogism-q-010', terms: ['rings', 'coins', 'chains'], statements: [c('all', 0, 1), c('some', 1, 2)], conclusions: [c('all', 0, 2), c('someNot', 0, 2)] },
  { id: 'syllogism-q-011', terms: ['apples', 'fruits', 'seeds'], statements: [c('all', 0, 1), c('some', 1, 2)], conclusions: [c('some', 0, 2), c('no', 2, 0)] },
  { id: 'syllogism-q-012', terms: ['kites', 'birds', 'clouds'], statements: [c('all', 0, 1), c('no', 1, 2)], conclusions: [c('some', 0, 2), c('no', 0, 2)] },
  { id: 'syllogism-q-013', terms: ['chairs', 'tables', 'desks'], statements: [c('all', 0, 1), c('some', 1, 2)], conclusions: [c('all', 0, 2, true), c('all', 1, 0, true)] },
  { id: 'syllogism-q-014', terms: ['stars', 'planets', 'moons'], statements: [c('no', 0, 1), c('all', 1, 2)], conclusions: [c('some', 0, 2, true), c('all', 1, 0, true)] },
  { id: 'syllogism-q-015', terms: ['actors', 'painters', 'writers'], statements: [c('some', 0, 1), c('no', 1, 2)], conclusions: [c('all', 0, 2, true), c('someNot', 2, 1)] },
  { id: 'syllogism-q-016', terms: ['singers', 'dancers', 'poets'], statements: [c('all', 0, 1), c('some', 1, 2)], conclusions: [c('some', 0, 2, true), c('all', 2, 0, true)] },
  { id: 'syllogism-q-017', terms: ['teachers', 'writers', 'poets'], statements: [c('onlyFew', 0, 1), c('all', 1, 2)], conclusions: [c('all', 0, 1, true), c('some', 0, 2)] },
  { id: 'syllogism-q-018', terms: ['coins', 'rings', 'chains'], statements: [c('onlyFew', 0, 1), c('no', 1, 2)], conclusions: [c('someNot', 0, 2), c('all', 0, 2, true)] },
  { id: 'syllogism-q-019', terms: ['lions', 'cats', 'dogs', 'wolves'], statements: [c('all', 0, 1), c('some', 1, 2), c('no', 2, 3)], conclusions: [c('someNot', 1, 3), c('some', 0, 2)] },
  { id: 'syllogism-q-020', terms: ['bags', 'boxes', 'cartons', 'crates'], statements: [c('some', 0, 1), c('all', 1, 2), c('all', 2, 3)], conclusions: [c('some', 0, 3), c('some', 3, 1)] },
  { id: 'syllogism-q-021', terms: ['pens', 'inks', 'papers', 'files'], statements: [c('no', 0, 1), c('all', 1, 2), c('some', 2, 3)], conclusions: [c('some', 3, 0), c('no', 3, 0)] }
];

/** One statement, one option that definitely follows. */
export const syllogismPick = [
  { id: 'syllogism-q-001', terms: ['doctors', 'graduates'], statements: [c('all', 0, 1)], options: [c('all', 1, 0), c('some', 1, 0), c('no', 1, 0), c('someNot', 0, 1)] },
  { id: 'syllogism-q-002', terms: ['rivers', 'lakes'], statements: [c('no', 0, 1)], options: [c('no', 1, 0), c('some', 1, 0), c('all', 0, 1), c('some', 0, 1)] },
  { id: 'syllogism-q-003', terms: ['poets', 'singers'], statements: [c('some', 0, 1)], options: [c('some', 1, 0), c('all', 1, 0), c('someNot', 0, 1), c('no', 1, 0)] },
  // Multiple choice: every option that definitely follows.
  { id: 'syllogism-q-022', terms: ['mangoes', 'fruits', 'sweets'], statements: [c('all', 0, 1), c('some', 1, 2)], options: [c('some', 1, 0), c('some', 0, 2), c('some', 2, 1), c('all', 1, 0)], multiple: true }
];

export const syllogismAnswer = (set) => verdict(set.terms.length, set.statements, ...set.conclusions);
export const syllogismFollowing = (set) => set.options.filter((o) => follows(set.terms.length, set.statements, o));

/* ------------------------------ inequalities ------------------------------ */

const t = (s) => s.split(' ');
const cc = (s) => {
  const [x, op, y] = s.split(' ');
  return { x, op, y };
};

/** Coded key used by the coded questions: symbol → sign. */
export const IQ_KEY = { '@': '≥', '#': '>', $: '=', '%': '≤', '&': '<' };

export const inequalitySets = [
  { id: 'reasoning-inequalities-q-001', statements: [t('P > Q ≥ R = S')], conclusions: [cc('P > S'), cc('Q ≥ S')] },
  { id: 'reasoning-inequalities-q-002', statements: [t('A ≥ B > C ≤ D')], conclusions: [cc('A > C'), cc('D > B')] },
  { id: 'reasoning-inequalities-q-003', statements: [t('M < N = O ≤ P')], conclusions: [cc('M < P'), cc('P > N')] },
  { id: 'reasoning-inequalities-q-004', statements: [t('J ≤ K < L ≥ M > N')], conclusions: [cc('K < N'), cc('L > N')] },
  { id: 'reasoning-inequalities-q-005', statements: [t('R ≥ S = T ≤ U')], conclusions: [cc('R > T'), cc('R = T')] },
  { id: 'reasoning-inequalities-q-006', statements: [t('E > F ≤ G < H')], conclusions: [cc('E > H'), cc('E ≤ H')] },
  { id: 'reasoning-inequalities-q-007', statements: [t('V ≤ W ≥ X = Y')], conclusions: [cc('V < X'), cc('V ≥ X')] },
  { id: 'reasoning-inequalities-q-008', statements: [t('A > B ≥ C = D')], conclusions: [cc('A > D'), cc('A = D')] },
  { id: 'reasoning-inequalities-q-009', statements: [t('P ≥ Q > R'), t('R ≥ S = T')], conclusions: [cc('P > T'), cc('T < Q')] },
  { id: 'reasoning-inequalities-q-010', statements: [t('A < B ≤ C'), t('D ≥ C > E')], conclusions: [cc('A < D'), cc('E < B')] },
  { id: 'reasoning-inequalities-q-011', statements: [t('K = L ≥ M'), t('N < M ≤ O')], conclusions: [cc('K > N'), cc('O ≥ L')] },
  { id: 'reasoning-inequalities-q-012', statements: [t('F ≥ G = H'), t('H > I ≤ J'), t('J < K')], conclusions: [cc('F > I'), cc('K > I')] },
  { id: 'reasoning-inequalities-q-013', statements: [t('U > V ≥ W'), t('X ≤ W < Y'), t('Y = Z')], conclusions: [cc('U > X'), cc('Z > V')] },
  { id: 'reasoning-inequalities-q-014', coded: true, statements: [t('P # Q'), t('Q @ R'), t('R $ S')], conclusions: [cc('P # S'), cc('S & Q')] },
  { id: 'reasoning-inequalities-q-015', coded: true, statements: [t('A % B'), t('B & C'), t('C @ D')], conclusions: [cc('A & C'), cc('D # A')] },
  { id: 'reasoning-inequalities-q-016', coded: true, statements: [t('M @ N'), t('N $ O'), t('O % P')], conclusions: [cc('M # O'), cc('M $ O')] },
  { id: 'reasoning-inequalities-q-017', coded: true, statements: [t('H & J'), t('J % K'), t('K $ L')], conclusions: [cc('H & L'), cc('L @ J')] }
];

/** Decode a coded set into plain signs. */
export function decodeSet(set) {
  if (!set.coded) return set;
  const sign = (tok) => IQ_KEY[tok] || tok;
  return {
    ...set,
    statements: set.statements.map((s) => s.map(sign)),
    conclusions: set.conclusions.map((x) => ({ ...x, op: sign(x.op) }))
  };
}

export const inequalityAnswer = (set) => {
  const plain = decodeSet(set);
  return iqVerdict(plain.statements.flatMap(chainRelations), ...plain.conclusions);
};

/** Missing sign: the one sign that makes every target exactly true. */
export const missingSignSets = [
  { id: 'reasoning-inequalities-q-018', expression: t('A < B ? C ≤ D'), targets: [cc('A < D'), cc('B < C')] },
  { id: 'reasoning-inequalities-q-019', expression: t('P = Q ? R ≤ S'), targets: [cc('P ≤ S'), cc('Q = R')] },
  { id: 'reasoning-inequalities-q-020', expression: t('G ≥ H ? I ≥ J'), targets: [cc('G > J'), cc('H > I')] }
];

export function missingSignAnswer(set) {
  const gap = set.expression.indexOf('?');
  const working = ['>', '≥', '=', '≤', '<'].filter((op) => {
    const tokens = set.expression.slice();
    tokens[gap] = op;
    const rel = chainRelations(tokens);
    return set.targets.every((x) => pathRelation(rel, x.x, x.y) === x.op);
  });
  return only([working]);
}

/** Multiple choice: which of these are definitely true. */
export const inequalityPick = {
  id: 'reasoning-inequalities-q-021',
  statements: [t('P ≥ Q > R = S ≤ T')],
  options: ['P > R', 'T > R', 'S < P', 'Q = S']
};

export const inequalityPickAnswer = (set) => {
  const rel = set.statements.flatMap(chainRelations);
  return set.options.filter((o) => {
    const x = cc(o);
    return pathRelation(rel, x.x, x.y) === x.op;
  });
};

/** Which pair of signs on a path leaves no definite relation? Checked on X a Y b Z. */
export const signPairQuestion = {
  id: 'reasoning-inequalities-q-022',
  options: { '≥ and >': ['≥', '>'], '= and <': ['=', '<'], '> and ≤': ['>', '≤'], '≤ and <': ['≤', '<'] },
  answer() {
    return only([Object.keys(this.options).filter((k) => pathRelation(chainRelations(['X', this.options[k][0], 'Y', this.options[k][1], 'Z']), 'X', 'Z') === 'none')]);
  }
};

/* ------------------------------ blood relations ------------------------------ */

/**
 * { id, names, statements: [[a, rel, b]], ask: [x, y] } asks "how is x related
 * to y"; the key is the relation word, capitalised, or "Cannot be determined"
 * when the statements leave a gender open. `deduced` marks sets whose
 * statements are the deduction from a "pointing" sentence, written out.
 */
const st = (list) => list.map(([a, rel, b]) => ({ a, rel, b }));
const T1 = ['Mohan', 'Kamala', 'Suresh', 'Lata', 'Priya', 'Arun', 'Vikram', 'Bindu'];
const T1S = st([[0, 'husband', 1], [2, 'son', 1], [3, 'sister', 2], [4, 'wife', 2], [5, 'son', 4], [6, 'husband', 3], [7, 'daughter', 6]]);
const T2 = ['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'];
const T2S = st([[0, 'father', 1], [2, 'wife', 0], [3, 'brother', 1], [4, 'wife', 3], [5, 'daughter', 4], [6, 'son', 1], [7, 'husband', 1]]);

export const bloodSets = [
  { id: 'blood-relations-q-001', names: ['Ravi', 'Meena', 'Arjun'], statements: st([[0, 'brother', 1], [1, 'mother', 2]]), ask: [0, 2] },
  { id: 'blood-relations-q-002', names: ['Sunita', 'Prakash', 'Nisha'], statements: st([[0, 'wife', 1], [1, 'father', 2]]), ask: [0, 2] },
  { id: 'blood-relations-q-003', names: ['Kamala', 'Deepak', 'Uma'], statements: st([[0, 'mother', 1], [1, 'father', 2]]), ask: [0, 2] },
  // "His mother is the only daughter of my mother": the man's mother is Neha herself.
  { id: 'blood-relations-q-004', deduced: true, names: ['Neha', 'the man'], statements: st([[0, 'mother', 1]]), ask: [0, 1] },
  // "the only son of my father's father" is Arun's father, so the girl is his father's daughter.
  { id: 'blood-relations-q-005', deduced: true, names: ['Arun', 'Arun’s father', 'the girl'], statements: st([[0, 'son', 1], [2, 'daughter', 1]]), ask: [2, 0] },
  { id: 'blood-relations-q-006', names: ['Gopal', 'Radha’s brother', 'Radha'], statements: st([[0, 'son', 1], [2, 'sister', 1]]), ask: [2, 0], deduced: true },
  { id: 'blood-relations-q-007', names: T1, statements: T1S, ask: [7, 5] },
  { id: 'blood-relations-q-008', names: T1, statements: T1S, ask: [6, 0] },
  { id: 'blood-relations-q-009', names: T1, statements: T1S, ask: [4, 3] },
  { id: 'blood-relations-q-010', names: T1, statements: T1S, ask: [1, 7] },
  { id: 'blood-relations-q-011', names: T2, statements: T2S, ask: [5, 1] },
  { id: 'blood-relations-q-012', names: T2, statements: T2S, ask: [7, 3] },
  { id: 'blood-relations-q-013', names: T2, statements: T2S, ask: [2, 6] },
  { id: 'blood-relations-q-014', names: T2, statements: T2S, ask: [4, 0] },
  // Coded: + father, − wife, × brother, ÷ daughter.
  { id: 'blood-relations-q-015', coded: 'P × Q + R', names: ['P', 'Q', 'R'], statements: st([[0, 'brother', 1], [1, 'father', 2]]), ask: [0, 2] },
  { id: 'blood-relations-q-016', coded: 'P ÷ Q − R', names: ['P', 'Q', 'R'], statements: st([[0, 'daughter', 1], [1, 'wife', 2]]), ask: [2, 0] },
  { id: 'blood-relations-q-017', coded: 'P + Q − R × S', names: ['P', 'Q', 'R', 'S'], statements: st([[0, 'father', 1], [1, 'wife', 2], [2, 'brother', 3]]), ask: [2, 0] },
  { id: 'blood-relations-q-018', coded: 'P × Q ÷ R + S', names: ['P', 'Q', 'R', 'S'], statements: st([[0, 'brother', 1], [1, 'daughter', 2], [2, 'father', 3]]), ask: [0, 3] },
  { id: 'blood-relations-q-019', names: ['Neel', 'Kavi', 'Asha'], statements: st([[0, 'brother', 1], [1, 'child', 2]]), ask: [1, 0] },
  // "Kiran's father is my father's only son", said by Mala, a woman: that son is her brother.
  { id: 'blood-relations-q-021', deduced: true, names: ['Mala', 'Mala’s brother', 'Kiran'], statements: st([[1, 'brother', 0], [0, 'sister', 1], [1, 'father', 2]]), ask: [2, 0] }
];

export const BLOOD_CODE = { '+': 'father', '−': 'wife', '×': 'brother', '÷': 'daughter' };

export function bloodAnswer(set) {
  const family = buildFamily(set.names.length, set.statements);
  const word = relationByPath(family, set.ask[0], set.ask[1]);
  if (!word) throw new Error(`${set.id}: no relation found`);
  return word.includes(' or ') ? 'Cannot be determined' : word.charAt(0).toUpperCase() + word.slice(1);
}

/** Whose gender the statements fix (multiple choice). */
export const bloodGenderPick = {
  id: 'blood-relations-q-020',
  names: ['P', 'Q', 'R', 'S', 'T'],
  statements: st([[0, 'father', 1], [2, 'sister', 1], [3, 'husband', 2], [4, 'child', 3]]),
  answer() {
    const family = buildFamily(5, this.statements);
    return this.names.filter((_, i) => family.gender[i]);
  }
};

/** Generations. */
export const bloodGenerations = [
  { id: 'blood-relations-q-022', names: T1, statements: T1S, answer: () => Math.max(...generations(buildFamily(8, T1S))) + 1 },
  {
    id: 'blood-relations-q-023',
    names: T2,
    statements: T2S,
    answer: () => {
      const g = generations(buildFamily(8, T2S));
      return Math.abs(g[2] - g[5]);
    }
  }
];

export { solveSeating, solveSeatingGeometric, solvePuzzle, solvePuzzleByHolders };
