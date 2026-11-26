/**
 * Pictures for the second set of reasoning simulations (simulations/reasoningMore.js),
 * drawn as SVG and dispatched from reasoningPlots.js:
 *
 *   walk         a walker's path on a km grid, the dashed way back, a facing arrow
 *   wheels       two alphabet wheels, the inner one turned (or reversed), and a word coded live
 *   queue        a row of people with A and B marked, counted from both ends
 *   cubes        a painted cube cut into small cubes (same slant as every box:
 *                utils/solidGeometry.js), or the net of a die
 *   fold         a square sheet folded, punched and opened out (components/reasoningFigures.js)
 *   mirrorclock  a clock and its mirror image
 *
 * Every picture has a text summary for screen readers; colours come from theme tokens.
 */

import { el, svgEl } from '../utils/dom.js';
import { obliquePoint } from '../utils/solidGeometry.js';
import { paperAxes, paperPanel, paperShapes } from './reasoningFigures.js';
import { renderClock } from './clockFigure.js';

const W = 560;

function svgRoot(summary, height, children, width = W) {
  return svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'sim-plot rp-svg', role: 'img', 'aria-label': summary }, children);
}

const STATE_WORDS = { applied: 'done', new: 'just done', pending: 'not yet' };

function stepList(items, title) {
  return el('div.rp-list', {}, [
    el('div.rp-list__title', { text: title }),
    el(
      'ul.rp-clues.rp-clues--plain',
      {},
      items.map((item) =>
        el('li', { class: `rp-clue is-${item.state}` }, [el('span.rp-clue__text', { text: item.text }), el('span.sr-only', { text: ` (${STATE_WORDS[item.state]})` })])
      )
    )
  ]);
}

/* ------------------------------ walk ------------------------------ */

const ARROW_ANGLE = [0, 45, 90, 135, 180, 225, 270, 315];

function walkPlot(plot) {
  const height = 340;
  const { minX, maxX, minY, maxY } = plot.bounds;
  const unit = Math.min((W - 80) / (maxX - minX), (height - 60) / (maxY - minY));
  const ox = W / 2 - ((minX + maxX) / 2) * unit;
  const oy = height / 2 + ((minY + maxY) / 2) * unit;
  const X = (x) => ox + x * unit;
  const Y = (y) => oy - y * unit;
  const children = [];
  for (let x = Math.ceil(minX); x <= maxX; x++) children.push(svgEl('line', { x1: X(x), y1: Y(minY), x2: X(x), y2: Y(maxY), class: x === 0 ? 'walk-grid walk-grid--axis' : 'walk-grid' }));
  for (let y = Math.ceil(minY); y <= maxY; y++) children.push(svgEl('line', { x1: X(minX), y1: Y(y), x2: X(maxX), y2: Y(y), class: y === 0 ? 'walk-grid walk-grid--axis' : 'walk-grid' }));
  // Compass in the top-right corner.
  children.push(svgEl('g', { class: 'walk-compass', transform: `translate(${W - 34} 40)` }, [
    svgEl('path', { d: 'M 0 -22 L 6 -6 L -6 -6 Z', class: 'walk-compass__needle' }),
    svgEl('text', { x: 0, y: -26, 'text-anchor': 'middle', class: 'walk-compass__label', text: 'N' }),
    svgEl('text', { x: 16, y: 4, 'text-anchor': 'start', class: 'walk-compass__label', text: 'E' }),
    svgEl('line', { x1: -10, y1: 0, x2: 10, y2: 0, class: 'walk-grid walk-grid--axis' }),
    svgEl('line', { x1: 0, y1: -6, x2: 0, y2: 10, class: 'walk-grid walk-grid--axis' })
  ]));
  const pts = plot.points;
  const [cx, cy] = pts.at(-1);
  if (pts.length > 1) {
    children.push(svgEl('polyline', { points: pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' '), class: 'walk-path' }));
    pts.slice(1).forEach(([x, y], i) => {
      const [px, py] = pts[i];
      const len = Math.abs(x - px) + Math.abs(y - py);
      const horizontal = y === py;
      children.push(svgEl('text', { x: (X(x) + X(px)) / 2 + (horizontal ? 0 : 8), y: (Y(y) + Y(py)) / 2 + (horizontal ? -6 : 4), 'text-anchor': horizontal ? 'middle' : 'start', class: 'walk-leg', text: `${len}` }));
    });
    if (cx || cy) children.push(svgEl('line', { x1: X(0), y1: Y(0), x2: X(cx), y2: Y(cy), class: 'walk-back' }));
  }
  children.push(svgEl('circle', { cx: X(0), cy: Y(0), r: 6, class: 'walk-start' }));
  children.push(svgEl('text', { x: X(0) - 9, y: Y(0) + 18, 'text-anchor': 'end', class: 'walk-label', text: 'Start' }));
  children.push(
    svgEl('g', { transform: `translate(${X(cx)} ${Y(cy)}) rotate(${ARROW_ANGLE[plot.facing]})`, class: 'walk-walker' }, [
      svgEl('circle', { cx: 0, cy: 0, r: 9, class: 'walk-walker__body' }),
      svgEl('path', { d: 'M 0 -24 L 7 -11 L -7 -11 Z', class: 'walk-walker__arrow' })
    ])
  );
  return el('div.sim-figure.rp-figure', {}, [svgRoot(plot.summary, height, children), stepList(plot.steps, 'Route')]);
}

