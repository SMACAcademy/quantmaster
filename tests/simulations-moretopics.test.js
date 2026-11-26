/**
 * Simulations for simplification, approximation, the counting principle, set
 * theory, caselets, radar charts, races, work and wages, and quadratic
 * comparison (src/simulations/moreTopics.js). The general checks (controls,
 * corners, challenges, meta) run for every simulation in simulations.test.js;
 * these hold each model to an independent calculation: JavaScript's own
 * arithmetic for BODMAS, brute force for sets and roots, the shoelace formula
 * for radar areas, and the race and wage formulas worked the long way.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { caseletKnown, choiceTree, collapse, nextOperation, race, radarArea, rootSigns, subsetsOf, wagesJob, moreTopicSims } from '../src/simulations/moreTopics.js';
import { placeSetElements, setRegionAt } from '../src/components/simPlots.js';
import { getSimulationMeta } from '../src/simulations/meta.js';
import { levelRepository } from '../src/repositories/contentRepository.js';

const result = (id, values) => run(getSimulation(id), { ...initialValues(getSimulation(id)), ...values }).result;
const numbers = (id, values) => result(id, values).numbers;
const readout = (id, values, label) => result(id, values).readouts.find((r) => r.label.startsWith(label))?.value;

/** An expression's value the way JavaScript works it out, which follows BODMAS. */
const jsValue = (tokens) => Function(`return (${tokens.join(' ').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')});`)();
const final = (lines) => lines[lines.length - 1].tokens[0];

describe('the BODMAS stack', () => {
  const problems = [
    [8, '+', 6, '×', 3, '−', 4, '÷', 2],
    [48, '÷', 6, '×', 2],
    [36, '−', '(', 4, '+', 8, ')', '÷', 3, '×', 2],
    [100, '−', 20, '−', 30, '+', 5],
    ['(', 2, '+', 3, ')', '×', '(', 7, '−', 4, ')', '÷', 5],
    [2, '+', '(', 3, '×', '(', 4, '+', 1, ')', ')']
  ];

  it('collapses to the value JavaScript gives, one operation per line', () => {
    for (const tokens of problems) {
      const lines = collapse(tokens);
      expect(final(lines), tokens.join(' ')).toBeCloseTo(jsValue(tokens), 9);
      expect(lines.length - 1).toBe(tokens.filter((t) => ['+', '−', '×', '÷'].includes(t)).length);
      expect(lines[lines.length - 1].tokens).toHaveLength(1);
    }
  });

  it('chooses the next operation by brackets, then level, then left to right', () => {
    expect(nextOperation([8, '+', 6, '×', 3])).toEqual({ index: 3, reason: 'level' });
    expect(nextOperation([48, '÷', 6, '×', 2])).toEqual({ index: 1, reason: 'same-level' });
    expect(nextOperation([36, '−', '(', 4, '+', 8, ')']).index).toBe(4);
    expect(nextOperation([36, '−', '(', 4, '+', 8, ')']).reason).toBe('bracket');
    expect(nextOperation([5, '−', 2]).reason).toBe('last');
    expect(nextOperation([7])).toBeNull();
    // The two mistakes.
    expect(nextOperation([8, '+', 6, '×', 3], 'left').index).toBe(1);
    expect(nextOperation([48, '÷', 6, '×', 2], 'mult-first').index).toBe(3);
  });

  it('gives the right answer and the mistaken one for each expression', () => {
    expect(numbers('bodmas-stack', { problem: 'p1' })).toMatchObject({ correct: 24, mistakeValue: 19 });
    expect(numbers('bodmas-stack', { problem: 'p2' })).toMatchObject({ correct: 16, mistakeValue: 4 });
    expect(numbers('bodmas-stack', { problem: 'p3' })).toMatchObject({ correct: 28, mistakeValue: 16 });
    // The step slider stops at the last line: 48 ÷ 6 × 2 has two operations.
    expect(numbers('bodmas-stack', { problem: 'p2', step: 4 })).toMatchObject({ at: 2, total: 2, done: true, value: 16 });
    expect(numbers('bodmas-stack', { problem: 'p2', order: 'wrong', step: 4 }).value).toBe(4);
    expect(readout('bodmas-stack', { problem: 'p1' }, 'Next operation')).toBe('6 × 3 (× and ÷ come before + and −)');
    // The bracket goes in one step, brackets and all.
    expect(numbers('bodmas-stack', { problem: 'p3', step: 1 }).bracket).toBe(false);
    expect(result('bodmas-stack', { problem: 'p3', step: 1 }).plot.lines[1].tokens.map((t) => t.text).join(' ')).toBe('36 − 12 ÷ 3 × 2');
  });
});

