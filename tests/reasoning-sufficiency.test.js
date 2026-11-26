/**
 * Reasoning data sufficiency: the solver (src/utils/reasoning/sufficiency.js),
 * its generators and its simulation.
 *
 * The solver is held to hand-worked textbook cases, and each of its two methods
 * (step tables against geometry for seating, every order against chains of
 * comparisons, structure against paths for families, a direction table against
 * complex numbers for walks) to the other on many random problems. Generated
 * questions must give the keyed choice by both methods, cover all five choices,
 * and never leave a second option that is also right.
 */

import { describe, it, expect } from 'vitest';

import { createRng } from '../src/generators/core.js';
import { getTemplate } from '../src/generators/index.js';
import { buildInstance } from '../src/generators/engine.js';
import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { solveComparisons } from '../src/utils/reasoning/ranking.js';
import {
  DS_CHOICES,
  arrangementSets,
  arrangementSetsGeometric,
  checkedChoice,
  consistent,
  directionSets,
  directionSetsComplex,
  dsChoiceIndex,
  placeRange,
  rankingSets,
  rankingSetsByClosure,
  relationSets,
  relationSetsByPath,
  settled,
  solveBothWays,
  surelyAbove,
  verdict
} from '../src/utils/reasoning/sufficiency.js';
import { DS_ARRANGEMENT_PROBLEMS } from '../src/simulations/reasoningSufficiency.js';

const same = (a, b) => ['one', 'two', 'both'].every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
const letter = (problem) => 'ABCDE'[checkedChoice(problem)];

describe('the five answers', () => {
  it('follow the standard rules', () => {
    expect(dsChoiceIndex(true, false, true)).toBe(0);
    expect(dsChoiceIndex(false, true, true)).toBe(1);
    expect(dsChoiceIndex(false, false, true)).toBe(2);
    expect(dsChoiceIndex(true, true, true)).toBe(3);
    expect(dsChoiceIndex(false, false, false)).toBe(4);
    // Each alone sufficient is D even though "together" is also sufficient.
    expect(verdict({ one: ['x'], two: ['x'], both: ['x'] })).toBe(3);
    expect(DS_CHOICES).toHaveLength(5);
  });

  it('count a definite No as an answer, and an unknown relation as none', () => {
    expect(settled(['No'])).toBe(true);
    expect(settled(['No', 'Yes'])).toBe(false);
    expect(settled([null])).toBe(false);
  });
});

describe('textbook cases', () => {
  it('arrangements: answer fixed though two seatings remain', () => {
    const p = { kind: 'arrangement', layout: 'row', setting: 'row', people: ['A', 'B', 'C', 'D'], base: [], one: [{ t: 'end', p: 0 }, { t: 'side', p: 1, q: 0, side: 'right', k: 1 }], two: [{ t: 'end', p: 0 }], ask: { q: 'at', seat: 0 } };
    const sets = arrangementSets(p);
    expect(sets.counts.one).toBe(2);
    expect(sets.one).toEqual([0]);
    expect(sets.two).toEqual([0, 1, 2, 3]);
    expect(letter(p)).toBe('A');
  });

  it('ranking: a person in no comparison can be on top', () => {
    const more = (a, b) => ({ more: [a, b] });
    const p = { kind: 'ranking', people: ['A', 'B', 'C', 'D'], base: [], one: [more(0, 1), more(0, 2)], two: [more(3, 0)], ask: { q: 'kth', k: 1 } };
    expect(rankingSets(p).one).toEqual([0, 3]);
    expect(letter(p)).toBe('C');
    // Places run from (surely above + 1) to (n − surely below).
    const above = surelyAbove(4, [more(3, 0), more(0, 1), more(0, 2)]);
    expect(placeRange(4, above, 0)).toEqual([2, 2]);
    expect(placeRange(4, above, 1)).toEqual([3, 4]);
  });

  it('ranking: a definite No is sufficient', () => {
    const more = (a, b) => ({ more: [a, b] });
    const p = { kind: 'ranking', people: ['T', 'U', 'V', 'Y'], base: [], one: [more(1, 2), more(2, 0)], two: [more(3, 0)], ask: { q: 'more', a: 0, b: 1 } };
    expect(rankingSets(p).one).toEqual(['No']);
    expect(letter(p)).toBe('A');
  });

  it('relations: siblings of unknown gender are not settled; an in-law is', () => {
    const siblings = { kind: 'relation', n: 3, people: ['P', 'Q', 'R'], base: [], one: [{ a: 0, rel: 'child', b: 2 }], two: [{ a: 2, rel: 'father', b: 1 }], ask: { x: 0, y: 1 } };
    expect(letter(siblings)).toBe('E');
    const withSon = { ...siblings, one: [{ a: 0, rel: 'son', b: 2 }] };
    expect(relationSets(withSon).both).toEqual(['brother']);
    expect(letter(withSon)).toBe('C');
    const inLaw = { kind: 'relation', n: 3, people: ['K', 'M', 'N'], base: [], one: [{ a: 1, rel: 'wife', b: 0 }, { a: 0, rel: 'son', b: 2 }], two: [{ a: 2, rel: 'mother', b: 0 }], ask: { x: 1, y: 2 } };
    expect(relationSets(inLaw).one).toEqual(['daughter-in-law']);
    expect(letter(inLaw)).toBe('A');
  });

  it('directions: the final facing after a known turn fixes the start', () => {
    const p = { kind: 'direction', starts: ['north', 'east', 'south', 'west'], steps: [{ go: 5 }, { turn: 'left', go: 3 }], base: [], one: [{ t: 'start', dir: 'north' }], two: [{ t: 'end', dir: 'west' }], ask: { q: 'where' } };
    expect(directionSets(p).none).toHaveLength(4);
    expect(directionSets(p).two).toEqual(['north-west']);
    expect(letter(p)).toBe('D');
  });
});

