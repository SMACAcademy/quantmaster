/**
 * Bank-style quadratic comparison ("I. … II. … compare x and y"), with the
 * five answer choices IBPS and SBI papers use, in their usual order.
 * The helpers are shared with the authored questions' build script.
 */

import { fmt, gcd, nearlyEqual } from '../core.js';

export const QC_OPTIONS = ['x > y', 'x < y', 'x ≥ y', 'x ≤ y', 'x = y or the relationship cannot be established'];
const EPS = 1e-9;

/** The answer choice for two sets of values, by comparing every pair. */
export function verdict(xs, ys) {
  const diffs = xs.flatMap((x) => ys.map((y) => x - y));
  if (diffs.every((d) => d > EPS)) return QC_OPTIONS[0];
  if (diffs.every((d) => d < -EPS)) return QC_OPTIONS[1];
  if (diffs.every((d) => Math.abs(d) <= EPS)) return QC_OPTIONS[4];
  if (diffs.every((d) => d >= -EPS)) return QC_OPTIONS[2];
  if (diffs.every((d) => d <= EPS)) return QC_OPTIONS[3];
  return QC_OPTIONS[4];
}

/** The same choice found a second way, from the smallest and largest values only. */
function verdictFromRange(xs, ys) {
  const [xMin, xMax, yMin, yMax] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const same = (a, b) => Math.abs(a - b) <= EPS;
  if (same(xMin, xMax) && same(yMin, yMax) && same(xMin, yMin)) return QC_OPTIONS[4];
  if (xMin > yMax + EPS) return QC_OPTIONS[0];
  if (xMax < yMin - EPS) return QC_OPTIONS[1];
  if (same(xMin, yMax)) return QC_OPTIONS[2];
  if (same(xMax, yMin)) return QC_OPTIONS[3];
  return QC_OPTIONS[4];
}

/** Real roots of a·v² + b·v + c = 0 from the quadratic formula (one value when repeated). */
export function rootsOf(a, b, c) {
  const d = b * b - 4 * a * c;
  if (d < -EPS) return [];
  const r = Math.sqrt(Math.max(0, d));
  const roots = [(-b - r) / (2 * a), (-b + r) / (2 * a)];
  return nearlyEqual(roots[0], roots[1], 1e-12) ? [roots[0]] : roots.sort((p, q) => p - q);
}

const sign = (n) => (n < 0 ? '−' : '+');
/** "2x² − 7x + 6 = 0" from coefficients. */
export function quadText(a, b, c, v) {
  const lead = a === 1 ? `${v}²` : `${a}${v}²`;
  const mid = b === 0 ? '' : ` ${sign(b)} ${Math.abs(b) === 1 ? '' : Math.abs(b)}${v}`;
  const end = c === 0 ? '' : ` ${sign(c)} ${Math.abs(c)}`;
  return `${lead}${mid}${end} = 0`;
}

/** A root as people write it: 3, −4, 3/2, −1/3. */
export function rootText(value) {
  if (Number.isInteger(Math.round(value * 1e9) / 1e9)) return fmt(Math.round(value)).replace('-', '−');
  for (const d of [2, 3, 4, 5, 6]) {
    const n = Math.round(value * d);
    if (Math.abs(n / d - value) < 1e-9) {
      const g = gcd(Math.abs(n), d);
      return `${n < 0 ? '−' : ''}${Math.abs(n) / g}/${d / g}`;
    }
  }
  return fmt(value).replace('-', '−');
}

const table = (one, two) => ({ caption: 'Solve both equations, then compare x and y', headers: ['Statement I', 'Statement II'], rows: [[one, two]] });
const QUESTION = 'Which relation between x and y is true?';
const distractors = (answer) => QC_OPTIONS.filter((option) => option !== answer).map((value) => ({ value, why: 'a different relation' }));

/** Pick values until their verdict is the target, so every answer choice comes up evenly. */
function aimFor(rng, target, draw) {
  for (let i = 0; i < 60; i++) {
    const candidate = draw();
    if (candidate && verdict(candidate.xs, candidate.ys) === target) return candidate;
  }
  return null;
}

function explain(xs, ys) {
  const answer = verdict(xs, ys);
  const list = (vs) => vs.map(rootText).join(' and ');
  const why = {
    [QC_OPTIONS[0]]: 'every value of x is greater than every value of y',
    [QC_OPTIONS[1]]: 'every value of x is less than every value of y',
    [QC_OPTIONS[2]]: 'every value of x is at least every value of y, and one pair is equal',
    [QC_OPTIONS[3]]: 'every value of x is at most every value of y, and one pair is equal',
    [QC_OPTIONS[4]]: xs.length === 1 && ys.length === 1 ? 'x and y are equal' : 'some pairs have x above y and others have x below (or equal)'
  }[answer];
  return { answer, list, why };
}

