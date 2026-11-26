/**
 * Which "Try this" challenges this device has finished, per simulation. Kept
 * on the device only (never synced) and light enough for pages that merely
 * list simulations.
 */

import { readJSON, writeJSON } from '../utils/storage.js';

const SOLVED_KEY = 'quantmaster:v1:explore-solved';

const readAll = () => readJSON(SOLVED_KEY, {}) || {};

/** Add newly solved challenges; returns everything solved for that simulation. */
export function rememberSolved(simulationId, taskIds) {
  const all = readAll();
  const before = new Set(all[simulationId] || []);
  const merged = new Set([...before, ...taskIds]);
  if (merged.size !== before.size) {
    all[simulationId] = [...merged];
    writeJSON(SOLVED_KEY, all);
  }
  return merged;
}

/** How many of a simulation's current challenges are finished. */
export function solvedCount(simulationId, taskIds) {
  const solved = new Set(readAll()[simulationId] || []);
  return taskIds.filter((id) => solved.has(id)).length;
}