describe('the estimate band', () => {
  const exact = 48.6 * 21.6;

  it('measures the error of the rounded product against the exact one', () => {
    for (const [ra, rb] of [
      [49, 22],
      [50, 21],
      [50, 20],
      [45, 25]
    ]) {
      const n = numbers('estimate-band', { ra, rb });
      expect(n.estimate).toBe(ra * rb);
      expect(n.relative).toBeCloseTo((ra / 48.6) * (rb / 21.6) - 1, 12);
      // The band always holds the exact answer, at one of its ends.
      expect(n.band[0]).toBeLessThanOrEqual(exact + 1e-9);
      expect(n.band[1]).toBeGreaterThanOrEqual(exact - 1e-9);
    }
  });

  it('keeps the error small when one rounds up and the other down', () => {
    const opposite = numbers('estimate-band', { ra: 50, rb: 21 });
    const bothUp = numbers('estimate-band', { ra: 50, rb: 22 });
    expect(opposite.opposite).toBe(true);
    expect(Math.abs(opposite.relative)).toBeLessThan(0.001);
    expect(bothUp.relative).toBeGreaterThan(0.04);
    expect(opposite.nearest).toBe(1050);
    expect(opposite.inBand).toEqual([1050]);
    expect(numbers('estimate-band', { ra: 49, rb: 22 }).inBand).toEqual([1050, 1100]);
    expect(readout('estimate-band', {}, 'Exact answer')).toBe('Hidden');
    expect(readout('estimate-band', { reveal: 'shown' }, 'Exact answer')).toBe('1,049.76');
  });
});

describe('the tree of choices', () => {
  it('ends in the product of the options, layer by layer', () => {
    for (const counts of [[3], [3, 2], [4, 3, 2], [1, 4, 1], [4, 4, 4]]) {
      const nodes = choiceTree(counts);
      const leaves = nodes.filter((_, i) => !nodes.some((node) => node.parent === i));
      const product = counts.reduce((p, c) => p * c, 1);
      expect(leaves).toHaveLength(product);
      // 1 root + n1 + n1·n2 + n1·n2·n3
      let layer = 1;
      const total = 1 + counts.reduce((sum, c) => sum + (layer *= c), 0);
      expect(nodes).toHaveLength(total);
      expect(nodes.every((node, i) => node.parent < i)).toBe(true);
    }
  });

  it('multiplies for "and" and adds for "or"', () => {
    expect(numbers('choice-tree', { stages: 3, n1: 4, n2: 3, n3: 2 })).toMatchObject({ product: 24, sum: 9, leaves: 24 });
    expect(numbers('choice-tree', { mode: 'or', stages: 3, n1: 4, n2: 3, n3: 2 })).toMatchObject({ product: 24, sum: 9, leaves: 9 });
    expect(result('choice-tree', { mode: 'or', stages: 2 }).plot.nodes).toHaveLength(1 + 3 + 2);
    expect(numbers('choice-tree', { stages: 2, n1: 2, n2: 2 })).toMatchObject({ product: 4, sum: 4 });
  });
});

