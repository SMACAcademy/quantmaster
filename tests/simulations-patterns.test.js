/**
 * Phase F simulations for identities, coordinate geometry, functions, sets,
 * counting and sequences (src/simulations/patterns.js). The general checks
 * (controls, corners, challenges, meta) run for every simulation in
 * simulations.test.js; these hold each model's maths to its own formula,
 * worked out independently here.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { nCr, patternSims } from '../src/simulations/patterns.js';
import { getSimulationMeta, simulationMetaForTopic } from '../src/simulations/meta.js';
import { levelRepository } from '../src/repositories/contentRepository.js';

const result = (id, values) => run(getSimulation(id), { ...initialValues(getSimulation(id)), ...values }).result;
const compute = (id, values) => result(id, values).numbers;
const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const area = (rects) => rects.reduce((sum, r) => sum + r.w * r.h, 0);

describe('identity-area', () => {
  it('cuts (a + b)² into a², ab, ab and b²', () => {
    for (const a of range(1, 12)) {
      for (const b of range(1, 12)) {
        const { numbers: n, plot } = result('identity-area', { mode: 'sum', a, b });
        expect(n.sumSquare).toBe((a + b) * (a + b));
        expect(n.a2 + 2 * n.ab + n.b2).toBe(n.sumSquare);
        expect(area(plot.rects)).toBeCloseTo((a + b) ** 2, 9);
        expect(plot.width).toBe(a + b);
      }
    }
  });

  it('leaves (a − b)² = a² − 2ab + b² when b < a', () => {
    for (const a of range(2, 12)) {
      for (const b of range(1, a - 1)) {
        const { numbers: n, plot } = result('identity-area', { mode: 'difference', a, b });
        expect(n.diffSquare).toBe(a * a - 2 * a * b + b * b);
        const square = plot.rects.find((r) => r.tone === 'algebra');
        expect(square.w * square.h).toBe((a - b) ** 2);
      }
    }
  });

  it('rearranges a² − b² into an (a + b) by (a − b) rectangle of the same area', () => {
    for (const a of range(2, 12)) {
      for (const b of range(1, a - 1)) {
        const { numbers: n, plot } = result('identity-area', { mode: 'squares', a, b });
        expect(n.diffOfSquares).toBe((a + b) * (a - b));
        const kept = plot.rects.filter((r) => !r.dashed);
        // Half the solid pieces form the L, the other half the rectangle.
        expect(area(kept)).toBeCloseTo(2 * (a * a - b * b), 9);
        const right = kept.filter((r) => r.x > a);
        expect(Math.max(...right.map((r) => r.x + r.w)) - Math.min(...right.map((r) => r.x))).toBeCloseTo(a + b, 9);
        expect(Math.max(...right.map((r) => r.h))).toBe(a - b);
      }
    }
  });

  it('explains instead of drawing when b is not smaller than a', () => {
    const { numbers, insight } = result('identity-area', { mode: 'squares', a: 4, b: 6 });
    expect(numbers.pictured).toBe(false);
    expect(numbers.diffOfSquares).toBe(-20);
    expect(insight).toMatch(/a bigger than b/);
  });
});

describe('line-explorer', () => {
  it('matches the slope, intercept, distance and midpoint formulas', () => {
    for (const [x1, y1, x2, y2] of [[-2, -1, 3, 2], [1, 2, 4, 6], [0, 1, 2, 5], [-8, 8, 8, -8], [5, -3, -1, 4]]) {
      const n = compute('line-explorer', { x1, y1, x2, y2 });
      const m = (y2 - y1) / (x2 - x1);
      expect(n.slope).toBeCloseTo(m, 12);
      expect(n.intercept).toBeCloseTo(y1 - m * x1, 12);
      // Both points lie on y = mx + c.
      expect(n.slope * x2 + n.intercept).toBeCloseTo(y2, 12);
      expect(n.distance).toBeCloseTo(Math.hypot(x2 - x1, y2 - y1), 12);
      expect(n.midpoint).toEqual({ x: (x1 + x2) / 2, y: (y1 + y2) / 2 });
    }
    expect(compute('line-explorer', { x1: 1, y1: 2, x2: 4, y2: 6 }).distance).toBe(5);
  });

  it('writes the equation exactly', () => {
    const values = (x1, y1, x2, y2) => result('line-explorer', { x1, y1, x2, y2 }).readouts.find((r) => r.label === 'Equation').value;
    expect(values(-2, -1, 3, 2)).toBe('y = (3/5)x + 1/5, or 3x − 5y + 1 = 0');
    expect(values(0, 1, 2, 5)).toBe('y = 2x + 1, or 2x − y + 1 = 0');
    expect(values(1, 1, 3, -1)).toBe('y = −x + 2, or x + y − 2 = 0');
    expect(values(3, -2, 3, 5)).toBe('x = 3, or x − 3 = 0');
    expect(values(-4, 2, 6, 2)).toBe('y = 2, or y − 2 = 0');
    expect(values(1, 2, 3, 6)).toBe('y = 2x, or 2x − y = 0');
  });

  it('handles vertical lines and a repeated point', () => {
    const vertical = compute('line-explorer', { x1: 3, y1: -2, x2: 3, y2: 5 });
    expect(vertical).toMatchObject({ vertical: true, slope: null, intercept: null, distance: 7 });
    const same = result('line-explorer', { x1: 2, y1: 2, x2: 2, y2: 2 });
    expect(same.numbers).toMatchObject({ samePoint: true, slope: null, distance: 0 });
    expect(same.insight).toMatch(/One point is not enough/);
  });

  it('simplifies the distance as a surd', () => {
    const distance = (x2, y2) => result('line-explorer', { x1: 0, y1: 0, x2, y2 }).readouts.find((r) => r.label === 'Distance AB').value;
    expect(distance(2, 2)).toBe('√(4 + 4) = 2√2 ≈ 2.83');
    expect(distance(3, 4)).toBe('√(9 + 16) = 5');
    expect(distance(5, 3)).toBe('√(25 + 9) = √34 ≈ 5.83');
  });
});

describe('function-shift', () => {
  const bases = { square: (x) => x * x, abs: (x) => Math.abs(x), sqrt: (x) => Math.sqrt(x) };

  it('draws y = a·f(x − h) + k point by point', () => {
    for (const base of Object.keys(bases)) {
      for (const [a, h, k] of [[1, 0, 0], [2, 3, -1], [-0.5, -2, 4], [-3, 5, -5]]) {
        const { plot, numbers } = result('function-shift', { base, a, h, k });
        const curve = plot.series.find((s) => s.id === 'shifted').points;
        for (const [x, y] of curve) {
          const exact = a * bases[base](x - h) + k;
          if (Math.abs(exact) < 100) expect(y, `${base} ${a} ${h} ${k} at ${x}`).toBeCloseTo(exact, 12);
        }
        if (base === 'sqrt') expect(Math.min(...curve.map(([x]) => x))).toBe(h);
        expect(numbers.keyPoint).toEqual({ x: h, y: k });
        // (1, 1) is on every base graph, and it lands on the new graph.
        expect(numbers.tracked).toEqual({ x: 1 + h, y: a + k });
        expect(a * bases[base](numbers.tracked.x - h) + k).toBeCloseTo(numbers.tracked.y, 12);
      }
    }
  });

  it('keeps the base graph dashed and unchanged', () => {
    const base = result('function-shift', { base: 'abs', a: 2, h: 1, k: 1 }).plot.series.find((s) => s.id === 'base');
    expect(base.dashed).toBe(true);
    expect(base.points.every(([x, y]) => y === Math.abs(x))).toBe(true);
  });

  it('describes the shift and the stretch', () => {
    const readouts = result('function-shift', { base: 'square', a: -2, h: 3, k: -2 }).readouts;
    const value = (label) => readouts.find((r) => r.label === label).value;
    expect(value('Equation')).toBe('y = −2(x − 3)² − 2');
    expect(value('Shift')).toBe('3 right, 2 down');
    expect(value('Vertical stretch')).toBe('Flipped, and ×2 as tall');
    expect(result('function-shift', { base: 'sqrt', a: 1, h: -4, k: 0 }).readouts[0].value).toBe('y = √(x + 4)');
    expect(result('function-shift', { a: 0, k: 3 }).readouts[0].value).toBe('y = 3');
  });
});

describe('venn-explorer', () => {
  it('splits U into four regions that always add up', () => {
    for (const u of [10, 37, 100]) {
      for (const a of [0, 5, 30, 100]) {
        for (const b of [0, 9, 40, 100]) {
          for (const ab of [0, 3, 25, 100]) {
            const n = compute('venn-explorer', { u, a, b, ab });
            const where = JSON.stringify({ u, a, b, ab });
            for (const region of [n.onlyA, n.onlyB, n.ab, n.neither]) expect(region, where).toBeGreaterThanOrEqual(0);
            expect(n.onlyA + n.onlyB + n.ab + n.neither, where).toBe(u);
            expect(n.onlyA + n.ab, where).toBe(n.a);
            expect(n.onlyB + n.ab, where).toBe(n.b);
            expect(n.union, where).toBe(n.a + n.b - n.ab);
            expect(n.adjusted, where).toBe(n.a !== a || n.b !== b || n.ab !== ab);
          }
        }
      }
    }
  });

  it('reads a textbook case', () => {
    const { numbers, plot } = result('venn-explorer', { u: 50, a: 25, b: 18, ab: 8 });
    expect(numbers).toMatchObject({ onlyA: 17, onlyB: 10, union: 35, neither: 15, adjusted: false });
    expect(plot.regions).toEqual({ a: 17, b: 10, ab: 8, none: 15 });
  });

  it('pulls impossible settings back and says why', () => {
    const tooBig = result('venn-explorer', { u: 50, a: 20, b: 10, ab: 15 });
    expect(tooBig.numbers.ab).toBe(10);
    expect(tooBig.insight).toMatch(/at most the smaller/);
    const tooSmall = result('venn-explorer', { u: 40, a: 30, b: 25, ab: 5 });
    expect(tooSmall.numbers.ab).toBe(15); // |A| + |B| − |U|
    expect(tooSmall.insight).toMatch(/at least 15/);
    const overU = result('venn-explorer', { u: 20, a: 30, b: 10, ab: 5 });
    expect(overU.numbers.a).toBe(20);
    expect(overU.insight).toMatch(/cannot be bigger than U/);
  });
});

describe('counting-slots', () => {
  it('gives ⁿPᵣ = n! ÷ (n − r)! without repeats and nʳ with them', () => {
    for (const n of range(1, 10)) {
      for (const r of range(1, 10)) {
        const without = compute('counting-slots', { n, r, repeat: 'no' });
        expect(without.ways, `${n}P${r}`).toBe(r > n ? 0 : factorial(n) / factorial(n - r));
        expect(without.runOut).toBe(r > n);
        const withRepeats = compute('counting-slots', { n, r, repeat: 'yes' });
        expect(withRepeats.ways).toBe(n ** r);
        expect(withRepeats.other).toBe(without.ways);
      }
    }
  });

  it('draws one box per slot labelled with its choices', () => {
    const { plot } = result('counting-slots', { n: 5, r: 3, repeat: 'no' });
    expect(plot.rects.map((r) => r.label)).toEqual(['5', '4', '3']);
    expect(plot.notes.at(-1).text).toBe('5 × 4 × 3 = 60');
    const short = result('counting-slots', { n: 2, r: 4, repeat: 'no' }).plot.rects;
    expect(short.map((r) => r.label)).toEqual(['2', '1', '0', '0']);
    expect(short.filter((r) => r.dashed)).toHaveLength(2);
  });
});

describe('pascal-ncr', () => {
  it('matches n! ÷ (r!(n − r)!), Pascal’s rule, symmetry and 2ⁿ row totals', () => {
    for (const n of range(0, 12)) {
      for (const r of range(0, n)) {
        expect(nCr(n, r), `${n}C${r}`).toBe(factorial(n) / (factorial(r) * factorial(n - r)));
        expect(nCr(n, r)).toBe(nCr(n, n - r));
        if (r > 0 && r < n) expect(nCr(n, r)).toBe(nCr(n - 1, r - 1) + nCr(n - 1, r));
      }
      const { rows, rowSum } = compute('pascal-ncr', { n, r: 0 });
      expect(rows).toHaveLength(n + 1);
      expect(rows[n].reduce((sum, v) => sum + v, 0)).toBe(2 ** n);
      expect(rowSum).toBe(2 ** n);
    }
    expect(nCr(5, 7)).toBe(0);
  });

  it('highlights the entry, its mirror and its parents', () => {
    const { numbers, plot } = result('pascal-ncr', { n: 10, r: 3 });
    expect(numbers).toMatchObject({ value: 120, mirrorValue: 120, parents: [36, 84], valid: true });
    const tones = (tone) => plot.rects.filter((r) => r.tone === tone && !r.faint && r.label).map((r) => r.label);
    expect(tones('combinatorics')).toEqual(['120']);
    expect(tones('geometry')).toEqual(['120']);
    expect(tones('arithmetic')).toEqual(['36', '84']);
    expect(plot.rects.filter((r) => r.label)).toHaveLength(66); // rows 0 to 10
  });

  it('says why r cannot be bigger than n', () => {
    const { numbers, insight, plot } = result('pascal-ncr', { n: 3, r: 5 });
    expect(numbers).toMatchObject({ value: 0, valid: false });
    expect(insight).toMatch(/no way to choose 5 things from 3/);
    expect(plot.rects.every((r) => r.faint)).toBe(true);
  });
});

describe('sequence-differences', () => {
  const diffs = (list) => list.slice(1).map((v, i) => v - list[i]);

  it('makes each rule and its differences or ratios', () => {
    const linear = compute('sequence-differences', { rule: 'linear', first: 5, d: 4 });
    expect(linear.terms).toEqual([5, 9, 13, 17, 21, 25, 29, 33]);
    expect(linear.diff1).toEqual(diffs(linear.terms));
    expect(new Set(linear.diff1)).toEqual(new Set([4]));
    expect(linear.next).toBe(37);

    const quadratic = compute('sequence-differences', { rule: 'quadratic', first: 2, d: 3, s: 4 });
    // tₙ = t₁ + d(n − 1) + s(n − 1)(n − 2)/2
    expect(quadratic.terms).toEqual(range(1, 8).map((n) => 2 + 3 * (n - 1) + (4 * (n - 1) * (n - 2)) / 2));
    expect(quadratic.diff2).toEqual(diffs(diffs(quadratic.terms)));
    expect(new Set(quadratic.diff2)).toEqual(new Set([4]));
    expect(quadratic).toMatchObject({ constantDiff1: false, constantDiff2: true });

    const geometric = compute('sequence-differences', { rule: 'geometric', first: 3, r: 1.5 });
    expect(geometric.terms).toEqual(range(0, 7).map((i) => 3 * 1.5 ** i));
    expect(geometric.ratios.every((q) => Math.abs(q - 1.5) < 1e-12)).toBe(true);
    expect(geometric).toMatchObject({ constantDiff1: false, constantDiff2: false, constantRatio: true });
    expect(geometric.next).toBeCloseTo(3 * 1.5 ** 8, 9);

    const fibonacci = compute('sequence-differences', { rule: 'fibonacci', first: 2, d: 1 });
    expect(fibonacci.terms).toEqual([2, 3, 5, 8, 13, 21, 34, 55]);
    expect(fibonacci.next).toBe(89);
    // The differences are the sequence itself, one place behind.
    expect(fibonacci.diff1.slice(1)).toEqual(fibonacci.terms.slice(0, 6));
    expect(fibonacci).toMatchObject({ constantDiff1: false, constantDiff2: false, constantRatio: false });
  });

  it('draws the terms as bars', () => {
    const { plot, numbers } = result('sequence-differences', { rule: 'linear', first: 2, d: 3 });
    expect(plot.kind).toBe('bars');
    expect(plot.bars.map((b) => b.value)).toEqual(numbers.terms);
  });
});

describe('placement', () => {
  it('lists every pattern simulation in meta, with its other topics', () => {
    for (const simulation of patternSims) expect(getSimulationMeta(simulation.id), simulation.id).not.toBeNull();
    expect(simulationMetaForTopic('set-theory').map((m) => m.id)).toContain('venn-explorer');
    expect(simulationMetaForTopic('counting-principle').map((m) => m.id)).toContain('counting-slots');
  });

  it('puts each one in its topic’s first lesson', () => {
    for (const simulation of patternSims) {
      const level = levelRepository.getAll().find((l) => l.id === `${simulation.topicId}-level-0`);
      const ids = (level?.lesson?.blocks || []).filter((b) => b.type === 'simulation').map((b) => b.simulationId);
      expect(ids, simulation.id).toContain(simulation.id);
    }
  });
});
