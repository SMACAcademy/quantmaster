/** Trigonometry templates. Every answer is checked against Math.sin/cos/tan. */

import { fmt, gcd, nearlyEqual } from '../core.js';

const RAD = Math.PI / 180;
/* Angles whose squared ratio is not zero, so no term in a question is trivially 0. */
const SIN_ANGLES = [30, 45, 60, 90];
const COS_ANGLES = [0, 30, 45, 60];
const TAN_ANGLES = [30, 45, 60];

/* Squares of the standard values, exact: sin², cos² in quarters, tan² in thirds. */
const SIN2 = { 30: 1 / 4, 45: 1 / 2, 60: 3 / 4, 90: 1 };
const COS2 = { 0: 1, 30: 3 / 4, 45: 1 / 2, 60: 1 / 4 };
const TAN2 = { 30: 1 / 3, 45: 1, 60: 3 };
const SIN2_TEXT = { 30: '1/4', 45: '1/2', 60: '3/4', 90: '1' };
const COS2_TEXT = { 0: '1', 30: '3/4', 45: '1/2', 60: '1/4' };
const TAN2_TEXT = { 30: '1/3', 45: '1', 60: '3' };

const TRIPLES = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41]
];

const fraction = (top, bottom) => {
  const g = gcd(top, bottom);
  return bottom / g === 1 ? String(top / g) : `${top / g}/${bottom / g}`;
};
const fractionValue = (text) => {
  const [top, bottom = 1] = text.split('/').map(Number);
  return top / bottom;
};
const term = (k, name) => (k === 1 ? name : `${k} ${name}`);

const SIDE_WORDS = { opp: 'the side opposite θ', adj: 'the side next to θ', hyp: 'the hypotenuse' };
/**
 * A right triangle drawn to scale: θ at A, the right angle at B, A=(0,0), B=(adj,0), C=(adj,opp).
 * `labels` names the sides to label ({ opp, adj, hyp } → text); the others stay bare.
 */
function rightTriangleFigure(opp, adj, labels, caption) {
  const theta = Math.atan2(opp, adj);
  const labelRadius = Math.ceil(8.5 / Math.sin(theta / 2));
  const offsets = {
    adj: ['A', 'B', [0, 16]],
    opp: ['B', 'C', (text) => [8 + 4 * text.length, 0]],
    hyp: ['A', 'C', [Math.round(-16 * Math.sin(theta)) - 4, Math.round(-16 * Math.cos(theta))]]
  };
  const shapes = [{ type: 'polygon', points: ['A', 'B', 'C'] }];
  for (const side of ['adj', 'opp', 'hyp']) {
    if (!labels[side]) continue;
    const [from, to, offset] = offsets[side];
    shapes.push({ type: 'segment', from, to, label: labels[side], labelOffset: typeof offset === 'function' ? offset(labels[side]) : offset });
  }
  const given = ['opp', 'adj', 'hyp'].filter((side) => labels[side]).map((side) => `${SIDE_WORDS[side]} is ${labels[side]}`);
  return {
    type: 'diagram',
    caption,
    points: [
      { id: 'A', x: 0, y: 0, hidden: true },
      { id: 'B', x: adj, y: 0, hidden: true },
      { id: 'C', x: adj, y: opp, hidden: true }
    ],
    shapes,
    // A thin angle needs its θ further out, where the wedge is wide enough to hold it.
    angles: [{ at: 'A', from: 'B', to: 'C', label: 'θ', radius: 26, ...(labelRadius > 39 ? { labelRadius } : {}) }],
    rightAngles: [{ at: 'B', from: 'A', to: 'C' }],
    ariaSummary: `A right triangle with the right angle and the acute angle θ marked. ${given.join(' and ').replace(/^t/, 'T')}.`
  };
}

