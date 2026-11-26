/**
 * Phase G number-sense simulations (src/simulations/numberSense.js): the maths
 * checked against independent calculations (trial division, the % operator,
 * brute-force factor counts, decimals as scaled integers), and the pictures
 * kept inside their frames at every corner of the settings.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { numberSenseSims, placesOf, thousandthsText } from '../src/simulations/numberSense.js';

const compute = (id, values) => run(getSimulation(id), { ...initialValues(getSimulation(id)), ...values }).result;
const numbers = (id, values) => compute(id, values).numbers;

const isPrime = (m) => {
  if (m < 2) return false;
  for (let d = 2; d < m; d++) if (m % d === 0) return false;
  return true;
};
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const factorsOf = (n) => range(1, n).filter((d) => n % d === 0);

function corners(simulation) {
  let combos = [{}];
  for (const control of simulation.controls) {
    const options = control.type === 'range' ? [...new Set([control.min, control.default, control.max])] : control.options.map((o) => o.id);
    combos = combos.flatMap((combo) => options.map((value) => ({ ...combo, [control.id]: value })));
  }
  return combos;
}

describe('prime sieve', () => {
  it('leaves exactly the primes once finished, checked by trial division', () => {
    for (let n = 20; n <= 100; n += 10) {
      for (let step = 0; step <= 8; step++) {
        const s = numbers('prime-sieve', { n, step });
        const primes = range(2, n).filter(isPrime);
        const needed = primes.filter((p) => p * p <= n).length;
        expect(s.finished, `${n} ${step}`).toBe(step >= needed);
        // Whatever is called prime really is prime, and nothing prime is ever crossed out.
        for (const m of s.primes) expect(isPrime(m), `${m}`).toBe(true);
        for (const m of s.crossedNow) expect(isPrime(m), `${m}`).toBe(false);
        if (s.finished) {
          expect(s.primes).toEqual(primes);
          expect(s.open).toEqual([]);
        }
        if (step > 0) {
          const p = primes[step - 1];
          expect(s.p).toBe(p);
          // Crossed out this step: multiples of p whose smallest prime factor is p.
          const expected = range(2, n).filter((m) => m !== p && m % p === 0 && primes.slice(0, step - 1).every((q) => m % q !== 0));
          expect(s.crossedNow).toEqual(expected);
          expect(s.newCrossed === 0).toBe(p * p > n);
        }
      }
    }
  });

  it('counts the primes below 50 and 100, and stops at the square root', () => {
    expect(numbers('prime-sieve', { n: 50, step: 4 }).primeCount).toBe(15);
    expect(numbers('prime-sieve', { n: 50, step: 3 }).finished).toBe(false); // 49 = 7² still stands
    expect(numbers('prime-sieve', { n: 100, step: 4 }).primeCount).toBe(25);
    expect(numbers('prime-sieve', { n: 100, step: 1 }).firstIdle).toBe(11);
    expect(numbers('prime-sieve', { n: 30, step: 2 }).compositesLeft).toEqual([25]);
  });
});

describe('divisibility checker', () => {
  const digitsOf = (v) => String(v).split('').map(Number).reverse(); // units first
  const toValues = (v, divisor) => {
    const [d0, d1, d2, d3, d4] = digitsOf(v);
    return { divisor: String(divisor), d0, d1, d2, d3, d4 };
  };

  it('gives the real remainder, and a verdict that matches it, for every divisor', () => {
    const samples = [10000, 10017, 12345, 27500, 47528, 55555, 90200, 99999, 10012, 36036, 71874, 24680, 13579];
    for (let v = 10000; v <= 99999; v += 997) samples.push(v);
    for (const v of samples) {
      for (const d of [2, 3, 4, 5, 6, 8, 9, 11, 12]) {
        const n = numbers('divisibility-checker', toValues(v, d));
        expect(n.value).toBe(v);
        expect(n.remainder, `${v} ÷ ${d}`).toBe(v % d);
        expect(n.quotient * d + n.remainder).toBe(v);
        expect(n.passes, `${v} ÷ ${d}`).toBe(v % d === 0);
        // A single digit test leaves the same remainder as the number itself.
        if (![6, 12].includes(d)) expect(n.tests[0].remainder, `${v} ÷ ${d}`).toBe(v % d);
      }
    }
  });

  it('reads the right digits', () => {
    const d = (v, divisor) => numbers('divisibility-checker', toValues(v, divisor)).tests;
    expect(d(47528, 9)[0].value).toBe(26);
    expect(d(47528, 4)[0].value).toBe(28);
    expect(d(47528, 8)[0].value).toBe(528);
    expect(d(47528, 11)[0].value).toBe(8 - 2 + 5 - 7 + 4);
    expect(d(90200, 11)[0].value).toBe(11);
    expect(d(10012, 12).map((t) => [t.d, t.pass])).toEqual([[4, true], [3, false]]);
  });
});

describe('factor pairs', () => {
  it('finds every factor and pair, checked by brute force', () => {
    for (let n = 1; n <= 100; n++) {
      const f = numbers('factor-pairs', { n });
      const brute = factorsOf(n);
      expect(f.factors, String(n)).toEqual(brute);
      expect(f.count).toBe(brute.length);
      for (const [a, b] of f.pairs) expect(a * b).toBe(n);
      expect(f.pairs.length).toBe(Math.ceil(brute.length / 2));
      const root = Math.round(Math.sqrt(n));
      expect(f.isSquare).toBe(root * root === n);
      expect(f.count % 2 === 1).toBe(f.isSquare);
      expect(f.isPrime).toBe(isPrime(n));
    }
  });

  it('has 3 factors exactly for squares of primes', () => {
    const three = range(1, 100).filter((n) => numbers('factor-pairs', { n }).count === 3);
    expect(three).toEqual([4, 9, 25, 49]);
    expect(range(1, 100).filter((n) => numbers('factor-pairs', { n }).count === 12)).toEqual([60, 72, 84, 90, 96]);
  });
});

describe('decimal zoom', () => {
  const asValues = (k, prefix) => ({ [`${prefix}1`]: Math.floor(k / 100), [`${prefix}2`]: Math.floor(k / 10) % 10, [`${prefix}3`]: k % 10 });
  // Parse a decimal string to thousandths without floating point.
  const parse = (text) => {
    const [whole, frac = ''] = text.split('.');
    return Number(whole) * 1000 + Number((frac + '000').slice(0, 3));
  };

  it('compares like scaled integers do', () => {
    for (let A = 0; A <= 999; A += 37) {
      for (let B = 0; B <= 999; B += 41) {
        const n = numbers('decimal-zoom', { ...asValues(A, 'a'), ...asValues(B, 'b') });
        expect(n.A).toBe(A);
        expect(n.B).toBe(B);
        expect(n.comparison, `${A} ${B}`).toBe(Math.sign(A - B));
        expect(n.gap).toBe(Math.abs(A - B));
        const a = String(A).padStart(3, '0');
        const b = String(B).padStart(3, '0');
        const first = [0, 1, 2].find((i) => a[i] !== b[i]);
        expect(n.firstDiff).toBe(first === undefined ? 0 : first + 1);
      }
    }
  });

  it('0.45 is bigger than 0.405', () => {
    const n = numbers('decimal-zoom', { a1: 4, a2: 5, a3: 0, b1: 4, b2: 0, b3: 5 });
    expect(n.comparison).toBe(1);
    expect(n.firstDiff).toBe(2);
    expect([n.placesA, n.placesB]).toEqual([2, 3]);
  });

  it('writes decimals exactly', () => {
    for (let k = 0; k <= 1000; k++) {
      expect(parse(thousandthsText(k))).toBe(k);
      expect(parse(thousandthsText(k, 3))).toBe(k);
    }
    expect(thousandthsText(450)).toBe('0.45');
    expect(thousandthsText(405)).toBe('0.405');
    expect(thousandthsText(0)).toBe('0');
    expect(thousandthsText(1000, 2)).toBe('1.00');
    expect([placesOf(400), placesOf(450), placesOf(405), placesOf(0)]).toEqual([1, 2, 3, 0]);
  });
});

describe('pictures stay inside their frames', () => {
  it.each(numberSenseSims.map((s) => [s.id, s]))('%s', (id, simulation) => {
    const settings = [...corners(simulation), ...simulation.tasks.map((task) => ({ ...initialValues(simulation), ...task.solution }))];
    if (id === 'factor-pairs') for (let n = 1; n <= 100; n++) settings.push({ n });
    if (id === 'prime-sieve') for (let n = 20; n <= 100; n += 10) for (let step = 0; step <= 8; step++) settings.push({ n, step });
    for (const values of settings) {
      const { plot } = run(simulation, values).result;
      const where = `${id} ${JSON.stringify(values)}`;
      const eps = 1e-9;
      expect(plot.kind, where).toBe('rects');
      // One unit per pixel, or less: the plot fits the 500 × 282 drawing area.
      expect(plot.width, where).toBeLessThanOrEqual(500 + eps);
      expect(plot.height, where).toBeLessThanOrEqual(282 + eps);
      expect(plot.rects.length, where).toBeLessThan(1500);
      for (const r of plot.rects) {
        expect(r.w > 0 && r.h > 0, where).toBe(true);
        expect(r.x >= -eps && r.y >= -eps && r.x + r.w <= plot.width + eps && r.y + r.h <= plot.height + eps, `${where} ${JSON.stringify(r)}`).toBe(true);
      }
      for (const n of plot.notes) expect(n.x >= -eps && n.y >= -eps && n.x <= plot.width + eps && n.y <= plot.height + eps, `${where} ${n.text}`).toBe(true);
      // Notes on one line keep apart: no two closer than 10 px with the same baseline and anchor.
      const lines = new Map();
      for (const n of plot.notes) {
        const key = `${Math.round(n.y)}`;
        if (!lines.has(key)) lines.set(key, []);
        lines.get(key).push(n);
      }
      for (const group of lines.values()) {
        const xs = group.filter((n) => (n.anchor || 'middle') === 'middle').map((n) => n.x).sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1], `${where} y ${group[0].y}`).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('factor pairs: thin rectangles still get a row tall enough for their label', () => {
    for (let n = 1; n <= 100; n++) {
      const { plot } = compute('factor-pairs', { n });
      const ys = plot.notes.filter((note) => note.anchor === 'end').map((note) => note.y);
      expect(ys.length).toBe(numbers('factor-pairs', { n }).pairs.length);
      for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1], String(n)).toBeGreaterThanOrEqual(18);
    }
  });
});
