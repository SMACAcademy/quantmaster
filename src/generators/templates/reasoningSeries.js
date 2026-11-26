/**
 * Series, analogy and classification templates: letter positions and letter
 * pairs in a word, letter series (constant, growing, alternating and
 * interleaved gaps; groups of letters; repeating patterns with blanks),
 * alphanumeric series and positions in a mixed sequence, number and letter
 * analogies, and the odd one out.
 *
 * Every answer is worked out one way and `verify` checks it another
 * (utils/reasoning/series.js): series by trying every rule in a family (and
 * refusing a series two rules continue differently) against reading the
 * differences; positions by arithmetic against walking along the alphabet;
 * patterns by trying every filling against filling from the repeating block;
 * analogies by every rule in a family against residues from squares and cubes
 * (letter analogies against the coding-decoding rule family); odd one out by
 * a family of properties against a signature the other three share.
 */

import {
  ANALOGY_RULES,
  NUMBER_PROPERTIES,
  analogyAnswers,
  analogyByResidue,
  diffCascade,
  elementAt,
  elementAtWalk,
  fillPatternBrute,
  fillPatternByClasses,
  formatTerm,
  gapSignature,
  groupProperties,
  kindOf,
  letter,
  letterPairs,
  letterPairsByCounting,
  nextTerms,
  nextTermsOfParts,
  nextTermOfPartsByCascade,
  oddBySignature,
  oddOnesByRules,
  pairProperties,
  parseTerm,
  pos,
  relativeLetter,
  relativeLetterWalk,
  ruleText,
  seriesRules,
  signedStep,
  stepsOf,
  countPattern,
  countPatternByRegex
} from '../../utils/reasoning/series.js';
import { codesFor } from '../../utils/reasoning/coding.js';
import { ordinal } from '../../utils/reasoning/ranking.js';

const TOPIC = 'reasoning-series';
const text = (v) => v;
const list = (items) => items.join(', ');
const only = (values) => (values.length === 1 ? values[0] : null);
const lettersOf = (ps) => ps.map(letter);
/** Letters joined into a group, or null if any fell off the alphabet. */
const lettersWord = (arr) => (arr.every(Boolean) ? arr.join('') : null);

/* ------------------------------ series rules used to build questions ------------------------------ */

/** Build terms (positions) for a rule kind with random numbers; null if they leave 1..26. */
function buildLetterSeries(rng, kind, count) {
  const t = [];
  if (kind === 'add') {
    const d = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5, 6]);
    t.push(startFor(rng, d * count));
    for (let i = 1; i <= count; i++) t.push(t[i - 1] + d);
  } else if (kind === 'grow') {
    let step = rng.int(-2, 3);
    const s = rng.pick([-1, 1, 2]);
    t.push(rng.int(1, 26));
    for (let i = 1; i <= count; i++) {
      t.push(t[i - 1] + step);
      step += s;
    }
  } else if (kind === 'alt') {
    const d1 = rng.pick([-3, -2, -1, 1, 2, 3, 4, 5]);
    const d2 = rng.pick([-3, -2, -1, 1, 2, 3, 4, 5].filter((x) => x !== d1));
    t.push(rng.int(1, 26));
    for (let i = 1; i <= count; i++) t.push(t[i - 1] + (i % 2 ? d1 : d2));
  } else if (kind === 'interleave') {
    const p = rng.pick([-3, -2, -1, 1, 2, 3, 4]);
    const q = rng.pick([-3, -2, -1, 1, 2, 3, 4].filter((x) => x !== p));
    t.push(rng.int(1, 26), rng.int(1, 26));
    for (let i = 2; i <= count; i++) t.push(t[i - 2] + (i % 2 ? q : p));
  } else if (kind === 'times') {
    let step = rng.pick([1, -1]);
    t.push(rng.int(1, 26));
    for (let i = 1; i <= count; i++) {
      t.push(t[i - 1] + step);
      step *= 2;
    }
  }
  return t.every((p) => p >= 1 && p <= 26) ? t : null;
}

/** Wrong next letters, each a named slip. */
function seriesDistractors(terms, answer) {
  const gaps = stepsOf(terms);
  const last = terms.at(-1);
  return [
    { value: letter(last + gaps.at(-1)), why: 'repeated the last gap instead of following the pattern of gaps' },
    { value: letter(answer + 1), why: 'counted one letter too many' },
    { value: letter(answer - 1), why: 'counted one letter too few' },
    { value: letter(last + gaps[0]), why: 'used the first gap again' },
    { value: letter(last - (answer - last)), why: 'counted the gap the wrong way' },
    { value: letter(answer + 2), why: 'counted two letters too many' }
  ];
}

/** A start that keeps start + span inside 1..26. */
function startFor(rng, span) {
  return span >= 0 ? rng.int(1, Math.max(1, 26 - span)) : rng.int(Math.min(26, 1 - span), 26);
}

/* ------------------------------ words, symbols, names ------------------------------ */

const PAIR_WORDS = [
  'MONKEY', 'BRIGHT', 'PLANET', 'STREAM', 'GARDEN', 'MARKET', 'PENCIL', 'TEMPLE', 'WINTER', 'SILVER', 'HOLIDAY', 'KITCHEN',
  'FIELD', 'CRADLE', 'DOCTOR', 'FLIGHT', 'JUNGLE', 'HEALTH', 'NATIONAL', 'MANGO', 'DIGEST', 'FORMAL', 'STRING', 'COUNTRY',
  'PROBLEM', 'HIGHEST', 'MOTHER', 'LIGHTS', 'BLANKET', 'FARMING', 'GOLDEN', 'DEFAULT', 'HOSTEL', 'QUARTER', 'MIRACLE',
  'FESTIVAL', 'RANGOLI', 'MONSOON', 'BAZAAR', 'CRICKET', 'VILLAGE', 'HARBOUR', 'STATION', 'LANTERN', 'SANDALS', 'COCONUT', 'BISCUIT',
  'CHAPATI', 'PICKLE', 'KINGDOM', 'DOLPHIN', 'EDUCATION', 'JOURNEY', 'MAGNETIC', 'NUMBERS'
];
const SYMBOLS = ['@', '#', '$', '%', '&', '*'];
const SEQ_LETTERS = 'ABDEFGHJKLMPQRTUWY';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
/** "6 − 5" or "6 + 5". */
const plus = (a, d) => `${a} ${d < 0 ? '−' : '+'} ${Math.abs(d)}`;