export const trigonometryTemplates = [
  {
    id: 'trig-standard-squares',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-standard',
    difficulty: 'easy',
    type: 'numerical_input',
    formulaIds: ['trig-standard-f'],
    answerDecimals: 2,
    estimatedSeconds: 45,
    params(rng) {
      const [A, B, C] = [rng.pick(SIN_ANGLES), rng.pick(COS_ANGLES), rng.pick(TAN_ANGLES)];
      const p = rng.int(1, 4);
      const q = rng.int(1, 4);
      const r = rng.pick([0, 3, 6]);
      const value = p * SIN2[A] + q * COS2[B] + r * TAN2[C];
      if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-9) return null;
      return { A, B, C, p, q, r, value: Math.round(value * 100) / 100 };
    },
    answer: ({ value }) => value,
    verify: ({ A, B, C, p, q, r }, value) =>
      nearlyEqual(p * Math.sin(A * RAD) ** 2 + q * Math.cos(B * RAD) ** 2 + r * Math.tan(C * RAD) ** 2, value, 1e-9),
    render({ A, B, C, p, q, r, value }) {
      const parts = [term(p, `sin²${A}°`), term(q, `cos²${B}°`), ...(r ? [term(r, `tan²${C}°`)] : [])];
      const pieces = [`${p} × ${SIN2_TEXT[A]}`, `${q} × ${COS2_TEXT[B]}`, ...(r ? [`${r} × ${TAN2_TEXT[C]}`] : [])];
      return {
        question: `What is ${parts.join(' + ')}?`,
        explanation: `sin²${A}° = ${SIN2_TEXT[A]}, cos²${B}° = ${COS2_TEXT[B]}${r ? ` and tan²${C}° = ${TAN2_TEXT[C]}` : ''}. So the value is ${pieces.join(' + ')} = ${fmt(value)}.`,
        solutionSteps: [`sin²${A}° = ${SIN2_TEXT[A]}, cos²${B}° = ${COS2_TEXT[B]}${r ? `, tan²${C}° = ${TAN2_TEXT[C]}` : ''}.`, `${pieces.join(' + ')} = ${fmt(value)}.`],
        method: 'Square the standard values first; the square roots disappear.',
        hints: ['sin²30° = 1/4, sin²45° = 1/2, sin²60° = 3/4.', ...(r ? ['tan²30° = 1/3 and tan²60° = 3.'] : [])],
        commonMistakes: ['Squaring the angle instead of the ratio.', 'Swapping the values of 30° and 60°.']
      };
    }
  },

  {
    id: 'trig-from-one-ratio',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-one-ratio',
    difficulty: 'medium',
    type: 'single_choice',
    formulaIds: ['trig-one-ratio-f', 'trig-ratios-f'],
    estimatedSeconds: 50,
    params(rng) {
      const [a, b, c] = rng.pick(TRIPLES);
      const [opp, adj] = rng.chance(0.5) ? [a, b] : [b, a];
      const given = rng.pick(['tan', 'sin', 'cos']);
      const asked = rng.pick(['sin', 'cos', 'tan', 'sec', 'cosec'].filter((name) => name !== given));
      return { opp, adj, hyp: c, given, asked };
    },
    answer: ({ opp, adj, hyp, asked }) => ({ sin: fraction(opp, hyp), cos: fraction(adj, hyp), tan: fraction(opp, adj), sec: fraction(hyp, adj), cosec: fraction(hyp, opp) })[asked],
    distractors: ({ opp, adj, hyp }) =>
      [fraction(opp, hyp), fraction(adj, hyp), fraction(opp, adj), fraction(adj, opp), fraction(hyp, adj), fraction(hyp, opp)].map((value) => ({ value, why: 'another ratio of the same triangle' })),
    verify: ({ opp, adj, given, asked }, value) => {
      const theta = Math.atan2(opp, adj);
      const actual = { sin: Math.sin(theta), cos: Math.cos(theta), tan: Math.tan(theta), sec: 1 / Math.cos(theta), cosec: 1 / Math.sin(theta) }[asked];
      return nearlyEqual(actual, fractionValue(value), 1e-9) && given !== asked;
    },
    render({ opp, adj, hyp, given, asked }) {
      const givenText = { sin: fraction(opp, hyp), cos: fraction(adj, hyp), tan: fraction(opp, adj) }[given];
      const sides = { sin: 'opposite and hypotenuse', cos: 'adjacent and hypotenuse', tan: 'opposite and adjacent' }[given];
      const answerText = this.answer({ opp, adj, hyp, asked });
      const [top, bottom] = { sin: ['opp', 'hyp'], cos: ['adj', 'hyp'], tan: ['opp', 'adj'] }[given];
      const lengths = { opp, adj, hyp };
      return {
        question: `If ${given} θ = ${givenText} and θ is acute, what is ${asked} θ?`,
        figure: rightTriangleFigure(opp, adj, { [top]: String(lengths[top]), [bottom]: String(lengths[bottom]) }, `The right triangle ${given} θ = ${givenText} describes`),
        explanation: `Draw a right triangle with ${sides} in the ratio ${givenText}. The sides are ${opp} (opposite), ${adj} (adjacent) and ${hyp} (hypotenuse), so ${asked} θ = ${answerText}.`,
        solutionSteps: [`${given} θ = ${givenText} fixes two sides.`, `Pythagoras gives the third: the sides are ${opp}, ${adj}, ${hyp}.`, `${asked} θ = ${answerText}.`],
        method: 'Draw the triangle the ratio describes, find the third side, read off the ratio asked for.',
        hints: [`Use sides ${sides} for the given ratio.`, `The third side comes from Pythagoras: it is ${({ sin: adj, cos: opp, tan: hyp })[given]}.`],
        commonMistakes: ['Writing the reciprocal of the ratio asked for.', 'Taking the given numbers as the two legs when the ratio is a sine or cosine.']
      };
    }
  },

  {
    id: 'trig-complementary-solve',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-complementary',
    difficulty: 'medium',
    type: 'numerical_input',
    formulaIds: ['trig-complementary-f'],
    estimatedSeconds: 50,
    params(rng) {
      const x = rng.int(5, 25);
      const k1 = rng.pick([1, 2, 3]);
      const k2 = rng.pick([1, 2, 3]);
      const a = rng.int(-10, 20);
      const total = (k1 + k2) * x + a;
      const b = 90 - total;
      const [first, second] = [k1 * x + a, k2 * x + b];
      if (first <= 0 || second <= 0 || first >= 90 || second >= 90 || first === second) return null;
      const pair = rng.pick([['sin', 'cos'], ['tan', 'cot'], ['sec', 'cosec']]);
      return { x, k1, k2, a, b, first, second, pair };
    },
    answer: ({ x }) => x,
    verify: ({ k1, k2, a, b, pair }, value) => {
      const f = { sin: Math.sin, cos: Math.cos, tan: Math.tan, cot: (t) => 1 / Math.tan(t), sec: (t) => 1 / Math.cos(t), cosec: (t) => 1 / Math.sin(t) };
      return nearlyEqual(f[pair[0]]((k1 * value + a) * RAD), f[pair[1]]((k2 * value + b) * RAD), 1e-9);
    },
    render({ x, k1, k2, a, b, first, second, pair }) {
      const expr = (k, c) => `${k === 1 ? '' : k}x${c === 0 ? '' : c > 0 ? ` + ${c}` : ` − ${-c}`}`;
      const [f1, f2] = pair;
      return {
        question: `If ${f1}(${expr(k1, a)})° = ${f2}(${expr(k2, b)})° and both angles are acute, what is x?`,
        explanation: `${f1} A = ${f2} B for acute angles means A + B = 90°. So (${expr(k1, a)}) + (${expr(k2, b)}) = 90, giving ${k1 + k2}x = ${90 - a - b}, x = ${x}. Check: ${first}° + ${second}° = 90°.`,
        solutionSteps: [`The two angles must add to 90°.`, `${k1 + k2}x + ${a + b} = 90.`, `x = ${x}.`],
        method: `${f1} A = ${f2} B means A and B are complementary.`,
        hints: [`${f1} and ${f2} are co-ratios: when are they equal?`, 'Add the two angles and set the sum to 90.'],
        commonMistakes: ['Setting the two angles equal to each other instead of adding them to 90.']
      };
    }
  },

  {
    id: 'trig-max-value',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-identities',
    difficulty: 'complex',
    type: 'numerical_input',
    formulaIds: ['trig-sc-max'],
    estimatedSeconds: 45,
    params(rng) {
      const [p, q, r] = rng.pick(TRIPLES);
      const k = rng.int(1, 3);
      const [a, b] = rng.chance(0.5) ? [p * k, q * k] : [q * k, p * k];
      const shift = rng.pick([0, 0, 2, 5, 10]);
      const asked = rng.pick(['largest', 'smallest']);
      if (asked === 'smallest' && shift < r * k) return { a, b, c: r * k, shift: r * k + shift, asked };
      return { a, b, c: r * k, shift, asked };
    },
    answer: ({ c, shift, asked }) => (asked === 'largest' ? shift + c : shift - c),
    verify: ({ a, b, shift, asked }, value) => {
      let best = asked === 'largest' ? -Infinity : Infinity;
      for (let d = 0; d < 360; d += 0.05) {
        const v = shift + a * Math.sin(d * RAD) + b * Math.cos(d * RAD);
        best = asked === 'largest' ? Math.max(best, v) : Math.min(best, v);
      }
      return Math.abs(best - value) < 0.01;
    },
    render({ a, b, c, shift, asked }) {
      const expr = `${shift ? `${shift} + ` : ''}${a} sin θ + ${b} cos θ`;
      const answer = asked === 'largest' ? shift + c : shift - c;
      return {
        question: `What is the ${asked} value of ${expr}?`,
        explanation: `a sin θ + b cos θ ranges from −√(a² + b²) to √(a² + b²). Here √(${a}² + ${b}²) = ${c}, so the ${asked} value is ${shift ? `${shift} ${asked === 'largest' ? '+' : '−'} ${c} = ` : asked === 'largest' ? '' : '−'}${answer}.`,
        solutionSteps: [`√(${a}² + ${b}²) = √${a * a + b * b} = ${c}.`, `${asked === 'largest' ? 'Largest' : 'Smallest'}: ${shift ? `${shift} ${asked === 'largest' ? '+' : '−'} ${c}` : `${asked === 'largest' ? '' : '−'}${c}`} = ${answer}.`],
        method: 'a sin θ + b cos θ lies between −√(a² + b²) and √(a² + b²).',
        hints: ['The sine and cosine cannot both be 1 at the same angle.', `Work out √(${a}² + ${b}²).`],
        commonMistakes: [`Answering ${shift + (asked === 'largest' ? a + b : -(a + b))}, which assumes sin θ and cos θ are both 1 (or both −1).`]
      };
    }
  },

  {
    id: 'trig-sec-plus-tan',
    version: 1,
    topicId: 'trigonometry',
    conceptId: 'trig-identities',
    difficulty: 'complex',
    type: 'single_choice',
    formulaIds: ['trig-sc-sec-tan', 'trig-pythag-f'],
    estimatedSeconds: 70,
    params(rng) {
      const [p, q, r] = rng.pick(TRIPLES);
      const [opp, adj] = rng.chance(0.5) ? [p, q] : [q, p];
      const asked = rng.pick(['tan', 'sin', 'cos']);
      return { opp, adj, hyp: r, asked };
    },
    answer: ({ opp, adj, hyp, asked }) => ({ tan: fraction(opp, adj), sin: fraction(opp, hyp), cos: fraction(adj, hyp) })[asked],
    distractors: ({ opp, adj, hyp }) =>
      [fraction(opp, adj), fraction(adj, opp), fraction(opp, hyp), fraction(adj, hyp), fraction(hyp, adj), fraction(hyp, opp)].map((value) => ({ value, why: 'a ratio of the same triangle' })),
    verify: ({ opp, adj, hyp, asked }, value) => {
      // From S = sec θ + tan θ alone: tan θ = (S² − 1) ÷ 2S, sec θ = (S² + 1) ÷ 2S.
      const S = (hyp + opp) / adj;
      const tan = (S * S - 1) / (2 * S);
      const sec = (S * S + 1) / (2 * S);
      const actual = { tan, cos: 1 / sec, sin: tan / sec }[asked];
      return nearlyEqual(actual, fractionValue(value), 1e-9);
    },
    render({ opp, adj, hyp, asked }) {
      const sum = fraction(hyp + opp, adj);
      const diff = fraction(adj, hyp + opp);
      const answerText = this.answer({ opp, adj, hyp, asked });
      return {
        question: `If sec θ + tan θ = ${sum} and θ is acute, what is ${asked} θ?`,
        explanation: `Because sec²θ − tan²θ = 1, sec θ − tan θ = 1 ÷ (${sum}) = ${diff}. Adding and subtracting: sec θ = ${fraction(hyp, adj)} and tan θ = ${fraction(opp, adj)}. The triangle has sides ${opp}, ${adj}, ${hyp}, so ${asked} θ = ${answerText}.`,
        solutionSteps: [`sec θ − tan θ = ${diff}.`, `sec θ = ${fraction(hyp, adj)}, tan θ = ${fraction(opp, adj)}.`, `${asked} θ = ${answerText}.`],
        method: 'sec θ − tan θ is the reciprocal of sec θ + tan θ.',
        hints: ['(sec θ + tan θ)(sec θ − tan θ) = 1.', 'Solve the two equations for sec θ and tan θ.'],
        commonMistakes: ['Treating the given sum as tan θ alone.']
      };
    }
  }
];
