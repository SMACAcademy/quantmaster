/**
 * Coding-decoding templates: a coded example, then a new word to code (or a
 * code to decode) by the same rule; number codes; and codes from sentences.
 *
 * The answer applies the hidden rule. `verify` forgets the rule: it tries every
 * rule in a wide family (all shifts, alternating and growing shifts, opposites,
 * reversals, pair swaps) against the printed example, using a lookup table
 * rather than character codes, and needs every rule that fits to give the same
 * answer. So an example that two rules explain differently is never printed.
 * Sentence codes are checked by trying every way of giving the words codes.
 */

import {
  applyRule,
  codesFor,
  decodeWord,
  numberCode,
  numberCodeByTable,
  NUMBER_KINDS,
  pos,
  ruleText,
  solveSentences,
  wordsFor
} from '../../utils/reasoning/coding.js';

const TOPIC = 'coding-decoding';

export const WORDS = [
  'MANGO', 'RIVER', 'TABLE', 'TRAIN', 'LOTUS', 'TIGER', 'DELHI', 'CHAIR', 'PAPER', 'GREEN', 'BRICK', 'CLOUD', 'SUGAR', 'LEMON',
  'NORTH', 'PLANT', 'STONE', 'WATER', 'BREAD', 'CANDY', 'FRUIT', 'HOUSE', 'KNIFE', 'MOUSE', 'PEARL', 'QUEEN', 'SPICE', 'TOWEL',
  'BOOK', 'KITE', 'RICE', 'DOSA', 'BANK', 'GOLD', 'MILK', 'ROAD', 'SALT', 'TEAK', 'WIND', 'FISH', 'LAMP', 'DRUM',
  'BUTTER', 'CAMERA', 'GARDEN', 'MARKET', 'PENCIL', 'SCHOOL', 'TEMPLE', 'WINTER', 'PLANET', 'SILVER'
];

const pickTwo = (rng, list, sameLength = false) => {
  const a = rng.pick(list);
  const pool = list.filter((w) => w !== a && (!sameLength || w.length === a.length));
  return [a, rng.pick(pool)];
};

/** A code question: example word → code; ask for another word's code. */
function encodeTemplate({ id, conceptId, difficulty, formulaIds, makeRule, method, hints, mistakes, wrongRules, estimatedSeconds = 60 }) {
  return {
    id,
    version: 1,
    topicId: TOPIC,
    conceptId,
    difficulty,
    type: 'single_choice',
    formulaIds,
    formatValue: (v) => v,
    estimatedSeconds,
    params(rng) {
      const rule = makeRule(rng);
      const [word, target] = pickTwo(rng, WORDS);
      return { rule, word, code: applyRule(word, rule), target };
    },
    answer: ({ rule, target }) => applyRule(target, rule),
    distractors: ({ rule, target }) => wrongRules(rule).map((r) => ({ value: applyRule(target, r.rule), why: r.why })).filter((d) => d.value !== target),
    verify: ({ word, code, target }, value) => {
      const codes = codesFor({ word, code }, target);
      return codes.length === 1 && codes[0] === value;
    },
    render({ rule, word, code, target }, { fmt }) {
      const answer = applyRule(target, rule);
      return {
        question: `In a certain code, ${word} is written as ${code}. How is ${target} written in that code?`,
        explanation: `Compare ${word} with ${code} letter by letter: ${ruleText(rule)}. Doing the same to ${target} gives ${fmt(answer)}.`,
        solutionSteps: [
          `Write the positions (A = 1 ... Z = 26) under ${word} and under ${code}.`,
          `The rule: ${ruleText(rule)}.`,
          `${target} → ${answer}.`
        ],
        method,
        hints,
        commonMistakes: mistakes
      };
    }
  };
}

const shifted = (rule, k) => ({ ...rule, ks: rule.ks.map((x) => x + k) });

