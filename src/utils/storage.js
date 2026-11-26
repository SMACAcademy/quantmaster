/**
 * localStorage wrapper that degrades to an in-memory store when storage is
 * unavailable (private mode, blocked cookies, quota exceeded). The app keeps
 * working for the session; only cross-session persistence is lost.
 */

const memory = new Map();
let available = null;
let warned = false;

function storageAvailable() {
  if (available !== null) return available;
  try {
    const probe = '__qm_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    available = true;
  } catch (_) {
    available = false;
  }
  return available;
}

export function isPersistent() {
  return storageAvailable();
}

function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    '[storage] localStorage unavailable — progress will only last for this browser session.'
  );
}

export function readJSON(key, fallback = null) {
  try {
    const raw = storageAvailable() ? window.localStorage.getItem(key) : memory.get(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[storage] failed to read "${key}"`, error);
    return fallback;
  }
}

export function writeJSON(key, value) {
  const raw = JSON.stringify(value);
  if (!storageAvailable()) {
    warnOnce();
    memory.set(key, raw);
    return false;
  }
  try {
    window.localStorage.setItem(key, raw);
    return true;
  } catch (error) {
    console.error(`[storage] failed to write "${key}" — falling back to memory`, error);
    memory.set(key, raw);
    return false;
  }
}

export function removeKey(key) {
  memory.delete(key);
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`[storage] failed to remove "${key}"`, error);
  }
}
