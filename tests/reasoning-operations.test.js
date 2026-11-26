/**
 * Mathematical operations: the solver (utils/reasoning/operations.js), the
 * generators built on it, and the symbol-swap simulation.
 *
 * The two evaluators (collapsing the tokens, and a precedence-climbing parser)
 * are held to textbook values and to each other on thousands of random
 * expressions, under both the standard order and a strict ÷, ×, +, − reading.
 * Generated questions are re-solved with the parser, trying every candidate,
 * so no second option can be right.
 */

import { describe, it, expect } from 'vitest';

import { createRng } from '../src/generators/core.js';
import { getTemplate } from '../src/generators/index.js';
import { buildInstance } from '../src/generators/engine.js';
import {
  OPS,
  SIGN_PAIRS,
  cleanByParser,
  cleanValue,
  collapseSteps,
  decode,
  decodeOneByOne,
  defineOp,
  evaluate,
  evaluateDefined,
  exprText,
  fillSigns,
  interchangeNumbers,
  interchangeSigns,
  interleave,
  numberSwapsThatWork,
  pairText,
  parseValue,
  ruleText,
  signSwapsThatWork,
  solveUnknown,
  tokenize
} from '../src/utils/reasoning/operations.js';
import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';

const T = tokenize;
const readings = (tokens) => ['standard', 'dmas'].map((c) => parseValue(exprText(tokens), c));
const parserMight = (tokens, rhs) => readings(tokens).includes(rhs);

/** A random expression of 2 to 5 numbers, sometimes with one bracket. */
function randomExpression(rng) {
  const count = rng.int(2, 5);
  const nums = Array.from({ length: count }, () => rng.int(0, 30));
  const signs = Array.from({ length: count - 1 }, () => rng.pick(OPS));
  const tokens = interleave(nums, signs);
  if (count >= 3 && rng.chance(0.4)) {
    const start = 2 * rng.int(0, count - 2);
    const end = start + 2 * rng.int(1, count - 1 - start / 2);
    return [...tokens.slice(0, start), '(', ...tokens.slice(start, end + 1), ')', ...tokens.slice(end + 1)];
  }
  return tokens;
}

