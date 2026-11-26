/**
 * Phase F number simulations (src/simulations/numbers.js): the maths checked
 * against independent calculations (brute force, JavaScript's Date), and the
 * pictures kept inside their frames at every corner of the settings.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { DAY_NAMES, fractionText, isLeap, numberSims, primePowers, ratioOf, weekday } from '../src/simulations/numbers.js';

const compute = (id, values) => run(getSimulation(id), { ...initialValues(getSimulation(id)), ...values }).result;
const numbers = (id, values) => compute(id, values).numbers;

const bruteHcf = (a, b) => {
  for (let d = Math.min(a, b); d >= 1; d--) if (a % d === 0 && b % d === 0) return d;
  return 1;
};
const bruteLcm = (list) => {
  for (let t = 1; ; t++) if (list.every((v) => t % v === 0)) return t;
};

function corners(simulation) {
  let combos = [{}];
  for (const control of simulation.controls) {
    const options = control.type === 'range' ? [...new Set([control.min, control.default, control.max])] : control.options.map((o) => o.id);
    combos = combos.flatMap((combo) => options.map((value) => ({ ...combo, [control.id]: value })));
  }
  return combos;
}

describe('ratio bar model', () => {
  it('splits the total in the ratio', () => {
    const n = numbers('ratio-bar-model', { total: 1200, a: 2, b: 3, c: 0 });
    expect(n.part).toBe(240);
    expect(n.shares).toEqual([480, 720]);
    for (const [total, a, b, c] of [[1000, 2, 3, 5], [6000, 9, 1, 7], [100, 1, 1, 1], [3700, 4, 9, 0]]) {
      const shares = numbers('ratio-bar-model', { total, a, b, c }).shares;
      const terms = c ? [a, b, c] : [a, b];
      expect(shares.reduce((s, v) => s + v, 0)).toBeCloseTo(total, 9);
      terms.forEach((t, i) => expect(shares[i]).toBeCloseTo((total * t) / terms.reduce((s, v) => s + v, 0), 9));
    }
    expect(ratioOf([4, 6, 8])).toBe('2 : 3 : 4');
  });
});

describe('partnership', () => {
  it('shares profit in the ratio of capital × months', () => {
    const n = numbers('partnership-shares', { capA: 30000, monthsA: 12, capB: 20000, monthsB: 12, capC: 0, profit: 50000 });
    expect(n.shares).toEqual([30000, 20000]);
    // B joins after 4 months: 20,000 × 8 against 10,000 × 12 = 160 : 120 = 4 : 3.
    const late = numbers('partnership-shares', { capA: 10000, monthsA: 12, capB: 20000, monthsB: 8, capC: 0, profit: 35000 });
    expect(late.shares[0]).toBeCloseTo(15000, 9);
    expect(late.shares[1]).toBeCloseTo(20000, 9);
    const three = numbers('partnership-shares', { capA: 25000, monthsA: 12, capB: 25000, monthsB: 12, capC: 20000, monthsC: 6, profit: 60000 });
    expect(three.shares.map((s) => Math.round(s))).toEqual([25000, 25000, 10000]);
  });
});

describe('HCF tiles', () => {
  it('uses the HCF as the largest tile, checked by brute force', () => {
    for (let L = 2; L <= 60; L += 1) {
      for (const B of [2, 7, 12, 18, 30, 45, 48, 60]) {
        const n = numbers('hcf-tiles', { length: L, breadth: B, tile: 'largest' });
        expect(n.hcf, `${L} × ${B}`).toBe(bruteHcf(L, B));
        expect(n.count).toBe((L * B) / (n.hcf * n.hcf));
      }
    }
  });

  it('a smaller common factor still tiles exactly, with more tiles', () => {
    const n = numbers('hcf-tiles', { length: 24, breadth: 18, tile: 'smaller' });
    expect(n).toMatchObject({ hcf: 6, side: 3, count: 48, largestCount: 12 });
    const odd = numbers('hcf-tiles', { length: 45, breadth: 30, tile: 'smaller' });
    expect(odd.side).toBe(5); // 15 = 3 × 5: the next tile down drops the smallest prime
    expect(45 % odd.side + (30 % odd.side)).toBe(0);
    expect(numbers('hcf-tiles', { length: 7, breadth: 9, tile: 'smaller' }).side).toBe(1);
    expect(primePowers(360)).toEqual([[2, 3], [3, 2], [5, 1]]);
  });
});

describe('LCM bells', () => {
  it('first ring together at the LCM, checked by brute force', () => {
    for (let a = 2; a <= 20; a++) {
      for (let b = 2; b <= 20; b++) {
        expect(numbers('lcm-bells', { a, b, c: 0 }).together, `${a}, ${b}`).toBe(bruteLcm([a, b]));
      }
    }
    for (const [a, b, c] of [[6, 8, 12], [9, 12, 15], [17, 19, 20], [2, 3, 5], [4, 6, 10]]) {
      expect(numbers('lcm-bells', { a, b, c }).together).toBe(bruteLcm([a, b, c]));
    }
  });

  it('labels the LCM by highest prime powers', () => {
    const readouts = compute('lcm-bells', { a: 12, b: 18, c: 0 }).readouts;
    expect(readouts.find((r) => r.label.startsWith('LCM')).value).toBe('2² × 3² = 36');
  });
});

describe('ages', () => {
  it('keeps the gap and finds when A is k times B', () => {
    for (const [ageA, ageB, k] of [[40, 10, 2], [30, 10, 3], [50, 20, 2], [60, 5, 4]]) {
      const n = numbers('ages-timeline', { ageA, ageB, k, year: 0 });
      expect(ageA + n.kTime).toBeCloseTo(k * (ageB + n.kTime), 9);
      for (const year of [-20, -3, 0, 7, 30]) expect(numbers('ages-timeline', { ageA, ageB, k, year }).gap).toBe(ageA - ageB);
    }
    expect(numbers('ages-timeline', { ageA: 40, ageB: 10, k: 2 }).kTime).toBe(20);
    // A younger than B can never be twice B's age.
    expect(numbers('ages-timeline', { ageA: 10, ageB: 30, k: 2 }).kValid).toBe(false);
    // The classic: 3 : 1 now and 2 : 1 in 10 years gives 30 and 10.
    const solved = [];
    for (let b = 1; b <= 80; b++) if (3 * b <= 80 && 3 * b + 10 === 2 * (b + 10)) solved.push([3 * b, b]);
    expect(solved).toEqual([[30, 10]]);
  });
});

describe('calendar odd days', () => {
  const cal = (year, date, years) => numbers('calendar-odd-days', { century: String(Math.floor(year / 100) * 100), yy: year % 100, date, years });
  const dateWeekday = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  it('finds the weekday like Date does', () => {
    for (let year = 1900; year <= 2300; year++) {
      for (const [m, d] of [[1, 1], [2, 28], [3, 1], [8, 15], [12, 31]]) expect(weekday(year, m, d), `${year}-${m}-${d}`).toBe(dateWeekday(year, m, d));
      const feb29 = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
      expect(isLeap(year), String(year)).toBe(feb29);
    }
  });

  it('counts odd days to the same answer as Date, every start and step', () => {
    for (const date of ['jan', 'aug']) {
      const [m, d] = date === 'jan' ? [1, 1] : [8, 15];
      for (let year = 1900; year <= 2199; year += 7) {
        for (let years = 1; years <= 100; years += 3) {
          const n = cal(year, date, years);
          expect(n.year).toBe(year);
          const days = (Date.UTC(year + years, m - 1, d) - Date.UTC(year, m - 1, d)) / 86400000;
          expect(n.oddDays, `${date} ${year} +${years}`).toBe(days - 364 * years);
          expect(n.shift).toBe(days % 7);
          expect(n.end).toBe(dateWeekday(year + years, m, d));
        }
      }
    }
  });

  it('matches the textbook rules', () => {
    expect(cal(2001, 'jan', 100).shift).toBe(5); // 100 years: 5 odd days
    expect(cal(1901, 'jan', 100).shift).toBe(6); // this century holds 2000, a leap year
    expect(cal(2026, 'jan', 28).shift).toBe(0); // repeats after 28 years
    expect(DAY_NAMES[cal(2026, 'aug', 1).start]).toBe('Saturday');
  });
});

describe('fraction bars', () => {
  it('compares, adds and subtracts exactly', () => {
    const values = [];
    for (let d1 = 2; d1 <= 12; d1++) for (let n1 = 1; n1 <= 12; n1 += 5) values.push([n1, d1]);
    for (const [n1, d1] of values) {
      for (const [n2, d2] of values) {
        const c = numbers('fraction-bars', { n1, d1, n2, d2, op: 'compare' });
        expect(c.comparison).toBe(Math.sign(n1 * d2 - n2 * d1));
        expect(c.N1 / c.lcd).toBeCloseTo(n1 / d1, 12);
        const add = numbers('fraction-bars', { n1, d1, n2, d2, op: 'add' });
        expect(add.resultN / add.lcd).toBeCloseTo(n1 / d1 + n2 / d2, 12);
        const sub = numbers('fraction-bars', { n1, d1, n2, d2, op: 'subtract' });
        expect(sub.resultN / sub.lcd).toBeCloseTo(n1 / d1 - n2 / d2, 12);
      }
    }
    expect(fractionText(19, 12)).toBe('19/12');
    expect(fractionText(-2, 24)).toBe('−1/12');
    expect(fractionText(12, 12)).toBe('1');
  });

  it('teaches the common slip when adding', () => {
    expect(compute('fraction-bars', { n1: 1, d1: 2, n2: 1, d2: 3, op: 'add' }).insight).toContain('2/5');
  });
});

describe('pictures stay inside their frames', () => {
  it.each(numberSims.map((s) => [s.id, s]))('%s', (id, simulation) => {
    for (const values of corners(simulation)) {
      const { plot } = run(simulation, values).result;
      if (plot.kind !== 'rects') continue;
      const where = `${id} ${JSON.stringify(values)}`;
      const eps = 1e-9;
      expect(plot.rects.length, where).toBeLessThan(1500);
      for (const r of plot.rects) {
        expect(r.w, where).toBeGreaterThan(0);
        expect(r.x >= -eps && r.y >= -eps && r.x + r.w <= plot.width + eps && r.y + r.h <= plot.height + eps, where).toBe(true);
      }
      for (const n of plot.notes) expect(n.x >= -eps && n.y >= -eps && n.x <= plot.width + eps && n.y <= plot.height + eps, `${where} ${n.text}`).toBe(true);
    }
  });
});