describe('elements in sets', () => {
  const brute = (n, steps) => {
    const sets = steps.map((s) => Array.from({ length: n }, (_, i) => i + 1).filter((v) => v % s === 0));
    const union = Array.from({ length: n }, (_, i) => i + 1).filter((v) => steps.some((s) => v % s === 0));
    return { sets, union };
  };

  it('agrees with counting the union directly, for two and three sets', () => {
    for (const n of [6, 12, 20]) {
      for (const a of [2, 3, 4, 5, 6]) {
        for (const b of [2, 3, 4, 5, 6]) {
          const two = numbers('set-elements', { view: 'two', n, a, b });
          const check = brute(n, [a, b]);
          expect(two.union).toBe(check.union.length);
          expect(two.sizes[0] + two.sizes[1] - two.ab).toBe(two.union);
          expect(two.union + two.outside).toBe(n);
          for (const c of [2, 5]) {
            const three = numbers('set-elements', { view: 'three', n, a, b, c });
            const t = brute(n, [a, b, c]);
            expect(three.union).toBe(t.union.length);
            expect(three.sizes.reduce((s, v) => s + v, 0) - three.ab - three.ac - three.bc + three.abc).toBe(three.union);
          }
        }
      }
    }
    expect(readout('set-elements', {}, 'n(A ∪ B)')).toBe('6 + 4 − 2 = 8');
    expect(readout('set-elements', {}, 'A ∩ B')).toBe('{6, 12}');
  });

  it('doubles the power set with each element', () => {
    for (let k = 0; k <= 5; k++) {
      const subsets = subsetsOf(k);
      expect(subsets).toHaveLength(2 ** k);
      expect(new Set(subsets.map((s) => s.join(','))).size).toBe(2 ** k);
      const n = numbers('set-elements', { view: 'power', k });
      expect(n.count).toBe(2 ** k);
      expect(n.fresh).toBe(k ? 2 ** (k - 1) : 0);
    }
  });

  it('draws every element inside exactly its own sets, with no two on one spot', () => {
    for (const view of ['two', 'three']) {
      for (const n of [6, 12, 20]) {
        for (const [a, b, c] of [
          [2, 3, 5],
          [2, 2, 2],
          [2, 4, 6],
          [6, 5, 4],
          [3, 6, 2]
        ]) {
          const { plot } = result('set-elements', { view, n, a, b, c });
          const placed = placeSetElements(plot.sets.length, plot.elements);
          expect(placed, `${view} ${n} ${a} ${b} ${c}`).not.toBeNull();
          plot.elements.forEach((e, i) => expect(setRegionAt(plot.sets.length, placed.spots[i]), `${e.value}`).toBe(e.in));
          expect(new Set(placed.spots.map((p) => `${p.x},${p.y}`)).size).toBe(plot.elements.length);
        }
      }
    }
  });
});

describe('the caselet table', () => {
  const ALL = new Set([0, 1, 2, 3, 4, 5, 6]);

  it('fills a table whose rows and columns add up', () => {
    const { plot } = result('caselet-table', { read: 7 });
    const table = plot.plots[1];
    const grid = table.rows.map((row) => row.cells.map((cell) => Number(cell.text.replace(/,/g, ''))));
    for (const row of grid) expect(row[0] + row[1]).toBe(row[2]);
    for (let col = 0; col < 3; col++) expect(grid[0][col] + grid[1][col] + grid[2][col]).toBe(grid[3][col]);
    expect(caseletKnown(ALL).size).toBe(12);
    expect(numbers('caselet-table', { read: 7 })).toMatchObject({ given: 3, derived: 9, blank: 0 });
  });

  it('fills a derived cell only once its inputs are known', () => {
    expect([...caseletKnown(new Set([0, 1]))].sort()).toEqual(['1,2', '3,2']);
    // "The rest study Commerce" needs the Arts total, which needs "100 fewer".
    expect(caseletKnown(new Set([0, 1, 3])).has('2,2')).toBe(false);
    expect(caseletKnown(new Set([0, 1, 2, 3])).has('2,2')).toBe(true);
    const n = numbers('caselet-table', { read: 7, skip: 'arts' });
    expect(n.never).toBe(6);
    expect(n.known).toContain('3,0'); // total boys = 800 − 360 still follows
    expect(numbers('caselet-table', { read: 7, skip: 'girls' }).never).toBe(4);
    expect(numbers('caselet-table', { read: 7 }).fresh).toBe(4);
  });
});

