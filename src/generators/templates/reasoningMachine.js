/**
 * Input-output (machine) templates: the rule from shown steps, a given step,
 * the element at a place in a step, the number of steps, which step a line
 * is, carrying on from a later step, undoing a rotation, and arithmetic
 * machines.
 *
 * Answers come from running the machine (utils/reasoning/machine.js,
 * runMachine). `verify` writes the lines directly instead (linesByFormula),
 * counts steps by the counting rule, brute-forces every input that could have
 * produced a later step, or undoes an arithmetic map, so a slip in one method
 * can never reach a learner. Where a question shows an illustration, every
 * machine in the family that fits the illustration must give the same answer
 * for the new input (the set is well posed).
 */

import {
  RULES,
  RULE_IDS,
  affineAfter,
  cleanRun,
  arithmeticInput,
  arithmeticLines,
  continueFrom,
  isNumberToken,
  lineText,
  linesByFormula,
  opText,
  runMachine,
  stepMFromStepKBrute,
  stepName,
  stepsByCounting
} from '../../utils/reasoning/machine.js';
import { ordinal } from '../../utils/reasoning/ranking.js';

const TOPIC = 'input-output';

/** Words with different first letters, so dictionary order is easy to read. */
export const MACHINE_WORDS = [
  'aloo', 'banyan', 'chai', 'dhol', 'eagle', 'fort', 'ganga', 'henna', 'idli', 'jowar', 'kite', 'lotus', 'mango',
  'neem', 'onion', 'paneer', 'quill', 'rice', 'sitar', 'tabla', 'urad', 'veena', 'wheat', 'yatra', 'zari'
];

const WORD_RULES = ['words-az-left', 'words-za-left', 'words-az-right'];
const NUMBER_RULES = ['nums-up-left', 'nums-down-left'];
const MIXED_RULES = ['word-left-num-right', 'num-left-word-right', 'word-num-alternate'];
const ROTATE_RULES = ['rotate-right', 'rotate-left'];
const ONE_MOVE_LEFT = ['words-az-left', 'words-za-left', 'nums-up-left', 'nums-down-left'];

export function compositionFor(rng, ruleId, size) {
  if (WORD_RULES.includes(ruleId)) return { words: size, numbers: 0 };
  if (NUMBER_RULES.includes(ruleId)) return { words: 0, numbers: size };
  const words = Math.ceil(size / 2) - (rng.chance(0.5) ? 0 : 1);
  return { words, numbers: size - words };
}

export function makeInput(rng, { words, numbers }, avoid = new Set()) {
  const ws = rng.shuffle(MACHINE_WORDS.filter((w) => !avoid.has(w))).slice(0, words);
  const ns = new Set();
  while (ns.size < numbers) {
    const x = String(rng.int(11, 98));
    if (!avoid.has(x)) ns.add(x);
  }
  return rng.shuffle([...ws, ...ns]);
}

/** An input whose run has no skipped step before the end (exam sets are written so), or null. */
export function cleanInput(rng, comp, ruleId, avoid = new Set()) {
  const tokens = makeInput(rng, comp, avoid);
  for (let tries = 0; tries < 40; tries++) {
    const input = rng.shuffle(tokens);
    if (cleanRun(input, ruleId)) return input;
  }
  return null;
}

const sameLine = (a, b) => lineText(a) === lineText(b);

/** Machines in the family whose directly written lines match every shown step. */
export function fittingRules(example, shown) {
  return RULE_IDS.filter((id) => {
    const lines = linesByFormula(example, id, { steps: Math.max(example.length - 1, shown.length - 1) });
    return shown.every((line, k) => lines[k] && sameLine(lines[k], line));
  });
}

/** An illustration: another input of the same make-up and its first `upTo` steps (all of them if fewer). */
function illustrate(rng, ruleId, comp, input, upTo = 3) {
  const example = cleanInput(rng, comp, ruleId, new Set(input));
  if (!example) return null;
  const { lines } = runMachine(example, ruleId);
  if (lines.length < Math.min(upTo, 3) + 1) return null;
  return lines.slice(0, upTo + 1);
}

