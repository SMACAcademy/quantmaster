/**
 * "Slice the top off a cone" (src/simulations/frustums.js): the volumes, slant
 * and surface held to independent calculations at every setting (the volume
 * summed from thin slices of the frustum, the surface as the big cone's minus
 * the small one's), and the picture drawn from the same numbers.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { solidProblems } from '../src/utils/solidGeometry.js';

const sim = getSimulation('frustum-slice');
const compute = (values) => run(sim, { ...initialValues(sim), ...values }).result;
const close = (a, b, tolerance = 1e-9) => Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(b));
const range = (from, to, step = 1) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);

/** ∫₀ʰ area(y) dy by the midpoint rule. */
function sliced(area, h, slices = 4000) {
  const dy = h / slices;
  let total = 0;
  for (let i = 0; i < slices; i++) total += area((i + 0.5) * dy) * dy;
  return total;
}

describe('slicing a cone', () => {
  it('splits the volume as the slices say, and the frustum formula agrees', () => {
    for (const R of [2, 5, 14]) {
      for (const H of [4, 9, 24]) {
        for (const cut of range(10, 90, 5)) {
          const n = compute({ shape: 'cone', R, H, cut }).numbers;
          const z = (cut / 100) * H; // the cut, measured up from the base
          const radius = (y) => R * (1 - y / H); // the cone's radius at height y
          expect(close(n.h, z)).toBe(true);
          expect(close(n.top, radius(z))).toBe(true);
          expect(close(n.whole, sliced((y) => Math.PI * radius(y) ** 2, H), 1e-6)).toBe(true);
          expect(close(n.frustum, sliced((y) => Math.PI * radius(y) ** 2, z), 1e-6), `R=${R} H=${H} cut=${cut}`).toBe(true);
          expect(close(n.formula, n.frustum)).toBe(true);
          expect(close(n.smallShare, (1 - cut / 100) ** 3)).toBe(true);
          // Slant and curved surface from the apex: the whole cone's side minus the small cone's.
          const L = Math.hypot(R, H);
          const k = 1 - cut / 100;
          expect(close(n.slant, L - k * L)).toBe(true);
          expect(close(n.surface, Math.PI * R * L - Math.PI * (k * R) * (k * L))).toBe(true);
        }
      }
    }
  });

  it('leaves 7/8 in the frustum when cut halfway, and says so', () => {
    const result = compute({ shape: 'cone', R: 7, H: 24, cut: 50 });
    expect(close(result.numbers.frustumShare, 7 / 8)).toBe(true);
    expect(result.insight).toMatch(/7\/8/);
  });
});

describe('slicing a square pyramid', () => {
  it('splits the volume as the slices say, and (h/3)(A₁ + A₂ + √(A₁A₂)) agrees', () => {
    for (const a of [2, 7, 20]) {
      for (const H of [4, 12, 24]) {
        for (const cut of range(10, 90, 5)) {
          const n = compute({ shape: 'pyramid', a, H, cut }).numbers;
          const z = (cut / 100) * H;
          const side = (y) => a * (1 - y / H);
          expect(close(n.top, side(z))).toBe(true);
          expect(close(n.frustum, sliced((y) => side(y) ** 2, z), 1e-6), `a=${a} H=${H} cut=${cut}`).toBe(true);
          expect(close(n.formula, n.frustum)).toBe(true);
          // A face of the frustum is a trapezium with parallel sides a and b; its height is the slant.
          const slant = Math.hypot(z, (a - n.top) / 2);
          expect(close(n.slant, slant)).toBe(true);
          expect(close(n.surface, 4 * ((a + n.top) / 2) * slant)).toBe(true);
        }
      }
    }
  });

  it('builds the 10 → 5 frustum of the challenge at 350 cm³', () => {
    const n = compute({ shape: 'pyramid', a: 10, H: 12, cut: 50 }).numbers;
    expect(close(n.frustum, 350)).toBe(true);
    expect(close(n.formula, 350)).toBe(true);
  });
});

describe('the picture', () => {
  it('draws the whole solid, the frustum and the lifted top to one scale, each a valid solid figure', () => {
    for (const shape of ['cone', 'pyramid']) {
      for (const cut of [10, 50, 90]) {
        const result = compute({ shape, cut, H: 12, R: 6, a: 8 });
        const [solids, bars] = result.plot.plots;
        expect(solids.kind).toBe('solids');
        expect(bars.kind).toBe('bars');
        for (const item of solids.items) expect(solidProblems({ type: 'solid', parts: item.parts }), item.label).toEqual([]);
        const [whole, frustum, top] = solids.items.map((item) => item.parts[0]);
        // The frustum and the lifted top stack back into the whole.
        expect(close(frustum.h + top.h, whole.h)).toBe(true);
        if (shape === 'cone') {
          expect([frustum.R, frustum.r]).toEqual([whole.r, top.r]);
        } else {
          expect([frustum.a, frustum.b]).toEqual([whole.a, top.a]);
        }
        expect(bars.bars.map((b) => b.value).slice(1).reduce((s, v) => s + v, 0)).toBeCloseTo(100, 9);
      }
    }
  });
});
