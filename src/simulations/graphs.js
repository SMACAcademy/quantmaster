/** Simulations for lines, inequalities, progressions and logarithms. */

import { near, niceRange, show } from './core.js';

const signed = (value) => (value < 0 ? `− ${show(-value)}` : `+ ${show(value)}`);

const line = (m, c) => {
  const slope = m === 0 ? '' : m === 1 ? 'x' : m === -1 ? '−x' : `${show(m)}x`;
  if (!slope) return `y = ${show(c)}`;
  return c === 0 ? `y = ${slope}` : `y = ${slope} ${signed(c)}`;
};

export const twoLines = {
  id: 'two-lines',
  topicId: 'simultaneous-equations',
  alsoTopicIds: ['linear-equations'],
  title: 'Two equations, two lines',
  summary: 'The solution of a pair of equations is where their lines cross, and parallel lines never do.',
  controls: [
    { id: 'm1', label: 'Line 1 slope', type: 'range', min: -4, max: 4, step: 0.5, default: 1 },
    { id: 'c1', label: 'Line 1 intercept', type: 'range', min: -8, max: 8, step: 1, default: 1 },
    { id: 'm2', label: 'Line 2 slope', type: 'range', min: -4, max: 4, step: 0.5, default: -1 },
    { id: 'c2', label: 'Line 2 intercept', type: 'range', min: -8, max: 8, step: 1, default: 7 }
  ],
  compute({ m1, c1, m2, c2 }) {
    const parallel = m1 === m2;
    const same = parallel && c1 === c2;
    const x = parallel ? null : (c2 - c1) / (m1 - m2);
    const y = parallel ? null : m1 * x + c1;
    const ends = (m, c) => [[-10, m * -10 + c], [10, m * 10 + c]];
    const outcome = same ? 'Infinitely many solutions' : parallel ? 'No solution' : `x = ${show(x, 3)}, y = ${show(y, 3)}`;
    return {
      numbers: { x, y, parallel, same },
      readouts: [
        { label: 'Line 1', value: line(m1, c1) },
        { label: 'Line 2', value: line(m2, c2) },
        { label: 'Solution', value: outcome }
      ],
      plot: {
        kind: 'xy',
        x: { label: 'x', min: -10, max: 10 },
        y: { label: 'y', min: -10, max: 10 },
        series: [
          { id: 'one', label: line(m1, c1), points: ends(m1, c1), tone: 'arithmetic' },
          { id: 'two', label: line(m2, c2), points: ends(m2, c2), tone: 'combinatorics', dashed: same }
        ],
        guides: [
          { axis: 'y', value: 0, label: '' },
          { axis: 'x', value: 0, label: '' }
        ],
        markers: parallel || Math.abs(x) > 10 || Math.abs(y) > 10 ? [] : [{ x, y, label: `(${show(x, 2)}, ${show(y, 2)})`, tone: 'geometry' }],
        summary: `${line(m1, c1)} and ${line(m2, c2)}: ${outcome.toLowerCase()}.`
      },
      insight: same
        ? 'Both equations describe the same line, so every point on it is a solution: a₁/a₂ = b₁/b₂ = c₁/c₂.'
        : parallel
          ? 'Equal slopes but different intercepts: the lines are parallel and never meet, so there is no solution.'
          : m1 * m2 === -1
            ? 'The slopes multiply to −1, so the lines cross at right angles.'
            : 'Different slopes always cross exactly once: one solution.'
    };
  },
  tasks: [
    {
      id: 'meet',
      prompt: 'Make the lines cross at the point (2, 3).',
      check: (values, n) => !n.parallel && near(n.x, 2) && near(n.y, 3),
      solution: { m1: 1, c1: 1, m2: -1, c2: 5 }
    },
    {
      id: 'parallel',
      prompt: 'Make a pair of equations with no solution.',
      check: (values, n) => n.parallel && !n.same,
      solution: { m1: 2, c1: 1, m2: 2, c2: -3 }
    },
    {
      id: 'same',
      prompt: 'Make a pair with infinitely many solutions.',
      check: (values, n) => n.same,
      solution: { m1: 1, c1: 1, m2: 1, c2: 1 }
    }
  ]
};

const SIGNS = { '<': (p, q) => p < q, '≤': (p, q) => p <= q, '>': (p, q) => p > q, '≥': (p, q) => p >= q };
const FLIP = { '<': '>', '≤': '≥', '>': '<', '≥': '≤' };

