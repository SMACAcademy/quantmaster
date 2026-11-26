/** Simulations for identities, coordinate geometry, functions, sets, counting and sequences (Phase F). */

import { gcd, near, show } from './core.js';

/* ------------------------------- helpers ------------------------------- */

const MINUS = '−';
const signed = (value) => (value < 0 ? `${MINUS} ${show(-value)}` : `+ ${show(value)}`);
const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const SUBSCRIPT = '₀₁₂₃₄₅₆₇₈₉';
const sup = (n) => String(n).replace(/\d/g, (d) => SUPERSCRIPT[d]);
const sub = (n) => String(n).replace(/\d/g, (d) => SUBSCRIPT[d]);

/**
 * The drawing area of a `rects` plot is 500 × 282 pixels (simPlots.js), and a
 * piece is labelled only where its text fits. These pick the longest label
 * that will show, and place notes a fixed number of pixels outside a shape.
 */
const RECT_AREA = { width: 500, height: 282 };
const pixelsPerUnit = (width, height) => Math.min(RECT_AREA.width / width, RECT_AREA.height / height);
const fits = (text, w, h, px) => w * px >= 7 * text.length + 6 && h * px >= 18;
const bestLabel = (w, h, px, options) => options.find((text) => fits(text, w, h, px)) || options[options.length - 1];

/** A reduced fraction p/q as text: "3/5", "−2", "1/2". */
function fractionText(p, q) {
  if (q === 0) return '—';
  const divisor = gcd(p, q) || 1;
  let top = p / divisor;
  let bottom = q / divisor;
  if (bottom < 0) {
    top = -top;
    bottom = -bottom;
  }
  const sign = top < 0 ? MINUS : '';
  return bottom === 1 ? `${sign}${Math.abs(top)}` : `${sign}${Math.abs(top)}/${bottom}`;
}

/** √n in simplest form: 5, 2√2, √34. */
function surdText(n) {
  if (n === 0) return '0';
  let outside = 1;
  let inside = n;
  for (let f = 2; f * f <= inside; f++) {
    while (inside % (f * f) === 0) {
      outside *= f;
      inside /= f * f;
    }
  }
  if (inside === 1) return show(outside);
  return `${outside === 1 ? '' : outside}√${inside}`;
}

/* --------------------------- (a ± b)² by area --------------------------- */

