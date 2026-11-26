/**
 * Modulus: the helpers in src/utils/modulus.js held to a brute-force scan of x
 * over a fine grid (or to integer enumeration), and every hand-written modulus
 * question's keyed answer worked out again independently.
 */

import { describe, it, expect } from 'vitest';

import {
  absLessInterval,
  absSum,
  absText,
  diamondArea,
  diamondPoints,
  diamondPointsInside,
  dist,
  integersWithin,
  minAbsSum,
  signed,
  solveAbsEquals,
  solutionCount,
  solvePiecewise
} from '../src/utils/modulus.js';
import content from '../src/data/content/modulus.json';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
/** x from −40 to 40 in steps of 1/4: every breakpoint and solution below lands on it. */
const GRID = range(-160, 160).map((i) => i / 4);
const hits = (f, c) => GRID.filter((x) => Math.abs(f(x) - c) < 1e-12);

describe('distances', () => {
  it('reads |x − a| as the distance between x and a', () => {
    for (const x of range(-6, 6)) for (const a of range(-6, 6)) expect(dist(x, a)).toBe(Math.max(x, a) - Math.min(x, a));
    expect(absSum(3, [1, 4, 9])).toBe(2 + 1 + 6);
  });

  it('finds the least sum of distances where a scan finds it, flat between the middle points', () => {
    const sets = [[2, 6], [1, 4, 9], [-3, 4, 10, 18], [5, 5, 7], [-8, -2, 0, 3, 11], [0]];
    for (const points of sets) {
      const { min, from, to } = minAbsSum(points);
      const values = GRID.map((x) => absSum(x, points));
      const least = Math.min(...values);
      expect(min, points.join(',')).toBe(least);
      const where = GRID.filter((x, i) => values[i] === least);
      expect([where[0], where[where.length - 1]]).toEqual([from, to]);
    }
  });
});

describe('solving f(x) = c piece by piece', () => {
  it('agrees with a grid scan for one and two moduli, sums and differences', () => {
    for (const a of range(-5, 5)) {
      for (const b of range(a, a + 6)) {
        for (const c of range(-2, 12)) {
          const cases = [
            [(x) => Math.abs(x - a), [a]],
            [(x) => Math.abs(x - a) + Math.abs(x - b), [a, b]],
            [(x) => Math.abs(x - a) - Math.abs(x - b), [a, b]],
            [(x) => Math.abs(Math.abs(x - a) - b), [a, a - b, a + b]]
          ];
          for (const [f, breaks] of cases) {
            const result = solvePiecewise(f, breaks, c);
            const scanned = hits(f, c);
            const where = `a=${a} b=${b} c=${c} ${f}`;
            if (result.intervals.length) {
              // Every scanned hit lies in a reported interval or is a reported point, and vice versa.
              const inside = (x) => result.intervals.some(([lo, hi]) => x >= lo && x <= hi) || result.points.includes(x);
              expect(scanned.every(inside), where).toBe(true);
              expect(GRID.filter(inside).every((x) => Math.abs(f(x) - c) < 1e-12), where).toBe(true);
              expect(solutionCount(result)).toBe(Infinity);
            } else {
              expect(result.points, where).toEqual(scanned);
              expect(solutionCount(result)).toBe(scanned.length);
            }
          }
        }
      }
    }
  });

  it('handles a line outside the modulus, keeping only true solutions', () => {
    // |x − 4| = 2x + 1 has only x = 1 (x = −5 makes the right side negative).
    const r = solvePiecewise((x) => Math.abs(x - 4) - 2 * x, [4], 1);
    expect(r).toEqual({ points: [1], intervals: [] });
  });
});

describe('equations, intervals and counts', () => {
  it('solves |x − a| = b', () => {
    for (const a of range(-5, 5))
      for (const b of range(-3, 6)) expect(solveAbsEquals(a, b)).toEqual(hits((x) => Math.abs(x - a), b));
  });

  it('gives the interval of |x − a| < b and counts its integers', () => {
    for (const a of range(-6, 6)) {
      for (const b of range(0, 7)) {
        const strict = range(-30, 30).filter((x) => Math.abs(x - a) < b).length;
        const loose = range(-30, 30).filter((x) => Math.abs(x - a) <= b).length;
        expect(integersWithin(a, b)).toBe(strict);
        expect(integersWithin(a, b, true)).toBe(loose);
        const iv = absLessInterval(a, b);
        if (b === 0) expect(iv).toBeNull();
        else expect(GRID.every((x) => (Math.abs(x - a) < b) === (x > iv.from && x < iv.to))).toBe(true);
      }
    }
  });

  it('counts the integer points on and inside |x| + |y| = k, and its area', () => {
    for (const k of range(0, 12)) {
      let on = 0;
      let within = 0;
      for (const x of range(-k, k))
        for (const y of range(-k, k)) {
          if (Math.abs(x) + Math.abs(y) === k) on++;
          if (Math.abs(x) + Math.abs(y) <= k) within++;
        }
      expect(diamondPoints(k)).toBe(on);
      expect(diamondPointsInside(k)).toBe(within);
      // Diagonals 2k and 2k.
      expect(diamondArea(k)).toBe((2 * k * 2 * k) / 2);
    }
  });

  it('writes moduli and signs with true minus signs', () => {
    expect(absText(3)).toBe('|x − 3|');
    expect(absText(-2)).toBe('|x + 2|');
    expect(absText(0)).toBe('|x|');
    expect(signed(-4)).toBe('−4');
  });
});

