/**
 * Polynomials: the helpers in src/utils/polynomials.js held to independent
 * checks (division multiplied back, roots substituted, Vieta against the roots
 * a polynomial was built from), and every hand-written polynomials question's
 * keyed answer worked out again from scratch.
 */

import { describe, it, expect } from 'vitest';

import {
  add,
  degree,
  derivative,
  divide,
  evaluate,
  evaluateByPowers,
  fromRoots,
  linearFactorText,
  multiply,
  polyText,
  realRoots,
  syntheticDivision,
  trim,
  vieta
} from '../src/utils/polynomials.js';
import { questionRepository } from '../src/repositories/contentRepository.js';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('values and arithmetic', () => {
  it('evaluates by Horner and by powers alike', () => {
    for (const coeffs of [[2, -5, 3, -7], [1, 0, 0, 0, -1], [-3, 4], [7]]) {
      for (const x of range(-4, 4)) expect(evaluate(coeffs, x)).toBe(evaluateByPowers(coeffs, x));
    }
    expect(evaluate([2, -5, 3, -7], 2)).toBe(-5);
  });

  it('adds and multiplies so that values add and multiply', () => {
    const p = [1, -3, 2];
    const q = [2, 5];
    for (const x of range(-3, 3)) {
      expect(evaluate(multiply(p, q), x)).toBe(evaluate(p, x) * evaluate(q, x));
      expect(evaluate(add(p, q), x)).toBe(evaluate(p, x) + evaluate(q, x));
    }
    expect(multiply(p, q)).toEqual([2, -1, -11, 10]);
    expect(degree([0, 0, 3, 1])).toBe(1);
    expect(trim([0, 0, 0])).toEqual([0]);
    expect(derivative([1, -6, 11, -6])).toEqual([3, -12, 11]);
  });

  it('builds a polynomial from its roots', () => {
    expect(fromRoots([1, 2, 3])).toEqual([1, -6, 11, -6]);
    expect(fromRoots([-2, 2], 3)).toEqual([3, 0, -12]);
  });

  it('writes polynomials and factors with true minus signs', () => {
    expect(polyText([1, -6, 11, -6])).toBe('x³ − 6x² + 11x − 6');
    expect(polyText([-2, 0, 1, 0])).toBe('−2x³ + x');
    expect(polyText([0])).toBe('0');
    expect(linearFactorText(3)).toBe('(x − 3)');
    expect(linearFactorText(-2)).toBe('(x + 2)');
    expect(linearFactorText(0)).toBe('x');
  });
});

describe('division', () => {
  it('synthetic division: divisor × quotient + remainder gives back the dividend', () => {
    for (const coeffs of [[2, -3, 0, 5], [1, 2, -5, 7], [3, 0, -4, 1, 9], [-1, 4, 0, 0, 2]]) {
      for (const a of range(-3, 3)) {
        const { quotient, remainder } = syntheticDivision(coeffs, a);
        expect(add(multiply([1, -a], quotient), [remainder])).toEqual(trim(coeffs));
        // The remainder theorem: the remainder is the value at a.
        expect(remainder).toBe(evaluateByPowers(coeffs, a));
      }
    }
    expect(syntheticDivision([2, -3, 0, 5], 2)).toMatchObject({ quotient: [2, 1, 2], remainder: 9 });
  });

  it('long division agrees with synthetic division and leaves a remainder of lower degree', () => {
    for (const coeffs of [[1, 2, -5, 7], [4, -2, 1, -5], [1, 0, 0, 0, 0, -1]]) {
      for (const divisor of [[1, -2], [2, -1], [1, 0, 1], [1, -4, 3]]) {
        const { quotient, remainder } = divide(coeffs, divisor);
        expect(degree(remainder)).toBeLessThan(degree(divisor));
        for (const x of range(-3, 3)) {
          expect(evaluate(quotient, x) * evaluate(divisor, x) + evaluate(remainder, x)).toBeCloseTo(evaluate(coeffs, x), 9);
        }
      }
    }
    expect(divide([1, 2, -5, 7], [1, -2]).quotient).toEqual(syntheticDivision([1, 2, -5, 7], 2).quotient);
  });
});

