/**
 * Learning-engine tests.
 *
 * These cover the rules a learner would actually notice if they broke: mastery
 * not jumping to 100, review dates moving in the right direction, hints costing
 * XP, mistakes being recorded and levels unlocking only when earned.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { MASTERY, SPACED_REPETITION, STREAK_RULES, XP } from '../src/app/config.js';
import {
  applyAttempt,
  applyDecay,
  emptyConceptState,
  getMasteryLabel
} from '../src/services/masteryEngine.js';
import {
  emptyReviewState,
  review,
  isDue,
  buildReviewQueue,
  gradeFromOutcome
} from '../src/services/spacedRepetition.js';
import {
  evaluateAnswer,
  isResponseComplete,
  describeCorrectAnswer,
  createSession,
  submitAnswer,
  advance,
  buildResult
} from '../src/services/quizEngine.js';
import {
  recordQuestionAttempt,
  completeLevelAttempt,
  getLevelStatus,
  getMistakes,
  evaluateLevelPass
} from '../src/services/learningEngine.js';
import { xpForAnswer, recordActivity, getRank, checkAchievements, getStreakStatus } from '../src/services/gamification.js';
import {
  selectSmartQuestions,
  buildLevelSession,
  buildMistakesSession,
  buildDailyChallenge
} from '../src/services/sessionBuilder.js';
import { questionRepository, levelRepository } from '../src/repositories/contentRepository.js';
import { getUserProgress, resetProgress } from '../src/repositories/progressRepository.js';
import { addDays, dayKey } from '../src/utils/format.js';

beforeEach(() => {
  resetProgress();
});

/* ============================ mastery ============================ */

describe('masteryEngine', () => {
  it('does not jump to full mastery after one correct answer', () => {
    const { state } = applyAttempt(emptyConceptState('c1'), { correct: true, hintsUsed: 0 });
    expect(state.masteryScore).toBeGreaterThan(0);
    expect(state.masteryScore).toBeLessThan(40);
  });

  it('rewards unaided answers more than hinted ones', () => {
    const unaided = applyAttempt(emptyConceptState('c1'), { correct: true, hintsUsed: 0 });
    const hinted = applyAttempt(emptyConceptState('c1'), { correct: true, hintsUsed: 2 });
    expect(unaided.state.masteryScore).toBeGreaterThan(hinted.state.masteryScore);
  });

  it('reduces mastery after an incorrect answer', () => {
    let state = emptyConceptState('c1');
    for (let i = 0; i < 4; i++) {
      state = applyAttempt(state, { correct: true, hintsUsed: 0, sessionId: `s${i}` }).state;
    }
    const before = state.masteryScore;
    const after = applyAttempt(state, { correct: false }).state;
    expect(after.masteryScore).toBeLessThan(before);
    expect(after.consecutiveCorrect).toBe(0);
    expect(after.consecutiveIncorrect).toBe(1);
  });

  it('keeps the score inside 0-100 under repeated success', () => {
    let state = emptyConceptState('c1');
    for (let i = 0; i < 40; i++) {
      state = applyAttempt(state, { correct: true, hintsUsed: 0, sessionId: `s${i}` }).state;
    }
    expect(state.masteryScore).toBeLessThanOrEqual(100);
    expect(state.masteryScore).toBeGreaterThan(MASTERY.strongAt);
  });

  it('values repeat success across sessions more than within one session', () => {
    let sameSession = emptyConceptState('c1');
    let acrossSessions = emptyConceptState('c1');
    for (let i = 0; i < 3; i++) {
      sameSession = applyAttempt(sameSession, { correct: true, sessionId: 'same' }).state;
      acrossSessions = applyAttempt(acrossSessions, { correct: true, sessionId: `s${i}` }).state;
    }
    expect(acrossSessions.masteryScore).toBeGreaterThan(sameSession.masteryScore);
  });

  it('decays unreviewed mastery but never below the floor', () => {
    const state = {
      ...emptyConceptState('c1'),
      masteryScore: 90,
      lastAttemptedAt: addDays(new Date(), -200).toISOString()
    };
    const decayed = applyDecay(state);
    expect(decayed).toBeLessThan(90);
    expect(decayed).toBeGreaterThanOrEqual(MASTERY.decayFloor);
  });

  it('does not decay inside the grace period', () => {
    const state = {
      ...emptyConceptState('c1'),
      masteryScore: 70,
      lastAttemptedAt: addDays(new Date(), -3).toISOString()
    };
    expect(applyDecay(state)).toBe(70);
  });

  it('labels scores in increasing order', () => {
    expect(getMasteryLabel(0).id).toBe('new');
    expect(getMasteryLabel(20).id).toBe('learning');
    expect(getMasteryLabel(50).id).toBe('familiar');
    expect(getMasteryLabel(70).id).toBe('proficient');
    expect(getMasteryLabel(95).id).toBe('strong');
  });
});

