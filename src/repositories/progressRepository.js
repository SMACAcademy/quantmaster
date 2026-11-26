/**
 * The only module that reads or writes learner progress.
 *
 * Swapping this for an API/database implementation later means keeping the same
 * exported functions — no engine or view changes.
 */

import { STORAGE_KEYS, SCHEMA_VERSION, STREAK_RULES } from '../app/config.js';
import { readJSON, writeJSON, removeKey, isPersistent } from '../utils/storage.js';
import { emit, EVENTS } from '../app/eventBus.js';
import { dayKey } from '../utils/format.js';
import { mergeAttempts, mergeProgress } from './progressMerge.js';

const MAX_ATTEMPTS_STORED = 1500;
const MAX_SESSION_LOG = 60;

function emptyProgress() {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    xp: { total: 0, byDay: {} },
    rankId: 'beginner',
    streak: {
      current: 0,
      longest: 0,
      lastPracticeDay: null,
      days: {},
      freezes: STREAK_RULES.startingFreezes,
      frozenDays: [],
      lost: null
    },
    stats: {
      questionsAnswered: 0,
      correctAnswers: 0,
      hintsUsed: 0,
      totalTimeSeconds: 0,
      sessionsCompleted: 0,
      formulasReviewed: 0,
      formulaRecallCorrect: 0,
      mistakesCorrected: 0,
      conceptLessonsCompleted: 0,
      timedChallengesCompleted: 0,
      levelsCompleted: 0,
      longestSessionQuestions: 0,
      independentAfterGuided: 0,
      perfectSessionBest: 0
    },
    topics: {},
    levels: {},
    concepts: {},
    formulas: {},
    questions: {},
    achievements: {},
    sessionLog: [],
    lastActivityAt: null
  };
}

function migrate(stored) {
  if (!stored || typeof stored !== 'object') return emptyProgress();
  const base = emptyProgress();
  // Shallow-merge known sections so older saves gain new fields with defaults.
  return {
    ...base,
    ...stored,
    schemaVersion: SCHEMA_VERSION,
    xp: { ...base.xp, ...(stored.xp || {}) },
    streak: { ...base.streak, ...(stored.streak || {}) },
    stats: { ...base.stats, ...(stored.stats || {}) },
    topics: stored.topics || {},
    levels: stored.levels || {},
    concepts: stored.concepts || {},
    formulas: stored.formulas || {},
    questions: stored.questions || {},
    achievements: stored.achievements || {},
    sessionLog: Array.isArray(stored.sessionLog) ? stored.sessionLog : []
  };
}

let cached = null;

export function getUserProgress() {
  if (!cached) cached = migrate(readJSON(STORAGE_KEYS.progress, null));
  return cached;
}

export function saveProgress(progress) {
  progress.updatedAt = new Date().toISOString();
  cached = progress;
  writeJSON(STORAGE_KEYS.progress, progress);
  emit(EVENTS.progressChanged, progress);
  return progress;
}

/**
 * Read-modify-write helper. The mutator receives a live draft it can mutate
 * directly; whatever it returns is ignored.
 */
export function update(mutator) {
  const progress = getUserProgress();
  mutator(progress);
  return saveProgress(progress);
}

/* ------------------------- per-entity accessors ------------------------- */

export function getTopicProgress(topicId) {
  return getUserProgress().topics[topicId] || null;
}

export function getLevelProgress(levelId) {
  return getUserProgress().levels[levelId] || null;
}

export function getConceptProgress(conceptId) {
  return getUserProgress().concepts[conceptId] || null;
}

export function getAllConceptProgress() {
  return getUserProgress().concepts;
}

export function getFormulaReview(formulaId) {
  return getUserProgress().formulas[formulaId] || null;
}

export function getAllFormulaReviews() {
  return getUserProgress().formulas;
}

export function getQuestionRecord(questionId) {
  return getUserProgress().questions[questionId] || null;
}

