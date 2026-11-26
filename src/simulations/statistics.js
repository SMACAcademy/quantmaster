/** Simulations for averages and spread. */

import { near, show } from './core.js';

const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
/** The most frequent values, or [] when nothing repeats. */
const modes = (values) => {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  const top = Math.max(...counts.values());
  return top < 2 ? [] : [...counts].filter(([, count]) => count === top).map(([value]) => value).sort((a, b) => a - b);
};
/** Population standard deviation (dividing by n), as the formula cards use. */
const sd = (values) => {
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length);
};

export const meanMedianMode = {
  id: 'mean-median-mode',
  topicId: 'mean-median-mode',
  alsoTopicIds: ['averages'],
  title: 'Mean, median and mode',
  summary: 'Drag five values and see which average reacts to an extreme value and which one holds steady.',
  controls: [1, 2, 3, 4, 5].map((i) => ({
    id: `v${i}`,
    label: `Value ${i}`,
    type: 'range',
    min: 0,
    max: 100,
    step: 1,
    default: [20, 35, 40, 50, 70][i - 1]
  })),
  compute(values) {
    const data = [values.v1, values.v2, values.v3, values.v4, values.v5];
    const m = mean(data);
    const med = median(data);
    const mo = modes(data);
    return {
      numbers: { mean: m, median: med, modes: mo },
      readouts: [
        { label: 'Mean (sum ÷ 5)', value: show(m, 2) },
        { label: 'Median (middle when sorted)', value: show(med, 2) },
        { label: 'Mode', value: mo.length ? mo.map((v) => show(v)).join(', ') : 'None (no value repeats)' },
        { label: 'Range', value: show(Math.max(...data) - Math.min(...data)) }
      ],
      plot: {
        kind: 'dots',
        min: 0,
        max: 100,
        rows: [{ label: 'Values', values: data, tone: 'arithmetic' }],
        lines: [
          { value: m, label: `Mean ${show(m, 1)}`, tone: 'combinatorics' },
          { value: med, label: `Median ${show(med, 1)}`, tone: 'geometry' }
        ],
        summary: `Values ${[...data].sort((a, b) => a - b).join(', ')}: mean ${show(m, 2)}, median ${show(med, 2)}.`
      },
      insight:
        m - med > 2
          ? 'A large value pulls the mean up, but the median only looks at the middle, so it hardly moves.'
          : med - m > 2
            ? 'A small value drags the mean down while the median stays put.'
            : 'When the values are balanced around the middle, the mean and the median agree.'
    };
  },
  tasks: [
    {
      id: 'pull',
      prompt: 'Make the mean at least 10 more than the median.',
      check: (values, n) => n.mean - n.median >= 10,
      solution: { v4: 95, v5: 100 }
    },
    {
      id: 'mode',
      prompt: 'Make 40 the mode.',
      check: (values, n) => n.modes.length === 1 && n.modes[0] === 40,
      solution: { v2: 40 }
    },
    {
      id: 'balance',
      prompt: 'Make the mean equal the median with all five values different.',
      check: (values, n) => new Set(Object.values(values)).size === 5 && near(n.mean, n.median),
      solution: { v1: 20, v2: 30, v3: 40, v4: 50, v5: 60 }
    }
  ]
};

const BASE = [4, 7, 8, 10];

export const spreadTransform = {
  id: 'spread-transform',
  topicId: 'dispersion',
  title: 'What moves the spread?',
  summary: 'Add a constant, multiply by a constant, or add an extreme value, and see what happens to the mean and the standard deviation.',
  controls: [
    { id: 'last', label: 'Fifth value', type: 'range', min: 11, max: 40, step: 1, default: 11 },
    { id: 'add', label: 'Add to every value', type: 'range', min: -10, max: 10, step: 1, default: 0 },
    { id: 'multiply', label: 'Multiply every value by', type: 'range', min: 0.5, max: 3, step: 0.5, default: 1 }
  ],
  compute({ last, add, multiply }) {
    const original = [...BASE, last];
    const changed = original.map((v) => v * multiply + add);
    const m0 = mean(original);
    const s0 = sd(original);
    const m = mean(changed);
    const s = sd(changed);
    const meanDeviation = changed.reduce((sum, v) => sum + Math.abs(v - m), 0) / changed.length;
    const lo = Math.min(...original, ...changed);
    const hi = Math.max(...original, ...changed);
    return {
      numbers: { mean: m, sd: s, originalMean: m0, originalSd: s0, variance: s * s, meanDeviation },
      readouts: [
        { label: 'Mean', value: `${show(m, 2)} (was ${show(m0, 2)})` },
        { label: 'Range', value: show(Math.max(...changed) - Math.min(...changed), 2) },
        { label: 'Mean deviation', value: show(meanDeviation, 3) },
        { label: 'Variance', value: show(s * s, 3) },
        { label: 'Standard deviation', value: `${show(s, 3)} (was ${show(s0, 3)})` },
        { label: 'Coefficient of variation', value: m === 0 ? '—' : `${show((s / Math.abs(m)) * 100, 1)}%` }
      ],
      plot: {
        kind: 'dots',
        min: Math.floor(Math.min(0, lo) / 10) * 10,
        max: Math.ceil(hi / 10) * 10,
        rows: [
          { label: 'Before', values: original, tone: 'arithmetic' },
          { label: 'After', values: changed, tone: 'algebra' }
        ],
        lines: [{ value: m, label: `Mean ${show(m, 1)}`, tone: 'combinatorics', row: 1 }],
        summary: `After the change: mean ${show(m, 2)}, standard deviation ${show(s, 3)}.`
      },
      insight:
        multiply === 1 && add !== 0
          ? 'Adding a constant slides every value along: the mean moves by the same amount, the spread does not change.'
          : multiply !== 1
            ? `Multiplying by ${show(multiply)} stretches the gaps, so the standard deviation is multiplied by ${show(multiply)} too.`
            : last > 20
              ? 'One extreme value drags the mean and inflates the standard deviation, because deviations are squared.'
              : 'Change the controls and compare the two rows of dots.'
    };
  },
  tasks: [
    {
      id: 'double',
      prompt: 'Double the standard deviation.',
      check: (values, n) => near(n.sd, 2 * n.originalSd, 1e-9),
      solution: { multiply: 2 }
    },
    {
      id: 'shift',
      prompt: 'Raise the mean by 5 without changing the standard deviation.',
      check: (values, n) => near(n.mean, n.originalMean + 5) && near(n.sd, n.originalSd),
      solution: { add: 5 }
    },
    {
      id: 'outlier',
      prompt: 'With no adding or multiplying, use one extreme value to make the SD at least three times what it starts at (about 2.45).',
      check: (values, n) => values.add === 0 && values.multiply === 1 && n.sd >= 3 * Math.sqrt(6),
      solution: { last: 30 }
    }
  ]
};
