/**
 * Integer solutions of linear equations: the helpers in utils/diophantine.js
 * held to a brute-force search, and every hand-written integer-solutions
 * answer worked out again here from the numbers in the question.
 */

import { describe, it, expect } from 'vitest';

import {
  bruteSolutions,
  countSolutions,
  countThree,
  egcd,
  gcd,
  generalSolution,
  smallestX,
  solutions,
  starsAndBars
} from '../src/utils/diophantine.js';
import { questionRepository } from '../src/repositories/contentRepository.js';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Every (x, y) with x, y ≥ least, by trying every x and every y. */
function search(a, b, c, least) {
  const out = [];
  for (let x = least; a * x <= c; x++) for (let y = least; a * x + b * y <= c; y++) if (a * x + b * y === c) out.push([x, y]);
  return out;
}
/** Integer solutions in a window, for equations whose solutions may be negative. */
const anyIntegerSolution = (a, b, c) => range(-60, 60).some((x) => (c - a * x) % b === 0);
const tripleCount = (a, b, c, n, least) => {
  let count = 0;
  for (let x = least; a * x <= n; x++) for (let y = least; b * y <= n; y++) for (let z = least; c * z <= n; z++) if (a * x + b * y + c * z === n) count += 1;
  return count;
};
const parse = (text) => {
  const m = /^(\d+)x \+ (\d+)y = (\d+)$/.exec(text);
  return m ? m.slice(1).map(Number) : null;
};

describe('diophantine helpers', () => {
  it('extended Euclid gives the gcd as a combination', () => {
    for (const a of range(1, 40)) {
      for (const b of range(1, 40)) {
        const [g, x, y] = egcd(a, b);
        expect(g).toBe(gcd(a, b));
        expect(a * x + b * y).toBe(g);
      }
    }
  });

  it('finds exactly the solutions a brute-force search finds, positive and non-negative', () => {
    for (const a of range(1, 12)) {
      for (const b of range(1, 12)) {
        for (const c of range(0, 90)) {
          for (const least of [0, 1]) {
            const expected = search(a, b, c, least);
            expect(solutions(a, b, c, least), `${a}x + ${b}y = ${c}, ≥ ${least}`).toEqual(expected);
            expect(bruteSolutions(a, b, c, least)).toEqual(expected);
            expect(countSolutions(a, b, c, least)).toBe(expected.length);
            expect(smallestX(a, b, c, least)).toEqual(expected[0] || null);
          }
        }
      }
    }
  });

  it('has a general solution exactly when the gcd divides c, and steps by b/g and a/g', () => {
    for (const a of range(1, 15)) {
      for (const b of range(1, 15)) {
        for (const c of range(1, 40)) {
          const general = generalSolution(a, b, c);
          expect(!!general, `${a}x + ${b}y = ${c}`).toBe(anyIntegerSolution(a, b, c));
          if (!general) continue;
          const { x0, y0, stepX, stepY } = general;
          for (const t of [-3, 0, 2]) expect(a * (x0 + stepX * t) + b * (y0 - stepY * t)).toBe(c);
          expect(stepX).toBe(b / gcd(a, b));
          expect(stepY).toBe(a / gcd(a, b));
        }
      }
    }
  });

  it('counts three-variable solutions as a brute-force search does', () => {
    for (const [a, b, c] of [[1, 1, 1], [2, 1, 1], [3, 2, 1], [5, 3, 2]]) {
      for (const n of range(0, 30)) {
        for (const least of [0, 1]) expect(countThree(a, b, c, n, least), `${a},${b},${c} = ${n}`).toBe(tripleCount(a, b, c, n, least));
      }
    }
    for (const n of range(0, 30)) {
      expect(starsAndBars(n, 3)).toBe(tripleCount(1, 1, 1, n, 0));
      expect(starsAndBars(n, 3, true)).toBe(tripleCount(1, 1, 1, n, 1));
    }
  });
});

/* ---------------- every hand-written answer, worked out again ---------------- */

