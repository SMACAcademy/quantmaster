/**
 * XP, streaks, ranks and achievements.
 *
 * Rewards are attached to learning actions (recall, correction, completion) and
 * never to raw activity like swiping through cards, so the incentives point at
 * retention rather than time spent.
 */

import { RANKS, STREAK_MILESTONES, STREAK_RULES, XP } from '../app/config.js';
import { addDays, clamp, dayKey, daysBetween } from '../utils/format.js';
import { emit, EVENTS } from '../app/eventBus.js';
import { achievementRepository, topicRepository } from '../repositories/contentRepository.js';
import { update, getUserProgress } from '../repositories/progressRepository.js';
import { getTopicMastery } from './masteryEngine.js';

/* ------------------------------- XP ------------------------------- */

/** XP for one answered question, with a modest hint discount. */
export function xpForAnswer({ correct, hintsUsed = 0, wasPreviouslyWrong = false, retry = false }) {
  if (!correct) return XP.incorrect;
  if (wasPreviouslyWrong) return XP.correctPreviouslyMissed;
  if (retry) return XP.correctAfterRetry;
  if (hintsUsed === 0) return XP.correctFirstTry;
  const factor = Math.max(XP.hintPenaltyFloor, 1 - hintsUsed * XP.hintPenaltyPerHint);
  return Math.max(1, Math.round(XP.correctWithHints * factor));
}

export function awardXp(progress, amount, reason = '') {
  if (!amount) return 0;
  const today = dayKey();
  progress.xp.total += amount;
  progress.xp.byDay[today] = (progress.xp.byDay[today] || 0) + amount;

  const previousRank = progress.rankId;
  const rank = getRank(progress.xp.total);
  progress.rankId = rank.id;

  emit(EVENTS.xpAwarded, { amount, reason, total: progress.xp.total });
  if (rank.id !== previousRank) {
    emit(EVENTS.rankUp, { rank, previousRankId: previousRank });
  }
  return amount;
}

export function getRank(totalXp) {
  let rank = RANKS[0];
  for (const entry of RANKS) {
    if (totalXp >= entry.minXp) rank = entry;
  }
  return rank;
}

export function getRankProgress(totalXp) {
  const rank = getRank(totalXp);
  const index = RANKS.findIndex((r) => r.id === rank.id);
  const next = RANKS[index + 1] || null;
  if (!next) return { rank, next: null, percent: 100, xpToNext: 0 };
  const span = next.minXp - rank.minXp;
  const done = totalXp - rank.minXp;
  return {
    rank,
    next,
    percent: clamp(Math.round((done / span) * 100), 0, 100),
    xpToNext: next.minXp - totalXp
  };
}

/* ------------------------------ streaks ------------------------------ */

export function emptyDayRecord() {
  return { questions: 0, correct: 0, formulas: 0, lessons: 0, xp: 0, sessions: 0 };
}

export function getDayRecord(progress, key = dayKey()) {
  return progress.streak.days[key] || emptyDayRecord();
}

export function dayQualifies(record) {
  return (
    record.questions >= STREAK_RULES.minQuestions ||
    record.formulas >= STREAK_RULES.minFormulaReviews ||
    record.lessons >= STREAK_RULES.minConceptLessons
  );
}

/** A day key ("2026-09-26") as a local date, so adding days never slips across time zones. */
function fromDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Older saves may predate freezes and repairs. */
function ensureStreakFields(streak) {
  if (typeof streak.freezes !== 'number') streak.freezes = STREAK_RULES.startingFreezes;
  if (!Array.isArray(streak.frozenDays)) streak.frozenDays = [];
  if (streak.lost === undefined) streak.lost = null;
  return streak;
}

/**
 * Record activity for today and recompute the streak.
 *
 * On the first qualifying activity of a day, days missed since the last practice
 * day are covered by streak freezes if there are enough (one freeze per day);
 * otherwise the streak restarts at 1 and, if it was long enough, is remembered as
 * `lost` so it can be repaired. Any activity can complete a repair: answering
 * `repairQuestions` in one day within `repairWindowDays` of coming back.
 *
 * Returns `{ extended, current, qualifiedToday, record, usedFreezes, earnedFreeze, repaired }`.
 */