describe('roots', () => {
  it('finds every real root of polynomials built from known roots', () => {
    const cases = [[1, 2, 3], [-4, 0, 5], [-2, 2], [1, 1, 3], [0, 0, 0], [-3, -1, 2, 4], [0.5, -1.5, 2.5]];
    for (const roots of cases) {
      const found = realRoots(fromRoots(roots, 2));
      expect(found).toEqual([...new Set(roots)].sort((a, b) => a - b).map((r) => expect.closeTo(r, 6)));
      for (const r of found) expect(Math.abs(evaluate(fromRoots(roots, 2), r))).toBeLessThan(1e-6);
    }
    expect(realRoots([1, 0, 1])).toEqual([]);
    expect(realRoots([1, 0, 1, 0])).toEqual([0]);
    expect(realRoots([1, 0, -3, 1])).toHaveLength(3);
  });

  it('relates the roots to the coefficients (Vieta)', () => {
    for (const [r1, r2, r3] of [[1, 2, 3], [-2, 4, 5], [0, -1, 7], [3, 3, -2]]) {
      for (const lead of [1, 2, -3]) {
        const v = vieta(fromRoots([r1, r2, r3], lead));
        expect(v.sum).toBeCloseTo(r1 + r2 + r3, 9);
        expect(v.pairSum).toBeCloseTo(r1 * r2 + r2 * r3 + r3 * r1, 9);
        expect(v.product).toBeCloseTo(r1 * r2 * r3, 9);
      }
    }
    expect(vieta([2, -7, 3])).toEqual({ sum: 3.5, product: 1.5 });
  });
});

/* ------------------------- hand-written questions ------------------------- */

const keyed = (id) => {
  const q = questionRepository.getById(id);
  if (q.type === 'numerical_input') return q.answer.value;
  if (q.type === 'multiple_choice') return q.correctAnswer.map((c) => q.options.find((o) => o.id === c).text);
  if (q.type === 'match_following') return Object.fromEntries(q.pairs.map((p) => [p.left, p.right]));
  if (q.type === 'ordering') return q.steps.map((s) => s.text);
  return q.options.find((o) => o.id === q.correctAnswer[0]).text;
};
const sign = (v) => (v < 0 ? `−${-v}` : String(v));
/** An exact fraction n/d as the content writes it. */
const frac = (n, d) => {
  const g = (function gcd(a, b) {
    return b ? gcd(b, a % b) : Math.abs(a);
  })(n, d);
  return d / g === 1 ? sign(n / g) : `${n / g < 0 ? '−' : ''}${Math.abs(n / g)}/${d / g}`;
};
const TRUE = (ok) => (ok ? 'True' : 'False');
/** Remainder of p on division by (x − a)(x − b), as "rx + s", by long division. */
const quadRemainder = (p, a, b) => polyText(divide(p, fromRoots([a, b])).remainder);

