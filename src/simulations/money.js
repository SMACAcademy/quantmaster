/** Simulations for percentages, profit and discount, interest and mixtures. */

import { near, niceRange, ratioText, show, signedPercent } from './core.js';

const rupees = (value) => `₹${show(value, 2)}`;

export const ciVsSi = {
  id: 'ci-vs-si',
  topicId: 'compound-interest',
  alsoTopicIds: ['simple-interest'],
  title: 'Compound vs simple interest',
  summary: 'Watch interest earn interest: the gap between the two curves grows every year.',
  controls: [
    { id: 'principal', label: 'Principal', type: 'range', min: 1000, max: 100000, step: 1000, default: 10000, unit: '₹' },
    { id: 'rate', label: 'Rate per year', type: 'range', min: 1, max: 30, step: 0.5, default: 10, unit: '%' },
    { id: 'years', label: 'Years', type: 'range', min: 1, max: 20, step: 1, default: 5 },
    {
      id: 'compounding',
      label: 'Compounded',
      type: 'choice',
      options: [
        { id: 'yearly', label: 'Yearly' },
        { id: 'half-yearly', label: 'Half-yearly' },
        { id: 'quarterly', label: 'Quarterly' }
      ],
      default: 'yearly'
    }
  ],
  compute({ principal: p, rate: r, years: t, compounding }) {
    const perYear = { yearly: 1, 'half-yearly': 2, quarterly: 4 }[compounding];
    const periodRate = r / 100 / perYear;
    const compound = (years) => p * (1 + periodRate) ** Math.round(years * perYear);
    const simple = (years) => p * (1 + (r * years) / 100);
    const ci = compound(t);
    const si = simple(t);
    const siInterest = si - p;
    const ciInterest = ci - p;
    const gap = ci - si;
    const doubling = Math.log(2) / (perYear * Math.log(1 + periodRate));

    const periods = t * perYear;
    const ciPoints = Array.from({ length: periods + 1 }, (_, k) => [k / perYear, p * (1 + periodRate) ** k]);
    const siPoints = [[0, p], [t, si]];
    // Amounts never fall below the principal, so the axis starts there and the curves fill the picture.
    // The "double" line is included when the amount comes close to it.
    const showDouble = 2 * p <= ci * 1.15;
    const y = niceRange(p, showDouble ? Math.max(ci, 2 * p) : ci);

    return {
      numbers: { si, ci, siInterest, ciInterest, gap, doubling, perYear },
      readouts: [
        { label: 'Amount with simple interest', value: rupees(si) },
        { label: 'Amount with compound interest', value: rupees(ci) },
        { label: 'Extra from compounding', value: rupees(gap) },
        { label: 'Time to double (compound)', value: `${show(doubling, 1)} years` }
      ],
      plot: {
        kind: 'xy',
        x: { label: 'Years', min: 0, max: t },
        y: { label: 'Amount (₹)', min: y.min, max: y.max },
        series: [
          { id: 'ci', label: 'Compound interest', points: ciPoints, tone: 'algebra' },
          { id: 'si', label: 'Simple interest', points: siPoints, tone: 'arithmetic', dashed: true }
        ],
        fills: [{ from: 'si', to: 'ci', tone: 'algebra' }],
        guides: [{ axis: 'y', value: 2 * p, label: 'Double' }],
        summary: `After ${t} years, simple interest gives ${rupees(si)} and compound interest gives ${rupees(ci)}.`
      },
      insight:
        t === 2 && perYear === 1
          ? `For 2 years the gap is P × (R/100)² = ${rupees(gap)}: one year's interest earning interest for one year.`
          : perYear > 1
            ? 'Compounding more often adds interest sooner, so the same yearly rate grows slightly faster.'
            : `The gap is ${show((gap / siInterest) * 100, 1)}% of the simple interest, and it widens every year because interest earns interest.`
    };
  },
  tasks: [
    {
      id: 'double',
      prompt: 'Make the compound amount at least double the principal.',
      check: (values, n) => n.ci >= 2 * values.principal,
      solution: { rate: 15, years: 5, compounding: 'yearly' }
    },
    {
      id: 'half-again',
      prompt: 'Find settings where compounding adds at least half as much again as simple interest.',
      check: (values, n) => n.gap >= 0.5 * n.siInterest,
      solution: { rate: 20, years: 10, compounding: 'yearly' }
    },
    {
      id: 'two-years',
      prompt: 'At 10% compounded yearly for 2 years, check that the gap is exactly 1% of the principal.',
      check: (values, n) => values.rate === 10 && values.years === 2 && values.compounding === 'yearly' && near(n.gap, values.principal / 100, 1e-6),
      solution: { rate: 10, years: 2, compounding: 'yearly' }
    }
  ]
};

