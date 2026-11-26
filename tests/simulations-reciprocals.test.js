/**
 * The x + 1/x ladder (src/simulations/reciprocals.js): every rung checked
 * against xⁿ ± 1/xⁿ worked out from x itself (x found here by the quadratic
 * formula), or against 2 cos nθ when there is no real x, and the picture kept
 * consistent with the numbers at every setting.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';

const sim = () => getSimulation('reciprocal-ladder');
const compute = (values) => run(sim(), { ...initialValues(sim()), ...values }).result;
const close = (a, b) => Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));
const K_VALUES = Array.from({ length: 21 }, (_, i) => -5 + i * 0.5);

describe('the x + 1/x ladder', () => {
  it('matches xⁿ + 1/xⁿ worked out from x, for x + 1/x = k', () => {
    for (const k of K_VALUES) {
      const result = compute({ mode: 'plus', k, top: 8 });
      const { rungs, real, roots } = result.numbers;
      expect(rungs).toHaveLength(9);
      if (Math.abs(k) < 2) {
        // x is not real: k = 2 cos θ, and xⁿ + 1/xⁿ = 2 cos nθ.
        expect(real, `k ${k}`).toBe(false);
        const theta = Math.acos(k / 2);
        for (let n = 1; n <= 8; n++) expect(close(rungs[n], 2 * Math.cos(n * theta)), `k ${k}, n ${n}`).toBe(true);
        expect(result.plot.plots[0].markers).toEqual([]);
        continue;
      }
      // x² − kx + 1 = 0.
      const x = (k + Math.sqrt(k * k - 4)) / 2;
      expect(real).toBe(true);
      expect(close(roots[0] * roots[1], 1)).toBe(true);
      for (let n = 1; n <= 8; n++) {
        expect(close(rungs[n], x ** n + x ** -n), `k ${k}, n ${n}`).toBe(true);
        expect(close(rungs[n], (1 / x) ** n + (1 / x) ** -n)).toBe(true);
      }
      expect(close(rungs[2], k * k - 2)).toBe(true);
      expect(close(rungs[3], k ** 3 - 3 * k)).toBe(true);
      expect(close(result.numbers.otherSquare, (x - 1 / x) ** 2)).toBe(true);
    }
  });

  it('matches xⁿ ± 1/xⁿ worked out from x, for x − 1/x = k (any k)', () => {
    for (const k of K_VALUES) {
      const { rungs, real, roots } = compute({ mode: 'minus', k, top: 8 }).numbers;
      expect(real).toBe(true);
      // x² − kx − 1 = 0: both roots, x and −1/x, give x − 1/x = k.
      for (const x of [(k + Math.sqrt(k * k + 4)) / 2, (k - Math.sqrt(k * k + 4)) / 2]) {
        expect(close(x - 1 / x, k)).toBe(true);
        for (let n = 1; n <= 8; n++) {
          const expected = n % 2 === 0 ? x ** n + x ** -n : x ** n - x ** -n;
          expect(close(rungs[n], expected), `k ${k}, n ${n}`).toBe(true);
        }
      }
      expect(close(roots[0] * roots[1], -1)).toBe(true);
      expect(close(rungs[2], k * k + 2)).toBe(true);
      expect(close(rungs[3], k ** 3 + 3 * k)).toBe(true);
    }
  });

  it('draws the meeting points on the curve and the line, and one table row per rung', () => {
    for (const mode of ['plus', 'minus']) {
      const sign = mode === 'plus' ? 1 : -1;
      for (const k of K_VALUES) {
        for (const top of [3, 5, 8]) {
          const result = compute({ mode, k, top });
          const [graph, table] = result.plot.plots;
          expect(graph.kind).toBe('xy');
          expect(table.kind).toBe('table');
          expect(table.rows).toHaveLength(top);
          for (const [i, row] of table.rows.entries()) {
            expect(row.cells[1].text).toBeTruthy();
            expect(row.cells).toHaveLength(table.columns.length);
            if (i === 0) expect(row.label).toBe(mode === 'plus' ? 'x + 1/x' : 'x − 1/x');
          }
          for (const marker of graph.markers) {
            expect(close(marker.y, k)).toBe(true);
            expect(close(marker.x + sign / marker.x, k), `${mode} ${k}`).toBe(true);
          }
          const expectedMarkers = !result.numbers.real ? 0 : Math.abs(k) === 2 && mode === 'plus' ? 1 : 2;
          expect(graph.markers).toHaveLength(expectedMarkers);
          // The curve's points really lie on y = x ± 1/x.
          for (const series of graph.series.filter((s) => s.id !== 'level')) {
            for (const [x, y] of series.points) expect(close(y, x + sign / x)).toBe(true);
          }
        }
      }
    }
  });

  it('builds the table from earlier rungs, as the lesson does', () => {
    const rows = compute({ mode: 'plus', k: 3, top: 6 }).plot.plots[1].rows;
    expect(rows.map((row) => row.cells[1].text)).toEqual(['3', '7', '18', '47', '123', '322']);
    expect(rows[3].cells[0].text).toBe('p₂² − 2 = 7² − 2');
    expect(rows[4].cells[0].text).toBe('p₃ × p₂ − p₁ = 18 × 7 − 3');
    const minus = compute({ mode: 'minus', k: 3, top: 4 }).plot.plots[1].rows;
    expect(minus.map((row) => [row.label, row.cells[1].text])).toEqual([
      ['x − 1/x', '3'],
      ['x² + 1/x²', '11'],
      ['x³ − 1/x³', '36'],
      ['x⁴ + 1/x⁴', '119']
    ]);
    expect(minus[1].cells[0].text).toBe('p₁² + 2 = 3² + 2');
  });

  it('says when there is no real x, and when the line just touches', () => {
    expect(compute({ mode: 'plus', k: 1 }).insight).toMatch(/No real x/);
    expect(compute({ mode: 'plus', k: -1.5 }).readouts[0].value).toMatch(/no real x/);
    expect(compute({ mode: 'plus', k: 2 }).numbers.touching).toBe(true);
    expect(compute({ mode: 'plus', k: -2 }).numbers.roots).toEqual([-1, -1]);
    expect(compute({ mode: 'minus', k: 0 }).numbers.roots).toEqual([1, -1]);
  });
});
