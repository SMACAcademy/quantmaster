/**
 * Question figures for the spatial reasoning topics, drawn as SVG:
 *
 *   { type: 'dice', views: [{ top: '1', front: '2', right: '3' }, ...] }
 *       views of one die, each drawn as a cube showing its top, front and right
 *       faces (with the same slant as every other box: utils/solidGeometry.js)
 *   { type: 'dice', net: [[column, row, label], ...] }
 *       a flat net of a cube
 *   { type: 'paper', size: 4, folds: ['left', 'top'], punches: ['C3'], unfolded?: true }
 *       a square sheet ruled into squares, folded step by step and punched;
 *       with `unfolded`, a last panel shows the sheet opened out with its holes
 *
 * The maths (folding, checks) is in utils/reasoning/cubes.js and mirror.js.
 * paperPanel() is shared with the paper-folding simulation.
 */

import { svgEl } from '../utils/dom.js';
import { obliquePoint } from '../utils/solidGeometry.js';
import { diceFigureProblems } from '../utils/reasoning/cubes.js';
import { holesByReflection, paperFigureProblems, parseSquare } from '../utils/reasoning/mirror.js';

const pts = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/* ------------------------------ dice ------------------------------ */

/** One cube showing three labelled faces; (x, y) is the bottom-left front corner, in pixels. */
function cubeView(x, y, s, view, title) {
  // Model units, y up; flip to pixels.
  const P = (mx, my, mz) => {
    const [px, py] = obliquePoint(mx, my, mz);
    return [x + px * s, y - py * s];
  };
  const front = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)];
  const top = [P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)];
  const right = [P(1, 0, 0), P(1, 0, 1), P(1, 1, 1), P(1, 1, 0)];
  const centre = (poly) => [poly.reduce((a, p) => a + p[0], 0) / 4, poly.reduce((a, p) => a + p[1], 0) / 4];
  const label = (poly, text, cls) => {
    const [cx, cy] = centre(poly);
    return svgEl('text', { x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: `dice-label ${cls}`, text });
  };
  return [
    svgEl('polygon', { points: pts(front), class: 'dice-face dice-face--front' }),
    svgEl('polygon', { points: pts(top), class: 'dice-face dice-face--top' }),
    svgEl('polygon', { points: pts(right), class: 'dice-face dice-face--right' }),
    label(front, view.front, 'dice-label--front'),
    label(top, view.top, 'dice-label--top'),
    label(right, view.right, 'dice-label--right'),
    title ? svgEl('text', { x: x + s * 0.65, y: y + 24, 'text-anchor': 'middle', class: 'dice-title', text: title }) : null
  ];
}

export function renderDice(figure) {
  if (diceFigureProblems(figure).length) return null;
  if (figure.net) return renderNet(figure.net);
  const views = figure.views;
  const s = 78;
  const pitch = 150;
  const width = Math.max(200, views.length * pitch + 20);
  const height = 170;
  const children = views.flatMap((v, i) => cubeView(30 + i * pitch, 128, s, v, views.length > 1 ? `View ${i + 1}` : null));
  return svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'chart-svg dice-svg', style: { maxWidth: `${Math.round(width * 1.4)}px` }, 'aria-hidden': 'true' }, children);
}

function renderNet(cells) {
  const s = 52;
  const cols = Math.max(...cells.map((c) => c[0])) + 1;
  const rows = Math.max(...cells.map((c) => c[1])) + 1;
  const width = cols * s + 20;
  const height = rows * s + 20;
  const children = cells.flatMap(([c, r, label]) => [
    svgEl('rect', { x: 10 + c * s, y: 10 + r * s, width: s, height: s, class: 'dice-face dice-face--net' }),
    svgEl('text', { x: 10 + c * s + s / 2, y: 10 + r * s + s / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'dice-label', text: label })
  ]);
  return svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'chart-svg dice-svg dice-svg--net', 'aria-hidden': 'true' }, children);
}

/* ------------------------------ paper ------------------------------ */

/** The paper's outline after some folds, in squares (x right, y down), and the part the next fold moves. */
export function paperShapes(size, folds) {
  let rect = { c0: 0, c1: size, r0: 0, r1: size };
  let outline = [[0, 0], [size, 0], [size, size], [0, size]];
  const stages = [];
  for (const fold of folds) {
    const { c0, c1, r0, r1 } = rect;
    const mc = (c0 + c1) / 2;
    const mr = (r0 + r1) / 2;
    const box = (a, b, c, d) => [[a, c], [b, c], [b, d], [a, d]];
    let moving;
    let line;
    let next;
    if (fold === 'left') [moving, line, next] = [box(c0, mc, r0, r1), [[mc, r0], [mc, r1]], { ...rect, c0: mc }];
    else if (fold === 'right') [moving, line, next] = [box(mc, c1, r0, r1), [[mc, r0], [mc, r1]], { ...rect, c1: mc }];
    else if (fold === 'top') [moving, line, next] = [box(c0, c1, r0, mr), [[c0, mr], [c1, mr]], { ...rect, r0: mr }];
    else if (fold === 'bottom') [moving, line, next] = [box(c0, c1, mr, r1), [[c0, mr], [c1, mr]], { ...rect, r1: mr }];
    else if (fold === 'diag') [moving, line, next] = [[[c0, r0], [c1, r0], [c1, r1]], [[c0, r0], [c1, r1]], rect];
    else [moving, line, next] = [[[c0, r0], [c1, r0], [c0, r1]], [[c1, r0], [c0, r1]], rect];
    stages.push({ outline, moving, line, fold });
    rect = next;
    if (fold === 'diag') outline = [[c0, r0], [c1, r1], [c0, r1]];
    else if (fold === 'anti') outline = [[c1, r0], [c1, r1], [c0, r1]];
    else outline = box(rect.c0, rect.c1, rect.r0, rect.r1);
  }
  return { stages, final: outline };
}

