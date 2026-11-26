/**
 * Quiz session state machine plus answer evaluation.
 *
 * Correctness lives here and in the data — never in a view. Adding a question
 * type means adding an evaluator here and a renderer in the renderer registry.
 */

import { PRACTICE_MODES } from '../app/config.js';
import { getSettings } from '../app/state.js';
import { recordQuestionAttempt } from './learningEngine.js';

const LEARNING_MODE_TIMER_SECONDS = 90;

function defaultTimerSeconds(modeConfig) {
  const settings = getSettings();
  if (modeConfig.timer) return settings.examTimerSeconds;
  return settings.timerInLearnMode ? LEARNING_MODE_TIMER_SECONDS : null;
}

/* ========================== answer evaluation ========================== */

const CHOICE_TYPES = new Set([
  'single_choice',
  'formula_recognition',
  'formula_selection',
  'method_recognition',
  'statement_evaluation',
  'assertion_reason',
  'identify_error',
  'next_step',
  'estimate'
]);

export function isChoiceType(type) {
  return CHOICE_TYPES.has(type);
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((item) => setB.has(item));
}

/**
 * @returns {{correct: boolean, detail: object}} detail carries per-part results
 *   for composite types so the UI can mark individual rows.
 */
export function evaluateAnswer(question, response) {
  if (response === null || response === undefined) return { correct: false, detail: {} };

  if (isChoiceType(question.type)) {
    const chosen = Array.isArray(response) ? response[0] : response;
    return { correct: question.correctAnswer.includes(chosen), detail: { chosen } };
  }

  if (question.type === 'multiple_choice') {
    const chosen = Array.isArray(response) ? response : [response];
    return {
      correct: sameSet(chosen, question.correctAnswer),
      detail: { chosen, expected: question.correctAnswer }
    };
  }

  if (question.type === 'numerical_input') {
    const value = typeof response === 'number' ? response : Number(String(response).replace(/[,\s₹%]/g, ''));
    if (!Number.isFinite(value)) return { correct: false, detail: { value: null } };
    const tolerance = question.answer?.tolerance ?? 0;
    const target = question.answer?.value;
    return { correct: Math.abs(value - target) <= tolerance, detail: { value, target } };
  }

  if (question.type === 'match_following') {
    // response: { [leftIndex]: rightText }
    const rows = question.pairs.map((pair, index) => ({
      index,
      expected: pair.right,
      given: response?.[index] ?? null,
      correct: response?.[index] === pair.right
    }));
    return { correct: rows.every((r) => r.correct), detail: { rows } };
  }

  if (question.type === 'ordering') {
    // response: array of step ids in the learner's chosen order
    const expected = question.steps.map((s) => s.id);
    const given = Array.isArray(response) ? response : [];
    const rows = expected.map((id, index) => ({
      index,
      expectedId: id,
      givenId: given[index] ?? null,
      correct: given[index] === id
    }));
    return { correct: rows.every((r) => r.correct), detail: { rows } };
  }

  console.warn(`[quizEngine] no evaluator for question type "${question.type}"`);
  return { correct: false, detail: {} };
}

/** A displayable version of the correct answer, for the solution panel. */
export function describeCorrectAnswer(question) {
  if (isChoiceType(question.type) || question.type === 'multiple_choice') {
    const ids = question.correctAnswer || [];
    return (question.options || [])
      .filter((opt) => ids.includes(opt.id))
      .map((opt) => opt.text)
      .join(', ');
  }
  if (question.type === 'numerical_input') {
    const unit = question.answer?.unit || '';
    // Currency goes in front (₹40, ₹5 lakh); % and ° hug the number (12%, 45°); other units follow it (34.64 m).
    const value = question.answer.value;
    if (!unit) return String(value);
    if (unit === '%' || unit === '°') return `${value}${unit}`;
    if (unit.startsWith('₹') || unit.startsWith('$')) return `${unit[0]}${value}${unit.slice(1)}`;
    return `${value} ${unit}`;
  }
  if (question.type === 'match_following') {
    return question.pairs.map((p) => `${p.left} → ${p.right}`).join(' • ');
  }
  if (question.type === 'ordering') {
    return question.steps.map((s, i) => `${i + 1}. ${s.text}`).join('  ');
  }
  return '';
}

/** Is this response complete enough to submit? */
export function isResponseComplete(question, response) {
  if (response === null || response === undefined) return false;
  if (question.type === 'multiple_choice') return Array.isArray(response) && response.length > 0;
  if (question.type === 'numerical_input') return String(response).trim() !== '';
  if (question.type === 'match_following') {
    return question.pairs.every((_, index) => response?.[index]);
  }
  if (question.type === 'ordering') {
    return Array.isArray(response) && response.length === question.steps.length;
  }
  return Boolean(response);
}

/* ============================== sessions ============================== */

let sessionCounter = 0;

/**
 * @param {object} config
 * @param {Array} config.questions
 * @param {string} config.mode - key of PRACTICE_MODES
 */
export function createSession({
  questions,
  mode = 'practice',
  title = 'Practice',
  subtitle = '',
  source = {},
  formulaCards = [],
  timerSecondsPerQuestion = null,
  returnTo = '/'
}) {
  const modeConfig = PRACTICE_MODES[mode] || PRACTICE_MODES.practice;
  sessionCounter += 1;
  return {
    id: `s-${Date.now()}-${sessionCounter}`,
    mode,
    modeConfig,
    title,
    subtitle,
    source,
    questions,
    formulaCards,
    index: 0,
    responses: {},
    outcomes: {},
    startedAt: new Date().toISOString(),
    questionStartedAt: Date.now(),
    finishedAt: null,
    timerSecondsPerQuestion: timerSecondsPerQuestion ?? defaultTimerSeconds(modeConfig),
    returnTo,
    xpEarned: 0,
    markedForReview: new Set()
  };
}

