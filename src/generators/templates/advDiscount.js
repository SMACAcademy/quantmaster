/** Simple interest advanced unit: true discount and banker's discount (Phase E). */

import { fmt, format, fractionText, isInteger, nearlyEqual, reduceFraction } from '../core.js';

const RATES = [4, 5, 6, 8, 9, 10, 12, 15, 16, 20];
const SHORT_MONTHS = [3, 4, 6, 8, 9, 15, 18, 30];

/** A time in months, as the question states it and as a number of years. */
function timeText(months) {
  if (months % 12 === 0) {
    const years = months / 12;
    return { said: `${years} year${years === 1 ? '' : 's'}`, years: String(years), convert: '' };
  }
  const years = fractionText(reduceFraction(months, 12));
  return { said: `${months} months`, years, convert: `${months} months = ${months}/12 = ${years} year${months > 12 ? 's' : ''}. ` };
}

/**
 * Pick a rate and a time (in months; months are used about 40% of the time),
 * keeping RT at 40 or less as exam questions do.
 */
function pickTime(rng) {
  const months = rng.chance(0.4) ? rng.pick(SHORT_MONTHS) : rng.int(2, 5) * 12;
  const R = rng.pick(RATES.filter((rate) => rate * months <= 480));
  return { R, months, RT: (R * months) / 12 };
}

/**
 * The smallest round present worth (a multiple of ₹100) for which the true
 * discount, the face value and the banker's discount are all whole rupees.
 */
function presentWorthStep(RT) {
  for (let step = 100; step <= 20000; step += 100) {
    const TD = (step * RT) / 100;
    if (isInteger(TD) && isInteger(((step + TD) * RT) / 100)) return step;
  }
  return null;
}

/** A clean present worth, up to about ₹50,000, built from that step. */
function pickPresentWorth(rng, RT) {
  const step = presentWorthStep(RT);
  if (!step) return null;
  return step * rng.int(1, Math.max(2, Math.floor(50000 / step)));
}

/** Simple interest accumulated month by month — deliberately not the closed formula. */
function interestByMonths(P, R, months) {
  let interest = 0;
  for (let month = 0; month < months; month++) interest += (P * R) / 100 / 12;
  return interest;
}

