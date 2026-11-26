/**
 * Cryptarithms (src/utils/cryptarithm.js): the three solvers (every digit
 * assignment, column by column, number by number) held to each other, the
 * column candidates for the simulation, and every hand-written
 * cryptarithmetic question re-solved by brute force.
 */

import { describe, it, expect } from 'vitest';

import {
  asAddition,
  bruteForce,
  candidatesAfter,
  columnCount,
  encode,
  leadingLetters,
  lettersOf,
  puzzleText,
  satisfies,
  solveByNumbers,
  solveColumns,
  wordValue
} from '../src/utils/cryptarithm.js';
import { createRng } from '../src/generators/core.js';
import { questionRepository } from '../src/repositories/contentRepository.js';

const key = (assignments) => assignments.map((a) => JSON.stringify(Object.keys(a).sort().map((l) => [l, a[l]]))).sort();
const parse = (text) => {
  const [lhs, result] = text.split(' = ');
  const op = lhs.includes(' + ') ? '+' : lhs.includes(' − ') ? '−' : '×';
  return { op, terms: lhs.split(` ${op} `), result };
};
const POOL = 'ABCDEFGHKLMNPRSTUWXYZ';

describe('the solvers agree', () => {
  it('on hand-made sums, differences and products', () => {
    const cases = [
      ['SEND + MORE = MONEY', 1],
      ['TEA + TEA = ROOT', 1],
      ['AB + AB = CA', 4],
      ['A + A = BC', 5],
      ['AB + BA = CC', 32],
      ['AB + AB = BCA', 0],
      ['CURD − DAL = CAR', 1],
      ['GOA + GOA + GOA = SONG', 1]
    ];
    for (const [text, count] of cases) {
      const puzzle = parse(text);
      const brute = bruteForce(puzzle);
      expect(brute, text).toHaveLength(count);
      expect(key(solveColumns(puzzle).map((s) => s.assignment)), text).toEqual(key(brute));
    }
    for (const text of ['AB × B = ACA', 'AB × C = BBB', 'AB × C = DEB', 'ABC × C = CAD']) {
      const puzzle = parse(text);
      expect(key(solveByNumbers(puzzle)), text).toEqual(key(bruteForce(puzzle)));
    }
  });

  it('on random puzzles written from real numbers', () => {
    const rng = createRng(2026);
    for (let i = 0; i < 120; i++) {
      const kind = i % 4;
      let op;
      let terms;
      if (kind === 0) {
        const a = rng.int(10, 999);
        const b = rng.int(10, 999);
        [op, terms] = ['+', [a, b]];
      } else if (kind === 1) {
        const a = rng.int(10, 999);
        [op, terms] = ['+', [a, a, a]];
      } else if (kind === 2) {
        const a = rng.int(100, 999);
        const b = rng.int(10, a);
        [op, terms] = ['−', [a, b]];
      } else {
        [op, terms] = ['×', [rng.int(10, 99), rng.int(2, 9)]];
      }
      const result = op === '+' ? terms.reduce((x, y) => x + y, 0) : op === '−' ? terms[0] - terms[1] : terms[0] * terms[1];
      if (op === '−' && String(result).length < 2) continue;
      const { puzzle, digitOf } = encode(op, terms, result, POOL);
      if (lettersOf(puzzle).length > 7) continue;
      const brute = bruteForce(puzzle);
      // The puzzle was written from a real sum, so that sum is one of its solutions.
      expect(key(brute), puzzleText(puzzle)).toContain(key([digitOf])[0]);
      const other = op === '×' ? solveByNumbers(puzzle) : solveColumns(puzzle).map((s) => s.assignment);
      expect(key(other), puzzleText(puzzle)).toEqual(key(brute));
    }
  });

  it('respects the rules: distinct digits and no leading zero', () => {
    const puzzle = parse('TEA + TEA = ROOT');
    expect(leadingLetters(puzzle).sort()).toEqual(['R', 'T']);
    expect(satisfies(puzzle, { T: 8, E: 3, A: 4, R: 1, O: 6 })).toBe(true);
    // 0EA + 0EA cannot start with 0, and two letters cannot share a digit.
    expect(satisfies(puzzle, { T: 8, E: 3, A: 3, R: 1, O: 6 })).toBe(false);
    for (const solution of bruteForce(parse('AB + BA = CC'))) {
      expect(solution.A).not.toBe(0);
      expect(solution.B).not.toBe(0);
      expect(new Set(Object.values(solution)).size).toBe(3);
    }
  });

  it('writes numbers as letters and back', () => {
    const { puzzle, digitOf } = encode('+', [834, 834], 1668, 'TEARO');
    expect(puzzleText(puzzle)).toBe('TEA + TEA = ROOT');
    expect(digitOf).toEqual({ T: 8, E: 3, A: 4, R: 1, O: 6 });
    expect(wordValue(puzzle.result, digitOf)).toBe(1668);
    expect(asAddition(parse('CURD − DAL = CAR'))).toEqual(parse('DAL + CAR = CURD'));
  });
});

