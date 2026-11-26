/**
 * Simulations: Radians and a sin θ + b cos θ (trigonometry, Advanced unit).
 * Their meta.js entries keep this order.
 *
 * a sin θ + b cos θ is drawn as two arrows at right angles, a along the angle θ
 * and b a quarter-turn further on. They add to one arrow of length
 * √(a² + b²) that turns with θ; its height is the value. Below, the value is
 * plotted over a whole turn. The maths lives in utils/trigExtras.js.
 */

import { near, show } from './core.js';
import { RAD, amplitude, peakAngle, radianText, rotatingVector, waveValue } from '../utils/trigExtras.js';

/** "3 sin θ − 4 cos θ", leaving out a zero term and writing 1 and −1 as a bare sign. */
export function waveText(a, b) {
  const term = (k, name) => `${Math.abs(k) === 1 ? '' : `${Math.abs(k)} `}${name}`;
  if (!a && !b) return '0';
  if (!b) return `${a < 0 ? '−' : ''}${term(a, 'sin θ')}`;
  if (!a) return `${b < 0 ? '−' : ''}${term(b, 'cos θ')}`;
  return `${a < 0 ? '−' : ''}${term(a, 'sin θ')} ${b < 0 ? '−' : '+'} ${term(b, 'cos θ')}`;
}

const STEP = 5;
const ANGLES = Array.from({ length: 360 / STEP + 1 }, (_, i) => i * STEP);
const radians = (theta) => `${radianText(theta)}${theta % 180 ? ` ≈ ${show(theta * RAD, 3)}` : ''} rad`;

function axes(S) {
  return [
    { type: 'segment', from: [-1.15 * S, 0], to: [1.15 * S, 0], thin: true },
    { type: 'segment', from: [0, -1.15 * S], to: [0, 1.15 * S], thin: true }
  ];
}

const angleMark = (theta) => (theta % 360 ? [{ type: 'angle', at: [0, 0], from: 0, to: theta, tone: 'geometry', radius: 20 }] : []);

/** A point a little beyond the middle of a segment, away from the origin side, for its label. */
function besides(from, to, push) {
  const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  const length = Math.hypot(dx, dy) || 1;
  return [mid[0] - (dy / length) * push, mid[1] + (dx / length) * push];
}

function unitCircle(theta) {
  const s = Math.sin(theta * RAD);
  const c = Math.cos(theta * RAD);
  const P = [c, s];
  const foot = [c, 0];
  const picture = {
    kind: 'geometry',
    view: { xMin: -1.3, xMax: 1.3, yMin: -1.3, yMax: 1.3 },
    height: 320,
    items: [
      ...axes(1),
      { type: 'circle', center: [0, 0], r: 1, dashed: true },
      ...angleMark(theta),
      { type: 'segment', from: [0, 0], to: foot, tone: 'geometry' },
      { type: 'segment', from: foot, to: P, tone: 'algebra' },
      { type: 'segment', from: [0, 0], to: P, tone: 'advanced' },
      { type: 'point', at: P },
      { type: 'label', at: [c / 2, 0], text: 'cos θ', dy: s >= 0 ? 14 : -14, tone: 'geometry' },
      { type: 'label', at: [c, s / 2], text: 'sin θ', dx: c >= 0 ? 26 : -26, tone: 'algebra' },
      { type: 'label', at: P, text: 'P', dx: c >= 0 ? 12 : -12, dy: s >= 0 ? -12 : 12, strong: true }
    ],
    summary: `A unit circle with the point P at ${theta}°. Its height is sin θ = ${show(s, 3)} and its distance across is cos θ = ${show(c, 3)}.`
  };
  const graph = {
    kind: 'xy',
    x: { min: 0, max: 360, label: 'θ (degrees)' },
    y: { min: -1, max: 1, label: 'value' },
    series: [
      { id: 'sin', label: 'sin θ', tone: 'algebra', points: ANGLES.map((d) => [d, Math.sin(d * RAD)]) },
      { id: 'cos', label: 'cos θ', tone: 'geometry', points: ANGLES.map((d) => [d, Math.cos(d * RAD)]) }
    ],
    guides: [{ axis: 'x', value: theta, label: `θ = ${theta}°` }],
    markers: [
      { x: theta, y: s, tone: 'algebra' },
      { x: theta, y: c, tone: 'geometry' }
    ],
    summary: `The sine and cosine waves over 0° to 360°, with θ = ${theta}° marked: sin θ = ${show(s, 3)}, cos θ = ${show(c, 3)}. Both stay between −1 and 1.`
  };
  return { s, c, picture, graph };
}

