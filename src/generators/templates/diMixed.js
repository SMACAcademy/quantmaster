/**
 * Mixed and radar data interpretation: radar charts, bar-and-line combo
 * charts, tables with missing values, and a budget pie with a change.
 * Each instance draws its own data; the checks recompute from what is shown.
 */

import { fmt, nearlyEqual } from '../core.js';

export const SUBJECTS = ['Maths', 'Science', 'English', 'History', 'Geography'];
const COLORS = ['data', 'algebra'];
const CLASSES = ['VI', 'VII', 'VIII', 'IX', 'X'];
const HEADS = ['Food', 'Rent', 'Education', 'Transport', 'Savings'];
const sum = (list) => list.reduce((acc, v) => acc + v, 0);

const summary = (categories, series) => series.map((s) => `${s.label}: ${categories.map((c, i) => `${c} ${fmt(s.data[i])}`).join(', ')}`).join('. ');

export function radarChart(caption, categories, series) {
  return {
    type: 'radar',
    caption,
    unit: 'marks',
    categories,
    series: series.map((s, i) => ({ label: s.label, data: s.data, colorToken: COLORS[i] })),
    ariaSummary: `${caption}. ${summary(categories, series)}.`
  };
}

export function comboChart(caption, unit, categories, bars, line) {
  return {
    type: 'combo',
    caption,
    unit,
    categories,
    series: [
      { label: bars.label, data: bars.data, kind: 'bar', colorToken: 'data' },
      { label: line.label, data: line.data, kind: 'line', colorToken: 'algebra' }
    ],
    ariaSummary: `${caption}. ${summary(categories, [bars, line])}.`
  };
}

export function budgetPie(caption, shares) {
  return {
    type: 'pie',
    caption,
    unit: '%',
    categories: HEADS,
    series: [{ label: 'Share of income', data: shares }],
    ariaSummary: `${caption}. ${HEADS.map((h, i) => `${h} ${shares[i]}%`).join(', ')}.`
  };
}

/** A scores-out-of-100 row: multiples of 5 from 40 to 100. */
const scores = (rng) => SUBJECTS.map(() => 5 * rng.int(8, 20));
const years = (rng) => {
  const start = rng.int(2016, 2020);
  return Array.from({ length: 5 }, (_, i) => String(start + i));
};