describe('candidates column by column', () => {
  it('only ever shrink, and end at the single solution', () => {
    for (const text of ['SEND + MORE = MONEY', 'TABLA + TABLA = BANYAN', 'SITAR + STAR = TRAIN', 'CURD − DAL = CAR', 'GOA + GOA + GOA = SONG']) {
      const puzzle = parse(text);
      let previous = null;
      for (let k = 0; k <= columnCount(puzzle); k++) {
        const { candidates, partialCount } = candidatesAfter(puzzle, k);
        expect(partialCount, `${text} after ${k}`).toBeGreaterThan(0);
        if (previous) for (const l of lettersOf(puzzle)) for (const d of candidates[l]) expect(previous[l], `${text} ${l} after ${k}`).toContain(d);
        previous = candidates;
      }
      const [solution] = bruteForce(puzzle);
      expect(previous).toEqual(Object.fromEntries(lettersOf(puzzle).map((l) => [l, [solution[l]]])));
    }
  });
});

/* -------------------------- the hand-written questions -------------------------- */

const only = (text) => {
  const found = bruteForce(parse(text));
  expect(found, `${text} should have exactly one solution`).toHaveLength(1);
  return found[0];
};
const value = (text, word) => wordValue(word, only(text));

/** What each authored question's keyed answer must be, worked out independently. */
const EXPECTED = {
  'cryptarithmetic-q-001': () => 'False',
  'cryptarithmetic-q-002': () => only('KITE + KITE = TIGER').T,
  'cryptarithmetic-q-003': () => String(only('DAL + DAL = BALL').L),
  'cryptarithmetic-q-004': () =>
    Array.from({ length: 10 }, (_, d) => d)
      .filter((d) => (d * d) % 10 === d)
      .join(', '),
  'cryptarithmetic-q-005': () => value('DAL + DAL = RAGA', 'RAGA'),
  'cryptarithmetic-q-006': () => value('IDLI + IDLI = VADA', 'VADA'),
  'cryptarithmetic-q-007': () => bruteForce(parse('AB + AB = CA')).length,
  'cryptarithmetic-q-008': () => {
    const s = only('HOLI + HOLI = LION');
    const last3 = wordValue('HOLI', s) % 1000;
    return 2 * last3 >= 1000 ? 'True' : 'False';
  },
  'cryptarithmetic-q-009': () => value('AB × B = ACA', 'AB'),
  'cryptarithmetic-q-010': () => String(only('TEA + TEAM = MATH').M),
  'cryptarithmetic-q-011': () => {
    // Kabir's 672 + 672 = 1344 against SIX + SIX = HILL: only I gets two digits, and no digit sits under two letters.
    const readings = [...'SIXSIXHILL'].map((l, i) => [l, '6726721344'[i]]);
    const digitsOf = (l) => new Set(readings.filter(([x]) => x === l).map(([, d]) => d));
    const lettersUnder = (d) => new Set(readings.filter(([, y]) => y === d).map(([x]) => x));
    expect(672 + 672).toBe(1344);
    expect([...'SIXHL'].filter((l) => digitsOf(l).size > 1)).toEqual(['I']);
    expect([...'6721344'].every((d) => lettersUnder(d).size === 1)).toBe(true);
    expect(value('SIX + SIX = HILL', 'SIX')).not.toBe(672);
    return 'The same letter, I, stands for two different digits';
  },
  'cryptarithmetic-q-012': () => value('TABLA + TABLA = BANYAN', 'TABLA'),
  'cryptarithmetic-q-013': () => {
    const s = only('SITAR + STAR = TRAIN');
    return ['S', 'T', 'A', 'R'].map((l) => ({ left: l, right: String(s[l]) }));
  },
  'cryptarithmetic-q-014': () => {
    const s = only('BAT + BAT = TALA');
    expect(s).toEqual({ B: 6, A: 2, T: 1, L: 4 });
    return null;
  },
  'cryptarithmetic-q-015': () => {
    const s = only('GOAL + GOAL = AGRA');
    return [
      ['A is even', s.A % 2 === 0],
      ['O = 1', s.O === 1],
      ['L is less than 5', s.L < 5],
      ['A = 2 × G', s.A === 2 * s.G],
      ['R is odd', s.R % 2 === 1]
    ]
      .filter(([, ok]) => ok)
      .map(([text]) => text);
  },
  'cryptarithmetic-q-016': () => String(value('AB × C = BBB', 'AB')),
  'cryptarithmetic-q-017': () => value('CURD − DAL = CAR', 'CURD'),
  'cryptarithmetic-q-018': () => value('TEA + TEA + TEA = EAR', 'TEA'),
  'cryptarithmetic-q-019': () => String(only('READ − TEA = TREE').R),
  'cryptarithmetic-q-020': () => Math.floor((3 * only('GOA + GOA + GOA = SONG').A) / 10),
  'cryptarithmetic-q-021': () => {
    // Largest column total with three numbers, carrying in as much as possible.
    let carry = 0;
    for (let i = 0; i < 6; i++) carry = Math.floor((27 + carry) / 10);
    return carry === 2 ? 'True' : 'False';
  },
  'cryptarithmetic-q-022': () => bruteForce(parse('AB + BA = CC')).length
};

