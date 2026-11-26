/**
 * Trigonometry extension: radians, standard-angle values, a sin θ + b cos θ and simple trig equations (trigonometry, Advanced unit).
 *
 * Every answer is checked a second way: exact surd answers are read back as
 * numbers and compared with Math.sin and friends; greatest and least values
 * are found again by sweeping θ; an equation's acute solution is found again
 * by searching for where the expression changes sign; an arc is found again
 * as a fraction of the whole circumference.
 */

import { fmt, gcd, nearlyEqual } from '../core.js';
import { RAD, piFractionText, radianFraction, radianText, rootsOf, surdValue, sweepExtremes } from '../../utils/trigExtras.js';

const PI7 = 22 / 7;
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n) => String(n).split('').map((d) => SUP[d]).join('');
const fraction = (top, bottom) => {
  const g = gcd(top, bottom);
  const [t, b] = [top / g, bottom / g];
  return b === 1 ? String(t) : `${t}/${b}`;
};
const fractionValue = (text) => {
  const [top, bottom = 1] = text.split('/').map(Number);
  return top / bottom;
};
const coef = (k, name) => (k === 1 ? name : `${k} ${name}`);
const capital = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;
const sin = (d) => Math.sin(d * RAD);
const cos = (d) => Math.cos(d * RAD);
const tan = (d) => Math.tan(d * RAD);

const TRIPLES = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41]
];

/* Angles (multiples of 5°) to convert; 180° is left out because π reads the same upside down. */
const CONVERT_ANGLES = Array.from({ length: 69 }, (_, i) => 10 + 5 * i).filter((d) => d !== 180);

/* ---------------------------- 15° and 75° ---------------------------- */

/**
 * Exact values built from 45° ± 30° (or a double angle). Each item: the
 * expression asked, its exact value, a Math-based value to check it against,
 * the first step, the working, and wrong answers with the slip behind each.
 */
