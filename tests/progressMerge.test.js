/** Merging an imported export with this device's progress (repositories/progressMerge.js). */

import { describe, it, expect, beforeEach } from 'vitest';

import { mergeAttempts, mergeProgress } from '../src/repositories/progressMerge.js';
import { exportProgress, getAttempts, getUserProgress, importProgress, resetProgress, saveAttempt, saveProgress } from '../src/repositories/progressRepository.js';
import { getRank } from '../src/services/gamification.js';

const day = (n) => `2026-11-${String(n).padStart(2, '0')}`;
const iso = (n, h = 12) => `${day(n)}T${String(h).padStart(2, '0')}:00:00.000Z`;

/** The same data with object keys in a fixed order, so equal data compares equal. */
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
  return value;
};

/** A shared starting point, then what each device did on its own. */
function twoDevices() {
  const base = {
    schemaVersion: 3,
    createdAt: iso(1),
    updatedAt: iso(5),
    lastActivityAt: iso(5),
    xp: { total: 150, byDay: { [day(4)]: 30, [day(5)]: 20 } }, // 100 from before daily records
    rankId: 'beginner',
    streak: {
      current: 2,
      longest: 6,
      lastPracticeDay: day(5),
      days: {
        [day(4)]: { questions: 5, correct: 4, formulas: 0, lessons: 0, xp: 30, sessions: 1 },
        [day(5)]: { questions: 3, correct: 3, formulas: 0, lessons: 0, xp: 20, sessions: 1 }
      },
      freezes: 1,
      frozenDays: [],
      lost: null
    },
    stats: { questionsAnswered: 8, correctAnswers: 7, sessionsCompleted: 2 },
    topics: { percentages: { topicId: 'percentages', startedAt: iso(4), lastVisitedAt: iso(5), questionsAnswered: 8, correctAnswers: 7, currentLevelId: 'pct-1', completedLevels: 0 } },
    levels: { 'pct-1': { status: 'in_progress', attempts: 1, bestAccuracy: 60, questionsAnswered: 8, completedAt: null, lastAttemptAt: iso(5) } },
    concepts: { 'pct-basic': { attempts: 8, correctAttempts: 7, lastAttemptedAt: iso(5), masteryScore: 50 } },
    formulas: {},
    questions: { 'q-shared': { attempts: 1, timesWrong: 1, lastAttemptAt: iso(5), resolved: false } },
    achievements: { 'first-steps': { unlockedAt: iso(4) } },
    sessionLog: [{ id: 's2', at: iso(5) }, { id: 's1', at: iso(4) }]
  };
  const phone = JSON.parse(JSON.stringify(base));
  phone.updatedAt = iso(6, 9);
  phone.xp = { total: 175, byDay: { ...base.xp.byDay, [day(6)]: 25 } };
  phone.streak = { ...phone.streak, current: 3, lastPracticeDay: day(6), days: { ...phone.streak.days, [day(6)]: { questions: 4, correct: 4, formulas: 0, lessons: 0, xp: 25, sessions: 1 } } };
  phone.stats.questionsAnswered = 12;
  phone.levels['pct-1'] = { ...phone.levels['pct-1'], status: 'completed', attempts: 2, bestAccuracy: 90, completedAt: iso(6, 9), lastAttemptAt: iso(6, 9) };
  phone.concepts['pct-basic'] = { attempts: 12, correctAttempts: 11, lastAttemptedAt: iso(6, 9), masteryScore: 72 };
  phone.achievements.streak3 = { unlockedAt: iso(6, 9) };
  phone.sessionLog.unshift({ id: 's3', at: iso(6, 9) });
  phone.questions['q-phone'] = { attempts: 1, timesWrong: 0, lastAttemptAt: iso(6, 9), resolved: true };
  // The phone fixed the shared mistake.
  phone.questions['q-shared'] = { attempts: 2, timesWrong: 1, lastAttemptAt: iso(6, 9), resolved: true };

  const laptop = JSON.parse(JSON.stringify(base));
  laptop.updatedAt = iso(6, 20);
  laptop.xp = { total: 160, byDay: { ...base.xp.byDay, [day(6)]: 10 } };
  laptop.streak.days[day(6)] = { questions: 0, correct: 0, formulas: 3, lessons: 0, xp: 10, sessions: 0 };
  laptop.formulas['pct-f'] = { lastReviewedAt: iso(6, 20), reviewCount: 1, nextReviewAt: iso(7) };
  laptop.topics.ratio = { topicId: 'ratio', startedAt: iso(6, 20), lastVisitedAt: iso(6, 20), questionsAnswered: 0, correctAnswers: 0, currentLevelId: 'rp-1', completedLevels: 0 };
  laptop.sessionLog.unshift({ id: 's4', at: iso(6, 20) });
  laptop.questions['q-laptop'] = { attempts: 1, timesWrong: 1, lastAttemptAt: iso(6, 20), resolved: false };
  return { phone, laptop };
}

