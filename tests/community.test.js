/** Community links and the puzzle of the week (app/community.js, data/puzzles.json). */

import { describe, it, expect } from 'vitest';

import { PUZZLES, PUZZLE_EPOCH, checkPuzzleAnswer, newDiscussionUrl, newIssueUrl, weeklyPuzzle } from '../src/app/community.js';
import { SIMULATION_META } from '../src/simulations/meta.js';
import topicsFile from '../src/data/topics.json';

const DAY = 24 * 60 * 60 * 1000;

describe('puzzle of the week', () => {
  it('starts at #1 on Monday 30 November 2026 and changes each Monday', () => {
    expect(new Date(PUZZLE_EPOCH).getUTCDay()).toBe(1);
    expect(weeklyPuzzle(PUZZLE_EPOCH)).toMatchObject({ number: 1, puzzle: PUZZLES[0] });
    expect(weeklyPuzzle(PUZZLE_EPOCH + 6 * DAY + 23 * 60 * 60 * 1000).number).toBe(1);
    expect(weeklyPuzzle(PUZZLE_EPOCH + 7 * DAY)).toMatchObject({ number: 2, puzzle: PUZZLES[1] });
    expect(weeklyPuzzle(PUZZLE_EPOCH - 3 * DAY).number).toBe(1); // before the start: the first one
  });

  it('cycles through the list', () => {
    const { puzzle, number } = weeklyPuzzle(PUZZLE_EPOCH + PUZZLES.length * 7 * DAY);
    expect(number).toBe(PUZZLES.length + 1);
    expect(puzzle).toBe(PUZZLES[0]);
  });

  it('every puzzle is complete and points at a real topic and simulation', () => {
    const topicIds = new Set(topicsFile.topics.map((t) => t.id));
    const simIds = new Set(SIMULATION_META.map((m) => m.id));
    const ids = new Set();
    for (const p of PUZZLES) {
      expect(ids.has(p.id), p.id).toBe(false);
      ids.add(p.id);
      for (const key of ['hook', 'question', 'hint']) expect(typeof p[key] === 'string' && p[key].length > 10, `${p.id}.${key}`).toBe(true);
      expect(Number.isFinite(p.answer), p.id).toBe(true);
      expect(p.method.length, p.id).toBeGreaterThanOrEqual(2);
      expect(topicIds.has(p.topicId), `${p.id} topic ${p.topicId}`).toBe(true);
      if (p.simulationId) expect(simIds.has(p.simulationId), `${p.id} simulation ${p.simulationId}`).toBe(true);
      // The hook is posted as a discussion title and shared; it must not give the answer away.
      expect(p.hook.includes(`${p.answer} ${p.unit}`.trim()) && p.answer !== 0, p.id).toBe(false);
    }
  });

  it('accepts the answer with units, commas or spaces, and rejects others', () => {
    const tank = PUZZLES.find((p) => p.id === 'leaky-tank');
    expect(checkPuzzleAnswer(tank, '4')).toBe(true);
    expect(checkPuzzleAnswer(tank, ' 4 hours ')).toBe(true);
    expect(checkPuzzleAnswer(tank, '4.0')).toBe(true);
    expect(checkPuzzleAnswer(tank, '5')).toBe(false);
    expect(checkPuzzleAnswer(tank, '')).toBe(false);
    expect(checkPuzzleAnswer(tank, 'four')).toBe(false);
    const ci = PUZZLES.find((p) => p.id === 'ci-minus-si');
    expect(checkPuzzleAnswer(ci, '1,00')).toBe(true);
    expect(checkPuzzleAnswer(ci, '₹100')).toBe(false); // a leading symbol is not a number; the box asks for one
  });
});

describe('GitHub links', () => {
  it('opens a new discussion in a category with the title and body filled in', () => {
    const url = new URL(newDiscussionUrl('q-a', 'Puzzle #1: a & b', 'line 1\nline 2'));
    expect(url.origin + url.pathname).toBe('https://github.com/SMACAcademy/quantmaster/discussions/new');
    expect(url.searchParams.get('category')).toBe('q-a');
    expect(url.searchParams.get('title')).toBe('Puzzle #1: a & b');
    expect(url.searchParams.get('body')).toBe('line 1\nline 2');
  });

  it('opens an issue form with its fields filled in by id, skipping empty ones', () => {
    const url = new URL(newIssueUrl('content-error.yml', '[q-1] ', { topic: 'Trains', question: 'text', problem: '' }));
    expect(url.searchParams.get('template')).toBe('content-error.yml');
    expect(url.searchParams.get('topic')).toBe('Trains');
    expect(url.searchParams.get('question')).toBe('text');
    expect(url.searchParams.has('problem')).toBe(false);
  });
});