export const identityArea = {
  id: 'identity-area',
  topicId: 'algebraic-identities',
  title: 'Identities you can see',
  summary: 'Cut a square into pieces and the identities appear: (a + b)², (a − b)² and a² − b² as areas.',
  controls: [
    {
      id: 'mode',
      label: 'Identity',
      type: 'choice',
      options: [
        { id: 'sum', label: '(a + b)²' },
        { id: 'difference', label: '(a − b)²' },
        { id: 'squares', label: 'a² − b²' }
      ],
      default: 'sum'
    },
    { id: 'a', label: 'a', type: 'range', min: 1, max: 12, step: 1, default: 5 },
    { id: 'b', label: 'b', type: 'range', min: 1, max: 12, step: 1, default: 3 }
  ],
  compute({ mode, a, b }) {
    const a2 = a * a;
    const b2 = b * b;
    const ab = a * b;
    const numbers = { mode, a2, b2, ab, sumSquare: (a + b) ** 2, diffSquare: (a - b) ** 2, diffOfSquares: a2 - b2, product: (a + b) * (a - b), pictured: true };

    if (mode === 'sum') {
      const T = a + b;
      const px = pixelsPerUnit(T, T);
      const piece = (x, y, w, h, names, tone) => ({ x, y, w, h, tone, label: bestLabel(w, h, px, names) });
      const left = -14 / px;
      const below = T + 22 / px;
      return {
        numbers,
        readouts: [
          { label: '(a + b)²', value: `${show(T)}² = ${show(T * T)}` },
          { label: 'a² + 2ab + b²', value: `${show(a2)} + ${show(2 * ab)} + ${show(b2)} = ${show(a2 + 2 * ab + b2)}` },
          { label: 'Forgetting 2ab gives', value: `${show(a2 + b2)}, short by ${show(2 * ab)}` }
        ],
        plot: {
          kind: 'rects',
          width: T,
          height: T,
          rects: [
            piece(0, 0, a, a, [`a² = ${show(a2)}`, 'a²'], 'algebra'),
            piece(a, 0, b, a, [`ab = ${show(ab)}`, 'ab'], 'combinatorics'),
            piece(0, a, a, b, [`ab = ${show(ab)}`, 'ab'], 'combinatorics'),
            piece(a, a, b, b, [`b² = ${show(b2)}`, 'b²'], 'geometry')
          ],
          notes: [
            { x: left, y: a / 2, text: `a = ${a}`, anchor: 'end' },
            { x: left, y: a + b / 2, text: `b = ${b}`, anchor: 'end' },
            { x: a / 2, y: below, text: `a = ${a}` },
            { x: a + b / 2, y: below, text: `b = ${b}` }
          ],
          summary: `A square of side ${T} cut into a² = ${a2}, two rectangles ab = ${ab} and b² = ${b2}: ${a2} + ${2 * ab} + ${b2} = ${T * T}.`
        },
        insight:
          a === b
            ? 'With a = b the two ab rectangles are exactly as big as a² and b² together. That is the only time 2ab = a² + b².'
            : `The two ab rectangles are the 2ab that "(a + b)² = a² + b²" forgets: here ${show(2 * ab)} of the ${show(T * T)}.`
      };
    }

    if (a <= b) {
      // The pictures for (a − b)² and a² − b² cut b out of a, so they need a > b.
      const W = a + 1 + b;
      const px = pixelsPerUnit(W, Math.max(a, b));
      return {
        numbers: { ...numbers, pictured: false },
        readouts:
          mode === 'difference'
            ? [
                { label: '(a − b)²', value: `${show(a - b)}² = ${show((a - b) ** 2)}` },
                { label: 'a² − 2ab + b²', value: `${show(a2)} − ${show(2 * ab)} + ${show(b2)} = ${show(a2 - 2 * ab + b2)}` }
              ]
            : [
                { label: 'a² − b²', value: `${show(a2)} − ${show(b2)} = ${show(a2 - b2)}` },
                { label: '(a + b)(a − b)', value: `${show(a + b)} × ${show(a - b)} = ${show((a + b) * (a - b))}` }
              ],
        plot: {
          kind: 'rects',
          width: W,
          height: Math.max(a, b),
          rects: [
            { x: 0, y: 0, w: a, h: a, tone: 'algebra', faint: true, label: bestLabel(a, a, px, [`a² = ${show(a2)}`, 'a²']) },
            { x: a + 1, y: 0, w: b, h: b, tone: 'geometry', faint: true, label: bestLabel(b, b, px, [`b² = ${show(b2)}`, 'b²']) }
          ],
          notes: [],
          summary: `a = ${a} is not bigger than b = ${b}, so b cannot be cut out of a: the two squares are shown side by side.`
        },
        insight: 'This picture cuts b out of a, so it needs a bigger than b. Slide b below a. (The identity itself still holds: check the readouts.)'
      };
    }

    const c = a - b;
    if (mode === 'difference') {
      const px = pixelsPerUnit(a, a);
      const left = -14 / px;
      return {
        numbers,
        readouts: [
          { label: '(a − b)²', value: `${show(c)}² = ${show(c * c)}` },
          { label: 'a² − 2ab + b²', value: `${show(a2)} − ${show(2 * ab)} + ${show(b2)} = ${show(a2 - 2 * ab + b2)}` },
          { label: 'The two strips, 2ab', value: `${show(2 * ab)}: the L of ${show(a2 - c * c)} plus the corner ${show(b2)} again` }
        ],
        plot: {
          kind: 'rects',
          width: a,
          height: a,
          rects: [
            // The two a × b strips cut from a² overlap in the b² corner.
            { x: c, y: 0, w: b, h: a, tone: 'combinatorics', dashed: true, faint: true },
            { x: 0, y: c, w: a, h: b, tone: 'combinatorics', dashed: true, faint: true },
            { x: 0, y: 0, w: c, h: c, tone: 'algebra', label: bestLabel(c, c, px, [`(a − b)² = ${show(c * c)}`, '(a − b)²', `${show(c * c)}`]) },
            { x: c, y: c, w: b, h: b, tone: 'geometry', label: bestLabel(b, b, px, [`b² = ${show(b2)}`, 'b²']) }
          ],
          notes: [
            { x: left, y: c / 2, text: `a − b = ${c}`, anchor: 'end' },
            { x: left, y: c + b / 2, text: `b = ${b}`, anchor: 'end' },
            { x: a + 10 / px, y: c / 2, text: `ab strip`, anchor: 'start' },
            { x: a / 2, y: a + 22 / px, text: `ab strip` }
          ],
          summary: `A square a² = ${a2} with two a × b strips (${ab} each) cut off; they overlap in the b² = ${b2} corner, leaving (a − b)² = ${c * c}.`
        },
        insight: 'Cut two a × b strips off a²: the b² corner is cut away twice, so add it back once. That is (a − b)² = a² − 2ab + b².'
      };
    }

    // a² − b²: cut b² from a corner of a², then move the lower piece beside the upper one.
    const gap = 1 + 0.1 * a;
    const X = a + gap;
    const W = X + a + b;
    const px = pixelsPerUnit(W, a);
    const below = (y) => y + 22 / px;
    const top = (x) => ({ x, y: 0, w: a, h: c, tone: 'algebra', label: bestLabel(a, c, px, [`a(a − b) = ${show(a * c)}`, `${show(a * c)}`]) });
    const moved = (x, y, w, h) => ({ x, y, w, h, tone: 'combinatorics', label: bestLabel(w, h, px, [`b(a − b) = ${show(b * c)}`, `${show(b * c)}`]) });
    return {
      numbers,
      readouts: [
        { label: 'a² − b²', value: `${show(a2)} − ${show(b2)} = ${show(a2 - b2)}` },
        { label: '(a + b)(a − b)', value: `${show(a + b)} × ${show(c)} = ${show((a + b) * c)}` },
        { label: 'The new rectangle', value: `${show(a + b)} wide, ${show(c)} tall` }
      ],
      plot: {
        kind: 'rects',
        width: W,
        height: a,
        rects: [
          top(0),
          moved(0, c, c, b),
          { x: c, y: c, w: b, h: b, tone: 'geometry', dashed: true, faint: true, label: bestLabel(b, b, px, ['b² cut out', 'b²']) },
          top(X),
          moved(X + a, 0, b, c)
        ],
        notes: [
          { x: a / 2, y: below(a), text: 'a² − b²' },
          { x: X + (a + b) / 2, y: below(c), text: '(a + b)(a − b)' }
        ],
        summary: `a² − b² = ${a2} − ${b2}: the L-shape left after cutting b² from a² rearranges into a ${a + b} by ${c} rectangle, area ${(a + b) * c}.`
      },
      insight: 'Cut b² from a corner of a², then swing the lower piece round beside the upper one: the L becomes an (a + b) × (a − b) rectangle.'
    };
  },
  tasks: [
    {
      id: 'hundred',
      prompt: 'Make (a + b)² equal 100 with a and b different.',
      check: (values, n) => n.mode === 'sum' && n.sumSquare === 100 && values.a !== values.b,
      solution: { mode: 'sum', a: 7, b: 3 }
    },
    {
      id: 'balance',
      prompt: 'Make the two ab rectangles together exactly as big as a² and b² together.',
      check: (values, n) => n.mode === 'sum' && 2 * n.ab === n.a2 + n.b2,
      solution: { mode: 'sum', a: 4, b: 4 }
    },
    {
      id: 'tiny',
      prompt: 'In the (a − b)² picture, leave a square of area exactly 1 while a² is more than 50.',
      check: (values, n) => n.mode === 'difference' && n.pictured && n.diffSquare === 1 && n.a2 > 50,
      solution: { mode: 'difference', a: 8, b: 7 }
    },
    {
      id: 'thirty-three',
      prompt: 'Rearrange a² − b² into a rectangle of area 33.',
      check: (values, n) => n.mode === 'squares' && n.pictured && n.diffOfSquares === 33,
      solution: { mode: 'squares', a: 7, b: 4 }
    }
  ]
};