/* ------------------------- hand-written questions ------------------------- */

const byId = Object.fromEntries(content.questions.map((q) => [q.id, q]));
const keyedText = (q) => q.options.find((o) => o.id === q.correctAnswer[0]).text;
const keyedTexts = (q) => q.options.filter((o) => q.correctAnswer.includes(o.id)).map((o) => o.text).sort();
const countOf = (f, breaks, c) => {
  const n = solutionCount(solvePiecewise(f, breaks, c));
  return n === Infinity ? 'Infinitely many' : String(n);
};
const scanCount = (f, c) => {
  // Counted on the quarter grid; two neighbouring hits mean a whole interval of solutions.
  const found = hits(f, c);
  return found.some((x, i) => i && x - found[i - 1] === 0.25) ? 'Infinitely many' : String(found.length);
};
const intervalOf = (holds) => {
  const xs = GRID.filter(holds);
  return [xs[0], xs[xs.length - 1]];
};

const CHECKS = {
  'modulus-q-001': (q) => expect(keyedText(q)).toBe(String(Math.abs(5 - -7))),
  'modulus-q-002': (q) => expect(q.answer.value).toBe(hits((x) => Math.abs(x - 4), 9).reduce((a, b) => a + b, 0)),
  'modulus-q-003': (q) => {
    const [lo, hi] = intervalOf((x) => Math.abs(x - 3) < 5);
    // Strict: the scan's ends are a quarter inside −2 and 8.
    expect(keyedText(q)).toBe(`${signed(lo - 0.25)} < x < ${signed(hi + 0.25)}`);
    expect(Math.abs(-2 - 3)).toBe(5);
  },
  'modulus-q-004': (q) => {
    const alwaysEqual = range(-6, 6).every((a) => range(-6, 6).every((b) => Math.abs(a + b) === Math.abs(a) + Math.abs(b)));
    expect(keyedText(q)).toBe(alwaysEqual ? 'True' : 'False');
  },
  'modulus-q-005': (q) => {
    // The keyed equation's least value is −3, reached only at x = 2.
    const f = (x) => Math.abs(x - 2) - 3;
    const values = GRID.map(f);
    const least = Math.min(...values);
    expect(least).toBe(-3);
    expect(GRID.filter((x, i) => values[i] === least)).toEqual([2]);
    expect(keyedText(q)).toBe('y = |x − 2| − 3');
  },
  'modulus-q-006': (q) => expect(q.answer.value).toBe(Math.max(...hits((x) => Math.abs(2 * x - 7), 11))),
  'modulus-q-007': (q) => expect(keyedText(q)).toBe(signed(hits((x) => Math.abs(x - 3) - Math.abs(x + 5), 0)[0])),
  'modulus-q-008': (q) => expect(q.answer.value).toBe(range(-30, 30).filter((x) => Math.abs(x + 2) <= 6).length),
  'modulus-q-009': (q) => expect(keyedText(q)).toBe(`${Math.min(...GRID.map((x) => absSum(x, [3, 11, 20])))} km`),
  'modulus-q-010': (q) => {
    const roots = hits((x) => Math.abs(x + 3) - 4, 0);
    expect(q.answer.value).toBe(roots[1] - roots[0]);
  },
  'modulus-q-011': (q) => {
    const outside = GRID.filter((x) => Math.abs(x - 1) > 4);
    const left = Math.max(...outside.filter((x) => x < 1)) + 0.25;
    const right = Math.min(...outside.filter((x) => x > 1)) - 0.25;
    expect(keyedText(q)).toBe(`x < ${signed(left)} or x > ${signed(right)}`);
  },
  'modulus-q-012': (q) => expect(q.answer.value).toBe(Math.min(...GRID.map((x) => absSum(x, [2, 5, 9, 14])))),
  'modulus-q-013': (q) => expect(keyedText(q)).toBe(scanCount((x) => absSum(x, [2, 6]), 10)),
  'modulus-q-014': (q) => {
    const expected = {
      '|x − 3| = 5': scanCount((x) => Math.abs(x - 3), 5),
      '|x + 1| = 0': scanCount((x) => Math.abs(x + 1), 0),
      '|x − 2| = −4': scanCount((x) => Math.abs(x - 2), -4),
      '|x − 1| + |x − 4| = 3': scanCount((x) => absSum(x, [1, 4]), 3)
    };
    for (const pair of q.pairs) expect(pair.right, pair.left).toBe(expected[pair.left]);
  },
  'modulus-q-015': (q) => {
    const sols = hits((x) => Math.abs(x - 4) - 2 * x, 1);
    expect(sols).toEqual([1]);
    expect(keyedText(q)).toBe('x = 1 only');
  },
  'modulus-q-016': (q) => {
    const truth = {
      '|x − 5| < 3 has exactly 5 integer solutions': range(-20, 20).filter((x) => Math.abs(x - 5) < 3).length === 5,
      '|x| ≥ 0 for every real x': GRID.every((x) => Math.abs(x) >= 0),
      '|x + 2| < −1 has no solution': GRID.every((x) => !(Math.abs(x + 2) < -1)),
      '|x − 1| > 2 means −1 < x < 3': GRID.every((x) => (Math.abs(x - 1) > 2) === (x > -1 && x < 3)),
      'If |x − 2| < 1, then |x| < 1': GRID.every((x) => !(Math.abs(x - 2) < 1) || Math.abs(x) < 1)
    };
    expect(keyedTexts(q)).toEqual(Object.keys(truth).filter((k) => truth[k]).sort());
  },
  'modulus-q-017': (q) => expect(q.answer.value).toBe(Math.min(...range(0, 25).map((x) => absSum(x, [2, 5, 7, 12, 20])))),
  'modulus-q-018': (q) => expect(q.answer.value).toBe(hits((x) => Math.abs(Math.abs(x - 3) - 4), 2).length),
  'modulus-q-019': (q) => {
    // Shoelace on the corners where |x| + |y| = 6 meets the axes.
    const [left, right] = hits((x) => Math.abs(x), 6);
    const corners = [[right, 0], [0, right], [left, 0], [0, left]];
    let twice = 0;
    corners.forEach(([x1, y1], i) => {
      const [x2, y2] = corners[(i + 1) % 4];
      twice += x1 * y2 - x2 * y1;
    });
    expect(q.answer.value).toBe(Math.abs(twice) / 2);
  },
  'modulus-q-020': (q) => {
    let count = 0;
    for (const x of range(-6, 6)) for (const y of range(-6, 6)) if (Math.abs(x) + Math.abs(y) === 5) count++;
    expect(keyedText(q)).toBe(String(count));
  },
  'modulus-q-021': (q) => {
    const fours = range(-5, 10).filter((k) => scanCount((x) => Math.abs(Math.abs(x) - 3), k) === '4');
    expect(keyedText(q)).toBe(String(fours.length));
  },
  'modulus-q-022': (q) => {
    // Meeting points: exact hits on a fine grid plus strict sign changes between neighbours.
    const f = (x) => Math.abs(x * x - 4);
    const fine = range(-8000, 8000).map((i) => i / 1000);
    const crossings = (c) => fine.filter((x) => f(x) === c).length + fine.filter((x, i) => i && (f(fine[i - 1]) - c) * (f(x) - c) < 0).length;
    const truth = {
      'It meets the x-axis at x = −2 and x = 2': JSON.stringify(fine.filter((x) => f(x) === 0)) === JSON.stringify([-2, 2]),
      'It cuts the y-axis at y = 4': f(0) === 4,
      'The line y = 3 meets it at exactly 4 points': crossings(3) === 4,
      'The line y = 5 meets it at exactly 4 points': crossings(5) === 4,
      'Its least value is −4': Math.min(...fine.map(f)) === -4
    };
    expect(keyedTexts(q)).toEqual(Object.keys(truth).filter((k) => truth[k]).sort());
  },
  'modulus-q-023': (q) => {
    let count = 0;
    for (const x of range(-4, 4)) for (const y of range(-4, 4)) if (Math.abs(x) + Math.abs(y) <= 4) count++;
    expect(q.answer.value).toBe(count);
  }
};

describe('hand-written modulus questions', () => {
  it('are all checked here', () => {
    expect(Object.keys(CHECKS).sort()).toEqual(content.questions.map((q) => q.id).sort());
    expect(content.questions.length).toBeGreaterThanOrEqual(20);
  });

  for (const [id, check] of Object.entries(CHECKS)) {
    it(`${id} has the right keyed answer`, () => check(byId[id]));
  }

  it('keep the counts used by the countOf helper consistent with the scan', () => {
    expect(countOf((x) => absSum(x, [1, 4]), [1, 4], 3)).toBe(scanCount((x) => absSum(x, [1, 4]), 3));
    expect(countOf((x) => absSum(x, [2, 6]), [2, 6], 10)).toBe('2');
  });
});
