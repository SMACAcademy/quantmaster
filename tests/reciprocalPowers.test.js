/**
 * The x + 1/x helpers behind the algebraic-identities Advanced unit
 * (src/utils/reciprocalPowers.js), held to brute force: exact binomial
 * expansion in BigInt, xⁿ ± 1/xⁿ worked out from x itself, cosines when x is
 * not real, and a plain search for square factors.
 */

import { describe, it, expect } from 'vitest';

import {
  directPower,
  ladderByRoutes,
  powerSums,
  realRoots,
  reciprocalLadder,
  rungFromEarlier,
  rungRoute,
  simplifySurd,
  surdText,
  threeCubeGap,
  threeCubeGapFromSums
} from '../src/utils/reciprocalPowers.js';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const close = (a, b) => Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));

/** xⁿ + yⁿ for x, y = (k ± √D)/2 by the binomial theorem, exactly: (2/2ⁿ) Σ over even j of C(n, j) k^(n−j) D^(j/2). */
function binomialPowerSum(k, D, n) {
  let total = 0n;
  let choose = 1n;
  for (let j = 0; j <= n; j++) {
    if (j % 2 === 0) total += choose * BigInt(k) ** BigInt(n - j) * BigInt(D) ** BigInt(j / 2);
    choose = (choose * BigInt(n - j)) / BigInt(j + 1);
  }
  const scaled = 2n * total;
  const divisor = 2n ** BigInt(n);
  expect(scaled % divisor).toBe(0n);
  return Number(scaled / divisor);
}

describe('the ladder of power sums', () => {
  it('matches the exact binomial expansion for whole-number k, both signs', () => {
    for (const sign of [1, -1]) {
      for (const k of range(-12, 12)) {
        const rungs = reciprocalLadder(k, 10, sign);
        expect(rungs[0]).toBe(2);
        // + 0 turns −0 into 0.
        for (const n of range(1, 10)) expect(rungs[n] + 0, `sign ${sign}, k ${k}, n ${n}`).toBe(binomialPowerSum(k, k * k - 4 * sign, n) + 0);
      }
    }
  });

  it('matches xⁿ + 1/xⁿ (or xⁿ − 1/xⁿ for odd n) worked out from x itself', () => {
    for (const sign of [1, -1]) {
      for (let k = -8; k <= 8; k += 0.25) {
        const roots = realRoots(k, sign);
        if (sign === 1 && Math.abs(k) < 2) {
          expect(roots).toEqual([]);
          continue;
        }
        const rungs = reciprocalLadder(k, 8, sign);
        for (const x of roots) {
          // Each root really gives back k.
          expect(close(x + sign / x, k), `root ${x} for k ${k}`).toBe(true);
          for (const n of range(1, 8)) {
            const expected = sign === 1 || n % 2 === 0 ? x ** n + x ** -n : x ** n - x ** -n;
            expect(close(rungs[n], expected), `sign ${sign}, k ${k}, n ${n}`).toBe(true);
            expect(close(directPower(x, n, sign), expected)).toBe(true);
          }
        }
      }
    }
  });

  it('gives 2 cos nθ when x + 1/x = 2 cos θ lies between −2 and 2 (x is then not real)', () => {
    for (let theta = 0.1; theta < Math.PI; theta += 0.17) {
      const rungs = reciprocalLadder(2 * Math.cos(theta), 9);
      for (const n of range(0, 9)) expect(close(rungs[n], 2 * Math.cos(n * theta))).toBe(true);
    }
  });

  it('is the same ladder when each rung is built only from squares and products of earlier rungs', () => {
    for (const sign of [1, -1]) {
      for (let k = -6; k <= 6; k += 0.5) {
        const recurrence = reciprocalLadder(k, 12, sign);
        const routes = ladderByRoutes(k, 12, sign);
        for (const n of range(0, 12)) expect(close(routes[n], recurrence[n]), `sign ${sign}, k ${k}, n ${n}`).toBe(true);
      }
    }
  });

  it('uses the routes the lesson teaches', () => {
    // x + 1/x: p₄ = p₂² − 2, p₅ = p₃p₂ − p₁, p₆ = p₃² − 2.
    expect(rungRoute(4)).toEqual({ a: 2, b: 2, minus: 1 });
    expect(rungRoute(5)).toEqual({ a: 3, b: 2, minus: 1 });
    // x − 1/x: s₂ = s₁² + 2, s₃ = s₂s₁ + s₁, s₄ = s₂² − 2.
    expect(rungRoute(2, -1)).toEqual({ a: 1, b: 1, minus: -1 });
    expect(rungRoute(3, -1)).toEqual({ a: 2, b: 1, minus: -1 });
    expect(rungRoute(4, -1)).toEqual({ a: 2, b: 2, minus: 1 });
    const three = reciprocalLadder(3, 6);
    expect(three).toEqual([2, 3, 7, 18, 47, 123, 322]);
    expect(rungFromEarlier(three, 5)).toBe(7 * 18 - 3);
    expect(reciprocalLadder(3, 4, -1)).toEqual([2, 3, 11, 36, 119]);
    expect(powerSums(5, 6, 3)).toEqual([2, 5, 13, 35]); // 2 and 3: 2² + 3² = 13, 2³ + 3³ = 35
  });

  it('finds equal roots at k = ±2 and none in between', () => {
    expect(realRoots(2)).toEqual([1, 1]);
    expect(realRoots(-2)).toEqual([-1, -1]);
    expect(realRoots(1.5)).toEqual([]);
    expect(realRoots(0, -1)).toEqual([1, -1]);
  });
});

describe('surds', () => {
  it('pulls out every square factor, and only square factors', () => {
    for (const n of range(1, 2000)) {
      const { out, inside } = simplifySurd(n);
      expect(out * out * inside).toBe(n);
      for (let f = 2; f * f <= inside; f++) expect(inside % (f * f), `${n}`).not.toBe(0);
    }
    expect([3, 8, 24, 49, 80].map(surdText)).toEqual(['√3', '2√2', '2√6', '7', '4√5']);
  });
});

describe('a³ + b³ + c³ − 3abc', () => {
  it('equals s(s² − 3q) and ½(a + b + c)[(a − b)² + (b − c)² + (c − a)²]', () => {
    for (const a of range(-6, 6)) {
      for (const b of range(-6, 6)) {
        for (const c of range(-6, 6)) {
          const direct = threeCubeGap(a, b, c) + 0;
          expect(threeCubeGapFromSums(a + b + c, a * b + b * c + c * a) + 0).toBe(direct);
          expect(((a + b + c) * ((a - b) ** 2 + (b - c) ** 2 + (c - a) ** 2)) / 2 + 0).toBe(direct);
          if (a + b + c === 0) expect(a ** 3 + b ** 3 + c ** 3).toBe(3 * a * b * c + 0);
        }
      }
    }
  });
});