export function currentQuestion(session) {
  return session.questions[session.index] || null;
}

export function getOutcome(session, questionId) {
  return session.outcomes[questionId] || null;
}

export function ensureOutcome(session, questionId) {
  if (!session.outcomes[questionId]) {
    session.outcomes[questionId] = {
      questionId,
      hintsUsed: 0,
      revealedSolution: false,
      submitted: false,
      correct: null,
      response: null,
      detail: {},
      attempts: 0,
      timeMs: 0,
      skipped: false,
      xp: 0
    };
  }
  return session.outcomes[questionId];
}

export function useHint(session, questionId) {
  const outcome = ensureOutcome(session, questionId);
  outcome.hintsUsed += 1;
  return outcome.hintsUsed;
}

export function revealSolution(session, questionId) {
  const outcome = ensureOutcome(session, questionId);
  outcome.revealedSolution = true;
  return outcome;
}

export function toggleMarkForReview(session, questionId) {
  if (session.markedForReview.has(questionId)) session.markedForReview.delete(questionId);
  else session.markedForReview.add(questionId);
  return session.markedForReview.has(questionId);
}

/**
 * Submit an answer: evaluates, records it against the learner's progress, and
 * returns the outcome the feedback panel needs.
 */
export function submitAnswer(session, response) {
  const question = currentQuestion(session);
  if (!question) return null;

  const outcome = ensureOutcome(session, question.id);
  const { correct, detail } = evaluateAnswer(question, response);
  const timeMs = Date.now() - session.questionStartedAt;

  outcome.submitted = true;
  outcome.correct = correct;
  outcome.response = response;
  outcome.detail = detail;
  outcome.attempts += 1;
  outcome.timeMs += timeMs;

  const record = recordQuestionAttempt({
    question,
    correct,
    hintsUsed: outcome.hintsUsed,
    revealedSolution: outcome.revealedSolution,
    timeMs: outcome.timeMs,
    sessionId: session.id,
    mode: session.mode,
    isRetry: outcome.attempts > 1
  });

  outcome.xp = record.xpAwarded;
  outcome.masteryDelta = record.masteryDelta;
  outcome.masteryBefore = record.masteryBefore;
  outcome.masteryAfter = record.masteryAfter;
  outcome.wasPreviouslyWrong = record.wasPreviouslyWrong;
  outcome.correctedMistake = record.correctedMistake;
  session.xpEarned += record.xpAwarded;

  return outcome;
}

/** Retry after a wrong answer, inside the same session. */
export function allowRetry(session, questionId) {
  const outcome = ensureOutcome(session, questionId);
  outcome.submitted = false;
  outcome.response = null;
  session.questionStartedAt = Date.now();
  return outcome;
}

export function skipQuestion(session) {
  const question = currentQuestion(session);
  if (!question) return;
  const outcome = ensureOutcome(session, question.id);
  outcome.skipped = true;
  advance(session);
}

export function advance(session) {
  if (session.index < session.questions.length - 1) {
    session.index += 1;
    session.questionStartedAt = Date.now();
    return true;
  }
  return false;
}

export function goToIndex(session, index) {
  session.index = Math.max(0, Math.min(index, session.questions.length - 1));
  session.questionStartedAt = Date.now();
}

export function isLastQuestion(session) {
  return session.index >= session.questions.length - 1;
}

export function progressOf(session) {
  const answered = Object.values(session.outcomes).filter((o) => o.submitted || o.skipped).length;
  return {
    answered,
    total: session.questions.length,
    percent: session.questions.length ? Math.round((answered / session.questions.length) * 100) : 0
  };
}

/** Summary object consumed by the results view. */
export function buildResult(session) {
  const outcomes = session.questions.map((question) => ({
    question,
    outcome: session.outcomes[question.id] || null
  }));
  const attempted = outcomes.filter((o) => o.outcome?.submitted);
  const correct = attempted.filter((o) => o.outcome.correct);
  const wrong = attempted.filter((o) => !o.outcome.correct);
  const skipped = outcomes.filter((o) => o.outcome?.skipped && !o.outcome?.submitted);
  const totalTimeMs = attempted.reduce((sum, o) => sum + (o.outcome.timeMs || 0), 0);
  const hintsUsed = attempted.reduce((sum, o) => sum + (o.outcome.hintsUsed || 0), 0);
  const correctedMistakes = attempted.filter((o) => o.outcome.correctedMistake).length;

  return {
    sessionId: session.id,
    mode: session.mode,
    title: session.title,
    subtitle: session.subtitle,
    source: session.source,
    startedAt: session.startedAt,
    finishedAt: new Date().toISOString(),
    total: session.questions.length,
    attempted: attempted.length,
    correct: correct.length,
    wrong: wrong.length,
    skipped: skipped.length,
    accuracy: attempted.length ? Math.round((correct.length / attempted.length) * 100) : 0,
    totalTimeMs,
    averageTimeMs: attempted.length ? Math.round(totalTimeMs / attempted.length) : 0,
    hintsUsed,
    correctedMistakes,
    xpEarned: session.xpEarned,
    outcomes,
    returnTo: session.returnTo,
    formulaCards: session.formulaCards
  };
}
