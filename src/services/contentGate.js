/**
 * Content gate: makes sure the lazily loaded topic packs (questions, lessons and
 * flashcard text) and the question generators are in memory before code that
 * needs them runs.
 *
 * The rule of thumb:
 *   - a view about one topic awaits `ensureTopicContent(topicId)`;
 *   - anything that builds a session across topics awaits `ensureAllContent()`;
 *   - at boot, `ensureMistakeContent()` loads the topics the learner has wrong
 *     answers in, so mistake counts and lists are complete everywhere.
 * After boot, `prefetchAllContent()` quietly loads the rest while the browser is idle.
 */

import { ensureAllTopics, ensureTopics, topicOfQuestion } from '../data/index.js';
import { getAllQuestionRecords } from '../repositories/progressRepository.js';
import { ensureGenerators, isGeneratedId } from '../generators/gate.js';

export function ensureTopicContent(topicId) {
  return Promise.all([ensureTopics(topicId ? [topicId] : []), ensureGenerators()]).then(() => undefined);
}

export function ensureAllContent() {
  return Promise.all([ensureAllTopics(), ensureGenerators()]).then(() => undefined);
}

/** Topics owning any authored question the learner has got wrong, plus the generators if any wrong one was generated. */
export function ensureMistakeContent() {
  const wrong = Object.values(getAllQuestionRecords()).filter((record) => record.timesWrong);
  const topicIds = wrong.map((record) => topicOfQuestion(record.questionId)).filter(Boolean);
  const needGenerators = wrong.some((record) => isGeneratedId(record.questionId));
  return Promise.all([ensureTopics(topicIds), needGenerators ? ensureGenerators() : null]).then(() => undefined);
}

/** Load everything in the background once the first screen is up. Failures are retried on demand. */
export function prefetchAllContent({ delayMs = 1500 } = {}) {
  const run = () => ensureAllContent().catch(() => {});
  const idle = typeof window !== 'undefined' && window.requestIdleCallback;
  setTimeout(() => (idle ? idle(run, { timeout: 5000 }) : run()), delayMs);
}

/**
 * Wrap a click handler that builds a session across topics: waits for all content
 * (instant once prefetched) before running it.
 */
export function withAllContent(handler) {
  return async (...args) => {
    await ensureAllContent();
    return handler(...args);
  };
}
