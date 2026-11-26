/**
 * Simulations for data interpretation (bar graphs, line graphs, pie charts,
 * tables) and data sufficiency. The charts are drawn by Chart.js, as in the DI
 * questions, so what the learner sees here is what the exam shows.
 */

import { near, ratioText, show, signedPercent } from './core.js';

/* ------------------------------- helpers ------------------------------- */

/** Percentage change from `from` to `to`, measured against `from` (the base). */
export const percentChange = (from, to) => ((to - from) / from) * 100;

/** A signed number for display: +22, −6, 0. */
const signed = (value, decimals = 2) => (Number(value.toFixed(decimals)) > 0 ? `+${show(value, decimals)}` : show(value, decimals));

/**
 * The year-on-year steps of `values` from index `lo` to index `hi`, each with its
 * rise and % rise; and the step with the largest rise, the largest % rise and the
 * smallest % rise (the first one, on a tie). With fewer than two points, no steps.
 */
export function steps(values, lo, hi) {
  const list = [];
  for (let i = lo; i < hi; i++) list.push({ from: i, rise: values[i + 1] - values[i], pct: percentChange(values[i], values[i + 1]) });
  const pick = (better) => list.reduce((best, step) => (best === null || better(step, best) ? step : best), null);
  return {
    list,
    largestRise: pick((a, b) => a.rise > b.rise + 1e-9),
    largestPct: pick((a, b) => a.pct > b.pct + 1e-9),
    smallestPct: pick((a, b) => a.pct < b.pct - 1e-9)
  };
}

/** The data-sufficiency option from whether (1) alone, (2) alone and both together pin the answer down. */
export function dsOption(oneAlone, twoAlone, together) {
  if (oneAlone && twoAlone) return 'D';
  if (oneAlone) return 'A';
  if (twoAlone) return 'B';
  if (together) return 'C';
  return 'E';
}

/* ------------------------------ bar graphs ------------------------------ */

const BAR_YEARS = ['2019', '2020', '2021', '2022', '2023'];
const BAR_START = [60, 90, 120, 100, 150];
const BAR_TOP = 250;
const yearOptions = (years) => years.map((year) => ({ id: year, label: year }));