export const inequalityLine = {
  id: 'inequality-line',
  topicId: 'inequalities',
  title: 'Solve and shade an inequality',
  summary: 'Solve ax + b against c step by step, and watch the sign flip when you divide by a negative.',
  controls: [
    { id: 'a', label: 'a', type: 'range', min: -5, max: 5, step: 1, default: 2 },
    { id: 'b', label: 'b', type: 'range', min: -10, max: 10, step: 1, default: 3 },
    {
      id: 'sign',
      label: 'Sign',
      type: 'choice',
      options: Object.keys(SIGNS).map((id) => ({ id, label: id })),
      default: '<'
    },
    { id: 'c', label: 'c', type: 'range', min: -10, max: 10, step: 1, default: 9 }
  ],
  compute({ a, b, sign, c }) {
    const statement = `${show(a)}x ${signed(b)} ${sign} ${show(c)}`;
    if (a === 0) {
      const always = SIGNS[sign](b, c);
      return {
        numbers: { all: always, none: !always, boundary: null, finalSign: null },
        readouts: [
          { label: 'Inequality', value: statement },
          { label: 'With a = 0', value: `${show(b)} ${sign} ${show(c)} is ${always ? 'true' : 'false'}` },
          { label: 'Solution', value: always ? 'Every number' : 'No number' }
        ],
        plot: { kind: 'numberline', min: -10, max: 10, shade: always ? 'all' : 'none', summary: `${statement}: ${always ? 'every number is a solution' : 'no solution'}.` },
        insight: 'With a = 0 there is no x left: the statement is simply true or false for every x.'
      };
    }
    const right = c - b;
    const boundary = right / a;
    const finalSign = a < 0 ? FLIP[sign] : sign;
    const closed = finalSign === '≤' || finalSign === '≥';
    const shade = finalSign === '<' || finalSign === '≤' ? 'left' : 'right';
    return {
      numbers: { all: false, none: false, boundary, finalSign },
      readouts: [
        { label: 'Inequality', value: statement },
        { label: b >= 0 ? `Take ${show(b)} from both sides` : `Add ${show(-b)} to both sides`, value: `${show(a)}x ${sign} ${show(right)}` },
        { label: `Divide by ${show(a)}${a < 0 ? ' (negative: flip the sign)' : ''}`, value: `x ${finalSign} ${show(boundary, 3)}` }
      ],
      plot: {
        kind: 'numberline',
        min: -10,
        max: 10,
        boundary,
        closed,
        shade,
        label: `x ${finalSign} ${show(boundary, 3)}`,
        summary: `${statement} gives x ${finalSign} ${show(boundary, 3)}.`
      },
      insight:
        a < 0
          ? `Dividing by a negative number reverses the order of the number line, so ${sign} becomes ${finalSign}.`
          : closed
            ? 'A filled dot: the boundary itself is included.'
            : 'An open dot: the boundary itself is not a solution.'
    };
  },
  tasks: [
    {
      id: 'flip',
      prompt: 'Using a negative a, end up with the solution x > 2.',
      check: (values, n) => values.a < 0 && n.finalSign === '>' && near(n.boundary, 2),
      solution: { a: -2, b: 0, sign: '<', c: -4 }
    },
    {
      id: 'closed',
      prompt: 'End up with x ≤ −1, boundary included.',
      check: (values, n) => n.finalSign === '≤' && near(n.boundary, -1),
      solution: { a: 1, b: 2, sign: '≤', c: 1 }
    },
    {
      id: 'everything',
      prompt: 'Make every number a solution.',
      check: (values, n) => n.all === true,
      solution: { a: 0, b: 0, sign: '<', c: 5 }
    }
  ]
};

