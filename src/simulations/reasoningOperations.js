/**
 * Mathematical operations: symbol tiles swapped into an expression that is
 * then worked one operation at a time. Two problems give a key ("+ means ×"):
 * switch it on and every sign tile turns into its real sign. A third gives a
 * wrong equation: choose two signs to interchange and watch whether the
 * equation comes right. The working is the solver's own (utils/reasoning/
 * operations.js), and a readout says whether reading ÷, ×, +, − strictly in
 * that order would give the same value.
 * Plot: a stack of `tiles` (components/reasoningPlotsOperations.js) above `steps`.
 */

import { OPS, cleanValue, collapseSteps, decode, evaluate, exprText, interchangeSigns } from '../utils/reasoning/operations.js';
import { show } from './core.js';

const PROBLEMS = {
  p1: { kind: 'key', printed: [10, '÷', 5, '+', 3, '×', 10, '−', 2], key: { '+': '×', '×': '−', '−': '÷', '÷': '+' } },
  p2: { kind: 'key', printed: [8, '+', 2, '×', 5, '−', 8, '÷', 2], key: { '+': '÷', '−': '×', '×': '+', '÷': '−' } },
  p3: { kind: 'swap', printed: [15, '+', 36, '×', 4, '÷', 2, '−', 7], rhs: 26 }
};

const PAIRS = {
  none: null,
  'plus-minus': ['+', '−'],
  'plus-mul': ['+', '×'],
  'plus-div': ['+', '÷'],
  'minus-mul': ['−', '×'],
  'minus-div': ['−', '÷'],
  'mul-div': ['×', '÷']
};

const keyText = (key) =>
  Object.entries(key)
    .map(([from, to]) => `${from} means ${to}`)
    .join(', ');
const tokenText = (t) => (typeof t === 'number' ? show(t, 2) : t);
const lineText = (tokens) => exprText(tokens.map(tokenText));
const isSign = (t) => OPS.includes(t);

