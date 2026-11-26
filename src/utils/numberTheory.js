/**
 * Whole-number maths for remainders, factorials, roots and speed-maths methods.
 * Shared by the question generators (src/generators/templates) and the
 * simulations (src/simulations/numberMethods.js); DOM-free and unit-tested in
 * tests/numberTheory.test.js against brute force.
 *
 * Powers and factorials go through BigInt, so nothing overflows silently.
 */

/** The remainder of a on division by n, always in 0 … n − 1 (also for negative a). */
export function mod(a, n) {
  return ((a % n) + n) % n;
}

/** a^k mod n, by repeated squaring in BigInt. */
export function modPow(a, k, n) {
  if (n === 1) return 0;
  let base = BigInt(mod(a, n));
  let exp = BigInt(k);
  const m = BigInt(n);
  let result = 1n;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % m;
    base = (base * base) % m;
    exp >>= 1n;
  }
  return Number(result);
}

/**
 * Remainders of a¹, a², a³, … on division by n: the part before the
 * repetition starts (`tail`) and the part that repeats for ever (`cycle`).
 * 3 mod 7 → tail [], cycle [3, 2, 6, 4, 5, 1]; 2 mod 12 → tail [2], cycle [4, 8].
 */
export function powerCycle(a, n) {
  const seen = new Map();
  const sequence = [];
  let r = mod(a, n);
  for (let k = 1; !seen.has(r); k++) {
    seen.set(r, k);
    sequence.push(r);
    r = mod(r * a, n);
  }
  const start = seen.get(r) - 1;
  return { tail: sequence.slice(0, start), cycle: sequence.slice(start) };
}

/** a^k mod n read off the cycle (k ≥ 1). */
export function powerFromCycle(a, k, n) {
  const { tail, cycle } = powerCycle(a, n);
  if (k <= tail.length) return tail[k - 1];
  return cycle[(k - tail.length - 1) % cycle.length];
}

export function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

export function isPrime(n) {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/** Prime factorisation as [[prime, power], …] in increasing order. */
export function primeFactors(n) {
  const out = [];
  let m = n;
  for (let p = 2; p * p <= m; p++) {
    let k = 0;
    while (m % p === 0) {
      m /= p;
      k += 1;
    }
    if (k) out.push([p, k]);
  }
  if (m > 1) out.push([m, 1]);
  return out;
}

/** Euler's totient: how many of 1 … n share no factor with n. */
export function totient(n) {
  return primeFactors(n).reduce((acc, [p]) => (acc / p) * (p - 1), n);
}

/** The exponent of the prime p in n! (Legendre): ⌊n/p⌋ + ⌊n/p²⌋ + … */
export function legendre(n, p) {
  let total = 0;
  for (let q = p; q <= n; q *= p) total += Math.floor(n / q);
  return total;
}

/** The layers of Legendre's sum: [⌊n/p⌋, ⌊n/p²⌋, …] while non-zero. */
export function legendreLayers(n, p) {
  const layers = [];
  for (let q = p; q <= n; q *= p) layers.push(Math.floor(n / q));
  return layers;
}

/** Zeros at the end of n!. */
export const trailingZeros = (n) => legendre(n, 5);

/** The highest power of m (m ≥ 2) that divides n!. */
export function factorialPowerOf(n, m) {
  return Math.min(...primeFactors(m).map(([p, a]) => Math.floor(legendre(n, p) / a)));
}

/** The smallest n for which m divides n!. */
export function smallestFactorialMultiple(m) {
  let best = 1;
  for (const [p, a] of primeFactors(m)) {
    let n = p;
    while (legendre(n, p) < a) n += p;
    best = Math.max(best, n);
  }
  return best;
}

/** How often p divides m (the p-adic valuation), for m ≥ 1. */
export function valuation(m, p) {
  let k = 0;
  let x = m;
  while (x % p === 0) {
    x /= p;
    k += 1;
  }
  return k;
}

export function factorialBig(n) {
  let result = 1n;
  for (let i = 2n; i <= BigInt(n); i++) result *= i;
  return result;
}

/** Repeated digit sum (0 only for 0): the remainder on division by 9, with 9 for multiples of 9. */
export function digitalRoot(n) {
  const a = Math.abs(n);
  return a === 0 ? 0 : 1 + ((a - 1) % 9);
}

/** The whole-number square root (floor), exact for any safe integer. */
export function intSqrt(n) {
  let r = Math.floor(Math.sqrt(n));
  while (r * r > n) r -= 1;
  while ((r + 1) * (r + 1) <= n) r += 1;
  return r;
}

/** The whole-number cube root (floor). */
export function intCbrt(n) {
  let r = Math.floor(Math.cbrt(n));
  while (r * r * r > n) r -= 1;
  while ((r + 1) ** 3 <= n) r += 1;
  return r;
}

export const isPerfectSquare = (n) => n >= 0 && intSqrt(n) ** 2 === n;

/** Digits whose square ends in `unit` (the possible last digits of a square root). */
export function squareRootDigits(unit) {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => (d * d) % 10 === unit);
}

