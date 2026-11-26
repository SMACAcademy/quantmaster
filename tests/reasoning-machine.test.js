/**
 * Input-output machines (src/utils/reasoning/machine.js), the templates built
 * on them and the conveyor simulation. The machine is held to textbook steps
 * and to a second, independently written method (lines written directly from
 * the order of picks; steps counted without moving anything; later steps by
 * brute force over every input; arithmetic undone by search). Generated
 * questions are checked for a single right option.
 */

import { describe, it, expect } from 'vitest';

import { createRng } from '../src/generators/core.js';
import { getTemplate } from '../src/generators/index.js';
import { buildInstance } from '../src/generators/engine.js';
import {
  RULES,
  RULE_IDS,
  affineAfter,
  arithmeticInput,
  arithmeticLines,
  cleanRun,
  consistentRules,
  continueFrom,
  inputsForStep,
  lineText,
  linesByFormula,
  runMachine,
  stepMFromStepKBrute,
  stepsByCounting
} from '../src/utils/reasoning/machine.js';
import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';

const L = (s) => s.split(' ');
const texts = (lines) => lines.map(lineText);
const WORDS = ['aloo', 'banyan', 'chai', 'dhol', 'eagle', 'fort', 'ganga', 'henna', 'idli', 'jowar', 'kite', 'lotus'];
const ONE_MOVE_LEFT = ['words-az-left', 'words-za-left', 'nums-up-left', 'nums-down-left'];

function randomInput(rng, maxWords = 5, maxNumbers = 5) {
  const words = rng.shuffle(WORDS).slice(0, rng.int(0, maxWords));
  const numbers = new Set();
  const want = rng.int(words.length ? 0 : 1, maxNumbers);
  while (numbers.size < want) numbers.add(String(rng.int(10, 99)));
  return rng.shuffle([...words, ...numbers]);
}

