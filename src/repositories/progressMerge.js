/**
 * Merging two copies of one learner's progress: this device's and an imported
 * export from another device. Pure: no storage, no DOM, no clock unless given.
 *
 * The two copies often share a past (the file was exported from a device that
 * had itself imported from this one), and nothing records which part is
 * shared. So:
 *   - counters (XP per day, statistics, attempts at a level, best accuracy) take
 *     the larger value: the shared part is never counted twice, and nothing
 *     earned on either device is lost;
 *   - records that only make sense whole (a concept's mastery, a formula's
 *     review schedule, a question's history) come from whichever copy touched
 *     them last;
 *   - sets (achievements, practice days, sessions, the answer log) are joined.
 * The merge gives the same result whichever copy is "this device", and merging
 * the result again changes nothing.
 */

const MAX_SESSION_LOG = 60;
const LEVEL_STATUS_RANK = { not_started: 0, available: 1, in_progress: 2, completed: 3 };

const time = (value) => (value ? new Date(value).getTime() || 0 : 0);
const later = (a, b) => (time(b) > time(a) ? b : a) ?? null;
const earlier = (a, b) => {
  if (!a) return b ?? null;
  if (!b) return a;
  return time(b) < time(a) ? b : a;
};
const keysOf = (...objects) => [...new Set(objects.flatMap((o) => Object.keys(o || {})))];

/** Field by field: numbers take the larger value; anything else comes from `prefer`. */
function maxFields(a = {}, b = {}, prefer = a) {
  const out = {};
  for (const key of keysOf(a, b)) {
    const x = a[key];
    const y = b[key];
    if (typeof x === 'number' && typeof y === 'number') out[key] = Math.max(x, y);
    else if (x === undefined) out[key] = y;
    else if (y === undefined) out[key] = x;
    else out[key] = prefer === a ? x : y;
  }
  return out;
}

/** Per key: the whole record from the copy whose `stamp` is later (ties: more `tieBreak`, then this device). */
function newestRecords(a = {}, b = {}, stamp, tieBreak) {
  const out = {};
  for (const key of keysOf(a, b)) {
    const x = a[key];
    const y = b[key];
    if (!x || !y) {
      out[key] = x || y;
      continue;
    }
    const dx = time(x[stamp]);
    const dy = time(y[stamp]);
    if (dx !== dy) out[key] = dy > dx ? y : x;
    else out[key] = (y[tieBreak] || 0) > (x[tieBreak] || 0) ? y : x;
  }
  return out;
}

function mergeXp(a = {}, b = {}) {
  const byDay = maxFields(a.byDay, b.byDay);
  const sum = (days) => Object.values(days || {}).reduce((total, n) => total + (Number(n) || 0), 0);
  // XP from before daily records were kept is the part of `total` not in `byDay`.
  const untracked = Math.max((a.total || 0) - sum(a.byDay), (b.total || 0) - sum(b.byDay), 0);
  return { total: untracked + sum(byDay), byDay };
}

function mergeStreak(a = {}, b = {}) {
  // The copy that practised more recently knows the current run, freezes and repair state.
  const recent = (b.lastPracticeDay || '') > (a.lastPracticeDay || '') ? b : a;
  const days = {};
  for (const key of keysOf(a.days, b.days)) days[key] = maxFields(a.days?.[key], b.days?.[key]);
  const frozenDays = [...new Set([...(a.frozenDays || []), ...(b.frozenDays || [])])].sort().slice(-60);
  const sameDay = a.lastPracticeDay === b.lastPracticeDay;
  return {
    ...a,
    ...b,
    current: sameDay ? Math.max(a.current || 0, b.current || 0) : recent.current || 0,
    longest: Math.max(a.longest || 0, b.longest || 0, recent.current || 0),
    lastPracticeDay: recent.lastPracticeDay ?? null,
    days,
    freezes: sameDay ? Math.min(a.freezes ?? 0, b.freezes ?? 0) : recent.freezes ?? 0,
    frozenDays,
    lost: recent.lost ?? null
  };
}

