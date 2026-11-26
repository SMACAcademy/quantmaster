/** Mock tests: patterns, paper assembly, the attempt's bookkeeping, scoring and analysis. */

import { describe, it, expect, beforeEach } from 'vitest';

import { MOCK_PATTERNS, getPattern, maxScore, questionCount } from '../src/mock/patterns.js';
import { EXAM_TYPES, advise, analyseAttempt, assemblePaper, counts, finishAttempt, goTo, marksFor, paletteState, setResponse, startAttempt, toggleMark } from '../src/mock/mockEngine.js';
import { bestMock, mockHistory, recordMock } from '../src/mock/history.js';
import { buildPaper } from '../src/views/MockTestsView.js';
import { topicRepository } from '../src/repositories/contentRepository.js';
import { resetProgress } from '../src/repositories/progressRepository.js';

beforeEach(() => {
  resetProgress();
  try {
    window.localStorage.removeItem('quantmaster:v1:mock-history');
  } catch {
    /* in-memory storage starts empty */
  }
});

const question = (id, extra = {}) => ({
  id,
  topicId: 'percentages',
  type: 'single_choice',
  difficulty: 'easy',
  question: `Question ${id}`,
  options: [
    { id: 'a', text: 'Right' },
    { id: 'b', text: 'Wrong' }
  ],
  correctAnswer: ['a'],
  ...extra
});
const typed = (id, value) => question(id, { type: 'numerical_input', options: undefined, correctAnswer: undefined, answer: { value, tolerance: 0 } });

describe('patterns', () => {
  it('match the published question counts and marking', () => {
    expect(questionCount(getPattern('bank-prelims'))).toBe(35);
    expect(getPattern('bank-prelims').minutes).toBe(20);
    expect(getPattern('bank-prelims').marks).toEqual({ correct: 1, wrong: -0.25 });
    expect(questionCount(getPattern('ssc-cgl'))).toBe(25);
    expect(maxScore(getPattern('ssc-cgl'))).toBe(50);
    expect(questionCount(getPattern('cat-qa'))).toBe(22);
    expect(getPattern('cat-qa').marks).toMatchObject({ correct: 3, wrong: -1, typedNoNegative: true });
    expect(questionCount(getPattern('campus'))).toBe(20);
    expect(questionCount(getPattern('bank-prelims-reasoning'))).toBe(35);
    expect(getPattern('bank-prelims-reasoning').marks).toEqual({ correct: 1, wrong: -0.25 });
    expect(questionCount(getPattern('ssc-cgl-reasoning'))).toBe(25);
    expect(maxScore(getPattern('ssc-cgl-reasoning'))).toBe(50);
    expect(questionCount(getPattern('campus-reasoning'))).toBe(15);
    for (const pattern of MOCK_PATTERNS) expect(['quant', 'reasoning'], pattern.id).toContain(pattern.subject);
  });

  it('only use topics the app has', () => {
    for (const pattern of MOCK_PATTERNS) {
      for (const section of pattern.blueprint) {
        for (const topicId of section.topics) expect(topicRepository.getById(topicId), `${pattern.id}: ${topicId}`).not.toBeNull();
      }
    }
  });

  it('can always be filled from the real questions and generators', () => {
    for (const pattern of MOCK_PATTERNS) {
      for (let run = 0; run < 5; run++) {
        const items = buildPaper(pattern);
        expect(items, pattern.id).toHaveLength(questionCount(pattern));
        const ids = items.map((item) => item.question.id);
        expect(new Set(ids).size, `${pattern.id}: no repeats`).toBe(ids.length);
        for (const { question: q, section } of items) {
          const blueprint = pattern.blueprint.find((s) => s.label === section);
          expect(EXAM_TYPES).toContain(q.type);
          expect(blueprint.topics, `${pattern.id}: ${q.id}`).toContain(q.topicId);
        }
        // Sections stay together, in paper order.
        const order = [...new Set(items.map((item) => item.section))];
        expect(order).toEqual(pattern.blueprint.map((s) => s.label));
      }
    }
  });
});

describe('assembling a paper', () => {
  it('takes about half from each source and tops up from the other', () => {
    const pattern = { blueprint: [{ label: 'A', topics: ['percentages'], count: 4, difficulties: ['easy'] }] };
    const authored = () => [question('h1'), question('h2'), question('h3'), question('h4', { type: 'formula_recognition' })];
    const items = assemblePaper(pattern, { authored, generated: (s, n) => Array.from({ length: n }, (_, i) => question(`g${i}`)) });
    expect(items.map((i) => i.question.id).filter((id) => id.startsWith('g'))).toHaveLength(2);
    expect(items.some((i) => i.question.id === 'h4')).toBe(false); // not an exam-style type
    const fewAuthored = assemblePaper(pattern, { authored: () => [question('h1')], generated: (s, n, avoid) => Array.from({ length: n }, (_, i) => question(`g${avoid.size}-${i}`)) });
    expect(fewAuthored).toHaveLength(4);
  });
});

