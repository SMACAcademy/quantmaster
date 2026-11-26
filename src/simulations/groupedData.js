/**
 * Simulations: Grouped data: histogram, frequency polygon and ogive (grouped-data).
 * Their meta.js entries keep this order.
 *
 * One fixed set of 50 raw values at a time is sorted into classes. The class
 * width and the position of the class edges are sliders, so the learner sees
 * the histogram, the frequency polygon and both ogives rebuild, and finds that
 * the grouped median hardly moves while the modal class jumps about. The maths
 * comes from utils/groupedStats.js; tests/simulations-groupeddata.test.js
 * checks it against counting the raw values directly.
 */

import { show } from './core.js';
import { binValues, classMarks, groupedMedian, groupedMode, lessThanOgive, meanDirect, moreThanOgive, rawMean, rawMedian } from '../utils/groupedStats.js';

/** The two raw data sets: 50 whole numbers each. */
export const GROUPED_DATA_SETS = {
  marks: {
    unit: 'marks',
    values: [
      50, 51, 46, 44, 67, 37, 70, 52, 41, 29, 67, 38, 51, 42, 53, 64, 29, 56, 53, 71, 58, 37, 46, 38, 68, 43, 61, 63, 68, 63, 65, 63, 63, 64, 62, 49, 54,
      59, 47, 15, 29, 44, 44, 58, 54, 86, 53, 55, 22, 49
    ]
  },
  commute: {
    unit: 'minutes',
    values: [
      30, 37, 9, 25, 6, 24, 32, 17, 56, 10, 37, 34, 28, 5, 18, 12, 54, 11, 35, 32, 10, 5, 39, 9, 11, 7, 18, 74, 10, 6, 46, 12, 16, 88, 11, 15, 9, 49, 32,
      50, 20, 40, 27, 7, 26, 23, 12, 37, 25, 5
    ]
  }
};

/**
 * Class edges of width `width`, each `shift` more than a multiple of the width,
 * starting at the last edge at or below the smallest value and running until
 * the largest value is covered (a class holds its lower edge, not its upper).
 */
export function classEdges(values, width, shift) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const first = shift + Math.floor((min - shift) / width) * width;
  const count = Math.floor((max - first) / width) + 1;
  return Array.from({ length: count + 1 }, (_, i) => first + i * width);
}

/** The grouping a setting gives: edges, counts and the three grouped measures. */
function grouping(values, width, shift) {
  const edges = classEdges(values, width, shift);
  const freqs = binValues(values, edges);
  return { edges, freqs, mean: meanDirect(edges, freqs).mean, median: groupedMedian(edges, freqs), mode: groupedMode(edges, freqs) };
}

const classText = (l, u) => `${show(l)}–${show(u)}`;

/** Histogram outline: up, across and down for each class, so every bar shows its sides. */
function barOutline(edges, freqs) {
  const points = [[edges[0], 0]];
  freqs.forEach((f, i) => points.push([edges[i], f], [edges[i + 1], f], [edges[i + 1], 0]));
  return points;
}