export const codingTemplates = [
  encodeTemplate({
    id: 'cd-gen-shift',
    conceptId: 'cd-shift',
    difficulty: 'easy',
    formulaIds: ['cd-positions-f', 'cd-shift-f', 'cd-sc-ejoty'],
    makeRule: (rng) => ({ kind: 'shift', ks: [rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5])] }),
    wrongRules: (rule) => [
      { rule: { kind: 'shift', ks: [-rule.ks[0]] }, why: 'shifted the wrong way' },
      { rule: shifted(rule, 1), why: 'one place too far' },
      { rule: shifted(rule, -1), why: 'one place short' },
      { rule: { kind: 'reverse', k: rule.ks[0] }, why: 'also reversed the word' }
    ],
    method: 'Find the shift from one letter pair, check it on every letter, then apply it.',
    hints: ['Compare the first letter of the word with the first letter of the code: how many places apart are they?', 'Check that the same shift works for every letter, wrapping from Z back to A.'],
    mistakes: ['Shifting backwards instead of forwards.', 'Forgetting to wrap round: Z + 1 is A.']
  }),
  encodeTemplate({
    id: 'cd-gen-alternate',
    conceptId: 'cd-shift',
    difficulty: 'medium',
    formulaIds: ['cd-positions-f', 'cd-shift-f'],
    makeRule: (rng) => {
      const a = rng.pick([-3, -2, -1, 1, 2, 3]);
      const b = rng.pick([-3, -2, -1, 1, 2, 3].filter((x) => x !== a));
      return { kind: 'shift', ks: [a, b] };
    },
    wrongRules: (rule) => [
      { rule: { kind: 'shift', ks: [rule.ks[1], rule.ks[0]] }, why: 'started the alternation on the wrong letter' },
      { rule: { kind: 'shift', ks: [rule.ks[0]] }, why: 'used the first shift for every letter' },
      { rule: { kind: 'shift', ks: [rule.ks[1]] }, why: 'used the second shift for every letter' },
      { rule: { kind: 'shift', ks: [-rule.ks[0], -rule.ks[1]] }, why: 'shifted the wrong way' }
    ],
    method: 'Work out the shift letter by letter; here the shifts alternate.',
    hints: ['Write the shift under each letter: it is not the same for every letter.', 'The shifts repeat in a pattern of two: 1st, 3rd, 5th letters move one way; 2nd, 4th, 6th another.'],
    mistakes: ['Checking only the first letter and assuming one shift for the whole word.', 'Starting the alternation on the wrong letter.']
  }),
  encodeTemplate({
    id: 'cd-gen-opposite',
    conceptId: 'cd-opposite',
    difficulty: 'easy',
    formulaIds: ['cd-opposite-f', 'cd-sc-pairs'],
    makeRule: (rng) => (rng.chance(0.5) ? { kind: 'opposite' } : { kind: 'opposite-reverse' }),
    wrongRules: (rule) => [
      { rule: rule.kind === 'opposite' ? { kind: 'opposite-reverse' } : { kind: 'opposite' }, why: rule.kind === 'opposite' ? 'also reversed the word' : 'forgot to reverse the word' },
      { rule: { kind: 'reverse', k: 0 }, why: 'only reversed the word' },
      { rule: { kind: 'shift', ks: [13] }, why: 'shifted by 13 instead of taking opposites' },
      { rule: { kind: 'shift', ks: [1] }, why: 'shifted by one' }
    ],
    method: 'Opposite letters add to 27 (A + Z, B + Y, ...). Check whether the order is also reversed.',
    hints: ['Is the first code letter the opposite of the first letter, or of the last?', 'Opposite pairs: A–Z, B–Y, C–X, D–W, E–V, ... M–N; positions add to 27.'],
    mistakes: ['Taking 26 − position instead of 27 − position.', 'Missing that the word is also written backwards.']
  }),
  encodeTemplate({
    id: 'cd-gen-mixed',
    conceptId: 'cd-mixed',
    difficulty: 'medium',
    formulaIds: ['cd-mixed-f', 'cd-shift-f'],
    estimatedSeconds: 80,
    makeRule: (rng) => (rng.chance(0.5) ? { kind: 'reverse', k: rng.pick([-2, -1, 1, 2]) } : { kind: 'pairs', k: rng.pick([-1, 0, 1, 2]) }),
    wrongRules: (rule) => [
      { rule: { kind: 'shift', ks: [rule.k || 1] }, why: 'missed the change of order' },
      { rule: { kind: rule.kind, k: -rule.k || 1 }, why: 'shifted the wrong way' },
      { rule: { kind: rule.kind === 'reverse' ? 'pairs' : 'reverse', k: rule.k }, why: 'used the wrong reordering' },
      { rule: { kind: rule.kind, k: rule.k + 1 }, why: 'one place too far' }
    ],
    method: 'First decide how the order changes (reversed, pairs swapped), then the shift.',
    hints: ['Look for the word’s letters (or their neighbours) in the code: are they in the same order?', 'Undo the reordering first; then the shift is the same for every letter.'],
    mistakes: ['Comparing letters in the same place when the order has changed.', 'Applying the shift before reordering when the example shows it the other way (here the order does not matter, but check).']
  }),
  {
    id: 'cd-gen-decode',
    version: 1,
    topicId: TOPIC,
    conceptId: 'cd-mixed',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['cd-mixed-f'],
    formatValue: (v) => v,
    estimatedSeconds: 90,
    params(rng) {
      const rule = rng.pick([
        { kind: 'reverse', k: rng.pick([-2, -1, 1, 2]) },
        { kind: 'shift', ks: [rng.pick([-3, -2, 2, 3]), rng.pick([-1, 1])] },
        { kind: 'opposite-reverse' },
        { kind: 'pairs', k: rng.pick([-1, 1]) }
      ]);
      const [word, target] = pickTwo(rng, WORDS);
      return { rule, word, code: applyRule(word, rule), target, targetCode: applyRule(target, rule) };
    },
    answer: ({ target }) => target,
    distractors: ({ rule, targetCode, target }) => {
      const out = [];
      const tries = [
        { kind: 'shift', ks: [1] },
        { kind: 'shift', ks: [-1] },
        { kind: 'reverse', k: 0 },
        rule.kind === 'reverse' ? { kind: 'reverse', k: -rule.k } : rule.kind === 'pairs' ? { kind: 'pairs', k: -rule.k } : { kind: 'opposite' }
      ];
      for (const r of tries) out.push({ value: decodeWord(targetCode, r), why: 'decoded with the wrong rule' });
      out.push({ value: [...target].reverse().join(''), why: 'forgot to put the letters back in order' });
      return out;
    },
    verify: ({ word, code, targetCode }, value) => {
      const words = wordsFor({ word, code }, targetCode);
      return words.length === 1 && words[0] === value;
    },
    render({ rule, word, code, targetCode }, { fmt }) {
      return {
        question: `In a certain code, ${word} is written as ${code}. In the same code, which word is written as ${targetCode}?`,
        explanation: `From the example, ${ruleText(rule)}. Undo that for ${targetCode}: it stands for ${fmt(decodeWord(targetCode, rule))}.`,
        solutionSteps: [`Find the rule from ${word} → ${code}: ${ruleText(rule)}.`, 'Decoding runs the rule backwards: undo the shift, then the reordering.', `${targetCode} → ${decodeWord(targetCode, rule)}.`],
        method: 'Find the coding rule, then run it backwards.',
        hints: ['Find the rule from the example first.', 'To decode, shift the other way and undo any reversal or swapping.'],
        commonMistakes: ['Applying the rule forwards again instead of backwards.', 'Forgetting to undo the reversal.']
      };
    }
  },
  {
    id: 'cd-gen-number',
    version: 1,
    topicId: TOPIC,
    conceptId: 'cd-number',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['cd-positions-f', 'cd-number-f'],
    estimatedSeconds: 70,
    params(rng) {
      const kind = rng.pick(NUMBER_KINDS);
      const [word, target] = pickTwo(rng, WORDS.filter((w) => w.length <= 5));
      return { kind, word, value: numberCode(word, kind), target };
    },
    answer: ({ kind, target }) => numberCode(target, kind),
    // Every number rule that fits the example must give the same code for the new word.
    verify: ({ word, value, target }, answer) => {
      const fitting = NUMBER_KINDS.filter((k) => numberCodeByTable(word, k) === value);
      return fitting.length >= 1 && fitting.every((k) => numberCodeByTable(target, k) === answer);
    },
    render({ kind, word, value, target }) {
      const ps = (w) => [...w].map(pos);
      const how = {
        sum: (w) => `${ps(w).join(' + ')} = ${numberCode(w, 'sum')}`,
        opposite: (w) => `${ps(w).map((p) => 27 - p).join(' + ')} = ${numberCode(w, 'opposite')} (opposite positions, 27 − p)`,
        double: (w) => `2 × (${ps(w).join(' + ')}) = ${numberCode(w, 'double')}`,
        length: (w) => `${w.length} × (${ps(w).join(' + ')}) = ${numberCode(w, 'length')}`
      }[kind];
      return {
        question: `In a certain code, ${word} is written as ${value}. What number is ${target} written as in that code?`,
        explanation: `Check the example: ${word} → ${how(word)}. So ${target} → ${how(target)}.`,
        solutionSteps: [`Letter positions of ${word}: ${ps(word).join(', ')} (sum ${numberCode(word, 'sum')}).`, `Compare with ${value}: ${how(word)}.`, `${target}: ${how(target)}.`],
        method: 'Add the letter positions and see how the sum relates to the code (equal, double, times the length, or the opposite positions).',
        hints: [`Add the positions of the letters of ${word} (A = 1 ... Z = 26). How does that compare with ${value}?`, 'Try: the sum itself, twice the sum, the sum times the number of letters, or the opposite letters (27 − p).'],
        commonMistakes: ['Miscounting a letter’s position: use EJOTY (E 5, J 10, O 15, T 20, Y 25).', 'Using 26 − p for the opposite letter.']
      };
    }
  },
  {
    id: 'cd-gen-sentence',
    version: 1,
    topicId: TOPIC,
    conceptId: 'cd-sentence',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['cd-sentence-f'],
    formatValue: (v) => `‘${v}’`,
    estimatedSeconds: 100,
    params(rng) {
      const vocab = rng.shuffle(['sun', 'rain', 'hot', 'cold', 'day', 'night', 'tea', 'is', 'very', 'good', 'sweet', 'milk', 'warm', 'nice']).slice(0, 6);
      const codes = rng.shuffle(['ka', 'mo', 'ti', 'pu', 're', 'zi', 'lo', 'na', 'fe', 'gu']).slice(0, 6);
      const codeOf = Object.fromEntries(vocab.map((w, i) => [w, codes[i]]));
      // Three sentences of three words each, every word used at least once.
      const sentences = [];
      for (let i = 0; i < 3; i++) {
        const words = rng.shuffle(vocab).slice(0, 3);
        sentences.push({ words, codes: rng.shuffle(words.map((w) => codeOf[w])) });
      }
      if (new Set(sentences.flatMap((s) => s.words)).size !== 6) return null;
      // Ask about a word the sentences settle.
      const solutions = solveSentences(sentences);
      if (!solutions.length) return null;
      const settled = vocab.filter((w) => new Set(solutions.map((m) => m.get(w))).size === 1);
      if (!settled.length) return null;
      const word = rng.pick(settled);
      return { sentences, codeOf, word };
    },
    answer: ({ codeOf, word }) => codeOf[word],
    distractors: ({ sentences, codeOf, word }) => {
      const mine = sentences.filter((s) => s.words.includes(word)).flatMap((s) => s.codes);
      return [...new Set([...mine, ...Object.values(codeOf)])].map((value) => ({ value, why: 'the code of another word' }));
    },
    verify: ({ sentences, word }, value) => {
      const solutions = solveSentences(sentences);
      return solutions.length > 0 && solutions.every((m) => m.get(word) === value);
    },
    render({ sentences, codeOf, word }, { fmt }) {
      const lines = sentences.map((s) => `‘${s.words.join(' ')}’ is written as ‘${s.codes.join(' ')}’.`);
      const withWord = sentences.filter((s) => s.words.includes(word));
      return {
        context: `In a certain code language:\n${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}`,
        question: `What is the code for ‘${word}’?`,
        explanation: `${withWord.length > 1 ? `‘${word}’ appears in sentences ${sentences.map((s, i) => (s.words.includes(word) ? i + 1 : null)).filter(Boolean).join(' and ')}; the only code common to them${withWord.length === 2 ? ' both' : ''} that no other word can take is ${fmt(codeOf[word])}.` : `Settle the other words of its sentence first (each from the sentences they share); the code left over for ‘${word}’ is ${fmt(codeOf[word])}.`} Codes: ${Object.entries(codeOf).map(([w, c]) => `${w} = ${c}`).join(', ')}.`,
        solutionSteps: [
          'A word and its code appear in exactly the same sentences.',
          'Compare sentences two at a time: the common word gets the common code.',
          `‘${word}’ = ‘${codeOf[word]}’.`
        ],
        method: 'Common word ↔ common code; then eliminate.',
        hints: [`Which sentences contain ‘${word}’? Which codes do they share?`, 'If two codes are shared, settle the other shared word from a third sentence.'],
        commonMistakes: ['Assuming the codes are in the same order as the words.', 'Picking a shared code that belongs to another shared word.']
      };
    }
  }
];
