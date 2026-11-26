/** Formatting + date helpers. All dates are handled in the user's local timezone. */

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function round(value, decimals = 0) {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function pct(part, whole, decimals = 0) {
  if (!whole) return 0;
  return round((part / whole) * 100, decimals);
}

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat().format(value);
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** 95 -> "1m 35s", 40 -> "40s" */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** mm:ss for timers */
export function formatClock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Local calendar day key, e.g. "2026-09-16". */
export function dayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(date, days) {
  const d = new Date(date instanceof Date ? date.getTime() : new Date(date).getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/** Whole calendar days between two dates (b - a). */
export function daysBetween(a, b) {
  const start = new Date(dayKey(a)).getTime();
  const end = new Date(dayKey(b)).getTime();
  return Math.round((end - start) / 86400000);
}

export function isSameDay(a, b) {
  return dayKey(a) === dayKey(b);
}

export function relativeTime(isoString) {
  if (!isoString) return 'never';
  const then = new Date(isoString);
  if (Number.isNaN(then.getTime())) return 'never';
  const diffMs = Date.now() - then.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = daysBetween(then, new Date());
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function dueLabel(isoString) {
  if (!isoString) return 'due now';
  const days = daysBetween(new Date(), new Date(isoString));
  if (days <= 0) return 'due now';
  if (days === 1) return 'due tomorrow';
  if (days < 7) return `due in ${days} days`;
  if (days < 30) return `due in ${Math.round(days / 7)}w`;
  return `due in ${Math.round(days / 30)}mo`;
}

export function titleCase(text) {
  return String(text)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Deterministic shuffle when a seed is supplied; random otherwise. */
export function shuffle(array, seed) {
  const arr = [...array];
  let rand = Math.random;
  if (typeof seed === 'number') {
    let s = seed >>> 0 || 1;
    rand = () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sum(values) {
  return values.reduce((acc, v) => acc + (Number(v) || 0), 0);
}

export function average(values) {
  if (!values.length) return 0;
  return sum(values) / values.length;
}

export function uniq(values) {
  return Array.from(new Set(values));
}

export function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

/** Stable numeric hash of a string — used for deterministic daily picks. */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