const COMPOUND_ITEMS = [
  {
    ask: 'sin 15°',
    answer: '(√3 − 1)/(2√2)',
    value: () => sin(15),
    start: 'sin 15° = sin(45° − 30°) = sin 45° cos 30° − cos 45° sin 30°',
    working: '(1/√2)(√3/2) − (1/√2)(1/2) = (√3 − 1)/(2√2)',
    wrong: [
      ['(√3 + 1)/(2√2)', 'swapped sin 15° and cos 15°'],
      ['2 − √3', 'gave tan 15°'],
      ['(√2 − 1)/2', 'split sin(45° − 30°) into sin 45° − sin 30°'],
      ['(√3 − 1)/2', 'left out the 1/√2 from sin 45° and cos 45°']
    ]
  },
  {
    ask: 'cos 15°',
    answer: '(√3 + 1)/(2√2)',
    value: () => cos(15),
    start: 'cos 15° = cos(45° − 30°) = cos 45° cos 30° + sin 45° sin 30°',
    working: '(1/√2)(√3/2) + (1/√2)(1/2) = (√3 + 1)/(2√2)',
    wrong: [
      ['(√3 − 1)/(2√2)', 'used a minus sign in cos(A − B), which needs a plus'],
      ['2 + √3', 'gave tan 75°'],
      ['(√3 + 1)/2', 'left out the 1/√2 from sin 45° and cos 45°']
    ]
  },
  {
    ask: 'sin 75°',
    answer: '(√3 + 1)/(2√2)',
    value: () => sin(75),
    start: 'sin 75° = sin(45° + 30°) = sin 45° cos 30° + cos 45° sin 30°',
    working: '(1/√2)(√3/2) + (1/√2)(1/2) = (√3 + 1)/(2√2)',
    wrong: [
      ['(√3 − 1)/(2√2)', 'gave sin 15°'],
      ['2 + √3', 'gave tan 75°'],
      ['(√2 + 1)/2', 'split sin(45° + 30°) into sin 45° + sin 30°'],
      ['(√3 + 1)/2', 'left out the 1/√2 from sin 45° and cos 45°']
    ]
  },
  {
    ask: 'cos 75°',
    answer: '(√3 − 1)/(2√2)',
    value: () => cos(75),
    start: 'cos 75° = cos(45° + 30°) = cos 45° cos 30° − sin 45° sin 30°',
    working: '(1/√2)(√3/2) − (1/√2)(1/2) = (√3 − 1)/(2√2)',
    wrong: [
      ['(√3 + 1)/(2√2)', 'used a plus sign in cos(A + B), which needs a minus'],
      ['2 − √3', 'gave tan 15° (= cot 75°)'],
      ['(√2 + √3)/2', 'split cos(45° + 30°) into cos 45° + cos 30°']
    ]
  },
  {
    ask: 'tan 15°',
    answer: '2 − √3',
    value: () => tan(15),
    start: 'tan 15° = tan(45° − 30°) = (tan 45° − tan 30°)/(1 + tan 45° tan 30°)',
    working: '(1 − 1/√3)/(1 + 1/√3) = (√3 − 1)/(√3 + 1) = (√3 − 1)²/2 = 2 − √3',
    wrong: [
      ['2 + √3', 'gave tan 75° (tan 15° is less than 1)'],
      ['1 − 1/√3', 'split tan(45° − 30°) into tan 45° − tan 30°'],
      ['(√3 − 1)/(2√2)', 'gave sin 15°']
    ]
  },
  {
    ask: 'tan 75°',
    answer: '2 + √3',
    value: () => tan(75),
    start: 'tan 75° = tan(45° + 30°) = (tan 45° + tan 30°)/(1 − tan 45° tan 30°)',
    working: '(1 + 1/√3)/(1 − 1/√3) = (√3 + 1)/(√3 − 1) = (√3 + 1)²/2 = 2 + √3',
    wrong: [
      ['2 − √3', 'gave tan 15° (tan 75° is more than 1)'],
      ['1 + 1/√3', 'split tan(45° + 30°) into tan 45° + tan 30°'],
      ['(√3 + 1)/(2√2)', 'gave sin 75°']
    ]
  },
  {
    ask: 'cot 15°',
    answer: '2 + √3',
    value: () => 1 / tan(15),
    start: 'cot 15° = tan(90° − 15°) = tan 75°',
    working: 'tan 75° = tan(45° + 30°) = 2 + √3',
    wrong: [
      ['2 − √3', 'gave tan 15° instead of its reciprocal'],
      ['1 + 1/√3', 'split tan(45° + 30°) into tan 45° + tan 30°'],
      ['(√3 + 1)/(2√2)', 'gave cos 15°']
    ]
  },
  {
    ask: 'cot 75°',
    answer: '2 − √3',
    value: () => 1 / tan(75),
    start: 'cot 75° = tan(90° − 75°) = tan 15°',
    working: 'tan 15° = tan(45° − 30°) = 2 − √3',
    wrong: [
      ['2 + √3', 'gave tan 75° instead of its reciprocal'],
      ['1 − 1/√3', 'split tan(45° − 30°) into tan 45° − tan 30°'],
      ['(√3 − 1)/(2√2)', 'gave cos 75°']
    ]
  },
  {
    ask: 'tan 15° + tan 75°',
    answer: '4',
    value: () => tan(15) + tan(75),
    start: 'tan 15° = 2 − √3 and tan 75° = 2 + √3',
    working: '(2 − √3) + (2 + √3) = 4',
    wrong: [
      ['2√3', 'subtracted: that is tan 75° − tan 15°'],
      ['1', 'multiplied: that is tan 15° × tan 75°'],
      ['2 + √3', 'left out tan 15°']
    ]
  },
  {
    ask: 'tan 75° − tan 15°',
    answer: '2√3',
    value: () => tan(75) - tan(15),
    start: 'tan 75° = 2 + √3 and tan 15° = 2 − √3',
    working: '(2 + √3) − (2 − √3) = 2√3',
    wrong: [
      ['4', 'added: that is tan 75° + tan 15°'],
      ['√3', 'took it as tan(75° − 15°) = tan 60°'],
      ['1', 'multiplied: that is tan 15° × tan 75°']
    ]
  },
  {
    ask: 'tan 15° × tan 75°',
    answer: '1',
    value: () => tan(15) * tan(75),
    start: 'tan 75° = cot 15°, so the product is tan 15° × cot 15°',
    working: 'tan 15° × cot 15° = 1; or directly, (2 − √3)(2 + √3) = 4 − 3 = 1',
    wrong: [
      ['7', 'multiplied (2 − √3)(2 + √3) as 4 + 3'],
      ['4', 'added: that is tan 15° + tan 75°'],
      ['2√3', 'subtracted: that is tan 75° − tan 15°']
    ]
  },
  {
    ask: 'sin 75° − sin 15°',
    answer: '1/√2',
    value: () => sin(75) - sin(15),
    start: 'sin 75° = (√3 + 1)/(2√2) and sin 15° = (√3 − 1)/(2√2)',
    working: '(√3 + 1)/(2√2) − (√3 − 1)/(2√2) = 2/(2√2) = 1/√2',
    wrong: [
      ['√6/2', 'added instead of subtracting'],
      ['√3/2', 'took it as sin(75° − 15°) = sin 60°'],
      ['1/(2√2)', 'subtracted the 1s as 1 − 1 = 0 and kept only one']
    ]
  },
  {
    ask: 'sin 75° + sin 15°',
    answer: '√6/2',
    value: () => sin(75) + sin(15),
    start: 'sin 75° = (√3 + 1)/(2√2) and sin 15° = (√3 − 1)/(2√2)',
    working: '(√3 + 1)/(2√2) + (√3 − 1)/(2√2) = 2√3/(2√2) = √3/√2 = √6/2',
    wrong: [
      ['1/√2', 'subtracted instead of adding'],
      ['1', 'took it as sin(75° + 15°) = sin 90°'],
      ['√2', 'treated both as sin 45° = 1/√2']
    ]
  },
  {
    ask: 'sin 15° + cos 15°',
    answer: '√6/2',
    value: () => sin(15) + cos(15),
    start: 'sin 15° = (√3 − 1)/(2√2) and cos 15° = (√3 + 1)/(2√2)',
    working: '(√3 − 1)/(2√2) + (√3 + 1)/(2√2) = 2√3/(2√2) = √3/√2 = √6/2',
    wrong: [
      ['1/√2', 'subtracted instead of adding'],
      ['1', 'treated the sum like sin²15° + cos²15° = 1'],
      ['√3/2', 'took it as cos 30°, as if the angles could be added inside']
    ]
  },
  {
    ask: 'tan²15° + tan²75°',
    answer: '14',
    value: () => tan(15) ** 2 + tan(75) ** 2,
    start: 'tan 15° = 2 − √3 and tan 75° = 2 + √3',
    working: '(2 − √3)² + (2 + √3)² = (7 − 4√3) + (7 + 4√3) = 14',
    wrong: [
      ['4', 'added tan 15° + tan 75° without squaring'],
      ['16', 'squared the sum (tan 15° + tan 75°)² instead of adding the squares'],
      ['2', 'squared 2 − √3 as 4 − 3 and 2 + √3 as 4 − 3']
    ]
  },
  {
    ask: 'sin 15° cos 15°',
    answer: '1/4',
    value: () => sin(15) * cos(15),
    start: 'sin 2A = 2 sin A cos A (sin(A + B) with B = A), so sin 15° cos 15° = ½ sin 30°',
    working: '½ sin 30° = ½ × ½ = 1/4',
    wrong: [
      ['1/2', 'forgot the ½: sin 30° itself is 2 sin 15° cos 15°'],
      ['√3/4', 'used cos 30° instead of sin 30°'],
      ['1', 'confused the product with sin²15° + cos²15°']
    ]
  },
  {
    ask: 'cos²15° − sin²15°',
    answer: '√3/2',
    value: () => cos(15) ** 2 - sin(15) ** 2,
    start: 'cos 2A = cos²A − sin²A (cos(A + B) with B = A), so this is cos 30°',
    working: 'cos 30° = √3/2',
    wrong: [
      ['1', 'treated it as cos²15° + sin²15°'],
      ['1/2', 'used sin 30° instead of cos 30°'],
      ['√3/4', 'halved cos 30° as if it were the sin 2A formula']
    ]
  }
];

/* ---------------------------- equations ---------------------------- */

