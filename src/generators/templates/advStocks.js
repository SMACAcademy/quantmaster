/**
 * Percentages advanced unit: stocks and shares (Phase E).
 *
 * Every amount is built from a whole number of ₹100 units of stock, so the
 * correct answer is clean by construction. Each wrong option is a named error
 * from the older SSC and bank papers: dividend paid on the market value,
 * premium read as discount, brokerage ignored or added on the wrong side.
 */

import { fmt, hasAtMostDecimals, isInteger, nearlyEqual } from '../core.js';

const NAMES = ['Ravi', 'Meena', 'Arjun', 'Priya', 'Kiran', 'Suresh', 'Lata', 'Imran', 'Deepa', 'Anil'];

const paiseFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹ in the Indian style: ₹1,20,000 for whole rupees, ₹95.50 when there are paise. */
const rs = (value) => `₹${isInteger(value) ? fmt(Math.round(value)) : paiseFormatter.format(value)}`;

/** "₹1" or "50 paise", as brokerage is quoted per ₹100 of stock. */
const brokerageText = (b) => (b < 1 ? `${fmt(b * 100)} paise` : `₹${fmt(b)}`);

/** How the market price of ₹100 of stock is quoted: as a price, or as a premium or discount. */
function quoteText(P, style) {
  if (style === 'price') return `at ₹${P}`;
  return P > 100 ? `at a premium of ₹${P - 100}` : `at a discount of ₹${100 - P}`;
}

/** Clean yields the papers use, and every (rate, price) pair that gives one. */
const CLEAN_YIELDS = [4, 5, 6, 6.25, 7.5, 8, 10, 12, 12.5, 15, 16, 20];
const RATES = [3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20];
const STOCKS = [];
for (const x of RATES) {
  for (const y of CLEAN_YIELDS) {
    const P = (100 * x) / y;
    if (Number.isInteger(P) && P >= 60 && P <= 160 && P !== 100) STOCKS.push({ x, P, y });
  }
}

/** Pairs of stocks [higher rate, lower rate], split by which one gives the better return. */
const PAIRS = { trap: [], equal: [], plain: [] };
for (const hi of STOCKS) {
  for (const lo of STOCKS) {
    if (hi.x <= lo.x) continue;
    const kind = hi.y < lo.y ? 'trap' : hi.y === lo.y ? 'equal' : 'plain';
    PAIRS[kind].push([hi, lo]);
  }
}

/** Keep only distractors that are clean whole-rupee (or 2-decimal) amounts. */
const cleanOnly = (list, decimals = 0) => list.filter(({ value }) => value !== null && hasAtMostDecimals(value, decimals));

function changeText(value) {
  if (nearlyEqual(value, 0)) return 'No change';
  return value > 0 ? `Rises by ${rs(value)}` : `Falls by ${rs(-value)}`;
}