describe('taking a test', () => {
  const pattern = { id: 'p', minutes: 10, marks: { correct: 2, wrong: -0.5 }, blueprint: [{ label: 'A', count: 4 }] };
  const items = [question('q1'), question('q2'), typed('q3', 12), question('q4', { difficulty: 'easy' })].map((q) => ({ question: q, section: 'A' }));

  it('keeps time per question, palette states and counts', () => {
    const attempt = startAttempt(pattern, items, 0);
    expect(paletteState(attempt, items[0].question)).toBe('not-answered');
    expect(paletteState(attempt, items[1].question)).toBe('not-visited');
    setResponse(attempt, 'q1', 'a');
    expect(paletteState(attempt, items[0].question)).toBe('answered');
    toggleMark(attempt, 'q1');
    expect(paletteState(attempt, items[0].question)).toBe('answered-marked');
    goTo(attempt, 1, 30_000);
    goTo(attempt, 0, 50_000);
    goTo(attempt, 2, 65_000);
    expect(attempt.timeMs).toEqual({ q1: 45_000, q2: 20_000 });
    toggleMark(attempt, 'q2');
    expect(counts(attempt)).toEqual({ answered: 1, notAnswered: 1, marked: 2, notVisited: 1 });
    setResponse(attempt, 'q1', null);
    expect(attempt.responses.q1).toBeUndefined();
  });

  it('scores with the pattern\'s marking and analyses the attempt', () => {
    const attempt = startAttempt(pattern, items, 0);
    setResponse(attempt, 'q1', 'a'); // right
    goTo(attempt, 1, 200_000); // 200 s on q1, far over the 150 s budget
    setResponse(attempt, 'q2', 'b'); // wrong
    goTo(attempt, 2, 400_000); // 200 s on q2: wrong after a long think
    setResponse(attempt, 'q3', '12'); // right
    finishAttempt(attempt, 420_000);
    const a = analyseAttempt(pattern, attempt);
    expect(a).toMatchObject({ total: 4, attempted: 3, correct: 2, wrong: 1, unanswered: 1, score: 3.5, maxScore: 8, lost: 0.5, accuracy: 67 });
    expect(a.budgetMs).toBe(150_000);
    expect(a.skipNextTime.map((r) => r.question.id)).toEqual(['q2']);
    expect(a.missedEasy.map((r) => r.question.id)).toEqual(['q4']);
    expect(a.sections).toEqual([{ key: 'A', count: 4, attempted: 3, correct: 2, score: 3.5, timeMs: 420_000 }]);
    expect(a.usedMs).toBe(420_000);
    expect(a.advice.some((line) => line.includes('skip those early'))).toBe(true);
  });

  it('never runs past the clock', () => {
    const attempt = startAttempt(pattern, items, 0);
    finishAttempt(attempt, 99 * 60 * 1000);
    expect(attempt.finishedAt).toBe(10 * 60 * 1000);
  });
});

describe('marking schemes', () => {
  it('apply negative marks, and spare typed answers where the exam does', () => {
    const cat = getPattern('cat-qa');
    expect(marksFor(cat, question('x'), 'wrong')).toBe(-1);
    expect(marksFor(cat, typed('y', 1), 'wrong')).toBe(0);
    expect(marksFor(cat, typed('y', 1), 'correct')).toBe(3);
    expect(marksFor(getPattern('campus'), question('x'), 'wrong')).toBe(0);
    expect(marksFor(getPattern('bank-prelims'), question('x'), 'unanswered')).toBe(0);
  });

  it('gives advice that fits the result', () => {
    const bank = getPattern('bank-prelims');
    expect(advise({ pattern: bank, accuracy: 50, attempted: 20, total: 35, lost: 2.5, skipNextTime: [], missedEasy: [] })[0]).toMatch(/negative marking cost you 2.5/);
    expect(advise({ pattern: bank, accuracy: 90, attempted: 15, total: 35, lost: 0, skipNextTime: [], missedEasy: [] })[0]).toMatch(/attempt more/);
    expect(advise({ pattern: getPattern('campus'), accuracy: 70, attempted: 15, total: 20, lost: 0, skipNextTime: [], missedEasy: [] })[0]).toMatch(/never leave a question blank/);
    expect(advise({ pattern: bank, accuracy: 0, attempted: 0, total: 35, lost: 0, skipNextTime: [], missedEasy: [] })[0]).toMatch(/Nothing was answered/);
  });
});

describe('history', () => {
  it('keeps the newest attempts and the best per pattern', () => {
    recordMock({ patternId: 'ssc-cgl', score: 30, at: '2026-11-01' });
    recordMock({ patternId: 'ssc-cgl', score: 42, at: '2026-11-02' });
    recordMock({ patternId: 'campus', score: 15, at: '2026-11-03' });
    expect(mockHistory().map((e) => e.score)).toEqual([15, 42, 30]);
    expect(bestMock('ssc-cgl').score).toBe(42);
    expect(bestMock('cat-qa')).toBeNull();
  });
});
