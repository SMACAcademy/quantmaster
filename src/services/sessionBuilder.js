/**
 * Builds the question sets behind every practice mode.
 *
 * The smart mix (weak / due / unseen / maintenance) is the core of the adaptive
 * behaviour, and its proportions live in one place: SESSION_MIX in config.
 */

import { SESSION_MIX, SESSION_PRESETS, LEVEL_TYPE_META } from '../app/config.js';
import { dayKey, hashString, shuffle, uniq } from '../utils/format.js';
import {
  conceptRepository,
  formulaRepository,
  levelRepository,
  questionRepository,
  topicRepository
} from '../repositories/contentRepository.js';
import { getAllFormulaReviews, getAllQuestionRecords, getUserProgress } from '../repositories/progressRepository.js';
import { getWeakConcepts, getUntouchedConcepts } from './masteryEngine.js';
import { buildReviewQueue, isDue } from './spacedRepetition.js';
import { createSession } from './quizEngine.js';
import { conceptHasTemplates, generateQuestions, topicHasTemplates } from '../generators/gate.js';
import { questionKey } from '../generators/questionKey.js';

/* ------------------------- helpers ------------------------- */

function attemptedQuestionIds() {
  return new Set(Object.keys(getAllQuestionRecords()));
}

function pickUnique(pool, count, taken) {
  const picked = [];
  for (const question of pool) {
    if (picked.length >= count) break;
    if (taken.has(question.id)) continue;
    taken.add(question.id);
    picked.push(question);
  }
  return picked;
}

function modeForLevelType(type) {
  if (type === 'challenge') return 'challenge';
  if (type === 'guided_practice' || type === 'concept') return 'learn';
  if (type === 'formula_recognition' || type === 'method_recognition') return 'learn';
  return 'practice';
}

/* ------------------------- level sessions ------------------------- */

const VARIATION_TYPES = new Set(['single_choice', 'numerical_input']);

/**
 * On a replay, a question the learner already answered correctly is swapped
 * for a freshly generated one on the same concept, so replaying a level
 * practises the method instead of rewarding a remembered answer. Questions
 * still unresolved are kept exactly as they were, so they can be fixed.
 */
function withFreshVariations(questions, records) {
  const avoidText = new Set(questions.map(questionKey));
  return questions.map((question) => {
    const record = records[question.id];
    const solvedBefore = record?.correctAttempts > 0 && (!record.timesWrong || record.resolved);
    if (!solvedBefore || !VARIATION_TYPES.has(question.type) || !conceptHasTemplates(question.conceptId)) {
      return question;
    }
    const [fresh] = generateQuestions({
      conceptIds: [question.conceptId],
      maxDifficulty: question.difficulty,
      count: 1,
      avoidText
    });
    if (!fresh) return question;
    avoidText.add(questionKey(fresh));
    return fresh;
  });
}

export function buildLevelSession(level, { timed = false } = {}) {
  const topic = topicRepository.getById(level.topicId);
  let questions = questionRepository.getByLevel(level.id);
  if (!questions.length) return null;

  const progress = getUserProgress();
  const isReplay = progress.levels[level.id]?.status === 'completed';
  if (isReplay) questions = withFreshVariations(questions, progress.questions);

  const ordered =
    level.type === 'mixed_practice' || level.type === 'challenge'
      ? shuffle(questions)
      : questions;

  return createSession({
    questions: ordered,
    mode: timed ? 'exam' : modeForLevelType(level.type),
    title: level.title,
    subtitle: `${topic?.name || ''} · ${LEVEL_TYPE_META[level.type]?.label || 'Practice'}`,
    source: { type: 'level', levelId: level.id, topicId: level.topicId },
    timerSecondsPerQuestion: timed ? level.timerSecondsPerQuestion || 60 : null,
    returnTo: `/topics/${level.topicId}`
  });
}

/* ------------------------- smart practice ------------------------- */

/**
 * The adaptive mix. Slices are filled in priority order and any shortfall rolls
 * into the next slice, so a small question bank still produces a full session.
 */