export function recordActivity(progress, delta = {}) {
  const today = dayKey();
  const streak = ensureStreakFields(progress.streak);
  const record = { ...emptyDayRecord(), ...(streak.days[today] || {}) };
  for (const [key, value] of Object.entries(delta)) {
    record[key] = (record[key] || 0) + value;
  }
  streak.days[today] = record;

  const qualifiedToday = dayQualifies(record);
  const alreadyCounted = streak.lastPracticeDay === today;
  let extended = false;
  let usedFreezes = 0;
  let earnedFreeze = false;
  let repaired = false;

  if (qualifiedToday && !alreadyCounted) {
    const last = streak.lastPracticeDay;
    const missed = last ? daysBetween(fromDayKey(last), fromDayKey(today)) - 1 : null;
    if (missed === null) {
      streak.current = 1;
    } else if (missed <= 0) {
      streak.current += 1;
    } else if (missed <= streak.freezes) {
      // Freezes keep the streak alive through the missed days; they do not add to it.
      usedFreezes = missed;
      streak.freezes -= missed;
      for (let i = 1; i <= missed; i++) streak.frozenDays.push(dayKey(addDays(fromDayKey(last), i)));
      streak.frozenDays = streak.frozenDays.slice(-60);
      streak.current += 1;
    } else {
      streak.lost = streak.current >= STREAK_RULES.repairMinLength ? { length: streak.current, returnedOn: today } : null;
      streak.current = 1;
    }
    if (streak.current % STREAK_RULES.freezeEveryDays === 0 && streak.freezes < STREAK_RULES.maxFreezes) {
      streak.freezes += 1;
      earnedFreeze = true;
    }
    streak.lastPracticeDay = today;
    streak.longest = Math.max(streak.longest, streak.current);
    extended = true;
    awardXp(progress, XP.streakDay, 'Daily practice');
  }

  if (streak.lost) {
    if (daysBetween(fromDayKey(streak.lost.returnedOn), fromDayKey(today)) >= STREAK_RULES.repairWindowDays) {
      streak.lost = null;
    } else if (streak.lastPracticeDay === today && record.questions >= STREAK_RULES.repairQuestions) {
      // The days since coming back join onto the old streak.
      streak.current += streak.lost.length;
      streak.longest = Math.max(streak.longest, streak.current);
      streak.lost = null;
      repaired = true;
    }
  }

  if (extended || repaired) {
    emit(EVENTS.streakExtended, {
      current: streak.current,
      usedFreezes,
      earnedFreeze,
      freezes: streak.freezes,
      repaired,
      milestone: STREAK_MILESTONES.includes(streak.current) ? streak.current : null
    });
  }

  return { extended, current: streak.current, qualifiedToday, record, usedFreezes, earnedFreeze, repaired };
}

/** Streak status without mutating anything — used by the dashboard and the header. */
export function getStreakStatus(progress = getUserProgress()) {
  const today = dayKey();
  const streak = progress.streak;
  const freezes = typeof streak.freezes === 'number' ? streak.freezes : STREAK_RULES.startingFreezes;
  const last = streak.lastPracticeDay;
  const record = getDayRecord(progress, today);
  const activeToday = last === today;
  const missed = last && !activeToday ? daysBetween(fromDayKey(last), fromDayKey(today)) - 1 : 0;
  const broken = missed > freezes;
  // Missed days that the next practice will cover with freezes.
  const freezesNeeded = !broken && missed > 0 ? missed : 0;

  let repair = null;
  const lost = streak.lost;
  if (lost && daysBetween(fromDayKey(lost.returnedOn), fromDayKey(today)) < STREAK_RULES.repairWindowDays && !broken) {
    repair = {
      length: lost.length,
      questionsDone: record.questions,
      questionsNeeded: STREAK_RULES.repairQuestions,
      daysLeft: STREAK_RULES.repairWindowDays - daysBetween(fromDayKey(lost.returnedOn), fromDayKey(today))
    };
  } else if (broken && streak.current >= STREAK_RULES.repairMinLength) {
    // Not back yet: practising today will record the loss and open the repair.
    repair = {
      length: streak.current,
      questionsDone: record.questions,
      questionsNeeded: STREAK_RULES.repairQuestions,
      daysLeft: STREAK_RULES.repairWindowDays
    };
  }

  return {
    current: broken ? 0 : streak.current,
    longest: streak.longest,
    activeToday,
    // The streak ends tonight unless the learner practises (no freeze left to cover today).
    atRisk: Boolean(last) && !activeToday && !broken && missed + 1 > freezes,
    freezes,
    maxFreezes: STREAK_RULES.maxFreezes,
    freezesNeeded,
    repair,
    todayRecord: record,
    qualifiedToday: dayQualifies(record)
  };
}

