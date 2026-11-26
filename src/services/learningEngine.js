/**
 * Orchestration layer: turns a single learner action into every consequence —
 * mastery, review schedule, level progress, XP, streak and achievements.
 *
 * Views call into this; they never write progress directly.
 */

import { DEFAULT_PASS_CRITERIA, XP, MASTERY } from '../app/config.js';
import { dayKey, daysBetween, round } from '../utils/format.js';
import { emit, EVENTS } from '../app/eventBus.js';
import {
  update,
  getUserProgress,
  saveAttempt,
  appendSessionLog,
  getAllQuestionRecords
} from '../repositories/progressRepository.js';
import {
  conceptRepository,
  levelRepository,
  questionRepository,
  topicRepository
} from '../repositories/contentRepository.js';
import { applyAttempt, applyDecay, emptyConceptState, getTopicMastery } from './masteryEngine.js';
import { emptyReviewState, gradeFromOutcome, review } from './spacedRepetition.js';
import {
  awardXp,
  checkAchievements,
  recordActivity,
  xpForAnswer
} from './gamification.js';

/* ======================= question attempts ======================= */

function ensureTopicState(progress, topicId) {
  if (!progress.topics[topicId]) {
    progress.topics[topicId] = {
      topicId,
      startedAt: new Date().toISOString(),
      lastVisitedAt: null,
      questionsAnswered: 0,
      correctAnswers: 0,
      currentLevelId: null,
      completedLevels: 0
    };
  }
  return progress.topics[topicId];
}

function ensureQuestionRecord(progress, questionId) {
  if (!progress.questions[questionId]) {
    progress.questions[questionId] = {
      questionId,
      attempts: 0,
      correctAttempts: 0,
      timesWrong: 0,
      firstSeenAt: new Date().toISOString(),
      lastAttemptAt: null,
      lastResult: null,
      lastHintsUsed: 0,
      lastWrongSessionId: null,
      neededHints: false,
      resolved: false,
      mistakeType: null
    };
  }
  return progress.questions[questionId];
}

/**
 * Record one answered question.
 * @returns {{xpAwarded:number, masteryDelta:number, wasPreviouslyWrong:boolean, correctedMistake:boolean}}
 */
export function recordQuestionAttempt({
  question,
  correct,
  hintsUsed = 0,
  revealedSolution = false,
  timeMs = 0,
  sessionId = null,
  mode = 'practice',
  isRetry = false
}) {
  let outcome = {
    xpAwarded: 0,
    masteryDelta: 0,
    masteryBefore: 0,
    masteryAfter: 0,
    wasPreviouslyWrong: false,
    correctedMistake: false
  };

  update((progress) => {
    const record = ensureQuestionRecord(progress, question.id);
    const wasPreviouslyWrong = record.timesWrong > 0 && !record.resolved;
    // Fixing it immediately after getting it wrong in the same session is a
    // retry, not a recovered mistake — only a later session counts.
    const missedEarlierSession = wasPreviouslyWrong && record.lastWrongSessionId !== sessionId;
    const neededHintsBefore = record.neededHints;

    record.attempts += 1;
    record.lastAttemptAt = new Date().toISOString();
    record.lastResult = correct ? 'correct' : 'incorrect';
    record.lastHintsUsed = hintsUsed;
    if (hintsUsed > 0) record.neededHints = true;
    if (correct) {
      record.correctAttempts += 1;
      if (wasPreviouslyWrong) {
        record.resolved = true;
        if (missedEarlierSession) {
          progress.stats.mistakesCorrected += 1;
          outcome.correctedMistake = true;
        }
      }
      // Solved unaided something that previously required hints.
      if (neededHintsBefore && hintsUsed === 0 && !revealedSolution) {
        progress.stats.independentAfterGuided += 1;
      }
    } else {
      record.timesWrong += 1;
      record.resolved = false;
      record.lastWrongSessionId = sessionId;
    }

    // ---- concept mastery ----
    if (question.conceptId) {
      const prev = progress.concepts[question.conceptId] || emptyConceptState(question.conceptId);
      const { state, delta, before } = applyAttempt(prev, {
        correct,
        hintsUsed,
        timeMs,
        sessionId
      });
      progress.concepts[question.conceptId] = state;
      outcome.masteryDelta = delta;
      outcome.masteryBefore = before;
      outcome.masteryAfter = state.masteryScore;

      // A concept that is struggling gets pulled forward in the review queue.
      const reviewState =
        progress.formulas[`concept:${question.conceptId}`] ||
        emptyReviewState(`concept:${question.conceptId}`, 'concept');
      progress.formulas[`concept:${question.conceptId}`] = review(
        reviewState,
        gradeFromOutcome({ correct, hintsUsed })
      );
    }

    // ---- formulas touched by this question ----
    if (correct && hintsUsed === 0) {
      for (const formulaId of question.formulaIds || []) {
        const state = progress.formulas[formulaId] || emptyReviewState(formulaId, 'formula');
        // Using a formula successfully counts as a light review, not a full one.
        if (state.reviewCount > 0) {
          progress.formulas[formulaId] = review(state, 'good');
        }
      }
    }

    // ---- topic + global stats ----
    // lastVisitedAt is deliberately not touched here: a question met in a mixed
    // session should not make that topic the learner's "current" one.
    const topicState = ensureTopicState(progress, question.topicId);
    topicState.questionsAnswered += 1;
    if (correct) topicState.correctAnswers += 1;

    progress.stats.questionsAnswered += 1;
    if (correct) progress.stats.correctAnswers += 1;
    progress.stats.hintsUsed += hintsUsed;
    progress.stats.totalTimeSeconds += Math.round(timeMs / 1000);

    // ---- XP ----
    const xp = xpForAnswer({
      correct,
      hintsUsed: revealedSolution ? Math.max(hintsUsed, 3) : hintsUsed,
      wasPreviouslyWrong: outcome.correctedMistake,
      retry: isRetry
    });
    awardXp(progress, xp, correct ? 'Correct answer' : 'Attempt');
    outcome.xpAwarded = xp;
    outcome.wasPreviouslyWrong = wasPreviouslyWrong;

    recordActivity(progress, { questions: 1, correct: correct ? 1 : 0, xp });
    checkAchievements(progress);
  });

  saveAttempt({
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    questionId: question.id,
    topicId: question.topicId,
    conceptId: question.conceptId || null,
    levelId: question.levelId || null,
    difficulty: question.difficulty,
    type: question.type,
    correct,
    hintsUsed,
    revealedSolution,
    timeMs,
    mode,
    sessionId,
    at: new Date().toISOString()
  });

  return outcome;
}