/* ---------------------------- a line from two points ---------------------------- */

/** "3x − 5y + 1 = 0" from integer coefficients, reduced and with a positive lead. */
function generalForm(A, B, C) {
  const divisor = gcd(gcd(A, B), C) || 1;
  let [p, q, r] = [A / divisor, B / divisor, C / divisor];
  if (p < 0 || (p === 0 && q < 0)) [p, q, r] = [-p, -q, -r];
  const term = (coef, name, first) => {
    if (coef === 0) return '';
    const size = Math.abs(coef) === 1 && name ? '' : String(Math.abs(coef));
    if (first) return `${coef < 0 ? MINUS : ''}${size}${name}`;
    return ` ${coef < 0 ? MINUS : '+'} ${size}${name}`;
  };
  const xy = `${term(p, 'x', true)}${term(q, 'y', p === 0)}`;
  return `${xy}${term(r, '', false)} = 0`;
}

export const lineExplorer = {
  id: 'line-explorer',
  topicId: 'coordinate-geometry',
  title: 'A line through two points',
  summary: 'Move A and B and watch the slope, the equation, the distance AB and the midpoint change together.',
  controls: [
    { id: 'x1', label: 'A: x', type: 'range', min: -8, max: 8, step: 1, default: -2 },
    { id: 'y1', label: 'A: y', type: 'range', min: -8, max: 8, step: 1, default: -1 },
    { id: 'x2', label: 'B: x', type: 'range', min: -8, max: 8, step: 1, default: 3 },
    { id: 'y2', label: 'B: y', type: 'range', min: -8, max: 8, step: 1, default: 2 }
  ],
  compute({ x1, y1, x2, y2 }) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const samePoint = dx === 0 && dy === 0;
    const vertical = dx === 0 && !samePoint;
    const horizontal = dy === 0 && !samePoint;
    const distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);
    const midpoint = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    const slope = samePoint || vertical ? null : dy / dx;
    // c = y₁ − m·x₁ = (y₁·dx − dy·x₁) / dx, kept as a fraction so it shows exactly.
    const interceptTop = y1 * dx - dy * x1;
    const intercept = slope === null ? null : interceptTop / dx;

    let equation;
    if (samePoint) equation = '—';
    else if (vertical) equation = `x = ${show(x1)}`;
    else {
      const m = fractionText(dy, dx);
      const mx = dy === 0 ? '' : m === '1' ? 'x' : m === `${MINUS}1` ? `${MINUS}x` : m.includes('/') ? `(${m})x` : `${m}x`;
      const cText = fractionText(interceptTop, dx);
      if (!mx) equation = `y = ${cText}`;
      else if (interceptTop === 0) equation = `y = ${mx}`;
      else equation = `y = ${mx} ${interceptTop * Math.sign(dx) < 0 ? MINUS : '+'} ${cText.replace(MINUS, '')}`;
    }
    const general = samePoint ? '—' : generalForm(dy, -dx, dx * y1 - dy * x1);
    const distanceText = `√(${show(dx * dx)} + ${show(dy * dy)}) = ${surdText(distanceSquared)}${Number.isInteger(distance) ? '' : ` ≈ ${show(distance, 2)}`}`;
    const point = (x, y) => `(${show(x)}, ${show(y)})`;

    // Drawn well past the visible grid (the plot clips it), since equal units widen the x-axis.
    const ends = vertical
      ? [[x1, -30], [x1, 30]]
      : slope === null
        ? []
        : [[-30, slope * -30 + intercept], [30, slope * 30 + intercept]];
    const series = [];
    if (ends.length) series.push({ id: 'line', label: equation, points: ends, tone: 'algebra' });
    if (!samePoint && !vertical && !horizontal) {
      series.push({ id: 'run', label: `${dx > 0 ? 'Right' : 'Left'} ${show(Math.abs(dx))}, ${dy > 0 ? 'up' : 'down'} ${show(Math.abs(dy))}`, points: [[x1, y1], [x2, y1], [x2, y2]], tone: 'data', dashed: true });
    }
    series.push({ id: 'ab', label: `AB = ${surdText(distanceSquared)}`, points: [[x1, y1], [x2, y2]], tone: 'combinatorics' });

    return {
      numbers: { dx, dy, samePoint, vertical, horizontal, slope, intercept, distance, distanceSquared, midpoint },
      readouts: [
        { label: 'Slope m = (y₂ − y₁) ÷ (x₂ − x₁)', value: samePoint ? 'No line: A and B are the same point' : vertical ? `${show(dy)} ÷ 0: not defined (vertical)` : `${show(dy)} ÷ ${show(dx)} = ${fractionText(dy, dx)}` },
        { label: 'y-intercept c', value: intercept === null ? (vertical ? 'None: the line never crosses the y-axis' : '—') : fractionText(interceptTop, dx) },
        { label: 'Equation', value: samePoint ? '—' : `${equation}, or ${general}` },
        { label: 'Distance AB', value: distanceText },
        { label: 'Midpoint', value: `${point(midpoint.x, midpoint.y)}` }
      ],
      plot: {
        kind: 'xy',
        // Graph-paper units: the same length on both axes, so slopes look as steep as they are.
        equalUnits: true,
        x: { label: 'x', min: -10, max: 10 },
        y: { label: 'y', min: -10, max: 10 },
        series,
        guides: [
          { axis: 'y', value: 0, label: '' },
          { axis: 'x', value: 0, label: '' }
        ],
        markers: [
          { x: x1, y: y1, label: 'A', tone: 'combinatorics' },
          ...(samePoint ? [] : [{ x: x2, y: y2, label: 'B', tone: 'combinatorics' }]),
          ...(samePoint ? [] : [{ x: midpoint.x, y: midpoint.y, label: 'M', tone: 'geometry' }])
        ],
        summary: samePoint
          ? `A and B are both at ${point(x1, y1)}, so they do not fix a line.`
          : `The line through A${point(x1, y1)} and B${point(x2, y2)} is ${equation}; AB = ${surdText(distanceSquared)} and the midpoint is ${point(midpoint.x, midpoint.y)}.`
      },
      insight: samePoint
        ? 'One point is not enough: infinitely many lines pass through it. Move B away from A.'
        : vertical
          ? 'Same x for both points: the run is 0, and you cannot divide by 0, so a vertical line has no slope. Its equation is just x = constant.'
          : horizontal
            ? 'Same y for both points: the rise is 0, so the slope is 0 and the line is y = constant.'
            : `Slope is rise over run: up ${show(dy)} for ${show(dx)} across. The distance is Pythagoras on that same triangle, √(${show(dx * dx)} + ${show(dy * dy)}).`
    };
  },
  tasks: [
    {
      id: 'flat',
      prompt: 'Make the line horizontal.',
      check: (values, n) => n.horizontal,
      solution: { x1: -2, y1: -1, x2: 3, y2: -1 }
    },
    {
      id: 'five',
      prompt: 'Make AB exactly 5 with the line neither horizontal nor vertical.',
      check: (values, n) => !n.samePoint && !n.horizontal && !n.vertical && n.distanceSquared === 25,
      solution: { x1: -2, y1: -1, x2: 1, y2: 3 }
    },
    {
      id: 'two-x-plus-one',
      prompt: 'Draw the line y = 2x + 1.',
      check: (values, n) => n.slope !== null && near(n.slope, 2) && near(n.intercept, 1),
      solution: { x1: 0, y1: 1, x2: 2, y2: 5 }
    },
    {
      id: 'origin',
      prompt: 'Put the midpoint of AB at the origin, with the line sloping downwards.',
      check: (values, n) => n.midpoint.x === 0 && n.midpoint.y === 0 && n.slope !== null && n.slope < 0,
      solution: { x1: -3, y1: 2, x2: 3, y2: -2 }
    }
  ]
};

