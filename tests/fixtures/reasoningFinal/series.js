/**
 * The hand-written questions of reasoning-series (series, analogy and
 * classification), in structured form. Each `texts` list is built from the
 * structure and must appear, in order, in the printed question; `answer()`
 * works the keyed answer out with the solvers in src/utils/reasoning/series.js
 * (tests/reasoning-final-content.test.js compares the two).
 */

import {
  ALPHABET,
  ANALOGY_RULES,
  NUMBER_PROPERTIES,
  analogyAnswers,
  countPattern,
  elementAt,
  fillPatternBrute,
  groupProperties,
  letter,
  letterPairs,
  nextTerms,
  nextTermsOfParts,
  oddOnesByRules,
  pairProperties,
  pos,
  relativeLetter
} from '../../../src/utils/reasoning/series.js';
import { codesFor } from '../../../src/utils/reasoning/coding.js';
import { ordinal } from '../../../src/utils/reasoning/ranking.js';

/** One value, or an error if the methods disagree. */
function only(values) {
  const set = new Set(values.map((v) => JSON.stringify(v)));
  if (!values.length) throw new Error('no solution at all');
  if (set.size !== 1) throw new Error(`answer differs between solutions: ${[...set].join(' | ')}`);
  return values[0];
}

const P = (w) => [...w].map(pos);
const seriesText = (w) => `${[...w].join(', ')}, ?`;
const nextLetter = (w) => letter(only(nextTerms(P(w))));
const pairText = ([a, b]) => `${a} : ${b}`;

const ODD6 = [49, 64, 121, 90];
const PATTERN = 'b_dab_dabc_a_cd';
const SEQ12 = 'M 4 # R 7 K $ 2 P E @ 9 T 5 % B 3 Q'.split(' ');
const ODD14 = ['BDF', 'LNP', 'PRT', 'GJL'];
const SEQ18 = '7 # K 3 @ P 9 % 2 R $ M 5 & D 8 * T 4 # B'.split(' ');
const OPTS19 = [[4, 65], [5, 126], [6, 215], [2, 9], [7, 50]];
const PAIRS20 = [[4, 18], [6, 38], [8, 66], [3, 11], [5, 25]];
const OPTS21 = ['P', 'Q', 'U', 'V', 'Z'];

/** The series continued while it stays in the alphabet. */
function continued(w) {
  const t = P(w);
  for (;;) {
    const next = only(nextTerms(t));
    if (next > 26) return t;
    t.push(next);
  }
}

export const sets = [
  { id: 'reasoning-series-q-001', texts: [ordinal(8), 'to the right', ordinal(11), 'from the left'], answer: () => relativeLetter({ k: 11, end: 'left', m: 8, dir: 'right' }) },
  // Position of R counted from Z: walk the reversed alphabet.
  { id: 'reasoning-series-q-002', texts: ['from Z', 'letter R'], answer: () => [...ALPHABET].reverse().indexOf('R') + 1 },
  { id: 'reasoning-series-q-003', texts: [seriesText('DHLP')], answer: () => nextLetter('DHLP') },
  { id: 'reasoning-series-q-004', texts: [seriesText('ZWTQ')], answer: () => nextLetter('ZWTQ') },
  { id: 'reasoning-series-q-005', texts: ['7 : 49 :: 9 : ?'], answer: () => String(only(analogyAnswers(7, 49, 9))) },
  { id: 'reasoning-series-q-006', texts: [ODD6.join(', ')], answer: () => String(ODD6[only(oddOnesByRules(ODD6, NUMBER_PROPERTIES))]) },
  { id: 'reasoning-series-q-007', texts: ['A3, D6, G9, J12, ?'], answer: () => only(nextTermsOfParts(['A3', 'D6', 'G9', 'J12'])) },
  { id: 'reasoning-series-q-008', texts: [seriesText('CDFIM')], answer: () => nextLetter('CDFIM') },
  { id: 'reasoning-series-q-009', texts: [seriesText('BYDWFU')], answer: () => nextLetter('BYDWFU') },
  { id: 'reasoning-series-q-010', texts: ['AZ, CX, EV, GT, ?'], answer: () => only(nextTermsOfParts(['AZ', 'CX', 'EV', 'GT'])) },
  { id: 'reasoning-series-q-011', texts: [[...PATTERN].join(' ')], answer: () => only(fillPatternBrute(PATTERN)) },
  {
    id: 'reasoning-series-q-012',
    texts: [SEQ12.join(' '), `${ordinal(3)} to the left`, `${ordinal(7)} element from the right`],
    answer: () => elementAt(SEQ12, { k: 7, end: 'right', m: 3, dir: 'left' })
  },
  { id: 'reasoning-series-q-013', texts: ['ACE : DFH :: KMO : ?'], answer: () => only(codesFor({ word: 'ACE', code: 'DFH' }, 'KMO')) },
  { id: 'reasoning-series-q-014', texts: [ODD14.join(', ')], answer: () => ODD14[only(oddOnesByRules(ODD14, groupProperties(ODD14)))] },
  { id: 'reasoning-series-q-015', texts: ['word KITCHEN', 'either direction'], answer: () => letterPairs('KITCHEN').length },
  { id: 'reasoning-series-q-016', texts: [seriesText('ABDH')], answer: () => nextLetter('ABDH') },
  { id: 'reasoning-series-q-017', texts: ['2B, 5E, 10H, 17K, ?'], answer: () => only(nextTermsOfParts(['2B', '5E', '10H', '17K'])) },
  {
    id: 'reasoning-series-q-018',
    texts: [SEQ18.join(' '), 'symbols', 'preceded by a number', 'followed by a letter'],
    answer: () => countPattern(SEQ18, { before: 'N', mid: 'S', after: 'L' })
  },
  {
    id: 'reasoning-series-q-019',
    texts: ['3 : 28'],
    answer: () => {
      const rules = ANALOGY_RULES.filter((r) => r.f(3) === 28);
      return OPTS19.filter(([a, b]) => only(rules.map((r) => r.f(a) === b))).map(pairText);
    }
  },
  { id: 'reasoning-series-q-020', texts: ['odd one out', PAIRS20.map(pairText).join('; ')], answer: () => pairText(PAIRS20[only(oddOnesByRules(PAIRS20, pairProperties()))]) },
  { id: 'reasoning-series-q-021', texts: ['C, F, H, K, M'], answer: () => OPTS21.filter((ch) => continued('CFHKM').includes(pos(ch))) }
];
