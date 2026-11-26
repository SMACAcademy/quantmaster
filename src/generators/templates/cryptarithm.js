/**
 * Cryptarithmetic: letter sums, differences, three-word sums and products.
 *
 * Every puzzle is built from real numbers written in letters, and kept only if
 * it has exactly one solution. The answer comes from one solver (column by
 * column for sums and differences, number by number for products) and is
 * checked by another: trying every assignment of distinct digits to the
 * letters must find exactly one solution, and it must agree.
 */

import { fmt } from '../core.js';
import { asAddition, bruteForce, columnCount, encode, leadingLetters, lettersOf, puzzleText, solveByNumbers, solveColumns, wordValue } from '../../utils/cryptarithm.js';

// I and O are left out so no letter is mistaken for 1 or 0.
const POOL = 'ABCDEFGHKLMNPRSTUWXYZ'.split('');
const COLUMN = ['units', 'tens', 'hundreds', 'thousands', 'ten-thousands', 'lakhs'];
const RULES = 'Each letter stands for a different digit, the same letter for the same digit, and no number starts with 0.';

/** The single solution of a puzzle by brute force over every digit assignment, or null if it is not unique. */
function uniqueByBruteForce(puzzle) {
  const found = bruteForce(puzzle, { limit: 2 });
  return found.length === 1 ? found[0] : null;
}

/** Products solved number by number, remembered so a question's answer, options and text share one search. */
const productCache = new Map();
function productSolutions(puzzle) {
  const key = puzzleText(puzzle);
  if (!productCache.has(key)) {
    if (productCache.size > 500) productCache.clear();
    productCache.set(key, solveByNumbers(puzzle, { limit: 2 }));
  }
  return productCache.get(key);
}

/**
 * How many (number, digit) pairs share each letter pattern of a product
 * N × D = P (N of 2 or 3 digits, D any digit): a pattern seen once is a puzzle
 * with exactly one solution. Built once, on first use.
 */
let productPatterns = null;
function productPatternCount(numbers) {
  if (!productPatterns) {
    productPatterns = new Map();
    for (let n = 10; n <= 999; n++) {
      for (let d = 0; d <= 9; d++) {
        const key = puzzleText(encode('×', [n, d], n * d, 'abcdefghij').puzzle);
        productPatterns.set(key, (productPatterns.get(key) || 0) + 1);
      }
    }
  }
  return productPatterns.get(puzzleText(encode('×', numbers.slice(0, 2), numbers[2], 'abcdefghij').puzzle)) || 0;
}

/** The single solution by the column method (sums and differences), with its carries. */
function uniqueByColumns(puzzle) {
  const found = solveColumns(puzzle, { limit: 2 });
  return found.length === 1 ? found[0] : null;
}

/**
 * A puzzle with exactly one solution, made from numbers drawn by `draw(rng)`
 * (returning [op, termNumbers, resultNumber] or null). Tries a bounded number
 * of times so the seed stays deterministic.
 */
function makePuzzle(rng, draw, { minLetters = 4, maxLetters = 6, tries = 150, check } = {}) {
  for (let i = 0; i < tries; i++) {
    const drawn = draw(rng);
    if (!drawn) continue;
    const [op, terms, result] = drawn;
    if (op === '×' && productPatternCount([...terms, result]) !== 1) continue;
    const pool = rng.shuffle(POOL);
    const { puzzle, digitOf } = encode(op, terms, result, pool);
    const count = lettersOf(puzzle).length;
    if (count < minLetters || count > maxLetters) continue;
    const unique = op === '×' ? true : solveColumns(puzzle, { limit: 2 }).length === 1;
    if (!unique) continue;
    if (check && !check(puzzle, digitOf)) continue;
    return { puzzle, digitOf };
  }
  return null;
}

const draws = {
  double3: (rng) => {
    const a = rng.int(102, 987);
    return ['+', [a, a], 2 * a];
  },
  double4: (rng) => {
    const a = rng.int(1023, 9876);
    return ['+', [a, a], 2 * a];
  },
  pair4: (rng) => {
    const a = rng.int(1023, 9876);
    const b = rng.int(1023, 9876);
    return ['+', [a, b], a + b];
  },
  mixed: (rng) => (rng.chance(0.5) ? draws.double4(rng) : draws.pair4(rng)),
  difference: (rng) => {
    const a = rng.int(1023, 9876);
    const b = rng.chance(0.4) ? a : rng.int(1023, 9876);
    // (a + b) − a = b, written as a difference.
    return ['−', [a + b, a], b];
  },
  triple: (rng) => {
    const a = rng.int(102, 987);
    return ['+', [a, a, a], 3 * a];
  },
  product: (rng) => {
    const a = rng.chance(0.4) ? rng.int(12, 98) : rng.int(102, 987);
    const b = rng.int(2, 9);
    return ['×', [a, b], a * b];
  }
};

