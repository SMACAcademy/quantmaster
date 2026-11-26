/**
 * The attempt in progress, and a short history of finished mock tests. The
 * history stays on this device (the newest 30 attempts); each answer still
 * counts towards mastery and mistakes through the learning engine.
 */

import { readJSON, writeJSON } from '../utils/storage.js';

const HISTORY_KEY = 'quantmaster:v1:mock-history';
const KEEP = 30;

let active = null;
let lastResult = null;

export const setActiveMock = (value) => {
  active = value;
};
export const getActiveMock = () => active;
export const setLastMockResult = (value) => {
  lastResult = value;
};
export const getLastMockResult = () => lastResult;

export function mockHistory(patternId = null) {
  const all = readJSON(HISTORY_KEY, []) || [];
  return patternId ? all.filter((entry) => entry.patternId === patternId) : all;
}

export function recordMock(entry) {
  const all = [entry, ...mockHistory()].slice(0, KEEP);
  writeJSON(HISTORY_KEY, all);
  return all;
}

/** Best score so far for a pattern, or null. */
export function bestMock(patternId) {
  const entries = mockHistory(patternId);
  return entries.length ? entries.reduce((best, e) => (e.score > best.score ? e : best)) : null;
}