/** The acute roots each kind of equation can have: x = ratio (power 1) or ratio² (power 2), as [[top, bottom], angle]. */
const ROOTS = {
  sin: { 1: [[[1, 2], 30]], 2: [[[1, 4], 30], [[1, 2], 45], [[3, 4], 60]] },
  cos: { 1: [[[1, 2], 60]], 2: [[[1, 4], 60], [[1, 2], 45], [[3, 4], 30]] },
  tan: { 1: [[[1, 1], 45]], 2: [[[1, 3], 30], [[1, 1], 45], [[3, 1], 60]] }
};
/** Second roots that give no acute angle: sin and cos (and their squares) lie strictly between 0 and 1 there; tan cannot be negative. */
const BAD_ROOTS = {
  sincos: [[1, 1], [2, 1], [3, 1], [3, 2], [5, 2], [-1, 1], [-2, 1], [-1, 2], [-3, 2]],
  tan: [[-1, 1], [-2, 1], [-3, 1], [-1, 2], [-3, 2], [-1, 3]]
};

function polynomialText(A, B, C, x, x2) {
  const parts = [coef(A, x2)];
  if (B) parts.push(`${B < 0 ? '−' : '+'} ${coef(Math.abs(B), x)}`);
  if (C) parts.push(`${C < 0 ? '−' : '+'} ${Math.abs(C)}`);
  return `${parts.join(' ')} = 0`;
}

/* ---------------------------- θ = 45° ---------------------------- */

const SQ2 = Math.SQRT2;
/** Conditions that hold, for acute θ, only at 45°, each as a gap that is zero there. */
const FORTY_FIVE_CONDITIONS = [
  { id: 'sum', text: 'sin θ + cos θ = √2', gap: (d) => sin(d) + cos(d) - SQ2, why: 'sin θ + cos θ = √2 sin(θ + 45°), which reaches √2 only when θ + 45° = 90°' },
  { id: 'tancot', text: 'tan θ + cot θ = 2', gap: (d) => tan(d) + 1 / tan(d) - 2, why: 'tan θ + 1/tan θ = 2 gives (tan θ − 1)² = 0, so tan θ = 1' },
  { id: 'equal', text: 'sin θ = cos θ', gap: (d) => sin(d) - cos(d), why: 'dividing by cos θ gives tan θ = 1' },
  { id: 'product', text: 'sin θ cos θ = 1/2', gap: (d) => sin(d) * cos(d) - 0.5, why: '2 sin θ cos θ = sin 2θ = 1, so 2θ = 90°' },
  { id: 'secsq', text: 'sec²θ + cosec²θ = 4', gap: (d) => 1 / cos(d) ** 2 + 1 / sin(d) ** 2 - 4, why: 'sec²θ + cosec²θ = 1/(sin θ cos θ)², so sin θ cos θ = 1/2 and 2θ = 90°' }
];

/** Expressions to evaluate at 45°, with their exact values and the slips behind the wrong ones. */
const FORTY_FIVE_EXPRESSIONS = [
  ...[5, 7, 10, 20].map((n) => ({
    text: `tan${sup(n)}θ + cot${sup(n)}θ`,
    answer: '2',
    value: (d) => tan(d) ** n + 1 / tan(d) ** n,
    working: `tan 45° = cot 45° = 1, and 1${sup(n)} + 1${sup(n)} = 2`,
    wrong: [
      [fmt(2 ** n), `raised the sum 2 to the power ${n}`],
      [String(2 * n), `multiplied 2 by the power ${n}`],
      ['1', 'used tan θ × cot θ = 1 instead of adding']
    ]
  })),
  {
    text: 'sin⁴θ + cos⁴θ',
    answer: '1/2',
    value: (d) => sin(d) ** 4 + cos(d) ** 4,
    working: '(1/√2)⁴ + (1/√2)⁴ = 1/4 + 1/4 = 1/2',
    wrong: [['1', 'treated it like sin²θ + cos²θ = 1'], ['1/4', 'worked out only one of the two terms'], ['2', 'took sin 45° and cos 45° as 1']]
  },
  {
    text: 'sin⁶θ + cos⁶θ',
    answer: '1/4',
    value: (d) => sin(d) ** 6 + cos(d) ** 6,
    working: '(1/√2)⁶ + (1/√2)⁶ = 1/8 + 1/8 = 1/4',
    wrong: [['1', 'treated it like sin²θ + cos²θ = 1'], ['1/8', 'worked out only one of the two terms'], ['1/2', 'used fourth powers instead of sixth']]
  },
  {
    text: 'sin θ cos θ',
    answer: '1/2',
    value: (d) => sin(d) * cos(d),
    working: '(1/√2)(1/√2) = 1/2',
    wrong: [['1/√2', 'gave sin 45° alone'], ['1', 'confused the product with sin²θ + cos²θ'], ['√2', 'added instead of multiplying']],
    not: 'product'
  },
  {
    text: 'sec θ + cosec θ',
    answer: '2√2',
    value: (d) => 1 / cos(d) + 1 / sin(d),
    working: 'sec 45° = cosec 45° = √2, so the sum is 2√2',
    wrong: [['√2', 'gave sec 45° alone'], ['2', 'took sec 45° and cosec 45° as 1'], ['1/√2', 'used cos 45° instead of sec 45°, and only once']]
  },
  {
    text: 'sin θ + cos θ',
    answer: '√2',
    value: (d) => sin(d) + cos(d),
    working: '1/√2 + 1/√2 = 2/√2 = √2',
    wrong: [['1', 'treated the sum like sin²θ + cos²θ = 1'], ['2', 'took sin 45° and cos 45° as 1'], ['1/√2', 'gave sin 45° alone']],
    not: 'sum'
  },
  {
    text: 'sec²θ + cosec²θ',
    answer: '4',
    value: (d) => 1 / cos(d) ** 2 + 1 / sin(d) ** 2,
    working: '(√2)² + (√2)² = 2 + 2 = 4',
    wrong: [['2', 'gave sec²45° alone'], ['1', 'treated it like sin²θ + cos²θ = 1'], ['2√2', 'forgot to square sec 45° and cosec 45°']],
    not: 'secsq'
  },
  {
    text: 'tan θ + sec θ',
    answer: '1 + √2',
    value: (d) => tan(d) + 1 / cos(d),
    working: 'tan 45° + sec 45° = 1 + √2',
    wrong: [['1 + 1/√2', 'used cos 45° instead of sec 45°'], ['2', 'took sec 45° as 1'], ['√2', 'left out tan 45° = 1']]
  }
];