export const diBarGraphs = {
  id: 'di-bar-graphs',
  topicId: 'di-bar-graphs',
  title: 'Comparing two bars',
  summary: 'Set the bars, pick two years, and read the ratio, the difference and the % change. A bar twice as tall is +100%, not +200%.',
  controls: [
    ...BAR_YEARS.map((year, i) => ({ id: `y${year}`, label: `Sales in ${year}`, type: 'range', min: 10, max: BAR_TOP, step: 10, default: BAR_START[i] })),
    { id: 'from', label: 'Compare from (the base)', type: 'choice', options: yearOptions(BAR_YEARS), default: '2019' },
    { id: 'to', label: 'Compare to', type: 'choice', options: yearOptions(BAR_YEARS), default: '2023' }
  ],
  compute(values) {
    const data = BAR_YEARS.map((year) => values[`y${year}`]);
    const i = BAR_YEARS.indexOf(values.from);
    const j = BAR_YEARS.indexOf(values.to);
    const [base, other] = [data[i], data[j]];
    const same = i === j;
    const diff = other - base;
    const ratio = other / base;
    const pct = percentChange(base, other);
    const back = percentChange(other, base);
    const twice = 2 * base;
    // Bar heights are whole numbers up to 250, so they are written as they are, without
    // show(): the corner tests run thousands of settings, and locale formatting is slow.
    return {
      numbers: { same, base, other, diff, ratio, pct, back },
      readouts: [
        { label: 'Base → compared', value: `${base} → ${other}` },
        { label: 'Difference', value: signed(diff) },
        { label: `Ratio ${values.to} : ${values.from}`, value: `${ratioText(other, base)} (× ${show(ratio, 2)})` },
        { label: `% change, ${values.from} → ${values.to}`, value: signedPercent(pct) },
        { label: `% change back, ${values.to} → ${values.from}`, value: signedPercent(back) }
      ],
      plot: {
        kind: 'chart',
        chart: {
          type: 'bar',
          max: BAR_TOP,
          categories: BAR_YEARS,
          series: [
            {
              label: 'Sales',
              data,
              colorToken: 'data',
              colorTokens: data.map((_, k) => (k === i ? 'arithmetic' : k === j ? 'combinatorics' : null)),
              dim: data.map((_, k) => k !== i && k !== j)
            }
          ],
          guides: [{ value: base, colorToken: 'arithmetic' }, ...(twice <= BAR_TOP ? [{ value: twice }] : [])],
          legend: [
            { label: `Base: ${values.from}`, colorToken: 'arithmetic' },
            ...(same ? [] : [{ label: `Compared: ${values.to}`, colorToken: 'combinatorics' }]),
            { label: `Base level (${base})`, colorToken: 'arithmetic', dashed: true },
            ...(twice <= BAR_TOP ? [{ label: `Twice the base (${twice}) = +100%`, dashed: true }] : [])
          ]
        },
        summary: `Sales by year: ${BAR_YEARS.map((year, k) => `${year} ${data[k]}`).join(', ')}. ${values.to} against ${values.from}: ${signedPercent(pct)}.`
      },
      insight: same
        ? 'Pick two different years: a bar compared with itself is a 0% change.'
        : near(base, other)
          ? 'The two bars are equal: a 0% change, whichever one is the base.'
          : near(ratio, 2)
            ? `${values.to} is twice ${values.from}. The rise, ${diff}, is the base once over, so the change is +100%, not +200%.`
            : ratio > 1
              ? `${values.to} is ${show(ratio, 2)} times ${values.from}: a rise of ${diff} on a base of ${base}, which is ${signedPercent(pct)}. Going back down is only ${signedPercent(back)}, because the base is then the taller bar.`
              : `A fall from ${base} to ${other} is ${signedPercent(pct)} of the base. Climbing back takes ${signedPercent(back)}, because the base is then the shorter bar.`
    };
  },
  tasks: [
    {
      id: 'double',
      prompt: 'Make the compared bar exactly twice the base. Is that +200%?',
      check: (values, n) => !n.same && near(n.ratio, 2),
      solution: { y2023: 120 }
    },
    {
      id: 'quarter',
      prompt: 'Find two bars with a rise of +25%. Then read the fall back: why only −20%?',
      check: (values, n) => near(n.pct, 25),
      solution: { from: '2021', to: '2023' }
    },
    {
      id: 'same-gap',
      prompt: 'Make a rise of 50 that is only +25%.',
      check: (values, n) => near(n.diff, 50) && near(n.pct, 25),
      solution: { y2019: 200, y2023: 250 }
    }
  ]
};

/* ------------------------------ line graphs ------------------------------ */

const FIRST_YEAR = 2016;
/** Subscribers (thousand), 2016 to 2023: the biggest jumps come late, the fastest growth early. */
const SUBSCRIBERS = [20, 30, 36, 45, 60, 66, 84, 106];
const LAST_YEAR = FIRST_YEAR + SUBSCRIBERS.length - 1;
const LINE_YEARS = SUBSCRIBERS.map((_, i) => String(FIRST_YEAR + i));