export const successiveChange = {
  id: 'successive-change',
  topicId: 'percentages',
  title: 'Two percentage changes in a row',
  summary: 'Why up 10% then down 10% does not bring you back to where you started.',
  controls: [
    { id: 'first', label: 'First change', type: 'range', min: -50, max: 100, step: 5, default: 10, unit: '%' },
    { id: 'second', label: 'Second change', type: 'range', min: -50, max: 100, step: 5, default: 10, unit: '%' }
  ],
  compute({ first: a, second: b }) {
    const afterFirst = 100 * (1 + a / 100);
    const final = afterFirst * (1 + b / 100);
    const net = a + b + (a * b) / 100;
    const undo = (-net / (100 + net)) * 100;
    const y = niceRange(0, Math.max(100, afterFirst, final));
    return {
      numbers: { afterFirst, final, net, undo },
      readouts: [
        { label: 'Net change', value: signedPercent(net) },
        { label: 'Value after both (from 100)', value: show(final) },
        { label: 'Change needed to get back to 100', value: signedPercent(undo) }
      ],
      plot: {
        kind: 'bars',
        y: { label: 'Value', min: 0, max: y.max },
        baseline: 100,
        bars: [
          { label: 'Start', value: 100, tone: 'arithmetic' },
          { label: `After ${signedPercent(a, 0)}`, value: afterFirst, tone: 'algebra' },
          { label: `After ${signedPercent(b, 0)}`, value: final, tone: net < 0 ? 'combinatorics' : 'geometry' }
        ],
        summary: `Starting at 100, a change of ${signedPercent(a, 0)} then ${signedPercent(b, 0)} gives ${show(final)}.`
      },
      insight:
        a !== 0 && a === -b
          ? `Equal rises and falls always lose: the loss is x²/100 % = ${show((a * a) / 100)}%, because the fall is taken on a bigger amount.`
          : near(net, 0)
            ? 'These two changes cancel exactly: each is the undo of the other.'
            : `Net change = a + b + ab/100 = ${show(a)} + ${show(b)} + ${show((a * b) / 100)} = ${signedPercent(net)}.`
    };
  },
  tasks: [
    {
      id: 'cancel',
      prompt: 'Find two non-zero changes that cancel out exactly.',
      check: (values, n) => values.first !== 0 && near(n.net, 0),
      solution: { first: 25, second: -20 }
    },
    {
      id: 'equal-rises',
      prompt: 'Make two equal rises add up to a net rise of exactly 44%.',
      check: (values, n) => values.first === values.second && near(n.net, 44),
      solution: { first: 20, second: 20 }
    },
    {
      id: 'up-down',
      prompt: 'Rise and fall by the same amount and lose exactly 4%.',
      check: (values, n) => values.first === -values.second && near(n.net, -4),
      solution: { first: 20, second: -20 }
    }
  ]
};

export const markupDiscount = {
  id: 'markup-discount',
  topicId: 'profit-loss-discount',
  title: 'Mark up, then discount',
  summary: 'How far can a shop cut the marked price before it starts losing money?',
  controls: [
    { id: 'markup', label: 'Markup on cost', type: 'range', min: 0, max: 100, step: 5, default: 40, unit: '%' },
    { id: 'discount', label: 'Discount', type: 'range', min: 0, max: 60, step: 1, default: 10, unit: '%' }
  ],
  compute({ markup: m, discount: d }) {
    const cost = 100;
    const marked = cost * (1 + m / 100);
    const selling = marked * (1 - d / 100);
    const profit = ((selling - cost) / cost) * 100;
    const breakEven = (100 * m) / (100 + m);
    const profitAt = (discount) => (marked * (1 - discount / 100) - cost);
    const y = niceRange(Math.min(profitAt(60), 0), Math.max(profitAt(0), 0));
    return {
      numbers: { marked, selling, profit, breakEven },
      readouts: [
        { label: 'Marked price (cost ₹100)', value: rupees(marked) },
        { label: 'Selling price', value: rupees(selling) },
        { label: profit < 0 ? 'Loss' : 'Profit', value: `${show(Math.abs(profit))}%` },
        { label: 'Largest discount without a loss', value: `${show(breakEven)}%` }
      ],
      plot: {
        kind: 'xy',
        x: { label: 'Discount (%)', min: 0, max: 60 },
        y: { label: 'Profit on ₹100 of cost', min: y.min, max: y.max },
        series: [{ id: 'profit', label: 'Profit', points: [[0, profitAt(0)], [60, profitAt(60)]], tone: 'geometry' }],
        guides: [
          { axis: 'y', value: 0, label: 'No profit, no loss' },
          { axis: 'x', value: breakEven, label: `${show(breakEven, 1)}%` }
        ],
        markers: [{ x: d, y: selling - cost, label: 'You are here', tone: profit < 0 ? 'combinatorics' : 'algebra' }],
        summary: `A ${show(m)}% markup and a ${show(d)}% discount give a ${profit < 0 ? 'loss' : 'profit'} of ${show(Math.abs(profit))}%.`
      },
      insight:
        m === d && m > 0
          ? `Marking up and discounting by the same ${show(m)}% always loses ${show((m * m) / 100)}%.`
          : `With a ${show(m)}% markup the shop breaks even at a ${show(breakEven)}% discount, which is m ÷ (100 + m) × 100, not ${show(m)}%.`
    };
  },
  tasks: [
    {
      id: 'break-even',
      prompt: 'With a 25% markup, find the largest discount that still avoids a loss.',
      check: (values, n) => values.markup === 25 && near(n.profit, 0),
      solution: { markup: 25, discount: 20 }
    },
    {
      id: 'generous',
      prompt: 'Make at least 20% profit while giving at least a 20% discount.',
      check: (values, n) => values.discount >= 20 && n.profit >= 20 - 1e-9,
      solution: { markup: 50, discount: 20 }
    },
    {
      id: 'equal',
      prompt: 'Choose an equal markup and discount (not zero). Does the shop gain or lose?',
      check: (values, n) => values.markup === values.discount && values.markup > 0 && n.profit < 0,
      solution: { markup: 20, discount: 20 }
    }
  ]
};

