/**
 * Two circles and their common tangents (src/simulations/twoCircles.js). The
 * general checks run for every simulation in simulations.test.js; these hold
 * the model to an independent calculation over many settings: the count from
 * where the outlines cross, the lengths from √(d² − (r₁ ∓ r₂)²) worked out
 * here, every drawn tangent touching both circles, the shaded triangle a true
 * right triangle, and everything kept inside the picture.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { levelRepository } from '../src/repositories/contentRepository.js';

const sim = getSimulation('two-circle-tangents');
const result = (values) => run(sim, { ...initialValues(sim), ...values }).result;
const range = (from, to, step = 1) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);
const dist = ([x1, y1], [x2, y2]) => Math.hypot(x2 - x1, y2 - y1);

/** Count common tangents without the library: from where the two outlines cross, worked out here. */
function countByCrossings(r1, r2, d) {
  if (d === 0) return r1 === r2 ? null : 0;
  const big = Math.max(r1, r2);
  const small = Math.min(r1, r2);
  if (d > r1 + r2) return 4; // separate, the smaller centre outside the larger circle
  if (d === r1 + r2) return 3; // one crossing point, between the centres
  if (d + small === big) return 1; // one crossing point, beyond the smaller centre
  if (d + small < big) return 0; // the smaller circle wholly inside
  return 2;
}

const settings = [];
const RADII = [1, 2, 3, 4, 6, 7, 10];
for (const r1 of RADII) for (const r2 of RADII) for (const d of range(0, 24, 0.5)) settings.push({ r1, r2, d });

