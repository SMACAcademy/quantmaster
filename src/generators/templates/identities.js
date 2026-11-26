/** Algebraic identities and inequalities templates. */

import { fmt } from '../core.js';

export const identitiesTemplates = [
  /* ============================ algebraic identities ============================ */
  {
    id: 'ai-expand-square',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-squares',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ai-squares-f'],
    estimatedSeconds: 30,
    params(rng) {
      const k = rng.int(2, 20);
      return { k };
    },
    answer: ({ k }) => 2 * k,
    formatValue: (value) => fmt(value),
    distractors: ({ k }) => [
      { value: k, why: 'forgot to double the product for the middle term' },
      { value: k * k, why: 'squared k instead of doubling it' },
      { value: k + 1, why: 'arithmetic slip' },
      { value: 2 * k + 1, why: 'arithmetic slip' }
    ],
    verify: ({ k }, value) => 2 * k === value,
    render({ k }) {
      return {
        question: `When (x + ${k})² is expanded, what is the coefficient of x?`,
        explanation: `(x + ${k})² = x² + 2(${k})x + ${k * k}, using (a+b)² = a² + 2ab + b². The coefficient of x is 2 × ${k} = ${2 * k}.`,
        solutionSteps: [`a = x, b = ${k}.`, `2ab = 2 × ${k} = ${2 * k}.`],
        method: 'Apply (a + b)² = a² + 2ab + b².',
        hints: ['The coefficient of x comes from the middle term 2ab.'],
        commonMistakes: ['Forgetting to double the product, using only k as the coefficient.']
      };
    }
  },

  {
    id: 'ai-numeric-square',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-apply',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['ai-apply-f', 'ai-squares-f'],
    estimatedSeconds: 45,
    tags: ['trap'],
    params(rng) {
      const A = rng.pick([20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300]);
      const d = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
      const N = A + d;
      return { A, d, N };
    },
    answer: ({ N }) => N * N,
    verify: ({ A, d }, value) => (A + d) * (A + d) === value,
    render({ A, d, N }) {
      const abs = Math.abs(d);
      const opWord = d >= 0 ? '+' : '−';
      return {
        question: `Using (a ${opWord} b)², compute ${N}² without long multiplication.`,
        explanation: `${N} = ${A} ${opWord} ${abs}, so ${N}² = ${A}² ${opWord} 2(${A})(${abs}) + ${abs}² = ${A * A} ${opWord} ${2 * A * abs} + ${abs * abs} = ${N * N}.`,
        solutionSteps: [`Split ${N} as ${A} ${opWord} ${abs}.`, `${A}² = ${A * A}; 2 × ${A} × ${abs} = ${2 * A * abs}; ${abs}² = ${abs * abs}.`, `Combine: ${N * N}.`],
        method: 'Split the number into a round part and a small part, then apply the square identity.',
        hints: ['Choose the round number nearest to the given value.'],
        commonMistakes: ['Forgetting the middle term when expanding.']
      };
    }
  },

  {
    id: 'ai-sumsquares-from-sumproduct',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-apply',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['ai-squares-f'],
    estimatedSeconds: 45,
    params(rng) {
      const a = rng.int(2, 20);
      const b = rng.int(2, 20);
      if (a === b) return null;
      const S = a + b;
      const P = a * b;
      return { a, b, S, P };
    },
    answer: ({ S, P }) => S * S - 2 * P,
    verify: ({ a, b }, value) => a * a + b * b === value,
    render({ S, P }) {
      const result = S * S - 2 * P;
      return {
        question: `If a + b = ${S} and ab = ${P}, what is a² + b²?`,
        explanation: `(a+b)² = a² + 2ab + b², so a² + b² = (a+b)² − 2ab = ${S * S} − ${2 * P} = ${result}.`,
        solutionSteps: [`(a+b)² = ${S * S}.`, `2ab = ${2 * P}.`, `${S * S} − ${2 * P} = ${result}.`],
        method: 'Rearrange the square identity to isolate a² + b².',
        hints: ['(a+b)² already contains a² + b² together with 2ab.'],
        commonMistakes: ['Subtracting ab instead of 2ab.']
      };
    }
  },

  {
    id: 'ai-diffsquares-product',
    version: 1,
    topicId: 'algebraic-identities',
    conceptId: 'ai-diffsquares',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['ai-diffsquares-f'],
    estimatedSeconds: 45,
    params(rng) {
      const C = rng.pick([20, 30, 40, 50, 60, 70, 80, 90, 100]);
      const d = rng.int(1, 9);
      if (d >= C) return null;
      return { C, d };
    },
    answer: ({ C, d }) => C * C - d * d,
    verify: ({ C, d }, value) => (C - d) * (C + d) === value,
    render({ C, d }) {
      const result = C * C - d * d;
      return {
        question: `What is ${C - d} × ${C + d}, using the difference of squares?`,
        explanation: `${C - d} × ${C + d} = (${C} − ${d})(${C} + ${d}) = ${C}² − ${d}² = ${C * C} − ${d * d} = ${result}.`,
        solutionSteps: [`Recognise the pair as (${C}−${d})(${C}+${d}).`, `${C}² − ${d}² = ${C * C} − ${d * d}.`, `= ${result}.`],
        method: 'Rewrite the product as (C−d)(C+d) and apply a² − b².',
        hints: ['The two numbers are equally spaced around a round centre value.'],
        commonMistakes: ['Multiplying the two numbers directly instead of using the identity.']
      };
    }
  },

  /* =============================== inequalities =============================== */
  {
    id: 'in-basic-flip',
    version: 1,
    topicId: 'inequalities',
    conceptId: 'in-basic',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['in-flip-f'],
    estimatedSeconds: 35,
    tags: ['trap'],
    params(rng) {
      const x0 = rng.int(-10, 20);
      const a = -rng.int(2, 9);
      const b = rng.int(-15, 15);
      const c = a * x0 + b;
      return { x0, a, b, c };
    },
    answer: ({ x0 }) => `x < ${x0}`,
    distractors: ({ x0 }) => [
      { value: `x > ${x0}`, why: 'forgot to flip the inequality sign when dividing by a negative number' },
      { value: `x < ${x0 + 1}`, why: 'arithmetic slip' },
      { value: `x < ${x0 - 1}`, why: 'arithmetic slip' },
      { value: `x > ${x0 + 1}`, why: 'forgot to flip the sign and made an arithmetic slip' }
    ],
    verify({ x0 }, value) {
      const match = /^x\s*([<>])\s*(-?\d+)$/.exec(value);
      if (!match) return false;
      return match[1] === '<' && Number(match[2]) === x0;
    },
    render({ a, b, c, x0 }) {
      return {
        question: `Solve for x: ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)} > ${c}.`,
        explanation: `Isolate x: ${a}x > ${c - b}. Dividing by ${a} (negative) flips the sign: x < ${x0}.`,
        solutionSteps: [`${a}x > ${c - b}.`, `Divide by ${a} and flip: x < ${x0}.`],
        method: 'Dividing by a negative number flips the inequality.',
        hints: [`The coefficient of x, ${a}, is negative — check whether the sign needs to flip.`],
        commonMistakes: ['Forgetting to flip the inequality sign when dividing by a negative coefficient.']
      };
    }
  },

  {
    id: 'in-compound-solve',
    version: 1,
    topicId: 'inequalities',
    conceptId: 'in-compound',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['in-compound-f'],
    estimatedSeconds: 50,
    params(rng) {
      const p = rng.int(-10, 10);
      const q = rng.int(p + 1, p + 15);
      const a = rng.int(2, 6);
      const b = rng.int(-10, 10);
      const lo = a * p + b;
      const hi = a * q + b;
      return { p, q, a, b, lo, hi };
    },
    answer: ({ p, q }) => `${p} < x < ${q}`,
    distractors: ({ p, q, lo, hi }) => [
      { value: `${q} < x < ${p}`, why: 'swapped the two bounds' },
      { value: `${p - 1} < x < ${q - 1}`, why: 'arithmetic slip solving the bounds' },
      { value: `${p + 1} < x < ${q + 1}`, why: 'arithmetic slip solving the bounds' },
      { value: `${lo} < x < ${hi}`, why: 'forgot to fully solve for x, used the unsolved bounds' }
    ],
    verify({ a, b, lo, hi }, value) {
      const match = /^(-?\d+) < x < (-?\d+)$/.exec(value);
      if (!match) return false;
      const p = Number(match[1]);
      const q = Number(match[2]);
      return a * p + b === lo && a * q + b === hi;
    },
    render({ p, q, a, b, lo, hi }) {
      return {
        question: `Solve: ${lo} < ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)} < ${hi}. Give the solution as a compound inequality.`,
        explanation: `Subtract ${b} from all three parts: ${lo - b} < ${a}x < ${hi - b}. Divide by ${a}: ${p} < x < ${q}.`,
        solutionSteps: [`Subtract ${b}: ${lo - b} < ${a}x < ${hi - b}.`, `Divide by ${a}: ${p} < x < ${q}.`],
        method: 'Apply the same operation to all three parts of the inequality.',
        hints: ['Solve it like an equation, but keep three parts throughout.'],
        commonMistakes: ['Applying an operation to only one side of the compound inequality.']
      };
    }
  },

  {
    id: 'in-word-boundary',
    version: 1,
    topicId: 'inequalities',
    conceptId: 'in-word',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['in-word-f'],
    estimatedSeconds: 45,
    params(rng) {
      const x0 = rng.int(-10, 30);
      const k = rng.int(1, 20);
      const m = 2 * x0 - k;
      return { x0, k, m };
    },
    answer: ({ x0 }) => x0,
    verify: ({ k, m }, value) => 2 * value - k === m,
    render({ k, m, x0 }) {
      return {
        question: `Twice a number, decreased by ${k}, is at least ${m}. What is the smallest integer value the number can take?`,
        explanation: `The inequality is 2x − ${k} ≥ ${m}, so 2x ≥ ${m + k}, giving x ≥ ${x0}. The smallest integer is ${x0}.`,
        solutionSteps: [`2x − ${k} ≥ ${m}.`, `2x ≥ ${m + k}.`, `x ≥ ${x0}.`],
        method: 'Translate "at least" as ≥, then solve as usual.',
        hints: ['"At least" includes the boundary value itself.'],
        commonMistakes: ['Using a strict inequality and excluding the boundary value.']
      };
    }
  },

  {
    id: 'in-quadratic-sign',
    version: 1,
    topicId: 'inequalities',
    conceptId: 'in-quadratic',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['in-quadratic-f'],
    estimatedSeconds: 60,
    params(rng) {
      const p = rng.int(-10, 5);
      const q = rng.int(p + 1, p + 15);
      const positive = rng.chance(0.5);
      return { p, q, positive };
    },
    answer: ({ p, q, positive }) => (positive ? `x < ${p} or x > ${q}` : `${p} < x < ${q}`),
    distractors: ({ p, q, positive }) => [
      { value: positive ? `${p} < x < ${q}` : `x < ${p} or x > ${q}`, why: 'used the wrong region for the given sign' },
      { value: positive ? `x < ${q} or x > ${p}` : `${q} < x < ${p}`, why: 'swapped the two roots' },
      { value: positive ? `x < ${p - 1} or x > ${q + 1}` : `${p - 1} < x < ${q + 1}`, why: 'off-by-one error at the boundary' },
      { value: positive ? `x < ${p + 1} or x > ${q - 1}` : `${p + 1} < x < ${q - 1}`, why: 'off-by-one error at the boundary' }
    ],
    verify({ p, q, positive }, value) {
      const f = (x) => (x - p) * (x - q);
      const probes = [p - 1, (p + q) / 2, q + 1];
      const outsideMatch = /^x < (-?\d+(?:\.\d+)?) or x > (-?\d+(?:\.\d+)?)$/.exec(value);
      const betweenMatch = /^(-?\d+(?:\.\d+)?) < x < (-?\d+(?:\.\d+)?)$/.exec(value);
      let predicate;
      if (outsideMatch) {
        const lo = Number(outsideMatch[1]);
        const hi = Number(outsideMatch[2]);
        predicate = (x) => x < lo || x > hi;
      } else if (betweenMatch) {
        const lo = Number(betweenMatch[1]);
        const hi = Number(betweenMatch[2]);
        predicate = (x) => x > lo && x < hi;
      } else {
        return false;
      }
      return probes.every((x) => predicate(x) === (positive ? f(x) > 0 : f(x) < 0));
    },
    render({ p, q, positive }) {
      return {
        question: `Solve: (x − ${p})(x − ${q}) ${positive ? '>' : '<'} 0.`,
        explanation: positive
          ? `The roots are ${p} and ${q}. Outside the roots, both factors share a sign, so the product is positive: x < ${p} or x > ${q}.`
          : `The roots are ${p} and ${q}. Between the roots, the two factors have opposite signs, so the product is negative: ${p} < x < ${q}.`,
        solutionSteps: [`Roots at x = ${p} and x = ${q}.`, `Test a point in each region to check the sign of the product.`, positive ? `Positive outside the roots.` : `Negative between the roots.`],
        method: 'Find the roots, then test one point in each region.',
        hints: ['Between the roots, the two factors have opposite signs.'],
        commonMistakes: ['Choosing the opposite region from the one the sign requires.']
      };
    }
  }
];