describe('merging progress', () => {
  it('keeps everything either device earned, and counts the shared part once', () => {
    const { phone, laptop } = twoDevices();
    const merged = mergeProgress(phone, laptop, { now: iso(7), rankFor: (xp) => (xp >= 170 ? 'learner' : 'beginner') });
    expect(merged.xp.byDay[day(6)]).toBe(25); // same day on both: the larger, never the sum
    expect(merged.xp.total).toBe(175);
    expect(merged.rankId).toBe('learner');
    expect(merged.stats.questionsAnswered).toBe(12);
    expect(merged.levels['pct-1']).toMatchObject({ status: 'completed', attempts: 2, bestAccuracy: 90, completedAt: iso(6, 9) });
    expect(merged.concepts['pct-basic'].masteryScore).toBe(72); // the newer record, whole
    expect(merged.formulas['pct-f'].reviewCount).toBe(1); // only the laptop reviewed it
    expect(Object.keys(merged.topics).sort()).toEqual(['percentages', 'ratio']);
    expect(Object.keys(merged.achievements).sort()).toEqual(['first-steps', 'streak3']);
    expect(merged.sessionLog.map((s) => s.id)).toEqual(['s4', 's3', 's2', 's1']);
    expect(merged.streak).toMatchObject({ current: 3, lastPracticeDay: day(6), longest: 6 });
    expect(merged.streak.days[day(6)]).toMatchObject({ questions: 4, formulas: 3, xp: 25 });
    expect(merged.updatedAt).toBe(iso(7));
    expect(merged.createdAt).toBe(iso(1));
  });

  it('keeps every question\'s history, the latest copy of each', () => {
    const { phone, laptop } = twoDevices();
    const merged = mergeProgress(laptop, phone, { now: iso(7) });
    expect(Object.keys(merged.questions).sort()).toEqual(['q-laptop', 'q-phone', 'q-shared']);
    expect(merged.questions['q-shared']).toMatchObject({ attempts: 2, resolved: true }); // fixed on the phone, later
    expect(merged.questions['q-laptop'].resolved).toBe(false); // still a mistake to review
  });

  it('gives the same result whichever device imports, and merging again changes nothing', () => {
    const { phone, laptop } = twoDevices();
    const opts = { now: iso(7) };
    const one = mergeProgress(phone, laptop, opts);
    const two = mergeProgress(laptop, phone, opts);
    const content = ({ rankId: _r, ...rest }) => stable(rest);
    expect(content(one)).toEqual(content(two));
    expect(stable(mergeProgress(one, laptop, opts))).toEqual(stable(one));
    expect(stable(mergeProgress(one, one, opts))).toEqual(stable(one));
  });

  it('keeps XP earned before daily records existed', () => {
    const { phone, laptop } = twoDevices();
    laptop.xp = { total: 400, byDay: {} }; // an old save: total only
    expect(mergeProgress(phone, laptop).xp.total).toBe(400 + 75);
  });

  it('caps the session log at 60, newest first', () => {
    const { phone, laptop } = twoDevices();
    phone.sessionLog = Array.from({ length: 50 }, (_, i) => ({ id: `p${i}`, at: new Date(Date.UTC(2026, 10, 1, i)).toISOString() }));
    laptop.sessionLog = Array.from({ length: 50 }, (_, i) => ({ id: `l${i}`, at: new Date(Date.UTC(2026, 10, 3, i)).toISOString() }));
    const log = mergeProgress(phone, laptop).sessionLog;
    expect(log).toHaveLength(60);
    expect(log[0].id).toBe('l49');
  });
});

