/**
 * Grouped data: frequency tables, histograms, ogives, and the mean, median and mode of grouped data (grouped-data).
 *
 * Every table is built so the asked-for figure is clean, and every answer is
 * checked a second way: the mean by the direct sum against step deviation,
 * the median by reading the more-than ogive, the mode by its Δ₁ ÷ (Δ₁ + Δ₂)
 * form, a missing frequency by putting it back (or by a search over every
 * candidate), a boundary from the neighbouring class. The maths lives in
 * utils/groupedStats.js.
 */

import { fmt, hasAtMostDecimals, nearlyEqual } from '../core.js';
import {
  adjustedFrequencies,
  classMarks,
  groupedMedian,
  groupedMode,
  lessThanCumulative,
  lessThanOgive,
  meanDirect,
  meanStepDeviation,
  missingFrequencyForMean,
  moreThanCumulative,
  ogiveCountAt,
  ogiveValueAt,
  sum,
  toBoundaries
} from '../../utils/groupedStats.js';

/** Settings a table can describe: the column heading, who was counted, and widths and starts that suit it. */
const CONTEXTS = [
  { header: 'Marks', item: 'marks', who: 'students', widths: [5, 10], starts: [0, 10, 20, 30] },
  { header: 'Daily wage (₹)', item: 'a daily wage', who: 'workers', widths: [20, 50], starts: [100, 200, 300] },
  { header: 'Weight (kg)', item: 'a weight', who: 'people', widths: [5, 10], starts: [30, 40, 50] },
  { header: 'Age (years)', item: 'an age', who: 'patients', widths: [5, 10], starts: [10, 20] },
  { header: 'Time (minutes)', item: 'a time', who: 'runners', widths: [4, 5, 10], starts: [20, 40] }
];

const range = (l, u) => `${fmt(l)}–${fmt(u)}`;
const edgesOf = (start, h, k) => Array.from({ length: k + 1 }, (_, i) => start + i * h);
const randomFreqs = (rng, k, lo, hi) => Array.from({ length: k }, () => rng.int(lo, hi));
const two = (value) => fmt(value, 2);
/** Drop floating-point dust (14.999999999 → 15) from a computed answer. */
const clean = (value) => Number(value.toFixed(9));

function freqTable(header, who, edges, freqs) {
  return {
    caption: `${header} of ${fmt(sum(freqs))} ${who}`,
    headers: [header, `Number of ${who}`],
    rows: freqs.map((f, i) => [range(edges[i], edges[i + 1]), fmt(f)])
  };
}

/** A context with one of its widths and starts. */
function setting(rng) {
  const ctx = rng.pick(CONTEXTS);
  return { ctx, h: rng.pick(ctx.widths), start: rng.pick(ctx.starts) };
}

/**
 * k frequencies from lo to hi adding to exactly n, or null if that cannot be
 * done. The extra over lo is handed out one at a time, favouring the middle
 * classes, so the table has the usual hump.
 */
function freqsAddingTo(rng, k, n, lo, hi) {
  if (n < k * lo || n > k * hi) return null;
  const freqs = new Array(k).fill(lo);
  let left = n - k * lo;
  while (left > 0) {
    const i = Math.round((rng.int(0, k - 1) + rng.int(0, k - 1)) / 2);
    if (freqs[i] < hi) {
      freqs[i] += 1;
      left -= 1;
    }
  }
  return freqs;
}

/**
 * A table whose median is clean: the median class m (one or more classes
 * below it, two or more above) holds f values, and n/2 falls d of them in,
 * so the median is l + (d ÷ f) × h.
 */
function medianTable(rng) {
  const { ctx, h, start } = setting(rng);
  const k = rng.int(5, 6);
  const m = rng.int(1, k - 3);
  const below = randomFreqs(rng, m, 3, 14);
  const cf = sum(below);
  const f = rng.pick([4, 5, 6, 8, 10, 12, 15, 16, 20]);
  const ds = Array.from({ length: f - 1 }, (_, i) => i + 1).filter((d) => 2 * d !== f && hasAtMostDecimals((d * h) / f, 1));
  if (!ds.length) return null;
  const d = rng.pick(ds);
  // (d = f/2 is left out: the median would be the class mark, which a guess would hit.)
  // n = 2(cf + d); whatever is left goes to the classes above the median class.
  const upper = freqsAddingTo(rng, k - m - 1, cf + 2 * d - f, 2, 20);
  if (!upper) return null;
  return { ctx, h, m, edges: edgesOf(start, h, k), freqs: [...below, f, ...upper] };
}

