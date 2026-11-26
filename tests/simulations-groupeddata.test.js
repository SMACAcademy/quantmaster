/**
 * The grouped-data simulation (src/simulations/groupedData.js): at every data
 * set, width and edge position, the classes, counts, grouped mean, median and
 * mode are recomputed here from the raw values by plain counting, and the
 * pictures are checked against them (bars as tall as the counts, the polygon
 * closed at both ends, the two ogives crossing at the median).
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';
import { GROUPED_DATA_SETS } from '../src/simulations/groupedData.js';

const sim = getSimulation('histogram-ogive');
const compute = (values) => run(sim, { ...initialValues(sim), ...values }).result;
const WIDTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20];
const SHIFTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Everything from the raw values, without the shared helpers. */
function independent(values, width, shift) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  // The first edge: the largest number of the form shift + j × width not above the minimum.
  let first = shift;
  while (first > sorted[0]) first -= width;
  while (first + width <= sorted[0]) first += width;
  const edges = [first];
  while (edges[edges.length - 1] <= sorted[n - 1]) edges.push(edges[edges.length - 1] + width);
  const freqs = edges.slice(0, -1).map((l) => sorted.filter((v) => v >= l && v < l + width).length);

  let fx = 0;
  freqs.forEach((f, i) => (fx += f * (edges[i] + width / 2)));
  const mean = fx / n;

  // Median: walk up the classes until n/2 values have been passed, then go the remaining share of the way.
  let passed = 0;
  let median = null;
  for (let i = 0; i < freqs.length && median === null; i++) {
    if (passed + freqs[i] >= n / 2) median = edges[i] + ((n / 2 - passed) / freqs[i]) * width;
    passed += freqs[i];
  }

  const top = Math.max(...freqs);
  const tops = freqs.map((f, i) => (f === top ? i : -1)).filter((i) => i >= 0);
  let mode = null;
  if (tops.length === 1) {
    const i = tops[0];
    const d1 = top - (freqs[i - 1] ?? 0);
    const d2 = top - (freqs[i + 1] ?? 0);
    mode = edges[i] + (d1 / (d1 + d2)) * width;
  }
  const trueMedian = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return { edges, freqs, mean, median, mode, trueMedian };
}

/** Height of a polyline at x (points in order of x). */
function heightAt(points, x) {
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (x >= x0 && x <= x1 && x1 > x0) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return null;
}

describe('histogram, polygon and ogive', () => {
  it('groups, averages and locates the median and mode exactly as counting the raw values does', () => {
    for (const data of Object.keys(GROUPED_DATA_SETS)) {
      const raw = GROUPED_DATA_SETS[data].values;
      expect(raw).toHaveLength(50);
      for (const width of WIDTHS) {
        for (const shift of SHIFTS) {
          const where = `${data} width ${width} shift ${shift}`;
          const n = compute({ data, width, shift }).numbers;
          const want = independent(raw, width, shift);
          expect(n.edges, where).toEqual(want.edges);
          expect(n.freqs, where).toEqual(want.freqs);
          expect(n.freqs.reduce((a, b) => a + b, 0), where).toBe(50);
          expect(n.mean, where).toBeCloseTo(want.mean, 9);
          expect(n.median, where).toBeCloseTo(want.median, 9);
          if (want.mode === null) expect(n.mode, where).toBeNull();
          else expect(n.mode, where).toBeCloseTo(want.mode, 9);
          expect(n.trueMedian, where).toBe(want.trueMedian);
          // The grouped median always lies in the class that holds the 25th value.
          expect(Math.abs(n.median - n.trueMedian), where).toBeLessThan(width);
        }
      }
    }
  });

  it('draws bars as tall as the counts, a closed polygon and ogives that cross at (median, n/2)', () => {
    for (const data of Object.keys(GROUPED_DATA_SETS)) {
      for (const width of WIDTHS) {
        for (const shift of [0, 3, 7]) {
          const where = `${data} width ${width} shift ${shift}`;
          const result = compute({ data, width, shift, view: 'both' });
          const { edges, freqs, median } = result.numbers;
          const [histogram, ogive] = result.plot.plots;
          const bars = histogram.series.find((s) => s.id === 'bars').points;
          freqs.forEach((f, i) => expect(heightAt(bars.slice(3 * i + 1, 3 * i + 3), (edges[i] + edges[i + 1]) / 2), where).toBe(f));
          const polygon = histogram.series.find((s) => s.id === 'polygon').points;
          expect(polygon[0], where).toEqual([edges[0] - width / 2, 0]);
          expect(polygon[polygon.length - 1], where).toEqual([edges[edges.length - 1] + width / 2, 0]);
          // The polygon's area equals the histogram's: n × width.
          let area = 0;
          for (let i = 1; i < polygon.length; i++) area += ((polygon[i][0] - polygon[i - 1][0]) * (polygon[i][1] + polygon[i - 1][1])) / 2;
          expect(area, where).toBeCloseTo(50 * width, 9);
          const less = ogive.series.find((s) => s.id === 'less').points;
          const more = ogive.series.find((s) => s.id === 'more').points;
          expect(heightAt(less, median), where).toBeCloseTo(25, 9);
          expect(heightAt(more, median), where).toBeCloseTo(25, 9);
        }
      }
    }
  });

  it('shows the point of the simulation: at width 10 the median hardly moves, the modal class jumps', () => {
    const runs = SHIFTS.map((shift) => compute({ data: 'marks', width: 10, shift }).numbers);
    const medians = runs.map((n) => n.median);
    const starts = runs.filter((n) => n.modalLower !== null).map((n) => n.modalLower);
    expect(Math.max(...medians) - Math.min(...medians)).toBeLessThan(2);
    expect(Math.max(...starts) - Math.min(...starts)).toBeGreaterThanOrEqual(15);
  });

  it('shows the commute times skewed right: mean above median above mode at the start width', () => {
    const n = compute({ data: 'commute', width: 10, shift: 0 }).numbers;
    expect(n.mean).toBeGreaterThan(n.median);
    expect(n.median).toBeGreaterThan(n.mode);
  });

  it('draws only the chosen picture', () => {
    expect(compute({ view: 'histogram' }).plot.kind).toBe('xy');
    expect(compute({ view: 'ogive' }).plot.series.map((s) => s.id)).toEqual(['less', 'more']);
    expect(compute({ view: 'both' }).plot.plots).toHaveLength(2);
  });
});
