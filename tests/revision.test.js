/**
 * Formula and shortcut cards: the two kinds, the revision queue's kind filter and
 * the read-only quick sheets.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { cardKind, formulaRepository, levelRepository, ofKind, topicRepository } from '../src/repositories/contentRepository.js';
import { resetProgress } from '../src/repositories/progressRepository.js';
import { buildFormulaQueue, getFormulaStats } from '../src/services/sessionBuilder.js';
import { buildSheet, sheetPath } from '../src/views/QuickSheetView.js';

beforeEach(() => {
  resetProgress();
});

describe('card kinds', () => {
  it('treats a card as a formula unless it says shortcut', () => {
    expect(cardKind({})).toBe('formula');
    expect(cardKind({ kind: 'formula' })).toBe('formula');
    expect(cardKind({ kind: 'shortcut' })).toBe('shortcut');
    const cards = [{ id: 'a' }, { id: 'b', kind: 'shortcut' }];
    expect(ofKind(cards, 'formula').map((c) => c.id)).toEqual(['a']);
    expect(ofKind(cards, 'shortcut').map((c) => c.id)).toEqual(['b']);
    expect(ofKind(cards, null)).toHaveLength(2);
  });

  it('splits the cards into formulas and shortcuts with nothing lost', () => {
    const all = formulaRepository.getAll();
    const formulas = formulaRepository.getAll('formula');
    const shortcuts = formulaRepository.getAll('shortcut');
    expect(formulas.length + shortcuts.length).toBe(all.length);
    expect(shortcuts.length).toBeGreaterThan(150);
    // Every topic has at least one shortcut.
    for (const topic of topicRepository.getAll()) expect(formulaRepository.getByTopic(topic.id, 'shortcut').length, topic.id).toBeGreaterThan(0);
    expect(formulaRepository.getByTopic('percentages', 'shortcut').map((c) => c.id)).toContain('pct-successive');
    expect(formulaRepository.getByTopic('percentages', 'formula').map((c) => c.id)).not.toContain('pct-successive');
  });

  it('gives every shortcut a worked example and a common mistake, which the sheet shows', () => {
    for (const card of formulaRepository.getAll('shortcut')) {
      expect(card.example, card.id).toBeTruthy();
      expect(card.commonMistake, card.id).toBeTruthy();
      expect(card.prompt, card.id).toBeTruthy();
    }
  });

  it('leaves every formula-revision level with the cards it names', () => {
    for (const level of levelRepository.getAll().filter((l) => l.type === 'formula_revision')) {
      expect(formulaRepository.getByIds(level.formulaIds), level.id).toHaveLength(level.formulaIds.length);
    }
  });

  it('offers lookalikes of the same kind first', () => {
    const shortcut = formulaRepository.getById('sp-sc-times-11');
    const distractors = formulaRepository.getDistractors(shortcut, 3);
    expect(distractors).toHaveLength(3);
    expect(distractors.every((card) => cardKind(card) === 'shortcut')).toBe(true);
  });
});

describe('revision queue by kind', () => {
  it('filters every mode to one kind', () => {
    for (const mode of ['recall', 'browse', 'recognition', 'application']) {
      const shortcuts = buildFormulaQueue({ mode, kind: 'shortcut', limit: 5000 });
      const formulas = buildFormulaQueue({ mode, kind: 'formula', limit: 5000 });
      expect(shortcuts.length).toBeGreaterThan(0);
      expect(shortcuts.every((card) => cardKind(card) === 'shortcut')).toBe(true);
      expect(formulas.every((card) => cardKind(card) === 'formula')).toBe(true);
      expect(buildFormulaQueue({ mode, limit: 5000 })).toHaveLength(shortcuts.length + formulas.length);
    }
  });

  it('counts each kind separately', () => {
    const all = getFormulaStats();
    const formulas = getFormulaStats({ kind: 'formula' });
    const shortcuts = getFormulaStats({ kind: 'shortcut' });
    expect(formulas.total + shortcuts.total).toBe(all.total);
    expect(getFormulaStats({ topicId: 'simplification', kind: 'shortcut' }).total).toBe(
      formulaRepository.getByTopic('simplification', 'shortcut').length
    );
  });
});

describe('quick sheets', () => {
  it('lists every card of the kind once, grouped by topic in catalogue order', () => {
    for (const kind of ['formula', 'shortcut']) {
      const sections = buildSheet({ kind });
      const ids = sections.flatMap((section) => section.cards.map((card) => card.id));
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.sort()).toEqual(formulaRepository.getAll(kind).map((card) => card.id).sort());
      expect(sections.every((section) => section.cards.length > 0)).toBe(true);
      const order = topicRepository.getAll().map((topic) => topic.id);
      const shown = sections.map((section) => section.topic.id);
      expect(shown).toEqual(order.filter((id) => shown.includes(id)));
    }
  });

  it('has a formula section for every topic', () => {
    expect(buildSheet({ kind: 'formula' })).toHaveLength(topicRepository.getAll().length);
  });

  it('narrows to a topic, a category, or the topics studied', () => {
    expect(buildSheet({ kind: 'shortcut', topicId: 'averages' }).map((s) => s.topic.id)).toEqual(['averages']);
    const algebra = buildSheet({ kind: 'formula', scope: 'algebra' });
    expect(algebra.length).toBeGreaterThan(0);
    expect(algebra.every((section) => section.topic.category === 'algebra')).toBe(true);
    const mine = buildSheet({ kind: 'formula', scope: 'mine', studied: new Set(['trains', 'clocks']) });
    expect(mine.map((s) => s.topic.id).sort()).toEqual(['clocks', 'trains']);
    expect(buildSheet({ kind: 'formula', scope: 'mine' })).toEqual([]);
  });

  it('keeps what a sheet shows in its address', () => {
    expect(sheetPath()).toBe('/sheet?kind=formula');
    expect(sheetPath({ kind: 'shortcut', scope: 'mine', detail: false })).toBe('/sheet?kind=shortcut&scope=mine&detail=0');
    expect(sheetPath({ kind: 'shortcut', topicId: 'averages', scope: 'mine', detail: true })).toBe('/sheet/averages?kind=shortcut&detail=1');
  });
});
