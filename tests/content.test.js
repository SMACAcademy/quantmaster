/**
 * Checks on the hand-written questions that a careful reader would make: no
 * choice question offers the right answer twice in a different form.
 * (Added after the step 8 answer audit, where this was the commonest slip.)
 */

import { describe, it, expect } from 'vitest';

import { questionRepository } from '../src/repositories/contentRepository.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** "25 : 10" → "5:2"; anything that is not a plain ratio → null. */
function ratioKey(text) {
  const m = /^\s*(\d+)\s*:\s*(\d+)\s*$/.exec(text);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const g = gcd(a, b) || 1;
  return `${a / g}:${b / g}`;
}

/** "₹1,200", "1200", "1,200 m" → 1200; anything else → null. */
function numberKey(text) {
  const m = /^\s*[₹$]?\s*(-?[\d,]*\.?\d+)\s*([a-zA-Z%°/² ]*)$/.exec(text);
  return m ? `${Number(m[1].replace(/,/g, ''))}${m[2].trim()}` : null;
}

describe('hand-written choice questions', () => {
  const choice = questionRepository.getAll().filter((q) => Array.isArray(q.options) && q.options.length > 1);

  it('never list the same ratio twice in different forms', () => {
    const clashes = [];
    for (const q of choice) {
      // Asking for the simplest form makes an unsimplified option a fair distractor.
      if (/simplest form|lowest terms/i.test(q.question)) continue;
      const keys = q.options.map((o) => ratioKey(o.text)).filter(Boolean);
      if (new Set(keys).size !== keys.length) clashes.push(q.id);
    }
    expect(clashes).toEqual([]);
  });

  it('never list the same number twice in different forms', () => {
    const clashes = [];
    for (const q of choice) {
      const keys = q.options.map((o) => numberKey(o.text)).filter(Boolean);
      if (new Set(keys).size !== keys.length) clashes.push(q.id);
    }
    expect(clashes).toEqual([]);
  });

  it('have exactly one keyed answer that is one of the options', () => {
    const bad = choice.filter((q) => q.type !== 'multiple_choice' && (q.correctAnswer?.length !== 1 || !q.options.some((o) => o.id === q.correctAnswer[0])));
    expect(bad.map((q) => q.id)).toEqual([]);
  });
});
