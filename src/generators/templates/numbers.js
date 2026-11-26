/**
 * Number system, arithmetic progression, counting and probability templates.
 *
 * Where possible the verifier brute-forces the answer (counting divisors,
 * enumerating arrangements or outcomes) rather than reusing the formula.
 */

import { factorial, fmt, format, fractionText, lcm, nCr, nPr, reduceFraction } from '../core.js';

const SUPERSCRIPT = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const superscript = (n) => String(n).split('').map((d) => SUPERSCRIPT[d]).join('');

function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
}

function countDivisors(n) {
  let count = 0;
  for (let i = 1; i <= n; i++) if (n % i === 0) count++;
  return count;
}

function bitCount(mask) {
  let count = 0;
  while (mask) {
    count += mask & 1;
    mask >>= 1;
  }
  return count;
}

/**
 * Distinct arrangements of a word's letters, counted by placing one letter at a
 * time (memoised on the remaining letter counts), not by the n!/(p!q!…) formula.
 */
function countArrangements(word) {
  const counts = {};
  for (const ch of word) counts[ch] = (counts[ch] || 0) + 1;
  const letters = Object.keys(counts);
  const memo = new Map();
  const walk = () => {
    const key = letters.map((letter) => counts[letter]).join(',');
    if (memo.has(key)) return memo.get(key);
    let remaining = 0;
    for (const letter of letters) remaining += counts[letter];
    if (remaining === 0) return 1;
    let total = 0;
    for (const letter of letters) {
      if (!counts[letter]) continue;
      counts[letter] -= 1;
      total += walk();
      counts[letter] += 1;
    }
    memo.set(key, total);
    return total;
  };
  return walk();
}

/** Every ordering of 0..n−1, visited one at a time. */
function forEachPermutation(n, visit) {
  const order = [];
  const used = new Array(n).fill(false);
  const step = () => {
    if (order.length === n) return visit(order);
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      order.push(i);
      step();
      order.pop();
      used[i] = false;
    }
  };
  step();
}

const WORDS = ['LEVEL', 'APPLE', 'BANANA', 'COFFEE', 'LETTER', 'BALLOON', 'SUCCESS', 'ARRANGE', 'PEPPER', 'TOFFEE', 'CHEESE', 'MAMMAL', 'COTTON', 'BUBBLE', 'KETTLE', 'TATTOO', 'RIDDLE', 'ASSESS', 'GIGGLE', 'PUPPET', 'ADDRESS'];

const DECK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].flatMap((rank) =>
  ['spades', 'hearts', 'diamonds', 'clubs'].map((suit) => ({ rank, suit, red: suit === 'hearts' || suit === 'diamonds' }))
);
const FACE = ['J', 'Q', 'K'];
const CARD_EVENTS = {
  'a king': (c) => c.rank === 'K',
  'an ace': (c) => c.rank === 'A',
  'a jack': (c) => c.rank === 'J',
  'a heart': (c) => c.suit === 'hearts',
  'a spade': (c) => c.suit === 'spades',
  'a face card': (c) => FACE.includes(c.rank),
  'a red card': (c) => c.red,
  'a red king': (c) => c.red && c.rank === 'K',
  'a red ace': (c) => c.red && c.rank === 'A',
  'an ace or a king': (c) => c.rank === 'A' || c.rank === 'K',
  'a king or a queen': (c) => c.rank === 'K' || c.rank === 'Q',
  'a black face card': (c) => !c.red && FACE.includes(c.rank),
  'a queen or a heart': (c) => c.rank === 'Q' || c.suit === 'hearts',
  'a club or a diamond': (c) => c.suit === 'clubs' || c.suit === 'diamonds',
  'the queen of spades': (c) => c.rank === 'Q' && c.suit === 'spades',
  'a number card from 2 to 10': (c) => !FACE.includes(c.rank) && c.rank !== 'A'
};
const cardCount = (event) => DECK.filter(CARD_EVENTS[event]).length;

const DIE_EVENTS = {
  'an even number': (n) => n % 2 === 0,
  'an odd number': (n) => n % 2 === 1,
  'a prime number': (n) => [2, 3, 5].includes(n),
  'a multiple of 3': (n) => n % 3 === 0,
  'a 6': (n) => n === 6,
  'a number greater than 2': (n) => n > 2,
  'a number greater than 4': (n) => n > 4,
  'a number less than 3': (n) => n < 3,
  'a number less than 5': (n) => n < 5,
  'a factor of 6': (n) => 6 % n === 0
};
const dieCount = (event) => [1, 2, 3, 4, 5, 6].filter(DIE_EVENTS[event]).length;

/* Conditions on two dice (first, second) for the conditional-probability template. */
const GIVEN_EVENTS = {
  sum: { text: (k) => `the sum is ${k}`, test: (k) => (x, y) => x + y === k },
  sumOver: { text: (k) => `the sum is more than ${k}`, test: (k) => (x, y) => x + y > k },
  six: { text: () => 'at least one die shows a 6', test: () => (x, y) => x === 6 || y === 6 },
  different: { text: () => 'the two dice show different numbers', test: () => (x, y) => x !== y }
};
const TARGET_EVENTS = {
  double: { text: () => 'both dice show the same number', test: () => (x, y) => x === y },
  shows: { text: (d) => `at least one die shows a ${d}`, test: (d) => (x, y) => x === d || y === d },
  firstLarger: { text: () => 'the first die shows a larger number than the second', test: () => (x, y) => x > y },
  bothOdd: { text: () => 'both dice show odd numbers', test: () => (x, y) => x % 2 === 1 && y % 2 === 1 }
};

/** Counts over the 36 ordered outcomes of two dice. */
function diceCounts(given, target) {
  const inGiven = GIVEN_EVENTS[given.kind].test(given.k);
  const inTarget = TARGET_EVENTS[target.kind].test(target.k);
  let nGiven = 0;
  let nTarget = 0;
  let nBoth = 0;
  const list = [];
  for (let x = 1; x <= 6; x++) {
    for (let y = 1; y <= 6; y++) {
      if (inTarget(x, y)) nTarget++;
      if (!inGiven(x, y)) continue;
      nGiven++;
      list.push(`(${x},${y})`);
      if (inTarget(x, y)) nBoth++;
    }
  }
  return { nGiven, nTarget, nBoth, list };
}

/**
 * Seatings of n people around a table, counted by fixing person 0 in seat 0 and
 * trying every order of the rest. `keep(seats)` filters; seats[i] is who sits in seat i.
 */
function countRoundTable(n, keep) {
  let count = 0;
  forEachPermutation(n - 1, (order) => {
    if (keep([0, ...order.map((p) => p + 1)])) count++;
  });
  return count;
}

/** Ways to write n as an ordered sum of r parts, each at least `min`, counted part by part. */
function countCompositions(n, r, min) {
  if (r === 0) return n === 0 ? 1 : 0;
  let count = 0;
  for (let first = min; first <= n; first++) count += countCompositions(n - first, r - 1, min);
  return count;
}

const SHARE_CONTEXTS = [
  { items: 'identical chocolates', people: 'children', each: 'child' },
  { items: 'identical marbles', people: 'boxes', each: 'box' },
  { items: 'identical pens', people: 'students', each: 'student' },
  { items: 'identical coins', people: 'bags', each: 'bag' }
];
const VARIABLES = ['a', 'b', 'c', 'd'];
const balls = (n) => (n === 1 ? 'ball' : 'balls');

/* Two-digit numbers with non-zero digits, for the digit puzzles. */
const DIGIT_PAIRS = Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9) + 1, (i % 9) + 1]);
const DIGIT_CLUES = {
  sum: { text: (a, b) => `The digits of a two-digit number add up to ${a + b}.`, test: (a, b, ref) => a + b === ref.a + ref.b },
  product: { text: (a, b) => `The product of the digits of a two-digit number is ${a * b}.`, test: (a, b, ref) => a * b === ref.a * ref.b },
  times: { text: (a, b) => `A two-digit number is ${(10 * a + b) / (a + b)} times the sum of its digits.`, test: (a, b, ref) => (10 * a + b) * (ref.a + ref.b) === (10 * ref.a + ref.b) * (a + b) }
};

/** Two-digit numbers (non-zero digits) that satisfy the clue and change by the same amount when reversed. */
function digitMatches(clue, ref) {
  return DIGIT_PAIRS.filter(([a, b]) => DIGIT_CLUES[clue].test(a, b, ref) && b - a === ref.b - ref.a);
}

const SEQUENCE_KINDS = {
  whole: { step: 1, words: 'consecutive whole numbers' },
  even: { step: 2, words: 'consecutive even numbers' },
  odd: { step: 2, words: 'consecutive odd numbers' }
};

/* Expressions in two whole numbers A and B, for the odd/even template. */
const PARITY_EXPRESSIONS = [
  ['A + B', (a, b) => a + b],
  ['A × B', (a, b) => a * b],
  ['A² + B', (a, b) => a * a + b],
  ['A + B + 1', (a, b) => a + b + 1],
  ['2A + B', (a, b) => 2 * a + b],
  ['A² + B²', (a, b) => a * a + b * b],
  ['AB + A', (a, b) => a * b + a],
  ['3A + 2B', (a, b) => 3 * a + 2 * b],
  ['A²B', (a, b) => a * a * b],
  ['(A + 1)(B + 1)', (a, b) => (a + 1) * (b + 1)],
  ['A + 2B', (a, b) => a + 2 * b],
  ['B² + 1', (a, b) => b * b + 1],
  ['AB + 1', (a, b) => a * b + 1],
  ['A³ + B', (a, b) => a ** 3 + b]
];
const VARIABLE_PAIRS = [['a', 'b'], ['m', 'n'], ['x', 'y'], ['p', 'q']];
const parity = (value) => ((value % 2) + 2) % 2;
const oddEven = (p) => (p ? 'odd' : 'even');
const nameExpression = (expr, [first, second]) => expr.replace(/A/g, first).replace(/B/g, second);