export const diLineGraphs = {
  id: 'di-line-graphs',
  topicId: 'di-line-graphs',
  title: 'The biggest rise or the fastest growth?',
  summary: 'Slide a window over eight years of a line graph. The year with the largest rise and the year with the largest % rise are often not the same.',
  controls: [
    { id: 'from', label: 'Window from', type: 'range', min: FIRST_YEAR, max: LAST_YEAR, step: 1, default: FIRST_YEAR, plain: true },
    { id: 'to', label: 'Window to', type: 'range', min: FIRST_YEAR, max: LAST_YEAR, step: 1, default: LAST_YEAR, plain: true }
  ],
  compute({ from, to }) {
    const lo = Math.min(from, to) - FIRST_YEAR;
    const hi = Math.max(from, to) - FIRST_YEAR;
    const { list, largestRise, largestPct, smallestPct } = steps(SUBSCRIBERS, lo, hi);
    const span = (step) => `${LINE_YEARS[step.from]}–${LINE_YEARS[step.from + 1]}`;
    const rise = SUBSCRIBERS[hi] - SUBSCRIBERS[lo];
    const overall = percentChange(SUBSCRIBERS[lo], SUBSCRIBERS[hi]);
    const same = list.length > 0 && largestRise.from === largestPct.from;
    const highlights = !list.length
      ? []
      : same
        ? [{ from: largestRise.from, colorToken: 'geometry', label: `+${show(largestRise.rise)} (${signedPercent(largestRise.pct, 1)})` }]
        : [
            { from: largestRise.from, colorToken: 'combinatorics', label: `+${show(largestRise.rise)}` },
            { from: largestPct.from, colorToken: 'geometry', label: signedPercent(largestPct.pct, 1) }
          ];
    const legend = !list.length
      ? []
      : same
        ? [{ label: `Largest rise and largest % rise: ${span(largestRise)}`, colorToken: 'geometry' }]
        : [
            { label: `Largest rise: ${span(largestRise)}`, colorToken: 'combinatorics' },
            { label: `Largest % rise: ${span(largestPct)}`, colorToken: 'geometry' }
          ];
    const baseOf = (step) => SUBSCRIBERS[step.from];
    return {
      numbers: {
        lo,
        hi,
        steps: list.length,
        riseFrom: largestRise ? largestRise.from : -1,
        pctFrom: largestPct ? largestPct.from : -1,
        smallestPctFrom: smallestPct ? smallestPct.from : -1,
        maxPct: largestPct ? largestPct.pct : 0,
        overall
      },
      readouts: [
        { label: 'Window', value: lo === hi ? `${LINE_YEARS[lo]} only` : `${LINE_YEARS[lo]}–${LINE_YEARS[hi]}` },
        {
          label: 'Largest rise (in thousands)',
          value: largestRise ? `+${show(largestRise.rise)} in ${span(largestRise)} (${signedPercent(largestRise.pct, 1)})` : '—'
        },
        { label: 'Largest % rise', value: largestPct ? `${signedPercent(largestPct.pct, 1)} in ${span(largestPct)} (+${show(largestPct.rise)})` : '—' },
        { label: 'Over the whole window', value: lo === hi ? '—' : `${signed(rise)} (${signedPercent(overall, 1)})` }
      ],
      plot: {
        kind: 'chart',
        chart: {
          type: 'line',
          categories: LINE_YEARS,
          window: { from: lo, to: hi },
          series: [{ label: 'Subscribers (thousand)', data: SUBSCRIBERS, colorToken: 'algebra', highlights }],
          legend: [{ label: 'Subscribers (thousand)', colorToken: 'algebra' }, ...legend]
        },
        summary: `Subscribers in thousands, ${LINE_YEARS.map((year, i) => `${year} ${SUBSCRIBERS[i]}`).join(', ')}. ${
          list.length
            ? `From ${LINE_YEARS[lo]} to ${LINE_YEARS[hi]} the largest rise is ${span(largestRise)} and the largest % rise is ${span(largestPct)}.`
            : 'The window holds a single year.'
        }`
      },
      insight: !list.length
        ? 'Widen the window to at least two years to see a rise.'
        : list.length === 1
          ? `One step: a rise of ${show(largestRise.rise)} on a base of ${show(baseOf(largestRise))} is ${signedPercent(largestRise.pct, 1)}.`
          : same
            ? `In this window the largest rise, +${show(largestRise.rise)} in ${span(largestRise)}, is also the largest % rise (${signedPercent(largestRise.pct, 1)}).`
            : `The largest rise is +${show(largestRise.rise)} in ${span(largestRise)}, but on a base of ${show(baseOf(largestRise))} that is only ${signedPercent(largestRise.pct, 1)}. The largest % rise is ${span(largestPct)}: +${show(largestPct.rise)} on a base of just ${show(baseOf(largestPct))}. A % rise divides by the starting value.`
    };
  },
  tasks: [
    {
      id: 'same',
      prompt: 'Find a window of at least three years where the largest rise is also the largest % rise.',
      check: (values, n) => n.steps >= 2 && n.riseFrom === n.pctFrom,
      solution: { from: 2018, to: 2020 }
    },
    {
      id: 'opposite',
      prompt: 'Find a window of at least three years where the largest rise is the smallest % rise.',
      check: (values, n) => n.steps >= 2 && n.riseFrom === n.smallestPctFrom,
      solution: { from: 2021, to: 2023 }
    },
    {
      id: 'double',
      prompt: 'Find a window in which subscribers double (+100% or more), though no single year rose by more than 33⅓%.',
      check: (values, n) => n.overall >= 100 - 1e-9 && n.maxPct <= 100 / 3 + 1e-9,
      solution: { from: 2017, to: 2020 }
    }
  ]
};