export const symbolSwap = {
  id: 'symbol-swap',
  topicId: 'mathematical-operations',
  title: 'Swap the symbols, then BODMAS',
  summary: 'Turn a key on and every printed sign flips to the sign it stands for; or interchange two signs to mend a wrong equation. Then work the expression one operation at a time, × and ÷ before + and −.',
  controls: [
    {
      id: 'problem',
      label: 'Problem',
      type: 'choice',
      options: [
        { id: 'p1', label: '1: a key' },
        { id: 'p2', label: '2: another key' },
        { id: 'p3', label: '3: interchange two signs' }
      ],
      default: 'p1'
    },
    {
      id: 'key',
      label: 'Key',
      type: 'choice',
      options: [
        { id: 'off', label: 'Off (signs as printed)' },
        { id: 'on', label: 'On (real signs)' }
      ],
      default: 'off',
      showWhen: { problem: ['p1', 'p2'] }
    },
    {
      id: 'pair',
      label: 'Interchange',
      type: 'choice',
      options: Object.entries(PAIRS).map(([id, pair]) => ({ id, label: pair ? `${pair[0]} and ${pair[1]}` : 'Nothing' })),
      default: 'none',
      showWhen: { problem: 'p3' }
    },
    { id: 'step', label: 'Operations done', type: 'range', min: 0, max: 4, step: 1, default: 0 }
  ],
  compute({ problem, key, pair, step }) {
    const p = PROBLEMS[problem];
    const isKey = p.kind === 'key';
    const keyOn = isKey && key === 'on';
    const swap = isKey ? null : PAIRS[pair];
    const tokens = isKey ? (keyOn ? decode(p.printed, p.key) : p.printed) : swap ? interchangeSigns(p.printed, ...swap) : p.printed;
    const exactLines = collapseSteps(tokens);
    const whole = exactLines !== null;
    const lines = exactLines || collapseSteps(tokens, 'standard', { exact: false });
    const total = lines.length - 1;
    const at = Math.min(step, total);
    const done = at === total;
    const value = lines[total].tokens[0];
    const dmas = whole ? evaluate(tokens, 'dmas') : null;
    const agree = whole && dmas === value;
    const real = isKey ? cleanValue(decode(p.printed, p.key)) : null;
    const holds = isKey ? null : whole && agree && value === p.rhs;
    const line = lines[at];
    const nextText = line.next ? `${tokenText(line.tokens[line.next.index - 1])} ${line.next.op} ${tokenText(line.tokens[line.next.index + 1])}` : null;

    const shown = lines.slice(0, at + 1).map((l, i) => ({
      note: i === 0 ? 'Start' : `Step ${i}`,
      tokens: l.tokens.map((t, j) => ({
        text: tokenText(t),
        mark:
          l.next && j >= l.next.index - 1 && j <= l.next.index + 1 ? (i === at ? 'next' : 'used') : j === l.resultAt ? 'done' : null
      }))
    }));

    const worked = tokens.map((t, i) => ({ text: String(t), sign: isSign(t), changed: t !== p.printed[i] }));
    const printed = p.printed.map((t) => ({ text: String(t), sign: isSign(t), changed: false }));
    const rule = isKey ? keyText(p.key) : swap ? `${swap[0]} and ${swap[1]} interchanged` : 'nothing interchanged';

    const readouts = [
      { label: 'Expression worked', value: `${exprText(tokens)}${isKey ? '' : ` = ${p.rhs}?`}` },
      { label: 'Next operation', value: done ? 'None: finished' : nextText },
      { label: 'Value', value: done ? show(value, 2) : `${at} of ${total} operations done` },
      isKey
        ? { label: 'With the key, the value is', value: show(real, 2) }
        : { label: 'Equation', value: holds ? `${show(value, 2)} = ${p.rhs}: correct` : `${show(value, 2)} ≠ ${p.rhs}` },
      {
        label: 'Reading ÷, ×, +, − strictly',
        value: !whole ? 'a division is not whole' : agree ? `${show(dmas, 2)}, the same` : `${show(dmas, 2)}: the two readings disagree`
      }
    ];

    let insight;
    if (!whole) insight = 'A division here is not whole: a sure sign this is not the intended reading.';
    else if (isKey && !keyOn) insight = done ? `Worked with the printed signs it comes to ${show(value)}, but the key makes it ${show(real)}. Always decode first.` : 'These are the printed signs, which mean something else. Switch the key on to see the real ones.';
    else if (isKey) insight = done ? `Decoded and worked with BODMAS: ${show(value)}.` : `Next: ${nextText}, because ${line.next.op === '×' || line.next.op === '÷' ? '× and ÷ come before + and −' : 'only + and − are left, so left to right'}.`;
    else if (!swap) insight = `As printed the left side is ${show(value)}, not ${p.rhs}. Pick two signs to interchange.`;
    else if (holds) insight = `Interchanging ${swap[0]} and ${swap[1]} makes it ${show(value)} = ${p.rhs}: correct.`;
    else if (!agree) insight = `This reading gives ${show(value)} by BODMAS but ${show(dmas)} read strictly ÷, ×, +, −: a − before a + is where the two disagree.`;
    else insight = `Interchanging ${swap[0]} and ${swap[1]} gives ${show(value)}, not ${p.rhs}.`;

    return {
      numbers: { problem, keyOn, at, total, done, value, whole, agree, dmas, real, holds },
      readouts,
      plot: {
        kind: 'stack',
        plots: [
          {
            kind: 'tiles',
            printed,
            worked,
            rhs: isKey ? null : p.rhs,
            verdict: isKey ? null : holds ? 'true' : 'false',
            key: isKey ? Object.entries(p.key).map(([from, to]) => ({ from, to })) : [],
            active: isKey ? keyOn : Boolean(swap),
            rule,
            summary: `Printed: ${exprText(p.printed)}${isKey ? '' : ` = ${p.rhs}`}. ${isKey ? `Key: ${rule}, ${keyOn ? 'on' : 'off'}` : `With ${rule}`}, the expression worked is ${exprText(tokens)}.`
          },
          {
            kind: 'steps',
            lines: shown,
            result: done ? `= ${show(value, 2)}` : null,
            wrong: !whole || (isKey && !keyOn) || (!isKey && !holds),
            summary: `Worked one operation at a time: ${lines
              .slice(0, at + 1)
              .map((l) => lineText(l.tokens))
              .join(', then ')}.`
          }
        ],
        summary: `${exprText(p.printed)}${isKey ? '' : ` = ${p.rhs}`}, worked as ${exprText(tokens)}: ${done ? `value ${show(value)}` : `${at} of ${total} operations done`}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'decode',
      prompt: 'Problem 1: switch the key on and work all four operations. What does the expression really equal?',
      check: (values, n) => n.problem === 'p1' && n.keyOn && n.done,
      solution: { problem: 'p1', key: 'on', step: 4 }
    },
    {
      id: 'printed',
      prompt: 'Problem 2: work the printed signs to the end, with the key off. How far is that from the real value?',
      check: (values, n) => n.problem === 'p2' && !n.keyOn && n.done,
      solution: { problem: 'p2', key: 'off', step: 4 }
    },
    {
      id: 'fix',
      prompt: 'Problem 3: find the two signs whose interchange makes the equation correct.',
      check: (values, n) => n.holds === true,
      solution: { problem: 'p3', pair: 'mul-div' }
    },
    {
      id: 'disagree',
      prompt: 'Problem 3: find an interchange after which BODMAS and a strict ÷, ×, +, − reading give different answers.',
      check: (values, n) => n.problem === 'p3' && n.whole && !n.agree,
      solution: { problem: 'p3', pair: 'plus-minus' }
    }
  ]
};

export const operationsSims = [symbolSwap];
