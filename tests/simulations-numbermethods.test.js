/**
 * Simulations for remainders, factorials, roots and speed maths
 * (src/simulations/numberMethods.js): the maths checked against independent
 * calculations (BigInt powers, n! itself, plain multiplication), and the
 * pictures kept inside their frames at every setting.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { factorialBig } from '../src/utils/numberTheory.js';

const compute = (id, values) => run(getSimulation(id), { ...initialValues(getSimulation(id)), ...values }).result;
const numbers = (id, values) => compute(id, values).numbers;
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const bigPowMod = (a, k, n) => Number(BigInt(a) ** BigInt(k) % BigInt(n));

describe('remainder wheel', () => {
  it('lands every power on its true remainder, and walks only between visited positions', () => {
    for (const n of range(2, 20)) {
      for (const a of range(2, 20)) {
        for (const k of [1, 5, 12, 24]) {
          const result = compute('remainder-wheel', { a, n, k });
          const s = result.numbers;
          expect(s.remainder, `${a}^${k} mod ${n}`).toBe(bigPowMod(a, k, n));
          expect(s.sequence).toEqual(range(1, k).map((j) => bigPowMod(a, j, n)));
          // Every chord joins two positions that the powers really visit, in order.
          for (const [i, step] of result.plot.path.entries()) expect([step.from, step.to]).toEqual([s.sequence[i], s.sequence[i + 1]]);
          expect(result.plot.positions).toHaveLength(n);
          expect(result.plot.positions.filter((p) => p.state === 'current').map((p) => p.value)).toEqual([s.remainder]);
        }
      }
    }
  });

  it('finds the loop, which divides φ(n) when the base and divisor share no factor', () => {
    const seven = numbers('remainder-wheel', { a: 3, n: 7 });
    expect(seven.cycleValues).toEqual([3, 2, 6, 4, 5, 1]);
    expect(numbers('remainder-wheel', { a: 7, n: 10 }).cycleValues).toEqual([7, 9, 3, 1]);
    expect(numbers('remainder-wheel', { a: 2, n: 12 })).toMatchObject({ tail: 1, cycle: 2, coprime: false });
    for (const n of range(2, 20)) {
      for (const a of range(2, 20)) {
        const s = numbers('remainder-wheel', { a, n });
        if (s.coprime) {
          expect(s.phi % s.cycle, `${a} mod ${n}`).toBe(0);
          expect(s.tail).toBe(0);
          expect(bigPowMod(a, s.cycle, n)).toBe(1 % n);
        }
      }
    }
  });
});

describe('counting primes inside n!', () => {
  it("counts each prime's power and the zeros from n! itself", () => {
    for (const n of range(5, 100)) {
      const digits = factorialBig(n).toString();
      const zeros = digits.length - digits.replace(/0+$/, '').length;
      for (const p of ['2', '3', '5', '7']) {
        const s = numbers('factorial-fives', { n, p });
        let f = factorialBig(n);
        let k = 0;
        while (f % BigInt(p) === 0n) {
          f /= BigInt(p);
          k += 1;
        }
        expect(s.exponent, `${p} in ${n}!`).toBe(k);
        expect(s.zeros, `${n}!`).toBe(zeros);
      }
    }
    expect(numbers('factorial-fives', { n: 100, p: '5' }).layers).toEqual([20, 4]);
  });

  it('shades exactly the multiples of p, one cell for each number', () => {
    const result = compute('factorial-fives', { n: 30, p: '5' });
    const cells = result.plot.rects.filter((r) => r.label);
    expect(cells.map((r) => r.label)).toEqual(range(1, 30).map(String));
    expect(cells.filter((r) => !r.faint).map((r) => Number(r.label))).toEqual([5, 10, 15, 20, 25, 30]);
    for (const r of result.plot.rects) {
      expect(r.x + r.w).toBeLessThanOrEqual(result.plot.width);
      expect(r.y + r.h).toBeLessThanOrEqual(result.plot.height);
    }
  });
});

describe('square root from its two ends', () => {
  it('always recovers the hidden root, for squares and cubes', () => {
    for (const r of range(11, 99)) {
      const sq = numbers('root-bracket', { kind: 'square', r, step: 3 });
      expect(sq.N).toBe(r * r);
      expect(sq.root).toBe(r);
      expect(sq.candidates).toContain(r);
      expect(sq.candidates.every((c) => (c * c) % 10 === sq.unit)).toBe(true);
      const cube = numbers('root-bracket', { kind: 'cube', r, step: 3 });
      expect(cube.N).toBe(r ** 3);
      expect(cube.root).toBe(r);
      expect(cube.candidates).toEqual([r]);
    }
  });

  it('shows one more row for each step, inside the frame', () => {
    const rows = (step) => new Set(compute('root-bracket', { r: 47, step }).plot.rects.map((r) => r.y)).size;
    expect([1, 2, 3].map(rows)).toEqual([1, 2, 3]);
    const plot = compute('root-bracket', { kind: 'cube', r: 99, step: 3 }).plot;
    for (const r of plot.rects) expect(r.x + r.w).toBeLessThanOrEqual(plot.width);
    expect(compute('root-bracket', { r: 73, step: 3 }).readouts[3].value).toMatch(/75² = 5,625 is more than 5,329, so the root is 73/);
  });
});

describe('the base method as an area', () => {
  it('splits every product into hundreds and a corner', () => {
    for (const x of range(80, 120)) {
      for (const y of range(80, 120)) {
        const s = numbers('base-method', { x, y });
        expect(s.product).toBe(x * y);
        expect(100 * s.left + s.right).toBe(x * y);
        expect(s.right).toBe((x - 100) * (y - 100));
      }
    }
  });

  it('draws the strips and the corner where the gaps are', () => {
    const below = compute('base-method', { x: 97, y: 96 }).plot.rects;
    expect(below.find((r) => r.tone === 'data')).toMatchObject({ x: 97, y: 96, w: 3, h: 4 });
    const atBase = compute('base-method', { x: 100, y: 93 }).plot.rects;
    expect(atBase.some((r) => r.tone === 'data')).toBe(false);
    expect(compute('base-method', { x: 104, y: 97 }).readouts[3].value).toMatch(/borrow 100: 10,088/);
  });
});