/* ------------------------------ pie charts ------------------------------ */

const SLICES = [
  { id: 'rent', label: 'Rent' },
  { id: 'food', label: 'Food' },
  { id: 'travel', label: 'Travel' },
  { id: 'savings', label: 'Savings' }
];

export const diPieCharts = {
  id: 'di-pie-charts',
  topicId: 'di-pie-charts',
  title: 'Angles, percentages and amounts in a pie',
  summary: 'Resize the slices of a monthly budget and set the total. Every 1% of a pie is 3.6°, and a slice is worth total × angle ÷ 360°.',
  controls: [
    { id: 'sector', label: 'Look at', type: 'choice', options: SLICES.map(({ id, label }) => ({ id, label })), default: 'rent' },
    { id: 'rent', label: 'Rent', type: 'range', min: 5, max: 40, step: 1, default: 35, unit: '%' },
    { id: 'food', label: 'Food', type: 'range', min: 5, max: 30, step: 1, default: 30, unit: '%' },
    { id: 'travel', label: 'Travel (Savings is the rest)', type: 'range', min: 5, max: 25, step: 1, default: 15, unit: '%' },
    { id: 'total', label: 'Monthly budget (the total)', type: 'range', min: 10000, max: 120000, step: 2000, default: 50000, unit: '₹' }
  ],
  compute({ sector, rent, food, travel, total }) {
    // The three sliders top out at 95% between them, so Savings always keeps at least 5%.
    const shares = [rent, food, travel, 100 - rent - food - travel];
    const k = SLICES.findIndex((slice) => slice.id === sector);
    const name = SLICES[k].label;
    const share = shares[k];
    const angle = share * 3.6;
    const amount = (total * angle) / 360;
    const angleOf = (s) => `${show(s * 3.6, 1)}°`;
    return {
      numbers: { shares, share, angle, amount, total },
      readouts: [
        { label: `${name}: share of the pie`, value: `${show(share)}%` },
        { label: 'Angle = share × 3.6°', value: `${show(share)} × 3.6° = ${angleOf(share)}` },
        { label: 'Amount = total × angle ÷ 360°', value: `₹${show(amount)}` },
        { label: '1% of the total (3.6° of the pie)', value: `₹${show(total / 100)}` }
      ],
      plot: {
        kind: 'chart',
        chart: {
          type: 'pie',
          categories: SLICES.map((slice) => slice.label),
          series: [{ data: shares }],
          selected: k,
          sectorLabels: shares.map(angleOf),
          legendLabels: SLICES.map((slice, i) => `${slice.label}: ${show(shares[i])}% = ${angleOf(shares[i])} = ₹${show((total * shares[i]) / 100)}`)
        },
        summary: `A monthly budget of ₹${show(total)}: ${SLICES.map((slice, i) => `${slice.label} ${show(shares[i])}% (${angleOf(shares[i])})`).join(', ')}.`
      },
      insight: near(angle, 90)
        ? `${name} is a quarter of the pie: 25% × 3.6° = 90°, a right angle, and a quarter of ₹${show(total)} is ₹${show(amount)}.`
        : `Every 1% of a pie is 360° ÷ 100 = 3.6°, so ${show(share)}% is ${angleOf(share)}. Its amount is ₹${show(total)} × ${angleOf(share)} ÷ 360° = ₹${show(amount)}.${
            sector === 'savings' ? ` Savings is what the others leave: 100% − ${show(100 - share)}%.` : ''
          }`
    };
  },
  tasks: [
    {
      id: 'right-angle',
      prompt: 'Make the slice you are looking at exactly a right angle (90°). What share is that?',
      check: (values, n) => near(n.angle, 90),
      solution: { sector: 'rent', rent: 25 }
    },
    {
      id: 'amount',
      prompt: 'With a budget of ₹80,000, find the slice worth ₹12,000. What angle is it?',
      check: (values, n) => n.total === 80000 && near(n.amount, 12000),
      solution: { total: 80000, sector: 'travel' }
    },
    {
      id: 'savings',
      prompt: 'Squeeze Savings down to a 36° slice and look at it. What share is that?',
      check: (values, n) => values.sector === 'savings' && near(n.angle, 36),
      solution: { sector: 'savings', rent: 40, food: 30, travel: 20 }
    }
  ]
};

