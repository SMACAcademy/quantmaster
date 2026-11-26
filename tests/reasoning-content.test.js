/**
 * Every hand-written logical-reasoning question, answered again by brute force.
 *
 * The structured version of each question set lives in
 * tests/fixtures/reasoningSets.js. For each question this test checks that:
 *   - the printed clues are exactly the fixture's clues (each clue sentence,
 *     generated from the fixture, appears in the question's text);
 *   - solving the fixture by trying every arrangement gives one answer, and
 *     that answer is the one the question marks as correct.
 */

import { describe, it, expect } from 'vitest';

import { questionRepository } from '../src/repositories/contentRepository.js';
import { clueText } from '../src/utils/reasoning/seating.js';
import { puzzleClueText } from '../src/utils/reasoning/puzzleText.js';
import { statementText as syllogismText } from '../src/utils/reasoning/syllogism.js';
import { statementText as familyText } from '../src/utils/reasoning/family.js';
import * as F from './fixtures/reasoningSets.js';

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

describe('seating arrangement', () => {
  for (const set of F.seatingSets) {
    it(`set ${set.id}: printed clues match and every answer is the only one`, () => {
      const solutions = F.solveSeating(set.puzzle);
      // The geometric reading of left and right finds the same arrangements.
      expect(F.solveSeatingGeometric(set.puzzle).map((a) => a.seats.join() + a.facing)).toEqual(solutions.map((a) => a.seats.join() + a.facing));
      for (const [id, answer] of Object.entries(set.questions)) {
        const q = question(id);
        expect(q.context.startsWith(set.intro), id).toBe(true);
        for (const clue of set.puzzle.clues) expect(q.context, id).toContain(clueText(set.puzzle, clue));
        const expected = answer(solutions);
        if (Array.isArray(expected)) expect(sameSet(keyed(q), expected), id).toBe(true);
        else expect(keyed(q), id).toBe(expected);
      }
    });
  }

  it('the left/right mirror rule', () => {
    expect(keyed(question(F.seatingRule.id))).toBe(F.seatingRule.answer());
  });
});

describe('puzzles', () => {
  for (const set of F.puzzleSets) {
    it(`set ${set.id}: printed clues match and every answer is the only one`, () => {
      const solutions = F.solvePuzzle(set.puzzle);
      expect(F.solvePuzzleByHolders(set.puzzle)).toHaveLength(solutions.length);
      for (const [id, answer] of Object.entries(set.questions)) {
        const q = question(id);
        expect(q.context.startsWith(set.intro), id).toBe(true);
        for (const clue of set.puzzle.clues) expect(q.context, id).toContain(puzzleClueText(set.puzzle, clue));
        const expected = answer(solutions);
        if (Array.isArray(expected)) expect(sameSet(keyed(q), expected), id).toBe(true);
        else expect(keyed(q), id).toBe(expected);
      }
    });
  }
});

describe('syllogism', () => {
  for (const set of F.syllogismSets) {
    it(`${set.id}: the keyed verdict is the one every Venn diagram gives`, () => {
      const q = question(set.id);
      for (const s of [...set.statements, ...set.conclusions]) expect(q.context).toContain(syllogismText(set.terms, s));
      expect(keyed(q)).toBe(F.syllogismAnswer(set));
    });
  }
  for (const set of F.syllogismPick) {
    it(`${set.id}: the keyed option${set.multiple ? 's are' : ' is'} exactly what follows`, () => {
      const q = question(set.id);
      for (const s of set.statements) expect(q.context).toContain(syllogismText(set.terms, s));
      expect(q.options.map((o) => o.text)).toEqual(set.options.map((o) => syllogismText(set.terms, o)));
      const good = F.syllogismFollowing(set).map((o) => syllogismText(set.terms, o));
      if (set.multiple) expect(sameSet(keyed(q), good)).toBe(true);
      else {
        expect(good).toHaveLength(1);
        expect(keyed(q)).toBe(good[0]);
      }
    });
  }
});

