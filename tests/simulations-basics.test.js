/**
 * Phase G simulations for indices, unit conversions and algebraic expressions
 * (src/simulations/basics.js). The general checks (controls, corners,
 * challenges, meta) run for every simulation in simulations.test.js; these
 * hold each model to an independent calculation: powers by repeated
 * multiplication, conversions by a table of unit sizes, sums by coefficients.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { basicsSims, decimalText, fractionDecimal, polyText } from '../src/simulations/basics.js';
import { getSimulationMeta, simulationMetaForTopic } from '../src/simulations/meta.js';
import { levelRepository } from '../src/repositories/contentRepository.js';

const result = (id, values) => run(getSimulation(id), { ...initialValues(getSimulation(id)), ...values }).result;
const numbers = (id, values) => result(id, values).numbers;
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

/** a × a × … × a, k times, as a BigInt. */
function repeated(a, k) {
  let product = 1n;
  for (let i = 0; i < k; i++) product *= BigInt(a);
  return product;
}

function corners(simulation) {
  let combos = [{}];
  for (const control of simulation.controls) {
    const options = control.type === 'range' ? [...new Set([control.min, control.default, control.max])] : control.options.map((o) => o.id);
    combos = combos.flatMap((combo) => options.map((value) => ({ ...combo, [control.id]: value })));
  }
  return combos;
}

/** The renderer fits a rects plot into 500 × 282 px at one scale (simPlots.js). */
const scaleOf = (plot) => Math.min(500 / plot.width, 282 / plot.height);

describe('index-laws', () => {
  it('matches repeated multiplication for every base and exponent', () => {
    for (const a of range(2, 10)) {
      for (const m of range(1, 8)) {
        for (const n of range(1, 8)) {
          const product = numbers('index-laws', { law: 'product', a, m, n });
          expect(product.exponent).toBe(m + n);
          expect([product.num, product.den]).toEqual([String(repeated(a, m) * repeated(a, n)), '1']);

          // aᵐ ÷ aⁿ as a fraction in lowest terms: num/den = aᵐ/aⁿ.
          const quotient = numbers('index-laws', { law: 'quotient', a, m, n });
          expect(quotient.exponent).toBe(m - n);
          expect(BigInt(quotient.num) * repeated(a, n)).toBe(BigInt(quotient.den) * repeated(a, m));
          expect(quotient.num === '1' || quotient.den === '1').toBe(true);

          let power = 1n;
          for (let copy = 0; copy < n; copy++) power *= repeated(a, m);
          const powered = numbers('index-laws', { law: 'power', a, m, n });
          expect(powered.exponent).toBe(m * n);
          expect(powered.num).toBe(String(power));
        }
      }
    }
  });

  it('draws one cell per factor: joined, cancelled or repeated', () => {
    for (const [m, n] of [[3, 4], [1, 8], [8, 8], [5, 2], [2, 6]]) {
      const joined = result('index-laws', { law: 'product', m, n }).plot.rects;
      expect(joined.length).toBe(2 * (m + n));
      const divided = result('index-laws', { law: 'quotient', m, n }).plot.rects;
      expect(divided.filter((r) => r.dashed).length).toBe(2 * Math.min(m, n));
      const repeatedRows = result('index-laws', { law: 'power', m, n }).plot.rects;
      expect(repeatedRows.length).toBe(m * n);
    }
  });

  it('shows a⁰ = 1 and a negative exponent as a fraction', () => {
    const zero = result('index-laws', { law: 'quotient', a: 5, m: 3, n: 3 });
    expect(zero.numbers).toMatchObject({ exponent: 0, num: '1', den: '1' });
    expect(zero.insight).toMatch(/5⁰ = 1/);
    const negative = result('index-laws', { law: 'quotient', a: 2, m: 2, n: 5 });
    expect(negative.numbers).toMatchObject({ exponent: -3, num: '1', den: '8' });
    expect(negative.readouts.find((r) => r.label === 'So').value).toBe('2² ÷ 2⁵ = 2⁻³ = 1/2³');
    // Huge values are described, not printed digit by digit.
    expect(result('index-laws', { law: 'power', a: 10, m: 8, n: 8 }).readouts[0].value).toMatch(/65-digit number/);
  });
});

