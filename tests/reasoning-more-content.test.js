/**
 * Every hand-written question of the second reasoning batch, answered again.
 *
 * The structured version of each question lives in
 * tests/fixtures/reasoningMoreSets.js. For each question this test checks that
 *   - the phrases built from the structure appear, in order, in the printed
 *     context and question (so the text says what is being solved);
 *   - any figure the question needs is there and matches the structure;
 *   - the answer worked out by brute force or exact computation is the keyed one.
 */

import { describe, it, expect } from 'vitest';

import { questionRepository } from '../src/repositories/contentRepository.js';
import { ALL_SETS } from './fixtures/reasoningMoreSets.js';

const question = (id) => {
  const q = questionRepository.getById(id);
  if (!q) throw new Error(`no question ${id}`);
  return q;
};

/** The keyed answer as text: an option's text, a list of texts, or the number. */
function keyed(q) {
  if (q.type === 'numerical_input') return q.answer.value;
  const texts = q.correctAnswer.map((id) => q.options.find((o) => o.id === id).text);
  return q.type === 'multiple_choice' ? texts : texts[0];
}

const sameSet = (a, b) => [...a].sort().join('|') === [...b].sort().join('|');

/** Every phrase appears, each after the one before it. */
function inOrder(text, phrases) {
  let at = 0;
  for (const phrase of phrases) {
    const i = text.indexOf(phrase, at);
    if (i === -1) return phrase;
    at = i + phrase.length;
  }
  return null;
}

for (const [topic, sets] of Object.entries(ALL_SETS)) {
  describe(topic, () => {
    for (const set of sets) {
      it(`${set.id}: the printed question is the one solved, and the keyed answer is the only one`, () => {
        const q = question(set.id);
        const full = `${q.context || ''}\n${q.question}`;
        expect(inOrder(full, set.texts), `${set.id}: phrase not found in order`).toBeNull();
        if (set.figure) {
          expect(q.figure?.type, set.id).toBe(set.figure.type);
          for (const [key, value] of Object.entries(set.figure)) expect(q.figure[key], `${set.id} figure ${key}`).toEqual(value);
        }
        const expected = set.answer();
        if (Array.isArray(expected)) {
          expect(q.type, set.id).toBe('multiple_choice');
          expect(sameSet(keyed(q), expected), `${set.id}: keyed ${keyed(q)} but solved ${expected}`).toBe(true);
        } else {
          expect(keyed(q), set.id).toBe(expected);
        }
      });
    }

    it('checks every hand-written question of the topic', () => {
      const ids = questionRepository.getByTopic(topic).map((q) => q.id);
      expect(ids.length).toBeGreaterThanOrEqual(20);
      const checked = new Set(sets.map((s) => s.id));
      expect(ids.filter((id) => !checked.has(id))).toEqual([]);
    });
  });
}