describe('two-circle-tangents', () => {
  it('counts 4, 3, 2, 1, 0 common tangents, and draws exactly that many lines of each kind', () => {
    for (const { r1, r2, d } of settings) {
      const { numbers, plot } = result({ r1, r2, d });
      const where = `${r1} ${r2} ${d}`;
      const expected = countByCrossings(r1, r2, d);
      expect(numbers.count, where).toBe(expected);
      if (expected === null) continue;
      const drawn = plot.items.filter((item) => item.type === 'segment' && item.thin && item.tone);
      expect(drawn.length, where).toBe(expected);
      // Transverse tangents exist only while d ≥ r₁ + r₂.
      expect(numbers.transverseCount, where).toBe(d > r1 + r2 ? 2 : d === r1 + r2 ? 1 : 0);
    }
    expect([9, 6, 3, 15, 1].map((d) => result({ r1: 6, r2: 3, d }).numbers.count)).toEqual([3, 2, 1, 4, 0]);
  });

  it('gives the direct and transverse lengths √(d² − (r₁ ∓ r₂)²), with DCT² − TCT² = 4r₁r₂', () => {
    for (const { r1, r2, d } of settings) {
      const { numbers } = result({ r1, r2, d });
      const where = `${r1} ${r2} ${d}`;
      if (d >= Math.abs(r1 - r2) && d > 0) expect(numbers.direct, where).toBeCloseTo(Math.sqrt(d * d - (r1 - r2) ** 2), 9);
      else if (!(d === 0 && r1 === r2)) expect(numbers.direct, where).toBeNull();
      if (d >= r1 + r2) expect(numbers.transverse, where).toBeCloseTo(Math.sqrt(d * d - (r1 + r2) ** 2), 9);
      else expect(numbers.transverse, where).toBeNull();
      if (numbers.direct !== null && numbers.transverse !== null) expect(numbers.direct ** 2 - numbers.transverse ** 2).toBeCloseTo(4 * r1 * r2, 8);
    }
    expect(result({ r1: 8, r2: 3, d: 13 }).numbers.direct).toBeCloseTo(12, 12);
    expect(result({ r1: 6, r2: 3, d: 15 }).numbers.transverse).toBeCloseTo(12, 12);
  });

  it('draws every tangent touching both circles, its length measured between the touch points', () => {
    for (const { r1, r2, d } of settings) {
      const { numbers, plot } = result({ r1, r2, d });
      const where = `${r1} ${r2} ${d}`;
      const A = [0, 0];
      const B = [d, 0];
      for (const item of plot.items.filter((i) => i.type === 'segment' && i.tone && !i.thin)) {
        const kind = item.tone === 'algebra' ? 'direct' : 'transverse';
        expect(dist(item.from, A), where).toBeCloseTo(r1, 9);
        expect(dist(item.to, B), where).toBeCloseTo(r2, 9);
        expect(dist(item.from, item.to), where).toBeCloseTo(numbers[kind], 9);
        // The radii meet the tangent at right angles.
        const t = [item.to[0] - item.from[0], item.to[1] - item.from[1]];
        expect((item.from[0] - A[0]) * t[0] + (item.from[1] - A[1]) * t[1], where).toBeCloseTo(0, 8);
        expect((item.to[0] - B[0]) * t[0] + (item.to[1] - B[1]) * t[1], where).toBeCloseTo(0, 8);
      }
      for (const item of plot.items.filter((i) => i.type === 'point')) {
        const onA = Math.abs(dist(item.at, A) - r1) < 1e-9;
        const onB = Math.abs(dist(item.at, B) - r2) < 1e-9;
        const centre = dist(item.at, A) < 1e-12 || dist(item.at, B) < 1e-12;
        expect(onA || onB || centre, where).toBe(true);
      }
    }
  });

  it('shades a true right triangle: legs r₁ ∓ r₂ and the tangent, hypotenuse d', () => {
    let shown = 0;
    for (const { r1, r2, d } of settings) {
      for (const triangle of ['direct', 'transverse']) {
        const { numbers, plot } = result({ r1, r2, d, triangle });
        const polygon = plot.items.find((item) => item.type === 'polygon');
        expect(Boolean(polygon)).toBe(numbers.triangleShown);
        if (!polygon) continue;
        shown += 1;
        const where = `${r1} ${r2} ${d} ${triangle}`;
        const [A, R, B] = polygon.points;
        expect(dist(A, R), where).toBeCloseTo(triangle === 'direct' ? Math.abs(r1 - r2) : r1 + r2, 9);
        expect(dist(R, B), where).toBeCloseTo(numbers[triangle], 9);
        expect(dist(A, B), where).toBeCloseTo(d, 9);
        expect((A[0] - R[0]) * (B[0] - R[0]) + (A[1] - R[1]) * (B[1] - R[1]), where).toBeCloseTo(0, 8);
      }
    }
    expect(shown).toBeGreaterThan(500);
  });

  it('keeps both circles, every line, point and label anchor inside the picture', () => {
    for (const { r1, r2, d } of settings) {
      for (const triangle of ['direct', 'transverse']) {
        const { plot } = result({ r1, r2, d, triangle });
        const { view } = plot;
        const where = `${r1} ${r2} ${d} ${triangle}`;
        const inside = ([x, y]) => x >= view.xMin - 1e-9 && x <= view.xMax + 1e-9 && y >= view.yMin - 1e-9 && y <= view.yMax + 1e-9;
        for (const item of plot.items) {
          const corners =
            item.type === 'circle'
              ? [
                  [item.center[0] - item.r, item.center[1] - item.r],
                  [item.center[0] + item.r, item.center[1] + item.r]
                ]
              : item.type === 'segment'
                ? [item.from, item.to]
                : item.type === 'polygon'
                  ? item.points
                  : [item.at];
          for (const corner of corners) expect(inside(corner), `${where} ${item.type}`).toBe(true);
        }
        // The picture keeps its shape: one model unit is as long across as up.
        expect((view.xMax - view.xMin) / (view.yMax - view.yMin)).toBeCloseTo((560 - 36) / (320 - 36), 9);
      }
    }
  });

  it('says why the tangents vanish', () => {
    expect(result({ d: 9 }).insight).toMatch(/merged into one/);
    expect(result({ d: 6 }).insight).toMatch(/only the 2 direct/);
    expect(result({ d: 9, triangle: 'transverse' }).insight).toMatch(/shrunk to nothing/);
    expect(result({ d: 6, triangle: 'transverse' }).insight).toMatch(/no transverse tangent/);
    expect(result({ r1: 4, r2: 4, d: 0 }).readouts[1].value).toBe('Infinitely many');
  });

  it('is shown in the lesson that teaches common tangents', () => {
    const blocks = levelRepository.getById('circles-level-8').lesson.blocks;
    expect(blocks.some((block) => block.type === 'simulation' && block.simulationId === 'two-circle-tangents')).toBe(true);
  });
});
