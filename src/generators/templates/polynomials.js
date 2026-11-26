/**
 * Polynomials: values, the remainder and factor theorems, missing
 * coefficients, division, roots and coefficients, real roots from a table of
 * values, remainders on a quadratic divisor and equations with changed roots.
 *
 * Each answer is worked one way (synthetic division, Vieta, a formula) and
 * checked another (term-by-term values, long division, the roots themselves),
 * using src/utils/polynomials.js.
 */

import { fmt, gcd, hasAtMostDecimals, nearlyEqual } from '../core.js';
import {
  add,
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
  vieta
} from '../../utils/polynomials.js';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const pw = (k) => String(k).split('').map((d) => SUP[d]).join('');
/** A number with a true minus sign. */
const num = (v) => (v < 0 ? `−${-v}` : String(v));
/** A number in brackets when negative, for substitution steps: 2 × (−3). */
const br = (v) => (v < 0 ? `(−${-v})` : String(v));
/** n/d in lowest terms with a true minus sign; whole numbers stay whole. */
function fracText(n, d) {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  const a = n / g;
  const b = d / g;
  if (b === 1) return num(a);
  return `${a < 0 ? '−' : ''}${Math.abs(a)}/${b}`;
}
/** Terms such as [[4, 'k'], [−6, '']] written as "4k − 6": unit coefficients dropped, zeros left out. */
function expr(terms) {
  const parts = terms.filter(([c]) => c !== 0);
  if (!parts.length) return '0';
  return parts
    .map(([c, sym], i) => {
      const mag = Math.abs(c) === 1 && sym ? sym : `${Math.abs(c)}${sym}`;
      return i === 0 ? `${c < 0 ? '−' : ''}${mag}` : `${c < 0 ? '−' : '+'} ${mag}`;
    })
    .join(' ');
}
/** A monomial in brackets when negative: (−7x). */
const mono = (coeffs) => {
  const t = polyText(coeffs);
  return t.startsWith('−') ? `(${t})` : t;
};
const eq = (coeffs) => `${polyText(coeffs)} = 0`;
/** A divisor x − a written as the content writes it: "x − 3", "x + 2". */
const divisorText = (a) => linearFactorText(a).replace(/^\(|\)$/g, '');
const nonZero = (rng, lo, hi) => {
  let v = 0;
  while (v === 0) v = rng.int(lo, hi);
  return v;
};
/** Read back "(x − 2)" / "(x + 3)" / "x" as the root 2 / −3 / 0. */
function rootOfFactor(text) {
  if (text === 'x') return 0;
  const m = /^\(x ([−+]) (\d+)\)$/.exec(text);
  if (!m) return null;
  return m[1] === '−' ? Number(m[2]) : -Number(m[2]);
}
/** The four coefficients of a cubic from its values at −2, −1, 0, 1, 2 (no multiplication of polynomials involved). */
function cubicFromValues(f) {
  const c0 = f(0);
  const c2 = (f(1) + f(-1)) / 2 - c0;
  const odd1 = (f(1) - f(-1)) / 2; // c1 + c3
  const odd2 = (f(2) - f(-2)) / 4; // c1 + 4c3
  const c3 = (odd2 - odd1) / 3;
  const c1 = odd1 - c3;
  return [c3, c2, c1, c0];
}
const pickRoots = (rng, count, lo, hi, avoidZero = true) => {
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < 100) {
    const r = rng.int(lo, hi);
    if ((avoidZero && r === 0) || out.includes(r)) continue;
    out.push(r);
  }
  return out.length === count ? out : null;
};

const remainderAtFraction = ({ m, k, coeffs }) => {
  const [c3, c2, c1, c0] = coeffs;
  return fracText(c3 * k ** 3 + c2 * k ** 2 * m + c1 * k * m ** 2 + c0 * m ** 3, m ** 3);
};
const valueAtPlusMinusOne = ({ n1, n2, c, a }) => {
  const s = (n) => (a === 1 || n % 2 === 0 ? 1 : -1);
  return c[0] * s(n1) + c[1] * s(n2) + c[2] * s(1) + c[3];
};
const quadSymmetric = ({ b, c, ask }) => {
  const s = -b;
  const p = c;
  return { 'α² + β²': s * s - 2 * p, '(α − β)²': s * s - 4 * p, 'α²β + αβ²': p * s, 'α³ + β³': s ** 3 - 3 * p * s }[ask];
};
const cubicRelation = ({ roots, lead, ask }) => {
  const v = vieta(fromRoots(roots, lead));
  return ask === 'squares' ? v.sum ** 2 - 2 * v.pairSum : v[ask];
};
const signChanges = ({ coeffs }) => {
  const values = [-3, -2, -1, 0, 1, 2, 3].map((x) => evaluate(coeffs, x));
  return values.slice(1).filter((v, i) => Math.sign(v) !== Math.sign(values[i])).length;
};
const transformedEquation = ({ b, c, kind, k }) => {
  let coeffs;
  if (kind === 'scale') coeffs = [1, k * b, k * k * c];
  else if (kind === 'shift') coeffs = [1, b - 2 * k, k * k - b * k + c];
  else coeffs = c < 0 ? [-c, -b, -1] : [c, b, 1];
  return eq(coeffs);
};
const reciprocalExpression = ({ a, b, c, ask }) => {
  const S = -b / a;
  const P = c / a;
  const v = { '1/α + 1/β': S / P, 'α/β + β/α': (S * S - 2 * P) / P, '1/α² + 1/β²': (S * S - 2 * P) / (P * P) }[ask];
  return Number(v.toFixed(10));
};