/* ------------------------------ two methods, many random problems ------------------------------ */

const NAMES6 = ['A', 'B', 'C', 'D', 'E', 'F'];

function randomClue(rng, layout, n) {
  const p = rng.int(0, n - 1);
  let q = rng.int(0, n - 2);
  if (q >= p) q += 1;
  const kinds = layout === 'row' ? ['pos', 'end', 'notEnd', 'side', 'adj', 'notAdj', 'gap'] : ['side', 'adj', 'notAdj', 'opp'];
  const t = rng.pick(kinds);
  if (t === 'pos') return { t, p, k: rng.int(1, n), from: rng.pick(['left', 'right']) };
  if (t === 'end' || t === 'notEnd') return { t, p };
  if (t === 'side') return { t, p, q, side: rng.pick(['left', 'right']), k: rng.int(1, 2) };
  if (t === 'gap') return { t, p, q, k: rng.int(0, 2) };
  return { t, p, q };
}

describe('the two methods agree', () => {
  it('on arrangements: step tables against geometry, for rows and circles', () => {
    const rng = createRng(11);
    for (let i = 0; i < 150; i++) {
      const layout = rng.pick(['row', 'circle']);
      const n = layout === 'row' ? rng.int(4, 5) : 6;
      const clues = (k) => Array.from({ length: k }, () => randomClue(rng, layout, n));
      const asks = layout === 'row' ? [{ q: 'at', seat: rng.int(0, n - 1) }, { q: 'pos', p: rng.int(0, n - 1) }, { q: 'gap', p: 0, r: 1 }, { q: 'yes', clue: { t: 'end', p: 2 } }] : [{ q: 'opp', p: rng.int(0, n - 1) }, { q: 'side', p: 0, side: 'left', k: 2 }];
      const p = { kind: 'arrangement', layout, setting: layout, people: NAMES6.slice(0, n), base: clues(rng.int(0, 1)), one: clues(rng.int(1, 2)), two: clues(rng.int(1, 2)), ask: rng.pick(asks) };
      expect(same(arrangementSets(p), arrangementSetsGeometric(p)), JSON.stringify(p)).toBe(true);
    }
  });

  it('on rankings: every order against chains of comparisons', () => {
    const rng = createRng(12);
    for (let i = 0; i < 300; i++) {
      const n = rng.int(3, 5);
      const truth = rng.shuffle(Array.from({ length: n }, (_, k) => k));
      const fact = () => {
        const [x, y] = rng.shuffle([0, 1, 2, 3, 4].slice(0, n)).slice(0, 2);
        return truth.indexOf(x) < truth.indexOf(y) ? { more: [x, y] } : { more: [y, x] };
      };
      const facts = (k) => Array.from({ length: k }, fact);
      const ask = rng.pick([{ q: 'kth', k: rng.int(1, n) }, { q: 'rank', p: rng.int(0, n - 1) }, { q: 'more', a: 0, b: 1 }]);
      const p = { kind: 'ranking', people: NAMES6.slice(0, n), base: facts(rng.int(0, 2)), one: facts(rng.int(1, 2)), two: facts(rng.int(1, 2)), ask };
      expect(same(rankingSets(p), rankingSetsByClosure(p)), JSON.stringify(p)).toBe(true);
    }
  });

  it('on rankings: possible places are exactly the closure interval, for every set of facts on four people', () => {
    const rng = createRng(13);
    for (let i = 0; i < 200; i++) {
      const truth = rng.shuffle([0, 1, 2, 3]);
      const facts = Array.from({ length: rng.int(0, 4) }, () => {
        const [a, b] = rng.shuffle([0, 1, 2, 3]).slice(0, 2);
        return truth.indexOf(a) < truth.indexOf(b) ? { more: [a, b] } : { more: [b, a] };
      });
      const orders = solveComparisons(4, facts);
      const above = surelyAbove(4, facts);
      for (let p = 0; p < 4; p++) {
        const places = [...new Set(orders.map((o) => o.indexOf(p) + 1))].sort();
        const [lo, hi] = placeRange(4, above, p);
        expect(places).toEqual(Array.from({ length: hi - lo + 1 }, (_, k) => lo + k));
      }
    }
  });

  it('on families: structure against paths', () => {
    const rng = createRng(14);
    const rels = ['father', 'mother', 'son', 'daughter', 'brother', 'sister', 'parent', 'child', 'sibling'];
    for (let i = 0; i < 200; i++) {
      // A chain of statements through four people, so the family is a tree.
      const order = rng.shuffle([0, 1, 2, 3]);
      const statements = [0, 1, 2].map((k) => ({ a: order[k], rel: rng.pick(rels), b: order[k + 1] }));
      const [one, two, extra] = rng.shuffle(statements);
      const p = { kind: 'relation', n: 4, people: ['P', 'Q', 'R', 'S'], base: [extra], one: [one], two: [two], ask: { x: order[0], y: order[3] } };
      expect(same(relationSets(p), relationSetsByPath(p)), JSON.stringify(p)).toBe(true);
    }
  });

  it('on walks: a direction table against complex numbers', () => {
    const rng = createRng(15);
    const dirs = ['north', 'east', 'south', 'west'];
    for (let i = 0; i < 200; i++) {
      const steps = [{ go: rng.int(1, 6) }, ...Array.from({ length: rng.int(1, 3) }, () => ({ turn: rng.pick(['left', 'right', '?']), go: rng.int(1, 6) }))];
      const fact = () =>
        rng.pick([
          { t: 'start', dir: rng.pick(dirs) },
          { t: 'end', dir: rng.pick(dirs) },
          { t: 'leg', i: rng.int(0, steps.length - 1), dir: rng.pick(dirs) },
          { t: 'where', dir: rng.pick(['north-east', 'south-west', 'north', 'east']) }
        ]);
      const p = { kind: 'direction', starts: dirs, steps, base: [], one: [fact()], two: [fact()], ask: { q: rng.pick(['where', 'facing']) } };
      expect(same(directionSets(p), directionSetsComplex(p)), JSON.stringify(p)).toBe(true);
    }
  });
});

