/**
 * Input-output: words and numbers on a conveyor, rearranged one step at a time
 * by a machine's rule. The lines come from the machine itself (runMachine in
 * utils/reasoning/machine.js); which elements are already placed comes from
 * the order of picks (pickSchedule), so the picture shows both what moved and
 * what is settled. Plot kind: conveyor (components/reasoningPlotsMachine.js).
 */

import { RULES, lineAfter, lineText, pickSchedule, runMachine, stepName } from '../utils/reasoning/machine.js';

const INPUTS = {
  i1: { label: 'Words and numbers', tokens: ['veena', '52', 'sitar', '76', 'tabla', '33', 'dhol', '19'] },
  i2: { label: 'Words only', tokens: ['rice', 'mango', 'kite', 'chai', 'lotus', 'fort'] },
  i3: { label: 'Numbers only', tokens: ['12', '47', '85', '30', '64', '21'] }
};
const SIM_RULES = ['words-az-left', 'nums-down-left', 'word-left-num-right', 'word-num-alternate', 'rotate-right'];
const MAX_STEP = 8;

/** After each shown step of a sorting machine, the elements already placed (picks done, including any that needed no move). */
function placedAfterEachStep(input, ruleId, lines) {
  const placed = [new Set()];
  const left = [];
  const right = [];
  const done = new Set();
  let current = lineText(input);
  for (const group of pickSchedule(input, ruleId)) {
    for (const { token, to } of group) {
      (to === 'left' ? left : right).push(token);
      done.add(token);
    }
    const text = lineText(lineAfter(input, left, right));
    if (text !== current) {
      current = text;
      placed.push(new Set(done));
    } else if (placed.length > 1) {
      // A pick that needed no move belongs to the step already shown.
      placed[placed.length - 1] = new Set(done);
    }
  }
  return placed.slice(0, lines.length);
}

export const inputMachine = {
  id: 'input-machine',
  topicId: 'input-output',
  title: 'The rearranging machine',
  summary: 'Feed a line of words and numbers into a machine and step through its rule. Each step moves one element (or one word and one number) next to those already placed; the rest keep their order, which is why any step can be read without the ones before it.',
  controls: [
    { id: 'input', label: 'Input', type: 'choice', options: Object.entries(INPUTS).map(([id, i]) => ({ id, label: i.label })), default: 'i1' },
    { id: 'rule', label: 'Rule', type: 'choice', options: SIM_RULES.map((id) => ({ id, label: RULES[id].short })), default: 'words-az-left' },
    { id: 'step', label: 'Step', type: 'range', min: 0, max: MAX_STEP, step: 1, default: 0 }
  ],
  compute({ input: inputId, rule, step }) {
    const input = INPUTS[inputId].tokens;
    const rotating = RULES[rule].kind === 'rotate';
    const { lines, moved } = runMachine(input, rule, rotating ? { steps: MAX_STEP } : {});
    const last = lines.length - 1;
    const at = Math.min(step, last);
    const placed = rotating ? lines.map(() => new Set()) : placedAfterEachStep(input, rule, lines);
    const done = !rotating && at === last;
    const backToStart = rotating && at > 0 && lineText(lines[at]) === lineText(input);
    const movedNow = moved[at];
    const rows = lines.slice(0, at + 1).map((line, k) => ({
      label: stepName(k),
      tokens: line.map((text) => ({
        text,
        state: k > 0 && moved[k].includes(text) ? 'moved' : placed[k].has(text) ? 'placed' : 'waiting',
        from: k > 0 && moved[k].includes(text) ? lines[k - 1].indexOf(text) : null
      }))
    }));
    const stepsText = rotating ? `It never finishes: after ${input.length} steps the line is back where it started` : last === 0 ? 'None: this rule finds nothing to move' : `${last}`;
    return {
      numbers: { input: inputId, rule, at, last, done, line: lineText(lines[at]), moved: movedNow, backToStart, steps: rotating ? null : last },
      readouts: [
        { label: 'Rule', value: RULES[rule].text },
        { label: 'Showing', value: at === 0 ? 'The input' : `${stepName(at)}${rotating ? '' : ` of ${last}`}` },
        { label: 'Moved in this step', value: at === 0 ? 'Nothing yet' : movedNow.join(' and ') },
        { label: 'Steps to finish', value: stepsText },
        { label: 'Current line', value: lineText(lines[at]) }
      ],
      plot: {
        kind: 'conveyor',
        rows,
        rule: RULES[rule].text,
        done,
        summary: `${RULES[rule].short}. ${rows.map((r) => `${r.label}: ${r.tokens.map((t) => t.text).join(' ')}`).join('. ')}.${at > 0 ? ` ${stepName(at)} moved ${movedNow.join(' and ')}.` : ''}`
      },
      insight:
        last === 0
          ? 'This rule picks nothing from this input (a number rule on words, say), so nothing ever moves. Try another rule.'
          : at === 0
            ? 'Move the step slider to run the machine one step at a time.'
            : rotating
              ? backToStart
                ? `Back to the input after ${at} steps: a line of ${input.length} turned ${input.length} times is where it started, so step k is the same as step k − ${input.length}.`
                : 'Every element shifts one place; the last one comes to the front. To undo a step, turn the other way.'
              : done
                ? `Finished in ${last} step${last === 1 ? '' : 's'}. The last element${RULES[rule].moves.length > 1 ? 's' : ''} fell into place without a step of ${RULES[rule].moves.length > 1 ? 'their' : 'its'} own.`
                : `The highlighted element moved next to those already placed; everything not yet placed kept its input order.`
    };
  },
  tasks: [
    {
      id: 'finish-mixed',
      prompt: 'With the words-and-numbers input, run “a word to the left and a number to the right” to its last step. Why do 8 elements need only 3 steps?',
      check: (values, n) => n.input === 'i1' && n.rule === 'word-left-num-right' && n.done,
      solution: { input: 'i1', rule: 'word-left-num-right', step: 3 }
    },
    {
      id: 'take-turns',
      prompt: 'Now let words and numbers take turns on the same input. Go to the last step: how many steps does it take this time?',
      check: (values, n) => n.input === 'i1' && n.rule === 'word-num-alternate' && n.done,
      solution: { input: 'i1', rule: 'word-num-alternate', step: 6 }
    },
    {
      id: 'place-64',
      prompt: 'Sort the numbers-only input with “largest number first” and stop at the step that places 64.',
      check: (values, n) => n.input === 'i3' && n.rule === 'nums-down-left' && n.moved.includes('64'),
      solution: { input: 'i3', rule: 'nums-down-left', step: 2 }
    },
    {
      id: 'back-to-start',
      prompt: 'With “last to the front” on the words-only input, find the first step at which the line is back to the input.',
      check: (values, n) => n.rule === 'rotate-right' && n.backToStart,
      solution: { input: 'i2', rule: 'rotate-right', step: 6 }
    }
  ]
};

export const machineSims = [inputMachine];