export const apVsGp = {
  id: 'ap-vs-gp',
  topicId: 'geometric-progression',
  title: 'Adding vs multiplying',
  summary: 'An AP adds the same amount each time; a GP multiplies. Watch which one wins, and how a GP with r < 1 settles.',
  controls: [
    { id: 'first', label: 'First term (both)', type: 'range', min: 1, max: 10, step: 1, default: 2 },
    { id: 'd', label: 'AP: common difference d', type: 'range', min: 0, max: 10, step: 1, default: 3 },
    { id: 'r', label: 'GP: common ratio r', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1.5 },
    { id: 'n', label: 'Number of terms', type: 'range', min: 2, max: 15, step: 1, default: 8 }
  ],
  compute({ first: a, d, r, n }) {
    const ap = Array.from({ length: n }, (_, i) => a + i * d);
    const gp = Array.from({ length: n }, (_, i) => a * r ** i);
    const apSum = (n / 2) * (2 * a + (n - 1) * d);
    const gpSum = near(r, 1) ? n * a : (a * (r ** n - 1)) / (r - 1);
    const infinite = r < 1 ? a / (1 - r) : null;
    const overtake = gp.findIndex((g, i) => i > 0 && g > ap[i]);
    const yMax = Math.max(...ap, ...gp);
    return {
      numbers: { ap, gp, apSum, gpSum, infinite, overtakeAt: overtake > 0 ? overtake + 1 : null },
      readouts: [
        { label: `AP term ${n}: a + (n − 1)d`, value: show(ap[n - 1], 2) },
        { label: `GP term ${n}: a·r^(n − 1)`, value: show(gp[n - 1], 2) },
        { label: 'AP sum', value: show(apSum, 2) },
        { label: 'GP sum', value: show(gpSum, 2) },
        { label: 'GP sum to infinity a ÷ (1 − r)', value: infinite === null ? 'Only when r < 1' : show(infinite, 3) }
      ],
      plot: {
        kind: 'xy',
        x: { label: 'Term number', min: 1, max: n },
        y: { label: 'Term value', min: 0, max: niceRange(0, yMax).max },
        series: [
          { id: 'ap', label: `AP (+${show(d)})`, points: ap.map((t, i) => [i + 1, t]), tone: 'arithmetic' },
          { id: 'gp', label: `GP (×${show(r)})`, points: gp.map((t, i) => [i + 1, t]), tone: 'algebra' }
        ],
        guides: infinite !== null ? [{ axis: 'y', value: infinite, label: `GP sum to infinity ${show(infinite, 2)}` }] : [],
        markers: overtake > 0 ? [{ x: overtake + 1, y: gp[overtake], label: 'GP pulls ahead', tone: 'combinatorics' }] : [],
        summary: `AP from ${a} adding ${d}, and GP from ${a} multiplying by ${show(r)}, over ${n} terms.`
      },
      insight:
        r < 1
          ? `With r < 1 each GP term is smaller than the last, so the sum creeps towards ${show(infinite, 3)} but never passes it.`
          : r > 1 && overtake > 0
            ? `Multiplying beats adding in the end: the GP overtakes at term ${overtake + 1}.`
            : r > 1
              ? 'Multiplying always beats adding eventually: add more terms and the GP will overtake.'
              : 'With r = 1 every GP term is the same.'
    };
  },
  tasks: [
    {
      id: 'overtake',
      prompt: 'Make the GP overtake the AP within the first 6 terms.',
      check: (values, n) => n.overtakeAt !== null && n.overtakeAt <= 6,
      solution: { r: 2, d: 3 }
    },
    {
      id: 'settle',
      prompt: 'Pick r below 1 and get the GP sum within 1% of its sum to infinity.',
      check: (values, n) => n.infinite !== null && n.gpSum >= 0.99 * n.infinite,
      solution: { r: 0.5, n: 8 }
    }
  ]
};

export const apPairing = {
  id: 'ap-pairing',
  topicId: 'arithmetic-progression',
  title: 'Why an AP sum is n(first + last) ÷ 2',
  summary: 'Stack the series on itself reversed: every column is first + last, so the sum is half of n columns.',
  controls: [
    { id: 'first', label: 'First term a', type: 'range', min: 1, max: 10, step: 1, default: 1 },
    { id: 'd', label: 'Common difference d', type: 'range', min: 1, max: 5, step: 1, default: 1 },
    { id: 'n', label: 'Number of terms n', type: 'range', min: 2, max: 12, step: 1, default: 6 }
  ],
  compute({ first: a, d, n }) {
    const terms = Array.from({ length: n }, (_, i) => a + i * d);
    const last = terms[n - 1];
    const pair = a + last;
    const sum = (n * pair) / 2;
    return {
      numbers: { last, pair, sum },
      readouts: [
        { label: 'Last term a + (n − 1)d', value: show(last) },
        { label: 'Every column: first + last', value: show(pair) },
        { label: 'Sum = n × (first + last) ÷ 2', value: `${n} × ${show(pair)} ÷ 2 = ${show(sum)}` }
      ],
      plot: {
        kind: 'bars',
        y: { label: 'Value', min: 0, max: niceRange(0, pair).max },
        bars: terms.map((term, i) => ({
          label: String(i + 1),
          value: term,
          tone: 'arithmetic',
          stack: { value: terms[n - 1 - i], tone: 'algebra' }
        })),
        baseline: pair,
        legend: [
          { label: 'The series', tone: 'arithmetic' },
          { label: 'The same series reversed', tone: 'algebra' }
        ],
        summary: `${terms.join(' + ')} = ${show(sum)}: each of the ${n} columns adds to ${show(pair)}.`
      },
      insight: `Each column is ${show(pair)} tall, and the two copies fill ${n} columns, so one copy is ${n} × ${show(pair)} ÷ 2 = ${show(sum)}.`
    };
  },
  tasks: [
    {
      id: 'gauss',
      prompt: 'Show that 1 + 2 + … + 10 = 55.',
      check: (values, n) => values.first === 1 && values.d === 1 && values.n === 10 && n.sum === 55,
      solution: { first: 1, d: 1, n: 10 }
    },
    {
      id: 'odd',
      prompt: 'Add the first 8 odd numbers. What do you notice about the total?',
      check: (values, n) => values.first === 1 && values.d === 2 && values.n === 8 && n.sum === 64,
      solution: { first: 1, d: 2, n: 8 }
    },
    {
      id: 'twenty',
      prompt: 'Make every column add up to exactly 20.',
      check: (values, n) => n.pair === 20,
      solution: { first: 2, d: 2, n: 9 }
    }
  ]
};

