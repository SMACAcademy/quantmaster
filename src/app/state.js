/**
 * App-level state: user settings plus transient session state.
 * Durable learning progress lives in repositories, not here.
 */

import { DEFAULT_SETTINGS, STORAGE_KEYS } from './config.js';
import { readJSON, writeJSON } from '../utils/storage.js';

function createStore(initial) {
  let value = initial;
  const subscribers = new Set();

  return {
    get: () => value,
    set(patch) {
      const next = typeof patch === 'function' ? patch(value) : { ...value, ...patch };
      if (next === value) return value;
      const prev = value;
      value = next;
      for (const fn of Array.from(subscribers)) {
        try {
          fn(value, prev);
        } catch (error) {
          console.error('[state] subscriber failed', error);
        }
      }
      return value;
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    }
  };
}

export const settingsStore = createStore({
  ...DEFAULT_SETTINGS,
  ...readJSON(STORAGE_KEYS.settings, {})
});

settingsStore.subscribe((settings) => {
  writeJSON(STORAGE_KEYS.settings, settings);
  applyTheme(settings.theme);
  applyMotion(settings.motion);
  applyKeyboardHints(settings.showKeyboardHints);
});

export function applyKeyboardHints(show) {
  document.documentElement.dataset.keyhints = show === false ? 'off' : 'on';
}

export function getSettings() {
  return settingsStore.get();
}

export function updateSettings(patch) {
  return settingsStore.set(patch);
}

/** Transient per-visit state: the in-flight quiz/revision session and its result. */
export const sessionStore = createStore({
  activeSession: null,
  lastResult: null,
  lastRevisionSummary: null
});

export function setActiveSession(session) {
  sessionStore.set({ activeSession: session });
  return session;
}

export function getActiveSession() {
  return sessionStore.get().activeSession;
}

export function clearActiveSession() {
  sessionStore.set({ activeSession: null });
}

export function setLastResult(result) {
  sessionStore.set({ lastResult: result, activeSession: null });
}

export function getLastResult() {
  return sessionStore.get().lastResult;
}

/* ------------------------- theme / motion ------------------------- */

let themeMedia = null;

export function applyTheme(preference) {
  const root = document.documentElement;
  const resolve = () => {
    if (preference === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return preference === 'light' ? 'light' : 'dark';
  };
  root.dataset.theme = resolve();

  if (themeMedia) {
    themeMedia.onchange = null;
    themeMedia = null;
  }
  if (preference === 'system') {
    themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    themeMedia.onchange = () => {
      root.dataset.theme = resolve();
    };
  }
}

export function applyMotion(level) {
  document.documentElement.dataset.motion = level === 'reduced' ? 'reduced' : 'full';
}

export function prefersReducedMotion() {
  return (
    getSettings().motion === 'reduced' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