export const seriesTemplates = [
  /* ------------------------------ letter positions ------------------------------ */
  {
    id: 'rs-gen-position',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-positions',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['rs-position-f', 'rs-relative-f'],
    formatValue: text,
    estimatedSeconds: 40,
    params(rng) {
      const k = rng.int(3, 24);
      const end = rng.pick(['left', 'right']);
      const m = rng.int(2, 12);
      const dir = rng.pick(['left', 'right']);
      if (!relativeLetter({ k, end, m, dir })) return null;
      return { k, end, m, dir };
    },
    answer: (p) => relativeLetter(p),
    distractors: ({ k, end, m, dir }) => {
      const base = end === 'left' ? k : 27 - k;
      const wrongBase = end === 'left' ? 27 - k : k;
      const sign = dir === 'right' ? 1 : -1;
      return [
        { value: letter(wrongBase + sign * m), why: 'counted the first position from the wrong end' },
        { value: letter(base - sign * m), why: 'moved the wrong way' },
        { value: letter(base + sign * (m - 1)), why: 'counted the starting letter as one of the moves' },
        { value: letter(base + sign * (m + 1)), why: 'moved one place too far' },
        { value: letter(26 - k + sign * m), why: 'used 26 − k instead of 27 − k' }
      ];
    },
    verify: (p, value) => relativeLetterWalk(p) === value,
    render({ k, end, m, dir }, { fmt }) {
      const base = end === 'left' ? k : 27 - k;
      const target = base + (dir === 'right' ? m : -m);
      return {
        question: `In the English alphabet, which letter is the ${ordinal(m)} to the ${dir} of the ${ordinal(k)} letter from the ${end}?`,
        explanation: `${end === 'left' ? `The ${ordinal(k)} letter from the left is ${letter(base)} (${base}).` : `The ${ordinal(k)} letter from the right is the (27 − ${k}) = ${ordinal(base)} from the left, ${letter(base)}.`} Moving ${m} to the ${dir}: ${base} ${dir === 'right' ? '+' : '−'} ${m} = ${target}, which is ${fmt(letter(target))}.`,
        solutionSteps: [
          end === 'left' ? `${ordinal(k)} from the left = position ${k} = ${letter(base)}.` : `${ordinal(k)} from the right = 27 − ${k} = ${base} from the left = ${letter(base)}.`,
          `${dir === 'right' ? 'To the right adds' : 'To the left subtracts'}: ${base} ${dir === 'right' ? '+' : '−'} ${m} = ${target}.`,
          `Position ${target} is ${letter(target)}.`
        ],
        method: 'Turn every count into a position from the left (k from the right is 27 − k), then add for "to the right" and subtract for "to the left".',
        hints: [end === 'right' ? `The ${ordinal(k)} letter from the right is 27 − ${k} from the left.` : `Which letter is ${ordinal(k)} from the left?`, `Now ${dir === 'right' ? 'add' : 'subtract'} ${m} to that position.`],
        commonMistakes: ['Counting the first position from the wrong end.', 'Using 26 − k for a position from the right (it is 27 − k).', 'Moving the wrong way.']
      };
    }
  },
  {
    id: 'rs-gen-pairs',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-positions',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['rs-pairs-f'],
    estimatedSeconds: 100,
    params(rng) {
      return { word: rng.pick(PAIR_WORDS) };
    },
    answer: ({ word }) => letterPairs(word).length,
    verify: ({ word }, value) => letterPairsByCounting(word) === value,
    render({ word }) {
      const pairs = letterPairs(word);
      return {
        question: `How many pairs of letters in the word ${word} have as many letters between them in the word as there are between them in the English alphabet (counting in either direction)?`,
        explanation: pairs.length
          ? `Write the positions: ${[...word].map((ch) => `${ch} ${pos(ch)}`).join(', ')}. A pair counts when the difference of positions equals how far apart the letters are in the word. That happens for ${pairs.join(', ')}: ${pairs.length} pair${pairs.length === 1 ? '' : 's'}.`
          : `Write the positions: ${[...word].map((ch) => `${ch} ${pos(ch)}`).join(', ')}. For no two letters does the difference of positions equal how far apart they are in the word, so there are 0 pairs.`,
        solutionSteps: [`Positions: ${[...word].map((ch) => `${ch} = ${pos(ch)}`).join(', ')}.`, 'For letters d places apart in the word, check whether their positions differ by exactly d.', `Pairs found: ${pairs.length ? pairs.join(', ') : 'none'}.`],
        method: 'Letters next to each other must be next to each other in the alphabet; letters two apart must differ by 2; and so on, in either direction.',
        hints: ['Write each letter’s position under it.', 'Check neighbours first (difference 1), then letters two apart (difference 2), and so on.'],
        commonMistakes: ['Counting only forward pairs and missing pairs like ON (backwards in the alphabet).', 'Comparing letters between the pair instead of the difference of positions.']
      };
    }
  },

  /* ------------------------------ letter series ------------------------------ */
  {
    id: 'rs-gen-letter-step',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-letter-series',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['rs-position-f', 'rs-gaps-f'],
    formatValue: text,
    estimatedSeconds: 40,
    params(rng) {
      const all = buildLetterSeries(rng, 'add', rng.int(4, 5));
      if (!all) return null;
      const terms = all.slice(0, -1);
      return nextTerms(terms).length === 1 ? { terms } : null;
    },
    answer: ({ terms }) => letter(only(nextTerms(terms))),
    distractors: ({ terms }) => seriesDistractors(terms, only(nextTerms(terms))),
    verify: ({ terms }, value) => letter(diffCascade(terms)?.next) === value,
    render({ terms }, { fmt }) {
      const d = terms[1] - terms[0];
      const next = terms.at(-1) + d;
      return {
        question: `Which letter comes next? ${list(lettersOf(terms))}, ?`,
        explanation: `As positions: ${list(terms)}. Every gap is ${signedStep(d)}, so the next is ${terms.at(-1)} ${d > 0 ? '+' : '−'} ${Math.abs(d)} = ${next}, ${fmt(letter(next))}.`,
        solutionSteps: [`Positions: ${list(terms)}.`, `Gaps: ${list(stepsOf(terms).map(signedStep))}.`, `Next: ${plus(terms.at(-1), d)} = ${next} = ${letter(next)}.`],
        method: 'Write each letter as its position (A = 1), find the gap, and continue it.',
        hints: ['Turn the letters into numbers: A = 1, B = 2, ... (E = 5, J = 10, O = 15, T = 20, Y = 25 help).', 'Is the gap between neighbours the same every time?'],
        commonMistakes: ['Miscounting the gap by one letter.', 'Counting the gap the wrong way when the letters go backwards.']
      };
    }
  },
  {
    id: 'rs-gen-letter-pattern',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-letter-series',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rs-gaps-f', 'rs-interleave-f'],
    formatValue: text,
    estimatedSeconds: 70,
    params(rng) {
      const kind = rng.pick(['grow', 'grow', 'alt', 'interleave', 'times']);
      const count = kind === 'interleave' ? 6 : kind === 'times' ? 4 : rng.int(5, 6);
      const all = buildLetterSeries(rng, kind, count);
      if (!all) return null;
      const terms = all.slice(0, -1);
      const nexts = nextTerms(terms);
      if (nexts.length !== 1 || !letter(nexts[0])) return null;
      return { terms };
    },
    answer: ({ terms }) => letter(only(nextTerms(terms))),
    distractors: ({ terms }) => seriesDistractors(terms, only(nextTerms(terms))),
    verify: ({ terms }, value) => letter(diffCascade(terms)?.next) === value,
    render({ terms }, { fmt }) {
      const [rule] = seriesRules(terms);
      const next = only(nextTerms(terms));
      const gaps = stepsOf(terms);
      const steps =
        rule.kind === 'interleave'
          ? [
              `Positions: ${list(terms)}. The gaps ${list(gaps.map(signedStep))} follow no single pattern.`,
              `Every other term: ${list(lettersOf(terms.filter((_, i) => i % 2 === 0)))} (${signedStep(rule.p)} each) and ${list(lettersOf(terms.filter((_, i) => i % 2 === 1)))} (${signedStep(rule.q)} each).`,
              `The next term belongs to the ${terms.length % 2 === 0 ? 'first' : 'second'} series: ${letter(next)}.`
            ]
          : [`Positions: ${list(terms)}.`, `Gaps: ${list(gaps.map(signedStep))}: ${ruleText(rule)}.`, `Next gap ${signedStep(next - terms.at(-1))}: ${plus(terms.at(-1), next - terms.at(-1))} = ${next} = ${letter(next)}.`];
      return {
        question: `Which letter comes next? ${list(lettersOf(terms))}, ?`,
        explanation: `Written as positions the series is ${list(terms)}, and ${ruleText(rule)}. The next letter is ${fmt(letter(next))} (${next}).`,
        solutionSteps: steps,
        method: rule.kind === 'interleave' ? 'When the gaps zigzag, read every other term: two simple series are taking turns.' : 'Write the positions, then the gaps; if the gaps are not equal, look at how the gaps themselves change.',
        hints: ['Write each letter as a number and the gaps between neighbours underneath.', rule.kind === 'interleave' ? 'The gaps zigzag. Try the 1st, 3rd, 5th terms on their own.' : 'The gaps are not all equal. How does each gap compare with the one before it?'],
        commonMistakes: ['Repeating the last gap instead of continuing the pattern of gaps.', 'Miscounting a gap by one letter.']
      };
    }
  },
  {
    id: 'rs-gen-group-next',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-letter-series',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rs-groups-f'],
    formatValue: text,
    estimatedSeconds: 70,
    params(rng) {
      const width = rng.pick([2, 2, 3]);
      const count = 4;
      const cols = [];
      for (let k = 0; k < width; k++) {
        const d = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5]);
        const start = startFor(rng, d * count);
        const col = Array.from({ length: count + 1 }, (_, i) => start + i * d);
        if (col.some((p) => p < 1 || p > 26)) return null;
        cols.push(col);
      }
      const groups = Array.from({ length: count }, (_, i) => cols.map((c) => letter(c[i])).join(''));
      if (only(nextTermsOfParts(groups)) === null) return null;
      return { groups };
    },
    answer: ({ groups }) => only(nextTermsOfParts(groups)),
    distractors: ({ groups }) => {
      const ans = only(nextTermsOfParts(groups));
      const ps = [...ans].map(pos);
      const change = (i, by) => {
        const out = ps.map((p, j) => letter(j === i ? p + by : p));
        return out.every(Boolean) ? out.join('') : null;
      };
      const lastPs = [...groups.at(-1)].map(pos);
      return [
        { value: change(0, 1), why: 'miscounted the first letter by one' },
        { value: change(ps.length - 1, -1), why: 'miscounted the last letter by one' },
        { value: change(1, 1), why: 'miscounted the second letter by one' },
        { value: [...ans].reverse().join(''), why: 'wrote the letters of the group in the wrong order' },
        { value: lastPs.every((p, j) => letter(p - (ps[j] - p))) ? lastPs.map((p, j) => letter(p - (ps[j] - p))).join('') : null, why: 'moved every letter the wrong way' }
      ];
    },
    verify: ({ groups }, value) => nextTermOfPartsByCascade(groups) === value,
    render({ groups }, { fmt }) {
      const ans = only(nextTermsOfParts(groups));
      const width = groups[0].length;
      const places = ['first', 'second', 'third'];
      const cols = Array.from({ length: width }, (_, k) => groups.map((g) => pos(g[k])));
      return {
        question: `What comes next? ${list(groups)}, ?`,
        explanation: `Take each place of the groups as its own series. ${cols
          .map((c, k) => `${cap(places[k])} letters: ${list(lettersOf(c))} (${signedStep(c[1] - c[0])} each), next ${ans[k]}.`)
          .join(' ')} So the next group is ${fmt(ans)}.`,
        solutionSteps: [...cols.map((c, k) => `${cap(places[k])} letters ${list(lettersOf(c))}: positions ${list(c)}, gap ${signedStep(c[1] - c[0])}, next ${ans[k]}.`), `Next group: ${ans}.`],
        method: 'Split the groups into columns: the first letters form one series, the second letters another, and so on.',
        hints: ['Read only the first letter of each group. What series do they make?', 'Now do the same for the other letters.'],
        commonMistakes: ['Reading the letters of one group as the series instead of reading down the places.', 'Reversing the order of the letters in the answer.']
      };
    }
  },
  {
    id: 'rs-gen-pattern-blanks',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-letter-series',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rs-pattern-f'],
    formatValue: text,
    estimatedSeconds: 75,
    params(rng) {
      const L = rng.int(3, 5);
      const pool = rng.shuffle(['a', 'b', 'c', 'd']).slice(0, rng.int(2, Math.min(4, L)));
      const block = Array.from({ length: L }, () => rng.pick(pool)).join('');
      if (new Set(block).size < 2) return null;
      // The block must not itself repeat (abab is really ab).
      for (let d = 1; d < L; d++) if (L % d === 0 && block === block.slice(0, d).repeat(L / d)) return null;
      const reps = L === 3 ? 4 : 3;
      const full = block.repeat(reps);
      const nBlanks = rng.int(4, 5);
      const at = rng.shuffle([...full].map((_, i) => i)).slice(0, nBlanks).sort((a, b) => a - b);
      const pattern = [...full].map((c, i) => (at.includes(i) ? '_' : c)).join('');
      const fills = fillPatternBrute(pattern);
      if (fills.length !== 1) return null;
      return { pattern, block };
    },
    answer: ({ pattern }) => only(fillPatternBrute(pattern)),
    distractors: ({ pattern }) => {
      const ans = only(fillPatternBrute(pattern));
      const letters = [...new Set(pattern.replace(/_/g, ''))].sort();
      const swap = (s, i) => (i + 1 < s.length ? s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2) : s);
      return [
        { value: ans.slice(1) + ans[0], why: 'filled each blank with the letter meant for the next one' },
        { value: ans.at(-1) + ans.slice(0, -1), why: 'filled each blank with the letter meant for the one before' },
        { value: swap(ans, 0), why: 'swapped the first two blanks' },
        { value: swap(ans, ans.length - 2), why: 'swapped the last two blanks' },
        { value: [...ans].reverse().join(''), why: 'read the blanks from right to left' },
        { value: swap(ans, 1), why: 'swapped the second and third blanks' },
        ...letters.map((ch) => ({ value: ch + ans.slice(1), why: 'guessed the first blank from its neighbour' })),
        ...letters.map((ch) => ({ value: ans.slice(0, -1) + ch, why: 'guessed the last blank from its neighbour' }))
      ];
    },
    verify: ({ pattern }, value) => only(fillPatternByClasses(pattern)) === value,
    render({ pattern, block }, { fmt }) {
      const ans = only(fillPatternBrute(pattern));
      const shown = [...pattern].join(' ');
      return {
        question: `Which set of letters, filled in order, completes the series? ${shown}`,
        explanation: `The series repeats the block “${block}” (${block.length} letters). Each blank takes the letter in the same place of the block, so the blanks are ${[...ans].join(', ')}: ${fmt(ans)}.`,
        solutionSteps: [`Look for a block that repeats: “${block}”.`, `Write the block under the series and read off each blank.`, `Blanks in order: ${[...ans].join(', ')}.`],
        method: 'Find the repeating block from the letters you can see, then fill each blank from the same place in the block.',
        hints: ['How long is the block that keeps repeating? Try lengths 3, 4 and 5.', `Try the block “${block.slice(0, 2)}…” and see where it starts again.`],
        commonMistakes: ['Filling the blanks one position out of step.', 'Guessing a block length that breaks somewhere later in the series.']
      };
    }
  },

  /* ------------------------------ alphanumeric ------------------------------ */
  {
    id: 'rs-gen-alnum-next',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-alphanumeric',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rs-alnum-f'],
    formatValue: text,
    estimatedSeconds: 70,
    params(rng) {
      const count = 5;
      const lk = rng.pick(['add', 'add', 'grow']);
      const letters = buildLetterSeries(rng, lk, count);
      if (!letters) return null;
      const nk = rng.pick(['add', 'grow', 'times']);
      const nums = [];
      if (nk === 'add') {
        const d = rng.int(2, 9);
        nums.push(rng.int(1, 12));
        for (let i = 1; i <= count; i++) nums.push(nums[i - 1] + d);
      } else if (nk === 'grow') {
        let step = rng.int(1, 4);
        const grow = rng.pick([1, 2]);
        nums.push(rng.int(1, 10));
        for (let i = 1; i <= count; i++) {
          nums.push(nums[i - 1] + step);
          step += grow;
        }
      } else {
        nums.push(rng.int(1, 4));
        for (let i = 1; i <= count; i++) nums.push(nums[i - 1] * 2);
      }
      const order = rng.pick(['LN', 'NL']);
      const fmtTerm = (i) => (order === 'LN' ? `${letter(letters[i])}${nums[i]}` : `${nums[i]}${letter(letters[i])}`);
      const shown = Array.from({ length: count }, (_, i) => fmtTerm(i));
      if (only(nextTermsOfParts(shown)) === null) return null;
      return { terms: shown, order };
    },
    answer: ({ terms }) => only(nextTermsOfParts(terms)),
    distractors: ({ terms, order }) => {
      const ans = parseTerm(only(nextTermsOfParts(terms)));
      const li = order === 'LN' ? 0 : 1;
      const ni = 1 - li;
      const last = parseTerm(terms.at(-1));
      const lastNumberGap = last[ni].value - parseTerm(terms.at(-2))[ni].value;
      const make = (dl, num) => {
        const parts = [...ans];
        parts[li] = { type: 'L', value: ans[li].value + dl };
        parts[ni] = { type: 'N', value: num };
        return letter(parts[li].value) ? formatTerm(parts) : null;
      };
      return [
        { value: make(1, ans[ni].value), why: 'miscounted the letter by one' },
        { value: make(-1, ans[ni].value), why: 'miscounted the letter by one' },
        { value: make(0, last[ni].value + lastNumberGap), why: 'repeated the last number gap' },
        { value: make(0, ans[ni].value + 1), why: 'miscounted the number by one' },
        { value: make(1, ans[ni].value + 1), why: 'miscounted both parts' }
      ];
    },
    verify: ({ terms }, value) => nextTermOfPartsByCascade(terms) === value,
    render({ terms, order }, { fmt }) {
      const ans = only(nextTermsOfParts(terms));
      const parts = terms.map(parseTerm);
      const li = order === 'LN' ? 0 : 1;
      const ls = parts.map((p) => p[li].value);
      const ns = parts.map((p) => p[1 - li].value);
      const lRule = seriesRules(ls)[0];
      const nRule = seriesRules(ns)[0];
      return {
        question: `What comes next in the series? ${list(terms)}, ?`,
        explanation: `Split each term into its letter and its number. Letters ${list(lettersOf(ls))} are positions ${list(ls)}: ${ruleText(lRule)}. Numbers ${list(ns)}: ${ruleText(nRule)}. The next term is ${fmt(ans)}.`,
        solutionSteps: [`Letters: ${list(ls)} → ${ruleText(lRule)} → next ${only(nextTerms(ls))} = ${letter(only(nextTerms(ls)))}.`, `Numbers: ${list(ns)} → ${ruleText(nRule)} → next ${only(nextTerms(ns))}.`, `Next term: ${ans}.`],
        method: 'An alphanumeric series is two series side by side: solve the letters and the numbers separately, then put them back together.',
        hints: ['Look at the letters alone, then the numbers alone.', 'Write the letters as positions and find each part’s gaps.'],
        commonMistakes: ['Repeating the last gap of the numbers when the gaps change.', 'Miscounting the letter by one.']
      };
    }
  },
  {
    id: 'rs-gen-alnum-position',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-alphanumeric',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rs-element-f'],
    formatValue: text,
    estimatedSeconds: 70,
    params(rng) {
      const n = rng.int(16, 22);
      const seq = Array.from({ length: n }, () => {
        const r = rng.next();
        return r < 0.5 ? rng.pick([...SEQ_LETTERS]) : r < 0.8 ? String(rng.int(1, 9)) : rng.pick(SYMBOLS);
      });
      const end = rng.pick(['left', 'right']);
      const k = rng.int(4, n - 3);
      const m = rng.int(2, 6);
      const dir = rng.pick(['left', 'right']);
      const q = { k, end, m, dir };
      const ans = elementAt(seq, q);
      if (!ans) return null;
      // Every slip must point at a different character, so no wrong option is secretly right.
      const slips = slipPositions(n, q).map((i) => seq[i - 1]);
      if (slips.some((ch) => ch === ans)) return null;
      return { seq, ...q };
    },
    answer: ({ seq, k, end, m, dir }) => elementAt(seq, { k, end, m, dir }),
    distractors: ({ seq, k, end, m, dir }) => {
      const whys = ['counted the first position from the wrong end', 'moved the wrong way', 'moved one place too few', 'moved one place too far'];
      return slipPositions(seq.length, { k, end, m, dir }).map((i, j) => ({ value: seq[i - 1] ?? null, why: whys[j] }));
    },
    verify: ({ seq, k, end, m, dir }, value) => elementAtWalk(seq, { k, end, m, dir }) === value,
    render({ seq, k, end, m, dir }, { fmt }) {
      const n = seq.length;
      const fromLeft = end === 'left' ? k : n - k + 1;
      const at = fromLeft + (dir === 'right' ? m : -m);
      return {
        context: `Study the arrangement below.\n${seq.join(' ')}`,
        question: `Which element is ${ordinal(m)} to the ${dir} of the ${ordinal(k)} element from the ${end}?`,
        explanation: `There are ${n} elements. ${end === 'left' ? `The ${ordinal(k)} from the left is position ${k}.` : `The ${ordinal(k)} from the right is position ${n} − ${k} + 1 = ${fromLeft} from the left.`} ${m} to the ${dir}: ${fromLeft} ${dir === 'right' ? '+' : '−'} ${m} = ${at}, which is ${fmt(seq[at - 1])}.`,
        solutionSteps: [`Count the elements: ${n}.`, end === 'left' ? `Start at position ${k} (${seq[k - 1]}).` : `${ordinal(k)} from the right = ${n} − ${k} + 1 = ${fromLeft} from the left (${seq[fromLeft - 1]}).`, `${dir === 'right' ? 'Right adds' : 'Left subtracts'}: ${fromLeft} ${dir === 'right' ? '+' : '−'} ${m} = ${at} → ${seq[at - 1]}.`],
        method: 'Turn every position into a count from the left: k from the right is n − k + 1. Then "to the right" adds and "to the left" subtracts.',
        hints: [`How many elements are there? You need that to count from the right.`, `Find the ${ordinal(k)} from the ${end} first, then move ${m} places.`],
        commonMistakes: ['Counting the starting position from the wrong end.', 'Counting the starting element as one of the moves.']
      };
    }
  },
  {
    id: 'rs-gen-alnum-count',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-alphanumeric',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['rs-element-f'],
    estimatedSeconds: 90,
    params(rng) {
      const n = rng.int(18, 24);
      const seq = Array.from({ length: n }, () => {
        const r = rng.next();
        return r < 0.45 ? rng.pick([...SEQ_LETTERS]) : r < 0.75 ? String(rng.int(1, 9)) : rng.pick(SYMBOLS);
      });
      const kinds = ['L', 'N', 'S'];
      const mid = rng.pick(kinds);
      const before = rng.chance(0.85) ? rng.pick(kinds) : null;
      const after = rng.pick(kinds);
      return { seq, before, mid, after };
    },
    answer: ({ seq, before, mid, after }) => countPattern(seq, { before, mid, after }),
    verify: ({ seq, before, mid, after }, value) => countPatternByRegex(seq, { before, mid, after }) === value,
    render({ seq, before, mid, after }) {
      const word = { L: 'letter', N: 'number', S: 'symbol' };
      const plural = { L: 'letters', N: 'numbers', S: 'symbols' };
      const hits = seq.map((ch, i) => i).filter((i) => kindOf(seq[i]) === mid && (!before || (i > 0 && kindOf(seq[i - 1]) === before)) && i < seq.length - 1 && kindOf(seq[i + 1]) === after);
      const cond = `${before ? `immediately preceded by a ${word[before]} and ` : ''}immediately followed by a ${word[after]}`;
      return {
        context: `Study the arrangement below.\n${seq.join(' ')}`,
        question: `How many ${plural[mid]} in the arrangement are ${cond}?`,
        explanation: hits.length
          ? `Check every ${word[mid]} and its neighbours. The ones that fit are ${hits.map((i) => `${before ? seq[i - 1] : ''}${seq[i]}${seq[i + 1]}`).join(', ')}: ${hits.length} in all.`
          : `Check every ${word[mid]} and its neighbours: none of them is ${cond}, so the answer is 0.`,
        solutionSteps: [`Go through the ${plural[mid]} one by one.`, `For each, look at the element just before and just after it.`, `Matches: ${hits.length ? hits.map((i) => `${before ? seq[i - 1] : ''}${seq[i]}${seq[i + 1]}`).join(', ') : 'none'} → ${hits.length}.`],
        method: 'Scan once, stopping only at the kind of element asked about, and check both neighbours each time.',
        hints: [`Mark every ${word[mid]} first.`, `For each one, is the next element a ${word[after]}${before ? ` and the one before it a ${word[before]}` : ''}?`],
        commonMistakes: ['Swapping "preceded" (just before) and "followed" (just after).', 'Counting the same element twice, or missing one at the end of a line.']
      };
    }
  },

  /* ------------------------------ analogy ------------------------------ */
  {
    id: 'rs-gen-number-analogy',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-analogy',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['rs-analogy-f'],
    estimatedSeconds: 50,
    params(rng) {
      const rule = rng.pick(ANALOGY_RULES);
      const cube = /cube/.test(rule.id);
      const a = rng.int(2, cube ? 9 : 15);
      const c = rng.int(2, cube ? 9 : 15);
      if (a === c) return null;
      const b = rule.f(a);
      if (analogyAnswers(a, b, c).length !== 1) return null;
      return { ruleId: rule.id, a, b, c };
    },
    answer: ({ a, b, c }) => only(analogyAnswers(a, b, c)),
    distractors: ({ a, b, c }) => {
      const wrong = ANALOGY_RULES.filter((r) => r.f(a) !== b);
      const near = (v) => Math.abs(v - only(analogyAnswers(a, b, c)));
      return wrong
        .map((r) => ({ value: r.f(c), why: `used ${r.text} instead` }))
        .sort((x, y) => near(x.value) - near(y.value));
    },
    verify: ({ a, b, c }, value) => only(analogyByResidue(a, b, c)) === value,
    render({ ruleId, a, b, c }, { fmt }) {
      const rule = ANALOGY_RULES.find((r) => r.id === ruleId);
      const v = rule.f(c);
      return {
        question: `Find the missing number: ${a} : ${b} :: ${c} : ?`,
        explanation: `${b} is ${rule.text.replace(/n/g, String(a))} for n = ${a}: the rule is ${rule.text}. So the missing number is ${rule.text.replace(/n/g, String(c))} = ${fmt(v)}.`,
        solutionSteps: [`Compare ${b} with ${a}² = ${a * a} and ${a}³ = ${a ** 3}.`, `${b} = ${rule.text.replace(/n/g, String(a))}: rule ${rule.text}.`, `For ${c}: ${rule.text.replace(/n/g, String(c))} = ${v}.`],
        method: 'Find what was done to the first number to get the second (squares, cubes, n × (n ± 1), plus or minus a little), then do the same to the third.',
        hints: [`How far is ${b} from ${a}² = ${a * a}? From ${a}³ = ${a ** 3}?`, 'Check that the rule you found gives exactly the second number, then apply it.'],
        commonMistakes: ['Stopping at a square when the pair is a cube (or the other way round).', 'Forgetting the small amount added or taken away.']
      };
    }
  },
  {
    id: 'rs-gen-letter-analogy',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-analogy',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rs-letter-analogy-f', 'rs-sc-opposite'],
    formatValue: text,
    estimatedSeconds: 70,
    params(rng) {
      const g = rng.pick([1, 2, 3, -1, -2]);
      const group = () => {
        const s = rng.int(1, 26);
        const ps = [s, s + g, s + 2 * g];
        return ps.every((p) => p >= 1 && p <= 26) ? ps : null;
      };
      const word = group();
      const target = group();
      if (!word || !target || word[0] === target[0]) return null;
      const kind = rng.pick(['shift', 'shift', 'vector', 'opposite']);
      const ks = kind === 'shift' ? Array(3).fill(rng.pick([1, 2, 3, 4, -1, -2, -3])) : kind === 'vector' ? rng.pick([[1, 2, 3], [2, 3, 4], [-1, -2, -3], [1, 3, 5], [3, 2, 1]]) : null;
      const apply = (ps) => (ks ? ps.map((p, i) => letter(p + ks[i])) : ps.map((p) => letter(27 - p)));
      const code = apply(word);
      const ans = apply(target);
      if ([...code, ...ans].some((ch) => !ch)) return null;
      const w = lettersOf(word).join('');
      const t = lettersOf(target).join('');
      const fits = codesFor({ word: w, code: code.join('') }, t);
      if (fits.length !== 1) return null;
      return { word: w, code: code.join(''), target: t, kind, ks };
    },
    answer: ({ target, ks }) => [...target].map((ch, i) => (ks ? letter(pos(ch) + ks[i]) : letter(27 - pos(ch)))).join(''),
    distractors: ({ target, ks, code, word }) => {
      const tp = [...target].map(pos);
      const out = ks
        ? [
            { value: lettersWord(tp.map((p, i) => letter(p - ks[i]))), why: 'moved the letters the wrong way' },
            { value: lettersWord(tp.map((p, i) => letter(p + ks[i] + (i === 1 ? 1 : 0)))), why: 'miscounted the middle letter' },
            { value: lettersWord(tp.map((p, i) => letter(p + ks[0]))), why: 'gave every letter the first letter’s shift' },
            { value: lettersWord(tp.map((p) => letter(27 - p))), why: 'used opposite letters' }
          ]
        : [
            { value: lettersWord(tp.map((p) => letter(26 - p))), why: 'used 26 − n instead of 27 − n' },
            { value: lettersWord(tp.map((p) => letter(28 - p))), why: 'used 28 − n instead of 27 − n' },
            { value: lettersWord(tp.map((p) => letter(27 - p)).reverse()), why: 'wrote the opposites in reverse order' },
            { value: lettersWord(tp.map((p, i) => letter(p + pos(code[i]) - pos(word[i])))), why: 'copied the example’s gaps instead of taking opposites' }
          ];
      return [...out, { value: [...target].reverse().join(''), why: 'just reversed the group' }];
    },
    verify: ({ word, code, target }, value) => only(codesFor({ word, code }, target)) === value,
    render({ word, code, target, kind, ks }, { fmt }) {
      const ans = [...target].map((ch, i) => (ks ? letter(pos(ch) + ks[i]) : letter(27 - pos(ch)))).join('');
      const how = ks
        ? ks.every((k) => k === ks[0])
          ? `each letter moves ${signedStep(ks[0])}`
          : `the letters move ${list(ks.map(signedStep))} in turn`
        : 'each letter is replaced by its opposite (positions add to 27)';
      return {
        question: `${word} : ${code} :: ${target} : ?`,
        explanation: `From ${word} to ${code}, ${how}. Doing the same to ${target} gives ${fmt(ans)}.`,
        solutionSteps: [`Positions of ${word}: ${list([...word].map(pos))}; of ${code}: ${list([...code].map(pos))}.`, kind === 'opposite' ? `Each pair adds to 27: ${[...word].map((ch, i) => `${ch}–${code[i]}`).join(', ')} are opposites.` : `Changes: ${list([...word].map((ch, i) => signedStep(pos(code[i]) - pos(ch))))}.`, `${target} → ${ans}.`],
        method: 'Write both groups as positions and compare them place by place; then apply the same change to the third group.',
        hints: ['Compare the first letters, then the second, then the third.', kind === 'opposite' ? 'Add each letter’s position to its partner’s. What do you notice?' : 'Is the change the same in every place, or does it grow?'],
        commonMistakes: ['Applying the change in the wrong direction.', 'Using one shift for every letter when the shifts differ.']
      };
    }
  },

  /* ------------------------------ classification ------------------------------ */
  {
    id: 'rs-gen-odd-group',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-classification',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['rs-odd-f', 'rs-gaps-f'],
    formatValue: text,
    estimatedSeconds: 60,
    params(rng) {
      const g = [rng.pick([1, 2, 3, 4, -2, -3]), rng.pick([1, 2, 3, 4, -2, -3])];
      const make = (gaps) => {
        const s = startFor(rng, gaps[0] + gaps[1]);
        const ps = [s, s + gaps[0], s + gaps[0] + gaps[1]];
        return ps.every((p) => p >= 1 && p <= 26) ? lettersOf(ps).join('') : null;
      };
      const odd = [...g];
      odd[rng.int(0, 1)] += rng.pick([-1, 1]);
      if (odd.some((x) => x === 0)) return null;
      const items = [make(g), make(g), make(g), make(odd)];
      if (items.some((x) => !x) || new Set(items).size !== 4) return null;
      const order = rng.shuffle([0, 1, 2, 3]);
      const shown = order.map((i) => items[i]);
      const oddAt = order.indexOf(3);
      const found = oddOnesByRules(shown, groupProperties(shown));
      if (found.length !== 1 || found[0] !== oddAt) return null;
      return { items: shown, oddAt };
    },
    answer: ({ items, oddAt }) => items[oddAt],
    distractors: ({ items, oddAt }) => items.filter((_, i) => i !== oddAt).map((value) => ({ value, why: 'follows the same gaps as two of the others' })),
    verify: ({ items }, value) => items[oddBySignature(items, gapSignature)] === value,
    render({ items, oddAt }, { fmt }) {
      const gaps = (gstr) => list([...gstr].slice(1).map((ch, i) => signedStep(pos(ch) - pos(gstr[i]))));
      const common = items.find((_, i) => i !== oddAt);
      return {
        question: `Three of these letter groups follow the same pattern. Which one is the odd one out? ${list(items)}`,
        explanation: `Write the gaps inside each group: ${items.map((g) => `${g} (${gaps(g)})`).join(', ')}. Three have gaps ${gaps(common)}; ${fmt(items[oddAt])} has ${gaps(items[oddAt])}.`,
        solutionSteps: items.map((g) => `${g}: ${[...g].map(pos).join(', ')} → gaps ${gaps(g)}.`),
        method: 'Turn each group into positions and compare the gaps inside the groups.',
        hints: ['Write the position of every letter.', 'Find the gaps inside each group. Which group’s gaps differ?'],
        commonMistakes: ['Comparing the first letters of the groups instead of the gaps inside each group.', 'Miscounting a gap by one.']
      };
    }
  },
  {
    id: 'rs-gen-odd-number',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-classification',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['rs-odd-f'],
    estimatedSeconds: 50,
    params(rng) {
      const kind = rng.pick(Object.keys(ODD_KINDS));
      const { make, max } = ODD_KINDS[kind];
      const roots = rng.shuffle(Array.from({ length: max - 1 }, (_, i) => i + 2)).slice(0, 4);
      const members = roots.slice(0, 3).map(make);
      const near = make(roots[3]) + rng.pick([-2, -1, 1, 2]);
      if (near < 2) return null;
      const items = rng.shuffle([...members, near]);
      const oddAt = items.indexOf(near);
      const found = oddOnesByRules(items, NUMBER_PROPERTIES);
      if (found.length !== 1 || found[0] !== oddAt) return null;
      if (oddBySignature(items, ODD_KINDS[kind].sig) !== oddAt) return null;
      return { kind, items, oddAt };
    },
    answer: ({ items, oddAt }) => items[oddAt],
    distractors: ({ items, oddAt }) => items.filter((_, i) => i !== oddAt).map((value) => ({ value, why: 'shares the property of the others' })),
    verify: ({ items, kind }, value) => items[oddBySignature(items, ODD_KINDS[kind].sig)] === value,
    render({ kind, items, oddAt }, { fmt }) {
      const k = ODD_KINDS[kind];
      return {
        question: `Which number is the odd one out? ${list(items)}`,
        explanation: `${list(items.filter((_, i) => i !== oddAt).map((x) => `${x} (${k.show(x)})`))}: each is ${k.text}. ${fmt(items[oddAt])} is not.`,
        solutionSteps: [`Look for what three of the numbers share: each is ${k.text}.`, ...items.filter((_, i) => i !== oddAt).map((x) => `${x}: ${k.show(x)}.`), `${items[oddAt]} is not ${k.text}.`],
        method: 'Test the usual families first: squares, cubes, primes, products of neighbours, and one more or less than these.',
        hints: ['Are any of these squares or cubes, or close to them?', 'Find a property that three of the numbers share exactly.'],
        commonMistakes: ['Picking a number that is merely the largest or smallest.', 'Missing that a number is one more or one less than a square or cube.']
      };
    }
  },
  {
    id: 'rs-gen-odd-pair',
    version: 1,
    topicId: TOPIC,
    conceptId: 'rs-classification',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['rs-odd-f', 'rs-analogy-f'],
    formatValue: (v) => v,
    estimatedSeconds: 80,
    params(rng) {
      const p = rng.pick([2, 3]);
      const k = rng.int(-2, 2);
      const f = (n) => n ** p + k;
      const xs = rng.shuffle(Array.from({ length: p === 3 ? 8 : 13 }, (_, i) => i + 2)).slice(0, 4);
      const slip = rng.pick([-2, -1, 1, 2]);
      const pairs = xs.map((x, i) => [x, i === 3 ? f(x) + slip : f(x)]);
      if (pairs.some(([, b]) => b < 1)) return null;
      const items = rng.shuffle(pairs);
      const oddAt = items.findIndex(([x, b]) => b !== f(x));
      const found = oddOnesByRules(items, pairProperties());
      if (found.length !== 1 || found[0] !== oddAt) return null;
      return { p, k, items: items.map(([a, b]) => `${a} : ${b}`), oddAt };
    },
    answer: ({ items, oddAt }) => items[oddAt],
    distractors: ({ items, oddAt }) => items.filter((_, i) => i !== oddAt).map((value) => ({ value, why: 'follows the same rule as two of the others' })),
    verify: ({ items, p }, value) => {
      const parsed = items.map((s) => s.split(' : ').map(Number));
      const i = oddBySignature(parsed, ([a, b]) => b - Math.pow(a, p));
      return i !== null && items[i] === value;
    },
    render({ p, k, items, oddAt }, { fmt }) {
      const rule = `n${p === 2 ? '²' : '³'}${k > 0 ? ` + ${k}` : k < 0 ? ` − ${-k}` : ''}`;
      return {
        question: `In three of these pairs the second number is made from the first by the same rule. Which pair is the odd one out? ${items.join('; ')}`,
        explanation: `In ${list(items.filter((_, i) => i !== oddAt))} the second number is ${rule} of the first. In ${fmt(items[oddAt])} it is not.`,
        solutionSteps: [`Compare each second number with the square and cube of the first.`, `Three pairs fit ${rule}.`, `${items[oddAt]} does not: the odd one out.`],
        method: 'Find the rule from one pair, check it on every pair, and pick the pair that breaks it.',
        hints: ['Square and cube the first number of each pair.', 'How far is each second number from that square or cube?'],
        commonMistakes: ['Testing only one pair before deciding the rule.', 'Missing a difference of 1 from the square or cube.']
      };
    }
  }
];

