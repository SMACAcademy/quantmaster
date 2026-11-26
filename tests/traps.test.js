/** The traps and exam-strategy sheets. */

import { describe, it, expect } from 'vitest';

import { STRATEGIES } from '../src/data/strategies.js';
import { buildSheet, sheetPath } from '../src/views/QuickSheetView.js';
import { formulaRepository, topicRepository } from '../src/repositories/contentRepository.js';

describe('exam strategy cards', () => {
  it('each has a rule, an example that checks out, and a warning', () => {
    const ids = STRATEGIES.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(STRATEGIES.length).toBeGreaterThanOrEqual(10);
    for (const card of STRATEGIES) {
      for (const field of ['title', 'rule', 'example', 'whenNot']) expect(card[field], `${card.id}.${field}`).toBeTruthy();
      expect(card.check(), card.id).toBe(true);
    }
  });
});

describe('the traps sheet', () => {
  it('lists every card\'s common mistake exactly once, grouped by topic', () => {
    const sections = buildSheet({ kind: 'traps' });
    const ids = sections.flatMap((section) => section.cards.map((card) => card.id));
    expect(new Set(ids).size).toBe(ids.length);
    const withMistakes = formulaRepository.getAll().filter((card) => card.commonMistake);
    expect(ids.sort()).toEqual(withMistakes.map((card) => card.id).sort());
    expect(sections).toHaveLength(topicRepository.getAll().length);
  });

  it('narrows by category like the other sheets', () => {
    const geometry = buildSheet({ kind: 'traps', scope: 'geometry' });
    expect(geometry.length).toBeGreaterThan(0);
    expect(geometry.every((section) => section.topic.category === 'geometry')).toBe(true);
  });

  it('has its own address', () => {
    expect(sheetPath({ kind: 'traps', topicId: 'trains' })).toBe('/sheet/trains?kind=traps');
    expect(sheetPath({ kind: 'strategy' })).toBe('/sheet?kind=strategy');
  });
});