export function selectSmartQuestions({ count = 10, topicId = null } = {}) {
  const attempted = attemptedQuestionIds();
  const records = getAllQuestionRecords();
  const reviews = getAllFormulaReviews();
  const taken = new Set();

  const totalWeight =
    SESSION_MIX.weakConcepts +
    SESSION_MIX.dueForReview +
    SESSION_MIX.unseen +
    SESSION_MIX.maintenance;
  const slice = (weight) => Math.max(0, Math.round((weight / totalWeight) * count));

  const selected = [];
  const texts = () => new Set(selected.map(questionKey));
  const addGenerated = (options, needed) => {
    if (needed <= 0) return;
    const fresh = generateQuestions({ ...options, count: needed, avoidText: texts() });
    for (const question of fresh) taken.add(question.id);
    selected.push(...fresh);
  };

  // 1. Weak concepts — the biggest slice. Unfixed mistakes first, then fresh
  //    variations on the same concepts so the learner practises the method,
  //    not a memorised answer.
  const weak = getWeakConcepts({ topicId });
  const weakConceptIds = weak.map((w) => w.concept.id);
  if (weakConceptIds.length) {
    const weakSlice = slice(SESSION_MIX.weakConcepts);
    const pool = shuffle(
      questionRepository.query({ topicId, conceptIds: weakConceptIds })
    ).filter((q) => {
      const record = records[q.id];
      // Authored questions already solved are left for maintenance.
      return !record || (record.timesWrong > 0 && !record.resolved);
    });
    const authored = pickUnique(pool, Math.ceil(weakSlice / 2), taken);
    selected.push(...authored);
    addGenerated({ conceptIds: weakConceptIds }, weakSlice - authored.length);
  }

  // 2. Concepts whose review is due.
  const dueConceptIds = Object.entries(reviews)
    .filter(([key, state]) => key.startsWith('concept:') && isDue(state))
    .map(([key]) => key.replace('concept:', ''));
  if (dueConceptIds.length) {
    const pool = shuffle(questionRepository.query({ topicId, conceptIds: dueConceptIds }));
    selected.push(...pickUnique(pool, slice(SESSION_MIX.dueForReview), taken));
  }

  // 3. New ground: unseen authored questions, topped up with generated ones
  //    once the authored bank for this scope is exhausted.
  const unseenSlice = slice(SESSION_MIX.unseen);
  const unseenPool = questionRepository.getUnseenQuestions({ topicId, attemptedIds: attempted });
  const unseen = pickUnique(unseenPool, unseenSlice, taken);
  selected.push(...unseen);
  addGenerated(topicId ? { topicId } : { topicIds: startedTopicIds() }, unseenSlice - unseen.length);

  // 4. Maintenance — previously solved questions, to keep retention honest.
  const maintenancePool = shuffle(
    questionRepository.query({ topicId }).filter((q) => records[q.id]?.correctAttempts > 0)
  );
  selected.push(...pickUnique(maintenancePool, slice(SESSION_MIX.maintenance), taken));

  // Backfill: fresh questions before recycling ones already seen.
  if (selected.length < count) {
    addGenerated(topicId ? { topicId } : { topicIds: startedTopicIds() }, count - selected.length);
  }
  if (selected.length < count) {
    const fallback = shuffle(questionRepository.query({ topicId }));
    selected.push(...pickUnique(fallback, count - selected.length, taken));
  }

  return shuffle(selected).slice(0, count);
}

/** Topics the learner has actually practised; empty means "any topic". */
function startedTopicIds() {
  const topics = Object.values(getUserProgress().topics)
    .filter((t) => t.questionsAnswered > 0)
    .map((t) => t.topicId);
  return topics.length ? topics : null;
}

/**
 * Unlimited practice from the generators, weighted towards weak concepts.
 * Returns null for topics that have no templates yet.
 */