export const groupedDataTemplates = [
  /* ============================== classes ============================== */
  {
    id: 'gd-class-boundary',
    version: 1,
    topicId: 'grouped-data',
    conceptId: 'gd-tables',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['gd-class-f'],
    estimatedSeconds: 40,
    answerDecimals: 1,
    formatValue: (value) => fmt(value, 1),
    params(rng) {
      const { ctx, start } = setting(rng);
      const w = rng.pick([5, 10, 20]);
      const offset = rng.pick([0, 1]);
      const lowers = Array.from({ length: 5 }, (_, i) => start + offset + i * w);
      const uppers = lowers.map((l) => l + w - 1);
      return { who: ctx.who, header: ctx.header, lowers, uppers, j: rng.int(1, 3), side: rng.pick(['upper', 'lower']) };
    },
    answer({ lowers, uppers, j, side }) {
      const bounds = toBoundaries(lowers.map((l, i) => [l, uppers[i]]));
      return clean(side === 'upper' ? bounds[j + 1] : bounds[j]);
    },
    distractors: ({ lowers, uppers, j, side }) =>
      side === 'upper'
        ? [
            { value: uppers[j], why: 'gave the upper limit itself' },
            { value: lowers[j + 1], why: 'took the next class’s lower limit' },
            { value: uppers[j] - 0.5, why: 'subtracted the half instead of adding it' },
            { value: (lowers[j] + uppers[j]) / 2, why: 'gave the class mark' }
          ]
        : [
            { value: lowers[j], why: 'gave the lower limit itself' },
            { value: uppers[j - 1], why: 'took the previous class’s upper limit' },
            { value: lowers[j] + 0.5, why: 'added the half instead of subtracting it' },
            { value: (lowers[j] + uppers[j]) / 2, why: 'gave the class mark' }
          ],
    // A boundary sits exactly halfway across the gap to the neighbouring class.
    verify: ({ lowers, uppers, j, side }, value) =>
      side === 'upper' ? nearlyEqual(2 * value, uppers[j] + lowers[j + 1]) : nearlyEqual(2 * value, uppers[j - 1] + lowers[j]),
    render({ who, header, lowers, uppers, j, side }, { fmt: f }) {
      const list = lowers.map((l, i) => range(l, uppers[i])).join(', ');
      const gapText = `${uppers[0]} to ${lowers[1]}`;
      const answer = side === 'upper' ? uppers[j] + 0.5 : lowers[j] - 0.5;
      return {
        question: `A table groups ${who} by ${header.toLowerCase()} in the inclusive classes ${list}. What is the ${side} class boundary of the class ${range(lowers[j], uppers[j])}?`,
        explanation: `Inclusive classes leave a gap of 1 between one class and the next (${gapText}). The true boundary lies halfway across it, so subtract 0.5 from every lower limit and add 0.5 to every upper limit: the class ${range(lowers[j], uppers[j])} becomes ${range(lowers[j] - 0.5, uppers[j] + 0.5)}, and its ${side} boundary is ${f(answer)}.`,
        solutionSteps: [`Gap between classes: ${lowers[1]} − ${uppers[0]} = 1, half of it 0.5.`, `${range(lowers[j], uppers[j])} → ${range(lowers[j] - 0.5, uppers[j] + 0.5)}.`, `The ${side} boundary is ${f(answer)}.`],
        method: 'Boundaries lie halfway between one class’s upper limit and the next class’s lower limit.',
        hints: ['Inclusive classes have a gap between them; the boundary is in the middle of that gap.', `Half the gap is 0.5: ${side === 'upper' ? 'add it to the upper limit' : 'subtract it from the lower limit'}.`],
        commonMistakes: ['Giving the class limit itself as the boundary.', 'Moving the limit the wrong way (adding 0.5 to a lower limit).']
      };
    }
  },

  {
    id: 'gd-class-from-marks',
    version: 1,
    topicId: 'grouped-data',
    conceptId: 'gd-tables',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['gd-sc-class-from-marks'],
    estimatedSeconds: 40,
    answerDecimals: 1,
    params(rng) {
      const w = rng.pick([4, 5, 6, 8, 10, 12]);
      const m0 = rng.int(8, 60);
      return { w, marks: Array.from({ length: 5 }, (_, i) => m0 + i * w), j: rng.int(1, 3), side: rng.pick(['lower', 'upper']) };
    },
    answer: ({ w, marks, j, side }) => (side === 'lower' ? marks[j] - w / 2 : marks[j] + w / 2),
    // The class found must have the given mark as its mid-point and the marks' step as its width.
    verify({ w, marks, j, side }, value) {
      const [l, u] = side === 'lower' ? [value, value + (marks[j + 1] - marks[j])] : [value - (marks[j + 1] - marks[j]), value];
      return nearlyEqual((l + u) / 2, marks[j]) && nearlyEqual(u - l, w);
    },
    render({ w, marks, j, side }) {
      const l = marks[j] - w / 2;
      const u = marks[j] + w / 2;
      return {
        question: `The class marks of a frequency distribution are ${marks.join(', ')}. What is the ${side} limit of the class whose mark is ${marks[j]}? (The classes are continuous, with no gaps.)`,
        explanation: `Consecutive class marks differ by the class width, so the width is ${marks[1]} − ${marks[0]} = ${w}. A class mark is the middle of its class, so the class runs ${fmt(w / 2, 1)} either side of ${marks[j]}: ${range(l, u)}. Its ${side} limit is ${fmt(side === 'lower' ? l : u, 1)}.`,
        solutionSteps: [`Width = ${marks[1]} − ${marks[0]} = ${w}.`, `Half the width = ${fmt(w / 2, 1)}.`, `Class: ${marks[j]} − ${fmt(w / 2, 1)} to ${marks[j]} + ${fmt(w / 2, 1)} = ${range(l, u)}.`],
        method: 'Width = difference of marks; class = mark ± half the width.',
        hints: ['How far apart are two consecutive class marks? That is the class width.', `The class runs half the width either side of its mark ${marks[j]}.`],
        commonMistakes: [`Taking the mark as a class limit (${marks[j]}–${marks[j] + w}).`, 'Using the whole width instead of half of it either side.']
      };
    }
  },

  /* ============================ cumulative frequency ============================ */
  {
    id: 'gd-cf-count',
    version: 1,
    topicId: 'grouped-data',
    conceptId: 'gd-cumulative',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['gd-cf-f'],
    estimatedSeconds: 40,
    params(rng) {
      const { ctx, h, start } = setting(rng);
      const k = rng.int(5, 6);
      const freqs = randomFreqs(rng, k, 2, 15);
      return { ctx, edges: edgesOf(start, h, k), freqs, j: rng.int(1, k - 1), ask: rng.pick(['less', 'atleast']) };
    },
    answer: ({ freqs, j, ask }) => (ask === 'less' ? lessThanCumulative(freqs)[j - 1] : moreThanCumulative(freqs)[j]),
    // Below and at-or-above the boundary together make everyone.
    verify: ({ freqs, j, ask }, value) => value + (ask === 'less' ? sum(freqs.slice(j)) : sum(freqs.slice(0, j))) === sum(freqs),
    render({ ctx, edges, freqs, j, ask }) {
      const b = edges[j];
      const used = ask === 'less' ? freqs.slice(0, j) : freqs.slice(j);
      const value = sum(used);
      const classes = ask === 'less' ? edges.slice(0, j).map((l, i) => range(l, edges[i + 1])) : edges.slice(j, -1).map((l, i) => range(l, edges[j + i + 1]));
      return {
        table: freqTable(ctx.header, ctx.who, edges, freqs),
        question: `From the table, how many ${ctx.who} have ${ctx.item === 'marks' ? 'marks' : ctx.item} ${ask === 'less' ? `less than ${fmt(b)}` : `of ${fmt(b)} or more`}?`,
        explanation: `${ask === 'less' ? `Less than ${fmt(b)} means every class that ends at or before ${fmt(b)}` : `${fmt(b)} or more means every class from ${fmt(b)} upwards`}: ${classes.join(', ')}. Add their frequencies: ${used.join(' + ')} = ${value}. This is the ${ask === 'less' ? 'less-than' : 'more-than'} cumulative frequency at ${fmt(b)}.`,
        solutionSteps: [`Classes ${ask === 'less' ? 'below' : 'from'} ${fmt(b)}: ${classes.join(', ')}.`, `${used.join(' + ')} = ${value}.`],
        method: ask === 'less' ? 'Less-than cumulative frequency: add from the top down to the boundary.' : 'More-than cumulative frequency: add from the boundary to the bottom (or take the less-than count from the total).',
        hints: [
          `Which classes lie entirely ${ask === 'less' ? 'below' : 'at or above'} ${fmt(b)}?`,
          `Add the frequencies of ${classes.length === 1 ? 'that class' : `those ${classes.length} classes`}.`
        ],
        commonMistakes: [`Including the class that starts at ${fmt(b)} in a “less than ${fmt(b)}” count, or leaving it out of “${fmt(b)} or more”.`]
      };
    }
  },

  {
    id: 'gd-cf-reverse',
    version: 1,
    topicId: 'grouped-data',
    conceptId: 'gd-cumulative',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['gd-cf-f'],
    estimatedSeconds: 50,
    params(rng) {
      const { ctx, h, start } = setting(rng);
      const k = rng.int(5, 6);
      const freqs = randomFreqs(rng, k, 3, 16);
      const ask = rng.pick(['class', 'atleast']);
      return { ctx, edges: edgesOf(start, h, k), freqs, ask, j: ask === 'class' ? rng.int(1, k - 2) : rng.int(2, k - 1) };
    },
    answer({ freqs, ask, j }) {
      const cf = lessThanCumulative(freqs);
      return ask === 'class' ? cf[j] - cf[j - 1] : sum(freqs) - cf[j - 1];
    },
    distractors({ freqs, ask, j }) {
      const cf = lessThanCumulative(freqs);
      const n = sum(freqs);
      return ask === 'class'
        ? [
            { value: cf[j], why: 'gave the cumulative frequency itself' },
            { value: cf[j + 1] - cf[j], why: 'took the next class' },
            { value: cf[j - 1], why: 'read the row above' },
            { value: cf[j] + cf[j - 1], why: 'added the two cumulative frequencies' }
          ]
        : [
            { value: cf[j - 1], why: 'gave the number below the boundary' },
            { value: n - cf[j], why: 'started one class too high' },
            { value: n - cf[j - 2], why: 'started one class too low' },
            { value: cf[j], why: 'read the cumulative frequency at the next boundary' }
          ];
    },
    // Straight from the frequencies the table was built from.
    verify: ({ freqs, ask, j }, value) => value === (ask === 'class' ? freqs[j] : sum(freqs.slice(j))),
    render({ ctx, edges, freqs, ask, j }) {
      const cf = lessThanCumulative(freqs);
      const n = sum(freqs);
      const table = {
        caption: `${ctx.header}: cumulative frequencies for ${n} ${ctx.who}`,
        headers: [ctx.header, `Number of ${ctx.who}`],
        rows: cf.map((c, i) => [`Less than ${fmt(edges[i + 1])}`, fmt(c)])
      };
      if (ask === 'class') {
        return {
          table,
          question: `The table gives a less-than cumulative frequency distribution. How many ${ctx.who} lie in the class ${range(edges[j], edges[j + 1])}?`,
          explanation: `“Less than ${fmt(edges[j + 1])}” counts everyone below ${fmt(edges[j + 1])}, and “less than ${fmt(edges[j])}” everyone below ${fmt(edges[j])}. The difference is the class between them: ${cf[j]} − ${cf[j - 1]} = ${freqs[j]}.`,
          solutionSteps: [`Less than ${fmt(edges[j + 1])}: ${cf[j]}.`, `Less than ${fmt(edges[j])}: ${cf[j - 1]}.`, `${cf[j]} − ${cf[j - 1]} = ${freqs[j]}.`],
          method: 'A class frequency is the difference of two consecutive cumulative frequencies.',
          hints: ['A cumulative frequency counts everyone below a boundary, not just one class.', `Subtract the count below ${fmt(edges[j])} from the count below ${fmt(edges[j + 1])}.`],
          commonMistakes: ['Reading the cumulative frequency as if it were the class frequency.']
        };
      }
      return {
        table,
        question: `The table gives a less-than cumulative frequency distribution. How many ${ctx.who} have ${ctx.item === 'marks' ? 'marks' : ctx.item} of ${fmt(edges[j])} or more?`,
        explanation: `${cf[j - 1]} ${ctx.who} are below ${fmt(edges[j])}, out of ${n} in all. Everyone else is at ${fmt(edges[j])} or more: ${n} − ${cf[j - 1]} = ${n - cf[j - 1]}. That is the more-than cumulative frequency at ${fmt(edges[j])}.`,
        solutionSteps: [`Total n = ${n} (the last row).`, `Less than ${fmt(edges[j])}: ${cf[j - 1]}.`, `${n} − ${cf[j - 1]} = ${n - cf[j - 1]}.`],
        method: 'More-than count at a boundary = n − less-than count at that boundary.',
        hints: ['The last row of a less-than table is the total.', `Take away those below ${fmt(edges[j])}.`],
        commonMistakes: [`Giving ${cf[j - 1]}, the number below ${fmt(edges[j])}.`]
      };
    }
  },

  /* ================================== mean ================================== */
  {
    id: 'gd-mean-direct',
    version: 1,
    topicId: 'grouped-data',
    conceptId: 'gd-mean',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['gd-mean-f'],
    estimatedSeconds: 70,
    answerDecimals: 2,
    tolerance: 0.01,
    params(rng) {
      const { ctx, h, start } = setting(rng);
      const k = rng.int(4, 5);
      const freqs = freqsAddingTo(rng, k, rng.pick([20, 25, 40, 50]), 2, 15);
      if (!freqs) return null;
      const edges = edgesOf(start, h, k);
      if (!hasAtMostDecimals(meanDirect(edges, freqs).mean, 2)) return null;
      return { ctx, h, edges, freqs };
    },
    answer: ({ edges, freqs }) => clean(meanDirect(edges, freqs).mean),
    verify: ({ edges, freqs, h }, value) => nearlyEqual(meanStepDeviation(edges, freqs, classMarks(edges)[1], h).mean, value),
    render({ ctx, edges, freqs }) {
      const { marks, fx, sumFx, n, mean } = meanDirect(edges, freqs);
      return {
        table: freqTable(ctx.header, ctx.who, edges, freqs),
        question: `Find the mean of the grouped data in the table.`,
        explanation: `Each class is represented by its mark (mid-point): ${marks.map((x) => fmt(x)).join(', ')}. Then mean = Σfx ÷ Σf = ${fmt(sumFx)} ÷ ${n} = ${two(mean)}.`,
        solutionSteps: [`Class marks: ${marks.map((x) => fmt(x)).join(', ')}.`, `fx: ${fx.map((v) => fmt(v)).join(', ')}; Σfx = ${fmt(sumFx)}.`, `Σf = ${n}; mean = ${fmt(sumFx)} ÷ ${n} = ${two(mean)}.`],
        method: 'Direct method: multiply each frequency by its class mark, add, divide by the total frequency.',
        hints: ['Represent each class by its mid-point, the class mark.', `Mean = Σfx ÷ Σf, with Σf = ${n}.`],
        commonMistakes: ['Multiplying by the upper (or lower) class limit instead of the class mark.', 'Dividing by the number of classes instead of the total frequency.']
      };
    }
  },

  {
    id: 'gd-mean-step',
    version: 1,
    topicId: 'grouped-data',
    conceptId: 'gd-mean',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['gd-sc-step', 'gd-mean-f'],
    estimatedSeconds: 90,
    answerDecimals: 2,
    formatValue: (value) => fmt(value, 2),
    params(rng) {
      const { ctx, h, start } = setting(rng);
      const k = rng.int(5, 6);
      const freqs = freqsAddingTo(rng, k, rng.pick([40, 50]), 3, 16);
      if (!freqs) return null;
      const edges = edgesOf(start, h, k);
      const A = classMarks(edges)[Math.floor((k - 1) / 2)];
      const result = meanStepDeviation(edges, freqs, A, h);
      if (!hasAtMostDecimals(result.mean, 2) || result.sumFu === 0) return null;
      return { ctx, h, edges, freqs, A };
    },
    answer: ({ edges, freqs, A, h }) => clean(meanStepDeviation(edges, freqs, A, h).mean),
    distractors({ edges, freqs, A, h }) {
      const { sumFu, n, mean } = meanStepDeviation(edges, freqs, A, h);
      return [
        { value: A + sumFu / n, why: 'forgot to multiply by h' },
        { value: mean + h / 2, why: 'used the upper class limits as x' },
        { value: mean - h / 2, why: 'used the lower class limits as x' },
        { value: A - (sumFu / n) * h, why: 'subtracted the correction from A' },
        { value: A + (sumFu / freqs.length) * h, why: 'divided by the number of classes' }
      ];
    },
    // The direct sum, which never uses A or u.
    verify: ({ edges, freqs }, value) => nearlyEqual(sum(freqs.map((f, i) => f * (edges[i] + edges[i + 1]) / 2)) / sum(freqs), value),
    render({ ctx, edges, freqs, A, h }) {
      const { u, fu, sumFu, n, mean } = meanStepDeviation(edges, freqs, A, h);
      const sign = sumFu < 0 ? '−' : '+';
      return {
        table: freqTable(ctx.header, ctx.who, edges, freqs),
        question: `Find the mean of the distribution in the table (use the step-deviation method).`,
        explanation: `Take the assumed mean A = ${fmt(A)} (a central class mark) and h = ${h}. Then u = (x − ${fmt(A)}) ÷ ${h} gives ${u.join(', ')}, so Σfu = ${sumFu}. Mean = A + (Σfu ÷ Σf) × h = ${fmt(A)} ${sign} (${Math.abs(sumFu)} ÷ ${n}) × ${h} = ${two(mean)}.`,
        solutionSteps: [
          `A = ${fmt(A)}, h = ${h}; u = ${u.join(', ')}.`,
          `fu = ${fu.join(', ')}; Σfu = ${sumFu}, Σf = ${n}.`,
          `Mean = ${fmt(A)} + (${sumFu} ÷ ${n}) × ${h} = ${two(mean)}.`
        ],
        method: 'Step deviation: x̄ = A + (Σfu ÷ Σf) × h with u = (x − A) ÷ h.',
        hints: ['Choose a middle class mark as A and the class width as h; then u is a small whole number.', `Find Σfu, divide by ${n}, and do not forget to multiply by h = ${h}.`],
        commonMistakes: ['Forgetting the final × h, which leaves the answer close to A.', 'Using class limits instead of class marks for x.']
      };
    }
  },

  /* ================================= median ================================= */
  {
    id: 'gd-median',
    version: 1,
    topicId: 'grouped-data',
    conceptId: 'gd-median',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['gd-median-f'],
    estimatedSeconds: 80,
    answerDecimals: 2,
    formatValue: (value) => fmt(value, 2),
    params(rng) {
      const table = medianTable(rng);
      return table && { ctx: table.ctx, h: table.h, edges: table.edges, freqs: table.freqs };
    },
    answer: ({ edges, freqs }) => clean(groupedMedian(edges, freqs).median),
    distractors({ edges, freqs }) {
      const { l, h, f, cfBefore, n, median } = groupedMedian(edges, freqs);
      return [
        { value: l + ((n / 2 - cfBefore - f) / f) * h, why: 'used the cumulative frequency up to the median class itself' },
        { value: median + h, why: 'used the upper boundary as l' },
        { value: l + (n / 2 - cfBefore) / f, why: 'forgot to multiply by h' },
        { value: l + h / 2, why: 'gave the class mark of the median class' }
      ];
    },
    // Read n/2 off the more-than ogive instead: walk down from the top.
    verify({ edges, freqs }, value) {
      const n = sum(freqs);
      let above = n;
      for (let i = 0; i < freqs.length; i++) {
        const next = above - freqs[i];
        if (above >= n / 2 && next < n / 2) return nearlyEqual(edges[i] + ((above - n / 2) / freqs[i]) * (edges[i + 1] - edges[i]), value);
        above = next;
      }
      return false;
    },
    render({ ctx, edges, freqs }) {
      const { l, h, f, cfBefore, n, median, index } = groupedMedian(edges, freqs);
      const cf = lessThanCumulative(freqs);
      return {
        table: freqTable(ctx.header, ctx.who, edges, freqs),
        question: `Find the median of the distribution in the table.`,
        explanation: `n = ${n}, so n/2 = ${fmt(n / 2)}. The cumulative frequencies are ${cf.join(', ')}; the first to reach ${fmt(n / 2)} belongs to ${range(l, l + h)}, the median class. With l = ${fmt(l)}, cf = ${cfBefore} (the class before), f = ${f} and h = ${h}: median = ${fmt(l)} + ((${fmt(n / 2)} − ${cfBefore}) ÷ ${f}) × ${h} = ${two(median)}.`,
        solutionSteps: [
          `n/2 = ${fmt(n / 2)}; cumulative frequencies: ${cf.join(', ')}.`,
          `Median class: ${range(l, l + h)} (cf before it ${cfBefore}, f = ${f}).`,
          `Median = ${fmt(l)} + (${fmt(n / 2 - cfBefore)} ÷ ${f}) × ${h} = ${two(median)}.`
        ],
        method: 'Median = l + ((n/2 − cf) ÷ f) × h, with cf the cumulative frequency before the median class.',
        hints: [
          'Find n/2 and the cumulative frequencies first.',
          `The median class is the first whose cumulative frequency reaches ${fmt(n / 2)}${index > 0 ? `; cf is the total of the classes before it, ${cfBefore}` : ''}.`
        ],
        commonMistakes: ['Using the cumulative frequency of the median class itself instead of the class before it.', 'Using the upper boundary of the median class as l.']
      };
    }
  },

  /* ================================== mode ================================== */
  {
    id: 'gd-mode',
    version: 1,
    topicId: 'grouped-data',
    conceptId: 'gd-mode',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['gd-mode-f'],
    estimatedSeconds: 70,
    answerDecimals: 2,
    formatValue: (value) => fmt(value, 2),
    params(rng) {
      const { ctx, h, start } = setting(rng);
      const k = rng.int(5, 6);
      const m = rng.int(1, k - 2);
      const f1 = rng.int(12, 24);
      // Pairs (Δ₁, Δ₂) of unequal drops that give a clean mode at this width.
      const pairs = [];
      for (let d1 = 1; d1 <= 10; d1++) for (let d2 = 1; d2 <= 10; d2++) if (d1 !== d2 && hasAtMostDecimals((d1 * h) / (d1 + d2), 2)) pairs.push([d1, d2]);
      const [d1, d2] = rng.pick(pairs);
      const freqs = randomFreqs(rng, k, 2, f1 - 1);
      freqs[m] = f1;
      freqs[m - 1] = f1 - d1;
      freqs[m + 1] = f1 - d2;
      return { ctx, h, edges: edgesOf(start, h, k), freqs };
    },
    answer: ({ edges, freqs }) => clean(groupedMode(edges, freqs).mode),
    distractors({ edges, freqs }) {
      const { l, h, f0, f1, f2, mode } = groupedMode(edges, freqs);
      return [
        { value: l + ((f1 - f0) / (f1 - f2)) * h, why: 'used f₁ − f₂ as the denominator' },
        { value: l + (f1 - f0) / (2 * f1 - f0 - f2), why: 'forgot to multiply by h' },
        { value: l + ((f1 - f2) / (2 * f1 - f0 - f2)) * h, why: 'swapped f₀ and f₂' },
        { value: mode + h, why: 'used the upper boundary as l' },
        { value: l + h / 2, why: 'gave the class mark of the modal class' }
      ];
    },
    // l + Δ₁ ÷ (Δ₁ + Δ₂) × h, from the table's own frequencies.
    verify({ edges, freqs }, value) {
      const top = Math.max(...freqs);
      const i = freqs.indexOf(top);
      if (freqs.lastIndexOf(top) !== i) return false;
      const d1 = top - (freqs[i - 1] ?? 0);
      const d2 = top - (freqs[i + 1] ?? 0);
      return nearlyEqual(edges[i] + (d1 / (d1 + d2)) * (edges[i + 1] - edges[i]), value);
    },
    render({ ctx, edges, freqs }) {
      const { l, h, f0, f1, f2, mode } = groupedMode(edges, freqs);
      return {
        table: freqTable(ctx.header, ctx.who, edges, freqs),
        question: `Find the mode of the distribution in the table.`,
        explanation: `The highest frequency, ${f1}, makes ${range(l, l + h)} the modal class. With f₀ = ${f0} (the class before) and f₂ = ${f2} (the class after): mode = ${fmt(l)} + ((${f1} − ${f0}) ÷ (2 × ${f1} − ${f0} − ${f2})) × ${h} = ${fmt(l)} + (${f1 - f0} ÷ ${2 * f1 - f0 - f2}) × ${h} = ${two(mode)}.`,
        solutionSteps: [`Modal class: ${range(l, l + h)} (f₁ = ${f1}).`, `f₀ = ${f0}, f₂ = ${f2}, h = ${h}.`, `Mode = ${fmt(l)} + (${f1 - f0} ÷ ${2 * f1 - f0 - f2}) × ${h} = ${two(mode)}.`],
        method: 'Mode = l + ((f₁ − f₀) ÷ (2f₁ − f₀ − f₂)) × h, in the class with the highest frequency.',
        hints: ['The modal class is the one with the highest frequency.', `Use f₁ = ${f1}, f₀ = ${f0} (before) and f₂ = ${f2} (after) in l + ((f₁ − f₀) ÷ (2f₁ − f₀ − f₂)) × h.`],
        commonMistakes: ['Writing f₁ − f₂ in the denominator instead of 2f₁ − f₀ − f₂.', 'Swapping the neighbours f₀ and f₂.']
      };
    }
  },

  /* ================================= ogive ================================= */
  {
    id: 'gd-ogive-read',
    version: 1,
    topicId: 'grouped-data',
    conceptId: 'gd-ogive',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['gd-ogive-f'],
    estimatedSeconds: 70,
    answerDecimals: 1,
    tolerance: 0.1,
    params(rng) {
      const { ctx, h, start } = setting(rng);
      const k = 6;
      const freqs = randomFreqs(rng, k, 2, 16);
      const j = rng.int(1, k - 2);
      const t = rng.pick([0.25, 0.5, 0.75]);
      freqs[j] = 4 * rng.int(2, 5);
      const edges = edgesOf(start, h, k);
      if (!hasAtMostDecimals(t * h, 1)) return null;
      return { ctx, h, edges, freqs, j, t, ask: rng.pick(['count', 'value']) };
    },
    answer({ edges, freqs, j, t, h, ask }) {
      const points = lessThanOgive(edges, freqs);
      const x = edges[j] + t * h;
      return clean(ask === 'count' ? ogiveCountAt(points, x) : ogiveValueAt(points, ogiveCountAt(points, x)));
    },
    // Spread the class's values evenly over it: a share t of its frequency lies below the point.
    verify({ edges, freqs, j, t, h, ask }, value) {
      const below = sum(freqs.slice(0, j)) + freqs[j] * t;
      return ask === 'count' ? nearlyEqual(value, below) : nearlyEqual(value, edges[j] + t * h);
    },
    render({ ctx, edges, freqs, j, t, h, ask }) {
      const cf = [0, ...lessThanCumulative(freqs)];
      const x = edges[j] + t * h;
      const count = cf[j] + freqs[j] * t;
      const n = cf[cf.length - 1];
      const chart = {
        type: 'line',
        caption: `Less-than ogive: ${ctx.header.toLowerCase()} of ${n} ${ctx.who}`,
        unit: '',
        categories: edges.map((e) => fmt(e)),
        series: [{ label: `Number of ${ctx.who} below`, data: cf, colorToken: 'data' }],
        ariaSummary: `Less-than ogive. Cumulative frequency at ${edges.map((e, i) => `${fmt(e)}: ${cf[i]}`).join(', ')}.`
      };
      const interpolation = `${fmt(edges[j])} + ((${fmt(count)} − ${cf[j]}) ÷ (${cf[j + 1]} − ${cf[j]})) × ${h}`;
      return {
        chart,
        question:
          ask === 'count'
            ? `The less-than ogive of a distribution passes through the points shown. Joining them with straight lines, estimate how many ${ctx.who} have ${ctx.item === 'marks' ? 'marks' : ctx.item} less than ${fmt(x, 1)}.`
            : `The less-than ogive of a distribution passes through the points shown. Joining them with straight lines, estimate the value below which ${fmt(count)} of the ${ctx.who} lie.`,
        explanation:
          ask === 'count'
            ? `${fmt(x, 1)} lies ${t * 100}% of the way from ${fmt(edges[j])} to ${fmt(edges[j + 1])}, where the ogive climbs from ${cf[j]} to ${cf[j + 1]}. So the count is ${cf[j]} + ${t} × ${freqs[j]} = ${fmt(count)}.`
            : `${fmt(count)} lies between ${cf[j]} (at ${fmt(edges[j])}) and ${cf[j + 1]} (at ${fmt(edges[j + 1])}). Going the same share of the way along: ${interpolation} = ${fmt(x, 1)}.`,
        solutionSteps:
          ask === 'count'
            ? [`${fmt(x, 1)} is in ${range(edges[j], edges[j + 1])}: cumulative frequency ${cf[j]} → ${cf[j + 1]}.`, `Share of the class: (${fmt(x, 1)} − ${fmt(edges[j])}) ÷ ${h} = ${t}.`, `${cf[j]} + ${t} × ${freqs[j]} = ${fmt(count)}.`]
            : [`${fmt(count)} is between ${cf[j]} and ${cf[j + 1]}.`, `Share: (${fmt(count)} − ${cf[j]}) ÷ ${freqs[j]} = ${t}.`, `${fmt(edges[j])} + ${t} × ${h} = ${fmt(x, 1)}.`],
        method: 'Read between two plotted points in proportion: the ogive is a straight line across each class.',
        hints: [
          ask === 'count' ? `Between which two plotted boundaries does ${fmt(x, 1)} lie?` : `Between which two plotted cumulative frequencies does ${fmt(count)} lie?`,
          'Across one class the ogive is a straight line, so go the same fraction of the way along both axes.'
        ],
        commonMistakes: ['Reading the nearest plotted point instead of interpolating.', 'Using the class frequency instead of the cumulative frequency.']
      };
    }
  },

  /* ============================ histograms with unequal widths ============================ */
  {
    id: 'gd-unequal-height',
    version: 1,
    topicId: 'grouped-data',
    conceptId: 'gd-graphs',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['gd-hist-f'],
    estimatedSeconds: 60,
    answerDecimals: 1,
    tolerance: 0.05,
    params(rng) {
      const { ctx, h, start } = setting(rng);
      const multiples = rng.shuffle([1, 1, 2, 3, 2]).slice(0, 5);
      multiples[0] = 1;
      const edges = [start];
      for (const m of multiples) edges.push(edges[edges.length - 1] + m * h);
      const freqs = multiples.map((m) => m * rng.int(3, 12) + (m > 1 ? rng.int(0, m - 1) : 0));
      const wide = multiples.map((m, i) => (m > 1 ? i : -1)).filter((i) => i >= 0);
      if (!wide.length) return null;
      const j = rng.pick(wide);
      if (!hasAtMostDecimals(adjustedFrequencies(edges, freqs, h)[j], 1)) return null;
      return { ctx, h, edges, freqs, j };
    },
    answer: ({ edges, freqs, h, j }) => clean(adjustedFrequencies(edges, freqs, h)[j]),
    // Area of the bar, in units of the standard width, gives back the frequency.
    verify: ({ edges, freqs, h, j }, value) => nearlyEqual((value * (edges[j + 1] - edges[j])) / h, freqs[j]),
    render({ ctx, edges, freqs, h, j }) {
      const w = edges[j + 1] - edges[j];
      const height = (freqs[j] * h) / w;
      return {
        table: freqTable(ctx.header, ctx.who, edges, freqs),
        question: `A histogram is drawn for this table, with class width ${h} taken as standard. What height (adjusted frequency) should the bar for ${range(edges[j], edges[j + 1])} have?`,
        explanation: `The classes are not all the same width, so a bar's area, not its height, must show its frequency. ${range(edges[j], edges[j + 1])} is ${w} wide, ${w / h} times the standard ${h}, so its height is ${freqs[j]} × ${h} ÷ ${w} = ${fmt(height, 1)}.`,
        solutionSteps: [`Width of ${range(edges[j], edges[j + 1])}: ${w}.`, `Adjusted frequency = f × (standard width ÷ width) = ${freqs[j]} × ${h} ÷ ${w}.`, `= ${fmt(height, 1)}.`],
        method: 'Unequal widths: height = frequency × standard width ÷ class width (area shows frequency).',
        hints: ['When widths differ, a bar’s area must stand for its frequency.', `This class is ${w} wide; scale its frequency down by ${w} ÷ ${h}.`],
        commonMistakes: [`Drawing the bar ${freqs[j]} high, which makes the wide class look ${w / h} times too big.`, 'Multiplying by the width ratio instead of dividing.']
      };
    }
  },

  /* ============================ missing frequencies ============================ */
  {
    id: 'gd-missing-mean',
    version: 1,
    topicId: 'grouped-data',
    conceptId: 'gd-missing',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['gd-sc-missing-mean', 'gd-mean-f'],
    estimatedSeconds: 110,
    params(rng) {
      const { ctx, h, start } = setting(rng);
      const k = 5;
      const freqs = freqsAddingTo(rng, k, 50, 3, 18);
      if (!freqs) return null;
      const edges = edgesOf(start, h, k);
      const mean = meanDirect(edges, freqs).mean;
      const at = rng.int(1, k - 1);
      if (!hasAtMostDecimals(mean, 2) || nearlyEqual(classMarks(edges)[at], mean)) return null;
      return { ctx, h, edges, freqs, at, mean };
    },
    answer: ({ edges, freqs, at, mean }) => clean(missingFrequencyForMean(edges, freqs.map((f, i) => (i === at ? null : f)), mean)),
    // Put it back and recompute the mean directly.
    verify: ({ edges, freqs, at, mean }, value) => nearlyEqual(meanDirect(edges, freqs.map((f, i) => (i === at ? value : f))).mean, mean),
    render({ ctx, edges, freqs, at, mean }) {
      const marks = classMarks(edges);
      const table = freqTable(ctx.header, ctx.who, edges, freqs);
      table.caption = `${ctx.header}: one frequency missing`;
      table.rows[at][1] = 'p';
      const knownFx = sum(freqs.map((f, i) => (i === at ? 0 : f * marks[i])));
      const knownN = sum(freqs) - freqs[at];
      const devs = freqs.map((f, i) => (i === at ? null : f * (marks[i] - mean)));
      return {
        table,
        question: `The mean of the distribution in the table is ${two(mean)}. Find the missing frequency p.`,
        explanation: `With the class marks ${marks.map((x) => fmt(x)).join(', ')}: Σfx = ${fmt(knownFx)} + ${fmt(marks[at])}p and Σf = ${knownN} + p. Setting (${fmt(knownFx)} + ${fmt(marks[at])}p) ÷ (${knownN} + p) = ${two(mean)} gives p = ${freqs[at]}. (Quicker: deviations from the mean balance out, so ${freqs[at]} × (${fmt(marks[at])} − ${two(mean)}) must cancel the other classes' ${two(-sum(devs.filter((v) => v !== null)))}.)`,
        solutionSteps: [
          `Σfx = ${fmt(knownFx)} + ${fmt(marks[at])}p; Σf = ${knownN} + p.`,
          `${fmt(knownFx)} + ${fmt(marks[at])}p = ${two(mean)} × (${knownN} + p) = ${two(mean * knownN)} + ${two(mean)}p.`,
          `${two(marks[at] - mean)}p = ${two(mean * knownN - knownFx)}, so p = ${freqs[at]}.`
        ],
        method: 'Write the mean with p in it, cross-multiply and solve; or use Σf(x − x̄) = 0.',
        hints: ['Both Σfx and Σf contain p.', `Set (${fmt(knownFx)} + ${fmt(marks[at])}p) ÷ (${knownN} + p) equal to ${two(mean)} and solve the linear equation.`],
        commonMistakes: [`Leaving p out of Σf and dividing by ${knownN}.`, 'Using class limits instead of class marks.']
      };
    }
  },

  {
    id: 'gd-missing-median',
    version: 1,
    topicId: 'grouped-data',
    conceptId: 'gd-missing',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['gd-median-f'],
    estimatedSeconds: 120,
    params(rng) {
      const table = medianTable(rng);
      if (!table) return null;
      const { ctx, h, m, edges, freqs } = table;
      return { ctx, h, edges, freqs, at: rng.pick([m - 1, m + 1]), median: groupedMedian(edges, freqs).median };
    },
    answer({ edges, freqs, at, median }) {
      // Median class m stays fixed; solve its formula for the unknown, linear in p.
      const { index: m, l, h, f } = groupedMedian(edges, freqs);
      const others = sum(freqs) - freqs[at];
      const below = sum(freqs.slice(0, m)) - (at < m ? freqs[at] : 0);
      const share = ((median - l) / h) * f; // = n/2 − cf
      return clean(at < m ? others - 2 * below - 2 * share : 2 * (below + share) - others);
    },
    // Try every whole frequency: exactly one must give this median.
    verify({ edges, freqs, at, median }, value) {
      const hits = [];
      for (let p = 0; p <= 300; p++) {
        const trial = freqs.map((f, i) => (i === at ? p : f));
        if (nearlyEqual(groupedMedian(edges, trial).median, median)) hits.push(p);
      }
      return hits.length === 1 && hits[0] === value;
    },
    render({ ctx, edges, freqs, at, median }) {
      const { index: m, l, h, f } = groupedMedian(edges, freqs);
      const table = freqTable(ctx.header, ctx.who, edges, freqs);
      table.caption = `${ctx.header}: one frequency missing`;
      table.rows[at][1] = 'p';
      const others = sum(freqs) - freqs[at];
      const below = sum(freqs.slice(0, m)) - (at < m ? freqs[at] : 0);
      const share = ((median - l) / h) * f;
      const nText = `(${others} + p)`;
      const cfText = at < m ? `(${below} + p)` : `${below}`;
      return {
        table,
        question: `The median of the distribution in the table is ${two(median)}. Find the missing frequency p.`,
        explanation: `${two(median)} lies in ${range(l, l + h)}, so that is the median class: l = ${fmt(l)}, f = ${f}, h = ${h}. The total is n = ${others} + p and the cumulative frequency before the median class is ${cfText}. Then ${two(median)} = ${fmt(l)} + ((${nText}/2 − ${cfText}) ÷ ${f}) × ${h}, so n/2 − cf = (${two(median)} − ${fmt(l)}) × ${f} ÷ ${h} = ${two(share)}, which gives p = ${freqs[at]}.`,
        solutionSteps: [
          `Median class: ${range(l, l + h)} (the median ${two(median)} lies in it).`,
          `n/2 − cf = (${two(median)} − ${fmt(l)}) × ${f} ÷ ${h} = ${two(share)}.`,
          `${nText}/2 − ${cfText} = ${two(share)} → p = ${freqs[at]}.`
        ],
        method: 'Locate the median class from the median itself, then solve the median formula for p (both n and perhaps cf contain p).',
        hints: [`The median ${two(median)} tells you which class is the median class.`, `Write n = ${others} + p, and remember p ${at < m ? 'is also inside cf, the total before the median class' : 'lies after the median class, so it is not in cf'}.`],
        commonMistakes: ['Forgetting that n contains p as well.', at < m ? 'Leaving p out of the cumulative frequency before the median class.' : 'Adding p to the cumulative frequency although its class comes after the median class.']
      };
    }
  }
];