/* ---------------------------- shifting a graph ---------------------------- */

const BASES = {
  square: { label: 'x²', at: (x) => x * x, from: -Infinity, key: 'Vertex' },
  abs: { label: '|x|', at: (x) => Math.abs(x), from: -Infinity, key: 'Corner' },
  sqrt: { label: '√x', at: (x) => Math.sqrt(x), from: 0, key: 'Starting point' }
};

function shiftedFormula(base, a, h, k) {
  const inner = h === 0 ? 'x' : `x ${h > 0 ? MINUS : '+'} ${show(Math.abs(h))}`;
  const f = base === 'square' ? (h === 0 ? 'x²' : `(${inner})²`) : base === 'abs' ? `|${inner}|` : h === 0 ? '√x' : `√(${inner})`;
  const tail = k === 0 ? '' : ` ${signed(k)}`;
  if (a === 0) return `y = ${show(k)}`;
  const coef = a === 1 ? '' : a === -1 ? MINUS : show(a);
  return `y = ${coef}${f}${tail}`;
}

export const functionShift = {
  id: 'function-shift',
  topicId: 'functions-graphs',
  title: 'Shift, stretch and flip a graph',
  summary: 'y = a·f(x − h) + k: h slides the graph sideways, k lifts it, and a stretches or flips it.',
  controls: [
    {
      id: 'base',
      label: 'Base graph f(x)',
      type: 'choice',
      options: Object.entries(BASES).map(([id, { label }]) => ({ id, label })),
      default: 'square'
    },
    { id: 'a', label: 'Stretch a', type: 'range', min: -3, max: 3, step: 0.5, default: 1 },
    { id: 'h', label: 'Sideways shift h', type: 'range', min: -5, max: 5, step: 1, default: 0 },
    { id: 'k', label: 'Up or down k', type: 'range', min: -5, max: 5, step: 1, default: 0 }
  ],
  compute({ base, a, h, k }) {
    const { at, from, key, label } = BASES[base];
    const g = (x) => a * at(x - h) + k;
    // Far outside the picture, so steep parts run off the edge instead of flattening against it.
    const clampY = (y) => Math.max(-100, Math.min(100, y));
    const xs = Array.from({ length: 201 }, (_, i) => (i - 100) / 10);
    const basePoints = xs.filter((x) => x >= from).map((x) => [x, clampY(at(x))]);
    const shiftedPoints = xs.filter((x) => x - h >= from).map((x) => [x, clampY(g(x))]);
    const formula = shiftedFormula(base, a, h, k);

    const sideways = h === 0 ? '' : `${show(Math.abs(h))} ${h > 0 ? 'right' : 'left'}`;
    const upDown = k === 0 ? '' : `${show(Math.abs(k))} ${k > 0 ? 'up' : 'down'}`;
    const shiftText = [sideways, upDown].filter(Boolean).join(', ') || 'None';
    let stretchText;
    if (a === 0) stretchText = 'Flattened: a = 0 leaves y = k';
    else if (a === 1) stretchText = 'None (a = 1)';
    else if (a === -1) stretchText = 'Flipped upside down';
    else if (a < 0) stretchText = `Flipped, and ×${show(-a)} as tall`;
    else stretchText = a > 1 ? `×${show(a)}: taller and narrower` : `×${show(a)}: squashed flatter`;
    // (1, f(1)) = (1, 1) on every base graph: follow it.
    const tracked = { x: 1 + h, y: a + k };

    return {
      numbers: { keyPoint: { x: h, y: k }, tracked, yAtZero: -h >= from ? g(0) : null },
      readouts: [
        { label: 'Equation', value: formula },
        { label: 'Shift', value: shiftText },
        { label: 'Vertical stretch', value: stretchText },
        { label: key, value: `(0, 0) moves to (${show(h)}, ${show(k)})` },
        { label: 'The point (1, 1)', value: `moves to (1 ${signed(h)}, ${show(a)} × 1 ${signed(k)}) = (${show(tracked.x)}, ${show(tracked.y)})` }
      ],
      plot: {
        kind: 'xy',
        x: { label: 'x', min: -10, max: 10 },
        y: { label: 'y', min: -10, max: 10 },
        series: [
          { id: 'base', label: `y = ${label}`, points: basePoints, tone: 'data', dashed: true },
          { id: 'shifted', label: formula, points: shiftedPoints, tone: 'algebra' }
        ],
        guides: [
          { axis: 'y', value: 0, label: '' },
          { axis: 'x', value: 0, label: '' }
        ],
        markers: [
          ...(h === 0 && k === 0 ? [] : [{ x: 0, y: 0, label: '', tone: 'data' }]),
          { x: h, y: k, label: `(${show(h)}, ${show(k)})`, tone: 'combinatorics' }
        ],
        summary: `The dashed base graph y = ${label} and the solid graph ${formula}: shift ${shiftText.toLowerCase()}, stretch ${stretchText.toLowerCase()}.`
      },
      insight:
        a === 0
          ? 'With a = 0 every output is multiplied by 0, so the graph collapses onto the flat line y = k.'
          : h !== 0
            ? `x − h moves the graph the "wrong" way: the input must be ${show(Math.abs(h))} ${h > 0 ? 'bigger' : 'smaller'} to give the same output, so the graph slides ${h > 0 ? 'right' : 'left'}.`
            : a < 0
              ? 'A negative a turns every output into its opposite, so the graph flips over the x-axis.'
              : a !== 1
                ? `a multiplies every output by ${show(a)}: each point keeps its x but its height changes.`
                : k !== 0
                  ? `Adding k to every output lifts the whole graph ${k > 0 ? 'up' : 'down'} by ${show(Math.abs(k))}.`
                  : 'This is the base graph itself. Change h, k or a and watch the solid graph leave the dashed one.'
    };
  },
  tasks: [
    {
      id: 'vertex',
      prompt: 'Move the vertex of y = x² to (3, −2) without changing its shape.',
      check: (values) => values.base === 'square' && values.a === 1 && values.h === 3 && values.k === -2,
      solution: { base: 'square', a: 1, h: 3, k: -2 }
    },
    {
      id: 'peak',
      prompt: 'Turn y = |x| upside down so that its highest point is (−1, 4).',
      check: (values) => values.base === 'abs' && values.a < 0 && values.h === -1 && values.k === 4,
      solution: { base: 'abs', a: -1, h: -1, k: 4 }
    },
    {
      id: 'root',
      prompt: 'Make the √x graph start at (−4, 0) and pass through (0, 4).',
      check: (values, n) => values.base === 'sqrt' && n.keyPoint.x === -4 && n.keyPoint.y === 0 && n.yAtZero !== null && near(n.yAtZero, 4),
      solution: { base: 'sqrt', a: 2, h: -4, k: 0 }
    }
  ]
};