export function getAllQuestionRecords() {
  return getUserProgress().questions;
}

export function getAchievements() {
  return getUserProgress().achievements;
}

export function getSessionLog() {
  return getUserProgress().sessionLog;
}

export function appendSessionLog(entry) {
  return update((progress) => {
    progress.sessionLog.unshift(entry);
    if (progress.sessionLog.length > MAX_SESSION_LOG) {
      progress.sessionLog.length = MAX_SESSION_LOG;
    }
    progress.lastActivityAt = entry.at;
  });
}

/* ------------------------- attempts ------------------------- */

export function getAttempts() {
  return readJSON(STORAGE_KEYS.attempts, []);
}

export function saveAttempt(attempt) {
  const attempts = getAttempts();
  attempts.push(attempt);
  if (attempts.length > MAX_ATTEMPTS_STORED) {
    attempts.splice(0, attempts.length - MAX_ATTEMPTS_STORED);
  }
  writeJSON(STORAGE_KEYS.attempts, attempts);
  return attempt;
}

export function saveAttempts(newAttempts) {
  if (!newAttempts.length) return;
  const attempts = getAttempts().concat(newAttempts);
  if (attempts.length > MAX_ATTEMPTS_STORED) {
    attempts.splice(0, attempts.length - MAX_ATTEMPTS_STORED);
  }
  writeJSON(STORAGE_KEYS.attempts, attempts);
}

export function getAttemptsInRange(fromDate, toDate = new Date()) {
  const from = new Date(fromDate).getTime();
  const to = new Date(toDate).getTime();
  return getAttempts().filter((a) => {
    const t = new Date(a.at).getTime();
    return t >= from && t <= to;
  });
}

export function getAttemptsByDay(days = 7) {
  const attempts = getAttempts();
  const buckets = new Map();
  for (const attempt of attempts) {
    const key = dayKey(new Date(attempt.at));
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(attempt);
  }
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    out.push({ day: key, date: d, attempts: buckets.get(key) || [] });
  }
  return out;
}

/* ------------------------- lifecycle ------------------------- */

export function resetProgress() {
  cached = emptyProgress();
  removeKey(STORAGE_KEYS.attempts);
  writeJSON(STORAGE_KEYS.progress, cached);
  emit(EVENTS.progressChanged, cached);
  return cached;
}

export function exportProgress() {
  return {
    app: 'quantmaster',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    progress: getUserProgress(),
    attempts: getAttempts()
  };
}

/** Throws unless `payload` is a QuantMaster export (what `exportProgress` writes). */
export function checkExport(payload) {
  if (!payload || payload.app !== 'quantmaster' || !payload.progress || typeof payload.progress !== 'object') {
    throw new Error('This file does not look like a QuantMaster export.');
  }
  return payload;
}

/**
 * Load an export. `mode: 'merge'` combines it with this device's progress and
 * answer log, so nothing earned on either device is lost (see progressMerge.js;
 * `rankFor(totalXp)` gives the rank for the merged XP). `mode: 'replace'`
 * swaps this device's progress for the file's.
 */
export function importProgress(payload, { mode = 'replace', rankFor = null } = {}) {
  checkExport(payload);
  const incoming = migrate(payload.progress);
  const incomingAttempts = Array.isArray(payload.attempts) ? payload.attempts : [];
  if (mode === 'merge') {
    cached = migrate(mergeProgress(getUserProgress(), incoming, { rankFor }));
    writeJSON(STORAGE_KEYS.attempts, mergeAttempts(getAttempts(), incomingAttempts, MAX_ATTEMPTS_STORED));
  } else {
    cached = incoming;
    writeJSON(STORAGE_KEYS.attempts, incomingAttempts.slice(-MAX_ATTEMPTS_STORED));
  }
  writeJSON(STORAGE_KEYS.progress, cached);
  emit(EVENTS.progressChanged, cached);
  return cached;
}

export function storageIsPersistent() {
  return isPersistent();
}