const ANSWERS = {
  // Level 2
  'polynomials-q-001': () => sign(evaluateByPowers([2, -5, 3, -7], 2)),
  'polynomials-q-002': () => evaluateByPowers([1, -4, 2, 9], 3),
  'polynomials-q-003': () => TRUE(divide([1, 3, 0, -4], [1, 2]).remainder[0] === 0),
  'polynomials-q-004': () => `p(${frac(Math.round(realRoots([2, -3])[0] * 2), 2)})`,
  'polynomials-q-005': () => {
    const [a, b] = realRoots([2, -7, 3]);
    return frac(Math.round((a + b) * 2), 2);
  },
  // Level 3
  'polynomials-q-006': () => range(-20, 20).find((k) => evaluateByPowers([1, k, -5, 6], 2) === 0),
  'polynomials-q-007': () => String(range(-20, 20).find((a) => divide([3, a, -4, 1], [1, 1]).remainder[0] === 7)),
  'polynomials-q-008': () => divide([1, 2, -5, 7], [1, -2]).quotient.at(-1),
  'polynomials-q-009': () => {
    const { quotient, remainder } = divide([2, -3, 0, 5], [1, -2]);
    expect(quotient).toEqual([2, 1, 2]);
    expect(remainder).toEqual([9]);
    return keyed('polynomials-q-009');
  },
  'polynomials-q-010': () => String(Math.round(realRoots([1, -6, 11, -6]).reduce((s, r) => s + r * r, 0))),
  'polynomials-q-011': () => {
    const q = questionRepository.getById('polynomials-q-011');
    // (b) x³ + x has one real root; (e) (x − 1.2)(x − 1.8)(x + 5) is positive at 1 and 2 with two roots between.
    expect(realRoots([1, 0, 1, 0])).toHaveLength(1);
    const p = fromRoots([1.2, 1.8, -5]);
    expect(evaluate(p, 1) > 0 && evaluate(p, 2) > 0).toBe(true);
    return [q.options[0].text, q.options[2].text, q.options[3].text];
  },
  'polynomials-q-012': () => multiply([1, -3, 2], [2, 5])[1],
  // Level 4
  'polynomials-q-013': () => {
    const [, a, b] = fromRoots([2, -3, 12 / (2 * -3) /* the product of the roots is 12 */]);
    expect(evaluateByPowers([1, a, b, -12], 2)).toBe(0);
    expect(evaluateByPowers([1, a, b, -12], -3)).toBe(0);
    return a - b;
  },
  'polynomials-q-014': () => frac(Math.round(divide([4, -2, 1, -5], [2, -1]).remainder[0] * 8), 8),
  'polynomials-q-015': () => add(multiply([1, 0, 1], [2, -3]), [1, 4])[2],
  'polynomials-q-016': () => {
    const [l, b] = realRoots([1, -17, 60]);
    return `${2 * (l + b)} m`;
  },
  'polynomials-q-017': () => {
    const count = (p) => realRoots(p).length;
    const words = ['None', 'One (it touches)', 'Two', 'Three'];
    return {
      'x² + 4': words[count([1, 0, 4])],
      'x² − 6x + 9': words[count([1, -6, 9])],
      'x² − 5x + 6': words[count([1, -5, 6])],
      'x³ − 4x': words[count([1, 0, -4, 0])]
    };
  },
  // Level 7
  'polynomials-q-018': () => {
    // Any polynomial with p(1) = 5 and p(3) = 11 will do: 3x + 2 + (x − 1)(x − 3)(x² + 7).
    const p = add(multiply(fromRoots([1, 3]), [1, 0, 7]), [3, 2]);
    expect([evaluate(p, 1), evaluate(p, 3)]).toEqual([5, 11]);
    return quadRemainder(p, 1, 3);
  },
  'polynomials-q-019': () => {
    const [a, b] = realRoots([1, -5, 3]);
    const p = fromRoots([2 * a, 2 * b]).map((c) => Math.round(c));
    return `${polyText(p)} = 0`;
  },
  'polynomials-q-020': () => {
    const [a, b] = realRoots([2, -6, 1]);
    return Math.round((1 / a + 1 / b) * 1e6) / 1e6;
  },
  'polynomials-q-021': () => {
    const p = Array(102).fill(0);
    p[0] = 1;
    p[101] = 2;
    const rem = divide(p, [1, 0, -1]).remainder;
    return rem.at(-1);
  },
  'polynomials-q-022': () => TRUE(vieta([2, -4, 6, -8]).product === 4),
  'polynomials-q-023': () => {
    const v = vieta([1, -3, 2, -1]);
    return sign(v.pairSum / v.product);
  },
  'polynomials-q-024': () => {
    const p = [1, 0, -3, 1];
    const q = questionRepository.getById('polynomials-q-024');
    expect(q.table.rows[0].slice(1)).toEqual([-2, -1, 0, 1, 2].map((x) => sign(evaluate(p, x))));
    return String(realRoots(p).length);
  }
};

describe('hand-written polynomials questions', () => {
  const authored = questionRepository.getAll().filter((q) => q.topicId === 'polynomials');

  it('are all checked here, and there are at least 20', () => {
    expect(authored.length).toBeGreaterThanOrEqual(20);
    expect(authored.map((q) => q.id).sort()).toEqual(Object.keys(ANSWERS).sort());
  });

  it.each(Object.keys(ANSWERS))('%s has the keyed answer worked out independently', (id) => {
    expect(keyed(id)).toEqual(ANSWERS[id]());
  });
});
