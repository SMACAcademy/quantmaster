/**
 * Percentages templates.
 *
 * Every wrong option is a named, common error — never a random nearby number —
 * so a wrong choice tells the learner (and the mistake log) something real.
 */

import { fmt, format, nearlyEqual } from '../core.js';

const FRACTIONS = {
  5: '1/20',
  10: '1/10',
  12.5: '1/8',
  20: '1/5',
  25: '1/4',
  40: '2/5',
  50: '1/2',
  60: '3/5',
  62.5: '5/8',
  75: '3/4',
  80: '4/5',
  87.5: '7/8'
};

const fractionHint = (p) =>
  FRACTIONS[p] ? `${p}% is the fraction ${FRACTIONS[p]}, which is quicker to use than a decimal.` : `${p}% = ${p}/100 = ${fmt(p / 100, 4)}.`;

function changeLabel(value) {
  if (nearlyEqual(value, 0)) return 'No net change';
  return value > 0 ? `${fmt(value)}% increase` : `${fmt(-value)}% decrease`;
}

export const percentageTemplates = [
  {
    id: 'pct-of-number',
    version: 1,
    topicId: 'percentages',
    conceptId: 'pct-of-number',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['pct-part'],
    estimatedSeconds: 35,
    tags: ['basic-percentage'],
    params(rng) {
      const p = rng.pick([5, 10, 12.5, 15, 20, 25, 30, 35, 40, 45, 60, 75]);
      const scenario = rng.pick(['plain', 'discount', 'absent']);
      const N = rng.int(4, 48) * 20;
      if ((p * N) % 100 !== 0) return null;
      return { p, N, scenario };
    },
    answer: ({ p, N }) => (p * N) / 100,
    formatValue: (value, { scenario }) =>
      scenario === 'discount' ? format.rupees(value) : format.number(value),
    distractors: ({ p, N }) => {
      const A = (p * N) / 100;
      return [
        { value: N - A, why: 'took the remaining percentage' },
        { value: A * 10, why: 'decimal point slip' },
        { value: ((p + 10) * N) / 100, why: 'misread the rate' },
        { value: A / 10, why: 'decimal point slip' }
      ];
    },
    verify: ({ p, N }, value) => nearlyEqual((value * 100) / N, p),
    render({ p, N, scenario }, { fmt: show }) {
      const A = (p * N) / 100;
      const question = {
        plain: `What is ${p}% of ${fmt(N)}?`,
        discount: `A shop offers ${p}% off an item priced at ₹${fmt(N)}. How much is the discount?`,
        absent: `A school has ${fmt(N)} students and ${p}% of them are absent today. How many students are absent?`
      }[scenario];
      return {
        question,
        explanation: `${p}% of ${fmt(N)} = (${p} ÷ 100) × ${fmt(N)} = ${show(A)}.`,
        solutionSteps: [
          `Convert ${p}% to a fraction: ${FRACTIONS[p] || `${p}/100`}.`,
          `Multiply by ${fmt(N)}.`,
          `Result: ${show(A)}.`
        ],
        method: 'Convert the percentage to a fraction, then multiply.',
        hints: [
          'The word "of" means multiply — but first turn the percentage into a fraction.',
          fractionHint(p),
          `Work out (${p} ÷ 100) × ${fmt(N)}.`
        ],
        commonMistakes: ['Multiplying by the percentage number without dividing by 100.']
      };
    }
  },

  {
    id: 'pct-part-as-percent',
    version: 1,
    topicId: 'percentages',
    conceptId: 'pct-meaning',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['pct-basic'],
    answerDecimals: 1,
    estimatedSeconds: 40,
    params(rng) {
      const p = rng.pick([5, 10, 12.5, 15, 20, 25, 30, 40, 45, 60, 62.5, 75, 80, 87.5]);
      const Y = rng.int(2, 40) * 40;
      const X = (p * Y) / 100;
      if (!Number.isInteger(X) || X < 2) return null;
      return { p, X, Y, scenario: rng.pick(['plain', 'marks']) };
    },
    answer: ({ p }) => p,
    formatValue: (value) => format.percent(value),
    distractors: ({ p, X, Y }) => [
      { value: (Y * 100) / X, why: 'divided the whole by the part' },
      { value: 100 - p, why: 'gave the remaining percentage' },
      { value: X, why: 'reported the part instead of a percentage' },
      { value: p + 10, why: 'arithmetic slip' }
    ],
    verify: ({ X, Y }, value) => nearlyEqual((X * 100) / Y, value),
    render({ p, X, Y, scenario }) {
      return {
        question:
          scenario === 'marks'
            ? `A student scores ${fmt(X)} marks out of ${fmt(Y)}. What percentage is that?`
            : `${fmt(X)} is what percent of ${fmt(Y)}?`,
        explanation: `(${fmt(X)} ÷ ${fmt(Y)}) × 100 = ${fmt(p)}%.`,
        solutionSteps: [
          `Part ÷ whole = ${fmt(X)} ÷ ${fmt(Y)}.`,
          `That equals ${fmt(X / Y, 4)}.`,
          `× 100 = ${fmt(p)}%.`
        ],
        method: 'Part ÷ Whole × 100.',
        hints: [
          `The whole is ${fmt(Y)} — it goes on the bottom of the fraction.`,
          `Simplify ${fmt(X)}/${fmt(Y)} before converting.`,
          'Multiply the fraction by 100.'
        ],
        commonMistakes: ['Dividing the whole by the part.']
      };
    }
  },

  {
    id: 'pct-find-whole',
    version: 1,
    topicId: 'percentages',
    conceptId: 'pct-find-whole',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['pct-whole'],
    estimatedSeconds: 45,
    params(rng) {
      const p = rng.pick([5, 8, 10, 12, 15, 20, 25, 30, 40, 60, 75]);
      const N = rng.int(3, 50) * 20;
      const X = (p * N) / 100;
      if (!Number.isInteger(X) || X < 2) return null;
      return { p, N, X, scenario: rng.pick(['plain', 'salary']) };
    },
    answer: ({ N }) => N,
    formatValue: (value, { scenario }) =>
      scenario === 'salary' ? format.rupees(value) : format.number(value),
    distractors: ({ p, N, X }) => [
      { value: (X * p) / 100, why: 'took the percentage of the part' },
      { value: (X * 100) / (100 - p), why: 'used the remaining percentage' },
      { value: N / 10, why: 'dropped a zero' },
      { value: X + p, why: 'added instead of scaling' }
    ],
    verify: ({ p, X }, value) => nearlyEqual((p * value) / 100, X),
    render({ p, N, X, scenario }, { fmt: show }) {
      return {
        question:
          scenario === 'salary'
            ? `${p}% of a person's monthly salary is ₹${fmt(X)}. What is the full salary?`
            : `${p}% of a number is ${fmt(X)}. What is the number?`,
        explanation: `If ${p}% is ${fmt(X)}, then 1% is ${fmt(X / p, 4)} and 100% is ${show(N)}.`,
        solutionSteps: [
          `${p}% corresponds to ${fmt(X)}.`,
          `1% = ${fmt(X)} ÷ ${p} = ${fmt(X / p, 4)}.`,
          `100% = ${show(N)}.`
        ],
        method: 'Scale down to 1%, then up to 100%.',
        hints: [
          'You are looking for the whole — that is 100%.',
          `Find what 1% is worth: ${fmt(X)} ÷ ${p}.`,
          'Multiply that by 100.'
        ],
        commonMistakes: [`Taking ${p}% of ${fmt(X)} instead of working backwards.`]
      };
    }
  },

  {
    id: 'pct-change-rate',
    version: 1,
    topicId: 'percentages',
    conceptId: 'pct-increase',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['pct-increase', 'pct-decrease'],
    answerDecimals: 1,
    estimatedSeconds: 50,
    params(rng) {
      const increase = rng.chance(0.5);
      const r = rng.pick(increase ? [5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75] : [5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75]);
      const O = rng.int(4, 60) * 40;
      const N = (O * (100 + (increase ? r : -r))) / 100;
      if (!Number.isInteger(N)) return null;
      return { increase, r, O, N, scenario: rng.pick(['price', 'population']) };
    },
    answer: ({ r }) => r,
    formatValue: (value) => format.percent(value),
    distractors: ({ O, N }) => [
      { value: (Math.abs(N - O) * 100) / N, why: 'used the new value as the base' },
      { value: Math.abs(N - O), why: 'reported the change itself as a percentage' },
      { value: (N * 100) / O, why: 'reported the ratio instead of the change' }
    ],
    verify: ({ increase, O, N }, value) => nearlyEqual((O * (100 + (increase ? value : -value))) / 100, N),
    render({ increase, O, N, r, scenario }) {
      const word = increase ? 'increase' : 'decrease';
      const money = scenario === 'price';
      const show = (v) => (money ? `₹${fmt(v)}` : fmt(v));
      return {
        question: money
          ? `The price of an item ${increase ? 'rises' : 'falls'} from ${show(O)} to ${show(N)}. What is the percentage ${word}?`
          : `A town's population ${increase ? 'grows' : 'falls'} from ${show(O)} to ${show(N)}. What is the percentage ${word}?`,
        explanation: `Change = ${show(Math.abs(N - O))}. Percentage ${word} = ${fmt(Math.abs(N - O))} ÷ ${fmt(O)} × 100 = ${fmt(r)}%.`,
        solutionSteps: [
          `Change = |${fmt(N)} − ${fmt(O)}| = ${fmt(Math.abs(N - O))}.`,
          `Divide by the ORIGINAL value: ${fmt(Math.abs(N - O))} ÷ ${fmt(O)}.`,
          `× 100 = ${fmt(r)}% ${word}.`
        ],
        method: 'Change ÷ original × 100.',
        hints: [
          'Find the actual change first.',
          `Percentage change is measured against the starting value, ${show(O)}.`,
          `Compute ${fmt(Math.abs(N - O))} ÷ ${fmt(O)} × 100.`
        ],
        commonMistakes: ['Dividing by the new value instead of the original.']
      };
    }
  },

  {
    id: 'pct-reverse',
    version: 1,
    topicId: 'percentages',
    conceptId: 'pct-reverse',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pct-reverse'],
    estimatedSeconds: 60,
    tags: ['trap'],
    params(rng) {
      const increase = rng.chance(0.5);
      const r = rng.pick(increase ? [10, 20, 25, 40, 50] : [10, 20, 25, 40, 50, 60, 75]);
      const O = rng.int(4, 50) * 40;
      const N = (O * (100 + (increase ? r : -r))) / 100;
      if (!Number.isInteger(N)) return null;
      return { increase, r, O, N, scenario: increase ? 'number' : rng.pick(['number', 'discount']) };
    },
    answer: ({ O }) => O,
    formatValue: (value, { scenario }) =>
      scenario === 'discount' ? format.rupees(value) : format.number(value),
    distractors: ({ increase, r, N }) =>
      increase
        ? [
            { value: (N * (100 - r)) / 100, why: `took ${r}% off the new value` },
            { value: N - r, why: 'subtracted the rate as a number' },
            { value: (N * 100) / (100 - r), why: 'divided by the wrong multiplier' }
          ]
        : [
            { value: (N * (100 + r)) / 100, why: `added ${r}% of the new value` },
            { value: N + r, why: 'added the rate as a number' },
            { value: (N * 100) / (100 + r), why: 'divided by the wrong multiplier' }
          ],
    verify: ({ increase, r, N }, value) => nearlyEqual((value * (100 + (increase ? r : -r))) / 100, N),
    render({ increase, r, O, N, scenario }, { fmt: show }) {
      const multiplier = fmt((100 + (increase ? r : -r)) / 100, 4);
      return {
        question:
          scenario === 'discount'
            ? `After a ${r}% discount, an item sells for ₹${fmt(N)}. What was its marked price?`
            : `A number becomes ${fmt(N)} after being ${increase ? 'increased' : 'decreased'} by ${r}%. What was the original number?`,
        explanation: `The ${increase ? 'increase' : 'decrease'} multiplied the original by ${multiplier}, so original = ${fmt(N)} ÷ ${multiplier} = ${show(O)}.`,
        solutionSteps: [
          `${fmt(N)} is ${100 + (increase ? r : -r)}% of the original.`,
          `Original = ${fmt(N)} ÷ ${multiplier}.`,
          `= ${show(O)}. Check: ${r}% of ${fmt(O)} is ${fmt((r * O) / 100)} ✓`
        ],
        method: 'Divide by the multiplier to undo the change.',
        hints: [
          `${fmt(N)} is not 100% — what percentage of the original is it?`,
          `It is ${100 + (increase ? r : -r)}% of the original.`,
          `Divide ${fmt(N)} by ${multiplier}.`
        ],
        commonMistakes: [`Taking ${r}% of ${fmt(N)} — the ${r}% was of the original, not the new value.`]
      };
    }
  },

  {
    id: 'pct-successive',
    version: 1,
    topicId: 'percentages',
    conceptId: 'pct-successive',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pct-successive'],
    estimatedSeconds: 60,
    tags: ['trap'],
    params(rng) {
      const kind = rng.pick(['up-down', 'down-up', 'up-up', 'down-down']);
      const a = rng.pick([10, 20, 25, 30, 40, 50]);
      const b = rng.pick([10, 20, 25, 30, 40, 50]);
      const first = kind.startsWith('up') ? a : -a;
      const second = kind.endsWith('up') ? b : -b;
      return { first, second };
    },
    answer: ({ first, second }) => changeLabel(first + second + (first * second) / 100),
    formatValue: (value) => value,
    distractors: ({ first, second }) => {
      const net = first + second + (first * second) / 100;
      return [
        { value: changeLabel(first + second), why: 'added the percentages' },
        { value: changeLabel(-net), why: 'wrong direction' },
        { value: changeLabel(first + second - (first * second) / 100), why: 'sign error on the product term' },
        { value: changeLabel((first * second) / 100), why: 'kept only the interaction term' }
      ];
    },
    verify: ({ first, second }, label) =>
      changeLabel(100 * (1 + first / 100) * (1 + second / 100) - 100) === label,
    render({ first, second }) {
      const describe = (v) => `${v > 0 ? 'increased' : 'decreased'} by ${Math.abs(v)}%`;
      const net = first + second + (first * second) / 100;
      const m1 = fmt(1 + first / 100, 2);
      const m2 = fmt(1 + second / 100, 2);
      return {
        question: `A price is ${describe(first)} and then ${describe(second)}. What is the net effect?`,
        explanation: `Multiply the multipliers: ${m1} × ${m2} = ${fmt(1 + net / 100, 4)}, so the result is ${changeLabel(net).toLowerCase()}.`,
        solutionSteps: [
          `Write each change as a multiplier: ${m1} and ${m2}.`,
          `Multiply: ${m1} × ${m2} = ${fmt(1 + net / 100, 4)}.`,
          `Compare with 1: ${changeLabel(net)}.`
        ],
        method: 'Chain the multipliers — or use a + b + ab/100 with signs.',
        hints: [
          'The second change acts on the already-changed value, so the two never simply add.',
          'Start with a price of 100 and apply both changes in order.',
          `Or use a + b + ab/100 with a = ${first} and b = ${second}.`
        ],
        commonMistakes: ['Adding the two percentages directly.']
      };
    }
  },

  {
    id: 'pct-comparison',
    version: 1,
    topicId: 'percentages',
    conceptId: 'pct-comparison',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pct-comparison-more', 'pct-comparison-less'],
    answerDecimals: 2,
    estimatedSeconds: 60,
    tags: ['trap'],
    params(rng) {
      const more = rng.chance(0.5);
      // Only rates whose converted answer is exact to two decimals.
      const x = more ? rng.pick([25, 60, 100, 150, 300, 400]) : rng.pick([20, 36, 37.5, 50, 60, 75, 80]);
      const [first, second] = rng.pick([
        ['Aman', 'Bela'],
        ['Chirag', 'Deepa'],
        ['Esha', 'Farid'],
        ['Gopal', 'Hema']
      ]);
      const subject = rng.pick(['salary', 'monthly income', 'savings', 'rent']);
      return { more, x, first, second, subject };
    },
    answer: ({ more, x }) => (more ? (100 * x) / (100 + x) : (100 * x) / (100 - x)),
    formatValue: (value) => format.percent(value),
    distractors: ({ more, x }) => {
      const answer = more ? (100 * x) / (100 + x) : (100 * x) / (100 - x);
      return [
        { value: x, why: 'assumed the comparison is symmetric' },
        { value: more ? (x < 100 ? (100 * x) / (100 - x) : null) : (100 * x) / (100 + x), why: 'used the other formula' },
        { value: x / 2, why: 'halved the difference' },
        { value: answer / 2, why: 'halved the converted rate' },
        { value: 100 - answer > 0 ? 100 - answer : null, why: 'subtracted from 100' }
      ];
    },
    verify: ({ more, x }, value) => {
      const B = 100;
      const A = more ? 100 + x : 100 - x;
      const gap = Math.abs(A - B);
      return nearlyEqual((gap / A) * 100, value, 1e-6);
    },
    render({ more, x, first, second, subject }) {
      const answer = more ? (100 * x) / (100 + x) : (100 * x) / (100 - x);
      const A = more ? 100 + x : 100 - x;
      return {
        question: more
          ? `${first}'s ${subject} is ${fmt(x)}% more than ${second}'s. By what percentage is ${second}'s ${subject} less than ${first}'s?`
          : `${first}'s ${subject} is ${fmt(x)}% less than ${second}'s. By what percentage is ${second}'s ${subject} more than ${first}'s?`,
        explanation: `Let ${second}'s be 100, so ${first}'s is ${fmt(A)}. The gap of ${fmt(x)} compared with ${fmt(A)} is ${fmt(answer)}%.`,
        solutionSteps: [
          `Set ${second}'s ${subject} = 100, so ${first}'s = ${fmt(A)}.`,
          `The difference is ${fmt(x)}.`,
          `Measured against ${first}'s: ${fmt(x)} ÷ ${fmt(A)} × 100 = ${fmt(answer)}%.`
        ],
        method: 'Assume the reference value is 100, then compare against the correct base.',
        hints: [
          'The two comparisons use different bases, so the percentages cannot be the same.',
          `Put ${second}'s ${subject} = 100 and work out ${first}'s.`,
          `Compare the gap of ${fmt(x)} with ${fmt(A)}.`
        ],
        commonMistakes: [`Answering ${fmt(x)}% by symmetry.`]
      };
    }
  },

  {
    id: 'pct-exam-fail',
    version: 1,
    topicId: 'percentages',
    conceptId: 'pct-marks',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pct-whole'],
    estimatedSeconds: 70,
    params(rng) {
      const T = rng.int(4, 16) * 50;
      const s = rng.pick([20, 24, 25, 30, 32, 35, 36, 40]);
      const score = (s * T) / 100;
      const f = rng.int(5, 60);
      const pass = score + f;
      if (!Number.isInteger(score) || pass >= T) return null;
      return { T, s, f, pass };
    },
    answer: ({ T }) => T,
    formatValue: (value) => format.number(value),
    distractors: ({ s, f, pass }) => [
      { value: (pass * 100) / s, why: 'treated the pass mark as the score' },
      { value: ((pass + f) * 100) / s, why: 'added the shortfall instead of subtracting it' },
      { value: (f * 100) / s, why: 'treated the shortfall as the score' }
    ],
    verify: ({ s, f, pass }, value) => nearlyEqual((s * value) / 100 + f, pass),
    render({ T, s, f, pass }) {
      const score = pass - f;
      return {
        question: `A student scores ${s}% of the total marks and fails by ${f} marks. The pass mark is ${pass}. What are the total marks?`,
        explanation: `The score is ${pass} − ${f} = ${score}, which is ${s}% of the total. Total = ${score} × 100 ÷ ${s} = ${T}.`,
        solutionSteps: [
          `Score = pass mark − shortfall = ${pass} − ${f} = ${score}.`,
          `${score} is ${s}% of the total.`,
          `Total = ${score} × 100 ÷ ${s} = ${T}.`
        ],
        method: 'Find the actual score, then treat it as a percentage of the total.',
        hints: [
          `"Fails by ${f}" means the score is ${f} below the pass mark.`,
          `So the score is ${score}.`,
          `${score} is ${s}% of the total — scale up to 100%.`
        ],
        commonMistakes: ['Treating the pass mark itself as the percentage score.']
      };
    }
  }
];
