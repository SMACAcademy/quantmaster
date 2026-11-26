/**
 * Series and analogy: letters are numbers. An alphabet strip numbers every
 * letter (A = 1 ... Z = 26, and optionally from the Z end, 27 − n); the terms
 * of a letter series are marked on it, with an arc and the gap between each
 * term and the next. The rule is read off the gaps with the same solver the
 * question generators use (src/utils/reasoning/series.js).
 * Plot kind: strip (components/reasoningPlotsSeries.js).
 */

import { diffCascade, letter, nextTerms, pos, ruleText, seriesRules, signedStep, stepsOf } from '../utils/reasoning/series.js';

const onOff = [
  { id: 'off', label: 'Off' },
  { id: 'on', label: 'On' }
];

/** Preset series, each settled by exactly one rule from its letters. */
const PRESETS = {
  s1: { label: 'C, F, I, L, ?', letters: 'CFIL' },
  s2: { label: 'B, C, E, H, L, ?', letters: 'BCEHL' },
  s3: { label: 'Z, X, U, Q, L, ?', letters: 'ZXUQL' },
  s4: { label: 'A, Z, C, X, E, ?', letters: 'AZCXE' },
  s5: { label: 'D, G, F, I, H, ?', letters: 'DGFIH' }
};

const list = (items) => items.join(', ');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const alphabetStrip = {
  id: 'alphabet-strip',
  topicId: 'reasoning-series',
  title: 'Letters are numbers',
  summary: 'Mark a letter series on a numbered alphabet strip and read the gaps between the terms: a constant gap, gaps that grow, gaps that alternate, or two series taking turns. Switch on positions from the Z end (27 − n) to see a falling series rise.',
  controls: [
    { id: 'series', label: 'Series', type: 'choice', options: Object.entries(PRESETS).map(([id, p]) => ({ id, label: p.label })), default: 's1' },
    { id: 'shown', label: 'Terms marked', type: 'range', min: 2, max: 6, step: 1, default: 2 },
    { id: 'reverse', label: 'Positions from the Z end (27 − n)', type: 'choice', options: onOff, default: 'off' }
  ],
  compute({ series, shown, reverse }) {
    const preset = PRESETS[series];
    const given = [...preset.letters].map(pos);
    const [answer] = nextTerms(given);
    const all = [...given, answer];
    const count = Math.min(shown, all.length);
    const marked = all.slice(0, count);
    const revealed = count === all.length;
    const gaps = stepsOf(marked);
    const [rule] = seriesRules(given);
    const fromZ = reverse === 'on';
    const values = (ps) => (fromZ ? ps.map((p) => 27 - p) : ps);
    const shownValues = values(marked);
    const shownGaps = stepsOf(shownValues);
    const cascade = diffCascade(given);
    const terms = all.map((p, i) => ({
      at: p,
      value: fromZ ? 27 - p : p,
      letter: letter(p),
      order: i + 1,
      state: i >= count ? 'hidden' : i === given.length ? 'answer' : i === count - 1 ? 'new' : 'shown'
    }));
    return {
      numbers: { series, count, revealed, answer: letter(answer), positions: marked, gaps, reverse: fromZ, rule: rule.kind, cascade: cascade.kind },
      readouts: [
        { label: 'Letters marked', value: list(marked.map(letter)) },
        { label: fromZ ? 'Positions from the Z end' : 'Positions (A = 1)', value: list(shownValues) },
        { label: 'Gaps', value: shownGaps.length ? list(shownGaps.map(signedStep)) : 'Mark one more term' },
        { label: 'Rule from the gaps', value: count >= Math.min(given.length, 4) ? ruleText(rule) : 'Not enough terms yet' },
        { label: 'Next letter', value: revealed ? `${letter(answer)} (${fromZ ? `${27 - answer} from Z` : answer})` : '?' }
      ],
      plot: {
        kind: 'strip',
        reverse: fromZ,
        terms,
        gaps: shownGaps,
        summary: `Alphabet strip numbered ${fromZ ? 'from the Z end (Z = 1 ... A = 26)' : 'A = 1 to Z = 26'}. Marked: ${marked
          .map((p, i) => `${letter(p)} (${shownValues[i]})`)
          .join(', ')}${shownGaps.length ? `; gaps ${list(shownGaps.map(signedStep))}` : ''}.${revealed ? ` The next letter is ${letter(answer)}.` : ''}`
      },
      insight: revealed
        ? `${cap(ruleText(rule))}, so the next letter is ${letter(answer)}.`
        : fromZ
          ? 'Counted from the Z end the same letters have positions 27 − n, and every gap changes sign: a falling series rises.'
          : count < 4
            ? 'Two or three terms fit many rules. Mark more terms before trusting a pattern.'
            : rule.kind === 'interleave'
              ? 'The gaps zigzag with no single pattern: look at every other term instead. Two series are taking turns.'
              : `The gaps so far: ${list(gaps.map(signedStep))}. Mark the next term to check the rule.`
    };
  },
  tasks: [
    {
      id: 'growing',
      prompt: 'Reveal the next letter of B, C, E, H, L, where every gap is one more than the last.',
      check: (values, n) => n.series === 's2' && n.revealed,
      solution: { series: 's2', shown: 6 }
    },
    {
      id: 'from-z',
      prompt: 'Mark all of Z, X, U, Q, L and count from the Z end: the gaps turn positive.',
      check: (values, n) => n.series === 's3' && n.reverse && n.count >= 5,
      solution: { series: 's3', shown: 5, reverse: 'on' }
    },
    {
      id: 'two-series',
      prompt: 'Find the series that is really two series taking turns, and reveal its next letter.',
      check: (values, n) => n.rule === 'interleave' && n.revealed,
      solution: { series: 's4', shown: 6 }
    },
    {
      id: 'alternating',
      prompt: 'Find the series whose gaps alternate between two values, and mark five of its terms.',
      check: (values, n) => n.rule === 'alt' && n.count >= 5,
      solution: { series: 's5', shown: 5 }
    }
  ]
};

export const seriesSims = [alphabetStrip];