/* --------------------------------- tables --------------------------------- */

const TABLE_YEARS = ['2019', '2020', '2021', '2022', '2023'];
/** Sales (thousand units). Totals 100, 120, 125, 150, 160, so every share is a whole number. */
const ITEMS = [
  { id: 'phones', label: 'Phones', sales: [50, 60, 70, 75, 80] },
  { id: 'laptops', label: 'Laptops', sales: [30, 36, 30, 30, 40] },
  { id: 'tablets', label: 'Tablets', sales: [20, 24, 25, 45, 40] }
];
const TOTALS = TABLE_YEARS.map((_, y) => ITEMS.reduce((sum, item) => sum + item.sales[y], 0));
const shareOf = (sales, y) => (sales[y] / TOTALS[y]) * 100;

export const diTables = {
  id: 'di-tables',
  topicId: 'di-tables',
  title: 'Percentage points or per cent?',
  summary: 'Pick a base year and the table colours each cell by its change. A share going from 20% to 25% is up 5 percentage points, which is a 25% rise.',
  controls: [
    {
      id: 'view',
      label: 'Cells show',
      type: 'choice',
      options: [
        { id: 'change', label: '% change from base' },
        { id: 'share', label: 'Share of the total' },
        { id: 'sales', label: 'Sales' }
      ],
      default: 'change'
    },
    { id: 'base', label: 'Base year', type: 'choice', options: yearOptions(TABLE_YEARS), default: '2019' },
    { id: 'compare', label: 'Compare with', type: 'choice', options: yearOptions(TABLE_YEARS), default: '2022' },
    { id: 'item', label: 'Item', type: 'choice', options: ITEMS.map(({ id, label }) => ({ id, label })), default: 'tablets' }
  ],
  compute({ view, base, compare, item }) {
    const b = TABLE_YEARS.indexOf(base);
    const c = TABLE_YEARS.indexOf(compare);
    const focus = ITEMS.findIndex((entry) => entry.id === item);
    const { label, sales } = ITEMS[focus];
    const rows = [...ITEMS.map((entry) => ({ label: entry.label, sales: entry.sales })), { label: 'Total', sales: TOTALS, total: true }];

    const cell = (row, y) => {
      if (view === 'sales') return { text: show(row.sales[y]) };
      if (view === 'share') {
        if (row.total) return { text: '100%' };
        const share = shareOf(row.sales, y);
        if (y === b) return { text: `${show(share, 1)}%` };
        const pp = share - shareOf(row.sales, b);
        return { text: `${show(share, 1)}%`, note: `${signed(pp, 1)} pp`, heat: pp / 10 };
      }
      if (y === b) return { text: 'base' };
      const change = percentChange(row.sales[b], row.sales[y]);
      return { text: signedPercent(change, 1), heat: change / 80 };
    };

    const same = b === c;
    const valueChange = percentChange(sales[b], sales[c]);
    const shareBase = shareOf(sales, b);
    const shareCompare = shareOf(sales, c);
    const pp = shareCompare - shareBase;
    const sharePct = (pp / shareBase) * 100;
    const totalChange = percentChange(TOTALS[b], TOTALS[c]);
    const allSame = !same && ITEMS.every((entry) => near(percentChange(entry.sales[b], entry.sales[c]), totalChange));
    const caption = {
      change: `% change in sales from the base year, ${base}`,
      share: `Each item's share of that year's total (pp: percentage points from ${base})`,
      sales: 'Sales, thousand units'
    }[view];

    return {
      numbers: { same, valueChange, shareBase, shareCompare, pp, sharePct, allSame },
      readouts: [
        { label: `${label} sales, ${base} → ${compare}`, value: `${show(sales[b])} → ${show(sales[c])} (${signedPercent(valueChange, 1)})` },
        { label: `${label}: share of the total`, value:`${show(shareBase, 1)}% → ${show(shareCompare, 1)}%` },
        { label: 'Change in share, percentage points', value: `${signed(pp, 1)} pp` },
        { label: 'Change in share, per cent', value: signedPercent(sharePct, 1) }
      ],
      plot: {
        kind: 'table',
        caption,
        corner: 'Item',
        columns: TABLE_YEARS,
        rows: rows.map((row) => ({ label: row.label, total: Boolean(row.total), cells: TABLE_YEARS.map((_, y) => cell(row, y)) })),
        baseColumn: b,
        focusColumn: c,
        focusRow: focus,
        summary: `${caption}. ${label}, ${base} to ${compare}: sales ${signedPercent(valueChange, 1)}, share ${show(shareBase, 1)}% to ${show(shareCompare, 1)}%.`
      },
      insight: same
        ? 'Pick a different year to compare with the base.'
        : allSame
          ? `From ${base} to ${compare} every item changed by the same ${signedPercent(totalChange, 1)}, so no share moved: 0 percentage points each, though every number changed.`
          : near(valueChange, 0) && pp < 0
            ? `${label} sold the same, yet its share fell ${show(-pp, 1)} percentage points: the total grew around it.`
            : near(pp, 0)
              ? `The share of ${label} stayed at ${show(shareBase, 1)}%, though its sales changed ${signedPercent(valueChange, 1)}: it kept pace with the total.`
              : `The share of ${label} went from ${show(shareBase, 1)}% to ${show(shareCompare, 1)}%: ${signed(pp, 1)} percentage points (subtract the shares), but ${signedPercent(sharePct, 1)} as a percentage change (divide by the base share, ${show(shareBase, 1)}%).`
    };
  },
  tasks: [
    {
      id: 'points',
      prompt: 'Find a share that rose by exactly 5 percentage points. What % rise in the share is that?',
      check: (values, n) => !n.same && near(n.pp, 5),
      solution: { compare: '2023' }
    },
    {
      id: 'flat',
      prompt: 'Find an item whose sales did not change, yet whose share of the total fell.',
      check: (values, n) => !n.same && near(n.valueChange, 0) && n.pp < -1e-9,
      solution: { item: 'laptops' }
    },
    {
      id: 'same',
      prompt: 'Pick two years between which every item grew by the same %. What happened to the shares?',
      check: (values, n) => n.allSame,
      solution: { base: '2019', compare: '2020' }
    }
  ]
};