describe('radar or bars', () => {
  /** Shoelace area of the radar polygon drawn on the unit spokes. */
  const shoelace = (values) => {
    const pts = values.map((v, i) => [v * Math.sin((2 * Math.PI * i) / values.length), v * Math.cos((2 * Math.PI * i) / values.length)]);
    return Math.abs(pts.reduce((s, [x, y], i) => s + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y, 0)) / 2;
  };

  it('measures the shape area as the polygon does', () => {
    for (const values of [
      [100, 30, 90, 45, 95],
      [70, 75, 65, 70, 70],
      [1, 1, 1, 1],
      [5, 0, 5, 0, 5, 0]
    ])
      expect(radarArea(values)).toBeCloseTo(shoelace(values), 9);
  });

  it('changes the areas with the spoke order, never the marks', () => {
    const given = numbers('radar-or-bars', {});
    const grouped = numbers('radar-or-bars', { order: 'grouped' });
    expect(given.totals).toEqual([360, 350]);
    expect(grouped.totals).toEqual(given.totals);
    expect(given.areaA).toBeLessThan(given.areaR);
    expect(grouped.areaA).toBeGreaterThan(grouped.areaR);
    expect(given.ashaBest).toBe('Maths');
    expect(given.raviBest).toBe('Science');
    expect(result('radar-or-bars', { view: 'bars' }).plot.chart.type).toBe('bar');
    expect(readout('radar-or-bars', { focus: 'science' }, 'Selected subject')).toBe('Science: Asha 30, Ravi 75 (Ravi +45)');
  });
});

describe('the race track', () => {
  it('measures the margin when the winner crosses the line', () => {
    for (const length of [100, 200, 400]) {
      for (const ratio of [50, 80, 90, 99]) {
        const r = race(length, ratio, 0);
        // A runs L while B runs L × ratio/100 in the same time.
        expect(r.winner).toBe('A');
        expect(r.margin).toBeCloseTo(length - (length * ratio) / 100, 9);
        // The time margin is the distance B still has to run, at B's speed.
        expect(r.seconds).toBeCloseTo(r.margin / r.speedB, 9);
        // Giving B the dead-heat start makes it a tie.
        expect(race(length, ratio, r.deadHeat).timeB).toBeCloseTo(r.timeA, 9);
      }
    }
    expect(race(100, 90, 20).winner).toBe('B');
    expect(race(100, 90, 20).margin).toBeCloseTo(100 - 10 * (80 / 9), 9);
    expect(race(100, 100, 0).winner).toBe('tie');
  });

  it('reads like the exam', () => {
    expect(readout('race-track', {}, 'Result')).toBe('A beats B by 10 m (1.11 s)');
    expect(readout('race-track', {}, 'Head start for a dead heat')).toBe('10 m');
    expect(readout('race-track', { start: 10 }, 'Result')).toBe('Dead heat');
    expect(numbers('race-track', { length: 200 }).margin).toBeCloseTo(20, 9);
    expect(numbers('race-track', { clock: 50 })).toMatchObject({ posA: 50, posB: 45 });
  });
});

describe('wages by work done', () => {
  it('splits the job by rate when both stay, and by days × rate when one leaves', () => {
    for (const [a, b] of [
      [10, 15],
      [12, 12],
      [3, 20]
    ]) {
      const job = wagesJob(a, b);
      expect(job.workA + job.workB).toBeCloseTo(1, 12);
      expect(job.workA / job.workB).toBeCloseTo(b / a, 12); // 1/a : 1/b
      expect(job.days).toBeCloseTo((a * b) / (a + b), 12);
    }
    const early = wagesJob(10, 15, 3);
    expect(early.workB).toBeCloseTo(3 / 15, 12);
    expect(early.days).toBeCloseTo(3 + (1 - 3 / 10 - 3 / 15) * 10, 12);
    // Leaving after the job is done changes nothing.
    expect(wagesJob(10, 15, 9).days).toBeCloseTo(6, 12);
  });

  it('pays by work, not by days', () => {
    const stay = numbers('wage-split', {});
    expect(stay.payA).toBeCloseTo(1800, 9);
    expect(stay.payB).toBeCloseTo(1200, 9);
    expect(stay.byDaysA).toBeCloseTo(1500, 9);
    expect(numbers('wage-split', { leave: 'early', k: 3 }).payB).toBeCloseTo(600, 9);
    expect(readout('wage-split', {}, 'Wages by work done')).toBe('A ₹1,800 · B ₹1,200');
    // The progress bar's pieces add up to the work done so far.
    const half = result('wage-split', { progress: 50 }).plot.rects.filter((r) => r.y === 0.7 && !r.dashed);
    expect(half.reduce((s, r) => s + r.w, 0)).toBeCloseTo(5, 9);
  });
});

