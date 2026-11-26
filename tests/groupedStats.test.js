/**
 * Grouped data helpers (src/utils/groupedStats.js), each checked against a
 * textbook table worked by hand and against a second route: the three mean
 * methods against each other, the median formula against reading the ogive,
 * and the mode formula against its Δ₁ / (Δ₁ + Δ₂) arrangement.
 */

import { describe, it, expect } from 'vitest';

import {
  adjustedFrequencies,
  binValues,
  classMarks,
  classWidths,
  frequencyDensity,
  groupedMedian,
  groupedMode,
  lessThanCumulative,
  lessThanOgive,
  meanAssumed,
  meanDirect,
  meanStepDeviation,
  medianClassIndex,
  missingFrequencyForMean,
  modalClassIndex,
  moreThanCumulative,
  moreThanOgive,
  ogiveCountAt,
  ogiveValueAt,
  rawMean,
  rawMedian,
  sum,
  toBoundaries
} from '../src/utils/groupedStats.js';

const edgesOf = (start, width, count) => Array.from({ length: count + 1 }, (_, i) => start + i * width);

/** A small deterministic generator, so the property checks cover many tables. */
function tables(count) {
  let state = 12345;
  const next = (max) => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % max;
  };
  return Array.from({ length: count }, () => {
    const k = 3 + next(6);
    const width = [2, 4, 5, 10, 20][next(5)];
    const start = width * next(8);
    return { edges: edgesOf(start, width, k), freqs: Array.from({ length: k }, () => 1 + next(20)) };
  });
}

describe('classes', () => {
  it('finds marks and widths', () => {
    expect(classMarks([10, 20, 30, 50])).toEqual([15, 25, 40]);
    expect(classWidths([10, 20, 30, 50])).toEqual([10, 10, 20]);
  });

  it('turns inclusive classes into boundaries by half the gap', () => {
    expect(toBoundaries([[10, 19], [20, 29], [30, 39]])).toEqual([9.5, 19.5, 29.5, 39.5]);
    expect(toBoundaries([[1.5, 1.9], [2.0, 2.4]]).map((v) => Number(v.toFixed(10)))).toEqual([1.45, 1.95, 2.45]);
    expect(toBoundaries([[0, 10], [10, 20]])).toEqual([0, 10, 20]);
    expect(() => toBoundaries([[10, 19], [20, 29], [31, 39]])).toThrow();
  });

  it('counts raw values into classes, a value on a boundary going up', () => {
    expect(binValues([0, 9, 10, 15, 20, 29], [0, 10, 20, 30])).toEqual([2, 2, 2]);
  });
});

describe('cumulative frequencies and ogives', () => {
  const freqs = [4, 7, 12, 9, 8];
  const edges = edgesOf(0, 10, 5);

  it('runs less-than and more-than totals', () => {
    expect(lessThanCumulative(freqs)).toEqual([4, 11, 23, 32, 40]);
    expect(moreThanCumulative(freqs)).toEqual([40, 36, 29, 17, 8]);
  });

  it('plots each ogive at the right boundaries', () => {
    expect(lessThanOgive(edges, freqs)).toEqual([[0, 0], [10, 4], [20, 11], [30, 23], [40, 32], [50, 40]]);
    expect(moreThanOgive(edges, freqs)).toEqual([[0, 40], [10, 36], [20, 29], [30, 17], [40, 8], [50, 0]]);
  });

  it('reads counts and values off an ogive by straight lines', () => {
    const points = lessThanOgive(edges, freqs);
    expect(ogiveCountAt(points, 25)).toBe(17);
    expect(ogiveCountAt(points, -5)).toBe(0);
    expect(ogiveCountAt(points, 99)).toBe(40);
    expect(ogiveValueAt(points, 17)).toBe(25);
    expect(ogiveValueAt(points, 0)).toBe(0);
  });

  it('crosses the two ogives at the median, at height n/2', () => {
    for (const { edges: e, freqs: f } of tables(200)) {
      const median = groupedMedian(e, f).median;
      expect(ogiveCountAt(lessThanOgive(e, f), median)).toBeCloseTo(sum(f) / 2, 9);
      expect(ogiveCountAt(moreThanOgive(e, f), median)).toBeCloseTo(sum(f) / 2, 9);
    }
  });
});