/** The digit whose cube ends in `unit` (always exactly one). */
export function cubeRootDigit(unit) {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].find((d) => (d * d * d) % 10 === unit);
}

/**
 * The square root of a perfect square, as found by hand: candidates from the
 * unit digit, the tens part from the number left after dropping the last two
 * digits, and the midpoint (10k + 5)² to choose between two candidates.
 */
export function squareRootByEnds(N) {
  const unit = N % 10;
  const lead = Math.floor(N / 100);
  const k = intSqrt(lead);
  const digits = squareRootDigits(unit);
  const candidates = digits.map((d) => 10 * k + d);
  const mid = (10 * k + 5) ** 2;
  let root = candidates[0];
  if (candidates.length === 2) root = N >= mid ? candidates[1] : candidates[0];
  return { unit, lead, k, digits, candidates, mid, root };
}

/** The cube root of a perfect cube by hand: unit digit, then the part left after dropping three digits. */
export function cubeRootByEnds(N) {
  const unit = N % 10;
  const lead = Math.floor(N / 1000);
  const k = intCbrt(lead);
  const d = cubeRootDigit(unit);
  return { unit, lead, k, digit: d, root: 10 * k + d };
}

/**
 * The base method (Nikhilam) for x × y near a base (10, 100, 1000):
 * left = x + (y − base), right = (x − base)(y − base), product = left × base + right.
 */
export function baseMethod(x, y, base) {
  const dx = x - base;
  const dy = y - base;
  const left = x + dy;
  const right = dx * dy;
  return { dx, dy, left, right, product: left * base + right };
}

/**
 * Cross multiplication (vertically and crosswise) of two two-digit numbers:
 * columns [a·c, a·d + b·c, b·d] before carrying, and the product after.
 */
export function crossMultiply(x, y) {
  const [a, b] = [Math.floor(x / 10), x % 10];
  const [c, d] = [Math.floor(y / 10), y % 10];
  const columns = [a * c, a * d + b * c, b * d];
  const units = columns[2] % 10;
  const carry1 = Math.floor(columns[2] / 10);
  const tensTotal = columns[1] + carry1;
  const tens = tensTotal % 10;
  const carry2 = Math.floor(tensTotal / 10);
  const lead = columns[0] + carry2;
  return { columns, product: lead * 100 + tens * 10 + units };
}

/**
 * The smallest non-negative N with N ≡ r1 (mod m1) and N ≡ r2 (mod m2), or
 * null when there is none. Works for divisors with a common factor too.
 */
export function crt(r1, m1, r2, m2) {
  const step = m1 / gcd(m1, m2);
  const L = step * m2;
  for (let N = mod(r1, m1); N < L; N += m1) if (mod(N, m2) === mod(r2, m2)) return N;
  return null;
}
