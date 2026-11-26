/**
 * Grouped data: class boundaries and marks, cumulative frequencies, ogives,
 * and the mean, median and mode of a frequency table. Pure functions with no
 * DOM, shared by the grouped-data question templates and the simulation, and
 * tested on their own (tests/groupedStats.test.js).
 *
 * A grouping is described by its class boundaries `edges` (k + 1 numbers,
 * rising) and its frequencies `freqs` (k counts): class i runs from edges[i]
 * to edges[i + 1]. Inclusive classes such as 10–19, 20–29 are turned into
 * boundaries first with `toBoundaries`.
 */

export const sum = (list) => list.reduce((acc, v) => acc + v, 0);

/** Mid-points of the classes (the class marks). */
export const classMarks = (edges) => edges.slice(1).map((upper, i) => (edges[i] + upper) / 2);

/** Width of each class. */
export const classWidths = (edges) => edges.slice(1).map((upper, i) => upper - edges[i]);

/**
 * Inclusive classes [[10, 19], [20, 29], …] → boundaries [9.5, 19.5, 29.5, …].
 * Half the gap between one class's upper limit and the next class's lower
 * limit is taken off every lower limit and added to every upper limit.
 * Exclusive classes (no gap) come back unchanged.
 */
export function toBoundaries(classes) {
  if (!classes.length) return [];
  const gap = classes.length > 1 ? classes[1][0] - classes[0][1] : 0;
  for (let i = 1; i < classes.length; i++) {
    if (Math.abs(classes[i][0] - classes[i - 1][1] - gap) > 1e-9) throw new Error('classes have uneven gaps');
  }
  const half = gap / 2;
  return [classes[0][0] - half, ...classes.map(([, upper]) => upper + half)];
}

/** Running totals: how many values lie below each upper boundary. */
export function lessThanCumulative(freqs) {
  let running = 0;
  return freqs.map((f) => (running += f));
}

/** How many values lie at or above each lower boundary. */
export function moreThanCumulative(freqs) {
  let running = sum(freqs);
  return freqs.map((f) => {
    const here = running;
    running -= f;
    return here;
  });
}

/** Mean by the direct method: Σfx ÷ Σf with x the class marks. */
export function meanDirect(edges, freqs) {
  const marks = classMarks(edges);
  const n = sum(freqs);
  const fx = freqs.map((f, i) => f * marks[i]);
  return { marks, fx, sumFx: sum(fx), n, mean: sum(fx) / n };
}

/** Mean by the assumed-mean method: A + Σfd ÷ Σf with d = x − A. */
export function meanAssumed(edges, freqs, assumed) {
  const marks = classMarks(edges);
  const n = sum(freqs);
  const d = marks.map((x) => x - assumed);
  const fd = freqs.map((f, i) => f * d[i]);
  return { marks, d, fd, sumFd: sum(fd), n, mean: assumed + sum(fd) / n };
}

/** Mean by the step-deviation method: A + (Σfu ÷ Σf) × h with u = (x − A) ÷ h. */
export function meanStepDeviation(edges, freqs, assumed, h) {
  const marks = classMarks(edges);
  const n = sum(freqs);
  const u = marks.map((x) => (x - assumed) / h);
  const fu = freqs.map((f, i) => f * u[i]);
  return { marks, u, fu, sumFu: sum(fu), n, mean: assumed + (sum(fu) / n) * h };
}

/** Index of the median class: the first class whose cumulative frequency reaches n/2. */
export function medianClassIndex(freqs) {
  const half = sum(freqs) / 2;
  const cf = lessThanCumulative(freqs);
  return cf.findIndex((c) => c >= half);
}

/** Median of grouped data: l + ((n/2 − cf) ÷ f) × h, cf being the cumulative frequency before the median class. */
export function groupedMedian(edges, freqs) {
  const n = sum(freqs);
  const index = medianClassIndex(freqs);
  const cfBefore = index > 0 ? lessThanCumulative(freqs)[index - 1] : 0;
  const l = edges[index];
  const h = edges[index + 1] - edges[index];
  const f = freqs[index];
  return { index, l, h, f, cfBefore, n, median: l + ((n / 2 - cfBefore) / f) * h };
}