describe('mean', () => {
  it('works a textbook table three ways', () => {
    const edges = edgesOf(100, 20, 6);
    const freqs = [5, 8, 12, 15, 6, 4];
    expect(meanDirect(edges, freqs)).toMatchObject({ sumFx: 7920, n: 50, mean: 158.4 });
    expect(meanAssumed(edges, freqs, 150)).toMatchObject({ sumFd: 420, mean: 158.4 });
    const step = meanStepDeviation(edges, freqs, 150, 20);
    expect(step.u).toEqual([-2, -1, 0, 1, 2, 3]);
    expect(step.sumFu).toBe(21);
    expect(step.mean).toBeCloseTo(158.4, 9);
  });

  it('gives the same mean by every method and every assumed mean', () => {
    for (const { edges, freqs } of tables(200)) {
      const direct = meanDirect(edges, freqs).mean;
      const marks = classMarks(edges);
      const h = edges[1] - edges[0];
      for (const a of [marks[0], marks[Math.floor(marks.length / 2)], 0]) {
        expect(meanAssumed(edges, freqs, a).mean).toBeCloseTo(direct, 9);
        expect(meanStepDeviation(edges, freqs, a, h).mean).toBeCloseTo(direct, 9);
      }
    }
  });

  it('finds a missing frequency from the mean, by balancing the deviations', () => {
    const edges = edgesOf(0, 20, 5);
    expect(missingFrequencyForMean(edges, [8, 12, null, 10, 5], 46.8)).toBeCloseTo(15, 9);
    for (const { edges: e, freqs } of tables(100)) {
      const mean = meanDirect(e, freqs).mean;
      const at = freqs.length - 1 - (freqs.length % 2);
      if (Math.abs(classMarks(e)[at] - mean) < 1e-6) continue;
      const hidden = freqs.map((f, i) => (i === at ? null : f));
      expect(missingFrequencyForMean(e, hidden, mean)).toBeCloseTo(freqs[at], 6);
    }
  });
});

describe('median', () => {
  it('works a textbook table', () => {
    const result = groupedMedian(edgesOf(0, 10, 6), [6, 9, 7, 15, 7, 6]);
    expect(result).toMatchObject({ index: 3, l: 30, h: 10, f: 15, cfBefore: 22, n: 50 });
    expect(result.median).toBeCloseTo(32, 9);
    expect(medianClassIndex([6, 9, 7, 15, 7, 6])).toBe(3);
  });

  it('takes the upper boundary when n/2 is reached exactly at the end of a class', () => {
    // n/2 = 10 is reached at the top of 10–20 (cf 5 + 5), so the median is that class's upper boundary.
    expect(groupedMedian(edgesOf(0, 10, 3), [5, 5, 10])).toMatchObject({ index: 1, median: 20 });
  });

  it('agrees with reading n/2 off the less-than ogive', () => {
    for (const { edges, freqs } of tables(300)) {
      expect(groupedMedian(edges, freqs).median).toBeCloseTo(ogiveValueAt(lessThanOgive(edges, freqs), sum(freqs) / 2), 9);
    }
  });

  it('finds the plain median and mean of raw data', () => {
    expect(rawMedian([5, 1, 3])).toBe(3);
    expect(rawMedian([4, 1, 3, 2])).toBe(2.5);
    expect(rawMean([1, 2, 3, 6])).toBe(3);
  });
});

describe('mode', () => {
  it('works a textbook table', () => {
    const result = groupedMode(edgesOf(20, 10, 6), [6, 10, 16, 12, 5, 1]);
    expect(result).toMatchObject({ index: 2, l: 40, f0: 10, f1: 16, f2: 12 });
    expect(result.mode).toBeCloseTo(46, 9);
  });

  it('counts a missing neighbour as 0 at either end', () => {
    expect(groupedMode(edgesOf(0, 10, 3), [12, 8, 2]).mode).toBeCloseTo(10 * (12 / 16), 9);
    expect(groupedMode(edgesOf(0, 10, 3), [2, 8, 12]).mode).toBeCloseTo(20 + 10 * (12 - 8) / (24 - 8), 9);
  });

  it('has no modal class when the top frequency is tied', () => {
    expect(modalClassIndex([3, 9, 9, 2])).toBe(-1);
    expect(groupedMode(edgesOf(0, 10, 4), [3, 9, 9, 2])).toBeNull();
  });

  it('agrees with l + Δ₁ ÷ (Δ₁ + Δ₂) × h and stays inside the modal class', () => {
    for (const { edges, freqs } of tables(300)) {
      const result = groupedMode(edges, freqs);
      if (!result) continue;
      const d1 = result.f1 - result.f0;
      const d2 = result.f1 - result.f2;
      expect(result.mode).toBeCloseTo(result.l + (d1 / (d1 + d2)) * result.h, 9);
      expect(result.mode).toBeGreaterThanOrEqual(result.l);
      expect(result.mode).toBeLessThanOrEqual(result.l + result.h);
    }
  });
});

describe('unequal class widths', () => {
  it('scales heights to the narrowest width and keeps area equal to frequency', () => {
    const edges = [0, 10, 20, 40, 70, 80];
    const freqs = [5, 8, 18, 21, 4];
    expect(frequencyDensity(edges, freqs)).toEqual([0.5, 0.8, 0.9, 0.7, 0.4]);
    expect(adjustedFrequencies(edges, freqs)).toEqual([5, 8, 9, 7, 4]);
    expect(adjustedFrequencies(edges, freqs, 5)).toEqual([2.5, 4, 4.5, 3.5, 2]);
    const widths = classWidths(edges);
    adjustedFrequencies(edges, freqs).forEach((height, i) => expect((height * widths[i]) / 10).toBeCloseTo(freqs[i], 9));
  });
});