/* ======================== spaced repetition ======================== */

describe('spacedRepetition', () => {
  it('schedules a new item into the future after a good review', () => {
    const state = review(emptyReviewState('f1'), 'good');
    expect(state.intervalDays).toBeGreaterThanOrEqual(1);
    expect(new Date(state.nextReviewAt).getTime()).toBeGreaterThan(Date.now());
    expect(isDue(state)).toBe(false);
  });

  it('lengthens the interval with each successful review', () => {
    let state = emptyReviewState('f1');
    const intervals = [];
    for (let i = 0; i < 4; i++) {
      state = review(state, 'good');
      intervals.push(state.intervalDays);
    }
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    }
  });

  it('brings a lapsed item back immediately', () => {
    let state = emptyReviewState('f1');
    state = review(state, 'good');
    state = review(state, 'good');
    const lapsed = review(state, 'again');
    expect(lapsed.intervalDays).toBe(0);
    expect(isDue(lapsed)).toBe(true);
    expect(lapsed.ladderStep).toBe(0);
  });

  it('lowers ease when an item is forgotten and raises it when recalled', () => {
    const forgotten = review(emptyReviewState('f1'), 'again');
    const recalled = review(emptyReviewState('f2'), 'good');
    expect(forgotten.ease).toBeLessThan(SPACED_REPETITION.initialEase);
    expect(recalled.ease).toBeGreaterThan(SPACED_REPETITION.initialEase);
  });

  it('keeps ease inside its configured bounds', () => {
    let state = emptyReviewState('f1');
    for (let i = 0; i < 30; i++) state = review(state, 'again');
    expect(state.ease).toBeGreaterThanOrEqual(SPACED_REPETITION.minEase);
    let good = emptyReviewState('f2');
    for (let i = 0; i < 30; i++) good = review(good, 'easy');
    expect(good.ease).toBeLessThanOrEqual(SPACED_REPETITION.maxEase);
  });

  it('splits a queue into due, new and upcoming', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const states = {
      a: { ...emptyReviewState('a'), reviewCount: 2, nextReviewAt: addDays(new Date(), -3).toISOString() },
      b: { ...emptyReviewState('b'), reviewCount: 1, nextReviewAt: addDays(new Date(), 5).toISOString() }
    };
    const queue = buildReviewQueue(items, states);
    expect(queue.due.map((d) => d.item.id)).toEqual(['a']);
    expect(queue.upcoming.map((d) => d.item.id)).toEqual(['b']);
    expect(queue.fresh.map((d) => d.item.id)).toEqual(['c']);
  });

  it('maps outcomes to sensible grades', () => {
    expect(gradeFromOutcome({ correct: false })).toBe('again');
    expect(gradeFromOutcome({ correct: true, hintsUsed: 0 })).toBe('good');
    expect(gradeFromOutcome({ correct: true, hintsUsed: 2 })).toBe('hard');
  });
});

/* ========================== answer evaluation ========================== */

