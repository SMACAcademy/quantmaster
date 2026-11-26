/** Simulations for algebra. */

import { near, show } from './core.js';

const X_MIN = -10;
const X_MAX = 10;
const Y_MIN = -15;
const Y_MAX = 15;

function rootsOf(a, b, c) {
  if (a === 0) return b === 0 ? [] : [-c / b];
  const d = b * b - 4 * a * c;
  if (d < 0) return [];
  if (d === 0) return [-b / (2 * a)];
  const r = Math.sqrt(d);
  return [(-b - r) / (2 * a), (-b + r) / (2 * a)].sort((p, q) => p - q);
}

const signed = (value) => (value < 0 ? `− ${show(-value)}` : `+ ${show(value)}`);

export const quadraticRoots = {
  id: 'quadratic-roots',
  topicId: 'quadratic-equations',
  alsoTopicIds: ['quadratic-comparison'],
  title: 'Shape a parabola',
  summary: 'Change a, b and c and watch the roots, the vertex and the discriminant move together.',
  controls: [
    { id: 'a', label: 'a', type: 'range', min: -5, max: 5, step: 0.5, default: 1 },
    { id: 'b', label: 'b', type: 'range', min: -10, max: 10, step: 1, default: 2 },
    { id: 'c', label: 'c', type: 'range', min: -10, max: 10, step: 1, default: -3 }
  ],
  compute({ a, b, c }) {
    const f = (x) => a * x * x + b * x + c;
    const discriminant = b * b - 4 * a * c;
    const roots = rootsOf(a, b, c);
    const quadratic = a !== 0;
    const vertex = quadratic ? { x: -b / (2 * a), y: f(-b / (2 * a)) } : null;
    const points = Array.from({ length: 201 }, (_, i) => {
      const x = X_MIN + ((X_MAX - X_MIN) * i) / 200;
      return [x, f(x)];
    });
    const equation = `${show(a)}x² ${signed(b)}x ${signed(c)} = 0`;

    let nature;
    if (!quadratic) nature = b === 0 ? 'Not an equation in x' : 'a = 0: a straight line, one root';
    else if (discriminant > 0) nature = 'Two different real roots';
    else if (discriminant === 0) nature = 'One repeated root';
    else nature = 'No real roots';

    return {
      numbers: { discriminant, roots, vertex, sum: quadratic ? -b / a : null, product: quadratic ? c / a : null },
      readouts: [
        { label: 'Discriminant b² − 4ac', value: show(discriminant) },
        { label: nature, value: roots.length ? roots.map((r) => show(r, 3)).join(' and ') : '—' },
        { label: 'Sum of roots −b/a', value: quadratic ? show(-b / a, 3) : '—' },
        { label: 'Product of roots c/a', value: quadratic ? show(c / a, 3) : '—' },
        { label: 'Vertex', value: vertex ? `(${show(vertex.x, 2)}, ${show(vertex.y, 2)})` : '—' }
      ],
      plot: {
        kind: 'xy',
        x: { label: 'x', min: X_MIN, max: X_MAX },
        y: { label: 'y', min: Y_MIN, max: Y_MAX },
        series: [{ id: 'curve', label: `y = ${show(a)}x² ${signed(b)}x ${signed(c)}`, points, tone: 'algebra' }],
        guides: [
          { axis: 'y', value: 0, label: '' },
          { axis: 'x', value: 0, label: '' }
        ],
        markers: [
          ...roots.filter((r) => r >= X_MIN && r <= X_MAX).map((r) => ({ x: r, y: 0, label: `x = ${show(r, 2)}`, tone: 'geometry' })),
          ...(vertex && vertex.y >= Y_MIN && vertex.y <= Y_MAX && vertex.x >= X_MIN && vertex.x <= X_MAX
            ? [{ x: vertex.x, y: vertex.y, label: 'Vertex', tone: 'combinatorics' }]
            : [])
        ],
        summary: `${equation}: ${nature.toLowerCase()}${roots.length ? `, x = ${roots.map((r) => show(r, 3)).join(' and ')}` : ''}.`
      },
      insight: !quadratic
        ? 'With a = 0 the x² term disappears and the curve flattens into a line.'
        : discriminant > 0
          ? `The curve crosses the x-axis twice. The roots add to −b/a = ${show(-b / a, 3)} and multiply to c/a = ${show(c / a, 3)}.`
          : discriminant === 0
            ? 'The vertex sits exactly on the x-axis: the two roots have merged into one.'
            : `The whole curve stays ${a > 0 ? 'above' : 'below'} the x-axis, so there is no real root.`
    };
  },
  tasks: [
    {
      id: 'touch',
      prompt: 'Make the parabola touch the x-axis at exactly one point.',
      check: (values, n) => values.a !== 0 && n.discriminant === 0,
      solution: { a: 1, b: 4, c: 4 }
    },
    {
      id: 'none',
      prompt: 'Lift the curve so it has no real roots.',
      check: (values, n) => values.a !== 0 && n.discriminant < 0,
      solution: { a: 1, b: 0, c: 4 }
    },
    {
      id: 'two-three',
      prompt: 'Give it the roots 2 and 3.',
      check: (values, n) => values.a !== 0 && n.roots.length === 2 && near(n.roots[0], 2) && near(n.roots[1], 3),
      solution: { a: 1, b: -5, c: 6 }
    },
    {
      id: 'frown',
      prompt: 'Turn it upside down while keeping two real roots.',
      check: (values, n) => values.a < 0 && n.discriminant > 0,
      solution: { a: -1, b: 0, c: 4 }
    }
  ]
};
