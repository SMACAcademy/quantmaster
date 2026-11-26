/**
 * Question generator tests.
 *
 * The contract being protected: a learner never sees a generated question whose
 * marked answer is wrong, whose options are ambiguous, or that cannot be rebuilt
 * later from its id (e.g. when it appears in their mistakes list).
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  getTemplates,
  getTemplate,
  questionFromId,
  generateQuestions,
  generateSimilar,
  generateFromTemplate,
  conceptHasTemplates,
  questionKey
} from '../src/generators/index.js';
import { buildInstance, generate, parseId } from '../src/generators/engine.js';
import { createRng, reduceFraction, nCr, nPr } from '../src/generators/core.js';
import { evaluateAnswer } from '../src/services/quizEngine.js';
import {
  conceptRepository,
  formulaRepository,
  questionRepository,
  topicRepository,
  levelRepository
} from '../src/repositories/contentRepository.js';
import { resetProgress, getUserProgress } from '../src/repositories/progressRepository.js';
import { recordQuestionAttempt, completeLevelAttempt, getMistakes } from '../src/services/learningEngine.js';
import {
  buildFreshSession,
  buildLevelSession,
  selectSmartQuestions
} from '../src/services/sessionBuilder.js';

const SEEDS = 300;

beforeEach(() => {
  resetProgress();
});

describe('core helpers', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.int(1, 1000));
    const seqB = Array.from({ length: 20 }, () => b.int(1, 1000));
    expect(seqA).toEqual(seqB);
  });

  it('keeps rng.int inside its bounds', () => {
    const rng = createRng(7);
    for (let i = 0; i < 2000; i++) {
      const value = rng.int(3, 9);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(9);
    }
  });

  it('does exact combinatorics', () => {
    expect(nPr(5, 2)).toBe(20);
    expect(nCr(10, 3)).toBe(120);
    expect(reduceFraction(56, 132)).toEqual([14, 33]);
  });
});

describe('every template', () => {
  for (const template of getTemplates()) {
    describe(template.id, () => {
      it('references real content', () => {
        expect(topicRepository.getById(template.topicId), 'topic').not.toBeNull();
        expect(conceptRepository.getById(template.conceptId), 'concept').not.toBeNull();
        for (const formulaId of template.formulaIds || []) {
          expect(formulaRepository.getById(formulaId), formulaId).not.toBeNull();
        }
      });

      it('only emits questions that are well-formed and self-consistent', () => {
        let produced = 0;
        for (let seed = 1; seed <= SEEDS; seed++) {
          const { question } = buildInstance(template, seed);
          if (!question) continue;
          produced += 1;

          expect(question.hints.length).toBeGreaterThan(0);
          expect(question.explanation.length).toBeGreaterThan(10);
          expect(question.question).not.toMatch(/NaN|undefined|Infinity/);

          if (question.type === 'single_choice') {
            const count = template.optionCount ?? 4;
            expect(question.options).toHaveLength(count);
            const texts = question.options.map((o) => o.text);
            expect(new Set(texts).size, `duplicate options for seed ${seed}`).toBe(count);
            expect(question.correctAnswer).toHaveLength(1);
            expect(question.options.map((o) => o.id)).toContain(question.correctAnswer[0]);
            expect(evaluateAnswer(question, question.correctAnswer[0]).correct).toBe(true);
            const wrong = question.options.find((o) => o.id !== question.correctAnswer[0]);
            expect(evaluateAnswer(question, wrong.id).correct).toBe(false);
          } else {
            expect(Number.isFinite(question.answer.value)).toBe(true);
            expect(evaluateAnswer(question, String(question.answer.value)).correct).toBe(true);
          }
        }
        expect(produced, 'too few valid seeds').toBeGreaterThan(SEEDS * 0.1);
      });

      it('rebuilds an identical question from its id', () => {
        const question = generate(template, 987654);
        expect(question).not.toBeNull();
        const rebuilt = questionFromId(question.id);
        expect(rebuilt).toEqual(question);
      });

      it('always finds a valid instance from a random starting seed', () => {
        for (let i = 0; i < 25; i++) {
          expect(generateFromTemplate(template.id)).not.toBeNull();
        }
      });
    });
  }
});

describe('independent verification catches wrong answers', () => {
  it('rejects a template whose answer function is broken', () => {
    const original = getTemplates().find((t) => t.id === 'pct-of-number');
    const broken = { ...original, answer: (p) => original.answer(p) + 1 };
    for (let seed = 1; seed <= 50; seed++) {
      expect(buildInstance(broken, seed).question).toBeUndefined();
    }
  });

  it('rejects a template whose distractors collapse onto the answer', () => {
    const original = getTemplates().find((t) => t.id === 'ap-nth-term');
    const collapsing = { ...original, distractors: (p) => [{ value: original.answer(p) }, { value: original.answer(p) }] };
    expect(buildInstance(collapsing, 5).question).toBeUndefined();
  });
});

describe('data-based questions', () => {
  it('treats the same wording over different data as a different question', () => {
    const template = getTemplates().find((t) => t.id === 'lng-steepest-rise');
    const [a, b] = [generate(template, 11), generate(template, 222)];
    expect(a.question).toBe(b.question);
    expect(questionKey(a)).not.toBe(questionKey(b));
  });

  it('keys an ordinary question by its text alone', () => {
    const question = generate(getTemplates().find((t) => t.id === 'pct-of-number'), 5);
    expect(questionKey(question)).toBe(question.question);
  });

  it('fills a fresh session from chart and caselet templates whose wording never changes', () => {
    for (const topicId of ['di-line-graphs', 'di-caselet']) {
      const batch = generateQuestions({ topicId, count: 8 });
      expect(batch, topicId).toHaveLength(8);
      expect(new Set(batch.map(questionKey)).size, topicId).toBe(8);
    }
  });

  it('finds a similar question on a chart template, with new data', () => {
    const original = generate(getTemplates().find((t) => t.id === 'lng-widest-gap'), 11);
    const similar = generateSimilar(original);
    expect(similar).not.toBeNull();
    expect(similar.templateId).toBe('lng-widest-gap');
    expect(JSON.stringify(similar.chart)).not.toBe(JSON.stringify(original.chart));
  });
});

describe('generated figures', () => {
  it('carries a template figure onto the question, drawn from its own numbers', () => {
    const template = getTemplates().find((t) => t.id === 'pa-rect-area');
    const { question } = buildInstance(template, 7);
    const { l, b } = question.parameters;
    expect(question.figure.type).toBe('diagram');
    expect(question.figure.points.find((p) => p.id === 'C')).toMatchObject({ x: l, y: b });
    expect(question.figure.caption).toContain(String(l));
  });

  it('leaves the figure off when a template has none for that instance', () => {
    const template = getTemplates().find((t) => t.id === 'poly-diagonals-count');
    for (let seed = 1; seed <= 200; seed++) {
      const { question } = buildInstance(template, seed);
      if (!question) continue;
      expect(Boolean(question.figure)).toBe(question.parameters.n <= 12);
    }
  });

  it('rejects an instance whose figure contains NaN', () => {
    const original = getTemplates().find((t) => t.id === 'pa-rect-area');
    const broken = {
      ...original,
      render: (p, ctx) => {
        const rendered = original.render(p, ctx);
        return { ...rendered, figure: { ...rendered.figure, points: [{ id: 'A', x: NaN, y: 0 }] } };
      }
    };
    expect(buildInstance(broken, 3).question).toBeUndefined();
  });
});

describe('ids and versioning', () => {
  it('parses generated ids and ignores authored ones', () => {
    expect(parseId('gen:pct-of-number:1:123')).toEqual({ templateId: 'pct-of-number', version: 1, seed: 123 });
    expect(parseId('percentages-q-121')).toBeNull();
  });

  it('returns null when a template version has moved on', () => {
    const question = generateFromTemplate('pct-of-number', 11);
    const stale = question.id.replace(':1:', ':999:');
    expect(questionFromId(stale)).toBeNull();
  });

  it('is resolvable through the question repository', () => {
    const question = generateFromTemplate('si-interest', 31);
    expect(questionRepository.getById(question.id)).toEqual(question);
  });
});

describe('selection helpers', () => {
  it('generates distinct questions within one batch', () => {
    const batch = generateQuestions({ topicId: 'percentages', count: 15 });
    expect(batch.length).toBe(15);
    expect(new Set(batch.map((q) => q.question)).size).toBe(15);
    expect(batch.every((q) => q.topicId === 'percentages')).toBe(true);
  });

  it('respects a difficulty ceiling', () => {
    const batch = generateQuestions({ topicId: 'percentages', maxDifficulty: 'easy', count: 10 });
    expect(batch.every((q) => q.difficulty === 'easy')).toBe(true);
  });

  it('makes a similar question on the same concept with different wording or numbers', () => {
    const authored = questionRepository.getById('percentages-q-141');
    const similar = generateSimilar(authored);
    expect(similar.conceptId).toBe(authored.conceptId);
    expect(similar.question).not.toBe(authored.question);
  });

  it('knows which concepts have generators', () => {
    expect(conceptHasTemplates('pct-reverse')).toBe(true);
    expect(conceptHasTemplates('no-such-concept')).toBe(false);
  });
});

describe('integration with the learning engine', () => {
  it('records a generated question and shows it in the mistakes list', () => {
    const question = generateFromTemplate('pct-reverse', 404);
    recordQuestionAttempt({ question, correct: false, sessionId: 's1' });
    const mistakes = getMistakes({ includeResolved: false });
    expect(mistakes.map((m) => m.question.id)).toContain(question.id);
    expect(getUserProgress().concepts['pct-reverse'].attempts).toBe(1);
  });

  it('tops up smart practice with fresh questions once authored ones are used', () => {
    for (const question of questionRepository.getByTopic('averages')) {
      recordQuestionAttempt({ question, correct: true, sessionId: 'warmup' });
    }
    const selected = selectSmartQuestions({ count: 10, topicId: 'averages' });
    expect(selected.length).toBe(10);
    expect(selected.some((q) => q.generated)).toBe(true);
    expect(new Set(selected.map((q) => q.id)).size).toBe(selected.length);
  });

  it('swaps solved questions for fresh variations when a level is replayed', () => {
    const level = levelRepository.getById('percentages-level-6');
    const authored = questionRepository.getByLevel(level.id);
    for (const question of authored) recordQuestionAttempt({ question, correct: true, sessionId: 'first' });
    completeLevelAttempt(level.id, { accuracy: 100, attempted: authored.length, total: authored.length });

    const replay = buildLevelSession(level);
    expect(replay.questions).toHaveLength(authored.length);
    expect(replay.questions.some((q) => q.generated)).toBe(true);
  });

  it('keeps unresolved mistakes unchanged on a replay', () => {
    const level = levelRepository.getById('percentages-level-6');
    const authored = questionRepository.getByLevel(level.id);
    authored.forEach((question, index) =>
      recordQuestionAttempt({ question, correct: index !== 0, sessionId: 'first' })
    );
    completeLevelAttempt(level.id, { accuracy: 100, attempted: authored.length, total: authored.length });

    const replay = buildLevelSession(level);
    expect(replay.questions.map((q) => q.id)).toContain(authored[0].id);
  });

  it('builds an unlimited fresh session and refuses topics without generators', () => {
    const session = buildFreshSession({ topicId: 'compound-interest', count: 8 });
    expect(session.questions).toHaveLength(8);
    expect(session.questions.every((q) => q.generated)).toBe(true);
    // Every topic now has generators, so only an unknown topic is refused.
    expect(buildFreshSession({ topicId: 'no-such-topic', count: 8 })).toBeNull();
  });
});

describe('fixed option order', () => {
  it('keeps standard choices in their standard order (quantity and x-y comparison, data sufficiency (quant and reasoning), number of solutions, reasoning verdicts and signs)', () => {
    const fixed = getTemplates().filter((t) => t.optionOrder);
    expect(fixed.map((t) => t.id).sort()).toEqual([
      'ap-adv-qc-compare',
      'ap-adv-qc-unknown',
      'dsq-options-value-x',
      'dsq-strategy-divisible',
      'iq-gen-coded',
      'iq-gen-combined',
      'iq-gen-direct',
      'iq-gen-either',
      'iq-gen-missing',
      'qc-format-mixed-values',
      'qc-format-read-values',
      'qc-squares-roots',
      'qc-two-general',
      'qc-two-monic',
      'rds-gen-circle',
      'rds-gen-direction',
      'rds-gen-floors',
      'rds-gen-rank-place',
      'rds-gen-ranking',
      'rds-gen-relation',
      'rds-gen-row',
      'rds-gen-yes-no',
      'se-check-pair-status',
      'se-special-count',
      'sy-gen-definite',
      'sy-gen-either',
      'sy-gen-only-few',
      'sy-gen-possibility',
      'sy-gen-three'
    ]);
    for (const template of fixed) {
      for (let seed = 1; seed <= 60; seed++) {
        const question = generate(template, seed);
        expect(question.options.map((o) => o.text)).toEqual(template.optionOrder);
      }
    }
  });
});

describe('finding a valid instance', () => {
  it('gets past a long run of rejected neighbouring seeds', () => {
    // Seeds 122367 to 122411 are all rejected by this template: more than the 40 forward steps.
    const template = getTemplate('cg-distance-points');
    for (let seed = 122367; seed < 122367 + 40; seed++) expect(buildInstance(template, seed).question).toBeFalsy();
    const question = generate(template, 122367);
    expect(question).not.toBeNull();
    expect(questionFromId(question.id)).toEqual(question);
  });
});