export const advTrigTemplates = [
  /* ============================ radians ============================ */
  {
    id: 'trig-adv-convert',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-adv-radians',
    difficulty: 'easy',
    type: 'single_choice',
    formulaIds: ['trig-adv-radian-f'],
    estimatedSeconds: 35,
    tags: ['advanced'],
    params(rng) {
      const degrees = rng.pick(CONVERT_ANGLES);
      const direction = rng.pick(['toRad', 'toDeg']);
      const [k, n] = radianFraction(degrees);
      return { degrees, direction, k, n };
    },
    answer: ({ degrees, direction }) => (direction === 'toRad' ? radianText(degrees) : `${degrees}°`),
    distractors: ({ degrees, direction, k, n }) =>
      direction === 'toRad'
        ? [
            { value: piFractionText(n, k), why: 'turned the fraction upside down' },
            { value: piFractionText(degrees, 360), why: 'took π as 360°' },
            { value: `${k}/${n}`, why: 'dropped the π' },
            { value: piFractionText(degrees, 90), why: 'took π as 90°' },
            { value: `${fmt(degrees * 180)}/π`, why: 'multiplied by 180/π instead of π/180' }
          ]
        : [
            { value: `${fmt(degrees * 2)}°`, why: 'took π as 360°' },
            { value: `${fmt(degrees / 2)}°`, why: 'took π as 90°' },
            { value: `${fmt((180 * n) / k)}°`, why: 'turned the fraction upside down' },
            { value: `${fmt(360 - degrees)}°`, why: 'measured the rest of the turn' }
          ],
    verify: ({ degrees, direction, k, n }, value) =>
      direction === 'toRad'
        ? // Read the answer back as a number of radians and compare with degrees × π/180.
          nearlyEqual(surdValue(value), degrees * RAD, 1e-12)
        : // Turn the answer back into radians and compare with kπ/n itself.
          nearlyEqual(Number(value.replace('°', '')) * (Math.PI / 180), (k * Math.PI) / n, 1e-12),
    render({ degrees, direction, k, n }) {
      const rad = radianText(degrees);
      if (direction === 'toRad') {
        return {
          question: `What is ${degrees}° in radians?`,
          explanation: `180° = π radians, so multiply by π/180: ${degrees} × π/180 = ${fraction(degrees, 180)} × π = ${rad}.`,
          solutionSteps: ['Radians = degrees × π/180.', `${degrees}/180 = ${k}/${n} in lowest terms.`, `${degrees}° = ${rad}.`],
          method: 'Multiply the degrees by π/180 and simplify.',
          hints: ['How many degrees make π radians?', `π radians = 180°, so ${degrees}° is ${degrees}/180 of π.`, `Simplify ${degrees}/180.`],
          commonMistakes: ['Multiplying by 180/π, the conversion the wrong way round.', 'Taking π as 360° (a full turn is 2π).', 'Writing the fraction upside down.']
        };
      }
      const product = `${k === 1 ? '' : `${k} × `}180${n === 1 ? '' : ` ÷ ${n}`}`;
      return {
        question: `What is ${rad} radians in degrees?`,
        explanation: `π radians = 180°, so replace π by 180°: ${rad} = ${product} = ${degrees}°.`,
        solutionSteps: ['Degrees = radians × 180/π, which simply replaces π by 180°.', `${product} = ${degrees}.`],
        method: 'Replace π by 180°.',
        hints: ['π radians is half a turn.', `Put 180° in place of π in ${rad}.`],
        commonMistakes: ['Replacing π by 360° (that is 2π).', 'Turning the fraction upside down.']
      };
    }
  },

  {
    id: 'trig-adv-arc-length',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-adv-radians',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['trig-adv-radian-f'],
    tolerance: 0,
    estimatedSeconds: 60,
    tags: ['advanced'],
    params(rng) {
      const kind = rng.pick(['radians', 'clock', 'pendulum', 'angle']);
      const degrees = kind === 'clock' ? 6 * rng.pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]) : rng.pick([30, 36, 45, 60, 72, 90, 120, 135, 144, 150, 210, 240, 270]);
      if (kind === 'pendulum' && degrees > 150) return null;
      // r = 7j keeps π = 22/7 whole: the arc 22·j·θ/180 is whole when j·θ is a multiple of 90.
      const js = [1, 2, 3, 4, 5, 6].filter((j) => (j * degrees) % 90 === 0);
      if (!js.length) return null;
      const r = 7 * rng.pick(js);
      return { kind, degrees, r, arc: (22 * (r / 7) * degrees) / 180, minutes: degrees / 6 };
    },
    // l = r × θ, with θ in radians (π = 22/7); or θ = l ÷ r, turned into degrees.
    answer: ({ kind, degrees, r, arc }) => (kind === 'angle' ? Number(((arc / r) * (180 / PI7)).toFixed(9)) : Number((r * ((degrees * PI7) / 180)).toFixed(9))),
    // Independently, as a fraction of the whole turn: the arc is θ/360 of the circumference 2πr.
    verify: ({ kind, degrees, r, arc }, value) =>
      kind === 'angle' ? nearlyEqual((arc / (2 * PI7 * r)) * 360, value, 1e-9) : nearlyEqual((value / (2 * PI7 * r)) * 360, degrees, 1e-9),
    render({ kind, degrees, r, arc, minutes }) {
      const [k, n] = radianFraction(degrees);
      const rad = radianText(degrees);
      const radValue = `${k === 1 ? '' : `${k} × `}22/7${n === 1 ? '' : ` ÷ ${n}`}`;
      const note = ' (Use π = 22/7.)';
      if (kind === 'angle') {
        return {
          question: `An arc of length ${fmt(arc)} cm on a circle of radius ${r} cm. What angle, in degrees, does it subtend at the centre?${note}`,
          explanation: `θ = l ÷ r = ${fmt(arc)}/${r} radians. To turn radians into degrees multiply by 180/π = 180 × 7/22: ${fmt(arc)}/${r} × 180 × 7/22 = ${degrees}°.`,
          solutionSteps: [`θ in radians = l ÷ r = ${fmt(arc)}/${r}.`, `Degrees = radians × 180/π = ${fmt(arc)}/${r} × 1260/22.`, `= ${degrees}°.`],
          method: 'θ = l ÷ r gives radians; multiply by 180/π for degrees.',
          hints: ['Arc length = radius × angle, with the angle in radians.', `The angle is ${fmt(arc)}/${r} radians.`, 'Multiply by 180/π = 1260/22 to get degrees.'],
          commonMistakes: [`Stopping at ${fmt(arc / r, 3)}, which is the angle in radians, not degrees.`, 'Multiplying by π/180 instead of 180/π.']
        };
      }
      const story = {
        radians: `An arc of a circle of radius ${r} cm subtends an angle of ${rad} radians at the centre. How long is the arc, in cm?`,
        clock: `The minute hand of a clock is ${r} cm long. How far, in cm, does its tip move in ${minutes} minutes?`,
        pendulum: `A pendulum ${r} cm long swings through an angle of ${degrees}°. How long, in cm, is the arc its tip describes?`
      }[kind];
      const angleStep =
        kind === 'clock'
          ? `In ${minutes} minutes the hand turns ${minutes} × 6° = ${degrees}° = ${rad} radians.`
          : kind === 'pendulum'
            ? `${degrees}° = ${degrees} × π/180 = ${rad} radians.`
            : `The angle is already in radians: ${rad}.`;
      return {
        question: `${story}${note}`,
        explanation: `${angleStep} Arc length l = rθ with θ in radians: ${r} × ${rad} = ${r} × ${radValue} = ${fmt(arc)} cm.`,
        solutionSteps: [angleStep, `l = rθ = ${r} × ${rad}.`, `With π = 22/7: l = ${fmt(arc)} cm.`],
        method: 'Arc length = radius × angle in radians.',
        hints: [
          kind === 'clock' ? 'The minute hand turns 360° in 60 minutes, which is 6° a minute.' : 'The formula l = rθ needs θ in radians.',
          kind === 'radians' ? 'Multiply the radius by the angle.' : `Convert ${degrees}° to radians: multiply by π/180.`,
          `l = ${r} × ${rad}.`
        ],
        commonMistakes: [`Using the angle in degrees in l = rθ, which gives ${fmt(r * degrees)}.`, `Taking θ/180 of 2πr instead of θ/360, which doubles the arc to ${fmt(2 * arc)}.`]
      };
    }
  },

  /* ============================ values and identities ============================ */
  {
    id: 'trig-adv-15-75',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-adv-values',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['trig-adv-compound-f', 'trig-adv-sc-15-75'],
    estimatedSeconds: 60,
    tags: ['advanced'],
    params(rng) {
      return { item: rng.int(0, COMPOUND_ITEMS.length - 1) };
    },
    answer: ({ item }) => COMPOUND_ITEMS[item].answer,
    distractors: ({ item }) => COMPOUND_ITEMS[item].wrong.map(([value, why]) => ({ value, why })),
    // Read the exact answer back as a number and compare with Math.sin, Math.cos and Math.tan at the angle.
    verify: ({ item }, value) => nearlyEqual(surdValue(value), COMPOUND_ITEMS[item].value(), 1e-12),
    render({ item }) {
      const { ask, answer, start, working, wrong } = COMPOUND_ITEMS[item];
      const double = /2A/.test(start);
      return {
        question: `What is the value of ${ask}?`,
        explanation: `${start}. Then ${working}. ${double ? 'The double-angle forms are sin(A + B) and cos(A + B) with B = A.' : 'Every 15° and 75° value comes from 45° ± 30°.'}`,
        solutionSteps: [`${start}.`, `${working}.`, `So ${ask} = ${answer}.`],
        method: double ? 'Recognise a double-angle formula.' : 'Write the angle as 45° ± 30° and use sin(A ± B), cos(A ± B) or tan(A ± B).',
        hints: [
          double ? 'Which formula has sin A cos A, or cos²A − sin²A, in it?' : 'Write 15° as 45° − 30° and 75° as 45° + 30°.',
          double ? 'sin 2A = 2 sin A cos A and cos 2A = cos²A − sin²A.' : 'sin(A ± B) = sin A cos B ± cos A sin B; tan 15° = 2 − √3 and tan 75° = 2 + √3.',
          `${start}.`
        ],
        commonMistakes: wrong.slice(0, 2).map(([value, why]) => `${capital(why)}, giving ${value}.`)
      };
    }
  },

  {
    id: 'trig-adv-cosec-cot',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-adv-values',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['trig-adv-sc-cosec-cot', 'trig-pythag-f'],
    estimatedSeconds: 75,
    tags: ['advanced'],
    params(rng) {
      const [p, q, r] = rng.pick(TRIPLES);
      const [opp, adj] = rng.chance(0.5) ? [p, q] : [q, p];
      const given = rng.pick(['plus', 'plus', 'minus']);
      const asked = rng.pick(['sin', 'cos', 'tan', 'sec']);
      return { opp, adj, hyp: r, given, asked };
    },
    answer: ({ opp, adj, hyp, asked }) => ({ sin: fraction(opp, hyp), cos: fraction(adj, hyp), tan: fraction(opp, adj), sec: fraction(hyp, adj) })[asked],
    distractors: ({ opp, adj, hyp }) => [
      { value: fraction(opp, hyp), why: 'gave sin θ' },
      { value: fraction(adj, hyp), why: 'gave cos θ' },
      { value: fraction(opp, adj), why: 'gave tan θ' },
      { value: fraction(adj, opp), why: 'gave cot θ' },
      { value: fraction(hyp, adj), why: 'gave sec θ' },
      { value: fraction(hyp, opp), why: 'gave cosec θ' }
    ],
    verify: ({ opp, adj, hyp, given, asked }, value) => {
      // From the given number alone: S = cosec θ + cot θ, so cot θ = (S² − 1)/2S and cosec θ = (S² + 1)/2S.
      const S = given === 'plus' ? (hyp + adj) / opp : opp / (hyp - adj);
      const cot = (S * S - 1) / (2 * S);
      const cosec = (S * S + 1) / (2 * S);
      const actual = { sin: 1 / cosec, cos: cot / cosec, tan: 1 / cot, sec: cosec / cot }[asked];
      return nearlyEqual(actual, fractionValue(value), 1e-9);
    },
    render({ opp, adj, hyp, given, asked }) {
      const sum = fraction(hyp + adj, opp);
      const diff = fraction(hyp - adj, opp);
      const answerText = this.answer({ opp, adj, hyp, asked });
      const [shown, other] = given === 'plus' ? [`cosec θ + cot θ = ${sum}`, `cosec θ − cot θ = 1 ÷ ${sum.includes('/') ? `(${sum})` : sum} = ${diff}`] : [`cosec θ − cot θ = ${diff}`, `cosec θ + cot θ = 1 ÷ ${diff.includes('/') ? `(${diff})` : diff} = ${sum}`];
      return {
        question: `If ${shown} and θ is acute, what is ${asked} θ?`,
        explanation: `cosec²θ − cot²θ = 1 factorises as (cosec θ + cot θ)(cosec θ − cot θ) = 1, so ${other}. Adding the two and halving: cosec θ = ${fraction(hyp, opp)}; subtracting and halving: cot θ = ${fraction(adj, opp)}. So the triangle has opposite ${opp}, adjacent ${adj} and hypotenuse ${hyp}, and ${asked} θ = ${answerText}.`,
        solutionSteps: [`${other}.`, `cosec θ = ${fraction(hyp, opp)}, cot θ = ${fraction(adj, opp)}.`, `Opposite ${opp}, adjacent ${adj}, hypotenuse ${hyp}: ${asked} θ = ${answerText}.`],
        method: 'cosec θ + cot θ and cosec θ − cot θ are reciprocals; find both, then add and subtract.',
        hints: ['Which identity links cosec θ and cot θ?', 'cosec²θ − cot²θ = 1 = (cosec θ + cot θ)(cosec θ − cot θ).', `So ${other}.`],
        commonMistakes: ['Mixing it up with sec θ + tan θ and reading off the wrong triangle.', `Stopping at cosec θ or cot θ instead of going on to ${asked} θ.`]
      };
    }
  },

  {
    id: 'trig-adv-square-sums',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-adv-values',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['trig-adv-sc-pairs', 'trig-complementary-f'],
    answerDecimals: 1,
    tolerance: 0,
    estimatedSeconds: 60,
    tags: ['advanced'],
    params(rng) {
      const step = rng.pick([1, 2, 3, 5, 6, 9, 10, 15, 18]);
      const fn = rng.pick(['sin', 'cos']);
      const from = rng.pick([0, step]);
      const to = rng.pick([90 - step, 90]);
      const angles = [];
      for (let a = from; a <= to; a += step) angles.push(a);
      return { step, fn, angles };
    },
    // Pair x with 90° − x: sin²x + sin²(90° − x) = 1; 45° gives 1/2; 0° and 90° give 0 or 1 on their own.
    answer: ({ fn, angles }) => {
      const set = new Set(angles);
      let total = 0;
      for (const a of angles) {
        if (a > 0 && a < 45 && set.has(90 - a)) total += 1;
        else if (a === 45) total += 0.5;
        else if (a === 0) total += fn === 'sin' ? 0 : 1;
        else if (a === 90) total += fn === 'sin' ? 1 : 0;
      }
      return total;
    },
    // Add the squares one by one with Math.sin / Math.cos.
    verify: ({ fn, angles }, value) => nearlyEqual(angles.reduce((sum, a) => sum + (fn === 'sin' ? sin(a) : cos(a)) ** 2, 0), value, 1e-9),
    render({ step, fn, angles }) {
      const t = (a) => `${fn}²${a}°`;
      const shown = angles.length <= 5 ? angles.map(t).join(' + ') : `${angles.slice(0, 3).map(t).join(' + ')} + … + ${t(angles[angles.length - 1])}`;
      const inner = angles.filter((a) => a > 0 && a < 90);
      const pairs = inner.filter((a) => a < 45).length;
      const middle = inner.includes(45);
      const ends = angles.filter((a) => a === 0 || a === 90);
      const endValue = (a) => (fn === 'sin' ? (a === 90 ? 1 : 0) : a === 0 ? 1 : 0);
      const value = this.answer({ fn, angles });
      const other = fn === 'sin' ? 'cos' : 'sin';
      const pieces = [`${pairs} × 1`, ...(middle ? ['1/2'] : []), ...ends.map((a) => String(endValue(a)))];
      const endText = ends.map((a) => `${t(a)} = ${endValue(a)}`).join(' and ');
      return {
        question: `What is the value of ${shown}? (The angles go up in steps of ${step}°.)`,
        explanation: `Pair each angle with its complement: ${fn}²(90° − x) = ${other}²x, so for example ${t(inner[0])} + ${t(inner[inner.length - 1])} = ${fn}²${inner[0]}° + ${other}²${inner[0]}° = 1. There ${pairs === 1 ? 'is' : 'are'} ${pairs} such pair${pairs === 1 ? '' : 's'}.${middle ? ` The middle term ${fn}²45° = 1/2 has no partner.` : ''}${ends.length ? ` On their own, ${endText}.` : ''} Total: ${fmt(value)}.`,
        solutionSteps: [`${inner.length} terms lie strictly between 0° and 90°${ends.length ? `; ${endText}` : ''}.`, `They make ${pairs} pair${pairs === 1 ? '' : 's'} (x, 90° − x), each adding to 1${middle ? `, with ${fn}²45° = 1/2 left over` : ''}.`, `${pieces.join(' + ')} = ${fmt(value)}.`],
        method: 'Pair angles that add to 90°; each pair of squares adds to 1.',
        hints: ['Which angles in the list add up to 90°?', `${fn}²x + ${fn}²(90° − x) = ${fn}²x + ${other}²x = 1.`, `Count the pairs, then deal with ${[...(middle ? ['45°'] : []), ...ends.map((a) => `${a}°`)].join(' and ') || 'nothing else: every term has a partner'}.`],
        commonMistakes: [
          middle ? `Forgetting the middle term ${fn}²45° = 1/2, or counting it as 1.` : `Halving the number of terms without checking that every term has a partner.`,
          ends.length ? `Getting the end term wrong: sin 0° = 0 and sin 90° = 1, cos the other way round.` : `Treating ${fn}²x + ${fn}²(90° − x) as 2 ${fn}²x.`
        ]
      };
    }
  },

  /* ============================ greatest and least values ============================ */
  {
    id: 'trig-adv-square-range',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-adv-maxmin',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['trig-adv-maxmin-f'],
    estimatedSeconds: 50,
    tags: ['advanced'],
    params(rng) {
      const p = rng.int(1, 15);
      const q = rng.int(1, 15);
      if (p === q) return null;
      const asked = rng.pick(['largest', 'smallest', 'spread']);
      return { p, q, asked };
    },
    answer: ({ p, q, asked }) => (asked === 'largest' ? Math.max(p, q) : asked === 'smallest' ? Math.min(p, q) : Math.abs(p - q)),
    formatValue: (value) => fmt(value),
    distractors: ({ p, q, asked }) => [
      { value: p + q, why: 'added the coefficients, as if sin²θ and cos²θ could both be 1' },
      { value: Math.hypot(p, q), why: 'used √(a² + b²), which is for a sin θ + b cos θ' },
      { value: (p + q) / 2, why: 'took the value at 45°' },
      { value: asked === 'spread' ? Math.max(p, q) : asked === 'largest' ? Math.min(p, q) : 0, why: asked === 'smallest' ? 'assumed the least value is 0' : 'swapped the largest and smallest' },
      { value: asked === 'spread' ? p + q : Math.abs(p - q), why: 'subtracted the coefficients' }
    ],
    // Sweep θ round the whole turn and read off the extremes.
    verify: ({ p, q, asked }, value) => {
      const { min, max } = sweepExtremes((d) => p * sin(d) ** 2 + q * cos(d) ** 2, 0, 360, 0.5);
      return Math.abs((asked === 'largest' ? max : asked === 'smallest' ? min : max - min) - value) < 1e-9;
    },
    render({ p, q, asked }) {
      const expr = `${coef(p, 'sin²θ')} + ${coef(q, 'cos²θ')}`;
      const [hi, lo] = [Math.max(p, q), Math.min(p, q)];
      const square = p > q ? 'sin²θ' : 'cos²θ';
      const rewrite = `${lo} + ${coef(hi - lo, square)}`;
      const answer = this.answer({ p, q, asked });
      return {
        question: asked === 'spread' ? `What is the difference between the greatest and the least values of ${expr}?` : `What is the ${asked} value of ${expr}?`,
        explanation: `Use sin²θ + cos²θ = 1 to write it as ${rewrite}. ${square} runs from 0 to 1, so the expression runs from ${lo} to ${hi}${asked === 'spread' ? `, a difference of ${answer}` : `; the ${asked} value is ${answer}`}.`,
        solutionSteps: [`${expr} = ${rewrite}.`, `0 ≤ ${square} ≤ 1, so ${lo} ≤ ${expr} ≤ ${hi}.`, asked === 'spread' ? `${hi} − ${lo} = ${answer}.` : `The ${asked} value is ${answer}.`],
        method: 'Replace one square using sin²θ + cos²θ = 1; the value lies between the two coefficients.',
        hints: ['sin²θ and cos²θ always add to 1, so they cannot both be large.', `Write it as ${rewrite}.`, `${square} goes from 0 to 1.`],
        commonMistakes: [`Answering ${p + q}, as if sin²θ and cos²θ could both be 1.`, `Using √(a² + b²) = ${fmt(Math.hypot(p, q))}, which belongs to a sin θ + b cos θ.`]
      };
    }
  },

  {
    id: 'trig-adv-am-gm',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-adv-maxmin',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['trig-adv-maxmin-f'],
    estimatedSeconds: 60,
    tags: ['advanced'],
    params(rng) {
      let p = rng.int(1, 9);
      let q = rng.int(1, 9);
      if (p === q) return null;
      const form = rng.pick(['tancot', 'tancot', 'sincosec', 'cossec']);
      // sin²θ can only reach q/p when q ≤ p (cos²θ likewise), so the larger coefficient goes on sin²θ or cos²θ.
      if (form !== 'tancot' && p < q) [p, q] = [q, p];
      return { p, q, form };
    },
    answer: ({ p, q }) => 2 * p * q,
    formatValue: (value) => fmt(value),
    distractors: ({ p, q }) => [
      { value: p * p + q * q, why: 'added the coefficients' },
      { value: p * q, why: 'forgot the 2 in 2√(ab)' },
      { value: 2 * p * p * q * q, why: 'used 2ab with the squares themselves, forgetting the square roots' },
      { value: p + q, why: 'added the square roots of the coefficients' }
    ],
    // Sweep θ finely and find the least value of the expression itself.
    verify: ({ p, q, form }, value) => {
      const f = {
        tancot: (d) => p * p * tan(d) ** 2 + (q * q) / tan(d) ** 2,
        sincosec: (d) => p * p * sin(d) ** 2 + (q * q) / sin(d) ** 2,
        cossec: (d) => p * p * cos(d) ** 2 + (q * q) / cos(d) ** 2
      }[form];
      const { min } = sweepExtremes(f, 0.01, 179.99, 0.01);
      return min >= value - 1e-9 && min - value < 1e-4 * value;
    },
    render({ p, q, form }) {
      const [x, y] = { tancot: ['tan²θ', 'cot²θ'], sincosec: ['sin²θ', 'cosec²θ'], cossec: ['cos²θ', 'sec²θ'] }[form];
      const expr = `${coef(p * p, x)} + ${coef(q * q, y)}`;
      const at = `${x} = ${fraction(q, p)}`;
      return {
        question: `What is the least value of ${expr}?`,
        explanation: `${x} × ${y} = 1, so the two terms multiply to ${p * p} × ${q * q} = ${p * p * q * q}, a constant. Two positive numbers with a fixed product have their least sum when they are equal (AM ≥ GM): the sum is at least 2√(${p * p} × ${q * q}) = 2 × ${p} × ${q} = ${2 * p * q}. It is reached when ${coef(p * p, x)} = ${coef(q * q, y)}, that is ${at}${form === 'tancot' ? '' : ', which is possible because it is at most 1'}.`,
        solutionSteps: [`${x} × ${y} = 1, so the product of the two terms is ${p * p * q * q}.`, `AM ≥ GM: the sum is at least 2√${p * p * q * q} = ${2 * p * q}.`, `Equality at ${at}, so the least value is ${2 * p * q}.`],
        method: 'a²x + b²/x (x > 0) is least when the two terms are equal: the minimum is 2ab.',
        hints: [`What is ${x} × ${y}?`, 'For a fixed product, a sum of two positive terms is least when the terms are equal.', `The least value is 2√(${p * p} × ${q * q}).`],
        commonMistakes: [`Answering ${p * p + q * q} by adding the coefficients.`, `Answering ${p * q} by leaving out the 2.`]
      };
    }
  },

  /* ============================ equations ============================ */
  {
    id: 'trig-adv-quadratic',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-adv-equations',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['trig-adv-sc-equations', 'trig-standard-f'],
    estimatedSeconds: 70,
    tags: ['advanced'],
    params(rng) {
      const fn = rng.pick(['sin', 'cos', 'tan']);
      const power = rng.pick([1, 1, 2]);
      const [[p1, q1], angle] = rng.pick(ROOTS[fn][power]);
      const [p2, q2] = rng.pick(fn === 'tan' ? BAD_ROOTS.tan : BAD_ROOTS.sincos);
      // (q1·x − p1)(q2·x − p2) = 0, in lowest terms.
      let [A, B, C] = [q1 * q2, -(q1 * p2 + q2 * p1), p1 * p2];
      const g = gcd(gcd(A, B || A), C || A);
      [A, B, C] = [A / g, B / g, C / g];
      return { fn, power, A, B, C, angle, good: [p1, q1], bad: [p2, q2] };
    },
    answer: ({ angle }) => `${angle}°`,
    distractors: ({ fn, angle, bad }) => [
      { value: `${90 - angle}°`, why: `mixed up ${fn} and its co-ratio` },
      { value: '90°', why: bad[0] === bad[1] ? 'kept the root that gives 90°, which is not acute' : 'took the largest angle in the table' },
      { value: '30°', why: 'another standard angle' },
      { value: '45°', why: 'another standard angle' },
      { value: '60°', why: 'another standard angle' }
    ],
    // Search (0°, 90°) for where the expression changes sign: exactly one place, at the answer.
    verify: ({ fn, power, A, B, C }, value) => {
      const f = { sin, cos, tan }[fn];
      const poly = (d) => {
        const x = f(d) ** power;
        return A * x * x + B * x + C;
      };
      const roots = rootsOf(poly, 0.25, 89.75, 0.25);
      return roots.length === 1 && Math.abs(roots[0] - Number(value.replace('°', ''))) < 1e-6;
    },
    render({ fn, power, A, B, C, angle, good, bad }) {
      const x = power === 1 ? `${fn} θ` : `${fn}²θ`;
      const x2 = power === 1 ? `${fn}²θ` : `${fn}⁴θ`;
      const eq = polynomialText(A, B, C, x, x2);
      const r1 = fraction(good[0], good[1]);
      const r2 = bad[0] < 0 ? `−${fraction(-bad[0], bad[1])}` : fraction(bad[0], bad[1]);
      const reason =
        bad[0] < 0
          ? `${x} cannot be negative${power === 1 ? ' for an acute angle' : ''}`
          : bad[0] === bad[1]
            ? `${x} = 1 gives θ = ${fn === 'cos' ? '0°' : '90°'}, which is not acute`
            : `${x} cannot be more than 1`;
      return {
        question: `If ${eq} and θ is acute (0° < θ < 90°), what is θ?`,
        explanation: `Treat ${x} as the unknown and factorise: the roots are ${x} = ${r1} and ${x} = ${r2}. Reject ${r2}: ${reason}. So ${x} = ${r1}, which gives θ = ${angle}°.`,
        solutionSteps: [`Let x = ${x}: the equation is a quadratic in x.`, `Its roots are x = ${r1} and x = ${r2}.`, `Reject ${r2} (${reason}); ${x} = ${r1} gives θ = ${angle}°.`],
        method: 'Solve the quadratic in the ratio, reject the root the ratio cannot take, then read the angle from the table.',
        hints: [`Put x = ${x}; what kind of equation is it in x?`, `Factorise it: one root is ${r1}.`, `Which root can ${x} actually take when θ is acute?`],
        commonMistakes: [`Keeping the root ${r2}, which ${x} cannot take here.`, `Reading the angle for the co-ratio, which gives ${90 - angle}°.`]
      };
    }
  },

  {
    id: 'trig-adv-forty-five',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-adv-equations',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['trig-adv-sc-equations'],
    estimatedSeconds: 50,
    tags: ['advanced'],
    params(rng) {
      const condition = rng.int(0, FORTY_FIVE_CONDITIONS.length - 1);
      const expression = rng.int(0, FORTY_FIVE_EXPRESSIONS.length - 1);
      if (FORTY_FIVE_EXPRESSIONS[expression].not === FORTY_FIVE_CONDITIONS[condition].id) return null;
      return { condition, expression };
    },
    answer: ({ expression }) => FORTY_FIVE_EXPRESSIONS[expression].answer,
    distractors: ({ expression }) => FORTY_FIVE_EXPRESSIONS[expression].wrong.map(([value, why]) => ({ value, why })),
    // Find θ from the condition by sweeping (0°, 90°) for where it holds, then evaluate the expression there.
    verify: ({ condition, expression }, value) => {
      const { gap } = FORTY_FIVE_CONDITIONS[condition];
      const { min, argMin } = sweepExtremes((d) => Math.abs(gap(d)), 0.01, 89.99, 0.01);
      if (min > 1e-6) return false;
      const exact = surdValue(value);
      return Math.abs(FORTY_FIVE_EXPRESSIONS[expression].value(argMin) - exact) < 1e-6 * Math.max(1, Math.abs(exact));
    },
    render({ condition, expression }) {
      const c = FORTY_FIVE_CONDITIONS[condition];
      const e = FORTY_FIVE_EXPRESSIONS[expression];
      return {
        question: `If ${c.text} and θ is acute, what is the value of ${e.text}?`,
        explanation: `For an acute θ, ${c.text} holds only at θ = 45°: ${c.why}. At 45°, ${e.working}.`,
        solutionSteps: [`${c.text} ⇒ θ = 45° (${c.why}).`, `At 45°: ${e.working}.`],
        method: 'Find θ from the condition first (it is 45°), then substitute.',
        hints: [`Which standard angle makes ${c.text} true?`, 'It is 45°, where sin θ = cos θ = 1/√2 and tan θ = cot θ = 1.', `Substitute 45° into ${e.text}.`],
        commonMistakes: e.wrong.slice(0, 2).map(([value, why]) => `${capital(why)}, giving ${value}.`)
      };
    }
  }
];
