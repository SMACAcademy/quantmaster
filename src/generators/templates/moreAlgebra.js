/** Algebra, sequences, sets and logarithms: templates for concepts that had no generator (step 9 of Phase D). */

import { fmt, format, gcd, nearlyEqual, hasAtMostDecimals } from '../core.js';
import { QC_OPTIONS, verdict, rootText, quadText, rootsOf } from './quadComparison.js';

/* -------------------------------- helpers -------------------------------- */

/** An integer as people write it, with a true minus sign. */
const neg = (n) => (n < 0 ? `−${Math.abs(n)}` : String(n));
/** A number in brackets when negative, for substitutions: 3 × (−2). */
const par = (n) => (n < 0 ? `(${neg(n)})` : String(n));
const sgn = (n) => (n < 0 ? '−' : '+');
const signed = (rng, lo, hi, pNeg = 0.5) => rng.int(lo, hi) * (rng.chance(pNeg) ? -1 : 1);
const SUP = { 1: '', 2: '²', 3: '³' };

/** [[coefficient, letter part], …] → "3x² − 2x + 5" (zero terms dropped, 1s hidden). */
function polyText(terms) {
  const parts = [];
  for (const [c, v] of terms) {
    if (c === 0) continue;
    const abs = Math.abs(c);
    const body = v ? `${abs === 1 ? '' : abs}${v}` : String(abs);
    if (!parts.length) parts.push(c < 0 ? `−${body}` : body);
    else parts.push(`${c < 0 ? '−' : '+'} ${body}`);
  }
  return parts.length ? parts.join(' ') : '0';
}
const lin = (a, b, v = 'x') => polyText([[a, v], [b, '']]);
/** A single term such as 4x²y from a coefficient and [letter, power] pairs. */
function mono(coef, factors) {
  const letters = factors.map(([l, p]) => `${l}${SUP[p]}`).join('');
  const abs = Math.abs(coef);
  return `${coef < 0 ? '−' : ''}${abs === 1 ? '' : abs}${letters}`;
}
/** 3 − 5 + 2 from a list of numbers. */
const sumText = (list) => list.map((n, i) => (i === 0 ? neg(n) : `${sgn(n)} ${Math.abs(n)}`)).join(' ');
/** A reduced fraction as text: 7/3, −1/2 or 4. */
function fracText(n, d) {
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d);
  const [p, q] = [n / g, d / g];
  return q === 1 ? neg(p) : `${neg(p)}/${q}`;
}
function parseFrac(text) {
  const m = /^(−?)(\d+)(?:\/(\d+))?$/.exec(text);
  if (!m) return null;
  return [(m[1] ? -1 : 1) * Number(m[2]), m[3] ? Number(m[3]) : 1];
}
const num = (s) => Number(String(s).replace('−', '-'));
function ord(n) {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${tail}`;
}

/**
 * Evaluates the expressions these templates print — 2x² − 7x + 6, 3(√5 + √2)/4,
 * (x − 6)/2, 1/(2x + 6) — so `verify` can check an answer by substituting numbers
 * into its text rather than repeating the algebra that built it.
 */
function evalExpr(text, vars = {}) {
  const src = text.replace(/\s+/g, '');
  let i = 0;
  const peek = () => src[i];
  const startsAtom = (ch) => ch !== undefined && /[0-9.(√a-z]/i.test(ch);
  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '−' || peek() === '-') {
      const op = src[i++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function term() {
    let v = unary();
    for (;;) {
      const ch = peek();
      if (ch === '×') {
        i++;
        v *= unary();
      } else if (ch === '/' || ch === '÷') {
        i++;
        v /= unary();
      } else if (startsAtom(ch)) v *= power();
      else return v;
    }
  }
  function unary() {
    if (peek() === '−' || peek() === '-') {
      i++;
      return -unary();
    }
    return power();
  }
  function power() {
    let v = atom();
    while (peek() === '²' || peek() === '³') v **= src[i++] === '²' ? 2 : 3;
    return v;
  }
  function atom() {
    const ch = peek();
    if (ch === '(') {
      i++;
      const v = expr();
      if (src[i++] !== ')') throw new Error('unclosed bracket');
      return v;
    }
    if (ch === '√') {
      i++;
      return Math.sqrt(atom());
    }
    if (/[0-9.]/.test(ch)) {
      const start = i;
      while (/[0-9.]/.test(src[i] ?? '')) i++;
      return Number(src.slice(start, i));
    }
    if (/[a-z]/i.test(ch ?? '')) {
      i++;
      if (!(ch in vars)) throw new Error(`no value for ${ch}`);
      return vars[ch];
    }
    throw new Error(`unexpected ${ch}`);
  }
  try {
    const v = expr();
    return i === src.length ? v : NaN;
  } catch {
    return NaN;
  }
}

/** Coefficients of a polynomial product, lowest power first. */
function polyMul(p, q) {
  const out = Array(p.length + q.length - 1).fill(0);
  p.forEach((a, i) => q.forEach((b, j) => (out[i + j] += a * b)));
  return out;
}

/** Collect like terms in an expression like "3x²y − 5xy² + 2", by reading its text. */
function collectTerms(text) {
  const totals = new Map();
  for (const m of text.replace(/\s+/g, '').matchAll(/([+−]?)(\d*)([a-z²³]*)/g)) {
    if (!m[2] && !m[3]) continue;
    const coef = (m[1] === '−' ? -1 : 1) * (m[2] ? Number(m[2]) : 1);
    totals.set(m[3], (totals.get(m[3]) || 0) + coef);
  }
  return totals;
}

const isPrime = (n) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
const setText = (list) => `{${list.join(', ')}}`;
const eqText = (a, b, c) => `${polyText([[a, 'x'], [b, 'y']])} = ${neg(c)}`;

/** Simultaneous-equation status found by testing points (an independent route from the ratio test). */
function classifyByPoints(a1, b1, c1, a2, b2, c2) {
  const D = a1 * b2 - a2 * b1;
  if (D !== 0) {
    const x = (c1 * b2 - c2 * b1) / D;
    const y = (a1 * c2 - a2 * c1) / D;
    return nearlyEqual(a1 * x + b1 * y, c1) && nearlyEqual(a2 * x + b2 * y, c2) ? 'one' : 'error';
  }
  const points = b1 !== 0 ? [0, 1].map((x) => [x, (c1 - a1 * x) / b1]) : [0, 1].map((y) => [(c1 - b1 * y) / a1, y]);
  return points.every(([x, y]) => nearlyEqual(a2 * x + b2 * y, c2)) ? 'many' : 'none';
}

/* Quadratic-comparison verdict from the extremes only — a second route to `verdict`. */
function verdictByRange(xs, ys) {
  const same = (a, b) => Math.abs(a - b) < 1e-9;
  const [xMin, xMax, yMin, yMax] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  if (same(xMin, xMax) && same(yMin, yMax) && same(xMin, yMin)) return QC_OPTIONS[4];
  if (xMin > yMax + 1e-9) return QC_OPTIONS[0];
  if (xMax < yMin - 1e-9) return QC_OPTIONS[1];
  if (same(xMin, yMax)) return QC_OPTIONS[2];
  if (same(xMax, yMin)) return QC_OPTIONS[3];
  return QC_OPTIONS[4];
}
const QC_WHY = {
  [QC_OPTIONS[0]]: 'chose "x > y", which needs every x to be strictly above every y',
  [QC_OPTIONS[1]]: 'chose "x < y", which needs every x to be strictly below every y',
  [QC_OPTIONS[2]]: 'chose "x ≥ y", which needs every x to be at least every y',
  [QC_OPTIONS[3]]: 'chose "x ≤ y", which needs every x to be at most every y',
  [QC_OPTIONS[4]]: 'chose "cannot be established", although one fixed relation holds for every pair'
};
function qcValues(rng, count, fractional) {
  const values = [];
  while (values.length < count) {
    const den = fractional ? rng.pick([1, 2, 2, 3]) : 1;
    const v = rng.int(fractional ? -12 : -7, fractional ? 12 : 7) / den;
    if (!values.some((w) => Math.abs(w - v) < 1e-9)) values.push(v);
  }
  return values;
}
function qcParams(rng, fractional) {
  const target = rng.pick(QC_OPTIONS);
  for (let i = 0; i < 80; i++) {
    const nx = fractional ? 2 : rng.int(1, 2);
    const ny = fractional ? 2 : nx === 2 ? 1 : rng.int(1, 2);
    const xs = qcValues(rng, nx, fractional);
    const ys = qcValues(rng, ny, fractional);
    if (rng.chance(0.4)) ys[0] = rng.pick(xs);
    if (new Set(ys.map((v) => v.toFixed(6))).size !== ys.length) continue;
    if (verdict(xs, ys) === target) return { xs, ys };
  }
  return null;
}
function qcRender({ xs, ys }) {
  const answer = verdict(xs, ys);
  const list = (vs, v) => vs.map((t) => `${v} = ${rootText(t)}`).join(' or ');
  const pairs = xs.flatMap((x) => ys.map((y) => `${rootText(x)} ${x > y + 1e-9 ? '>' : x < y - 1e-9 ? '<' : '='} ${rootText(y)}`));
  const why = {
    [QC_OPTIONS[0]]: 'Every value of x is greater than every value of y',
    [QC_OPTIONS[1]]: 'Every value of x is less than every value of y',
    [QC_OPTIONS[2]]: 'Every value of x is at least every value of y, and one pair is equal',
    [QC_OPTIONS[3]]: 'Every value of x is at most every value of y, and one pair is equal',
    [QC_OPTIONS[4]]: xs.length === 1 && ys.length === 1 ? 'x and y are equal' : 'Some pairs have x above y and others have x below (or equal), so no single relation holds'
  }[answer];
  return {
    question: `After solving the two equations, ${list(xs, 'x')}, and ${list(ys, 'y')}. Which relation between x and y is true?`,
    explanation: `Compare every value of x with every value of y: ${pairs.join('; ')}. ${why}, so the answer is "${answer}".`,
    solutionSteps: [`Values of x: ${xs.map(rootText).join(', ')}. Values of y: ${ys.map(rootText).join(', ')}.`, `Pairs: ${pairs.join('; ')}.`, `Answer: ${answer}.`],
    method: 'Check every x against every y; one pair going the other way means "cannot be established".',
    hints: ['Write down every (x, y) pair and compare each one.', 'Use ≥ or ≤ only when one pair is equal and every other pair goes the same way.'],
    commonMistakes: ['Comparing only the largest x with the largest y.', 'Choosing > when one pair is actually equal (that makes it ≥).']
  };
}

/* In-check: a statement about a solution set, turned back into a membership test by reading its words. */
const N_RE = '(−?\\d+)';
function sentencePredicate(text) {
  let m;
  if ((m = new RegExp(`^x can be ${N_RE} or any number (greater|less) than ${N_RE}$`).exec(text))) {
    const c = num(m[1]);
    return m[2] === 'greater' ? (t) => t >= c : (t) => t <= c;
  }
  if ((m = new RegExp(`^x can be any number (greater|less) than ${N_RE}, but not ${N_RE} itself$`).exec(text))) {
    const c = num(m[2]);
    return m[1] === 'greater' ? (t) => t > c : (t) => t < c;
  }
  if ((m = new RegExp(`^x must be exactly ${N_RE}$`).exec(text))) {
    const c = num(m[1]);
    return (t) => t === c;
  }
  if ((m = new RegExp(`^x can be any number between ${N_RE} and ${N_RE}, (.+)$`).exec(text))) {
    const [p, q, rest] = [num(m[1]), num(m[2]), m[3]];
    let lo = false;
    let hi = false;
    if (rest.startsWith('including both')) [lo, hi] = [true, true];
    else if ((m = new RegExp(`^including ${N_RE} but not`).exec(rest))) [lo, hi] = [num(m[1]) === p, num(m[1]) === q];
    else if (!rest.startsWith('but neither')) return null;
    return (t) => (lo ? t >= p : t > p) && (hi ? t <= q : t < q);
  }
  if ((m = /^x can be only the whole numbers (.+)$/.exec(text))) {
    const set = new Set([...m[1].matchAll(/−?\d+/g)].map((x) => num(x[0])));
    return (t) => Number.isInteger(t) && set.has(t);
  }
  if ((m = new RegExp(`^x can be only ${N_RE} or ${N_RE}$`).exec(text))) {
    const [p, q] = [num(m[1]), num(m[2])];
    return (t) => t === p || t === q;
  }
  return null;
}
const oneSided = (c, op) =>
  ({
    '≥': `x can be ${neg(c)} or any number greater than ${neg(c)}`,
    '>': `x can be any number greater than ${neg(c)}, but not ${neg(c)} itself`,
    '≤': `x can be ${neg(c)} or any number less than ${neg(c)}`,
    '<': `x can be any number less than ${neg(c)}, but not ${neg(c)} itself`
  })[op];
function between(p, q, lo, hi) {
  const incl = lo && hi ? `including both ${neg(p)} and ${neg(q)}` : lo ? `including ${neg(p)} but not ${neg(q)}` : hi ? `including ${neg(q)} but not ${neg(p)}` : `but neither ${neg(p)} nor ${neg(q)} itself`;
  return `x can be any number between ${neg(p)} and ${neg(q)}, ${incl}`;
}
const wholeList = (list) => (list.length === 1 ? neg(list[0]) : `${list.slice(0, -1).map(neg).join(', ')} and ${neg(list[list.length - 1])}`);

/* Rationalising: "c(inner)/d" in lowest terms. */
function surdOver(k, inner, D, bracket = true) {
  const g = gcd(k, D);
  const [c, d] = [k / g, D / g];
  const top = c === 1 ? (d === 1 ? inner : bracket ? `(${inner})` : inner) : `${c}${bracket ? `(${inner})` : inner}`;
  return d === 1 ? top : `${top}/${d}`;
}
const denominatorIsRational = (text) => !text.includes('/') || !text.slice(text.lastIndexOf('/') + 1).includes('√');
const NONSQUARES = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15];

const NAMES = [['Neha', 'she'], ['Arun', 'he'], ['Fatima', 'she'], ['Vikram', 'he'], ['Lakshmi', 'she'], ['Joseph', 'he'], ['Priya', 'she'], ['Karthik', 'he']];
const PAIRS = [['Ravi', 'Meena'], ['Arjun', 'Priya'], ['Kavya', 'Rohan'], ['Sana', 'Imran'], ['Divya', 'Karthik'], ['Anil', 'Geeta']];
const SE_CHECK_OPTIONS = ['Yes — both equations hold', 'Only the first equation holds', 'Only the second equation holds', 'Neither equation holds'];
const SE_COUNT_OPTIONS = ['Exactly one solution', 'No solution', 'Infinitely many solutions', 'Exactly two solutions'];

export const moreAlgebraTemplates = [
  /* ========================= algebraic expressions ========================= */
  {
    id: 'ae-terms-like-pick',
    version: 1,
    topicId: 'algebraic-expressions',
    conceptId: 'ae-terms',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ae-liketerms-f'],
    estimatedSeconds: 30,
    params(rng) {
      const [u, v, w] = rng.pick([['x', 'y', 'z'], ['a', 'b', 'c'], ['m', 'n', 'k'], ['p', 'q', 'r']]);
      const [p, q] = rng.pick([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2]]);
      const c = rng.int(2, 9);
      let k = rng.int(2, 12);
      if (k === c) k += 1;
      return { u, v, w, p, q, c, k: rng.chance(0.4) ? -k : k };
    },
    answer: ({ u, v, p, q, k }) => mono(k, [[u, p], [v, q]]),
    distractors: ({ u, v, w, p, q, c }) => [
      { value: mono(c, [[u, q], [v, p]]), why: 'swapped the powers of the two letters' },
      { value: mono(c, [[u, p]]), why: 'matched only the first letter and ignored the second' },
      { value: mono(c, [[u, p], [v, q === 3 ? 1 : q + 1]]), why: 'kept the letters but changed one power' },
      { value: mono(c, [[u, p], [w, q]]), why: 'matched the powers but not the letters' }
    ],
    verify({ u, v, p, q }, value) {
      const m = /^−?\d*([a-z])([²³]?)([a-z])([²³]?)$/.exec(value);
      if (!m) return false;
      const pow = (s) => (s === '²' ? 2 : s === '³' ? 3 : 1);
      return m[1] === u && m[3] === v && pow(m[2]) === p && pow(m[4]) === q;
    },
    render({ u, v, p, q, c, k }) {
      const given = mono(c, [[u, p], [v, q]]);
      const letters = mono(1, [[u, p], [v, q]]);
      const ans = mono(k, [[u, p], [v, q]]);
      const swapped = mono(c, [[u, q], [v, p]]);
      return {
        question: `Which of these is a like term to ${given}?`,
        explanation: `Like terms have exactly the same letters raised to the same powers; only the number in front can differ. ${given} has the letter part ${letters}, and so does ${ans}, so they are like terms. ${swapped} is not: its powers sit on the other letters.`,
        solutionSteps: [`Ignore the number: the letter part of ${given} is ${letters}.`, `Only ${ans} has exactly the letter part ${letters}.`, `Its coefficient, ${neg(k)}, does not matter.`],
        method: 'Compare letters and powers only; ignore the coefficients.',
        hints: ['Ignore the numbers in front and compare only the letters and their powers.', `Look for an option whose letter part is exactly ${letters}.`],
        commonMistakes: [`Choosing ${swapped}: ${letters} and ${mono(1, [[u, q], [v, p]])} are different terms.`, 'Matching only one of the two letters.']
      };
    }
  },

  {
    id: 'ae-terms-count-after',
    version: 1,
    topicId: 'algebraic-expressions',
    conceptId: 'ae-terms',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['ae-liketerms-f'],
    estimatedSeconds: 50,
    tags: ['trap'],
    params(rng) {
      const [u, v] = rng.pick([['x', 'y'], ['a', 'b'], ['m', 'n'], ['p', 'q']]);
      const extra = rng.shuffle([`${u}²`, `${u}${v}`, u, v, '']).slice(0, rng.int(1, 3));
      const kinds = [`${u}²${v}`, `${u}${v}²`, ...extra];
      const terms = [];
      const cancelled = [];
      for (const kind of kinds) {
        const c1 = signed(rng, 1, 9, 0.3);
        if (rng.chance(0.4)) {
          terms.push([c1, kind]);
          continue;
        }
        let c2;
        if (rng.chance(0.3)) {
          c2 = -c1;
          cancelled.push(kind);
        } else {
          c2 = signed(rng, 1, 9, 0.4);
          if (c1 + c2 === 0) c2 += c2 > 0 ? 1 : -1;
        }
        terms.push([c1, kind], [c2, kind]);
      }
      if (terms.length < 4) return null;
      return { u, v, kinds, cancelled, terms: rng.shuffle(terms) };
    },
    answer: ({ kinds, cancelled }) => kinds.length - cancelled.length,
    verify: ({ terms }, value) => [...collectTerms(polyText(terms)).values()].filter((c) => c !== 0).length === value,
    render({ u, v, kinds, terms, cancelled }) {
      const expr = polyText(terms);
      const groups = kinds.map((kind) => {
        const coefs = terms.filter((t) => t[1] === kind).map((t) => t[0]);
        const total = coefs.reduce((s, c) => s + c, 0);
        return { kind, coefs, total, label: kind ? `${kind} terms` : 'number terms' };
      });
      const lines = groups.map((g) => `${g.label}: ${g.coefs.length > 1 ? `${sumText(g.coefs)} = ` : ''}${neg(g.total)}`);
      const simplified = polyText(groups.map((g) => [g.total, g.kind]));
      const left = kinds.length - cancelled.length;
      return {
        question: `After collecting like terms, how many terms are left in ${expr}?`,
        explanation: `Group the terms with exactly the same letter part. ${lines.join('; ')}. ${
          cancelled.length ? `The ${cancelled.map((k) => k || 'number').join(' and ')} terms add to 0 and disappear. ` : ''
        }The simplified expression is ${simplified}, which has ${left} term${left === 1 ? '' : 's'}. Note that ${u}²${v} and ${u}${v}² are not like terms.`,
        solutionSteps: [...lines.map((l) => `${l}.`), `Simplified: ${simplified} — ${left} term${left === 1 ? '' : 's'}.`],
        method: 'Group terms with identical letters and powers, add their coefficients, and drop any group that totals 0.',
        hints: ['Group terms with exactly the same letters and powers.', `${u}²${v} and ${u}${v}² are different terms — the square sits on a different letter.`, 'A group whose coefficients add to 0 leaves no term.'],
        commonMistakes: [`Treating ${u}²${v} and ${u}${v}² as like terms.`, 'Counting a group whose coefficients add to 0 as a term.']
      };
    }
  },

  {
    id: 'ae-expand-single-bracket',
    version: 1,
    topicId: 'algebraic-expressions',
    conceptId: 'ae-expand',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ae-distribute-f'],
    estimatedSeconds: 30,
    params(rng) {
      const k = signed(rng, 2, 9, 0.4);
      const a = rng.int(2, 9);
      const b = signed(rng, 1, 12);
      if (a + k === 0) return null;
      return { k, a, b };
    },
    answer: ({ k, a, b }) => lin(k * a, k * b),
    distractors: ({ k, a, b }) => [
      { value: lin(k * a, b), why: 'multiplied only the first term inside the bracket' },
      { value: lin(a, k * b), why: 'multiplied only the second term inside the bracket' },
      { value: lin(k * a, -k * b), why: 'got the sign of the second term wrong' },
      { value: lin(k + a, k * b), why: 'added the outside number to the x-coefficient instead of multiplying' }
    ],
    verify: ({ k, a, b }, value) => [0, 1, 2, -3].every((t) => nearlyEqual(evalExpr(value, { x: t }), k * (a * t + b))),
    render({ k, a, b }) {
      const expr = `${neg(k)}(${lin(a, b)})`;
      const ans = lin(k * a, k * b);
      return {
        question: `What is ${expr} equal to?`,
        explanation: `Multiply each term inside the bracket by ${neg(k)}: ${neg(k)} × ${a}x = ${polyText([[k * a, 'x']])} and ${neg(k)} × ${par(b)} = ${neg(k * b)}. So ${expr} = ${ans}.`,
        solutionSteps: [`${neg(k)} × ${a}x = ${polyText([[k * a, 'x']])}.`, `${neg(k)} × ${par(b)} = ${neg(k * b)}.`, `${expr} = ${ans}.`],
        method: 'Multiply the outside number by every term inside the bracket, keeping signs.',
        hints: [`Multiply ${neg(k)} by both terms inside the bracket, not just the first.`, k < 0 ? `A negative number outside changes the sign of every term inside: ${neg(k)} × ${par(b)} = ${neg(k * b)}.` : `Keep the sign of ${neg(b)} when you multiply it by ${k}.`],
        commonMistakes: ['Multiplying only the first term in the bracket.', 'Losing a sign when the number outside is negative.']
      };
    }
  },

  {
    id: 'ae-expand-two-brackets',
    version: 1,
    topicId: 'algebraic-expressions',
    conceptId: 'ae-expand',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ae-distribute-f', 'ae-sc-check-value'],
    estimatedSeconds: 50,
    params(rng) {
      const p = rng.pick([1, 1, 2, 3]);
      const m = signed(rng, 1, 9);
      const n = signed(rng, 1, 9);
      if (p * n + m === 0 || (p === 1 && m === n)) return null;
      return { p, m, n };
    },
    answer: ({ p, m, n }) => polyText([[p, 'x²'], [p * n + m, 'x'], [m * n, '']]),
    distractors: ({ p, m, n }) => [
      { value: polyText([[p, 'x²'], [m * n, '']]), why: 'multiplied only first × first and last × last, missing the middle term' },
      { value: polyText([[p, 'x²'], [p * n + m, 'x'], [-m * n, '']]), why: 'got the sign of the constant term wrong' },
      { value: polyText([[p, 'x²'], [m + n, 'x'], [m * n, '']]), why: 'added the two constants for the middle term without multiplying by the x-coefficient' },
      { value: polyText([[p, 'x²'], [p * n + m, 'x'], [m + n, '']]), why: 'added the constants instead of multiplying them' }
    ],
    verify: ({ p, m, n }, value) => [0, 1, 2, -1, 3].every((t) => nearlyEqual(evalExpr(value, { x: t }), (p * t + m) * (t + n))),
    render({ p, m, n }) {
      const one = lin(p, m);
      const two = lin(1, n);
      const ans = polyText([[p, 'x²'], [p * n + m, 'x'], [m * n, '']]);
      return {
        question: `What is (${one})(${two}) equal to?`,
        explanation: `Multiply every term of the first bracket by every term of the second. First: ${polyText([[p, 'x']])} × x = ${polyText([[p, 'x²']])}. Outer and inner: ${polyText([[p, 'x']])} × ${par(n)} = ${polyText([[p * n, 'x']])} and ${neg(m)} × x = ${polyText([[m, 'x']])}, which combine to ${polyText([[p * n + m, 'x']])}. Last: ${neg(m)} × ${par(n)} = ${neg(m * n)}. So the product is ${ans}.`,
        solutionSteps: [
          `${polyText([[p, 'x']])} × x = ${polyText([[p, 'x²']])}.`,
          `${polyText([[p * n, 'x']])} + ${polyText([[m, 'x']]).replace('−', '(−') + (m < 0 ? ')' : '')} = ${polyText([[p * n + m, 'x']])}.`,
          `${neg(m)} × ${par(n)} = ${neg(m * n)}.`,
          `Answer: ${ans}. Check with x = 1: ${neg(p + m)} × ${par(1 + n)} = ${neg((p + m) * (1 + n))}, and ${p} ${sgn(p * n + m)} ${Math.abs(p * n + m)} ${sgn(m * n)} ${Math.abs(m * n)} gives the same.`
        ],
        method: 'Multiply each term in the first bracket by each term in the second, then collect like terms.',
        hints: ['There are four products: first, outer, inner, last.', `The two x-terms are ${polyText([[p * n, 'x']])} and ${polyText([[m, 'x']])}; add them.`, 'Check your answer by putting x = 1 into both forms.'],
        commonMistakes: ['Forgetting the middle (x) term.', 'Getting the sign of the constant wrong when one number is negative.']
      };
    }
  },

  /* ============================ algebraic identities ============================ */
  {
    id: 'ai-cube-coefficient',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-cubes',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ai-cubes-f'],
    estimatedSeconds: 40,
    params(rng) {
      const a = rng.pick([1, 1, 2, 3]);
      const k = rng.int(1, 6);
      if (a === 1 && k === 1) return null;
      return { a, k, which: rng.pick(['x²', 'x']) };
    },
    answer: ({ a, k, which }) => (which === 'x²' ? 3 * a * a * k : 3 * a * k * k),
    formatValue: (value) => fmt(value),
    distractors: ({ a, k, which }) =>
      which === 'x²'
        ? [
            { value: a * a * k, why: 'dropped the factor 3' },
            { value: 3 * a * k * k, why: 'gave the coefficient of x instead of x²' },
            { value: 2 * a * k, why: 'used the square identity (a + b)² instead of the cube' },
            { value: 3 * a * k, why: 'forgot to square the x-coefficient' },
            { value: k ** 3, why: 'gave the constant term' },
            { value: a ** 3, why: 'gave the coefficient of x³' }
          ]
        : [
            { value: a * k * k, why: 'dropped the factor 3' },
            { value: 3 * a * a * k, why: 'gave the coefficient of x² instead of x' },
            { value: 3 * a * k, why: 'forgot to square the constant' },
            { value: k ** 3, why: 'gave the constant term' },
            { value: 2 * a * k, why: 'used the square identity (a + b)² instead of the cube' }
          ],
    verify: ({ a, k, which }, value) => {
      const cube = polyMul(polyMul([k, a], [k, a]), [k, a]);
      return cube[which === 'x²' ? 2 : 1] === value;
    },
    render({ a, k, which }) {
      const A = polyText([[a, 'x']]);
      const expansion = polyText([[a ** 3, 'x³'], [3 * a * a * k, 'x²'], [3 * a * k * k, 'x'], [k ** 3, '']]);
      const term =
        which === 'x²'
          ? `3 × (${A})² × ${k} = 3 × ${polyText([[a * a, 'x²']])} × ${k} = ${polyText([[3 * a * a * k, 'x²']])}`
          : `3 × ${A} × ${k}² = 3 × ${A} × ${k * k} = ${polyText([[3 * a * k * k, 'x']])}`;
      const ans = which === 'x²' ? 3 * a * a * k : 3 * a * k * k;
      return {
        question: `In the expansion of (${lin(a, k)})³, what is the coefficient of ${which}?`,
        explanation: `Use (A + B)³ = A³ + 3A²B + 3AB² + B³ with A = ${A} and B = ${k}. The ${which} term is ${term}, so the coefficient is ${ans}. In full, (${lin(a, k)})³ = ${expansion}.`,
        solutionSteps: [`A = ${A}, B = ${k}.`, `The ${which} term is ${which === 'x²' ? '3A²B' : '3AB²'}: ${term}.`, `Full expansion: ${expansion}.`],
        method: '(a + b)³ = a³ + 3a²b + 3ab² + b³.',
        hints: ['A cube expands to four terms, with coefficients 1, 3, 3, 1.', `The ${which} term comes from ${which === 'x²' ? '3A²B' : '3AB²'} with A = ${A} and B = ${k}.`],
        commonMistakes: ['Forgetting the factor 3 in the middle terms.', 'Mixing up 3A²B and 3AB².']
      };
    }
  },

  {
    id: 'ai-cube-from-sum-product',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-cubes',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ai-cubes-f'],
    estimatedSeconds: 60,
    params(rng) {
      const a = rng.int(2, 12);
      const b = rng.int(1, a - 1);
      return { a, b, mode: rng.pick(['sum', 'diff']) };
    },
    answer: ({ a, b, mode }) => (mode === 'sum' ? (a + b) ** 3 - 3 * a * b * (a + b) : (a - b) ** 3 + 3 * a * b * (a - b)),
    formatValue: (value) => fmt(value),
    distractors: ({ a, b, mode }) => {
      const p = a * b;
      if (mode === 'sum') {
        const s = a + b;
        return [
          { value: s ** 3, why: 'cubed the sum and forgot the 3xy(x + y) part' },
          { value: s ** 3 + 3 * p * s, why: 'added 3xy(x + y) instead of subtracting it' },
          { value: s ** 3 - 3 * p, why: 'forgot to multiply 3xy by (x + y)' },
          { value: s ** 3 - p * s, why: 'dropped the factor 3' }
        ];
      }
      const d = a - b;
      return [
        { value: d ** 3, why: 'cubed the difference and forgot the 3xy(x − y) part' },
        { value: d ** 3 - 3 * p * d, why: 'subtracted 3xy(x − y) instead of adding it' },
        { value: d ** 3 + 3 * p, why: 'forgot to multiply 3xy by (x − y)' },
        { value: d ** 3 + p * d, why: 'dropped the factor 3' }
      ];
    },
    verify: ({ a, b, mode }, value) => (mode === 'sum' ? a ** 3 + b ** 3 : a ** 3 - b ** 3) === value,
    render({ a, b, mode }) {
      const p = a * b;
      if (mode === 'sum') {
        const s = a + b;
        const ans = s ** 3 - 3 * p * s;
        return {
          question: `If x + y = ${s} and xy = ${p}, what is x³ + y³?`,
          explanation: `(x + y)³ = x³ + y³ + 3xy(x + y), so x³ + y³ = (x + y)³ − 3xy(x + y) = ${s}³ − 3 × ${p} × ${s} = ${fmt(s ** 3)} − ${fmt(3 * p * s)} = ${fmt(ans)}.`,
          solutionSteps: [`(x + y)³ = ${s}³ = ${fmt(s ** 3)}.`, `3xy(x + y) = 3 × ${p} × ${s} = ${fmt(3 * p * s)}.`, `x³ + y³ = ${fmt(s ** 3)} − ${fmt(3 * p * s)} = ${fmt(ans)}.`],
          method: 'Rearrange (x + y)³ = x³ + y³ + 3xy(x + y).',
          hints: ['Write (x + y)³ in the form x³ + y³ + 3xy(x + y).', `So x³ + y³ = ${s}³ − 3 × ${p} × ${s}.`],
          commonMistakes: ['Stopping at (x + y)³.', 'Adding 3xy(x + y) instead of subtracting it.']
        };
      }
      const d = a - b;
      const ans = d ** 3 + 3 * p * d;
      return {
        question: `If x − y = ${d} and xy = ${p}, what is x³ − y³?`,
        explanation: `(x − y)³ = x³ − y³ − 3xy(x − y), so x³ − y³ = (x − y)³ + 3xy(x − y) = ${d}³ + 3 × ${p} × ${d} = ${fmt(d ** 3)} + ${fmt(3 * p * d)} = ${fmt(ans)}.`,
        solutionSteps: [`(x − y)³ = ${d}³ = ${fmt(d ** 3)}.`, `3xy(x − y) = 3 × ${p} × ${d} = ${fmt(3 * p * d)}.`, `x³ − y³ = ${fmt(d ** 3)} + ${fmt(3 * p * d)} = ${fmt(ans)}.`],
        method: 'Rearrange (x − y)³ = x³ − y³ − 3xy(x − y).',
        hints: ['Write (x − y)³ in the form x³ − y³ − 3xy(x − y).', `So x³ − y³ = ${d}³ + 3 × ${p} × ${d}.`],
        commonMistakes: ['Stopping at (x − y)³.', 'Subtracting 3xy(x − y) instead of adding it.']
      };
    }
  },

  {
    id: 'ai-sumdiffcubes-factor',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-sumdiffcubes',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ai-sumdiffcubes-f'],
    estimatedSeconds: 50,
    params(rng) {
      const a = rng.pick([1, 1, 2, 3]);
      const k = rng.int(1, 6);
      if (gcd(a, k) !== 1) return null;
      return { a, k, s: rng.chance(0.5) ? 1 : -1, L: rng.pick(['x', 'y', 'm', 'p']) };
    },
    answer: ({ a, k, s, L }) => `(${lin(a, s * k, L)})(${polyText([[a * a, `${L}²`], [-s * a * k, L], [k * k, '']])})`,
    distractors: ({ a, k, s, L }) => [
      { value: `(${lin(a, s * k, L)})(${polyText([[a * a, `${L}²`], [s * a * k, L], [k * k, '']])})`, why: 'used the wrong sign for the middle term of the quadratic factor' },
      { value: `(${lin(a, -s * k, L)})(${polyText([[a * a, `${L}²`], [s * a * k, L], [k * k, '']])})`, why: s > 0 ? 'factorised it as a difference of cubes' : 'factorised it as a sum of cubes' },
      { value: `(${lin(a, s * k, L)})³`, why: s > 0 ? 'treated a³ + b³ as (a + b)³' : 'treated a³ − b³ as (a − b)³' },
      { value: `(${lin(a, s * k, L)})(${polyText([[a * a, `${L}²`], [-s * 2 * a * k, L], [k * k, '']])})`, why: 'used 2ab for the middle term, as in a square' }
    ],
    verify: ({ a, k, s, L }, value) => [1, 2, 3, -2].every((t) => nearlyEqual(evalExpr(value, { [L]: t }), a ** 3 * t ** 3 + s * k ** 3)),
    render({ a, k, s, L }) {
      const expr = polyText([[a ** 3, `${L}³`], [s * k ** 3, '']]);
      const A = polyText([[a, L]]);
      const ans = `(${lin(a, s * k, L)})(${polyText([[a * a, `${L}²`], [-s * a * k, L], [k * k, '']])})`;
      const rule = s > 0 ? 'a³ + b³ = (a + b)(a² − ab + b²)' : 'a³ − b³ = (a − b)(a² + ab + b²)';
      return {
        question: `Factorise ${expr}.`,
        explanation: `${expr} = (${A})³ ${s > 0 ? '+' : '−'} ${k}³. Use ${rule} with a = ${A} and b = ${k}: a² = ${polyText([[a * a, `${L}²`]])}, ab = ${polyText([[a * k, L]])}, b² = ${k * k}. So ${expr} = ${ans}.`,
        solutionSteps: [`Write both parts as cubes: (${A})³ and ${k}³.`, `a² = ${polyText([[a * a, `${L}²`]])}, ab = ${polyText([[a * k, L]])}, b² = ${k * k}.`, `${expr} = ${ans}.`],
        method: s > 0 ? 'Sum of cubes: (a + b)(a² − ab + b²).' : 'Difference of cubes: (a − b)(a² + ab + b²).',
        hints: [`${expr} is a ${s > 0 ? 'sum' : 'difference'} of two cubes: (${A})³ and ${k}³.`, `The linear factor carries the same sign as the original (${s > 0 ? '+' : '−'}); the middle term of the quadratic factor has the opposite sign.`],
        commonMistakes: ['Using the same sign in both factors.', 'Writing 2ab instead of ab in the quadratic factor.']
      };
    }
  },

  {
    id: 'ai-sumdiffcubes-value',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-sumdiffcubes',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ai-squares-f', 'ai-sumdiffcubes-f'],
    estimatedSeconds: 75,
    params(rng) {
      const a = rng.int(2, 12);
      const b = rng.int(1, a - 1);
      return { a, b, mode: rng.pick(['sum', 'diff']) };
    },
    answer: ({ a, b, mode }) => {
      const q = a * a + b * b;
      if (mode === 'sum') return (a + b) * (q - ((a + b) ** 2 - q) / 2);
      return (a - b) * (q + (q - (a - b) ** 2) / 2);
    },
    formatValue: (value) => fmt(value),
    distractors: ({ a, b, mode }) => {
      const q = a * a + b * b;
      const p = a * b;
      if (mode === 'sum') {
        const s = a + b;
        return [
          { value: s * q, why: 'forgot to subtract xy' },
          { value: s * (q + p), why: 'used + xy, the sign from the difference of cubes' },
          { value: s ** 3, why: 'cubed the sum instead' },
          { value: s * (q - 2 * p), why: 'subtracted 2xy instead of xy' }
        ];
      }
      const d = a - b;
      return [
        { value: d * q, why: 'forgot to add xy' },
        { value: d * (q - p), why: 'used − xy, the sign from the sum of cubes' },
        { value: d ** 3, why: 'cubed the difference instead' },
        { value: d * (q + 2 * p), why: 'added 2xy instead of xy' }
      ];
    },
    verify: ({ a, b, mode }, value) => (mode === 'sum' ? a ** 3 + b ** 3 : a ** 3 - b ** 3) === value,
    render({ a, b, mode }) {
      const q = a * a + b * b;
      const p = a * b;
      if (mode === 'sum') {
        const s = a + b;
        const ans = s * (q - p);
        return {
          question: `If x + y = ${s} and x² + y² = ${q}, what is x³ + y³?`,
          explanation: `First find xy: (x + y)² = x² + 2xy + y², so ${s * s} = ${q} + 2xy and xy = (${s * s} − ${q}) ÷ 2 = ${p}. Then x³ + y³ = (x + y)(x² − xy + y²) = ${s} × (${q} − ${p}) = ${s} × ${q - p} = ${fmt(ans)}.`,
          solutionSteps: [`${s}² = ${q} + 2xy, so xy = ${p}.`, `x² − xy + y² = ${q} − ${p} = ${q - p}.`, `x³ + y³ = ${s} × ${q - p} = ${fmt(ans)}.`],
          method: 'Find xy from (x + y)², then use a³ + b³ = (a + b)(a² − ab + b²).',
          hints: [`Use (x + y)² = x² + 2xy + y² to find xy.`, `x³ + y³ = (x + y)(x² − xy + y²) = ${s} × (${q} − xy).`],
          commonMistakes: ['Using x² + y² directly without subtracting xy.', 'Using + xy (the difference-of-cubes sign).']
        };
      }
      const d = a - b;
      const ans = d * (q + p);
      return {
        question: `If x − y = ${d} and x² + y² = ${q}, what is x³ − y³?`,
        explanation: `First find xy: (x − y)² = x² − 2xy + y², so ${d * d} = ${q} − 2xy and xy = (${q} − ${d * d}) ÷ 2 = ${p}. Then x³ − y³ = (x − y)(x² + xy + y²) = ${d} × (${q} + ${p}) = ${d} × ${q + p} = ${fmt(ans)}.`,
        solutionSteps: [`${d}² = ${q} − 2xy, so xy = ${p}.`, `x² + xy + y² = ${q} + ${p} = ${q + p}.`, `x³ − y³ = ${d} × ${q + p} = ${fmt(ans)}.`],
        method: 'Find xy from (x − y)², then use a³ − b³ = (a − b)(a² + ab + b²).',
        hints: [`Use (x − y)² = x² − 2xy + y² to find xy.`, `x³ − y³ = (x − y)(x² + xy + y²) = ${d} × (${q} + xy).`],
        commonMistakes: ['Using x² + y² directly without adding xy.', 'Using − xy (the sum-of-cubes sign).']
      };
    }
  },

  /* ============================ arithmetic progression ============================ */
  {
    id: 'ap-recognise-check',
    version: 1,
    topicId: 'arithmetic-progression',
    conceptId: 'ap-recognise',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ap-nth'],
    estimatedSeconds: 35,
    params(rng) {
      const kind = rng.pick(['inc', 'inc', 'dec', 'gp', 'growing', 'onegap']);
      let terms;
      let r = null;
      if (kind === 'inc') {
        const [a, d] = [rng.int(1, 30), rng.int(2, 9)];
        terms = [0, 1, 2, 3].map((i) => a + i * d);
      } else if (kind === 'dec') {
        const [a, d] = [rng.int(40, 80), -rng.int(2, 9)];
        terms = [0, 1, 2, 3].map((i) => a + i * d);
      } else if (kind === 'gp') {
        const g = rng.int(1, 5);
        r = rng.int(2, 3);
        terms = [0, 1, 2, 3].map((i) => g * r ** i);
      } else if (kind === 'growing') {
        const [b, e] = [rng.int(1, 20), rng.int(2, 6)];
        terms = [b, b + e, b + 2 * e + 1, b + 3 * e + 3];
      } else {
        const [c, f] = [rng.int(1, 20), rng.int(2, 9)];
        const j = signed(rng, 1, 3);
        terms = rng.chance(0.5) ? [c, c + f, c + 2 * f, c + 3 * f + j] : [c, c + f, c + 2 * f + j, c + 3 * f + j];
      }
      return { kind, terms, r };
    },
    answer: ({ terms }) => {
      const gaps = [1, 2, 3].map((i) => terms[i] - terms[i - 1]);
      return gaps.every((g) => g === gaps[0]) ? `Yes — the common difference is ${neg(gaps[0])}` : 'No — it is not an arithmetic progression';
    },
    distractors: ({ kind, terms, r }) => {
      const YES = (d) => `Yes — the common difference is ${neg(d)}`;
      const gaps = [1, 2, 3].map((i) => terms[i] - terms[i - 1]);
      const span = terms[3] - terms[0];
      if (kind === 'inc' || kind === 'dec') {
        return [
          { value: YES(-gaps[0]), why: 'subtracted each term from the one before it, which flips the sign' },
          { value: 'No — it is not an arithmetic progression', why: kind === 'dec' ? 'thought an AP must increase' : 'expected a constant ratio instead of a constant difference' },
          { value: YES(span), why: 'took the difference between the first and last terms shown' },
          { value: YES(terms[0]), why: 'gave the first term instead of the difference' }
        ];
      }
      return [
        ...(r ? [{ value: YES(r), why: 'confused the common ratio with a common difference' }] : []),
        { value: YES(gaps[0]), why: 'checked only the first gap' },
        { value: YES(gaps[2]), why: 'checked only the last gap' },
        { value: YES(gaps[1]), why: 'checked only the middle gap' },
        { value: YES(span), why: 'took the difference between the first and last terms shown' }
      ];
    },
    verify: ({ terms: t }, value) => {
      const isAP = 2 * t[1] === t[0] + t[2] && 2 * t[2] === t[1] + t[3];
      return value === (isAP ? `Yes — the common difference is ${neg((t[3] - t[0]) / 3)}` : 'No — it is not an arithmetic progression');
    },
    render({ kind, terms, r }) {
      const gaps = [1, 2, 3].map((i) => terms[i] - terms[i - 1]);
      const same = gaps.every((g) => g === gaps[0]);
      return {
        question: `Is ${terms.join(', ')}, … an arithmetic progression?`,
        explanation: same
          ? `The gaps between consecutive terms (later term minus earlier term) are ${gaps.map(neg).join(', ')} — all equal — so it is an AP with common difference ${neg(gaps[0])}.`
          : `The gaps between consecutive terms are ${gaps.map(neg).join(', ')}. They are not all equal, so it is not an AP${kind === 'gp' ? ` (each term is ${r} times the one before, which makes it a GP)` : ''}.`,
        solutionSteps: [1, 2, 3].map((i) => `${terms[i]} − ${terms[i - 1]} = ${neg(gaps[i - 1])}.`).concat(same ? `All gaps equal ${neg(gaps[0])}: an AP.` : 'The gaps differ: not an AP.'),
        method: 'Check every gap, not just the first: an AP has one constant difference.',
        hints: ['Subtract each term from the next one.', 'Every gap must be the same — check all three.'],
        commonMistakes: ['Checking only the first gap.', 'Taking the difference as earlier minus later, which flips its sign.']
      };
    }
  },

  {
    id: 'ap-recognise-find-k',
    version: 1,
    topicId: 'arithmetic-progression',
    conceptId: 'ap-recognise',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['ap-nth'],
    estimatedSeconds: 60,
    params(rng) {
      const [p1, p2, p3] = [rng.int(1, 5), rng.int(1, 5), rng.int(1, 5)];
      if (2 * p2 - p1 - p3 === 0) return null;
      const k0 = rng.int(1, 9);
      const q1 = rng.int(-9, 9);
      const q2 = rng.int(-9, 9);
      const q3 = 2 * (p2 * k0 + q2) - (p1 * k0 + q1) - p3 * k0;
      if (Math.abs(q3) > 30 || p2 * k0 + q2 === p1 * k0 + q1) return null;
      return { p1, p2, p3, q1, q2, q3, k0 };
    },
    answer: ({ p1, p2, p3, q1, q2, q3 }) => (q1 + q3 - 2 * q2) / (2 * p2 - p1 - p3),
    verify: ({ p1, p2, p3, q1, q2, q3 }, value) => {
      const t = [p1 * value + q1, p2 * value + q2, p3 * value + q3];
      return t[1] - t[0] === t[2] - t[1];
    },
    render({ p1, p2, p3, q1, q2, q3, k0 }) {
      const T = [lin(p1, q1, 'k'), lin(p2, q2, 'k'), lin(p3, q3, 'k')];
      const den = 2 * p2 - p1 - p3;
      const rhs = q1 + q3 - 2 * q2;
      const v = [p1 * k0 + q1, p2 * k0 + q2, p3 * k0 + q3];
      return {
        question: `For what value of k are ${T[0]}, ${T[1]} and ${T[2]} consecutive terms of an arithmetic progression?`,
        explanation: `In an AP the middle term is the average of its neighbours, so 2(${T[1]}) = (${T[0]}) + (${T[2]}). That is ${lin(2 * p2, 2 * q2, 'k')} = ${lin(p1 + p3, q1 + q3, 'k')}, so ${polyText([[den, 'k']])} = ${neg(rhs)} and k = ${k0}. Check: the terms become ${v.map(neg).join(', ')}, with common difference ${neg(v[1] - v[0])}.`,
        solutionSteps: [`2(${T[1]}) = (${T[0]}) + (${T[2]}).`, `${lin(2 * p2, 2 * q2, 'k')} = ${lin(p1 + p3, q1 + q3, 'k')}.`, `${polyText([[den, 'k']])} = ${neg(rhs)}, so k = ${k0}.`, `Terms: ${v.map(neg).join(', ')}.`],
        method: 'Three numbers a, b, c are in AP exactly when 2b = a + c.',
        hints: ['In an AP the gap from the first term to the second equals the gap from the second to the third.', `So 2 × (${T[1]}) = (${T[0]}) + (${T[2]}).`],
        commonMistakes: ['Setting the first gap equal to the third term instead of the second gap.', 'Forgetting to double the middle term.']
      };
    }
  },

  {
    id: 'ap-sum-first-n',
    version: 1,
    topicId: 'arithmetic-progression',
    conceptId: 'ap-sum',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['ap-sum-formula'],
    estimatedSeconds: 45,
    params(rng) {
      return { a: rng.int(1, 20), d: rng.int(1, 9), n: rng.int(8, 30) };
    },
    answer: ({ a, d, n }) => (n / 2) * (2 * a + (n - 1) * d),
    verify: ({ a, d, n }, value) => {
      let total = 0;
      for (let i = 0; i < n; i++) total += a + i * d;
      return total === value;
    },
    render({ a, d, n }) {
      const inner = 2 * a + (n - 1) * d;
      const S = (n / 2) * inner;
      const last = a + (n - 1) * d;
      return {
        question: `What is the sum of the first ${n} terms of the AP ${a}, ${a + d}, ${a + 2 * d}, …?`,
        explanation: `Here a = ${a}, d = ${d} and n = ${n}. Sₙ = n/2 × [2a + (n − 1)d] = ${n}/2 × [${2 * a} + ${n - 1} × ${d}] = ${n}/2 × ${inner} = ${fmt(S)}. (The last term is ${last}, and ${n}/2 × (${a} + ${last}) gives the same.)`,
        solutionSteps: [`a = ${a}, d = ${d}, n = ${n}.`, `2a + (n − 1)d = ${2 * a} + ${(n - 1) * d} = ${inner}.`, `Sₙ = ${n}/2 × ${inner} = ${fmt(S)}.`],
        method: 'Sₙ = n/2 × [2a + (n − 1)d].',
        hints: [`The common difference is ${a + d} − ${a} = ${d}.`, `Use n − 1 = ${n - 1}, not n, inside the bracket.`],
        commonMistakes: ['Using n instead of n − 1 in the formula.', 'Forgetting to halve.']
      };
    }
  },

  {
    id: 'ap-sum-series-to-last',
    version: 1,
    topicId: 'arithmetic-progression',
    conceptId: 'ap-sum',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ap-sum-formula', 'ap-count-formula'],
    estimatedSeconds: 60,
    params(rng) {
      return { a: rng.int(1, 20), d: rng.int(2, 9), n: rng.int(10, 30) };
    },
    answer: ({ a, d, n }) => (n * (2 * a + (n - 1) * d)) / 2,
    formatValue: (value) => fmt(value),
    distractors: ({ a, d, n }) => {
      const l = a + (n - 1) * d;
      const int = (v) => (Number.isInteger(v) ? v : null);
      return [
        { value: int(((n - 1) * (a + l)) / 2), why: 'counted the terms as (last − first) ÷ d, forgetting to add 1' },
        { value: n * (a + l), why: 'forgot to halve' },
        { value: int(((n + 1) * (a + l)) / 2), why: 'counted one term too many' },
        { value: n * l, why: 'multiplied the last term by the number of terms' }
      ];
    },
    verify: ({ a, d, n }, value) => {
      const l = a + (n - 1) * d;
      let total = 0;
      for (let t = a; t <= l; t += d) total += t;
      return total === value;
    },
    render({ a, d, n }) {
      const l = a + (n - 1) * d;
      const S = (n * (a + l)) / 2;
      return {
        question: `What is the value of ${a} + ${a + d} + ${a + 2 * d} + … + ${l}?`,
        explanation: `This is an AP with first term ${a}, common difference ${d} and last term ${l}. Number of terms = (${l} − ${a}) ÷ ${d} + 1 = ${(l - a) / d} + 1 = ${n}. Sum = n/2 × (first + last) = ${n}/2 × (${a} + ${l}) = ${fmt(S)}.`,
        solutionSteps: [`d = ${d}.`, `n = (${l} − ${a}) ÷ ${d} + 1 = ${n}.`, `Sum = ${n}/2 × ${a + l} = ${fmt(S)}.`],
        method: 'Count the terms with n = (l − a) ÷ d + 1, then Sum = n/2 × (first + last).',
        hints: ['First find how many terms there are.', `n = (${l} − ${a}) ÷ ${d} + 1.`],
        commonMistakes: ['Forgetting the + 1 when counting terms.', 'Forgetting to halve n × (first + last).']
      };
    }
  },

  {
    id: 'ap-app-two-terms-first',
    version: 1,
    topicId: 'arithmetic-progression',
    conceptId: 'ap-applications',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ap-nth'],
    estimatedSeconds: 60,
    params(rng) {
      const a = rng.int(1, 30);
      const d = rng.int(2, 9);
      const p = rng.int(3, 8);
      const q = p + rng.int(2, 8);
      return { a, d, p, q, X: a + (p - 1) * d, Y: a + (q - 1) * d };
    },
    answer: ({ X, Y, p, q }) => X - (p - 1) * ((Y - X) / (q - p)),
    formatValue: (value) => fmt(value),
    distractors: ({ a, d, X }) => [
      { value: d, why: 'gave the common difference instead of the first term' },
      { value: a - d, why: 'went back p steps instead of p − 1' },
      { value: a + d, why: 'went back only p − 2 steps' },
      { value: X - d, why: 'went back only one step' }
    ],
    verify: ({ X, Y, p, q }, value) => value + ((p - 1) * (Y - value)) / (q - 1) === X,
    render({ a, d, p, q, X, Y }) {
      return {
        question: `The ${ord(p)} term of an AP is ${X} and the ${ord(q)} term is ${Y}. What is the first term?`,
        explanation: `From the ${ord(p)} term to the ${ord(q)} term is ${q - p} steps of d, so ${q - p}d = ${Y} − ${X} = ${Y - X} and d = ${d}. The ${ord(p)} term is a + ${p - 1}d, so a = ${X} − ${p - 1} × ${d} = ${a}.`,
        solutionSteps: [`${q - p}d = ${Y - X}, so d = ${d}.`, `a + ${p - 1}d = ${X}.`, `a = ${X} − ${(p - 1) * d} = ${a}.`],
        method: 'Subtract the two terms to find d, then step back to the first term.',
        hints: [`Between term ${p} and term ${q} there are ${q - p} common differences.`, `The ${ord(p)} term is a + ${p - 1}d.`],
        commonMistakes: [`Going back ${p} steps instead of ${p - 1}.`, 'Giving d instead of a.']
      };
    }
  },

  {
    id: 'ap-app-growing-total',
    version: 1,
    topicId: 'arithmetic-progression',
    conceptId: 'ap-applications',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ap-sum-formula', 'ap-nth'],
    estimatedSeconds: 60,
    params(rng) {
      const ctx = rng.pick(['savings', 'seats', 'pages']);
      const name = rng.pick(PAIRS)[rng.int(0, 1)];
      if (ctx === 'savings') return { ctx, name, a: rng.int(2, 10) * 50, d: rng.int(2, 10) * 10, n: rng.int(6, 15) };
      if (ctx === 'seats') return { ctx, name, a: rng.int(10, 30), d: rng.int(1, 4), n: rng.int(8, 25) };
      return { ctx, name, a: rng.int(5, 20), d: rng.int(1, 5), n: rng.int(5, 15) };
    },
    answer: ({ a, d, n }) => (n * (2 * a + (n - 1) * d)) / 2,
    formatValue: (value, { ctx }) => (ctx === 'savings' ? format.rupees(value) : fmt(value)),
    distractors: ({ a, d, n, ctx }) => {
      const last = a + (n - 1) * d;
      const unit = { savings: 'month', seats: 'row', pages: 'day' }[ctx];
      const alt = (n * (2 * a + n * d)) / 2;
      return [
        { value: n * last, why: 'multiplied the last term by the number of terms' },
        { value: last, why: `gave only the last ${unit}'s amount` },
        { value: Number.isInteger(alt) ? alt : null, why: 'used n instead of n − 1 in the formula' },
        { value: n * a, why: 'ignored the increase' }
      ];
    },
    verify: ({ a, d, n }, value) => {
      let total = 0;
      let current = a;
      for (let i = 0; i < n; i++) {
        total += current;
        current += d;
      }
      return total === value;
    },
    render({ ctx, name, a, d, n }) {
      const last = a + (n - 1) * d;
      const S = (n * (a + last)) / 2;
      const show = ctx === 'savings' ? (v) => format.rupees(v) : (v) => fmt(v);
      const question = {
        savings: `${name} saves ₹${a} in the first month and ₹${d} more each month than in the month before. How much does ${name} save altogether in the first ${n} months?`,
        seats: `The first row of a hall has ${a} seats, and each row has ${d} more seat${d === 1 ? '' : 's'} than the row in front of it. How many seats are there in the first ${n} rows?`,
        pages: `${name} reads ${a} pages on the first day and ${d} more page${d === 1 ? '' : 's'} each day than the day before. How many pages does ${name} read in the first ${n} days?`
      }[ctx];
      const unit = { savings: 'month', seats: 'row', pages: 'day' }[ctx];
      return {
        question,
        explanation: `The amounts form an AP with a = ${a}, d = ${d} and n = ${n}. The last (${ord(n)}) ${unit} has ${a} + ${n - 1} × ${d} = ${last}. Total = n/2 × (first + last) = ${n}/2 × (${a} + ${last}) = ${show(S)}.`,
        solutionSteps: [`a = ${a}, d = ${d}, n = ${n}.`, `Last term = ${a} + ${n - 1} × ${d} = ${last}.`, `Total = ${n}/2 × ${a + last} = ${show(S)}.`],
        method: 'Recognise the AP, find the last term, then use n/2 × (first + last).',
        hints: [`Each ${unit} adds the same extra amount, ${d}: that is an AP.`, `The ${ord(n)} term is a + ${n - 1}d.`],
        commonMistakes: ['Giving only the last term instead of the total.', 'Using n instead of n − 1 for the last term.']
      };
    }
  },

  {
    id: 'ap-app-multiples-sum',
    version: 1,
    topicId: 'arithmetic-progression',
    conceptId: 'ap-applications',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['ap-count-formula', 'ap-sum-formula'],
    estimatedSeconds: 90,
    params(rng) {
      if (rng.chance(0.4)) return { lo: 10, hi: 99, k: rng.int(3, 13), two: true };
      const lo = rng.int(1, 120);
      const hi = lo + rng.int(60, 250);
      const k = rng.int(3, 17);
      return { lo, hi, k, two: false };
    },
    answer: ({ lo, hi, k }) => {
      const first = Math.ceil(lo / k) * k;
      const last = Math.floor(hi / k) * k;
      const n = (last - first) / k + 1;
      return (n * (first + last)) / 2;
    },
    verify: ({ lo, hi, k }, value) => {
      let total = 0;
      for (let v = lo; v <= hi; v++) if (v % k === 0) total += v;
      return total === value;
    },
    render({ lo, hi, k, two }) {
      const first = Math.ceil(lo / k) * k;
      const last = Math.floor(hi / k) * k;
      const n = (last - first) / k + 1;
      const S = (n * (first + last)) / 2;
      const label = two ? 'two-digit numbers' : `whole numbers from ${lo} to ${hi} (both included)`;
      return {
        question: `What is the sum of all ${label} that are divisible by ${k}?`,
        explanation: `The multiples of ${k} in range run ${first}, ${first + k}, …, ${last} — an AP with d = ${k}. Count: (${last} − ${first}) ÷ ${k} + 1 = ${n}. Sum = ${n}/2 × (${first} + ${last}) = ${fmt(S)}.`,
        solutionSteps: [`Smallest multiple of ${k} in range: ${first}.`, `Largest: ${last}.`, `n = (${last} − ${first}) ÷ ${k} + 1 = ${n}.`, `Sum = ${n}/2 × ${first + last} = ${fmt(S)}.`],
        method: 'Find the first and last multiples, count them, then use n/2 × (first + last).',
        hints: [`The multiples of ${k} form an AP with common difference ${k}.`, `Start at the first multiple of ${k} that is at least ${lo}, and stop at the last one no more than ${hi}.`],
        commonMistakes: ['Starting the AP at the range limit instead of the first multiple.', 'Forgetting the + 1 when counting terms.']
      };
    }
  },

  /* ============================== functions & graphs ============================== */
  {
    id: 'fn-domain-excluded-value',
    version: 1,
    topicId: 'functions-graphs',
    conceptId: 'fn-domain',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['fn-domain-f'],
    estimatedSeconds: 30,
    params(rng) {
      const a = rng.int(1, 5);
      const x0 = rng.int(-9, 9);
      const p = rng.chance(0.3) ? 0 : rng.int(1, 5);
      const q = rng.int(-9, 9);
      if (!x0 || (p === 0 && q === 0) || p * x0 + q === 0) return null;
      return { a, b: a * x0, p, q };
    },
    answer: ({ a, b }) => b / a,
    verify: ({ a, b }, value) => evalExpr(lin(a, -b), { x: value }) === 0,
    render({ a, b, p, q }) {
      const x0 = b / a;
      const top = p === 0 ? neg(q) : q === 0 ? polyText([[p, 'x']]) : `(${lin(p, q)})`;
      const den = lin(a, -b);
      return {
        question: `Which value of x must be left out of the domain of f(x) = ${top}/(${den})?`,
        explanation: `Division by zero is not allowed, so the denominator ${den} cannot be 0. Setting ${den} = 0 gives ${a === 1 ? `x = ${neg(x0)}` : `${a}x = ${neg(b)}, so x = ${neg(x0)}`}. Every other real number is fine, so x = ${neg(x0)} is excluded.`,
        solutionSteps: [`Set the denominator to 0: ${den} = 0.`, a === 1 ? `x = ${neg(x0)}.` : `${a}x = ${neg(b)}, so x = ${neg(x0)}.`, `Domain: all real x except ${neg(x0)}.`],
        method: 'Exclude any x that makes a denominator zero.',
        hints: ['Look at the denominator only.', `Solve ${den} = 0.`],
        commonMistakes: ['Setting the numerator to zero instead of the denominator.', 'Getting the sign wrong when solving the denominator.']
      };
    }
  },

  {
    id: 'fn-domain-sqrt-range',
    version: 1,
    topicId: 'functions-graphs',
    conceptId: 'fn-domain',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['fn-domain-f'],
    estimatedSeconds: 50,
    tags: ['trap'],
    params(rng) {
      return { a: rng.int(1, 5), c: rng.int(-6, 9), up: rng.chance(0.5), inDen: rng.chance(0.4) };
    },
    answer: ({ c, up, inDen }) => `x ${up ? (inDen ? '>' : '≥') : inDen ? '<' : '≤'} ${neg(c)}`,
    distractors: ({ c, up, inDen }) => {
      const op = (u, strict) => (u ? (strict ? '>' : '≥') : strict ? '<' : '≤');
      return [
        { value: `x ${op(up, !inDen)} ${neg(c)}`, why: inDen ? 'allowed the endpoint, but it makes the denominator zero' : 'left out the endpoint, but √0 = 0 is allowed' },
        { value: `x ${op(!up, inDen)} ${neg(c)}`, why: up ? 'reversed the inequality' : 'forgot to flip the sign when dividing by a negative number' },
        { value: c !== 0 ? `x ${op(up, inDen)} ${neg(-c)}` : null, why: 'got the sign of the boundary wrong' },
        { value: `x ≠ ${neg(c)}`, why: 'excluded only one value, as if the square root were a plain denominator' }
      ];
    },
    verify({ a, c, up, inDen }, value) {
      const m = /^x ([≥≤><≠]) (−?\d+)$/.exec(value);
      if (!m) return false;
      const bound = num(m[2]);
      const pred = { '≥': (t) => t >= bound, '>': (t) => t > bound, '≤': (t) => t <= bound, '<': (t) => t < bound, '≠': (t) => t !== bound }[m[1]];
      const radicand = (t) => (up ? a * t - a * c : a * c - a * t);
      const defined = (t) => radicand(t) > 0 || (!inDen && radicand(t) === 0);
      return [c - 2, c - 1, c - 0.5, c, c + 0.5, c + 1, c + 2].every((t) => pred(t) === defined(t));
    },
    render({ a, c, up, inDen }) {
      const R = up ? lin(a, -a * c) : polyText([[a * c, ''], [-a, 'x']]);
      const f = inDen ? `1/√(${R})` : `√(${R})`;
      const rel = inDen ? '>' : '≥';
      const ans = `x ${up ? (inDen ? '>' : '≥') : inDen ? '<' : '≤'} ${neg(c)}`;
      const ax = polyText([[a, 'x']]);
      const step = c === 0 ? ans : up ? `${ax} ${rel} ${neg(a * c)}, so ${ans}` : `${neg(a * c)} ${rel} ${ax}, so ${ans}`;
      return {
        question: `What is the domain of f(x) = ${f}?`,
        explanation: `The expression under a square root cannot be negative${inDen ? '; and because this root is in the denominator, it cannot be 0 either' : ', but it can be 0'}. So ${R} ${rel} 0, which gives ${step}.`,
        solutionSteps: [`Need ${R} ${rel} 0.`, step + '.', `Domain: ${ans}.`],
        method: 'Under a square root: ≥ 0. Under a square root in a denominator: > 0.',
        hints: [`Write the condition ${R} ${rel} 0.`, inDen ? 'The denominator cannot be zero, so the endpoint is excluded.' : 'Zero is allowed under a square root, so the endpoint is included.'],
        commonMistakes: ['Excluding the endpoint when √0 is fine (or including it when it is in a denominator).', 'Forgetting to flip the inequality when dividing by a negative number.']
      };
    }
  },

  {
    id: 'fn-inverse-value',
    version: 1,
    topicId: 'functions-graphs',
    conceptId: 'fn-inverse',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['fn-inverse-f', 'fn-sc-check-inverse'],
    estimatedSeconds: 40,
    params(rng) {
      const m = rng.int(2, 9);
      const c = signed(rng, 1, 12);
      if (rng.chance(0.65)) {
        const x0 = rng.int(-5, 10);
        return { form: 'linear', m, c, t: m * x0 + c };
      }
      return { form: 'divide', m, c, t: rng.int(-5, 10) };
    },
    answer: ({ form, m, c, t }) => (form === 'linear' ? (t - c) / m : m * t - c),
    verify: ({ form, m, c, t }, value) => (form === 'linear' ? m * value + c === t : (value + c) / m === t),
    render({ form, m, c, t }) {
      const f = form === 'linear' ? lin(m, c) : `(${lin(1, c)})/${m}`;
      const x = form === 'linear' ? (t - c) / m : m * t - c;
      const steps =
        form === 'linear'
          ? [`Solve ${f} = ${neg(t)}.`, `${m}x = ${neg(t)} ${c < 0 ? '+' : '−'} ${Math.abs(c)} = ${neg(t - c)}.`, `x = ${neg(t - c)} ÷ ${m} = ${neg(x)}.`]
          : [`Solve ${f} = ${neg(t)}.`, `${lin(1, c)} = ${m} × ${par(t)} = ${neg(m * t)}.`, `x = ${neg(m * t)} ${c < 0 ? '+' : '−'} ${Math.abs(c)} = ${neg(x)}.`];
      return {
        question: `If f(x) = ${f}, what is f⁻¹(${neg(t)})?`,
        explanation: `f⁻¹(${neg(t)}) is the input that f turns into ${neg(t)}. ${steps.join(' ')} Check: f(${neg(x)}) = ${neg(t)}.`,
        solutionSteps: steps,
        method: 'f⁻¹(k) is the x that solves f(x) = k.',
        hints: [`Set ${f} equal to ${neg(t)} and solve for x.`, 'Undo the operations in reverse order.'],
        commonMistakes: [`Working out f(${neg(t)}) instead of f⁻¹(${neg(t)}).`, 'Undoing the steps in the wrong order.']
      };
    }
  },

  {
    id: 'fn-inverse-formula',
    version: 1,
    topicId: 'functions-graphs',
    conceptId: 'fn-inverse',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['fn-inverse-f', 'fn-sc-check-inverse'],
    estimatedSeconds: 45,
    params(rng) {
      return { m: rng.int(2, 9), c: signed(rng, 1, 12) };
    },
    answer: ({ m, c }) => `(${lin(1, -c)})/${m}`,
    distractors: ({ m, c }) => [
      { value: `(${lin(1, c)})/${m}`, why: 'undid the constant with the wrong sign' },
      { value: `x/${m} ${c > 0 ? '−' : '+'} ${Math.abs(c)}`, why: 'divided first and then undid the constant — the wrong order' },
      { value: `1/(${lin(m, c)})`, why: 'took the reciprocal; f⁻¹ is not 1/f' },
      { value: lin(m, -c), why: 'changed the sign of the constant but kept multiplying' }
    ],
    verify: ({ m, c }, value) => [0, 1, 2, 5].every((t) => nearlyEqual(evalExpr(value, { x: m * t + c }), t)),
    render({ m, c }) {
      const f = lin(m, c);
      const ans = `(${lin(1, -c)})/${m}`;
      return {
        question: `If f(x) = ${f}, what is f⁻¹(x)?`,
        explanation: `Write y = ${f}. Swap x and y: x = ${lin(m, c, 'y')}. Solve for y: ${m}y = ${lin(1, -c)}, so y = ${ans}. Check with x = 1: f(1) = ${neg(m + c)}, and f⁻¹(${neg(m + c)}) = (${neg(m + c)} ${c > 0 ? '−' : '+'} ${Math.abs(c)})/${m} = 1.`,
        solutionSteps: [`y = ${f}.`, `Swap: x = ${lin(m, c, 'y')}.`, `${m}y = ${lin(1, -c)}.`, `f⁻¹(x) = ${ans}.`],
        method: 'Swap x and y, then make y the subject again.',
        hints: [`f multiplies by ${m} and then ${c > 0 ? 'adds' : 'subtracts'} ${Math.abs(c)}; the inverse undoes these in reverse order.`, `So first ${c > 0 ? 'subtract' : 'add'} ${Math.abs(c)}, then divide by ${m}.`],
        commonMistakes: ['Dividing before undoing the constant.', 'Writing 1/f(x) for the inverse.']
      };
    }
  },

  /* ============================ geometric progression ============================ */
  {
    id: 'gp-mean-two-numbers',
    version: 1,
    topicId: 'geometric-progression',
    conceptId: 'gp-mean',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['gp-mean-f'],
    estimatedSeconds: 30,
    params(rng) {
      const k = rng.int(1, 6);
      const s = rng.int(1, 5);
      const t = rng.int(s + 1, 8);
      const [a, b] = [k * s * s, k * t * t];
      if (b > 400) return null;
      return rng.chance(0.5) ? { a, b, G: k * s * t } : { a: b, b: a, G: k * s * t };
    },
    answer: ({ G }) => G,
    formatValue: (value) => fmt(value),
    distractors: ({ a, b }) => [
      { value: (a + b) / 2, why: 'found the arithmetic mean instead' },
      { value: a * b, why: 'forgot to take the square root' },
      { value: (a * b) / 2, why: 'halved the product instead of taking its square root' }
    ],
    verify: ({ a, b }, value) => value > 0 && value * value === a * b,
    render({ a, b, G }) {
      return {
        question: `What is the geometric mean of ${a} and ${b}?`,
        explanation: `The geometric mean is √(${a} × ${b}) = √${a * b} = ${G}. Check: ${a}, ${G}, ${b} is a GP, since ${G} ÷ ${a} = ${b} ÷ ${G} = ${fracText(G, a)}.`,
        solutionSteps: [`${a} × ${b} = ${a * b}.`, `√${a * b} = ${G}.`],
        method: 'G = √(ab).',
        hints: ['Multiply the two numbers first.', `Then take the square root of ${a * b}.`],
        commonMistakes: ['Averaging the numbers (that is the arithmetic mean).', 'Forgetting the square root.']
      };
    }
  },

  {
    id: 'gp-mean-third-term',
    version: 1,
    topicId: 'geometric-progression',
    conceptId: 'gp-mean',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['gp-mean-f', 'gp-sc-three-terms'],
    estimatedSeconds: 45,
    params(rng) {
      const k = rng.int(1, 5);
      const s = rng.int(1, 5);
      const t = rng.int(s + 1, 7);
      const rising = rng.chance(0.6);
      const first = rising ? k * s * s : k * t * t;
      const target = rising ? k * t * t : k * s * s;
      if (Math.max(first, target) > 500) return null;
      return { first, mid: k * s * t, target };
    },
    answer: ({ first, mid }) => (mid * mid) / first,
    formatValue: (value) => fmt(value),
    distractors: ({ first, mid }) => [
      { value: 2 * mid - first > 0 ? 2 * mid - first : null, why: 'treated it as an AP and added the same difference' },
      { value: mid * mid, why: 'forgot to divide by the first term' },
      { value: first * mid, why: 'multiplied the two given terms' },
      { value: first, why: 'used the ratio upside down (first ÷ middle)' }
    ],
    verify: ({ target }, value) => value === target,
    render({ first, mid }) {
      const x = (mid * mid) / first;
      return {
        question: `The numbers ${first}, ${mid} and x are in geometric progression. What is x?`,
        explanation: `In a GP the middle term is the geometric mean of its neighbours: ${mid}² = ${first} × x, so x = ${mid * mid} ÷ ${first} = ${x}. Check: the ratio ${mid} ÷ ${first} = ${fracText(mid, first)} and ${x} ÷ ${mid} = ${fracText(x, mid)}.`,
        solutionSteps: [`${mid}² = ${first} × x.`, `${mid * mid} = ${polyText([[first, 'x']])}.`, `x = ${x}.`],
        method: 'For a, G, b in GP: G² = ab.',
        hints: ['The middle term squared equals the product of the other two.', `${mid}² = ${first} × x.`],
        commonMistakes: ['Adding the same difference, as in an AP.', 'Forgetting to divide by the first term.']
      };
    }
  },

  /* ================================= inequalities ================================= */
  {
    id: 'in-check-meaning',
    version: 1,
    topicId: 'inequalities',
    conceptId: 'in-check',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['in-check-f'],
    estimatedSeconds: 35,
    params(rng) {
      if (rng.chance(0.5)) return { form: 'one', c: rng.int(-9, 15), op: rng.pick(['>', '≥', '<', '≤']) };
      const p = rng.int(-8, 10);
      return { form: 'two', p, q: p + rng.int(2, 6), lo: rng.chance(0.5), hi: rng.chance(0.5) };
    },
    answer: (P) => (P.form === 'one' ? oneSided(P.c, P.op) : between(P.p, P.q, P.lo, P.hi)),
    distractors: (P) => {
      if (P.form === 'one') {
        const flip = { '>': '≥', '≥': '>', '<': '≤', '≤': '<' };
        const reverse = { '>': '<', '≥': '≤', '<': '>', '≤': '≥' };
        return [
          { value: oneSided(P.c, flip[P.op]), why: P.op.length && (P.op === '>' || P.op === '<') ? 'included the endpoint, which a strict sign leaves out' : 'left out the endpoint, which ≥ or ≤ includes' },
          { value: `x must be exactly ${neg(P.c)}`, why: 'treated the solution as a single number' },
          { value: oneSided(P.c, reverse[P.op]), why: 'read the sign the wrong way round' }
        ];
      }
      const { p, q, lo, hi } = P;
      const ints = [];
      for (let t = p; t <= q; t++) if ((lo ? t >= p : t > p) && (hi ? t <= q : t < q)) ints.push(t);
      return [
        { value: `x can be only the whole numbers ${wholeList(ints)}`, why: 'assumed only whole numbers count' },
        { value: lo !== hi ? between(p, q, hi, lo) : between(p, q, !lo, !hi), why: lo !== hi ? 'swapped which end is included' : lo ? 'left out both ends, which ≤ includes' : 'included both ends, which < leaves out' },
        { value: `x can be only ${neg(p)} or ${neg(q)}`, why: 'read the two end values as the only solutions' },
        { value: between(p, q, !lo, hi), why: 'misread the sign at the lower end' }
      ];
    },
    verify(P, value) {
      const pred = sentencePredicate(value);
      if (!pred) return false;
      const truth = (t) => {
        if (P.form === 'one') return { '>': t > P.c, '≥': t >= P.c, '<': t < P.c, '≤': t <= P.c }[P.op];
        return (P.lo ? t >= P.p : t > P.p) && (P.hi ? t <= P.q : t < P.q);
      };
      const pts = P.form === 'one' ? [P.c - 2, P.c - 1, P.c - 0.5, P.c, P.c + 0.5, P.c + 1, P.c + 2] : [P.p - 1, P.p, P.p + 0.5, (P.p + P.q) / 2, P.q - 0.5, P.q, P.q + 1];
      return pts.every((t) => pred(t) === truth(t));
    },
    render(P) {
      const set = P.form === 'one' ? `x ${P.op} ${neg(P.c)}` : `${neg(P.p)} ${P.lo ? '≤' : '<'} x ${P.hi ? '≤' : '<'} ${neg(P.q)}`;
      const ans = P.form === 'one' ? oneSided(P.c, P.op) : between(P.p, P.q, P.lo, P.hi);
      const ends =
        P.form === 'one'
          ? `${neg(P.c)} itself is ${P.op === '≥' || P.op === '≤' ? 'included, because the sign has a bar (or equal to)' : 'not included, because the sign is strict'}`
          : `${neg(P.p)} is ${P.lo ? 'included (≤)' : 'not included (<)'} and ${neg(P.q)} is ${P.hi ? 'included (≤)' : 'not included (<)'}`;
      return {
        question: `An inequality has the solution ${set}. Which statement describes all the values of x that satisfy it?`,
        explanation: `A solution like ${set} is a whole range of numbers, including fractions and decimals, not a single value. ${ends[0].toUpperCase()}${ends.slice(1)}. So: ${ans}.`,
        solutionSteps: [`${set} is a range, not one number.`, `Endpoints: ${ends}.`, `Answer: ${ans}.`],
        method: '< and > leave the endpoint out; ≤ and ≥ include it. Every number in the range counts.',
        hints: ['A solution set is a range: fractions and decimals inside it count too.', 'Check each endpoint: is the sign strict (<, >) or not (≤, ≥)?'],
        commonMistakes: ['Thinking the solution is only the boundary number.', 'Counting only whole numbers.']
      };
    }
  },

  {
    id: 'in-check-count-integers',
    version: 1,
    topicId: 'inequalities',
    conceptId: 'in-check',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['in-check-f'],
    estimatedSeconds: 40,
    params(rng) {
      const p = rng.int(-12, 4);
      return { p, q: p + rng.int(3, 12), lo: rng.chance(0.5), hi: rng.chance(0.5) };
    },
    answer: ({ p, q, lo, hi }) => q - p + 1 - (lo ? 0 : 1) - (hi ? 0 : 1),
    formatValue: (value) => fmt(value),
    distractors: ({ p, q, lo, hi }) => {
      const ans = q - p + 1 - (lo ? 0 : 1) - (hi ? 0 : 1);
      const first = lo ? p : p + 1;
      const last = hi ? q : q - 1;
      const zeroInside = first <= 0 && last >= 0;
      const positives = Math.max(0, last - Math.max(first, 1) + 1);
      return [
        { value: q - p, why: 'subtracted the end values' },
        { value: q - p + 1, why: 'counted both end values even though a strict sign leaves one out' },
        { value: q - p - 1, why: 'left out both end values' },
        { value: zeroInside ? ans - 1 : null, why: 'forgot to count 0 as an integer' },
        { value: positives, why: 'counted only the positive integers' }
      ];
    },
    verify: ({ p, q, lo, hi }, value) => {
      let count = 0;
      for (let t = p - 2; t <= q + 2; t++) if ((lo ? t >= p : t > p) && (hi ? t <= q : t < q)) count++;
      return count === value;
    },
    render({ p, q, lo, hi }) {
      const first = lo ? p : p + 1;
      const last = hi ? q : q - 1;
      const n = last - first + 1;
      const set = `${neg(p)} ${lo ? '≤' : '<'} x ${hi ? '≤' : '<'} ${neg(q)}`;
      const end = (v, included) => `${included ? 'a filled dot' : 'a hollow dot'} at ${neg(v)} (${included ? 'included' : 'not included'})`;
      return {
        question: `How many integers x satisfy ${set}?`,
        figure: {
          type: 'numberline',
          caption: `The range ${set}`,
          min: p - 2,
          max: q + 2,
          step: 1,
          ranges: [{ from: p, to: q, fromOpen: !lo, toOpen: !hi }],
          points: [],
          ariaSummary: `A number line from ${neg(p - 2)} to ${neg(q + 2)}, shaded from ${end(p, lo)} to ${end(q, hi)}.`
        },
        explanation: `${neg(p)} is ${lo ? 'included' : 'not included'} and ${neg(q)} is ${hi ? 'included' : 'not included'}, so the integers run from ${neg(first)} to ${neg(last)}. Count = ${neg(last)} − ${par(first)} + 1 = ${n}${first <= 0 && last >= 0 ? ' (0 counts as an integer)' : ''}.`,
        solutionSteps: [`Smallest integer: ${neg(first)}.`, `Largest integer: ${neg(last)}.`, `Count = ${neg(last)} − ${par(first)} + 1 = ${n}.`],
        method: 'Find the smallest and largest integers in the range; count = largest − smallest + 1.',
        hints: ['Decide first whether each end value is included.', 'From m to n inclusive there are n − m + 1 integers.'],
        commonMistakes: ['Subtracting the end values and forgetting the + 1.', 'Forgetting that 0 is an integer.']
      };
    }
  },

  /* ============================== linear equations ============================== */
  {
    id: 'le-age-times-sum',
    version: 1,
    topicId: 'linear-equations',
    conceptId: 'le-age',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['le-age-f', 'le-word-f'],
    estimatedSeconds: 40,
    unit: 'years',
    params(rng) {
      const [older, younger] = rng.pick(PAIRS);
      return { older, younger, m: rng.int(2, 5), y: rng.int(3, 20) };
    },
    answer: ({ m, y }) => ((m + 1) * y) / (m + 1),
    verify: ({ m, y }, value) => value + m * value === (m + 1) * y && Number.isInteger(value),
    render({ older, younger, m, y }) {
      const S = (m + 1) * y;
      return {
        question: `${older} is ${m} times as old as ${younger}. The sum of their ages is ${S} years. How old is ${younger}?`,
        explanation: `Let ${younger}'s age be x, so ${older} is ${m}x. Then x + ${m}x = ${S}, so ${m + 1}x = ${S} and x = ${y}. Check: ${older} is ${m * y}, and ${y} + ${m * y} = ${S}.`,
        solutionSteps: [`x + ${m}x = ${S}.`, `${m + 1}x = ${S}.`, `x = ${S} ÷ ${m + 1} = ${y}.`],
        method: 'Let the younger age be x; the other is a multiple of x; add and solve.',
        hints: [`If ${younger} is x, ${older} is ${m}x.`, `Together they make ${m + 1}x.`],
        commonMistakes: [`Dividing ${S} by ${m} instead of ${m + 1}.`, `Giving ${older}'s age instead of ${younger}'s.`]
      };
    }
  },

  {
    id: 'le-age-sum-gap',
    version: 1,
    topicId: 'linear-equations',
    conceptId: 'le-age',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['le-age-f'],
    estimatedSeconds: 50,
    params(rng) {
      const [older, younger] = rng.pick(PAIRS);
      return { older, younger, s: rng.int(5, 30), d: rng.int(2, 12), k: rng.int(2, 10) };
    },
    answer: ({ s, d, k }) => ((s + k + s + d + k) - 2 * k - d) / 2,
    formatValue: (value) => format.years(value),
    distractors: ({ s, d, k }) => {
      const S = 2 * s + d + 2 * k;
      const int = (v) => (Number.isInteger(v) ? v : null);
      return [
        { value: int((S - d) / 2), why: `did not take ${k} years off each age` },
        { value: int((S - k - d) / 2), why: `took ${k} years off only one person's age` },
        { value: s + d, why: 'gave the older person\'s present age' },
        { value: s + k, why: `gave the younger person's age in ${k} years` }
      ];
    },
    verify: ({ s, d, k }, value) => value + k + (value + d + k) === 2 * s + d + 2 * k,
    render({ older, younger, s, d, k }) {
      const S = 2 * s + d + 2 * k;
      return {
        question: `${older} is ${d} years older than ${younger}. In ${k} years, the sum of their ages will be ${S}. How old is ${younger} now?`,
        explanation: `Let ${younger} be x now, so ${older} is x + ${d}. In ${k} years they will be x + ${k} and x + ${d + k}. So (x + ${k}) + (x + ${d + k}) = ${S}, giving 2x + ${d + 2 * k} = ${S}, 2x = ${S - d - 2 * k} and x = ${s}.`,
        solutionSteps: [`Ages in ${k} years: x + ${k} and x + ${d + k}.`, `2x + ${d + 2 * k} = ${S}.`, `x = ${s}.`],
        method: 'Move every person by the same number of years, then set up one equation.',
        hints: [`Both people get ${k} years older, so the total grows by ${2 * k}.`, `Their present ages add up to ${S} − ${2 * k} = ${S - 2 * k}.`],
        commonMistakes: [`Adding ${k} years to only one person.`, `Giving ${older}'s age instead of ${younger}'s.`]
      };
    }
  },

  {
    id: 'le-age-ratio-shift',
    version: 1,
    topicId: 'linear-equations',
    conceptId: 'le-age',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['le-age-f'],
    estimatedSeconds: 75,
    unit: 'years',
    params(rng) {
      const [elder, younger] = rng.pick([['father', 'son'], ['mother', 'daughter'], ['father', 'daughter'], ['mother', 'son']]);
      const future = rng.chance(0.6);
      const s = rng.int(4, 20);
      let m;
      let n;
      let k;
      if (future) {
        n = rng.int(2, 3);
        m = rng.int(n + 1, 6);
        k = (s * (m - n)) / (n - 1);
      } else {
        m = rng.int(2, 4);
        n = rng.int(m + 1, 7);
        k = (s * (n - m)) / (n - 1);
      }
      if (!Number.isInteger(k) || k < 2 || k > 25 || (!future && k >= s) || m * s > 75) return null;
      return { elder, younger, future, s, m, n, k };
    },
    answer: ({ future, m, n, k }) => (future ? (k * (n - 1)) / (m - n) : (k * (n - 1)) / (n - m)),
    verify: ({ future, m, n, k }, value) => (future ? m * value + k === n * (value + k) : m * value - k === n * (value - k)),
    render({ elder, younger, future, s, m, n, k }) {
      const his = elder === 'father' ? 'his' : 'her';
      const when = future ? `In ${k} years, the ${elder} will be ${n} times as old as the ${younger}.` : `${k} years ago, the ${elder} was ${n} times as old as the ${younger}.`;
      const steps = future
        ? [`${m}x + ${k} = ${n}(x + ${k}).`, `${m}x + ${k} = ${n}x + ${n * k}.`, m - n === 1 ? `x = ${n * k} − ${k} = ${s}.` : `${m - n}x = ${n * k - k}, so x = ${s}.`]
        : [`${m}x − ${k} = ${n}(x − ${k}).`, `${m}x − ${k} = ${n}x − ${n * k}.`, n - m === 1 ? `x = ${n * k} − ${k} = ${s}.` : `${n * k - k} = ${n - m}x, so x = ${s}.`];
      return {
        question: `A ${elder} is ${m} times as old as ${his} ${younger}. ${when} What is the ${younger}'s present age?`,
        explanation: `Let the ${younger} be x years old now, so the ${elder} is ${m}x. ${future ? `In ${k} years` : `${k} years ago`} they ${future ? 'will be' : 'were'} ${future ? `${m}x + ${k} and x + ${k}` : `${m}x − ${k} and x − ${k}`}. ${steps.join(' ')} Check: the ${elder} is ${m * s}; ${future ? `${m * s + k} = ${n} × ${s + k}` : `${m * s - k} = ${n} × ${s - k}`}.`,
        solutionSteps: steps,
        method: 'Shift both ages by the same number of years, then write the ratio as an equation.',
        hints: [`Let the ${younger}'s present age be x; the ${elder}'s is ${m}x.`, `${future ? 'Add' : 'Subtract'} ${k} to both ages before applying "${n} times".`],
        commonMistakes: [`Shifting only one person's age by ${k} years.`, `Writing ${n}x ${future ? '+' : '−'} ${k} instead of ${n}(x ${future ? '+' : '−'} ${k}).`]
      };
    }
  },

  {
    id: 'le-check-which-value',
    version: 1,
    topicId: 'linear-equations',
    conceptId: 'le-check',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['le-sc-options', 'le-bothsides-f'],
    estimatedSeconds: 40,
    params(rng) {
      const a = rng.int(3, 9);
      const c = rng.int(1, a - 1);
      const x0 = rng.int(-6, 12);
      const b = signed(rng, 1, 15);
      if (x0 === 0 || (a - c) * x0 + b === 0) return null;
      return { a, b, c, d: (a - c) * x0 + b, x0 };
    },
    answer: ({ x0 }) => neg(x0),
    distractors: ({ a, b, c, d }) => [
      { value: fracText(d + b, a - c), why: 'moved the constant across without changing its sign' },
      { value: fracText(d - b, a + c), why: 'moved the x-term across without changing its sign' },
      { value: fracText(d - b, a), why: 'ignored the x-term on the right-hand side' },
      { value: fracText(b - d, a - c), why: 'subtracted the wrong way round' }
    ],
    verify: ({ a, b, c, d }, value) => {
      const f = parseFrac(value);
      return !!f && a * f[0] + b * f[1] === c * f[0] + d * f[1];
    },
    render({ a, b, c, d, x0 }) {
      const L = lin(a, b);
      const R = lin(c, d);
      const v = a * x0 + b;
      return {
        question: `Which value of x satisfies ${L} = ${R}?`,
        explanation: `Collect the x-terms on one side: ${polyText([[a - c, 'x']])} = ${neg(d)} ${b < 0 ? '+' : '−'} ${Math.abs(b)} = ${neg(d - b)}, so x = ${neg(x0)}. Check by substituting: left side ${a} × ${par(x0)} ${sgn(b)} ${Math.abs(b)} = ${neg(v)}; right side ${c} × ${par(x0)} ${sgn(d)} ${Math.abs(d)} = ${neg(v)}. Both sides match.`,
        solutionSteps: [`${polyText([[a - c, 'x']])} = ${neg(d - b)}.`, `x = ${neg(x0)}.`, `Check: both sides equal ${neg(v)}.`],
        method: 'Solve, then substitute the answer back into both sides to confirm.',
        hints: ['You can substitute each option into both sides; the right one makes them equal.', `Start by collecting the x-terms: ${a}x − ${polyText([[c, 'x']])}.`],
        commonMistakes: ['Moving a term across without changing its sign.', 'Not checking the answer in the original equation.']
      };
    }
  },

  {
    id: 'le-check-substitute-side',
    version: 1,
    topicId: 'linear-equations',
    conceptId: 'le-check',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['le-sc-options'],
    estimatedSeconds: 45,
    params(rng) {
      const [name, pronoun] = rng.pick(NAMES);
      const a = rng.int(2, 6);
      const p = rng.int(1, 9);
      const q = rng.int(-9, 9);
      const c = rng.int(1, 5);
      const x0 = rng.int(-3, 12);
      if (c === a) return null;
      return { name, pronoun, a, p, q, c, x0, r: a * (x0 - p) + q - c * x0 };
    },
    answer: ({ a, p, q, x0 }) => a * (x0 - p) + q,
    verify: ({ c, r, x0 }, value) => c * x0 + r === value,
    render({ name, pronoun, a, p, q, c, x0, r }) {
      const left = `${a}(x − ${p})${q ? ` ${sgn(q)} ${Math.abs(q)}` : ''}`;
      const right = lin(c, r);
      const L = a * (x0 - p) + q;
      return {
        question: `${name} solved ${left} = ${right} and got x = ${neg(x0)}. To check, ${pronoun} substitutes x = ${neg(x0)} into the left-hand side. What value does the left-hand side come to?`,
        explanation: `Left side: ${a}(${neg(x0)} − ${p})${q ? ` ${sgn(q)} ${Math.abs(q)}` : ''} = ${a} × ${par(x0 - p)}${q ? ` ${sgn(q)} ${Math.abs(q)}` : ''} = ${neg(L)}. Right side: ${c === 1 ? neg(x0) : `${c} × ${par(x0)}`}${r ? ` ${sgn(r)} ${Math.abs(r)}` : ''} = ${neg(c * x0 + r)}. The two sides match, so x = ${neg(x0)} is correct.`,
        solutionSteps: [`${neg(x0)} − ${p} = ${neg(x0 - p)}.`, `${a} × ${par(x0 - p)} = ${neg(a * (x0 - p))}.`, q ? `${neg(a * (x0 - p))} ${sgn(q)} ${Math.abs(q)} = ${neg(L)}.` : `Left side = ${neg(L)}.`, `Right side: ${neg(c * x0 + r)} — they match.`],
        method: 'Substitute into each side separately; a correct solution makes them equal.',
        hints: ['Work out the bracket first.', `${neg(x0)} − ${p} = ${neg(x0 - p)}; multiply that by ${a}.`],
        commonMistakes: ['Multiplying only x by the number outside the bracket.', 'Dropping the sign of a negative value.']
      };
    }
  },

  /* ================================= logarithms ================================= */
  {
    id: 'lg-changebase-power-bases',
    version: 1,
    topicId: 'logarithms',
    conceptId: 'lg-changebase',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['lg-changebase-f', 'lg-sc-power-base'],
    answerDecimals: 2,
    estimatedSeconds: 50,
    params(rng) {
      const b = rng.pick([2, 3, 5]);
      const m = rng.int(2, 4);
      const n = rng.int(1, 8);
      if (n === m || b ** m > 1000 || b ** n > 5000 || !hasAtMostDecimals(n / m, 2)) return null;
      return { b, m, n, B: b ** m, N: b ** n };
    },
    answer: ({ m, n }) => n / m,
    verify: ({ B, N }, value) => nearlyEqual(Math.log(N) / Math.log(B), value, 1e-9),
    render({ b, m, n, B, N }) {
      const ans = fmt(n / m);
      return {
        question: `Using a change of base, what is log_${B}(${N})?`,
        explanation: `Write both numbers as powers of ${b}: ${B} = ${b}^${m} and ${N} = ${b}^${n}. Change to base ${b}: log_${B}(${N}) = log_${b}(${N}) ÷ log_${b}(${B}) = ${n} ÷ ${m} = ${ans}.`,
        solutionSteps: [`${B} = ${b}^${m}; ${N} = ${b}^${n}.`, `log_${b}(${N}) = ${n}; log_${b}(${B}) = ${m}.`, `log_${B}(${N}) = ${n} ÷ ${m} = ${ans}.`],
        method: 'log_b(a) = log_c(a) ÷ log_c(b); choose c so both are easy.',
        hints: [`Both ${B} and ${N} are powers of ${b}.`, `Divide log_${b}(${N}) by log_${b}(${B}).`],
        commonMistakes: [`Dividing the other way round (${m} ÷ ${n}).`, `Dividing ${N} by ${B} instead of their logarithms.`]
      };
    }
  },

  {
    id: 'lg-changebase-chain-product',
    version: 1,
    topicId: 'logarithms',
    conceptId: 'lg-changebase',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['lg-changebase-f', 'lg-laws-f'],
    estimatedSeconds: 60,
    params(rng) {
      const [p, q] = rng.shuffle([2, 3, 5, 7]).slice(0, 2);
      const m = rng.int(1, 4);
      const n = rng.int(1, 4);
      if (m * n === 1 || q ** m > 2500 || p ** n > 2500) return null;
      return { p, q, m, n };
    },
    answer: ({ m, n }) => m * n,
    verify: ({ p, q, m, n }, value) => nearlyEqual((Math.log(q ** m) / Math.log(p)) * (Math.log(p ** n) / Math.log(q)), value, 1e-9),
    render({ p, q, m, n }) {
      const coef = (e) => (e === 1 ? '' : `${e} `);
      const powers = [m > 1 ? `${q ** m} = ${q}^${m}` : '', n > 1 ? `${p ** n} = ${p}^${n}` : ''].filter(Boolean).join(' and ');
      const A = `${coef(m)}log_${p}(${q})`;
      const B = `${coef(n)}log_${q}(${p})`;
      return {
        question: `What is log_${p}(${q ** m}) × log_${q}(${p ** n})?`,
        explanation: `${powers}, so the product is ${A} × ${B}. By change of base, log_${p}(${q}) = log ${q} ÷ log ${p} and log_${q}(${p}) = log ${p} ÷ log ${q}, so their product is 1. The answer is ${m} × ${n} = ${m * n}.`,
        solutionSteps: [`log_${p}(${q ** m}) = ${A}.`, `log_${q}(${p ** n}) = ${B}.`, `log_${p}(${q}) × log_${q}(${p}) = 1.`, `Answer: ${m} × ${n} = ${m * n}.`],
        method: 'log_a(b) × log_b(a) = 1, after pulling the powers out front.',
        hints: [`Write ${q ** m} and ${p ** n} as powers of ${q} and ${p}.`, `Change both logs to a common base; the logs of ${p} and ${q} cancel.`],
        commonMistakes: ['Adding the powers instead of multiplying them.', 'Trying to evaluate each logarithm as a decimal.']
      };
    }
  },

  {
    id: 'lg-special-combine',
    version: 1,
    topicId: 'logarithms',
    conceptId: 'lg-special',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['lg-special-f'],
    estimatedSeconds: 30,
    params(rng) {
      const b = rng.int(2, 12);
      let c = rng.int(2, 12);
      if (c === b) c = c === 12 ? 2 : c + 1;
      return { k: rng.int(2, 9), m: rng.int(2, 9), b, c };
    },
    answer: ({ k }) => k,
    formatValue: (value) => fmt(value),
    distractors: ({ k, m, b }) => [
      { value: k + m, why: 'took log of 1 as 1' },
      { value: m, why: 'swapped the special values: log_b(b) = 0 and log_c(1) = 1' },
      { value: k * b, why: 'took log_b(b) as b' },
      { value: 0, why: 'took log_b(b) as 0' }
    ],
    verify: ({ k, m, b, c }, value) => nearlyEqual((k * Math.log(b)) / Math.log(b) + (m * Math.log(1)) / Math.log(c), value),
    render({ k, m, b, c }) {
      return {
        question: `What is ${k} × log_${b}(${b}) + ${m} × log_${c}(1)?`,
        explanation: `log_${b}(${b}) = 1 because ${b}¹ = ${b}, and log_${c}(1) = 0 because ${c}⁰ = 1. So the value is ${k} × 1 + ${m} × 0 = ${k}.`,
        solutionSteps: [`log_${b}(${b}) = 1.`, `log_${c}(1) = 0.`, `${k} × 1 + ${m} × 0 = ${k}.`],
        method: 'log_b(b) = 1 and log_b(1) = 0 for any base b.',
        hints: [`What power of ${b} gives ${b}?`, `What power of ${c} gives 1?`],
        commonMistakes: ['Taking log of 1 as 1.', 'Mixing up which special value is 0 and which is 1.']
      };
    }
  },

  {
    id: 'lg-special-solve',
    version: 1,
    topicId: 'logarithms',
    conceptId: 'lg-special',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['lg-special-f', 'lg-def-f'],
    estimatedSeconds: 35,
    params(rng) {
      const kind = rng.pick(['base', 'one', 'self']);
      return { kind, b: kind === 'base' ? rng.int(2, 60) : rng.int(2, 20) };
    },
    answer: ({ kind, b }) => (kind === 'one' ? 1 : b),
    verify: ({ kind, b }, value) => {
      if (value <= 0) return false;
      if (kind === 'base') return value !== 1 && nearlyEqual(Math.log(b) / Math.log(value), 1);
      return nearlyEqual(Math.log(value) / Math.log(b), kind === 'one' ? 0 : 1);
    },
    render({ kind, b }) {
      const q = { base: `If log_x(${b}) = 1, what is x?`, one: `If log_${b}(x) = 0, what is x?`, self: `If log_${b}(x) = 1, what is x?` }[kind];
      const why = {
        base: `log_x(${b}) = 1 means x¹ = ${b}, so x = ${b}. This is the rule log_b(b) = 1.`,
        one: `log_${b}(x) = 0 means ${b}⁰ = x, so x = 1. This is the rule log_b(1) = 0.`,
        self: `log_${b}(x) = 1 means ${b}¹ = x, so x = ${b}. This is the rule log_b(b) = 1.`
      }[kind];
      return {
        question: q,
        explanation: why,
        solutionSteps: [{ base: `Rewrite: x¹ = ${b}.`, one: `Rewrite: ${b}⁰ = x.`, self: `Rewrite: ${b}¹ = x.` }[kind], `x = ${kind === 'one' ? 1 : b}.`],
        method: 'Rewrite the logarithm as a power: log_b(x) = y means bʸ = x.',
        hints: ['Turn the logarithm into a power statement.', kind === 'one' ? 'Any base to the power 0 is 1.' : 'Any number to the power 1 is itself.'],
        commonMistakes: [kind === 'one' ? 'Answering 0 instead of 1.' : 'Answering 1 instead of the number itself.']
      };
    }
  },

  /* ============================== quadratic equations ============================== */
  {
    id: 'qe-sumproduct-read',
    version: 1,
    topicId: 'quadratic-equations',
    conceptId: 'qe-sumproduct',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['qe-sumprod-f'],
    estimatedSeconds: 30,
    params(rng) {
      const a = rng.pick([1, 1, 2, 3]);
      const r1 = signed(rng, 1, 9);
      const r2 = signed(rng, 1, 9);
      if (r1 === r2 || r1 + r2 === 0) return null;
      return { a, B: -a * (r1 + r2), C: a * r1 * r2, ask: rng.pick(['sum', 'product']) };
    },
    answer: ({ a, B, C, ask }) => (ask === 'sum' ? -B / a : C / a),
    verify: ({ a, B, C, ask }, value) => {
      const roots = rootsOf(a, B, C);
      if (roots.length !== 2) return false;
      return nearlyEqual(ask === 'sum' ? roots[0] + roots[1] : roots[0] * roots[1], value);
    },
    render({ a, B, C, ask }) {
      const eq = quadText(a, B, C, 'x');
      const ans = ask === 'sum' ? -B / a : C / a;
      const calc = ask === 'sum' ? `−b/a = −(${neg(B)}) ÷ ${a} = ${neg(ans)}` : `c/a = ${neg(C)} ÷ ${a} = ${neg(ans)}`;
      return {
        question: `What is the ${ask} of the roots of ${eq}?`,
        explanation: `For ax² + bx + c = 0, the sum of the roots is −b/a and the product is c/a. Here a = ${a}, b = ${neg(B)} and c = ${neg(C)}, so the ${ask} is ${calc}.`,
        solutionSteps: [`a = ${a}, b = ${neg(B)}, c = ${neg(C)}.`, `${ask === 'sum' ? 'Sum' : 'Product'} = ${calc}.`],
        method: 'Sum = −b/a; product = c/a. No need to solve.',
        hints: [`Read off a, b and c from ${eq}.`, ask === 'sum' ? 'The sum is −b/a — mind the minus sign.' : 'The product is c/a.'],
        commonMistakes: ['Forgetting the minus sign in −b/a.', 'Forgetting to divide by a.']
      };
    }
  },

  {
    id: 'qe-sumproduct-form-equation',
    version: 1,
    topicId: 'quadratic-equations',
    conceptId: 'qe-sumproduct',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['qe-sumprod-f', 'qe-sc-from-roots'],
    estimatedSeconds: 45,
    params(rng) {
      const p = signed(rng, 1, 9);
      const q = signed(rng, 1, 9);
      if (p === q || p + q === 0) return null;
      return { p, q };
    },
    answer: ({ p, q }) => quadText(1, -(p + q), p * q, 'x'),
    distractors: ({ p, q }) => [
      { value: quadText(1, p + q, p * q, 'x'), why: 'forgot to change the sign of the sum' },
      { value: quadText(1, -(p + q), -p * q, 'x'), why: 'changed the sign of the product as well' },
      { value: quadText(1, p + q, -p * q, 'x'), why: 'changed the signs of both the sum and the product' }
    ],
    verify: ({ p, q }, value) => {
      if (!value.startsWith('x²') || !value.endsWith(' = 0')) return false;
      const lhs = value.slice(0, -4);
      return evalExpr(lhs, { x: p }) === 0 && evalExpr(lhs, { x: q }) === 0;
    },
    render({ p, q }) {
      const ans = quadText(1, -(p + q), p * q, 'x');
      return {
        question: `The roots of a quadratic equation are ${neg(p)} and ${neg(q)}. Which equation, in the form x² + bx + c = 0, has these roots?`,
        explanation: `A quadratic with roots α and β is x² − (α + β)x + αβ = 0. Sum = ${neg(p)} + ${par(q)} = ${neg(p + q)}; product = ${neg(p)} × ${par(q)} = ${neg(p * q)}. So the equation is ${ans}. Check: (x ${p < 0 ? '+' : '−'} ${Math.abs(p)})(x ${q < 0 ? '+' : '−'} ${Math.abs(q)}) expands to the same thing.`,
        solutionSteps: [`Sum of roots = ${neg(p + q)}.`, `Product of roots = ${neg(p * q)}.`, `x² − (${neg(p + q)})x + (${neg(p * q)}) = 0 → ${ans}.`],
        method: 'x² − (sum of roots)x + (product of roots) = 0.',
        hints: ['Find the sum and the product of the roots.', 'The x-coefficient is minus the sum; the constant is the product.'],
        commonMistakes: ['Using + (sum) for the x-coefficient.', 'Changing the sign of the product.']
      };
    }
  },

  {
    id: 'qe-sumproduct-squares',
    version: 1,
    topicId: 'quadratic-equations',
    conceptId: 'qe-sumproduct',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['qe-sumprod-f', 'ai-squares-f'],
    estimatedSeconds: 60,
    params(rng) {
      const r1 = signed(rng, 1, 9);
      const r2 = signed(rng, 1, 9);
      if (r1 === r2) return null;
      return { r1, r2, ask: rng.pick(['sq', 'diffsq']) };
    },
    answer: ({ r1, r2, ask }) => {
      const [s, p] = [r1 + r2, r1 * r2];
      return ask === 'sq' ? s * s - 2 * p : s * s - 4 * p;
    },
    formatValue: (value) => fmt(value),
    distractors: ({ r1, r2, ask }) => {
      const [s, p] = [r1 + r2, r1 * r2];
      return ask === 'sq'
        ? [
            { value: s * s, why: 'forgot to subtract 2αβ' },
            { value: s * s + 2 * p, why: 'added 2αβ instead of subtracting it' },
            { value: s * s - p, why: 'subtracted αβ only once' },
            { value: s * s - 4 * p, why: 'used (α − β)² instead' }
          ]
        : [
            { value: s * s - 2 * p, why: 'found α² + β² instead' },
            { value: s * s, why: 'forgot to subtract 4αβ' },
            { value: s * s + 4 * p, why: 'added 4αβ instead of subtracting it' }
          ];
    },
    verify: ({ r1, r2, ask }, value) => (ask === 'sq' ? r1 * r1 + r2 * r2 : (r1 - r2) ** 2) === value,
    render({ r1, r2, ask }) {
      const [s, p] = [r1 + r2, r1 * r2];
      const eq = quadText(1, -s, p, 'x');
      const target = ask === 'sq' ? 'α² + β²' : '(α − β)²';
      const ans = ask === 'sq' ? s * s - 2 * p : s * s - 4 * p;
      const rule = ask === 'sq' ? `α² + β² = (α + β)² − 2αβ = ${par(s)}² − 2 × ${par(p)} = ${s * s} ${p < 0 ? '+' : '−'} ${Math.abs(2 * p)} = ${ans}` : `(α − β)² = (α + β)² − 4αβ = ${par(s)}² − 4 × ${par(p)} = ${s * s} ${p < 0 ? '+' : '−'} ${Math.abs(4 * p)} = ${ans}`;
      return {
        question: `If α and β are the roots of ${eq}, what is ${target}?`,
        explanation: `From the equation, α + β = ${neg(s)} and αβ = ${neg(p)}. Then ${rule}.`,
        solutionSteps: [`α + β = ${neg(s)}, αβ = ${neg(p)}.`, rule + '.'],
        method: ask === 'sq' ? 'α² + β² = (α + β)² − 2αβ.' : '(α − β)² = (α + β)² − 4αβ.',
        hints: ['Read the sum and product of the roots from the equation.', `Write ${target} in terms of α + β and αβ.`],
        commonMistakes: [ask === 'sq' ? 'Forgetting to subtract 2αβ.' : 'Using 2αβ instead of 4αβ.', 'Getting the sign of α + β wrong.']
      };
    }
  },

  /* ============================= quadratic comparison ============================= */
  {
    id: 'qc-format-read-values',
    version: 1,
    topicId: 'quadratic-comparison',
    conceptId: 'qc-format',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['qc-options-f', 'qc-compare-f'],
    formatValue: (value) => value,
    optionOrder: QC_OPTIONS,
    optionCount: 5,
    estimatedSeconds: 35,
    params: (rng) => qcParams(rng, false),
    answer: ({ xs, ys }) => verdict(xs, ys),
    distractors: ({ xs, ys }) => QC_OPTIONS.filter((o) => o !== verdict(xs, ys)).map((value) => ({ value, why: QC_WHY[value] })),
    verify: ({ xs, ys }, value) => verdictByRange(xs, ys) === value,
    render: qcRender
  },

  {
    id: 'qc-format-mixed-values',
    version: 1,
    topicId: 'quadratic-comparison',
    conceptId: 'qc-format',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['qc-options-f', 'qc-compare-f'],
    formatValue: (value) => value,
    optionOrder: QC_OPTIONS,
    optionCount: 5,
    estimatedSeconds: 45,
    params: (rng) => qcParams(rng, true),
    answer: ({ xs, ys }) => verdict(xs, ys),
    distractors: ({ xs, ys }) => QC_OPTIONS.filter((o) => o !== verdict(xs, ys)).map((value) => ({ value, why: QC_WHY[value] })),
    verify: ({ xs, ys }, value) => verdictByRange(xs, ys) === value,
    render: qcRender
  },

  /* ================================== sequences ================================== */
  {
    id: 'sq-missing-arith',
    version: 1,
    topicId: 'sequences',
    conceptId: 'sq-missing',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['sq-missing-f', 'sq-arith-f'],
    estimatedSeconds: 30,
    params(rng) {
      const len = rng.pick([5, 6]);
      const down = rng.chance(0.3);
      const d = down ? -rng.int(2, 12) : rng.int(2, 12);
      const a = down ? rng.int(60, 99) : rng.int(1, 40);
      return { terms: Array.from({ length: len }, (_, i) => a + i * d), idx: rng.int(1, len - 2), d };
    },
    answer: ({ terms, idx }) => terms[0] + idx * (terms[1] - terms[0] || terms[2] - terms[1]),
    verify: ({ terms, idx }, value) => 2 * value === terms[idx - 1] + terms[idx + 1],
    render({ terms, idx, d }) {
      const shown = terms.map((t, i) => (i === idx ? '__' : String(t))).join(', ');
      const known = terms.findIndex((_, i) => i !== idx && i + 1 !== idx && i + 1 < terms.length);
      return {
        question: `What is the missing term: ${shown}?`,
        explanation: `${terms[known + 1]} − ${terms[known]} = ${neg(d)}, so each term ${d > 0 ? 'increases' : 'decreases'} by ${Math.abs(d)}. The missing term is ${terms[idx - 1]} ${d > 0 ? '+' : '−'} ${Math.abs(d)} = ${terms[idx]}, and ${terms[idx]} ${d > 0 ? '+' : '−'} ${Math.abs(d)} = ${terms[idx + 1]} confirms it.`,
        solutionSteps: [`Common difference: ${neg(d)}.`, `${terms[idx - 1]} ${d > 0 ? '+' : '−'} ${Math.abs(d)} = ${terms[idx]}.`],
        method: 'Find the rule from neighbouring terms you have, then fill the gap.',
        hints: ['Look at two terms next to each other that are both given.', `The gap is ${Math.abs(d)} each time.`],
        commonMistakes: ['Using a gap that spans the missing term as if it were one step.']
      };
    }
  },

  {
    id: 'sq-missing-geo-or-growing',
    version: 1,
    topicId: 'sequences',
    conceptId: 'sq-missing',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['sq-missing-f', 'sq-geo-f', 'sq-sc-second-difference'],
    estimatedSeconds: 45,
    params(rng) {
      if (rng.chance(0.5)) {
        const r = rng.int(2, 4);
        const a = r === 4 ? rng.int(1, 3) : rng.int(1, 6);
        return { family: 'geo', r, terms: Array.from({ length: 5 }, (_, i) => a * r ** i), idx: rng.int(1, 3) };
      }
      const [a, d, e] = [rng.int(1, 30), rng.int(1, 9), rng.int(1, 4)];
      return { family: 'growing', d, e, terms: Array.from({ length: 6 }, (_, i) => a + i * d + (e * i * (i - 1)) / 2), idx: rng.int(1, 4) };
    },
    answer: ({ family, terms, idx, r, d, e }) => (family === 'geo' ? terms[idx - 1] * r : terms[idx - 1] + d + e * (idx - 1)),
    verify: ({ family, terms, idx }, value) => {
      if (family === 'geo') return value > 0 && value * value === terms[idx - 1] * terms[idx + 1];
      const full = terms.map((t, i) => (i === idx ? value : t));
      const gaps = full.slice(1).map((t, i) => t - full[i]);
      const second = gaps.slice(1).map((g, i) => g - gaps[i]);
      return second.every((s) => s === second[0]);
    },
    render({ family, terms, idx, r, d, e }) {
      const shown = terms.map((t, i) => (i === idx ? '__' : String(t))).join(', ');
      if (family === 'geo') {
        return {
          question: `What is the missing term: ${shown}?`,
          explanation: `Each term is ${r} times the one before (for example ${terms[idx === 1 ? 3 : 1]} ÷ ${terms[idx === 1 ? 2 : 0]} = ${r}). So the missing term is ${terms[idx - 1]} × ${r} = ${terms[idx]}; check: ${terms[idx]} × ${r} = ${terms[idx + 1]}.`,
          solutionSteps: [`Ratio: ${r}.`, `${terms[idx - 1]} × ${r} = ${terms[idx]}.`],
          method: 'The gaps grow quickly, so test a constant ratio.',
          hints: ['Divide a term by the one before it.', `Each term is ${r} times the previous one.`],
          commonMistakes: ['Looking for a constant difference when the terms multiply.']
        };
      }
      const gaps = terms.slice(1).map((t, i) => t - terms[i]);
      return {
        question: `What is the missing term: ${shown}?`,
        explanation: `The gaps between terms are ${gaps.join(', ')} — each gap is ${e} more than the one before, starting at ${d}. The gap into the missing term is ${gaps[idx - 1]}, so it is ${terms[idx - 1]} + ${gaps[idx - 1]} = ${terms[idx]}; then ${terms[idx]} + ${gaps[idx]} = ${terms[idx + 1]} checks it.`,
        solutionSteps: [`Gaps: ${gaps.join(', ')} (rising by ${e}).`, `${terms[idx - 1]} + ${gaps[idx - 1]} = ${terms[idx]}.`],
        method: 'When the gaps are not constant, look at how the gaps themselves change.',
        hints: ['Write down the gaps between the terms you have.', `The gaps go up by ${e} each time.`],
        commonMistakes: ['Assuming a constant difference.', 'Treating the gap across the blank as a single step.']
      };
    }
  },

  /* ================================== set theory ================================== */
  {
    id: 'st-notation-true-statement',
    version: 1,
    topicId: 'set-theory',
    conceptId: 'st-notation',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: [],
    estimatedSeconds: 35,
    params(rng) {
      const size = rng.int(4, 6);
      const A = rng.shuffle(Array.from({ length: 20 }, (_, i) => i + 1)).slice(0, size).sort((p, q) => p - q);
      const outside = Array.from({ length: 20 }, (_, i) => i + 1).filter((n) => !A.includes(n));
      const [x, y] = rng.shuffle(A).slice(0, 2).sort((p, q) => p - q);
      return { A, x, y, z: rng.pick(outside), subset: rng.chance(0.5), mix: rng.shuffle([0, 1, 2, 3]) };
    },
    answer: ({ x, y, subset }) => (subset ? `${setText([x, y])} ⊆ A` : `${x} ∈ A`),
    distractors: ({ x, z, mix }) => {
      const list = [
        { value: `{${x}} ∈ A`, why: 'used ∈ for a set; {x} is a subset of A, not an element' },
        { value: `${x} ⊆ A`, why: 'used ⊆ for a single element, which needs ∈' },
        { value: `${z} ∈ A`, why: `${z} is not listed in A` },
        { value: `${setText([Math.min(x, z), Math.max(x, z)])} ⊆ A`, why: `one element (${z}) is outside A` }
      ];
      return mix.map((i) => list[i]);
    },
    verify({ A }, value) {
      let m = /^(\d+) ∈ A$/.exec(value);
      if (m) return A.includes(Number(m[1]));
      m = /^\{([\d, ]+)\} ⊆ A$/.exec(value);
      if (m) return m[1].split(', ').every((n) => A.includes(Number(n)));
      return false;
    },
    render({ A, x, y, z, subset }) {
      const ans = subset ? `${setText([x, y])} ⊆ A` : `${x} ∈ A`;
      return {
        question: `A = ${setText(A)}. Which of these statements is true?`,
        explanation: `∈ links an element to a set; ⊆ links a set to a set. ${subset ? `Both ${x} and ${y} are in A, so the set ${setText([x, y])} is a subset of A: ${ans}.` : `${x} is listed in A, so ${ans}.`} By contrast, ${x} ⊆ A misuses ⊆ (${x} is a number, not a set), {${x}} ∈ A misuses ∈, and ${z} is not in A at all.`,
        solutionSteps: ['Element ∈ set; set ⊆ set.', subset ? `${x} ∈ A and ${y} ∈ A, so ${setText([x, y])} ⊆ A.` : `${x} appears in A, so ${x} ∈ A.`],
        method: 'Check the symbol first (element or set?), then check membership.',
        hints: ['∈ goes between a single element and a set; ⊆ goes between two sets.', `Is ${z} one of the elements listed in A?`],
        commonMistakes: ['Writing ∈ between two sets, or ⊆ between an element and a set.', 'Calling a set a subset when one of its elements is missing from A.']
      };
    }
  },

  {
    id: 'st-notation-subset-rule',
    version: 1,
    topicId: 'set-theory',
    conceptId: 'st-notation',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: [],
    estimatedSeconds: 50,
    params(rng) {
      const family = rng.pick(['prime', 'multiple', 'factor']);
      if (family === 'factor') {
        const N = rng.pick([12, 18, 20, 24, 28, 30, 36, 40, 42, 48]);
        const factors = Array.from({ length: N - 1 }, (_, i) => i + 2).filter((f) => N % f === 0 && f < N);
        const pick = rng.shuffle(factors).slice(0, rng.int(2, 3)).sort((p, q) => p - q);
        const sharers = Array.from({ length: N - 2 }, (_, i) => i + 2).filter((g) => N % g !== 0 && gcd(g, N) > 1);
        return { family, N, pick, sharer: rng.pick(sharers), p: rng.pick(pick) };
      }
      if (family === 'prime') {
        const N = rng.pick([15, 20, 25, 30, 35, 40]);
        const primes = Array.from({ length: N }, (_, i) => i).filter(isPrime);
        const pick = rng.shuffle(primes).slice(0, rng.int(2, 3)).sort((p, q) => p - q);
        const odd = rng.pick([9, 15, 21, 25, 27].filter((n) => n < N));
        let next = N;
        while (!isPrime(next)) next++;
        return { family: 'prime', N, pick, odd, next, p: rng.pick(pick) };
      }
      const k = rng.pick([4, 6, 8, 9, 10]);
      const N = k * rng.int(5, 9);
      const multiples = Array.from({ length: N / k - 1 }, (_, i) => k * (i + 1));
      const pick = rng.shuffle(multiples).slice(0, rng.int(2, 3)).sort((p, q) => p - q);
      const factors = Array.from({ length: k - 2 }, (_, i) => i + 2).filter((f) => k % f === 0);
      return { family: 'multiple', k, N, pick, factor: rng.pick(factors), p: rng.pick(pick) };
    },
    answer: ({ pick }) => setText(pick),
    distractors: (P) => {
      const s = (list) => setText([...list].sort((a, b) => a - b));
      if (P.family === 'prime') {
        return [
          { value: s([1, P.p]), why: 'treated 1 as a prime number' },
          { value: s([P.p, P.odd]), why: `assumed every odd number is prime (${P.odd} is not)` },
          { value: s([P.p, P.next]), why: `ignored the upper limit (${P.next} is not less than ${P.N})` }
        ];
      }
      if (P.family === 'factor') {
        return [
          { value: s([P.p, 2 * P.N]), why: `included a multiple of ${P.N} instead of a factor` },
          { value: s([P.p, P.sharer]), why: `included ${P.sharer}, which only shares a factor with ${P.N}` },
          { value: s([0, P.p]), why: 'treated 0 as a factor' }
        ];
      }
      return [
        { value: s([P.p, P.N]), why: `included ${P.N}, but "less than ${P.N}" leaves it out` },
        { value: s([P.factor, P.p]), why: `included a factor of ${P.k} instead of a multiple` },
        { value: s([P.p, P.N + P.k]), why: 'ignored the upper limit' }
      ];
    },
    verify(P, value) {
      const m = /^\{([\d, ]+)\}$/.exec(value);
      if (!m) return false;
      const rule = {
        prime: (n) => isPrime(n) && n < P.N,
        multiple: (n) => n > 0 && n % P.k === 0 && n < P.N,
        factor: (n) => n > 0 && P.N % n === 0
      }[P.family];
      return m[1].split(', ').every((n) => rule(Number(n)));
    },
    render(P) {
      const all = {
        prime: () => Array.from({ length: P.N }, (_, i) => i).filter(isPrime),
        multiple: () => Array.from({ length: P.N / P.k - 1 }, (_, i) => P.k * (i + 1)),
        factor: () => Array.from({ length: P.N }, (_, i) => i + 1).filter((f) => P.N % f === 0)
      }[P.family]();
      const rule = { prime: `x is a prime number less than ${P.N}`, multiple: `x is a positive multiple of ${P.k} less than ${P.N}`, factor: `x is a factor of ${P.N}` }[P.family];
      const ans = setText(P.pick);
      const traps = {
        prime: `1 is not prime, ${P.odd} is not prime, and ${P.next} is not less than ${P.N}`,
        multiple: `${P.N} is not less than ${P.N}, ${P.factor} is a factor of ${P.k} rather than a multiple, and ${P.N + P.k} is too large`,
        factor: `${2 * P.N} is a multiple of ${P.N}, not a factor; ${P.sharer} does not divide ${P.N}; and 0 is not a factor of anything`
      }[P.family];
      return {
        question: `A = {x : ${rule}}. Which of these is a subset of A?`,
        explanation: `Listing A gives ${setText(all)}. A set is a subset of A only if every one of its elements is in A. Every element of ${ans} is in A, so ${ans} ⊆ A. The other options each contain an element outside A: ${traps}.`,
        solutionSteps: [`A = ${setText(all)}.`, `Check each element of each option against A.`, `${ans}: every element is in A.`],
        method: 'List the set from its rule, then check every element of each option.',
        hints: ['Write out A in full first.', 'One element outside A is enough to rule an option out.'],
        commonMistakes: {
          prime: ['Counting 1 as a prime.', 'Assuming odd numbers are prime.'],
          multiple: ['Including the boundary when the rule says "less than".', 'Confusing factors with multiples.'],
          factor: ['Confusing multiples with factors.', 'Including a number that merely shares a factor.']
        }[P.family]
      };
    }
  },

  /* ============================ simultaneous equations ============================ */
  {
    id: 'se-sub-given-y',
    version: 1,
    topicId: 'simultaneous-equations',
    conceptId: 'se-substitution',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['se-sub-f'],
    estimatedSeconds: 45,
    params(rng) {
      const m = rng.pick([-3, -2, -1, 1, 2, 3, 4]);
      const c = rng.int(-9, 9);
      const a = rng.int(1, 6);
      const b = signed(rng, 1, 5);
      if (a + b * m === 0) return null;
      const x0 = rng.int(-5, 9);
      const y0 = m * x0 + c;
      return { m, c, a, b, d: a * x0 + b * y0, ask: rng.pick(['x', 'y']) };
    },
    answer: ({ m, c, a, b, d, ask }) => {
      const x = (d - b * c) / (a + b * m);
      return ask === 'x' ? x : m * x + c;
    },
    verify: ({ m, c, a, b, d, ask }, value) => {
      if (ask === 'x') return a * value + b * (m * value + c) === d;
      const x = (d - b * value) / a;
      return nearlyEqual(m * x + c, value);
    },
    render({ m, c, a, b, d, ask }) {
      const y = lin(m, c);
      const eq2 = eqText(a, b, d);
      const coef = a + b * m;
      const x0 = (d - b * c) / coef;
      const y0 = m * x0 + c;
      const steps = [
        `Substitute y = ${y}: ${polyText([[a, 'x']])} ${sgn(b)} ${Math.abs(b) === 1 ? '' : Math.abs(b)}(${y}) = ${neg(d)}.`,
        `${polyText([[coef, 'x'], [b * c, '']])} = ${neg(d)}.`,
        `${polyText([[coef, 'x']])} = ${neg(d - b * c)}, so x = ${neg(x0)}.`,
        `y = ${m === 1 ? neg(x0) : m === -1 ? `−${par(x0)}` : `${neg(m)} × ${par(x0)}`}${c ? ` ${sgn(c)} ${Math.abs(c)}` : ''} = ${neg(y0)}.`
      ];
      return {
        question: `Solve: y = ${y} and ${eq2}. What is ${ask}?`,
        explanation: `The first equation already gives y in terms of x, so substitute it into the second. ${steps.join(' ')} Check in ${eq2}: ${a} × ${par(x0)} + ${par(b)} × ${par(y0)} = ${neg(d)}.`,
        solutionSteps: steps,
        method: 'Substitute the expression for y into the other equation, solve for x, then find y.',
        hints: [`Replace y in ${eq2} with (${y}).`, `Multiply ${neg(b)} by every term in (${y}).`],
        commonMistakes: ['Multiplying only the first term of the substituted expression.', ask === 'y' ? 'Stopping after finding x.' : 'Dropping a sign when expanding.']
      };
    }
  },

  {
    id: 'se-sub-rearrange-first',
    version: 1,
    topicId: 'simultaneous-equations',
    conceptId: 'se-substitution',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['se-sub-f'],
    estimatedSeconds: 60,
    params(rng) {
      const form = rng.pick(['ky', 'px']);
      const a = rng.int(1, 6);
      const b = signed(rng, 1, 6);
      const q = rng.int(-9, 9);
      let k = null;
      let p = null;
      let x0;
      let y0;
      if (form === 'ky') {
        k = rng.int(2, 5);
        if (a + b * k === 0) return null;
        x0 = rng.int(-5, 8);
        y0 = k * x0 - q;
      } else {
        p = signed(rng, 2, 5);
        if (b - a * p === 0) return null;
        y0 = rng.int(-5, 8);
        x0 = q - p * y0;
      }
      if (Math.abs(x0) > 30 || Math.abs(y0) > 30) return null;
      return { form, a, b, q, k, p, d: a * x0 + b * y0, ask: rng.pick(['x', 'y']) };
    },
    answer: ({ form, a, b, q, k, p, d, ask }) => {
      if (form === 'ky') {
        const x = (d + b * q) / (a + b * k);
        return ask === 'x' ? x : k * x - q;
      }
      const y = (d - a * q) / (b - a * p);
      return ask === 'y' ? y : q - p * y;
    },
    verify: ({ form, a, b, q, k, p, d, ask }, value) => {
      let x;
      let y;
      if (form === 'ky') [x, y] = ask === 'x' ? [value, k * value - q] : [(value + q) / k, value];
      else [x, y] = ask === 'y' ? [q - p * value, value] : [value, (q - value) / p];
      return nearlyEqual(a * x + b * y, d) && (form === 'ky' ? nearlyEqual(k * x - y, q) : nearlyEqual(x + p * y, q));
    },
    render({ form, a, b, q, k, p, d, ask }) {
      const eq1 = form === 'ky' ? `${polyText([[k, 'x'], [-1, 'y']])} = ${neg(q)}` : `${polyText([[1, 'x'], [p, 'y']])} = ${neg(q)}`;
      const eq2 = eqText(a, b, d);
      let steps;
      let x;
      let y;
      if (form === 'ky') {
        const coef = a + b * k;
        x = (d + b * q) / coef;
        y = k * x - q;
        steps = [
          `From ${eq1}: y = ${lin(k, -q)}.`,
          `Substitute: ${polyText([[a, 'x']])} ${sgn(b)} ${Math.abs(b) === 1 ? '' : Math.abs(b)}(${lin(k, -q)}) = ${neg(d)}.`,
          `${polyText([[coef, 'x'], [-b * q, '']])} = ${neg(d)}, so x = ${neg(x)}.`,
          `y = ${k} × ${par(x)}${q ? ` ${q < 0 ? '+' : '−'} ${Math.abs(q)}` : ''} = ${neg(y)}.`
        ];
      } else {
        const coef = b - a * p;
        y = (d - a * q) / coef;
        x = q - p * y;
        const xExpr = polyText([[q, ''], [-p, 'y']]);
        steps = [
          `From ${eq1}: x = ${xExpr}.`,
          `Substitute: ${a === 1 ? '' : a}(${xExpr}) ${sgn(b)} ${polyText([[Math.abs(b), 'y']])} = ${neg(d)}.`,
          `${polyText([[a * q, ''], [coef, 'y']])} = ${neg(d)}, so y = ${neg(y)}.`,
          `x = ${neg(q)} ${p < 0 ? '+' : '−'} ${Math.abs(p)} × ${par(y)} = ${neg(x)}.`
        ];
      }
      return {
        question: `Solve: ${eq1} and ${eq2}. What is ${ask}?`,
        explanation: `Make one letter the subject of the simpler equation, then substitute. ${steps.join(' ')} Check in ${eq2}: ${a} × ${par(x)} + ${par(b)} × ${par(y)} = ${neg(d)}.`,
        solutionSteps: steps,
        method: 'Rearrange the equation with a coefficient of 1 (or −1), substitute, solve, then back-substitute.',
        hints: [form === 'ky' ? `Rearrange ${eq1} to get y on its own.` : `Rearrange ${eq1} to get x on its own.`, 'Put brackets around the expression when you substitute it.'],
        commonMistakes: ['Forgetting the brackets when substituting.', 'Sign errors when rearranging the first equation.']
      };
    }
  },

  {
    id: 'se-special-count',
    version: 1,
    topicId: 'simultaneous-equations',
    conceptId: 'se-special',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['se-special-f'],
    formatValue: (value) => value,
    optionOrder: SE_COUNT_OPTIONS,
    estimatedSeconds: 45,
    params(rng) {
      const type = rng.pick(['one', 'none', 'many']);
      const a1 = rng.int(1, 6);
      const b1 = signed(rng, 1, 6);
      const c1 = signed(rng, 1, 12);
      let a2;
      let b2;
      let c2;
      if (type === 'one') {
        a2 = rng.int(1, 6);
        b2 = signed(rng, 1, 6);
        c2 = signed(rng, 1, 12);
        if (a1 * b2 === a2 * b1) return null;
      } else {
        const m = rng.int(2, 4);
        [a2, b2] = [m * a1, m * b1];
        c2 = type === 'many' ? m * c1 : m * c1 + signed(rng, 1, 5);
        if (c2 === 0) return null;
      }
      const eqs = [[a1, b1, c1], [a2, b2, c2]];
      return { type, eqs: rng.chance(0.5) ? eqs : eqs.reverse() };
    },
    answer: ({ type }) => ({ one: SE_COUNT_OPTIONS[0], none: SE_COUNT_OPTIONS[1], many: SE_COUNT_OPTIONS[2] })[type],
    distractors: ({ type }) =>
      [
        { value: SE_COUNT_OPTIONS[0], why: 'did not compare the ratios of the coefficients' },
        { value: SE_COUNT_OPTIONS[1], why: type === 'many' ? 'did not check the constants: they are in the same ratio, so the lines coincide' : 'assumed the lines are parallel without checking the x and y ratios' },
        { value: SE_COUNT_OPTIONS[2], why: type === 'none' ? 'did not check the constants: they are in a different ratio, so the lines are parallel' : 'assumed the equations are multiples of each other' },
        { value: SE_COUNT_OPTIONS[3], why: 'two straight lines can never meet in exactly two points' }
      ].filter((d) => d.value !== { one: SE_COUNT_OPTIONS[0], none: SE_COUNT_OPTIONS[1], many: SE_COUNT_OPTIONS[2] }[type]),
    verify: ({ eqs }, value) => {
      const status = classifyByPoints(...eqs[0], ...eqs[1]);
      return value === { one: SE_COUNT_OPTIONS[0], none: SE_COUNT_OPTIONS[1], many: SE_COUNT_OPTIONS[2] }[status];
    },
    render({ type, eqs }) {
      const [[a1, b1, c1], [a2, b2, c2]] = eqs;
      const ratios = `a₁/a₂ = ${a1}/${a2}, b₁/b₂ = ${neg(b1)}/${par(b2)}, c₁/c₂ = ${neg(c1)}/${par(c2)}`;
      const verdictText = {
        one: `a₁/a₂ = ${fracText(a1, a2)} but b₁/b₂ = ${fracText(b1, b2)}, so the lines cross at exactly one point.`,
        none: `a₁/a₂ = b₁/b₂ = ${fracText(a1, a2)} but c₁/c₂ = ${fracText(c1, c2)}, so the lines are parallel and never meet: no solution.`,
        many: `All three ratios equal ${fracText(a1, a2)}, so one equation is a multiple of the other — the same line — and there are infinitely many solutions.`
      }[type];
      return {
        question: `How many solutions does the pair ${eqText(a1, b1, c1)} and ${eqText(a2, b2, c2)} have?`,
        explanation: `Compare the ratios of the coefficients: ${ratios}. ${verdictText}`,
        solutionSteps: [ratios + '.', verdictText],
        method: 'a₁/a₂ ≠ b₁/b₂ → one; a₁/a₂ = b₁/b₂ ≠ c₁/c₂ → none; all three equal → infinitely many.',
        hints: ['Compare the x-coefficients and the y-coefficients as ratios first.', 'If those match, compare the constants too.'],
        commonMistakes: ['Assuming every pair of equations has exactly one solution.', 'Not checking the constants when the x and y ratios match.']
      };
    }
  },

  {
    id: 'se-special-find-k',
    version: 1,
    topicId: 'simultaneous-equations',
    conceptId: 'se-special',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['se-special-f'],
    estimatedSeconds: 60,
    params(rng) {
      const kind = rng.pick(['none-x', 'none-y', 'many-c']);
      const a1 = rng.int(1, 6);
      const b1 = signed(rng, 1, 6);
      const c1 = signed(rng, 1, 12);
      const m = rng.int(2, 4);
      const delta = signed(rng, 1, 5);
      return { kind, a1, b1, c1, a2: m * a1, b2: m * b1, c2: kind === 'many-c' ? m * c1 : m * c1 + delta, m };
    },
    answer: ({ kind, a1, b1, c1, a2, b2 }) => (kind === 'none-x' ? (a1 * b2) / b1 : kind === 'none-y' ? (b1 * a2) / a1 : (c1 * a2) / a1),
    verify: ({ kind, a1, b1, c1, a2, b2, c2 }, value) => {
      const second = kind === 'none-x' ? [value, b2, c2] : kind === 'none-y' ? [a2, value, c2] : [a2, b2, value];
      return classifyByPoints(a1, b1, c1, ...second) === (kind === 'many-c' ? 'many' : 'none');
    },
    render({ kind, a1, b1, c1, a2, b2, c2, m }) {
      const eq1 = eqText(a1, b1, c1);
      const yPart = `${sgn(b2)} ${Math.abs(b2) === 1 ? '' : Math.abs(b2)}y`;
      const eq2 = kind === 'none-x' ? `kx ${yPart} = ${neg(c2)}` : kind === 'none-y' ? `${a2 === 1 ? '' : a2}x + ky = ${neg(c2)}` : `${polyText([[a2, 'x'], [b2, 'y']])} = k`;
      const k = kind === 'none-x' ? m * a1 : kind === 'none-y' ? m * b1 : m * c1;
      const want = kind === 'many-c' ? 'infinitely many solutions' : 'no solution';
      const step = {
        'none-x': `For no solution, a₁/a₂ = b₁/b₂: ${a1}/k = ${neg(b1)}/${neg(b2)} = 1/${m}, so k = ${neg(k)}. The constants ${neg(c1)}/${neg(c2)} are not in the ratio 1/${m}, so the lines are parallel, not the same.`,
        'none-y': `For no solution, a₁/a₂ = b₁/b₂: ${a1}/${a2} = 1/${m} = ${neg(b1)}/k, so k = ${neg(k)}. The constants ${neg(c1)}/${neg(c2)} are not in the ratio 1/${m}, so the lines are parallel, not the same.`,
        'many-c': `For infinitely many solutions all three ratios are equal: ${a1}/${a2} = ${neg(b1)}/${neg(b2)} = 1/${m}, so ${neg(c1)}/k = 1/${m} and k = ${neg(k)}.`
      }[kind];
      return {
        question: `For what value of k do the equations ${eq1} and ${eq2} have ${want}?`,
        explanation: step,
        solutionSteps: [kind === 'many-c' ? 'Need a₁/a₂ = b₁/b₂ = c₁/c₂.' : 'Need a₁/a₂ = b₁/b₂ ≠ c₁/c₂.', step],
        method: 'Set up the ratio condition from a₁/a₂, b₁/b₂, c₁/c₂ and solve for k.',
        hints: [`The known coefficients are in the ratio 1 : ${m}.`, kind === 'many-c' ? 'The constants must be in the same ratio.' : 'The unknown coefficient must be in that same ratio.'],
        commonMistakes: ['Setting up the ratio upside down.', kind === 'many-c' ? 'Making the constants different, which gives no solution instead.' : 'Forgetting to check that the constants are not in the same ratio.']
      };
    }
  },

  {
    id: 'se-check-pair-status',
    version: 1,
    topicId: 'simultaneous-equations',
    conceptId: 'se-check',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['se-check-f'],
    formatValue: (value) => value,
    optionOrder: SE_CHECK_OPTIONS,
    estimatedSeconds: 40,
    params(rng) {
      const target = rng.int(0, 3);
      const x0 = rng.int(-5, 9);
      const y0 = rng.int(-5, 9);
      const [a1, b1, a2, b2] = [rng.int(1, 5), signed(rng, 1, 5), rng.int(1, 5), signed(rng, 1, 5)];
      const first = target === 0 || target === 1;
      const second = target === 0 || target === 2;
      return {
        target,
        x0,
        y0,
        e1: [a1, b1, a1 * x0 + b1 * y0 + (first ? 0 : signed(rng, 1, 4))],
        e2: [a2, b2, a2 * x0 + b2 * y0 + (second ? 0 : signed(rng, 1, 4))]
      };
    },
    answer: ({ target }) => SE_CHECK_OPTIONS[target],
    distractors: ({ target }) =>
      [
        { value: SE_CHECK_OPTIONS[0], why: 'checked only one equation' },
        { value: SE_CHECK_OPTIONS[1], why: 'made an arithmetic slip substituting into the second equation' },
        { value: SE_CHECK_OPTIONS[2], why: 'made an arithmetic slip substituting into the first equation' },
        { value: SE_CHECK_OPTIONS[3], why: 'substituted x and y the wrong way round' }
      ].filter((_, i) => i !== target),
    verify: ({ x0, y0, e1, e2 }, value) => {
      const one = e1[0] * x0 + e1[1] * y0 === e1[2];
      const two = e2[0] * x0 + e2[1] * y0 === e2[2];
      return value === SE_CHECK_OPTIONS[one && two ? 0 : one ? 1 : two ? 2 : 3];
    },
    render({ target, x0, y0, e1, e2 }) {
      const line = ([a, b, c], n) => {
        const v = a * x0 + b * y0;
        return `${n}: ${a} × ${par(x0)} + ${par(b)} × ${par(y0)} = ${neg(v)}, which ${v === c ? 'matches' : 'does not match'} ${neg(c)}.`;
      };
      return {
        question: `Do x = ${neg(x0)} and y = ${neg(y0)} satisfy both ${eqText(...e1)} and ${eqText(...e2)}?`,
        explanation: `Substitute into each equation separately. ${line(e1, 'First')} ${line(e2, 'Second')} So the answer is "${SE_CHECK_OPTIONS[target]}".`,
        solutionSteps: [line(e1, 'First'), line(e2, 'Second')],
        method: 'Substitute both values into both equations; a solution must satisfy each one.',
        hints: ['Check each equation on its own.', 'Put negative values in brackets when you substitute.'],
        commonMistakes: ['Checking only the first equation.', 'Losing a minus sign when substituting a negative value.']
      };
    }
  },

  {
    id: 'se-check-which-pair',
    version: 1,
    topicId: 'simultaneous-equations',
    conceptId: 'se-check',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['se-check-f'],
    estimatedSeconds: 50,
    params(rng) {
      const [a1, b1, a2, b2] = [rng.int(1, 5), signed(rng, 1, 5), rng.int(1, 5), signed(rng, 1, 5)];
      if (a1 * b2 === a2 * b1) return null;
      const x0 = rng.int(-6, 9);
      const y0 = rng.int(-6, 9);
      if (x0 === y0) return null;
      return { a1, b1, a2, b2, x0, y0, c1: a1 * x0 + b1 * y0, c2: a2 * x0 + b2 * y0 };
    },
    answer: ({ x0, y0 }) => `(${neg(x0)}, ${neg(y0)})`,
    distractors: ({ a1, b1, a2, b2, x0, y0 }) => [
      { value: `(${neg(x0 + b1)}, ${neg(y0 - a1)})`, why: 'checked only the first equation' },
      { value: `(${neg(x0 + b2)}, ${neg(y0 - a2)})`, why: 'checked only the second equation' },
      { value: `(${neg(y0)}, ${neg(x0)})`, why: 'swapped the values of x and y' },
      { value: `(${neg(-x0)}, ${neg(-y0)})`, why: 'got both signs wrong' }
    ],
    verify: ({ a1, b1, a2, b2, c1, c2 }, value) => {
      const m = /^\((−?\d+), (−?\d+)\)$/.exec(value);
      if (!m) return false;
      const [x, y] = [num(m[1]), num(m[2])];
      return a1 * x + b1 * y === c1 && a2 * x + b2 * y === c2;
    },
    render({ a1, b1, a2, b2, x0, y0, c1, c2 }) {
      const e1 = eqText(a1, b1, c1);
      const e2 = eqText(a2, b2, c2);
      return {
        question: `Which pair (x, y) satisfies both ${e1} and ${e2}?`,
        explanation: `Substitute each pair into both equations. For (${neg(x0)}, ${neg(y0)}): ${a1} × ${par(x0)} + ${par(b1)} × ${par(y0)} = ${neg(c1)} ✓ and ${a2} × ${par(x0)} + ${par(b2)} × ${par(y0)} = ${neg(c2)} ✓. The other pairs fail at least one equation — for example (${neg(x0 + b1)}, ${neg(y0 - a1)}) fits the first equation but not the second.`,
        solutionSteps: [`First equation at (${neg(x0)}, ${neg(y0)}): ${neg(c1)} ✓.`, `Second equation at (${neg(x0)}, ${neg(y0)}): ${neg(c2)} ✓.`],
        method: 'Test each option in both equations; only a pair that satisfies both is a solution.',
        hints: ['A pair that works in one equation may fail the other — check both.', 'Remember the order: the first number is x, the second is y.'],
        commonMistakes: ['Stopping after the first equation works.', 'Swapping x and y.']
      };
    }
  },

  /* ================================ surds & indices ================================ */
  {
    id: 'si-rationalise-single-surd',
    version: 1,
    topicId: 'surds-indices',
    conceptId: 'si-rationalise',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['si-rationalise-f'],
    estimatedSeconds: 35,
    params(rng) {
      const a = rng.pick([2, 3, 5, 6, 7, 10, 11]);
      const k = rng.chance(0.5) ? a * rng.int(1, 4) : rng.int(2, 12);
      if (k === 1) return null;
      return { a, k };
    },
    answer: ({ a, k }) => surdOver(k, `√${a}`, a, false),
    distractors: ({ a, k }) => [
      { value: `${k}√${a}`, why: 'multiplied only the top by √a' },
      { value: fracText(k, a), why: 'multiplied only the bottom by √a, losing the surd' },
      { value: `√${a}/${k}`, why: 'turned the fraction upside down' }
    ],
    verify: ({ a, k }, value) => denominatorIsRational(value) && nearlyEqual(evalExpr(value), k / Math.sqrt(a)),
    render({ a, k }) {
      const ans = surdOver(k, `√${a}`, a, false);
      const raw = `${k}√${a}/${a}`;
      return {
        question: `Rationalise the denominator: ${k}/√${a}.`,
        explanation: `Multiply the top and bottom by √${a}: ${k}/√${a} × √${a}/√${a} = ${raw}, because √${a} × √${a} = ${a}.${ans !== raw ? ` This simplifies to ${ans}.` : ''}`,
        solutionSteps: [`Multiply by √${a}/√${a}.`, `Top: ${k}√${a}; bottom: √${a} × √${a} = ${a}.`, `${raw}${ans !== raw ? ` = ${ans}` : ''}.`],
        method: '1/√a = √a/a: multiply top and bottom by the surd.',
        hints: [`Multiply both the numerator and the denominator by √${a}.`, `√${a} × √${a} = ${a}.`],
        commonMistakes: ['Multiplying only the numerator (or only the denominator).', 'Forgetting to simplify the fraction at the end.']
      };
    }
  },

  {
    id: 'si-rationalise-conjugate',
    version: 1,
    topicId: 'surds-indices',
    conceptId: 'si-rationalise',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['si-rationalise-f'],
    estimatedSeconds: 60,
    params(rng) {
      const plus = rng.chance(0.5);
      if (rng.chance(0.5)) {
        const [b, a] = rng.shuffle(NONSQUARES).slice(0, 2).sort((p, q) => p - q);
        if (a - b > 8) return null;
        const D = a - b;
        const k = rng.chance(0.5) ? D * rng.int(1, 3) : rng.int(1, 9);
        return { kind: 'surds', a, b, plus, k, D, wrongD: a + b };
      }
      const m = rng.int(2, 6);
      const n = rng.pick(NONSQUARES.filter((v) => v < m * m));
      const D = m * m - n;
      const k = rng.chance(0.5) ? D * rng.int(1, 3) : rng.int(1, 9);
      return { kind: 'int', m, n, plus, k, D, wrongD: m * m + n };
    },
    answer: (P) => surdOver(P.k, conj(P, true), P.D),
    distractors: (P) => [
      { value: surdOver(P.k, conj(P, false), P.D), why: 'multiplied by the same expression instead of its conjugate' },
      { value: surdOver(P.k, conj(P, true), P.wrongD), why: 'added the squares in the denominator instead of subtracting them' },
      { value: P.D !== 1 ? `${P.k === 1 ? '' : P.k}(${conj(P, true)})` : null, why: `forgot to divide by ${P.D}` },
      { value: P.kind === 'int' && P.m - P.n > 0 && P.m - P.n !== P.D ? surdOver(P.k, conj(P, true), P.m - P.n) : null, why: `forgot to square ${P.m}` }
    ],
    verify: (P, value) => {
      const den = P.kind === 'surds' ? Math.sqrt(P.a) + (P.plus ? 1 : -1) * Math.sqrt(P.b) : P.m + (P.plus ? 1 : -1) * Math.sqrt(P.n);
      return denominatorIsRational(value) && nearlyEqual(evalExpr(value), P.k / den);
    },
    render(P) {
      const den = conj(P, false);
      const c = conj(P, true);
      const ans = surdOver(P.k, c, P.D);
      const squares = P.kind === 'surds' ? `(√${P.a})² − (√${P.b})² = ${P.a} − ${P.b} = ${P.D}` : `${P.m}² − (√${P.n})² = ${P.m * P.m} − ${P.n} = ${P.D}`;
      return {
        question: `Rationalise the denominator: ${P.k}/(${den}).`,
        explanation: `Multiply the top and bottom by the conjugate ${c}. The bottom becomes ${squares} (difference of squares), and the top becomes ${P.k === 1 ? '' : P.k}(${c}). So ${P.k}/(${den}) = ${ans}.`,
        solutionSteps: [`Conjugate of ${den}: ${c}.`, `Denominator: ${squares}.`, `Result: ${ans}.`],
        method: 'Multiply by the conjugate (change the sign between the terms); the denominator becomes a² − b².',
        hints: [`The conjugate of ${den} is ${c}.`, '(p + q)(p − q) = p² − q² removes the surd.'],
        commonMistakes: ['Multiplying by the same expression instead of the conjugate.', 'Adding the squares in the denominator.']
      };
    }
  }
];

/** The denominator (conjugate = false) or its conjugate, for si-rationalise-conjugate. */
function conj(P, flip) {
  const s = P.plus !== flip ? '+' : '−';
  return P.kind === 'surds' ? `√${P.a} ${s} √${P.b}` : `${P.m} ${s} √${P.n}`;
}