/** The column-by-column working of a sum (or a difference read as a sum) under an assignment. */
function columnWorking(puzzle, assignment) {
  const sum = asAddition(puzzle);
  const at = (word, i) => (i < word.length ? word[word.length - 1 - i] : null);
  const lines = [];
  let carry = 0;
  for (let i = 0; i < columnCount(puzzle); i++) {
    const letters = sum.terms.map((w) => at(w, i)).filter(Boolean);
    const out = at(sum.result, i);
    const digits = letters.map((l) => assignment[l]);
    const total = digits.reduce((a, b) => a + b, carry);
    const parts = [...digits.map(String), ...(carry ? [`carry ${carry}`] : [])];
    const name = COLUMN[i] || `column ${i + 1}`;
    if (!letters.length) lines.push(`${name[0].toUpperCase()}${name.slice(1)}: only the carry ${carry} is left, so ${out} = ${carry}.`);
    else
      lines.push(
        `${name[0].toUpperCase()}${name.slice(1)}: ${letters.join(' + ')}${carry ? ' + carry' : ''} = ${parts.join(' + ')} = ${total}; write ${total % 10}${out ? ` (${out})` : ''}, carry ${Math.floor(total / 10)}.`
      );
    carry = Math.floor(total / 10);
  }
  return lines;
}

const valuesText = (puzzle, a) => `${puzzle.terms.map((w) => wordValue(w, a)).join(` ${puzzle.op} `)} = ${wordValue(puzzle.result, a)}`;
const lettersText = (puzzle, a) => lettersOf(puzzle).map((l) => `${l} = ${a[l]}`).join(', ');
const longer = (puzzle) => puzzle.result.length > Math.max(...puzzle.terms.map((w) => w.length));

/** The distinct digits of other letters, as "confused letters" distractors. */
const otherDigits = (puzzle, a, letter) =>
  lettersOf(puzzle)
    .filter((l) => l !== letter)
    .map((l) => ({ value: a[l], why: `gave the digit of ${l} instead` }));

/** Pick a letter to ask about: not one the leading-1 rule gives away. */
function askable(puzzle, digitOf, rng, { avoidLeadingOne = true } = {}) {
  const sum = puzzle.op === '×' ? puzzle : asAddition(puzzle);
  const free = lettersOf(puzzle).filter((l) => !(avoidLeadingOne && longer(sum) && l === sum.result[0]));
  return rng.pick(free.length ? free : lettersOf(puzzle));
}

/* --------------------------------- rules --------------------------------- */

const RULE_TEXT = {
  same: 'The same letter stands for two different digits',
  share: 'Two different letters stand for the same digit',
  lead: 'A number starts with 0',
  none: 'No rule is broken'
};

/** Which rules a reading of the puzzle's numbers breaks (written independently of the solvers). */
function brokenRules(puzzle, numbers) {
  const words = [...puzzle.terms, puzzle.result];
  const map = new Map();
  const lettersOfDigit = new Map();
  let same = false;
  let lead = false;
  words.forEach((w, j) => {
    const s = String(numbers[j]).padStart(w.length, '0');
    if (s.length !== w.length) same = true;
    if (w.length > 1 && s[0] === '0') lead = true;
    for (let i = 0; i < w.length; i++) {
      const d = Number(s[i]);
      if (map.has(w[i]) && map.get(w[i]) !== d) same = true;
      if (!map.has(w[i])) map.set(w[i], d);
      lettersOfDigit.set(d, new Set([...(lettersOfDigit.get(d) || []), w[i]]));
    }
  });
  // Two letters share a digit if any digit sits under two different letters anywhere.
  return { same, share: [...lettersOfDigit.values()].some((ls) => ls.size > 1), lead };
}

/* ------------------------------- templates ------------------------------- */