/* ---------------------------- two sets ---------------------------- */

export const vennExplorer = {
  id: 'venn-explorer',
  topicId: 'venn-diagrams',
  alsoTopicIds: ['set-theory'],
  title: 'Fill a Venn diagram',
  summary: 'Set the sizes of U, A, B and the overlap, and see "only A", "only B", "both" and "neither" fall into place.',
  controls: [
    { id: 'u', label: 'Everyone |U|', type: 'range', min: 10, max: 100, step: 1, default: 50 },
    { id: 'a', label: 'In A |A|', type: 'range', min: 0, max: 100, step: 1, default: 25 },
    { id: 'b', label: 'In B |B|', type: 'range', min: 0, max: 100, step: 1, default: 18 },
    { id: 'ab', label: 'In both |A ∩ B|', type: 'range', min: 0, max: 100, step: 1, default: 8 }
  ],
  compute(values) {
    const u = values.u;
    // Settings that cannot happen are pulled back to the nearest that can, and the insight says so.
    const a = Math.min(values.a, u);
    const b = Math.min(values.b, u);
    const lowest = Math.max(0, a + b - u);
    const highest = Math.min(a, b);
    const ab = Math.min(Math.max(values.ab, lowest), highest);
    const adjusted = a !== values.a || b !== values.b || ab !== values.ab;
    const onlyA = a - ab;
    const onlyB = b - ab;
    const union = a + b - ab;
    const neither = u - union;

    let insight;
    if (a !== values.a || b !== values.b) {
      const which = a !== values.a && b !== values.b ? '|A| and |B| are' : a !== values.a ? '|A| is' : '|B| is';
      insight = `A set cannot be bigger than U, so ${which} taken as ${u}.`;
    }
    else if (values.ab > highest) insight = `The overlap is part of both sets, so it can be at most the smaller one: ${highest} is used.`;
    else if (values.ab < lowest) insight = `${a} + ${b} is more than ${u}, so at least ${lowest} must be in both: ${lowest} is used. The overlap is never less than |A| + |B| − |U|.`;
    else if (a === 0 || b === 0) insight = `${a === 0 ? 'A' : 'B'} is empty, so it overlaps nothing: |A ∪ B| is just the other set.`;
    else if (ab === 0) insight = 'No overlap: A and B are disjoint, so |A ∪ B| is simply |A| + |B|.';
    else if (ab === b || ab === a) insight = `Every member of ${ab === b ? 'B is in A' : 'A is in B'}: one circle sits inside the other, so |A ∪ B| is just the bigger set.`;
    else if (neither === 0) insight = 'Nobody is outside A and B, so |A| + |B| − |A ∩ B| uses up all of U.';
    else insight = `|A| + |B| counts the ${ab} in both twice, so subtract them once: |A ∪ B| = ${a} + ${b} − ${ab} = ${union}.`;

    return {
      numbers: { u, a, b, ab, onlyA, onlyB, union, neither, adjusted },
      readouts: [
        { label: '|A ∪ B| = |A| + |B| − |A ∩ B|', value: `${a} + ${b} − ${ab} = ${union}` },
        { label: 'Only A = |A| − |A ∩ B|', value: `${a} − ${ab} = ${onlyA}` },
        { label: 'Only B = |B| − |A ∩ B|', value: `${b} − ${ab} = ${onlyB}` },
        { label: 'Neither = |U| − |A ∪ B|', value: `${u} − ${union} = ${neither}` },
        { label: 'The four regions add up', value: `${onlyA} + ${onlyB} + ${ab} + ${neither} = ${u}` }
      ],
      plot: {
        kind: 'venn',
        sets: [`A (${a})`, `B (${b})`],
        universe: `U = ${u}`,
        regions: { a: onlyA, b: onlyB, ab, none: neither },
        summary: `Of ${u}: ${onlyA} only in A, ${onlyB} only in B, ${ab} in both and ${neither} in neither.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'disjoint',
      prompt: 'Make A and B disjoint, with both sets still non-empty.',
      check: (values, n) => !n.adjusted && n.ab === 0 && n.a > 0 && n.b > 0,
      solution: { ab: 0 }
    },
    {
      id: 'inside',
      prompt: 'Put B entirely inside A, with A still bigger than B.',
      check: (values, n) => !n.adjusted && n.b > 0 && n.ab === n.b && n.a > n.b,
      solution: { a: 25, b: 8, ab: 8 }
    },
    {
      id: 'everyone',
      prompt: 'Leave nobody in "neither" while A and B still overlap.',
      check: (values, n) => !n.adjusted && n.neither === 0 && n.ab > 0,
      solution: { u: 50, a: 30, b: 28, ab: 8 }
    },
    {
      id: 'least',
      prompt: 'Of 40 people, 30 are in A and 25 in B. Find the smallest overlap possible.',
      check: (values, n) => !n.adjusted && n.u === 40 && n.a === 30 && n.b === 25 && n.ab === 15,
      solution: { u: 40, a: 30, b: 25, ab: 15 }
    }
  ]
};

/* ---------------------------- filling slots ---------------------------- */

export const countingSlots = {
  id: 'counting-slots',
  topicId: 'permutations',
  alsoTopicIds: ['counting-principle'],
  title: 'Fill the slots',
  summary: 'Count arrangements slot by slot: multiply the choices for each slot, with or without repeats.',
  controls: [
    { id: 'n', label: 'Items to choose from n', type: 'range', min: 1, max: 10, step: 1, default: 5 },
    { id: 'r', label: 'Slots to fill r', type: 'range', min: 1, max: 10, step: 1, default: 3 },
    {
      id: 'repeat',
      label: 'Repeats',
      type: 'choice',
      options: [
        { id: 'no', label: 'Not allowed' },
        { id: 'yes', label: 'Allowed' }
      ],
      default: 'no'
    }
  ],
  compute({ n, r, repeat }) {
    const repeats = repeat === 'yes';
    const choices = Array.from({ length: r }, (_, i) => (repeats ? n : Math.max(0, n - i)));
    const ways = choices.reduce((product, c) => product * c, 1);
    const other = repeats ? choices.reduce((p, _, i) => p * Math.max(0, n - i), 1) : n ** r;
    const runOut = !repeats && r > n;

    const gap = 0.4;
    const row = r + (r - 1) * gap;
    const width = Math.max(row, 5);
    const height = 2.6;
    const x0 = (width - row) / 2;
    const rects = choices.map((c, i) => ({
      x: x0 + i * (1 + gap),
      y: 0.7,
      w: 1,
      h: 1,
      tone: c === 0 ? 'data' : 'combinatorics',
      dashed: c === 0,
      faint: c === 0,
      label: String(c)
    }));
    const notes = [
      ...choices.map((_, i) => ({ x: x0 + i * (1 + gap) + 0.5, y: 0.5, text: r <= 6 ? `slot ${i + 1}` : String(i + 1) })),
      ...choices.slice(1).map((_, i) => ({ x: x0 + (i + 1) * (1 + gap) - gap / 2, y: 1.28, text: '×' })),
      { x: width / 2, y: 2.3, text: `${choices.join(' × ')} = ${show(ways)}` }
    ];
    const formula = repeats ? `${n}${sup(r)}` : `${sup(n)}P${sub(r)}`;
    const formulaWorking = repeats
      ? `${n}${sup(r)} = ${show(ways)}`
      : runOut
        ? `${sup(n)}P${sub(r)} = 0 (r > n)`
        : `${n}! ÷ ${n - r}! = ${show(ways)}`;

    return {
      numbers: { choices, ways, other, runOut },
      readouts: [
        { label: 'Choices, slot by slot', value: choices.join(' × ') },
        { label: 'Ways', value: show(ways) },
        { label: repeats ? 'Formula nʳ' : 'Formula ⁿPᵣ = n! ÷ (n − r)!', value: formulaWorking },
        { label: repeats ? 'Without repeats it would be' : 'With repeats it would be', value: show(other) }
      ],
      plot: {
        kind: 'rects',
        width,
        height,
        rects,
        notes,
        summary: `${r} slot${r === 1 ? '' : 's'} filled from ${n} item${n === 1 ? '' : 's'}, ${repeats ? 'repeats allowed' : 'no repeats'}: ${choices.join(' × ')} = ${ways} ways (${formula}).`
      },
      insight: runOut
        ? `Without repeats you run out after ${n} slot${n === 1 ? '' : 's'}: the next slot has 0 choices, so there are 0 ways.`
        : repeats
          ? `Every slot can use any of the ${n} item${n === 1 ? '' : 's'} again, so each slot has ${n} choice${n === 1 ? '' : 's'}: ${n} multiplied by itself, ${r} slot${r === 1 ? '' : 's'} over.`
          : r === n
            ? n === 1
              ? 'One item and one slot: just 1 way.'
              : `Filling every slot with all ${n} items is ${n}! = ${show(ways)}: one fewer choice at each step, down to 1.`
            : 'Each slot has one choice fewer than the last, because an item used is gone. Multiply the choices: that is ⁿPᵣ.'
    };
  },
  tasks: [
    {
      id: 'shelf',
      prompt: 'Count the ways to arrange 4 books on a shelf.',
      check: (values, n) => values.repeat === 'no' && values.n === 4 && values.r === 4 && n.ways === 24,
      solution: { n: 4, r: 4, repeat: 'no' }
    },
    {
      id: 'pin',
      prompt: 'Count the 4-digit PINs made from the digits 0 to 9.',
      check: (values, n) => values.repeat === 'yes' && values.n === 10 && values.r === 4 && n.ways === 10000,
      solution: { n: 10, r: 4, repeat: 'yes' }
    },
    {
      id: 'seven-twenty',
      prompt: 'With no repeats, find a set-up that gives exactly 720 ways. Is there more than one?',
      check: (values, n) => values.repeat === 'no' && n.ways === 720,
      solution: { n: 10, r: 3, repeat: 'no' }
    },
    {
      id: 'run-out',
      prompt: 'Without repeats, make the number of ways drop to 0.',
      check: (values, n) => n.runOut,
      solution: { n: 3, r: 5, repeat: 'no' }
    }
  ]
};

/* ---------------------------- Pascal’s triangle ---------------------------- */

/** ⁿCᵣ by the multiplicative formula, exact for the small numbers used here. */
export function nCr(n, r) {
  if (r < 0 || r > n) return 0;
  const k = Math.min(r, n - r);
  let value = 1;
  for (let i = 1; i <= k; i++) value = (value * (n - k + i)) / i;
  return value;
}

export const pascalNcr = {
  id: 'pascal-ncr',
  topicId: 'combinations',
  title: 'Pascal’s triangle and ⁿCᵣ',
  summary: 'Every entry of Pascal’s triangle is an ⁿCᵣ: see its mirror image, its two parents and its row total.',
  controls: [
    { id: 'n', label: 'Row n', type: 'range', min: 0, max: 12, step: 1, default: 5 },
    { id: 'r', label: 'Position r', type: 'range', min: 0, max: 12, step: 1, default: 2 }
  ],
  compute({ n, r }) {
    const rows = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: i + 1 }, (_, j) => nCr(i, j)));
    const valid = r <= n;
    const value = nCr(n, r);
    const mirror = valid ? n - r : null;
    const parents = valid && r > 0 && r < n ? [nCr(n - 1, r - 1), nCr(n - 1, r)] : null;
    const rowSum = 2 ** n;

    // Rows are flatter than cells are wide, so 3-digit entries still fit at row 12.
    // The extra 1.8 on the left holds the "row n" label.
    const rowHeight = 0.62;
    const margin = 1.8;
    const contentW = n + 1;
    const contentH = (n + 1) * rowHeight;
    const width = Math.max(contentW, 6) + margin;
    const height = Math.max(contentH, 3.6);
    const xOff = margin + (width - margin - contentW) / 2;
    const yOff = (height - contentH) / 2;
    const toneOf = (i, j) => {
      if (!valid) return null;
      if (i === n && j === r) return 'combinatorics';
      if (i === n && j === mirror) return 'geometry';
      if (parents && i === n - 1 && (j === r - 1 || j === r)) return 'arithmetic';
      return null;
    };
    const rects = rows.flatMap((cells, i) =>
      cells.flatMap((cell, j) => {
        const tone = toneOf(i, j);
        const box = { x: xOff + (n - i) / 2 + j + 0.04, y: yOff + i * rowHeight + 0.03, w: 0.92, h: 0.56 };
        const cellRect = { ...box, tone: tone || 'algebra', faint: !tone, label: String(cell) };
        // A highlighted cell is drawn twice, unlabelled underneath, so it stands out from the faint ones.
        return tone ? [{ ...box, tone }, cellRect] : [cellRect];
      })
    );
    const px = pixelsPerUnit(width, height);
    const notes = [{ x: xOff - 8 / px, y: yOff + n * rowHeight + 0.43, text: `row ${n}`, anchor: 'end' }];

    const C = (top, bottom) => `${sup(top)}C${sub(bottom)}`;
    const working = (() => {
      if (!valid) return '0';
      const k = Math.min(r, n - r);
      if (k === 0) return '1';
      const tops = Array.from({ length: k }, (_, i) => n - i).join(' × ');
      const bottoms = Array.from({ length: k }, (_, i) => k - i).join(' × ');
      return `${tops} ÷ (${bottoms}) = ${show(value)}`;
    })();

    return {
      numbers: { value, mirrorValue: valid ? nCr(n, mirror) : 0, parents, rowSum, rows, valid },
      readouts: [
        { label: valid ? C(n, r) : `${C(n, r)}`, value: valid ? working : `0: you cannot choose ${r} from ${n}` },
        { label: 'Its mirror', value: valid ? `${C(n, mirror)} = ${show(nCr(n, mirror))}` : '—' },
        { label: 'Pascal’s rule: the two above', value: parents ? `${C(n - 1, r - 1)} + ${C(n - 1, r)} = ${parents[0]} + ${parents[1]} = ${show(value)}` : valid ? 'An edge: always 1' : '—' },
        { label: `Row ${n} adds up to 2${sup(n)}`, value: show(rowSum) }
      ],
      plot: {
        kind: 'rects',
        width,
        height,
        rects,
        notes,
        summary: valid
          ? `Pascal’s triangle to row ${n}. ${C(n, r)} = ${value}${mirror !== r ? `, the same as its mirror ${C(n, mirror)}` : ', in the middle of its row'}.`
          : `Pascal’s triangle to row ${n}. Row ${n} has no position ${r}, so ${C(n, r)} = 0.`
      },
      insight: !valid
        ? `Row ${n} has only positions 0 to ${n}: there is no way to choose ${r} things from ${n}, so ${C(n, r)} = 0.`
        : !parents
          ? 'The edges are always 1: there is just one way to take nothing, or everything.'
          : mirror === r
            ? `${C(n, r)} sits in the middle of its row, so it is its own mirror: choosing ${r} to take is choosing ${r} to leave. It is also the sum of the two above it.`
            : `Each entry is the sum of the two above it. And ${C(n, r)} = ${C(n, mirror)}: choosing ${r} to take is the same as choosing ${mirror} to leave.`
    };
  },
  tasks: [
    {
      id: 'mirror',
      prompt: '¹⁰C₂ = 45. Find the other entry in row 10 that is also 45.',
      check: (values, n) => values.n === 10 && values.r === 8 && n.value === 45,
      solution: { n: 10, r: 8 }
    },
    {
      id: 'twenty',
      prompt: 'Find the entry that equals 20. Where in its row does it sit?',
      check: (values, n) => n.valid && n.value === 20,
      solution: { n: 6, r: 3 }
    },
    {
      id: 'parents',
      prompt: 'Find an entry whose two parents above it are 15 and 20.',
      check: (values, n) => n.parents !== null && [...n.parents].sort((p, q) => p - q).join() === '15,20',
      solution: { n: 7, r: 3 }
    },
    {
      id: 'row-total',
      prompt: 'Find the row whose entries add up to 256.',
      check: (values, n) => n.rowSum === 256,
      solution: { n: 8 }
    }
  ]
};

/* ---------------------------- finding the rule ---------------------------- */

const TERMS = 8;
const differences = (list) => list.slice(1).map((value, i) => value - list[i]);
const allSame = (list) => list.length > 0 && list.every((value) => near(value, list[0], 1e-9 * Math.max(1, Math.abs(list[0]))));

export const sequenceDifferences = {
  id: 'sequence-differences',
  topicId: 'sequences',
  title: 'Differences reveal the rule',
  summary: 'Build a sequence and take differences, then differences of differences, or ratios, until something stays constant.',
  controls: [
    {
      id: 'rule',
      label: 'Rule',
      type: 'choice',
      options: [
        { id: 'linear', label: 'Add d' },
        { id: 'quadratic', label: 'Growing steps' },
        { id: 'geometric', label: 'Multiply by r' },
        { id: 'fibonacci', label: 'Add the last two' }
      ],
      default: 'linear'
    },
    { id: 'first', label: 'First term t₁', type: 'range', min: 1, max: 10, step: 1, default: 2 },
    { id: 'd', label: 'First step t₂ − t₁ (not for ×r)', type: 'range', min: 0, max: 10, step: 1, default: 3 },
    { id: 's', label: 'Steps grow by (growing steps only)', type: 'range', min: 1, max: 6, step: 1, default: 2 },
    { id: 'r', label: 'Ratio r (×r only)', type: 'range', min: 0.5, max: 3, step: 0.5, default: 2 }
  ],
  compute({ rule, first, d, s, r }) {
    const terms = [first];
    for (let i = 1; i <= TERMS; i++) {
      const last = terms[i - 1];
      if (rule === 'linear') terms.push(last + d);
      else if (rule === 'quadratic') terms.push(last + d + s * (i - 1));
      else if (rule === 'geometric') terms.push(last * r);
      else terms.push(i === 1 ? first + d : last + terms[i - 2]);
    }
    const next = terms.pop();
    const diff1 = differences(terms);
    const diff2 = differences(diff1);
    const ratios = terms.slice(1).map((value, i) => value / terms[i]);
    const constantDiff1 = allSame(diff1);
    const constantDiff2 = allSame(diff2);
    const constantRatio = allSame(ratios);
    const list = (values, decimals = 2) => values.map((v) => show(v, decimals)).join(', ');

    let settles;
    if (constantDiff1) settles = `1st differences, all ${show(diff1[0], 2)}`;
    else if (constantDiff2) settles = `2nd differences, all ${show(diff2[0], 2)}`;
    else if (constantRatio) settles = `Ratios, all ${show(ratios[0], 3)}`;
    else settles = 'Nothing yet: look for another pattern';

    let insight;
    if (rule === 'linear') {
      insight = d === 0
        ? 'Adding 0 keeps every term the same: the differences are all 0.'
        : `The 1st differences are all ${d}: a constant first difference means a linear rule, tₙ = ${first} + (n − 1) × ${d}.`;
    } else if (rule === 'quadratic') {
      insight = `The steps grow by ${s} each time, so the 2nd differences are constant: the rule has an n² term, ${show(s / 2)}n² (half the 2nd difference).`;
    } else if (rule === 'geometric') {
      insight = r === 1
        ? 'Multiplying by 1 changes nothing: every term is the same.'
        : `The differences never settle, but every ratio is ${show(r)}: a constant ratio means geometric. The differences themselves grow ×${show(r)} too.`;
    } else {
      insight = 'Neither differences nor ratios settle, but the differences repeat the sequence itself, one place behind: each term is the sum of the two before it.';
    }

    return {
      numbers: { terms, next, diff1, diff2, ratios, constantDiff1, constantDiff2, constantRatio },
      readouts: [
        { label: 'Terms', value: list(terms) },
        { label: '1st differences', value: list(diff1) },
        { label: '2nd differences', value: list(diff2) },
        { label: 'Ratios tₙ₊₁ ÷ tₙ', value: list(ratios, 3) },
        { label: 'Constant', value: settles },
        { label: `Next term t${sub(TERMS + 1)}`, value: show(next, 2) }
      ],
      plot: {
        kind: 'bars',
        y: { label: 'Term', min: 0 },
        bars: terms.map((value, i) => ({ label: `t${sub(i + 1)}`, value, tone: 'combinatorics' })),
        summary: `The sequence ${list(terms)}. ${settles}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'thirty',
      prompt: 'Using "Add d", make the 8th term exactly 30.',
      check: (values, n) => values.rule === 'linear' && n.terms[TERMS - 1] === 30,
      solution: { rule: 'linear', first: 2, d: 4 }
    },
    {
      id: 'squares',
      prompt: 'Make the square numbers 1, 4, 9, 16, …',
      check: (values, n) => n.terms.every((t, i) => t === (i + 1) ** 2),
      solution: { rule: 'quadratic', first: 1, d: 3, s: 2 }
    },
    {
      id: 'fibonacci',
      prompt: 'Make the Fibonacci numbers 1, 1, 2, 3, 5, 8, …',
      check: (values, n) => [1, 1, 2, 3, 5, 8, 13, 21].every((t, i) => n.terms[i] === t),
      solution: { rule: 'fibonacci', first: 1, d: 0 }
    },
    {
      id: 'self',
      prompt: 'Make a sequence whose 1st differences are exactly its own terms.',
      check: (values, n) => n.diff1.every((dv, i) => dv === n.terms[i]),
      solution: { rule: 'geometric', r: 2 }
    }
  ]
};

export const patternSims = [identityArea, lineExplorer, functionShift, vennExplorer, countingSlots, pascalNcr, sequenceDifferences];
