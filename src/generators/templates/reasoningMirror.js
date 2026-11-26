/**
 * Mirror, water and paper-folding templates: the mirror image of a clock,
 * letter groups that look the same in a mirror or in water, letters that a
 * mirror leaves unchanged, and paper folded and punched.
 *
 * Clocks: the answer is 12:00 − t; `verify` reflects the two hands and reads
 * the clock again. Letters: the answer comes from the symmetric-letter lists;
 * `verify` flips 5 × 7 drawings of the letters (and checks that no other
 * option also passes). Paper: the answer stacks the layers fold by fold;
 * `verify` reflects the punch across the fold lines instead.
 */

import {
  MIRROR_SAME,
  WATER_SAME,
  foldLayers,
  foldText,
  holesByLayers,
  holesByReflection,
  looksSameInMirror,
  looksSameInMirrorByGlyphs,
  looksSameInWater,
  looksSameInWaterByGlyphs,
  mirrorSymmetric,
  mirrorTime,
  mirrorTimeByHands,
  onFoldLine,
  squareName,
  timeText
} from '../../utils/reasoning/mirror.js';
import { NAMES } from './reasoningShared.js';

const TOPIC = 'mirror-paper-folding';
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NOT_MIRROR = [...ALPHA].filter((c) => !MIRROR_SAME.includes(c));
const NOT_WATER = [...ALPHA].filter((c) => !WATER_SAME.includes(c));

const clockMinutes = ({ hour, minute }) => (hour % 12) * 60 + minute;
const clockOf = (t) => {
  const m = ((t % 720) + 720) % 720;
  return { hour: Math.floor(m / 60) || 12, minute: m % 60 };
};

/** Paper folding: a few folds that always fit, ending with a diagonal fold now and then. */
function randomFolds(rng, size, least = 1) {
  const count = rng.int(least, 3);
  const folds = [];
  for (let i = 0; i < count; i++) {
    const options = ['left', 'right', 'top', 'bottom'].filter((f) => foldLayers(size, [...folds, f]));
    if (!options.length) break;
    folds.push(rng.pick(options));
  }
  if (folds.length < 3 && rng.chance(0.3)) {
    const diag = rng.pick(['diag', 'anti']);
    if (foldLayers(size, [...folds, diag])) folds.push(diag);
  }
  return folds;
}

function randomPunches(rng, size, folds, count) {
  const region = foldLayers(size, folds).region.filter((p) => !onFoldLine(size, folds, p));
  if (region.length < count) return null;
  return rng.shuffle(region).slice(0, count).sort();
}

const paperFigure = (size, folds, punches) => ({
  type: 'paper',
  size,
  folds,
  punches,
  caption: 'The sheet is folded as shown (the shaded part moves over the dashed line), then punched',
  ariaSummary: `A ${size} by ${size} square sheet. ${folds.map((f, i) => `Fold ${i + 1}: ${foldText(f)}.`).join(' ')} Then a hole is punched at ${punches.join(' and ')}.`
});

const listText = (squares) => squares.join(', ');