export const advStocksTemplates = [
  /* ------------------------- stock, income and yield ------------------------- */
  {
    id: 'pct-adv-stock-income',
    version: 1,
    topicId: 'percentages',
    conceptId: 'pct-adv-stocks',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pct-adv-income-f', 'pct-adv-sc-units'],
    estimatedSeconds: 75,
    tags: ['advanced', 'stocks'],
    params(rng) {
      const x = rng.pick(RATES);
      const style = rng.pick(['premium', 'discount', 'price']);
      const d = style === 'discount' ? rng.pick([5, 10, 15, 20, 25, 30]) : rng.pick([5, 10, 15, 20, 25, 30, 40, 50]);
      const P = style === 'discount' || (style === 'price' && rng.chance(0.4)) ? 100 - d : 100 + d;
      const n = rng.int(1, 40) * 20;
      return { name: rng.pick(NAMES), x, P, style, n, I: n * P };
    },
    answer: ({ I, P, x }) => (I / P) * x,
    formatValue: (value) => rs(value),
    distractors: ({ I, P, x, n }) =>
      cleanOnly([
        { value: (I * x) / 100, why: 'paid the dividend on the money invested (market value) instead of the face value' },
        { value: (I * x) / (200 - P), why: 'read a premium as a discount, or the reverse' },
        { value: (I * x) / Math.abs(P - 100), why: 'used the premium or discount alone as the price' },
        { value: (I * x * P) / 10000, why: 'multiplied by the market price instead of dividing by it' },
        { value: n * 100, why: 'gave the face value of the stock bought, not the income' }
      ]),
    // Work backwards: the income fixes the face value held, and that much stock at P must cost I.
    verify: ({ I, P, x }, value) => {
      const faceValue = (value / x) * 100;
      return nearlyEqual((faceValue / 100) * P, I);
    },
    render({ name, x, P, style, n, I }, { fmt: show }) {
      const income = n * x;
      const kind = P > 100 ? `a premium of ₹${P - 100}` : `a discount of ₹${100 - P}`;
      return {
        question: `${name} invests ${rs(I)} in ${x}% stock ${quoteText(P, style)} (face value ₹100). What is the annual income from it?`,
        explanation: `Each ₹100 of stock costs ₹${P} (${kind}). ${rs(I)} ÷ ${P} = ${fmt(n)} units, which is ${rs(n * 100)} of stock. The ${x}% dividend is paid on that face value: ${fmt(n)} × ₹${x} = ${show(income)}.`,
        solutionSteps: [
          `Market price of ₹100 stock = ₹${P}.`,
          `Units bought = ${rs(I)} ÷ ${P} = ${fmt(n)}, so face value = ${rs(n * 100)}.`,
          `Income = ${fmt(n)} × ₹${x} = ${show(income)}.`
        ],
        method: 'Count the ₹100 units bought, then pay the dividend on each unit.',
        hints: [
          `"${x}% stock" pays ₹${x} a year on every ₹100 of face value, whatever the price.`,
          `Find the market price of ₹100 stock first: ₹${P}.`,
          `How many units of ₹${P} does ${rs(I)} buy?`
        ],
        commonMistakes: [
          `Taking ${x}% of the ${rs(I)} invested: the dividend is paid on the face value, not on the money paid.`,
          'Treating a premium as a discount (or the reverse) when working out the price.'
        ]
      };
    }
  },

  {
    id: 'pct-adv-stock-yield',
    version: 1,
    topicId: 'percentages',
    conceptId: 'pct-adv-stocks',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pct-adv-yield-f'],
    answerDecimals: 2,
    estimatedSeconds: 60,
    tags: ['advanced', 'stocks'],
    params(rng) {
      const { x, P, y } = rng.pick(STOCKS);
      const ask = rng.chance(0.6) ? 'yield' : 'price';
      return { x, P, y, ask, style: rng.pick(['quote', 'price']) };
    },
    answer: ({ ask, y, P }) => (ask === 'yield' ? y : P),
    formatValue: (value, { ask }) => (ask === 'yield' ? `${fmt(value)}%` : rs(value)),
    distractors: ({ ask, x, P, y, style }) =>
      ask === 'yield'
        ? cleanOnly(
            [
              { value: x, why: "quoted the stock's own rate, which is paid on the face value" },
              { value: style === 'quote' ? (100 * x) / (200 - P) : null, why: 'read a premium as a discount, or the reverse' },
              { value: (x * P) / 100, why: 'multiplied by the price instead of dividing by it' },
              { value: (x * (200 - P)) / 100, why: 'cut (or raised) the rate by the premium (or discount) as a percentage' },
              { value: P / x, why: 'divided the price by the dividend' }
            ],
            2
          )
        : cleanOnly(
            [
              { value: 200 - P, why: 'mixed up premium and discount' },
              { value: Math.abs(P - 100), why: 'gave only the premium or discount, not the price' },
              { value: (100 * y) / x, why: 'inverted the ratio of the two rates' },
              { value: 100 + x - y, why: 'took the gap between the rates as the premium in rupees' }
            ],
            2
          ),
    // The return on one ₹P purchase must be exactly the ₹x dividend.
    verify: ({ ask, x, P, y }, value) =>
      ask === 'yield' ? nearlyEqual((value * P) / 100, x) : nearlyEqual((x / value) * 100, y),
    render({ x, P, y, ask, style }, { fmt: show }) {
      const side = P > 100 ? `a premium, so the return is below ${x}%` : `a discount, so the return is above ${x}%`;
      if (ask === 'yield') {
        return {
          question: `What rate of return does an investor get by buying ${x}% stock ${quoteText(P, style)} (face value ₹100)?`,
          explanation: `Each ₹${P} paid buys ₹100 of stock, which pays ₹${x} a year. Return = ${x} ÷ ${P} × 100 = ${show(y)}. The stock is at ${side}.`,
          solutionSteps: [`Price paid for ₹100 stock = ₹${P}.`, `Yearly dividend on it = ₹${x}.`, `Return = ${x} ÷ ${P} × 100 = ${show(y)}.`],
          method: 'Return = dividend ÷ price paid × 100.',
          hints: [
            `The ${x}% is paid on the face value of ₹100, not on what you pay.`,
            `Market price of ₹100 stock = ₹${P}.`,
            `Work out ${x} ÷ ${P} × 100.`
          ],
          commonMistakes: [`Answering ${x}%: that is the return only when the stock is at par.`]
        };
      }
      return {
        question: `At what market price must ${x}% stock (face value ₹100) be bought to give a return of ${fmt(y)}%?`,
        explanation: `₹${x} a year must be ${fmt(y)}% of the price, so price = ${x} × 100 ÷ ${fmt(y)} = ${show(P)}. That is ${P > 100 ? `a premium of ₹${P - 100}` : `a discount of ₹${100 - P}`}.`,
        solutionSteps: [`Dividend per ₹100 stock = ₹${x}.`, `${fmt(y)}% of price = ₹${x}.`, `Price = ${x} × 100 ÷ ${fmt(y)} = ${show(P)}.`],
        method: 'Price = dividend × 100 ÷ required return.',
        hints: [
          `The return is the ₹${x} dividend as a percentage of the price paid.`,
          `Solve ${fmt(y)}% of price = ₹${x}.`
        ],
        commonMistakes: [`Inverting the rates: ${fmt(y)} × 100 ÷ ${x} is not the price.`]
      };
    }
  },

  /* ------------------- comparing investments and brokerage ------------------- */
  {
    id: 'pct-adv-better-stock',
    version: 1,
    topicId: 'percentages',
    conceptId: 'pct-adv-invest',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['pct-adv-yield-f', 'pct-adv-sc-compare'],
    estimatedSeconds: 60,
    tags: ['advanced', 'stocks'],
    params(rng) {
      // Mostly the trap: the higher printed rate gives the lower return.
      const roll = rng.next();
      const pool = roll < 0.6 ? PAIRS.trap : roll < 0.75 ? PAIRS.equal : PAIRS.plain;
      const [hi, lo] = rng.pick(pool);
      const pair = rng.chance(0.5) ? [hi, lo] : [lo, hi];
      return { x1: pair[0].x, P1: pair[0].P, x2: pair[1].x, P2: pair[1].P };
    },
    answer: ({ x1, P1, x2, P2 }) => {
      const y1 = x1 / P1;
      const y2 = x2 / P2;
      if (nearlyEqual(y1, y2)) return 'Both give the same return';
      return y1 > y2 ? `${x1}% stock at ₹${P1}` : `${x2}% stock at ₹${P2}`;
    },
    formatValue: (value) => value,
    distractors: ({ x1, P1, x2, P2 }) => {
      const higherRate = x1 > x2 ? `${x1}% stock at ₹${P1}` : `${x2}% stock at ₹${P2}`;
      const cheaper = P1 < P2 ? `${x1}% stock at ₹${P1}` : `${x2}% stock at ₹${P2}`;
      return [
        { value: higherRate, why: 'picked the higher printed rate, ignoring the price' },
        { value: cheaper, why: 'picked the cheaper stock, ignoring the rate' },
        { value: `${x1}% stock at ₹${P1}`, why: 'compared the wrong pair of numbers' },
        { value: `${x2}% stock at ₹${P2}`, why: 'compared the wrong pair of numbers' },
        { value: 'Both give the same return', why: 'assumed the premium cancels the higher rate' },
        { value: 'It depends on the amount invested', why: 'thought the amount matters; the return per rupee does not depend on it' }
      ];
    },
    // Cross-multiply instead of dividing: x1 × P2 against x2 × P1.
    verify: ({ x1, P1, x2, P2 }, value) => {
      const diff = x1 * P2 - x2 * P1;
      const expected = diff === 0 ? 'Both give the same return' : diff > 0 ? `${x1}% stock at ₹${P1}` : `${x2}% stock at ₹${P2}`;
      return expected === value;
    },
    render({ x1, P1, x2, P2 }) {
      const y1 = (100 * x1) / P1;
      const y2 = (100 * x2) / P2;
      const left = x1 * P2;
      const right = x2 * P1;
      const verdict =
        left === right
          ? 'The returns are equal.'
          : `${left > right ? `${x1}% stock at ₹${P1}` : `${x2}% stock at ₹${P2}`} gives more on every rupee invested.`;
      return {
        question: `Which is the better investment: ${x1}% stock at ₹${P1} or ${x2}% stock at ₹${P2}? (Face value ₹100 in both.)`,
        explanation: `Compare the return on the price paid, not the printed rates. ${x1} ÷ ${P1} × 100 = ${fmt(y1)}% and ${x2} ÷ ${P2} × 100 = ${fmt(y2)}%. ${verdict}`,
        solutionSteps: [
          `Return on the first = ${x1} ÷ ${P1} × 100 = ${fmt(y1)}%.`,
          `Return on the second = ${x2} ÷ ${P2} × 100 = ${fmt(y2)}%.`,
          `Check by cross-multiplying: ${x1} × ${P2} = ${fmt(left)} and ${x2} × ${P1} = ${fmt(right)}.`
        ],
        method: 'Compare dividend ÷ price for each stock, or cross-multiply.',
        hints: [
          'The better stock earns more per rupee invested, so compare dividend ÷ price.',
          `Cross-multiply: compare ${x1} × ${P2} with ${x2} × ${P1}.`
        ],
        commonMistakes: ['Choosing the stock with the higher printed rate: a high price can more than cancel it.']
      };
    }
  },

  {
    id: 'pct-adv-brokerage',
    version: 1,
    topicId: 'percentages',
    conceptId: 'pct-adv-invest',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['pct-adv-brokerage-f', 'pct-adv-income-f'],
    answerDecimals: 2,
    estimatedSeconds: 90,
    tags: ['advanced', 'stocks', 'brokerage'],
    params(rng) {
      const x = rng.pick(RATES);
      const P = rng.int(70, 150);
      const b = rng.pick([0.5, 1, 1, 2]);
      if (Math.abs(P - 100) <= 2) return null;
      const n = rng.int(2, 60) * 10;
      return { name: rng.pick(NAMES), x, P, b, n, mode: rng.chance(0.55) ? 'buy' : 'sell' };
    },
    answer: ({ mode, n, P, b }) => (mode === 'buy' ? n * (P + b) : n * (P - b)),
    formatValue: (value) => rs(value),
    distractors: ({ mode, n, P, b }) =>
      cleanOnly(
        mode === 'buy'
          ? [
              { value: n * P, why: 'ignored the brokerage' },
              { value: n * (P - b), why: 'subtracted the brokerage, as when selling' },
              { value: n * 100, why: 'gave the face value of the stock needed' },
              { value: n * P + b, why: 'charged the brokerage once instead of on every ₹100 of stock' }
            ]
          : [
              { value: n * (P + b), why: 'added the brokerage, as when buying' },
              { value: n * P, why: 'ignored the brokerage' },
              { value: n * 100, why: 'took the face value as the sale money' },
              { value: n * P - b, why: 'charged the brokerage once instead of on every ₹100 of stock' }
            ],
        2
      ),
    // Undo the deal unit by unit: the money per unit must equal the price shifted by the brokerage.
    verify: ({ mode, n, x, P, b }, value) => {
      const perUnit = value / n;
      if (mode === 'buy') return nearlyEqual(perUnit - b, P) && nearlyEqual((value / (P + b)) * x, n * x);
      return nearlyEqual(perUnit + b, P);
    },
    render({ name, mode, n, x, P, b }, { fmt: show }) {
      const fee = brokerageText(b);
      if (mode === 'buy') {
        const income = n * x;
        return {
          question: `How much must ${name} invest in ${x}% stock at ₹${P} to get an annual income of ${rs(income)}, if brokerage is ${fee} per ₹100 of stock?`,
          explanation: `Each ₹100 of stock pays ₹${x}, so ${rs(income)} needs ${rs(income)} ÷ ${x} = ${fmt(n)} units. Buying, the brokerage is added: each unit costs ${rs(P)} + ${rs(b)} = ${rs(P + b)}. Investment = ${fmt(n)} × ${rs(P + b)} = ${show(n * (P + b))}.`,
          solutionSteps: [
            `Units needed = ${rs(income)} ÷ ${x} = ${fmt(n)}.`,
            `Cost per unit when buying = ${rs(P)} + ${rs(b)} = ${rs(P + b)}.`,
            `Investment = ${fmt(n)} × ${rs(P + b)} = ${show(n * (P + b))}.`
          ],
          method: 'Units from the income, then cost per unit = price + brokerage.',
          hints: [
            `First find how many ₹100 units pay ${rs(income)} a year.`,
            'Brokerage is added to the price when you buy.',
            `Multiply the units by ${rs(P + b)}.`
          ],
          commonMistakes: ['Forgetting the brokerage, or subtracting it as if selling.']
        };
      }
      return {
        question: `${name} sells ${rs(n * 100)} (face value) of ${x}% stock at ₹${P}. Brokerage is ${fee} per ₹100 of stock. How much money does ${name} receive?`,
        explanation: `${rs(n * 100)} of stock is ${fmt(n)} units of ₹100. When selling, the brokerage is taken off the price: ${rs(P)} − ${rs(b)} = ${rs(P - b)} per unit. Money received = ${fmt(n)} × ${rs(P - b)} = ${show(n * (P - b))}.`,
        solutionSteps: [
          `Units = ${rs(n * 100)} ÷ 100 = ${fmt(n)}.`,
          `Money per unit when selling = ${rs(P)} − ${rs(b)} = ${rs(P - b)}.`,
          `Received = ${fmt(n)} × ${rs(P - b)} = ${show(n * (P - b))}.`
        ],
        method: 'Units of stock × (price − brokerage).',
        hints: [
          `${rs(n * 100)} is the face value: count the ₹100 units first.`,
          'Brokerage is subtracted from the price when you sell.',
          `Multiply the units by ${rs(P - b)}.`
        ],
        commonMistakes: ['Adding the brokerage on a sale. The broker is paid out of the sale money, so you receive less.']
      };
    }
  },

  {
    id: 'pct-adv-switch-stock',
    version: 1,
    topicId: 'percentages',
    conceptId: 'pct-adv-invest',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['pct-adv-brokerage-f', 'pct-adv-income-f', 'pct-adv-sc-units'],
    estimatedSeconds: 120,
    tags: ['advanced', 'stocks', 'brokerage'],
    params(rng) {
      const n1 = rng.int(2, 30) * 10;
      const x1 = rng.pick(RATES);
      const x2 = rng.pick(RATES);
      const b = rng.pick([0, 1, 1, 2]);
      const P1 = rng.int(75, 150);
      const proceeds = n1 * (P1 - b);
      // The new stock's buying cost per unit must divide the proceeds exactly.
      const costs = [];
      for (let q = 72; q <= 160; q++) if (proceeds % q === 0 && q - b !== P1) costs.push(q);
      if (!costs.length) return null;
      const q = rng.pick(costs);
      const n2 = proceeds / q;
      if (n2 === n1) return null;
      return { name: rng.pick(NAMES), n1, x1, P1, x2, P2: q - b, b, n2 };
    },
    answer: ({ n1, x1, n2, x2 }) => changeText(n2 * x2 - n1 * x1),
    formatValue: (value) => value,
    distractors: ({ n1, x1, P1, x2, P2, b, n2 }) => {
      const delta = n2 * x2 - n1 * x1;
      const list = [];
      if (delta !== 0) list.push({ value: changeText(-delta), why: 'subtracted the incomes the wrong way round' });
      if (x1 !== x2) list.push({ value: changeText(n1 * (x2 - x1)), why: 'kept the same face value of stock, as if the number of units did not change' });
      const ignored = ((n1 * P1) / P2) * x2 - n1 * x1;
      if (b > 0 && isInteger(ignored)) list.push({ value: changeText(ignored), why: 'ignored the brokerage' });
      const swapped = ((n1 * (P1 + b)) / (P2 - b)) * x2 - n1 * x1;
      if (b > 0 && isInteger(swapped)) list.push({ value: changeText(swapped), why: 'added brokerage on the sale and subtracted it on the purchase' });
      const onMoney = (n1 * (P1 - b) * (x2 - x1)) / 100;
      if (isInteger(onMoney)) list.push({ value: changeText(onMoney), why: 'paid both dividends on the sale money instead of the face values' });
      list.push({ value: changeText(n2 * x2), why: 'gave the new income instead of the change' });
      list.push({ value: changeText(n2 * x2 + n1 * x1), why: 'added the two incomes' });
      if (delta !== 0) list.push({ value: 'No change', why: 'assumed the same money gives the same income' });
      return list;
    },
    // Independent route: face values in rupees, dividends as percentages of them.
    verify: ({ n1, x1, P1, x2, P2, b }, value) => {
      const oldFace = n1 * 100;
      const money = (oldFace / 100) * (P1 - b);
      const newFace = (money / (P2 + b)) * 100;
      return changeText((newFace * x2) / 100 - (oldFace * x1) / 100) === value;
    },
    render({ name, n1, x1, P1, x2, P2, b, n2 }) {
      const oldIncome = n1 * x1;
      const newIncome = n2 * x2;
      const proceeds = n1 * (P1 - b);
      const fee = b ? ` Brokerage is ${brokerageText(b)} per ₹100 of stock on each deal.` : '';
      const sale = b ? `${rs(P1)} − ${rs(b)} = ${rs(P1 - b)}` : rs(P1);
      const buy = b ? `${rs(P2)} + ${rs(b)} = ${rs(P2 + b)}` : rs(P2);
      return {
        question: `${name} holds ${rs(n1 * 100)} (face value) of ${x1}% stock. ${name} sells it at ₹${P1} and invests all the money in ${x2}% stock at ₹${P2}.${fee} What happens to ${name}'s annual income?`,
        explanation: `Old income = ${fmt(n1)} units × ₹${x1} = ${rs(oldIncome)}. Selling at ${sale} per unit gives ${fmt(n1)} × ${rs(P1 - b)} = ${rs(proceeds)}. Buying at ${buy} per unit gives ${rs(proceeds)} ÷ ${P2 + b} = ${fmt(n2)} units, so new income = ${fmt(n2)} × ₹${x2} = ${rs(newIncome)}. ${changeText(newIncome - oldIncome)}.`,
        solutionSteps: [
          `Old: ${fmt(n1)} units × ₹${x1} = ${rs(oldIncome)} a year.`,
          `Sale money = ${fmt(n1)} × ${rs(P1 - b)} = ${rs(proceeds)}.`,
          `New units = ${rs(proceeds)} ÷ ${P2 + b} = ${fmt(n2)}; new income = ${rs(newIncome)}.`,
          `Change = ${rs(newIncome)} − ${rs(oldIncome)}: ${changeText(newIncome - oldIncome).toLowerCase()}.`
        ],
        method: 'Old income, sale money, new units, new income: compare.',
        hints: [
          `Count the old stock in ₹100 units: ${fmt(n1)}.`,
          b ? 'Brokerage comes off the sale price and goes on the purchase price.' : 'All the sale money buys the new stock.',
          'Compare the new income with the old one.'
        ],
        commonMistakes: [
          'Paying the dividends on the money invested instead of on the face value.',
          b ? 'Ignoring the brokerage on one of the two deals.' : 'Giving the new income instead of the change.'
        ]
      };
    }
  }
];