const byId = (n) => questionRepository.getById(`integer-solutions-q-${String(n).padStart(3, '0')}`);
const keyed = (q) => q.options.filter((o) => q.correctAnswer.includes(o.id)).map((o) => o.text);
const pos = (a, b, c) => search(a, b, c, 1);
const nonneg = (a, b, c) => search(a, b, c, 0);
const largestUnpayable = (p, q) => {
  let last = null;
  for (let m = 1; m <= p * q; m++) if (!nonneg(p, q, m).length) last = m;
  return last;
};

describe('hand-written integer-solutions questions', () => {
  it('has at least 22 questions, each answer recomputed below', () => {
    expect(questionRepository.getAll().filter((q) => q.topicId === 'integer-solutions').length).toBeGreaterThanOrEqual(22);
  });

  it('keys the right option or value', () => {
    // 1: the only equation with no integer solution.
    expect(keyed(byId(1))).toEqual(byId(1).options.map((o) => o.text).filter((t) => !anyIntegerSolution(...parse(t))));
    expect(byId(2).answer.value).toBe(pos(7, 5, 96)[0][0]);
    // 3: the next solution after (4, 11) with larger x.
    const next = pos(3, 8, 100).find(([x]) => x > 4);
    expect(keyed(byId(3))).toEqual([`x = ${next[0]}, y = ${next[1]}`]);
    expect(keyed(byId(4))).toEqual([pos(2, 3, 12).length === 1 ? 'True' : 'False']);
    expect(byId(6).answer.value).toBe(pos(3, 5, 100).length);
    expect(keyed(byId(7))).toEqual([String(pos(2, 5, 60).length)]);
    expect(byId(8).answer.value).toBe(nonneg(4, 7, 200).length);
    expect(keyed(byId(9))).toEqual([anyIntegerSolution(9, 12, 102) ? 'False' : 'True']);
    expect(byId(10).answer.value).toBe(pos(3, 5, 71).length);
    // 11: exactly one option is a positive solution, and it is keyed.
    const pairs = byId(11).options.map((o) => o.text.match(/\d+/g).map(Number));
    expect(keyed(byId(11))).toEqual(byId(11).options.filter((o, i) => 11 * pairs[i][0] + 4 * pairs[i][1] === 101).map((o) => o.text));
    // 12: more notebooks than pens.
    const canteen = pos(7, 12, 250).filter(([x, y]) => y > x);
    expect(canteen).toHaveLength(1);
    expect(byId(12).answer.value).toBe(canteen[0][0]);
    expect(keyed(byId(13))).toEqual([String(nonneg(5, 8, 200).length)]);
    const xs = pos(13, 9, 500).map(([x]) => x);
    expect(byId(14).answer.value).toBe(Math.max(...xs) - Math.min(...xs));
    expect(keyed(byId(15))).toEqual(byId(15).options.map((o) => o.text).filter((t) => pos(...parse(t)).length === 3));
    for (const { left, right } of byId(16).pairs) expect(String(pos(...parse(left)).length), left).toBe(right);
    // 17: the ordering's numbers.
    expect(pos(7, 5, 96)).toEqual([[3, 15], [8, 8], [13, 1]]);
    expect(byId(18).answer.value).toBe(tripleCount(1, 1, 1, 10, 1));
    expect(byId(19).answer.value).toBe(largestUnpayable(5, 8));
    expect(byId(20).answer.value).toBe(tripleCount(2, 1, 1, 12, 0));
    expect(keyed(byId(21))).toEqual([String(Math.max(...pos(3, 5, 71).map(([x, y]) => x + y)))]);
    expect(keyed(byId(22))).toEqual([range(12, 60).every((m) => nonneg(3, 7, m).length > 0) ? 'True' : 'False']);
    expect(keyed(byId(23))).toEqual([String(tripleCount(1, 1, 1, 15, 2))]);
  });

  it('never offers a second correct answer among the wrong options', () => {
    const solves = (o) => {
      const [x, y] = o.text.match(/\d+/g).map(Number);
      return 3 * x + 8 * y === 100;
    };
    expect(byId(3).options.filter(solves).map((o) => o.text)).toEqual(keyed(byId(3)));
    expect(byId(1).options.filter((o) => !anyIntegerSolution(...parse(o.text)))).toHaveLength(1);
  });
});