export const cryptarithmTemplates = [
  {
    id: 'cr-gen-rule-broken',
    version: 1,
    topicId: 'cryptarithmetic',
    conceptId: 'cr-rules',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['cr-rules-f'],
    estimatedSeconds: 45,
    params(rng) {
      const made = makePuzzle(rng, draws.double3, { minLetters: 4, maxLetters: 6 });
      if (!made) return null;
      const { puzzle, digitOf } = made;
      const real = wordValue(puzzle.terms[0], digitOf);
      if (rng.chance(0.2)) return { puzzle, offered: real, kind: 'none' };
      const size = puzzle.result.length;
      const target = rng.pick(['same', 'share']);
      let fallback = null;
      for (let i = 0; i < 300; i++) {
        const a = rng.int(102, 987);
        if (a === real || String(2 * a).length !== size) continue;
        const broken = brokenRules(puzzle, [a, a, 2 * a]);
        const kinds = Object.keys(broken).filter((k) => broken[k]);
        if (kinds.length !== 1) continue;
        if (kinds[0] === target) return { puzzle, offered: a, kind: target };
        fallback = fallback || { puzzle, offered: a, kind: kinds[0] };
      }
      return fallback;
    },
    answer: ({ kind }) => RULE_TEXT[kind],
    distractors: ({ kind }) =>
      Object.entries(RULE_TEXT)
        .filter(([k]) => k !== kind)
        .map(([k, text]) => ({ value: text, why: k === 'none' ? 'trusted the arithmetic alone' : 'misread which letters repeat' })),
    verify: ({ puzzle, offered }, value) => {
      // Independently: the offered reading is the solution exactly when it matches the brute-force solution.
      const solution = uniqueByBruteForce(puzzle);
      if (!solution) return false;
      const isSolution = wordValue(puzzle.terms[0], solution) === offered;
      if (isSolution) return value === RULE_TEXT.none;
      const pairs = new Set();
      [...puzzle.terms, puzzle.result].forEach((w, j) => {
        const digits = String(j < 2 ? offered : 2 * offered);
        [...w].forEach((l, i) => pairs.add(l + digits[i]));
      });
      const letters = [...pairs].map((p) => p[0]);
      const digitsUsed = [...pairs].map((p) => p[1]);
      const clash = { same: new Set(letters).size < letters.length, share: new Set(digitsUsed).size < digitsUsed.length };
      const which = clash.same && !clash.share ? 'same' : clash.share && !clash.same ? 'share' : null;
      return which !== null && value === RULE_TEXT[which];
    },
    render({ puzzle, offered, kind }) {
      const sumText = `${offered} + ${offered} = ${2 * offered}`;
      // Which digits each letter receives in the offered reading.
      const seen = new Map();
      [...puzzle.terms, puzzle.result].forEach((w, j) =>
        [...w].forEach((l, i) => {
          const d = String(j < 2 ? offered : 2 * offered)[i];
          seen.set(l, [...new Set([...(seen.get(l) || []), d])]);
        })
      );
      const twoDigits = [...seen].filter(([, ds]) => ds.length > 1).map(([l, ds]) => `${l} is ${ds.join(' and ')}`);
      const byDigit = new Map();
      for (const [l, ds] of seen) byDigit.set(ds[0], [...(byDigit.get(ds[0]) || []), l]);
      const sharing = [...byDigit].filter(([, ls]) => ls.length > 1).map(([d, ls]) => `${ls.join(' and ')} are both ${d}`);
      const why =
        kind === 'none'
          ? `Reading ${puzzle.terms[0]} = ${offered} gives every letter one digit, no two letters share a digit, and nothing starts with 0. It is the solution.`
          : kind === 'same'
            ? `Write each letter under its digit in ${sumText}: ${twoDigits.join('; ')}. One letter must keep one digit everywhere. No two letters share a digit, so only this rule is broken.`
            : `Write each letter under its digit in ${sumText}: every letter keeps one digit, but ${sharing.join('; ')}. Different letters must be different digits.`;
      return {
        question: `For ${puzzleText(puzzle)}, Meena offers ${sumText}. The addition is correct. Which rule of cryptarithms, if any, does her answer break?`,
        explanation: `${why} (${RULES})`,
        solutionSteps: [`Match the letters of ${puzzleText(puzzle)} with the digits of ${sumText}.`, 'Check: one digit per letter? different digits for different letters? no leading 0?', RULE_TEXT[kind] + '.'],
        method: 'Write each letter above its digit in every place it appears.',
        hints: [`Write ${puzzle.terms[0]} above ${offered} and ${puzzle.result} above ${2 * offered}.`, 'Does any letter get two digits? Do any two letters get the same digit?'],
        commonMistakes: ['Accepting an answer because the arithmetic is right.']
      };
    }
  },

  {
    id: 'cr-gen-leading-one',
    version: 1,
    topicId: 'cryptarithmetic',
    conceptId: 'cr-carry',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['cr-carry-f', 'cr-sc-leading-one'],
    estimatedSeconds: 25,
    params(rng) {
      const made = makePuzzle(rng, draws.mixed, { minLetters: 4, maxLetters: 6, check: (p) => longer(p) });
      return made && { puzzle: made.puzzle };
    },
    answer: ({ puzzle }) => solveColumns(puzzle)[0].assignment[puzzle.result[0]],
    distractors: () => [
      { value: 0, why: 'a number cannot start with 0' },
      { value: 2, why: 'thought two numbers could carry 2' },
      { value: 9, why: 'took the largest digit' },
      { value: 5, why: 'guessed half of 10' }
    ],
    verify: ({ puzzle }, value) => {
      const solution = uniqueByBruteForce(puzzle);
      return Boolean(solution) && solution[puzzle.result[0]] === value;
    },
    render({ puzzle }) {
      const n = puzzle.terms[0].length;
      const lead = puzzle.result[0];
      const solution = solveColumns(puzzle)[0].assignment;
      return {
        question: `${puzzleText(puzzle)}. ${RULES} Without solving the rest, what digit is ${lead}?`,
        explanation: `Two ${n}-digit numbers add to less than 2 × 10${'⁰¹²³⁴⁵⁶⁷⁸⁹'[n]}, so a ${n + 1}-digit answer starts with 1: ${lead} = 1. The full solution is ${valuesText(puzzle, solution)}.`,
        solutionSteps: [`Each number is below 10${'⁰¹²³⁴⁵⁶⁷⁸⁹'[n]}, so the sum is below 2 × 10${'⁰¹²³⁴⁵⁶⁷⁸⁹'[n]}.`, `${puzzle.result} has ${n + 1} digits, so it starts with 1.`, `${lead} = 1.`],
        method: 'An extra leading digit is the final carry, which is 1.',
        hints: [`${puzzle.result} has one more letter than each word being added. Where does that extra digit come from?`, 'A column of two digits plus a carry is at most 19.'],
        commonMistakes: ['Answering 2 or more: two numbers never carry more than 1.']
      };
    }
  },

  {
    id: 'cr-gen-carry-count',
    version: 1,
    topicId: 'cryptarithmetic',
    conceptId: 'cr-carry',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['cr-carry-f', 'cr-columns-f'],
    estimatedSeconds: 90,
    params(rng) {
      const made = makePuzzle(rng, draws.mixed, { minLetters: 4, maxLetters: 6 });
      return made && { puzzle: made.puzzle };
    },
    answer: ({ puzzle }) => solveColumns(puzzle)[0].carries.filter((c) => c === 1).length,
    verify: ({ puzzle }, value) => {
      const solution = uniqueByBruteForce(puzzle);
      if (!solution) return false;
      // Carries from plain arithmetic on the solved numbers: column i carries when the
      // sum of the numbers' last i + 1 digits reaches 10^(i + 1).
      const values = puzzle.terms.map((w) => wordValue(w, solution));
      let count = 0;
      for (let i = 0; i < columnCount(puzzle); i++) {
        const m = 10 ** (i + 1);
        if (values.reduce((acc, v) => acc + (v % m), 0) >= m) count += 1;
      }
      return count === value;
    },
    render({ puzzle }) {
      const solution = solveColumns(puzzle)[0].assignment;
      const working = columnWorking(puzzle, solution);
      return {
        question: `${puzzleText(puzzle)} has exactly one solution. ${RULES} Solve it, then count: how many columns pass a carry of 1 to the next column?`,
        explanation: `The solution is ${valuesText(puzzle, solution)} (${lettersText(puzzle, solution)}). Working the columns from the units: ${working.join(' ')}`,
        solutionSteps: [`Solution: ${valuesText(puzzle, solution)}.`, ...working],
        method: 'Solve the puzzle, then redo the addition column by column, noting each carry.',
        hints: [
          longer(puzzle) ? `${puzzle.result} is one letter longer, so ${puzzle.result[0]} = 1: the last column certainly carries.` : `${puzzle.result} is no longer than the longest word, so the last column does not carry.`,
          'A column carries when its digits and the carry in add to 10 or more.'
        ],
        commonMistakes: ['Forgetting the carry into the extra leading digit.', 'Counting the columns, not the carries.']
      };
    }
  },

  {
    id: 'cr-gen-units-letter',
    version: 1,
    topicId: 'cryptarithmetic',
    conceptId: 'cr-columns',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['cr-columns-f', 'cr-sc-same-digit'],
    estimatedSeconds: 90,
    params(rng) {
      const made = makePuzzle(rng, rng.chance(0.5) ? draws.double3 : draws.double4, { minLetters: 4, maxLetters: 6 });
      if (!made) return null;
      return { puzzle: made.puzzle, letter: made.puzzle.terms[0].slice(-1) };
    },
    answer: ({ puzzle, letter }) => solveColumns(puzzle)[0].assignment[letter],
    verify: ({ puzzle, letter }, value) => {
      const solution = uniqueByBruteForce(puzzle);
      return Boolean(solution) && solution[letter] === value;
    },
    render({ puzzle, letter }) {
      const solution = solveColumns(puzzle)[0].assignment;
      const out = puzzle.result.slice(-1);
      return {
        question: `${puzzleText(puzzle)}. ${RULES} The puzzle has exactly one solution. What digit is ${letter}?`,
        explanation: `Units column: ${letter} + ${letter} ends in ${out}, so ${out} is even and ${letter} is one of two digits five apart. The other columns decide which: the solution is ${valuesText(puzzle, solution)}, so ${letter} = ${solution[letter]}.`,
        solutionSteps: [`Units: ${letter} + ${letter} = ${out} (+ 10 if it carries).`, ...columnWorking(puzzle, solution), `${letter} = ${solution[letter]}.`],
        method: 'Start at the units column, then carry leftwards and check each case.',
        hints: [`The units column is ${letter} + ${letter}. Which digits can ${out} be?`, `Each value of ${out} leaves two choices for ${letter} (with or without a carry). Test them in the tens column.`],
        commonMistakes: [`Giving ${out} instead of ${letter}.`, 'Ignoring the second choice for the units digit (5 more, with a carry).']
      };
    }
  },

  {
    id: 'cr-gen-letter-pair',
    version: 1,
    topicId: 'cryptarithmetic',
    conceptId: 'cr-columns',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['cr-columns-f'],
    estimatedSeconds: 150,
    params(rng) {
      const made = makePuzzle(rng, draws.pair4, { minLetters: 5, maxLetters: 6, tries: 300 });
      if (!made) return null;
      return { puzzle: made.puzzle, letter: askable(made.puzzle, made.digitOf, rng) };
    },
    answer: ({ puzzle, letter }) => solveColumns(puzzle)[0].assignment[letter],
    formatValue: (value) => String(value),
    distractors: ({ puzzle, letter }) => {
      const a = solveColumns(puzzle)[0].assignment;
      return [...otherDigits(puzzle, a, letter), { value: (a[letter] + 1) % 10, why: 'added a carry that is not there' }];
    },
    verify: ({ puzzle, letter }, value) => {
      const solution = uniqueByBruteForce(puzzle);
      return Boolean(solution) && solution[letter] === value;
    },
    render({ puzzle, letter }) {
      const solution = solveColumns(puzzle)[0].assignment;
      return {
        question: `${puzzleText(puzzle)}. ${RULES} The puzzle has exactly one solution. What is ${letter}?`,
        explanation: `Working from the units column with the carries gives ${valuesText(puzzle, solution)}: ${lettersText(puzzle, solution)}. So ${letter} = ${solution[letter]}.`,
        solutionSteps: columnWorking(puzzle, solution),
        method: 'Right to left, one column at a time, keeping every carry.',
        hints: [
          longer(puzzle) ? `${puzzle.result} is one letter longer, so ${puzzle.result[0]} = 1.` : `Look for a column where a letter repeats, or where only one letter is new.`,
          `Find the column holding ${letter}, and the carry coming into it.`
        ],
        commonMistakes: ['Mixing up two letters in the same column.', 'Dropping a carry from the column on the right.']
      };
    }
  },

  {
    id: 'cr-gen-word-value',
    version: 1,
    topicId: 'cryptarithmetic',
    conceptId: 'cr-addition',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['cr-addition-f', 'cr-columns-f'],
    estimatedSeconds: 150,
    params(rng) {
      const made = makePuzzle(rng, draws.mixed, { minLetters: 4, maxLetters: 6 });
      return made && { puzzle: made.puzzle };
    },
    answer: ({ puzzle }) => wordValue(puzzle.result, solveColumns(puzzle)[0].assignment),
    verify: ({ puzzle }, value) => {
      const solution = uniqueByBruteForce(puzzle);
      return Boolean(solution) && wordValue(puzzle.result, solution) === value;
    },
    render({ puzzle }) {
      const solution = solveColumns(puzzle)[0].assignment;
      return {
        question: `${puzzleText(puzzle)}. ${RULES} The puzzle has exactly one solution. What number is ${puzzle.result}?`,
        explanation: `The solution is ${valuesText(puzzle, solution)} (${lettersText(puzzle, solution)}), so ${puzzle.result} = ${wordValue(puzzle.result, solution)}.`,
        solutionSteps: [...columnWorking(puzzle, solution), `${puzzle.result} = ${wordValue(puzzle.result, solution)}.`],
        method: 'Leading 1 if the answer is longer, then right to left with the carries.',
        hints: [
          longer(puzzle) ? `${puzzle.result} has one more letter, so ${puzzle.result[0]} = 1.` : `${puzzle.result} is no longer than the words being added, so there is no leading 1 to use.`,
          'Use the columns where a letter repeats first; they fix a digit or leave two choices.'
        ],
        commonMistakes: [`Giving ${puzzle.terms[0]} instead of ${puzzle.result}.`]
      };
    }
  },

  {
    id: 'cr-gen-addition-letter',
    version: 1,
    topicId: 'cryptarithmetic',
    conceptId: 'cr-addition',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['cr-addition-f'],
    estimatedSeconds: 120,
    params(rng) {
      const made = makePuzzle(rng, rng.chance(0.5) ? draws.double3 : draws.double4, { minLetters: 4, maxLetters: 6 });
      if (!made) return null;
      return { puzzle: made.puzzle, letter: askable(made.puzzle, made.digitOf, rng) };
    },
    answer: ({ puzzle, letter }) => solveColumns(puzzle)[0].assignment[letter],
    formatValue: (value) => String(value),
    distractors: ({ puzzle, letter }) => {
      const a = solveColumns(puzzle)[0].assignment;
      return [...otherDigits(puzzle, a, letter), { value: (a[letter] + 5) % 10, why: 'took the other digit with the same double' }];
    },
    verify: ({ puzzle, letter }, value) => {
      const solution = uniqueByBruteForce(puzzle);
      return Boolean(solution) && solution[letter] === value;
    },
    render({ puzzle, letter }) {
      const solution = solveColumns(puzzle)[0].assignment;
      return {
        question: `${puzzleText(puzzle)}. ${RULES} What is ${letter}?`,
        explanation: `${puzzle.terms[0]} + ${puzzle.terms[0]} doubles one number, so each column reads 2 × digit + carry. Working from the units gives ${valuesText(puzzle, solution)}, so ${letter} = ${solution[letter]}.`,
        solutionSteps: columnWorking(puzzle, solution),
        method: 'A word added to itself: each column is 2 × digit + carry.',
        hints: [`Every digit of ${puzzle.result} is 2 × a digit of ${puzzle.terms[0]} + carry, so its units digit is even.`, `Find ${letter} in the columns and test the two digits that double to the right ending.`],
        commonMistakes: ['Forgetting that a digit of 5 or more carries 1 into the next column.']
      };
    }
  },

  {
    id: 'cr-gen-product-letter',
    version: 1,
    topicId: 'cryptarithmetic',
    conceptId: 'cr-multiplication',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['cr-mult-f', 'cr-sc-self-end'],
    estimatedSeconds: 120,
    params(rng) {
      const made = makePuzzle(rng, draws.product, { minLetters: 3, maxLetters: 5 });
      if (!made) return null;
      return { puzzle: made.puzzle, letter: rng.pick(lettersOf(made.puzzle)) };
    },
    answer: ({ puzzle, letter }) => productSolutions(puzzle)[0][letter],
    verify: ({ puzzle, letter }, value) => {
      const solution = uniqueByBruteForce(puzzle);
      return Boolean(solution) && solution[letter] === value;
    },
    render({ puzzle, letter }) {
      const a = productSolutions(puzzle)[0];
      const [p, m] = puzzle.terms;
      const units = `${p.slice(-1)} × ${m}`;
      return {
        question: `${puzzleText(puzzle)}. ${RULES} The puzzle has exactly one solution. What digit is ${letter}?`,
        explanation: `The units digit of the product comes from ${units} alone, which must end in ${puzzle.result.slice(-1)}; the number of digits in ${puzzle.result} limits the size. Checking the few cases left gives ${valuesText(puzzle, a)} (${lettersText(puzzle, a)}), so ${letter} = ${a[letter]}.`,
        solutionSteps: [`Units: ${units} ends in ${puzzle.result.slice(-1)}.`, `${puzzle.result} has ${puzzle.result.length} digits, which bounds ${p} × ${m}.`, `Solution: ${valuesText(puzzle, a)}.`, `${letter} = ${a[letter]}.`],
        method: 'Units digits first, then the size of the product.',
        hints: [`Which digits for ${p.slice(-1)} and ${m} make ${units} end in ${puzzle.result.slice(-1)}?`, `${puzzle.result} has ${puzzle.result.length} digits: how large can ${p} × ${m} be?`],
        commonMistakes: ['Using the tens digit to find the units digit of the product.', 'Letting two letters share a digit.']
      };
    }
  },

  {
    id: 'cr-gen-product-value',
    version: 1,
    topicId: 'cryptarithmetic',
    conceptId: 'cr-multiplication',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['cr-mult-f'],
    estimatedSeconds: 150,
    params(rng) {
      const made = makePuzzle(rng, draws.product, { minLetters: 3, maxLetters: 5 });
      return made && { puzzle: made.puzzle };
    },
    answer: ({ puzzle }) => wordValue(puzzle.result, productSolutions(puzzle)[0]),
    formatValue: (value) => fmt(value),
    distractors: ({ puzzle }) => {
      const a = productSolutions(puzzle)[0];
      const x = wordValue(puzzle.terms[0], a);
      const m = a[puzzle.terms[1]];
      const reversed = Number(String(x * m).split('').reverse().join(''));
      return [
        { value: x * (m + 1), why: 'multiplied by one more' },
        { value: x * (m - 1), why: 'multiplied by one less' },
        { value: reversed, why: 'read the product right to left' },
        { value: x + m, why: 'added instead of multiplying' }
      ];
    },
    verify: ({ puzzle }, value) => {
      const solution = uniqueByBruteForce(puzzle);
      return Boolean(solution) && wordValue(puzzle.terms[0], solution) * wordValue(puzzle.terms[1], solution) === value;
    },
    render({ puzzle }) {
      const a = productSolutions(puzzle)[0];
      const [p, m] = puzzle.terms;
      return {
        question: `${puzzleText(puzzle)}. ${RULES} The puzzle has exactly one solution. What number is ${puzzle.result}?`,
        explanation: `The units column ${p.slice(-1)} × ${m} must end in ${puzzle.result.slice(-1)}, and repeated letters in ${puzzle.result} must match. The only fit is ${valuesText(puzzle, a)}, so ${puzzle.result} = ${fmt(wordValue(puzzle.result, a))}.`,
        solutionSteps: [`Units: ${p.slice(-1)} × ${m} ends in ${puzzle.result.slice(-1)}.`, `Match the repeated letters of ${puzzle.result} with ${p}.`, `${valuesText(puzzle, a)}.`],
        method: 'Units digit, then the letters the product shares with the number.',
        hints: [`Which letters of ${puzzle.result} also appear in ${p}? They must keep their digits.`, `Try values of ${m} and check the units digit first.`],
        commonMistakes: ['Choosing a product that fits the length but breaks a repeated letter.']
      };
    }
  },

  {
    id: 'cr-gen-difference',
    version: 1,
    topicId: 'cryptarithmetic',
    conceptId: 'cr-adv-subtraction',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['cr-sub-f', 'cr-columns-f'],
    estimatedSeconds: 150,
    params(rng) {
      const made = makePuzzle(rng, draws.difference, { minLetters: 4, maxLetters: 6, tries: 200 });
      if (!made) return null;
      const { puzzle } = made;
      return { puzzle, letter: rng.chance(0.5) ? null : askable(puzzle, made.digitOf, rng) };
    },
    answer: ({ puzzle, letter }) => {
      const a = solveColumns(puzzle)[0].assignment;
      return letter ? a[letter] : wordValue(puzzle.terms[0], a);
    },
    verify: ({ puzzle, letter }, value) => {
      const solution = uniqueByBruteForce(puzzle);
      if (!solution) return false;
      return letter ? solution[letter] === value : wordValue(puzzle.terms[0], solution) === value;
    },
    render({ puzzle, letter }) {
      const a = solveColumns(puzzle)[0].assignment;
      const sum = asAddition(puzzle);
      const target = letter ? `What digit is ${letter}?` : `What number is ${puzzle.terms[0]}?`;
      const value = letter ? a[letter] : wordValue(puzzle.terms[0], a);
      return {
        question: `${puzzleText(puzzle)}. ${RULES} The puzzle has exactly one solution. ${target}`,
        explanation: `Rewrite the difference as a sum: ${puzzleText(sum)}. ${longer(sum) ? `${sum.result} is one letter longer, so ${sum.result[0]} = 1. ` : ''}Working the sum from the units gives ${valuesText(sum, a)}, so ${valuesText(puzzle, a)} and the answer is ${value}.`,
        solutionSteps: [`${puzzleText(puzzle)} ⇔ ${puzzleText(sum)}.`, ...columnWorking(puzzle, a), `Answer: ${value}.`],
        method: 'A − B = C is B + C = A.',
        hints: [`Rewrite it as ${puzzleText(sum)}.`, longer(sum) ? `${sum.result} has one more letter, so ${sum.result[0]} = 1.` : 'Work the sum from the units column, keeping the carries.'],
        commonMistakes: ['Borrowing column by column and losing a borrow.', letter ? `Giving the value of a word instead of the digit ${letter}.` : `Giving ${puzzle.result} instead of ${puzzle.terms[0]}.`]
      };
    }
  },

  {
    id: 'cr-gen-triple',
    version: 1,
    topicId: 'cryptarithmetic',
    conceptId: 'cr-adv-three',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['cr-three-f'],
    estimatedSeconds: 150,
    params(rng) {
      const made = makePuzzle(rng, draws.triple, { minLetters: 4, maxLetters: 6 });
      return made && { puzzle: made.puzzle };
    },
    answer: ({ puzzle }) => wordValue(puzzle.terms[0], solveColumns(puzzle)[0].assignment),
    verify: ({ puzzle }, value) => {
      const solution = uniqueByBruteForce(puzzle);
      return Boolean(solution) && wordValue(puzzle.terms[0], solution) === value && 3 * value === wordValue(puzzle.result, solution);
    },
    render({ puzzle }) {
      const a = solveColumns(puzzle)[0].assignment;
      const w = puzzle.terms[0];
      return {
        question: `${puzzleText(puzzle)}. ${RULES} The puzzle has exactly one solution. What number is ${w}?`,
        explanation: `${w} + ${w} + ${w} = 3 × ${w}, so each column reads 3 × digit + carry, and a carry can be 0, 1 or 2. Working from the units: ${columnWorking(puzzle, a).join(' ')} So ${w} = ${wordValue(w, a)} and 3 × ${wordValue(w, a)} = ${wordValue(puzzle.result, a)}.`,
        solutionSteps: [...columnWorking(puzzle, a), `${w} = ${wordValue(w, a)}.`],
        method: 'A word added three times is the word times 3.',
        hints: [`${puzzle.result} has ${puzzle.result.length} digits. How large can ${w} be, and so what can ${w[0]} be?`, `Units: 3 × ${w.slice(-1)} ends in ${puzzle.result.slice(-1)}. Only one digit does that.`],
        commonMistakes: ['Allowing only carries of 0 or 1.', `Giving ${puzzle.result} instead of ${w}.`]
      };
    }
  },

  {
    id: 'cr-gen-triple-carry',
    version: 1,
    topicId: 'cryptarithmetic',
    conceptId: 'cr-adv-three',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['cr-three-f'],
    estimatedSeconds: 120,
    params(rng) {
      const made = makePuzzle(rng, draws.triple, { minLetters: 4, maxLetters: 6 });
      if (!made) return null;
      return { puzzle: made.puzzle, column: rng.int(0, 1) };
    },
    answer: ({ puzzle, column }) => solveColumns(puzzle)[0].carries[column],
    verify: ({ puzzle, column }, value) => {
      const solution = uniqueByBruteForce(puzzle);
      if (!solution) return false;
      const m = 10 ** (column + 1);
      // The carry out of a column of three equal numbers: how many times 10^(i+1) fits in 3 × (last i + 1 digits).
      return Math.floor((3 * (wordValue(puzzle.terms[0], solution) % m)) / m) === value;
    },
    render({ puzzle, column }) {
      const a = solveColumns(puzzle)[0].assignment;
      const working = columnWorking(puzzle, a);
      return {
        question: `${puzzleText(puzzle)} has exactly one solution. ${RULES} What carry does the ${COLUMN[column]} column pass to the ${COLUMN[column + 1]} column?`,
        explanation: `The solution is ${valuesText(puzzle, a)}. ${working.slice(0, column + 1).join(' ')} With three numbers a column can carry 0, 1 or 2.`,
        solutionSteps: [`Solution: ${valuesText(puzzle, a)}.`, ...working.slice(0, column + 1)],
        method: 'Solve it, then redo the column: 3 × digit + carry in.',
        hints: [`Units: 3 × ${puzzle.terms[0].slice(-1)} ends in ${puzzle.result.slice(-1)}; only one digit does that.`, 'Three digits and a carry can reach 29, so the carry can be 2.'],
        commonMistakes: ['Assuming a carry is never more than 1.']
      };
    }
  }
];
