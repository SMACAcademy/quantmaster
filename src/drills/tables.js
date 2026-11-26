/**
 * Must-know tables for quick recall, and the drill items built from them.
 *
 * Every value is computed here, never typed in, and tests/drills.test.js checks
 * each one against an independent calculation.
 *
 * A table has:
 *   id, title, description
 *   entries   [{ left, right }] for reading ("17²" | "289")
 *   items     drill questions: { prompt, answer, reveal }
 *             answer: { type: 'number', value, tolerance } or { type: 'choice', options, correct }
 *             reveal: the right answer as shown after a miss
 */

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const number = (value, tolerance = 0) => ({ type: 'number', value, tolerance });
const grouped = (n) => n.toLocaleString('en-IN');

export const isPrime = (n) => n > 1 && range(2, Math.floor(Math.sqrt(n))).every((d) => n % d !== 0);
const smallestFactor = (n) => range(2, n).find((d) => n % d === 0);

/** a/n as a percentage, written as a mixed number: "33 1/3", "12 1/2", "5". */
export function percentOf(n, a = 1) {
  const whole = Math.floor((100 * a) / n);
  const rest = 100 * a - whole * n;
  if (!rest) return String(whole);
  const g = gcd(rest, n);
  return `${whole} ${rest / g}/${n / g}`;
}

const squares = {
  id: 'squares',
  title: 'Squares 1 to 30',
  description: 'For square roots, Pythagoras and quick multiplication.',
  entries: range(1, 30).map((n) => ({ left: `${n}²`, right: grouped(n * n) })),
  items: [
    ...range(11, 30).map((n) => ({ prompt: `${n}² = ?`, answer: number(n * n), reveal: grouped(n * n) })),
    ...range(11, 30).map((n) => ({ prompt: `√${n * n} = ?`, answer: number(n), reveal: String(n) }))
  ]
};

const cubes = {
  id: 'cubes',
  title: 'Cubes 1 to 20',
  description: 'For volumes and cube roots.',
  entries: range(1, 20).map((n) => ({ left: `${n}³`, right: grouped(n ** 3) })),
  items: [
    ...range(2, 15).map((n) => ({ prompt: `${n}³ = ?`, answer: number(n ** 3), reveal: grouped(n ** 3) })),
    ...range(2, 20).map((n) => ({ prompt: `∛${n ** 3} = ?`, answer: number(n), reveal: String(n) }))
  ]
};

const ROOTS = [2, 3, 5, 6, 7, 8, 10];
const roots = {
  id: 'square-roots',
  title: 'Square roots',
  description: 'To three decimal places, for estimating surds.',
  entries: ROOTS.map((n) => ({ left: `√${n}`, right: Math.sqrt(n).toFixed(3) })),
  items: ROOTS.map((n) => ({ prompt: `√${n} ≈ ? (3 decimal places)`, answer: number(Math.sqrt(n), 0.0015), reveal: Math.sqrt(n).toFixed(3) }))
};

const FRACTIONS = range(2, 20);
const MORE_FRACTIONS = [[3, 8], [5, 8], [7, 8], [2, 3], [5, 6]];
const fractions = {
  id: 'fractions',
  title: 'Fractions as percentages',
  description: '1/2 to 1/20: the key to fast percentage and ratio work.',
  entries: [
    ...FRACTIONS.map((n) => ({ left: `1/${n}`, right: `${percentOf(n)}%` })),
    ...MORE_FRACTIONS.map(([a, n]) => ({ left: `${a}/${n}`, right: `${percentOf(n, a)}%` }))
  ],
  items: [
    ...FRACTIONS.map((n) => ({ prompt: `1/${n} = ?%`, answer: number(100 / n, 0.01), reveal: `${percentOf(n)}%` })),
    ...FRACTIONS.map((n) => ({ prompt: `${percentOf(n)}% = 1/?`, answer: number(n), reveal: `1/${n}` }))
  ]
};

const PRIME_CANDIDATES = range(11, 99).filter((n) => n % 2 && n % 5);
const primes = {
  id: 'primes',
  title: 'Primes up to 100',
  description: 'All 25 of them. The odd numbers that look prime but are not are the ones to watch: 51, 57, 87, 91.',
  entries: range(2, 100)
    .filter(isPrime)
    .map((p, i) => ({ left: `#${i + 1}`, right: String(p) })),
  items: PRIME_CANDIDATES.map((n) => ({
    prompt: `Is ${n} prime?`,
    answer: { type: 'choice', options: ['Prime', 'Not prime'], correct: isPrime(n) ? 'Prime' : 'Not prime' },
    reveal: isPrime(n) ? `${n} is prime` : `${n} = ${smallestFactor(n)} × ${n / smallestFactor(n)}`
  }))
};

