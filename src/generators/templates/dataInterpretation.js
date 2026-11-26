/**
 * Data interpretation templates: tables, bar graphs, line graphs, pie charts
 * and caselets. Each instance generates its own data (as a table or chart the
 * learner reads) with one cell engineered so the asked-for figure is clean;
 * the independent checks recompute from the rendered data itself.
 */

import { fmt, format, nearlyEqual } from '../core.js';

const COLORS = ['data', 'algebra', 'geometry', 'advanced'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const PRODUCTS = ['Product A', 'Product B', 'Product C'];
const STORES = ['Store A', 'Store B', 'Store C'];
const COMPANIES = ['Company X', 'Company Y'];
const COMPANIES4 = ['Company W', 'Company X', 'Company Y', 'Company Z'];
const STATES = ['P', 'Q', 'R', 'S'];
/* Qualifying rates close enough that ranking them takes care; each is a whole number of candidates per 400. */
const CLOSE_RATES = [30, 32, 32.5, 34, 35, 36, 37.5, 38, 40, 42, 44, 45];

/* Percentage changes that turn a multiple of 20 into a whole number. */
const CHANGES = [-40, -25, -20, -15, -10, 10, 15, 20, 25, 30, 40, 50, 60, 75];

const sum = (list) => list.reduce((acc, v) => acc + v, 0);
const years = (rng, n) => {
  const start = rng.int(2015, 2020);
  return Array.from({ length: n }, (_, i) => String(start + i));
};

/** An old value and a new one exactly `pct`% away from it. */
function changePair(rng) {
  const old = 20 * rng.int(4, 12);
  const pct = rng.pick(CHANGES);
  return { old, pct, next: old + (old * pct) / 100 };
}

/** Three positive multiples of 5 adding to `total`, the first being `share`% of it. */
function splitWithShare(rng, total, share) {
  const first = (total * share) / 100;
  const rest = total - first;
  if (!Number.isInteger(first) || first % 5 || rest < 40) return null;
  const second = 5 * rng.int(4, rest / 5 - 4);
  const third = rest - second;
  return third >= 20 ? [first, second, third] : null;
}

function percentChangeText({ old, next, pct }) {
  const rise = pct > 0;
  return {
    rise,
    steps: [`Change: ${fmt(next)} − ${fmt(old)} = ${fmt(next - old)}.`, `${fmt(Math.abs(next - old))} ÷ ${fmt(old)} × 100 = ${fmt(Math.abs(pct))}%.`],
    explanation: `Percentage ${rise ? 'increase' : 'decrease'} = change ÷ original × 100 = ${fmt(Math.abs(next - old))} ÷ ${fmt(old)} × 100 = ${fmt(Math.abs(pct))}%.`
  };
}

/** Recompute a percentage change from the two values, the other way round: new = old × (1 ± p/100). */
const checkChange = (old, next, rise, value) => nearlyEqual(next, old * (1 + ((rise ? 1 : -1) * value) / 100));

const tableOf = (caption, headers, rowLabels, rows) => ({
  caption,
  headers,
  rows: rows.map((row, i) => [rowLabels[i], ...row.map((v) => fmt(v))])
});

function chartOf(type, caption, unit, categories, series) {
  const summary = series.map((s) => `${s.label}: ${categories.map((c, i) => `${c} ${fmt(s.data[i])}`).join(', ')}`).join('. ');
  return {
    type,
    caption,
    unit,
    categories,
    series: series.map((s, i) => ({ label: s.label, data: s.data, ...(type === 'pie' ? {} : { colorToken: COLORS[i] }) })),
    ariaSummary: `${caption}. ${summary}.`
  };
}

const randomRow = (rng, n) => Array.from({ length: n }, () => 10 * rng.int(6, 24));

/** Index of the single largest value, or −1 if the largest is tied. */
function uniqueMaxIndex(values) {
  const best = Math.max(...values);
  return values.filter((v) => v === best).length === 1 ? values.indexOf(best) : -1;
}

export const dataInterpretationTemplates = [
  /* ================================== tables ================================== */
  {
    id: 'dt-total',
    version: 1,
    topicId: 'di-tables',
    conceptId: 'di-totals',
    difficulty: 'easy',
    type: 'numerical_input',
    estimatedSeconds: 45,
    params(rng) {
      const yrs = years(rng, 4);
      return { yrs, rows: yrs.map(() => randomRow(rng, 3)), byProduct: rng.chance(0.5), pick: rng.int(0, 2) };
    },
    answer: ({ rows, byProduct, pick }) => (byProduct ? sum(rows.map((r) => r[pick])) : sum(rows[pick])),
    // Grand total minus everything outside the asked-for column or row.
    verify({ rows, byProduct, pick }, value) {
      const grand = sum(rows.flat());
      const outside = byProduct ? sum(rows.flatMap((r) => r.filter((_, j) => j !== pick))) : sum(rows.filter((_, i) => i !== pick).flat());
      return grand - outside === value;
    },
    render({ yrs, rows, byProduct, pick }) {
      const values = byProduct ? rows.map((r) => r[pick]) : rows[pick];
      const answer = sum(values);
      return {
        context: 'Study the table of annual sales (in ₹ lakh) and answer the question.',
        table: tableOf('Annual sales by product (₹ lakh)', ['Year', ...PRODUCTS], yrs, rows),
        question: byProduct
          ? `What were the total sales of ${PRODUCTS[pick]} over the four years, in ₹ lakh?`
          : `What were the total sales of all three products in ${yrs[pick]}, in ₹ lakh?`,
        explanation: `Add the ${byProduct ? `${PRODUCTS[pick]} column` : `${yrs[pick]} row`}: ${values.map((v) => fmt(v)).join(' + ')} = ${fmt(answer)}.`,
        solutionSteps: [`Read the ${byProduct ? 'column' : 'row'}: ${values.map((v) => fmt(v)).join(', ')}.`, `Sum = ${fmt(answer)}.`],
        method: byProduct ? 'Add down the product\'s column.' : 'Add across the year\'s row.',
        hints: [byProduct ? `Look down the ${PRODUCTS[pick]} column.` : `Look across the ${yrs[pick]} row.`, 'Add the values you find.'],
        commonMistakes: [byProduct ? 'Adding a row instead of a column.' : 'Adding a column instead of a row.']
      };
    }
  },

  {
    id: 'dt-percent-change',
    version: 1,
    topicId: 'di-tables',
    conceptId: 'di-change',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: '%',
    formulaIds: ['di-growth'],
    answerDecimals: 1,
    estimatedSeconds: 70,
    params(rng) {
      const yrs = years(rng, 4);
      const rows = yrs.map(() => randomRow(rng, 3));
      const product = rng.int(0, 2);
      const from = rng.int(0, 2);
      const to = rng.int(from + 1, 3);
      const change = changePair(rng);
      rows[from][product] = change.old;
      rows[to][product] = change.next;
      return { yrs, rows, product, from, to };
    },
    answer: ({ rows, product, from, to }) => (Math.abs(rows[to][product] - rows[from][product]) / rows[from][product]) * 100,
    verify: ({ rows, product, from, to }, value) => checkChange(rows[from][product], rows[to][product], rows[to][product] > rows[from][product], value),
    render({ yrs, rows, product, from, to }) {
      const old = rows[from][product];
      const next = rows[to][product];
      const pct = ((next - old) / old) * 100;
      const text = percentChangeText({ old, next, pct });
      return {
        context: 'Study the table of annual sales (in ₹ lakh) and answer the question.',
        table: tableOf('Annual sales by product (₹ lakh)', ['Year', ...PRODUCTS], yrs, rows),
        question: `By what percentage did sales of ${PRODUCTS[product]} ${text.rise ? 'increase' : 'decrease'} from ${yrs[from]} to ${yrs[to]}?`,
        explanation: `${PRODUCTS[product]}: ${fmt(old)} in ${yrs[from]} and ${fmt(next)} in ${yrs[to]}. ${text.explanation}`,
        solutionSteps: text.steps,
        method: 'Percentage change = (new − old) ÷ old × 100.',
        hints: [`Read ${PRODUCTS[product]} for ${yrs[from]} and ${yrs[to]}.`, `Divide the change by the ${yrs[from]} value, the starting point.`],
        commonMistakes: ['Dividing by the new value instead of the original.']
      };
    }
  },

  {
    id: 'dt-share-of-total',
    version: 1,
    topicId: 'di-tables',
    conceptId: 'di-comparison',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: '%',
    formulaIds: ['di-share'],
    estimatedSeconds: 60,
    params(rng) {
      const yrs = years(rng, 4);
      const rows = yrs.map(() => randomRow(rng, 3));
      const year = rng.int(0, 3);
      const product = rng.int(0, 2);
      const split = splitWithShare(rng, rng.pick([200, 250, 300, 400, 500]), rng.pick([10, 20, 25, 30, 40, 50]));
      if (!split) return null;
      const [mine, a, b] = split;
      const others = [0, 1, 2].filter((j) => j !== product);
      rows[year][product] = mine;
      rows[year][others[0]] = a;
      rows[year][others[1]] = b;
      return { yrs, rows, year, product };
    },
    answer: ({ rows, year, product }) => (rows[year][product] / sum(rows[year])) * 100,
    verify: ({ rows, year, product }, value) => nearlyEqual((value / 100) * sum(rows[year]), rows[year][product]),
    render({ yrs, rows, year, product }) {
      const total = sum(rows[year]);
      const mine = rows[year][product];
      return {
        context: 'Study the table of annual sales (in ₹ lakh) and answer the question.',
        table: tableOf('Annual sales by product (₹ lakh)', ['Year', ...PRODUCTS], yrs, rows),
        question: `In ${yrs[year]}, what percentage of that year's total sales came from ${PRODUCTS[product]}?`,
        explanation: `${yrs[year]} total = ${rows[year].map((v) => fmt(v)).join(' + ')} = ${fmt(total)}. Share = ${fmt(mine)} ÷ ${fmt(total)} × 100 = ${fmt((mine / total) * 100)}%.`,
        solutionSteps: [`Total for ${yrs[year]}: ${fmt(total)}.`, `${fmt(mine)} ÷ ${fmt(total)} × 100 = ${fmt((mine / total) * 100)}%.`],
        method: 'Share = part ÷ whole × 100.',
        hints: [`Add the whole ${yrs[year]} row first.`, `Then divide ${PRODUCTS[product]}'s figure by that total.`],
        commonMistakes: ['Dividing by the product\'s total over all years instead of the year\'s total.']
      };
    }
  },

  {
    id: 'dt-largest-gap',
    version: 1,
    topicId: 'di-tables',
    conceptId: 'di-comparison',
    difficulty: 'complex',
    type: 'single_choice',
    estimatedSeconds: 70,
    formatValue: (value) => value,
    params(rng) {
      const yrs = years(rng, 4);
      const rows = yrs.map(() => randomRow(rng, 3));
      const [p, q] = rng.shuffle([0, 1, 2]).slice(0, 2);
      const gaps = rows.map((r) => Math.abs(r[p] - r[q]));
      const best = uniqueMaxIndex(gaps);
      if (best < 0 || gaps[best] === 0) return null;
      return { yrs, rows, p, q, best };
    },
    answer: ({ yrs, best }) => yrs[best],
    distractors: ({ yrs, best }) => yrs.filter((_, i) => i !== best).map((value) => ({ value, why: 'a smaller gap' })),
    verify: ({ yrs, rows, p, q }, year) => {
      const i = yrs.indexOf(year);
      return rows.every((r) => Math.abs(r[p] - r[q]) <= Math.abs(rows[i][p] - rows[i][q]));
    },
    render({ yrs, rows, p, q, best }) {
      const gaps = rows.map((r) => Math.abs(r[p] - r[q]));
      return {
        context: 'Study the table of annual sales (in ₹ lakh) and answer the question.',
        table: tableOf('Annual sales by product (₹ lakh)', ['Year', ...PRODUCTS], yrs, rows),
        question: `In which year was the difference between the sales of ${PRODUCTS[p]} and ${PRODUCTS[q]} the greatest?`,
        explanation: `Differences by year: ${yrs.map((y, i) => `${y}: ${fmt(gaps[i])}`).join(', ')}. The largest is ${fmt(gaps[best])}, in ${yrs[best]}.`,
        solutionSteps: yrs.map((y, i) => `${y}: |${fmt(rows[i][p])} − ${fmt(rows[i][q])}| = ${fmt(gaps[i])}.`),
        method: 'Work out the gap for every year, then compare.',
        hints: ['Subtract the smaller from the larger in each row.', 'The gap matters, not which product is ahead.'],
        commonMistakes: [`Picking the year where ${PRODUCTS[p]} alone was highest.`]
      };
    }
  },

  /* ================================ bar graphs ================================ */
  {
    id: 'bg-months-ahead',
    version: 1,
    topicId: 'di-bar-graphs',
    conceptId: 'bg-compare',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['bg-read-f'],
    estimatedSeconds: 40,
    params(rng) {
      const a = MONTHS.map(() => 5 * rng.int(6, 20));
      const b = MONTHS.map(() => 5 * rng.int(6, 20));
      if (a.some((v, i) => v === b[i])) return null;
      const count = a.filter((v, i) => v > b[i]).length;
      if (count === 0 || count === MONTHS.length) return null;
      return { a, b, first: rng.int(0, 1) };
    },
    answer: ({ a, b, first }) => (first === 0 ? a : b).filter((v, i) => v > (first === 0 ? b : a)[i]).length,
    verify({ a, b, first }, value) {
      let count = 0;
      for (let i = 0; i < MONTHS.length; i++) if (Math.sign((first === 0 ? a : b)[i] - (first === 0 ? b : a)[i]) === 1) count++;
      return count === value;
    },
    render({ a, b, first }) {
      const [me, other] = first === 0 ? ['Store A', 'Store B'] : ['Store B', 'Store A'];
      const mine = first === 0 ? a : b;
      const theirs = first === 0 ? b : a;
      const months = MONTHS.filter((_, i) => mine[i] > theirs[i]);
      return {
        context: 'Study the bar graph of monthly sales and answer the question.',
        chart: chartOf('bar', 'Monthly sales of two stores (₹ thousand)', '₹ thousand', MONTHS, [
          { label: 'Store A', data: a },
          { label: 'Store B', data: b }
        ]),
        question: `In how many of the six months did ${me} sell more than ${other}?`,
        explanation: `${me} was ahead in ${months.join(', ')}: ${months.length} month${months.length === 1 ? '' : 's'}.`,
        solutionSteps: MONTHS.map((m, i) => `${m}: ${fmt(mine[i])} vs ${fmt(theirs[i])} → ${mine[i] > theirs[i] ? `${me} ahead` : `${other} ahead`}.`),
        method: 'Compare the two bars month by month and count.',
        hints: ['Compare the pair of bars for each month.', `Count only the months where ${me}'s bar is taller.`],
        commonMistakes: [`Counting the months where ${other} was ahead.`]
      };
    }
  },

  {
    id: 'bg-growth',
    version: 1,
    topicId: 'di-bar-graphs',
    conceptId: 'bg-growth',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: '%',
    formulaIds: ['bg-growth-f'],
    estimatedSeconds: 60,
    params(rng) {
      const data = MONTHS.slice(0, 5).map(() => 10 * rng.int(6, 24));
      const from = rng.int(0, 3);
      const to = rng.int(from + 1, 4);
      const change = changePair(rng);
      data[from] = change.old;
      data[to] = change.next;
      return { data, from, to };
    },
    answer: ({ data, from, to }) => (Math.abs(data[to] - data[from]) / data[from]) * 100,
    verify: ({ data, from, to }, value) => checkChange(data[from], data[to], data[to] > data[from], value),
    render({ data, from, to }) {
      const months = MONTHS.slice(0, 5);
      const old = data[from];
      const next = data[to];
      const text = percentChangeText({ old, next, pct: ((next - old) / old) * 100 });
      return {
        context: 'Study the bar graph of monthly sales and answer the question.',
        chart: chartOf('bar', 'Monthly sales of a store (₹ thousand)', '₹ thousand', months, [{ label: 'Sales', data }]),
        question: `By what percentage did sales ${text.rise ? 'increase' : 'decrease'} from ${months[from]} to ${months[to]}?`,
        explanation: `Sales were ${fmt(old)} in ${months[from]} and ${fmt(next)} in ${months[to]}. ${text.explanation}`,
        solutionSteps: text.steps,
        method: 'Percentage change = (new − old) ÷ old × 100.',
        hints: [`Read the ${months[from]} and ${months[to]} bars.`, `Divide the change by the ${months[from]} value.`],
        commonMistakes: ['Dividing by the later month\'s value.']
      };
    }
  },

  {
    id: 'bg-share',
    version: 1,
    topicId: 'di-bar-graphs',
    conceptId: 'bg-share',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: '%',
    formulaIds: ['bg-share-f'],
    estimatedSeconds: 75,
    params(rng) {
      const series = STORES.map(() => MONTHS.slice(0, 5).map(() => 5 * rng.int(6, 20)));
      const month = rng.int(0, 4);
      const store = rng.int(0, 2);
      const split = splitWithShare(rng, rng.pick([150, 200, 250]), rng.pick([20, 30, 40, 50]));
      if (!split) return null;
      const others = [0, 1, 2].filter((s) => s !== store);
      series[store][month] = split[0];
      series[others[0]][month] = split[1];
      series[others[1]][month] = split[2];
      return { series, month, store };
    },
    answer: ({ series, month, store }) => (series[store][month] / sum(series.map((s) => s[month]))) * 100,
    verify: ({ series, month, store }, value) => nearlyEqual((value / 100) * sum(series.map((s) => s[month])), series[store][month]),
    render({ series, month, store }) {
      const months = MONTHS.slice(0, 5);
      const column = series.map((s) => s[month]);
      const total = sum(column);
      return {
        context: 'Study the bar graph of monthly sales and answer the question.',
        chart: chartOf('bar', 'Monthly sales of three stores (₹ thousand)', '₹ thousand', months, STORES.map((label, i) => ({ label, data: series[i] }))),
        question: `In ${months[month]}, what percentage of the three stores' combined sales was made by ${STORES[store]}?`,
        explanation: `${months[month]} combined = ${column.map((v) => fmt(v)).join(' + ')} = ${fmt(total)}. ${STORES[store]}'s share = ${fmt(column[store])} ÷ ${fmt(total)} × 100 = ${fmt((column[store] / total) * 100)}%.`,
        solutionSteps: [`Combined in ${months[month]}: ${fmt(total)}.`, `${fmt(column[store])} ÷ ${fmt(total)} × 100 = ${fmt((column[store] / total) * 100)}%.`],
        method: 'Share = one bar ÷ the sum of that month\'s bars × 100.',
        hints: [`Add all three bars for ${months[month]}.`, `Divide ${STORES[store]}'s bar by that total.`],
        commonMistakes: [`Dividing by ${STORES[store]}'s total over all months.`]
      };
    }
  },

  /* ================================ line graphs ================================ */
  {
    id: 'lng-average',
    version: 1,
    topicId: 'di-line-graphs',
    conceptId: 'lng-average',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['lng-read-f'],
    estimatedSeconds: 50,
    params(rng) {
      const yrs = years(rng, 5);
      return { yrs, x: yrs.map(() => 5 * rng.int(4, 20)), y: yrs.map(() => 5 * rng.int(4, 20)), which: rng.int(0, 1) };
    },
    // Multiples of 5, five of them: the total is a multiple of 5, so the mean is whole.
    answer: ({ x, y, which }) => sum(which ? y : x) / 5,
    verify: ({ x, y, which }, value) => (which ? y : x).reduce((acc, v) => acc + (v - value), 0) === 0,
    render({ yrs, x, y, which }) {
      const data = which ? y : x;
      return {
        context: 'Study the line graph of annual profits and answer the question.',
        chart: chartOf('line', 'Annual profit of two companies (₹ crore)', '₹ crore', yrs, [
          { label: COMPANIES[0], data: x },
          { label: COMPANIES[1], data: y }
        ]),
        question: `What was ${COMPANIES[which]}'s average annual profit over these five years, in ₹ crore?`,
        explanation: `Total = ${data.map((v) => fmt(v)).join(' + ')} = ${fmt(sum(data))}. Average = ${fmt(sum(data))} ÷ 5 = ${fmt(sum(data) / 5)}.`,
        solutionSteps: [`Read ${COMPANIES[which]}'s five values.`, `Sum = ${fmt(sum(data))}.`, `${fmt(sum(data))} ÷ 5 = ${fmt(sum(data) / 5)}.`],
        method: 'Average = total ÷ number of years.',
        hints: [`Follow only ${COMPANIES[which]}'s line.`, 'Add the five values, then divide by 5.'],
        commonMistakes: ['Reading values from the other company\'s line.']
      };
    }
  },

  {
    id: 'lng-steepest-rise',
    version: 1,
    topicId: 'di-line-graphs',
    conceptId: 'lng-trend',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['lng-read-f'],
    estimatedSeconds: 55,
    formatValue: (value) => value,
    params(rng) {
      const yrs = years(rng, 5);
      const x = yrs.map(() => 5 * rng.int(4, 20));
      const rises = x.slice(1).map((v, i) => v - x[i]);
      const best = uniqueMaxIndex(rises);
      if (best < 0 || rises[best] <= 0) return null;
      return { yrs, x, y: yrs.map(() => 5 * rng.int(4, 20)), best };
    },
    answer: ({ yrs, best }) => `${yrs[best]} to ${yrs[best + 1]}`,
    distractors: ({ yrs, best }) => [0, 1, 2, 3].filter((i) => i !== best).map((i) => ({ value: `${yrs[i]} to ${yrs[i + 1]}`, why: 'a smaller rise' })),
    verify({ yrs, x }, text) {
      const i = yrs.indexOf(text.split(' to ')[0]);
      const rise = x[i + 1] - x[i];
      return x.slice(1).every((v, j) => v - x[j] <= rise);
    },
    render({ yrs, x, y, best }) {
      const rises = x.slice(1).map((v, i) => v - x[i]);
      return {
        context: 'Study the line graph of annual profits and answer the question.',
        chart: chartOf('line', 'Annual profit of two companies (₹ crore)', '₹ crore', yrs, [
          { label: COMPANIES[0], data: x },
          { label: COMPANIES[1], data: y }
        ]),
        question: `Between which two consecutive years did ${COMPANIES[0]}'s profit rise the most?`,
        explanation: `Year-on-year changes for ${COMPANIES[0]}: ${rises.map((r, i) => `${yrs[i]}–${yrs[i + 1]}: ${r >= 0 ? '+' : '−'}${fmt(Math.abs(r))}`).join(', ')}. The biggest rise is +${fmt(rises[best])}, from ${yrs[best]} to ${yrs[best + 1]}.`,
        solutionSteps: rises.map((r, i) => `${yrs[i]} → ${yrs[i + 1]}: ${fmt(x[i + 1])} − ${fmt(x[i])} = ${r >= 0 ? '' : '−'}${fmt(Math.abs(r))}.`),
        method: 'The steepest upward segment of the line is the biggest rise.',
        hints: [`Follow ${COMPANIES[0]}'s line only.`, 'Subtract each year from the next and compare.'],
        commonMistakes: ['Picking the year with the highest profit instead of the biggest increase.']
      };
    }
  },

  {
    id: 'lng-growth',
    version: 1,
    topicId: 'di-line-graphs',
    conceptId: 'lng-growth',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: '%',
    formulaIds: ['lng-growth-f'],
    estimatedSeconds: 60,
    params(rng) {
      const yrs = years(rng, 5);
      const x = yrs.map(() => 10 * rng.int(4, 24));
      const y = yrs.map(() => 10 * rng.int(4, 24));
      const from = rng.int(0, 3);
      const to = rng.int(from + 1, 4);
      const change = changePair(rng);
      const which = rng.int(0, 1);
      const data = which ? y : x;
      data[from] = change.old;
      data[to] = change.next;
      return { yrs, x, y, which, from, to };
    },
    answer({ x, y, which, from, to }) {
      const data = which ? y : x;
      return (Math.abs(data[to] - data[from]) / data[from]) * 100;
    },
    verify({ x, y, which, from, to }, value) {
      const data = which ? y : x;
      return checkChange(data[from], data[to], data[to] > data[from], value);
    },
    render({ yrs, x, y, which, from, to }) {
      const data = which ? y : x;
      const old = data[from];
      const next = data[to];
      const text = percentChangeText({ old, next, pct: ((next - old) / old) * 100 });
      return {
        context: 'Study the line graph of annual profits and answer the question.',
        chart: chartOf('line', 'Annual profit of two companies (₹ crore)', '₹ crore', yrs, [
          { label: COMPANIES[0], data: x },
          { label: COMPANIES[1], data: y }
        ]),
        question: `By what percentage did ${COMPANIES[which]}'s profit ${text.rise ? 'increase' : 'decrease'} from ${yrs[from]} to ${yrs[to]}?`,
        explanation: `${COMPANIES[which]}: ${fmt(old)} in ${yrs[from]} and ${fmt(next)} in ${yrs[to]}. ${text.explanation}`,
        solutionSteps: text.steps,
        method: 'Percentage change = (new − old) ÷ old × 100.',
        hints: [`Follow ${COMPANIES[which]}'s line and read ${yrs[from]} and ${yrs[to]}.`, `Divide the change by the ${yrs[from]} value.`],
        commonMistakes: ['Reading from the other company\'s line.', 'Dividing by the later value.']
      };
    }
  },

  {
    id: 'lng-widest-gap',
    version: 1,
    topicId: 'di-line-graphs',
    conceptId: 'lng-compare',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['lng-compare-f'],
    estimatedSeconds: 60,
    formatValue: (value) => value,
    params(rng) {
      const yrs = years(rng, 5);
      const x = yrs.map(() => 5 * rng.int(4, 20));
      const y = yrs.map(() => 5 * rng.int(4, 20));
      const gaps = x.map((v, i) => Math.abs(v - y[i]));
      const best = uniqueMaxIndex(gaps);
      if (best < 0) return null;
      return { yrs, x, y, best };
    },
    answer: ({ yrs, best }) => yrs[best],
    distractors: ({ yrs, x, best }) => {
      const highest = x.indexOf(Math.max(...x));
      return yrs
        .map((value, i) => ({ value, why: i === highest ? 'picked Company X\'s highest year' : 'a smaller gap' }))
        .filter((_, i) => i !== best);
    },
    verify({ yrs, x, y }, year) {
      const i = yrs.indexOf(year);
      return x.every((v, j) => Math.abs(v - y[j]) <= Math.abs(x[i] - y[i]));
    },
    render({ yrs, x, y, best }) {
      const gaps = x.map((v, i) => Math.abs(v - y[i]));
      return {
        context: 'Study the line graph of annual profits and answer the question.',
        chart: chartOf('line', 'Annual profit of two companies (₹ crore)', '₹ crore', yrs, [
          { label: COMPANIES[0], data: x },
          { label: COMPANIES[1], data: y }
        ]),
        question: 'In which year was the gap between the two companies\' profits the widest?',
        explanation: `Gaps by year: ${yrs.map((yr, i) => `${yr}: ${fmt(gaps[i])}`).join(', ')}. The widest is ${fmt(gaps[best])}, in ${yrs[best]}.`,
        solutionSteps: yrs.map((yr, i) => `${yr}: |${fmt(x[i])} − ${fmt(y[i])}| = ${fmt(gaps[i])}.`),
        method: 'The widest vertical distance between the two lines.',
        hints: ['Look for where the two lines are farthest apart vertically.', 'Check by subtracting the two values in each year.'],
        commonMistakes: ['Picking the year where one company\'s profit alone was highest.']
      };
    }
  },

  /* ================================ pie charts ================================ */
  {
    id: 'pch-amount',
    version: 1,
    topicId: 'di-pie-charts',
    conceptId: 'pch-value',
    difficulty: 'easy',
    type: 'numerical_input',
    unit: '₹',
    formulaIds: ['pch-value-f'],
    estimatedSeconds: 45,
    params: (rng) => budgetParams(rng),
    answer: ({ shares, total, pick }) => (shares[pick] * total) / 100,
    verify: ({ shares, total, pick }, value) => nearlyEqual(value / total, shares[pick] / sum(shares)),
    render({ shares, total, pick }) {
      const amount = (shares[pick] * total) / 100;
      return {
        context: 'Study the pie chart of a household\'s monthly budget and answer the question.',
        chart: budgetChart(shares, `Monthly budget of ${format.rupees(total)}, by category`),
        question: `The monthly budget is ${format.rupees(total)}. How much is spent on ${BUDGET[pick]}?`,
        explanation: `${BUDGET[pick]} is ${shares[pick]}% of the budget: ${shares[pick]}% × ${format.rupees(total)} = ${format.rupees(amount)}.`,
        solutionSteps: [`${BUDGET[pick]}: ${shares[pick]}%.`, `${shares[pick]} ÷ 100 × ${fmt(total)} = ${fmt(amount)}.`],
        method: 'Amount = percentage × total ÷ 100.',
        hints: [`Find ${BUDGET[pick]}'s percentage on the chart.`, 'Take that percentage of the total budget.'],
        commonMistakes: ['Using another sector\'s percentage.']
      };
    }
  },

  {
    id: 'pch-angle',
    version: 1,
    topicId: 'di-pie-charts',
    conceptId: 'pch-angle',
    difficulty: 'medium',
    type: 'numerical_input',
    unit: '°',
    formulaIds: ['pch-angle-f'],
    estimatedSeconds: 45,
    params: (rng) => budgetParams(rng),
    // Every share is a multiple of 5, so the angle (share × 3.6) is a multiple of 18.
    answer: ({ shares, pick }) => shares[pick] * 3.6,
    verify: ({ shares, pick }, value) => nearlyEqual(value / 360, shares[pick] / sum(shares)),
    render({ shares, total, pick }) {
      return {
        context: 'Study the pie chart of a household\'s monthly budget and answer the question.',
        chart: budgetChart(shares, `Monthly budget of ${format.rupees(total)}, by category`),
        question: `What is the central angle of the ${BUDGET[pick]} sector?`,
        explanation: `A full circle is 360°, so each 1% is 3.6°. ${BUDGET[pick]} = ${shares[pick]}% → ${shares[pick]} × 3.6 = ${fmt(shares[pick] * 3.6)}°.`,
        solutionSteps: [`${BUDGET[pick]}: ${shares[pick]}%.`, `${shares[pick]} ÷ 100 × 360 = ${fmt(shares[pick] * 3.6)}°.`],
        method: 'Central angle = percentage × 360 ÷ 100 = percentage × 3.6.',
        hints: ['The whole pie is 360°, which stands for 100%.', 'Multiply the percentage by 3.6.'],
        commonMistakes: ['Giving the percentage itself as the angle.']
      };
    }
  },

  {
    id: 'pch-reverse',
    version: 1,
    topicId: 'di-pie-charts',
    conceptId: 'pch-reverse',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: '₹',
    formulaIds: ['pch-reverse-f'],
    estimatedSeconds: 70,
    params(rng) {
      const base = budgetParams(rng);
      const other = rng.pick([0, 1, 2, 3, 4].filter((i) => i !== base.pick));
      return { ...base, other };
    },
    answer: ({ shares, total, other }) => (shares[other] * total) / 100,
    // Amounts are in the same ratio as their percentages.
    verify: ({ shares, total, pick, other }, value) => nearlyEqual(value * shares[pick], ((shares[pick] * total) / 100) * shares[other]),
    render({ shares, total, pick, other }) {
      const known = (shares[pick] * total) / 100;
      const answer = (shares[other] * total) / 100;
      return {
        context: 'Study the pie chart of a household\'s monthly budget and answer the question.',
        chart: budgetChart(shares, 'Monthly budget, by category'),
        question: `If the household spends ${format.rupees(known)} a month on ${BUDGET[pick]}, how much does it spend on ${BUDGET[other]}?`,
        explanation: `${BUDGET[pick]} is ${shares[pick]}%, so 1% = ${format.rupees(known)} ÷ ${shares[pick]} = ${format.rupees(known / shares[pick])}. ${BUDGET[other]} is ${shares[other]}%: ${shares[other]} × ${format.rupees(known / shares[pick])} = ${format.rupees(answer)}.`,
        solutionSteps: [`1% = ${fmt(known)} ÷ ${shares[pick]} = ${fmt(known / shares[pick])}.`, `${BUDGET[other]}: ${shares[other]} × ${fmt(known / shares[pick])} = ${fmt(answer)}.`],
        method: 'Find the value of 1% from the known sector, then scale.',
        hints: [`${format.rupees(known)} is ${shares[pick]}% of the budget.`, 'Work out 1% first, or use the ratio of the two percentages.'],
        commonMistakes: ['Treating the known amount as the whole budget.']
      };
    }
  },

  /* ================================== caselets ================================== */
  {
    id: 'csl-departments',
    version: 1,
    topicId: 'di-caselet',
    conceptId: 'csl-multistep',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['csl-derived-f'],
    estimatedSeconds: 80,
    params: (rng) => companyParams(rng),
    answer: ({ ops }) => ops,
    verify: ({ n, sales, marketing }, value) => sales + marketing + 2 * value === n,
    render(p) {
      return {
        context: companyText(p),
        question: 'How many employees work in Operations?',
        explanation: `Sales = ${p.salesPct}% of ${p.n} = ${p.sales}. Marketing = half of Sales = ${p.marketing}. Remaining = ${p.n} − ${p.sales} − ${p.marketing} = ${p.n - p.sales - p.marketing}, split equally, so Operations = ${p.ops}.`,
        solutionSteps: [`Sales: ${p.salesPct}% × ${p.n} = ${p.sales}.`, `Marketing: ${p.sales} ÷ 2 = ${p.marketing}.`, `Operations: (${p.n} − ${p.sales} − ${p.marketing}) ÷ 2 = ${p.ops}.`],
        method: 'Work through the departments in the order the text defines them.',
        hints: ['Find Sales first, since Marketing is defined from it.', 'Operations and Finance share what is left equally.'],
        commonMistakes: ['Forgetting to halve what remains.', 'Taking half of the total instead of half of Sales for Marketing.']
      };
    }
  },

  {
    id: 'csl-payroll',
    version: 1,
    topicId: 'di-caselet',
    conceptId: 'csl-derived',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: '₹',
    formulaIds: ['csl-derived-f'],
    estimatedSeconds: 100,
    params: (rng) => companyParams(rng),
    answer: ({ sales, marketing, salesPay, marketingPay }) => sales * salesPay + marketing * marketingPay,
    // Price everyone at the Sales rate, then add the Marketing top-up (or take off the shortfall).
    verify: ({ sales, marketing, salesPay, marketingPay }, value) => (sales + marketing) * salesPay + marketing * (marketingPay - salesPay) === value,
    render(p) {
      const salesBill = p.sales * p.salesPay;
      const marketingBill = p.marketing * p.marketingPay;
      return {
        context: companyText(p),
        question: 'What is the combined monthly salary bill of the Sales and Marketing departments, in ₹?',
        explanation: `Sales: ${p.sales} × ${format.rupees(p.salesPay)} = ${format.rupees(salesBill)}. Marketing: ${p.marketing} × ${format.rupees(p.marketingPay)} = ${format.rupees(marketingBill)}. Together: ${format.rupees(salesBill + marketingBill)}.`,
        solutionSteps: [`Sales staff: ${p.sales}; Marketing staff: ${p.marketing}.`, `${p.sales} × ${fmt(p.salesPay)} = ${fmt(salesBill)}.`, `${p.marketing} × ${fmt(p.marketingPay)} = ${fmt(marketingBill)}.`, `Total = ${fmt(salesBill + marketingBill)}.`],
        method: 'Find each headcount first, multiply by its salary, then add.',
        hints: ['You need the headcounts before any money.', 'Each department has its own salary.'],
        commonMistakes: ['Using one salary for both departments.']
      };
    }
  },

  {
    id: 'csl-two-subjects',
    version: 1,
    topicId: 'di-caselet',
    conceptId: 'csl-organize',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['csl-organize-f'],
    estimatedSeconds: 80,
    params(rng) {
      const n = rng.pick([40, 60, 80, 100, 120, 160, 200]);
      const pm = 5 * rng.int(8, 16);
      const ps = 5 * rng.int(8, 16);
      const pb = 5 * rng.int(4, Math.min(pm, ps) / 5 - 1);
      const [m, s, b] = [pm, ps, pb].map((pct) => (n * pct) / 100);
      if (![m, s, b].every(Number.isInteger)) return null;
      const neither = n - (m + s - b);
      if (neither <= 0) return null;
      return { n, pm, ps, pb, m, s, b, neither, ask: rng.pick(['neither', 'only-maths']) };
    },
    answer: ({ m, b, neither, ask }) => (ask === 'neither' ? neither : m - b),
    // The four groups (maths only, science only, both, neither) must add back to the class.
    verify({ n, m, s, b, ask }, value) {
      if (ask === 'neither') return m - b + (s - b) + b + value === n;
      return value + b === m;
    },
    render({ n, pm, ps, pb, m, s, b, neither, ask }) {
      return {
        context: `In a class of ${n} students, ${pm}% passed Maths, ${ps}% passed Science, and ${pb}% passed both subjects.`,
        question: ask === 'neither' ? 'How many students passed neither subject?' : 'How many students passed Maths only (and not Science)?',
        explanation:
          ask === 'neither'
            ? `Maths ${m}, Science ${s}, both ${b}. Passed at least one = ${m} + ${s} − ${b} = ${m + s - b}. Neither = ${n} − ${m + s - b} = ${neither}.`
            : `Maths ${m}, and ${b} of those also passed Science. Maths only = ${m} − ${b} = ${m - b}.`,
        solutionSteps:
          ask === 'neither'
            ? [`Maths: ${pm}% of ${n} = ${m}; Science: ${s}; both: ${b}.`, `At least one: ${m} + ${s} − ${b} = ${m + s - b}.`, `Neither: ${n} − ${m + s - b} = ${neither}.`]
            : [`Maths: ${pm}% of ${n} = ${m}.`, `Both: ${pb}% of ${n} = ${b}.`, `Maths only: ${m} − ${b} = ${m - b}.`],
        method: ask === 'neither' ? 'At least one = A + B − both; neither = total − at least one.' : 'Only A = A − both.',
        hints: ['Convert each percentage into a number of students first.', 'Students who passed both are counted in both the Maths and the Science figures.'],
        commonMistakes: ask === 'neither' ? [`Forgetting to subtract "both", giving ${n - m - s < 0 ? 'a negative number' : n - m - s}.`] : ['Giving the full Maths figure, which includes those who passed both.']
      };
    }
  },

  {
    id: 'csl-relative-sales',
    version: 1,
    topicId: 'di-caselet',
    conceptId: 'csl-relative',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['csl-relative-f'],
    estimatedSeconds: 70,
    params(rng) {
      const a = 40 * rng.int(3, 15);
      const up = rng.pick([10, 20, 25, 50]);
      const down = rng.pick([10, 20, 25]);
      const b = a + (a * up) / 100;
      const c = b - (b * down) / 100;
      if (!Number.isInteger(b) || !Number.isInteger(c)) return null;
      return { a, up, down, b, c, item: rng.pick(['phones', 'bicycles', 'books', 'laptops']) };
    },
    answer: ({ c }) => c,
    // Apply the two changes as one combined multiplier.
    verify: ({ a, up, down }, value) => nearlyEqual(a * (1 + up / 100) * (1 - down / 100), value),
    render({ a, up, down, b, c, item }) {
      return {
        context: `Last month, Shop P sold ${a} ${item}. Shop Q sold ${up}% more ${item} than Shop P, and Shop R sold ${down}% fewer than Shop Q.`,
        question: `How many ${item} did Shop R sell?`,
        explanation: `Q = ${a} + ${up}% of ${a} = ${b}. R = ${b} − ${down}% of ${b} = ${c}.`,
        solutionSteps: [`Q: ${a} × ${1 + up / 100} = ${b}.`, `R: ${b} × ${1 - down / 100} = ${c}.`],
        method: 'Apply each percentage to the right base, one step at a time.',
        hints: ['Find Shop Q first.', `R's ${down}% is taken from Q's figure, not P's.`],
        commonMistakes: [`Netting the percentages: ${up}% − ${down}% applied to ${a}.`, `Taking ${down}% of Shop P's figure.`]
      };
    }
  },

  /* ==================== advanced (Tier 6) levels: data comparison ==================== */
  {
    id: 'dt-adv-highest-rate',
    version: 1,
    topicId: 'di-tables',
    conceptId: 'dt-adv-ratio-compare',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['dt-adv-cross-f'],
    estimatedSeconds: 100,
    formatValue: (value) => value,
    params(rng) {
      const rates = rng.shuffle([...CLOSE_RATES]).slice(0, 4);
      const appeared = rates.map(() => 400 * rng.int(5, 15));
      const qualified = appeared.map((a, i) => (a * rates[i]) / 100);
      const highest = rng.chance(0.5);
      const pick = (values, better) => values.indexOf(better(...values));
      const answer = pick(rates, highest ? Math.max : Math.min);
      // The row with the most (or fewest) qualified must not be the answer: that is the trap.
      if (pick(qualified, highest ? Math.max : Math.min) === answer) return null;
      return { year: rng.int(2018, 2024), appeared, qualified, highest, answer };
    },
    answer: ({ answer }) => STATES[answer],
    distractors: ({ answer }) => STATES.filter((_, i) => i !== answer).map((value) => ({ value, why: 'a different row' })),
    // Cross-multiply the chosen row against every other row.
    verify({ appeared, qualified, highest }, label) {
      const a = STATES.indexOf(label);
      return appeared.every((_, o) => {
        if (o === a) return true;
        const diff = qualified[a] * appeared[o] - qualified[o] * appeared[a];
        return highest ? diff > 0 : diff < 0;
      });
    },
    render({ year, appeared, qualified, highest, answer }) {
      const word = highest ? 'highest' : 'lowest';
      const rateText = (i) => `${STATES[i]} ${fmt(qualified[i])} ÷ ${fmt(appeared[i])} = ${fmt((100 * qualified[i]) / appeared[i])}%`;
      const trap = qualified.indexOf((highest ? Math.max : Math.min)(...qualified));
      return {
        context: 'Study the table of exam candidates by state and answer the question.',
        table: tableOf(`Candidates who appeared and qualified in an exam, ${year}`, ['State', 'Appeared', 'Qualified'], STATES, appeared.map((a, i) => [a, qualified[i]])),
        question: `Which state had the ${word} qualifying rate (qualified as a share of appeared)?`,
        explanation: `Rates: ${STATES.map((_, i) => rateText(i)).join('; ')}. ${STATES[answer]} is ${word}.`,
        solutionSteps: [...STATES.map((_, i) => `${rateText(i)}.`), `The ${word} rate is ${STATES[answer]}.`],
        method: 'Compare qualified ÷ appeared for each row; cross-multiply the close ones.',
        hints: [
          `${STATES[trap]} had the ${highest ? 'most' : 'fewest'} qualified candidates, but look at how many appeared there.`,
          'Estimate each rate as a rough percentage, then compare the close ones exactly.'
        ],
        commonMistakes: [`Choosing ${STATES[trap]} because it has the ${highest ? 'most' : 'fewest'} qualified candidates.`]
      };
    }
  },

  {
    id: 'dt-adv-growth-rank',
    version: 1,
    topicId: 'di-tables',
    conceptId: 'dt-adv-growth-compare',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['dt-adv-growth-f'],
    estimatedSeconds: 90,
    formatValue: (value) => value,
    params(rng) {
      const pcts = rng.shuffle([10, 15, 20, 25, 30, 40, 50, 60]).slice(0, 4);
      const old = pcts.map(() => 20 * rng.int(4, 20));
      const next = old.map((v, i) => v + (v * pcts[i]) / 100);
      const rise = next.map((v, i) => v - old[i]);
      const byPercent = pcts.indexOf(Math.max(...pcts));
      const topRise = Math.max(...rise);
      const byAmount = rise.indexOf(topRise);
      // Both leaders must be unique and different, so the question really tests which one is asked.
      if (rise.filter((v) => v === topRise).length > 1 || byPercent === byAmount) return null;
      const yr = rng.int(2018, 2023);
      return { yrs: [String(yr), String(yr + 1)], old, next, percent: rng.chance(0.5) };
    },
    answer({ old, next, percent }) {
      const rise = next.map((v, i) => v - old[i]);
      const growth = next.map((v, i) => v / old[i]);
      return COMPANIES4[(percent ? growth : rise).indexOf(Math.max(...(percent ? growth : rise)))];
    },
    distractors: ({ old, next, percent }) => {
      const rise = next.map((v, i) => v - old[i]);
      const growth = next.map((v, i) => v / old[i]);
      const best = (percent ? growth : rise).indexOf(Math.max(...(percent ? growth : rise)));
      return COMPANIES4.filter((_, i) => i !== best).map((value) => ({ value, why: 'a different row' }));
    },
    // Percentage: cross-multiply growth factors (new_a × old_o vs new_o × old_a). Amount: compare differences.
    verify({ old, next, percent }, label) {
      const a = COMPANIES4.indexOf(label);
      return old.every((_, o) => o === a || (percent ? next[a] * old[o] > next[o] * old[a] : next[a] - old[a] > next[o] - old[o]));
    },
    render({ yrs, old, next, percent }) {
      const rise = next.map((v, i) => v - old[i]);
      const pct = rise.map((v, i) => (100 * v) / old[i]);
      const best = (percent ? pct : rise).indexOf(Math.max(...(percent ? pct : rise)));
      const other = (percent ? rise : pct).indexOf(Math.max(...(percent ? rise : pct)));
      const line = (i) => `${COMPANIES4[i]}: ${fmt(old[i])} → ${fmt(next[i])}, up ${fmt(rise[i])} (${fmt(pct[i])}%)`;
      return {
        context: 'Study the table of company revenue and answer the question.',
        table: tableOf('Revenue of four companies (₹ crore)', ['Company', ...yrs], COMPANIES4, old.map((v, i) => [v, next[i]])),
        question: percent
          ? `Which company had the largest percentage growth in revenue from ${yrs[0]} to ${yrs[1]}?`
          : `Which company had the largest increase in revenue, in ₹ crore, from ${yrs[0]} to ${yrs[1]}?`,
        explanation: `${COMPANIES4.map((_, i) => line(i)).join('; ')}. ${COMPANIES4[best]} has the largest ${percent ? 'percentage growth' : 'increase in amount'}, though ${COMPANIES4[other]} has the largest ${percent ? 'increase in amount' : 'percentage growth'}.`,
        solutionSteps: [...COMPANIES4.map((_, i) => `${line(i)}.`), `Largest ${percent ? 'percentage' : 'amount'}: ${COMPANIES4[best]}.`],
        method: percent ? 'Rank the growth factors new ÷ old.' : 'Absolute change = new − old; no division needed.',
        hints: [
          percent ? 'A big rise from a big base can still be a small percentage.' : 'This asks about the amount, not the percentage.',
          percent ? 'Divide each new figure by its old figure.' : 'Subtract the old figure from the new one for each company.'
        ],
        commonMistakes: [`Choosing ${COMPANIES4[other]}, which has the largest ${percent ? 'increase in amount' : 'percentage growth'}.`]
      };
    }
  }
];

/* ------------------------------ pie and caselet data ------------------------------ */

const BUDGET = ['Rent', 'Food', 'Transport', 'Savings', 'Other'];

/** Five multiples of 5 (each at least 5) adding to 100, a total, and a sector to ask about. */
function budgetParams(rng) {
  const shares = [];
  let left = 100;
  for (let i = 0; i < 4; i++) {
    const most = left - 5 * (4 - i);
    const share = 5 * rng.int(1, Math.min(8, most / 5));
    shares.push(share);
    left -= share;
  }
  shares.push(left);
  if (left < 5) return null;
  return { shares, total: rng.pick([20000, 30000, 40000, 50000, 60000, 80000, 120000]), pick: rng.int(0, 4) };
}

function budgetChart(shares, caption) {
  return {
    type: 'pie',
    caption,
    unit: '%',
    categories: BUDGET,
    series: [{ label: 'Budget', data: shares }],
    ariaSummary: `${caption}: ${BUDGET.map((c, i) => `${c} ${shares[i]}%`).join(', ')}.`
  };
}

/** A company where Sales is a share of staff, Marketing half of Sales, and the rest split evenly. */
function companyParams(rng) {
  const n = 40 * rng.int(5, 15);
  const salesPct = rng.pick([20, 30, 40]);
  const sales = (n * salesPct) / 100;
  const marketing = sales / 2;
  const rest = n - sales - marketing;
  if (!Number.isInteger(marketing) || rest % 2) return null;
  return {
    n,
    salesPct,
    sales,
    marketing,
    ops: rest / 2,
    salesPay: 1000 * 5 * rng.int(5, 9),
    marketingPay: 1000 * 5 * rng.int(5, 9)
  };
}

function companyText({ n, salesPct, salesPay, marketingPay }) {
  return `A company has ${n} employees. ${salesPct}% of them work in Sales. The number in Marketing is half the number in Sales. The remaining employees are split equally between Operations and Finance. Each Sales employee earns ${format.rupees(salesPay)} a month and each Marketing employee earns ${format.rupees(marketingPay)} a month.`;
}
