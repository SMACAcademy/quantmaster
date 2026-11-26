/**
 * The second set of reasoning simulations (src/simulations/reasoningMore.js).
 * The general checks (controls, corners, challenges, meta) run in
 * simulations.test.js; these hold each picture to the solvers: the walker's
 * position and the way back, the coding wheels against the coding rules, the
 * row counted from both ends, the cut cube against brute-force counts, and the
 * folded paper against both hole-finding methods.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { applyRule } from '../src/utils/reasoning/coding.js';
import { paintedCounts } from '../src/utils/reasoning/cubes.js';
import { holesByReflection, mirrorTimeByHands, timeText } from '../src/utils/reasoning/mirror.js';
import { levelRepository } from '../src/repositories/contentRepository.js';

const result = (id, values) => run(getSimulation(id), { ...initialValues(getSimulation(id)), ...values }).result;

describe('direction-walk', () => {
  it('walks each leg and draws the way back', () => {
    const r1 = [0, 1, 2, 3, 4, 5].map((k) => result('direction-walk', { route: 'r1', steps: k }).numbers);
    expect(r1.map((n) => [n.x, n.y])).toEqual([[0, 0], [0, 4], [3, 4], [3, -4], [6, -4], [6, 8]]);
    expect(r1.map((n) => n.distance)).toEqual([0, 4, 5, 5, Math.hypot(6, 4), 10]);
    expect(r1[5].direction).toBe('north-east');
    const end = result('direction-walk', { route: 'r2', steps: 5 });
    expect([end.numbers.x, end.numbers.y, end.numbers.distance, end.numbers.direction]).toEqual([-4, -3, 5, 'south-west']);
    expect(end.plot.points.at(-1)).toEqual([-4, -3]);
    expect(end.plot.steps.every((s) => s.state !== 'pending')).toBe(true);
  });
});

describe('coding-wheels', () => {
  it('codes the word by the rule shown on the wheels', () => {
    for (const word of ['INDIA', 'MANGO', 'ZEBRA']) {
      for (let shift = 0; shift < 26; shift++) {
        const r = result('coding-wheels', { mode: 'shift', shift, word });
        expect(r.numbers.code).toBe(applyRule(word, { kind: 'shift', ks: [shift] }));
        // The inner wheel, read against the outer one, is the same rule.
        expect(r.plot.outer.map((ch, i) => [ch, r.plot.inner[i]]).every(([ch, code]) => applyRule(ch, { kind: 'shift', ks: [shift] }) === code)).toBe(true);
      }
      const opp = result('coding-wheels', { mode: 'opposite', word });
      expect(opp.numbers.code).toBe(applyRule(word, { kind: 'opposite' }));
      expect(opp.numbers.selfInverse).toBe(true);
    }
    expect(result('coding-wheels', { shift: 13 }).numbers.selfInverse).toBe(true);
    expect(result('coding-wheels', { shift: 12 }).numbers.selfInverse).toBe(false);
  });
});

describe('ranking-row', () => {
  it('always gets the total back from left + right − 1, and counts the people between', () => {
    for (let n = 5; n <= 15; n++) for (let a = 1; a <= 15; a++) for (let b = 1; b <= 15; b++) for (const swap of ['off', 'on']) {
      const r = result('ranking-row', { n, a, b, swap }).numbers;
      expect(r.aLeft + r.aRight - 1).toBe(n);
      expect(r.aLeft).not.toBe(r.bLeft);
      expect(r.between).toBe(Math.abs(r.aLeft - r.bLeft) - 1);
    }
    const swapped = result('ranking-row', { n: 13, a: 3, b: 9, swap: 'on' }).numbers;
    expect([swapped.aLeft, swapped.aRight, swapped.bLeft]).toEqual([9, 5, 3]);
  });
});

describe('cube-paint', () => {
  it('colours the visible small cubes by painted faces and counts them by brute force', () => {
    for (let n = 2; n <= 8; n++) {
      const r = result('cube-paint', { view: 'cube', n });
      expect(r.numbers.counts).toEqual(paintedCounts(n));
      expect(r.plot.squares).toHaveLength(3 * n * n);
      // Each visible face shows its 4 corner squares in the three-face colour.
      expect(r.plot.squares.filter((s) => s.k === 3)).toHaveLength(12);
    }
  });

  it('shows the standard die’s opposite faces on its net', () => {
    for (const pair of ['1', '2', '3']) {
      const r = result('cube-paint', { view: 'net', pair });
      expect(Number(pair) + Number(r.numbers.opposite)).toBe(7);
    }
  });
});

describe('paper-fold', () => {
  it('opens out with the holes both methods give, 2 to the number of folds per punch', () => {
    const patterns = { one: ['left'], two: ['left', 'top'], diagonal: ['left', 'top', 'diag'] };
    for (const [folds, list] of Object.entries(patterns)) for (const punch of ['p1', 'p2']) {
      const r = result('paper-fold', { mode: 'paper', folds, punch, stage: 5 });
      expect(r.numbers.stage).toBe('opened');
      expect(r.plot.holes).toHaveLength(2 ** list.length);
      expect(r.plot.holes).toEqual(holesByReflection(8, list, result('paper-fold', { mode: 'paper', folds, punch, stage: list.length + 1 }).plot.punches));
    }
    const start = result('paper-fold', { mode: 'paper', folds: 'two', stage: 0 });
    expect(start.numbers.layers).toBe(1);
    expect(result('paper-fold', { mode: 'paper', folds: 'two', stage: 2 }).numbers.layers).toBe(4);
  });

  it('reads the mirror clock by reflecting the hands', () => {
    for (let hour = 1; hour <= 12; hour++) for (let minute = 0; minute < 60; minute += 5) {
      const r = result('paper-fold', { mode: 'clock', hour, minute });
      expect(r.numbers.mirror).toBe(timeText(mirrorTimeByHands(hour, minute)));
    }
  });
});

it('puts each new reasoning simulation first in its topic’s first lesson', () => {
  const firsts = {
    'direction-sense': 'direction-walk',
    'coding-decoding': 'coding-wheels',
    'order-ranking': 'ranking-row',
    'cubes-dice': 'cube-paint',
    'mirror-paper-folding': 'paper-fold'
  };
  for (const [topic, sim] of Object.entries(firsts)) {
    const lesson = levelRepository.getById(`${topic}-level-0`).lesson.blocks;
    expect(lesson[0], topic).toEqual({ type: 'simulation', simulationId: sim });
  }
});