function combination(a, b, theta) {
  const R = amplitude(a, b);
  const value = waveValue(a, b, theta);
  const peak = R ? peakAngle(a, b) : 0;
  const sum = Math.abs(a) + Math.abs(b);
  const { A, P } = rotatingVector(a, b, theta);
  const S = Math.max(R, 1);
  const name = waveText(a, b);
  const items = [
    ...axes(S),
    { type: 'circle', center: [0, 0], r: R, dashed: true },
    ...angleMark(theta),
    // The height of P, carried across to the right so it can be read against the wave below.
    { type: 'segment', from: P, to: [1.15 * S, P[1]], dashed: true, thin: true },
    ...(a ? [{ type: 'segment', from: [0, 0], to: A, tone: 'arithmetic' }] : []),
    ...(b ? [{ type: 'segment', from: A, to: P, tone: 'algebra' }] : []),
    ...(a && b ? [{ type: 'right', at: A, a: [0, 0], b: P }] : []),
    ...(R ? [{ type: 'segment', from: [0, 0], to: P, tone: 'advanced' }] : []),
    { type: 'point', at: P },
    ...(a ? [{ type: 'label', at: besides([0, 0], A, -0.09 * S), text: `a = ${show(a)}`, tone: 'arithmetic' }] : []),
    ...(b ? [{ type: 'label', at: besides(A, P, -0.09 * S), text: `b = ${show(b)}`, tone: 'algebra' }] : []),
    ...(a && b ? [{ type: 'label', at: besides([0, 0], P, 0.1 * S), text: `R = ${show(R, 2)}`, tone: 'advanced', strong: true }] : [])
  ];
  const picture = {
    kind: 'geometry',
    view: { xMin: -1.2 * S, xMax: 1.2 * S, yMin: -1.2 * S, yMax: 1.2 * S },
    height: 320,
    items,
    summary: R
      ? `Arrow a = ${show(a)} points along θ = ${theta}°, arrow b = ${show(b)} is at right angles to it, and together they make one arrow of length R = √(a² + b²) = ${show(R, 3)}. Its tip is at height ${show(value, 3)}, the value of ${name}.`
      : 'Both a and b are 0, so there is no arrow: the value is 0 for every θ.'
  };
  const Y = Math.max(sum, 1);
  const graph = {
    kind: 'xy',
    x: { min: 0, max: 360, label: 'θ (degrees)' },
    y: { min: -Y, max: Y, label: 'value' },
    series: [
      { id: 'wave', label: name, tone: 'advanced', points: ANGLES.map((d) => [d, waveValue(a, b, d)]) },
      ...(a && b
        ? [
            { id: 'sin', label: `${show(a)} sin θ`, tone: 'arithmetic', dashed: true, points: ANGLES.map((d) => [d, a * Math.sin(d * RAD)]) },
            { id: 'cos', label: `${show(b)} cos θ`, tone: 'algebra', dashed: true, points: ANGLES.map((d) => [d, b * Math.cos(d * RAD)]) }
          ]
        : [])
    ],
    guides: [
      ...(R ? [{ axis: 'y', value: R, label: `+R = ${show(R, 2)}` }, { axis: 'y', value: -R, label: `−R = −${show(R, 2)}` }] : []),
      ...(sum > R + 1e-9 ? [{ axis: 'y', value: sum, label: `|a| + |b| = ${show(sum)} is never reached` }] : []),
      ...(R ? [{ axis: 'x', value: peak, label: 'peak' }] : [])
    ],
    markers: [{ x: theta, y: value, tone: 'advanced', label: show(value, 2) }],
    summary: R
      ? `The graph of ${name} over 0° to 360°: a wave between −${show(R, 2)} and ${show(R, 2)}, peaking at θ = ${show(peak, 2)}°. At θ = ${theta}° it is ${show(value, 3)}.${sum > R + 1e-9 ? ` It never reaches |a| + |b| = ${show(sum)}.` : ''}`
      : `The graph of 0 over 0° to 360°: a flat line.`
  };
  return { R, value, peak, sum, A, P, picture, graph, name };
}

