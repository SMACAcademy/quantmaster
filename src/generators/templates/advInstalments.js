/** Compound interest advanced unit: equal instalments under compound and simple interest (Phase E). */

import { fmt, format, gcd, lcm } from '../core.js';

/**
 * Rates as the one-year ratio principal : amount = a : b, so every instalment
 * and principal can be built as whole multiples of b^n and a × (sum of the
 * mixed powers) — clean by design, no rejected seeds.
 */
const CI_RATES = [
  { R: 4, a: 25, b: 26 },
  { R: 5, a: 20, b: 21 },
  { R: 10, a: 10, b: 11 },
  { R: 20, a: 5, b: 6 },
  { R: 25, a: 4, b: 5 }
];

const SI_RATES = [4, 5, 6, 8, 10, 12, 15];

const ORDINAL = ['first', 'second', 'third', 'fourth'];

/** a^(n−1) + a^(n−2)·b + … + b^(n−1): the loan, in units, when the instalment is b^n units. */
function mixedPowerSum(a, b, n) {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += a ** (n - 1 - i) * b ** i;
  return sum;
}

/** Smallest power of ten that lifts `unit` to at least ₹1,000. */
function stepFor(unit) {
  let step = 1;
  while (unit * step < 1000) step *= 10;
  return step;
}

/** A loan at R% compound interest, n equal instalments, built from the ratio a : b. */
function ciLoan(rng) {
  const { R, a, b } = rng.pick(CI_RATES);
  const n = rng.pick([2, 2, 3]);
  const unitP = a * mixedPowerSum(a, b, n);
  const unitX = b ** n;
  const step = stepFor(unitP);
  const maxK = Math.max(1, Math.floor(500000 / (unitP * step)));
  const k = step * rng.int(1, Math.min(20, maxK));
  return { R, a, b, n, P: unitP * k, x: unitX * k };
}

/** Year by year: add the year's compound interest, pay one instalment. Final balance. */
function ciBalanceAfter(P, R, n, x) {
  let balance = P;
  for (let year = 1; year <= n; year++) {
    balance += (balance * R) / 100;
    balance -= x;
    if (year < n && balance <= 0) return NaN; // paid off too early: not equal instalments
  }
  return balance;
}

/** The SI bank-exam rule simulated year by year: the debt grows by SI on P, each paid
 *  instalment earns SI on itself until the end. Returns debt − credit at the end. */
function siGapAtEnd(debtEnd, R, n, x) {
  let credit = 0;
  let paid = 0;
  for (let year = 1; year <= n; year++) {
    credit += (paid * R) / 100; // a year's SI on instalments already paid
    credit += x;
    paid += x;
  }
  return debtEnd - credit;
}

/** CI equal-instalment formula, used only for distractors (wrong rules). */
const ciInstalmentFor = (P, R, n) => {
  const g = 1 + R / 100;
  let pv = 0;
  for (let i = 1; i <= n; i++) pv += 1 / g ** i;
  return P / pv;
};
/** Present value of n instalments of x discounted with simple interest (a wrong rule here). */
function simplePresentValue(x, R, n) {
  let sum = 0;
  for (let i = 1; i <= n; i++) sum += x / (1 + (i * R) / 100);
  return sum;
}
const siInstalmentFor = (A, R, n) => (100 * A) / (100 * n + (R * n * (n - 1)) / 2);

const rupee = (value) => Math.round(value);

function ciWalkSteps(P, R, n, x) {
  const steps = [];
  let balance = P;
  for (let year = 1; year <= n; year++) {
    const grown = balance + (balance * R) / 100;
    steps.push(`Year ${year}: ₹${fmt(balance)} + ${R}% = ₹${fmt(grown)}; pay ₹${fmt(x)} → ₹${fmt(grown - x)} left.`);
    balance = grown - x;
  }
  return steps;
}

