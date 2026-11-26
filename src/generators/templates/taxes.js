/**
 * Taxes, GST and commission: GST added to or taken out of a price, CGST and
 * SGST against IGST, GST through a supply chain with input tax credit,
 * discount and tax together, sales tax changes, income tax on example slabs
 * (with a deduction, a rebate and cess), flat, tiered and target commission,
 * property tax and customs duty.
 *
 * Every slab table and every duty rate is an example stated in the question,
 * never a claim about the current law. Amounts are built from round numbers so
 * the answers are clean by construction. Each answer is checked a second way:
 * by working backwards (taking the tax out of the price found), by charging
 * the tax in the other order, by adding up each trader's output tax less its
 * credit, or by walking the income or sales ₹1,000 at a time through the
 * bands (utils/taxes.js holds the forward formulas).
 */

import { fmt, format, nearlyEqual } from '../core.js';
import {
  afterDiscountAndTax,
  baseFromInclusive,
  customs,
  incomeTax,
  percentOf,
  propertyTax,
  rupees,
  salesForCommission,
  slabRows,
  slabTax,
  splitGst,
  supplyChain,
  taxInInclusive,
  tieredCommission,
  withTax
} from '../../utils/taxes.js';

const GST_RATES = [5, 12, 18, 28];
/** The top of the last, open-ended band: finite, so a question's parameters stay plain JSON. */
const OPEN = 1e12;
const NAMES = ['Ravi', 'Meena', 'Arjun', 'Priya', 'Kiran', 'Suresh', 'Lata', 'Imran', 'Deepa', 'Anil', 'Farhan', 'Kavya'];
const ITEMS = ['a mixer grinder', 'a ceiling fan', 'a study table', 'a pressure cooker', 'a water purifier', 'a pair of running shoes', 'a school bag', 'a microwave oven', 'an office chair', 'a smartwatch'];
const GOODS = ['cotton sarees', 'school bags', 'LED bulbs', 'steel utensils', 'bath towels', 'notebooks', 'ceiling fans', 'leather belts'];
const CITIES = [
  ['Chennai', 'Tamil Nadu'],
  ['Coimbatore', 'Tamil Nadu'],
  ['Madurai', 'Tamil Nadu'],
  ['Pune', 'Maharashtra'],
  ['Nagpur', 'Maharashtra'],
  ['Bengaluru', 'Karnataka'],
  ['Mysuru', 'Karnataka'],
  ['Kochi', 'Kerala'],
  ['Kozhikode', 'Kerala'],
  ['Jaipur', 'Rajasthan'],
  ['Jodhpur', 'Rajasthan'],
  ['Lucknow', 'Uttar Pradesh'],
  ['Varanasi', 'Uttar Pradesh'],
  ['Ahmedabad', 'Gujarat'],
  ['Surat', 'Gujarat'],
  ['Indore', 'Madhya Pradesh'],
  ['Bhopal', 'Madhya Pradesh'],
  ['Kolkata', 'West Bengal'],
  ['Patna', 'Bihar']
];

const money = format.rupees;
const pct = (value) => `${fmt(value)}%`;
/** Every ₹ amount written in a piece of text, as numbers. */
const amountsIn = (text) => [...String(text).matchAll(/₹([\d,]+(?:\.\d+)?)/g)].map((m) => Number(m[1].replace(/,/g, '')));

/** The rate of the band that a rupee at `x` falls in (an independent reading of a band table). */
const rateAt = (bands, x) => bands.find((band) => x <= band.upTo).rate;
/** Tax on `amount` by walking it ₹1,000 at a time through the bands (every band edge is a multiple of ₹1,000). */
const walkTax = (amount, bands) => {
  let tax = 0;
  for (let x = 0; x < amount; x += 1000) tax += (Math.min(1000, amount - x) * rateAt(bands, x + 1)) / 100;
  return tax;
};

const slabTable = (slabs) => ({
  caption: 'Example income tax slabs, for this question only (not the current law)',
  headers: ['Taxable income', 'Rate'],
  rows: slabRows(slabs)
});

/** Example slabs: nil up to a limit, then rising rates in equal bands. */
function exampleSlabs(rng) {
  const first = rng.pick([250000, 300000, 400000]);
  const width = rng.pick([200000, 300000, 400000]);
  const rates = rng.pick([
    [5, 10, 15, 20],
    [5, 10, 20, 30],
    [5, 15, 20, 25],
    [5, 10, 15, 30]
  ]);
  return [
    { upTo: first, rate: 0 },
    { upTo: first + width, rate: rates[0] },
    { upTo: first + 2 * width, rate: rates[1] },
    { upTo: first + 3 * width, rate: rates[2] },
    { upTo: OPEN, rate: rates[3] }
  ];
}

const slabWorking = (amount, slabs) =>
  slabTax(amount, slabs)
    .parts.filter((part) => part.rate > 0)
    .map((part) => `${part.rate}% of ${money(part.amount)} = ${money(part.tax)}`);

/** Two cities, in one state or in two. */
function pickPlaces(rng, interState) {
  const seller = rng.pick(CITIES);
  const pool = CITIES.filter((c) => (interState ? c[1] !== seller[1] : c[1] === seller[1]));
  return { seller, buyer: rng.pick(pool) };
}

const splitText = (tax, interState) => {
  const s = splitGst(tax, interState);
  return interState ? `IGST ${rupees(s.igst)}` : `CGST ${rupees(s.cgst)} + SGST ${rupees(s.sgst)}`;
};