describe('quizEngine evaluation', () => {
  const single = {
    id: 'q1',
    type: 'single_choice',
    options: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }],
    correctAnswer: ['b']
  };

  it('marks single choice answers', () => {
    expect(evaluateAnswer(single, 'b').correct).toBe(true);
    expect(evaluateAnswer(single, 'a').correct).toBe(false);
    expect(evaluateAnswer(single, null).correct).toBe(false);
  });

  it('requires an exact set for multiple choice', () => {
    const question = {
      type: 'multiple_choice',
      options: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      correctAnswer: ['a', 'b']
    };
    expect(evaluateAnswer(question, ['a', 'b']).correct).toBe(true);
    expect(evaluateAnswer(question, ['b', 'a']).correct).toBe(true);
    expect(evaluateAnswer(question, ['a']).correct).toBe(false);
    expect(evaluateAnswer(question, ['a', 'b', 'c']).correct).toBe(false);
  });

  it('accepts numeric answers within tolerance and ignores formatting', () => {
    const question = { type: 'numerical_input', answer: { value: 1200, tolerance: 0 } };
    expect(evaluateAnswer(question, '1200').correct).toBe(true);
    expect(evaluateAnswer(question, '1,200').correct).toBe(true);
    expect(evaluateAnswer(question, '₹1200').correct).toBe(true);
    expect(evaluateAnswer(question, '1201').correct).toBe(false);
    expect(evaluateAnswer(question, 'abc').correct).toBe(false);

    const loose = { type: 'numerical_input', answer: { value: 40, tolerance: 0.5 } };
    expect(evaluateAnswer(loose, '40.4').correct).toBe(true);
    expect(evaluateAnswer(loose, '41').correct).toBe(false);
  });

  it('marks matching row by row', () => {
    const question = {
      type: 'match_following',
      pairs: [
        { left: 'A', right: '1' },
        { left: 'B', right: '2' }
      ]
    };
    const right = evaluateAnswer(question, { 0: '1', 1: '2' });
    expect(right.correct).toBe(true);
    const partial = evaluateAnswer(question, { 0: '2', 1: '2' });
    expect(partial.correct).toBe(false);
    expect(partial.detail.rows[1].correct).toBe(true);
    expect(partial.detail.rows[0].correct).toBe(false);
  });

  it('requires the exact order for ordering questions', () => {
    const question = {
      type: 'ordering',
      steps: [{ id: 's1' }, { id: 's2' }, { id: 's3' }]
    };
    expect(evaluateAnswer(question, ['s1', 's2', 's3']).correct).toBe(true);
    expect(evaluateAnswer(question, ['s2', 's1', 's3']).correct).toBe(false);
  });

  it('knows when a response is complete enough to submit', () => {
    expect(isResponseComplete(single, null)).toBe(false);
    expect(isResponseComplete(single, 'a')).toBe(true);
    const numeric = { type: 'numerical_input' };
    expect(isResponseComplete(numeric, '')).toBe(false);
    expect(isResponseComplete(numeric, '12')).toBe(true);
    const match = { type: 'match_following', pairs: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }] };
    expect(isResponseComplete(match, { 0: '1' })).toBe(false);
    expect(isResponseComplete(match, { 0: '1', 1: '2' })).toBe(true);
  });

  it('describes the correct answer for the solution panel', () => {
    expect(describeCorrectAnswer(single)).toBe('2');
    expect(describeCorrectAnswer({ type: 'numerical_input', answer: { value: 5, unit: '%' } })).toBe('5%');
    expect(describeCorrectAnswer({ type: 'numerical_input', answer: { value: 45, unit: '°' } })).toBe('45°');
    expect(describeCorrectAnswer({ type: 'numerical_input', answer: { value: 400, unit: '₹' } })).toBe('₹400');
    expect(describeCorrectAnswer({ type: 'numerical_input', answer: { value: 5, unit: '₹ lakh' } })).toBe('₹5 lakh');
    expect(describeCorrectAnswer({ type: 'numerical_input', answer: { value: 34.64, unit: 'm' } })).toBe('34.64 m');
    expect(describeCorrectAnswer({ type: 'numerical_input', answer: { value: 54, unit: 'km/hr' } })).toBe('54 km/hr');
    expect(describeCorrectAnswer({ type: 'numerical_input', answer: { value: 12 } })).toBe('12');
  });

  it('evaluates every authored question against its own stated answer', () => {
    // Guards against content edits that leave a question unanswerable.
    for (const question of questionRepository.getAll()) {
      let response;
      if (question.type === 'numerical_input') response = question.answer.value;
      else if (question.type === 'match_following') {
        response = Object.fromEntries(question.pairs.map((p, i) => [i, p.right]));
      } else if (question.type === 'ordering') response = question.steps.map((s) => s.id);
      else if (question.type === 'multiple_choice') response = question.correctAnswer;
      else response = question.correctAnswer[0];
      expect(evaluateAnswer(question, response).correct, `${question.id} should accept its own answer`).toBe(true);
    }
  });
});

/* ============================ gamification ============================ */