describe('the solver', () => {
  it('works textbook expressions with BODMAS', () => {
    expect(evaluate(T('8 + 6 × 3 − 4 ÷ 2'))).toBe(24);
    expect(evaluate(T('36 − (4 + 8) ÷ 3 × 2'))).toBe(28);
    expect(evaluate(T('18 ÷ 3 × 2 + 8 − 5'))).toBe(15);
    expect(evaluate(T('8 + 6 × 3'), 'left')).toBe(42);
    expect(collapseSteps(T('7 × 6 + 45 ÷ 9 − 8')).map((l) => exprText(l.tokens))).toEqual(['7 × 6 + 45 ÷ 9 − 8', '42 + 45 ÷ 9 − 8', '42 + 5 − 8', '47 − 8', '39']);
  });

  it('knows where the two conventions part company, and refuses divisions that are not whole', () => {
    // − before +: 7 the standard way, 3 if every + is done before any −.
    expect([evaluate(T('9 − 4 + 2')), evaluate(T('9 − 4 + 2'), 'dmas')]).toEqual([7, 3]);
    expect(cleanValue(T('9 − 4 + 2'))).toBeNull();
    // 8 × 3 ÷ 6: 24 ÷ 6 = 4 one way; 3 ÷ 6 is not whole the other.
    expect([evaluate(T('8 × 3 ÷ 6')), evaluate(T('8 × 3 ÷ 6'), 'dmas')]).toEqual([4, null]);
    expect(cleanValue(T('9 + 4 − 2'))).toBe(11);
    expect(cleanValue(T('7 ÷ 2'))).toBeNull();
    expect(cleanValue(T('7 ÷ 0'))).toBeNull();
  });

  it('gives the same value by collapsing and by parsing, in both conventions, on random expressions', () => {
    const rng = createRng(2026);
    let compared = 0;
    for (let i = 0; i < 6000; i++) {
      const tokens = randomExpression(rng);
      for (const convention of ['standard', 'dmas']) {
        expect(evaluate(tokens, convention), `${exprText(tokens)} ${convention}`).toBe(parseValue(exprText(tokens), convention));
        compared++;
      }
      expect(cleanValue(tokens)).toBe(cleanByParser(exprText(tokens)));
    }
    expect(compared).toBe(12000);
  });

  it('decodes all signs at once, unlike replacing them one at a time', () => {
    const key = { '+': '×', '×': '−', '−': '÷', '÷': '+' };
    const printed = T('18 − 3 + 4 ÷ 6 × 2');
    expect(exprText(decode(printed, key))).toBe('18 ÷ 3 × 4 + 6 − 2');
    expect(cleanValue(decode(printed, key))).toBe(28);
    // One at a time, the new × is turned into − at once, and so on down the chain.
    expect(exprText(decodeOneByOne(printed, key))).not.toBe('18 ÷ 3 × 4 + 6 − 2');
    // Decoding character by character from the printed text agrees.
    const byChars = [...exprText(printed)].map((ch) => key[ch] || ch).join('');
    expect(byChars).toBe('18 ÷ 3 × 4 + 6 − 2');
    expect(exprText(decode([16, 'R', 4, 'Q', 6], { R: '÷', Q: '+' }))).toBe('16 ÷ 4 + 6');
  });

  it('finds sign and number interchanges, blanks and unknowns the same way as the parser', () => {
    const rng = createRng(77);
    for (let i = 0; i < 400; i++) {
      const nums = Array.from({ length: 4 }, () => rng.int(1, 12));
      const tokens = interleave(nums, [rng.pick(OPS), rng.pick(OPS), rng.pick(OPS)]);
      const rhs = rng.int(0, 40);
      expect(signSwapsThatWork(tokens, rhs).map(pairText)).toEqual(SIGN_PAIRS.filter((p) => parserMight(interchangeSigns(tokens, ...p), rhs)).map(pairText));
      const distinct = [...new Set(nums)];
      const byParser = [];
      for (let a = 0; a < distinct.length; a++) for (let b = a + 1; b < distinct.length; b++) if (parserMight(interchangeNumbers(tokens, distinct[a], distinct[b]), rhs)) byParser.push([distinct[a], distinct[b]]);
      expect(numberSwapsThatWork(tokens, rhs)).toEqual(byParser);
      const fills = [];
      for (const a of OPS) for (const b of OPS) for (const c of OPS) if (parserMight(interleave(nums, [a, b, c]), rhs)) fills.push([a, b, c]);
      expect(fillSigns(nums, rhs)).toEqual(fills);
      const withGap = tokens.map((t, j) => (j === 2 ? '?' : t));
      const unknown = [];
      for (let x = 0; x <= 200; x++) if (parserMight(withGap.map((t) => (t === '?' ? x : t)), rhs)) unknown.push(x);
      expect(solveUnknown(withGap, rhs, 0, 200)).toEqual(unknown);
    }
  });

  it('works defined operations like the rule written as a function', () => {
    const rules = [
      [[3, '×', 'a', '+', 2, '×', 'b'], (a, b) => 3 * a + 2 * b, '3a + 2b'],
      [['a', '×', 'b', '−', '(', 'a', '+', 'b', ')'], (a, b) => a * b - (a + b), 'ab − (a + b)'],
      [['a', '×', 'a', '−', 'b'], (a, b) => a * a - b, 'a² − b']
    ];
    for (const [rule, fn, text] of rules) {
      expect(ruleText(rule)).toBe(text);
      const op = defineOp(rule);
      for (let a = 0; a <= 12; a++) for (let b = 0; b <= 12; b++) expect(op(a, b)).toBe(fn(a, b));
    }
    expect(defineOp([3, '×', 'a', '+', 2, '×', 'b'])(5, 4)).toBe(23);
    expect(evaluateDefined(['(', 7, '⊕', 4, ')', '⊕', 3], { '⊕': [2, '×', 'a', '−', 'b'] })).toBe(17);
    expect(evaluateDefined([7, '⊕', '(', 4, '⊕', 3, ')'], { '⊕': [2, '×', 'a', '−', 'b'] })).toBe(9);
    expect(evaluateDefined(['(', 3, '★', 5, ')', '◆', 9], { '★': ['a', '+', 'b', '+', 'a', '×', 'b'], '◆': ['(', 'a', '+', 'b', ')', '÷', 2] })).toBe(16);
  });
});

/* ------------------------------ generated questions ------------------------------ */

const keyed = (q) => q.options.find((o) => o.id === q.correctAnswer[0]).text;
const others = (q) => q.options.filter((o) => o.id !== q.correctAnswer[0]).map((o) => o.text);

function instances(id, seeds = 150) {
  const template = getTemplate(id);
  const out = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const { question } = buildInstance(template, seed);
    if (question) out.push(question);
  }
  expect(out.length, id).toBeGreaterThan(seeds * 0.3);
  return out;
}