export const quadComparisonTemplates = [
  {
    id: 'qc-two-monic',
    version: 1,
    topicId: 'quadratic-comparison',
    conceptId: 'qc-compare',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['qc-factor-f', 'qc-compare-f'],
    formatValue: (value) => value,
    optionOrder: QC_OPTIONS,
    optionCount: 5,
    estimatedSeconds: 50,
    params(rng) {
      const target = rng.pick(QC_OPTIONS);
      const root = () => rng.int(-9, 9) || 1;
      return aimFor(rng, target, () => {
        const x = [root(), root()];
        const y = [root(), root()];
        const xs = [...new Set(x)];
        const ys = [...new Set(y)];
        return { x, y, xs, ys };
      });
    },
    answer: ({ xs, ys }) => verdict(xs, ys),
    distractors: ({ xs, ys }) => distractors(verdict(xs, ys)),
    // Solve the equations as printed, then compare a second way.
    verify: ({ x, y }, value) => verdictFromRange(rootsOf(1, -(x[0] + x[1]), x[0] * x[1]), rootsOf(1, -(y[0] + y[1]), y[0] * y[1])) === value,
    render({ x, y, xs, ys }) {
      const one = quadText(1, -(x[0] + x[1]), x[0] * x[1], 'x');
      const two = quadText(1, -(y[0] + y[1]), y[0] * y[1], 'y');
      const { answer, list, why } = explain(xs, ys);
      return {
        question: QUESTION,
        table: table(one, two),
        explanation: `I: x = ${list(xs)}. II: y = ${list(ys)}. Comparing every pair, ${why}, so the answer is "${answer}".`,
        solutionSteps: [`${one} factorises to give x = ${list(xs)}.`, `${two} factorises to give y = ${list(ys)}.`, `Compare each x with each y: ${answer}.`],
        method: 'Find both roots of each equation, then compare every x with every y.',
        hints: ['Find two numbers with the right product and sum for each equation.', 'The roots are those numbers with their signs changed.'],
        commonMistakes: ['Comparing only the larger root of each equation.']
      };
    }
  },

  {
    id: 'qc-two-general',
    version: 1,
    topicId: 'quadratic-comparison',
    conceptId: 'qc-factorise',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['qc-factor-f', 'qc-compare-f'],
    formatValue: (value) => value,
    optionOrder: QC_OPTIONS,
    optionCount: 5,
    estimatedSeconds: 70,
    params(rng) {
      const target = rng.pick(QC_OPTIONS);
      // (a·v − p)(v − q) = a·v² − (aq + p)·v + pq: roots p/a and q.
      const make = () => {
        const a = rng.pick([2, 3]);
        const p = rng.int(-9, 9) || 1;
        const q = rng.int(-6, 6) || 1;
        if (gcd(Math.abs(p), a) !== 1) return null;
        return { a, b: -(a * q + p), c: p * q, roots: [...new Set([p / a, q])] };
      };
      return aimFor(rng, target, () => {
        const one = make();
        const two = make();
        return one && two ? { one, two, xs: one.roots, ys: two.roots } : null;
      });
    },
    answer: ({ xs, ys }) => verdict(xs, ys),
    distractors: ({ xs, ys }) => distractors(verdict(xs, ys)),
    verify: ({ one, two }, value) => verdictFromRange(rootsOf(one.a, one.b, one.c), rootsOf(two.a, two.b, two.c)) === value,
    render({ one, two, xs, ys }) {
      const first = quadText(one.a, one.b, one.c, 'x');
      const second = quadText(two.a, two.b, two.c, 'y');
      const { answer, list, why } = explain(xs, ys);
      return {
        question: QUESTION,
        table: table(first, second),
        explanation: `I: x = ${list(xs)}. II: y = ${list(ys)}. Comparing every pair, ${why}, so the answer is "${answer}".`,
        solutionSteps: [`Split the middle term of ${first}: x = ${list(xs)}.`, `Split the middle term of ${second}: y = ${list(ys)}.`, `Compare each pair: ${answer}.`],
        method: 'Split the middle term using two numbers whose product is a × c, then compare all the roots.',
        hints: [`For I, find two numbers with product ${one.a * one.c} and sum ${one.b}.`, 'Fractional roots are common here: compare them as decimals if that helps.'],
        commonMistakes: ['Dividing by the leading coefficient wrongly, so a root like 3/2 becomes 6.']
      };
    }
  },

  {
    id: 'qc-squares-roots',
    version: 1,
    topicId: 'quadratic-comparison',
    conceptId: 'qc-special',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['qc-square-f'],
    formatValue: (value) => value,
    optionOrder: QC_OPTIONS,
    optionCount: 5,
    estimatedSeconds: 40,
    params(rng) {
      const forms = {
        square: (k, v) => ({ text: `${v}² = ${k * k}`, values: [-k, k] }),
        root: (k, v) => ({ text: `${v} = √${k * k}`, values: [k] }),
        cube: (k, v) => ({ text: `${v}³ = ${k ** 3}`, values: [k] }),
        linear: (k, v) => {
          const m = rng.int(2, 5);
          const c = rng.int(1, 9);
          return { text: `${m}${v} + ${c} = ${m * k + c}`, values: [k] };
        }
      };
      const pick = (v) => {
        const form = rng.pick(Object.keys(forms));
        const k = rng.int(2, 12);
        return { form, ...forms[form](k, v) };
      };
      return aimFor(rng, rng.pick(QC_OPTIONS), () => {
        const one = pick('x');
        const two = pick('y');
        if (one.form !== 'square' && two.form !== 'square') return null;
        return { one, two, xs: one.values, ys: two.values };
      });
    },
    answer: ({ xs, ys }) => verdict(xs, ys),
    distractors: ({ xs, ys }) => distractors(verdict(xs, ys)),
    // Solve each statement by search over the integers, independently of how it was built.
    verify: ({ one, two }, value) => {
      const solve = (text) => {
        const [lhs, rhs] = text.split(' = ');
        // "y = √49": the principal (positive) square root only.
        if (rhs.startsWith('√')) return [Math.sqrt(Number(rhs.slice(1)))];
        const target = Number(rhs);
        const linear = /^(\d+)[xy] \+ (\d+)$/.exec(lhs);
        const left = (v) => (lhs.endsWith('²') ? v * v : lhs.endsWith('³') ? v ** 3 : Number(linear[1]) * v + Number(linear[2]));
        const found = [];
        for (let v = -50; v <= 50; v++) if (left(v) === target) found.push(v);
        return found;
      };
      return verdictFromRange(solve(one.text), solve(two.text)) === value;
    },
    render({ one, two, xs, ys }) {
      const { answer, list, why } = explain(xs, ys);
      return {
        question: QUESTION,
        table: table(one.text, two.text),
        explanation: `I gives x = ${list(xs)}; II gives y = ${list(ys)}. A square has two square roots (±), but √ on its own means only the positive one. Comparing every pair, ${why}: "${answer}".`,
        solutionSteps: [`I: x = ${list(xs)}.`, `II: y = ${list(ys)}.`, `Compare each pair: ${answer}.`],
        method: 'v² = k has two answers, ±√k; v = √k has one.',
        hints: ['Does the equation give one value or two?', 'v² = 49 means v = 7 or v = −7.'],
        commonMistakes: ['Forgetting the negative root of a squared equation.', 'Giving √ a negative value as well.']
      };
    }
  },

  {
    id: 'qc-root-signs',
    version: 1,
    topicId: 'quadratic-comparison',
    conceptId: 'qc-sign-rule',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['qc-sc-signs'],
    formatValue: (value) => value,
    estimatedSeconds: 25,
    params(rng) {
      const p = rng.int(1, 12);
      const q = rng.int(1, 12);
      const kind = rng.pick(['both positive', 'both negative', 'opposite']);
      const [r1, r2] = kind === 'both positive' ? [p, q] : kind === 'both negative' ? [-p, -q] : [p, -q];
      if (r1 + r2 === 0) return null;
      return { r1, r2, kind };
    },
    answer: ({ kind }) => ({ 'both positive': 'Both roots are positive', 'both negative': 'Both roots are negative', opposite: 'One root is positive and one negative' })[kind],
    distractors: () => ['Both roots are positive', 'Both roots are negative', 'One root is positive and one negative', 'Both roots are zero'].map((value) => ({ value, why: 'a different sign pattern' })),
    verify: ({ r1, r2 }, value) => {
      const roots = rootsOf(1, -(r1 + r2), r1 * r2);
      const pos = roots.filter((r) => r > 0).length;
      const neg = roots.filter((r) => r < 0).length;
      const actual = pos && !neg ? 'Both roots are positive' : neg && !pos ? 'Both roots are negative' : 'One root is positive and one negative';
      return actual === value;
    },
    render({ r1, r2, kind }) {
      const b = -(r1 + r2);
      const c = r1 * r2;
      const text = quadText(1, b, c, 'x');
      const rule =
        c < 0
          ? 'The constant term is negative, so the roots have opposite signs.'
          : b < 0
            ? 'The constant is positive (same signs) and the x term is negative, so both roots are positive.'
            : 'The constant is positive (same signs) and the x term is positive, so both roots are negative.';
      return {
        question: `Without solving, what can you say about the roots of ${text}?`,
        explanation: `${rule} (The roots are ${rootText(Math.min(r1, r2))} and ${rootText(Math.max(r1, r2))}.)`,
        solutionSteps: ['Product of the roots = the constant term; sum = −(x coefficient).', rule],
        method: 'Read the signs of the roots from the signs of the coefficients.',
        hints: ['Look at the sign of the constant term first.'],
        commonMistakes: ['Reading the roots\' signs as the same as the signs in the equation.']
      };
    }
  }
];
