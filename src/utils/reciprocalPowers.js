/**
 * Pure maths for x + 1/x and x − 1/x (the algebraic-identities Advanced unit):
 * the ladder of power sums, the "built from earlier rungs" routes, the real
 * values of x, surds and the three-variable cube identity. No DOM; tested
 * against brute force in tests/reciprocalPowers.test.js.
 *
 * sign = 1 means x + 1/x = k, and rung n is xⁿ + 1/xⁿ.
 * sign = −1 means x − 1/x = k, and rung n is xⁿ + (−1/x)ⁿ: xⁿ + 1/xⁿ for even n,
 * xⁿ − 1/xⁿ for odd n. Either way x and the other root y (1/x or −1/x) have
 * x + y = k and xy = sign, so every rung is a whole-number polynomial in k.
 */

/** sₙ = xⁿ + yⁿ for the two roots of t² − sum·t + product = 0, for n = 0..count: s₀ = 2, s₁ = sum, sₙ₊₁ = sum·sₙ − product·sₙ₋₁. */
export function powerSums(sum, product, count) {
  const s = [2, sum];
  for (let n = 2; n <= count; n++) s.push(sum * s[n - 1] - product * s[n - 2]);
  return s.slice(0, count + 1);
}

/** Rungs 0..count of the ladder for x + 1/x = k (sign 1) or x − 1/x = k (sign −1). */
export function reciprocalLadder(k, count, sign = 1) {
  return powerSums(k, sign, count);
}

/**
 * How rung n (n ≥ 2) is built from two earlier rungs, by the product rule
 * sₘ·sₙ = sₘ₊ₙ + Pⁿ·sₘ₋ₙ (P = xy = sign):
 *   n = 2m:     sₙ = sₘ² − 2Pᵐ
 *   n = 2m + 1: sₙ = sₘ₊₁·sₘ − Pᵐ·s₁
 * Returns { a, b, minus } with sₙ = s_a·s_b − minus·(2 when a = b, else s₁).
 */
export function rungRoute(n, sign = 1) {
  const m = Math.floor(n / 2);
  const p = sign ** m;
  return n % 2 === 0 ? { a: m, b: m, minus: p } : { a: m + 1, b: m, minus: p };
}

/** Rung n worked out from the earlier rungs by rungRoute (rungs[0..n−1] must be known). */
export function rungFromEarlier(rungs, n, sign = 1) {
  if (n === 0) return 2;
  if (n === 1) return rungs[1];
  const { a, b, minus } = rungRoute(n, sign);
  return rungs[a] * rungs[b] - minus * (a === b ? 2 : rungs[1]);
}

/** The ladder built only by rungRoute (squares and products), as the lesson and simulation show it. */
export function ladderByRoutes(k, count, sign = 1) {
  const rungs = [2, k];
  for (let n = 2; n <= count; n++) rungs.push(rungFromEarlier(rungs, n, sign));
  return rungs.slice(0, count + 1);
}

/**
 * The real x with x + 1/x = k (sign 1) or x − 1/x = k (sign −1), largest first,
 * each paired with its partner (1/x or −1/x). Empty when there is no real x
 * (x + 1/x = k with −2 < k < 2). For k = ±2 the two coincide.
 */
export function realRoots(k, sign = 1) {
  const disc = k * k - 4 * sign;
  if (disc < -1e-12) return [];
  const r = Math.sqrt(Math.max(0, disc));
  return [(k + r) / 2, (k - r) / 2];
}

/** xⁿ + (sign/x)ⁿ worked out directly from x (for checks). */
export function directPower(x, n, sign = 1) {
  return x ** n + (sign / x) ** n;
}

/** √n written as out√inside with inside square-free: 8 → { out: 2, inside: 2 }, 49 → { out: 7, inside: 1 }. */
export function simplifySurd(n) {
  let out = 1;
  let inside = n;
  for (let f = 2; f * f <= inside; f++) {
    while (inside % (f * f) === 0) {
      inside /= f * f;
      out *= f;
    }
  }
  return { out, inside };
}

/** √n as text: "√3", "2√6", "7". */
export function surdText(n) {
  const { out, inside } = simplifySurd(n);
  if (inside === 1) return String(out);
  return `${out === 1 ? '' : out}√${inside}`;
}

/** a³ + b³ + c³ − 3abc, directly. */
export function threeCubeGap(a, b, c) {
  return a ** 3 + b ** 3 + c ** 3 - 3 * a * b * c;
}

/** a³ + b³ + c³ − 3abc from s = a + b + c and q = ab + bc + ca: s(s² − 3q). */
export function threeCubeGapFromSums(s, q) {
  return s * (s * s - 3 * q);
}