export const diMixedTemplates = [
  {
    id: 'dmr-radar-gap',
    version: 1,
    topicId: 'di-mixed-radar',
    conceptId: 'dmr-radar',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['dmr-radar-f'],
    formatValue: (value) => value,
    estimatedSeconds: 50,
    params(rng) {
      const a = scores(rng);
      const b = scores(rng);
      const gaps = a.map((v, i) => Math.abs(v - b[i]));
      const top = Math.max(...gaps);
      if (gaps.filter((g) => g === top).length !== 1 || top < 15) return null;
      return { a, b, best: gaps.indexOf(top) };
    },
    answer: ({ best }) => SUBJECTS[best],
    distractors: ({ best }) => SUBJECTS.filter((_, i) => i !== best).map((value) => ({ value, why: 'a smaller gap' })),
    verify: ({ a, b }, value) => {
      const ranked = SUBJECTS.map((name, i) => ({ name, gap: Math.abs(a[i] - b[i]) })).sort((p, q) => q.gap - p.gap);
      return ranked[0].name === value && ranked[0].gap > ranked[1].gap;
    },
    render({ a, b, best }) {
      const gaps = a.map((v, i) => Math.abs(v - b[i]));
      return {
        question: 'In which subject is the difference between the two students\' scores the largest?',
        chart: radarChart('Scores of Asha and Ravi out of 100', SUBJECTS, [
          { label: 'Asha', data: a },
          { label: 'Ravi', data: b }
        ]),
        explanation: `Differences: ${SUBJECTS.map((s, i) => `${s} ${gaps[i]}`).join(', ')}. The largest is ${SUBJECTS[best]} (${gaps[best]}).`,
        solutionSteps: SUBJECTS.map((s, i) => `${s}: |${a[i]} − ${b[i]}| = ${gaps[i]}.`),
        method: 'On each spoke, the gap between the two shapes is the difference.',
        hints: ['Look for the spoke where the two shapes are furthest apart.', 'Check the printed values on that spoke.'],
        commonMistakes: ['Picking the subject with the highest single score instead of the largest gap.']
      };
    }
  },

  {
    id: 'dmr-radar-totals',
    version: 1,
    topicId: 'di-mixed-radar',
    conceptId: 'dmr-radar',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['dmr-radar-f'],
    answerDecimals: 1,
    estimatedSeconds: 45,
    params(rng) {
      const a = scores(rng);
      const b = scores(rng);
      const ask = rng.pick(['total', 'average', 'difference']);
      if (ask === 'difference' && sum(a) === sum(b)) return null;
      return { a, b, ask };
    },
    answer: ({ a, b, ask }) => (ask === 'total' ? sum(a) : ask === 'average' ? sum(b) / 5 : Math.abs(sum(a) - sum(b))),
    verify: ({ a, b, ask }, value) => {
      if (ask === 'total') return a.reduceRight((acc, v) => acc + v, 0) === value;
      if (ask === 'average') return nearlyEqual(value * 5, b.reduceRight((acc, v) => acc + v, 0));
      return a.map((v, i) => v - b[i]).reduce((acc, d) => acc + d, 0) === (sum(a) >= sum(b) ? value : -value);
    },
    render({ a, b, ask }) {
      const question = {
        total: 'What is Asha\'s total score across the five subjects?',
        average: 'What is Ravi\'s average score per subject?',
        difference: 'By how many marks do the two students\' totals differ?'
      }[ask];
      const answer = ask === 'total' ? sum(a) : ask === 'average' ? sum(b) / 5 : Math.abs(sum(a) - sum(b));
      return {
        question,
        chart: radarChart('Scores of Asha and Ravi out of 100', SUBJECTS, [
          { label: 'Asha', data: a },
          { label: 'Ravi', data: b }
        ]),
        explanation:
          ask === 'total'
            ? `Asha: ${a.join(' + ')} = ${sum(a)}.`
            : ask === 'average'
              ? `Ravi: ${b.join(' + ')} = ${sum(b)}, and ${sum(b)} ÷ 5 = ${fmt(answer)}.`
              : `Asha's total is ${sum(a)} and Ravi's is ${sum(b)}; they differ by ${answer}.`,
        solutionSteps:
          ask === 'difference'
            ? [`Asha: ${sum(a)}.`, `Ravi: ${sum(b)}.`, `Difference: ${answer}.`]
            : [`Add the five values for ${ask === 'total' ? 'Asha' : 'Ravi'}: ${sum(ask === 'total' ? a : b)}.`, ...(ask === 'average' ? [`÷ 5 = ${fmt(answer)}.`] : [])],
        method: 'Read each spoke\'s printed value, then add.',
        hints: ['Each spoke is one subject; read the value printed beside the point.'],
        commonMistakes: ['Reading the other student\'s values from the same spoke.']
      };
    }
  },

  {
    id: 'dmr-combo-stock',
    version: 1,
    topicId: 'di-mixed-radar',
    conceptId: 'dmr-combo',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['dmr-combo-f'],
    unit: 'thousand',
    estimatedSeconds: 55,
    params(rng) {
      const production = Array.from({ length: 5 }, () => 5 * rng.int(8, 20));
      const sales = production.map((p) => p - 5 * rng.int(0, 3));
      const ask = rng.pick(['unsold', 'average-sales']);
      if (ask === 'average-sales' && sum(sales) % 5) return null;
      return { yrs: years(rng), production, sales, ask };
    },
    answer: ({ production, sales, ask }) => (ask === 'unsold' ? sum(production) - sum(sales) : sum(sales) / 5),
    verify: ({ production, sales, ask }, value) =>
      ask === 'unsold' ? production.reduce((acc, p, i) => acc + (p - sales[i]), 0) === value : nearlyEqual(value * 5, sales.reduceRight((acc, v) => acc + v, 0)),
    render({ yrs, production, sales, ask }) {
      const unsold = production.map((p, i) => p - sales[i]);
      return {
        question:
          ask === 'unsold'
            ? `Over the five years, how many units (in thousands) were produced but not sold?`
            : 'What were the average yearly sales, in thousands of units?',
        chart: comboChart('Production (bars) and sales (line) of a factory, thousand units', 'thousand units', yrs, { label: 'Production', data: production }, { label: 'Sales', data: sales }),
        explanation:
          ask === 'unsold'
            ? `Unsold each year = production − sales: ${unsold.join(' + ')} = ${sum(unsold)} thousand.`
            : `Sales: ${sales.join(' + ')} = ${sum(sales)}; ÷ 5 = ${fmt(sum(sales) / 5)} thousand.`,
        solutionSteps:
          ask === 'unsold'
            ? [...yrs.map((y, i) => `${y}: ${production[i]} − ${sales[i]} = ${unsold[i]}.`), `Total: ${sum(unsold)}.`]
            : [`Total sales: ${sum(sales)}.`, `Average: ${fmt(sum(sales) / 5)}.`],
        method: 'The bars and the line share one axis: subtract year by year.',
        hints: ['The bars are production, the line is sales.', 'Work year by year.'],
        commonMistakes: ['Reading the line\'s value for the bar or the other way round.']
      };
    }
  },

  {
    id: 'dmr-missing-cell',
    version: 1,
    topicId: 'di-mixed-radar',
    conceptId: 'dmr-missing',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['dmr-missing-f'],
    estimatedSeconds: 45,
    params(rng) {
      const boys = CLASSES.map(() => rng.int(30, 55));
      const girls = CLASSES.map(() => rng.int(30, 55));
      const hide = rng.shuffle([0, 1, 2, 3, 4]).slice(0, 2);
      const ask = rng.pick(['cell', 'column']);
      return { boys, girls, hidden: [{ row: hide[0], col: 'girls' }, { row: hide[1], col: 'boys' }], ask };
    },
    answer: ({ boys, girls, hidden, ask }) => (ask === 'cell' ? girls[hidden[0].row] : sum(boys)),
    // Recover the answer from the table as shown: totals minus the visible cells.
    verify: ({ boys, girls, hidden, ask }, value) => {
      const totals = boys.map((b, i) => b + girls[i]);
      if (ask === 'cell') return totals[hidden[0].row] - boys[hidden[0].row] === value;
      const shownBoys = boys.map((b, i) => (i === hidden[1].row ? totals[i] - girls[i] : b));
      return shownBoys.reduce((acc, v) => acc + v, 0) === value;
    },
    render({ boys, girls, hidden, ask }) {
      const totals = boys.map((b, i) => b + girls[i]);
      const cell = (i, col) => (hidden.some((h) => h.row === i && h.col === col) ? '?' : String(col === 'boys' ? boys[i] : girls[i]));
      const girlRow = hidden[0].row;
      const boyRow = hidden[1].row;
      return {
        question:
          ask === 'cell'
            ? `How many girls are there in class ${CLASSES[girlRow]}?`
            : 'How many boys are there in the five classes altogether?',
        table: {
          caption: 'Students in a school (some values missing)',
          headers: ['Class', 'Boys', 'Girls', 'Total'],
          rows: CLASSES.map((c, i) => [c, cell(i, 'boys'), cell(i, 'girls'), String(totals[i])])
        },
        explanation:
          ask === 'cell'
            ? `Girls in ${CLASSES[girlRow]} = total − boys = ${totals[girlRow]} − ${boys[girlRow]} = ${girls[girlRow]}.`
            : `First fill the missing boys in ${CLASSES[boyRow]}: ${totals[boyRow]} − ${girls[boyRow]} = ${boys[boyRow]}. Then add: ${boys.join(' + ')} = ${sum(boys)}.`,
        solutionSteps:
          ask === 'cell'
            ? [`Total in ${CLASSES[girlRow]}: ${totals[girlRow]}.`, `Boys: ${boys[girlRow]}.`, `Girls: ${girls[girlRow]}.`]
            : [`Missing boys in ${CLASSES[boyRow]}: ${boys[boyRow]}.`, `Sum of boys: ${sum(boys)}.`],
        method: 'Missing value = row total − the known part.',
        hints: ['Each row\'s total is complete: use it.'],
        commonMistakes: ['Skipping the missing cell when adding a column.']
      };
    }
  },

  {
    id: 'dmr-budget-change',
    version: 1,
    topicId: 'di-mixed-radar',
    conceptId: 'dmr-two-charts',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['dmr-steps-f'],
    unit: '₹',
    estimatedSeconds: 75,
    params(rng) {
      const shares = [5 * rng.int(5, 8), 5 * rng.int(3, 6), 5 * rng.int(2, 4), 5 * rng.int(1, 3)];
      const savings = 100 - sum(shares);
      if (savings < 10) return null;
      const income = 10000 * rng.int(4, 12);
      const head = rng.int(0, 3);
      const rise = rng.pick([10, 20, 25, 50]);
      const extra = (income * shares[head] * rise) / 10000;
      if (!Number.isInteger(extra) || extra >= (income * savings) / 100) return null;
      return { shares: [...shares, savings], income, head, rise };
    },
    answer: ({ shares, income, head, rise }) => (income * shares[4]) / 100 - (income * shares[head] * rise) / 10000,
    verify: ({ shares, income, head, rise }, value) => {
      // Spend after the rise must still total the income.
      const spent = shares.slice(0, 4).map((s, i) => (income * s * (i === head ? 1 + rise / 100 : 1)) / 100);
      return nearlyEqual(spent.reduce((a, v) => a + v, 0) + value, income);
    },
    render({ shares, income, head, rise }) {
      const before = (income * shares[head]) / 100;
      const extra = (before * rise) / 100;
      const saved = (income * shares[4]) / 100;
      return {
        question: `A family's monthly income of ₹${fmt(income)} is spent as shown. If ${HEADS[head].toLowerCase()} costs rise by ${rise}% and the extra comes out of savings, how much will they save each month?`,
        chart: budgetPie(`Monthly budget of ₹${fmt(income)}`, shares),
        explanation: `${HEADS[head]} now: ${shares[head]}% of ₹${fmt(income)} = ₹${fmt(before)}. A ${rise}% rise adds ₹${fmt(extra)}. Savings: ${shares[4]}% = ₹${fmt(saved)}, so ₹${fmt(saved)} − ₹${fmt(extra)} = ₹${fmt(saved - extra)}.`,
        solutionSteps: [`${HEADS[head]}: ₹${fmt(before)}.`, `Extra: ${rise}% of ₹${fmt(before)} = ₹${fmt(extra)}.`, `Savings: ₹${fmt(saved)} − ₹${fmt(extra)} = ₹${fmt(saved - extra)}.`],
        method: 'Turn the percentages into rupees first, then apply the change.',
        hints: ['Find the rupee amounts for the item and for savings.', `${rise}% of the item's cost is the extra spending.`],
        commonMistakes: [`Taking ${rise}% of the whole income instead of the item's cost.`]
      };
    }
  }
];
