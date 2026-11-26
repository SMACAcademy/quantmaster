/**
 * Review scheduling for formulas and concepts.
 *
 * A deliberately small SM-2-flavoured model: an interval ladder plus an ease
 * factor. Isolated here so it can be replaced wholesale later without touching
 * anything that schedules reviews.
 */

import { SPACED_REPETITION as SR } from '../app/config.js';
import { addDays, clamp, daysBetween, round } from '../utils/format.js';

export function emptyReviewState(itemId, itemType = 'formula') {
  return {
    itemId,
    itemType,
    lastReviewedAt: null,
    nextReviewAt: null,
    intervalDays: 0,
    ladderStep: -1,
    ease: SR.initialEase,
    reviewCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    lapses: 0,
    confidence: 0,
    status: 'new'
  };
}

/**
 * Record a review outcome.
 * @param {object} prev - previous review state (or null)
 * @param {'again'|'hard'|'good'|'easy'} grade
 */
export function review(prev, grade, now = new Date()) {
  const state = { ...(prev || emptyReviewState(prev?.itemId)) };
  const success = grade === 'good' || grade === 'easy';

  state.reviewCount += 1;
  state.lastReviewedAt = now.toISOString();

  if (success) {
    state.correctCount += 1;
    state.ease = clamp(
      round(state.ease + (grade === 'easy' ? SR.easeUp * 1.5 : SR.easeUp), 2),
      SR.minEase,
      SR.maxEase
    );
    state.ladderStep = Math.min(state.ladderStep + 1, SR.ladder.length - 1);
  } else {
    state.incorrectCount += 1;
    if (state.ladderStep >= 0) state.lapses += 1;
    state.ease = clamp(round(state.ease - SR.easeDown, 2), SR.minEase, SR.maxEase);
    state.ladderStep = Math.max(0, state.ladderStep - SR.lapseStepBack);
    if (grade === 'again') state.ladderStep = 0;
  }

  const baseInterval = SR.ladder[Math.max(0, state.ladderStep)];
  // Ease stretches or compresses the ladder step; 'hard' keeps it short.
  const easeFactor = grade === 'hard' ? 1 : state.ease / SR.initialEase;
  const intervalDays = Math.max(1, Math.round(baseInterval * easeFactor));

  state.intervalDays = grade === 'again' ? 0 : intervalDays;
  state.nextReviewAt = (grade === 'again'
    ? now // see it again inside this session
    : addDays(now, intervalDays)
  ).toISOString();

  const total = state.correctCount + state.incorrectCount;
  state.confidence = total ? round((state.correctCount / total) * 100, 0) : 0;
  state.status = deriveStatus(state);

  return state;
}

function deriveStatus(state) {
  if (!state.reviewCount) return 'new';
  if (state.ladderStep >= SR.ladder.length - 2 && state.confidence >= 80) return 'retained';
  if (state.confidence < 50 || state.lapses >= 3) return 'struggling';
  return 'learning';
}

export function isDue(state, now = new Date()) {
  if (!state || !state.nextReviewAt) return true;
  return new Date(state.nextReviewAt).getTime() <= now.getTime();
}

export function isDueSoon(state, now = new Date()) {
  if (isDue(state, now)) return true;
  return daysBetween(now, new Date(state.nextReviewAt)) <= SR.dueSoonDays;
}

/** How overdue an item is, in days. Used to sort the review queue. */
export function overdueDays(state, now = new Date()) {
  if (!state || !state.nextReviewAt) return 9999;
  return daysBetween(new Date(state.nextReviewAt), now);
}

/**
 * Split items into due / upcoming / new, sorted so the most overdue comes first.
 * @param {Array} items - content items with `id`
 * @param {object} states - map of id -> review state
 */
export function buildReviewQueue(items, states, now = new Date()) {
  const due = [];
  const fresh = [];
  const upcoming = [];

  for (const item of items) {
    const state = states[item.id];
    if (!state || !state.reviewCount) {
      fresh.push({ item, state: state || null });
    } else if (isDue(state, now)) {
      due.push({ item, state, overdue: overdueDays(state, now) });
    } else {
      upcoming.push({ item, state, dueIn: daysBetween(now, new Date(state.nextReviewAt)) });
    }
  }

  due.sort((a, b) => b.overdue - a.overdue);
  upcoming.sort((a, b) => a.dueIn - b.dueIn);

  return { due, fresh, upcoming };
}

/** Convenience: map a self-assessment or answer into a grade. */
export function gradeFromOutcome({ correct, hintsUsed = 0, selfRating = null }) {
  if (selfRating) return selfRating;
  if (!correct) return 'again';
  return hintsUsed > 0 ? 'hard' : 'good';
}