describe('gamification', () => {
  it('awards less XP when hints were used', () => {
    expect(xpForAnswer({ correct: true, hintsUsed: 0 })).toBe(XP.correctFirstTry);
    expect(xpForAnswer({ correct: true, hintsUsed: 2 })).toBeLessThan(XP.correctFirstTry);
    expect(xpForAnswer({ correct: true, hintsUsed: 2 })).toBeGreaterThan(0);
  });

  it('still awards something for an honest wrong attempt', () => {
    expect(xpForAnswer({ correct: false })).toBe(XP.incorrect);
  });

  it('awards the most for correcting a previous mistake', () => {
    expect(xpForAnswer({ correct: true, wasPreviouslyWrong: true })).toBeGreaterThan(XP.correctFirstTry);
  });

  it('only counts a streak day once meaningful work is done', () => {
    const progress = getUserProgress();
    recordActivity(progress, { questions: 2 });
    expect(progress.streak.current).toBe(0);
    recordActivity(progress, { questions: 3 });
    expect(progress.streak.current).toBe(1);
    // Repeating on the same day must not inflate the streak.
    recordActivity(progress, { questions: 10 });
    expect(progress.streak.current).toBe(1);
  });

  it('continues a streak after a single missed day but resets after a gap', () => {
    const progress = getUserProgress();
    progress.streak.current = 4;
    progress.streak.lastPracticeDay = dayKey(addDays(new Date(), -2));
    recordActivity(progress, { questions: 5 });
    expect(progress.streak.current).toBe(5);

    const progress2 = getUserProgress();
    progress2.streak.lastPracticeDay = dayKey(addDays(new Date(), -9));
    progress2.streak.days = {};
    progress2.streak.current = 7;
    recordActivity(progress2, { questions: 5 });
    expect(progress2.streak.current).toBe(1);
  });

  describe('streak freezes and repair', () => {
    const daysAgo = (n) => dayKey(addDays(new Date(), -n));
    const onStreak = (current, lastDaysAgo, extra = {}) => {
      const progress = getUserProgress();
      Object.assign(progress.streak, { current, longest: current, lastPracticeDay: daysAgo(lastDaysAgo), days: {}, ...extra });
      return progress;
    };

    it('starts every learner with one freeze', () => {
      expect(getUserProgress().streak.freezes).toBe(STREAK_RULES.startingFreezes);
    });

    it('spends one freeze per missed day and remembers which days it covered', () => {
      const progress = onStreak(4, 3, { freezes: 2 });
      const result = recordActivity(progress, { questions: 5 });
      expect(result.usedFreezes).toBe(2);
      expect(progress.streak.current).toBe(5);
      expect(progress.streak.freezes).toBe(0);
      expect(progress.streak.frozenDays).toEqual([daysAgo(2), daysAgo(1)]);
      expect(getStreakStatus(progress).current).toBe(5);
    });

    it('breaks the streak when there are not enough freezes, and offers a repair', () => {
      const progress = onStreak(6, 3, { freezes: 1 });
      const before = getStreakStatus(progress);
      expect(before.current).toBe(0);
      expect(before.repair).toMatchObject({ length: 6, questionsNeeded: STREAK_RULES.repairQuestions });

      recordActivity(progress, { questions: 5 });
      expect(progress.streak.current).toBe(1);
      expect(progress.streak.freezes).toBe(1); // a failed cover spends nothing
      expect(progress.streak.lost).toEqual({ length: 6, returnedOn: dayKey() });
      expect(getStreakStatus(progress).repair).toMatchObject({ length: 6, questionsDone: 5, daysLeft: STREAK_RULES.repairWindowDays });
    });

    it('repairs a broken streak after enough questions in one day', () => {
      const progress = onStreak(6, 3, { freezes: 0 });
      recordActivity(progress, { questions: 5 });
      const result = recordActivity(progress, { questions: STREAK_RULES.repairQuestions - 5 });
      expect(result.repaired).toBe(true);
      expect(progress.streak.current).toBe(7);
      expect(progress.streak.longest).toBe(7);
      expect(progress.streak.lost).toBeNull();
      expect(getStreakStatus(progress).repair).toBeNull();
    });

    it('lets the repair offer lapse after the window', () => {
      const progress = onStreak(2, 1, { freezes: 0, lost: { length: 9, returnedOn: daysAgo(STREAK_RULES.repairWindowDays) } });
      expect(getStreakStatus(progress).repair).toBeNull();
      recordActivity(progress, { questions: STREAK_RULES.repairQuestions });
      expect(progress.streak.current).toBe(3);
      expect(progress.streak.lost).toBeNull();
    });

    it('does not offer a repair for a very short streak', () => {
      const progress = onStreak(STREAK_RULES.repairMinLength - 1, 4, { freezes: 0 });
      expect(getStreakStatus(progress).repair).toBeNull();
      recordActivity(progress, { questions: 5 });
      expect(progress.streak.lost).toBeNull();
    });

    it('earns a freeze on every 7th day, up to the maximum', () => {
      const progress = onStreak(6, 1, { freezes: 0 });
      expect(recordActivity(progress, { questions: 5 }).earnedFreeze).toBe(true);
      expect(progress.streak.freezes).toBe(1);

      const full = onStreak(13, 1, { freezes: STREAK_RULES.maxFreezes });
      expect(recordActivity(full, { questions: 5 }).earnedFreeze).toBe(false);
      expect(full.streak.freezes).toBe(STREAK_RULES.maxFreezes);
    });

    it('treats saves from before freezes existed as having one', () => {
      const progress = onStreak(4, 2);
      delete progress.streak.freezes;
      delete progress.streak.frozenDays;
      delete progress.streak.lost;
      expect(getStreakStatus(progress)).toMatchObject({ current: 4, freezes: 1, freezesNeeded: 1 });
      recordActivity(progress, { questions: 5 });
      expect(progress.streak.current).toBe(5);
      expect(progress.streak.freezes).toBe(0);
    });
  });

  it('moves up rank bands as XP accumulates', () => {
    expect(getRank(0).id).toBe('beginner');
    expect(getRank(10000).id).toBe('quant-master');
    expect(getRank(800).minXp).toBeLessThanOrEqual(800);
  });

  it('unlocks an achievement exactly once', () => {
    const progress = getUserProgress();
    progress.stats.questionsAnswered = 150;
    const first = checkAchievements(progress);
    expect(first.some((a) => a.id === 'century')).toBe(true);
    const second = checkAchievements(progress);
    expect(second.some((a) => a.id === 'century')).toBe(false);
  });
});

