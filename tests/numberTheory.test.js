/**
 * The whole-number helpers behind the remainders, factorials, roots and
 * speed-maths generators and simulations, each held to a brute-force count
 * or a direct BigInt calculation.
 */

import { describe, it, expect } from 'vitest';

import {
  baseMethod,
  crossMultiply,
  crt,
  cubeRootByEnds,
  cubeRootDigit,
  digitalRoot,
  factorialBig,
  factorialPowerOf,
  intCbrt,
  intSqrt,
  isPerfectSquare,
  isPrime,
  legendre,
  legendreLayers,
  mod,
  modPow,
  powerCycle,
  powerFromCycle,
  primeFactors,
  smallestFactorialMultiple,
  squareRootByEnds,
  squareRootDigits,
  totient,
  trailingZeros,
  valuation
} from '../src/utils/numberTheory.js';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const bigPowMod = (a, k, n) => Number(BigInt(a) ** BigInt(k) % BigInt(n));

describe('remainders', () => {
  it('keeps remainders non-negative', () => {
    expect(mod(-2, 7)).toBe(5);
    expect(mod(14, 7)).toBe(0);
    expect(mod(-14, 7)).toBe(0);
  });

  it('raises to a power modulo n, matching BigInt', () => {
    for (const n of [2, 7, 10, 12, 100, 1000]) {
      for (const a of [2, 3, 7, 13, 99]) {
        for (const k of [1, 2, 5, 37, 100]) expect(modPow(a, k, n), `${a}^${k} mod ${n}`).toBe(bigPowMod(a, k, n));
      }
    }
    expect(modPow(5, 3, 1)).toBe(0);
    expect(modPow(7, 0, 10)).toBe(1);
  });

  it('finds the tail and the cycle of the remainders of powers', () => {
    expect(powerCycle(3, 7)).toEqual({ tail: [], cycle: [3, 2, 6, 4, 5, 1] });
    expect(powerCycle(2, 12)).toEqual({ tail: [2], cycle: [4, 8] });
    expect(powerCycle(7, 10)).toEqual({ tail: [], cycle: [7, 9, 3, 1] });
    expect(powerCycle(10, 9)).toEqual({ tail: [], cycle: [1] });
    expect(powerCycle(6, 6)).toEqual({ tail: [], cycle: [0] });
    for (const n of range(2, 20)) {
      for (const a of range(1, 25)) {
        for (const k of [1, 2, 3, 9, 25, 64]) expect(powerFromCycle(a, k, n), `${a}^${k} mod ${n}`).toBe(bigPowMod(a, k, n));
      }
    }
  });

  it('counts coprime numbers for the totient', () => {
    for (const n of range(1, 200)) {
      expect(totient(n), `${n}`).toBe(range(1, n).filter((k) => gcd(k, n) === 1).length);
    }
  });

  it('factorises and tests primes', () => {
    expect(primeFactors(360)).toEqual([[2, 3], [3, 2], [5, 1]]);
    expect(primeFactors(97)).toEqual([[97, 1]]);
    expect(range(1, 30).filter(isPrime)).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
    expect(valuation(96, 2)).toBe(5);
    expect(valuation(7, 2)).toBe(0);
  });

  it('solves two remainder conditions together, or reports none', () => {
    for (const [m1, m2] of [[5, 7], [4, 6], [9, 12], [8, 15]]) {
      for (const r1 of range(0, m1 - 1)) {
        for (const r2 of range(0, m2 - 1)) {
          const brute = range(0, m1 * m2).find((N) => N % m1 === r1 && N % m2 === r2);
          expect(crt(r1, m1, r2, m2), `${r1} mod ${m1}, ${r2} mod ${m2}`).toBe(brute ?? null);
        }
      }
    }
  });
});