/** The four positions a slip would point to: wrong end, wrong way, one short, one too far. */
function slipPositions(n, { k, end, m, dir }) {
  const sign = dir === 'right' ? 1 : -1;
  const base = end === 'left' ? k : n - k + 1;
  const wrongBase = end === 'left' ? n - k + 1 : k;
  return [wrongBase + sign * m, base - sign * m, base + sign * (m - 1), base + sign * (m + 1)].map((i) => (i >= 1 && i <= n ? i : null)).filter((i) => i !== null);
}

/** Number families for the odd one out, each with an independent check (a signature). */
const ODD_KINDS = {
  square: { make: (r) => r * r, max: 20, text: 'a perfect square', show: (x) => `${Math.round(Math.sqrt(x))}²`, sig: (x) => String(Math.round(Math.sqrt(x)) ** 2 === x) },
  cube: { make: (r) => r ** 3, max: 10, text: 'a perfect cube', show: (x) => `${Math.round(Math.cbrt(x))}³`, sig: (x) => String(Math.round(Math.cbrt(x)) ** 3 === x) },
  squarePlusOne: { make: (r) => r * r + 1, max: 15, text: 'one more than a perfect square', show: (x) => `${Math.round(Math.sqrt(x - 1))}² + 1`, sig: (x) => String(Math.round(Math.sqrt(x - 1)) ** 2 === x - 1) },
  cubeMinusOne: { make: (r) => r ** 3 - 1, max: 9, text: 'one less than a perfect cube', show: (x) => `${Math.round(Math.cbrt(x + 1))}³ − 1`, sig: (x) => String(Math.round(Math.cbrt(x + 1)) ** 3 === x + 1) },
  neighbours: { make: (r) => r * (r + 1), max: 15, text: 'a product of two consecutive numbers', show: (x) => `${Math.floor(Math.sqrt(x))} × ${Math.floor(Math.sqrt(x)) + 1}`, sig: (x) => String(Math.floor(Math.sqrt(x)) * (Math.floor(Math.sqrt(x)) + 1) === x) },
  prime: {
    make: (r) => [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97][r],
    max: 24,
    text: 'a prime number',
    show: () => 'prime',
    sig: (x) => String(x > 1 && Array.from({ length: x - 2 }, (_, i) => i + 2).every((d) => x % d !== 0))
  }
};