/* ========================= learning engine ========================= */

describe('learningEngine', () => {
  const question = questionRepository.getById('percentages-q-121');

  it('records an attempt against stats, concept mastery and XP', () => {
    const outcome = recordQuestionAttempt({ question, correct: true, hintsUsed: 0, timeMs: 5000 });
    const progress = getUserProgress();

    expect(progress.stats.questionsAnswered).toBe(1);
    expect(progress.stats.correctAnswers).toBe(1);
    expect(progress.concepts[question.conceptId].masteryScore).toBeGreaterThan(0);
    expect(progress.topics[question.topicId].questionsAnswered).toBe(1);
    expect(outcome.xpAwarded).toBe(XP.correctFirstTry);
    expect(progress.xp.total).toBeGreaterThanOrEqual(XP.correctFirstTry);
  });

  it('records hint usage and pays less XP for it', () => {
    const outcome = recordQuestionAttempt({ question, correct: true, hintsUsed: 2, timeMs: 1000 });
    expect(getUserProgress().stats.hintsUsed).toBe(2);
    expect(outcome.xpAwarded).toBeLessThan(XP.correctFirstTry);
  });

  it('tracks a wrong answer as a mistake and clears it when corrected later', () => {
    recordQuestionAttempt({ question, correct: false, sessionId: 's1' });
    let mistakes = getMistakes({ includeResolved: false });
    expect(mistakes.map((m) => m.question.id)).toContain(question.id);

    const outcome = recordQuestionAttempt({ question, correct: true, sessionId: 's2' });
    expect(outcome.correctedMistake).toBe(true);
    expect(getUserProgress().stats.mistakesCorrected).toBe(1);
    mistakes = getMistakes({ includeResolved: false });
    expect(mistakes.map((m) => m.question.id)).not.toContain(question.id);
  });

  it('does not count an immediate in-session retry as a corrected mistake', () => {
    recordQuestionAttempt({ question, correct: false, sessionId: 'same' });
    const outcome = recordQuestionAttempt({ question, correct: true, sessionId: 'same', isRetry: true });
    expect(outcome.correctedMistake).toBe(false);
    expect(getUserProgress().stats.mistakesCorrected).toBe(0);
  });

  it('applies the level pass criteria', () => {
    const level = levelRepository.getById('percentages-level-4');
    expect(evaluateLevelPass(level, { accuracy: 80, attempted: 8, total: 8 })).toBe(true);
    expect(evaluateLevelPass(level, { accuracy: 50, attempted: 8, total: 8 })).toBe(false);
    // Enough accuracy but too few questions attempted.
    expect(evaluateLevelPass(level, { accuracy: 100, attempted: 2, total: 8 })).toBe(false);
  });

  it('unlocks the next level only after the current one is passed', () => {
    const level = levelRepository.getById('percentages-level-0');
    const next = levelRepository.getById('percentages-level-1');
    expect(getLevelStatus(next)).toBe('locked');

    completeLevelAttempt(level.id, { accuracy: 100, attempted: 6, total: 6 });
    expect(getLevelStatus(level)).toBe('completed');
    expect(getLevelStatus(next)).toBe('available');
  });

  it('does not complete a level that falls short, but records the attempt', () => {
    const level = levelRepository.getById('percentages-level-0');
    const result = completeLevelAttempt(level.id, { accuracy: 20, attempted: 6, total: 6 });
    expect(result.passed).toBe(false);
    expect(getLevelStatus(level)).toBe('in_progress');
    expect(getUserProgress().levels[level.id].attempts).toBe(1);
  });
});