/* ------------------------------ wheels ------------------------------ */

function wheelsPlot(plot) {
  const height = 330;
  const cx = 165;
  const cy = 165;
  const outerR = 140;
  const innerR = 104;
  const inWord = new Set(plot.word);
  const at = (i, r) => {
    const t = ((i * 360) / 26 - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  };
  const children = [
    svgEl('circle', { cx, cy, r: outerR + 16, class: 'wheel-ring wheel-ring--outer' }),
    svgEl('circle', { cx, cy, r: innerR + 15, class: 'wheel-ring wheel-ring--inner' }),
    svgEl('circle', { cx, cy, r: innerR - 18, class: 'wheel-hub' }),
    svgEl('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', class: 'rp-caption', text: 'outer: letter' }),
    svgEl('text', { x: cx, y: cy + 14, 'text-anchor': 'middle', class: 'rp-caption', text: 'inner: its code' })
  ];
  plot.outer.forEach((ch, i) => {
    const [x, y] = at(i, outerR);
    const [ix, iy] = at(i, innerR);
    children.push(svgEl('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: `wheel-letter${inWord.has(ch) ? ' is-word' : ''}`, text: ch }));
    children.push(svgEl('text', { x: ix, y: iy, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: `wheel-letter wheel-letter--inner${inWord.has(ch) ? ' is-code' : ''}`, text: plot.inner[i] }));
  });
  // The word and its code, letter by letter.
  const left = 350;
  plot.word.forEach((ch, i) => {
    const y = 60 + i * 44;
    children.push(svgEl('text', { x: left, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'wheel-pair wheel-pair--from', text: ch }));
    children.push(svgEl('text', { x: left + 50, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'wheel-arrow', text: '→' }));
    children.push(svgEl('text', { x: left + 100, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'wheel-pair wheel-pair--to', text: plot.code[i] }));
  });
  children.push(svgEl('text', { x: left + 50, y: 30, 'text-anchor': 'middle', class: 'rp-caption', text: plot.rotation === null ? 'opposite letters' : `shift ${plot.rotation}` }));
  return el('div.sim-figure.rp-figure', {}, [svgRoot(plot.summary, height, children)]);
}

/* ------------------------------ queue ------------------------------ */

function queuePlot(plot) {
  const { n, a, b } = plot;
  const height = 190;
  const pitch = Math.min(54, (W - 60) / Math.max(1, n - 1));
  const left = (W - pitch * (n - 1)) / 2;
  const x = (seat) => left + (seat - 1) * pitch;
  const y = 92;
  const children = [
    svgEl('text', { x: 12, y: 36, class: 'rp-caption rp-caption--left', text: 'from the left' }),
    svgEl('text', { x: 12, y: 150, class: 'rp-caption rp-caption--left', text: 'from the right' })
  ];
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (hi - lo > 1) children.push(svgEl('rect', { x: x(lo + 1) - pitch / 2 + 2, y: y - 22, width: (hi - lo - 1) * pitch - 4, height: 44, rx: 10, class: 'queue-between' }));
  for (let s = 1; s <= n; s++) {
    const role = s === a ? 'a' : s === b ? 'b' : '';
    children.push(svgEl('text', { x: x(s), y: 56, 'text-anchor': 'middle', class: `queue-count${s === a ? ' is-a' : ''}`, text: String(s) }));
    children.push(svgEl('text', { x: x(s), y: 134, 'text-anchor': 'middle', class: `queue-count${s === a ? ' is-a' : ''}`, text: String(n - s + 1) }));
    children.push(svgEl('circle', { cx: x(s), cy: y, r: Math.min(18, pitch / 2 - 3), class: `queue-person${role ? ` is-${role}` : ''}${plot.swapped && role ? ' is-fresh' : ''}` }));
    if (role) children.push(svgEl('text', { x: x(s), y: y + 1, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'queue-name', text: role.toUpperCase() }));
  }
  children.push(svgEl('text', { x: W / 2, y: 178, 'text-anchor': 'middle', class: 'rp-caption', text: `A: ${a} from the left + ${n - a + 1} from the right − 1 = ${n}` }));
  return el('div.sim-figure.rp-figure', {}, [svgRoot(plot.summary, height, children)]);
}

/* ------------------------------ cubes ------------------------------ */

const K_WORD = ['no paint', '1 face', '2 faces', '3 faces'];

function cubesPlot(plot) {
  if (plot.view === 'net') {
    const s = 64;
    const height = 4 * s + 40;
    const left = (W - 3 * s) / 2;
    const children = plot.net.flatMap(({ c, r, label, role }) => [
      svgEl('rect', { x: left + c * s, y: 20 + r * s, width: s, height: s, class: `net-cell${role ? ` is-${role}` : ''}` }),
      svgEl('text', { x: left + c * s + s / 2, y: 20 + r * s + s / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'net-label', text: label })
    ]);
    return el('div.sim-figure.rp-figure', {}, [svgRoot(plot.summary, height, children)]);
  }
  const { n, squares, only, counts } = plot;
  const height = 320;
  const core = n - 2;
  // Model extent of the big cube, plus the inside block beside it.
  const gap = core > 0 ? 1.2 : 0;
  const [maxX, maxY] = obliquePoint(n + gap + core, n, n);
  const unit = Math.min((W - 40) / maxX, (height - 70) / maxY);
  const P = (x, y, z, dx = 0) => {
    const [px, py] = obliquePoint(x + dx, y, z);
    return [20 + px * unit, height - 40 - py * unit];
  };
  const poly = (list) => list.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const corners = {
    front: (u, v) => [P(u, v, 0), P(u + 1, v, 0), P(u + 1, v + 1, 0), P(u, v + 1, 0)],
    top: (u, v) => [P(u, n, v), P(u + 1, n, v), P(u + 1, n, v + 1), P(u, n, v + 1)],
    right: (u, v) => [P(n, v, u), P(n, v, u + 1), P(n, v + 1, u + 1), P(n, v + 1, u)]
  };
  const dim = (k) => only !== 'all' && String(k) !== only;
  const children = squares.map((sq) =>
    svgEl('polygon', { points: poly(corners[sq.face](sq.u, sq.v)), class: `cube-cell cube-k${sq.k} cube-cell--${sq.face}${dim(sq.k) ? ' is-dim' : ''}` })
  );
  if (core > 0) {
    const dx = n + gap;
    const box = [
      [P(0, 0, 0, dx), P(core, 0, 0, dx), P(core, core, 0, dx), P(0, core, 0, dx)],
      [P(0, core, 0, dx), P(core, core, 0, dx), P(core, core, core, dx), P(0, core, core, dx)],
      [P(core, 0, 0, dx), P(core, 0, core, dx), P(core, core, core, dx), P(core, core, 0, dx)]
    ];
    for (const face of box) children.push(svgEl('polygon', { points: poly(face), class: `cube-cell cube-k0${dim(0) ? ' is-dim' : ''}` }));
    const [lx, ly] = P(core / 2, 0, 0, dx);
    children.push(svgEl('text', { x: lx, y: ly + 18, 'text-anchor': 'middle', class: 'rp-caption', text: `inside: ${core}³ = ${counts[0]}` }));
  }
  const legend = el(
    'p.rp-key',
    {},
    [3, 2, 1, 0].map((k) => el('span.rp-key__item', {}, [el(`span.cube-swatch.cube-k${k}`, { attrs: { 'aria-hidden': 'true' } }), ` ${K_WORD[k]}: ${counts[k]}`]))
  );
  return el('div.sim-figure.rp-figure', {}, [svgRoot(plot.summary, height, children), legend]);
}

/* ------------------------------ fold ------------------------------ */

function foldPlot(plot) {
  const { size, folds, done, opened } = plot;
  const cell = 26;
  const side = size * cell;
  const height = side + 50;
  const x = (W - side) / 2;
  const { stages, final } = paperShapes(size, folds);
  const square = [[0, 0], [size, 0], [size, size], [0, size]];
  const next = !opened && !plot.punches.length && done < folds.length ? stages[done] : null;
  const outline = opened ? square : done < folds.length ? stages[done].outline : final;
  const children = [
    ...paperPanel({ size, outline, moving: next?.moving, line: next?.line, punches: plot.punches, holes: plot.holes, x, y: 24, cell }),
    ...paperAxes(size, x, 24, cell)
  ];
  return el('div.sim-figure.rp-figure', {}, [svgRoot(plot.summary, height, children), stepList(plot.steps, 'Steps')]);
}

/* ------------------------------ mirror clock ------------------------------ */

function mirrorClockPlot(plot) {
  const height = 300;
  const size = 220;
  const actual = renderClock({ hour: plot.hour, minute: plot.minute });
  const image = renderClock({ hour: plot.hour, minute: plot.minute });
  for (const svg of [actual, image]) {
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
  }
  const x1 = 40;
  const x2 = W - 40 - size;
  actual.setAttribute('x', x1);
  actual.setAttribute('y', 20);
  image.setAttribute('x', 0);
  image.setAttribute('y', 0);
  const t = `${plot.image.hour}:${String(plot.image.minute).padStart(2, '0')}`;
  const children = [
    actual,
    // The mirror image: the same face flipped left to right.
    svgEl('g', { transform: `translate(${x2 + size} 20) scale(-1 1)` }, [image]),
    svgEl('line', { x1: W / 2, y1: 14, x2: W / 2, y2: 250, class: 'mirror-line' }),
    svgEl('text', { x: x1 + size / 2, y: 268, 'text-anchor': 'middle', class: 'rp-caption', text: `Actual: ${plot.hour}:${String(plot.minute).padStart(2, '0')}` }),
    svgEl('text', { x: x2 + size / 2, y: 268, 'text-anchor': 'middle', class: 'rp-caption', text: `In the mirror it reads ${t}` }),
    svgEl('text', { x: W / 2, y: 292, 'text-anchor': 'middle', class: 'rp-caption', text: 'mirror' })
  ];
  return el('div.sim-figure.rp-figure', {}, [svgRoot(plot.summary, height, children)]);
}

export function drawMoreReasoningPlot(plot) {
  if (plot.kind === 'walk') return walkPlot(plot);
  if (plot.kind === 'wheels') return wheelsPlot(plot);
  if (plot.kind === 'queue') return queuePlot(plot);
  if (plot.kind === 'cubes') return cubesPlot(plot);
  if (plot.kind === 'fold') return foldPlot(plot);
  if (plot.kind === 'mirrorclock') return mirrorClockPlot(plot);
  return null;
}

export const MORE_REASONING_PLOT_KINDS = ['walk', 'wheels', 'queue', 'cubes', 'fold', 'mirrorclock'];