describe('reasoning inequalities', () => {
  for (const set of F.inequalitySets) {
    it(`${set.id}: the keyed verdict follows from the chain`, () => {
      const q = question(set.id);
      for (const s of set.statements) expect(q.context).toContain(s.join(' '));
      for (const c of set.conclusions) expect(q.context).toContain(`${c.x} ${c.op} ${c.y}`);
      expect(keyed(q)).toBe(F.inequalityAnswer(set));
    });
  }
  for (const set of F.missingSignSets) {
    it(`${set.id}: exactly one sign works, and it is the keyed one`, () => {
      const q = question(set.id);
      expect(q.context).toContain(set.expression.join(' '));
      const working = F.missingSignAnswer(set);
      expect(working).toHaveLength(1);
      expect(keyed(q)).toBe(working[0]);
    });
  }
  it(`${F.inequalityPick.id}: the selected conclusions are exactly the true ones`, () => {
    const q = question(F.inequalityPick.id);
    expect(sameSet(keyed(q), F.inequalityPickAnswer(F.inequalityPick))).toBe(true);
  });
  it(`${F.signPairQuestion.id}: only one pair of signs breaks the chain`, () => {
    const answer = F.signPairQuestion.answer();
    expect(answer).toHaveLength(1);
    expect(keyed(question(F.signPairQuestion.id))).toBe(answer[0]);
  });
});

describe('blood relations', () => {
  for (const set of F.bloodSets) {
    it(`${set.id}: the keyed relation is what the family gives`, () => {
      const q = question(set.id);
      if (set.coded) {
        // The printed expression decodes to the fixture's statements.
        expect(q.context).toContain(`Expression: ${set.coded}`);
        const tokens = set.coded.split(' ');
        const decoded = [];
        for (let i = 1; i < tokens.length; i += 2) decoded.push({ a: set.names.indexOf(tokens[i - 1]), rel: F.BLOOD_CODE[tokens[i]], b: set.names.indexOf(tokens[i + 1]) });
        expect(decoded).toEqual(set.statements);
      } else if (!set.deduced) {
        for (const s of set.statements) expect(q.context).toContain(familyText(set.names, s));
      }
      expect(q.question).toContain(set.names[set.ask[0]].replace(/^the /, ''));
      expect(keyed(q)).toBe(F.bloodAnswer(set));
    });
  }
  it(`${F.bloodGenderPick.id}: the selected people are exactly those whose gender is fixed`, () => {
    const q = question(F.bloodGenderPick.id);
    for (const s of F.bloodGenderPick.statements) expect(q.context).toContain(familyText(F.bloodGenderPick.names, s));
    expect(sameSet(keyed(q), F.bloodGenderPick.answer())).toBe(true);
  });
  for (const set of F.bloodGenerations) {
    it(`${set.id}: the generation count`, () => {
      const q = question(set.id);
      for (const s of set.statements) expect(q.context).toContain(familyText(set.names, s));
      expect(keyed(q)).toBe(set.answer());
    });
  }
});

describe('coverage', () => {
  it('checks every hand-written reasoning question', () => {
    const checked = new Set([
      ...F.seatingSets.flatMap((s) => Object.keys(s.questions)),
      F.seatingRule.id,
      ...F.puzzleSets.flatMap((s) => Object.keys(s.questions)),
      ...F.syllogismSets.map((s) => s.id),
      ...F.syllogismPick.map((s) => s.id),
      ...F.inequalitySets.map((s) => s.id),
      ...F.missingSignSets.map((s) => s.id),
      F.inequalityPick.id,
      F.signPairQuestion.id,
      ...F.bloodSets.map((s) => s.id),
      F.bloodGenderPick.id,
      ...F.bloodGenerations.map((s) => s.id)
    ]);
    const reasoning = ['seating-arrangement', 'puzzles', 'syllogism', 'reasoning-inequalities', 'blood-relations'];
    for (const topic of reasoning) {
      const ids = questionRepository.getByTopic(topic).map((q) => q.id);
      expect(ids.length, topic).toBeGreaterThanOrEqual(20);
      expect(ids.filter((id) => !checked.has(id)), topic).toEqual([]);
    }
  });
});