export const trigWave = {
  id: 'trig-wave',
  topicId: 'trigonometry',
  title: 'a sin θ + b cos θ as a rotating vector',
  summary: 'Two arrows at right angles add to one arrow of length √(a² + b²). Turn it: its height is a sin θ + b cos θ, and its peak is never a + b.',
  controls: [
    {
      id: 'mode',
      label: 'Show',
      type: 'choice',
      options: [
        { id: 'unit', label: 'Unit circle: sin θ and cos θ' },
        { id: 'combo', label: 'a sin θ + b cos θ' }
      ],
      default: 'combo'
    },
    { id: 'a', label: 'a (the sin θ coefficient)', type: 'range', min: -12, max: 12, step: 1, default: 3, showWhen: { mode: 'combo' } },
    { id: 'b', label: 'b (the cos θ coefficient)', type: 'range', min: -12, max: 12, step: 1, default: 4, showWhen: { mode: 'combo' } },
    { id: 'theta', label: 'Angle θ', type: 'range', min: 0, max: 360, step: STEP, default: 30, unit: '°' }
  ],
  compute({ mode, a, b, theta }) {
    const rad = theta * RAD;
    if (mode === 'unit') {
      const { s, c, picture, graph } = unitCircle(theta);
      return {
        numbers: { mode, theta, radians: rad, sin: s, cos: c, value: s, R: 1, peak: 90, sum: 2 },
        readouts: [
          { label: 'θ in radians', value: radians(theta) },
          { label: 'sin θ (the height of P)', value: show(s, 3) },
          { label: 'cos θ (the distance across)', value: show(c, 3) },
          { label: 'sin²θ + cos²θ', value: show(s * s + c * c, 3) }
        ],
        plot: { kind: 'stack', plots: [picture, graph], summary: `${picture.summary} ${graph.summary}` },
        insight: near(s, c, 1e-9)
          ? `At ${theta}° the point is on the line y = x, so sin θ = cos θ. sin θ + cos θ is then ${show(s + c, 3)}, the most (or least) it can be: ±√2, never 2.`
          : `P stays on a circle of radius 1, so sin²θ + cos²θ = 1 at every angle. A full turn is 360° = 2π radians; ${theta}° is ${radianText(theta)}.`
      };
    }
    const { R, value, peak, sum, picture, graph, name } = combination(a, b, theta);
    return {
      numbers: { mode, theta, radians: rad, a, b, R, value, peak, sum },
      readouts: [
        { label: `${name} at θ = ${theta}°`, value: show(value, 3) },
        { label: 'R = √(a² + b²), the length of the arrow', value: `√(${a * a} + ${b * b}) = ${show(R, 3)}` },
        { label: 'Greatest value, and where', value: R ? `${show(R, 3)} at θ = ${show(peak, 2)}°` : '0 everywhere' },
        { label: 'θ in radians', value: radians(theta) }
      ],
      plot: { kind: 'stack', plots: [picture, graph], summary: `${picture.summary} ${graph.summary}` },
      insight: !R
        ? 'With a = b = 0 there is nothing to turn: the value is 0 for every θ.'
        : !a || !b
          ? `With one term only, the arrow is a single bar of length ${show(R)}, and the peak is simply ${show(R)}.`
          : `The peak is √(${a * a} + ${b * b}) = ${show(R, 2)}, not |a| + |b| = ${show(sum)}: the arrows a and b are always at right angles, so they add like the two legs of a right triangle. The least value is −${show(R, 2)}.`
    };
  },
  tasks: [
    {
      id: 'equal-peak',
      prompt: 'Set a = 5 and b = 5, then turn θ to where 5 sin θ + 5 cos θ is greatest. Is the peak 10?',
      check: (values, n) => n.mode === 'combo' && values.a === 5 && values.b === 5 && near(n.value, n.R, 1e-9),
      solution: { mode: 'combo', a: 5, b: 5, theta: 45 }
    },
    {
      id: 'thirteen',
      prompt: 'With a and b both positive, make the greatest value exactly 13.',
      check: (values, n) => n.mode === 'combo' && values.a > 0 && values.b > 0 && near(n.R, 13, 1e-9),
      solution: { mode: 'combo', a: 5, b: 12 }
    },
    {
      id: 'least-cos',
      prompt: 'Set a = 0 and b = 6, and turn θ to where 6 cos θ is least. What is that angle in radians?',
      check: (values, n) => n.mode === 'combo' && values.a === 0 && values.b === 6 && near(n.value, -6, 1e-9),
      solution: { mode: 'combo', a: 0, b: 6, theta: 180 }
    },
    {
      id: 'unit-equal',
      prompt: 'On the unit circle, find the angle beyond 180° where sin θ and cos θ are equal.',
      check: (values, n) => n.mode === 'unit' && values.theta > 180 && near(n.sin, n.cos, 1e-9),
      solution: { mode: 'unit', theta: 225 }
    }
  ]
};

export const trigWaveSims = [trigWave];
