/**
 * Shared building blocks for question templates: a seeded RNG, exact-arithmetic
 * helpers and number formatting that matches the authored content style.
 */

/** Mulberry32 — small, fast, deterministic. Same seed, same sequence. */
export function createRng(seed) {
  let state = seed >>> 0 || 0x9e3779b9;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    chance(probability) {
      return next() < probability;
    },
    shuffle(list) {
      const arr = [...list];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  };
}

export function randomSeed() {
  return Math.floor(Math.random() * 2147483647);
}

/* ------------------------------ exact maths ------------------------------ */

export const EPSILON = 1e-9;

export function nearlyEqual(a, b, tolerance = EPSILON) {
  return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
}

export function isInteger(value) {
  return Number.isFinite(value) && nearlyEqual(value, Math.round(value));
}

/** True when `value` needs at most `decimals` decimal places. */
export function hasAtMostDecimals(value, decimals) {
  if (!Number.isFinite(value)) return false;
  const scaled = value * 10 ** decimals;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

export function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

export function reduceRatio(...terms) {
  const divisor = terms.reduce((acc, term) => gcd(acc, term));
  return terms.map((term) => term / divisor);
}

export function reduceFraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  return [numerator / divisor, denominator / divisor];
}

export function factorial(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

export function nPr(n, r) {
  let result = 1;
  for (let i = 0; i < r; i++) result *= n - i;
  return result;
}

export function nCr(n, r) {
  if (r < 0 || r > n) return 0;
  return nPr(n, r) / factorial(r);
}

/* ------------------------------ formatting ------------------------------ */

const numberFormatters = new Map();

export function fmt(value, maxDecimals = 2) {
  if (!numberFormatters.has(maxDecimals)) {
    numberFormatters.set(
      maxDecimals,
      new Intl.NumberFormat('en-IN', { maximumFractionDigits: maxDecimals })
    );
  }
  return numberFormatters.get(maxDecimals).format(value);
}

export const format = {
  number: (value) => fmt(value),
  // Paise always show two places (₹556.50, not ₹556.5); whole rupees show none.
  rupees: (value) => {
    const paise = Math.round(value * 100);
    if (paise % 100 === 0) return `₹${fmt(paise / 100)}`;
    return `₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100)}`;
  },
  percent: (value) => `${fmt(value)}%`,
  days: (value) => `${fmt(value)} day${nearlyEqual(value, 1) ? '' : 's'}`,
  years: (value) => `${fmt(value)} year${nearlyEqual(value, 1) ? '' : 's'}`,
  hours: (value) => `${fmt(value)} hour${nearlyEqual(value, 1) ? '' : 's'}`,
  seconds: (value) => `${fmt(value)} seconds`,
  litres: (value) => `${fmt(value)} litres`,
  kmh: (value) => `${fmt(value)} km/hr`,
  ms: (value) => `${fmt(value)} m/s`,
  kg: (value) => `${fmt(value)} kg`,
  text: (value) => String(value)
};

export function ratioText(terms) {
  return terms.join(' : ');
}

export function fractionText([numerator, denominator]) {
  return denominator === 1 ? String(numerator) : `${numerator}/${denominator}`;
}