describe('the machine', () => {
  it('runs the textbook example: one word per step, the rest keep their order', () => {
    expect(texts(runMachine(L('rasam laddu samosa idli kheer jalebi'), 'words-az-left').lines)).toEqual([
      'rasam laddu samosa idli kheer jalebi',
      'idli rasam laddu samosa kheer jalebi',
      'idli jalebi rasam laddu samosa kheer',
      'idli jalebi kheer rasam laddu samosa',
      'idli jalebi kheer laddu rasam samosa'
    ]);
    // A word and a number in every step, from the two ends.
    expect(texts(runMachine(L('48 kurta 91 saree 27 dhoti 65 lungi'), 'word-left-num-right').lines).at(-1)).toBe('dhoti kurta lungi saree 27 48 65 91');
    // Words and numbers taking turns need about twice as many steps.
    expect(runMachine(L('63 agra 45 pune 72 surat 18 kochi'), 'word-num-alternate').lines).toHaveLength(7);
    // A rotation comes back after n steps.
    const turned = runMachine(L('a b c d e'), 'rotate-right', { steps: 5 }).lines;
    expect(lineText(turned[5])).toBe('a b c d e');
    expect(lineText(turned[1])).toBe('e a b c d');
  });

  it('does not count a step in which nothing changes', () => {
    // arjun and drona are already in place when their turns come.
    const { lines, moved } = runMachine(L('arjun drona bhima nakul karna kunti sahadev vidura'), 'words-az-left');
    expect(moved.slice(1)).toEqual([['bhima'], ['karna'], ['kunti']]);
    expect(lines).toHaveLength(4);
    expect(cleanRun(L('arjun drona bhima nakul karna kunti sahadev vidura'), 'words-az-left')).toBe(false);
    expect(cleanRun(L('rasam laddu samosa idli kheer jalebi'), 'words-az-left')).toBe(true);
    // A rule with nothing to pick shows only the input.
    expect(runMachine(L('kite fort mango'), 'nums-up-left').lines).toHaveLength(1);
  });

  it('gives the same lines by moving elements and by writing each line directly, for every rule', () => {
    const rng = createRng(11);
    for (let t = 0; t < 600; t++) {
      const input = randomInput(rng);
      for (const id of RULE_IDS) {
        expect(texts(linesByFormula(input, id)), `${id} ${lineText(input)}`).toEqual(texts(runMachine(input, id).lines));
      }
    }
  });

  it('counts the steps of a one-move machine without running it', () => {
    const rng = createRng(12);
    for (let t = 0; t < 800; t++) {
      const input = randomInput(rng, 7, 7);
      for (const id of ONE_MOVE_LEFT) expect(stepsByCounting(input, id), `${id} ${lineText(input)}`).toBe(runMachine(input, id).lines.length - 1);
    }
    expect(stepsByCounting(L('63 17 25 41 88'), 'nums-up-left')).toBe(3);
    expect(() => stepsByCounting(L('a b'), 'word-left-num-right')).toThrow();
  });

  it('never needs more than n − 1 steps with one move per step', () => {
    const rng = createRng(13);
    for (let t = 0; t < 400; t++) {
      const input = randomInput(rng, 6, 0);
      expect(runMachine(input, 'words-az-left').lines.length - 1).toBeLessThanOrEqual(input.length - 1);
    }
  });

  it('carries on from a later step the same way as trying every possible input', () => {
    const rng = createRng(14);
    let checked = 0;
    for (let t = 0; t < 120; t++) {
      const input = rng.shuffle(WORDS).slice(0, 5);
      for (const id of ['words-az-left', 'words-za-left', 'words-az-right']) {
        if (!cleanRun(input, id)) continue;
        const { lines } = runMachine(input, id);
        for (let k = 1; k < lines.length - 1; k++) {
          for (let m = k + 1; m < lines.length; m++) {
            const brute = stepMFromStepKBrute(lines[k], k, id, m);
            expect(brute, `${id} ${lineText(input)} ${k}→${m}`).toEqual([lineText(continueFrom(lines[k], k, id, m))]);
            expect(lineText(continueFrom(lines[k], k, id, m))).toBe(lineText(lines[m]));
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('finds the rule from the steps shown, and tells apart rules that agree on Step I', () => {
    const rng = createRng(15);
    for (let t = 0; t < 300; t++) {
      const input = randomInput(rng);
      for (const id of RULE_IDS) {
        const { lines } = runMachine(input, id, { steps: input.length - 1 });
        const shown = Object.fromEntries(lines.slice(1, 4).map((line, i) => [i + 1, line]));
        if (!Object.keys(shown).length) continue;
        expect(consistentRules(input, shown), id).toContain(id);
      }
    }
    const step1 = runMachine(L('58 23 71 40 12'), 'nums-up-left').lines;
    expect(consistentRules(L('58 23 71 40 12'), { 1: step1[1] })).toEqual(expect.arrayContaining(['nums-up-left', 'rotate-right']));
    expect(consistentRules(L('58 23 71 40 12'), { 1: step1[1], 2: step1[2] })).not.toContain('rotate-right');
  });

  it('undoes a rotation: exactly one input has a given later step', () => {
    for (const id of ['rotate-right', 'rotate-left']) {
      const input = L('godavari 7 narmada 2 krishna 8');
      for (let k = 1; k <= 7; k++) {
        const later = runMachine(input, id, { steps: k }).lines[k];
        expect(inputsForStep(later, k, id).map(lineText)).toEqual([lineText(input)]);
      }
    }
  });

  it('runs arithmetic machines step by step and as one composed map, and undoes them', () => {
    const rng = createRng(16);
    for (let t = 0; t < 300; t++) {
      const ops = [
        { op: rng.pick(['add', 'sub', 'mul']), k: rng.int(2, 6) },
        { op: rng.pick(['add', 'sub', 'mul']), k: rng.int(2, 6) }
      ];
      const x = rng.int(1, 40);
      const steps = rng.int(1, 5);
      const value = arithmeticLines([x], ops, steps)[steps][0];
      const { m, c } = affineAfter(ops, steps);
      expect(m * x + c).toBe(value);
      expect(arithmeticInput(value, ops, steps)).toBe(x);
    }
    expect(arithmeticLines([14, 9, 21, 6], [{ op: 'mul', k: 2 }, { op: 'sub', k: 3 }], 3)[3]).toEqual([50, 30, 78, 18]);
  });
});

/* ------------------------------ generated questions ------------------------------ */

const keyedText = (q) => q.options.find((o) => o.id === q.correctAnswer[0]).text;
/** Rules that fit an illustration, by running the machine (the templates check with the directly written lines). */
const fitsShown = (shown) => consistentRules(shown[0], Object.fromEntries(shown.slice(1).map((line, i) => [i + 1, line])));

function questions(id, seeds = 120) {
  const template = getTemplate(id);
  const out = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const { question } = buildInstance(template, seed);
    if (question) out.push(question);
  }
  expect(out.length, id).toBeGreaterThan(seeds * 0.3);
  return out;
}

describe('generated input-output questions', () => {
  it('offer exactly one rule that fits the steps shown', () => {
    for (const q of questions('io-gen-rule')) {
      const fit = consistentRules(q.parameters.shown[0], { 1: q.parameters.shown[1], 2: q.parameters.shown[2], 3: q.parameters.shown[3] }).map((id) => RULES[id].text);
      expect(q.options.filter((o) => fit.includes(o.text)).map((o) => o.text)).toEqual([keyedText(q)]);
    }
  });

  it('offer exactly one line that is the step asked for, under every rule that fits the illustration', () => {
    for (const q of questions('io-gen-step-line')) {
      const { input, shown, k } = q.parameters;
      const right = new Set(fitsShown(shown).map((id) => lineText(runMachine(input, id).lines[k] || [])));
      expect(right.size).toBe(1);
      expect(q.options.filter((o) => right.has(o.text)).map((o) => o.text)).toEqual([keyedText(q)]);
    }
  });

  it('offer exactly one element at the place asked for', () => {
    for (const q of questions('io-gen-kth')) {
      const { input, shown, k, j, end } = q.parameters;
      const right = new Set(
        fitsShown(shown).map((id) => {
          const line = runMachine(input, id).lines[k];
          return end === 'left' ? line[j - 1] : line[line.length - j];
        })
      );
      expect([...right]).toEqual([keyedText(q)]);
    }
  });

  it('count steps and find a step number the way the counting rule and the direct lines do', () => {
    for (const q of questions('io-gen-steps')) {
      const { input, ruleId } = q.parameters;
      expect(q.answer.value).toBe(linesByFormula(input, ruleId).length - 1);
      if (ONE_MOVE_LEFT.includes(ruleId)) expect(q.answer.value).toBe(stepsByCounting(input, ruleId));
    }
    for (const q of questions('io-gen-which-step')) {
      const { input, ruleId } = q.parameters;
      const line = q.question.split('\n').at(-1);
      expect(texts(linesByFormula(input, ruleId)).indexOf(line)).toBe(q.answer.value);
    }
  });

  it('carry on from a later step to the one line every possible input gives', () => {
    for (const q of questions('io-gen-continue', 60)) {
      const { given, k, m, ruleId } = q.parameters;
      const right = stepMFromStepKBrute(given, k, ruleId, m);
      expect(q.options.filter((o) => right.includes(o.text)).map((o) => o.text)).toEqual([keyedText(q)]);
    }
  });

  it('undo a rotation to the one input whose step k is the line given', () => {
    for (const q of questions('io-gen-rotate-input')) {
      const { given, k, ruleId } = q.parameters;
      const right = q.options.filter((o) => lineText(runMachine(L(o.text), ruleId, { steps: k }).lines[k]) === lineText(given));
      expect(right.map((o) => o.text)).toEqual([keyedText(q)]);
    }
  });

  it('follow and undo arithmetic machines', () => {
    for (const q of questions('io-gen-arith-value')) {
      const { ops, input, k, j } = q.parameters;
      expect(arithmeticLines(input, ops, k)[k][j - 1]).toBe(q.answer.value);
    }
    for (const q of questions('io-gen-arith-input')) {
      const { ops, given, k, j } = q.parameters;
      const found = Array.from({ length: 400 }, (_, x) => x - 50).filter((x) => arithmeticLines([x], ops, k)[k][0] === given[j - 1]);
      expect(found).toEqual([q.answer.value]);
    }
  });
});

/* ------------------------------ the simulation ------------------------------ */

describe('input-machine', () => {
  const sim = getSimulation('input-machine');
  const result = (values) => run(sim, { ...initialValues(sim), ...values }).result;

  it('draws the lines the machine gives, and marks what moved and what is placed', () => {
    for (const input of ['i1', 'i2', 'i3']) {
      for (const rule of sim.controls.find((c) => c.id === 'rule').options.map((o) => o.id)) {
        const r = result({ input, rule, step: 8 });
        const tokens = r.plot.rows[0].tokens.map((t) => t.text);
        const expected = texts(linesByFormula(tokens, rule, RULES[rule].kind === 'rotate' ? { steps: 8 } : {}));
        expect(r.plot.rows.map((row) => row.tokens.map((t) => t.text).join(' ')), `${input} ${rule}`).toEqual(expected.slice(0, r.numbers.at + 1));
        // Exactly the elements that moved in each step are marked as moved.
        r.plot.rows.slice(1).forEach((row, i) => {
          const before = r.plot.rows[i].tokens.map((t) => t.text);
          const movedMarked = row.tokens.filter((t) => t.state === 'moved').map((t) => t.text);
          expect(movedMarked.length).toBeGreaterThan(0);
          for (const t of movedMarked) expect(before.indexOf(t)).not.toBe(row.tokens.findIndex((x) => x.text === t));
        });
        if (RULES[rule].kind === 'sort' && r.numbers.last > 0) {
          // At the last step everything the rule picks is placed or has just moved.
          const final = r.plot.rows.at(-1).tokens;
          expect(final.filter((t) => t.state === 'waiting').every((t) => !RULES[rule].moves.some((m) => (m.pick.startsWith('num') ? /^\d+$/.test(t.text) : !/^\d+$/.test(t.text))))).toBe(true);
          if (ONE_MOVE_LEFT.includes(rule)) expect(r.numbers.steps).toBe(stepsByCounting(tokens, rule));
        }
      }
    }
  });

  it('comes back to the input after as many turns as there are elements', () => {
    for (const [input, n] of [['i1', 8], ['i2', 6], ['i3', 6]]) {
      const back = [...Array(9).keys()].filter((step) => result({ input, rule: 'rotate-right', step }).numbers.backToStart);
      expect(back[0]).toBe(n);
    }
  });
});
