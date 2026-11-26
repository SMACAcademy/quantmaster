/**
 * Modulus (absolute value) for the modulus topic: distances on the number
 * line, sums of distances and their flat-bottomed minimum, and the solutions
 * of f(x) = c for any piecewise-linear f built from moduli.
 *
 * Everything works on exact breakpoints, so a solution set that is a whole
 * interval (|x − 2| + |x − 6| = 4) is reported as an interval, not as a
 * scatter of points. tests/modulus.test.js holds it to a brute-force scan.
 */

const EPS = 1e-9;
const clean = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : Number(v.toFixed(9)));

/** |x − a|: the distance from x to a. */
export const dist = (x, a) => Math.abs(x - a);

/** Σ |x − p| over the points: the total distance from x to every point. */
export const absSum = (x, points) => points.reduce((sum, p) => sum + Math.abs(x - p), 0);

/**
 * The least value of Σ |x − p| and where it is reached. With an odd number of
 * points the minimum sits at the median alone; with an even number it is flat
 * between the two middle points.
 */
export function minAbsSum(points) {
  const sorted = [...points].sort((a, b) => a - b);
  const n = sorted.length;
  const from = sorted[Math.floor((n - 1) / 2)];
  const to = sorted[Math.floor(n / 2)];
  return { min: absSum(from, sorted), from, to };
}

/**
 * Every x with f(x) = c, for a continuous f that is linear between the given
 * breakpoints (and on the two rays outside them). Returns
 * { points: [x…], intervals: [[from, to]…] } with points sorted and not
 * repeated; an interval that runs off to infinity uses ±Infinity.
 */
export function solvePiecewise(f, breakpoints, c) {
  const xs = [...new Set(breakpoints.map(clean))].sort((a, b) => a - b);
  const points = [];
  const intervals = [];
  const addPoint = (x) => {
    const v = clean(x);
    if (!points.some((p) => Math.abs(p - v) < 1e-7)) points.push(v);
  };
  const g = (x) => f(x) - c;
  // Each piece: [left, right] with either end possibly infinite.
  const pieces = [];
  if (!xs.length) pieces.push([-Infinity, Infinity]);
  else {
    pieces.push([-Infinity, xs[0]]);
    for (let i = 0; i + 1 < xs.length; i++) pieces.push([xs[i], xs[i + 1]]);
    pieces.push([xs[xs.length - 1], Infinity]);
  }
  for (const [lo, hi] of pieces) {
    // Two sample points inside the piece fix the line on it.
    const p = Number.isFinite(lo) && Number.isFinite(hi) ? lo : Number.isFinite(lo) ? lo : Number.isFinite(hi) ? hi - 1 : 0;
    const q = Number.isFinite(lo) && Number.isFinite(hi) ? hi : p + 1;
    const gp = g(p);
    const slope = (g(q) - gp) / (q - p);
    if (Math.abs(slope) < EPS) {
      if (Math.abs(gp) < 1e-7) intervals.push([lo, hi]);
      continue;
    }
    const root = p - gp / slope;
    if (root >= lo - 1e-9 && root <= hi + 1e-9) addPoint(root);
  }
  // Merge touching intervals and drop points that lie inside one.
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const iv of intervals) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1] + 1e-9) last[1] = Math.max(last[1], iv[1]);
    else merged.push([...iv]);
  }
  const lonePoints = points.filter((x) => !merged.some(([lo, hi]) => x >= lo - 1e-9 && x <= hi + 1e-9)).sort((a, b) => a - b);
  return { points: lonePoints, intervals: merged };
}

/** How many solutions a solvePiecewise result holds: a number, or Infinity. */
export const solutionCount = ({ points, intervals }) => (intervals.length ? Infinity : points.length);

/** Solutions of |x − a| = b: none, one (b = 0) or two. */
export function solveAbsEquals(a, b) {
  if (b < 0) return [];
  if (b === 0) return [a];
  return [a - b, a + b];
}

/**
 * Solutions of |x − a| < b (or ≤ b with `orEqual`): the interval
 * (a − b, a + b), or null when it is empty.
 */
export function absLessInterval(a, b, orEqual = false) {
  if (b < 0 || (b === 0 && !orEqual)) return null;
  return { from: a - b, to: a + b, closed: orEqual };
}

/** How many integers satisfy |x − a| < b (strict) or ≤ b, for whole a and b. */
export function integersWithin(a, b, orEqual = false) {
  if (b < 0) return 0;
  return orEqual ? 2 * Math.floor(b) + 1 : Math.max(0, 2 * Math.ceil(b) - 1);
}

/** Integer points (x, y) with |x| + |y| = k: 4k for k ≥ 1, one for k = 0. */
export const diamondPoints = (k) => (k === 0 ? 1 : 4 * k);

/** Integer points with |x| + |y| ≤ k: 2k² + 2k + 1. */
export const diamondPointsInside = (k) => 2 * k * k + 2 * k + 1;

/** Area enclosed by |x| + |y| = k (a square with diagonals 2k): 2k². */
export const diamondArea = (k) => 2 * k * k;

/** Unicode minus and a modulus written the way the content writes it: |x − 3|, |x + 2|, |x|. */
export function absText(a, variable = 'x') {
  if (a === 0) return `|${variable}|`;
  return a > 0 ? `|${variable} − ${a}|` : `|${variable} + ${-a}|`;
}

/** A signed number with a true minus sign. */
export const signed = (v) => (v < 0 ? `−${-v}` : String(v));