/* ========================== session building ========================== */

describe('sessionBuilder', () => {
  it('never repeats a question inside one smart session', () => {
    const questions = selectSmartQuestions({ count: 12 });
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('respects a topic filter', () => {
    const questions = selectSmartQuestions({ count: 8, topicId: 'percentages' });
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.every((q) => q.topicId === 'percentages')).toBe(true);
  });

  it('prioritises weak concepts once mistakes exist', () => {
    const weakQuestion = questionRepository.getById('percentages-q-141');
    for (let i = 0; i < 3; i++) {
      recordQuestionAttempt({ question: weakQuestion, correct: false, sessionId: `s${i}` });
    }
    const selected = selectSmartQuestions({ count: 10, topicId: 'percentages' });
    const conceptIds = selected.map((q) => q.conceptId);
    expect(conceptIds).toContain(weakQuestion.conceptId);
  });

  it('builds a level session from the level definition', () => {
    const level = levelRepository.getById('percentages-level-4');
    const session = buildLevelSession(level);
    expect(session.questions.length).toBe(level.questionIds.length);
    expect(session.source).toEqual({ type: 'level', levelId: level.id, topicId: 'percentages' });
  });

  it('returns null for a mistakes session when nothing is outstanding', () => {
    expect(buildMistakesSession({ count: 5 })).toBeNull();
  });

  it('builds a mistakes session from unresolved questions only', () => {
    const wrong = questionRepository.getById('percentages-q-151');
    recordQuestionAttempt({ question: wrong, correct: false, sessionId: 's1' });
    const session = buildMistakesSession({ count: 5 });
    expect(session.questions.map((q) => q.id)).toEqual([wrong.id]);
  });

  it('produces the same daily challenge twice in a row', () => {
    const a = buildDailyChallenge({ count: 8 }).questions.map((q) => q.id);
    const b = buildDailyChallenge({ count: 8 }).questions.map((q) => q.id);
    expect(a).toEqual(b);
  });
});

/* ============================ full session ============================ */

describe('session flow', () => {
  it('scores a session end to end', () => {
    const questions = [
      questionRepository.getById('percentages-q-121'),
      questionRepository.getById('percentages-q-122')
    ];
    const session = createSession({ questions, mode: 'practice', title: 'Test' });

    submitAnswer(session, questions[0].correctAnswer[0]);
    advance(session);
    const wrongOption = questions[1].options.find((o) => !questions[1].correctAnswer.includes(o.id));
    submitAnswer(session, wrongOption.id);

    const result = buildResult(session);
    expect(result.total).toBe(2);
    expect(result.attempted).toBe(2);
    expect(result.correct).toBe(1);
    expect(result.accuracy).toBe(50);
    expect(result.xpEarned).toBeGreaterThan(0);
  });
});