describe('factorials', () => {
  it("counts a prime's power in n! (Legendre), matching the factors one by one", () => {
    for (const p of [2, 3, 5, 7, 11]) {
      for (const n of range(1, 120)) {
        const direct = range(1, n).reduce((sum, m) => sum + valuation(m, p), 0);
        expect(legendre(n, p), `${p} in ${n}!`).toBe(direct);
        expect(legendreLayers(n, p).reduce((a, b) => a + b, 0)).toBe(direct);
      }
    }
    expect(legendreLayers(100, 5)).toEqual([20, 4]);
  });

  it('counts trailing zeros from the digits of n! itself', () => {
    for (const n of range(1, 160)) {
      const digits = factorialBig(n).toString();
      expect(trailingZeros(n), `${n}!`).toBe(digits.length - digits.replace(/0+$/, '').length);
    }
  });

  it('finds the highest power of a composite in n! by dividing n! itself', () => {
    for (const m of [6, 10, 12, 15, 18, 20, 24, 36, 45, 72]) {
      for (const n of [5, 10, 17, 30, 44]) {
        let f = factorialBig(n);
        let k = 0;
        while (f % BigInt(m) === 0n) {
          f /= BigInt(m);
          k += 1;
        }
        expect(factorialPowerOf(n, m), `${m} in ${n}!`).toBe(k);
      }
    }
  });

  it('finds the smallest n whose factorial a number divides', () => {
    for (const m of [2, 7, 16, 25, 48, 125, 256, 360, 1000, 2 ** 10, 3 ** 6, 990]) {
      const brute = range(1, 100).find((n) => factorialBig(n) % BigInt(m) === 0n);
      expect(smallestFactorialMultiple(m), `${m}`).toBe(brute);
    }
  });
});

describe('roots and digit sums', () => {
  it('takes exact integer roots', () => {
    for (const r of range(0, 400)) {
      expect(intSqrt(r * r)).toBe(r);
      if (r) expect(intSqrt(r * r - 1)).toBe(r - 1);
      expect(intCbrt(r ** 3)).toBe(r);
      if (r) expect(intCbrt(r ** 3 - 1)).toBe(r - 1);
    }
    expect(isPerfectSquare(5329)).toBe(true);
    expect(isPerfectSquare(5330)).toBe(false);
  });

  it('finds every square root and cube root from the ends of the number', () => {
    for (const r of range(10, 999)) {
      expect(squareRootByEnds(r * r).root, `√${r * r}`).toBe(r);
      expect(squareRootByEnds(r * r).candidates).toContain(r);
    }
    for (const r of range(10, 99)) expect(cubeRootByEnds(r ** 3).root, `∛${r ** 3}`).toBe(r);
    expect(squareRootDigits(9)).toEqual([3, 7]);
    expect(squareRootDigits(5)).toEqual([5]);
    expect(squareRootDigits(2)).toEqual([]);
    expect([2, 3, 7, 8].map(cubeRootDigit)).toEqual([8, 7, 3, 2]);
  });

  it('reduces digit sums to the remainder on division by 9', () => {
    for (const n of range(1, 2000)) {
      let s = n;
      while (s > 9) s = String(s).split('').reduce((acc, d) => acc + Number(d), 0);
      expect(digitalRoot(n), `${n}`).toBe(s);
    }
    expect(digitalRoot(0)).toBe(0);
  });
});

describe('speed-maths methods', () => {
  it('multiplies near a base by deficits and surpluses', () => {
    for (const base of [10, 100, 1000]) {
      for (let x = Math.max(1, base - 15); x <= base + 15; x++) {
        for (let y = Math.max(1, base - 15); y <= base + 15; y++) expect(baseMethod(x, y, base).product).toBe(x * y);
      }
    }
    expect(baseMethod(97, 96, 100)).toMatchObject({ dx: -3, dy: -4, left: 93, right: 12 });
    expect(baseMethod(104, 97, 100)).toMatchObject({ left: 101, right: -12, product: 10088 });
  });

  it('multiplies crosswise with carries', () => {
    for (let x = 10; x <= 99; x++) for (let y = 10; y <= 99; y++) expect(crossMultiply(x, y).product).toBe(x * y);
    expect(crossMultiply(43, 27).columns).toEqual([8, 34, 21]);
  });
});