/** Index of the modal class (the highest frequency), or −1 when two classes tie for it. */
export function modalClassIndex(freqs) {
  const best = Math.max(...freqs);
  return freqs.filter((f) => f === best).length === 1 ? freqs.indexOf(best) : -1;
}

/**
 * Mode of grouped data: l + ((f₁ − f₀) ÷ (2f₁ − f₀ − f₂)) × h. A class beyond
 * either end counts as frequency 0. Returns null when the modal class is tied.
 */
export function groupedMode(edges, freqs) {
  const index = modalClassIndex(freqs);
  if (index < 0) return null;
  const f1 = freqs[index];
  const f0 = index > 0 ? freqs[index - 1] : 0;
  const f2 = index < freqs.length - 1 ? freqs[index + 1] : 0;
  const l = edges[index];
  const h = edges[index + 1] - edges[index];
  return { index, l, h, f0, f1, f2, mode: l + ((f1 - f0) / (2 * f1 - f0 - f2)) * h };
}

/** Points of the less-than ogive: (upper boundary, cumulative frequency), starting from (first lower boundary, 0). */
export function lessThanOgive(edges, freqs) {
  const cf = lessThanCumulative(freqs);
  return [[edges[0], 0], ...cf.map((c, i) => [edges[i + 1], c])];
}

/** Points of the more-than ogive: (lower boundary, how many at or above it), ending at (last upper boundary, 0). */
export function moreThanOgive(edges, freqs) {
  const cf = moreThanCumulative(freqs);
  return [...cf.map((c, i) => [edges[i], c]), [edges[edges.length - 1], 0]];
}

/** Read a count off an ogive at x, joining its points with straight lines (held level beyond the ends). */
export function ogiveCountAt(points, x) {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}

/**
 * Read the value at which a rising ogive first reaches `count`, joining its
 * points with straight lines. For the less-than ogive and count n/2 this is the
 * grouped median.
 */
export function ogiveValueAt(points, count) {
  if (count <= points[0][1]) return points[0][0];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (count <= y1 && y1 > y0) return x0 + ((count - y0) / (y1 - y0)) * (x1 - x0);
  }
  return points[points.length - 1][0];
}

/** Frequency per unit of the variable, f ÷ width: what a histogram's height shows when widths differ. */
export const frequencyDensity = (edges, freqs) => classWidths(edges).map((w, i) => freqs[i] / w);

/** Heights for a histogram with unequal widths, scaled to a standard width (the narrowest, unless given). */
export function adjustedFrequencies(edges, freqs, standardWidth = Math.min(...classWidths(edges))) {
  return classWidths(edges).map((w, i) => (freqs[i] * standardWidth) / w);
}

/** Count raw values into the classes [edges[i], edges[i + 1]); a value on a boundary goes up into the next class. */
export function binValues(values, edges) {
  const counts = new Array(edges.length - 1).fill(0);
  for (const value of values) {
    for (let i = 0; i < counts.length; i++) {
      if (value >= edges[i] && value < edges[i + 1]) {
        counts[i] += 1;
        break;
      }
    }
  }
  return counts;
}

/** The median of a plain list of values. */
export function rawMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** The mean of a plain list of values. */
export const rawMean = (values) => sum(values) / values.length;

/**
 * The single missing frequency (null in `freqs`) that gives the table the
 * stated mean. Deviations from the true mean balance out, Σf(x − x̄) = 0, so
 * the unknown is −Σ(known f(x − x̄)) ÷ (its mark − x̄).
 */
export function missingFrequencyForMean(edges, freqs, mean) {
  const marks = classMarks(edges);
  const at = freqs.indexOf(null);
  let balance = 0;
  freqs.forEach((f, i) => {
    if (i !== at) balance += f * (marks[i] - mean);
  });
  return -balance / (marks[at] - mean);
}