/** Let the learner classify why they got something wrong. */
export function setMistakeType(questionId, mistakeType) {
  update((progress) => {
    const record = ensureQuestionRecord(progress, questionId);
    record.mistakeType = mistakeType;
  });
}

/* ======================= formula reviews ======================= */

/**
 * @param {object} args
 * @param {object} args.formula
 * @param {'again'|'hard'|'good'|'easy'} args.grade
 * @param {boolean} [args.wasRecallQuestion] - true when the learner answered a
 *   recognition/application question rather than self-assessing.
 */
export function recordFormulaReview({ formula, grade, wasRecallQuestion = false, correct = null }) {
  let xpAwarded = 0;
  update((progress) => {
    const prev = progress.formulas[formula.id] || emptyReviewState(formula.id, 'formula');
    progress.formulas[formula.id] = review(prev, grade);

    progress.stats.formulasReviewed += 1;
    if (wasRecallQuestion && correct) progress.stats.formulaRecallCorrect += 1;

    xpAwarded = wasRecallQuestion
      ? correct
        ? XP.formulaRecallCorrect
        : 1
      : grade === 'good' || grade === 'easy'
        ? XP.formulaReviewed
        : 1;
    awardXp(progress, xpAwarded, 'Formula review');
    recordActivity(progress, { formulas: 1, xp: xpAwarded });
    checkAchievements(progress);
  });
  return { xpAwarded };
}

/* ======================= levels ======================= */

export function getLevelState(levelId) {
  return getUserProgress().levels[levelId] || null;
}

export function getLevelStatus(level, progress = getUserProgress()) {
  const state = progress.levels[level.id];
  if (state?.status === 'completed') return 'completed';
  const prereqs = level.prerequisiteLevelIds || [];
  const unlocked = prereqs.every((id) => progress.levels[id]?.status === 'completed');
  if (!unlocked) return 'locked';
  if (state?.attempts) return 'in_progress';
  return 'available';
}

export function getPassCriteria(level) {
  return { ...DEFAULT_PASS_CRITERIA, ...(level.passCriteria || {}) };
}

/** Did this session meet the level's bar? */
export function evaluateLevelPass(level, result) {
  const criteria = getPassCriteria(level);
  if (criteria.minimumRecalled !== undefined) {
    return (result.recalled ?? 0) >= criteria.minimumRecalled;
  }
  const enoughQuestions = result.attempted >= Math.min(criteria.minimumQuestionsAttempted, result.total);
  return enoughQuestions && result.accuracy >= criteria.minimumAccuracy;
}

/**
 * Record the outcome of a level attempt and unlock the next one when passed.
 * Returns `{ passed, firstCompletion, nextLevel }`.
 */