describe('merging the answer log', () => {
  const answer = (id, n, questionId = 'q1') => ({ id, questionId, at: iso(n), correct: true });

  it('keeps each answer once, oldest first', () => {
    const merged = mergeAttempts([answer('a', 2), answer('b', 4)], [answer('b', 4), answer('c', 3)]);
    expect(merged.map((a) => a.id)).toEqual(['a', 'c', 'b']);
  });

  it('matches answers without an id by question and time, and drops junk', () => {
    const merged = mergeAttempts([{ questionId: 'q1', at: iso(2) }, null], [{ questionId: 'q1', at: iso(2) }, 'x']);
    expect(merged).toHaveLength(1);
  });

  it('keeps only the newest answers past the limit', () => {
    const many = Array.from({ length: 10 }, (_, i) => answer(`a${i}`, i + 1));
    expect(mergeAttempts(many.slice(0, 6), many.slice(4), 5).map((a) => a.id)).toEqual(['a5', 'a6', 'a7', 'a8', 'a9']);
  });
});

describe('importing an export', () => {
  beforeEach(() => resetProgress());

  /** An export as another device would write it, with progress and answers of its own. */
  function fileFromAnotherDevice() {
    const { laptop } = twoDevices();
    return {
      app: 'quantmaster',
      schemaVersion: 3,
      exportedAt: iso(6, 21),
      progress: laptop,
      attempts: [{ id: 'other-1', questionId: 'q-laptop', at: iso(6, 20), correct: false }]
    };
  }

  it('merges by request: this device keeps its own progress and gains the file\'s', () => {
    const { phone } = twoDevices();
    saveProgress(phone);
    saveAttempt({ id: 'mine-1', questionId: 'q-phone', at: iso(6, 9), correct: true });
    const merged = importProgress(fileFromAnotherDevice(), { mode: 'merge', rankFor: (xp) => getRank(xp).id });
    expect(merged.xp.total).toBe(175);
    expect(Object.keys(merged.questions).sort()).toEqual(['q-laptop', 'q-phone', 'q-shared']);
    expect(merged.formulas['pct-f']).toBeTruthy();
    expect(getUserProgress().xp.total).toBe(175);
    const ids = getAttempts().map((a) => a.id);
    expect(ids).toContain('other-1');
    expect(ids).toContain('mine-1');
  });

  it('replaces by request, and still rejects a file that is not an export', () => {
    const { phone } = twoDevices();
    saveProgress(phone);
    const replaced = importProgress(fileFromAnotherDevice(), { mode: 'replace' });
    expect(replaced.xp.total).toBe(160);
    expect(replaced.questions['q-phone']).toBeUndefined();
    expect(getAttempts().map((a) => a.id)).toEqual(['other-1']);
    expect(() => importProgress({ app: 'something-else', progress: {} }, { mode: 'merge' })).toThrow(/QuantMaster export/);
  });

  it('round-trips: exporting, then merging the file back in, changes nothing that matters', () => {
    const { phone } = twoDevices();
    saveProgress(phone);
    // Normalise first (an import brings old saves up to the current format), then compare like with like.
    importProgress(exportProgress(), { mode: 'replace' });
    const before = stable({ ...getUserProgress(), updatedAt: null });
    importProgress(exportProgress(), { mode: 'merge', rankFor: (xp) => getRank(xp).id });
    const after = stable({ ...getUserProgress(), updatedAt: null, rankId: before.rankId });
    expect(after).toEqual(before);
  });
});
