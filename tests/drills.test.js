/**
 * Must-know tables and speed drills. Every value in the tables is checked here
 * against an independent calculation, and the answer checker against the ways
 * people actually type answers.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { MIXED, TABLES, TRIG_OPTION_VALUES, TRIG_OPTIONS, TRIPLETS, getTable, percentOf } from '../src/drills/tables.js';
import { bestScore, isCorrect, parseAnswer, questionStream, recordDrill } from '../src/drills/drill.js';
import { resetProgress } from '../src/repositories/progressRepository.js';

const table = (id) => getTable(id);
const plain = (text) => Number(String(text).replace(/,/g, ''));
const RAD = Math.PI / 180;

/** The value of a mixed-number percentage such as "33 1/3%". */
function mixedValue(text) {
  const match = /^(\d+)(?: (\d+)\/(\d+))?%$/.exec(text);
  return Number(match[1]) + (match[2] ? Number(match[2]) / Number(match[3]) : 0);
}

beforeEach(() => {
  resetProgress();
  try {
    window.localStorage.removeItem('quantmaster:v1:drill-best');
  } catch {
    /* storage unavailable: the in-memory fallback starts empty anyway */
  }
});

describe('the tables are correct', () => {
  it('squares and cubes', () => {
    table('squares').entries.forEach((e, i) => expect(plain(e.right)).toBe((i + 1) * (i + 1)));
    table('cubes').entries.forEach((e, i) => expect(plain(e.right)).toBe((i + 1) ** 3));
  });

  it('square roots to three places', () => {
    for (const e of table('square-roots').entries) expect(Number(e.right)).toBeCloseTo(Math.sqrt(Number(e.left.slice(1))), 3);
  });

  it('fractions as percentages', () => {
    for (const e of table('fractions').entries) {
      const [a, n] = e.left.split('/').map(Number);
      expect(mixedValue(e.right), e.left).toBeCloseTo((100 * a) / n, 9);
    }
    expect(percentOf(3)).toBe('33 1/3');
    expect(percentOf(8)).toBe('12 1/2');
    expect(percentOf(16)).toBe('6 1/4');
  });

  it('primes up to 100: all 25 of them', () => {
    const primes = table('primes').entries.map((e) => Number(e.right));
    const byHand = [];
    for (let n = 2; n <= 100; n++) {
      let prime = true;
      for (let d = 2; d < n; d++) if (n % d === 0) prime = false;
      if (prime) byHand.push(n);
    }
    expect(primes).toEqual(byHand);
    expect(primes).toHaveLength(25);
    for (const item of table('primes').items) {
      const n = Number(/Is (\d+)/.exec(item.prompt)[1]);
      expect(item.answer.correct === 'Prime', item.prompt).toBe(byHand.includes(n));
      if (!byHand.includes(n)) {
        const [p, q] = /= (\d+) × (\d+)/.exec(item.reveal).slice(1).map(Number);
        expect(p * q).toBe(n);
      }
    }
  });

  it('powers and factorials', () => {
    for (const e of table('powers').entries) {
      const [base, k] = e.left.split('^').map(Number);
      expect(plain(e.right)).toBe(base ** k);
    }
    let f = 1;
    table('factorials').entries.forEach((e, n) => {
      if (n > 0) f *= n;
      expect(plain(e.right), e.left).toBe(f);
    });
  });

  it('Pythagorean triplets, and every drill item from them', () => {
    for (const [a, b, c] of TRIPLETS) expect(a * a + b * b).toBe(c * c);
    for (const item of table('triplets').items) {
      const parts = /^(\d+|\?), (\d+|\?), (\d+|\?)/.exec(item.prompt).slice(1);
      const [a, b, c] = parts.map((p) => (p === '?' ? item.answer.value : Number(p)));
      expect(a * a + b * b, item.prompt).toBe(c * c);
    }
  });

  it('trigonometric values', () => {
    const fns = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
    for (const item of table('trig').items) {
      const [, fn, angle] = /^(sin|cos|tan) (\d+)°/.exec(item.prompt);
      const exact = Number(angle) === 90 && fn === 'tan' ? Infinity : fns[fn](Number(angle) * RAD);
      const listed = TRIG_OPTION_VALUES[item.answer.correct];
      if (exact === Infinity) expect(listed).toBe(Infinity);
      else expect(listed, item.prompt).toBeCloseTo(exact, 12);
      expect(TRIG_OPTIONS).toContain(item.answer.correct);
    }
  });

  it('times tables', () => {
    for (const e of table('times').entries) {
      const [a, b] = e.left.split(' × ').map(Number);
      expect(Number(e.right)).toBe(a * b);
    }
  });

  it('every drill item is answered correctly by its own revealed answer', () => {
    for (const t of TABLES) {
      expect(t.items.length, t.id).toBeGreaterThan(4);
      for (const item of t.items) {
        const typed = item.answer.type === 'choice' ? item.answer.correct : item.reveal.replace(/^.*\^/, '').replace(/^1\//, '');
        expect(isCorrect(item, typed), `${t.id}: ${item.prompt} with "${typed}"`).toBe(true);
      }
    }
    expect(MIXED.items.length).toBe(TABLES.reduce((sum, t) => sum + t.items.length, 0));
    expect(getTable('nope')).toBeNull();
  });
});

describe('reading typed answers', () => {
  it('accepts the usual ways of writing a number', () => {
    expect(parseAnswer('289')).toBe(289);
    expect(parseAnswer('1,024')).toBe(1024);
    expect(parseAnswer(' 33.33 ')).toBe(33.33);
    expect(parseAnswer('33 1/3')).toBeCloseTo(100 / 3, 12);
    expect(parseAnswer('12.5%')).toBe(12.5);
    expect(parseAnswer('≈ 7.69')).toBe(7.69);
    expect(parseAnswer('1/8')).toBe(0.125);
    expect(parseAnswer('−4')).toBe(-4);
    expect(parseAnswer('.5')).toBe(0.5);
  });

  it('rejects what is not a number', () => {
    for (const text of ['', '  ', 'abc', '12a', '1/0', '3 1/0', '1..2']) expect(parseAnswer(text), text).toBeNull();
  });

  it('marks within the tolerance only', () => {
    const third = table('fractions').items.find((item) => item.prompt === '1/3 = ?%');
    for (const ok of ['33.33', '33.3333', '33 1/3', '33.33%']) expect(isCorrect(third, ok), ok).toBe(true);
    for (const bad of ['33', '33.3', '30', 'x']) expect(isCorrect(third, bad), bad).toBe(false);
    const root = table('square-roots').items.find((item) => item.prompt.startsWith('√3 '));
    expect(isCorrect(root, '1.732')).toBe(true);
    expect(isCorrect(root, '1.73')).toBe(false);
    const prime = table('primes').items.find((item) => item.prompt === 'Is 91 prime?');
    expect(isCorrect(prime, 'Not prime')).toBe(true);
    expect(isCorrect(prime, 'Prime')).toBe(false);
  });
});

describe('the drill', () => {
  it('goes through every question before repeating, and never asks the same one twice in a row', () => {
    const items = table('trig').items;
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const next = questionStream(items, random);
    const first = Array.from({ length: items.length }, next);
    expect(new Set(first).size).toBe(items.length);
    let previous = first[first.length - 1];
    for (let i = 0; i < 200; i++) {
      const item = next();
      expect(item).not.toBe(previous);
      previous = item;
    }
  });

  it('keeps the best score per table', () => {
    expect(bestScore('squares')).toBeNull();
    expect(recordDrill('squares', { correct: 0, attempted: 3 })).toBe(false);
    expect(recordDrill('squares', { correct: 12, attempted: 14 })).toBe(true);
    expect(recordDrill('squares', { correct: 10, attempted: 10 })).toBe(false);
    expect(recordDrill('squares', { correct: 12, attempted: 12 })).toBe(true); // same score, fewer misses
    expect(bestScore('squares')).toMatchObject({ correct: 12, attempted: 12 });
    expect(bestScore('cubes')).toBeNull();
  });
});