export function completeLevelAttempt(levelId, result) {
  const level = levelRepository.getById(levelId);
  if (!level) return { passed: false, firstCompletion: false, nextLevel: null };

  const passed = evaluateLevelPass(level, result);
  let firstCompletion = false;

  update((progress) => {
    const state = progress.levels[levelId] || {
      levelId,
      topicId: level.topicId,
      status: 'in_progress',
      attempts: 0,
      bestAccuracy: 0,
      questionsAnswered: 0,
      completedAt: null,
      lastAttemptAt: null
    };
    state.attempts += 1;
    state.lastAttemptAt = new Date().toISOString();
    state.questionsAnswered += result.attempted || 0;
    state.bestAccuracy = Math.max(state.bestAccuracy, result.accuracy || 0);

    if (passed && state.status !== 'completed') {
      state.status = 'completed';
      state.completedAt = new Date().toISOString();
      firstCompletion = true;
      progress.stats.levelsCompleted += 1;
      const topicState = ensureTopicState(progress, level.topicId);
      topicState.completedLevels += 1;
      awardXp(progress, level.xpReward || XP.levelComplete, `Level complete: ${level.title}`);
      if (level.timerSecondsPerQuestion) progress.stats.timedChallengesCompleted += 1;
    } else if (state.status !== 'completed') {
      state.status = 'in_progress';
    }
    progress.levels[levelId] = state;

    // Point the topic at the next thing to do.
    const topicState = ensureTopicState(progress, level.topicId);
    const next = levelRepository.getNext(levelId);
    topicState.currentLevelId = passed && next ? next.id : levelId;

    checkAchievements(progress, { session: result });
  });

  if (firstCompletion) {
    emit(EVENTS.levelCompleted, { level, result });
  }

  return { passed, firstCompletion, nextLevel: levelRepository.getNext(levelId) };
}

export function completeConceptLesson(level) {
  let firstCompletion = false;
  update((progress) => {
    const state = progress.levels[level.id] || {
      levelId: level.id,
      topicId: level.topicId,
      status: 'in_progress',
      attempts: 0,
      bestAccuracy: 100,
      questionsAnswered: 0,
      completedAt: null,
      lastAttemptAt: null
    };
    state.attempts += 1;
    state.lastAttemptAt = new Date().toISOString();
    if (state.status !== 'completed') {
      state.status = 'completed';
      state.completedAt = new Date().toISOString();
      firstCompletion = true;
      progress.stats.levelsCompleted += 1;
      progress.stats.conceptLessonsCompleted += 1;
      awardXp(progress, level.xpReward || XP.conceptLessonComplete, 'Concept lesson');
      const topicState = ensureTopicState(progress, level.topicId);
      topicState.completedLevels += 1;
      const next = levelRepository.getNext(level.id);
      topicState.currentLevelId = next ? next.id : level.id;
    }
    progress.levels[level.id] = state;
    recordActivity(progress, { lessons: 1 });
    checkAchievements(progress);
  });
  if (firstCompletion) emit(EVENTS.levelCompleted, { level, result: null });
  return { firstCompletion };
}

/* ======================= sessions ======================= */

/** Called once when a practice session finishes. */
export function completeSession(result) {
  const bonus =
    result.source?.type === 'daily' ? XP.dailyMissionComplete : XP.sessionComplete;
  let comebackDays = 0;

  update((progress) => {
    const last = progress.lastActivityAt ? new Date(progress.lastActivityAt) : null;
    comebackDays = last ? daysBetween(last, new Date()) : 0;

    progress.stats.sessionsCompleted += 1;
    progress.stats.longestSessionQuestions = Math.max(
      progress.stats.longestSessionQuestions,
      result.attempted || 0
    );
    if (result.attempted && result.accuracy === 100) {
      progress.stats.perfectSessionBest = Math.max(
        progress.stats.perfectSessionBest,
        result.attempted
      );
    }
    if (result.attempted > 0) {
      awardXp(progress, bonus, 'Session complete');
      result.xpEarned += bonus;
    }
    recordActivity(progress, { sessions: 1 });
    checkAchievements(progress, { session: result, comebackDays });
  });

  appendSessionLog({
    id: result.sessionId,
    at: result.finishedAt,
    mode: result.mode,
    title: result.title,
    total: result.total,
    attempted: result.attempted,
    correct: result.correct,
    accuracy: result.accuracy,
    xp: result.xpEarned,
    topicId: result.source?.topicId || null,
    levelId: result.source?.levelId || null
  });

  return result;
}

