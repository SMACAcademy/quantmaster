/**
 * Simulations for modulus, polynomials, integer solutions and cryptarithms
 * (src/simulations/catTopics.js): each model checked against an independent
 * calculation (a scan of x, plain substitution, trying every x, trying every
 * digit assignment), at every setting of its sliders.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { SOLVER_PUZZLES } from '../src/simulations/catTopics.js';
import { bruteForce, columnCount, lettersOf } from '../src/utils/cryptarithm.js';

const compute = (id, values) => run(getSimulation(id), { ...initialValues(getSimulation(id)), ...values }).result;
const numbers = (id, values) => compute(id, values).numbers;
const range = (from, to, step = 1) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);

describe('modulus as distance', () => {
  const f = (x, centres) => centres.reduce((s, p) => s + Math.abs(x - p), 0);

  it('reads |x − a| (+ |x − b|) at the moving point and finds the least value by scanning', () => {
    for (const a of range(-6, 6)) {
      for (const b of range(-6, 6, 3)) {
        const centres = [a, b];
        const scan = range(-10, 10, 0.25).map((x) => f(x, centres));
        const least = Math.min(...scan);
        for (const x of [-10, -2.5, 0, 4, 10]) {
          const n = numbers('modulus-distance', { mode: 'two', a, b, x, c: 5 });
          expect(n.value).toBe(f(x, centres));
          expect(n.distanceA + n.distanceB).toBe(n.value);
          expect(n.min).toBe(least);
          expect(n.min).toBe(Math.abs(a - b));
        }
      }
    }
  });

  it('counts the solutions of f(x) = c the way a fine scan sees them', () => {
    for (const mode of ['one', 'two']) {
      for (const a of range(-6, 6, 2)) {
        for (const b of range(-6, 6, 3)) {
          for (const c of range(0, 16)) {
            const centres = mode === 'two' ? [a, b] : [a];
            const n = numbers('modulus-distance', { mode, a, b, c });
            const hits = range(-30, 30, 0.5).filter((x) => f(x, centres) === c);
            for (const s of n.solutions) expect(f(s, centres), `${mode} ${a} ${b} ${c}`).toBe(c);
            if (n.count === Infinity) {
              expect(c).toBe(n.min);
              expect(hits.length).toBeGreaterThan(2);
            } else {
              // Solutions here are whole or half numbers, so the scan catches every one.
              expect(hits, `${mode} ${a} ${b} ${c}`).toEqual(n.solutions);
            }
          }
        }
      }
    }
  });

  it('draws the flat bottom only where it is flat', () => {
    const plot = compute('modulus-distance', { mode: 'two', a: -1, b: 3 }).plot;
    const graph = plot.plots[1];
    expect(graph.series.find((s) => s.id === 'bottom').points).toEqual([[-1, 4], [3, 4]]);
    expect(compute('modulus-distance', { mode: 'one' }).plot.plots[1].series.map((s) => s.id)).toEqual(['f']);
  });
});

describe('the remainder is the height of the curve', () => {
  const p = (b, c, d, x) => x ** 3 + b * x ** 2 + c * x + d;

  it('gives p(a) as the remainder, and quotient × (x − a) + remainder = p(x)', () => {
    for (const b of range(-6, 6, 2)) {
      for (const c of range(-9, 9, 3)) {
        for (const d of range(-9, 9, 3)) {
          for (const a of range(-4, 4)) {
            const n = numbers('remainder-curve', { b, c, d, a });
            expect(n.remainder).toBe(p(b, c, d, a));
            const [q2, q1, q0] = n.quotient;
            for (const x of [-3, 0, 2, 5]) expect((q2 * x * x + q1 * x + q0) * (x - a) + n.remainder).toBe(p(b, c, d, x));
            expect(n.factor).toBe(p(b, c, d, a) === 0);
          }
        }
      }
    }
  });

  it('finds the real roots where the curve crosses, and the sum and product from the coefficients', () => {
    for (const b of range(-6, 6)) {
      for (const c of range(-9, 9, 2)) {
        for (const d of range(-9, 9, 2)) {
          const n = numbers('remainder-curve', { b, c, d });
          for (const r of n.roots) expect(Math.abs(p(b, c, d, r)), `${b} ${c} ${d} root ${r}`).toBeLessThan(1e-6);
          // Sign changes on a fine grid never outnumber the roots found.
          const xs = range(-20, 20, 0.01);
          let changes = 0;
          for (let i = 1; i < xs.length; i++) if (Math.sign(p(b, c, d, xs[i])) * Math.sign(p(b, c, d, xs[i - 1])) < 0) changes += 1;
          expect(n.realRootCount, `${b} ${c} ${d}`).toBeGreaterThanOrEqual(changes);
          expect(n.sum).toBe(0 - b);
          expect(n.pairSum).toBe(c);
          expect(n.product).toBe(0 - d);
        }
      }
    }
  });

  it('checks the sum and product against a cubic built from its roots', () => {
    // (x − 1)(x − 2)(x + 3) = x³ − 7x + 6
    const n = numbers('remainder-curve', { b: 0, c: -7, d: 6 });
    expect(n.roots).toEqual([-3, 1, 2]);
    expect(n.roots.reduce((s, r) => s + r, 0)).toBe(n.sum);
    expect(n.roots.reduce((s, r) => s * r, 1)).toBe(n.product);
  });
});

describe('whole-number points on a line', () => {
  const brute = (a, b, c, least) => {
    const out = [];
    for (let x = least; x <= c; x++) for (let y = least; y <= c; y++) if (a * x + b * y === c) out.push([x, y]);
    return out;
  };

  it('lights exactly the solutions found by trying every point', () => {
    for (const a of range(1, 12)) {
      for (const b of range(1, 12)) {
        for (const c of range(1, 60, 7)) {
          for (const mode of ['positive', 'non-negative']) {
            const least = mode === 'positive' ? 1 : 0;
            const result = compute('lattice-line', { a, b, c, mode });
            const expected = brute(a, b, c, least);
            expect(result.numbers.solutions, `${a} ${b} ${c} ${mode}`).toEqual(expected);
            expect(result.numbers.count).toBe(expected.length);
            expect(result.plot.points.map((q) => [q.x, q.y])).toEqual(expected);
            // Every point drawn fits on the grid.
            for (const q of [...result.plot.points, ...result.plot.excluded]) {
              expect(q.x).toBeLessThanOrEqual(result.plot.xMax);
              expect(q.y).toBeLessThanOrEqual(result.plot.yMax);
            }
          }
        }
      }
    }
  });

  it('steps from one solution to the next by b/g across and a/g down', () => {
    const n = numbers('lattice-line', { a: 4, b: 6, c: 58, mode: 'non-negative' });
    expect([n.stepX, n.stepY]).toEqual([3, 2]);
    for (let i = 1; i < n.solutions.length; i++) {
      expect(n.solutions[i][0] - n.solutions[i - 1][0]).toBe(3);
      expect(n.solutions[i - 1][1] - n.solutions[i][1]).toBe(2);
    }
    expect(numbers('lattice-line', { a: 4, b: 6, c: 15 }).solvable).toBe(false);
  });
});

describe('a letter sum worked column by column', () => {
  it('uses puzzles with exactly one solution, and ends on it', () => {
    for (const [key, puzzle] of Object.entries(SOLVER_PUZZLES)) {
      const answers = bruteForce(puzzle);
      expect(answers, key).toHaveLength(1);
      const n = numbers('column-solver', { puzzle: key, k: columnCount(puzzle) });
      expect(n.solved).toBe(true);
      for (const letter of lettersOf(puzzle)) expect(n.candidates[letter], `${key} ${letter}`).toEqual([answers[0][letter]]);
    }
  });

  it('only ever narrows the candidates, and always keeps the true digit', () => {
    for (const [key, puzzle] of Object.entries(SOLVER_PUZZLES)) {
      const [answer] = bruteForce(puzzle);
      let before = null;
      for (let k = 0; k <= columnCount(puzzle); k++) {
        const n = numbers('column-solver', { puzzle: key, k });
        for (const letter of lettersOf(puzzle)) {
          expect(n.candidates[letter]).toContain(answer[letter]);
          if (before) for (const d of n.candidates[letter]) expect(before[letter], `${key} k=${k} ${letter}`).toContain(d);
        }
        before = n.candidates;
      }
    }
  });

  it('shows the digits under the letters once they are fixed', () => {
    const plot = compute('column-solver', { puzzle: 'six', k: 4 }).plot;
    const [answer] = bruteForce(SOLVER_PUZZLES.six);
    expect(plot.digits).toEqual(answer);
    expect(plot.carries).toHaveLength(4);
    const start = compute('column-solver', { puzzle: 'six', k: 0 }).plot;
    expect(Object.values(start.digits).every((d) => d === null)).toBe(true);
  });
});