export const logCurves = {
  id: 'log-curves',
  topicId: 'logarithms',
  title: 'Powers and logarithms are mirror images',
  summary: 'y = bˣ and y = log_b x reflect in the line y = x. A logarithm answers "what power?".',
  controls: [
    { id: 'base', label: 'Base b', type: 'range', min: 0.5, max: 5, step: 0.5, default: 2 },
    { id: 'x', label: 'x', type: 'range', min: 0.5, max: 16, step: 0.5, default: 4 }
  ],
  compute({ base: b, x }) {
    if (b === 1) {
      return {
        numbers: { log: null, valid: false },
        readouts: [{ label: 'Base 1', value: 'Not allowed: 1 to any power is 1' }],
        plot: {
          kind: 'xy',
          x: { label: 'x', min: -4, max: 8 },
          y: { label: 'y', min: -4, max: 8 },
          series: [{ id: 'flat', label: 'y = 1ˣ = 1', points: [[-4, 1], [8, 1]], tone: 'algebra' }],
          summary: 'With base 1 every power equals 1, so no logarithm exists.'
        },
        insight: 'A base of 1 cannot reach any number but 1, which is why logarithm bases must not be 1.'
      };
    }
    const log = Math.log(x) / Math.log(b);
    // Far outside the picture, so steep parts run off the edge instead of flattening against it.
    const clampY = (y) => Math.max(-100, Math.min(100, y));
    const power = Array.from({ length: 121 }, (_, i) => {
      const t = -4 + (12 * i) / 120;
      return [t, clampY(b ** t)];
    });
    const logs = Array.from({ length: 160 }, (_, i) => {
      const t = 0.05 + (7.95 * i) / 159;
      return [t, clampY(Math.log(t) / Math.log(b))];
    });
    const inView = (px, py) => px >= -4 && px <= 8 && py >= -4 && py <= 8;
    return {
      numbers: { log, valid: true },
      readouts: [
        { label: `log_${show(b)} ${show(x)}`, value: show(log, 4) },
        { label: 'Check: b to that power', value: `${show(b)}^${show(log, 4)} = ${show(b ** log, 4)}` },
        { label: 'Curves pass through', value: '(0, 1) for bˣ, (1, 0) for the log' }
      ],
      plot: {
        kind: 'xy',
        x: { label: 'x', min: -4, max: 8 },
        y: { label: 'y', min: -4, max: 8 },
        series: [
          { id: 'power', label: `y = ${show(b)}ˣ`, points: power, tone: 'algebra' },
          { id: 'log', label: `y = log_${show(b)} x`, points: logs, tone: 'arithmetic' },
          { id: 'mirror', label: 'y = x (the mirror)', points: [[-4, -4], [8, 8]], tone: 'data', dashed: true }
        ],
        markers: [
          ...(inView(x, log) ? [{ x, y: log, label: `(${show(x)}, ${show(log, 2)})`, tone: 'arithmetic' }] : []),
          ...(inView(log, x) ? [{ x: log, y: x, label: `(${show(log, 2)}, ${show(x)})`, tone: 'algebra' }] : [])
        ],
        summary: `log base ${show(b)} of ${show(x)} is ${show(log, 4)}.`
      },
      insight:
        b < 1
          ? 'With a base below 1 the power curve falls, and so does the log curve: logs of numbers above 1 are negative.'
          : x < 1
            ? 'For x between 0 and 1 the logarithm is negative: you need a negative power to make a fraction.'
            : `log_${show(b)} ${show(x)} = ${show(log, 4)} means ${show(b)} raised to ${show(log, 4)} gives ${show(x)}.`
    };
  },
  tasks: [
    {
      id: 'three',
      prompt: 'With x = 8, find the base that makes the logarithm exactly 3.',
      check: (values, n) => n.valid && values.x === 8 && near(n.log, 3),
      solution: { base: 2, x: 8 }
    },
    {
      id: 'half',
      prompt: 'Make the logarithm exactly one half.',
      check: (values, n) => n.valid && near(n.log, 0.5),
      solution: { base: 4, x: 2 }
    },
    {
      id: 'negative',
      prompt: 'With a base above 1, make the logarithm negative.',
      check: (values, n) => n.valid && values.base > 1 && n.log < 0,
      solution: { base: 2, x: 0.5 }
    }
  ]
};