export const polynomialTemplates = [
  /* ================================ basics ================================ */
  {
    id: 'py-gen-value',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-basics',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['py-value-f'],
    estimatedSeconds: 40,
    params(rng) {
      const coeffs = [nonZero(rng, -3, 4), rng.int(-6, 6), rng.int(-9, 9), rng.int(-9, 9)];
      const x = rng.pick([-3, -2, -1, 2, 3]);
      return { coeffs, x };
    },
    answer: ({ coeffs, x }) => evaluate(coeffs, x),
    verify: ({ coeffs, x }, value) => evaluateByPowers(coeffs, x) === value,
    render({ coeffs, x }) {
      const terms = coeffs.map((c, i) => c * x ** (3 - i)).filter((_, i) => coeffs[i] !== 0);
      const value = evaluate(coeffs, x);
      const sum = terms.map((t, i) => (i === 0 ? num(t) : t < 0 ? `− ${-t}` : `+ ${t}`)).join(' ');
      return {
        question: `If p(x) = ${polyText(coeffs)}, what is p(${num(x)})?`,
        explanation: `Put ${num(x)} for every x and work each term on its own: ${sum} = ${num(value)}.`,
        solutionSteps: [`x³ = ${num(x ** 3)}, x² = ${num(x ** 2)}.`, `Terms: ${sum}.`, `p(${num(x)}) = ${num(value)}.`],
        method: 'Substitute, then evaluate term by term.',
        hints: [`Work out ${br(x)}³ and ${br(x)}² first.`, 'Multiply each power by its coefficient, keeping the signs.'],
        commonMistakes: [x < 0 ? `Treating ${br(x)}³ as positive.` : 'Raising the coefficient to the power as well, as if 2x³ were (2x)³.']
      };
    }
  },

  {
    id: 'py-gen-product-coeff',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-basics',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['py-value-f'],
    estimatedSeconds: 55,
    params(rng) {
      const p = [rng.int(1, 3), nonZero(rng, -7, 7), nonZero(rng, -9, 9)];
      const q = [rng.int(1, 4), nonZero(rng, -9, 9)];
      const k = rng.pick([1, 2]);
      return { p, q, k };
    },
    answer: ({ p, q, k }) => multiply(p, q)[3 - k],
    // Rebuild the product's coefficients from its values alone.
    verify: ({ p, q, k }, value) => {
      const c = cubicFromValues((x) => evaluateByPowers(p, x) * evaluateByPowers(q, x));
      return nearlyEqual(c[3 - k], value);
    },
    render({ p, q, k }) {
      const [a, b, c] = p;
      const [m, n] = q;
      const value = multiply(p, q)[3 - k];
      const pairs = k === 2 ? [[`${mono([a, 0, 0])} × ${br(n)}`, a * n], [`${mono([b, 0])} × ${mono([m, 0])}`, b * m]] : [[`${mono([b, 0])} × ${br(n)}`, b * n], [`${br(c)} × ${mono([m, 0])}`, c * m]];
      const termOf = (v) => polyText(k === 2 ? [v, 0, 0] : [v, 0]);
      const xk = k === 2 ? 'x²' : 'x';
      return {
        question: `What is the coefficient of ${xk} in (${polyText(p)})(${polyText(q)})?`,
        explanation: `${xk} arises in two ways: ${pairs[0][0]} gives ${termOf(pairs[0][1])} and ${pairs[1][0]} gives ${termOf(pairs[1][1])}. Together ${num(pairs[0][1])} + ${br(pairs[1][1])} = ${num(value)}. The full product is ${polyText(multiply(p, q))}.`,
        solutionSteps: [`${pairs[0][0]} → ${num(pairs[0][1])}.`, `${pairs[1][0]} → ${num(pairs[1][1])}.`, `Coefficient = ${num(value)}.`],
        method: `Pick only the pairs of terms whose powers add to ${k}.`,
        hints: [`Which pairs of terms multiply to give ${xk}?`, 'There are exactly two such pairs; add their coefficients.'],
        commonMistakes: ['Counting only one of the two pairs.']
      };
    }
  },

  /* ============================== remainder ============================== */
  {
    id: 'py-gen-remainder',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-remainder',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['py-remainder-f'],
    estimatedSeconds: 45,
    params(rng) {
      const deg = rng.pick([3, 3, 4]);
      const coeffs = [nonZero(rng, -3, 3), ...Array.from({ length: deg }, () => rng.int(-8, 8))];
      const a = rng.pick([-3, -2, -1, 1, 2, 3]);
      return { coeffs, a };
    },
    answer: ({ coeffs, a }) => syntheticDivision(coeffs, a).remainder,
    verify: ({ coeffs, a }, value) => evaluateByPowers(coeffs, a) === value,
    render({ coeffs, a }) {
      const value = evaluateByPowers(coeffs, a);
      return {
        question: `Find the remainder when ${polyText(coeffs)} is divided by ${divisorText(a)}.`,
        explanation: `${divisorText(a)} is zero at x = ${num(a)}, so by the remainder theorem the remainder is p(${num(a)}) = ${num(value)}. No long division is needed.`,
        solutionSteps: [`Zero of the divisor: x = ${num(a)}.`, `p(${num(a)}) = ${num(value)}.`, `Remainder = ${num(value)}.`],
        method: 'Remainder = p(a) for the divisor x − a.',
        hints: [`Which value of x makes ${divisorText(a)} zero?`, `Work out p(${num(a)}).`],
        commonMistakes: [`Putting x = ${num(-a)} instead of ${num(a)}.`]
      };
    }
  },

  {
    id: 'py-gen-remainder-linear',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-remainder',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['py-remainder-f'],
    estimatedSeconds: 75,
    params(rng) {
      const m = rng.pick([2, 3]);
      const k = nonZero(rng, -5, 5);
      if (gcd(m, k) !== 1) return null;
      const coeffs = [nonZero(rng, -4, 4) * m, rng.int(-6, 6), rng.int(-6, 6), rng.int(-9, 9)];
      return { m, k, coeffs };
    },
    // p(k/m) as an exact fraction: (c₃k³ + c₂k²m + c₁km² + c₀m³) / m³.
    answer: remainderAtFraction,
    distractors: ({ m, k, coeffs }) => {
      const at = (n, d) => {
        const [c3, c2, c1, c0] = coeffs;
        return fracText(c3 * n ** 3 + c2 * n ** 2 * d + c1 * n * d ** 2 + c0 * d ** 3, d ** 3);
      };
      return [
        { value: at(-k, m), why: 'used the wrong sign for the zero of the divisor' },
        { value: num(evaluate(coeffs, k)), why: 'put x equal to the constant, ignoring the coefficient of x' },
        { value: at(m, k), why: 'turned the fraction upside down' },
        { value: num(evaluate(coeffs, -k)), why: 'used minus the constant' }
      ];
    },
    verify: ({ m, k, coeffs }, value) => {
      const r = divide(coeffs, [m, -k]).remainder[0];
      return fracText(Math.round(r * m ** 3), m ** 3) === value;
    },
    render({ m, k, coeffs }, { fmt: show }) {
      const divisor = `${m}x ${k > 0 ? '−' : '+'} ${Math.abs(k)}`;
      const zero = fracText(k, m);
      const value = show(remainderAtFraction({ m, k, coeffs }));
      return {
        question: `Find the remainder when ${polyText(coeffs)} is divided by ${divisor}.`,
        explanation: `${divisor} is zero at x = ${zero}. By the remainder theorem the remainder is p(${zero}) = ${value}.`,
        solutionSteps: [`Solve ${divisor} = 0: x = ${zero}.`, `Substitute x = ${zero} in every term.`, `Remainder = ${value}.`],
        method: 'Remainder = p(b/a) for the divisor ax − b.',
        hints: [`Which value of x makes ${divisor} zero?`, `Work out p(${zero}) carefully with fractions.`],
        commonMistakes: [`Putting x = ${num(k)} and ignoring the ${m} in front of x.`]
      };
    }
  },

  {
    id: 'py-gen-sum-coeffs',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-remainder',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['py-sc-sum-coeffs', 'py-remainder-f'],
    estimatedSeconds: 45,
    params(rng) {
      const n1 = rng.int(12, 60);
      const n2 = rng.int(3, n1 - 2);
      const c = [nonZero(rng, -5, 5), nonZero(rng, -5, 5), nonZero(rng, -6, 6), rng.int(-9, 9)];
      const a = rng.pick([1, -1]);
      return { n1, n2, c, a };
    },
    // Odd powers of −1 are −1, even powers +1.
    answer: valueAtPlusMinusOne,
    verify: ({ n1, n2, c, a }, value) => {
      const coeffs = Array(n1 + 1).fill(0);
      coeffs[0] = c[0];
      coeffs[n1 - n2] += c[1];
      coeffs[n1 - 1] += c[2];
      coeffs[n1] += c[3];
      return evaluateByPowers(coeffs, a) === value;
    },
    render({ n1, n2, c, a }) {
      const term = (coef, power, first) => {
        const body = `${Math.abs(coef) === 1 ? '' : Math.abs(coef)}x${power > 1 ? pw(power) : ''}`;
        return first ? `${coef < 0 ? '−' : ''}${body}` : `${coef < 0 ? '−' : '+'} ${body}`;
      };
      const text = [term(c[0], n1, true), term(c[1], n2), term(c[2], 1), c[3] ? `${c[3] < 0 ? '−' : '+'} ${Math.abs(c[3])}` : ''].filter(Boolean).join(' ');
      const value = valueAtPlusMinusOne({ n1, n2, c, a });
      const sign = (n) => (a === 1 || n % 2 === 0 ? 1 : -1);
      const parts = [c[0] * sign(n1), c[1] * sign(n2), c[2] * sign(1), c[3]].filter((v, i) => i < 3 || v !== 0);
      const sum = parts.map((v, i) => (i === 0 ? num(v) : v < 0 ? `− ${-v}` : `+ ${v}`)).join(' ');
      return {
        question: `Find the remainder when ${text} is divided by ${divisorText(a)}.`,
        explanation:
          a === 1
            ? `The remainder is p(1). Every power of 1 is 1, so p(1) is the sum of the coefficients: ${sum} = ${num(value)}.`
            : `The remainder is p(−1). Even powers of −1 are 1 and odd powers are −1: x${pw(n1)} becomes ${sign(n1)}, x${pw(n2)} becomes ${sign(n2)} and x becomes −1. So p(−1) = ${sum} = ${num(value)}.`,
        solutionSteps: [`Remainder = p(${num(a)}).`, a === 1 ? 'Every power of 1 is 1.' : `${n1} is ${n1 % 2 ? 'odd' : 'even'}, ${n2} is ${n2 % 2 ? 'odd' : 'even'}.`, `${sum} = ${num(value)}.`],
        method: a === 1 ? 'p(1) = sum of the coefficients.' : 'p(−1): even powers give +1, odd powers give −1.',
        hints: [`Put x = ${num(a)}; the size of the powers does not matter.`, a === 1 ? 'Add the coefficients.' : 'Check whether each power is odd or even.'],
        commonMistakes: [a === 1 ? 'Forgetting the constant term.' : 'Making an even power of −1 negative.']
      };
    }
  },

  /* ================================ factor ================================ */
  {
    id: 'py-gen-find-k',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-factor',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['py-factor-f'],
    estimatedSeconds: 60,
    params(rng) {
      const a = rng.pick([-3, -2, -1, 1, 2, 3]);
      const k = nonZero(rng, -6, 6);
      const b = rng.int(-9, 9);
      const c = -(a ** 3 + k * a * a + b * a);
      if (c === 0 || Math.abs(c) > 60) return null;
      return { a, b, c, k };
    },
    answer: ({ a, b, c }) => -(a ** 3 + b * a + c) / (a * a),
    verify: ({ a, b, c }, value) => Number.isInteger(value) && evaluateByPowers([1, value, b, c], a) === 0,
    render({ a, b, c, k }) {
      const text = `x³ + kx²${b ? ` ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x` : ''} ${c < 0 ? '−' : '+'} ${Math.abs(c)}`;
      const known = a ** 3 + b * a + c;
      return {
        question: `If ${divisorText(a)} is a factor of ${text}, find k.`,
        explanation: `${divisorText(a)} is a factor, so p(${num(a)}) = 0: ${expr([[a ** 3, ''], [a * a, 'k'], [b * a, ''], [c, '']])} = 0, which is ${expr([[a * a, 'k'], [known, '']])} = 0. So k = ${num(k)}.`,
        solutionSteps: [`p(${num(a)}) = ${expr([[a * a, 'k'], [known, '']])}.`, `Set it equal to 0.`, `k = ${num(k)}.`],
        method: 'Factor theorem: p(a) = 0, then solve for k.',
        hints: [`A factor leaves remainder 0, so p(${num(a)}) = 0.`, `x² at x = ${num(a)} is ${a * a}, so the k term is ${expr([[a * a, 'k']])}.`],
        commonMistakes: [`Substituting x = ${num(-a)} instead of ${num(a)}.`]
      };
    }
  },

  {
    id: 'py-gen-coeff-from-remainder',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-factor',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['py-remainder-f', 'py-factor-f'],
    estimatedSeconds: 60,
    params(rng) {
      const a = rng.pick([-3, -2, -1, 1, 2, 3]);
      const slot = rng.pick([1, 2]); // 1: the x² coefficient is unknown; 2: the x coefficient
      const coeffs = [1, rng.int(-6, 6), rng.int(-8, 8), rng.int(-9, 9)];
      const k = nonZero(rng, -7, 7);
      coeffs[slot] = k;
      const R = evaluate(coeffs, a);
      return { a, slot, coeffs, k, R };
    },
    answer: ({ a, slot, coeffs, R }) => {
      const rest = coeffs.reduce((s, c, i) => (i === slot ? s : s + c * a ** (3 - i)), 0);
      return (R - rest) / a ** (3 - slot);
    },
    verify: ({ a, slot, coeffs, R }, value) => {
      const trial = [...coeffs];
      trial[slot] = value;
      return Number.isInteger(value) && syntheticDivision(trial, a).remainder === R;
    },
    render({ a, slot, coeffs, k, R }) {
      const shown = coeffs.map((c, i) => (i === slot ? 'k' : c));
      const term = (c, power, first) => {
        const xp = power === 0 ? '' : `x${power > 1 ? pw(power) : ''}`;
        if (c === 'k') return `${first ? '' : '+ '}k${xp}`;
        if (c === 0) return '';
        const body = power > 0 && Math.abs(c) === 1 ? xp : `${Math.abs(c)}${xp}`;
        return first ? `${c < 0 ? '−' : ''}${body}` : `${c < 0 ? '−' : '+'} ${body}`;
      };
      const text = shown.map((c, i) => term(c, 3 - i, i === 0)).filter(Boolean).join(' ');
      const power = a ** (3 - slot);
      const rest = coeffs.reduce((s, c, i) => (i === slot ? s : s + c * a ** (3 - i)), 0);
      return {
        question: `When ${text} is divided by ${divisorText(a)}, the remainder is ${num(R)}. Find k.`,
        explanation: `By the remainder theorem, p(${num(a)}) = ${num(R)}. The known terms give ${num(rest)} and the k term gives ${expr([[power, 'k']])}, so ${expr([[power, 'k'], [rest, '']])} = ${num(R)} and k = ${num(k)}.`,
        solutionSteps: [`p(${num(a)}) = ${expr([[power, 'k'], [rest, '']])}.`, `Set it equal to ${num(R)}.`, `k = ${num(k)}.`],
        method: 'Remainder theorem, then solve for the coefficient.',
        hints: [`Put x = ${num(a)} and set the result equal to ${num(R)}.`, `The k term becomes k × ${br(a)}${slot === 1 ? '²' : ''}.`],
        commonMistakes: ['Setting p(a) equal to 0 although the remainder is not 0.', `Putting x = ${num(-a)}.`]
      };
    }
  },

  {
    id: 'py-gen-two-factors',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-factor',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['py-factor-f'],
    estimatedSeconds: 110,
    params(rng) {
      const roots = pickRoots(rng, 3, -5, 5);
      if (!roots) return null;
      const ask = rng.pick(['a', 'b', 'a + b', 'a − b']);
      return { roots, ask };
    },
    // Two equations from p(r₁) = 0 and p(r₂) = 0, solved by Cramer's rule.
    answer: ({ roots, ask }) => {
      const [r1, r2, r3] = roots;
      const c = -r1 * r2 * r3;
      const e1 = -(r1 ** 3) - c;
      const e2 = -(r2 ** 3) - c;
      const det = r1 * r1 * r2 - r2 * r2 * r1;
      const a = (e1 * r2 - e2 * r1) / det;
      const b = (r1 * r1 * e2 - r2 * r2 * e1) / det;
      return { a, b, 'a + b': a + b, 'a − b': a - b }[ask];
    },
    verify: ({ roots, ask }, value) => {
      const [, a, b] = fromRoots(roots);
      return { a, b, 'a + b': a + b, 'a − b': a - b }[ask] === value;
    },
    render({ roots, ask }) {
      const [r1, r2] = roots;
      const [, a, b, c] = fromRoots(roots);
      const value = { a, b, 'a + b': a + b, 'a − b': a - b }[ask];
      return {
        question: `Both ${divisorText(r1)} and ${divisorText(r2)} are factors of x³ + ax² + bx ${c < 0 ? '−' : '+'} ${Math.abs(c)}. Find ${ask}.`,
        explanation: `p(${num(r1)}) = 0 and p(${num(r2)}) = 0 give two equations in a and b. Solving them gives a = ${num(a)} and b = ${num(b)}, so ${ask} = ${num(value)}. Check: the polynomial is ${polyText(fromRoots(roots))} = ${roots.map((r) => linearFactorText(r)).join('')}.`,
        solutionSteps: [
          `p(${num(r1)}) = 0 → ${expr([[r1 * r1, 'a'], [r1, 'b']])} = ${num(-(r1 ** 3) - c)}.`,
          `p(${num(r2)}) = 0 → ${expr([[r2 * r2, 'a'], [r2, 'b']])} = ${num(-(r2 ** 3) - c)}.`,
          `a = ${num(a)}, b = ${num(b)}, so ${ask} = ${num(value)}.`
        ],
        method: 'One equation from each factor; solve the pair.',
        hints: [`Each factor gives an equation: p(${num(r1)}) = 0 and p(${num(r2)}) = 0.`, 'Eliminate one unknown by combining the two equations.'],
        commonMistakes: ['Substituting the opposite sign for a factor such as x + 3.', 'Answering a or b alone when a combination is asked.']
      };
    }
  },

  {
    id: 'py-gen-which-factor',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-factor',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['py-factor-f', 'py-sc-integer-roots'],
    estimatedSeconds: 60,
    params(rng) {
      const roots = pickRoots(rng, 3, -4, 4);
      if (!roots) return null;
      return { roots, pick: rng.int(0, 2) };
    },
    answer: ({ roots, pick }) => linearFactorText(roots[pick]),
    distractors: ({ roots, pick }) => {
      const r = roots[pick];
      const others = [-r, r + 1, r - 1, -r + 1, -r - 1, 5, -5].filter((v) => !roots.includes(v));
      return others.map((v) => ({ value: linearFactorText(v), why: v === -r ? 'took the root with the wrong sign' : 'not a zero of the polynomial' }));
    },
    verify: ({ roots }, value) => {
      const r = rootOfFactor(value);
      return r !== null && evaluateByPowers(fromRoots(roots), r) === 0;
    },
    render({ roots, pick }) {
      const p = fromRoots(roots);
      const r = roots[pick];
      return {
        question: `Which of the following is a factor of ${polyText(p)}?`,
        explanation: `${linearFactorText(r)} is a factor because p(${num(r)}) = 0. In full, ${polyText(p)} = ${roots.map((v) => linearFactorText(v)).join('')}; the other options leave non-zero remainders.`,
        solutionSteps: [`An integer root divides the constant term ${num(p[3])}.`, `p(${num(r)}) = 0.`, `So ${linearFactorText(r)} is a factor.`],
        method: 'Factor theorem: test p at the zero of each option.',
        hints: ['For each option, find the x that makes it zero and work out p there.', `Integer roots divide the constant term ${num(p[3])}.`],
        commonMistakes: ['Testing p(a) for the factor (x + a), the wrong sign.']
      };
    }
  },

  /* =============================== division =============================== */
  {
    id: 'py-gen-synthetic',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-division',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['py-sc-synthetic', 'py-division-f'],
    estimatedSeconds: 70,
    params(rng) {
      const deg = rng.pick([3, 4]);
      const coeffs = [rng.int(1, 3), ...Array.from({ length: deg }, () => rng.int(-7, 7))];
      const a = rng.pick([-3, -2, -1, 1, 2, 3]);
      const j = rng.int(0, deg - 2); // which power of x in the quotient
      return { coeffs, a, j };
    },
    answer: ({ coeffs, a, j }) => {
      const { quotient } = syntheticDivision(coeffs, a);
      return quotient[quotient.length - 1 - j];
    },
    verify: ({ coeffs, a, j }, value) => {
      const { quotient } = divide(coeffs, [1, -a]);
      return quotient[quotient.length - 1 - j] === value;
    },
    render({ coeffs, a, j }) {
      const { quotient, remainder, sums } = syntheticDivision(coeffs, a);
      const what = j === 0 ? 'the constant term' : `the coefficient of ${j === 1 ? 'x' : `x${pw(j)}`}`;
      const value = quotient[quotient.length - 1 - j];
      return {
        question: `When ${polyText(coeffs)} is divided by ${divisorText(a)}, what is ${what} of the quotient?`,
        explanation: `Synthetic division with ${num(a)}: the coefficients ${coeffs.map(num).join(', ')} give the row ${sums.slice(0, -1).map(num).join(', ')} with remainder ${num(remainder)}. The quotient is ${polyText(quotient)}, so ${what} is ${num(value)}.`,
        solutionSteps: [`Write ${coeffs.map(num).join(', ')} and divide by ${num(a)}.`, `Bring down, multiply by ${num(a)}, add: ${sums.map(num).join(', ')}.`, `Quotient ${polyText(quotient)}; ${what} = ${num(value)}.`],
        method: 'Synthetic division: bring down, multiply, add.',
        hints: [`Use ${num(a)} (the zero of ${divisorText(a)}) in synthetic division.`, 'The last number of the row is the remainder; the others are the quotient, one power lower.'],
        commonMistakes: [`Dividing with ${num(-a)} instead of ${num(a)}.`, 'Reading the remainder as part of the quotient.']
      };
    }
  },

  {
    id: 'py-gen-dividend',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-division',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['py-division-f'],
    estimatedSeconds: 65,
    params(rng) {
      const m = nonZero(rng, -5, 5);
      const quotient = [rng.int(1, 4), rng.int(-6, 6)];
      const remainder = [rng.int(-5, 5), rng.int(-9, 9)];
      const t = rng.pick([-2, -1, 1, 2, 3]);
      return { m, quotient, remainder, t };
    },
    answer: ({ m, quotient, remainder, t }) => evaluate(add(multiply([1, 0, m], quotient), remainder), t),
    verify: ({ m, quotient, remainder, t }, value) => evaluateByPowers([1, 0, m], t) * evaluateByPowers(quotient, t) + evaluateByPowers(remainder, t) === value,
    render({ m, quotient, remainder, t }) {
      const divisor = [1, 0, m];
      const p = add(multiply(divisor, quotient), remainder);
      const value = evaluate(p, t);
      const d = evaluate(divisor, t);
      const q = evaluate(quotient, t);
      const r = evaluate(remainder, t);
      return {
        question: `A polynomial p(x) divided by ${polyText(divisor)} gives quotient ${polyText(quotient)} and remainder ${polyText(remainder)}. What is p(${num(t)})?`,
        explanation: `p(x) = (${polyText(divisor)})(${polyText(quotient)}) + (${polyText(remainder)}). At x = ${num(t)}: ${num(d)} × ${br(q)} + ${br(r)} = ${num(value)}. (In full, p(x) = ${polyText(p)}.)`,
        solutionSteps: [`Divisor at ${num(t)}: ${num(d)}; quotient: ${num(q)}; remainder: ${num(r)}.`, `p(${num(t)}) = ${num(d)} × ${br(q)} + ${br(r)}.`, `= ${num(value)}.`],
        method: 'Dividend = divisor × quotient + remainder.',
        hints: ['Write p(x) = divisor × quotient + remainder.', `You can put x = ${num(t)} into each part without expanding.`],
        commonMistakes: ['Forgetting to add the remainder.']
      };
    }
  },

  /* ================================ roots ================================ */
  {
    id: 'py-gen-quad-symmetric',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-roots',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['py-quad-roots-f', 'py-sc-alpha-sq'],
    estimatedSeconds: 60,
    params(rng) {
      const b = nonZero(rng, -9, 9);
      const c = nonZero(rng, -12, 12);
      if (b * b - 4 * c <= 0) return null;
      const ask = rng.pick(['α² + β²', '(α − β)²', 'α²β + αβ²', 'α³ + β³']);
      return { b, c, ask };
    },
    answer: quadSymmetric,
    verify: ({ b, c, ask }, value) => {
      const roots = realRoots([1, b, c]);
      if (roots.length !== 2) return false;
      const [x, y] = roots;
      const direct = { 'α² + β²': x * x + y * y, '(α − β)²': (x - y) ** 2, 'α²β + αβ²': x * x * y + x * y * y, 'α³ + β³': x ** 3 + y ** 3 }[ask];
      return nearlyEqual(direct, value, 1e-7);
    },
    render({ b, c, ask }) {
      const s = -b;
      const value = quadSymmetric({ b, c, ask });
      const how = {
        'α² + β²': `(α + β)² − 2αβ = ${br(s)}² − 2 × ${br(c)}`,
        '(α − β)²': `(α + β)² − 4αβ = ${br(s)}² − 4 × ${br(c)}`,
        'α²β + αβ²': `αβ(α + β) = ${br(c)} × ${br(s)}`,
        'α³ + β³': `(α + β)³ − 3αβ(α + β) = ${br(s)}³ − 3 × ${br(c)} × ${br(s)}`
      }[ask];
      return {
        question: `α and β are the roots of ${eq([1, b, c])}. Find ${ask}.`,
        explanation: `α + β = ${num(s)} and αβ = ${num(c)}. Then ${ask} = ${how} = ${num(value)}. The roots themselves are not needed.`,
        solutionSteps: [`α + β = −b/a = ${num(s)}.`, `αβ = c/a = ${num(c)}.`, `${ask} = ${how} = ${num(value)}.`],
        method: 'Write the expression in α + β and αβ.',
        hints: ['Find α + β and αβ from the coefficients.', `Rewrite ${ask} using only α + β and αβ.`],
        commonMistakes: ['Taking α + β = b instead of −b.', 'Adding 2αβ where it should be subtracted.']
      };
    }
  },

  {
    id: 'py-gen-cubic-vieta',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-roots',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['py-cubic-roots-f'],
    estimatedSeconds: 55,
    params(rng) {
      const roots = pickRoots(rng, 3, -4, 5, false);
      if (!roots) return null;
      const lead = rng.pick([1, 1, 2, 3]);
      const ask = rng.pick(['sum', 'pairSum', 'product', 'squares']);
      return { roots, lead, ask };
    },
    answer: cubicRelation,
    verify: ({ roots, ask }, value) => {
      const [x, y, z] = roots;
      return { sum: x + y + z, pairSum: x * y + y * z + z * x, product: x * y * z, squares: x * x + y * y + z * z }[ask] === value;
    },
    render({ roots, lead, ask }) {
      const coeffs = fromRoots(roots, lead);
      const [a, b, c, d] = coeffs;
      const v = vieta(coeffs);
      const name = { sum: 'α + β + γ', pairSum: 'αβ + βγ + γα', product: 'αβγ', squares: 'α² + β² + γ²' }[ask];
      const value = cubicRelation({ roots, lead, ask });
      const how = {
        sum: `−b/a = −(${num(b)})/${a}`,
        pairSum: `c/a = ${num(c)}/${a}`,
        product: `−d/a = −(${num(d)})/${a}`,
        squares: `(Σα)² − 2Σαβ = ${br(v.sum)}² − 2 × ${br(v.pairSum)}`
      }[ask];
      return {
        question: `α, β and γ are the roots of ${eq(coeffs)}. Find ${name}.`,
        explanation: `For ax³ + bx² + cx + d, ${ask === 'squares' ? `Σα = ${num(v.sum)} and Σαβ = ${num(v.pairSum)}, so ` : ''}${name} = ${how} = ${num(value)}.`,
        solutionSteps: [`a = ${a}, b = ${num(b)}, c = ${num(c)}, d = ${num(d)}.`, `${name} = ${how}.`, `= ${num(value)}.`],
        method: 'Σα = −b/a, Σαβ = c/a, αβγ = −d/a.',
        hints: ['The signs alternate: −b/a, c/a, −d/a.', ask === 'squares' ? 'α² + β² + γ² = (Σα)² − 2Σαβ.' : `Read ${ask === 'sum' ? 'b' : ask === 'pairSum' ? 'c' : 'd'} and a from the equation.`],
        commonMistakes: ['Using d/a for the product of the roots of a cubic.', 'Forgetting to divide by the leading coefficient.']
      };
    }
  },

  /* ================================ graphs ================================ */
  {
    id: 'py-gen-table-roots',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-graphs',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['py-graph-f'],
    estimatedSeconds: 60,
    params(rng) {
      const sign = rng.pick([1, -1]);
      if (rng.chance(0.25)) {
        // One real root and no others: (2x − m)(x² + c).
        const m = rng.pick([-5, -3, -1, 1, 3, 5]);
        const c = rng.int(1, 4);
        return { coeffs: multiply([2 * sign, -m * sign], [1, 0, c]) };
      }
      const odd = [-9, -7, -5, -3, -1, 1, 3, 5, 7, 9];
      const picks = rng.shuffle(odd).slice(0, 3);
      if (picks.filter((m) => Math.abs(m) < 6).length === 0) return null;
      return { coeffs: multiply([sign], picks.reduce((poly, m) => multiply(poly, [2, -m]), [1])) };
    },
    answer: signChanges,
    formatValue: (value) => fmt(value),
    distractors: () => [0, 1, 2, 3].map((value) => ({ value, why: 'miscounted the sign changes' })),
    verify: ({ coeffs }, value) => realRoots(coeffs).filter((r) => r > -3 && r < 3).length === value,
    render({ coeffs }) {
      const xs = [-3, -2, -1, 0, 1, 2, 3];
      const values = xs.map((x) => evaluate(coeffs, x));
      const value = signChanges({ coeffs });
      const gaps = xs.slice(1).map((x, i) => [xs[i], x]).filter((_, i) => Math.sign(values[i + 1]) !== Math.sign(values[i]));
      const gapText = gaps.length ? gaps.map(([a, b]) => `${num(a)} and ${num(b)}`).join('; ') : 'none';
      return {
        question: 'p(x) is a cubic polynomial with the values in the table. What is the least number of real roots p(x) must have between x = −3 and x = 3?',
        table: { caption: 'Values of the cubic p(x)', headers: ['x', ...xs.map(num)], rows: [['p(x)', ...values.map(num)]] },
        explanation: `A root is trapped wherever neighbouring values have opposite signs. The signs change between ${gapText}, so p(x) has at least ${value} real root${value === 1 ? '' : 's'} between −3 and 3.`,
        solutionSteps: [`Signs: ${values.map((v) => (v < 0 ? '−' : '+')).join(', ')}.`, `Sign changes: ${gaps.length}.`, `At least ${value} root${value === 1 ? '' : 's'}.`],
        method: 'Count the sign changes between neighbouring values.',
        hints: ['Look for neighbouring values with opposite signs.', 'Each sign change traps at least one root.'],
        commonMistakes: ['Counting the negative values instead of the sign changes.']
      };
    }
  },

  {
    id: 'py-gen-max-roots',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-graphs',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['py-graph-f'],
    estimatedSeconds: 25,
    params(rng) {
      return { n: rng.int(2, 9), ask: rng.pick(['roots', 'turns']) };
    },
    answer: ({ n, ask }) => (ask === 'roots' ? n : n - 1),
    formatValue: (value) => fmt(value),
    distractors: ({ n, ask }) =>
      ask === 'roots'
        ? [
            { value: n + 1, why: 'added one' },
            { value: n - 1, why: 'gave the number of turning points' },
            { value: 2 * n, why: 'doubled the degree' }
          ]
        : [
            { value: n, why: 'gave the number of roots' },
            { value: n + 1, why: 'added one' },
            { value: n - 2, why: 'subtracted two' },
            { value: 2 * n, why: 'doubled the degree' }
          ],
    // A polynomial with roots 1, 2, …, n reaches both bounds.
    verify: ({ n, ask }, value) => {
      const p = fromRoots(Array.from({ length: n }, (_, i) => i + 1));
      return (ask === 'roots' ? realRoots(p) : realRoots(derivative(p))).length === value;
    },
    render({ n, ask }) {
      const what = ask === 'roots' ? 'real roots' : 'turning points';
      const value = ask === 'roots' ? n : n - 1;
      return {
        question: `What is the greatest number of ${what} a polynomial of degree ${n} can have?`,
        explanation: ask === 'roots' ? `A polynomial of degree ${n} has at most ${n} roots, and ${n <= 3 ? Array.from({ length: n }, (_, i) => linearFactorText(i + 1)).join('') : `(x − 1)(x − 2)…(x − ${n})`} has exactly ${n} real ones.` : `Between two neighbouring turning points the graph rises or falls; a degree-${n} polynomial has at most ${n - 1} turning points (its derivative has degree ${n - 1}).`,
        solutionSteps: [ask === 'roots' ? 'At most n real roots.' : 'At most n − 1 turning points.', `n = ${n}.`, `Answer: ${value}.`],
        method: 'Degree n: at most n roots, at most n − 1 turning points.',
        hints: [ask === 'roots' ? 'How many times can the graph meet the x-axis?' : 'Turning points are one fewer than the most roots.', `The degree is ${n}.`],
        commonMistakes: [ask === 'roots' ? 'Confusing roots with turning points.' : 'Giving n instead of n − 1.']
      };
    }
  },

  /* ======================= advanced: quadratic divisor ======================= */
  {
    id: 'py-gen-quad-divisor',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-adv-quadratic-divisor',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['py-quad-divisor-f'],
    estimatedSeconds: 100,
    params(rng) {
      const roots = pickRoots(rng, 2, -3, 4, false);
      if (!roots) return null;
      const [a, b] = roots;
      const coeffs = [1, rng.int(-4, 4), rng.int(-6, 6), rng.int(-9, 9)];
      const pa = evaluate(coeffs, a);
      const pb = evaluate(coeffs, b);
      const r = (pa - pb) / (a - b);
      const s = pa - r * a;
      if (r === 0 || s === 0 || r === s) return null;
      return { a, b, coeffs, words: rng.chance(0.5) };
    },
    answer: ({ a, b, coeffs }) => {
      const pa = evaluate(coeffs, a);
      const pb = evaluate(coeffs, b);
      const r = (pa - pb) / (a - b);
      return polyText([r, pa - r * a]);
    },
    distractors: ({ a, b, coeffs }) => {
      const pa = evaluate(coeffs, a);
      const pb = evaluate(coeffs, b);
      const r = (pa - pb) / (a - b);
      const s = pa - r * a;
      return [
        { value: polyText([s, r]), why: 'swapped r and s' },
        { value: polyText([pa - pb, pa - (pa - pb) * a]), why: 'forgot to divide by a − b' },
        { value: polyText([r, pa + r * a]), why: 'sign slip when finding s' },
        { value: polyText([pa + pb]), why: 'added the two remainders' }
      ];
    },
    verify: ({ a, b, coeffs }, value) => polyText(divide(coeffs, fromRoots([a, b])).remainder) === value,
    render({ a, b, coeffs, words }) {
      const pa = evaluate(coeffs, a);
      const pb = evaluate(coeffs, b);
      const r = (pa - pb) / (a - b);
      const s = pa - r * a;
      const divisor = `${linearFactorText(a)}${linearFactorText(b)}`;
      return {
        question: words
          ? `A polynomial p(x) leaves remainder ${num(pa)} when divided by ${divisorText(a)} and remainder ${num(pb)} when divided by ${divisorText(b)}. What remainder does it leave when divided by ${divisor}?`
          : `What is the remainder when ${polyText(coeffs)} is divided by ${polyText(fromRoots([a, b]))}?`,
        explanation: `${words ? '' : `${polyText(fromRoots([a, b]))} = ${divisor}, so the remainder is rx + s with p(${num(a)}) = ${num(pa)} and p(${num(b)}) = ${num(pb)}. `}The remainder rx + s satisfies ${expr([[a, 'r'], [1, 's']])} = ${num(pa)} and ${expr([[b, 'r'], [1, 's']])} = ${num(pb)}. Subtracting, r = (${num(pa)} − ${br(pb)}) ÷ (${num(a)} − ${br(b)}) = ${num(r)}, and s = ${num(s)}. The remainder is ${polyText([r, s])}.`,
        solutionSteps: [`Remainder = rx + s.`, `x = ${num(a)}: ${expr([[a, 'r'], [1, 's']])} = ${num(pa)}; x = ${num(b)}: ${expr([[b, 'r'], [1, 's']])} = ${num(pb)}.`, `r = ${num(r)}, s = ${num(s)} → ${polyText([r, s])}.`],
        method: 'A quadratic divisor leaves rx + s; use both zeros of the divisor.',
        hints: ['The remainder has degree at most 1: write it as rx + s.', `Put x = ${num(a)} and x = ${num(b)}.`],
        commonMistakes: ['Expecting a constant remainder from a quadratic divisor.', 'Swapping r and s.']
      };
    }
  },

  /* ========================= advanced: changed roots ========================= */
  {
    id: 'py-gen-transform-eqn',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-adv-transform',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['py-transform-f'],
    estimatedSeconds: 90,
    params(rng) {
      const roots = pickRoots(rng, 2, -6, 6);
      if (!roots) return null;
      const [, b, c] = fromRoots(roots);
      if (b === 0) return null;
      const kind = rng.pick(['scale', 'shift', 'reciprocal']);
      const k = kind === 'scale' ? rng.pick([2, 3, -2]) : kind === 'shift' ? nonZero(rng, -3, 3) : 1;
      return { b, c, roots, kind, k };
    },
    // By substitution in the equation: p(x/k)·k², p(x − h), or reversed coefficients.
    answer: transformedEquation,
    distractors: ({ b, c, kind, k }) => {
      if (kind === 'scale')
        return [
          { value: eq([1, k * b, k * c]), why: 'multiplied the product by k, not k²' },
          { value: eq([1, b, k * k * c]), why: 'changed only the product' },
          { value: eq([1, k * b, c]), why: 'changed only the sum' }
        ];
      if (kind === 'shift')
        return [
          { value: eq([1, b + 2 * k, k * k + b * k + c]), why: 'replaced x by x + h instead of x − h' },
          { value: eq([1, b - k, c]), why: 'added h to the sum only once' },
          { value: eq([1, b - 2 * k, c]), why: 'changed only the sum' }
        ];
      const s = c < 0 ? -1 : 1;
      return [
        { value: eq([s * c, -s * b, s]), why: 'changed the sign of the middle term' },
        { value: eq([1, b, c]), why: 'kept the original equation' },
        { value: eq([1, s * c * b, c]), why: 'mixed up the sum and the product' },
        { value: eq([s, s * b, s * c].map((v) => v)), why: 'did not reverse the coefficients' }
      ];
    },
    // From the roots themselves: build the equation with the new roots.
    verify: ({ roots, kind, k }, value) => {
      const fresh = roots.map((r) => (kind === 'scale' ? k * r : kind === 'shift' ? r + k : 1 / r));
      let coeffs = fromRoots(fresh);
      if (kind === 'reciprocal') {
        const scale = roots[0] * roots[1];
        coeffs = coeffs.map((v) => Math.round(v * scale));
        if (coeffs[0] < 0) coeffs = coeffs.map((v) => -v);
      }
      return eq(coeffs) === value;
    },
    render({ b, c, kind, k }) {
      const original = eq([1, b, c]);
      const target = kind === 'scale' ? `${num(k)}α and ${num(k)}β` : kind === 'shift' ? `α ${k < 0 ? '−' : '+'} ${Math.abs(k)} and β ${k < 0 ? '−' : '+'} ${Math.abs(k)}` : '1/α and 1/β';
      const answer = transformedEquation({ b, c, kind, k });
      const S = -b;
      const P = c;
      const how =
        kind === 'scale'
          ? `New sum = ${num(k)} × ${br(S)} = ${num(k * S)}; new product = ${k * k} × ${br(P)} = ${num(k * k * P)}.`
          : kind === 'shift'
            ? `New sum = ${num(S)} + 2 × ${br(k)} = ${num(S + 2 * k)}; new product = αβ + ${br(k)}(α + β) + ${br(k)}² = ${num(P + k * S + k * k)}.`
            : `For reciprocal roots, reverse the coefficients: 1, ${num(b)}, ${num(c)} becomes ${num(c)}, ${num(b)}, 1${c < 0 ? ', then multiply by −1' : ''}.`;
      return {
        question: `α and β are the roots of ${original}. Which equation has roots ${target}?`,
        explanation: `α + β = ${num(S)} and αβ = ${num(P)}. ${how} So the equation is ${answer}.`,
        solutionSteps: [`α + β = ${num(S)}, αβ = ${num(P)}.`, how, answer],
        method: kind === 'reciprocal' ? 'Reciprocal roots: reverse the coefficients.' : 'x² − (new sum)x + (new product) = 0.',
        hints: ['Find α + β and αβ first.', kind === 'scale' ? 'The product picks up k², not k.' : kind === 'shift' ? '(α + h)(β + h) = αβ + h(α + β) + h².' : 'If α is a root of ax² + bx + c, then 1/α is a root of cx² + bx + a.'],
        commonMistakes: [kind === 'scale' ? 'Multiplying the product by k instead of k².' : kind === 'shift' ? 'Substituting x + h instead of x − h.' : 'Changing signs instead of reversing the coefficients.']
      };
    }
  },

  {
    id: 'py-gen-reciprocal-sum',
    version: 1,
    topicId: 'polynomials',
    conceptId: 'py-adv-transform',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['py-quad-roots-f', 'py-transform-f'],
    answerDecimals: 2,
    estimatedSeconds: 60,
    params(rng) {
      const a = rng.int(1, 4);
      const b = nonZero(rng, -9, 9);
      const c = nonZero(rng, -8, 8);
      if (b * b - 4 * a * c <= 0) return null;
      const ask = rng.pick(['1/α + 1/β', 'α/β + β/α', '1/α² + 1/β²']);
      const value = reciprocalExpression({ a, b, c, ask });
      if (!hasAtMostDecimals(value, 2)) return null;
      return { a, b, c, ask };
    },
    answer: reciprocalExpression,
    verify: ({ a, b, c, ask }, value) => {
      const roots = realRoots([a, b, c]);
      if (roots.length !== 2) return false;
      const [x, y] = roots;
      const direct = { '1/α + 1/β': 1 / x + 1 / y, 'α/β + β/α': x / y + y / x, '1/α² + 1/β²': 1 / (x * x) + 1 / (y * y) }[ask];
      return nearlyEqual(direct, value, 1e-6);
    },
    render({ a, b, c, ask }) {
      const S = fracText(-b, a);
      const P = fracText(c, a);
      const value = reciprocalExpression({ a, b, c, ask });
      const how = { '1/α + 1/β': '(α + β) ÷ αβ', 'α/β + β/α': '(α² + β²) ÷ αβ = ((α + β)² − 2αβ) ÷ αβ', '1/α² + 1/β²': '(α² + β²) ÷ (αβ)² = ((α + β)² − 2αβ) ÷ (αβ)²' }[ask];
      return {
        question: `α and β are the roots of ${eq([a, b, c])}. Find ${ask}.`,
        explanation: `α + β = ${S} and αβ = ${P}. ${ask} = ${how} = ${value < 0 ? `−${fmt(-value)}` : fmt(value)}.`,
        solutionSteps: [`α + β = −b/a = ${S}; αβ = c/a = ${P}.`, `${ask} = ${how}.`, `= ${value < 0 ? `−${fmt(-value)}` : fmt(value)}.`],
        method: 'Combine over a common denominator, then use the sum and product.',
        hints: ['Write the expression over a common denominator.', `Use α + β = ${S} and αβ = ${P}.`],
        commonMistakes: ['Turning the fraction upside down.', 'Forgetting to divide by the leading coefficient.']
      };
    }
  }
];