describe('unit-ladder', () => {
  const MM = { km: 1000000, hm: 100000, dam: 10000, m: 1000, dm: 100, cm: 10, mm: 1 };
  const units = Object.keys(MM);

  it('converts every length exactly, by a table of unit sizes', () => {
    for (let tenths = 1; tenths <= 100; tenths++) {
      for (const from of units) {
        for (const to of units) {
          const n = numbers('unit-ladder', { mode: 'ladder', amount: tenths / 10, from, to });
          // (tenths / 10) × MM[from] = (p / q) × MM[to], cross-multiplied in whole numbers.
          expect(n.result.p * 10 * MM[to]).toBe(tenths * MM[from] * n.result.q);
          expect(gcd(n.result.p, n.result.q)).toBe(1);
          expect(n.steps).toBe(units.indexOf(to) - units.indexOf(from));
        }
      }
    }
  });

  it('writes the answers without float dust', () => {
    const answer = (values) => result('unit-ladder', { mode: 'ladder', ...values }).readouts.find((r) => r.label === 'Answer').value;
    expect(answer({ amount: 0.3, from: 'km', to: 'm' })).toBe('0.3 km = 300 m');
    expect(answer({ amount: 3.5, from: 'km', to: 'm' })).toBe('3.5 km = 3,500 m');
    expect(answer({ amount: 0.7, from: 'cm', to: 'm' })).toBe('0.7 cm = 0.007 m');
    expect(answer({ amount: 0.1, from: 'mm', to: 'km' })).toBe('0.1 mm = 0.0000001 km');
    expect(answer({ amount: 10, from: 'km', to: 'mm' })).toBe('10 km = 1,00,00,000 mm');
    expect(decimalText(35, 2)).toBe('3,500');
    expect(decimalText(5, -3)).toBe('0.005');
    expect(decimalText(120, -1)).toBe('12');
  });

  it('turns km/h into m/s through 1 km = 1000 m and 1 h = 3600 s', () => {
    const table = [[72, 20], [36, 10], [54, 15], [90, 25], [18, 5], [180, 50]];
    for (const [kmh, ms] of table) {
      expect(numbers('unit-ladder', { mode: 'speed', direction: 'kmh', speed: kmh }).ms).toEqual({ p: ms, q: 1 });
      expect(numbers('unit-ladder', { mode: 'speed', direction: 'ms', speed: ms }).kmh).toEqual({ p: kmh, q: 1 });
    }
    for (const v of range(1, 180)) {
      const there = numbers('unit-ladder', { mode: 'speed', direction: 'kmh', speed: v }).ms;
      expect(there.p * 3600).toBe(v * 1000 * there.q);
      const back = numbers('unit-ladder', { mode: 'speed', direction: 'ms', speed: v }).kmh;
      expect(back.p * 1000).toBe(v * 3600 * back.q);
    }
    const awkward = result('unit-ladder', { mode: 'speed', direction: 'kmh', speed: 50 });
    expect(awkward.readouts[1].value).toBe('50 km/h = 50,000/3600 m/s = 125/9 ≈ 13.89 m/s');
    expect(fractionDecimal(25, 2)).toBe('12.5');
    expect(fractionDecimal(125, 9)).toBeNull();
  });
});