export function buildFreshSession({ topicId = null, count = 10 } = {}) {
  if (topicId && !topicHasTemplates(topicId)) return null;
  const weakConceptIds = getWeakConcepts({ topicId })
    .map((w) => w.concept.id)
    .filter(conceptHasTemplates);

  const questions = [];
  const avoidText = new Set();
  const collect = (options, needed) => {
    const batch = generateQuestions({ ...options, count: needed, avoidText });
    batch.forEach((q) => avoidText.add(questionKey(q)));
    questions.push(...batch);
  };

  if (weakConceptIds.length) collect({ conceptIds: weakConceptIds }, Math.ceil(count / 2));
  collect(topicId ? { topicId } : { topicIds: startedTopicIds() }, count - questions.length);
  if (!questions.length) return null;

  const topic = topicId ? topicRepository.getById(topicId) : null;
  return createSession({
    questions: shuffle(questions),
    mode: 'practice',
    title: 'Fresh Questions',
    subtitle: topic ? `${topic.name} · new numbers every time` : 'New numbers every time',
    source: { type: 'fresh', topicId },
    returnTo: topicId ? `/topics/${topicId}` : '/practice'
  });
}

export function buildSmartSession({ count = 10, topicId = null } = {}) {
  const questions = selectSmartQuestions({ count, topicId });
  if (!questions.length) return null;
  const topic = topicId ? topicRepository.getById(topicId) : null;
  return createSession({
    questions,
    mode: 'smart',
    title: 'Smart Practice',
    subtitle: topic ? topic.name : 'Picked from your weak areas and reviews',
    source: { type: 'smart', topicId },
    returnTo: topicId ? `/topics/${topicId}` : '/practice'
  });
}

/**
 * Practice on a single concept (from the topic's mastery map): unseen authored
 * questions first, then fresh generated ones, then authored ones seen before.
 */
export function buildConceptSession({ conceptId, count = 8 } = {}) {
  const concept = conceptRepository.getById(conceptId);
  if (!concept) return null;
  const attempted = attemptedQuestionIds();
  const authored = shuffle(questionRepository.getByConcept(conceptId));
  const questions = authored.filter((q) => !attempted.has(q.id)).slice(0, count);
  if (questions.length < count && conceptHasTemplates(conceptId)) {
    const avoidText = new Set(questions.map(questionKey));
    questions.push(...generateQuestions({ conceptIds: [conceptId], count: count - questions.length, avoidText }));
  }
  for (const q of authored) {
    if (questions.length >= count) break;
    if (!questions.includes(q)) questions.push(q);
  }
  if (!questions.length) return null;

  const topic = topicRepository.getById(concept.topicId);
  return createSession({
    questions,
    mode: 'practice',
    title: concept.name,
    subtitle: topic ? `${topic.name} · one concept` : 'One concept',
    source: { type: 'concept', topicId: concept.topicId, conceptId },
    returnTo: `/topics/${concept.topicId}`
  });
}

/* ------------------------- mistakes ------------------------- */

export function buildMistakesSession({ topicId = null, count = 10 } = {}) {
  const records = getAllQuestionRecords();
  const wrongIds = Object.values(records)
    .filter((r) => r.timesWrong > 0 && !r.resolved)
    .sort((a, b) => b.timesWrong - a.timesWrong)
    .map((r) => r.questionId);

  let questions = questionRepository.getByIds(wrongIds);
  if (topicId) questions = questions.filter((q) => q.topicId === topicId);
  questions = questions.slice(0, count);
  if (!questions.length) return null;

  return createSession({
    questions,
    mode: 'revision',
    title: 'Retry My Mistakes',
    subtitle: 'Questions you have previously answered incorrectly',
    source: { type: 'mistakes', topicId },
    returnTo: '/mistakes'
  });
}

/* ------------------------- daily mission ------------------------- */