describe('generated mathematical-operations questions', () => {
  it('substitute: the parser on the decoded text gives the keyed value, the same both ways', () => {
    for (const id of ['mo-gen-substitute', 'mo-gen-letters']) {
      for (const q of instances(id)) {
        const { key, printed } = q.parameters;
        const real = [...exprText(printed)].map((ch) => key[ch] || ch).join('');
        const value = cleanByParser(real);
        expect(value).not.toBeNull();
        if (q.type === 'numerical_input') expect(q.answer.value).toBe(value);
        else {
          expect(keyed(q)).toBe(String(value));
          for (const text of others(q)) expect(Number(text)).not.toBe(value);
        }
      }
    }
  });

  it('unknown: exactly one whole number from 0 to 1000 fits, and it is the keyed one', () => {
    for (const q of instances('mo-gen-unknown', 60)) {
      const { key, printed, rhs } = q.parameters;
      const real = decode(printed, key);
      const fits = [];
      for (let x = 0; x <= 1000; x++) if (parserMight(real.map((t) => (t === '?' ? x : t)), rhs)) fits.push(x);
      expect(fits).toEqual([q.answer.value]);
      expect(cleanValue(real.map((t) => (t === '?' ? q.answer.value : t)))).toBe(rhs);
    }
  });

  it('which equation: only the keyed one holds, in either reading', () => {
    for (const q of instances('mo-gen-which-true')) {
      const { key, options } = q.parameters;
      const hold = options.filter((o) => parserMight(decode(o.printed, key), o.rhs)).map((o) => o.text);
      expect(hold).toEqual([keyed(q)]);
      for (const o of options) expect(cleanByParser(exprText(decode(o.printed, key)))).not.toBeNull();
    }
  });

  it('interchanges: the printed line is clean, and only the keyed pair mends it', () => {
    for (const q of instances('mo-gen-swap-signs')) {
      const { printed, rhs } = q.parameters;
      expect(cleanValue(printed)).not.toBeNull();
      const works = q.options.filter((o) => parserMight(interchangeSigns(printed, ...o.text.split(' and ')), rhs)).map((o) => o.text);
      expect(works).toEqual([keyed(q)]);
      expect(SIGN_PAIRS.filter((p) => parserMight(interchangeSigns(printed, ...p), rhs)).map(pairText)).toEqual([keyed(q)]);
    }
    for (const q of instances('mo-gen-swap-numbers')) {
      const { printed, rhs } = q.parameters;
      expect(cleanValue(printed)).not.toBeNull();
      const works = q.options.filter((o) => parserMight(interchangeNumbers(printed, ...o.text.split(' and ').map(Number)), rhs)).map((o) => o.text);
      expect(works).toEqual([keyed(q)]);
    }
  });

  it('blanks: of all 24 orders of three different signs, only the keyed one works', () => {
    for (const q of instances('mo-gen-fill')) {
      const { numbers, rhs } = q.parameters;
      const works = [];
      for (const a of OPS) for (const b of OPS) for (const c of OPS) if (new Set([a, b, c]).size === 3 && parserMight(interleave(numbers, [a, b, c]), rhs)) works.push(`${a}, ${b}, ${c}`);
      expect(works).toEqual([keyed(q)]);
    }
  });

  it('defined operations: verify agrees with the answer on every instance', () => {
    for (const id of ['mo-gen-defined', 'mo-gen-defined-nested', 'mo-gen-defined-two']) {
      const template = getTemplate(id);
      for (const q of instances(id)) expect(template.verify(q.parameters, q.answer.value)).toBe(true);
    }
  });
});

/* ------------------------------ simulation ------------------------------ */

describe('symbol-swap', () => {
  const sim = getSimulation('symbol-swap');
  const result = (values) => run(sim, { ...initialValues(sim), ...values }).result;

  it('works the decoded expression to the solver’s value, one operation per step', () => {
    for (const [problem, printedValue, realValue] of [
      ['p1', 30, 20],
      ['p2', 14, 42]
    ]) {
      const off = result({ problem, key: 'off', step: 4 }).numbers;
      const on = result({ problem, key: 'on', step: 4 }).numbers;
      expect([off.value, on.value, on.real]).toEqual([printedValue, realValue, realValue]);
      expect(on.done && on.whole && on.agree).toBe(true);
      expect(off.whole && off.agree).toBe(true);
      for (let step = 0; step <= 4; step++) {
        const r = result({ problem, key: 'on', step });
        expect(r.plot.plots[1].lines).toHaveLength(step + 1);
        expect(r.plot.plots[0].worked.filter((t) => t.changed)).toHaveLength(4);
      }
    }
  });

  it('mends problem 3 only with × and ÷, as the brute-force search says', () => {
    const printed = T('15 + 36 × 4 ÷ 2 − 7');
    const right = signSwapsThatWork(printed, 26).map(pairText);
    const pairs = ['plus-minus', 'plus-mul', 'plus-div', 'minus-mul', 'minus-div', 'mul-div'];
    const mended = pairs.filter((pair) => result({ problem: 'p3', pair, step: 4 }).numbers.holds);
    expect(mended).toEqual(['mul-div']);
    expect(right).toEqual(['× and ÷']);
    for (const pair of pairs) {
      const n = result({ problem: 'p3', pair, step: 4 }).numbers;
      const tokens = interchangeSigns(printed, ...SIGN_PAIRS[pairs.indexOf(pair)]);
      if (n.whole) expect(n.value).toBe(evaluate(tokens));
      else expect(evaluate(tokens)).toBeNull();
    }
    expect(result({ problem: 'p3', pair: 'plus-minus' }).numbers.agree).toBe(false);
  });
});
