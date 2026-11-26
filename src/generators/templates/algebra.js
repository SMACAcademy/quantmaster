/** Algebraic expressions, linear equations, simultaneous equations and quadratic equations templates. */

import { fmt, gcd, nearlyEqual } from '../core.js';

const sign = (value) => (value >= 0 ? '+' : '−');

export const algebraTemplates = [
  /* ========================= algebraic expressions ========================= */
  {
    id: 'ae-liketerms-combine',
    version: 1,
    topicId: 'algebraic-expressions',
    conceptId: 'ae-simplify',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ae-liketerms-f'],
    estimatedSeconds: 30,
    params(rng) {
      const a = rng.int(3, 15);
      const b = rng.int(3, 15);
      const c = rng.int(2, a + b - 1);
      return { a, b, c };
    },
    answer: ({ a, b, c }) => a + b - c,
    formatValue: (value) => `${fmt(value)}x`,
    distractors: ({ a, b, c }) => [
      { value: Math.abs(a - b + c), why: 'combined the coefficients with the wrong signs' },
      { value: a + b + c, why: 'added every coefficient, including the one being subtracted' },
      { value: Math.abs(a - b - c), why: 'subtracted the wrong pair of coefficients' },
      { value: Math.max(a * 1 - c, 0) + 1, why: 'dropped one of the three terms' }
    ],
    verify: ({ a, b, c }, value) => a + b - c === value,
    render({ a, b, c }) {
      const total = a + b - c;
      return {
        question: `Simplify: ${a}x + ${b}x − ${c}x.`,
        explanation: `Only the coefficients of the like terms combine: ${a} + ${b} − ${c} = ${total}, so the answer is ${total}x.`,
        solutionSteps: [`${a} + ${b} = ${a + b}.`, `${a + b} − ${c} = ${total}.`],
        method: 'Add and subtract the coefficients; the variable part stays x.',
        hints: ['The variable part never changes when combining like terms.'],
        commonMistakes: ['Mixing up the signs when combining three terms.']
      };
    }
  },

  {
    id: 'ae-substitute-eval',
    version: 1,
    topicId: 'algebraic-expressions',
    conceptId: 'ae-substitute',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['ae-substitute-f'],
    estimatedSeconds: 45,
    tags: ['trap'],
    params(rng) {
      const a = rng.int(2, 6);
      const b = rng.int(2, 10);
      const c = rng.int(1, 10);
      const x = rng.pick([-3, -2, -1, 1, 2, 3, 4]);
      return { a, b, c, x };
    },
    answer: ({ a, b, c, x }) => a * x * x + b * x + c,
    verify: ({ a, b, c, x }, value) => {
      const squared = x * x;
      return a * squared + b * x + c === value;
    },
    render({ a, b, c, x }) {
      const value = a * x * x + b * x + c;
      return {
        question: `If x = ${x}, what is the value of ${a}x² + ${b}x + ${c}?`,
        explanation: `Substitute x = ${x}: ${a}(${x})² + ${b}(${x}) + ${c} = ${a}(${x * x}) + ${b * x} + ${c} = ${value}.`,
        solutionSteps: [`x² = (${x})² = ${x * x}.`, `${a} × ${x * x} = ${a * x * x}.`, `${a * x * x} + ${b * x} + ${c} = ${value}.`],
        method: 'Substitute the value, then apply BODMAS.',
        hints: ['Square the whole value of x first, including its sign.'],
        commonMistakes: [`Treating (${x})² as a negative number when x is negative.`]
      };
    }
  },

  {
    id: 'ae-factorise-hcf',
    version: 1,
    topicId: 'algebraic-expressions',
    conceptId: 'ae-factorise',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ae-hcf-f'],
    estimatedSeconds: 45,
    params(rng) {
      const k = rng.int(2, 9);
      const p = rng.int(2, 9);
      const q = rng.int(1, 9);
      if (gcd(p, q) !== 1) return null;
      const m = k * p;
      const n = k * q;
      return { k, p, q, m, n };
    },
    answer: ({ k }) => k,
    formatValue: (value) => fmt(value),
    distractors: ({ p, m, n, k }) => [
      { value: p, why: 'took out only the x-part of the common factor' },
      { value: m, why: 'used the whole first coefficient instead of the HCF' },
      { value: n, why: 'used the whole second coefficient instead of the HCF' },
      { value: k + 1, why: 'overcounted the common factor' }
    ],
    verify: ({ m, n }, value) => gcd(m, n) === value,
    render({ k, p, q, m, n }) {
      return {
        question: `${m}x² + ${n}x is factorised as k · x · (…). What is k?`,
        explanation: `The HCF of ${m} and ${n} is ${k}: dividing each term by ${k}x leaves ${p}x + ${q}, so ${m}x² + ${n}x = ${k}x(${p}x + ${q}).`,
        solutionSteps: [`Find the HCF of ${m} and ${n}: ${k}.`, `${m} ÷ ${k} = ${p}; ${n} ÷ ${k} = ${q}.`, `${m}x² + ${n}x = ${k}x(${p}x + ${q}).`],
        method: 'Find the HCF of the coefficients (and any common variable power).',
        hints: ['k is the greatest number dividing both coefficients.'],
        commonMistakes: ['Taking out a factor that does not divide every term.']
      };
    }
  },

  {
    id: 'ae-diffsquares',
    version: 1,
    topicId: 'algebraic-expressions',
    conceptId: 'ae-factorise',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ae-identity-f'],
    estimatedSeconds: 45,
    params(rng) {
      const p = rng.int(4, 25);
      const N = p * p;
      return { p, N };
    },
    answer: ({ p }) => p,
    formatValue: (value) => fmt(value),
    distractors: ({ p, N }) => [
      { value: Math.max(p - 1, 0), why: 'off by one' },
      { value: p + 1, why: 'off by one' },
      { value: N, why: 'gave N instead of its square root' },
      { value: Math.round(N / 2), why: 'halved N instead of taking its square root' }
    ],
    verify: ({ N }, value) => value * value === N,
    render({ p, N }) {
      return {
        question: `x² − ${N} factorises as (x − k)(x + k). What is k?`,
        explanation: `${N} = ${p}², so x² − ${N} = x² − ${p}² = (x − ${p})(x + ${p}). Thus k = ${p}.`,
        solutionSteps: [`Recognise ${N} as a perfect square: ${p}².`, `x² − ${p}² = (x − ${p})(x + ${p}).`],
        method: 'Difference of squares: a² − b² = (a − b)(a + b).',
        hints: [`${N} is a perfect square.`],
        commonMistakes: ['Giving N itself instead of its square root.']
      };
    }
  },

  /* ============================== linear equations ============================== */
  {
    id: 'le-onestep',
    version: 1,
    topicId: 'linear-equations',
    conceptId: 'le-onevar',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['le-balance-f'],
    estimatedSeconds: 30,
    params(rng) {
      const x0 = rng.int(2, 20);
      const a = rng.int(2, 9);
      const b = rng.int(1, 30);
      const c = a * x0 + b;
      return { x0, a, b, c };
    },
    answer: ({ x0 }) => x0,
    formatValue: (value) => fmt(value),
    distractors: ({ x0, a, b, c }) => [
      { value: Math.round(c / a), why: 'forgot to subtract b before dividing' },
      { value: c - b, why: 'forgot to divide by a' },
      { value: x0 + 1, why: 'arithmetic slip' },
      { value: Math.max(x0 - 1, 0), why: 'arithmetic slip' }
    ],
    verify: ({ a, b, c }, value) => a * value + b === c,
    render({ a, b, c, x0 }) {
      return {
        question: `Solve for x: ${a}x + ${b} = ${c}.`,
        explanation: `Subtract ${b} from both sides: ${a}x = ${c - b}. Divide by ${a}: x = ${x0}.`,
        solutionSteps: [`${a}x = ${c} − ${b} = ${c - b}.`, `x = ${c - b} ÷ ${a} = ${x0}.`],
        method: 'Undo addition, then undo multiplication.',
        hints: ['Move the constant term first.'],
        commonMistakes: ['Dividing before subtracting the constant.']
      };
    }
  },

  {
    id: 'le-bothsides',
    version: 1,
    topicId: 'linear-equations',
    conceptId: 'le-onevar',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['le-bothsides-f'],
    estimatedSeconds: 40,
    params(rng) {
      const x0 = rng.int(2, 15);
      const a = rng.int(3, 9);
      const c = rng.int(1, 8);
      if (c === a) return null;
      const b = rng.int(1, 20);
      const d = a * x0 + b - c * x0;
      if (d < 0) return null;
      return { x0, a, b, c, d };
    },
    answer: ({ x0 }) => x0,
    formatValue: (value) => fmt(value),
    distractors: ({ x0, a, b, c, d }) => [
      { value: Math.round((b + d) / (a + c)), why: 'added coefficients and constants instead of separating them' },
      { value: x0 + 2, why: 'arithmetic slip' },
      { value: Math.max(x0 - 2, 0), why: 'arithmetic slip' },
      { value: Math.abs(b - d), why: 'used the constants only, ignoring the coefficients of x' }
    ],
    verify: ({ a, b, c, d }, value) => a * value + b === c * value + d,
    render({ a, b, c, d, x0 }) {
      return {
        question: `Solve for x: ${a}x + ${b} = ${c}x + ${d}.`,
        explanation: `Move the x terms to one side: ${a - c}x = ${d - b}, so x = ${x0}.`,
        solutionSteps: [`${a}x − ${c}x = ${d} − ${b}.`, `${a - c}x = ${d - b}.`, `x = ${x0}.`],
        method: 'Collect x terms on one side, constants on the other.',
        hints: ['Subtract the smaller x term from both sides first.'],
        commonMistakes: ['Combining terms from different sides incorrectly.']
      };
    }
  },

  {
    id: 'le-brackets-solve',
    version: 1,
    topicId: 'linear-equations',
    conceptId: 'le-brackets',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['le-clear-f'],
    estimatedSeconds: 55,
    tags: ['trap'],
    params(rng) {
      const x0 = rng.int(2, 12);
      const a = rng.int(2, 6);
      const b = rng.int(1, 5);
      if (a === b) return null;
      const p = rng.int(1, 9);
      const q = rng.int(1, 9);
      const r = a * (x0 + p) - b * (x0 + q);
      return { x0, a, b, p, q, r };
    },
    answer: ({ x0 }) => x0,
    verify: ({ a, b, p, q, r }, value) => a * (value + p) - b * (value + q) === r,
    render({ a, b, p, q, r, x0 }) {
      return {
        question: `Solve for x: ${a}(x + ${p}) − ${b}(x + ${q}) = ${r}.`,
        explanation: `Expand both brackets: ${a}x + ${a * p} − ${b}x − ${b * q} = ${a - b}x + ${a * p - b * q} = ${r}. So x = ${x0}.`,
        solutionSteps: [`Expand: ${a - b}x + ${a * p - b * q} = ${r}.`, `${a - b}x = ${r - (a * p - b * q)}.`, `x = ${x0}.`],
        method: 'Expand every bracket first, watching the signs, then solve.',
        hints: [`−${b}(x + ${q}) becomes −${b}x − ${b * q}, not −${b}x + ${b * q}.`],
        commonMistakes: ['Sign error when distributing the second bracket.']
      };
    }
  },

  {
    id: 'le-word-consecutive',
    version: 1,
    topicId: 'linear-equations',
    conceptId: 'le-word',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['le-word-f'],
    estimatedSeconds: 55,
    params(rng) {
      const n = rng.int(5, 60);
      const S = 3 * n + 3;
      return { n, S };
    },
    answer: ({ n }) => n,
    verify: ({ S }, value) => 3 * value + 3 === S,
    render({ n, S }) {
      return {
        question: `The sum of three consecutive integers is ${S}. What is the smallest of the three?`,
        explanation: `Let the integers be x, x+1 and x+2. Their sum is 3x + 3 = ${S}, so x = ${n}.`,
        solutionSteps: [`x + (x+1) + (x+2) = 3x + 3.`, `3x + 3 = ${S} → 3x = ${S - 3}.`, `x = ${n}.`],
        method: 'Represent consecutive integers as x, x+1, x+2.',
        hints: ['Add the three expressions and set the sum equal to the given total.'],
        commonMistakes: ['Assuming the numbers are spaced more than 1 apart.']
      };
    }
  },

  /* ========================== simultaneous equations ========================== */
  {
    id: 'se-elim-add',
    version: 1,
    topicId: 'simultaneous-equations',
    conceptId: 'se-elimination',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['se-elim-f'],
    estimatedSeconds: 35,
    params(rng) {
      const x0 = rng.int(5, 30);
      const y0 = rng.int(1, x0 - 1);
      const s = x0 + y0;
      const d = x0 - y0;
      return { x0, y0, s, d };
    },
    answer: ({ x0 }) => x0,
    formatValue: (value) => fmt(value),
    distractors: ({ y0, s, d }) => [
      { value: y0, why: 'solved for y instead of x' },
      { value: s + d, why: 'forgot to divide by 2 after adding the equations' },
      { value: s, why: 'used the sum equation alone' },
      { value: Math.abs(d), why: 'used the difference equation alone' }
    ],
    verify: ({ s, d }, value) => (s + d) / 2 === value,
    render({ s, d, x0, y0 }) {
      return {
        question: `Solve: x + y = ${s}, x − y = ${d}. What is x?`,
        explanation: `Adding the equations: 2x = ${s + d}, so x = ${x0} (and y = ${y0}).`,
        solutionSteps: [`Add: 2x = ${s} + ${d} = ${s + d}.`, `x = ${x0}.`],
        method: 'Adding removes y since its coefficients are +1 and −1.',
        hints: ['Add the two equations directly.'],
        commonMistakes: ['Subtracting the equations instead of adding.']
      };
    }
  },

  {
    id: 'se-elim-scale',
    version: 1,
    topicId: 'simultaneous-equations',
    conceptId: 'se-elimination',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['se-elim-f'],
    estimatedSeconds: 50,
    params(rng) {
      const x0 = rng.int(2, 12);
      const y0 = rng.int(2, 12);
      const a = rng.int(2, 6);
      const b = rng.int(1, 6);
      const c = rng.int(1, 6);
      if (b === c) return null;
      const e = a * x0 + b * y0;
      const f = a * x0 + c * y0;
      return { x0, y0, a, b, c, e, f };
    },
    answer: ({ y0 }) => y0,
    formatValue: (value) => fmt(value),
    distractors: ({ x0, e, f, b, c }) => [
      { value: x0, why: 'gave x instead of y' },
      { value: Math.abs(e - f), why: 'forgot to divide by the difference of the coefficients' },
      { value: Math.round((e + f) / (b + c)), why: 'added the equations instead of subtracting' },
      { value: x0 + 1, why: 'arithmetic slip' }
    ],
    verify: ({ e, f, b, c }, value) => e - f === (b - c) * value,
    render({ a, b, c, e, f, x0, y0 }) {
      return {
        question: `Solve: ${a}x + ${b}y = ${e}, ${a}x + ${c}y = ${f}. What is y?`,
        explanation: `Both equations have ${a}x, so subtracting removes x: ${b - c}y = ${e - f}, giving y = ${y0} (and x = ${x0}).`,
        solutionSteps: [`Subtract: (${b}−${c})y = ${e} − ${f}.`, `${b - c}y = ${e - f}.`, `y = ${y0}.`],
        method: 'Matching x-coefficients cancel on subtraction.',
        hints: ['Both equations share the same x-coefficient.'],
        commonMistakes: ['Adding the equations instead of subtracting.']
      };
    }
  },

  {
    id: 'se-word-items',
    version: 1,
    topicId: 'simultaneous-equations',
    conceptId: 'se-word',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['se-word-f', 'se-elim-f'],
    estimatedSeconds: 60,
    unit: '₹',
    params(rng) {
      const p = rng.int(5, 50);
      const q = rng.int(3, 40);
      const a1 = rng.int(1, 4);
      const b1 = rng.int(1, 4);
      const a2 = rng.int(1, 4);
      const b2 = rng.int(1, 4);
      const det = a1 * b2 - a2 * b1;
      if (det === 0) return null;
      const t1 = a1 * p + b1 * q;
      const t2 = a2 * p + b2 * q;
      return { p, q, a1, b1, a2, b2, t1, t2, det };
    },
    answer: ({ p }) => p,
    verify: ({ t1, b2, t2, b1, det }, value) => nearlyEqual((t1 * b2 - t2 * b1) / det, value),
    render({ p, q, a1, b1, a2, b2, t1, t2 }) {
      return {
        question: `${a1} notebook(s) and ${b1} pen(s) cost ₹${t1}. ${a2} notebook(s) and ${b2} pen(s) cost ₹${t2}. What is the price of one notebook (in ₹)?`,
        explanation: `Let a notebook cost p and a pen cost q: ${a1}p + ${b1}q = ${t1}, ${a2}p + ${b2}q = ${t2}. Solving gives p = ${p} (and q = ${q}).`,
        solutionSteps: [`${a1}p + ${b1}q = ${t1}.`, `${a2}p + ${b2}q = ${t2}.`, `Eliminate q and solve: p = ${p}.`],
        method: 'Set up two equations, then eliminate one variable.',
        hints: ['Scale one equation so a variable matches the other.'],
        commonMistakes: ['Assuming a notebook and a pen cost the same.']
      };
    }
  },

  {
    id: 'se-word-boat',
    version: 1,
    topicId: 'simultaneous-equations',
    conceptId: 'se-word',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['se-word-f', 'se-elim-f'],
    estimatedSeconds: 70,
    unit: 'km/hr',
    params(rng) {
      const b = rng.int(6, 20);
      const s = rng.int(1, b - 2);
      const k = rng.int(1, 4);
      const D = (b - s) * (b + s) * k;
      const tUp = (b + s) * k;
      const tDown = (b - s) * k;
      if (tUp === tDown) return null;
      return { b, s, D, tUp, tDown };
    },
    answer: ({ b }) => b,
    verify: ({ D, tUp, tDown }, value) => nearlyEqual(D / tUp + D / tDown, 2 * value),
    render({ b, s, D, tUp, tDown }) {
      return {
        question: `A boat travels ${D} km upstream in ${tUp} hours and the same distance downstream in ${tDown} hours. What is the boat's speed in still water (in km/hr)?`,
        explanation: `Upstream speed = ${D}/${tUp} = ${b - s} = b − s. Downstream speed = ${D}/${tDown} = ${b + s} = b + s. Adding: 2b = ${2 * b}, so b = ${b}.`,
        solutionSteps: [`Upstream: b − s = ${b - s}.`, `Downstream: b + s = ${b + s}.`, `Add: 2b = ${2 * b} → b = ${b}.`],
        method: 'Set up boat-speed equations, then eliminate the stream speed.',
        hints: ['Speed = distance ÷ time for each leg of the journey.'],
        commonMistakes: ['Averaging the two speeds incorrectly.']
      };
    }
  },

  /* ============================== quadratic equations ============================== */
  {
    id: 'qe-factor-roots',
    version: 1,
    topicId: 'quadratic-equations',
    conceptId: 'qe-factorise',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['qe-factorise-f'],
    estimatedSeconds: 40,
    params(rng) {
      const p = rng.int(1, 10);
      const q = rng.int(p + 1, 20);
      const sum = p + q;
      const c = p * q;
      return { p, q, sum, c };
    },
    answer: ({ q }) => q,
    formatValue: (value) => fmt(value),
    distractors: ({ p, sum, c }) => [
      { value: p, why: 'gave the smaller root' },
      { value: sum, why: 'gave the sum of the roots instead of a root' },
      { value: c, why: 'gave the product of the roots instead of a root' },
      { value: p + c, why: 'combined the roots incorrectly' }
    ],
    verify: ({ sum, c }, value) => {
      if (!nearlyEqual(value * value - sum * value + c, 0)) return false;
      const other = c / value;
      return other <= value + 1e-9;
    },
    render({ p, q, sum, c }) {
      return {
        question: `Solve x² − ${sum}x + ${c} = 0. What is the larger root?`,
        explanation: `Find two numbers that sum to ${sum} and multiply to ${c}: ${p} and ${q}. So (x − ${p})(x − ${q}) = 0, giving x = ${p} or x = ${q}. The larger root is ${q}.`,
        solutionSteps: [`Find factors of ${c} adding to ${sum}: ${p} and ${q}.`, `(x − ${p})(x − ${q}) = 0.`, `Roots: ${p} and ${q}.`],
        method: 'Find two numbers with the given sum and product.',
        hints: [`Which two numbers multiply to ${c} and add to ${sum}?`],
        commonMistakes: ['Reporting the smaller root, the sum, or the product instead of the larger root.']
      };
    }
  },

  {
    id: 'qe-formula-clean',
    version: 1,
    topicId: 'quadratic-equations',
    conceptId: 'qe-formula',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['qe-formula-f'],
    estimatedSeconds: 55,
    params(rng) {
      const a = rng.pick([2, 3]);
      const p = rng.int(-8, -1);
      const q = rng.int(1, 10);
      const B = -a * (p + q);
      const C = a * p * q;
      return { a, p, q, B, C };
    },
    answer: ({ q }) => q,
    verify: ({ a, B, C }, value) => nearlyEqual(a * value * value + B * value + C, 0) && value > 0,
    render({ a, p, q, B, C }) {
      return {
        question: `Solve ${a}x² ${sign(B)} ${Math.abs(B)}x ${sign(C)} ${Math.abs(C)} = 0 using the quadratic formula. What is the positive root?`,
        explanation: `The discriminant is ${B * B - 4 * a * C}, a perfect square. The roots are x = ${p} and x = ${q}, so the positive root is ${q}.`,
        solutionSteps: [`Discriminant = B² − 4AC = ${B * B - 4 * a * C}.`, `x = [−B ± √discriminant] / (2A).`, `Roots: ${p} and ${q}.`],
        method: 'Apply the quadratic formula and pick the positive root.',
        hints: ['One root is negative and one is positive; keep the positive one.'],
        commonMistakes: ['Forgetting the ± sign, missing one of the two roots.']
      };
    }
  },

  {
    id: 'qe-discriminant-value',
    version: 1,
    topicId: 'quadratic-equations',
    conceptId: 'qe-discriminant',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['qe-disc-f'],
    estimatedSeconds: 45,
    params(rng) {
      const a = rng.int(1, 4);
      const b = rng.int(-10, 10);
      const c = rng.int(-10, 10);
      if (b === 0) return null;
      return { a, b, c };
    },
    answer: ({ a, b, c }) => b * b - 4 * a * c,
    verify: ({ a, b, c }, value) => b * b - 4 * a * c === value,
    render({ a, b, c }) {
      const D = b * b - 4 * a * c;
      return {
        question: `What is the discriminant of ${a}x² ${sign(b)} ${Math.abs(b)}x ${sign(c)} ${Math.abs(c)} = 0?`,
        explanation: `Discriminant = b² − 4ac = (${b})² − 4(${a})(${c}) = ${b * b} − ${4 * a * c} = ${D}.`,
        solutionSteps: [`b² = ${b * b}.`, `4ac = ${4 * a * c}.`, `${b * b} − ${4 * a * c} = ${D}.`],
        method: 'Substitute a, b and c into b² − 4ac.',
        hints: ['Square b before subtracting 4ac.'],
        commonMistakes: ['Forgetting to square b, or mishandling negative values of a or c.']
      };
    }
  },

  {
    id: 'qe-word-consecutive',
    version: 1,
    topicId: 'quadratic-equations',
    conceptId: 'qe-word',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['qe-word-f', 'qe-factorise-f'],
    estimatedSeconds: 55,
    params(rng) {
      const n = rng.int(5, 40);
      const N = n * (n + 1);
      return { n, N };
    },
    answer: ({ n }) => n,
    verify: ({ N }, value) => value * (value + 1) === N,
    render({ n, N }) {
      return {
        question: `The product of two consecutive positive integers is ${N}. What is the smaller integer?`,
        explanation: `Let the integers be x and x+1: x(x+1) = ${N}, so x² + x − ${N} = 0. Factorising gives x = ${n} (rejecting the negative root).`,
        solutionSteps: [`x² + x − ${N} = 0.`, `Factorise to find x = ${n} (positive root).`],
        method: 'Set up the quadratic, factorise, then reject the invalid root.',
        hints: ['Reject any negative root since the integers are positive.'],
        commonMistakes: ['Accepting the negative root as a valid answer.']
      };
    }
  }
];