export function getWeekActivity(progress = getUserProgress(), days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = dayKey(date);
    const record = progress.streak.days[key] || emptyDayRecord();
    out.push({
      date,
      key,
      record,
      active: dayQualifies(record),
      frozen: (progress.streak.frozenDays || []).includes(key),
      isToday: i === 0
    });
  }
  return out;
}

/* ---------------------------- achievements ---------------------------- */

function countPracticeDays(progress) {
  return Object.values(progress.streak.days).filter(dayQualifies).length;
}

function evaluate(criteria, progress, context) {
  const stats = progress.stats;
  switch (criteria.type) {
    case 'sessionsCompleted':
      return stats.sessionsCompleted >= criteria.threshold;
    case 'questionsAnswered':
      return stats.questionsAnswered >= criteria.threshold;
    case 'correctAnswers':
      return stats.correctAnswers >= criteria.threshold;
    case 'formulasReviewed':
      return stats.formulasReviewed >= criteria.threshold;
    case 'formulaRecallCorrect':
      return stats.formulaRecallCorrect >= criteria.threshold;
    case 'mistakesCorrected':
      return stats.mistakesCorrected >= criteria.threshold;
    case 'conceptLessonsCompleted':
      return stats.conceptLessonsCompleted >= criteria.threshold;
    case 'levelsCompleted':
      return stats.levelsCompleted >= criteria.threshold;
    case 'timedChallengesCompleted':
      return stats.timedChallengesCompleted >= criteria.threshold;
    case 'independentAfterGuided':
      return stats.independentAfterGuided >= criteria.threshold;
    case 'practiceDays':
      return countPracticeDays(progress) >= criteria.threshold;
    case 'streakDays':
      return progress.streak.current >= criteria.threshold;
    case 'topicsStarted':
      return Object.values(progress.topics).filter((t) => t.questionsAnswered > 0).length >=
        criteria.threshold;
    case 'topicMastery': {
      if (!topicRepository.getById(criteria.topicId)) return false;
      return getTopicMastery(criteria.topicId).score >= criteria.threshold;
    }
    case 'perfectSession':
      return Boolean(
        context?.session &&
          context.session.total >= criteria.threshold &&
          context.session.correct === context.session.total
      );
    case 'longSession':
      return Boolean(context?.session && context.session.total >= criteria.threshold);
    case 'comeback':
      return Boolean(context?.comebackDays && context.comebackDays >= criteria.threshold);
    default:
      return false;
  }
}

/**
 * Check every achievement and unlock any newly satisfied ones.
 * @returns {Array} newly unlocked achievement definitions
 */
export function checkAchievements(progress, context = {}) {
  const unlocked = [];
  for (const achievement of achievementRepository.getAll()) {
    if (progress.achievements[achievement.id]) continue;
    if (evaluate(achievement.criteria, progress, context)) {
      progress.achievements[achievement.id] = { unlockedAt: new Date().toISOString() };
      unlocked.push(achievement);
    }
  }
  for (const achievement of unlocked) {
    emit(EVENTS.achievementUnlocked, achievement);
  }
  return unlocked;
}

export function getUnlockedAchievements(progress = getUserProgress()) {
  return achievementRepository
    .getAll()
    .map((achievement) => ({
      ...achievement,
      unlockedAt: progress.achievements[achievement.id]?.unlockedAt || null
    }))
    .sort((a, b) => {
      if (Boolean(a.unlockedAt) !== Boolean(b.unlockedAt)) return a.unlockedAt ? -1 : 1;
      if (a.unlockedAt && b.unlockedAt) return new Date(b.unlockedAt) - new Date(a.unlockedAt);
      return 0;
    });
}

/** Convenience wrapper used by views that just need to log an activity. */
export function logActivity(delta, { xp = 0, reason = '' } = {}) {
  return update((progress) => {
    if (xp) awardXp(progress, xp, reason);
    recordActivity(progress, delta);
    checkAchievements(progress);
  });
}