/* ---------------------------- data sufficiency ---------------------------- */

const CANDIDATES = Array.from({ length: 21 }, (_, i) => i - 10);
const isPrime = (x) => x > 1 && Array.from({ length: Math.floor(Math.sqrt(x)) - 1 }, (_, i) => i + 2).every((d) => x % d !== 0);
const PROBLEMS = {
  p1: { one: { text: 'x² = 16', test: (x) => x * x === 16 }, two: { text: 'x > 0', test: (x) => x > 0 } },
  p2: { one: { text: '3x − 5 = 16', test: (x) => 3 * x - 5 === 16 }, two: { text: 'x is a prime between 5 and 10', test: (x) => isPrime(x) && x > 5 && x < 10 } },
  p3: { one: { text: 'x is even', test: (x) => x % 2 === 0 }, two: { text: '|x| < 3', test: (x) => Math.abs(x) < 3 } }
};
const OPTIONS = {
  A: '(1) alone is enough, (2) alone is not',
  B: '(2) alone is enough, (1) alone is not',
  C: 'both together, but neither alone',
  D: 'each statement alone is enough',
  E: 'not even both together'
};
const listOf = (xs) => (xs.length === 0 ? 'none' : xs.length <= 6 ? xs.map((x) => show(x)).join(', ') : `${xs.length} values`);
const onOff = [
  { id: 'off', label: 'Off' },
  { id: 'on', label: 'On' }
];