export function recordFormulaSessionComplete({ topicId, reviewed, recalledCorrect }) {
  update((progress) => {
    progress.stats.sessionsCompleted += 1;
    awardXp(progress, XP.sessionComplete, 'Revision session');
    checkAchievements(progress);
  });
  appendSessionLog({
    id: `fs-${Date.now()}`,
    at: new Date().toISOString(),
    mode: 'revision',
    title: 'Formula revision',
    total: reviewed,
    attempted: reviewed,
    correct: recalledCorrect,
    accuracy: reviewed ? Math.round((recalledCorrect / reviewed) * 100) : 0,
    xp: 0,
    topicId: topicId || null,
    levelId: null
  });
}

/* ======================= derived views of progress ======================= */

export function getTopicSummary(topicId) {
  const progress = getUserProgress();
  const topic = topicRepository.getById(topicId);
  const levels = levelRepository.getByTopic(topicId);
  const topicState = progress.topics[topicId];
  const mastery = getTopicMastery(topicId);

  const completedLevels = levels.filter(
    (level) => progress.levels[level.id]?.status === 'completed'
  ).length;

  const currentLevel =
    levels.find((level) => getLevelStatus(level, progress) === 'in_progress') ||
    levels.find((level) => getLevelStatus(level, progress) === 'available') ||
    null;

  const questionsAnswered = topicState?.questionsAnswered || 0;
  const correctAnswers = topicState?.correctAnswers || 0;

  let status = 'not_started';
  if (questionsAnswered > 0 || completedLevels > 0) {
    status = mastery.score >= MASTERY.strongAt ? 'mastered' : 'in_progress';
  }
  if (status === 'in_progress' && completedLevels === levels.length && levels.length > 0) {
    status = 'revising';
  }

  return {
    topic,
    levels,
    totalLevels: levels.length,
    completedLevels,
    currentLevel,
    mastery,
    questionsAnswered,
    correctAnswers,
    accuracy: questionsAnswered ? round((correctAnswers / questionsAnswered) * 100, 0) : null,
    lastVisitedAt: topicState?.lastVisitedAt || null,
    status
  };
}

/** Topics the learner has touched, most recent first. */
export function getRecentTopics(limit = 3) {
  const progress = getUserProgress();
  return Object.values(progress.topics)
    .filter((t) => t.lastVisitedAt)
    .sort((a, b) => new Date(b.lastVisitedAt) - new Date(a.lastVisitedAt))
    .slice(0, limit)
    .map((t) => getTopicSummary(t.topicId))
    .filter((summary) => summary.topic);
}

/* ======================= mistakes ======================= */

/**
 * Every question the learner has got wrong, with enough context for the
 * Mistakes view to categorise them.
 */
export function getMistakes({ topicId = null, includeResolved = true } = {}) {
  const records = getAllQuestionRecords();
  const out = [];
  for (const record of Object.values(records)) {
    if (!record.timesWrong) continue;
    if (!includeResolved && record.resolved) continue;
    const question = questionRepository.getById(record.questionId);
    if (!question) continue;
    if (topicId && question.topicId !== topicId) continue;
    const concept = question.conceptId ? conceptRepository.getById(question.conceptId) : null;
    const topic = topicRepository.getById(question.topicId);
    out.push({
      question,
      concept,
      topic,
      record,
      daysSince: record.lastAttemptAt ? daysBetween(new Date(record.lastAttemptAt), new Date()) : null
    });
  }
  out.sort((a, b) => new Date(b.record.lastAttemptAt || 0) - new Date(a.record.lastAttemptAt || 0));
  return out;
}

export function categoriseMistakes(mistakes) {
  const recent = mistakes.filter((m) => !m.record.resolved && (m.daysSince ?? 99) <= 7);
  const frequent = mistakes.filter((m) => m.record.timesWrong >= 2 && !m.record.resolved);
  const unresolved = mistakes.filter((m) => !m.record.resolved);
  const almost = mistakes.filter(
    (m) => !m.record.resolved && m.record.correctAttempts > 0 && m.record.timesWrong === 1
  );
  const corrected = mistakes.filter((m) => m.record.resolved);
  return { recent, frequent, unresolved, almost, corrected, all: mistakes };
}

/** Marks a topic as visited so "continue learning" is accurate. */
export function touchTopic(topicId) {
  update((progress) => {
    const state = ensureTopicState(progress, topicId);
    state.lastVisitedAt = new Date().toISOString();
  });
}

/** Quick stats bundle for the dashboard header and progress view. */
export function getGlobalStats() {
  const progress = getUserProgress();
  const stats = progress.stats;
  return {
    ...stats,
    accuracy: stats.questionsAnswered
      ? round((stats.correctAnswers / stats.questionsAnswered) * 100, 0)
      : null,
    xp: progress.xp.total,
    xpToday: progress.xp.byDay[dayKey()] || 0
  };
}