/** One value from every fitting machine, or null if they disagree (or none fits). */
function agreed(shown, value) {
  const ids = fittingRules(shown[0], shown);
  if (!ids.length) return null;
  const values = ids.map(value).map((v) => JSON.stringify(v));
  return new Set(values).size === 1 ? JSON.parse(values[0]) : null;
}

const stepLines = (lines) => lines.map((line, k) => `${stepName(k)}: ${lineText(line)}`).join('\n');

function illustrationText(shown, input) {
  return `A word and number arrangement machine rearranges its input one step at a time. An illustration:\n${stepLines(shown)}\nand so on, by the same rule, until the arrangement is complete.\nThe machine is now given:\nInput: ${lineText(input)}`;
}

const lineHow = (ruleId) => RULES[ruleId].text;
const verb = ({ op, k }) => (op === 'add' ? `add ${k} to every number` : op === 'sub' ? `subtract ${k} from every number` : `multiply every number by ${k}`);

/** The line if every pick went to the very end instead of next to those already placed (a common slip). */
function lineAllToEnd(input, ruleId, k) {
  const rule = RULES[ruleId];
  if (rule.kind !== 'sort') return null;
  const { moved } = runMachine(input, ruleId);
  let line = [...input];
  for (let s = 1; s <= k && s < moved.length; s++) {
    for (const token of moved[s]) {
      const to = rule.moves.find((m) => (m.pick.startsWith('num') ? isNumberToken(token) : !isNumberToken(token))).to;
      line = line.filter((t) => t !== token);
      if (to === 'left') line.unshift(token);
      else line.push(token);
    }
  }
  return line;
}

const lineOption = (line) => (line ? lineText(line) : null);
function textDistractors(answer, values, why) {
  const seen = new Set([answer]);
  const out = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push({ value, why });
  }
  return out;
}