const POWER_RANGES = [
  [2, 12],
  [3, 7],
  [5, 5],
  [7, 4]
];
const powers = {
  id: 'powers',
  title: 'Powers of 2, 3, 5 and 7',
  description: 'For indices, unit digits and logarithms.',
  entries: POWER_RANGES.flatMap(([base, top]) => range(2, top).map((k) => ({ left: `${base}^${k}`, right: grouped(base ** k) }))),
  items: POWER_RANGES.flatMap(([base, top]) =>
    range(2, top).flatMap((k) => [
      { prompt: `${base}^${k} = ?`, answer: number(base ** k), reveal: grouped(base ** k) },
      { prompt: `${grouped(base ** k)} = ${base}^?`, answer: number(k), reveal: `${base}^${k}` }
    ])
  )
};

const factorials = {
  id: 'factorials',
  title: 'Factorials 0! to 10!',
  description: 'For permutations and combinations.',
  entries: range(0, 10).map((n) => ({ left: `${n}!`, right: grouped(range(1, n).reduce((p, k) => p * k, 1)) })),
  items: range(3, 8).map((n) => {
    const value = range(1, n).reduce((p, k) => p * k, 1);
    return { prompt: `${n}! = ?`, answer: number(value), reveal: grouped(value) };
  })
};

export const TRIPLETS = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [12, 35, 37],
  [9, 40, 41],
  [28, 45, 53],
  [11, 60, 61],
  [33, 56, 65]
];
const triplets = {
  id: 'triplets',
  title: 'Pythagorean triplets',
  description: 'Right triangles with whole-number sides, and their multiples.',
  entries: TRIPLETS.map(([a, b, c]) => ({ left: `${a}, ${b}`, right: String(c) })),
  items: TRIPLETS.flatMap(([a, b, c]) =>
    [1, 2, 3].flatMap((k) => [
      { prompt: `${k * a}, ${k * b}, ? (right triangle)`, answer: number(k * c), reveal: String(k * c) },
      { prompt: `${k * a}, ?, ${k * c} (right triangle)`, answer: number(k * b), reveal: String(k * b) }
    ])
  ).filter((item) => item.answer.value <= 200)
};

export const TRIG_OPTIONS = ['0', '1/2', '1/√2', '√3/2', '1', '1/√3', '√3', 'Not defined'];
/** Numeric value of each option, so the tests can check the table against Math.sin and friends. */
export const TRIG_OPTION_VALUES = { '0': 0, '1/2': 0.5, '1/√2': Math.SQRT1_2, '√3/2': Math.sqrt(3) / 2, '1': 1, '1/√3': 1 / Math.sqrt(3), '√3': Math.sqrt(3), 'Not defined': Infinity };
export const TRIG_VALUES = {
  sin: { 0: '0', 30: '1/2', 45: '1/√2', 60: '√3/2', 90: '1' },
  cos: { 0: '1', 30: '√3/2', 45: '1/√2', 60: '1/2', 90: '0' },
  tan: { 0: '0', 30: '1/√3', 45: '1', 60: '√3', 90: 'Not defined' }
};
const trig = {
  id: 'trig',
  title: 'Trigonometric values',
  description: 'sin, cos and tan of 0°, 30°, 45°, 60° and 90°.',
  entries: Object.entries(TRIG_VALUES).flatMap(([fn, values]) => Object.entries(values).map(([angle, value]) => ({ left: `${fn} ${angle}°`, right: value }))),
  items: Object.entries(TRIG_VALUES).flatMap(([fn, values]) =>
    Object.entries(values).map(([angle, value]) => ({
      prompt: `${fn} ${angle}° = ?`,
      answer: { type: 'choice', options: TRIG_OPTIONS, correct: value },
      reveal: value
    }))
  )
};

const times = {
  id: 'times',
  title: 'Times tables 12 to 20',
  description: 'Up to × 9, for fast arithmetic without a pen.',
  entries: range(12, 20).flatMap((a) => range(2, 9).map((b) => ({ left: `${a} × ${b}`, right: String(a * b) }))),
  items: range(12, 20).flatMap((a) => range(3, 9).map((b) => ({ prompt: `${a} × ${b} = ?`, answer: number(a * b), reveal: String(a * b) })))
};

export const TABLES = [squares, cubes, roots, fractions, primes, powers, factorials, triplets, trig, times];

/** The mixed drill draws from every table. */
export const MIXED = {
  id: 'mixed',
  title: 'Mixed drill',
  description: 'Questions from every table.',
  entries: [],
  items: TABLES.flatMap((table) => table.items)
};

export const getTable = (id) => (id === MIXED.id ? MIXED : TABLES.find((table) => table.id === id) || null);
