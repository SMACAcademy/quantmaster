/** Ratio, averages, profit & loss, simple interest and compound interest templates. */

import { fmt, format, gcd, nearlyEqual, ratioText, reduceRatio } from '../core.js';

const NAMES = [
  ['Ravi', 'Sita'],
  ['Anil', 'Meena'],
  ['Farhan', 'Priya'],
  ['Karan', 'Divya'],
  ['Arjun', 'Nisha']
];

function parseRatio(text) {
  return String(text)
    .split(':')
    .map((part) => Number(part.trim()));
}

function tradeLabel(value) {
  if (nearlyEqual(value, 0)) return 'No profit, no loss';
  return value > 0 ? `${fmt(value)}% profit` : `${fmt(-value)}% loss`;
}

/** Year-by-year compounding — deliberately not the closed-form formula. */
function compoundBalance(P, R, T) {
  let balance = P;
  for (let year = 0; year < T; year++) balance += (balance * R) / 100;
  return balance;
}

export const commercialTemplates = [
  /* ============================ ratio ============================ */
  {
    id: 'rp-share',
    version: 1,
    topicId: 'ratio-proportion',
    conceptId: 'rp-divide',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['rp-share', 'rp-one-part'],
    estimatedSeconds: 45,
    params(rng) {
      const a = rng.int(1, 9);
      const b = rng.int(1, 9);
      if (a === b || gcd(a, b) !== 1) return null;
      const T = rng.int(5, 150) * 10 * (a + b);
      if (T > 50000) return null;
      return { a, b, T, names: rng.pick(NAMES), first: rng.chance(0.5) };
    },
    answer: ({ a, b, T, first }) => (T * (first ? a : b)) / (a + b),
    formatValue: (value) => format.rupees(value),
    distractors: ({ a, b, T, first }) => {
      const own = first ? a : b;
      const other = first ? b : a;
      return [
        { value: (T * other) / (a + b), why: 'gave the other share' },
        { value: (T * own) / other, why: 'used own ÷ other instead of own ÷ total' },
        { value: T / (a + b), why: 'stopped at one part' },
        { value: T / 2, why: 'split equally' }
      ];
    },
    verify: ({ a, b, T, first }, value) => nearlyEqual(value * (a + b), T * (first ? a : b)),
    render({ a, b, T, names, first }) {
      const person = first ? names[0] : names[1];
      const own = first ? a : b;
      const part = T / (a + b);
      return {
        question: `₹${fmt(T)} is divided between ${names[0]} and ${names[1]} in the ratio ${a} : ${b}. How much does ${person} get?`,
        explanation: `There are ${a + b} parts, so one part is ₹${fmt(part)}. ${person} gets ${own} parts = ₹${fmt(part * own)}.`,
        solutionSteps: [
          `Total parts = ${a} + ${b} = ${a + b}.`,
          `One part = ${fmt(T)} ÷ ${a + b} = ${fmt(part)}.`,
          `${person}'s share = ${own} × ${fmt(part)} = ₹${fmt(part * own)}.`
        ],
        method: 'Find one part, then scale.',
        hints: [
          'How many equal parts is the money split into?',
          `One part = ₹${fmt(T)} ÷ ${a + b}.`,
          `${person} takes ${own} of those parts.`
        ],
        commonMistakes: ['Dividing by the other person\'s term instead of by the total number of parts.']
      };
    }
  },

  {
    id: 'rp-chain',
    version: 1,
    topicId: 'ratio-proportion',
    conceptId: 'rp-chain',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rp-chain-formula'],
    estimatedSeconds: 60,
    params(rng) {
      const a = rng.int(1, 9);
      const b = rng.int(2, 9);
      const c = rng.int(2, 9);
      const d = rng.int(1, 9);
      if (gcd(a, b) !== 1 || gcd(c, d) !== 1 || b === c) return null;
      const triple = reduceRatio(a * c, b * c, b * d);
      if (Math.max(...triple) > 99) return null;
      return { a, b, c, d };
    },
    answer: ({ a, b, c, d }) => ratioText(reduceRatio(a * c, b * c, b * d)),
    formatValue: (value) => value,
    distractors: ({ a, b, c, d }) => [
      { value: ratioText(reduceRatio(a, b, d)), why: 'joined the ratios without matching B' },
      { value: ratioText(reduceRatio(a * c, b * d, b * c)), why: 'mixed up the order' },
      { value: ratioText(reduceRatio(a + c, b + c, b + d)), why: 'added instead of multiplying' },
      { value: ratioText(reduceRatio(a * d, b * c, c * d)), why: 'scaled the wrong ratio' }
    ],
    verify: ({ a, b, c, d }, text) => {
      const [x, y, z] = parseRatio(text);
      return x * b === y * a && y * d === z * c;
    },
    render({ a, b, c, d }) {
      const answer = reduceRatio(a * c, b * c, b * d);
      return {
        question: `If A : B = ${a} : ${b} and B : C = ${c} : ${d}, what is A : B : C?`,
        explanation: `Make B the same in both: A : B = ${a * c} : ${b * c} and B : C = ${b * c} : ${b * d}, which simplifies to ${ratioText(answer)}.`,
        solutionSteps: [
          `B is ${b} in the first ratio and ${c} in the second.`,
          `Multiply the first ratio by ${c} and the second by ${b}: B becomes ${b * c} in both.`,
          `A : B : C = ${a * c} : ${b * c} : ${b * d} = ${ratioText(answer)}.`
        ],
        method: 'Match the common term, then join the ratios.',
        hints: [
          'B has two different values in the two ratios — both must match first.',
          `Scale so that B = ${b * c} in both ratios.`,
          'Then read off A, B and C and simplify.'
        ],
        commonMistakes: [`Writing ${a} : ${b} : ${d} without matching B.`]
      };
    }
  },

  {
    id: 'rp-fourth-proportional',
    version: 1,
    topicId: 'ratio-proportion',
    conceptId: 'rp-proportion',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['rp-fourth', 'rp-cross'],
    estimatedSeconds: 50,
    params(rng) {
      const a = rng.int(2, 12);
      const b = rng.int(2, 20);
      const c = rng.int(2, 30);
      if (a === c || (b * c) % a !== 0) return null;
      return { a, b, c };
    },
    answer: ({ a, b, c }) => (b * c) / a,
    verify: ({ a, b, c }, value) => nearlyEqual(a * value, b * c),
    render({ a, b, c }) {
      const x = (b * c) / a;
      return {
        question: `Find the fourth proportional to ${a}, ${b} and ${c}.`,
        explanation: `${a} : ${b} = ${c} : x gives ${a}x = ${b} × ${c} = ${b * c}, so x = ${fmt(x)}.`,
        solutionSteps: [
          `Write the proportion ${a} : ${b} = ${c} : x.`,
          `Cross multiply: ${a}x = ${b * c}.`,
          `x = ${fmt(x)}.`
        ],
        method: 'Fourth proportional = (b × c) ÷ a.',
        hints: [
          `Set it up as ${a} : ${b} = ${c} : x.`,
          'Cross multiply the extremes and the means.',
          `Solve ${a}x = ${b * c}.`
        ],
        commonMistakes: ['Putting the numbers in the wrong positions of the proportion.']
      };
    }
  },

  /* ============================ averages ============================ */
  {
    id: 'avg-remove',
    version: 1,
    topicId: 'averages',
    conceptId: 'avg-total',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['avg-sum'],
    estimatedSeconds: 55,
    params(rng) {
      const n = rng.int(5, 15);
      const m = rng.int(15, 80);
      const q = m + rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
      const v = n * m - (n - 1) * q;
      if (v < 1 || v > 250) return null;
      return { n, m, q, v };
    },
    answer: ({ q }) => q,
    formatValue: (value) => format.number(value),
    distractors: ({ n, m, v, q }) => [
      { value: (n * m - v) / n, why: 'divided by the old count' },
      { value: 2 * m - q, why: 'moved the average the wrong way' },
      { value: m, why: 'assumed the average does not change' },
      { value: m + (m - v) / n, why: 'spread the change over the old count' }
    ],
    verify: ({ n, m, v }, value) => nearlyEqual(n * m - v, (n - 1) * value),
    render({ n, m, q, v }) {
      return {
        question: `The average of ${n} numbers is ${m}. If the number ${v} is removed, what is the average of the remaining numbers?`,
        explanation: `Total = ${n} × ${m} = ${n * m}. Removing ${v} leaves ${n * m - v} across ${n - 1} numbers, an average of ${fmt(q)}.`,
        solutionSteps: [
          `Total = ${n} × ${m} = ${n * m}.`,
          `New total = ${n * m} − ${v} = ${n * m - v}.`,
          `New average = ${n * m - v} ÷ ${n - 1} = ${fmt(q)}.`
        ],
        method: 'Convert the average to a total, adjust, re-divide by the new count.',
        hints: [
          'Turn the average into a total first.',
          `The total is ${n * m}; subtract ${v}.`,
          `Remember there are now ${n - 1} numbers.`
        ],
        commonMistakes: ['Dividing by the original count after removing a number.']
      };
    }
  },

  {
    id: 'avg-replacement',
    version: 1,
    topicId: 'averages',
    conceptId: 'avg-replacement',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['avg-replacement-formula'],
    answerDecimals: 1,
    estimatedSeconds: 60,
    params(rng) {
      const n = rng.int(5, 12);
      const w = rng.int(45, 80);
      const d = rng.pick([0.5, 1, 1.5, 2, 2.5, 3, 4]);
      const up = rng.chance(0.7);
      const newcomer = w + (up ? 1 : -1) * n * d;
      if (newcomer < 30 || newcomer > 130) return null;
      return { n, w, d, up };
    },
    answer: ({ n, w, d, up }) => w + (up ? 1 : -1) * n * d,
    formatValue: (value) => format.kg(value),
    distractors: ({ n, w, d, up }) => {
      const s = up ? 1 : -1;
      return [
        { value: w + s * d, why: 'added only the change in average' },
        { value: w - s * n * d, why: 'moved in the wrong direction' },
        { value: w + s * (n - 1) * d, why: 'used one fewer member' },
        { value: n * d, why: 'reported the change in total as the weight' }
      ];
    },
    verify: ({ n, w, d, up }, value) => {
      const baseTotal = n * 60;
      const change = (baseTotal - w + value) / n - baseTotal / n;
      return nearlyEqual(change, (up ? 1 : -1) * d);
    },
    render({ n, w, d, up }) {
      const change = n * d;
      const newcomer = w + (up ? 1 : -1) * change;
      return {
        question: `The average weight of ${n} people ${up ? 'increases' : 'decreases'} by ${fmt(d)} kg when one person weighing ${w} kg is replaced by a new person. What does the new person weigh?`,
        explanation: `The group size is unchanged, so the total changed by ${n} × ${fmt(d)} = ${fmt(change)} kg. The newcomer weighs ${w} ${up ? '+' : '−'} ${fmt(change)} = ${fmt(newcomer)} kg.`,
        solutionSteps: [
          `Change in total = ${n} × ${fmt(d)} = ${fmt(change)} kg.`,
          'All of that change is the difference between the two people.',
          `New person = ${w} ${up ? '+' : '−'} ${fmt(change)} = ${fmt(newcomer)} kg.`
        ],
        method: 'Change in total = number of people × change in average.',
        hints: [
          'The number of people does not change, so only one weight differs.',
          `Multiply the change in average by ${n}.`,
          `${up ? 'Add' : 'Subtract'} that to ${w} kg.`
        ],
        commonMistakes: [`Adding only ${fmt(d)} kg to the departing weight.`]
      };
    }
  },

  {
    id: 'avg-combined',
    version: 1,
    topicId: 'averages',
    conceptId: 'avg-combined',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['avg-combined-formula'],
    answerDecimals: 2,
    estimatedSeconds: 60,
    tags: ['trap'],
    params(rng) {
      // Build group sizes as multiples of a common g so the combined average
      // lands on a whole number without rejecting most seeds.
      const g = rng.int(4, 10);
      const m = rng.int(1, 4);
      const k = rng.int(1, 4);
      if (m === k) return null;
      const n1 = m * g;
      const n2 = k * g;
      const a1 = rng.int(40, 80);
      const delta = k * rng.int(1, 4) * (rng.chance(0.5) ? 1 : -1);
      const combined = a1 + delta;
      const a2 = combined + (delta * m) / k;
      if (a2 < 20 || a2 > 100 || n1 < 8 || n2 < 8) return null;
      return { n1, n2, a1, a2 };
    },
    answer: ({ n1, n2, a1, a2 }) => (n1 * a1 + n2 * a2) / (n1 + n2),
    formatValue: (value) => format.number(value),
    distractors: ({ n1, n2, a1, a2 }) => [
      { value: (a1 + a2) / 2, why: 'averaged the averages' },
      { value: (n1 * a2 + n2 * a1) / (n1 + n2), why: 'swapped the weights' },
      { value: (n1 * a1 + n2 * a2) / Math.max(n1, n2), why: 'divided by one group only' }
    ],
    verify: ({ n1, n2, a1, a2 }, value) => nearlyEqual(value * (n1 + n2), n1 * a1 + n2 * a2, 1e-6),
    render({ n1, n2, a1, a2 }) {
      const total = n1 * a1 + n2 * a2;
      return {
        question: `A class of ${n1} students has an average score of ${a1}, and another class of ${n2} students averages ${a2}. What is the average score of all ${n1 + n2} students?`,
        explanation: `Totals: ${n1} × ${a1} = ${n1 * a1} and ${n2} × ${a2} = ${n2 * a2}. Combined average = ${total} ÷ ${n1 + n2} = ${fmt(total / (n1 + n2))}.`,
        solutionSteps: [
          `First class total = ${n1 * a1}.`,
          `Second class total = ${n2 * a2}.`,
          `Combined average = ${total} ÷ ${n1 + n2} = ${fmt(total / (n1 + n2))}.`
        ],
        method: 'Weighted average: add the totals, divide by the combined count.',
        hints: [
          'The classes are different sizes, so the midpoint of the averages is wrong.',
          'Work out each class total.',
          `Divide the combined total by ${n1 + n2}.`
        ],
        commonMistakes: [`Averaging ${a1} and ${a2} directly.`]
      };
    }
  },

  /* ========================= profit and loss ========================= */
  {
    id: 'pl-rate',
    version: 1,
    topicId: 'profit-loss-discount',
    conceptId: 'pl-profit-pct',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['pl-profit-formula', 'pl-loss-formula'],
    answerDecimals: 1,
    estimatedSeconds: 45,
    params(rng) {
      const profit = rng.chance(0.6);
      const r = rng.pick([5, 10, 12.5, 15, 20, 25, 30, 40, 50]);
      const CP = rng.int(4, 60) * 40;
      const SP = (CP * (100 + (profit ? r : -r))) / 100;
      if (!Number.isInteger(SP)) return null;
      return { profit, r, CP, SP };
    },
    answer: ({ r }) => r,
    formatValue: (value) => format.percent(value),
    distractors: ({ CP, SP }) => [
      { value: (Math.abs(SP - CP) * 100) / SP, why: 'measured against the selling price' },
      { value: Math.abs(SP - CP), why: 'gave the rupee amount as a percentage' },
      { value: (SP * 100) / CP, why: 'gave SP as a percentage of CP' }
    ],
    verify: ({ profit, CP, SP }, value) => nearlyEqual((CP * (100 + (profit ? value : -value))) / 100, SP),
    render({ profit, r, CP, SP }) {
      const word = profit ? 'profit' : 'loss';
      return {
        question: `An article bought for ₹${fmt(CP)} is sold for ₹${fmt(SP)}. What is the ${word} percentage?`,
        explanation: `${profit ? 'Profit' : 'Loss'} = ₹${fmt(Math.abs(SP - CP))} on a cost of ₹${fmt(CP)}, so ${fmt(Math.abs(SP - CP))} ÷ ${fmt(CP)} × 100 = ${fmt(r)}%.`,
        solutionSteps: [
          `${profit ? 'Profit' : 'Loss'} = |${fmt(SP)} − ${fmt(CP)}| = ₹${fmt(Math.abs(SP - CP))}.`,
          `Divide by the COST price: ${fmt(Math.abs(SP - CP))} ÷ ${fmt(CP)}.`,
          `× 100 = ${fmt(r)}% ${word}.`
        ],
        method: `${profit ? 'Profit' : 'Loss'} ÷ CP × 100.`,
        hints: [
          `${profit ? 'Profit' : 'Loss'} percentage is always measured on the cost price.`,
          `The ${word} is ₹${fmt(Math.abs(SP - CP))}.`,
          `Divide by ₹${fmt(CP)} and multiply by 100.`
        ],
        commonMistakes: ['Dividing by the selling price.']
      };
    }
  },

  {
    id: 'pl-cp-from-sp',
    version: 1,
    topicId: 'profit-loss-discount',
    conceptId: 'pl-find-price',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pl-cp-formula'],
    estimatedSeconds: 60,
    tags: ['reverse', 'trap'],
    params(rng) {
      const profit = rng.chance(0.6);
      const r = rng.pick([5, 10, 15, 20, 25, 40]);
      const CP = rng.int(4, 60) * 20;
      const SP = (CP * (100 + (profit ? r : -r))) / 100;
      if (!Number.isInteger(SP)) return null;
      return { profit, r, CP, SP };
    },
    answer: ({ CP }) => CP,
    formatValue: (value) => format.rupees(value),
    distractors: ({ profit, r, SP }) =>
      profit
        ? [
            { value: (SP * (100 - r)) / 100, why: `took ${r}% off the selling price` },
            { value: SP - r, why: 'subtracted the rate as rupees' },
            { value: (SP * 100) / (100 - r), why: 'divided by the wrong multiplier' }
          ]
        : [
            { value: (SP * (100 + r)) / 100, why: `added ${r}% of the selling price` },
            { value: SP + r, why: 'added the rate as rupees' },
            { value: (SP * 100) / (100 + r), why: 'divided by the wrong multiplier' }
          ],
    verify: ({ profit, r, SP }, value) => nearlyEqual((value * (100 + (profit ? r : -r))) / 100, SP),
    render({ profit, r, CP, SP }) {
      const multiplier = fmt((100 + (profit ? r : -r)) / 100, 2);
      return {
        question: `An article is sold for ₹${fmt(SP)} at a ${profit ? 'profit' : 'loss'} of ${r}%. What was its cost price?`,
        explanation: `SP = CP × ${multiplier}, so CP = ${fmt(SP)} ÷ ${multiplier} = ₹${fmt(CP)}.`,
        solutionSteps: [
          `₹${fmt(SP)} is ${100 + (profit ? r : -r)}% of the cost price.`,
          `CP = ${fmt(SP)} ÷ ${multiplier}.`,
          `CP = ₹${fmt(CP)}.`
        ],
        method: 'Divide the selling price by the multiplier.',
        hints: [
          `₹${fmt(SP)} is not 100% of the cost — what percentage is it?`,
          `It is ${100 + (profit ? r : -r)}% of the cost price.`,
          `Divide by ${multiplier}.`
        ],
        commonMistakes: [`Taking ${r}% of the selling price instead of reversing the change.`]
      };
    }
  },

  {
    id: 'pl-markup-discount',
    version: 1,
    topicId: 'profit-loss-discount',
    conceptId: 'pl-successive-discount',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pl-markup-discount'],
    estimatedSeconds: 70,
    tags: ['trap'],
    params(rng) {
      const m = rng.pick([10, 20, 25, 30, 40, 50, 60]);
      const d = rng.pick([5, 10, 15, 20, 25, 30, 40]);
      const net = ((100 + m) * (100 - d)) / 100 - 100;
      if (Math.abs(net * 100 - Math.round(net * 100)) > 1e-6) return null;
      return { m, d };
    },
    answer: ({ m, d }) => tradeLabel(m - d - (m * d) / 100),
    formatValue: (value) => value,
    distractors: ({ m, d }) => {
      const net = m - d - (m * d) / 100;
      return [
        { value: tradeLabel(m - d), why: 'subtracted the percentages' },
        { value: tradeLabel(-net), why: 'wrong direction' },
        { value: tradeLabel(m - d + (m * d) / 100), why: 'sign error on the product term' },
        { value: tradeLabel(m), why: 'ignored the discount' }
      ];
    },
    verify: ({ m, d }, label) => tradeLabel(100 * (1 + m / 100) * (1 - d / 100) - 100) === label,
    render({ m, d }) {
      const marked = 100 + m;
      const selling = (marked * (100 - d)) / 100;
      return {
        question: `A shopkeeper marks goods ${m}% above cost price and then gives a ${d}% discount. What is the overall result?`,
        explanation: `Take cost = 100. Marked price = ${marked}; after ${d}% off, selling price = ${fmt(selling)}. That is ${tradeLabel(selling - 100).toLowerCase()}.`,
        solutionSteps: [
          'Let the cost price be 100.',
          `Marked price = ${marked}.`,
          `Selling price = ${marked} × ${fmt((100 - d) / 100)} = ${fmt(selling)}.`,
          `Compared with 100: ${tradeLabel(selling - 100)}.`
        ],
        method: 'Set cost = 100 and apply the markup, then the discount.',
        hints: [
          'The discount is taken on the marked price, not on the cost.',
          'Start with a cost of 100.',
          `Multiply ${marked} by ${fmt((100 - d) / 100)}.`
        ],
        commonMistakes: [`Subtracting ${d} from ${m}.`]
      };
    }
  },

  /* ========================= simple interest ========================= */
  {
    id: 'si-interest',
    version: 1,
    topicId: 'simple-interest',
    conceptId: 'si-apply',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['si-basic', 'si-time-units'],
    estimatedSeconds: 50,
    params(rng) {
      const P = rng.int(2, 50) * 500;
      const R = rng.pick([4, 5, 6, 8, 9, 10, 12, 15]);
      const months = rng.chance(0.35);
      const Tm = months ? rng.pick([6, 9, 18, 30]) : rng.int(2, 6) * 12;
      const SI = (P * R * Tm) / 1200;
      if (!Number.isInteger(SI)) return null;
      return { P, R, Tm, months };
    },
    answer: ({ P, R, Tm }) => (P * R * Tm) / 1200,
    formatValue: (value) => format.rupees(value),
    distractors: ({ P, R, Tm, months }) => {
      const T = Tm / 12;
      const SI = (P * R * T) / 100;
      return [
        months ? { value: (P * R * Tm) / 100, why: 'used months as years' } : { value: Math.round(compoundBalance(P, R, T) - P), why: 'used compound interest' },
        { value: P + SI, why: 'gave the amount instead of the interest' },
        { value: (P * R) / 100, why: 'gave one year of interest' },
        { value: SI * 2, why: 'doubled the period' }
      ];
    },
    verify: ({ P, R, Tm }, value) => {
      // Independent check: accumulate interest month by month.
      let interest = 0;
      for (let month = 0; month < Tm; month++) interest += (P * R) / 100 / 12;
      return nearlyEqual(interest, value, 1e-6);
    },
    render({ P, R, Tm, months }) {
      const T = Tm / 12;
      const SI = (P * R * T) / 100;
      const period = months ? `${Tm} months` : `${T} years`;
      return {
        question: `Find the simple interest on ₹${fmt(P)} at ${R}% per annum for ${period}.`,
        explanation: `${months ? `${Tm} months = ${fmt(T)} years. ` : ''}SI = (${fmt(P)} × ${R} × ${fmt(T)}) ÷ 100 = ₹${fmt(SI)}.`,
        solutionSteps: [
          months ? `Convert the time: ${Tm} months = ${fmt(T)} years.` : `Time T = ${T} years.`,
          `One year's interest = ${R}% of ${fmt(P)} = ₹${fmt((P * R) / 100)}.`,
          `SI = ${fmt((P * R) / 100)} × ${fmt(T)} = ₹${fmt(SI)}.`
        ],
        method: 'SI = PRT ÷ 100, with T in years.',
        hints: [
          months ? 'The rate is per year but the period is in months — convert first.' : 'Every year earns the same interest on the original sum.',
          `One year's interest is ₹${fmt((P * R) / 100)}.`,
          `Multiply by ${fmt(T)}.`
        ],
        commonMistakes: months ? ['Substituting the number of months directly as T.'] : ['Reporting the amount instead of the interest.']
      };
    }
  },

  {
    id: 'si-rate',
    version: 1,
    topicId: 'simple-interest',
    conceptId: 'si-reverse',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['si-find-rate'],
    answerDecimals: 1,
    estimatedSeconds: 60,
    params(rng) {
      const P = rng.int(2, 40) * 500;
      const R = rng.pick([4, 5, 6, 8, 10, 12, 15]);
      const T = rng.int(2, 6);
      const SI = (P * R * T) / 100;
      if (!Number.isInteger(SI)) return null;
      return { P, R, T, SI, amount: rng.chance(0.5) };
    },
    answer: ({ R }) => R,
    formatValue: (value) => format.percent(value),
    distractors: ({ P, R, T, SI }) => [
      { value: (100 * SI) / P, why: 'forgot to divide by the time' },
      { value: (100 * (P + SI)) / (P * T), why: 'used the amount as the interest' },
      { value: (100 * SI) / ((P + SI) * T), why: 'used the amount as the principal' },
      { value: R * T, why: 'multiplied rate and time' }
    ],
    verify: ({ P, T, SI }, value) => nearlyEqual((P * value * T) / 100, SI),
    render({ P, R, T, SI, amount }) {
      return {
        question: amount
          ? `A sum of ₹${fmt(P)} amounts to ₹${fmt(P + SI)} in ${T} years at simple interest. What is the rate per annum?`
          : `₹${fmt(P)} earns ₹${fmt(SI)} simple interest in ${T} years. What is the rate per annum?`,
        explanation: `${amount ? `Interest = ${fmt(P + SI)} − ${fmt(P)} = ₹${fmt(SI)}. ` : ''}R = (100 × ${fmt(SI)}) ÷ (${fmt(P)} × ${T}) = ${R}%.`,
        solutionSteps: [
          amount ? `SI = amount − principal = ₹${fmt(SI)}.` : `SI = ₹${fmt(SI)}.`,
          `Interest per year = ${fmt(SI)} ÷ ${T} = ₹${fmt(SI / T)}.`,
          `As a percentage of ₹${fmt(P)}: ${R}%.`
        ],
        method: 'R = 100 × SI ÷ (P × T).',
        hints: [
          amount ? 'The amount includes the principal — subtract it to get the interest.' : 'Find how much interest one year produced.',
          `One year's interest is ₹${fmt(SI / T)}.`,
          `Express that as a percentage of ₹${fmt(P)}.`
        ],
        commonMistakes: ['Forgetting to divide the interest by the number of years.']
      };
    }
  },

  {
    id: 'si-multiple-time',
    version: 1,
    topicId: 'simple-interest',
    conceptId: 'si-applications',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['si-multiply'],
    answerDecimals: 1,
    estimatedSeconds: 60,
    params(rng) {
      const k = rng.pick([2, 3, 4, 5]);
      const R = rng.pick([2, 4, 5, 6.25, 8, 10, 12.5, 16, 20, 25]);
      const T = (100 * (k - 1)) / R;
      if (T > 60) return null;
      return { k, R, subject: rng.pick(['a sum of money', 'a deposit', 'an investment', 'a loan amount']) };
    },
    answer: ({ k, R }) => (100 * (k - 1)) / R,
    formatValue: (value) => format.years(value),
    distractors: ({ k, R }) => [
      { value: (100 * k) / R, why: 'aimed for k principals of interest instead of k − 1' },
      { value: (k - 1) * R, why: 'multiplied instead of dividing' },
      { value: (50 * (k - 1)) / R, why: 'halved the time' },
      { value: k === 2 ? (100 * 2) / R : 100 / R, why: 'confused doubling with the target multiple' }
    ],
    verify: ({ k, R }, value) => {
      const P = 100;
      return nearlyEqual(P + (P * R * value) / 100, k * P);
    },
    render({ k, R, subject }) {
      const word = { 2: 'double', 3: 'triple', 4: 'become four times', 5: 'become five times' }[k];
      const T = (100 * (k - 1)) / R;
      return {
        question: `In how many years will ${subject} ${word} itself at ${fmt(R)}% per annum simple interest?`,
        explanation: `To ${word}, the interest must equal ${k - 1} × the principal. At ${R}% a year that takes ${100 * (k - 1)} ÷ ${R} = ${fmt(T)} years.`,
        solutionSteps: [
          `Final amount = ${k}P, so interest needed = ${k - 1}P.`,
          `${k - 1}P = P × ${R} × T ÷ 100.`,
          `T = ${100 * (k - 1)} ÷ ${R} = ${fmt(T)} years.`
        ],
        method: 'Interest needed = (k − 1) × principal.',
        hints: [
          'Take the principal as ₹100 to make the arithmetic concrete.',
          `The sum must earn ₹${100 * (k - 1)} of interest.`,
          `At ${R}% it earns ₹${R} a year.`
        ],
        commonMistakes: [`Aiming for ${k}P of interest instead of ${k - 1}P.`]
      };
    }
  },

  /* ======================== compound interest ======================== */
  {
    id: 'ci-interest',
    version: 1,
    topicId: 'compound-interest',
    conceptId: 'ci-formula',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ci-amount', 'ci-interest'],
    estimatedSeconds: 75,
    params(rng) {
      const R = rng.pick([5, 10, 20]);
      const T = rng.pick([2, 3]);
      const unit = { '5-2': 400, '5-3': 8000, '10-2': 100, '10-3': 1000, '20-2': 25, '20-3': 125 }[`${R}-${T}`];
      const P = unit * rng.int(1, 60) * (unit < 1000 ? 20 : 1);
      if (P < 1000 || P > 200000) return null;
      return { P, R, T };
    },
    answer: ({ P, R, T }) => Math.round(P * (1 + R / 100) ** T - P),
    formatValue: (value) => format.rupees(value),
    distractors: ({ P, R, T }) => [
      { value: (P * R * T) / 100, why: 'used simple interest' },
      { value: Math.round(P * (1 + R / 100) ** T), why: 'gave the amount instead of the interest' },
      { value: Math.round(P * (1 + R / 100) ** (T - 1) - P), why: 'compounded one year too few' },
      { value: Math.round(P * (1 + R / 100) ** (T + 1) - P), why: 'compounded one year too many' }
    ],
    verify: ({ P, R, T }, value) => nearlyEqual(compoundBalance(P, R, T) - P, value, 1e-6),
    render({ P, R, T }) {
      const steps = [];
      let balance = P;
      for (let year = 1; year <= T; year++) {
        const interest = (balance * R) / 100;
        steps.push(`Year ${year}: ${R}% of ₹${fmt(balance)} = ₹${fmt(interest)} → balance ₹${fmt(balance + interest)}.`);
        balance += interest;
      }
      return {
        question: `Find the compound interest on ₹${fmt(P)} at ${R}% per annum for ${T} years, compounded annually.`,
        explanation: `A = ${fmt(P)} × ${fmt(1 + R / 100)}^${T} = ₹${fmt(balance)}, so CI = ₹${fmt(balance - P)}.`,
        solutionSteps: [...steps, `CI = ₹${fmt(balance)} − ₹${fmt(P)} = ₹${fmt(balance - P)}.`],
        method: 'A = P(1 + R/100)^T, then subtract P.',
        hints: [
          'Each year earns interest on the new, larger balance.',
          `The yearly multiplier is ${fmt(1 + R / 100)}.`,
          `Multiply ₹${fmt(P)} by it ${T} times, then subtract the principal.`
        ],
        commonMistakes: ['Using simple interest, or reporting the amount as the interest.']
      };
    }
  },

  {
    id: 'ci-si-difference',
    version: 1,
    topicId: 'compound-interest',
    conceptId: 'ci-vs-si',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['ci-si-difference'],
    unit: '₹',
    estimatedSeconds: 70,
    params(rng) {
      const R = rng.pick([4, 5, 8, 10, 12, 15, 20]);
      const unit = 10000 / gcd(10000, R * R);
      const P = unit * rng.int(1, 40);
      if (P < 1000 || P > 200000) return null;
      return { P, R };
    },
    answer: ({ P, R }) => (P * R * R) / 10000,
    verify: ({ P, R }, value) => nearlyEqual(compoundBalance(P, R, 2) - P - (P * R * 2) / 100, value, 1e-6),
    render({ P, R }) {
      const ci = compoundBalance(P, R, 2) - P;
      const si = (P * R * 2) / 100;
      return {
        question: `What is the difference between the compound interest and the simple interest on ₹${fmt(P)} at ${R}% per annum for 2 years? (Answer in ₹)`,
        explanation: `Difference = P × (R/100)² = ${fmt(P)} × ${fmt(R / 100)}² = ₹${fmt(ci - si)}. (CI = ₹${fmt(ci)}, SI = ₹${fmt(si)}.)`,
        solutionSteps: [
          'Over two years, the gap is the interest on the first year\'s interest.',
          `First year's interest = ₹${fmt((P * R) / 100)}.`,
          `${R}% of that = ₹${fmt(ci - si)}.`
        ],
        method: 'CI − SI for 2 years = P(R/100)².',
        hints: [
          'The difference comes only from interest earned on interest.',
          `The first year's interest is ₹${fmt((P * R) / 100)}.`,
          `Take ${R}% of that amount.`
        ],
        commonMistakes: ['Computing CI and SI separately and making an arithmetic slip.']
      };
    }
  },

  {
    id: 'ci-rate-from-multiple',
    version: 1,
    topicId: 'compound-interest',
    conceptId: 'ci-reverse',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ci-find-rate'],
    estimatedSeconds: 80,
    params(rng) {
      const T = rng.pick([2, 2, 3]);
      const r = rng.pick(T === 2 ? [10, 20, 25, 30, 40, 50] : [10, 20, 50]);
      const P = rng.int(2, 60) * 500;
      const A = P * (1 + r / 100) ** T;
      if (Math.abs(A - Math.round(A)) > 1e-6) return null;
      return { T, r, P, A: Math.round(A) };
    },
    answer: ({ r }) => r,
    formatValue: (value) => format.percent(value),
    distractors: ({ T, P, A, r }) => [
      { value: ((A - P) * 100) / P / T, why: 'spread the total growth evenly over the years' },
      { value: ((A - P) * 100) / P, why: 'gave the total growth' },
      { value: r * T, why: 'multiplied the rate by the years' },
      { value: r + 5, why: 'arithmetic slip' }
    ],
    verify: ({ T, P, A }, value) => nearlyEqual(P * (1 + value / 100) ** T, A, 1e-9),
    render({ T, r, P, A }) {
      const k = A / P;
      const root = T === 2 ? '√' : '∛';
      return {
        question: `₹${fmt(P)} grows to ₹${fmt(A)} in ${T} years at compound interest, compounded annually. What is the annual rate?`,
        explanation: `A/P = ${fmt(k, 4)} = (1 + R/100)^${T}, so 1 + R/100 = ${root}${fmt(k, 4)} = ${fmt(1 + r / 100)} and R = ${r}%.`,
        solutionSteps: [
          `Growth factor = ${fmt(A)} ÷ ${fmt(P)} = ${fmt(k, 4)}.`,
          `(1 + R/100)^${T} = ${fmt(k, 4)}, so 1 + R/100 = ${fmt(1 + r / 100)}.`,
          `R = ${r}%.`
        ],
        method: `Find the growth factor, then take its ${T === 2 ? 'square' : 'cube'} root.`,
        hints: [
          'Divide the final amount by the principal to get the growth factor.',
          `The yearly multiplier is applied ${T} times.`,
          `Which number, raised to the power ${T}, gives ${fmt(k, 4)}?`
        ],
        commonMistakes: ['Dividing the total growth by the number of years, as if it were simple interest.']
      };
    }
  }
];