describe('algebra-tiles', () => {
  const evaluate = ([c2, c1, c0], x) => c2 * x * x + c1 * x + c0;
  const kinds = { algebra: 0, combinatorics: 1, geometry: 2 };

  it('adds the coefficients of like terms, and the leftover tiles are the sum', () => {
    const others = [[0, 0, 0], [1, -1, 4], [-2, -4, -5], [2, 4, 5], [-1, 3, 0], [0, -2, 5], [2, -4, 1]];
    for (const a2 of range(-2, 2)) {
      for (const a1 of range(-4, 4)) {
        for (const a0 of range(-5, 5)) {
          for (const [b2, b1, b0] of others) {
            const { numbers: n, plot } = result('algebra-tiles', { a2, a1, a0, b2, b1, b0 });
            expect(n.sum).toEqual([a2 + b2, a1 + b1, a0 + b0]);
            for (const x of [-3, 0, 2, 7]) expect(evaluate(n.sum, x)).toBe(evaluate([a2, a1, a0], x) + evaluate([b2, b1, b0], x));

            // Every tile of A and B is drawn twice (once in its row, once together); the zero pairs are dashed.
            const tiles = [a2, a1, a0, b2, b1, b0].reduce((total, c) => total + Math.abs(c), 0);
            expect(plot.rects.length).toBe(2 * tiles);
            expect(plot.rects.filter((r) => r.dashed).length).toBe(2 * n.zeroPairs);
            // The undashed tiles put together (drawn after rows A and B) count out the sum, negatives faint.
            const counted = [0, 0, 0];
            for (const r of plot.rects.slice(tiles).filter((t) => !t.dashed)) counted[kinds[r.tone]] += r.faint ? -1 : 1;
            expect(counted).toEqual(n.sum);
          }
        }
      }
    }
  });

  it('draws x² as squares, x as long strips and 1 as small squares', () => {
    const { plot } = result('algebra-tiles', {});
    const by = (tone) => plot.rects.filter((r) => r.tone === tone);
    for (const r of by('algebra')) expect(r.w).toBe(r.h);
    for (const r of by('combinatorics')) expect(r.h).toBeGreaterThan(2 * r.w);
    for (const r of by('geometry')) expect([r.w, r.h]).toEqual([1, 1]);
    expect(by('algebra')[0].w).toBe(by('combinatorics')[0].h); // the strip is as long as the square's side
  });

  it('writes expressions the usual way', () => {
    expect(polyText([1, 3, -2])).toBe('x² + 3x − 2');
    expect(polyText([0, -1, 0])).toBe('−x');
    expect(polyText([-2, 0, 1])).toBe('−2x² + 1');
    expect(polyText([0, 0, 0])).toBe('0');
    expect(numbers('algebra-tiles', { b2: -1, b1: -3, b0: 2 }).terms).toBe(0);
  });
});

describe('the pictures stay readable', () => {
  it('keeps every piece in the frame and labels only what fits, at every corner', () => {
    for (const simulation of basicsSims) {
      for (const values of corners(simulation)) {
        const { plot } = run(simulation, values).result;
        const s = scaleOf(plot);
        const where = `${simulation.id} ${JSON.stringify(values)}`;
        for (const r of plot.rects) {
          expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= plot.width + 1e-9 && r.y + r.h <= plot.height + 1e-9, where).toBe(true);
          if (r.label) expect(r.w * s >= 7 * r.label.length + 6 && r.h * s >= 18, `${where} ${r.label}`).toBe(true);
        }
        // Notes may use the renderer's 30 px padding, no more.
        for (const note of plot.notes) {
          const width = 7.5 * note.text.length;
          const x = note.x * s;
          const [from, to] = note.anchor === 'start' ? [x, x + width] : note.anchor === 'end' ? [x - width, x] : [x - width / 2, x + width / 2];
          expect(from >= -30 && to <= 530, `${where} ${note.text}`).toBe(true);
          expect(note.y * s >= -20 && note.y * s <= 300, `${where} ${note.text}`).toBe(true);
        }
      }
    }
  });
});

describe('placement', () => {
  it('lists each simulation in meta, with its other topics', () => {
    for (const simulation of basicsSims) expect(getSimulationMeta(simulation.id), simulation.id).not.toBeNull();
    expect(simulationMetaForTopic('time-speed-distance').map((m) => m.id)).toContain('unit-ladder');
  });

  it('puts each one in its topic’s first lesson', () => {
    for (const simulation of basicsSims) {
      const level = levelRepository.getAll().find((l) => l.id === `${simulation.topicId}-level-0`);
      const ids = (level?.lesson?.blocks || []).filter((b) => b.type === 'simulation').map((b) => b.simulationId);
      expect(ids, simulation.id).toContain(simulation.id);
    }
  });
});