let clipCounter = 0;

/**
 * One panel: the sheet's ghost, the paper as it now lies (ruled into squares),
 * optionally the half about to fold (shaded, with its fold line), punches and
 * holes. Coordinates in squares; (x, y) is the panel's top-left corner in pixels.
 */
export function paperPanel({ size, outline, moving = null, line = null, punches = [], holes = [], title = '', x = 0, y = 0, cell = 22 }) {
  const P = ([c, r]) => [x + c * cell, y + r * cell];
  const id = `qm-paper-${++clipCounter}`;
  const grid = [];
  for (let k = 1; k < size; k++) {
    grid.push(svgEl('line', { x1: x + k * cell, y1: y, x2: x + k * cell, y2: y + size * cell, class: 'paper-rule' }));
    grid.push(svgEl('line', { x1: x, y1: y + k * cell, x2: x + size * cell, y2: y + k * cell, class: 'paper-rule' }));
  }
  const dot = (name, cls) => {
    const [c, r] = parseSquare(name);
    const [cx, cy] = P([c + 0.5, r + 0.5]);
    return svgEl('circle', { cx, cy, r: cell * 0.24, class: cls });
  };
  return [
    svgEl('rect', { x, y, width: size * cell, height: size * cell, class: 'paper-ghost' }),
    svgEl('defs', {}, [svgEl('clipPath', { id }, [svgEl('polygon', { points: pts(outline.map(P)) })])]),
    svgEl('polygon', { points: pts(outline.map(P)), class: 'paper-sheet' }),
    svgEl('g', { 'clip-path': `url(#${id})` }, grid),
    moving ? svgEl('polygon', { points: pts(moving.map(P)), class: 'paper-moving' }) : null,
    line ? svgEl('line', { x1: P(line[0])[0], y1: P(line[0])[1], x2: P(line[1])[0], y2: P(line[1])[1], class: 'paper-fold-line' }) : null,
    ...holes.map((h) => dot(h, 'paper-hole')),
    ...punches.map((p) => dot(p, 'paper-punch')),
    title ? svgEl('text', { x: x + (size * cell) / 2, y: y + size * cell + 18, 'text-anchor': 'middle', class: 'paper-title', text: title }) : null
  ];
}

/** Column letters and row numbers round a sheet, so squares can be named. */
export function paperAxes(size, x, y, cell) {
  const out = [];
  for (let k = 0; k < size; k++) {
    out.push(svgEl('text', { x: x + (k + 0.5) * cell, y: y - 6, 'text-anchor': 'middle', class: 'paper-axis', text: String.fromCharCode(65 + k) }));
    out.push(svgEl('text', { x: x - 7, y: y + (k + 0.5) * cell, 'text-anchor': 'end', 'dominant-baseline': 'central', class: 'paper-axis', text: String(k + 1) }));
  }
  return out;
}

export function renderPaper(figure) {
  if (paperFigureProblems(figure).length) return null;
  const { size, folds, punches = [] } = figure;
  const cell = size <= 4 ? 22 : 14;
  const side = size * cell;
  const pitch = side + 34;
  const { stages, final } = paperShapes(size, folds);
  const panels = stages.map((s, i) => ({ outline: s.outline, moving: s.moving, line: s.line, title: `Fold ${i + 1}` }));
  panels.push({ outline: final, punches, title: 'Punched' });
  if (figure.unfolded) panels.push({ outline: [[0, 0], [size, 0], [size, size], [0, size]], holes: holesByReflection(size, folds, punches), title: 'Opened out' });
  const width = 24 + panels.length * pitch;
  const height = side + 52;
  const children = panels.flatMap((p, i) => [
    ...paperPanel({ size, ...p, x: 24 + i * pitch, y: 18, cell }),
    ...(i === 0 ? paperAxes(size, 24, 18, cell) : [])
  ]);
  // Keep small figures at about their natural size instead of stretching them to the card.
  return svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'chart-svg paper-svg', style: { maxWidth: `${Math.round(width * 1.6)}px` }, 'aria-hidden': 'true' }, children);
}