export const machineTemplates = [
  /* ------------------------------ the rule ------------------------------ */
  {
    id: 'io-gen-rule',
    version: 1,
    topicId: TOPIC,
    conceptId: 'io-rule',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['io-rule-f'],
    formatValue: (v) => v,
    estimatedSeconds: 70,
    params(rng) {
      const ruleId = rng.pick([...WORD_RULES, ...NUMBER_RULES, ...MIXED_RULES, ...ROTATE_RULES]);
      const comp = ROTATE_RULES.includes(ruleId) ? compositionFor(rng, 'word-left-num-right', 6) : compositionFor(rng, ruleId, rng.int(5, 7));
      const input = cleanInput(rng, comp, ruleId);
      if (!input) return null;
      const { lines } = runMachine(input, ruleId);
      if (lines.length < 4) return null;
      const shown = lines.slice(0, 4);
      // Offer three other machines that do NOT fit the steps shown.
      const fit = fittingRules(input, shown);
      const others = rng.shuffle(RULE_IDS.filter((id) => id !== ruleId && !fit.includes(id)));
      if (others.length < 3) return null;
      return { ruleId, shown, wrong: others.slice(0, 3) };
    },
    answer: ({ ruleId }) => lineHow(ruleId),
    distractors: ({ wrong }) => wrong.map((id) => ({ value: lineHow(id), why: 'a rule that breaks one of the steps shown' })),
    verify: ({ shown, wrong }, value) => {
      const fit = fittingRules(shown[0], shown).map(lineHow);
      const offered = [value, ...wrong.map(lineHow)];
      return fit.includes(value) && offered.filter((text) => fit.includes(text)).length === 1;
    },
    render({ ruleId, shown }) {
      const { moved } = runMachine(shown[0], ruleId, { steps: 3 });
      return {
        context: `A machine rearranges a line of words and numbers one step at a time:\n${stepLines(shown)}`,
        question: 'Which rule does the machine follow?',
        explanation: `Compare each step with the one before it. Step I moves ${moved[1].join(' and ')}, Step II moves ${moved[2].join(' and ')}, Step III moves ${moved[3].join(' and ')}. Only one rule offered moves exactly those, to those places: ${lineHow(ruleId)}`,
        solutionSteps: [`Input → Step I: ${moved[1].join(' and ')} moved.`, `Step I → Step II: ${moved[2].join(' and ')} moved.`, `Step II → Step III: ${moved[3].join(' and ')} moved.`, 'Test each rule on all three steps; only one fits every step.'],
        method: 'Find what moved in each step and where it went, then test each rule on every step shown, not just the first.',
        hints: ['Which element changed place between the Input and Step I? Where did it go?', 'A rule must also explain Step II and Step III. Test each option on all of them.'],
        commonMistakes: ['Choosing a rule that explains Step I but not Step II.', 'Mixing up "first in dictionary order" with "last", or the left end with the right end.']
      };
    }
  },

  /* ------------------------------ reading a step ------------------------------ */
  {
    id: 'io-gen-step-line',
    version: 1,
    topicId: TOPIC,
    conceptId: 'io-step',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['io-settled-f', 'io-sc-rest-order'],
    formatValue: (v) => v,
    estimatedSeconds: 75,
    params(rng) {
      const ruleId = rng.pick([...WORD_RULES, ...NUMBER_RULES, ...MIXED_RULES]);
      const comp = compositionFor(rng, ruleId, rng.int(5, 6));
      const input = cleanInput(rng, comp, ruleId);
      if (!input) return null;
      const { lines } = runMachine(input, ruleId);
      if (lines.length < 4) return null;
      const shown = illustrate(rng, ruleId, comp, input, 2);
      if (!shown) return null;
      const k = rng.int(2, lines.length - 1);
      return { ruleId, input, shown, k };
    },
    answer: ({ input, ruleId, k }) => lineText(runMachine(input, ruleId).lines[k]),
    distractors: ({ input, ruleId, k }) => {
      const { lines } = runMachine(input, ruleId);
      const answer = lineText(lines[k]);
      const otherRules = RULE_IDS.filter((id) => id !== ruleId && RULES[id].kind === 'sort').map((id) => lineOption(runMachine(input, id).lines[k]));
      return [
        ...textDistractors(answer, [lineOption(lines[k - 1])], `this is ${stepName(k - 1)}, one step too few`),
        ...textDistractors(answer, [lineOption(lines[k + 1])], `this is ${stepName(k + 1)}, one step too many`),
        ...textDistractors(answer, [lineOption(lineAllToEnd(input, ruleId, k))], 'moved each element to the very end, in front of those already placed'),
        ...textDistractors(answer, otherRules, 'followed a different rule')
      ];
    },
    verify: ({ input, shown, k }, value) => agreed(shown, (id) => lineText(linesByFormula(input, id)[k] || [])) === value,
    render({ ruleId, input, shown, k }) {
      const { lines, moved } = runMachine(input, ruleId);
      return {
        context: illustrationText(shown, input),
        question: `Which of these is ${stepName(k)} for the new input?`,
        explanation: `The rule: ${lineHow(ruleId)} For the new input the moves are: ${moved
          .slice(1, k + 1)
          .map((m, i) => `${stepName(i + 1)}, ${m.join(' and ')}`)
          .join('; ')}. The elements not yet moved keep their input order, so ${stepName(k)} is ${lineText(lines[k])}.`,
        solutionSteps: [`Read the rule from the illustration: ${RULES[ruleId].short}.`, ...lines.slice(1, k + 1).map((line, i) => `${stepName(i + 1)}: ${lineText(line)}`)],
        method: 'Find the rule from the illustration, list the order in which the new input’s elements will be picked, and place them one step at a time.',
        hints: ['What moved between the Input and Step I of the illustration, and where did it go?', `After ${stepName(k)}, how many elements are in their final places, and which?`, 'The elements not yet moved stay in the same order as in the input.'],
        commonMistakes: ['Stopping one step short or going one step too far.', 'Putting each new element at the very end instead of next to the ones already placed.']
      };
    }
  },
  {
    id: 'io-gen-kth',
    version: 1,
    topicId: TOPIC,
    conceptId: 'io-step',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['io-settled-f', 'io-sc-rest-order'],
    formatValue: (v) => v,
    estimatedSeconds: 75,
    params(rng) {
      const ruleId = rng.pick([...WORD_RULES, ...NUMBER_RULES, ...MIXED_RULES]);
      const comp = compositionFor(rng, ruleId, rng.int(6, 7));
      const input = cleanInput(rng, comp, ruleId);
      if (!input) return null;
      const { lines } = runMachine(input, ruleId);
      if (lines.length < 4) return null;
      const shown = illustrate(rng, ruleId, comp, input, 3);
      if (!shown) return null;
      const k = rng.int(2, Math.min(lines.length - 1, 4));
      const j = rng.int(2, input.length - 1);
      const end = rng.pick(['left', 'right']);
      return { ruleId, input, shown, k, j, end };
    },
    answer: ({ input, ruleId, k, j, end }) => {
      const line = runMachine(input, ruleId).lines[k];
      return end === 'left' ? line[j - 1] : line[line.length - j];
    },
    distractors: ({ input, ruleId, k, j, end }) => {
      const { lines } = runMachine(input, ruleId);
      const line = lines[k];
      const n = line.length;
      const at = (l, from, p) => (p < 1 || p > n ? null : from === 'left' ? l[p - 1] : l[n - p]);
      const other = end === 'left' ? 'right' : 'left';
      return textDistractors(at(line, end, j), [at(line, other, j), at(lines[k - 1], end, j), at(line, end, j + 1), at(line, end, j - 1), at(input, end, j), ...input], 'counted from the other end, a neighbour, or another step');
    },
    verify: ({ input, shown, k, j, end }, value) =>
      agreed(shown, (id) => {
        const line = linesByFormula(input, id)[k];
        if (!line) return null;
        return end === 'left' ? line[j - 1] : line[line.length - j];
      }) === value,
    render({ ruleId, input, shown, k, j, end }) {
      const line = runMachine(input, ruleId).lines[k];
      const value = end === 'left' ? line[j - 1] : line[line.length - j];
      return {
        context: illustrationText(shown, input),
        question: `In ${stepName(k)} for the new input, which element is ${ordinal(j)} from the ${end} end?`,
        explanation: `${stepName(k)} is ${lineText(line)}. Counting from the ${end}, the ${ordinal(j)} element is ${value}.`,
        solutionSteps: [`Rule: ${RULES[ruleId].short}.`, `${stepName(k)}: ${lineText(line)}.`, `${ordinal(j)} from the ${end}: ${value}.`],
        method: 'Write out the step asked for, then count from the end named.',
        hints: [`Write ${stepName(k)} for the new input first.`, `Count ${j} places from the ${end} end, starting at 1.`],
        commonMistakes: [`Counting from the ${end === 'left' ? 'right' : 'left'} end.`, `Reading the line of ${stepName(k - 1)} instead of ${stepName(k)}.`]
      };
    }
  },

  /* ------------------------------ how many steps ------------------------------ */
  {
    id: 'io-gen-steps',
    version: 1,
    topicId: TOPIC,
    conceptId: 'io-count',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['io-final-f', 'io-sc-count'],
    estimatedSeconds: 80,
    params(rng) {
      const ruleId = rng.pick([...ONE_MOVE_LEFT, ...ONE_MOVE_LEFT, ...MIXED_RULES]);
      const comp = compositionFor(rng, ruleId, rng.int(6, 7));
      let input = makeInput(rng, comp);
      // Often start with one or two elements already in place, so steps are saved.
      if (ONE_MOVE_LEFT.includes(ruleId) && rng.chance(0.7)) {
        const final = linesByFormula(input, ruleId).at(-1);
        const already = final.slice(0, rng.int(1, 2));
        input = [...already, ...rng.shuffle(input.filter((t) => !already.includes(t)))];
      }
      const shown = illustrate(rng, ruleId, comp, input, 3);
      if (!shown) return null;
      if (runMachine(input, ruleId).lines.length < 3) return null;
      return { ruleId, input, shown };
    },
    answer: ({ input, ruleId }) => runMachine(input, ruleId).lines.length - 1,
    verify: ({ input, shown, ruleId }, value) =>
      agreed(shown, (id) => linesByFormula(input, id).length - 1) === value && (!ONE_MOVE_LEFT.includes(ruleId) || stepsByCounting(input, ruleId) === value),
    render({ ruleId, input, shown }) {
      const { lines } = runMachine(input, ruleId);
      const steps = lines.length - 1;
      const n = input.length;
      const free = ONE_MOVE_LEFT.includes(ruleId) ? n - 1 - steps : 0;
      return {
        context: illustrationText(shown, input),
        question: 'How many steps will the machine take to complete the arrangement of the new input? (The last step is the one after which nothing changes.)',
        explanation: `${lines
          .slice(1)
          .map((line, i) => `${stepName(i + 1)}: ${lineText(line)}`)
          .join('. ')}. That is ${steps} step${steps === 1 ? '' : 's'}.${free > 0 ? ` With one move per step, ${n} elements need at most ${n - 1} steps; here ${free} element${free === 1 ? ' is' : 's are'} already in place when ${free === 1 ? 'its' : 'their'} turn comes, and no step is spent on ${free === 1 ? 'it' : 'them'}.` : ''}`,
        solutionSteps: [`Rule: ${RULES[ruleId].short}.`, ...lines.slice(1).map((line, i) => `${stepName(i + 1)}: ${lineText(line)}`), `Steps: ${steps}.`],
        method: 'Run the machine on the new input, or count: an element costs a step only if something placed after it (or never placed) stands ahead of it.',
        hints: ['Which elements are already in their final places at the start?', `With one move per step, ${n} elements need at most ${n - 1} steps: the last one falls into place by itself.`],
        commonMistakes: [`Answering ${n}, counting a step for the last element too.`, 'Counting a step for an element that is already in its place.']
      };
    }
  },
  {
    id: 'io-gen-which-step',
    version: 1,
    topicId: TOPIC,
    conceptId: 'io-count',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['io-settled-f'],
    estimatedSeconds: 70,
    params(rng) {
      const ruleId = rng.pick([...WORD_RULES, ...NUMBER_RULES, ...MIXED_RULES]);
      const comp = compositionFor(rng, ruleId, rng.int(6, 7));
      const input = cleanInput(rng, comp, ruleId);
      if (!input) return null;
      const { lines } = runMachine(input, ruleId);
      if (lines.length < 4) return null;
      const shown = illustrate(rng, ruleId, comp, input, 2);
      if (!shown) return null;
      return { ruleId, input, shown, k: rng.int(2, lines.length - 1) };
    },
    answer: ({ k }) => k,
    verify: ({ input, ruleId, shown, k }, value) => {
      const target = lineText(runMachine(input, ruleId).lines[k]);
      return agreed(shown, (id) => linesByFormula(input, id).findIndex((line) => lineText(line) === target)) === value;
    },
    render({ ruleId, input, shown, k }) {
      const { lines } = runMachine(input, ruleId);
      return {
        context: illustrationText(shown, input),
        question: `Which step for the new input is this line?\n${lineText(lines[k])}`,
        explanation: `${lines
          .slice(1, k + 1)
          .map((line, i) => `${stepName(i + 1)}: ${lineText(line)}`)
          .join('. ')}. The line is ${stepName(k)}, so the answer is ${k}.`,
        solutionSteps: [`Rule: ${RULES[ruleId].short}.`, 'Count the steps it takes the new input to reach the line.', `It is ${stepName(k)}.`],
        method: 'Count the elements already placed at the ends in pick order: with one pick per step, that count is the step number.',
        hints: ['Which elements of the line are already at the ends, in the order the rule picks them?', 'Check that the remaining elements are still in their input order.'],
        commonMistakes: ['Counting an element that happens to be in place but has not been picked yet.', 'With two moves per step, counting moves instead of steps.']
      };
    }
  },

  /* ------------------------------ from a later step ------------------------------ */
  {
    id: 'io-gen-continue',
    version: 1,
    topicId: TOPIC,
    conceptId: 'io-reverse',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['io-reverse-f', 'io-settled-f'],
    formatValue: (v) => v,
    estimatedSeconds: 100,
    params(rng) {
      const ruleId = rng.pick([...ONE_MOVE_LEFT, 'words-az-right']);
      const comp = compositionFor(rng, ruleId, 6);
      const input = cleanInput(rng, comp, ruleId);
      if (!input) return null;
      const { lines } = runMachine(input, ruleId);
      if (lines.length < 5) return null;
      const k = rng.int(1, 2);
      const m = rng.int(k + 2, lines.length - 1);
      const shown = illustrate(rng, ruleId, comp, input, 3);
      if (!shown) return null;
      return { ruleId, given: lines[k], k, m, shown };
    },
    answer: ({ given, k, ruleId, m }) => lineOption(continueFrom(given, k, ruleId, m)),
    distractors: ({ given, k, ruleId, m }) => {
      const answer = lineOption(continueFrom(given, k, ruleId, m));
      const from = runMachine(given, ruleId).lines;
      return [
        ...textDistractors(answer, [lineOption(continueFrom(given, k, ruleId, m - 1))], `this is ${stepName(m - 1)}`),
        ...textDistractors(answer, [lineOption(continueFrom(given, k, ruleId, m + 1))], `this is ${stepName(m + 1)}`),
        ...textDistractors(answer, [lineOption(from[Math.min(m - k - 1, from.length - 1)])], 'counted one step too few from the given step'),
        ...textDistractors(answer, [lineOption(lineAllToEnd(given, ruleId, m - k))], 'moved each element to the very end'),
        ...textDistractors(answer, [lineText([...linesByFormula(given, ruleId).at(-1)].reverse())], 'placed from the wrong end')
      ];
    },
    verify: ({ given, k, m, shown }, value) => agreed(shown, (id) => stepMFromStepKBrute(given, k, id, m).join('|')) === value,
    render({ ruleId, given, k, m, shown }) {
      const steps = [];
      for (let s = k + 1; s <= m; s++) steps.push(`${stepName(s)}: ${lineText(continueFrom(given, k, ruleId, s))}`);
      return {
        context: `A word and number arrangement machine rearranges its input one step at a time. An illustration:\n${stepLines(shown)}\nand so on, by the same rule, until the arrangement is complete.`,
        question: `${stepName(k)} of another input is:\n${lineText(given)}\nWhat is ${stepName(m)} of that input?`,
        explanation: `By ${stepName(k)}, the first ${k === 1 ? 'pick is' : `${k} picks are`} already in place, and the machine carries on from there. ${steps.join('. ')}.`,
        solutionSteps: [`Rule: ${RULES[ruleId].short}.`, `In ${stepName(k)} the first ${k === 1 ? 'pick is' : `${k} picks are`} placed; carry on.`, ...steps],
        method: 'You do not need the input: the elements already placed tell you how far the machine has gone. Continue from the given step.',
        hints: [`How many elements are already in their final places in ${stepName(k)}?`, `The next step is ${stepName(k + 1)}, not Step I: only ${m - k} more step${m - k === 1 ? '' : 's'} to go.`],
        commonMistakes: [`Applying ${m} more steps instead of ${m - k}.`, 'Restarting the count from Step I.']
      };
    }
  },
  {
    id: 'io-gen-rotate-input',
    version: 1,
    topicId: TOPIC,
    conceptId: 'io-reverse',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['io-reverse-f', 'io-sc-rotate'],
    formatValue: (v) => v,
    estimatedSeconds: 80,
    params(rng) {
      const ruleId = rng.pick(ROTATE_RULES);
      const n = rng.int(5, 6);
      const comp = compositionFor(rng, 'word-left-num-right', n);
      const input = makeInput(rng, comp);
      const example = makeInput(rng, comp, new Set(input));
      const shown = runMachine(example, ruleId, { steps: 2 }).lines;
      const k = rng.int(2, n - 1);
      const given = runMachine(input, ruleId, { steps: k }).lines[k];
      return { ruleId, given, k, shown };
    },
    // Undo k steps by rotating k places the other way.
    answer: ({ ruleId, given, k }) => lineText(linesByFormula(given, ruleId === 'rotate-right' ? 'rotate-left' : 'rotate-right', { steps: k })[k]),
    distractors: ({ ruleId, given, k }) => {
      const back = ruleId === 'rotate-right' ? 'rotate-left' : 'rotate-right';
      const answer = lineText(linesByFormula(given, back, { steps: k })[k]);
      return [
        ...textDistractors(answer, [lineText(linesByFormula(given, ruleId, { steps: k })[k])], 'turned the same way again instead of undoing'),
        ...textDistractors(answer, [lineText(linesByFormula(given, back, { steps: k - 1 })[k - 1])], 'undid one step too few'),
        ...textDistractors(answer, [lineText(linesByFormula(given, back, { steps: k + 1 })[k + 1])], 'undid one step too many'),
        ...textDistractors(answer, [lineText([...given].reverse())], 'reversed the line')
      ];
    },
    verify: ({ ruleId, given, k, shown }, value) => {
      // Run each fitting machine forward from the answer: its step k must be the line given.
      const input = value.split(' ');
      const ids = fittingRules(shown[0], shown);
      return ids.includes(ruleId) && ids.every((id) => sameLine(runMachine(input, id, { steps: k }).lines[k], given));
    },
    render({ ruleId, given, k, shown }) {
      const n = given.length;
      const back = ruleId === 'rotate-right' ? 'the first element goes to the back' : 'the last element comes to the front';
      return {
        context: `A machine rearranges its input one step at a time. An illustration:\n${stepLines(shown)}\nand so on, by the same rule in every step.`,
        question: `${stepName(k)} of another input is:\n${lineText(given)}\nWhat was the input?`,
        explanation: `Each step turns the whole line by one place (${RULES[ruleId].short.toLowerCase()}). To undo ${k} steps, turn it ${k} places the other way: ${back}, ${k} times.${k > n / 2 ? ` (Or turn ${n - k} more places the same way: ${n} steps bring the line back to the start.)` : ''}`,
        solutionSteps: [`Rule: ${RULES[ruleId].text}`, `Undo ${k} steps: ${back}, ${k} times.`, `Check by running the machine forward ${k} steps.`],
        method: 'A rotation is undone by rotating the other way, once for every step.',
        hints: ['What does one step of the illustration do to the whole line?', `To go back one step, ${back}. Do it ${k} times.`],
        commonMistakes: ['Rotating the same way as the machine instead of the opposite way.', `Undoing ${k - 1} or ${k + 1} steps instead of ${k}.`]
      };
    }
  },

  /* ------------------------------ arithmetic machines ------------------------------ */
  {
    id: 'io-gen-arith-value',
    version: 1,
    topicId: TOPIC,
    conceptId: 'io-arith',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['io-arith-f'],
    estimatedSeconds: 70,
    params(rng) {
      const ops = rng.pick([
        [{ op: 'mul', k: 2 }, { op: 'add', k: rng.int(1, 9) }],
        [{ op: 'add', k: rng.int(2, 9) }, { op: 'mul', k: 2 }],
        [{ op: 'mul', k: 3 }, { op: 'sub', k: rng.int(1, 9) }],
        [{ op: 'sub', k: rng.int(1, 3) }, { op: 'mul', k: 2 }],
        [{ op: 'add', k: rng.int(3, 12) }]
      ]);
      const input = Array.from({ length: 5 }, () => rng.int(4, 30));
      if (new Set(input).size < 5) return null;
      const k = rng.int(2, ops.length === 1 ? 4 : 3);
      return { ops, input, k, j: rng.int(1, 5) };
    },
    answer: ({ ops, input, k, j }) => {
      const { m, c } = affineAfter(ops, k);
      return m * input[j - 1] + c;
    },
    verify: ({ ops, input, k, j }, value) => arithmeticLines(input, ops, k)[k][j - 1] === value,
    render({ ops, input, k, j }) {
      const lines = arithmeticLines(input, ops, k);
      const ruleText = ops.length === 1 ? `In every step it will ${verb(ops[0])}.` : `In Step I it will ${verb(ops[0])}, in Step II ${verb(ops[1])}, and so on in turn.`;
      return {
        context: `A number machine changes every number of its input in each step, keeping the numbers in their places. ${ruleText}\nInput: ${input.join(' ')}`,
        question: `What is the ${ordinal(j)} number from the left in ${stepName(k)}?`,
        explanation: `Follow only the ${ordinal(j)} number: ${lines.map((line, s) => `${s === 0 ? 'input' : stepName(s)} ${line[j - 1]}`).join(' → ')}.`,
        solutionSteps: lines.slice(1).map((line, s) => `${stepName(s + 1)} (${opText(ops[s % ops.length])}): ${line.join(' ')}`),
        method: 'Numbers keep their places; follow just the one asked for, applying the steps in order.',
        hints: [`Only the ${ordinal(j)} number matters. Start from ${input[j - 1]}.`, 'Apply the operations in their order: × then + is not the same as + then ×.'],
        commonMistakes: ['Applying the operations in the wrong order.', 'Stopping a step early or going one step too far.']
      };
    }
  },
  {
    id: 'io-gen-arith-input',
    version: 1,
    topicId: TOPIC,
    conceptId: 'io-arith',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['io-arith-f', 'io-reverse-f'],
    estimatedSeconds: 90,
    params(rng) {
      const ops = rng.pick([
        [{ op: 'mul', k: 2 }, { op: 'add', k: rng.int(1, 9) }],
        [{ op: 'add', k: rng.int(2, 9) }, { op: 'mul', k: 3 }],
        [{ op: 'mul', k: 3 }, { op: 'sub', k: rng.int(1, 9) }],
        [{ op: 'sub', k: rng.int(1, 5) }, { op: 'mul', k: 2 }]
      ]);
      const input = Array.from({ length: 4 }, () => rng.int(6, 25));
      if (new Set(input).size < 4) return null;
      const k = 3;
      return { ops, given: arithmeticLines(input, ops, k)[k], k, j: rng.int(1, 4) };
    },
    answer: ({ ops, given, k, j }) => arithmeticInput(given[j - 1], ops, k),
    verify: ({ ops, given, k, j }, value) => Number.isInteger(value) && arithmeticLines([value], ops, k)[k][0] === given[j - 1],
    render({ ops, given, k, j }) {
      const undo = [];
      let v = given[j - 1];
      for (let s = k; s >= 1; s--) {
        const op = ops[(s - 1) % ops.length];
        const prev = op.op === 'add' ? v - op.k : op.op === 'sub' ? v + op.k : v / op.k;
        undo.push(`undo ${stepName(s)} (${opText(op)}): ${v} → ${prev}`);
        v = prev;
      }
      return {
        context: `A number machine changes every number in each step, keeping the numbers in their places: in Step I it will ${verb(ops[0])}, in Step II ${verb(ops[1])}, and so on in turn.`,
        question: `${stepName(k)} of an input is:\n${given.join(' ')}\nWhat was the ${ordinal(j)} number of the input?`,
        explanation: `Work backwards, undoing the last step first: ${undo.join('; ')}. The input number was ${v}.`,
        solutionSteps: [...undo, `Check: ${v} through ${k} steps gives ${given[j - 1]}.`],
        method: 'Undo the steps in reverse order: subtract what was added, add what was subtracted, divide what was multiplied.',
        hints: [`Start from ${given[j - 1]} and undo ${stepName(k)} first.`, 'Undoing "multiply by 2" is "divide by 2"; undoing "add 5" is "subtract 5".'],
        commonMistakes: ['Undoing the steps in the forward order.', 'Applying the operations again instead of undoing them.']
      };
    }
  }
];