export const dataSufficiency = {
  id: 'data-sufficiency',
  topicId: 'data-sufficiency',
  title: 'Is it enough? Watch the answers shrink',
  summary: 'Switch each statement on and watch the set of possible answers shrink. The data is sufficient only when exactly one value is left.',
  controls: [
    {
      id: 'problem',
      label: 'Problem',
      type: 'choice',
      options: [
        { id: 'p1', label: 'Problem 1' },
        { id: 'p2', label: 'Problem 2' },
        { id: 'p3', label: 'Problem 3' }
      ],
      default: 'p1'
    },
    { id: 'one', label: 'Statement (1)', type: 'choice', options: onOff, default: 'off' },
    { id: 'two', label: 'Statement (2)', type: 'choice', options: onOff, default: 'off' }
  ],
  compute({ problem, one, two }) {
    const p = PROBLEMS[problem];
    const set1 = CANDIDATES.filter(p.one.test);
    const set2 = CANDIDATES.filter(p.two.test);
    const together = set1.filter(p.two.test);
    const on1 = one === 'on';
    const on2 = two === 'on';
    const left = CANDIDATES.filter((x) => (!on1 || p.one.test(x)) && (!on2 || p.two.test(x)));
    const option = dsOption(set1.length === 1, set2.length === 1, together.length === 1);
    const switched = on1 && on2 ? '(1) and (2)' : on1 ? '(1) alone' : on2 ? '(2) alone' : 'None yet';
    return {
      numbers: { on1, on2, left: left.length, option },
      readouts: [
        { label: 'Statements on', value: switched },
        { label: 'Possible values of x', value: listOf(left) },
        { label: 'Enough to answer?', value: left.length === 1 ? `Yes: x = ${show(left[0])}` : `No: ${left.length} values remain` },
        { label: 'DS answer for this problem', value: `${option}: ${OPTIONS[option]}` }
      ],
      plot: {
        kind: 'candidates',
        min: CANDIDATES[0],
        max: CANDIDATES[CANDIDATES.length - 1],
        title: 'x is an integer from −10 to 10. What is x?',
        badge: `DS answer: ${option}`,
        rows: [
          { label: `(1) ${p.one.text}`, values: set1, on: on1, tone: 'algebra' },
          { label: `(2) ${p.two.text}`, values: set2, on: on2, tone: 'combinatorics' },
          {
            label: left.length === 1 ? `Possible x: just ${show(left[0])}, so sufficient` : `Possible x: ${left.length} values, not sufficient`,
            values: left,
            tone: 'geometry',
            result: true
          }
        ],
        summary: `Statement (1): ${p.one.text}. Statement (2): ${p.two.text}. With ${switched.toLowerCase()} switched on, the possible values of x are ${listOf(left)}. The answer is ${option}.`
      },
      insight:
        !on1 && !on2
          ? 'With no statement, x could be any of the 21 integers. Switch statement (1) on, then (2), and watch the set shrink.'
          : left.length === 1
            ? `One value is left, x = ${show(left[0])}: what is switched on is sufficient.${
                on1 && on2 && option === 'C' ? ' Neither statement did it alone, so the answer is C.' : ''
              }`
            : on1 && on2
              ? `Even both statements together leave ${left.length} values (${listOf(left)}), so the answer is E.`
              : `${left.length} values remain (${listOf(left)}), so this is not sufficient: sufficient means exactly one answer, not "some answers".`
    };
  },
  tasks: [
    {
      id: 'two-roots',
      prompt: 'In problem 1, switch on statement (1) alone. Why is x² = 16 not enough?',
      check: (values) => values.problem === 'p1' && values.one === 'on' && values.two === 'off',
      solution: { problem: 'p1', one: 'on' }
    },
    {
      id: 'together',
      prompt: 'Find a problem where neither statement alone is enough but both together are (answer C), and switch both on.',
      check: (values, n) => n.option === 'C' && n.on1 && n.on2,
      solution: { problem: 'p1', one: 'on', two: 'on' }
    },
    {
      id: 'each',
      prompt: 'Find the problem where each statement alone is enough (answer D), and show it with just one statement on.',
      check: (values, n) => n.option === 'D' && n.on1 !== n.on2 && n.left === 1,
      solution: { problem: 'p2', one: 'on' }
    },
    {
      id: 'never',
      prompt: 'Find the problem where even both statements leave more than one value (answer E), with both on.',
      check: (values, n) => n.option === 'E' && n.on1 && n.on2,
      solution: { problem: 'p3', one: 'on', two: 'on' }
    }
  ]
};

export const dataSims = [diBarGraphs, diLineGraphs, diPieCharts, diTables, dataSufficiency];