describe('hand-written cryptarithmetic questions', () => {
  const questions = questionRepository.getAll().filter((q) => q.topicId === 'cryptarithmetic');

  it('are all checked here, and there are at least 20', () => {
    expect(questions.length).toBeGreaterThanOrEqual(20);
    expect(questions.map((q) => q.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(Object.keys(EXPECTED))('%s keys the answer found by brute force', (id) => {
    const question = questions.find((q) => q.id === id);
    const expected = EXPECTED[id]();
    const keyed = (ids) => question.options.filter((o) => ids.includes(o.id)).map((o) => o.text);
    if (question.type === 'numerical_input') expect(question.answer.value).toBe(expected);
    else if (question.type === 'match_following') expect(question.pairs).toEqual(expected);
    else if (question.type === 'multiple_choice') expect(keyed(question.correctAnswer).sort()).toEqual(expected.sort());
    else if (question.type === 'ordering') expect(question.steps.length).toBeGreaterThanOrEqual(4);
    else expect(keyed(question.correctAnswer)).toEqual([String(expected)]);
  });

  it('name only puzzles that have exactly one solution, unless they ask for a count', () => {
    const counting = new Set(['cryptarithmetic-q-007', 'cryptarithmetic-q-022']);
    const pattern = /\b([A-Z]{2,}(?: [+−×] [A-Z]{1,})+ = [A-Z]{2,})\b/g;
    for (const question of questions) {
      for (const [, text] of question.question.matchAll(pattern)) {
        const count = bruteForce(parse(text)).length;
        if (counting.has(question.id)) expect(count, `${question.id}: ${text}`).toBeGreaterThan(1);
        else expect(count, `${question.id}: ${text}`).toBe(1);
      }
    }
  });
});
