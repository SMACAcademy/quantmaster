/**
 * Geometry and mensuration simulations (src/simulations/geometry.js). The
 * general checks (controls, corners, challenges, meta) run for every simulation
 * in simulations.test.js; these hold each model to an independent calculation:
 * angles measured from the drawn lines, quadrilateral facts measured from the
 * corners, l(12 − l) for a 24 m fence, outer − inner with π = 22/7, and volume
 * kept when a solid is recast.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { classifyQuadrilateral, fixedRectangle, geometrySims, quadPoints, recast, shadedArea, transversalAngles } from '../src/simulations/geometry.js';
import { getSimulationMeta } from '../src/simulations/meta.js';
import { levelRepository } from '../src/repositories/contentRepository.js';

const result = (id, values) => run(getSimulation(id), { ...initialValues(getSimulation(id)), ...values }).result;
const numbers = (id, values) => result(id, values).numbers;
const range = (from, to, step) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);
const PI = 22 / 7;

describe('lines-angles', () => {
  it('has only two angle sizes, adding to 180°, when the lines are parallel', () => {
    for (const theta of range(30, 150, 5)) {
      const a = transversalAngles(theta);
      expect(new Set(a).size).toBe(theta === 90 ? 1 : 2);
      // Corresponding (1-5, 2-6, 3-7, 4-8) and alternate (4-6, 3-5) are equal; co-interior (4-5, 3-6) add to 180°.
      for (let k = 0; k < 4; k++) expect(a[k]).toBe(a[k + 4]);
      expect(a[3]).toBe(a[5]);
      expect(a[2]).toBe(a[4]);
      expect(a[3] + a[4]).toBe(180);
      expect(a[2] + a[5]).toBe(180);
    }
  });

  it('keeps the angles round each crossing at 360°, and breaks the pairs by the tilt', () => {
    for (const theta of range(30, 150, 5)) {
      for (const tilt of range(-15, 15, 5)) {
        const a = transversalAngles(theta, tilt);
        expect(a.slice(0, 4).reduce((s, x) => s + x, 0)).toBe(360);
        expect(a.slice(4).reduce((s, x) => s + x, 0)).toBe(360);
        expect(a[0]).toBe(a[2]); // vertically opposite
        expect(a[5]).toBe(a[7]);
        expect(a[1] - a[5]).toBe(tilt); // corresponding angles differ by the tilt
        expect(a[3] + a[4]).toBe(180 + tilt); // the left inside angles: the lines meet on the side under 180°
        expect(a.every((x) => x > 0 && x < 180)).toBe(true);
      }
    }
  });

  it('draws each highlighted angle at its size, at crossings on the lines', () => {
    for (const lines of ['parallel', 'tilted']) {
      for (const pair of ['corresponding', 'alternate', 'co-interior']) {
        const r = result('lines-angles', { angle: 50, lines, tilt: -15, pair });
        const tilt = lines === 'tilted' ? -15 : 0;
        const [P, Q] = r.plot.items.filter((item) => item.type === 'point').map((item) => item.at);
        expect(P[1]).toBeCloseTo(1, 9);
        // Q is on the lower line: through (0, −1) at the tilt.
        expect(Q[1] + 1).toBeCloseTo(Q[0] * Math.tan((tilt * Math.PI) / 180), 9);
        const sectors = r.plot.items.filter((item) => item.type === 'angle');
        expect(sectors).toHaveLength(4);
        const values = r.numbers.pairValues.flat();
        sectors.forEach((s, i) => expect(s.to - s.from).toBeCloseTo(values[i], 9));
      }
    }
  });

  it('reads pairs and the side where non-parallel lines meet', () => {
    const n = numbers('lines-angles', { angle: 60, pair: 'co-interior' });
    expect(n.pairValues).toEqual([
      [60, 120],
      [120, 60]
    ]);
    expect(n.holds).toEqual([true, true]);
    const tilted = numbers('lines-angles', { angle: 60, lines: 'tilted', tilt: -10 });
    expect(tilted.holds).toEqual([false, false]);
    expect(tilted.leftSum).toBe(170);
    expect(tilted.rightSum).toBe(190);
    // "Tilted" by 0° is parallel again.
    expect(numbers('lines-angles', { lines: 'tilted', tilt: 0 }).parallel).toBe(true);
  });
});

describe('quadrilaterals', () => {
  it('names the textbook shapes from their corners', () => {
    const name = (points) => classifyQuadrilateral(points).name;
    expect(name([[0, 0], [2, 0], [2, 2], [0, 2]])).toBe('Square');
    expect(name([[0, 0], [4, 0], [4, 2], [0, 2]])).toBe('Rectangle');
    expect(name([[0, 0], [5, 0], [8, 4], [3, 4]])).toBe('Rhombus'); // sides 5, 5, 5, 5
    expect(name([[0, 0], [4, 0], [5, 2], [1, 2]])).toBe('Parallelogram');
    expect(name([[0, 0], [6, 0], [4, 2], [2, 2]])).toBe('Isosceles trapezium');
    expect(name([[0, 0], [6, 0], [3, 2], [0, 2]])).toBe('Right trapezium');
    expect(name([[0, 0], [5, 0], [4, 2], [1, 3]])).toBe('Quadrilateral');
    expect(name([[0, -1], [2, 0], [0, 4], [-2, 0]])).toBe('Kite');
  });

  it('measures diagonals: equal in a rectangle, perpendicular in a rhombus, bisecting in every parallelogram', () => {
    const facts = (points) => classifyQuadrilateral(points).diagonals;
    expect(facts([[0, 0], [4, 0], [4, 2], [0, 2]])).toMatchObject({ equal: true, bisect: true, perpendicular: false });
    expect(facts([[0, 0], [5, 0], [8, 4], [3, 4]])).toMatchObject({ equal: false, bisect: true, perpendicular: true });
    expect(facts([[0, 0], [2, 0], [2, 2], [0, 2]])).toMatchObject({ equal: true, bisect: true, perpendicular: true });
    expect(facts([[0, 0], [4, 0], [5, 2], [1, 2]])).toMatchObject({ equal: false, bisect: true, perpendicular: false });
    expect(facts([[0, 0], [5, 0], [4, 2], [1, 3]]).bisect).toBe(false);
  });

  it('keeps every shape it draws convex, at 360°, with the facts its name promises', () => {
    for (const sides of ['none', 'one', 'both']) {
      for (const equal of ['off', 'on']) {
        for (const right of ['off', 'on']) {
          for (const angle of range(45, 135, 5)) {
            const points = quadPoints({ sides, equal, right, angle });
            const q = classifyQuadrilateral(points);
            const where = `${sides} ${equal} ${right} ${angle}`;
            expect(q.angleSum, where).toBeCloseTo(360, 9);
            // Convex: every turn goes the same way (anticlockwise).
            points.forEach((p, i) => {
              const [b, c] = [points[(i + 1) % 4], points[(i + 2) % 4]];
              expect((b[0] - p[0]) * (c[1] - b[1]) - (b[1] - p[1]) * (c[0] - b[0]), where).toBeGreaterThan(0);
            });
            const expected =
              equal === 'on'
                ? right === 'on' || angle === 90
                  ? 'Square'
                  : 'Rhombus'
                : sides === 'both'
                  ? right === 'on' || angle === 90
                    ? 'Rectangle'
                    : 'Parallelogram'
                  : sides === 'one'
                    ? right === 'on' || angle === 90
                      ? 'Right trapezium'
                      : 'Trapezium'
                    : 'Quadrilateral';
            expect(q.name, where).toBe(expected);
            const { diagonals: d } = q;
            if (q.parallelPairs === 2) expect(d.bisect, where).toBe(true);
            expect(d.equal, where).toBe(['Square', 'Rectangle'].includes(q.name));
            expect(d.perpendicular, where).toBe(['Square', 'Rhombus'].includes(q.name));
          }
        }
      }
    }
  });

  it('snaps four equal sides to a rhombus, whatever the parallel sides asked for', () => {
    expect(numbers('quadrilaterals', { sides: 'one', equal: 'on' })).toMatchObject({ name: 'Rhombus', snapped: true, parallelPairs: 2 });
    expect(numbers('quadrilaterals', { sides: 'none', equal: 'on', right: 'on' })).toMatchObject({ name: 'Square', snapped: true });
    expect(numbers('quadrilaterals', {})).toMatchObject({ name: 'Parallelogram', snapped: false });
  });
});

describe('perimeter-area', () => {
  it('traces area = l(12 − l) for a 24 m fence, highest for the square', () => {
    const lengths = range(1, 11, 0.5);
    const areas = lengths.map((length) => numbers('perimeter-area', { mode: 'perimeter', length }));
    for (const n of areas) {
      expect(n.perimeter).toBeCloseTo(24, 9);
      expect(n.area).toBeCloseTo(n.length * (12 - n.length), 9);
      expect(numbers('perimeter-area', { mode: 'perimeter', length: 12 - n.length }).area).toBeCloseTo(n.area, 9); // symmetric
    }
    const best = areas.reduce((a, b) => (b.area > a.area ? b : a));
    expect(best).toMatchObject({ length: 6, width: 6, area: 36, square: true });
    expect(lengths.filter((l) => Math.abs(fixedRectangle('perimeter', l).area - 20) < 1e-9)).toEqual([2, 10]);
  });

  it('needs the least fence for a fixed area when the rectangle is a square', () => {
    const lengths = range(2, 18, 0.5);
    const all = lengths.map((side) => numbers('perimeter-area', { mode: 'area', side }));
    for (const n of all) {
      expect(n.area).toBeCloseTo(36, 9);
      expect(n.perimeter).toBeGreaterThanOrEqual(24 - 1e-9);
    }
    expect(all.reduce((a, b) => (b.perimeter < a.perimeter ? b : a))).toMatchObject({ length: 6, perimeter: 24 });
    expect(lengths.filter((l) => Math.abs(fixedRectangle('area', l).perimeter - 30) < 1e-9)).toEqual([3, 12]);
  });

  it('plots the marker on its curve', () => {
    const { plot } = result('perimeter-area', { mode: 'area', side: 9 });
    const graph = plot.plots[1];
    expect(graph.markers[0]).toMatchObject({ x: 9, y: 2 * (9 + 4) });
    expect(graph.series[0].points.some(([x, y]) => x === 9 && Math.abs(y - 26) < 1e-9)).toBe(true);
  });
});

describe('mensuration-2d', () => {
  it('leaves the same share in the corners of every square: 1 − π/4 = 3/14', () => {
    for (const side of range(4, 28, 2)) {
      const n = numbers('mensuration-2d', { figure: 'square', side });
      expect(n.shaded).toBeCloseTo(side * side - PI * (side / 2) ** 2, 9);
      expect(n.share).toBeCloseTo((3 / 14) * 100, 9);
    }
    expect(numbers('mensuration-2d', { figure: 'square', side: 14 }).shaded).toBeCloseTo(42, 9); // 196 − 154
  });

  it('finds a path as outer − garden, which is 2w(l + b + 2w)', () => {
    for (const length of [10, 24, 40]) {
      for (const breadth of [6, 18, 30]) {
        for (const path of range(1, 5, 0.5)) {
          const { outer, inner } = shadedArea({ figure: 'path', length, breadth, path });
          expect(outer - inner).toBeCloseTo(2 * path * (length + breadth + 2 * path), 9);
        }
      }
    }
    expect(numbers('mensuration-2d', { figure: 'path', length: 20, breadth: 6, path: 2 })).toMatchObject({ outer: 240, inner: 120, shaded: 120 });
  });

  it('finds a ring as π(R + r)(R − r)', () => {
    for (const outer of range(8, 28, 1)) {
      for (const band of range(1, 7, 1)) {
        const r = outer - band;
        expect(numbers('mensuration-2d', { figure: 'ring', outer, band }).shaded).toBeCloseTo(PI * (outer + r) * band, 9);
      }
    }
    expect(numbers('mensuration-2d', { figure: 'ring', outer: 14, band: 7 }).shaded).toBeCloseTo(462, 9);
    expect(numbers('mensuration-2d', { figure: 'ring', outer: 21, band: 7 }).shaded).toBeCloseTo(770, 9);
  });
});

describe('volume-surface-area', () => {
  it('keeps the volume and grows the surface: ∛n times for spheres from a sphere', () => {
    for (const count of range(1, 100, 1)) {
      const n = numbers('volume-surface-area', { from: 'sphere', into: 'spheres', count });
      expect(n.volumeAfter).toBeCloseTo(288, 9);
      expect((4 / 3) * n.r ** 3 * count).toBeCloseTo(288, 9);
      expect(n.ratio).toBeCloseTo(Math.cbrt(count), 9);
    }
    expect(numbers('volume-surface-area', { count: 8 }).r).toBeCloseTo(3, 9);
  });

  it('makes cones with height 4r/3 and slant 5r/3, from either solid', () => {
    for (const from of ['sphere', 'cylinder']) {
      let previous = 0;
      for (const count of range(1, 100, 1)) {
        const n = numbers('volume-surface-area', { from, into: 'cones', count });
        const cone = recast(288, 'cones', count);
        expect(n.volumeAfter).toBeCloseTo(288, 9);
        expect((count * cone.r * cone.r * cone.h) / 3).toBeCloseTo(288, 9);
        expect(cone.l).toBeCloseTo(Math.hypot(cone.r, cone.h), 9);
        expect(n.areaAfter).toBeCloseTo(count * cone.r * (cone.r + cone.l), 9); // πr(r + l) each, in units of π
        expect(n.areaAfter).toBeGreaterThan(previous); // more pieces, more surface
        previous = n.areaAfter;
      }
    }
    expect(recast(288, 'cones', 24)).toMatchObject({ r: expect.closeTo(3, 9), h: expect.closeTo(4, 9), l: expect.closeTo(5, 9) });
  });

  it('starts from a sphere and a cylinder of the same volume, the cylinder with more surface', () => {
    const sphere = numbers('volume-surface-area', { from: 'sphere', count: 1 });
    const cylinder = numbers('volume-surface-area', { from: 'cylinder', count: 1 });
    expect(sphere.areaBefore).toBe(4 * 36); // 4πr², r = 6
    expect(cylinder.areaBefore).toBe(2 * 6 * (6 + 8)); // 2πr(r + h)
    expect((4 / 3) * 6 ** 3).toBe(6 * 6 * 8); // 288π both
    expect(numbers('volume-surface-area', { from: 'cylinder', into: 'spheres', count: 27 }).r).toBeCloseTo(2, 9);
  });
});

describe('placement', () => {
  it('lists each simulation in meta and puts it in its topic’s first lesson', () => {
    for (const simulation of geometrySims) {
      expect(getSimulationMeta(simulation.id), simulation.id).not.toBeNull();
      const level = levelRepository.getAll().find((l) => l.id === `${simulation.topicId}-level-0`);
      const ids = (level?.lesson?.blocks || []).filter((b) => b.type === 'simulation').map((b) => b.simulationId);
      expect(ids, simulation.id).toContain(simulation.id);
    }
  });
});