function mergeTopics(a = {}, b = {}) {
  const out = {};
  for (const key of keysOf(a, b)) {
    const x = a[key];
    const y = b[key];
    if (!x || !y) {
      out[key] = x || y;
      continue;
    }
    const recent = time(y.lastVisitedAt) > time(x.lastVisitedAt) ? y : x;
    out[key] = {
      ...maxFields(x, y, recent),
      startedAt: earlier(x.startedAt, y.startedAt),
      lastVisitedAt: later(x.lastVisitedAt, y.lastVisitedAt),
      currentLevelId: recent.currentLevelId ?? x.currentLevelId ?? y.currentLevelId ?? null
    };
  }
  return out;
}

function mergeLevels(a = {}, b = {}) {
  const out = {};
  for (const key of keysOf(a, b)) {
    const x = a[key];
    const y = b[key];
    if (!x || !y) {
      out[key] = x || y;
      continue;
    }
    const status = (LEVEL_STATUS_RANK[y.status] ?? 0) > (LEVEL_STATUS_RANK[x.status] ?? 0) ? y.status : x.status;
    out[key] = {
      ...maxFields(x, y),
      status,
      completedAt: earlier(x.completedAt, y.completedAt),
      lastAttemptAt: later(x.lastAttemptAt, y.lastAttemptAt)
    };
  }
  return out;
}

function mergeAchievements(a = {}, b = {}) {
  const out = {};
  for (const key of keysOf(a, b)) {
    const x = a[key];
    const y = b[key];
    out[key] = !x || !y ? x || y : { ...x, ...y, unlockedAt: earlier(x.unlockedAt, y.unlockedAt) };
  }
  return out;
}

function mergeSessionLog(a = [], b = []) {
  const byId = new Map();
  for (const entry of [...a, ...b]) {
    const key = entry.id ?? `${entry.at}|${entry.title}`;
    if (!byId.has(key)) byId.set(key, entry);
  }
  return [...byId.values()].sort((x, y) => time(y.at) - time(x.at)).slice(0, MAX_SESSION_LOG);
}

/**
 * One copy of the learner's progress that keeps everything from both.
 * `updatedAt` is `now`; `rankFor(totalXp)` gives the rank id for the merged XP.
 */
export function mergeProgress(device, imported, { now = new Date().toISOString(), rankFor = null } = {}) {
  const xp = mergeXp(device.xp, imported.xp);
  return {
    ...imported,
    ...device,
    schemaVersion: Math.max(device.schemaVersion || 0, imported.schemaVersion || 0) || device.schemaVersion,
    createdAt: earlier(device.createdAt, imported.createdAt),
    updatedAt: now,
    lastActivityAt: later(device.lastActivityAt, imported.lastActivityAt),
    xp,
    rankId: rankFor ? rankFor(xp.total) : device.rankId,
    streak: mergeStreak(device.streak, imported.streak),
    stats: maxFields(device.stats, imported.stats),
    topics: mergeTopics(device.topics, imported.topics),
    levels: mergeLevels(device.levels, imported.levels),
    concepts: newestRecords(device.concepts, imported.concepts, 'lastAttemptedAt', 'attempts'),
    formulas: newestRecords(device.formulas, imported.formulas, 'lastReviewedAt', 'reviewCount'),
    // A question's history (attempts, last result, whether a mistake is resolved) from the copy that saw it last.
    questions: newestRecords(device.questions, imported.questions, 'lastAttemptAt', 'attempts'),
    achievements: mergeAchievements(device.achievements, imported.achievements),
    sessionLog: mergeSessionLog(device.sessionLog, imported.sessionLog)
  };
}

/**
 * The answer logs of both copies, each answer once (by id, or by question and
 * time for any without one), oldest first, keeping the newest `limit`.
 */
export function mergeAttempts(device = [], imported = [], limit = 1500) {
  const byKey = new Map();
  for (const attempt of [...device, ...imported]) {
    if (!attempt || typeof attempt !== 'object') continue;
    const key = attempt.id ?? `${attempt.questionId}|${attempt.at}`;
    if (!byKey.has(key)) byKey.set(key, attempt);
  }
  const all = [...byKey.values()].sort((x, y) => time(x.at) - time(y.at));
  return all.length > limit ? all.slice(all.length - limit) : all;
}