export const advDiscountTemplates = [
  /* ===================== true discount and present worth ===================== */
  {
    id: 'si-adv-td-pw',
    version: 1,
    topicId: 'simple-interest',
    conceptId: 'si-adv-true-discount',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['si-adv-pw-f', 'si-time-units'],
    estimatedSeconds: 90,
    params(rng) {
      const { R, months, RT } = pickTime(rng);
      // Present worth is a round sum, so the true discount and amount are whole rupees.
      const PW = rng.int(4, 150) * 100;
      const TD = (PW * RT) / 100;
      if (!isInteger(TD)) return null;
      return { R, months, RT, PW, A: PW + TD, askPW: rng.chance(0.4) };
    },
    answer: ({ A, RT, askPW }) => (askPW ? (100 * A) / (100 + RT) : (A * RT) / (100 + RT)),
    formatValue: (value) => format.rupees(value),
    distractors: ({ A, R, months, RT, askPW }) => {
      const PW = (100 * A) / (100 + RT);
      const BD = (A * RT) / 100;
      const monthsAsYears = months % 12 !== 0;
      if (askPW) {
        return [
          { value: A - BD, why: 'subtracted interest on the amount instead of discounting it' },
          { value: A - PW, why: 'gave the true discount instead of the present worth' },
          { value: (100 * A) / (100 + R), why: 'used one year instead of the full time' },
          monthsAsYears ? { value: (100 * A) / (100 + R * months), why: 'used the months as years' } : null
        ].filter(Boolean);
      }
      return [
        { value: BD, why: 'took interest on the amount (the banker\'s discount)' },
        { value: PW, why: 'gave the present worth instead of the discount' },
        { value: (PW * R) / 100, why: 'took one year of interest on the present worth' },
        monthsAsYears ? { value: (A * R * months) / (100 + R * months), why: 'used the months as years' } : null
      ].filter(Boolean);
    },
    // Independent check: the present worth, earning simple interest month by month, grows to A.
    verify: ({ A, R, months, askPW }, value) => {
      const PW = askPW ? value : A - value;
      return nearlyEqual(PW + interestByMonths(PW, R, months), A, 1e-6);
    },
    render({ R, months, RT, A, PW, askPW }) {
      const TD = A - PW;
      const time = timeText(months);
      return {
        question: askPW
          ? `What is the present worth of ₹${fmt(A)} due ${time.said} hence at ${R}% per annum simple interest?`
          : `Find the true discount on a bill of ₹${fmt(A)} due ${time.said} hence at ${R}% per annum simple interest.`,
        explanation: `${time.convert}RT = ${R} × ${time.years} = ${fmt(RT)}. PW = ${fmt(A)} × 100 ÷ ${fmt(100 + RT)} = ₹${fmt(PW)}, so TD = ${fmt(A)} − ${fmt(PW)} = ₹${fmt(TD)}. Check: ${fmt(RT)}% of ₹${fmt(PW)} is ₹${fmt(TD)}.`,
        solutionSteps: [
          time.convert ? `Convert the time: ${time.convert.trim()}` : `T = ${time.years} years.`,
          `RT = ${fmt(RT)}, so the amount is ${fmt(100 + RT)}% of the present worth.`,
          `PW = ${fmt(A)} × 100 ÷ ${fmt(100 + RT)} = ₹${fmt(PW)}.`,
          askPW ? `Check: TD = ₹${fmt(TD)} = ${fmt(RT)}% of ₹${fmt(PW)}.` : `TD = ${fmt(A)} − ${fmt(PW)} = ₹${fmt(TD)}.`
        ],
        method: 'PW = 100A ÷ (100 + RT); the true discount is the interest on PW.',
        hints: [
          time.convert ? `The rate is per year, so write ${months} months as ${time.years} year${months > 12 ? 's' : ''} first.` : `Which sum, lent today, grows to ₹${fmt(A)} in ${time.years} years?`,
          `RT = ${fmt(RT)}: divide ₹${fmt(A)} by ${fmt((100 + RT) / 100, 4)} to get the present worth.`
        ],
        commonMistakes: [
          `Taking ${fmt(RT)}% of ₹${fmt(A)}, which is interest on the amount (the banker's discount), not on the present worth.`
        ]
      };
    }
  },

  /* ===================== banker's discount and banker's gain ===================== */
  {
    id: 'si-adv-bankers-gain',
    version: 1,
    topicId: 'simple-interest',
    conceptId: 'si-adv-bankers-discount',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['si-adv-bd-f', 'si-adv-pw-f', 'si-adv-sc-gain-square'],
    estimatedSeconds: 120,
    params(rng) {
      const { R, months, RT } = pickTime(rng);
      const PW = pickPresentWorth(rng, RT);
      if (!PW) return null;
      const TD = (PW * RT) / 100;
      const A = PW + TD;
      const BD = (A * RT) / 100;
      if (!isInteger(TD) || !isInteger(BD)) return null;
      return { R, months, RT, PW, A };
    },
    answer: ({ A, RT }) => (A * RT) / 100 - (A * RT) / (100 + RT),
    formatValue: (value) => format.rupees(value),
    distractors: ({ A, R, RT }) => {
      const TD = (A * RT) / (100 + RT);
      const BD = (A * RT) / 100;
      return [
        { value: (BD * RT) / 100, why: 'took interest on the banker\'s discount instead of on the true discount' },
        { value: TD, why: 'gave the true discount' },
        { value: BD, why: 'gave the banker\'s discount' },
        { value: (TD * TD) / A, why: 'divided TD² by the face value instead of the present worth' },
        { value: (TD * R) / 100, why: 'took one year of interest on the true discount' }
      ];
    },
    // Independent check: the gain is the simple interest on TD, accumulated month by month,
    // where TD comes from the present worth that grows to the face value.
    verify: ({ A, R, months, PW }, value) => {
      if (!nearlyEqual(PW + interestByMonths(PW, R, months), A, 1e-6)) return false;
      return nearlyEqual(interestByMonths(A - PW, R, months), value, 1e-6);
    },
    render({ R, months, RT, PW, A }) {
      const TD = A - PW;
      const BD = (A * RT) / 100;
      const BG = BD - TD;
      const time = timeText(months);
      return {
        question: `A bill of ₹${fmt(A)} is due ${time.said} hence. At ${R}% per annum simple interest, what is the banker's gain?`,
        explanation: `${time.convert}RT = ${R} × ${time.years} = ${fmt(RT)}. BD = ${fmt(RT)}% of ₹${fmt(A)} = ₹${fmt(BD)}. PW = ${fmt(A)} × 100 ÷ ${fmt(100 + RT)} = ₹${fmt(PW)}, so TD = ₹${fmt(TD)}. BG = ${fmt(BD)} − ${fmt(TD)} = ₹${fmt(BG)}, which is ${fmt(RT)}% of the true discount.`,
        solutionSteps: [
          time.convert ? `Convert the time: ${time.convert.trim()} RT = ${fmt(RT)}.` : `RT = ${R} × ${time.years} = ${fmt(RT)}.`,
          `BD = ${fmt(A)} × ${fmt(RT)} ÷ 100 = ₹${fmt(BD)}.`,
          `TD = ${fmt(A)} × ${fmt(RT)} ÷ ${fmt(100 + RT)} = ₹${fmt(TD)}.`,
          `BG = ${fmt(BD)} − ${fmt(TD)} = ₹${fmt(BG)} (check: TD² ÷ PW = ${fmt(TD * TD)} ÷ ${fmt(PW)} = ₹${fmt(BG)}).`
        ],
        method: 'BG = BD − TD, which equals the interest on TD.',
        hints: [
          `Work out the banker's discount (interest on ₹${fmt(A)}) and the true discount (interest on the present worth) separately.`,
          `BD = ₹${fmt(BD)}. The present worth is ₹${fmt(A)} ÷ ${fmt((100 + RT) / 100, 4)}.`
        ],
        commonMistakes: [
          `Taking ${fmt(RT)}% of the banker's discount. The gain is the interest on the true discount.`,
          'Stopping at the banker\'s discount or the true discount.'
        ]
      };
    }
  },

  {
    id: 'si-adv-sum-due',
    version: 1,
    topicId: 'simple-interest',
    conceptId: 'si-adv-bankers-discount',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['si-adv-sc-sum-due', 'si-adv-bd-f'],
    estimatedSeconds: 120,
    params(rng) {
      const { R, months, RT } = pickTime(rng);
      const PW = pickPresentWorth(rng, RT);
      if (!PW) return null;
      const TD = (PW * RT) / 100;
      const A = PW + TD;
      const BD = (A * RT) / 100;
      if (!isInteger(TD) || !isInteger(BD)) return null;
      // Either BD and TD are given, or the gain with the rate and time.
      return { R, months, RT, TD, BD, fromGain: rng.chance(0.4) };
    },
    answer: ({ TD, BD }) => (BD * TD) / (BD - TD),
    formatValue: (value) => format.rupees(value),
    distractors: ({ TD, BD, R, RT, fromGain }) => {
      const BG = BD - TD;
      if (fromGain) {
        return [
          { value: (100 * BG) / RT, why: 'treated the gain as interest on the face value (gives TD)' },
          { value: BD, why: 'stopped at the banker\'s discount' },
          { value: (TD * TD) / BG, why: 'gave the present worth instead of the sum due' },
          { value: (100 * BG) / R, why: 'ignored the time when finding TD' }
        ];
      }
      return [
        { value: (TD * TD) / BG, why: 'gave the present worth (TD² ÷ BG)' },
        { value: (BD * BD) / BG, why: 'used BD² ÷ BG' },
        { value: BD + TD, why: 'added BD and TD' },
        { value: (BD * TD) / (BD + TD), why: 'divided by BD + TD instead of BD − TD' }
      ];
    },
    // Independent check: substitute the sum back — interest on it is BD, and the
    // present worth (sum − TD) grows to the sum over the same time.
    verify: ({ R, months, TD, BD }, value) =>
      nearlyEqual(interestByMonths(value, R, months), BD, 1e-6) &&
      nearlyEqual(value - TD + interestByMonths(value - TD, R, months), value, 1e-6),
    render({ R, months, RT, TD, BD, fromGain }) {
      const BG = BD - TD;
      const A = (BD * TD) / BG;
      const time = timeText(months);
      if (fromGain) {
        return {
          question: `The banker's gain on a bill due ${time.said} hence at ${R}% per annum simple interest is ₹${fmt(BG)}. What is the face value of the bill?`,
          explanation: `${time.convert}RT = ${fmt(RT)}. The gain is the interest on the true discount, so TD = ${fmt(BG)} × 100 ÷ ${fmt(RT)} = ₹${fmt(TD)} and BD = ${fmt(TD)} + ${fmt(BG)} = ₹${fmt(BD)}. Face value = BD × TD ÷ BG = ₹${fmt(A)}.`,
          solutionSteps: [
            `RT = ${R} × ${time.years} = ${fmt(RT)}.`,
            `TD = ${fmt(BG)} × 100 ÷ ${fmt(RT)} = ₹${fmt(TD)}.`,
            `BD = TD + BG = ₹${fmt(BD)}.`,
            `Face value = ${fmt(BD)} × ${fmt(TD)} ÷ ${fmt(BG)} = ₹${fmt(A)} (check: ${fmt(RT)}% of it is ₹${fmt(BD)}).`
          ],
          method: 'Gain → true discount → banker\'s discount → face value.',
          hints: [
            'The banker\'s gain is the simple interest on the true discount for the same time and rate.',
            `TD = ₹${fmt(TD)}. Now use Sum = BD × TD ÷ BG.`
          ],
          commonMistakes: [`Treating ₹${fmt(BG)} as interest on the face value, which gives only the true discount.`]
        };
      }
      return {
        question: `The banker's discount and the true discount on a sum due at a certain time are ₹${fmt(BD)} and ₹${fmt(TD)}. What is the sum?`,
        explanation: `BG = ${fmt(BD)} − ${fmt(TD)} = ₹${fmt(BG)}. Sum = BD × TD ÷ BG = ${fmt(BD)} × ${fmt(TD)} ÷ ${fmt(BG)} = ₹${fmt(A)}.`,
        solutionSteps: [
          `BG = BD − TD = ₹${fmt(BG)}.`,
          `Sum = (BD × TD) ÷ BG = ${fmt(BD * TD)} ÷ ${fmt(BG)} = ₹${fmt(A)}.`,
          `Check: BG is the interest on TD, so RT = ${fmt(BG)} × 100 ÷ ${fmt(TD)} = ${fmt(RT)}, and ${fmt(RT)}% of ₹${fmt(A)} = ₹${fmt(BD)} = BD.`
        ],
        method: 'Sum = BD × TD ÷ (BD − TD).',
        hints: ['The banker\'s gain is BD − TD.', `Sum = ${fmt(BD)} × ${fmt(TD)} ÷ ${fmt(BG)}.`],
        commonMistakes: [`Working out TD² ÷ BG = ₹${fmt((TD * TD) / BG)}, which is the present worth, not the sum due.`]
      };
    }
  }
];