/** Deterministic per calendar day, so the mission does not reshuffle on reload. */
export function buildDailyChallenge({ count = 8 } = {}) {
  const seed = hashString(new Date().toDateString());
  const playableTopics = topicRepository
    .getPlayable()
    .filter((t) => questionRepository.getByTopic(t.id).length > 0);
  // query() returns a randomly shuffled pool, so sort first to give the seeded
  // shuffle a stable input.
  const pool = questionRepository
    .query({
      topicIds: playableTopics.map((t) => t.id),
      difficulties: ['easy', 'medium', 'complex']
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  const questions = shuffle(pool, seed).slice(0, count);
  if (!questions.length) return null;

  return createSession({
    questions,
    mode: 'challenge',
    title: "Today's Challenge",
    subtitle: 'A mixed set, refreshed every day',
    // `day` marks the shared challenge (the same questions for everyone today),
    // so friends can compare; the personal daily mission has no `day`.
    source: { type: 'daily', day: dayKey() },
    returnTo: '/dashboard'
  });
}

/* ------------------------- session presets ------------------------- */

export function getSessionPreset(presetId) {
  return SESSION_PRESETS.find((p) => p.id === presetId) || SESSION_PRESETS[2];
}

/**
 * Plan a preset session: how many formula cards are due, which questions are
 * weak-area vs new. Returned as a plan so the dashboard can describe it before
 * the learner commits.
 */
export function planSession(presetId = 'daily-mission', { topicId = null } = {}) {
  const preset = getSessionPreset(presetId);
  const formulaQueue = getDueFormulas({ topicId, limit: preset.formulaCount });
  const weak = getWeakConcepts({ topicId, limit: 6 });
  const attempted = attemptedQuestionIds();
  const unseenCount = questionRepository.getUnseenQuestions({ topicId, attemptedIds: attempted })
    .length;

  const weakShare = weak.length ? Math.ceil(preset.questionCount * 0.5) : 0;
  const newShare = Math.min(
    unseenCount,
    preset.questionCount - weakShare - Math.floor(preset.questionCount * 0.2)
  );
  const challengeShare = Math.max(0, preset.questionCount - weakShare - Math.max(0, newShare));

  const dueCount = formulaQueue.filter((entry) => entry.state?.reviewCount).length;
  const newCount = formulaQueue.length - dueCount;
  const formulaLabel =
    dueCount && newCount
      ? `Review ${formulaQueue.length} formulas (${dueCount} due, ${newCount} new)`
      : dueCount
        ? `Revise ${dueCount} due formula${dueCount === 1 ? '' : 's'}`
        : `Learn ${newCount} new formula${newCount === 1 ? '' : 's'}`;

  return {
    preset,
    topicId,
    formulaCount: formulaQueue.length,
    questionCount: preset.questionCount,
    parts: [
      formulaQueue.length && {
        icon: 'cards',
        label: formulaLabel,
        count: formulaQueue.length
      },
      weakShare && {
        icon: 'target',
        label: `${weakShare} weak-area question${weakShare === 1 ? '' : 's'}`,
        count: weakShare
      },
      newShare > 0 && {
        icon: 'sparkles',
        label: `${newShare} new question${newShare === 1 ? '' : 's'}`,
        count: newShare
      },
      challengeShare && {
        icon: 'brain',
        label: `${challengeShare} challenge question${challengeShare === 1 ? '' : 's'}`,
        count: challengeShare
      }
    ].filter(Boolean)
  };
}

export function buildPresetSession(presetId = 'daily-mission', { topicId = null } = {}) {
  const preset = getSessionPreset(presetId);
  const questions = selectSmartQuestions({ count: preset.questionCount, topicId });
  if (!questions.length) return null;
  const formulaCards = getDueFormulas({ topicId, limit: preset.formulaCount }).map((d) => d.item);

  return createSession({
    questions,
    mode: 'smart',
    title: preset.name,
    subtitle: `${preset.minutes}-minute session`,
    source: { type: presetId === 'daily-mission' ? 'daily' : 'session', topicId, presetId },
    formulaCards,
    returnTo: '/dashboard'
  });
}

/* ------------------------- exam mode ------------------------- */

export function buildExamSession({ topicIds = null, count = 15, secondsPerQuestion = null } = {}) {
  const pool = questionRepository.query({
    topicIds: topicIds || topicRepository.getPlayable().map((t) => t.id)
  });
  const questions = shuffle(pool).slice(0, count);
  if (!questions.length) return null;
  const session = createSession({
    questions,
    mode: 'exam',
    title: 'Exam Simulation',
    source: { type: 'exam', topicIds },
    timerSecondsPerQuestion: secondsPerQuestion,
    returnTo: '/practice'
  });
  session.subtitle = `${questions.length} questions · ${session.timerSecondsPerQuestion}s each`;
  return session;
}

/* ------------------------- formula revision ------------------------- */

/** Formula cards due for review, most overdue first. */
export function getDueFormulas({ topicId = null, limit = null } = {}) {
  const formulas = topicId ? formulaRepository.getByTopic(topicId) : formulaRepository.getAll();
  const reviews = getAllFormulaReviews();
  const { due, fresh } = buildReviewQueue(formulas, reviews);
  const queue = due.concat(fresh);
  return limit ? queue.slice(0, limit) : queue;
}

/**
 * Cards for a revision run.
 * @param {'browse'|'recall'|'recognition'|'application'|'weak'} mode
 * @param {'formula'|'shortcut'|null} kind  only cards of this kind; null for both
 */
export function buildFormulaQueue({ topicId = null, mode = 'recall', limit = 20, kind = null } = {}) {
  const formulas = topicId ? formulaRepository.getByTopic(topicId, kind) : formulaRepository.getAll(kind);
  const reviews = getAllFormulaReviews();

  if (mode === 'browse') return formulas.slice(0, limit);

  if (mode === 'weak') {
    const weak = formulas
      .map((formula) => ({ formula, state: reviews[formula.id] }))
      .filter(({ state }) => state && (state.status === 'struggling' || state.confidence < 60))
      .sort((a, b) => (a.state.confidence || 0) - (b.state.confidence || 0))
      .map(({ formula }) => formula);
    return weak.slice(0, limit);
  }

  const { due, fresh, upcoming } = buildReviewQueue(formulas, reviews);
  const ordered = due
    .map((d) => d.item)
    .concat(fresh.map((f) => f.item))
    .concat(upcoming.map((u) => u.item));
  return ordered.slice(0, limit);
}

export function getFormulaStats({ topicId = null, kind = null } = {}) {
  const formulas = topicId ? formulaRepository.getByTopic(topicId, kind) : formulaRepository.getAll(kind);
  const reviews = getAllFormulaReviews();
  const { due, fresh, upcoming } = buildReviewQueue(formulas, reviews);
  const retained = formulas.filter((f) => reviews[f.id]?.status === 'retained').length;
  return {
    total: formulas.length,
    due: due.length,
    new: fresh.length,
    upcoming: upcoming.length,
    retained,
    retentionPercent: formulas.length ? Math.round((retained / formulas.length) * 100) : 0
  };
}

/* ------------------------- continue where you left off ------------------------- */

export function getContinueTarget() {
  const progress = getUserProgress();

  // Prefer topics the learner is actually working through level by level.
  // Answering a stray question in a mixed session should not redirect them.
  const lastLevelActivity = new Map();
  for (const state of Object.values(progress.levels)) {
    const at = new Date(state.lastAttemptAt || 0).getTime();
    if (at > (lastLevelActivity.get(state.topicId) || 0)) lastLevelActivity.set(state.topicId, at);
  }
  const byLevelActivity = Array.from(lastLevelActivity.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topicId]) => ({ topicId }));
  const byVisit = Object.values(progress.topics)
    .filter((t) => t.lastVisitedAt && !lastLevelActivity.has(t.topicId))
    .sort((a, b) => new Date(b.lastVisitedAt) - new Date(a.lastVisitedAt));
  const topicStates = byLevelActivity.concat(byVisit);

  for (const state of topicStates) {
    const topic = topicRepository.getById(state.topicId);
    if (!topic) continue;
    const levels = levelRepository.getByTopic(state.topicId);
    if (!levels.length) continue;
    const next =
      levels.find((l) => progress.levels[l.id]?.status === 'in_progress') ||
      levels.find((l) => {
        const done = progress.levels[l.id]?.status === 'completed';
        const unlocked = (l.prerequisiteLevelIds || []).every(
          (id) => progress.levels[id]?.status === 'completed'
        );
        return !done && unlocked;
      });
    if (next) return { topic, level: next };
  }

  // Nothing started yet — point at the reference topic if it exists.
  const fallbackTopic =
    topicRepository.getById('percentages') || topicRepository.getPlayable()[0] || null;
  if (!fallbackTopic) return null;
  const levels = levelRepository.getByTopic(fallbackTopic.id);
  return levels.length ? { topic: fallbackTopic, level: levels[0] } : null;
}

export function getTopicIdsWithContent() {
  return uniq(topicRepository.getPlayable().map((t) => t.id));
}
