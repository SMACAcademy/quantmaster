/**
 * Concept mastery: a bounded 0-100 indicator, not a claim of measurement.
 *
 * Design rules that come from the product spec:
 *  - one correct answer never jumps you to 100
 *  - answering without hints is worth more than answering with them
 *  - repeating success in a LATER session is worth more than in the same one
 *  - unreviewed knowledge decays slowly, with a floor
 */

import { MASTERY } from '../app/config.js';
import { clamp, daysBetween, round } from '../utils/format.js';
import { conceptRepository, questionRepository } from '../repositories/contentRepository.js';
import { getAllConceptProgress, getConceptProgress } from '../repositories/progressRepository.js';

export function emptyConceptState(conceptId) {
  return {
    conceptId,
    attempts: 0,
    correctAttempts: 0,
    hintedAttempts: 0,
    totalTimeMs: 0,
    lastAttemptedAt: null,
    lastCorrectAt: null,
    lastSessionId: null,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    masteryScore: MASTERY.startScore
  };
}

/** Mastery decays if an item has not been revisited for a while. */
export function applyDecay(state, now = new Date()) {
  if (!state || !state.lastAttemptedAt || state.masteryScore <= MASTERY.decayFloor) {
    return state?.masteryScore ?? 0;
  }
  const idleDays = daysBetween(new Date(state.lastAttemptedAt), now);
  const overdue = idleDays - MASTERY.decayGraceDays;
  if (overdue <= 0) return state.masteryScore;
  const decayed = state.masteryScore - overdue * MASTERY.decayPerDay;
  return clamp(round(decayed, 1), MASTERY.decayFloor, 100);
}

/**
 * Fold one answer into a concept's state. Returns a new state object plus the
 * score delta, so the UI can show "mastery +7" honestly.
 */
export function applyAttempt(prevState, { correct, hintsUsed = 0, timeMs = 0, sessionId = null }) {
  const state = { ...(prevState || emptyConceptState(prevState?.conceptId)) };
  const before = applyDecay(state);
  const now = new Date();

  state.attempts += 1;
  state.totalTimeMs += timeMs;
  if (hintsUsed > 0) state.hintedAttempts += 1;

  let score = before;

  if (correct) {
    state.correctAttempts += 1;
    state.consecutiveCorrect += 1;
    state.consecutiveIncorrect = 0;
    state.lastCorrectAt = now.toISOString();

    const base = hintsUsed > 0 ? MASTERY.correctWithHintsGain : MASTERY.correctGain;
    const noHintBonus = hintsUsed === 0 ? MASTERY.correctNoHintBonus : 0;
    const crossSession =
      sessionId && state.lastSessionId && sessionId !== state.lastSessionId
        ? MASTERY.crossSessionBonus
        : 0;

    // Gains shrink as the score approaches 100, so mastery is earned gradually.
    const headroom = (100 - score) / 100;
    score += (base + noHintBonus + crossSession) * Math.max(0.35, headroom);
  } else {
    state.consecutiveIncorrect += 1;
    state.consecutiveCorrect = 0;
    // A slip on something previously strong hurts more, but is capped.
    const penalty =
      score >= MASTERY.strongAt
        ? Math.min(MASTERY.regressionCap, MASTERY.incorrectPenalty * 1.6)
        : MASTERY.incorrectPenalty;
    score -= penalty;
  }

  state.lastAttemptedAt = now.toISOString();
  if (sessionId) state.lastSessionId = sessionId;
  state.masteryScore = clamp(round(score, 1), 0, 100);

  return { state, delta: round(state.masteryScore - before, 1), before };
}

export function getMasteryLabel(score) {
  let label = MASTERY.labels[0];
  for (const entry of MASTERY.labels) {
    if (score >= entry.min) label = entry;
  }
  return label;
}

export function getConceptScore(conceptId) {
  const state = getConceptProgress(conceptId);
  if (!state) return 0;
  return applyDecay(state);
}

export function getConceptAccuracy(state) {
  if (!state || !state.attempts) return null;
  return round((state.correctAttempts / state.attempts) * 100, 0);
}

/**
 * Topic mastery = average concept score across every concept in the topic.
 * Untouched concepts count as zero, so mastery reflects coverage as well as skill.
 */
export function getTopicMastery(topicId) {
  const concepts = conceptRepository.getByTopic(topicId);
  if (!concepts.length) return { score: 0, covered: 0, total: 0, label: getMasteryLabel(0) };
  const all = getAllConceptProgress();
  let total = 0;
  let covered = 0;
  for (const concept of concepts) {
    const state = all[concept.id];
    if (state?.attempts) covered += 1;
    total += state ? applyDecay(state) : 0;
  }
  const score = round(total / concepts.length, 0);
  return { score, covered, total: concepts.length, label: getMasteryLabel(score) };
}

export function getOverallMastery() {
  const all = getAllConceptProgress();
  const scores = Object.values(all)
    .filter((s) => s.attempts > 0)
    .map((s) => applyDecay(s));
  if (!scores.length) return 0;
  return round(scores.reduce((a, b) => a + b, 0) / scores.length, 0);
}

/**
 * Concepts that need work: attempted at least once and below the weak threshold,
 * hardest first. Concepts never attempted are returned separately as `untouched`
 * so the recommendation engine can choose between remediation and new ground.
 */
export function getWeakConcepts({ topicId = null, limit = null } = {}) {
  const all = getAllConceptProgress();
  const concepts = topicId ? conceptRepository.getByTopic(topicId) : conceptRepository.getAll();
  const weak = [];
  for (const concept of concepts) {
    const state = all[concept.id];
    if (!state || !state.attempts) continue;
    const score = applyDecay(state);
    if (score < MASTERY.weakBelow) {
      weak.push({ concept, state, score, accuracy: getConceptAccuracy(state) });
    }
  }
  weak.sort((a, b) => a.score - b.score);
  return limit ? weak.slice(0, limit) : weak;
}

export function getUntouchedConcepts({ topicId = null, limit = null } = {}) {
  const all = getAllConceptProgress();
  const concepts = topicId ? conceptRepository.getByTopic(topicId) : conceptRepository.getAll();
  const untouched = concepts.filter((c) => {
    if (all[c.id]?.attempts) return false;
    // Only surface concepts that actually have questions to practise.
    return questionRepository.conceptHasQuestions(c.id);
  });
  return limit ? untouched.slice(0, limit) : untouched;
}

export function getStrongConcepts({ topicId = null, limit = null } = {}) {
  const all = getAllConceptProgress();
  const concepts = topicId ? conceptRepository.getByTopic(topicId) : conceptRepository.getAll();
  const strong = concepts
    .map((concept) => ({ concept, state: all[concept.id] }))
    .filter((item) => item.state?.attempts)
    .map((item) => ({ ...item, score: applyDecay(item.state) }))
    .filter((item) => item.score >= MASTERY.strongAt)
    .sort((a, b) => b.score - a.score);
  return limit ? strong.slice(0, limit) : strong;
}

/** Topics ranked by mastery, restricted to topics with authored content. */
export function getTopicMasteryTable(topicIds) {
  return topicIds
    .map((topicId) => ({ topicId, ...getTopicMastery(topicId) }))
    .sort((a, b) => b.score - a.score);
}