/* ------------------------------ generated questions ------------------------------ */

const IDS = ['rds-gen-floors', 'rds-gen-row', 'rds-gen-circle', 'rds-gen-ranking', 'rds-gen-rank-place', 'rds-gen-yes-no', 'rds-gen-relation', 'rds-gen-direction'];

describe('generated reasoning DS questions', () => {
  it('give the keyed choice by both methods, offer the five choices in order, and cover every choice', () => {
    for (const id of IDS) {
      const template = getTemplate(id);
      const seen = new Set();
      let made = 0;
      for (let seed = 1; seed <= 120; seed++) {
        const { question } = buildInstance(template, seed);
        if (!question) continue;
        made++;
        expect(question.options.map((o) => o.text)).toEqual(DS_CHOICES);
        const keyed = question.options.find((o) => o.id === question.correctAnswer[0]).text;
        // The keyed option is the one choice both methods give (checkedChoice is null if they differ anywhere).
        expect(keyed).toBe(DS_CHOICES[checkedChoice(question.parameters.problem)]);
        // Not answerable before the statements, and no combination is a contradiction.
        const [sets] = solveBothWays(question.parameters.problem);
        expect(consistent(sets) && !settled(sets.none), `${id} seed ${seed}`).toBe(true);
        seen.add(keyed);
      }
      expect(made, id).toBeGreaterThan(60);
      expect(seen.size, `${id} covers the five choices`).toBe(5);
    }
  });
});

/* ------------------------------ simulation ------------------------------ */

const result = (values) => run(getSimulation('ds-arrangements'), { ...initialValues(getSimulation('ds-arrangements')), ...values }).result;

describe('ds-arrangements', () => {
  it('strikes out exactly the rows a statement breaks, and agrees with the solver', () => {
    const expected = { p1: 'C', p2: 'D', p3: 'E' };
    for (const [id, problem] of Object.entries(DS_ARRANGEMENT_PROBLEMS)) {
      expect(letter(problem)).toBe(expected[id]);
      const sets = arrangementSets(problem);
      for (const [one, two, key] of [['off', 'off', 'none'], ['on', 'off', 'one'], ['off', 'on', 'two'], ['on', 'on', 'both']]) {
        const r = result({ problem: id, one, two });
        expect(r.numbers.option).toBe(expected[id]);
        expect(r.numbers.left).toBe(sets.counts[key]);
        expect(r.numbers.answers).toBe(sets[key].length);
        expect(r.numbers.enough).toBe(settled(sets[key]));
        expect(r.plot.rows).toHaveLength(sets.counts.none);
        expect(r.plot.rows.filter((row) => !row.out)).toHaveLength(sets.counts[key]);
      }
    }
  });
});