export const mirrorTemplates = [
  {
    id: 'mp-gen-clock',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mp-clock',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['mp-clock-f', 'mp-sc-clock'],
    formatValue: (v) => v,
    estimatedSeconds: 50,
    params(rng) {
      const hour = rng.int(1, 12);
      const minute = rng.int(0, 11) * 5 + (rng.chance(0.4) ? rng.int(1, 4) : 0);
      if (minute === 0 && rng.chance(0.6)) return null;
      return { hour, minute, reverse: rng.chance(0.3) };
    },
    answer: ({ hour, minute }) => timeText(mirrorTime(hour, minute)),
    distractors: ({ hour, minute }) => {
      const t = clockMinutes({ hour, minute });
      const right = mirrorTime(hour, minute);
      return [
        // 12:60 − t: borrowing done twice (one hour too many).
        { value: timeText(clockOf(right.hour * 60 + right.minute + 60)), why: 'subtracted from 12:60' },
        { value: timeText(clockOf(right.hour * 60 + right.minute - 60)), why: 'subtracted from 11:00' },
        // The water image (18:30 − t), a different reflection.
        { value: timeText(clockOf(1110 - t)), why: 'reflected top to bottom instead of left to right' },
        { value: timeText({ hour, minute }), why: 'the time itself' },
        { value: timeText(clockOf(t + 360)), why: 'six hours on' }
      ];
    },
    verify: ({ hour, minute }, value) => timeText(mirrorTimeByHands(hour, minute)) === value,
    render({ hour, minute, reverse }, { fmt }) {
      const image = mirrorTime(hour, minute);
      const shown = timeText({ hour, minute });
      return {
        question: reverse
          ? `In a mirror, the image of a wall clock appears to show ${shown}. What is the actual time?`
          : `A wall clock shows ${shown}. What time does its image in a plane mirror appear to show?`,
        figure: reverse ? undefined : { type: 'clock', hour, minute, caption: `The clock shows ${shown}`, ariaSummary: `A clock face with the hands at ${shown}.` },
        explanation: `A mirror swaps left and right, so the two times add up to 12:00. Subtract from 11:60 (that is, 12:00): 11:60 − ${shown} = ${fmt(timeText(image))}.${reverse ? ' The same rule works both ways: the mirror image of the mirror image is the actual time.' : ''}`,
        solutionSteps: ['Write 12:00 as 11:60.', `11:60 − ${shown} = ${timeText(image)}.`, `Check: ${shown} + ${timeText(image)} = 12:00.`],
        method: 'Mirror time = 11:60 − actual time (and the other way round).',
        hints: ['A mirror image and the actual time together make 12 hours.', `Work out 11:60 − ${shown}.`],
        commonMistakes: ['Subtracting from 12:60 (one hour too many).', 'Using the water-image rule (18:30 − t) for a mirror.']
      };
    }
  },
  {
    id: 'mp-gen-mirror-word',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mp-mirror',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['mp-mirror-f', 'mp-letters-f'],
    formatValue: (v) => v,
    estimatedSeconds: 60,
    params(rng) {
      const len = rng.int(3, 5);
      const half = Array.from({ length: Math.ceil(len / 2) }, () => rng.pick([...MIRROR_SAME]));
      const answer = [...half, ...half.slice(0, Math.floor(len / 2)).reverse()].join('');
      // Wrong ones: a palindrome with an unsymmetric letter; symmetric letters not reading the same backwards; a water-symmetric one.
      const bad = rng.pick(NOT_MIRROR);
      const pal = [...answer];
      pal[Math.floor(len / 2)] = bad;
      const sym = rng.shuffle([...MIRROR_SAME]).slice(0, len).join('');
      const water = Array.from({ length: len }, () => rng.pick([...'BCDEK'])).join('');
      const others = [...new Set([pal.join(''), sym, water, rng.shuffle([...answer]).join('')])].filter((w) => w !== answer && !looksSameInMirror(w)).slice(0, 3);
      if (others.length < 3) return null;
      return { answer, others, name: rng.pick(NAMES), groups: [answer, ...others].sort() };
    },
    answer: ({ answer }) => answer,
    distractors: ({ others }) => others.map((value) => ({ value, why: 'changes in a mirror' })),
    verify: ({ answer, others }, value) =>
      value === answer && looksSameInMirrorByGlyphs(value) && others.every((w) => !looksSameInMirrorByGlyphs(w)),
    render({ answer, name, groups }, { fmt }) {
      return {
        context: `${name} writes these letter groups in capitals on a card: ${groups.join(', ')}.`,
        question: 'Which of the letter groups looks exactly the same when the card is seen in a plane mirror placed beside it (a vertical mirror)?',
        explanation: `A side mirror reverses the order of the letters and turns each one left to right. ${fmt(answer)} reads the same backwards, and every letter in it (${[...new Set(answer)].join(', ')}) has a vertical line of symmetry, so its image is identical.`,
        solutionSteps: ['Two conditions: the group reads the same backwards, and every letter is symmetric left to right.', 'Symmetric capitals: A H I M O T U V W X Y.', `${answer} passes both.`],
        method: 'Reads the same backwards + only A H I M O T U V W X Y.',
        hints: ['A mirror beside a word reverses the order of the letters.', 'Which capitals look the same flipped left to right? A, H, I, M, O, T, U, V, W, X, Y.'],
        commonMistakes: ['Checking the letters but not the order.', 'Counting B, C, D, E or K as mirror-symmetric (they are symmetric top to bottom, for water images).']
      };
    }
  },
  {
    id: 'mp-gen-water-word',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mp-water',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['mp-water-f', 'mp-letters-f'],
    formatValue: (v) => v,
    estimatedSeconds: 60,
    params(rng) {
      const len = rng.int(3, 5);
      const answer = Array.from({ length: len }, () => rng.pick([...WATER_SAME])).join('');
      const swapOne = (w, pool) => {
        const out = [...w];
        out[rng.int(0, len - 1)] = rng.pick(pool);
        return out.join('');
      };
      const mirrorOnly = Array.from({ length: len }, () => rng.pick([...'AMTUVWY'])).join('');
      const others = [...new Set([swapOne(answer, NOT_WATER), swapOne(answer, NOT_WATER), mirrorOnly, swapOne(answer, [...'AMTUVWY'])])].filter((w) => w !== answer && !looksSameInWater(w)).slice(0, 3);
      if (others.length < 3) return null;
      return { answer, others, name: rng.pick(NAMES), groups: [answer, ...others].sort() };
    },
    answer: ({ answer }) => answer,
    distractors: ({ others }) => others.map((value) => ({ value, why: 'changes in water' })),
    verify: ({ answer, others }, value) =>
      value === answer && looksSameInWaterByGlyphs(value) && others.every((w) => !looksSameInWaterByGlyphs(w)),
    render({ answer, name, groups }, { fmt }) {
      return {
        context: `${name} paints these letter groups in capitals on a board beside a still pond: ${groups.join(', ')}.`,
        question: 'Which of the letter groups looks exactly the same in its water image (its reflection in the water below it)?',
        explanation: `Water turns each letter upside down but keeps their order. Every letter of ${fmt(answer)} (${[...new Set(answer)].join(', ')}) has a horizontal line of symmetry, so the reflection is identical.`,
        solutionSteps: ['A water image flips top and bottom; the order of the letters stays.', 'Capitals symmetric top to bottom: B C D E H I K O X.', `Every letter of ${answer} is on that list.`],
        method: 'Every letter must be one of B C D E H I K O X.',
        hints: ['Imagine each letter upside down (flipped, not turned): does it look the same?', 'Capitals with a horizontal line of symmetry: B, C, D, E, H, I, K, O, X.'],
        commonMistakes: ['Using the mirror list (A, M, T, U, V, W, Y change in water).', 'Reversing the order of the letters, as for a side mirror.']
      };
    }
  },
  {
    id: 'mp-gen-mirror-count',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mp-mirror',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['mp-letters-f'],
    estimatedSeconds: 45,
    params(rng) {
      const words = ['BHARAT', 'MUMBAI', 'TIMETABLE', 'HOLIDAY', 'MONSOON', 'VOTING', 'AUTOMATIC', 'TOMATO', 'WITHOUT', 'MAXIMUM', 'YOUTH', 'HIMALAYA', 'MATHEMATICS', 'TAXATION', 'QUANTITY', 'WHITEWASH', 'OUTPUT', 'TIGER', 'AVIATION'];
      const water = rng.chance(0.3);
      return { word: rng.pick(words), water };
    },
    answer: ({ word, water }) => [...word].filter((c) => (water ? WATER_SAME : MIRROR_SAME).includes(c)).length,
    verify: ({ word, water }, value) => [...word].filter((c) => (water ? looksSameInWaterByGlyphs(c) : mirrorSymmetric(c))).length === value,
    render({ word, water }) {
      const list = water ? WATER_SAME : MIRROR_SAME;
      const keep = [...word].filter((c) => list.includes(c));
      return {
        question: water
          ? `In the water image of the word ${word}, how many of its letters (counting repeats) look exactly as they do in the word itself?`
          : `In the mirror image of the word ${word} (a mirror placed beside it), how many of its letters (counting repeats) look exactly the same as in the word, apart from their position?`,
        explanation: `Letters symmetric ${water ? 'top to bottom' : 'left to right'}: ${[...list].join(' ')}. In ${word} these are ${keep.join(', ') || 'none'}: ${keep.length}.`,
        solutionSteps: [`${water ? 'Water flips top to bottom' : 'A side mirror flips left to right'}.`, `Symmetric capitals: ${[...list].join(' ')}.`, `Count them in ${word}: ${keep.length}.`],
        method: `Count the letters of ${water ? 'B C D E H I K O X' : 'A H I M O T U V W X Y'}.`,
        hints: [`Which capitals look the same ${water ? 'upside down (flipped)' : 'flipped left to right'}?`, 'Go through the word letter by letter, counting repeats.'],
        commonMistakes: [water ? 'Using the mirror list for a water image.' : 'Counting B, C, D, E or K: they flip into different shapes in a side mirror.', 'Counting each different letter once instead of every occurrence.']
      };
    }
  },
  {
    id: 'mp-gen-fold-count',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mp-fold',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['mp-fold-f', 'mp-sc-holes'],
    estimatedSeconds: 50,
    params(rng) {
      const size = rng.pick([4, 4, 8]);
      const folds = randomFolds(rng, size);
      const punches = randomPunches(rng, size, folds, rng.chance(0.7) ? 1 : 2);
      return punches ? { size, folds, punches } : null;
    },
    answer: ({ size, folds, punches }) => holesByLayers(size, folds, punches).length,
    verify: ({ size, folds, punches }, value) => holesByReflection(size, folds, punches).length === value,
    render({ size, folds, punches }) {
      const n = holesByLayers(size, folds, punches).length;
      return {
        question: `A square sheet of paper is folded ${folds.length === 1 ? 'once' : `${folds.length} times`}: ${folds.map((f, i) => `${i ? 'then ' : 'first '}${foldText(f)}`).join('; ')}. ${punches.length === 1 ? 'One hole is' : `${punches.length} holes are`} then punched through all the layers. How many holes are there when the sheet is opened out?`,
        figure: paperFigure(size, folds, punches),
        explanation: `Each fold doubles the layers, so after ${folds.length} fold${folds.length > 1 ? 's' : ''} the paper is ${2 ** folds.length} layers thick wherever it is punched. ${punches.length} punch${punches.length > 1 ? 'es' : ''} × ${2 ** folds.length} layers = ${n} holes.`,
        solutionSteps: [`Layers: 2^${folds.length} = ${2 ** folds.length}.`, `Holes = punches × layers = ${punches.length} × ${2 ** folds.length} = ${n}.`],
        method: 'Holes = punches × 2^(number of folds), when no punch is on a fold.',
        hints: ['How many layers of paper does one fold make?', 'Every punch goes through every layer.'],
        commonMistakes: ['Adding 2 for each fold instead of doubling.', 'Forgetting that a punch goes through every layer.']
      };
    }
  },
  {
    id: 'mp-gen-fold-where',
    version: 1,
    topicId: TOPIC,
    conceptId: 'mp-fold',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['mp-fold-f', 'mp-unfold-f'],
    formatValue: (v) => v,
    estimatedSeconds: 110,
    params(rng) {
      const size = 4;
      const folds = randomFolds(rng, size, 2);
      if (folds.length < 2) return null;
      const punches = randomPunches(rng, size, folds, 1);
      return punches ? { size, folds, punches } : null;
    },
    answer: ({ size, folds, punches }) => listText(holesByLayers(size, folds, punches)),
    distractors: ({ size, folds, punches }) => {
      const out = [];
      const swap = { left: 'top', right: 'bottom', top: 'left', bottom: 'right', diag: 'anti', anti: 'diag' };
      // Unfolding across the wrong line, or only some of the folds.
      for (let i = 0; i < folds.length; i++) {
        const wrong = folds.map((f, j) => (j === i ? swap[f] : f));
        const holes = foldLayers(size, wrong) && foldLayers(size, wrong).region.includes(punches[0]) ? holesByReflection(size, wrong, punches) : null;
        if (holes) out.push({ value: listText(holes), why: 'unfolded across the wrong line' });
      }
      out.push({ value: listText(holesByReflection(size, folds.slice(1), punches)), why: 'forgot the first fold' });
      out.push({ value: listText(holesByReflection(size, folds.slice(0, -1), punches)), why: 'forgot the last fold' });
      const mirrorAll = holesByLayers(size, folds, punches).map((h) => squareName(size - 1 - (h.charCodeAt(0) - 65), Number(h.slice(1)) - 1));
      out.push({ value: listText([...new Set(mirrorAll)].sort()), why: 'flipped the pattern left to right' });
      const flipAll = holesByLayers(size, folds, punches).map((h) => squareName(h.charCodeAt(0) - 65, size - Number(h.slice(1))));
      out.push({ value: listText([...new Set(flipAll)].sort()), why: 'flipped the pattern top to bottom' });
      const turned = holesByLayers(size, folds, punches).map((h) => squareName(size - 1 - (h.charCodeAt(0) - 65), size - Number(h.slice(1))));
      out.push({ value: listText([...new Set(turned)].sort()), why: 'turned the pattern round' });
      // The pattern a punch in a neighbouring square of the folded paper would give.
      for (const other of foldLayers(size, folds).region) {
        if (other !== punches[0] && !onFoldLine(size, folds, other)) out.push({ value: listText(holesByReflection(size, folds, [other])), why: 'placed the punch in the wrong square' });
      }
      return out;
    },
    verify: ({ size, folds, punches }, value) => listText(holesByReflection(size, folds, punches)) === value,
    render({ size, folds, punches }, { fmt }) {
      const holes = holesByLayers(size, folds, punches);
      return {
        question: `A square sheet, ruled into a 4 × 4 grid (columns A–D from the left, rows 1–4 from the top), is folded: ${folds.map((f, i) => `${i ? 'then ' : 'first '}${foldText(f)}`).join('; ')}. A hole is punched through square ${punches[0]} of the folded paper. Which squares have holes when it is opened out?`,
        figure: paperFigure(size, folds, punches),
        explanation: `Unfold in reverse order, reflecting the holes across each fold line: ${folds.length} folds give ${holes.length} holes, at ${fmt(listText(holes))}.`,
        solutionSteps: ['Start with the punched square.', 'Undo the last fold: reflect every hole across that fold line, keeping the originals.', `Repeat for each earlier fold: ${listText(holes)}.`],
        method: 'Unfold last fold first; each unfolding reflects every hole across the fold line.',
        hints: ['Undo the folds in reverse order.', 'Each unfolding adds the mirror image of every hole so far, across that fold line.'],
        commonMistakes: ['Unfolding in the same order as folding.', 'Reflecting across the wrong line (left–right instead of top–bottom).']
      };
    }
  }
];
