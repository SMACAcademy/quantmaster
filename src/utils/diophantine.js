/**
 * Whole-number solutions of linear equations, for the integer-solutions topic:
 * ax + by = c in positive or non-negative integers, the step between
 * consecutive solutions, and three-variable sums.
 *
 * The counts come from the general solution x = x₀ + (b/g)t, y = y₀ − (a/g)t;
 * tests/diophantine.test.js holds them to a brute-force search.
 */

export function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

/** Extended Euclid: [g, x, y] with ax + by = g = gcd(a, b). */
export function egcd(a, b) {
  if (b === 0) return [Math.abs(a), Math.sign(a) || 1, 0];
  const [g, x, y] = egcd(b, a % b);
  return [g, y, x - Math.floor(a / b) * y];
}

/**
 * The general solution of ax + by = c (a, b > 0): one solution (x₀, y₀) and the
 * steps, x = x₀ + stepX·t, y = y₀ − stepY·t. Null when gcd(a, b) does not divide c.
 */
export function generalSolution(a, b, c) {
  const g = gcd(a, b);
  if (c % g !== 0) return null;
  const [, u, v] = egcd(a, b);
  const k = c / g;
  return { g, x0: u * k, y0: v * k, stepX: b / g, stepY: a / g };
}

/**
 * Every solution of ax + by = c with x, y ≥ `least` (1 for positive, 0 for
 * non-negative), sorted by x. a, b > 0.
 */
export function solutions(a, b, c, least = 1) {
  const general = generalSolution(a, b, c);
  if (!general) return [];
  const { x0, y0, stepX, stepY } = general;
  // x0 + stepX t ≥ least  and  y0 − stepY t ≥ least
  const tMin = Math.ceil((least - x0) / stepX);
  const tMax = Math.floor((y0 - least) / stepY);
  const out = [];
  // + 0 turns a −0 (from 0 × a negative step) into 0.
  for (let t = tMin; t <= tMax; t++) out.push([x0 + stepX * t + 0, y0 - stepY * t + 0]);
  return out;
}

/** How many solutions ax + by = c has with x, y ≥ least, from the range of t. */
export function countSolutions(a, b, c, least = 1) {
  const general = generalSolution(a, b, c);
  if (!general) return 0;
  const { x0, y0, stepX, stepY } = general;
  const tMin = Math.ceil((least - x0) / stepX);
  const tMax = Math.floor((y0 - least) / stepY);
  return Math.max(0, tMax - tMin + 1);
}

/** Brute force: try every x. A second, independent count. */
export function bruteSolutions(a, b, c, least = 1) {
  const out = [];
  for (let x = least; a * x <= c - b * least; x++) {
    const rest = c - a * x;
    if (rest % b === 0 && rest / b >= least) out.push([x, rest / b]);
  }
  return out;
}

/** The smallest x ≥ least in a solution (and its y), or null. */
export function smallestX(a, b, c, least = 1) {
  const list = solutions(a, b, c, least);
  return list.length ? list[0] : null;
}

/**
 * Solutions in whole numbers ≥ least of a·x + b·y + c·z = n, by fixing z and
 * counting the two-variable equation each time.
 */
export function countThree(a, b, c, n, least = 1) {
  let total = 0;
  for (let z = least; c * z <= n - (a + b) * least; z++) total += countSolutions(a, b, n - c * z, least);
  return total;
}

/** x + y + z = n in non-negative integers: C(n + 2, 2); in positive integers: C(n − 1, 2). */
export function starsAndBars(n, parts, positive = false) {
  const top = positive ? n - 1 : n + parts - 1;
  const r = parts - 1;
  if (top < r || top < 0) return 0;
  let result = 1;
  for (let i = 0; i < r; i++) result = (result * (top - i)) / (i + 1);
  return Math.round(result);
}