/**
 * Whether `parts` positive whole numbers, each at most `cap` (and all different if
 * `distinct`), can add up to exactly `sum`. Searched largest part first.
 */
function canFill(sum, parts, cap, distinct) {
  if (parts === 0) return sum === 0;
  for (let first = Math.min(cap, sum); first >= 1; first--) {
    if (canFill(sum - first, parts - 1, distinct ? first - 1 : first, distinct)) return true;
  }
  return false;
}

export const numberTemplates = [
  /* ========================== number system ========================== */
  {
    id: 'ns-unit-digit',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-remainders',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['ns-division-identity'],
    estimatedSeconds: 70,
    tags: ['cyclicity'],
    params(rng) {
      return { base: rng.int(2, 9), exp: rng.int(11, 99) };
    },
    answer({ base, exp }) {
      const cycle = [1, 2, 3, 4].map((k) => base ** k % 10);
      return cycle[(exp - 1) % 4];
    },
    verify({ base, exp }, value) {
      let result = 1;
      for (let i = 0; i < exp; i++) result = (result * base) % 10;
      return result === value;
    },
    render({ base, exp }) {
      const cycle = [1, 2, 3, 4].map((k) => base ** k % 10);
      const position = ((exp - 1) % 4) + 1;
      return {
        question: `What is the unit digit of ${base}${superscript(exp)}?`,
        explanation: `Unit digits of powers of ${base} repeat as ${cycle.join(', ')} (period 4). ${exp} leaves remainder ${exp % 4} when divided by 4, so the unit digit is the ${ordinal(position)} in the cycle: ${cycle[position - 1]}.`,
        solutionSteps: [
          `Unit digits of ${base}¹, ${base}², ${base}³, ${base}⁴: ${cycle.join(', ')}.`,
          `The pattern repeats every 4 powers.`,
          `${exp} ÷ 4 leaves remainder ${exp % 4}${exp % 4 === 0 ? ' — use the last digit of the cycle' : ''}.`,
          `Unit digit = ${cycle[position - 1]}.`
        ],
        method: 'Find the repeating cycle of unit digits, then use the exponent\'s remainder.',
        hints: [
          `Write the unit digits of ${base}¹, ${base}², ${base}³ and ${base}⁴.`,
          'The unit digits repeat with a period of 4 (or a factor of 4).',
          `Divide ${exp} by 4 and look at the remainder.`
        ],
        commonMistakes: ['Treating a remainder of 0 as the first digit of the cycle instead of the last.']
      };
    }
  },

  {
    id: 'ns-factor-count',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-factors',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ns-factor-count'],
    estimatedSeconds: 70,
    params(rng) {
      const primes = rng.shuffle([2, 3, 5, 7]).slice(0, rng.pick([2, 2, 3]));
      const powers = primes.map(() => rng.int(1, 4));
      const N = primes.reduce((acc, p, i) => acc * p ** powers[i], 1);
      if (N < 20 || N > 5000) return null;
      return { primes, powers, N };
    },
    answer: ({ powers }) => powers.reduce((acc, e) => acc * (e + 1), 1),
    formatValue: (value) => format.number(value),
    distractors: ({ powers }) => {
      const count = powers.reduce((acc, e) => acc * (e + 1), 1);
      return [
        { value: powers.reduce((acc, e) => acc * e, 1), why: 'multiplied the exponents without adding 1' },
        { value: powers.reduce((acc, e) => acc + e + 1, 0), why: 'added instead of multiplying' },
        { value: count - 2, why: 'excluded 1 and the number itself' },
        { value: count + 1, why: 'counted one factor twice' }
      ];
    },
    verify: ({ N }, value) => countDivisors(N) === value,
    render({ primes, powers, N }) {
      const factorisation = primes.map((p, i) => `${p}${powers[i] > 1 ? superscript(powers[i]) : ''}`).join(' × ');
      const count = powers.reduce((acc, e) => acc * (e + 1), 1);
      return {
        question: `How many factors does ${fmt(N)} have?`,
        explanation: `${fmt(N)} = ${factorisation}, so the number of factors is ${powers.map((e) => `(${e} + 1)`).join(' × ')} = ${count}.`,
        solutionSteps: [
          `Prime factorise: ${fmt(N)} = ${factorisation}.`,
          'Add 1 to each exponent.',
          `Multiply: ${powers.map((e) => e + 1).join(' × ')} = ${count}.`
        ],
        method: 'Prime factorise, then multiply (exponent + 1) for each prime.',
        hints: [
          `Break ${fmt(N)} into prime factors first.`,
          `${fmt(N)} = ${factorisation}.`,
          'Each prime can appear 0 up to its exponent times in a factor.'
        ],
        commonMistakes: ['Multiplying the exponents themselves.']
      };
    }
  },

  {
    id: 'ns-common-remainder',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-remainders',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['ns-division-identity'],
    estimatedSeconds: 90,
    params(rng) {
      const divisors = rng.shuffle([3, 4, 5, 6, 8, 9, 10, 12, 15]).slice(0, 3).sort((a, b) => a - b);
      const r = rng.int(1, divisors[0] - 1);
      const L = divisors.reduce((acc, d) => lcm(acc, d), 1);
      if (L > 400) return null;
      return { divisors, r };
    },
    answer: ({ divisors, r }) => divisors.reduce((acc, d) => lcm(acc, d), 1) + r,
    verify({ divisors, r }, value) {
      for (let n = r + 1; n <= value; n++) {
        if (divisors.every((d) => n % d === r)) return n === value;
      }
      return false;
    },
    render({ divisors, r }) {
      const L = divisors.reduce((acc, d) => lcm(acc, d), 1);
      return {
        question: `What is the smallest number greater than ${r} that leaves a remainder of ${r} when divided by ${divisors[0]}, ${divisors[1]} and ${divisors[2]}?`,
        explanation: `(number − ${r}) must be divisible by all three, so it is the LCM, ${L}. The number is ${L} + ${r} = ${L + r}.`,
        solutionSteps: [
          `If each division leaves ${r}, then (number − ${r}) is a common multiple of ${divisors.join(', ')}.`,
          `LCM(${divisors.join(', ')}) = ${L}.`,
          `Number = ${L} + ${r} = ${L + r}.`
        ],
        method: 'Subtract the common remainder, take the LCM, add the remainder back.',
        hints: [
          `What can you say about (number − ${r})?`,
          'It must be divisible by every one of the divisors.',
          `Find the LCM of ${divisors.join(', ')}.`
        ],
        commonMistakes: ['Multiplying the divisors instead of taking their LCM.']
      };
    }
  },

  /* ====================== arithmetic progression ====================== */
  {
    id: 'ap-nth-term',
    version: 1,
    topicId: 'arithmetic-progression',
    conceptId: 'ap-nth-term',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['ap-nth'],
    estimatedSeconds: 40,
    params(rng) {
      return { a: rng.int(1, 30), d: rng.int(2, 12), n: rng.int(8, 40) };
    },
    answer: ({ a, d, n }) => a + (n - 1) * d,
    formatValue: (value) => format.number(value),
    distractors: ({ a, d, n }) => [
      { value: a + n * d, why: 'used n steps instead of n − 1' },
      { value: a + (n - 2) * d, why: 'counted one step too few' },
      { value: n * d, why: 'ignored the first term' }
    ],
    verify({ a, d, n }, value) {
      let term = a;
      for (let i = 1; i < n; i++) term += d;
      return term === value;
    },
    render({ a, d, n }) {
      const term = a + (n - 1) * d;
      return {
        question: `What is the ${ordinal(n)} term of the sequence ${a}, ${a + d}, ${a + 2 * d}, ${a + 3 * d}, …?`,
        explanation: `a = ${a}, d = ${d}, so the ${ordinal(n)} term = ${a} + (${n} − 1) × ${d} = ${term}.`,
        solutionSteps: [
          `First term a = ${a}; common difference d = ${d}.`,
          `aₙ = a + (n − 1)d = ${a} + ${n - 1} × ${d}.`,
          `= ${term}.`
        ],
        method: 'aₙ = a + (n − 1)d.',
        hints: [
          'Find the common difference first.',
          `Reaching the ${ordinal(n)} term takes ${n - 1} steps, not ${n}.`,
          `Compute ${a} + ${n - 1} × ${d}.`
        ],
        commonMistakes: ['Using n instead of (n − 1).']
      };
    }
  },

  {
    id: 'ap-count-terms',
    version: 1,
    topicId: 'arithmetic-progression',
    conceptId: 'ap-count',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['ap-count-formula'],
    estimatedSeconds: 55,
    tags: ['trap'],
    params(rng) {
      return { a: rng.int(1, 20), d: rng.int(2, 9), n: rng.int(10, 60) };
    },
    answer: ({ n }) => n,
    formatValue: (value) => format.number(value),
    distractors: ({ a, d, n }) => {
      const l = a + (n - 1) * d;
      return [
        { value: n - 1, why: 'counted gaps instead of terms' },
        { value: n + 1, why: 'added one too many' },
        { value: Math.floor(l / d), why: 'divided the last term by the difference' },
        { value: l - a, why: 'subtracted the first term from the last' }
      ];
    },
    verify({ a, d, n }, value) {
      const l = a + (n - 1) * d;
      let count = 0;
      for (let term = a; term <= l; term += d) count++;
      return count === value;
    },
    render({ a, d, n }) {
      const l = a + (n - 1) * d;
      return {
        question: `How many terms are there in the sequence ${a}, ${a + d}, ${a + 2 * d}, …, ${l}?`,
        explanation: `n = (${l} − ${a}) ÷ ${d} + 1 = ${n - 1} + 1 = ${n}.`,
        solutionSteps: [
          `Common difference d = ${d}.`,
          `Number of steps = (${l} − ${a}) ÷ ${d} = ${n - 1}.`,
          `Number of terms = ${n - 1} + 1 = ${n}.`
        ],
        method: 'n = (last − first) ÷ d + 1.',
        hints: [
          'Count the gaps between terms first.',
          `(${l} − ${a}) ÷ ${d} gives the number of gaps.`,
          'There is always one more term than there are gaps.'
        ],
        commonMistakes: ['Forgetting the +1.']
      };
    }
  },

  /* ========================= counting ========================= */
  {
    id: 'pnc-posts',
    version: 1,
    topicId: 'permutations',
    conceptId: 'perm-arrange',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['perm-npr'],
    estimatedSeconds: 45,
    params(rng) {
      const n = rng.int(5, 12);
      const r = rng.int(2, 4);
      if (r >= n || nPr(n, r) > 12000) return null;
      const setting = rng.pick([
        { group: 'members of a club', verb: 'chosen from', posts: ['a president', 'a secretary', 'a treasurer', 'a spokesperson'] },
        { group: 'players in a squad', verb: 'chosen from', posts: ['a captain', 'a vice-captain', 'a wicket-keeper', 'a twelfth man'] },
        { group: 'students in a class', verb: 'chosen from', posts: ['a class monitor', 'a sports captain', 'a cultural secretary', 'a librarian'] },
        { group: 'finalists in a race', verb: 'awarded to', posts: ['gold', 'silver', 'bronze', 'a fourth-place ribbon'] }
      ]);
      return { n, r, group: setting.group, verb: setting.verb, posts: setting.posts.slice(0, r) };
    },
    answer: ({ n, r }) => nPr(n, r),
    formatValue: (value) => format.number(value),
    distractors: ({ n, r }) => [
      { value: nCr(n, r), why: 'ignored the order of the posts' },
      { value: n ** r, why: 'allowed one person to hold several posts' },
      { value: n * r, why: 'multiplied people by posts' }
    ],
    verify({ n, r }, value) {
      let count = 0;
      const walk = (depth, used) => {
        if (depth === r) {
          count++;
          return;
        }
        for (let i = 0; i < n; i++) if (!(used & (1 << i))) walk(depth + 1, used | (1 << i));
      };
      walk(0, 0);
      return count === value;
    },
    render({ n, r, group, verb, posts }) {
      const list = posts.length > 1 ? `${posts.slice(0, -1).join(', ')} and ${posts[posts.length - 1]}` : posts[0];
      const factors = Array.from({ length: r }, (_, i) => n - i);
      return {
        question: `In how many ways can ${list} be ${verb} ${n} ${group}, if no one gets more than one?`,
        explanation: `The posts are different, so order matters: ${factors.join(' × ')} = ${nPr(n, r)}.`,
        solutionSteps: [
          `First post: ${n} choices.`,
          ...factors.slice(1).map((f, i) => `Post ${i + 2}: ${f} people remain.`),
          `Total = ${factors.join(' × ')} = ${nPr(n, r)}.`
        ],
        method: `ⁿPᵣ — the posts are distinct, so order matters.`,
        hints: [
          'Swapping two people between posts gives a different outcome.',
          'Fill the posts one at a time, with one fewer person each time.',
          `Multiply ${factors.join(' × ')}.`
        ],
        commonMistakes: ['Using combinations when the positions are distinguishable.']
      };
    }
  },

  {
    id: 'pnc-committee',
    version: 1,
    topicId: 'combinations',
    conceptId: 'comb-groups',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['comb-ncr'],
    estimatedSeconds: 70,
    params(rng) {
      const men = rng.int(4, 8);
      const women = rng.int(3, 7);
      const k1 = rng.int(1, 3);
      const k2 = rng.int(1, 3);
      if (k1 >= men || k2 >= women) return null;
      return { men, women, k1, k2 };
    },
    answer: ({ men, women, k1, k2 }) => nCr(men, k1) * nCr(women, k2),
    formatValue: (value) => format.number(value),
    distractors: ({ men, women, k1, k2 }) => [
      { value: nCr(men + women, k1 + k2), why: 'ignored the required mix' },
      { value: nCr(men, k1) + nCr(women, k2), why: 'added the two selections' },
      { value: nPr(men, k1) * nPr(women, k2), why: 'treated the selection as ordered' }
    ],
    verify({ men, women, k1, k2 }, value) {
      let menWays = 0;
      for (let mask = 0; mask < 1 << men; mask++) if (bitCount(mask) === k1) menWays++;
      let womenWays = 0;
      for (let mask = 0; mask < 1 << women; mask++) if (bitCount(mask) === k2) womenWays++;
      return menWays * womenWays === value;
    },
    render({ men, women, k1, k2 }) {
      const a = nCr(men, k1);
      const b = nCr(women, k2);
      return {
        question: `A committee of ${k1 + k2} is to be formed from ${men} men and ${women} women, with exactly ${k1} ${k1 === 1 ? 'man' : 'men'} and ${k2} ${k2 === 1 ? 'woman' : 'women'}. In how many ways can this be done?`,
        explanation: `Choose the men in ⁿCᵣ = ${men}C${k1} = ${a} ways and the women in ${women}C${k2} = ${b} ways. Both happen together, so ${a} × ${b} = ${a * b}.`,
        solutionSteps: [
          `Men: ${men}C${k1} = ${a}.`,
          `Women: ${women}C${k2} = ${b}.`,
          `Total = ${a} × ${b} = ${a * b}.`
        ],
        method: 'Select each group separately, then multiply.',
        hints: [
          'A committee has no order, so use combinations.',
          'Count the ways to pick the men and the women separately.',
          'Both choices happen together, so multiply.'
        ],
        commonMistakes: ['Adding the two counts, or choosing from everyone at once.']
      };
    }
  },

  /* ========================= probability ========================= */
  {
    id: 'prob-both-red',
    version: 1,
    topicId: 'probability',
    conceptId: 'prob-without-replacement',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['prob-dependent'],
    estimatedSeconds: 80,
    params(rng) {
      return { r: rng.int(3, 8), b: rng.int(2, 8) };
    },
    answer: ({ r, b }) => fractionText(reduceFraction(r * (r - 1), (r + b) * (r + b - 1))),
    formatValue: (value) => value,
    distractors: ({ r, b }) => [
      { value: fractionText(reduceFraction(r * r, (r + b) * (r + b))), why: 'assumed replacement' },
      { value: fractionText(reduceFraction(r, r + b)), why: 'gave the probability of one red ball' },
      { value: fractionText(reduceFraction(r - 1, r + b - 1)), why: 'gave only the second draw' },
      { value: fractionText(reduceFraction(r * (r - 1), (r + b) * (r + b))), why: 'reduced only the numerator' }
    ],
    verify({ r, b }, text) {
      const total = r + b;
      let favourable = 0;
      let outcomes = 0;
      for (let first = 0; first < total; first++) {
        for (let second = 0; second < total; second++) {
          if (first === second) continue;
          outcomes++;
          if (first < r && second < r) favourable++;
        }
      }
      return fractionText(reduceFraction(favourable, outcomes)) === text;
    },
    render({ r, b }) {
      const total = r + b;
      const answer = fractionText(reduceFraction(r * (r - 1), total * (total - 1)));
      return {
        question: `A bag contains ${r} red and ${b} blue balls. Two balls are drawn one after another without replacement. What is the probability that both are red?`,
        explanation: `P = (${r}/${total}) × (${r - 1}/${total - 1}) = ${r * (r - 1)}/${total * (total - 1)} = ${answer}.`,
        solutionSteps: [
          `First draw: P(red) = ${r}/${total}.`,
          `Without replacement, ${r - 1} red remain among ${total - 1} balls.`,
          `P(both red) = ${r}/${total} × ${r - 1}/${total - 1} = ${answer}.`
        ],
        method: 'Multiply, adjusting the second probability for the ball already removed.',
        hints: [
          'Does the bag still hold the same number of balls for the second draw?',
          'Both the red count and the total drop by one after a red is drawn.',
          `Multiply ${r}/${total} by ${r - 1}/${total - 1}.`
        ],
        commonMistakes: ['Using the same probability for both draws, as if the ball were replaced.']
      };
    }
  },

  {
    id: 'prob-dice-sum',
    version: 1,
    topicId: 'probability',
    conceptId: 'prob-basic',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['prob-definition'],
    estimatedSeconds: 70,
    params(rng) {
      const kind = rng.pick(['equal', 'equal', 'greater', 'atMost']);
      const s = kind === 'equal' ? rng.int(3, 11) : rng.int(4, 10);
      return { kind, s };
    },
    // Answer by the "ways to make each total" pattern 1,2,3,4,5,6,5,4,3,2,1 …
    answer({ kind, s }) {
      const ways = (total) => Math.max(0, 6 - Math.abs(total - 7));
      let count = 0;
      for (let total = 2; total <= 12; total++) {
        if ((kind === 'equal' && total === s) || (kind === 'greater' && total > s) || (kind === 'atMost' && total <= s)) {
          count += ways(total);
        }
      }
      return fractionText(reduceFraction(count, 36));
    },
    formatValue: (value) => value,
    distractors({ kind, s }) {
      const matches = (total) =>
        (kind === 'equal' && total === s) || (kind === 'greater' && total > s) || (kind === 'atMost' && total <= s);
      let ordered = 0;
      let unordered = 0;
      for (let i = 1; i <= 6; i++) {
        for (let j = 1; j <= 6; j++) {
          if (!matches(i + j)) continue;
          ordered++;
          if (i <= j) unordered++;
        }
      }
      const sums = [];
      for (let total = 2; total <= 12; total++) if (matches(total)) sums.push(total);
      return [
        { value: fractionText(reduceFraction(unordered, 36)), why: 'counted mirrored pairs once' },
        { value: fractionText(reduceFraction(sums.length, 11)), why: 'treated the 11 totals as equally likely' },
        { value: fractionText(reduceFraction(36 - ordered, 36)), why: 'gave the complementary event' },
        { value: fractionText(reduceFraction(unordered, 21)), why: 'used unordered outcomes throughout' }
      ];
    },
    // … and verify by enumerating all 36 outcomes directly.
    verify({ kind, s }, text) {
      let favourable = 0;
      for (let i = 1; i <= 6; i++) {
        for (let j = 1; j <= 6; j++) {
          const total = i + j;
          if ((kind === 'equal' && total === s) || (kind === 'greater' && total > s) || (kind === 'atMost' && total <= s)) {
            favourable++;
          }
        }
      }
      return fractionText(reduceFraction(favourable, 36)) === text;
    },
    render({ kind, s }) {
      const phrase = { equal: `exactly ${s}`, greater: `greater than ${s}`, atMost: `at most ${s}` }[kind];
      const matches = (total) =>
        (kind === 'equal' && total === s) || (kind === 'greater' && total > s) || (kind === 'atMost' && total <= s);
      const counts = [];
      let favourable = 0;
      for (let total = 2; total <= 12; total++) {
        if (!matches(total)) continue;
        const ways = 6 - Math.abs(total - 7);
        counts.push(`${total}: ${ways}`);
        favourable += ways;
      }
      const answer = fractionText(reduceFraction(favourable, 36));
      return {
        question: `Two fair dice are rolled. What is the probability that the sum is ${phrase}?`,
        explanation: `${favourable} of the 36 equally likely outcomes qualify, so P = ${favourable}/36 = ${answer}.`,
        solutionSteps: [
          'Total outcomes = 6 × 6 = 36 (the dice are distinguishable).',
          `Ways to make each qualifying total — ${counts.join(', ')}.`,
          `Favourable = ${favourable}, so P = ${favourable}/36 = ${answer}.`
        ],
        method: 'Count favourable ordered outcomes over 36.',
        hints: [
          'How many outcomes do two dice have in total?',
          'The number of ways to make a total rises from 1 (for 2) to 6 (for 7), then falls back to 1 (for 12).',
          `Add the ways for every total that is ${phrase}.`
        ],
        commonMistakes: ['Counting mirrored pairs such as (2,5) and (5,2) only once.']
      };
    }
  },

  /* =================== permutations and combinations (more) =================== */
  {
    id: 'perm-word-letters',
    version: 1,
    topicId: 'permutations',
    conceptId: 'perm-repetition',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['perm-factorial'],
    estimatedSeconds: 60,
    params(rng) {
      return { word: rng.pick(WORDS) };
    },
    answer({ word }) {
      const counts = {};
      for (const ch of word) counts[ch] = (counts[ch] || 0) + 1;
      return Object.values(counts).reduce((acc, k) => acc / factorial(k), factorial(word.length));
    },
    verify: ({ word }, value) => countArrangements(word) === value,
    render({ word }) {
      const counts = {};
      for (const ch of word) counts[ch] = (counts[ch] || 0) + 1;
      const repeats = Object.entries(counts).filter(([, k]) => k > 1);
      const denominator = repeats.map(([, k]) => `${k}!`).join(' × ');
      const answer = repeats.reduce((acc, [, k]) => acc / factorial(k), factorial(word.length));
      const repeatText = repeats.map(([ch, k]) => `${ch} ${k === 2 ? 'twice' : `${k} times`}`).join(', ');
      return {
        question: `In how many different ways can the letters of the word ${word} be arranged?`,
        explanation: `${word} has ${word.length} letters, with ${repeatText}. Arrangements = ${word.length}! ÷ (${denominator}) = ${fmt(factorial(word.length))} ÷ ${fmt(factorial(word.length) / answer)} = ${fmt(answer)}.`,
        solutionSteps: [`${word.length}! = ${fmt(factorial(word.length))}.`, `Repeated letters: ${repeatText}, so divide by ${denominator}.`, `= ${fmt(answer)}.`],
        method: 'n! ÷ (p! × q! × …) for letters repeated p, q, … times.',
        hints: ['Count the letters, and note which ones repeat.', 'Swapping two identical letters does not make a new arrangement, so divide those orderings out.'],
        commonMistakes: [`Giving ${word.length}! = ${fmt(factorial(word.length))}, which treats identical letters as different.`]
      };
    }
  },

  {
    id: 'perm-together-apart',
    version: 1,
    topicId: 'permutations',
    conceptId: 'perm-restrictions',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['perm-together', 'perm-factorial'],
    estimatedSeconds: 80,
    params(rng) {
      const g = rng.pick([2, 3]);
      return { n: rng.int(g + 1, 7), g, together: rng.chance(0.5) };
    },
    answer({ n, g, together }) {
      const glued = factorial(g) * factorial(n - g + 1);
      return together ? glued : factorial(n) - glued;
    },
    verify({ n, g, together }, value) {
      // People 0..g−1 are the named group; they are together when their seats form one unbroken run.
      let count = 0;
      forEachPermutation(n, (order) => {
        const seats = Array.from({ length: g }, (_, person) => order.indexOf(person));
        const block = Math.max(...seats) - Math.min(...seats) === g - 1;
        if (block === together) count++;
      });
      return count === value;
    },
    render({ n, g, together }) {
      const names = g === 2 ? 'Asha and Ravi' : 'Asha, Ravi and Meena';
      const units = n - g + 1;
      const glued = factorial(g) * factorial(units);
      const who = g === 2 ? 'two particular people' : 'three particular people';
      const rule = together ? (g === 2 ? 'must sit next to each other' : 'must all sit together') : g === 2 ? 'must not sit next to each other' : 'must not all sit together';
      return {
        question: `In how many ways can ${n} people sit in a row if ${who}, ${names}, ${rule}?`,
        explanation: together
          ? `Treat ${names} as one block: that makes ${units} units, arranged in ${units}! = ${fmt(factorial(units))} ways. Inside the block they can sit in ${g}! = ${factorial(g)} orders, so the total is ${factorial(g)} × ${fmt(factorial(units))} = ${fmt(glued)}.`
          : `All seatings: ${n}! = ${fmt(factorial(n))}. Seatings with ${g === 2 ? 'them' : 'all three'} together: ${g}! × ${units}! = ${fmt(glued)}. So ${fmt(factorial(n))} − ${fmt(glued)} = ${fmt(factorial(n) - glued)}.`,
        solutionSteps: together
          ? [`${units} units → ${units}! = ${fmt(factorial(units))}.`, `× ${g}! = ${factorial(g)} for the order inside the block = ${fmt(glued)}.`]
          : [`Total: ${n}! = ${fmt(factorial(n))}.`, `Together: ${g}! × ${units}! = ${fmt(glued)}.`, `${fmt(factorial(n))} − ${fmt(glued)} = ${fmt(factorial(n) - glued)}.`],
        method: together ? 'Glue the group into one block, then multiply by the orders inside the block.' : 'Not together = all arrangements − arrangements with them together.',
        hints: [`Tie ${names} together and treat them as one person.`, together ? `Remember they can reorder themselves inside the block: ${g}! ways.` : 'Work out "together" first, then subtract it from the total.'],
        commonMistakes: together ? [`Forgetting to multiply by ${g}! for the order within the block.`] : [`Subtracting ${units}! instead of ${g}! × ${units}!.`]
      };
    }
  },

  {
    id: 'comb-handshakes-triangles',
    version: 1,
    topicId: 'combinations',
    conceptId: 'comb-geometry',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['comb-pairs', 'comb-ncr'],
    estimatedSeconds: 45,
    params(rng) {
      return { n: rng.int(5, 15), kind: rng.pick(['handshakes', 'lines', 'triangles']) };
    },
    answer: ({ n, kind }) => nCr(n, kind === 'triangles' ? 3 : 2),
    verify({ n, kind }, value) {
      let count = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (kind !== 'triangles') count++;
          else for (let k = j + 1; k < n; k++) count++;
        }
      }
      return count === value;
    },
    render({ n, kind }) {
      const r = kind === 'triangles' ? 3 : 2;
      const answer = nCr(n, r);
      const question = {
        handshakes: `At a meeting, each of ${n} people shakes hands once with every other person. How many handshakes are there in total?`,
        lines: `${n} points are marked on a page, with no three in a straight line. How many straight lines can be drawn through pairs of them?`,
        triangles: `${n} points are marked on a page, with no three in a straight line. How many triangles can be formed using these points as vertices?`
      }[kind];
      return {
        question,
        explanation: `Each ${kind === 'triangles' ? 'triangle is a choice of 3 points' : `${kind === 'handshakes' ? 'handshake' : 'line'} is a choice of 2 ${kind === 'handshakes' ? 'people' : 'points'}`}, and order does not matter: ${n}C${r} = ${r === 2 ? `${n} × ${n - 1} ÷ 2` : `${n} × ${n - 1} × ${n - 2} ÷ 6`} = ${fmt(answer)}.`,
        solutionSteps: [`Choose ${r} of ${n}: ${n}C${r}.`, r === 2 ? `${n} × ${n - 1} ÷ 2 = ${fmt(answer)}.` : `${n} × ${n - 1} × ${n - 2} ÷ 6 = ${fmt(answer)}.`],
        method: `Count unordered selections: nC${r}.`,
        hints: [kind === 'triangles' ? 'A triangle needs 3 corners, and the order you pick them in does not matter.' : 'A handshake (or a line) joins exactly 2, and A–B is the same as B–A.', `Use ${n}C${r}.`],
        commonMistakes: [r === 2 ? `Giving ${n} × ${n - 1} = ${n * (n - 1)}, which counts each pair twice.` : 'Using the permutation count, which counts each triangle 6 times.']
      };
    }
  },

  {
    id: 'comb-at-least-one',
    version: 1,
    topicId: 'combinations',
    conceptId: 'comb-selection',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['comb-ncr'],
    estimatedSeconds: 90,
    params(rng) {
      const men = rng.int(3, 7);
      const women = rng.int(3, 7);
      const k = rng.int(3, 5);
      if (k >= men) return null;
      return { men, women, k };
    },
    answer: ({ men, women, k }) => nCr(men + women, k) - nCr(men, k),
    verify({ men, women, k }, value) {
      // Add the cases: exactly 1 woman, exactly 2, ...
      let total = 0;
      for (let w = 1; w <= Math.min(women, k); w++) total += nCr(women, w) * nCr(men, k - w);
      return total === value;
    },
    render({ men, women, k }) {
      const all = nCr(men + women, k);
      const none = nCr(men, k);
      return {
        question: `A team of ${k} is chosen from ${men} men and ${women} women. In how many ways can it be chosen if it must include at least one woman?`,
        explanation: `All teams: ${men + women}C${k} = ${fmt(all)}. Teams with no woman (all men): ${men}C${k} = ${fmt(none)}. At least one woman = ${fmt(all)} − ${fmt(none)} = ${fmt(all - none)}.`,
        solutionSteps: [`${men + women}C${k} = ${fmt(all)}.`, `${men}C${k} = ${fmt(none)}.`, `${fmt(all)} − ${fmt(none)} = ${fmt(all - none)}.`],
        method: '"At least one" = all selections − selections with none.',
        hints: ['Counting "at least one" directly means adding several cases.', 'It is quicker to subtract the teams with no women from all teams.'],
        commonMistakes: [`Fixing one woman first (${women} × ${men + women - 1}C${k - 1}), which counts some teams more than once.`]
      };
    }
  },

  {
    id: 'prob-card-not',
    version: 1,
    topicId: 'probability',
    conceptId: 'prob-complement',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['prob-complement-rule'],
    estimatedSeconds: 40,
    formatValue: (value) => value,
    params(rng) {
      return { event: rng.pick(Object.keys(CARD_EVENTS)) };
    },
    answer: ({ event }) => fractionText(reduceFraction(52 - cardCount(event), 52)),
    distractors: ({ event }) => {
      const k = cardCount(event);
      return [
        { value: fractionText(reduceFraction(k, 52)), why: 'gave the probability of the event itself' },
        { value: fractionText(reduceFraction(52 - k, 51)), why: 'used 51 cards' },
        { value: fractionText(reduceFraction(k, 52 - k)), why: 'gave the odds, not a probability' },
        { value: fractionText(reduceFraction(52 - k, 52 + k)), why: 'added instead of subtracting' }
      ];
    },
    verify({ event }, text) {
      const notEvent = DECK.filter((card) => !CARD_EVENTS[event](card)).length;
      return fractionText(reduceFraction(notEvent, DECK.length)) === text;
    },
    render({ event }) {
      const k = cardCount(event);
      const answer = fractionText(reduceFraction(52 - k, 52));
      return {
        question: `A card is drawn at random from a standard pack of 52. What is the probability that it is not ${event}?`,
        explanation: `There are ${k} card${k === 1 ? '' : 's'} that ${k === 1 ? 'is' : 'are'} ${event}, so P(${event}) = ${k}/52. P(not) = 1 − ${k}/52 = ${52 - k}/52 = ${answer}.`,
        solutionSteps: [`Cards that are ${event}: ${k}.`, `P(not) = (52 − ${k}) ÷ 52 = ${52 - k}/52.`, `Simplified: ${answer}.`],
        method: 'P(not A) = 1 − P(A).',
        hints: [`Count the cards that are ${event}.`, 'Every other card is a success.'],
        commonMistakes: ['Giving P(A) instead of 1 − P(A).', ...(event.includes(' or ') ? ['Counting the cards that are both twice.'] : [])]
      };
    }
  },

  {
    id: 'prob-coin-and-die',
    version: 1,
    topicId: 'probability',
    conceptId: 'prob-combined',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['prob-and-or'],
    estimatedSeconds: 50,
    formatValue: (value) => value,
    params(rng) {
      return { face: rng.pick(['a head', 'a tail']), event: rng.pick(Object.keys(DIE_EVENTS)) };
    },
    answer: ({ event }) => fractionText(reduceFraction(dieCount(event), 12)),
    distractors: ({ event }) => {
      const k = dieCount(event);
      return [
        { value: fractionText(reduceFraction(k, 6)), why: 'ignored the coin' },
        { value: (3 + k) / 6 <= 1 ? fractionText(reduceFraction(3 + k, 6)) : null, why: 'added the probabilities' },
        { value: fractionText(reduceFraction(k, 8)), why: 'added the outcome counts: 2 + 6' },
        { value: fractionText(reduceFraction(6 - k, 12)), why: 'counted the wrong die faces' }
      ];
    },
    verify({ face, event }, text) {
      let favourable = 0;
      let outcomes = 0;
      for (const coin of ['a head', 'a tail']) {
        for (let die = 1; die <= 6; die++) {
          outcomes++;
          if (coin === face && DIE_EVENTS[event](die)) favourable++;
        }
      }
      return fractionText(reduceFraction(favourable, outcomes)) === text;
    },
    render({ face, event }) {
      const k = dieCount(event);
      const answer = fractionText(reduceFraction(k, 12));
      return {
        question: `A coin is tossed and a fair die is rolled. What is the probability of getting ${face} and ${event}?`,
        explanation: `The two are independent, so multiply: P(${face.slice(2)}) × P(${event}) = 1/2 × ${k}/6 = ${k}/12 = ${answer}.`,
        solutionSteps: [`P(${face.slice(2)}) = 1/2.`, `P(${event}) = ${k}/6.`, `1/2 × ${k}/6 = ${answer}.`],
        method: 'For independent events, P(A and B) = P(A) × P(B).',
        hints: ['The coin and the die do not affect each other.', '"And" means multiply the two probabilities.'],
        commonMistakes: ['Adding the probabilities for an "and" question.', 'Ignoring the coin.']
      };
    }
  },

  /* ==================== advanced (Tier 6) levels: probability ==================== */
  {
    id: 'prob-adv-two-bags',
    version: 1,
    topicId: 'probability',
    conceptId: 'prob-adv-stages',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['prob-adv-total-f'],
    estimatedSeconds: 110,
    formatValue: (value) => value,
    params(rng) {
      const r1 = rng.int(1, 6);
      const b1 = rng.int(1, 6);
      const r2 = rng.int(1, 6);
      const b2 = rng.int(1, 6);
      if (r1 * (r2 + b2) === r2 * (r1 + b1)) return null;
      return { r1, b1, r2, b2, selector: rng.pick(['coin', 'die']), colour: rng.pick(['red', 'blue']) };
    },
    // Bag A is chosen with probability a/s: a coin gives 1/2, a die (1 or 2) gives 1/3.
    answer({ r1, b1, r2, b2, selector, colour }) {
      const [a, s] = selector === 'coin' ? [1, 2] : [1, 3];
      const [t1, t2] = colour === 'red' ? [r1, r2] : [b1, b2];
      const n1 = r1 + b1;
      const n2 = r2 + b2;
      return fractionText(reduceFraction(a * t1 * n2 + (s - a) * t2 * n1, s * n1 * n2));
    },
    distractors({ r1, b1, r2, b2, selector, colour }) {
      const [t1, t2] = colour === 'red' ? [r1, r2] : [b1, b2];
      const [o1, o2] = colour === 'red' ? [b1, b2] : [r1, r2];
      const n1 = r1 + b1;
      const n2 = r2 + b2;
      const [a, s] = selector === 'coin' ? [1, 2] : [1, 3];
      const unweighted = t1 * n2 + t2 * n1;
      return [
        { value: fractionText(reduceFraction(t1 + t2, n1 + n2)), why: 'poured both bags together' },
        { value: unweighted <= n1 * n2 ? fractionText(reduceFraction(unweighted, n1 * n2)) : null, why: 'added the two bags without weighting' },
        { value: selector === 'die' ? fractionText(reduceFraction(unweighted, 2 * n1 * n2)) : null, why: 'treated the bags as equally likely' },
        { value: fractionText(reduceFraction(a * o1 * n2 + (s - a) * o2 * n1, s * n1 * n2)), why: 'gave the other colour' },
        { value: fractionText(reduceFraction(t1 * t2, n1 * n2)), why: 'multiplied the two bags' },
        { value: fractionText(reduceFraction(t1, n1)), why: 'used bag A only' }
      ];
    },
    // Every (selector outcome, ball) pair, weighted over the common denominator outcomes × n1 × n2.
    verify({ r1, b1, r2, b2, selector, colour }, text) {
      const faces = selector === 'coin' ? ['H', 'T'] : [1, 2, 3, 4, 5, 6];
      const bagA = (face) => face === 'H' || face === 1 || face === 2;
      const n1 = r1 + b1;
      const n2 = r2 + b2;
      let favourable = 0;
      for (const face of faces) {
        const [red, blue, weight] = bagA(face) ? [r1, b1, n2] : [r2, b2, n1];
        favourable += (colour === 'red' ? red : blue) * weight;
      }
      return fractionText(reduceFraction(favourable, faces.length * n1 * n2)) === text;
    },
    render({ r1, b1, r2, b2, selector, colour }) {
      const [a, s] = selector === 'coin' ? [1, 2] : [1, 3];
      const [t1, t2] = colour === 'red' ? [r1, r2] : [b1, b2];
      const n1 = r1 + b1;
      const n2 = r2 + b2;
      const wA = `${a}/${s}`;
      const wB = `${s - a}/${s}`;
      const routeA = fractionText(reduceFraction(a * t1, s * n1));
      const routeB = fractionText(reduceFraction((s - a) * t2, s * n2));
      const answer = fractionText(reduceFraction(a * t1 * n2 + (s - a) * t2 * n1, s * n1 * n2));
      const choose = selector === 'coin'
        ? 'A fair coin is tossed: heads means bag A, tails means bag B.'
        : 'A fair die is rolled: a 1 or a 2 means bag A, any other number means bag B.';
      return {
        question: `Bag A holds ${r1} red and ${b1} blue ${balls(b1)}. Bag B holds ${r2} red and ${b2} blue ${balls(b2)}. ${choose} One ball is drawn from the chosen bag. What is the probability that it is ${colour}?`,
        explanation: `P(${colour}) = ${wA} × ${t1}/${n1} + ${wB} × ${t2}/${n2} = ${routeA} + ${routeB} = ${answer}.`,
        solutionSteps: [
          `P(bag A) = ${wA}, P(bag B) = ${wB}.`,
          `Route via bag A: ${wA} × ${t1}/${n1} = ${routeA}.`,
          `Route via bag B: ${wB} × ${t2}/${n2} = ${routeB}.`,
          `Add the routes: ${answer}.`
        ],
        method: 'Multiply along each route, then add the routes.',
        hints: [
          `There are two ways to end up with a ${colour} ball.`,
          `Weight each bag's chance of ${colour} by the chance of choosing that bag.`
        ],
        commonMistakes: ['Pouring both bags together, which ignores how the bag is chosen.', "Adding the two bags' chances without weighting them."]
      };
    }
  },

  {
    id: 'prob-adv-dice-given',
    version: 1,
    topicId: 'probability',
    conceptId: 'prob-adv-conditional',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['prob-adv-conditional-f'],
    estimatedSeconds: 100,
    formatValue: (value) => value,
    params(rng) {
      const kind = rng.pick(['sum', 'sum', 'sumOver', 'six', 'different']);
      const given = { kind, k: kind === 'sum' ? rng.int(4, 10) : kind === 'sumOver' ? rng.int(7, 9) : 0 };
      const tKind = rng.pick(Object.keys(TARGET_EVENTS));
      const target = { kind: tKind, k: tKind === 'shows' ? rng.int(1, 6) : 0 };
      if (GIVEN_EVENTS[given.kind].text(given.k) === TARGET_EVENTS[target.kind].text(target.k)) return null;
      const { nGiven, nBoth } = diceCounts(given, target);
      return nBoth > 0 && nBoth < nGiven ? { given, target } : null;
    },
    answer({ given, target }) {
      const { nGiven, nBoth } = diceCounts(given, target);
      return fractionText(reduceFraction(nBoth, nGiven));
    },
    distractors({ given, target }) {
      const { nGiven, nTarget, nBoth } = diceCounts(given, target);
      return [
        { value: fractionText(reduceFraction(nBoth, 36)), why: 'did not restrict the sample space' },
        { value: fractionText(reduceFraction(nTarget, 36)), why: 'ignored the condition' },
        { value: fractionText(reduceFraction(nGiven - nBoth, nGiven)), why: 'gave the complement' },
        { value: fractionText(reduceFraction(nBoth, nTarget)), why: 'divided by the wrong event' },
        { value: fractionText(reduceFraction(nGiven, 36)), why: 'gave the chance of the condition' }
      ];
    },
    // P(A and B) ÷ P(B), with each probability counted separately over all 36 outcomes.
    verify({ given, target }, text) {
      const inGiven = GIVEN_EVENTS[given.kind].test(given.k);
      const inTarget = TARGET_EVENTS[target.kind].test(target.k);
      const outcomes = [1, 2, 3, 4, 5, 6].flatMap((x) => [1, 2, 3, 4, 5, 6].map((y) => [x, y]));
      const pBoth = outcomes.filter(([x, y]) => inGiven(x, y) && inTarget(x, y)).length;
      const pGiven = outcomes.filter(([x, y]) => inGiven(x, y)).length;
      return fractionText(reduceFraction(pBoth * 36, pGiven * 36)) === text;
    },
    render({ given, target }) {
      const { nGiven, nBoth, list } = diceCounts(given, target);
      const givenText = GIVEN_EVENTS[given.kind].text(given.k);
      const targetText = TARGET_EVENTS[target.kind].text(target.k);
      const answer = fractionText(reduceFraction(nBoth, nGiven));
      const simplified = answer === `${nBoth}/${nGiven}` ? '' : ` = ${answer}`;
      return {
        question: `Two fair dice are rolled. Given that ${givenText}, what is the probability that ${targetText}?`,
        explanation: `Only the ${nGiven} outcomes where ${givenText} count${nGiven <= 11 ? `: ${list.join(', ')}` : ''}. In ${nBoth} of them, ${targetText}. So the probability is ${nBoth}/${nGiven}${simplified}.`,
        solutionSteps: [
          `Outcomes where ${givenText}: ${nGiven}.`,
          `Of these, outcomes where ${targetText}: ${nBoth}.`,
          `P = ${nBoth}/${nGiven}${simplified}.`
        ],
        method: 'Restrict the sample space to what you are told, then count inside it.',
        hints: [`List the outcomes where ${givenText}.`, 'How many of those also satisfy the event asked about?'],
        commonMistakes: ['Dividing by 36 instead of by the outcomes that match the condition.']
      };
    }
  },

  /* ================ advanced (Tier 6) levels: permutations and combinations ================ */
  {
    id: 'comb-adv-circular-seat',
    version: 1,
    topicId: 'combinations',
    conceptId: 'comb-adv-circular',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'ways',
    formulaIds: ['comb-adv-circular-f'],
    estimatedSeconds: 90,
    params(rng) {
      const kind = rng.pick(['table', 'together', 'apart', 'necklace', 'alternate']);
      // Brute-force checks stay small: at most 8! orderings for a table of 9.
      const n = kind === 'table' ? rng.int(5, 9) : kind === 'alternate' ? 2 * rng.int(3, 4) : rng.int(5, 8);
      return { kind, n, garland: kind === 'necklace' && rng.chance(0.5) };
    },
    answer({ kind, n }) {
      if (kind === 'table') return factorial(n - 1);
      if (kind === 'together') return 2 * factorial(n - 2);
      if (kind === 'apart') return factorial(n - 1) - 2 * factorial(n - 2);
      if (kind === 'alternate') return factorial(n / 2 - 1) * factorial(n / 2);
      return factorial(n - 1) / 2;
    },
    // Brute force: person 0 fixed in seat 0; persons 0 and 1 are the particular pair,
    // and for 'alternate' persons 0 … n/2 − 1 are the men.
    verify({ kind, n }, value) {
      const nextTo = (seats) => seats[1] === 1 || seats[n - 1] === 1;
      const keep = {
        table: () => true,
        together: nextTo,
        apart: (seats) => !nextTo(seats),
        // A necklace can be turned over: keep one of each mirror-image pair.
        necklace: (seats) => seats[1] < seats[n - 1],
        alternate: (seats) => seats.every((person, seat) => (person < n / 2) === (seat % 2 === 0))
      }[kind];
      return countRoundTable(n, keep) === value;
    },
    render({ kind, n, garland }) {
      const f1 = factorial(n - 1);
      const m = n / 2;
      const beads = garland ? 'flowers' : 'beads';
      const string = garland ? 'garland' : 'necklace';
      const f2 = factorial(n - 2);
      const v = {
        table: {
          q: `In how many ways can ${n} people be seated around a round table?`,
          e: `Fix one person to remove the rotations; the other ${n - 1} can be arranged in ${n - 1}! = ${fmt(f1)} ways.`,
          steps: ["Fix one person's seat.", `Arrange the other ${n - 1}: ${n - 1}! = ${fmt(f1)}.`],
          mist: [`Using ${n}! = ${fmt(factorial(n))}, as for a row.`]
        },
        together: {
          q: `In how many ways can ${n} people sit around a round table if two particular people must sit next to each other?`,
          e: `Treat the pair as one unit: ${n - 1} units around a table give ${n - 2}! = ${fmt(f2)} ways. The pair can swap seats in 2 ways, so ${fmt(f2)} × 2 = ${fmt(2 * f2)}.`,
          steps: [`Pair = 1 unit, so ${n - 1} units.`, `Circular: ${n - 2}! = ${fmt(f2)}.`, `Pair swaps: × 2 = ${fmt(2 * f2)}.`],
          mist: ['Forgetting the × 2 for the pair swapping seats.', `Using ${n - 1}! for the units, as if in a row.`]
        },
        apart: {
          q: `In how many ways can ${n} people sit around a round table if two particular people must not sit next to each other?`,
          e: `All seatings: ${n - 1}! = ${fmt(f1)}. Seatings with the two together: 2 × ${n - 2}! = ${fmt(2 * f2)}. Apart: ${fmt(f1)} − ${fmt(2 * f2)} = ${fmt(f1 - 2 * f2)}.`,
          steps: [`All: ${n - 1}! = ${fmt(f1)}.`, `Together: 2 × ${n - 2}! = ${fmt(2 * f2)}.`, `Apart: ${fmt(f1)} − ${fmt(2 * f2)} = ${fmt(f1 - 2 * f2)}.`],
          mist: [`Subtracting ${n - 2}! without the × 2 for the pair.`, `Starting from ${n}! instead of ${n - 1}!.`]
        },
        necklace: {
          q: `In how many different ways can ${n} different ${beads} be strung into a ${string}, all ${n} used each time?`,
          e: `Around a circle: ${n - 1}! = ${fmt(f1)}. A ${string} can be turned over, so each design is counted twice: ${fmt(f1)} ÷ 2 = ${fmt(f1 / 2)}.`,
          steps: [`Circular: ${n - 1}! = ${fmt(f1)}.`, 'Turning over pairs up mirror images: ÷ 2.', `${fmt(f1)} ÷ 2 = ${fmt(f1 / 2)}.`],
          mist: [`Stopping at ${fmt(f1)} without dividing by 2.`]
        },
        alternate: {
          q: `In how many ways can ${m} men and ${m} women sit around a round table so that no two women sit next to each other?`,
          e: `Seat the men first: (${m} − 1)! = ${fmt(factorial(m - 1))}. They leave ${m} gaps, one woman per gap: ${m}! = ${fmt(factorial(m))}. Total ${fmt(factorial(m - 1))} × ${fmt(factorial(m))} = ${fmt(factorial(m - 1) * factorial(m))}.`,
          steps: [`Men around the table: ${m - 1}! = ${fmt(factorial(m - 1))}.`, `Women into the ${m} gaps: ${m}! = ${fmt(factorial(m))}.`, `${fmt(factorial(m - 1))} × ${fmt(factorial(m))} = ${fmt(factorial(m - 1) * factorial(m))}.`],
          mist: [`Using ${m - 1}! for the women too, as if they formed a second circle.`, `Using ${m}! for the men.`]
        }
      }[kind];
      return {
        question: v.q,
        explanation: v.e,
        solutionSteps: v.steps,
        method: kind === 'necklace' ? 'Necklace or garland: (n − 1)! ÷ 2.' : kind === 'alternate' ? 'Seat one group in a circle, then place the other group in the gaps.' : 'Around a table, fix one person: (n − 1)!.',
        hints: ['Rotating everyone one place gives the same arrangement.', kind === 'necklace' ? `Can a ${string} be flipped over?` : kind === 'alternate' ? 'Seat the men first. How many gaps do they leave?' : 'Fix one person, then arrange the rest.'],
        commonMistakes: v.mist
      };
    }
  },

  {
    id: 'comb-adv-distribute',
    version: 1,
    topicId: 'combinations',
    conceptId: 'comb-adv-distribution',
    difficulty: 'complex',
    type: 'numerical_input',
    unit: 'ways',
    formulaIds: ['comb-adv-distribution-f'],
    estimatedSeconds: 100,
    params(rng) {
      const r = rng.int(2, 4);
      const n = rng.int(r + 2, 12);
      return { n, r, atLeastOne: rng.chance(0.5), equation: rng.chance(0.35), ctx: rng.int(0, SHARE_CONTEXTS.length - 1) };
    },
    answer: ({ n, r, atLeastOne }) => (atLeastOne ? nCr(n - 1, r - 1) : nCr(n + r - 1, r - 1)),
    verify: ({ n, r, atLeastOne }, value) => countCompositions(n, r, atLeastOne ? 1 : 0) === value,
    render({ n, r, atLeastOne, equation, ctx }) {
      const answer = atLeastOne ? nCr(n - 1, r - 1) : nCr(n + r - 1, r - 1);
      const top = atLeastOne ? n - 1 : n + r - 1;
      const k = r - 1;
      const s = k === 1 ? '' : 's';
      const { items, people, each } = SHARE_CONTEXTS[ctx];
      const vars = VARIABLES.slice(0, r);
      const question = equation
        ? `How many solutions does ${vars.join(' + ')} = ${n} have, if ${vars.slice(0, -1).join(', ')} and ${vars[r - 1]} are ${atLeastOne ? 'whole numbers of at least 1' : 'whole numbers (0 allowed)'}?`
        : `In how many ways can ${n} ${items} be shared among ${r} ${people}${atLeastOne ? ` so that each ${each} gets at least one` : ', if some may get none'}?`;
      return {
        question,
        explanation: atLeastOne
          ? `Line up the ${n} units: there are ${n - 1} gaps between them. Choose ${k} gap${s} for the divider${s}: ${top}C${k} = ${fmt(answer)}.`
          : `Arrange ${n} identical units and ${k} divider${s} in a row of ${top} places, then choose which ${k === 1 ? 'place holds the divider' : `${k} places hold the dividers`}: ${top}C${k} = ${fmt(answer)}.`,
        solutionSteps: atLeastOne
          ? [`${n} units have ${n - 1} gaps.`, `Choose ${k} gap${s}: ${top}C${k}.`, `${top}C${k} = ${fmt(answer)}.`]
          : [`${n} units + ${k} divider${s} = ${top} places.`, `Choose the divider place${s}: ${top}C${k}.`, `${top}C${k} = ${fmt(answer)}.`],
        method: atLeastOne ? 'At least one each: ⁿ⁻¹Cᵣ₋₁.' : 'Zero allowed: ⁿ⁺ʳ⁻¹Cᵣ₋₁.',
        hints: ['Line the identical units up; sharing them means placing dividers.', atLeastOne ? 'Dividers go in the gaps between units, at most one per gap.' : 'Dividers may sit next to each other or at the ends.'],
        commonMistakes: [
          `Using ${r} to the power ${n}, which treats identical items as different.`,
          atLeastOne ? `Using ${n + r - 1}C${k}, which allows a share of zero.` : `Using ${n - 1}C${k}, which forces everyone to get at least one.`
        ]
      };
    }
  },

  /* ==================== advanced (Tier 6) levels: number puzzles ==================== */
  {
    id: 'ns-adv-puz-reverse',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-adv-puz-digits',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['ns-adv-puz-digits-f'],
    estimatedSeconds: 110,
    params(rng) {
      const [a, b] = rng.pick(DIGIT_PAIRS);
      if (a === b) return null;
      const clue = rng.pick(['sum', 'sum', 'product', 'times']);
      if (clue === 'times' && (10 * a + b) % (a + b)) return null;
      // The clues must pin down exactly one number.
      return digitMatches(clue, { a, b }).length === 1 ? { a, b, clue } : null;
    },
    answer: ({ a, b }) => 10 * a + b,
    // Read the digits back off the answer and check both clues directly.
    verify({ a, b, clue }, value) {
      if (value < 10 || value > 99) return false;
      const tens = Math.floor(value / 10);
      const units = value % 10;
      const reversed = 10 * units + tens;
      return units > 0 && DIGIT_CLUES[clue].test(tens, units, { a, b }) && reversed - value === 9 * (b - a);
    },
    render({ a, b, clue }) {
      const n = 10 * a + b;
      const r = 10 * b + a;
      const d = Math.abs(b - a);
      const up = b > a;
      const clueStep = {
        sum: `a + b = ${a + b}.`,
        product: `a × b = ${a * b}.`,
        times: `10a + b = ${(10 * a + b) / (a + b)}(a + b).`
      }[clue];
      return {
        question: `${DIGIT_CLUES[clue].text(a, b)} When the digits are reversed, the number ${up ? 'increases' : 'decreases'} by ${9 * d}. What is the number?`,
        explanation: `Let the number be 10a + b. Reversing changes it by 9 × (difference of the digits), so the digits differ by ${9 * d} ÷ 9 = ${d}, with the ${up ? 'units' : 'tens'} digit larger. Together with ${clueStep.slice(0, -1)}, the digits are a = ${a} and b = ${b}, so the number is ${n}. Check: ${Math.max(n, r)} − ${Math.min(n, r)} = ${9 * d}.`,
        solutionSteps: [clueStep, `9 × (${up ? 'b − a' : 'a − b'}) = ${9 * d}, so ${up ? 'b − a' : 'a − b'} = ${d}.`, `a = ${a}, b = ${b}: the number is ${n}.`],
        method: 'Turn both clues into equations in the digits, then solve.',
        hints: ['Reversing a two-digit number changes it by 9 × (the difference of its digits).', `Which pairs of digits differ by ${d} and fit the first clue?`],
        commonMistakes: [`Giving ${r}, the reversed number.`, 'Writing the number as a + b instead of 10a + b.']
      };
    }
  },

  {
    id: 'ns-adv-puz-consecutive',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-adv-puz-clues',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['ns-adv-puz-consecutive-f'],
    estimatedSeconds: 80,
    params(rng) {
      const kind = rng.pick(Object.keys(SEQUENCE_KINDS));
      const k = rng.int(3, 6);
      const base = rng.int(3, 60);
      const first = kind === 'even' ? 2 * Math.ceil(base / 2) : kind === 'odd' ? 2 * Math.floor(base / 2) + 1 : base;
      return { kind, k, first, largest: rng.chance(0.5) };
    },
    answer: ({ kind, k, first, largest }) => (largest ? first + SEQUENCE_KINDS[kind].step * (k - 1) : first),
    // Search every possible starting number for the run with this sum.
    verify({ kind, k, first, largest }, value) {
      const { step } = SEQUENCE_KINDS[kind];
      const total = k * first + (step * k * (k - 1)) / 2;
      for (let start = 1; start <= total; start++) {
        if (kind === 'even' && start % 2) continue;
        if (kind === 'odd' && start % 2 === 0) continue;
        let sum = 0;
        for (let i = 0; i < k; i++) sum += start + step * i;
        if (sum === total) return value === (largest ? start + step * (k - 1) : start);
      }
      return false;
    },
    render({ kind, k, first, largest }) {
      const { step, words } = SEQUENCE_KINDS[kind];
      const extra = (step * k * (k - 1)) / 2;
      const total = k * first + extra;
      const terms = Array.from({ length: k }, (_, i) => first + step * i);
      const answer = largest ? terms[k - 1] : first;
      return {
        question: `The sum of ${k} ${words} is ${fmt(total)}. What is the ${largest ? 'largest' : 'smallest'} of them?`,
        explanation: `Write them as ${k <= 4 ? ['n', ...Array.from({ length: k - 1 }, (_, i) => `n + ${step * (i + 1)}`)].join(', ') : `n, n + ${step}, …, n + ${step * (k - 1)}`}. Their sum is ${k}n + ${extra} = ${fmt(total)}, so ${k}n = ${fmt(total - extra)} and n = ${first}. The numbers are ${terms.join(', ')}, so the ${largest ? 'largest' : 'smallest'} is ${answer}.`,
        solutionSteps: [`${k}n + ${extra} = ${fmt(total)}.`, `n = ${fmt(total - extra)} ÷ ${k} = ${first}.`, `Numbers: ${terms.join(', ')}.`],
        method: 'Write the numbers in terms of the smallest one, add, and solve.',
        hints: [`${kind === 'whole' ? 'Consecutive whole numbers are 1 apart.' : `Consecutive ${kind} numbers are 2 apart.`}`, `The middle value is the sum divided by ${k}.`],
        commonMistakes: [kind === 'whole' ? 'Giving the middle value instead of the one asked for.' : `Stepping by 1 instead of 2 for ${kind} numbers.`]
      };
    }
  },

  /* ================= advanced (Tier 6) levels: mathematical reasoning ================= */
  {
    id: 'ns-adv-rsn-parity',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-adv-rsn-statements',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['ns-adv-rsn-parity-f'],
    estimatedSeconds: 70,
    formatValue: (value) => value,
    params(rng) {
      const pa = rng.int(0, 1);
      const pb = rng.int(0, 1);
      const target = rng.int(0, 1);
      const indexes = rng.shuffle(PARITY_EXPRESSIONS.map((_, i) => i));
      const right = indexes.filter((i) => parity(PARITY_EXPRESSIONS[i][1](pa, pb)) === target);
      const wrong = indexes.filter((i) => parity(PARITY_EXPRESSIONS[i][1](pa, pb)) !== target);
      if (!right.length || wrong.length < 3) return null;
      return { names: rng.int(0, VARIABLE_PAIRS.length - 1), pa, pb, target, answer: right[0], wrong: wrong.slice(0, 3) };
    },
    answer: ({ names, answer }) => nameExpression(PARITY_EXPRESSIONS[answer][0], VARIABLE_PAIRS[names]),
    distractors: ({ names, wrong }) => wrong.map((i) => ({ value: nameExpression(PARITY_EXPRESSIONS[i][0], VARIABLE_PAIRS[names]), why: 'has the other parity' })),
    // Try many actual values of the right parities, negatives included.
    verify({ names, pa, pb, target }, text) {
      const index = PARITY_EXPRESSIONS.findIndex(([expr]) => nameExpression(expr, VARIABLE_PAIRS[names]) === text);
      if (index < 0) return false;
      const values = (p) => [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12].filter((v) => parity(v) === p);
      return values(pa).every((a) => values(pb).every((b) => parity(PARITY_EXPRESSIONS[index][1](a, b)) === target));
    },
    render({ names, pa, pb, target, answer, wrong }) {
      const [first, second] = VARIABLE_PAIRS[names];
      const ea = pa ? 3 : 4;
      const eb = pb ? 5 : 2;
      const show = (i) => `${nameExpression(PARITY_EXPRESSIONS[i][0], VARIABLE_PAIRS[names])} = ${PARITY_EXPRESSIONS[i][1](ea, eb)}`;
      const given = pa === pb ? `${first} and ${second} are both ${oddEven(pa)} whole numbers.` : `${first} is an ${oddEven(pa)} whole number and ${second} is an ${oddEven(pb)} whole number.`;
      return {
        question: `${given} Which of these is always ${oddEven(target)}?`,
        explanation: `Only whether each number is odd or even matters. With ${first} = ${ea} and ${second} = ${eb}: ${show(answer)}, which is ${oddEven(target)}, and the parity rules make this hold for every such pair. The other options are ${oddEven(1 - target)}: ${wrong.map(show).join('; ')}.`,
        solutionSteps: [`${first} is ${oddEven(pa)}, ${second} is ${oddEven(pb)}.`, `Apply the rules: odd × odd = odd, anything × even = even, odd + odd = even.`, `${nameExpression(PARITY_EXPRESSIONS[answer][0], VARIABLE_PAIRS[names])} is always ${oddEven(target)}.`],
        method: 'Replace each letter by "odd" or "even" and apply the parity rules.',
        hints: [`Try ${first} = ${ea} and ${second} = ${eb} in each option.`, 'odd + odd is even; odd × odd is odd; anything times an even number is even.'],
        commonMistakes: ['Thinking odd + odd is odd.', 'Forgetting that a square has the same parity as the number itself.']
      };
    }
  },

  {
    id: 'ns-adv-rsn-extreme',
    version: 1,
    topicId: 'number-system',
    conceptId: 'ns-adv-rsn-deduction',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['ns-adv-rsn-counter-f'],
    estimatedSeconds: 100,
    params(rng) {
      const kind = rng.pick(['maxDistinct', 'maxAny', 'minMaxDistinct']);
      const k = rng.int(3, 5);
      const mean = rng.int(kind === 'minMaxDistinct' ? 6 : 5, 12);
      return { kind, k, mean };
    },
    answer({ kind, k, mean }) {
      const total = k * mean;
      const triangle = (k * (k - 1)) / 2;
      if (kind === 'maxDistinct') return total - triangle;
      if (kind === 'maxAny') return total - (k - 1);
      return Math.ceil((total + triangle) / k);
    },
    // Try every possible value for the biggest number and ask whether the rest can be filled in.
    verify({ kind, k, mean }, value) {
      const total = k * mean;
      const distinct = kind !== 'maxAny';
      const possible = [];
      for (let big = 1; big <= total; big++) {
        if (canFill(total - big, k - 1, distinct ? big - 1 : big, distinct)) possible.push(big);
      }
      return value === (kind === 'minMaxDistinct' ? Math.min(...possible) : Math.max(...possible));
    },
    render({ kind, k, mean }) {
      const total = k * mean;
      const triangle = (k * (k - 1)) / 2;
      const small = Array.from({ length: k - 1 }, (_, i) => i + 1);
      const distinct = kind !== 'maxAny';
      const largest = kind !== 'minMaxDistinct';
      let explanation;
      let steps;
      if (kind === 'maxDistinct') {
        explanation = `The ${k} numbers add to ${k} × ${mean} = ${total}. To make the biggest as large as possible, make the other ${k - 1} as small as possible while still different: ${small.join(' + ')} = ${triangle}. The biggest is then ${total} − ${triangle} = ${total - triangle}.`;
        steps = [`Total = ${k} × ${mean} = ${total}.`, `Smallest ${k - 1} different positive whole numbers: ${small.join(' + ')} = ${triangle}.`, `Biggest = ${total} − ${triangle} = ${total - triangle}.`];
      } else if (kind === 'maxAny') {
        explanation = `The ${k} numbers add to ${k} × ${mean} = ${total}. The numbers need not be different, so the other ${k - 1} can all be 1, adding to ${k - 1}. The biggest is then ${total} − ${k - 1} = ${total - k + 1}.`;
        steps = [`Total = ${k} × ${mean} = ${total}.`, `The other ${k - 1} are each 1: total ${k - 1}.`, `Biggest = ${total} − ${k - 1} = ${total - k + 1}.`];
      } else {
        const big = Math.ceil((total + triangle) / k);
        explanation = `The ${k} numbers add to ${k} × ${mean} = ${total}. To keep the biggest small, bunch the numbers together. If the biggest is L, the most the ${k} different numbers can add to is ${Array.from({ length: k }, (_, i) => (i ? `(L − ${i})` : 'L')).join(' + ')} = ${k}L − ${triangle}. This must reach ${total}, so ${k}L ≥ ${total + triangle} and L ≥ ${fmt((total + triangle) / k)}. The smallest whole number that works is ${big}.`;
        steps = [`Total = ${total}.`, `Largest possible total with biggest L: ${k}L − ${triangle}.`, `${k}L − ${triangle} ≥ ${total}, so L = ${big}.`];
      }
      return {
        question: `The average of ${k} ${distinct ? 'different ' : ''}positive whole numbers is ${mean}. What is the ${largest ? 'largest' : 'smallest'} possible value of the biggest of them?`,
        explanation,
        solutionSteps: steps,
        method: largest ? 'To maximise one number, make all the others as small as the rules allow.' : 'To minimise the biggest number, keep all the numbers as close together as the rules allow.',
        hints: [`The ${k} numbers add to ${k} × ${mean}.`, largest ? (distinct ? 'The others must all be different and at least 1.' : 'The others may repeat, and must be at least 1.') : 'Numbers that are all different cannot all be equal to the average; how close can they be?'],
        commonMistakes: distinct
          ? [largest ? 'Making the other numbers all 1, which ignores "different".' : 'Giving the average, which is only possible if the numbers could repeat.', 'Using 0, which is not positive.']
          : ['Making the other numbers 1, 2, 3, …, as if they had to be different.', 'Using 0, which is not positive.']
      };
    }
  }
];
