/**
 * The rules of a speed drill, kept free of the DOM: reading what was typed,
 * marking it, choosing questions, and keeping each table's best score on the
 * device (it is not synced).
 */

import { readJSON, writeJSON } from '../utils/storage.js';

export const DRILL_SECONDS = 60;
const BEST_KEY = 'quantmaster:v1:drill-best';

/**
 * A typed answer as a number, or null. Accepts "289", "1,024", "33.33",
 * "33 1/3", "1/8", "≈ 7.69", "12.5%".
 */
export function parseAnswer(text) {
  const clean = String(text ?? '')
    .replace(/[≈%\s]+$/g, '')
    .replace(/^[≈~\s]+/, '')
    .replace(/,/g, '')
    .replace(/−/g, '-')
    .trim();
  if (!clean) return null;
  const mixed = /^(-?\d+)\s+(\d+)\/(\d+)$/.exec(clean);
  if (mixed) {
    const whole = Number(mixed[1]);
    const part = Number(mixed[2]) / Number(mixed[3]);
    return Number(mixed[3]) ? whole + Math.sign(whole || 1) * part : null;
  }
  const fraction = /^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(clean);
  if (fraction) return Number(fraction[2]) ? Number(fraction[1]) / Number(fraction[2]) : null;
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(clean)) return null;
  return Number(clean);
}

/** Is this response right for the item? `response` is typed text, or the chosen option. */
export function isCorrect(item, response) {
  if (item.answer.type === 'choice') return response === item.answer.correct;
  const value = parseAnswer(response);
  return value !== null && Math.abs(value - item.answer.value) <= item.answer.tolerance + 1e-9;
}

/**
 * An endless supply of questions: the whole list shuffled, then reshuffled
 * when it runs out, never repeating the question just asked.
 */
export function questionStream(items, random = Math.random) {
  let deck = [];
  let last = null;
  const refill = () => {
    deck = items.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    if (deck.length > 1 && deck[deck.length - 1] === last) [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
  };
  return () => {
    if (!deck.length) refill();
    last = deck.pop();
    return last;
  };
}

const readBest = () => readJSON(BEST_KEY, {}) || {};

/** Best result so far for a table: { correct, attempted, at } or null. */
export function bestScore(tableId) {
  return readBest()[tableId] || null;
}

/** Keep a finished drill if it beats the best. Returns true when it is a new best. */
export function recordDrill(tableId, { correct, attempted }) {
  const all = readBest();
  const best = all[tableId];
  const better = !best || correct > best.correct || (correct === best.correct && attempted < best.attempted);
  if (better && correct > 0) {
    all[tableId] = { correct, attempted, at: new Date().toISOString() };
    writeJSON(BEST_KEY, all);
    return true;
  }
  return false;
}