export const advInstalmentsTemplates = [
  {
    id: 'ci-adv-emi-instalment',
    version: 1,
    topicId: 'compound-interest',
    conceptId: 'ci-adv-emi-compound',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ci-adv-emi-pv-f', 'ci-adv-sc-two-instalments'],
    tags: ['advanced'],
    estimatedSeconds: 120,
    params: (rng) => ciLoan(rng),
    answer: ({ x }) => x,
    formatValue: (value) => format.rupees(value),
    distractors: ({ P, R, n }) => [
      { value: rupee((P * (1 + R / 100) ** n) / n), why: 'split the n-year compound amount equally' },
      { value: rupee(siInstalmentFor((P * (100 + n * R)) / 100, R, n)), why: 'used the simple-interest instalment rule' },
      { value: rupee((P / n) * (1 + R / 100)), why: 'divided the loan equally and added one year of interest' },
      { value: rupee(P / n), why: 'ignored the interest' },
      { value: rupee(P / simplePresentValue(1, R, n)), why: 'discounted each instalment with simple interest' }
    ],
    verify: ({ P, R, n }, value) => Math.abs(ciBalanceAfter(P, R, n, value)) < 1e-6,
    render({ R, a, b, n, P, x }) {
      const units = mixedPowerSum(a, b, n);
      const unitValue = P / (a * units);
      const pvUnits = [];
      for (let i = 1; i <= n; i++) pvUnits.push(a ** i * b ** (n - i));
      const shortcut = n === 2 ? 'P × b² ÷ [a(a + b)]' : 'P × b³ ÷ [a(a² + ab + b²)]';
      return {
        question: `A loan of ₹${fmt(P)} at ${R}% per annum compound interest is repaid in ${n} equal annual instalments, the first one year after the loan. What is each instalment?`,
        explanation: `At ${R}%, one year turns ${a} into ${b}, so P : A = ${a} : ${b}. Take the instalment as ${b}${n === 2 ? '²' : '³'} = ${fmt(b ** n)} units; its present values are ${pvUnits.map((u) => fmt(u)).join(', ')} units, so the loan is ${fmt(a * units)} units. One unit is ₹${fmt(unitValue)} and each instalment is ₹${fmt(x)}.`,
        solutionSteps: [
          `${R}% a year: P : A = ${a} : ${b}.`,
          `Instalment = ${fmt(b ** n)} units; present values ${pvUnits.map((u) => fmt(u)).join(' + ')} = ${fmt(a * units)} units = the loan.`,
          `1 unit = ₹${fmt(P)} ÷ ${fmt(a * units)} = ₹${fmt(unitValue)}, so the instalment = ${fmt(b ** n)} × ${fmt(unitValue)} = ₹${fmt(x)}.`,
          ...ciWalkSteps(P, R, n, x)
        ],
        method: `Ratio method: instalment = ${shortcut}.`,
        hints: [
          `Write ${R}% as the one-year ratio of principal to amount.`,
          `With ${a} : ${b}, let the instalment be ${fmt(b ** n)} units and find each one's present value in units.`,
          'The present values add up to the sum borrowed.'
        ],
        commonMistakes: [
          `Dividing the ${n}-year amount by ${n}, as if every instalment waited the full ${n} years.`,
          'Using the simple-interest instalment rule for a compound-interest loan.'
        ]
      };
    }
  },

  {
    id: 'ci-adv-emi-principal',
    version: 1,
    topicId: 'compound-interest',
    conceptId: 'ci-adv-emi-compound',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ci-adv-emi-pv-f'],
    tags: ['advanced'],
    estimatedSeconds: 100,
    params: (rng) => ciLoan(rng),
    answer: ({ P }) => P,
    formatValue: (value) => format.rupees(value),
    distractors: ({ R, n, x }) => {
      const g = 1 + R / 100;
      return [
        { value: n * x, why: 'added the instalments without discounting' },
        { value: rupee((n * x) / g ** n), why: 'discounted the whole total by n years' },
        { value: rupee((n * x) / g), why: 'discounted the whole total by one year' },
        { value: rupee(simplePresentValue(x, R, n)), why: 'discounted with simple interest' },
        { value: rupee(n * x * (1 - R / 100)), why: 'took R% off the total once' }
      ];
    },
    verify: ({ R, n, x }, value) => Math.abs(ciBalanceAfter(value, R, n, x)) < 1e-6,
    render({ R, a, b, n, P, x }) {
      const pv = [];
      for (let i = 1; i <= n; i++) pv.push((x * a ** i) / b ** i);
      return {
        question: `A loan at ${R}% per annum compound interest is cleared by ${n} equal annual instalments of ₹${fmt(x)} each, the first one year after the loan. How much was borrowed?`,
        explanation: `Discount each instalment back to the day of the loan: ${pv.map((v, i) => `the ${ORDINAL[i]} is worth ₹${fmt(v)}`).join(', ')}. Together they make ₹${fmt(P)}.`,
        solutionSteps: [
          `${R}% a year: P : A = ${a} : ${b}, so each year back multiplies by ${a}/${b}.`,
          ...pv.map((v, i) => `Instalment ${i + 1}: ₹${fmt(x)} × (${a}/${b})${i === 0 ? '' : i === 1 ? '²' : '³'} = ₹${fmt(v)}.`),
          `Sum borrowed = ${pv.map((v) => fmt(v)).join(' + ')} = ₹${fmt(P)}.`
        ],
        method: 'Add the present values of the instalments.',
        hints: [
          'Each instalment must be brought back to the day of the loan separately.',
          `Divide by ${fmt(1 + R / 100)} once for the first instalment, twice for the second${n === 3 ? ', three times for the third' : ''}.`,
          `Or multiply by ${a}/${b} for every year back.`
        ],
        commonMistakes: [
          `Adding the instalments to get ₹${fmt(n * x)}, ignoring the interest built into them.`,
          'Discounting the whole total by the full term, as if everything were paid at the end.'
        ]
      };
    }
  },

  {
    id: 'ci-adv-emi-simple',
    version: 1,
    topicId: 'compound-interest',
    conceptId: 'ci-adv-emi-simple',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ci-adv-emi-si-f', 'ci-adv-sc-si-debt'],
    tags: ['advanced'],
    estimatedSeconds: 100,
    params(rng) {
      const R = rng.pick(SI_RATES);
      const n = rng.pick([2, 3, 3, 4]);
      const D = 100 * n + (R * n * (n - 1)) / 2; // 100 × the instalment multiplier
      const debtForm = rng.chance(0.5);
      if (debtForm) {
        // A = x × D / 100: x a multiple of 100 / gcd(100, D) keeps A whole; also a multiple of 10.
        const unitX = lcm(100 / gcd(100, D), 10);
        const unitA = (unitX * D) / 100;
        const k = rng.int(Math.ceil(1000 / unitA), Math.floor(100000 / unitA));
        return { R, n, D, debtForm, A: unitA * k, x: unitX * k };
      }
      // Borrowed P: amount P(100 + nR)/100 = x D / 100, so x = P(100 + nR) / D.
      const M = 100 + n * R;
      const g = gcd(D, M);
      const unitP = D / g;
      const unitX = M / g;
      // Keep the amount due a whole number of rupees, and the instalment a multiple of 10.
      const kStep = lcm(100 / gcd(100, unitP * M), 10 / gcd(10, unitX));
      const k = kStep * rng.int(Math.ceil(1000 / (unitP * kStep)), Math.floor(100000 / (unitP * kStep)));
      const P = unitP * k;
      return { R, n, D, debtForm, P, A: (P * M) / 100, x: unitX * k };
    },
    answer: ({ x }) => x,
    formatValue: (value) => format.rupees(value),
    distractors: ({ R, n, D, A, P, debtForm }) => [
      { value: rupee(A / n), why: 'split the amount due equally' },
      { value: rupee((100 * A) / (100 * n + (R * n * (n + 1)) / 2)), why: 'gave the last instalment a year of interest too (n(n + 1)/2)' },
      debtForm
        ? { value: rupee((A * (R / 100)) / ((1 + R / 100) ** n - 1)), why: 'used compound interest' }
        : { value: rupee(P / n), why: 'ignored the interest' },
      debtForm
        ? { value: rupee((A * (100 + n * R)) / D), why: 'added interest to the debt as if it were the sum borrowed' }
        : { value: rupee(ciInstalmentFor(P, R, n)), why: 'used compound interest' },
      { value: rupee((100 * A) / (100 * n + R * n * (n - 1))), why: 'forgot to halve n(n − 1)' }
    ],
    verify: ({ R, n, A, P, debtForm }, value) => {
      // A borrowed sum grows by the same simple interest on P every year.
      let debt = debtForm ? A : P;
      if (!debtForm) for (let year = 1; year <= n; year++) debt += (P * R) / 100;
      return Math.abs(siGapAtEnd(debt, R, n, value)) < 1e-6;
    },
    render({ R, n, D, debtForm, P, A, x }) {
      const years = Array.from({ length: n }, (_, i) => n - 1 - i);
      const yearList = `${years.slice(0, -1).join(', ')} and ${years.at(-1)}`;
      const interestYears = (n * (n - 1)) / 2;
      const yearsWord = interestYears === 1 ? 'year' : 'years';
      const grown = years.map((y) => x + (x * R * y) / 100);
      const question = debtForm
        ? `What equal annual instalment will discharge a debt of ₹${fmt(A)} due in ${n} years at ${R}% per annum simple interest?`
        : `₹${fmt(P)} is borrowed at ${R}% per annum simple interest and repaid in ${n} equal annual instalments, the first one year after the loan. What is each instalment?`;
      const amountStep = debtForm
        ? `The debt due at the end is ₹${fmt(A)}.`
        : `Amount due = ₹${fmt(P)} + ${n * R}% = ₹${fmt(A)}.`;
      return {
        question,
        explanation: `${debtForm ? '' : `The amount due after ${n} years is ₹${fmt(A)}. `}The instalments earn simple interest for ${yearList} years — ${interestYears} ${yearsWord} of ${R}% in all — so ₹${fmt(A)} = x × ${fmt(D / 100)} and x = ₹${fmt(x)}.`,
        solutionSteps: [
          amountStep,
          `Interest years on the instalments: ${years.join(' + ')} = ${interestYears}, worth ${interestYears} × ${R}% = ${fmt((interestYears * R) / 100)}x.`,
          `${n}x + ${fmt((interestYears * R) / 100)}x = ${fmt(D / 100)}x = ₹${fmt(A)}, so x = ₹${fmt(x)}.`,
          `Check: ${grown.map((v) => fmt(v)).join(' + ')} = ${fmt(A)} ✓`
        ],
        method: 'Shortcut: x = 100A ÷ [100n + R × n(n − 1)/2].',
        hints: [
          debtForm
            ? 'The debt is due at the end, so grow each instalment to the end with simple interest.'
            : `First find what ₹${fmt(P)} amounts to in ${n} years at ${R}% simple interest.`,
          `The instalments earn interest for ${yearList} years.`,
          `So the amount due equals x × (${n} + ${fmt((interestYears * R) / 100)}).`
        ],
        commonMistakes: [
          'Dividing the amount due by the number of instalments, which ignores the interest the early instalments earn.',
          'Counting n(n + 1)/2 interest years, giving the last instalment interest it never earns.'
        ]
      };
    }
  }
];
