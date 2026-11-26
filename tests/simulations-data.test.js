/**
 * Data-interpretation and data-sufficiency simulations
 * (src/simulations/dataInterpretation.js). The general checks (controls,
 * corners, challenges, meta) run for every simulation in simulations.test.js;
 * these hold each model to an independent calculation: % change against the
 * base, 3.6° per 1%, shares from the table's own totals, and the five DS
 * options from brute-force answer sets.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { dataSims, dsOption, percentChange, steps } from '../src/simulations/dataInterpretation.js';
import { getSimulationMeta } from '../src/simulations/meta.js';
import { levelRepository } from '../src/repositories/contentRepository.js';

const result = (id, values) => run(getSimulation(id), { ...initialValues(getSimulation(id)), ...values }).result;
const numbers = (id, values) => result(id, values).numbers;
const readout = (id, values, label) => result(id, values).readouts.find((r) => r.label.startsWith(label))?.value;

describe('helpers', () => {
  it('measures % change against the base', () => {
    expect(percentChange(50, 100)).toBe(100);
    expect(percentChange(100, 50)).toBe(-50);
    expect(percentChange(80, 100)).toBe(25);
    expect(percentChange(100, 80)).toBe(-20);
  });

  it('finds the largest rise, the largest % rise and the smallest % rise', () => {
    const values = [10, 20, 25, 40];
    const { list, largestRise, largestPct, smallestPct } = steps(values, 0, 3);
    expect(list.map((s) => s.rise)).toEqual([10, 5, 15]);
    expect(largestRise.from).toBe(2); // +15
    expect(largestPct.from).toBe(0); // +100%
    expect(smallestPct.from).toBe(1); // +25%
    expect(steps(values, 2, 2)).toEqual({ list: [], largestRise: null, largestPct: null, smallestPct: null });
    // On a tie, the earlier step wins.
    expect(steps([10, 20, 30, 45], 0, 3).largestRise.from).toBe(2);
    expect(steps([10, 20, 40], 0, 2).largestPct.from).toBe(0);
  });

  it('names the five data-sufficiency options', () => {
    expect(dsOption(true, false, true)).toBe('A');
    expect(dsOption(false, true, true)).toBe('B');
    expect(dsOption(false, false, true)).toBe('C');
    expect(dsOption(true, true, true)).toBe('D');
    expect(dsOption(false, false, false)).toBe('E');
  });
});

describe('di-bar-graphs', () => {
  it('reads ratio, difference and % change between the two chosen bars', () => {
    const n = numbers('di-bar-graphs', { y2019: 60, y2023: 120, from: '2019', to: '2023' });
    expect(n).toMatchObject({ base: 60, other: 120, diff: 60, ratio: 2, pct: 100, back: -50 });
    // Twice as tall is +100%: (ratio − 1) × 100, never ratio × 100.
    for (let a = 10; a <= 250; a += 10) {
      for (let b = 10; b <= 250; b += 30) {
        const m = numbers('di-bar-graphs', { y2020: a, y2022: b, from: '2020', to: '2022' });
        expect(m.pct).toBeCloseTo((b / a - 1) * 100, 9);
        expect(m.back).toBeCloseTo((a / b - 1) * 100, 9);
      }
    }
    expect(readout('di-bar-graphs', { from: '2021', to: '2023' }, 'Ratio')).toBe('5 : 4 (× 1.25)');
  });

  it('colours the base and the compared bar and fades the rest', () => {
    const { chart } = result('di-bar-graphs', { from: '2020', to: '2022' }).plot;
    expect(chart.series[0].colorTokens).toEqual([null, 'arithmetic', null, 'combinatorics', null]);
    expect(chart.series[0].dim).toEqual([true, false, true, false, true]);
    expect(chart.guides.map((g) => g.value)).toEqual([90, 180]);
    // No "twice the base" line when it would be off the chart.
    expect(result('di-bar-graphs', { y2019: 200 }).plot.chart.guides).toHaveLength(1);
  });
});

describe('di-line-graphs', () => {
  it('separates the largest rise from the largest % rise', () => {
    const all = numbers('di-line-graphs', { from: 2016, to: 2023 });
    expect(all.riseFrom).toBe(6); // 84 → 106, +22
    expect(all.pctFrom).toBe(0); // 20 → 30, +50%
    expect(all.overall).toBeCloseTo(430, 9);
    // The window can be set either way round.
    expect(numbers('di-line-graphs', { from: 2023, to: 2016 })).toEqual(all);
    const single = numbers('di-line-graphs', { from: 2019, to: 2019 });
    expect(single).toMatchObject({ steps: 0, riseFrom: -1, pctFrom: -1 });
    expect(result('di-line-graphs', { from: 2019, to: 2019 }).plot.chart.series[0].highlights).toEqual([]);
  });

  it('marks one band when both leaders are the same step, two when they differ', () => {
    expect(result('di-line-graphs', { from: 2018, to: 2020 }).plot.chart.series[0].highlights).toHaveLength(1);
    expect(result('di-line-graphs').plot.chart.series[0].highlights.map((h) => h.from)).toEqual([6, 0]);
  });
});

describe('di-pie-charts', () => {
  it('turns a share into an angle (3.6° per 1%) and an amount (total × angle ÷ 360)', () => {
    for (const share of [5, 10, 25, 33, 40]) {
      const n = numbers('di-pie-charts', { sector: 'rent', rent: share, total: 72000 });
      expect(n.angle).toBeCloseTo(share * 3.6, 9);
      expect(n.amount).toBeCloseTo((72000 * share) / 100, 6);
    }
  });

  it('keeps the four shares at 100% with Savings as the rest', () => {
    const control = (id) => getSimulation('di-pie-charts').controls.find((c) => c.id === id);
    expect(control('rent').max + control('food').max + control('travel').max).toBeLessThan(100);
    const n = numbers('di-pie-charts', { sector: 'savings', rent: 40, food: 30, travel: 20 });
    expect(n.shares).toEqual([40, 30, 20, 10]);
    expect(n.angle).toBeCloseTo(36, 9);
    expect(n.shares.reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('di-tables', () => {
  it('works out shares from the yearly totals, in percentage points and per cent', () => {
    // Tablets: 20 of 100 in 2019, 40 of 160 in 2023.
    const n = numbers('di-tables', { item: 'tablets', base: '2019', compare: '2023' });
    expect(n.valueChange).toBeCloseTo(100, 9);
    expect(n.shareBase).toBeCloseTo(20, 9);
    expect(n.shareCompare).toBeCloseTo(25, 9);
    expect(n.pp).toBeCloseTo(5, 9);
    expect(n.sharePct).toBeCloseTo(25, 9);
    // Laptops: the same 30 in 2019 and 2022, but the total grew from 100 to 150.
    const flat = numbers('di-tables', { item: 'laptops', base: '2019', compare: '2022' });
    expect(flat.valueChange).toBe(0);
    expect(flat.pp).toBeCloseTo(-10, 9);
    // 2019 → 2020: every item +20%, so no share moves.
    expect(numbers('di-tables', { base: '2019', compare: '2020' }).allSame).toBe(true);
    expect(numbers('di-tables', { base: '2020', compare: '2019' }).allSame).toBe(true);
    expect(numbers('di-tables', { base: '2019', compare: '2019' }).allSame).toBe(false);
  });

  it('fills every cell of the table, with the base column marked', () => {
    for (const view of ['change', 'share', 'sales']) {
      const { plot } = result('di-tables', { view, base: '2021' });
      expect(plot.rows).toHaveLength(4); // three items and the total
      for (const row of plot.rows) expect(row.cells).toHaveLength(5);
      expect(plot.baseColumn).toBe(2);
    }
    const change = result('di-tables', { view: 'change', base: '2019' }).plot;
    expect(change.rows[0].cells.map((c) => c.text)).toEqual(['base', '+20%', '+40%', '+50%', '+60%']);
    const share = result('di-tables', { view: 'share', base: '2019' }).plot;
    expect(share.rows[2].cells.map((c) => c.text)).toEqual(['20%', '20%', '20%', '30%', '25%']);
    expect(share.rows[2].cells.map((c) => c.note)).toEqual([undefined, '0 pp', '0 pp', '+10 pp', '+5 pp']);
    expect(share.rows[3].cells.every((c) => c.text === '100%')).toBe(true);
  });
});

describe('data-sufficiency', () => {
  const brute = (problem, one, two) => numbers('data-sufficiency', { problem, one, two }).left;

  it('shrinks the answer set as statements are switched on', () => {
    for (const problem of ['p1', 'p2', 'p3']) {
      const none = brute(problem, 'off', 'off');
      expect(none).toBe(21);
      expect(brute(problem, 'on', 'off')).toBeLessThanOrEqual(none);
      expect(brute(problem, 'on', 'on')).toBeLessThanOrEqual(Math.min(brute(problem, 'on', 'off'), brute(problem, 'off', 'on')));
      expect(brute(problem, 'on', 'on')).toBeGreaterThan(0); // the statements never contradict each other
    }
    expect(brute('p1', 'on', 'off')).toBe(2); // x² = 16: −4 or 4
  });

  it('gives each problem the option its answer sets call for', () => {
    for (const problem of ['p1', 'p2', 'p3']) {
      const one = brute(problem, 'on', 'off') === 1;
      const two = brute(problem, 'off', 'on') === 1;
      const both = brute(problem, 'on', 'on') === 1;
      expect(numbers('data-sufficiency', { problem }).option).toBe(dsOption(one, two, both));
    }
    expect(['p1', 'p2', 'p3'].map((problem) => numbers('data-sufficiency', { problem }).option)).toEqual(['C', 'D', 'E']);
    expect(readout('data-sufficiency', { problem: 'p1', one: 'on', two: 'on' }, 'Enough')).toBe('Yes: x = 4');
  });
});

describe('placement', () => {
  it('lists each simulation in meta and puts it in its topic’s first lesson', () => {
    for (const simulation of [...dataSims, getSimulation('successive-change')]) {
      expect(getSimulationMeta(simulation.id), simulation.id).not.toBeNull();
      const level = levelRepository.getAll().find((l) => l.id === `${simulation.topicId}-level-0`);
      const ids = (level?.lesson?.blocks || []).filter((b) => b.type === 'simulation').map((b) => b.simulationId);
      expect(ids, simulation.id).toContain(simulation.id);
    }
  });
});