describe('comparing the roots of x and y', () => {
  /** The relation by brute force over every pair, written independently of the generator. */
  const relation = (xs, ys) => {
    const pairs = xs.flatMap((x) => ys.map((y) => x - y));
    const eps = 1e-9;
    if (pairs.every((d) => d > eps)) return 'x > y';
    if (pairs.every((d) => d < -eps)) return 'x < y';
    if (pairs.every((d) => Math.abs(d) <= eps)) return 'x = y';
    if (pairs.every((d) => d >= -eps)) return 'x ≥ y';
    if (pairs.every((d) => d <= eps)) return 'x ≤ y';
    return 'Cannot be established';
  };
  const roots = (b, c) => {
    const d = b * b - 4 * c;
    if (d < 0) return [];
    return d === 0 ? [-b / 2] : [(-b - Math.sqrt(d)) / 2, (-b + Math.sqrt(d)) / 2];
  };

  it('badges the same relation as checking every pair', () => {
    for (const bx of [-10, -7, -1, 0, 4, 10]) {
      for (const cx of [-20, -6, 0, 6, 12, 20]) {
        for (const [by, cy] of [
          [9, 20],
          [-7, 10],
          [-1, -6],
          [-7, 12],
          [0, 4]
        ]) {
          const n = numbers('compare-roots', { bx, cx, by, cy });
          const xs = roots(bx, cx);
          const ys = roots(by, cy);
          expect(n.xs.length).toBe(xs.length);
          if (!xs.length || !ys.length) expect(n.badge).toBe('No real roots');
          else expect(n.badge, `${bx} ${cx} ${by} ${cy}`).toBe(relation(xs, ys));
        }
      }
    }
  });

  it('reads the signs of the roots from b and c', () => {
    for (let b = -10; b <= 10; b++) {
      for (let c = -20; c <= 20; c++) {
        const r = roots(b, c);
        const said = rootSigns(b, c);
        if (!r.length) continue;
        if (c < 0) expect(r[0] < 0 && r[r.length - 1] > 0, said).toBe(true);
        else if (c > 0 && b < 0) expect(r.every((v) => v > 0), said).toBe(true);
        else if (c > 0 && b > 0) expect(r.every((v) => v < 0), said).toBe(true);
        else if (c === 0) expect(r.some((v) => v === 0 || Object.is(v, -0)), said).toBe(true);
      }
    }
    expect(readout('compare-roots', {}, 'I')).toBe('x² − 7x + 12 = 0 → x = 3, 4');
    expect(readout('compare-roots', {}, 'II')).toBe('y² + 9y + 20 = 0 → y = −5, −4');
    expect(numbers('compare-roots', {}).badge).toBe('x > y');
  });
});

describe('placement', () => {
  it('gives each topic its own simulation, first among those in its first lesson', () => {
    for (const simulation of moreTopicSims) {
      expect(getSimulationMeta(simulation.id).topicId).toBe(simulation.topicId);
      const lesson = levelRepository.getById(`${simulation.topicId}-level-0`).lesson;
      const first = lesson.blocks.find((block) => block.type === 'simulation');
      expect(first?.simulationId, simulation.topicId).toBe(simulation.id);
    }
  });
});