export const histogramOgive = {
  id: 'histogram-ogive',
  topicId: 'grouped-data',
  alsoTopicIds: ['mean-median-mode'],
  title: 'From raw data to histogram, polygon and ogive',
  summary: 'Sort 50 values into classes, then change the width and move the class edges: the median barely moves, but the modal class jumps.',
  controls: [
    {
      id: 'data',
      label: 'Data set',
      type: 'choice',
      options: [
        { id: 'marks', label: 'Test marks' },
        { id: 'commute', label: 'Commute times' }
      ],
      default: 'marks'
    },
    { id: 'width', label: 'Class width', type: 'range', min: 4, max: 20, step: 2, default: 10 },
    { id: 'shift', label: 'Move the class edges right by', type: 'range', min: 0, max: 9, step: 1, default: 0 },
    {
      id: 'view',
      label: 'Show',
      type: 'choice',
      options: [
        { id: 'both', label: 'Histogram and ogives' },
        { id: 'histogram', label: 'Histogram and polygon' },
        { id: 'ogive', label: 'Ogives' }
      ],
      default: 'both'
    }
  ],
  compute({ data, width, shift, view }) {
    const set = GROUPED_DATA_SETS[data];
    const values = set.values;
    const { edges, freqs, mean, median: med, mode: mo } = grouping(values, width, shift);
    const k = freqs.length;
    const n = values.length;
    const median = med.median;
    const trueMedian = rawMedian(values);
    const trueMean = rawMean(values);
    const first = edges[0];
    const last = edges[k];
    const marks = classMarks(edges);

    // How the grouped median and the modal class move over every edge position at this width.
    const others = Array.from({ length: 10 }, (_, s) => grouping(values, width, s));
    const medians = others.map((g) => g.median.median);
    const modalStarts = others.filter((g) => g.mode).map((g) => g.mode.l);
    const medianSpread = Math.max(...medians) - Math.min(...medians);

    const modalClass = mo ? classText(mo.l, mo.l + mo.h) : null;
    const medianClass = classText(med.l, med.l + med.h);

    /* ----------------------------- histogram and polygon ----------------------------- */
    const polygon = [[first - width / 2, 0], ...marks.map((x, i) => [x, freqs[i]]), [last + width / 2, 0]];
    const series = [
      { id: 'axis', points: [[first - width, 0], [last + width, 0]], tone: 'data' },
      { id: 'bars', label: 'Histogram', tone: 'data', points: barOutline(edges, freqs) },
      { id: 'polygon', label: 'Frequency polygon', tone: 'arithmetic', points: polygon }
    ];
    const fills = [{ from: 'axis', to: 'bars', tone: 'data' }];
    if (mo) {
      series.push({ id: 'modal', label: 'Modal class', tone: 'advanced', points: [[mo.l, 0], [mo.l, mo.f1], [mo.l + mo.h, mo.f1], [mo.l + mo.h, 0]] });
      fills.push({ from: 'axis', to: 'modal', tone: 'advanced' });
    }
    const histogram = {
      kind: 'xy',
      x: { min: first - width, max: last + width, label: set.unit },
      y: { min: 0, max: Math.max(...freqs) + 2, label: 'frequency' },
      series,
      fills,
      guides: mo ? [{ axis: 'x', value: mo.mode, label: `mode ≈ ${show(mo.mode, 1)}` }] : [],
      summary: `Histogram of ${k} classes of width ${width} from ${show(first)} to ${show(last)}, with frequencies ${freqs.join(', ')}. The frequency polygon joins the class marks and is closed at ${show(first - width / 2)} and ${show(last + width / 2)}. ${
        mo ? `The modal class is ${modalClass}, mode about ${show(mo.mode, 1)}.` : 'Two classes tie for the highest frequency.'
      }`
    };

    /* ------------------------------------ ogives ------------------------------------ */
    const ogive = {
      kind: 'xy',
      x: { min: first, max: last, label: set.unit },
      y: { min: 0, max: n, label: 'cumulative frequency' },
      series: [
        { id: 'less', label: 'Less-than ogive', tone: 'data', points: lessThanOgive(edges, freqs) },
        { id: 'more', label: 'More-than ogive', tone: 'geometry', dashed: true, points: moreThanOgive(edges, freqs) }
      ],
      guides: [
        { axis: 'y', value: n / 2, label: `n/2 = ${show(n / 2)}` },
        { axis: 'x', value: median, label: `median ≈ ${show(median, 1)}` }
      ],
      markers: [{ x: median, y: n / 2, tone: 'advanced' }],
      summary: `The less-than ogive rises from 0 at ${show(first)} to ${n} at ${show(last)}; the more-than ogive falls from ${n} to 0. They cross at (${show(median, 1)}, ${show(n / 2)}), and ${show(median, 1)} is the median.`
    };

    const plot =
      view === 'histogram' ? histogram : view === 'ogive' ? ogive : { kind: 'stack', plots: [histogram, ogive], summary: `${histogram.summary} ${ogive.summary}` };

    let insight;
    if (!mo) {
      insight = `Two classes tie for the highest frequency, so this grouping has no single modal class, yet the median still reads ${show(median, 1)}.`;
    } else if (mo.index === 0) {
      insight = 'The modal class is the very first class, so the class before it counts as frequency 0 in the mode formula: f₀ = 0.';
    } else if (data === 'commute') {
      insight = `A few long commutes stretch the data to the right, so the mean (${show(mean, 1)}) sits above the median (${show(median, 1)}), and the median above the mode (${show(mo.mode, 1)}).`;
    } else {
      insight = `Over the ten edge positions at width ${width}, the grouped median moves by at most ${show(medianSpread, 1)} (the raw median is ${show(trueMedian)}), but the modal class can start anywhere from ${show(Math.min(...modalStarts))} to ${show(Math.max(...modalStarts))}.`;
    }

    return {
      numbers: {
        edges,
        freqs,
        classes: k,
        n,
        mean,
        median,
        trueMedian,
        trueMean,
        medianIndex: med.index,
        modalIndex: mo ? mo.index : -1,
        modalLower: mo ? mo.l : null,
        mode: mo ? mo.mode : null,
        medianSpread
      },
      readouts: [
        { label: 'Classes', value: `${k} classes of width ${width}: ${classText(first, first + width)}, …, ${classText(last - width, last)}` },
        { label: 'Frequencies', value: freqs.join(', ') },
        { label: 'Modal class and mode', value: mo ? `${modalClass}, mode ≈ ${show(mo.mode, 2)}` : 'two classes tie: no single modal class' },
        { label: 'Median (grouped)', value: `${show(median, 2)}, in the class ${medianClass} (n/2 = ${show(n / 2)})` },
        { label: 'Median of the raw data', value: show(trueMedian) },
        { label: 'Mean (grouped, from class marks)', value: `${show(mean, 2)} (raw data: ${show(trueMean, 2)})` }
      ],
      plot,
      insight
    };
  },
  tasks: [
    {
      id: 'modal-jump',
      prompt: 'With the test marks at width 10, move the class edges until the modal class starts at 60 or more.',
      check: (values, n) => values.data === 'marks' && values.width === 10 && n.modalLower !== null && n.modalLower >= 60,
      solution: { data: 'marks', width: 10, shift: 1 }
    },
    {
      id: 'tie',
      prompt: 'Find a grouping of the test marks in which two classes tie for the highest frequency, so there is no single modal class.',
      check: (values, n) => values.data === 'marks' && n.modalIndex === -1,
      solution: { data: 'marks', width: 10, shift: 3 }
    },
    {
      id: 'first-class',
      prompt: 'Switch to the commute times and find a width at which the very first class is the modal class.',
      check: (values, n) => values.data === 'commute' && n.modalIndex === 0,
      solution: { data: 'commute', width: 12, shift: 0 }
    }
  ]
};

export const groupedDataSims = [histogramOgive];
