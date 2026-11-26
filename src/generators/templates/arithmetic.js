/** Simplification, approximation, fractions and decimals templates. */

import { fmt, gcd, nearlyEqual } from '../core.js';

const fmt4 = (value) => fmt(value, 4);

/** Reduced "n/d" text. */
function fracText(n, d) {
  const g = gcd(n, d);
  return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`;
}

function parseFrac(text) {
  const [n, d] = String(text).split('/').map(Number);
  return d ? n / d : n;
}

/** Evaluate an arithmetic string with × ÷ − and ² using the language's own precedence. */
function evaluate(expression) {
  const js = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/²/g, '**2').replace(/\[/g, '(').replace(/\]/g, ')');
  // Only digits, spaces, brackets and operators can appear: the expression is built from numbers.
  if (!/^[\d\s+\-*/().]+$/.test(js)) return NaN;
  return Function(`"use strict"; return (${js});`)();
}

/** Decimal text with a fixed number of places from an integer scaled by 10^places. */
function scaled(value, places) {
  return (value / 10 ** places).toFixed(places);
}

/* Quantitative comparison: the four fixed answer choices, always shown in this order. */
const QC_CHOICES = ['Quantity A is greater', 'Quantity B is greater', 'The two quantities are equal', 'The relationship cannot be determined'];
const QC_QUESTION = 'Which statement about Quantity A and Quantity B is true?';
const qcTable = (a, b) => ({ caption: 'Compare the two quantities', headers: ['Quantity A', 'Quantity B'], rows: [[a, b]] });
const qcVerdict = (diff) => (Math.abs(diff) < 1e-9 ? 2 : diff > 0 ? 0 : 1);
const qcDistractors = (answer) => QC_CHOICES.filter((c) => c !== answer).map((value) => ({ value, why: 'a different relationship' }));

const SUPERSCRIPTS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const power = (base, exp) => `${base}${String(exp).split('').map((d) => SUPERSCRIPTS[d]).join('')}`;

const QC_FRACTIONS = [[1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [3, 7], [4, 7], [5, 8], [3, 8], [5, 6], [4, 9], [5, 9], [7, 8]];
const QC_PERCENTS = [15, 20, 25, 30, 35, 40, 45, 55, 60, 65, 70, 75, 80];
/* Base/exponent pairs a^i and b^j that are close (or equal), to be raised to a common power g. */
const QC_POWERS = [[2, 3, 3, 2], [2, 5, 5, 2], [2, 7, 5, 3], [3, 3, 5, 2], [2, 10, 10, 3], [2, 2, 3, 1], [3, 2, 2, 3], [2, 6, 4, 3], [2, 4, 4, 2], [3, 2, 9, 1], [5, 2, 3, 3], [7, 1, 2, 3]];

/* Conditions on x: sample values for the answer, and a dense sampler for the check. */
const QC_CONDITIONS = {
  pos: { text: 'x > 0', samples: [0.1, 0.25, 0.5, 1, 2, 3, 10], dense: () => [...range(-40, 40).map((u) => Math.exp(u / 8)), ...range(1, 30)] },
  gt1: { text: 'x > 1', samples: [1.5, 2, 3, 10], dense: () => [...range(-40, 40).map((u) => 1 + Math.exp(u / 8)), ...range(2, 30)] },
  unit: { text: '0 < x < 1', samples: [0.1, 0.25, 0.5, 0.75, 0.9], dense: () => range(1, 99).map((u) => u / 100) },
  neg: { text: 'x < 0', samples: [-10, -3, -2, -1, -0.5, -0.25, -0.1], dense: () => [...range(-40, 40).map((u) => -Math.exp(u / 8)), ...range(-30, -1)] },
  ltm1: { text: 'x < −1', samples: [-10, -3, -2, -1.5], dense: () => [...range(-40, 40).map((u) => -1 - Math.exp(u / 8)), ...range(-30, -2)] },
  between: { text: '−1 < x < 0', samples: [-0.9, -0.75, -0.5, -0.25, -0.1], dense: () => range(-99, -1).map((u) => u / 100) },
  posint: { text: 'x is a positive whole number', samples: [1, 2, 3, 4, 5, 10], dense: () => range(1, 60) }
};
const QC_EXPRESSIONS = {
  'x': (x) => x,
  'x²': (x) => x * x,
  'x³': (x) => x ** 3,
  '1/x': (x) => 1 / x,
  '2x': (x) => 2 * x,
  'x + 1': (x) => x + 1,
  '−x': (x) => -x,
  'x ÷ 2': (x) => x / 2,
  '√x': (x) => Math.sqrt(x),
  'x² + 1': (x) => x * x + 1
};
const POSITIVE_ONLY = new Set(['√x']);
function range(from, to) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** 0 = A greater, 1 = B greater, 2 = equal, 3 = cannot be determined, over a set of x values. */
function qcClassify(a, b, xs) {
  const verdicts = new Set(xs.map((x) => qcVerdict(QC_EXPRESSIONS[a](x) - QC_EXPRESSIONS[b](x))));
  return verdicts.size === 1 ? [...verdicts][0] : 3;
}
/** The comparison verdict for ap-adv-qc-compare, from the parameters (A/B swapped when `swap`). */
function qcCompareAnswer(p) {
  let left;
  let right;
  if (p.kind === 'fracPercent') [left, right] = [(p.a * p.N) / p.b, (p.p * p.M) / 100];
  else if (p.kind === 'sameSum') [left, right] = [p.c * p.c - p.d1 * p.d1, p.c * p.c - p.d2 * p.d2];
  else [left, right] = [p.i * Math.log(p.x), p.j * Math.log(p.y)];
  const verdict = qcVerdict(left - right);
  return QC_CHOICES[verdict === 2 ? 2 : p.swap ? 1 - verdict : verdict];
}
const minus = (text) => text.replace(/^-/, '−');
/** "= 0.25" for values with at most 3 decimals, "≈ 0.333" otherwise. */
const qcNumber = (v) => (Number.isInteger(v) || Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-9 ? `= ${minus(fmt(v, 3))}` : `≈ ${minus(fmt(v, 3))}`);

export const arithmeticTemplates = [
  /* ============================= simplification ============================= */
  {
    id: 'sp-bodmas-basic',
    version: 1,
    topicId: 'simplification',
    conceptId: 'sp-bodmas',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['sp-bodmas-f'],
    estimatedSeconds: 35,
    tags: ['trap'],
    params(rng) {
      const kind = rng.int(0, 3);
      const a = rng.int(2, 20);
      const b = rng.int(2, 12);
      const c = rng.int(2, 9);
      const d = rng.int(2, 9);
      if (kind === 0) return { kind, a, b, c, text: `${a} + ${b} × ${c}`, wrong: [(a + b) * c, a + b + c, a * b + c, b * c] };
      if (kind === 1) {
        const big = b * c * d;
        return { kind, text: `${big} ÷ ${b} × ${c}`, wrong: [big / (b * c), big / b + c, big / b - c, (big * b) / c], big, b, c };
      }
      if (kind === 2) {
        if (b <= c) return null;
        return { kind, text: `${a * 3} − (${b} − ${c}) × ${d}`, wrong: [(a * 3 - (b - c)) * d, a * 3 - b - c * d, a * 3 - (b - c) + d, (a * 3 - b - c) * d] };
      }
      const big = c * d * b;
      return { kind, text: `${a} + ${big} ÷ ${c} − ${d}`, wrong: [(a + big) / c - d, a + big / (c - d || 1), (a + big) / (c - d || 1), a + big / c + d] };
    },
    answer: ({ text }) => evaluate(text),
    formatValue: (value) => fmt(value),
    distractors: ({ wrong }) => wrong.map((value) => ({ value, why: 'did not follow the order of operations' })),
    verify: ({ text }, value) => Number.isFinite(value) && nearlyEqual(evaluate(text), value),
    render({ text }) {
      const value = evaluate(text);
      return {
        question: `What is the value of ${text}?`,
        explanation: `Follow BODMAS: brackets first, then division and multiplication (left to right), then addition and subtraction (left to right). The value is ${fmt(value)}.`,
        solutionSteps: ['Evaluate any bracket.', 'Do division and multiplication left to right.', 'Do addition and subtraction left to right.', `= ${fmt(value)}.`],
        method: 'B, O, D/M left to right, A/S left to right.',
        hints: ['Which operation has priority?', 'Never simply work from left to right.'],
        commonMistakes: ['Working strictly left to right.']
      };
    }
  },

  {
    id: 'sp-difference-of-squares',
    version: 1,
    topicId: 'simplification',
    conceptId: 'sp-shortcuts',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['sp-identity-f'],
    estimatedSeconds: 50,
    params(rng) {
      const k = rng.pick([2, 4, 5, 10, 20]);
      const b = rng.int(11, 99);
      return { a: b + k, b, k };
    },
    answer: ({ k, b }) => k * (2 * b + k),
    formatValue: (value) => fmt(value),
    distractors: ({ a, b, k }) => [
      { value: k * k, why: 'squared the difference' },
      { value: a * a + b * b, why: 'added the squares' },
      { value: a + b, why: 'gave the sum' },
      { value: a * a - b, why: 'subtracted b, not b²' }
    ],
    verify: ({ a, b }, value) => a * a - b * b === value,
    render({ a, b, k }) {
      return {
        question: `What is the value of ${a}² − ${b}²?`,
        explanation: `Using a² − b² = (a − b)(a + b): (${a} − ${b})(${a} + ${b}) = ${k} × ${a + b} = ${k * (a + b)}.`,
        solutionSteps: [`a − b = ${k}.`, `a + b = ${a + b}.`, `${k} × ${a + b} = ${k * (a + b)}.`],
        method: 'Difference of squares.',
        hints: ['Factorise instead of squaring.', 'Use (a − b)(a + b).'],
        commonMistakes: ['Computing (a − b)² instead.']
      };
    }
  },

  {
    id: 'sp-fraction-of',
    version: 1,
    topicId: 'simplification',
    conceptId: 'sp-fractions',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['sp-fraction-f'],
    estimatedSeconds: 55,
    params(rng) {
      const list = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [3, 8]];
      const [p, q] = rng.pick(list);
      const [r, s] = rng.pick(list);
      if (p === r && q === s) return null;
      const N = q * rng.int(2, 15);
      const M = s * rng.int(2, 15);
      return { p, q, r, s, N, M };
    },
    answer: ({ p, q, r, s, N, M }) => (N * p) / q + (M * r) / s,
    formatValue: (value) => fmt(value),
    distractors: ({ p, q, r, s, N, M }) => [
      { value: Math.abs((N * p) / q - (M * r) / s), why: 'subtracted instead of adding' },
      { value: N / q + M / s, why: 'forgot the numerators' },
      { value: ((N + M) * p) / q, why: 'used one fraction for both amounts' },
      { value: (N * q) / p + (M * s) / r, why: 'inverted the fractions' }
    ],
    verify: ({ p, q, r, s, N, M }, value) => nearlyEqual(value, evaluate(`${N} × ${p} / ${q} + ${M} × ${r} / ${s}`)),
    render({ p, q, r, s, N, M }) {
      return {
        question: `What is the value of ${p}/${q} of ${N} + ${r}/${s} of ${M}?`,
        explanation: `${p}/${q} of ${N} = ${(N * p) / q} and ${r}/${s} of ${M} = ${(M * r) / s}. The sum is ${(N * p) / q + (M * r) / s}.`,
        solutionSteps: [`${N} × ${p}/${q} = ${(N * p) / q}.`, `${M} × ${r}/${s} = ${(M * r) / s}.`, `Add: ${(N * p) / q + (M * r) / s}.`],
        method: '"Of" means multiply.',
        hints: ['Evaluate each "of" before adding.'],
        commonMistakes: ['Adding the fractions before applying them.']
      };
    }
  },

  {
    id: 'sp-nested-brackets',
    version: 1,
    topicId: 'simplification',
    conceptId: 'sp-brackets',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['sp-bodmas-f', 'sp-powers-f'],
    estimatedSeconds: 80,
    tags: ['trap'],
    params(rng) {
      const a = rng.int(5, 20);
      const c = rng.int(2, 6);
      const k = rng.int(2, 8);
      const b = c * k;
      const d = rng.int(2, 6);
      const e = rng.int(2, 5);
      const R = (a + k) * d - e * e;
      if (R <= 0) return null;
      const fs = [];
      for (let f = 2; f <= 9; f++) if (R % f === 0) fs.push(f);
      if (!fs.length) return null;
      return { a, b, c, d, e, f: rng.pick(fs), k, R };
    },
    answer: ({ R, f }) => R / f,
    formatValue: (value) => fmt(value),
    distractors: ({ a, b, c, d, e, f, k, R }) => [
      { value: R, why: 'forgot the final division' },
      { value: ((a + k) * d - e) / f, why: 'did not square e' },
      { value: (((a + b) / c) * d - e * e) / f, why: 'added before dividing' },
      { value: ((a + k) * d) / f - e * e, why: 'divided only the first term' }
    ],
    verify: ({ a, b, c, d, e, f }, value) => nearlyEqual(evaluate(`((${a} + ${b} ÷ ${c}) × ${d} − ${e}²) ÷ ${f}`), value),
    render({ a, b, c, d, e, f, k, R }) {
      return {
        question: `What is the value of [(${a} + ${b} ÷ ${c}) × ${d} − ${e}²] ÷ ${f}?`,
        explanation: `${b} ÷ ${c} = ${k}, so the bracket is ${a} + ${k} = ${a + k}. Then ${a + k} × ${d} = ${(a + k) * d}. ${e}² = ${e * e}, so ${(a + k) * d} − ${e * e} = ${R}. Finally ${R} ÷ ${f} = ${R / f}.`,
        solutionSteps: [`${b} ÷ ${c} = ${k}; ${a} + ${k} = ${a + k}.`, `${a + k} × ${d} = ${(a + k) * d}.`, `${(a + k) * d} − ${e * e} = ${R}.`, `${R} ÷ ${f} = ${R / f}.`],
        method: 'Innermost bracket outwards, applying BODMAS in each.',
        hints: ['Start with the division inside the round bracket.', 'Do the square before the subtraction.'],
        commonMistakes: ['Adding before dividing inside the bracket.']
      };
    }
  },

  /* ============================== approximation ============================== */
  {
    id: 'ap-round-place',
    version: 1,
    topicId: 'approximation',
    conceptId: 'ap-round',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ap-round-f'],
    estimatedSeconds: 30,
    params(rng) {
      const place = rng.pick([10, 100, 1000]);
      const N = rng.int(1000, 99999);
      const r = N % place;
      if (r === 0 || r * 2 === place) return null;
      return { N, place, r };
    },
    answer: ({ N, place, r }) => (r * 2 > place ? N - r + place : N - r),
    formatValue: (value) => fmt(value),
    distractors: ({ N, place, r }) => [
      { value: N - r, why: 'always rounded down' },
      { value: N - r + place, why: 'always rounded up' },
      { value: Math.round(N / (place * 10)) * place * 10, why: 'rounded to the next larger place' },
      { value: N, why: 'did not round' }
    ],
    verify({ N, place }, value) {
      const down = N - (N % place);
      const up = down + place;
      const nearest = N - down < up - N ? down : up;
      return value === nearest && value % place === 0;
    },
    render({ N, place, r }) {
      const name = { 10: 'ten', 100: 'hundred', 1000: 'thousand' }[place];
      const keep = N - r;
      return {
        question: `What is ${fmt(N)} rounded to the nearest ${name}?`,
        explanation: `The part below ${fmt(place)} is ${r}, which is ${r * 2 > place ? 'more' : 'less'} than half of ${fmt(place)}, so round ${r * 2 > place ? 'up to' : 'down to'} ${fmt(r * 2 > place ? keep + place : keep)}.`,
        solutionSteps: [`Keep the digits down to the ${name}s place: ${fmt(keep)}.`, `Compare the remainder ${r} with half of ${fmt(place)}.`, `Round ${r * 2 > place ? 'up' : 'down'}.`],
        method: 'Look at the digit to the right of the place you keep.',
        hints: ['Which digit decides the rounding?', '5 or more rounds up.'],
        commonMistakes: ['Cutting the digits off instead of rounding.']
      };
    }
  },

  {
    id: 'ap-friendly-product',
    version: 1,
    topicId: 'approximation',
    conceptId: 'ap-friendly',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ap-friendly-f'],
    estimatedSeconds: 40,
    params(rng) {
      const X = rng.pick([20, 30, 40, 50, 60, 80]);
      const Y = rng.pick([20, 25, 30, 40, 50, 60]);
      const da = rng.pick([-0.3, -0.2, -0.1, 0.1, 0.2, 0.3]);
      const db = rng.pick([-0.3, -0.2, -0.1, 0.1, 0.2, 0.3]);
      return { X, Y, a: Math.round((X + da) * 10) / 10, b: Math.round((Y + db) * 10) / 10 };
    },
    answer: ({ X, Y }) => X * Y,
    formatValue: (value) => fmt(value),
    distractors: ({ X, Y }) => [
      { value: X * Y * 10, why: 'gained a zero' },
      { value: (X * Y) / 10, why: 'lost a zero' },
      { value: X + Y, why: 'added instead of multiplying' },
      { value: X * Y * 2, why: 'doubled' }
    ],
    verify: ({ a, b }, value) => Math.abs(a * b - value) / value < 0.03,
    render({ X, Y, a, b }) {
      return {
        question: `Which is the best estimate of ${a} × ${b}?`,
        explanation: `${a} ≈ ${X} and ${b} ≈ ${Y}, so the product is about ${X} × ${Y} = ${fmt(X * Y)}. (Exact: ${fmt(a * b)}.)`,
        solutionSteps: [`${a} ≈ ${X}; ${b} ≈ ${Y}.`, `${X} × ${Y} = ${fmt(X * Y)}.`],
        method: 'Round to friendly numbers first.',
        hints: ['Both numbers are close to round numbers.', 'Check the number of zeros at the end.'],
        commonMistakes: ['Losing or gaining a zero.']
      };
    }
  },

  {
    id: 'ap-percent-fraction',
    version: 1,
    topicId: 'approximation',
    conceptId: 'ap-percent',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ap-percent-f'],
    estimatedSeconds: 45,
    params(rng) {
      const entry = rng.pick([
        { label: '12.5%', num: 1, den: 8 },
        { label: '37.5%', num: 3, den: 8 },
        { label: '62.5%', num: 5, den: 8 },
        { label: '25%', num: 1, den: 4 },
        { label: '33⅓%', num: 1, den: 3 },
        { label: '66⅔%', num: 2, den: 3 },
        { label: '16⅔%', num: 1, den: 6 },
        { label: '83⅓%', num: 5, den: 6 },
        { label: '20%', num: 1, den: 5 },
        { label: '6.25%', num: 1, den: 16 }
      ]);
      return { ...entry, N: entry.den * rng.int(2, 40) };
    },
    answer: ({ N, num, den }) => (N * num) / den,
    formatValue: (value) => fmt(value),
    distractors: ({ N, num, den }) => [
      { value: (N * num * 10) / den, why: 'shifted the decimal point' },
      { value: (N * num) / (den * 10), why: 'shifted the decimal point' },
      { value: N / den, why: 'forgot the numerator' },
      { value: (N * den) / num, why: 'inverted the fraction' }
    ],
    verify: ({ N, num, den, label }, value) => {
      const pct = (num / den) * 100;
      return nearlyEqual((N * pct) / 100, value) && label.length > 0;
    },
    render({ N, num, den, label }) {
      return {
        question: `What is ${label} of ${fmt(N)}?`,
        explanation: `${label} = ${num}/${den}, so ${label} of ${fmt(N)} = ${fmt(N)} × ${num}/${den} = ${fmt((N * num) / den)}.`,
        solutionSteps: [`${label} = ${num}/${den}.`, `${fmt(N)} ÷ ${den} = ${fmt(N / den)}.`, num > 1 ? `× ${num} = ${fmt((N * num) / den)}.` : `Answer: ${fmt(N / den)}.`],
        method: 'Convert the percent to a fraction.',
        hints: [`${label} is the fraction ${num}/${den}.`, `Divide by ${den} first.`],
        commonMistakes: ['Shifting the decimal point the wrong way.']
      };
    }
  },

  {
    id: 'ap-sqrt-nearest',
    version: 1,
    topicId: 'approximation',
    conceptId: 'ap-roots',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ap-roots-f'],
    estimatedSeconds: 50,
    params(rng) {
      const N = rng.int(200, 9999);
      const s = Math.sqrt(N);
      const frac = s - Math.floor(s);
      if (frac < 0.12 || (frac > 0.38 && frac < 0.62) || frac > 0.88) return null;
      return { N };
    },
    answer: ({ N }) => Math.round(Math.sqrt(N)),
    formatValue: (value) => fmt(value),
    distractors: ({ N }) => {
      const k = Math.round(Math.sqrt(N));
      return [
        { value: k - 1, why: 'off by one' },
        { value: k + 1, why: 'off by one' },
        { value: k + 2, why: 'off by two' },
        { value: Math.round(N / (2 * k)), why: 'divided the number by twice the root' }
      ];
    },
    verify: ({ N }, value) => (value - 0.5) ** 2 < N && N < (value + 0.5) ** 2,
    render({ N }) {
      const k = Math.round(Math.sqrt(N));
      const low = Math.floor(Math.sqrt(N));
      return {
        question: `To the nearest whole number, what is √${fmt(N)}?`,
        explanation: `${low}² = ${low * low} and ${low + 1}² = ${(low + 1) * (low + 1)}. Since ${fmt(N)} lies between them and is nearer ${k === low ? low * low : (low + 1) * (low + 1)}, √${fmt(N)} ≈ ${Math.sqrt(N).toFixed(1)}, which rounds to ${k}.`,
        solutionSteps: [`${low}² = ${low * low}; ${low + 1}² = ${(low + 1) * (low + 1)}.`, `√${fmt(N)} ≈ ${Math.sqrt(N).toFixed(1)}.`, `Round: ${k}.`],
        method: 'Compare with the nearest perfect squares.',
        hints: ['Find perfect squares just below and above the number.', 'Decide which one is nearer.'],
        commonMistakes: ['Rounding the wrong way.']
      };
    }
  },

  /* ================================ fractions ================================ */
  {
    id: 'fr-compare-extreme',
    version: 1,
    topicId: 'fractions',
    conceptId: 'fr-compare',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['fr-compare-f'],
    estimatedSeconds: 45,
    params(rng) {
      const fractions = [];
      const seen = new Set();
      let guard = 0;
      while (fractions.length < 4 && guard++ < 40) {
        const d = rng.int(2, 12);
        const n = rng.int(1, d - 1);
        const key = fracText(n, d);
        if (seen.has(key)) continue;
        const value = n / d;
        if (fractions.some((f) => Math.abs(f.n / f.d - value) < 0.02)) continue;
        seen.add(key);
        fractions.push({ n, d });
      }
      if (fractions.length < 4) return null;
      return { fractions, largest: rng.chance(0.5) };
    },
    answer: ({ fractions, largest }) => {
      const sorted = [...fractions].sort((x, y) => x.n * y.d - y.n * x.d);
      const pick = largest ? sorted[3] : sorted[0];
      return `${pick.n}/${pick.d}`;
    },
    formatValue: (value) => String(value),
    distractors: ({ fractions, largest }) => {
      const sorted = [...fractions].sort((x, y) => x.n * y.d - y.n * x.d);
      const others = largest ? sorted.slice(0, 3) : sorted.slice(1);
      return others.map((f) => ({ value: `${f.n}/${f.d}`, why: 'not the extreme value' }));
    },
    verify({ fractions, largest }, value) {
      const [n, d] = value.split('/').map(Number);
      return fractions.every((f) => (f.n === n && f.d === d) || (largest ? n * f.d > f.n * d : n * f.d < f.n * d));
    },
    render({ fractions, largest }) {
      const list = fractions.map((f) => `${f.n}/${f.d}`).join(', ');
      const decimals = fractions.map((f) => `${f.n}/${f.d} ≈ ${(f.n / f.d).toFixed(3)}`).join('; ');
      return {
        question: `Which of these fractions is the ${largest ? 'largest' : 'smallest'}: ${list}?`,
        explanation: `Convert each to a decimal: ${decimals}.`,
        solutionSteps: ['Cross-multiply pairs, or convert to decimals.', `Pick the ${largest ? 'greatest' : 'least'} value.`],
        method: 'Cross-multiply or use decimals.',
        hints: ['Compare two fractions at a time by cross-multiplying.'],
        commonMistakes: ['Choosing by the size of the denominator.']
      };
    }
  },

  {
    id: 'fr-add-sub',
    version: 1,
    topicId: 'fractions',
    conceptId: 'fr-operations',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['fr-add-f'],
    estimatedSeconds: 55,
    tags: ['trap'],
    params(rng) {
      const b = rng.int(3, 12);
      const d = rng.int(3, 12);
      const a = rng.int(1, b - 1);
      const c = rng.int(1, d - 1);
      if (b === d || gcd(a, b) !== 1 || gcd(c, d) !== 1) return null;
      const subtract = rng.chance(0.5);
      const value = subtract ? a * d - c * b : a * d + c * b;
      if (value <= 0) return null;
      return { a, b, c, d, subtract };
    },
    answer: ({ a, b, c, d, subtract }) => fracText(subtract ? a * d - c * b : a * d + c * b, b * d),
    formatValue: (value) => String(value),
    distractors: ({ a, b, c, d, subtract }) => {
      const good = subtract ? a * d - c * b : a * d + c * b;
      const other = Math.abs(subtract ? a * d + c * b : a * d - c * b);
      const out = [
        { value: fracText(subtract ? Math.abs(a - c) || 1 : a + c, subtract ? Math.abs(b - d) || 1 : b + d), why: 'combined numerators and denominators separately' },
        { value: fracText(other, b * d), why: 'used the wrong operation' },
        { value: fracText(good + 1, b * d), why: 'slipped by one in the numerator' },
        { value: fracText(Math.max(good - 1, 1), b * d), why: 'slipped by one in the numerator' }
      ];
      return out;
    },
    verify({ a, b, c, d, subtract }, value) {
      const target = subtract ? a / b - c / d : a / b + c / d;
      return nearlyEqual(parseFrac(value), target);
    },
    render({ a, b, c, d, subtract }) {
      const num = subtract ? a * d - c * b : a * d + c * b;
      return {
        question: `What is ${a}/${b} ${subtract ? '−' : '+'} ${c}/${d}?`,
        explanation: `Over a common denominator of ${b * d}: ${a * d}/${b * d} ${subtract ? '−' : '+'} ${c * b}/${b * d} = ${num}/${b * d}, which reduces to ${fracText(num, b * d)}.`,
        solutionSteps: [`Common denominator: ${b} × ${d} = ${b * d}.`, `${a}/${b} = ${a * d}/${b * d}; ${c}/${d} = ${c * b}/${b * d}.`, `${a * d} ${subtract ? '−' : '+'} ${c * b} = ${num} → ${fracText(num, b * d)}.`],
        method: 'Common denominator, then combine the numerators.',
        hints: [`Use ${b * d} (or the LCM) as the common denominator.`, 'Reduce your answer.'],
        commonMistakes: ['Adding or subtracting numerators and denominators separately.']
      };
    }
  },

  {
    id: 'fr-remainder-word',
    version: 1,
    topicId: 'fractions',
    conceptId: 'fr-word',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['fr-remaining-f'],
    estimatedSeconds: 70,
    tags: ['trap'],
    params(rng) {
      const q = rng.int(3, 6);
      const s = rng.int(3, 6);
      const p = rng.int(1, 2);
      const r = rng.int(1, 2);
      if (p >= q || r >= s || (p === 2 && q % 2 === 0) || (r === 2 && s % 2 === 0)) return null;
      const unit = rng.int(1, 10) * 100;
      const S = q * s * unit;
      return { p, q, r, s, S, L: (q - p) * (s - r) * unit };
    },
    answer: ({ S }) => S,
    formatValue: (value) => `₹${fmt(value)}`,
    distractors: ({ p, q, r, s, L }) => [
      { value: L / (1 - p / q - r / s), why: 'added the two fractions as parts of the original' },
      { value: L / (1 - p / q), why: 'ignored the second spending' },
      { value: L / (1 - r / s), why: 'ignored the first spending' },
      { value: L * 2, why: 'doubled the balance' }
    ],
    verify: ({ p, q, r, s, L }, value) => nearlyEqual(value * (1 - p / q) * (1 - r / s), L),
    render({ p, q, r, s, S, L }) {
      return {
        question: `A man spends ${p}/${q} of his salary on rent and ${r}/${s} of the remainder on food. He has ₹${fmt(L)} left. What is his salary?`,
        explanation: `After rent, ${q - p}/${q} remains. Food takes ${r}/${s} of that, leaving ${q - p}/${q} × ${s - r}/${s} of the salary. So ₹${fmt(L)} is ${(q - p) * (s - r)}/${q * s} of the salary, and the salary is ₹${fmt(S)}.`,
        solutionSteps: [`After rent: ${q - p}/${q}.`, `After food: ${q - p}/${q} × ${s - r}/${s} = ${(q - p) * (s - r)}/${q * s}.`, `Salary = ${L} ÷ (${(q - p) * (s - r)}/${q * s}) = ${S}.`],
        method: 'Multiply the surviving fractions.',
        hints: ['The second fraction applies to what is left after the first.', 'Find the fraction of the salary that remains.'],
        commonMistakes: ['Adding the two spending fractions.']
      };
    }
  },

  {
    id: 'fr-mixed-product',
    version: 1,
    topicId: 'fractions',
    conceptId: 'fr-mixed',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['fr-mixed-f', 'fr-muldiv-f'],
    estimatedSeconds: 60,
    tags: ['trap'],
    params(rng) {
      const d1 = rng.int(2, 6);
      const d2 = rng.int(2, 6);
      // n1 = d2·x and n2 = d1·y make the product the whole number x·y; keep only proper mixed numbers.
      const usable = (n, d) => n > d && n % d !== 0 && gcd(n % d, d) === 1;
      const xs = [];
      const ys = [];
      for (let v = 1; v <= 12; v++) {
        if (usable(d2 * v, d1)) xs.push(v);
        if (usable(d1 * v, d2)) ys.push(v);
      }
      if (!xs.length || !ys.length) return null;
      const x = rng.pick(xs);
      const y = rng.pick(ys);
      const n1 = d2 * x;
      const n2 = d1 * y;
      const w1 = Math.floor(n1 / d1);
      const w2 = Math.floor(n2 / d2);
      const r1 = n1 % d1;
      const r2 = n2 % d2;
      return { d1, d2, x, y, n1, n2, w1, w2, r1, r2 };
    },
    answer: ({ x, y }) => x * y,
    formatValue: (value) => fmt(value),
    distractors: ({ d1, d2, w1, w2, r1, r2, n1, n2 }) => [
      { value: w1 * w2 + (r1 / d1) * (r2 / d2), why: 'multiplied the whole and fractional parts separately' },
      { value: w1 * w2, why: 'multiplied only the whole parts' },
      { value: n1 / d1 + n2 / d2, why: 'added instead of multiplying' },
      { value: n1 * n2, why: 'multiplied the numerators only' }
    ],
    verify: ({ n1, d1, n2, d2 }, value) => nearlyEqual((n1 / d1) * (n2 / d2), value),
    render({ d1, d2, x, y, n1, n2, w1, w2, r1, r2 }) {
      return {
        question: `What is ${w1} ${r1}/${d1} × ${w2} ${r2}/${d2}?`,
        explanation: `Convert to improper fractions: ${n1}/${d1} × ${n2}/${d2}. Cancelling gives ${x} × ${y} = ${x * y}.`,
        solutionSteps: [`${w1} ${r1}/${d1} = ${n1}/${d1}; ${w2} ${r2}/${d2} = ${n2}/${d2}.`, `${n1}/${d1} × ${n2}/${d2}: cancel common factors.`, `= ${x * y}.`],
        method: 'Improper fractions before multiplying.',
        hints: ['Convert both mixed numbers first.', 'Cancel diagonally before multiplying.'],
        commonMistakes: ['Multiplying whole parts and fractional parts separately.']
      };
    }
  },

  /* ================================= decimals ================================= */
  {
    id: 'dc-add-sub',
    version: 1,
    topicId: 'decimals',
    conceptId: 'dc-ops',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['dc-compare-f'],
    estimatedSeconds: 45,
    tags: ['trap'],
    answerDecimals: 2,
    params(rng) {
      const pa = rng.int(1, 2);
      const pb = rng.int(1, 2);
      const pc = rng.int(1, 2);
      const toHundredths = (places) => rng.int(120, 999) * (places === 1 ? 10 : 1);
      const a = toHundredths(pa);
      const b = toHundredths(pb);
      const c = toHundredths(pc);
      if (a + b - c <= 0 || (pa === 2 && pb === 2 && pc === 2)) return null;
      return { a, b, c, pa, pb, pc };
    },
    answer: ({ a, b, c }) => (a + b - c) / 100,
    formatValue: (value) => fmt(value, 3),
    distractors: ({ a, b, c }) => [
      { value: (a + b * 10 - c) / 100, why: 'misaligned the second number' },
      { value: (a * 10 + b - c) / 100, why: 'misaligned the first number' },
      { value: (a + b - c * 10) / 100, why: 'misaligned the third number' },
      { value: (a + b + c) / 100, why: 'added the last number instead of subtracting' }
    ],
    verify: ({ a, b, c, pa, pb, pc }, value) => nearlyEqual(Number(scaled(a, 2)) + Number(scaled(b, 2)) - Number(scaled(c, 2)), value) && pa + pb + pc > 0,
    render({ a, b, c, pa, pb, pc }) {
      const A = scaled(a, 2);
      const B = scaled(b, 2);
      const C = scaled(c, 2);
      const show = (text, places) => (places === 1 ? text.slice(0, -1) : text);
      return {
        question: `What is ${show(A, pa)} + ${show(B, pb)} − ${show(C, pc)}?`,
        explanation: `Write every number to two decimal places and align the points: ${A} + ${B} = ${scaled(a + b, 2)}, then ${scaled(a + b, 2)} − ${C} = ${scaled(a + b - c, 2)}.`,
        solutionSteps: [`Align: ${A}, ${B}, ${C}.`, `${A} + ${B} = ${scaled(a + b, 2)}.`, `${scaled(a + b, 2)} − ${C} = ${scaled(a + b - c, 2)}.`],
        method: 'Line up the decimal points.',
        hints: ['Write every number to the same number of decimal places.'],
        commonMistakes: ['Misaligning a number with fewer decimal places.']
      };
    }
  },

  {
    id: 'dc-multiply',
    version: 1,
    topicId: 'decimals',
    conceptId: 'dc-ops',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dc-mult-f'],
    estimatedSeconds: 45,
    tags: ['trap'],
    answerDecimals: 3,
    params(rng) {
      const ia = rng.int(2, 99);
      const dpb = rng.int(1, 2);
      const ib = rng.int(2, 99);
      if (ia % 10 === 0 || ib % 10 === 0) return null;
      return { ia, ib, dpb };
    },
    answer: ({ ia, ib, dpb }) => (ia * ib) / 10 ** (1 + dpb),
    formatValue: (value) => fmt4(value),
    distractors: ({ ia, ib, dpb }) => [
      { value: (ia * ib) / 10 ** dpb, why: 'counted the decimal places of one factor only' },
      { value: (ia * ib) / 10 ** (2 + dpb), why: 'shifted one place too many' },
      { value: (ia * ib) / 10 ** (dpb - 1 < 0 ? 0 : dpb - 1), why: 'shifted too few places' },
      { value: ia * ib, why: 'gave the whole-number product' }
    ],
    verify: ({ ia, ib, dpb }, value) => nearlyEqual((ia / 10) * (ib / 10 ** dpb), value),
    render({ ia, ib, dpb }) {
      const A = (ia / 10).toFixed(1);
      const B = (ib / 10 ** dpb).toFixed(dpb);
      return {
        question: `What is ${A} × ${B}?`,
        explanation: `Ignore the points: ${ia} × ${ib} = ${ia * ib}. The factors have 1 + ${dpb} = ${1 + dpb} decimal places in total, so the answer is ${fmt4((ia * ib) / 10 ** (1 + dpb))}.`,
        solutionSteps: [`${ia} × ${ib} = ${ia * ib}.`, `Decimal places: 1 + ${dpb} = ${1 + dpb}.`, `= ${fmt4((ia * ib) / 10 ** (1 + dpb))}.`],
        method: 'Multiply as whole numbers, then place the point.',
        hints: ['How many decimal places do the factors have together?'],
        commonMistakes: ['Counting the decimal places of only one factor.']
      };
    }
  },

  {
    id: 'dc-divide',
    version: 1,
    topicId: 'decimals',
    conceptId: 'dc-ops',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dc-div-f'],
    estimatedSeconds: 55,
    tags: ['trap'],
    answerDecimals: 2,
    params(rng) {
      const dpb = rng.int(1, 2);
      const ib = rng.int(2, 9) * (dpb === 1 ? 1 : rng.pick([1, 2, 3, 4, 5]));
      const qi = rng.int(2, 60);
      if (ib % 10 === 0 || qi % 10 === 0) return null;
      const b = ib / 10 ** dpb;
      const q = qi / 10;
      return { dpb, ib, b, q, a: Math.round(qi * ib) / 10 ** (dpb + 1) };
    },
    answer: ({ q }) => q,
    formatValue: (value) => fmt4(value),
    distractors: ({ q, a, b }) => [
      { value: q * 10, why: 'shifted the point the wrong way' },
      { value: q / 10, why: 'shifted the point too far' },
      { value: a * b, why: 'multiplied instead of dividing' },
      { value: q * 100, why: 'shifted two places too many' }
    ],
    verify: ({ a, b }, value) => nearlyEqual(value * b, a),
    render({ dpb, ib, b, q, a }) {
      const shift = 10 ** dpb;
      const dividend = Math.round(a * shift * 1000) / 1000;
      return {
        question: `What is ${fmt4(a)} ÷ ${fmt4(b)}?`,
        explanation: `Multiply both numbers by ${shift} to make the divisor whole: ${fmt4(dividend)} ÷ ${ib} = ${fmt4(q)}.`,
        solutionSteps: [`Shift both numbers ${dpb} place${dpb > 1 ? 's' : ''} to the right.`, `${fmt4(dividend)} ÷ ${ib} = ${fmt4(q)}.`],
        method: 'Make the divisor a whole number.',
        hints: ['Multiply both numbers by the same power of 10.'],
        commonMistakes: ['Shifting only the divisor.']
      };
    }
  },

  {
    id: 'dc-recurring-fraction',
    version: 1,
    topicId: 'decimals',
    conceptId: 'dc-recurring',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['dc-recurring-f'],
    estimatedSeconds: 70,
    params(rng) {
      const block = rng.int(1, 98);
      if (block % 11 === 0) return null;
      const g = gcd(block, 99);
      return { block, n: block / g, d: 99 / g };
    },
    answer: ({ n, d }) => n + d,
    unit: '',
    verify: ({ block, n, d }, value) => value === n + d && nearlyEqual((n / d) * 99, block),
    render({ block, n, d }) {
      const text = String(block).padStart(2, '0');
      return {
        question: `The recurring decimal 0.${text}${text}${text}… (the digits ${text} repeat forever) equals a fraction a/b in lowest terms. What is a + b?`,
        explanation: `Two digits repeat, so the fraction is ${text}/99 = ${n}/${d} in lowest terms. So a + b = ${n} + ${d} = ${n + d}.`,
        solutionSteps: ['Two repeating digits → over 99.', `${block}/99 = ${n}/${d}.`, `${n} + ${d} = ${n + d}.`],
        method: 'Block over as many nines as it has digits, then simplify.',
        hints: ['Two digits repeat, so use 99.', 'Simplify the fraction before adding.'],
        commonMistakes: ['Dividing by 100 instead of 99.']
      };
    }
  },

  /* ============== advanced (Tier 6) levels: quantitative comparison ============== */
  {
    id: 'ap-adv-qc-compare',
    version: 1,
    topicId: 'approximation',
    conceptId: 'ap-adv-compare',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ap-adv-common-f'],
    estimatedSeconds: 80,
    formatValue: (value) => value,
    optionOrder: QC_CHOICES,
    params(rng) {
      const kind = rng.pick(['fracPercent', 'fracPercent', 'sameSum', 'powers']);
      const swap = rng.chance(0.5);
      if (kind === 'fracPercent') {
        const [a, b] = rng.pick(QC_FRACTIONS);
        const k = rng.int(5, 40);
        const value = a * k;
        const p = rng.pick(QC_PERCENTS);
        const M = 20 * (Math.round((value * 100) / p / 20) + rng.int(-1, 1));
        if (M < 20) return null;
        const other = (p * M) / 100;
        if (Math.abs(other - value) > 0.05 * value) return null;
        return { kind, swap, a, b, N: b * k, p, M };
      }
      if (kind === 'sameSum') {
        const c = rng.int(12, 99);
        const d1 = rng.int(1, 9);
        const d2 = rng.int(0, 9);
        if (d1 === d2 || c - Math.max(d1, d2) < 2) return null;
        return { kind, swap, c, d1, d2 };
      }
      const [x, i, y, j] = rng.pick(QC_POWERS);
      const g = rng.int(4, 12);
      if (i * g > 60 || j * g > 60) return null;
      return { kind, swap, x, i, y, j, g };
    },
    answer: qcCompareAnswer,
    distractors: (p) => qcDistractors(qcCompareAnswer(p)),
    // Exact integer arithmetic: cross-multiplied fractions, multiplied-out products, BigInt powers.
    verify(p, text) {
      let diff;
      if (p.kind === 'fracPercent') diff = p.a * p.N * 100 - p.p * p.M * p.b;
      else if (p.kind === 'sameSum') diff = (p.c - p.d1) * (p.c + p.d1) - (p.c - p.d2) * (p.c + p.d2);
      else {
        const left = BigInt(p.x) ** BigInt(p.i * p.g);
        const right = BigInt(p.y) ** BigInt(p.j * p.g);
        diff = left === right ? 0 : left > right ? 1 : -1;
      }
      if (p.swap) diff = -diff;
      return text === QC_CHOICES[qcVerdict(diff)];
    },
    render(p) {
      // Each side: its text in the table, and its working. Sides swap together when `swap` is set.
      let sides;
      let tail = '';
      let mistake;
      if (p.kind === 'fracPercent') {
        const A = (p.a * p.N) / p.b;
        const B = (p.p * p.M) / 100;
        sides = [
          { text: `${p.a}/${p.b} of ${fmt(p.N)}`, work: `${fmt(p.N)} ÷ ${p.b} × ${p.a} = ${fmt(A)}` },
          { text: `${p.p}% of ${fmt(p.M)}`, work: `${fmt(p.M)} × ${p.p} ÷ 100 = ${fmt(B)}` }
        ];
        mistake = 'Comparing only the fraction with the percentage, and ignoring the different totals.';
      } else if (p.kind === 'sameSum') {
        const text = (d) => (d === 0 ? power(p.c, 2) : `${p.c - d} × ${p.c + d}`);
        const value = (d) => p.c * p.c - d * d;
        const work = (d) => (d === 0 ? fmt(value(0)) : `(${p.c} − ${d})(${p.c} + ${d}) = ${power(p.c, 2)} − ${power(d, 2)} = ${fmt(value(d))}`);
        sides = [p.d1, p.d2].map((d) => ({ text: text(d), work: `${text(d)} = ${work(d)}` }));
        tail = ` The pair closer to ${p.c} gives the larger product.`;
        mistake = 'Assuming two products with the same sum of factors are equal.';
      } else {
        const lx = p.x ** p.i;
        const ly = p.y ** p.j;
        const work = (base, exp) => (exp === 1 ? power(base, p.g) : `${power(base, exp * p.g)} = (${power(base, exp)})${power('', p.g)} = ${power(base ** exp, p.g)}`);
        sides = [
          { text: power(p.x, p.i * p.g), work: work(p.x, p.i), base: lx },
          { text: power(p.y, p.j * p.g), work: work(p.y, p.j), base: ly }
        ];
        mistake = 'Comparing only the exponents, or only the bases.';
      }
      if (p.swap) sides.reverse();
      const [A, B] = sides;
      if (p.kind === 'powers') tail = ` With the same exponent, compare the bases: ${A.base} and ${B.base}.`;
      const explanation = `Quantity A: ${A.work}. Quantity B: ${B.work}.${tail}`;
      const steps = [`Quantity A: ${A.work}.`, `Quantity B: ${B.work}.`];
      const first = A.text;
      const second = B.text;
      const answer = qcCompareAnswer(p);
      return {
        table: qcTable(first, second),
        question: QC_QUESTION,
        explanation: `${explanation} So ${answer === QC_CHOICES[2] ? 'the two quantities are equal' : answer}.`,
        solutionSteps: [...steps, answer + '.'],
        method: 'Rewrite both quantities in the same form, then compare what differs.',
        hints: ['There is no unknown here, so one of the first three answers must be right.', p.kind === 'powers' ? 'Write both with the same exponent.' : p.kind === 'sameSum' ? 'Use (a − b)(a + b) = a² − b².' : 'Both quantities divide cleanly; work each out.'],
        commonMistakes: [mistake, 'Choosing "cannot be determined" when both quantities are plain numbers.']
      };
    }
  },

  {
    id: 'ap-adv-qc-unknown',
    version: 1,
    topicId: 'approximation',
    conceptId: 'ap-adv-unknowns',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ap-adv-test-f'],
    estimatedSeconds: 80,
    formatValue: (value) => value,
    optionOrder: QC_CHOICES,
    params(rng) {
      const condition = rng.pick(Object.keys(QC_CONDITIONS));
      const signed = QC_CONDITIONS[condition].samples.some((x) => x < 0);
      const allowed = Object.keys(QC_EXPRESSIONS).filter((e) => !(signed && POSITIVE_ONLY.has(e)));
      const [a, b] = rng.shuffle(allowed).slice(0, 2);
      return { condition, a, b };
    },
    answer: ({ condition, a, b }) => QC_CHOICES[qcClassify(a, b, QC_CONDITIONS[condition].samples)],
    distractors: ({ condition, a, b }) => qcDistractors(QC_CHOICES[qcClassify(a, b, QC_CONDITIONS[condition].samples)]),
    // Re-classify over a much denser spread of allowed values.
    verify: ({ condition, a, b }, text) => text === QC_CHOICES[qcClassify(a, b, QC_CONDITIONS[condition].dense())],
    render({ condition, a, b }) {
      const { text, samples } = QC_CONDITIONS[condition];
      const verdict = qcClassify(a, b, samples);
      const at = (x) => `x = ${minus(fmt(x, 2))}: A ${qcNumber(QC_EXPRESSIONS[a](x))}, B ${qcNumber(QC_EXPRESSIONS[b](x))}`;
      const outcome = (x) => qcVerdict(QC_EXPRESSIONS[a](x) - QC_EXPRESSIONS[b](x));
      let examples;
      if (verdict === 3) {
        const x1 = samples.find((x) => outcome(x) !== outcome(samples[0])) ?? samples[1];
        examples = [samples[0], x1];
      } else {
        examples = [samples[0], samples[samples.length - 1]];
      }
      const said = ['A is greater', 'B is greater', 'the two are equal'];
      const explanation = verdict === 3
        ? `Test allowed values. ${at(examples[0])}, so ${said[outcome(examples[0])]}. ${at(examples[1])}, so ${said[outcome(examples[1])]}. Different allowed values give different answers, so the relationship cannot be determined.`
        : `Test allowed values across the whole range, including the extremes. ${at(examples[0])}; ${at(examples[1])}. ${verdict === 2 ? 'The two are equal' : `Quantity ${verdict === 0 ? 'A' : 'B'} is greater`} for every value that satisfies ${text}.`;
      return {
        context: text,
        table: qcTable(a, b),
        question: QC_QUESTION,
        explanation,
        solutionSteps: [`Allowed values: ${text}.`, `${at(examples[0])}.`, `${at(examples[1])}.`, `${QC_CHOICES[verdict]}.`],
        method: 'Test the awkward allowed values: fractions, negatives, 1 and large numbers.',
        hints: ['Try a large value and a value close to the edge of what is allowed.', condition === 'posint' ? 'Do not forget x = 1.' : 'Fractions and negatives are where squares, cubes and reciprocals change direction.'],
        commonMistakes: verdict === 3 ? ['Testing a single value and trusting the answer.'] : ['Choosing "cannot be determined" out of habit when an unknown appears.']
      };
    }
  }
];