export const taxTemplates = [
  /* ============================ GST on a price ============================ */
  {
    id: 'tx-add-gst',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-gst-price',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tx-add-f'],
    answerDecimals: 2,
    estimatedSeconds: 35,
    formatValue: (value) => money(value),
    params(rng) {
      return { rate: rng.pick(GST_RATES), base: rng.int(6, 160) * 50, item: rng.pick(ITEMS), name: rng.pick(NAMES) };
    },
    answer: ({ base, rate }) => withTax(base, rate),
    distractors: ({ base, rate }) => [
      { value: percentOf(base, rate), why: 'gave the GST alone' },
      { value: base - percentOf(base, rate), why: 'took the GST off instead of adding it' },
      { value: Math.round(baseFromInclusive(base, rate) * 100) / 100, why: 'treated the price as tax-inclusive' },
      { value: base + rate, why: 'added the rate as rupees' }
    ],
    // Working backwards: take the GST out of the price found and the base must be left.
    verify: ({ base, rate }, value) => nearlyEqual((value * 100) / (100 + rate), base),
    render({ base, rate, item, name }) {
      const tax = percentOf(base, rate);
      return {
        question: `${name} buys ${item} priced at ${money(base)} before GST. GST is charged at ${rate}%. How much does ${name} pay?`,
        explanation: `GST = ${rate}% of ${money(base)} = ${money(tax)}. The buyer pays the price plus GST: ${money(base)} + ${money(tax)} = ${money(base + tax)}, the same as ${money(base)} × ${fmt(1 + rate / 100, 2)}.`,
        solutionSteps: [`GST = ${money(base)} × ${rate}/100 = ${money(tax)}.`, `Price paid = ${money(base)} + ${money(tax)} = ${money(base + tax)}.`],
        method: 'Price with GST = base × (1 + r/100).',
        hints: [`The ${rate}% is charged on the price before tax, ${money(base)}.`, `Find ${rate}% of ${money(base)} and add it on.`],
        commonMistakes: ['Giving only the GST, not the price paid.', 'Dividing by 1 + r/100, which takes GST out instead of adding it.']
      };
    }
  },

  {
    id: 'tx-take-out-gst',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-gst-price',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['tx-incl-f', 'tx-sc-incl'],
    unit: '₹',
    estimatedSeconds: 45,
    params(rng) {
      const rate = rng.pick(GST_RATES);
      const base = rng.int(5, 150) * 100;
      return { rate, inclusive: withTax(base, rate), ask: rng.pick(['base', 'tax']), item: rng.pick(ITEMS) };
    },
    answer: ({ inclusive, rate, ask }) => Math.round((ask === 'base' ? baseFromInclusive(inclusive, rate) : taxInInclusive(inclusive, rate)) * 1e6) / 1e6,
    // The base must grow back to the bill; or the GST must be r% of what is left when it is removed.
    verify: ({ inclusive, rate, ask }, value) =>
      ask === 'base' ? nearlyEqual(value + percentOf(value, rate), inclusive) : nearlyEqual(percentOf(inclusive - value, rate), value),
    render({ inclusive, rate, ask, item }) {
      const base = baseFromInclusive(inclusive, rate);
      const tax = inclusive - base;
      return {
        question:
          ask === 'base'
            ? `The bill for ${item} shows ${money(inclusive)}, including GST at ${rate}%. What was the price before GST?`
            : `The bill for ${item} shows ${money(inclusive)}, including GST at ${rate}%. How much of that is GST?`,
        explanation: `An inclusive price is ${100 + rate}% of the price before GST. Price before GST = ${money(inclusive)} × 100/${100 + rate} = ${money(base)}, so the GST is ${money(inclusive)} − ${money(base)} = ${money(tax)} (that is ${rate}/${100 + rate} of the bill).`,
        solutionSteps: [`${money(inclusive)} = ${100 + rate}% of the price before GST.`, `Price before GST = ${money(inclusive)} × 100 ÷ ${100 + rate} = ${money(base)}.`, `GST = ${money(inclusive)} − ${money(base)} = ${money(tax)}.`],
        method: 'Base = inclusive × 100/(100 + r); GST = inclusive × r/(100 + r).',
        hints: [`${money(inclusive)} is not the base: it already includes the ${rate}%.`, `Divide by ${fmt(1 + rate / 100, 2)}, or take ${rate}/${100 + rate} of the bill for the GST.`],
        commonMistakes: [`Taking ${rate}% of the inclusive price: ${money(percentOf(inclusive, rate))}.`, `Subtracting ${rate}% of the bill to find the base.`]
      };
    }
  },

  /* ============================ CGST, SGST, IGST ============================ */
  {
    id: 'tx-split-bill',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-gst-split',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tx-split-f'],
    estimatedSeconds: 40,
    formatValue: (value) => value,
    params(rng) {
      const interState = rng.chance(0.5);
      return { interState, ...pickPlaces(rng, interState), rate: rng.pick(GST_RATES), base: rng.int(4, 120) * 100, item: rng.pick(ITEMS) };
    },
    answer: ({ base, rate, interState }) => splitText(percentOf(base, rate), interState),
    distractors: ({ base, rate, interState }) => {
      const tax = percentOf(base, rate);
      return [
        { value: splitText(tax, !interState), why: 'used the wrong kind of GST for where the goods go' },
        { value: `CGST ${rupees(tax)} + SGST ${rupees(tax)}`, why: 'charged the full rate twice' },
        { value: interState ? `IGST ${rupees(tax / 2)}` : `CGST ${rupees(tax / 4)} + SGST ${rupees(tax / 4)}`, why: 'halved once too often' },
        { value: `IGST ${rupees(2 * tax)}`, why: 'added CGST and SGST rates as if each were the full rate' }
      ];
    },
    verify: ({ base, rate, seller, buyer }, text) => {
      const tax = base * (1 + rate / 100) - base;
      const amounts = amountsIn(text);
      const crossesStates = seller[1] !== buyer[1];
      const total = amounts.reduce((s, a) => s + a, 0);
      return text.startsWith('IGST') === crossesStates && amounts.length === (crossesStates ? 1 : 2) && amounts.every((a) => nearlyEqual(a, amounts[0])) && nearlyEqual(total, tax);
    },
    render({ seller, buyer, rate, base, item }) {
      const tax = percentOf(base, rate);
      const same = seller[1] === buyer[1];
      const where = seller[0] === buyer[0] ? `a customer in ${buyer[0]}` : `a customer in ${buyer[0]} (${buyer[1]})`;
      return {
        question: `A shop in ${seller[0]} (${seller[1]}) sells ${item} for ${money(base)} plus GST at ${rate}% to ${where}. How is the tax shown on the bill?`,
        explanation: same
          ? `Both are in ${seller[1]}, so this is a sale within a state: the ${rate}% GST (${money(tax)}) is split equally into CGST ${rupees(tax / 2)} (${pct(rate / 2)}) and SGST ${rupees(tax / 2)} (${pct(rate / 2)}).`
          : `The goods go from ${seller[1]} to ${buyer[1]}, so this is a sale between states: the whole ${rate}% is charged as IGST, ${money(tax)}.`,
        solutionSteps: [`GST = ${rate}% of ${money(base)} = ${money(tax)}.`, same ? `Same state: split equally, ${pct(rate / 2)} CGST and ${pct(rate / 2)} SGST.` : 'Different states: all of it is IGST.', same ? `CGST ${rupees(tax / 2)} + SGST ${rupees(tax / 2)}.` : `IGST ${money(tax)}.`],
        method: 'Within a state: CGST + SGST, half each. Between states: IGST, the full rate.',
        hints: ['Are the seller and the buyer in the same state?', `Either way the total tax is ${rate}% of ${money(base)}.`],
        commonMistakes: ['Charging CGST and SGST each at the full rate.', 'Using IGST for a sale inside one state.']
      };
    }
  },

  {
    id: 'tx-rate-from-bill',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-gst-split',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['tx-split-f'],
    unit: '%',
    estimatedSeconds: 40,
    params(rng) {
      const interState = rng.chance(0.4);
      return { interState, ...pickPlaces(rng, interState), rate: rng.pick(GST_RATES), base: rng.int(4, 90) * 100, item: rng.pick(ITEMS) };
    },
    answer: ({ base, rate, interState }) => {
      const shown = interState ? splitGst(percentOf(base, rate), true).igst : splitGst(percentOf(base, rate), false).cgst;
      return ((interState ? shown : 2 * shown) * 100) / base;
    },
    // Charge the rate found on the price: the bill's line must come out.
    verify: ({ base, rate, interState }, value) => {
      const line = interState ? (base * rate) / 100 : (base * rate) / 200;
      const again = splitGst(percentOf(base, value), interState);
      return nearlyEqual(interState ? again.igst : again.sgst, line);
    },
    render({ base, rate, interState, seller, buyer, item }) {
      const tax = percentOf(base, rate);
      const line = interState ? tax : tax / 2;
      return {
        question: interState
          ? `A firm in ${seller[0]} (${seller[1]}) sells ${item} worth ${money(base)} to a firm in ${buyer[0]} (${buyer[1]}). The bill shows IGST of ${money(line)}. What is the GST rate?`
          : `A shop in ${seller[0]} sells ${item} for ${money(base)} to a customer in ${buyer[0]}, in the same state. The bill shows CGST of ${money(line)}. What is the total GST rate?`,
        explanation: interState
          ? `IGST is the whole GST: ${money(line)} ÷ ${money(base)} × 100 = ${rate}%.`
          : `CGST is half the GST; SGST is the same again. Total GST = 2 × ${money(line)} = ${money(tax)}, and ${money(tax)} ÷ ${money(base)} × 100 = ${rate}%.`,
        solutionSteps: interState
          ? [`IGST = full GST = ${money(line)}.`, `Rate = ${money(line)} ÷ ${money(base)} × 100 = ${rate}%.`]
          : [`SGST = CGST = ${money(line)}.`, `Total GST = ${money(tax)}.`, `Rate = ${money(tax)} ÷ ${money(base)} × 100 = ${rate}%.`],
        method: interState ? 'IGST carries the full rate.' : 'CGST + SGST = total GST; each is half.',
        hints: [interState ? 'Is IGST part of the tax, or all of it?' : 'CGST is only one half of the GST.', 'Rate = tax ÷ price before tax × 100.'],
        commonMistakes: interState ? ['Halving IGST as if it were CGST.'] : [`Answering ${pct(rate / 2)}, the CGST rate alone.`]
      };
    }
  },

  /* ======================= supply chain and input credit ======================= */
  {
    id: 'tx-chain-net',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-input-credit',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tx-itc-f'],
    answerDecimals: 2,
    estimatedSeconds: 60,
    formatValue: (value) => money(value),
    params(rng) {
      const p1 = rng.int(20, 80) * 500;
      const p2 = p1 + rng.int(4, 30) * 500;
      const p3 = p2 + rng.int(4, 30) * 500;
      return { prices: [p1, p2, p3], rate: rng.pick([5, 12, 18]), who: rng.pick([1, 2]), goods: rng.pick(GOODS), city: rng.pick(CITIES) };
    },
    answer: ({ prices, rate, who }) => percentOf(prices[who] - prices[who - 1], rate),
    distractors: ({ prices, rate, who }) => [
      { value: percentOf(prices[who], rate), why: 'charged GST on the whole sale and forgot the input credit' },
      { value: percentOf(prices[who] - prices[0], rate), why: 'took credit only for the manufacturer’s price' },
      { value: percentOf(prices[2], rate), why: 'gave the GST on the final price, which the whole chain pays' },
      { value: percentOf(prices[who === 1 ? 2 : 1] - prices[who === 1 ? 1 : 0], rate), why: 'worked out the other trader’s tax' },
      { value: prices[who] - prices[who - 1], why: 'gave the value added, not the tax on it' }
    ],
    // Output tax on the sale less the GST already paid on the purchase.
    verify: ({ prices, rate, who }, value) => nearlyEqual(supplyChain(prices, rate).stages[who].output - supplyChain(prices, rate).stages[who].credit, value),
    render({ prices, rate, who, goods, city }) {
      const [p1, p2, p3] = prices;
      const role = who === 1 ? 'wholesaler' : 'retailer';
      const out = percentOf(prices[who], rate);
      const credit = percentOf(prices[who - 1], rate);
      return {
        question: `In ${city[0]}, a manufacturer sells ${goods} to a wholesaler for ${money(p1)}; the wholesaler sells them to a retailer for ${money(p2)}; the retailer sells them to customers for ${money(p3)}. GST is ${rate}% at every stage, and all the sales are within ${city[1]}. How much GST does the ${role} pay to the government?`,
        explanation: `The ${role} collects ${rate}% of ${money(prices[who])} = ${money(out)} on its sale, but has already paid ${rate}% of ${money(prices[who - 1])} = ${money(credit)} when buying. It claims that back as input tax credit and pays ${money(out)} − ${money(credit)} = ${money(out - credit)}: ${rate}% of the value it added, ${money(prices[who] - prices[who - 1])}.`,
        solutionSteps: [`Output GST = ${rate}% of ${money(prices[who])} = ${money(out)}.`, `Input credit = ${rate}% of ${money(prices[who - 1])} = ${money(credit)}.`, `GST paid = ${money(out)} − ${money(credit)} = ${money(out - credit)}.`],
        method: 'Net GST = output tax − input credit = r% of the value added.',
        hints: [`What did the ${role} pay for the goods, and how much GST was on that?`, 'It pays only on the value it adds: its selling price minus its buying price.'],
        commonMistakes: ['Forgetting the input tax credit and paying GST on the full sale.', 'Giving GST on the final price, which is the whole chain’s total.']
      };
    }
  },

  {
    id: 'tx-chain-total',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-input-credit',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['tx-itc-f', 'tx-sc-chain'],
    answerDecimals: 2,
    unit: '₹',
    estimatedSeconds: 50,
    params(rng) {
      const p1 = rng.int(10, 60) * 1000;
      const p2 = p1 + rng.int(2, 25) * 1000;
      const p3 = p2 + rng.int(2, 25) * 1000;
      return { prices: [p1, p2, p3], rate: rng.pick([5, 12, 18, 28]), goods: rng.pick(GOODS) };
    },
    answer: ({ prices, rate }) => percentOf(prices[2], rate),
    // Add up what each trader pays: its output tax less the GST it paid when buying.
    verify: ({ prices, rate }, value) => {
      let paid = 0;
      let bought = 0;
      for (const price of prices) {
        paid += (price * rate) / 100 - (bought * rate) / 100;
        bought = price;
      }
      return nearlyEqual(paid, value);
    },
    render({ prices, rate, goods }) {
      const [p1, p2, p3] = prices;
      const nets = supplyChain(prices, rate).stages.map((s) => s.net);
      return {
        question: `A maker of ${goods} sells a lot to a distributor for ${money(p1)} plus GST; the distributor sells it to a shop for ${money(p2)} plus GST; the shop sells it to customers for ${money(p3)} plus GST. GST is ${rate}% throughout, and every trader claims input tax credit. How much GST does the government receive in all from this lot?`,
        explanation: `Each trader pays GST only on the value it adds: ${nets.map((n) => money(n)).join(' + ')} = ${money(percentOf(p3, rate))}. That is simply ${rate}% of the final price ${money(p3)}: the earlier prices cancel out.`,
        solutionSteps: [`Maker pays ${rate}% of ${money(p1)} = ${money(nets[0])}.`, `Distributor pays ${rate}% of (${money(p2)} − ${money(p1)}) = ${money(nets[1])}.`, `Shop pays ${rate}% of (${money(p3)} − ${money(p2)}) = ${money(nets[2])}.`, `Total = ${money(percentOf(p3, rate))} = ${rate}% of ${money(p3)}.`],
        method: 'With input credit, total GST = r% of the final selling price.',
        hints: ['Each trader pays tax only on the value it adds.', `Add the value added at each stage: it comes to ${money(p3)}.`],
        commonMistakes: [`Adding the GST on all three sales: ${money(percentOf(p1 + p2 + p3, rate))}, which ignores the credit.`]
      };
    }
  },

  /* ============================ discount and tax ============================ */
  {
    id: 'tx-discount-then-gst',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-discount-tax',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tx-disc-f'],
    answerDecimals: 2,
    estimatedSeconds: 50,
    formatValue: (value) => money(value),
    params(rng) {
      return { marked: rng.int(10, 300) * 100, discount: rng.pick([5, 10, 15, 20, 25, 30]), rate: rng.pick(GST_RATES), item: rng.pick(ITEMS) };
    },
    answer: ({ marked, discount, rate }) => afterDiscountAndTax(marked, discount, rate),
    distractors: ({ marked, discount, rate }) => [
      { value: marked * (1 + (rate - discount) / 100), why: 'added the GST rate and subtracted the discount rate' },
      { value: marked * (1 - discount / 100), why: 'forgot the GST' },
      { value: withTax(marked, rate), why: 'forgot the discount' },
      { value: marked * (1 - discount / 100) * (1 - rate / 100), why: 'took the GST off as well' }
    ],
    // Charge the GST first, then take the discount off: the order does not matter.
    verify: ({ marked, discount, rate }, value) => {
      const taxed = marked + (marked * rate) / 100;
      return nearlyEqual(taxed - (taxed * discount) / 100, value);
    },
    render({ marked, discount, rate, item }) {
      const sale = marked * (1 - discount / 100);
      const tax = percentOf(sale, rate);
      return {
        question: `The marked price of ${item} is ${money(marked)}. The shop gives a ${discount}% discount and then charges GST at ${rate}% on the discounted price. What does the customer pay?`,
        explanation: `Discounted price = ${money(marked)} − ${discount}% = ${money(sale)}. GST = ${rate}% of ${money(sale)} = ${money(tax)}. The customer pays ${money(sale + tax)}, the same as ${money(marked)} × ${fmt(1 - discount / 100, 2)} × ${fmt(1 + rate / 100, 2)}.`,
        solutionSteps: [`Discount = ${discount}% of ${money(marked)} = ${money(marked - sale)}; price = ${money(sale)}.`, `GST = ${rate}% of ${money(sale)} = ${money(tax)}.`, `Paid = ${money(sale)} + ${money(tax)} = ${money(sale + tax)}.`],
        method: 'Final = marked × (1 − d/100) × (1 + r/100).',
        hints: ['GST is charged on the price after the discount.', `Multiply ${money(marked)} by ${fmt(1 - discount / 100, 2)}, then by ${fmt(1 + rate / 100, 2)}.`],
        commonMistakes: [`Netting the rates: ${rate}% − ${discount}% = ${rate - discount}%, which ignores the GST saved on the discount.`]
      };
    }
  },

  {
    id: 'tx-marked-from-paid',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-discount-tax',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['tx-disc-f'],
    unit: '₹',
    estimatedSeconds: 70,
    params(rng) {
      const marked = rng.int(4, 120) * 500;
      const discount = rng.pick([5, 10, 15, 20, 25]);
      const rate = rng.pick(GST_RATES);
      const paid = afterDiscountAndTax(marked, discount, rate);
      if (Math.abs(paid * 100 - Math.round(paid * 100)) > 1e-6) return null;
      return { paid: Math.round(paid * 100) / 100, discount, rate, item: rng.pick(ITEMS), name: rng.pick(NAMES) };
    },
    answer: ({ paid, discount, rate }) => Math.round(((paid * 10000) / ((100 - discount) * (100 + rate))) * 1e6) / 1e6,
    // Forward again: discount the marked price found, add GST, and the bill must come out.
    verify: ({ paid, discount, rate }, value) => {
      const sale = value - (value * discount) / 100;
      return nearlyEqual(sale + (sale * rate) / 100, paid);
    },
    render({ paid, discount, rate, item, name }) {
      const sale = baseFromInclusive(paid, rate);
      const marked = (sale * 100) / (100 - discount);
      return {
        question: `${name} paid ${money(paid)} for ${item}, after a ${discount}% discount on the marked price and then GST at ${rate}% on the discounted price. What was the marked price?`,
        explanation: `Undo the steps in reverse. Before GST: ${money(paid)} × 100/${100 + rate} = ${money(sale)}. Before the discount, ${money(sale)} was ${100 - discount}% of the marked price: ${money(sale)} × 100/${100 - discount} = ${money(marked)}.`,
        solutionSteps: [`Price before GST = ${money(paid)} ÷ ${fmt(1 + rate / 100, 2)} = ${money(sale)}.`, `Marked price = ${money(sale)} ÷ ${fmt(1 - discount / 100, 2)} = ${money(marked)}.`],
        method: 'Marked = paid ÷ [(1 − d/100)(1 + r/100)].',
        hints: [`First remove the ${rate}% GST by dividing by ${fmt(1 + rate / 100, 2)}.`, `That price is ${100 - discount}% of the marked price.`],
        commonMistakes: [`Adding ${discount}% back instead of dividing by ${fmt(1 - discount / 100, 2)}.`, `Subtracting ${rate}% of the bill to remove the GST.`]
      };
    }
  },

  {
    id: 'tx-sales-tax-change',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-discount-tax',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['tx-add-f'],
    answerDecimals: 2,
    unit: '₹',
    estimatedSeconds: 40,
    params(rng) {
      const from = rng.pick([4, 5, 6, 7, 8, 10, 12.5, 14]);
      const to = rng.pick([2, 3, 4, 5, 6, 8, 10]);
      if (to >= from) return null;
      return { from, to, price: rng.int(8, 240) * 50, item: rng.pick(ITEMS), kind: rng.pick(['sales tax', 'VAT']) };
    },
    answer: ({ from, to, price }) => percentOf(price, from - to),
    // The two bills, worked out in full, and their difference.
    verify: ({ from, to, price }, value) => nearlyEqual(price * (1 + from / 100) - price * (1 + to / 100), value),
    render({ from, to, price, item, kind }) {
      return {
        question: `The ${kind} on ${item} is cut from ${pct(from)} to ${pct(to)}. Its price before tax is ${money(price)}. How much less does a buyer now pay?`,
        explanation: `Only the tax changes: the rate falls by ${pct(from)} − ${pct(to)} = ${pct(from - to)}, and ${pct(from - to)} of ${money(price)} = ${money(percentOf(price, from - to))}. (Bills: ${money(withTax(price, from))} before, ${money(withTax(price, to))} after.)`,
        solutionSteps: [`Fall in rate = ${pct(from - to)}.`, `Saving = ${pct(from - to)} of ${money(price)} = ${money(percentOf(price, from - to))}.`],
        method: 'Change in tax = change in rate × price before tax.',
        hints: ['The price before tax stays the same; only the rate moves.', `Find ${pct(from - to)} of ${money(price)}.`],
        commonMistakes: [`Working out ${pct(from - to)} of the price after tax.`, `Treating the fall as ${fmt(((from - to) / from) * 100, 1)}% (a percentage of the old rate).`]
      };
    }
  },

  /* ============================== income tax ============================== */
  {
    id: 'tx-slab-tax',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-income-tax',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['tx-slab-f'],
    unit: '₹',
    estimatedSeconds: 75,
    params(rng) {
      const slabs = exampleSlabs(rng);
      const income = rng.int(slabs[0].upTo / 10000 + 3, slabs[3].upTo / 10000 + 30) * 10000;
      return { slabs, income, name: rng.pick(NAMES) };
    },
    answer: ({ income, slabs }) => slabTax(income, slabs).total,
    verify: ({ income, slabs }, value) => nearlyEqual(walkTax(income, slabs), value),
    render({ slabs, income, name }) {
      const work = slabWorking(income, slabs);
      const total = slabTax(income, slabs).total;
      return {
        question: `Use the example slabs in the table (an illustration, not the current law). ${name}’s taxable income for the year is ${money(income)}. How much income tax is due?`,
        table: slabTable(slabs),
        explanation: `Each rate applies only to the part of the income inside its band. ${work.join('; ')}. Total = ${money(total)}.`,
        solutionSteps: [`The first ${money(slabs[0].upTo)} is tax-free.`, ...work.map((w) => `${w}.`), `Total tax = ${money(total)}.`],
        method: 'Tax each band at its own rate, then add.',
        hints: ['Split the income into the bands of the table.', 'Only the part above each limit is taxed at the higher rate.'],
        commonMistakes: [`Charging the top rate on the whole income.`, 'Forgetting that the first band is tax-free.']
      };
    }
  },

  {
    id: 'tx-income-rebate-cess',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-income-tax',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['tx-slab-f', 'tx-rebate-f'],
    answerDecimals: 2,
    estimatedSeconds: 100,
    formatValue: (value) => money(value),
    params(rng) {
      const slabs = exampleSlabs(rng);
      const deduction = rng.pick([50000, 75000, 100000]);
      const limit = slabs[1].upTo + rng.pick([0, 100000]);
      const rebate = { limit, upTo: slabTax(limit, slabs).total };
      const taxable = rng.int(slabs[0].upTo / 10000 + 5, slabs[3].upTo / 10000) * 10000;
      const rules = { slabs, deduction, rebate, cess: 4 };
      const tax = incomeTax(taxable + deduction, rules);
      // Keep the answers that teach: about a third where the rebate wipes the tax out.
      if (tax.rebated > 0 && !rng.chance(0.5)) return null;
      return { rules, gross: taxable + deduction, name: rng.pick(NAMES) };
    },
    answer: ({ gross, rules }) => incomeTax(gross, rules).total,
    distractors: ({ gross, rules }) => {
      const t = incomeTax(gross, rules);
      const noDeduction = incomeTax(gross, { ...rules, deduction: 0 });
      return [
        { value: t.afterRebate, why: 'forgot the cess' },
        { value: noDeduction.total, why: 'forgot the deduction' },
        { value: t.slab * 1.04, why: 'ignored the rebate rule' },
        { value: t.rebated > 0 ? null : Math.max(0, t.slab - rules.rebate.upTo) * 1.04, why: 'applied the rebate above its income limit' },
        { value: percentOf(t.taxable, rules.slabs[2].rate) * 1.04, why: 'charged one rate on the whole income' }
      ];
    },
    // Walk the taxable income through the bands, then apply the rebate and cess by hand.
    verify: ({ gross, rules }, value) => {
      const taxable = gross - rules.deduction;
      let tax = walkTax(taxable, rules.slabs);
      if (taxable <= rules.rebate.limit) tax = Math.max(0, tax - rules.rebate.upTo);
      return nearlyEqual(tax + (tax * 4) / 100, value);
    },
    render({ gross, rules, name }) {
      const t = incomeTax(gross, rules);
      const work = slabWorking(t.taxable, rules.slabs);
      return {
        question: `Use these example rules (an illustration, not the current law): a standard deduction of ${money(rules.deduction)}; the slabs in the table; a rebate that cancels the tax, up to ${money(rules.rebate.upTo)}, when taxable income is at most ${money(rules.rebate.limit)}; then a cess of 4% on the tax left. ${name}’s gross salary is ${money(gross)}. What is the total tax payable?`,
        table: slabTable(rules.slabs),
        explanation: `Taxable income = ${money(gross)} − ${money(rules.deduction)} = ${money(t.taxable)}. Slab tax: ${work.length ? `${work.join('; ')}; in all ${money(t.slab)}` : 'nil, as the income is within the tax-free slab'}. ${t.rebated > 0 ? `Taxable income is within ${money(rules.rebate.limit)}, so the rebate cancels ${money(t.rebated)}, leaving ${money(t.afterRebate)}.` : `Taxable income is above ${money(rules.rebate.limit)}, so there is no rebate.`} Cess = 4% of ${money(t.afterRebate)} = ${money(t.cess)}. Total = ${money(t.total)}.`,
        solutionSteps: [`Taxable income = ${money(t.taxable)}.`, `Slab tax = ${money(t.slab)}.`, t.rebated > 0 ? `Rebate ${money(t.rebated)}: tax left ${money(t.afterRebate)}.` : 'No rebate (income above the limit).', `With 4% cess: ${money(t.total)}.`],
        method: 'Deduct, tax by slabs, apply the rebate rule, then add cess.',
        hints: ['Start by taking the deduction off the gross salary.', `Check whether ${money(t.taxable)} is within the rebate limit of ${money(rules.rebate.limit)}.`, 'Cess is a percentage of the tax, not of the income.'],
        commonMistakes: ['Testing the rebate limit against the gross salary instead of the taxable income.', 'Leaving out the 4% cess.']
      };
    }
  },

  /* =============================== commission =============================== */
  {
    id: 'tx-flat-commission',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-commission',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['tx-comm-f'],
    answerDecimals: 2,
    estimatedSeconds: 40,
    formatValue: (value) => money(value),
    params(rng) {
      const kind = rng.pick(['commission', 'earnings', 'brokerage']);
      const rate = kind === 'brokerage' ? rng.pick([0.5, 1, 1.5, 2]) : rng.pick([2, 2.5, 3, 4, 5, 6, 8, 10]);
      const sales = kind === 'brokerage' ? rng.int(20, 150) * 100000 : rng.int(20, 400) * 1000;
      const salary = kind === 'earnings' ? rng.int(8, 30) * 1000 : 0;
      return { kind, rate, sales, salary, name: rng.pick(NAMES), city: rng.pick(CITIES)[0] };
    },
    answer: ({ rate, sales, salary }) => salary + percentOf(sales, rate),
    distractors: ({ rate, sales, salary, kind }) => [
      { value: salary + percentOf(sales, rate) / 10, why: 'moved the decimal point: used rate/1000' },
      { value: salary + percentOf(sales, rate) * 10, why: 'moved the decimal point: used rate/10' },
      { value: kind === 'earnings' ? percentOf(sales, rate) : 2 * percentOf(sales, rate), why: kind === 'earnings' ? 'left out the fixed salary' : 'charged both buyer and seller' },
      { value: kind === 'earnings' ? salary + rate * 1000 : percentOf(sales, rate + 1), why: 'misread the rate' }
    ],
    // Working back from the commission found must recover the sales.
    verify: ({ rate, sales, salary }, value) => nearlyEqual(((value - salary) * 100) / rate, sales),
    render({ kind, rate, sales, salary, name, city }) {
      const c = percentOf(sales, rate);
      const question =
        kind === 'brokerage'
          ? `A property broker in ${city} charges the seller ${pct(rate)} brokerage. He arranges the sale of a flat for ${money(sales)}. How much brokerage does he earn from the seller?`
          : kind === 'earnings'
            ? `${name} works in a ${city} showroom for a fixed ${money(salary)} a month plus ${pct(rate)} commission on sales. This month the sales were ${money(sales)}. How much does ${name} earn this month?`
            : `${name}, a sales agent in ${city}, gets ${pct(rate)} commission on everything sold. This month the sales were ${money(sales)}. What is the commission?`;
      return {
        question,
        explanation: `${pct(rate)} of ${money(sales)} = ${money(sales)} × ${rate}/100 = ${money(c)}.${salary ? ` Add the fixed ${money(salary)}: ${money(salary + c)}.` : ''}`,
        solutionSteps: [`Commission = ${money(sales)} × ${rate} ÷ 100 = ${money(c)}.`, ...(salary ? [`Earnings = ${money(salary)} + ${money(c)} = ${money(salary + c)}.`] : [])],
        method: salary ? 'Earnings = fixed pay + rate × sales.' : 'Commission = rate × sales.',
        hints: [`Find ${pct(rate)} of ${money(sales)}.`, salary ? 'Then add the fixed monthly pay.' : '1% of an amount is that amount ÷ 100.'],
        commonMistakes: ['Misplacing the decimal point when the rate is small.', ...(salary ? ['Leaving out the fixed pay.'] : [])]
      };
    }
  },

  {
    id: 'tx-tiered-commission',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-commission',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['tx-comm-f'],
    unit: '₹',
    answerDecimals: 2,
    estimatedSeconds: 60,
    params(rng) {
      const first = rng.int(5, 30) * 10000;
      const second = first + rng.int(5, 30) * 10000;
      const rates = rng.pick([
        [2, 4, 6],
        [3, 5, 8],
        [4, 6, 10],
        [2.5, 5, 7.5],
        [5, 8, 12]
      ]);
      const tiers = [
        { upTo: first, rate: rates[0] },
        { upTo: second, rate: rates[1] },
        { upTo: OPEN, rate: rates[2] }
      ];
      const sales = rng.int(first / 1000 + 5, second / 1000 + 300) * 1000;
      return { tiers, sales, name: rng.pick(NAMES), city: rng.pick(CITIES)[0] };
    },
    answer: ({ sales, tiers }) => tieredCommission(sales, tiers),
    verify: ({ sales, tiers }, value) => nearlyEqual(walkTax(sales, tiers), value),
    render({ tiers, sales, name, city }) {
      const [a, b, c] = tiers;
      const work = slabTax(sales, tiers).parts.map((p) => `${pct(p.rate)} of ${money(p.amount)} = ${money(p.tax)}`);
      const total = tieredCommission(sales, tiers);
      return {
        question: `A ${city} electronics store pays ${name} ${pct(a.rate)} commission on the first ${money(a.upTo)} of monthly sales, ${pct(b.rate)} on the next ${money(b.upTo - a.upTo)}, and ${pct(c.rate)} on all sales above ${money(b.upTo)}. In one month ${name} sells ${money(sales)}. What is the commission?`,
        explanation: `Each rate applies only to its own band of sales: ${work.join('; ')}. Total = ${money(total)}.`,
        solutionSteps: [...work.map((w) => `${w}.`), `Commission = ${money(total)}.`],
        method: 'Tiered commission: each rate on its own band, then add.',
        hints: [`Split ${money(sales)} into the bands.`, 'The higher rate applies only to sales above each limit.'],
        commonMistakes: [`Paying the top rate on all sales: ${money(percentOf(sales, sales > b.upTo ? c.rate : b.rate))}.`]
      };
    }
  },

  {
    id: 'tx-sales-for-target',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-commission',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['tx-comm-f'],
    unit: '₹',
    estimatedSeconds: 55,
    params(rng) {
      const rate = rng.pick([2, 2.5, 4, 5, 8, 10]);
      const salary = rng.int(6, 25) * 1000;
      const sales = rng.int(5, 80) * 10000;
      return { rate, salary, target: salary + percentOf(sales, rate), name: rng.pick(NAMES) };
    },
    answer: ({ rate, salary, target }) => Math.round((((target - salary) * 100) / rate) * 1e6) / 1e6,
    verify: ({ rate, salary, target }, value) => nearlyEqual(salary + (value * rate) / 100, target),
    render({ rate, salary, target, name }) {
      const need = target - salary;
      return {
        question: `${name} earns ${money(salary)} a month plus ${pct(rate)} commission on sales. What must ${name} sell in a month to earn ${money(target)} in all?`,
        explanation: `The commission has to make up ${money(target)} − ${money(salary)} = ${money(need)}. That is ${pct(rate)} of sales, so sales = ${money(need)} × 100/${rate} = ${money((need * 100) / rate)}.`,
        solutionSteps: [`Commission needed = ${money(target)} − ${money(salary)} = ${money(need)}.`, `Sales = ${money(need)} ÷ ${rate}% = ${money((need * 100) / rate)}.`],
        method: 'Sales = (target − fixed pay) × 100 ÷ rate.',
        hints: ['How much of the target must come from commission?', `That amount is ${pct(rate)} of the sales.`],
        commonMistakes: [`Dividing the whole ${money(target)} by ${pct(rate)}, forgetting the fixed pay.`]
      };
    }
  },

  {
    id: 'tx-tier-target',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-commission',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['tx-comm-f'],
    unit: '₹',
    estimatedSeconds: 80,
    params(rng) {
      const first = rng.int(5, 20) * 10000;
      const rates = rng.pick([
        [2, 5],
        [4, 6],
        [3, 8],
        [5, 10],
        [4, 10]
      ]);
      const tiers = [
        { upTo: first, rate: rates[0] },
        { upTo: OPEN, rate: rates[1] }
      ];
      const sales = first + rng.int(1, 40) * 10000;
      return { tiers, commission: tieredCommission(sales, tiers), name: rng.pick(NAMES) };
    },
    answer: ({ commission, tiers }) => Math.round(salesForCommission(commission, tiers) * 1e6) / 1e6,
    // The sales found must earn the commission, and ₹1,000 less must fall short.
    verify: ({ commission, tiers }, value) => nearlyEqual(walkTax(value, tiers), commission) && walkTax(value - 1000, tiers) < commission,
    render({ tiers, commission, name }) {
      const [a, b] = tiers;
      const low = percentOf(a.upTo, a.rate);
      const rest = commission - low;
      const sales = salesForCommission(commission, tiers);
      return {
        question: `An agent gets ${pct(a.rate)} commission on the first ${money(a.upTo)} of sales and ${pct(b.rate)} on sales above that. ${name} earned ${money(commission)} in commission last month. What were the sales?`,
        explanation: `The first ${money(a.upTo)} earns at most ${pct(a.rate)} × ${money(a.upTo)} = ${money(low)}, less than ${money(commission)}, so the sales went past ${money(a.upTo)}. The other ${money(rest)} came at ${pct(b.rate)}: ${money(rest)} × 100/${b.rate} = ${money(sales - a.upTo)} more. Sales = ${money(a.upTo)} + ${money(sales - a.upTo)} = ${money(sales)}.`,
        solutionSteps: [`Commission on the first ${money(a.upTo)} = ${money(low)}.`, `Remaining commission = ${money(rest)} at ${pct(b.rate)}: sales above the limit = ${money(sales - a.upTo)}.`, `Total sales = ${money(sales)}.`],
        method: 'Fill the lower tier first, then divide what is left by the higher rate.',
        hints: [`How much commission does the whole first tier give?`, `The rest of the ${money(commission)} was earned at ${pct(b.rate)}.`],
        commonMistakes: [`Dividing ${money(commission)} by ${pct(b.rate)} as if every sale earned the top rate.`]
      };
    }
  },

  /* ======================= property tax and customs duty ======================= */
  {
    id: 'tx-property-tax',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-duties',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['tx-duty-f'],
    unit: '₹',
    answerDecimals: 2,
    estimatedSeconds: 45,
    params(rng) {
      return { value: rng.int(6, 60) * 10000, rate: rng.pick([6, 8, 9, 10, 12, 15]), rebate: rng.pick([0, 5, 10]), city: rng.pick(CITIES)[0] };
    },
    answer: ({ value, rate, rebate }) => propertyTax(value, rate, rebate).payable,
    // Undo the rebate and the rate: the annual value must come back.
    verify: ({ value, rate, rebate }, paid) => nearlyEqual((((paid * 100) / (100 - rebate)) * 100) / rate, value),
    render({ value, rate, rebate, city }) {
      const t = propertyTax(value, rate, rebate);
      return {
        question: `A municipality charges property tax at ${pct(rate)} of a house’s annual value (an example rate). A house in ${city} has an annual value of ${money(value)}.${rebate ? ` Owners who pay before the due date get a rebate of ${pct(rebate)} of the tax.` : ''} How much does ${rebate ? 'an owner who pays early' : 'the owner'} pay?`,
        explanation: `Tax = ${pct(rate)} of ${money(value)} = ${money(t.tax)}.${rebate ? ` The rebate is ${pct(rebate)} of the tax, ${money(t.rebate)}, so the owner pays ${money(t.payable)}.` : ''}`,
        solutionSteps: [`Tax = ${money(value)} × ${rate}/100 = ${money(t.tax)}.`, ...(rebate ? [`Rebate = ${rebate}% of ${money(t.tax)} = ${money(t.rebate)}.`, `Payable = ${money(t.payable)}.`] : [])],
        method: rebate ? 'Tax = rate × annual value; then take the rebate off the tax.' : 'Tax = rate × annual value.',
        hints: [`Find ${pct(rate)} of ${money(value)}.`, rebate ? 'The rebate is a percentage of the tax, not of the annual value.' : 'The rate applies to the annual value, not the price of the house.'],
        commonMistakes: rebate ? [`Taking ${pct(rebate)} off the annual value, or subtracting ${pct(rebate)} from the rate.`] : ['Misplacing the decimal point.']
      };
    }
  },

  {
    id: 'tx-customs',
    version: 1,
    topicId: 'taxes-commission',
    conceptId: 'tx-duties',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['tx-duty-f'],
    answerDecimals: 2,
    estimatedSeconds: 70,
    formatValue: (value) => money(value),
    params(rng) {
      return { value: rng.int(5, 200) * 10000, duty: rng.pick([5, 7.5, 10, 15, 20]), igst: rng.pick([5, 12, 18, 28]), ask: rng.pick(['total', 'landed']), city: rng.pick(['Chennai', 'Mumbai', 'Kolkata', 'Kochi', 'Visakhapatnam']) };
    },
    answer: ({ value, duty, igst, ask }) => (ask === 'total' ? customs(value, duty, igst).total : customs(value, duty, igst).landed),
    distractors: ({ value, duty, igst, ask }) => {
      const flat = percentOf(value, duty) + percentOf(value, igst);
      const add = ask === 'total' ? 0 : value;
      return [
        { value: add + flat, why: 'charged IGST on the value alone, not on value plus duty' },
        { value: add + percentOf(value, duty), why: 'left out the IGST' },
        { value: add + percentOf(value, igst), why: 'left out the duty' },
        { value: add + customs(value, duty, igst).igst, why: 'gave the IGST but left out the duty itself' }
      ];
    },
    // Multiply the value by both factors and take the original value off.
    verify: ({ value, duty, igst, ask }, found) => {
      const landed = value * (1 + duty / 100) * (1 + igst / 100);
      return nearlyEqual(ask === 'total' ? landed - value : landed, found);
    },
    render({ value, duty, igst, ask, city }) {
      const c = customs(value, duty, igst);
      return {
        question: `An importer in ${city} brings in machinery with an assessable value of ${money(value)}. Take (as an example) a basic customs duty of ${pct(duty)} on the assessable value, and then IGST of ${pct(igst)} on the value plus the duty. ${ask === 'total' ? 'How much tax is paid in all?' : 'What does the machinery cost the importer, value and taxes together?'}`,
        explanation: `Duty = ${pct(duty)} of ${money(value)} = ${money(c.duty)}. IGST is charged on ${money(value)} + ${money(c.duty)} = ${money(value + c.duty)}: ${pct(igst)} of it is ${money(c.igst)}. ${ask === 'total' ? `Total tax = ${money(c.duty)} + ${money(c.igst)} = ${money(c.total)}.` : `Cost = ${money(value)} + ${money(c.duty)} + ${money(c.igst)} = ${money(c.landed)}.`}`,
        solutionSteps: [`Duty = ${money(c.duty)}.`, `IGST = ${pct(igst)} of ${money(value + c.duty)} = ${money(c.igst)}.`, ask === 'total' ? `Total tax = ${money(c.total)}.` : `Cost = ${money(c.landed)}.`],
        method: 'Duty on the value; IGST on value + duty.',
        hints: ['Work out the duty first.', 'IGST is charged on the value with the duty already added.'],
        commonMistakes: ['Charging IGST on the assessable value alone.', 'Adding the two rates and applying them once.']
      };
    }
  }
];