export const alligationSeesaw = {
  id: 'alligation-seesaw',
  topicId: 'mixtures-alligation',
  alsoTopicIds: ['weighted-average', 'weighted-mean'],
  title: 'The alligation seesaw',
  summary: 'A mixture balances like a seesaw: the bigger quantity pulls the balance point towards itself.',
  controls: [
    { id: 'strength1', label: 'Solution A strength', type: 'range', min: 0, max: 100, step: 5, default: 20, unit: '%' },
    { id: 'amount1', label: 'Solution A amount', type: 'range', min: 1, max: 20, step: 1, default: 3, unit: 'L' },
    { id: 'strength2', label: 'Solution B strength', type: 'range', min: 0, max: 100, step: 5, default: 60, unit: '%' },
    { id: 'amount2', label: 'Solution B amount', type: 'range', min: 1, max: 20, step: 1, default: 1, unit: 'L' }
  ],
  compute({ strength1: c1, amount1: q1, strength2: c2, amount2: q2 }) {
    const mean = (c1 * q1 + c2 * q2) / (q1 + q2);
    const low = Math.min(c1, c2);
    const high = Math.max(c1, c2);
    // Alligation: quantity of the weaker : quantity of the stronger = (high − mean) : (mean − low).
    const weakerShare = high - mean;
    const strongerShare = mean - low;
    return {
      numbers: { mean, weakerShare, strongerShare },
      readouts: [
        { label: 'Mixture strength', value: `${show(mean)}%` },
        { label: 'Amounts A : B', value: ratioText(q1, q2) },
        {
          label: c1 === c2 ? 'Alligation' : 'Alligation (higher − mean) : (mean − lower)',
          value: c1 === c2 ? 'Same strength: any ratio' : `${show(weakerShare)} : ${show(strongerShare)} = ${ratioText(weakerShare, strongerShare)}`
        }
      ],
      plot: {
        kind: 'seesaw',
        beam: { min: 0, max: 100, label: 'Strength (%)' },
        weights: [
          { position: c1, amount: q1, label: `A: ${show(q1)} L at ${show(c1)}%`, tone: 'arithmetic' },
          { position: c2, amount: q2, label: `B: ${show(q2)} L at ${show(c2)}%`, tone: 'combinatorics' }
        ],
        pivot: mean,
        summary: `${show(q1)} litres at ${show(c1)}% and ${show(q2)} litres at ${show(c2)}% balance at ${show(mean)}%.`
      },
      insight:
        c1 === c2
          ? 'Both solutions are the same strength, so the mixture is too, whatever the amounts.'
          : `The distances to the balance point, ${show(Math.abs(c1 - mean))} and ${show(Math.abs(c2 - mean))}, are in the reverse ratio of the amounts: that is the whole alligation rule.`
    };
  },
  tasks: [
    {
      id: 'thirty',
      prompt: 'Mix a 20% and a 50% solution to get exactly 30%.',
      check: (values, n) => [values.strength1, values.strength2].sort((a, b) => a - b).join() === '20,50' && near(n.mean, 30),
      solution: { strength1: 20, amount1: 2, strength2: 50, amount2: 1 }
    },
    {
      id: 'equal-amounts',
      prompt: 'Make exactly 50% from equal amounts of two solutions, neither of which is 50%.',
      check: (values, n) => values.amount1 === values.amount2 && values.strength1 !== 50 && near(n.mean, 50),
      solution: { strength1: 30, amount1: 5, strength2: 70, amount2: 5 }
    }
  ]
};
