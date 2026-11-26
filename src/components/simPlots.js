/**
 * Draws a simulation's `plot` as inline SVG. Four kinds:
 *
 *   xy      lines on axes: { x, y, series, fills?, guides?, markers? }
 *   bars    vertical bars: { y, bars, baseline? }
 *   clock   a clock face: { hourAngle, minuteAngle }
 *   seesaw  a balance beam: { beam, weights, pivot }
 *
 * and more below (tank, track, numberline, shapes, dots, solids, rects, venn),
 * then three for data interpretation:
 *
 *   chart       a DI chart drawn by Chart.js, as in the questions: { chart }
 *   table       a table of coloured cells: { columns, rows, caption }
 *   candidates  the possible answers, row by row, as a set shrinks: { min, max, rows, badge }
 *
 * and two for lines, shapes and mensuration:
 *
 *   geometry    a flat figure in model units, drawn to scale: { view, items }
 *   stack       several plots, one above the other: { plots }
 *
 * and, for the topics that only borrowed a simulation before (each is described
 * above its function):
 *
 *   numberlines  number lines sharing one scale, with points and bands
 *   steps        an expression collapsing one operation at a time
 *   tree         a tree of choices, one layer per stage
 *   setdots      elements placed in two or three sets
 *   subsets      the power set, grouped by size
 *   passage      a paragraph read sentence by sentence
 *
 * for logical reasoning (seats, grid, euler, chain, family, walk, wheels,
 * queue, cubes, fold, mirrorclock), drawn by reasoningPlots.js and
 * reasoningPlotsMore.js, and two for integer solutions and cryptarithms:
 *
 *   lattice      whole-number points on a line ax + by = c, with the step between them
 *   cryptarithm  a letter sum worked column by column, with each letter's digits left
 *
 * Colours come from the --cat-* tokens, so every picture follows the theme.
 * Every plot carries a text summary for screen readers.
 */

import { el, svgEl } from '../utils/dom.js';
import { niceRange, show } from '../simulations/core.js';
import { pieSectorPath, pointOnCircle } from '../utils/chartScale.js';
import { solidDrawing } from '../utils/solidGeometry.js';
import { makeTransform } from '../utils/planeGeometry.js';
import { chevronPoints, circlePath, rightAngleMarkerPoints, tickMarkSegments } from '../utils/diagramGeometry.js';
import { renderVenn } from './venn.js';
import { chartWidget } from './Chart.js';
import { drawReasoningPlot } from './reasoningPlots.js';

const W = 560;
const H = 340;
const M = { top: 20, right: 22, bottom: 52, left: 66 };
const tone = (name) => `var(--cat-${name || 'algebra'})`;
let clipCounter = 0;

function svgRoot(summary, children, { width = W, height = H } = {}) {
  return svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'sim-plot', role: 'img', 'aria-label': summary }, children);
}

/**
 * Widen one axis about its centre so a unit is the same length on both, as on
 * graph paper (a slope of 1 then looks like 45°). Ticks keep the axis's step.
 */
function equalUnits(xr, yr, width, height) {
  const perX = width / (xr.max - xr.min);
  const perY = height / (yr.max - yr.min);
  const widen = (range, span) => {
    const mid = (range.min + range.max) / 2;
    const min = mid - span / 2;
    const max = mid + span / 2;
    const ticks = [];
    for (let v = Math.ceil(min / range.step - 1e-9) * range.step; v <= max + 1e-9; v += range.step) ticks.push(Number(v.toFixed(10)));
    return { min, max, step: range.step, ticks };
  };
  return perX > perY ? [widen(xr, width / perY), yr] : [xr, widen(yr, height / perX)];
}

function xyPlot(plot) {
  let xr = niceRange(plot.x.min, plot.x.max);
  let yr = niceRange(plot.y.min ?? 0, plot.y.max ?? 1);
  const left = M.left;
  const right = W - M.right;
  const top = M.top;
  const bottom = H - M.bottom;
  if (plot.equalUnits) [xr, yr] = equalUnits(xr, yr, right - left, bottom - top);
  const sx = (x) => left + ((x - xr.min) / (xr.max - xr.min)) * (right - left);
  const sy = (y) => bottom - ((y - yr.min) / (yr.max - yr.min)) * (bottom - top);
  const clipId = `sim-clip-${(clipCounter += 1)}`;
  const byId = new Map(plot.series.map((series) => [series.id, series]));
  const path = (points) => points.map(([x, y], i) => `${i ? 'L' : 'M'} ${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`).join(' ');

  const grid = [
    ...yr.ticks.map((tick) =>
      svgEl('g', {}, [
        svgEl('line', { x1: left, x2: right, y1: sy(tick), y2: sy(tick), class: 'chart-gridline' }),
        svgEl('text', { x: left - 8, y: sy(tick), class: 'chart-axis-label', 'text-anchor': 'end', 'dominant-baseline': 'middle', text: show(tick) })
      ])
    ),
    ...xr.ticks.map((tick, i) =>
      // A negative first label is wide; centred on the corner it would touch the y-axis "0".
      svgEl('text', { x: sx(tick), y: bottom + 18, class: 'chart-axis-label', 'text-anchor': i === 0 && tick < 0 ? 'start' : 'middle', text: show(tick) })
    ),
    svgEl('line', { x1: left, x2: right, y1: bottom, y2: bottom, class: 'sim-axis' }),
    svgEl('line', { x1: left, x2: left, y1: top, y2: bottom, class: 'sim-axis' }),
    svgEl('text', { x: (left + right) / 2, y: H - 8, class: 'sim-axis-title', 'text-anchor': 'middle', text: plot.x.label }),
    svgEl('text', {
      x: 14,
      y: (top + bottom) / 2,
      class: 'sim-axis-title',
      'text-anchor': 'middle',
      transform: `rotate(-90 14 ${(top + bottom) / 2})`,
      text: plot.y.label
    })
  ];

  const fills = (plot.fills || []).map((fill) => {
    const from = byId.get(fill.from)?.points || [];
    const to = byId.get(fill.to)?.points || [];
    const outline = [...to, ...from.slice().reverse()];
    return svgEl('path', { d: `${path(outline)} Z`, class: 'sim-fill', style: { fill: tone(fill.tone) } });
  });

  const guides = (plot.guides || [])
    .filter((guide) => (guide.axis === 'y' ? guide.value >= yr.min && guide.value <= yr.max : guide.value >= xr.min && guide.value <= xr.max))
    .map((guide) =>
      guide.axis === 'y'
        ? svgEl('g', {}, [
            svgEl('line', { x1: left, x2: right, y1: sy(guide.value), y2: sy(guide.value), class: 'sim-guide' }),
            guide.label
              ? svgEl('text', {
                  x: right - 4,
                  // Below the line when it runs along the top edge, so the label stays inside the plot.
                  y: sy(guide.value) - top < 18 ? sy(guide.value) + 16 : sy(guide.value) - 6,
                  class: 'sim-guide-label',
                  'text-anchor': 'end',
                  text: guide.label
                })
              : null
          ])
        : svgEl('g', {}, [
            svgEl('line', { x1: sx(guide.value), x2: sx(guide.value), y1: top, y2: bottom, class: 'sim-guide' }),
            guide.label ? svgEl('text', { x: sx(guide.value) + 4, y: top + 12, class: 'sim-guide-label', text: guide.label }) : null
          ])
    );

  const lines = plot.series.map((series) =>
    svgEl('path', {
      d: path(series.points),
      class: `sim-line${series.dashed ? ' sim-line--dashed' : ''}`,
      style: { stroke: tone(series.tone) }
    })
  );

  const markers = (plot.markers || []).map((marker) =>
    svgEl('g', { class: 'sim-marker' }, [
      svgEl('circle', { cx: sx(marker.x), cy: sy(marker.y), r: 6, style: { fill: tone(marker.tone) } }),
      marker.label
        ? svgEl('text', {
            x: sx(marker.x) + (sx(marker.x) > right - 90 ? -10 : 10),
            y: sy(marker.y) - 10,
            'text-anchor': sx(marker.x) > right - 90 ? 'end' : 'start',
            class: 'sim-marker-label',
            text: marker.label
          })
        : null
    ])
  );

  const svg = svgRoot(plot.summary, [
    svgEl('defs', {}, [svgEl('clipPath', { id: clipId }, [svgEl('rect', { x: left, y: top, width: right - left, height: bottom - top })])]),
    ...grid,
    svgEl('g', { 'clip-path': `url(#${clipId})` }, [...fills, ...guides, ...lines, ...markers])
  ]);

  // A series without a label (a baseline drawn only to close a fill) stays out of the legend.
  const named = plot.series.filter((series) => series.label);
  const legend =
    named.length > 1
      ? el(
          'ul.chart-legend',
          {},
          named.map((series) =>
            el('li.chart-legend__item', {}, [el('span.chart-legend__swatch', { style: { background: tone(series.tone) } }), el('span', { text: series.label })])
          )
        )
      : null;
  return el('div.sim-figure', {}, [svg, legend]);
}

function legendOf(items) {
  return el(
    'ul.chart-legend',
    {},
    items.map((item) => el('li.chart-legend__item', {}, [el('span.chart-legend__swatch', { style: { background: tone(item.tone) } }), el('span', { text: item.label })]))
  );
}

/** Bars, optionally with a second segment stacked on top (`bar.stack`). */
function barPlot(plot) {
  const tallest = Math.max(...plot.bars.map((bar) => bar.value + (bar.stack?.value || 0)));
  const yr = niceRange(plot.y.min ?? 0, plot.y.max ?? tallest);
  const left = M.left;
  const right = W - M.right;
  const top = M.top;
  const bottom = H - M.bottom;
  const sy = (y) => bottom - ((y - yr.min) / (yr.max - yr.min)) * (bottom - top);
  const slot = (right - left) / plot.bars.length;
  const width = Math.min(110, slot * 0.55);
  if (plot.bars.some((bar) => bar.stack)) {
    const children = [
      ...yr.ticks.map((tick) =>
        svgEl('g', {}, [
          svgEl('line', { x1: left, x2: right, y1: sy(tick), y2: sy(tick), class: 'chart-gridline' }),
          svgEl('text', { x: left - 8, y: sy(tick), class: 'chart-axis-label', 'text-anchor': 'end', 'dominant-baseline': 'middle', text: show(tick) })
        ])
      ),
      ...plot.bars.flatMap((bar, i) => {
        const x = left + slot * i + (slot - width) / 2;
        const top1 = sy(bar.value);
        const top2 = sy(bar.value + bar.stack.value);
        return [
          svgEl('rect', { x, y: top1, width, height: Math.max(0, sy(yr.min) - top1), class: 'sim-bar', style: { fill: tone(bar.tone) } }),
          svgEl('rect', { x, y: top2, width, height: Math.max(0, top1 - top2), class: 'sim-bar sim-bar--stack', style: { fill: tone(bar.stack.tone) } }),
          width > 22 ? svgEl('text', { x: x + width / 2, y: top1 + 16, 'text-anchor': 'middle', class: 'sim-bar-inner', text: show(bar.value) }) : null,
          width > 22 ? svgEl('text', { x: x + width / 2, y: top2 + 16, 'text-anchor': 'middle', class: 'sim-bar-inner', text: show(bar.stack.value) }) : null,
          svgEl('text', { x: x + width / 2, y: bottom + 20, 'text-anchor': 'middle', class: 'chart-axis-label', text: bar.label })
        ];
      }),
      plot.baseline !== undefined ? svgEl('line', { x1: left, x2: right, y1: sy(plot.baseline), y2: sy(plot.baseline), class: 'sim-guide' }) : null,
      svgEl('line', { x1: left, x2: right, y1: bottom, y2: bottom, class: 'sim-axis' })
    ];
    return el('div.sim-figure', {}, [svgRoot(plot.summary, children), plot.legend ? legendOf(plot.legend) : null]);
  }

  const children = [
    ...yr.ticks.map((tick) =>
      svgEl('g', {}, [
        svgEl('line', { x1: left, x2: right, y1: sy(tick), y2: sy(tick), class: 'chart-gridline' }),
        svgEl('text', { x: left - 8, y: sy(tick), class: 'chart-axis-label', 'text-anchor': 'end', 'dominant-baseline': 'middle', text: show(tick) })
      ])
    ),
    ...plot.bars.flatMap((bar, i) => {
      const x = left + slot * i + (slot - width) / 2;
      return [
        svgEl('rect', { x, y: sy(bar.value), width, height: Math.max(0, sy(yr.min) - sy(bar.value)), rx: 6, class: 'sim-bar', style: { fill: tone(bar.tone) } }),
        svgEl('text', { x: x + width / 2, y: sy(bar.value) - 8, 'text-anchor': 'middle', class: 'sim-bar-value', text: show(bar.value) }),
        svgEl('text', { x: x + width / 2, y: bottom + 20, 'text-anchor': 'middle', class: 'chart-axis-label', text: bar.label })
      ];
    }),
    plot.baseline !== undefined ? svgEl('line', { x1: left, x2: right, y1: sy(plot.baseline), y2: sy(plot.baseline), class: 'sim-guide' }) : null,
    svgEl('line', { x1: left, x2: right, y1: bottom, y2: bottom, class: 'sim-axis' })
  ];
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children)]);
}

function clockPlot(plot) {
  const size = 320;
  const c = size / 2;
  const r = 140;
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const outer = pointOnCircle(c, c, r, i * 6);
    const inner = pointOnCircle(c, c, i % 5 === 0 ? r - 14 : r - 7, i * 6);
    return svgEl('line', { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, class: i % 5 === 0 ? 'sim-clock-tick sim-clock-tick--hour' : 'sim-clock-tick' });
  });
  const numbers = Array.from({ length: 12 }, (_, i) => {
    const p = pointOnCircle(c, c, r - 32, (i + 1) * 30);
    return svgEl('text', { x: p.x, y: p.y, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'sim-clock-number', text: String(i + 1) });
  });
  // Shade the smaller angle between the two hands.
  const from = plot.hourAngle;
  const sweep = (plot.minuteAngle - from + 360) % 360;
  const [start, end] = sweep <= 180 ? [from, from + sweep] : [plot.minuteAngle, plot.minuteAngle + (360 - sweep)];
  const hand = (angle, length, className) => {
    const tip = pointOnCircle(c, c, length, angle);
    return svgEl('line', { x1: c, y1: c, x2: tip.x, y2: tip.y, class: className });
  };
  const children = [
    svgEl('circle', { cx: c, cy: c, r, class: 'sim-clock-face' }),
    end - start > 0.01 ? svgEl('path', { d: pieSectorPath(c, c, 70, start, end), class: 'sim-clock-angle' }) : null,
    ...ticks,
    ...numbers,
    hand(plot.hourAngle, 78, 'sim-clock-hand sim-clock-hand--hour'),
    hand(plot.minuteAngle, 118, 'sim-clock-hand sim-clock-hand--minute'),
    svgEl('circle', { cx: c, cy: c, r: 6, class: 'sim-clock-pin' })
  ];
  return el('div.sim-figure.sim-figure--square', {}, [svgRoot(plot.summary, children, { width: size, height: size })]);
}

function seesawPlot(plot) {
  const left = 50;
  const right = W - 50;
  const beamY = 190;
  const { min, max } = plot.beam;
  const sx = (value) => left + ((value - min) / (max - min)) * (right - left);
  const largest = Math.max(...plot.weights.map((w) => w.amount));
  const children = [
    // The beam and its scale
    svgEl('line', { x1: left, x2: right, y1: beamY, y2: beamY, class: 'sim-beam' }),
    ...Array.from({ length: 11 }, (_, i) => {
      const value = min + ((max - min) * i) / 10;
      return svgEl('g', {}, [
        svgEl('line', { x1: sx(value), x2: sx(value), y1: beamY, y2: beamY + 8, class: 'sim-axis' }),
        svgEl('text', { x: sx(value), y: beamY + 24, 'text-anchor': 'middle', class: 'chart-axis-label', text: show(value) })
      ]);
    }),
    svgEl('text', { x: (left + right) / 2, y: H - 8, 'text-anchor': 'middle', class: 'sim-axis-title', text: plot.beam.label }),
    // Distances from each weight to the balance point
    ...plot.weights.map((weight, i) => {
      const y = beamY - 128 - i * 22;
      return svgEl('g', { class: 'sim-distance' }, [
        svgEl('line', { x1: sx(weight.position), x2: sx(plot.pivot), y1: y, y2: y, class: 'sim-guide', style: { stroke: tone(weight.tone) } }),
        svgEl('text', {
          x: (sx(weight.position) + sx(plot.pivot)) / 2,
          y: y - 6,
          'text-anchor': 'middle',
          class: 'sim-guide-label',
          text: `${show(Math.abs(weight.position - plot.pivot))}`
        })
      ]);
    }),
    // The weights, sized by amount
    ...plot.weights.map((weight) => {
      const side = 26 + 64 * Math.sqrt(weight.amount / largest);
      const x = sx(weight.position) - side / 2;
      return svgEl('g', {}, [
        svgEl('rect', { x, y: beamY - side - 4, width: side, height: side, rx: 6, class: 'sim-weight', style: { fill: tone(weight.tone) } }),
        svgEl('text', { x: sx(weight.position), y: beamY - side - 12, 'text-anchor': 'middle', class: 'sim-marker-label', text: weight.label })
      ]);
    }),
    // The balance point
    svgEl('path', {
      d: `M ${sx(plot.pivot)} ${beamY + 2} L ${sx(plot.pivot) - 16} ${beamY + 40} L ${sx(plot.pivot) + 16} ${beamY + 40} Z`,
      class: 'sim-pivot'
    }),
    svgEl('text', { x: sx(plot.pivot), y: beamY + 58, 'text-anchor': 'middle', class: 'sim-marker-label', text: `Mixture ${show(plot.pivot)}%` })
  ];
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children)]);
}

/** A tank with its water level, inlet pipes on top and a drain at the bottom. */
function tankPlot(plot) {
  const x = 170;
  const y = 50;
  const w = 220;
  const h = 230;
  const waterTop = y + h * (1 - plot.level);
  const inlet = (pipe, i) => {
    const px = x + 50 + i * 120;
    return svgEl('g', { class: pipe.open ? 'sim-pipe' : 'sim-pipe sim-pipe--closed' }, [
      svgEl('rect', { x: px - 8, y: 8, width: 16, height: y - 4, rx: 3 }),
      pipe.open ? svgEl('path', { d: `M ${px} ${y + 6} l -7 -10 h 14 Z`, class: 'sim-flow' }) : null,
      svgEl('text', { x: px, y: 22, 'text-anchor': i ? 'start' : 'end', dx: i ? 14 : -14, class: 'sim-marker-label', text: pipe.label })
    ]);
  };
  const children = [
    svgEl('rect', { x, y: waterTop, width: w, height: y + h - waterTop, class: 'sim-water' }),
    svgEl('path', { d: `M ${x} ${y} V ${y + h} H ${x + w} V ${y}`, class: 'sim-tank' }),
    ...[0.25, 0.5, 0.75].map((f) =>
      svgEl('g', {}, [
        svgEl('line', { x1: x + w, x2: x + w + 10, y1: y + h * (1 - f), y2: y + h * (1 - f), class: 'sim-axis' }),
        svgEl('text', { x: x + w + 14, y: y + h * (1 - f), 'dominant-baseline': 'middle', class: 'chart-axis-label', text: `${f * 100}%` })
      ])
    ),
    ...plot.inlets.map(inlet),
    svgEl('g', { class: plot.outlet.open ? 'sim-pipe' : 'sim-pipe sim-pipe--closed' }, [
      svgEl('rect', { x: x + w - 60, y: y + h, width: 16, height: 26, rx: 3 }),
      plot.outlet.open ? svgEl('path', { d: `M ${x + w - 52} ${y + h + 40} l -7 -10 h 14 Z`, class: 'sim-flow' }) : null,
      svgEl('text', { x: x + w - 30, y: y + h + 22, class: 'sim-marker-label', text: plot.outlet.label })
    ]),
    svgEl('text', { x: x + w / 2, y: Math.min(waterTop + 26, y + h - 10), 'text-anchor': 'middle', class: 'sim-water-label', text: plot.caption })
  ];
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children)]);
}

/** A train drawn to scale against a pole, a platform or another train, with the distance it must cover. */
function trackPlot(plot) {
  const left = 30;
  const right = W - 30;
  const otherLength = plot.other.length || 0;
  const total = plot.train.length + otherLength;
  const scale = (right - left) / Math.max(total, 1);
  const railY = 210;
  const trainX = left;
  const trainW = plot.train.length * scale;
  const otherX = trainX + trainW;
  const car = (x, width, y, className, label) =>
    svgEl('g', {}, [
      svgEl('rect', { x, y, width, height: 34, rx: 8, class: className }),
      svgEl('text', { x: x + width / 2, y: y - 10, 'text-anchor': 'middle', class: 'sim-marker-label', text: label })
    ]);
  const children = [
    svgEl('line', { x1: 10, x2: W - 10, y1: railY, y2: railY, class: 'sim-rail' }),
    plot.other.kind === 'train' ? svgEl('line', { x1: 10, x2: W - 10, y1: railY - 62, y2: railY - 62, class: 'sim-rail' }) : null,
    car(trainX, trainW, railY - 38, 'sim-train', plot.train.label),
    plot.other.kind === 'pole'
      ? svgEl('g', {}, [
          svgEl('rect', { x: otherX - 3, y: railY - 90, width: 6, height: 90, class: 'sim-pole' }),
          svgEl('text', { x: otherX + 8, y: railY - 80, class: 'sim-marker-label', text: plot.other.label })
        ])
      : plot.other.kind === 'platform'
        ? svgEl('g', {}, [
            svgEl('rect', { x: otherX, y: railY + 4, width: otherLength * scale, height: 24, rx: 4, class: 'sim-platform' }),
            svgEl('text', { x: otherX + (otherLength * scale) / 2, y: railY + 50, 'text-anchor': 'middle', class: 'sim-marker-label', text: plot.other.label })
          ])
        : car(otherX, otherLength * scale, railY - 100, 'sim-train sim-train--other', plot.other.label),
    // The distance to cover: from the train's back to the far end of what it crosses.
    svgEl('line', { x1: trainX, x2: trainX + total * scale, y1: 90, y2: 90, class: 'sim-measure' }),
    svgEl('line', { x1: trainX, x2: trainX, y1: 82, y2: 98, class: 'sim-measure' }),
    svgEl('line', { x1: trainX + total * scale, x2: trainX + total * scale, y1: 82, y2: 98, class: 'sim-measure' }),
    svgEl('text', { x: (trainX + trainX + total * scale) / 2, y: 76, 'text-anchor': 'middle', class: 'sim-measure-label', text: `Distance to cover: ${show(plot.distance)} m` })
  ];
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children, { height: 280 })]);
}

/** A number line with the solution set shaded and an open or filled boundary dot. */
function numberLinePlot(plot) {
  const left = 40;
  const right = W - 40;
  const y = 110;
  const sx = (v) => left + ((v - plot.min) / (plot.max - plot.min)) * (right - left);
  const ticks = Array.from({ length: plot.max - plot.min + 1 }, (_, i) => plot.min + i);
  const inRange = plot.boundary !== undefined && plot.boundary >= plot.min && plot.boundary <= plot.max;
  const bx = plot.boundary === undefined ? null : sx(Math.max(plot.min, Math.min(plot.max, plot.boundary)));
  let shaded = null;
  if (plot.shade === 'all') shaded = [left, right];
  else if (plot.shade === 'left') shaded = [left, bx];
  else if (plot.shade === 'right') shaded = [bx, right];
  const children = [
    svgEl('line', { x1: left - 20, x2: right + 20, y1: y, y2: y, class: 'sim-axis' }),
    ...ticks.map((v) =>
      svgEl('g', {}, [
        svgEl('line', { x1: sx(v), x2: sx(v), y1: y - (v % 5 === 0 ? 9 : 5), y2: y + (v % 5 === 0 ? 9 : 5), class: 'sim-axis' }),
        v % 2 === 0 ? svgEl('text', { x: sx(v), y: y + 30, 'text-anchor': 'middle', class: 'chart-axis-label', text: show(v) }) : null
      ])
    ),
    shaded && shaded[1] > shaded[0] ? svgEl('line', { x1: shaded[0], x2: shaded[1], y1: y, y2: y, class: 'sim-solution' }) : null,
    plot.shade === 'left' ? svgEl('path', { d: `M ${left - 18} ${y} l 12 -8 v 16 Z`, class: 'sim-solution-arrow' }) : null,
    plot.shade === 'right' ? svgEl('path', { d: `M ${right + 18} ${y} l -12 -8 v 16 Z`, class: 'sim-solution-arrow' }) : null,
    inRange ? svgEl('circle', { cx: bx, cy: y, r: 8, class: plot.closed ? 'sim-dot-closed' : 'sim-dot-open' }) : null,
    plot.label ? svgEl('text', { x: inRange ? bx : (left + right) / 2, y: y - 22, 'text-anchor': 'middle', class: 'sim-measure-label', text: plot.label }) : null,
    plot.shade === 'none' ? svgEl('text', { x: (left + right) / 2, y: y - 22, 'text-anchor': 'middle', class: 'sim-measure-label', text: 'No solution' }) : null,
    plot.shade === 'all' ? svgEl('text', { x: (left + right) / 2, y: y - 22, 'text-anchor': 'middle', class: 'sim-measure-label', text: 'Every number' }) : null
  ];
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children, { height: 170 })]);
}

/** Fit a set of points into a box, keeping the shape (y grows upwards in the data). */
function fitter(points, box) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const width = Math.max(...xs) - Math.min(...xs) || 1;
  const height = Math.max(...ys) - Math.min(...ys) || 1;
  const k = Math.min(box.width / width, box.height / height);
  const offX = box.x + (box.width - width * k) / 2 - Math.min(...xs) * k;
  const offY = box.y + (box.height + height * k) / 2 + Math.min(...ys) * k;
  return ([x, y]) => [offX + x * k, offY - y * k];
}

function triangleSvg(plot) {
  if (!plot.valid) return el('div.sim-figure.sim-figure--empty', {}, [el('p.text-muted', { text: plot.summary })]);
  const map = fitter(plot.points, { x: 70, y: 40, width: W - 140, height: H - 90 });
  const pts = plot.points.map(map);
  const centre = [(pts[0][0] + pts[1][0] + pts[2][0]) / 3, (pts[0][1] + pts[1][1] + pts[2][1]) / 3];
  const children = [
    svgEl('polygon', { points: pts.map((p) => p.join(',')).join(' '), class: 'sim-shape' }),
    ...pts.map((p, i) => {
      // Labels sit just outside each corner, angles just inside.
      const out = [p[0] + (p[0] - centre[0]) * 0.12, p[1] + (p[1] - centre[1]) * 0.12];
      const inside = [p[0] + (centre[0] - p[0]) * 0.28, p[1] + (centre[1] - p[1]) * 0.28];
      return svgEl('g', {}, [
        svgEl('circle', { cx: p[0], cy: p[1], r: 5, class: 'sim-vertex' }),
        svgEl('text', { x: out[0], y: out[1], 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'sim-vertex-label', text: plot.labels[i] }),
        svgEl('text', { x: inside[0], y: inside[1], 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'sim-angle-label', text: `${show(plot.angles[i])}°` })
      ]);
    })
  ];
  if (plot.right >= 0) {
    const p = pts[plot.right];
    const a = pts[(plot.right + 1) % 3];
    const b = pts[(plot.right + 2) % 3];
    const unit = (q) => {
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      return [((q[0] - p[0]) / d) * 16, ((q[1] - p[1]) / d) * 16];
    };
    const u = unit(a);
    const v = unit(b);
    children.push(svgEl('path', { d: `M ${p[0] + u[0]} ${p[1] + u[1]} L ${p[0] + u[0] + v[0]} ${p[1] + u[1] + v[1]} L ${p[0] + v[0]} ${p[1] + v[1]}`, class: 'sim-right-mark' }));
  }
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children)]);
}

function circleSvg(plot) {
  const size = 340;
  const c = size / 2;
  const r = 130;
  const at = ([x, y]) => [c + x * r, c - y * r];
  const [A, B, P] = [plot.a, plot.b, plot.p].map(at);
  const arc = (from, to) => {
    const s = pointOnCircle(c, c, r, from);
    const e = pointOnCircle(c, c, r, to);
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
  };
  const label = (point, text, push = 18) => {
    const d = Math.hypot(point[0] - c, point[1] - c) || 1;
    return svgEl('text', {
      x: point[0] + ((point[0] - c) / d) * push,
      y: point[1] + ((point[1] - c) / d) * push,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      class: 'sim-vertex-label',
      text
    });
  };
  const children = [
    svgEl('circle', { cx: c, cy: c, r, class: 'sim-circle' }),
    svgEl('path', { d: arc(plot.arcFrom, plot.arcTo), class: 'sim-arc' }),
    svgEl('line', { x1: c, y1: c, x2: A[0], y2: A[1], class: 'sim-radius' }),
    svgEl('line', { x1: c, y1: c, x2: B[0], y2: B[1], class: 'sim-radius' }),
    plot.showP ? svgEl('line', { x1: P[0], y1: P[1], x2: A[0], y2: A[1], class: 'sim-chord' }) : null,
    plot.showP ? svgEl('line', { x1: P[0], y1: P[1], x2: B[0], y2: B[1], class: 'sim-chord' }) : null,
    svgEl('circle', { cx: c, cy: c, r: 4, class: 'sim-vertex' }),
    svgEl('text', { x: c + 8, y: c - 8, class: 'sim-vertex-label', text: 'O' }),
    ...[[A, 'A'], [B, 'B']].map(([pt, name]) => svgEl('g', {}, [svgEl('circle', { cx: pt[0], cy: pt[1], r: 5, class: 'sim-vertex' }), label(pt, name)])),
    plot.showP ? svgEl('g', {}, [svgEl('circle', { cx: P[0], cy: P[1], r: 6, class: 'sim-vertex sim-vertex--p' }), label(P, 'P')]) : null
  ];
  return el('div.sim-figure.sim-figure--square', {}, [svgRoot(plot.summary, children, { width: size, height: size })]);
}

function polygonSvg(plot) {
  const size = 340;
  const c = size / 2;
  const r = 130;
  // A flat base: rotate so that one side is horizontal at the bottom.
  const start = 180 + 180 / plot.n;
  const pts = Array.from({ length: plot.n }, (_, i) => {
    const p = pointOnCircle(c, c, r, start + (360 * i) / plot.n);
    return [p.x, p.y];
  });
  const diagonals = [];
  if (plot.diagonals) {
    for (let i = 0; i < plot.n; i++) {
      for (let j = i + 2; j < plot.n; j++) {
        if (i === 0 && j === plot.n - 1) continue;
        diagonals.push(svgEl('line', { x1: pts[i][0], y1: pts[i][1], x2: pts[j][0], y2: pts[j][1], class: 'sim-diagonal' }));
      }
    }
  }
  // The exterior angle at the first corner: extend the side from the last corner.
  const [p0, pLast, p1] = [pts[0], pts[plot.n - 1], pts[1]];
  const dir = [p0[0] - pLast[0], p0[1] - pLast[1]];
  const len = Math.hypot(...dir);
  const ext = [p0[0] + (dir[0] / len) * 70, p0[1] + (dir[1] / len) * 70];
  const children = [
    ...diagonals,
    svgEl('polygon', { points: pts.map((p) => p.join(',')).join(' '), class: 'sim-shape' }),
    svgEl('line', { x1: p0[0], y1: p0[1], x2: ext[0], y2: ext[1], class: 'sim-guide' }),
    // The label sits between the extended side and the next side, where the exterior angle is.
    (() => {
      const toNext = [p1[0] - p0[0], p1[1] - p0[1]];
      const nextLen = Math.hypot(...toNext);
      const mid = [dir[0] / len + toNext[0] / nextLen, dir[1] / len + toNext[1] / nextLen];
      const midLen = Math.hypot(...mid) || 1;
      return svgEl('text', {
        x: p0[0] + (mid[0] / midLen) * 38,
        y: p0[1] + (mid[1] / midLen) * 38,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        class: 'sim-angle-label',
        text: `${show(plot.exterior, 1)}°`
      });
    })(),
    ...pts.map((p) => svgEl('circle', { cx: p[0], cy: p[1], r: 3.5, class: 'sim-vertex' })),
    svgEl('text', { x: c, y: c, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'sim-angle-label', text: `each ${show(plot.interior, 1)}°` })
  ];
  return el('div.sim-figure.sim-figure--square', {}, [svgRoot(plot.summary, children, { width: size, height: size })]);
}

/** One or more rows of values as dots on a common scale, with vertical lines for averages. */
function dotPlot(plot) {
  const left = 60;
  const right = W - 30;
  const rowGap = 90;
  const top = 50;
  const height = top + plot.rows.length * rowGap + 30;
  const sx = (v) => left + ((v - plot.min) / (plot.max - plot.min)) * (right - left);
  const ticks = niceRange(plot.min, plot.max).ticks.filter((t) => t >= plot.min && t <= plot.max);
  const axisY = top + plot.rows.length * rowGap - 30;
  const children = [
    svgEl('line', { x1: left, x2: right, y1: axisY, y2: axisY, class: 'sim-axis' }),
    ...ticks.map((t) => svgEl('text', { x: sx(t), y: axisY + 22, 'text-anchor': 'middle', class: 'chart-axis-label', text: show(t) })),
    ...plot.rows.flatMap((row, r) => {
      const y = top + r * rowGap + 20;
      const seen = new Map();
      return [
        svgEl('text', { x: left - 10, y, 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'chart-axis-label', text: row.label }),
        ...row.values.map((v) => {
          // Equal values stack upwards so none hides another.
          const count = seen.get(v) || 0;
          seen.set(v, count + 1);
          return svgEl('circle', { cx: sx(v), cy: y - count * 18, r: 8, class: 'sim-data-dot', style: { fill: tone(row.tone) } });
        })
      ];
    }),
    ...(plot.lines || []).map((line, i) => {
      const x = sx(line.value);
      return svgEl('g', {}, [
        svgEl('line', { x1: x, x2: x, y1: top - 30, y2: axisY, class: 'sim-stat-line', style: { stroke: tone(line.tone) } }),
        svgEl('text', { x: x + 6, y: top - 18 + i * 16, class: 'sim-marker-label', text: line.label })
      ]);
    })
  ];
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children, { height })]);
}

/**
 * Solids side by side at one shared scale, so their sizes compare truly:
 * `{ kind: 'solids', items: [{ label, caption, tone, parts }], summary }`
 * (each `parts` list as in a `figure.type: 'solid'`). With `fit: true` the picture is only as
 * tall as the solids need at that scale, so wide, low solids leave no empty band above.
 */
function solidsPlot(plot) {
  const drawings = plot.items.map((item) => solidDrawing({ type: 'solid', parts: item.parts }));
  const box = (d) => {
    const pts = d.lines.flatMap((l) => l.pts);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  };
  const boxes = drawings.map(box);
  const cellW = W / plot.items.length;
  const top = 20;
  const scale = Math.min(
    ...boxes.map((b) => (cellW - 40) / (b.maxX - b.minX || 1)),
    ...boxes.map((b) => (H - 56 - top) / (b.maxY - b.minY || 1))
  );
  const tallest = Math.max(...boxes.map((b) => (b.maxY - b.minY) * scale));
  const height = plot.fit ? Math.min(H, Math.max(170, Math.ceil(top + tallest + 56))) : H;
  const bottom = height - 56;
  const children = drawings.flatMap((d, i) => {
    const b = boxes[i];
    const cx = cellW * i + cellW / 2;
    const sx = (x) => cx + (x - (b.minX + b.maxX) / 2) * scale;
    const sy = (y) => bottom - (y - b.minY) * scale;
    const pts = (list) => list.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ');
    const item = plot.items[i];
    return [
      ...d.fills.map((f) => svgEl('polygon', { points: pts(f), class: 'solid-face', style: { fill: tone(item.tone), fillOpacity: 0.18 } })),
      ...d.lines.map((l) => svgEl('polyline', { points: pts(l.pts), class: `solid-edge${l.dashed ? ' solid-edge--hidden' : ''}`, style: l.dashed ? {} : { stroke: tone(item.tone) } })),
      svgEl('text', { x: cx, y: height - 32, 'text-anchor': 'middle', class: 'sim-marker-label', text: item.label }),
      item.caption ? svgEl('text', { x: cx, y: height - 14, 'text-anchor': 'middle', class: 'sim-marker-label', text: item.caption }) : null
    ];
  });
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children, { height })]);
}

/**
 * Labelled rectangles in a grid space: area models ((a + b)² as four pieces),
 * bar models (a total split in a ratio), tilings (the largest square tile).
 * `{ kind: 'rects', width, height, rects: [{ x, y, w, h, label, tone, dashed, faint }],
 *   notes: [{ x, y, text }], summary }` with x to the right and y downwards, in any
 * units; everything is scaled together, so sizes compare truly.
 */
function rectsPlot(plot) {
  const pad = { left: 30, right: 30, top: 24, bottom: 34 };
  const scale = Math.min((W - pad.left - pad.right) / plot.width, (H - pad.top - pad.bottom) / plot.height);
  const offX = pad.left + (W - pad.left - pad.right - plot.width * scale) / 2;
  const offY = pad.top + (H - pad.top - pad.bottom - plot.height * scale) / 2;
  const sx = (x) => offX + x * scale;
  const sy = (y) => offY + y * scale;
  const children = (plot.rects || []).flatMap((r) => {
    const x = sx(r.x);
    const y = sy(r.y);
    const w = r.w * scale;
    const h = r.h * scale;
    const nodes = [
      svgEl('rect', {
        x,
        y,
        width: w,
        height: h,
        class: `sim-rect${r.dashed ? ' sim-rect--dashed' : ''}`,
        style: { fill: tone(r.tone), fillOpacity: r.faint ? 0.1 : 0.28, stroke: tone(r.tone) }
      })
    ];
    // A label only where it fits; small pieces stay unlabelled rather than overflow.
    if (r.label && w >= 7 * r.label.length + 6 && h >= 18) {
      nodes.push(svgEl('text', { x: x + w / 2, y: y + h / 2, class: 'sim-rect-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: r.label }));
    }
    return nodes;
  });
  for (const n of plot.notes || []) {
    children.push(svgEl('text', { x: sx(n.x), y: sy(n.y), class: 'sim-marker-label', 'text-anchor': n.anchor || 'middle', text: n.text }));
  }
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children), plot.legend ? legendOf(plot.legend) : null]);
}

/** A two- or three-set Venn diagram, drawn like the figures in questions. */
function vennPlot(plot) {
  const svg = renderVenn({ type: 'venn', sets: plot.sets, universe: plot.universe, regions: plot.regions });
  if (svg) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', plot.summary || '');
    svg.removeAttribute('aria-hidden');
  }
  return el('div.sim-figure', {}, [svg || el('p.text-muted', { text: plot.summary || '' })]);
}

/** A bar, line or pie chart drawn the way DI questions draw theirs, so the simulation reads like the exam. */
function chartPlot(plot) {
  return el('div.sim-figure.sim-figure--chart', {}, [chartWidget({ ...plot.chart, ariaSummary: plot.summary })]);
}

/**
 * A real table (so screen readers can walk it): `{ kind: 'table', caption, corner,
 * columns, rows: [{ label, total?, cells: [{ text, note?, heat }] }], baseColumn,
 * focusColumn, focusRow, summary }`. `heat` from −1 to 1 tints a cell red or
 * green; the sign is always in the text too, so colour is never the only cue.
 * A cell's `kind` ('given', 'derived' or 'blank') and `fresh` style it as a
 * caselet fills in; its note says the same in words.
 */
function tablePlot(plot) {
  const columnClass = (j) => [j === plot.baseColumn ? 'is-base' : '', j === plot.focusColumn ? 'is-focus' : ''].join(' ');
  const tint = (heat) => {
    if (!heat) return {};
    const strength = Math.round(Math.min(1, Math.abs(heat)) * 38) + 8;
    return { background: `color-mix(in srgb, var(${heat > 0 ? '--success' : '--danger'}) ${strength}%, transparent)` };
  };
  const table = el('table.data-table.sim-table', {}, [
    plot.caption ? el('caption', { text: plot.caption }) : null,
    el('thead', {}, [
      el('tr', {}, [
        el('th', { attrs: { scope: 'col' }, text: plot.corner || '' }),
        ...plot.columns.map((column, j) =>
          el('th', { class: columnClass(j), attrs: { scope: 'col' } }, [column, j === plot.baseColumn ? el('span.sim-table__tag', { text: 'base' }) : null])
        )
      ])
    ]),
    el(
      'tbody',
      {},
      plot.rows.map((row, i) =>
        el('tr', { class: [i === plot.focusRow ? 'is-focus' : '', row.total ? 'is-total' : ''].join(' ') }, [
          el('th', { attrs: { scope: 'row' }, text: row.label }),
          ...row.cells.map((cell, j) =>
            el('td', { class: [columnClass(j), cell.kind ? `is-${cell.kind}` : '', cell.fresh ? 'is-fresh' : ''].join(' '), style: tint(cell.heat) }, [
              cell.text,
              cell.note ? el('span.sim-table__note', { text: cell.note }) : null
            ])
          )
        ])
      )
    )
  ]);
  return el('div.sim-figure.sim-figure--table', {}, [el('div.data-table-wrap', {}, [table]), el('p.sr-only', { text: plot.summary })]);
}

/**
 * Every candidate answer from `min` to `max` as a dot, one row per condition:
 * `{ kind: 'candidates', min, max, title, rows: [{ label, values, on, tone, result }],
 * badge, summary }`. A value a row allows is a full dot; one it rules out is a
 * speck. A row that is switched off is drawn faint.
 */
function candidatesPlot(plot) {
  const left = 28;
  const right = W - 28;
  const top = 72;
  const gap = 66;
  const count = plot.max - plot.min;
  const sx = (v) => left + ((v - plot.min) / count) * (right - left);
  const values = Array.from({ length: count + 1 }, (_, i) => plot.min + i);
  const height = top + plot.rows.length * gap + 4;
  const rows = plot.rows.flatMap((row, r) => {
    const y = top + r * gap;
    const allowed = new Set(row.values);
    const on = row.on !== false;
    return [
      svgEl('g', { class: `sim-candidates-row${on ? '' : ' is-off'}${row.result ? ' is-result' : ''}` }, [
        svgEl('text', { x: left - 6, y: y - 18, class: 'sim-marker-label', text: on ? row.label : `${row.label} (off)` }),
        svgEl('line', { x1: left, x2: right, y1: y, y2: y, class: 'sim-candidates-track' }),
        ...values.map((v) =>
          allowed.has(v)
            ? svgEl('circle', { cx: sx(v), cy: y, r: row.result ? 8 : 6.5, class: 'sim-data-dot', style: { fill: tone(row.tone) } })
            : svgEl('circle', { cx: sx(v), cy: y, r: 2.5, class: 'sim-candidate-out' })
        )
      ]),
      row.result ? values.filter((v) => v % 2 === 0).map((v) => svgEl('text', { x: sx(v), y: y + 28, 'text-anchor': 'middle', class: 'chart-axis-label', text: show(v) })) : null
    ];
  });
  const badge = plot.badge
    ? svgEl('g', { class: 'sim-badge' }, [
        svgEl('rect', { x: W - 150, y: 8, width: 142, height: 30, rx: 15 }),
        svgEl('text', { x: W - 79, y: 23, 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: plot.badge })
      ])
    : null;
  const children = [svgEl('text', { x: left - 6, y: 27, class: 'sim-measure-label', text: plot.title }), badge, ...rows];
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children, { height: height + 18 })]);
}

/**
 * A flat geometry figure in model units (x to the right, y up), fitted into the
 * picture at one scale for both axes, so angles and lengths look true:
 *
 *   { kind: 'geometry', view: { xMin, xMax, yMin, yMax }, height?, items, legend?, summary }
 *
 * Items, drawn in order:
 *   segment  { from, to, tone?, dashed?, thin? }
 *   polygon  { points, tone?, fill? (opacity, default 0.16), dashed? }
 *   circle   { center, r, tone?, fill?, dashed? }
 *   region   { outer, holes, tone? }  shaded: the outer shape minus the holes; a shape is
 *            { rect: [x, y, w, h] } (x, y its lower-left corner) or { circle: [cx, cy, r] }
 *   angle    { at, from, to, tone, radius? (px) }  a sector turning anticlockwise from the
 *            direction `from` to `to`, in degrees from the positive x-axis
 *   right    { at, a, b }  a right-angle mark at `at` between the rays towards a and b
 *   ticks    { from, to, count }  equal-length marks;  arrows { from, to, count }  parallel marks
 *   point    { at }
 *   label    { at, text, dx?, dy? (px), anchor?, tone?, strong? }
 */
function geometryPlot(plot) {
  const width = W;
  const height = plot.height || H;
  const pad = 18;
  const { view } = plot;
  const t = makeTransform([view.xMin, view.xMax], [view.yMin, view.yMax], { left: pad, top: pad, width: width - 2 * pad, height: height - 2 * pad });
  const at = ([x, y]) => [t.toX(x), t.toY(y)];
  const fixed = (v) => v.toFixed(1);
  const pts = (list) => list.map((p) => at(p).map(fixed).join(',')).join(' ');
  const xy = (p) => ({ x: p[0], y: p[1] });
  const shapePath = (shape) => {
    if (shape.rect) {
      const [x, y, w, h] = shape.rect;
      const [x0, y0] = at([x, y + h]);
      return `M ${fixed(x0)} ${fixed(y0)} h ${fixed(w * t.scale)} v ${fixed(h * t.scale)} h ${fixed(-w * t.scale)} Z`;
    }
    const [cx, cy, r] = shape.circle;
    const [sx, sy] = at([cx, cy]);
    return circlePath(sx, sy, r * t.scale);
  };
  const outline = (item) => ({
    ...(item.tone ? { stroke: tone(item.tone), fill: tone(item.tone) } : { fill: 'none' }),
    fillOpacity: item.fill ?? 0.16
  });
  const dashed = (item) => (item.dashed ? ' sim-geo-line--dashed' : '');

  const children = plot.items.map((item) => {
    if (item.type === 'segment') {
      const [x1, y1] = at(item.from);
      const [x2, y2] = at(item.to);
      return svgEl('line', {
        x1: fixed(x1),
        y1: fixed(y1),
        x2: fixed(x2),
        y2: fixed(y2),
        class: `sim-geo-line${dashed(item)}${item.thin ? ' sim-geo-line--thin' : ''}`,
        style: item.tone ? { stroke: tone(item.tone) } : {}
      });
    }
    if (item.type === 'polygon') return svgEl('polygon', { points: pts(item.points), class: `sim-geo-shape${dashed(item)}`, style: outline(item) });
    if (item.type === 'circle') {
      const [cx, cy] = at(item.center);
      return svgEl('circle', { cx: fixed(cx), cy: fixed(cy), r: fixed(item.r * t.scale), class: `sim-geo-shape${dashed(item)}`, style: outline(item) });
    }
    if (item.type === 'region') {
      return svgEl('path', { d: [item.outer, ...(item.holes || [])].map(shapePath).join(' '), class: 'sim-geo-region', style: { fill: tone(item.tone || 'geometry') } });
    }
    if (item.type === 'angle') {
      const [cx, cy] = at(item.at);
      const r = item.radius || 24;
      const end = (deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)];
      const [ax, ay] = end(item.from);
      const [bx, by] = end(item.to);
      // Anticlockwise on screen is SVG's sweep flag 0.
      return svgEl('path', {
        d: `M ${fixed(cx)} ${fixed(cy)} L ${fixed(ax)} ${fixed(ay)} A ${r} ${r} 0 ${item.to - item.from > 180 ? 1 : 0} 0 ${fixed(bx)} ${fixed(by)} Z`,
        class: 'sim-geo-angle',
        style: { fill: tone(item.tone), stroke: tone(item.tone) }
      });
    }
    if (item.type === 'right') {
      const marks = rightAngleMarkerPoints(xy(at(item.at)), xy(at(item.a)), xy(at(item.b)), 12);
      return svgEl('polyline', { points: marks.map((p) => `${fixed(p.x)},${fixed(p.y)}`).join(' '), class: 'sim-right-mark' });
    }
    if (item.type === 'ticks' || item.type === 'arrows') {
      const [a, b] = [xy(at(item.from)), xy(at(item.to))];
      const marks =
        item.type === 'ticks'
          ? tickMarkSegments(a, b, item.count).map((m) => svgEl('line', { x1: fixed(m.x1), y1: fixed(m.y1), x2: fixed(m.x2), y2: fixed(m.y2) }))
          : chevronPoints(a, b, item.count).map((c) => svgEl('polyline', { points: `${fixed(c.x1)},${fixed(c.y1)} ${fixed(c.x2)},${fixed(c.y2)} ${fixed(c.x3)},${fixed(c.y3)}` }));
      return svgEl('g', { class: 'sim-geo-mark' }, marks);
    }
    if (item.type === 'point') {
      const [cx, cy] = at(item.at);
      return svgEl('circle', { cx: fixed(cx), cy: fixed(cy), r: 4.5, class: 'sim-vertex' });
    }
    const [x, y] = at(item.at);
    return svgEl('text', {
      x: fixed(x + (item.dx || 0)),
      y: fixed(y + (item.dy || 0)),
      'text-anchor': item.anchor || 'middle',
      'dominant-baseline': 'middle',
      class: `sim-geo-label${item.strong ? ' sim-geo-label--strong' : ''}`,
      style: item.tone ? { fill: tone(item.tone) } : {},
      text: item.text
    });
  });
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children, { width, height }), plot.legend ? legendOf(plot.legend) : null]);
}

/** Several plots, one above the other (a shape and its graph): `{ kind: 'stack', plots, summary }`. */
function stackPlot(plot) {
  return el('div.sim-stack', {}, plot.plots.map(drawPlot));
}

/**
 * A wheel of n positions (0 at the top, clockwise) and a walk between them, for
 * remainders mod n: `{ kind: 'wheel', n, positions: [{ value, state }], path: [{ from, to, inCycle }], summary }`.
 * state is 'current', 'cycle', 'tail' or 'idle'; steps before the loop are dashed.
 */
function wheelPlot(plot) {
  const size = 340;
  const c = size / 2;
  const r = 122;
  const at = (value, radius = r) => pointOnCircle(c, c, radius, (360 * value) / plot.n);
  const stateTone = { current: 'data', cycle: 'arithmetic', tail: 'combinatorics' };
  const children = [
    svgEl('circle', { cx: c, cy: c, r, class: 'sim-circle' }),
    ...plot.path.map((step) => {
      const a = at(step.from);
      const b = at(step.to);
      return svgEl('line', {
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        class: 'sim-chord',
        style: { stroke: tone(step.inCycle ? 'arithmetic' : 'combinatorics'), strokeDasharray: step.inCycle ? 'none' : '6 5', strokeOpacity: '0.75' }
      });
    }),
    ...plot.positions.map((position) => {
      const p = at(position.value);
      const label = at(position.value, r + 22);
      const lit = position.state !== 'idle';
      return svgEl('g', {}, [
        svgEl('circle', {
          cx: p.x,
          cy: p.y,
          r: position.state === 'current' ? 10 : lit ? 7 : 4.5,
          class: lit ? null : 'sim-vertex',
          style: lit ? { fill: tone(stateTone[position.state]) } : { opacity: '0.45' }
        }),
        svgEl('text', { x: label.x, y: label.y, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: lit ? 'sim-vertex-label' : 'sim-angle-label', text: String(position.value) })
      ]);
    })
  ];
  return el('div.sim-figure.sim-figure--square', {}, [svgRoot(plot.summary, children, { width: size, height: size })]);
}

/**
 * Number lines sharing one scale, one row each:
 *   { kind: 'numberlines', min, max, step, labelStep, badge?, guides: [{ value, label? }],
 *     rows: [{ label, tone, empty?, bands: [{ from, to, tone, label? }],
 *              points: [{ value, label, tone, shape: 'dot' | 'ring' | 'diamond' | 'option' | 'runner', slot? }] }], summary }
 * A point's label sits in a slot, 'above' (the default), 'high', 'below' or 'low', so
 * labels that would collide are kept apart. Ticks every `step`, numbers every `labelStep`.
 */
function numberLinesPlot(plot) {
  const left = 34 + 11 * Math.max(...plot.rows.map((row) => row.label.length));
  const right = W - 34;
  const top = plot.badge ? 58 : 34;
  const gap = 116;
  const span = plot.max - plot.min || 1;
  const sx = (v) => left + ((Math.min(plot.max, Math.max(plot.min, v)) - plot.min) / span) * (right - left);
  const rowY = (i) => top + 46 + i * gap;
  const height = rowY(plot.rows.length - 1) + 76;
  const ticks = [];
  for (let v = plot.min; v <= plot.max + plot.step / 1000; v += plot.step) ticks.push(Number(v.toFixed(6)));
  const labelled = (v) => plot.labelStep && Math.abs(v / plot.labelStep - Math.round(v / plot.labelStep)) < 1e-6;
  const slotDy = { above: -17, high: -38, below: 44, low: 62 };
  const anchorAt = (x) => (x < left + 34 ? 'start' : x > right - 34 ? 'end' : 'middle');
  const shapeOf = (p, y) => {
    const x = sx(p.value);
    const fill = p.tone ? tone(p.tone) : 'var(--fg-muted)';
    if (p.shape === 'option') return svgEl('line', { x1: x, x2: x, y1: y - 13, y2: y + 13, class: 'sim-nl-option', style: { stroke: fill } });
    if (p.shape === 'ring') return svgEl('circle', { cx: x, cy: y, r: 7, class: 'sim-nl-ring', style: { stroke: fill } });
    if (p.shape === 'diamond') return svgEl('path', { d: `M ${x} ${y - 10} L ${x + 10} ${y} L ${x} ${y + 10} L ${x - 10} ${y} Z`, class: 'sim-data-dot', style: { fill } });
    return svgEl('circle', { cx: x, cy: y, r: p.shape === 'runner' ? 11 : 7.5, class: 'sim-data-dot', style: { fill } });
  };
  const rows = plot.rows.flatMap((row, i) => {
    const y = rowY(i);
    return [
      svgEl('text', { x: left - 16, y, 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'sim-nl-row', style: { fill: tone(row.tone) }, text: row.label }),
      svgEl('line', { x1: left, x2: right, y1: y, y2: y, class: 'sim-axis' }),
      ...ticks.map((v) =>
        svgEl('g', {}, [
          svgEl('line', { x1: sx(v), x2: sx(v), y1: y - (labelled(v) ? 7 : 4), y2: y + (labelled(v) ? 7 : 4), class: 'sim-axis' }),
          labelled(v) ? svgEl('text', { x: sx(v), y: y + 24, 'text-anchor': 'middle', class: 'chart-axis-label', text: show(v) }) : null
        ])
      ),
      ...(row.bands || []).flatMap((band) => {
        const x1 = sx(Math.min(band.from, band.to));
        const x2 = sx(Math.max(band.from, band.to));
        return [
          svgEl('rect', { x: x1, y: y - 8, width: Math.max(2, x2 - x1), height: 16, rx: 8, class: 'sim-nl-band', style: { fill: tone(band.tone) } }),
          band.label ? svgEl('text', { x: (x1 + x2) / 2, y: y + slotDy.high, 'text-anchor': anchorAt((x1 + x2) / 2), class: 'sim-marker-label', text: band.label }) : null
        ];
      }),
      ...(row.points || []).flatMap((p) => [
        shapeOf(p, y),
        p.label ? svgEl('text', { x: sx(p.value), y: y + slotDy[p.slot || 'above'], 'text-anchor': anchorAt(sx(p.value)), class: 'sim-nl-label', text: p.label }) : null
      ]),
      row.empty ? svgEl('text', { x: (left + right) / 2, y: y - 17, 'text-anchor': 'middle', class: 'sim-measure-label', text: row.empty }) : null
    ];
  });
  const lastY = rowY(plot.rows.length - 1);
  const guides = (plot.guides || []).map((g) =>
    svgEl('g', {}, [
      svgEl('line', { x1: sx(g.value), x2: sx(g.value), y1: top + 4, y2: lastY + 12, class: 'sim-guide' }),
      g.label ? svgEl('text', { x: sx(g.value), y: top - 2, 'text-anchor': anchorAt(sx(g.value)), class: 'sim-guide-label', text: g.label }) : null
    ])
  );
  const badgeWidth = plot.badge ? 26 + 8.4 * plot.badge.length : 0;
  const badge = plot.badge
    ? svgEl('g', { class: 'sim-badge' }, [
        svgEl('rect', { x: W - 8 - badgeWidth, y: 8, width: badgeWidth, height: 32, rx: 16 }),
        svgEl('text', { x: W - 8 - badgeWidth / 2, y: 24, 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: plot.badge })
      ])
    : null;
  return el('div.sim-figure', {}, [svgRoot(plot.summary, [...guides, ...rows, badge], { height })]);
}

/**
 * An expression worked one operation at a time:
 *   { kind: 'steps', lines: [{ note, tokens: [{ text, mark: 'next' | 'used' | 'done' | null }] }], result?, wrong?, summary }
 * The operation about to be done is marked 'next'; earlier lines show the one done
 * ('used') and where its result landed ('done').
 */
function stepsPlot(plot) {
  const last = plot.lines.length - 1;
  return el('div', { class: `sim-figure sim-steps${plot.wrong ? ' is-wrong' : ''}` }, [
    el(
      'ol.sim-steps__list',
      {},
      plot.lines.map((line, i) => {
        const nextAt = line.tokens.map((t) => t.mark).lastIndexOf('next');
        return el('li', { class: `sim-steps__line${i === last ? ' is-current' : ''}` }, [
          el('span.sim-steps__note', { text: line.note }),
          el(
            'span.sim-steps__expr',
            {},
            line.tokens.flatMap((token, j) => [
              token.mark === 'next'
                ? el('mark.sim-steps__token.is-next', { text: token.text })
                : el('span', { class: `sim-steps__token${token.mark ? ` is-${token.mark}` : ''}`, text: token.text }),
              j === nextAt ? el('span.sr-only', { text: ' (next)' }) : null
            ])
          )
        ]);
      })
    ),
    plot.result ? el('p.sim-steps__result', { text: plot.result }) : null
  ]);
}

/**
 * A tree of choices: `{ kind: 'tree', levels: [a label per depth], nodes: [{ depth, parent, tone, label }],
 * caption?, legend?, summary }`, nodes listed depth first (a parent before its children).
 * Leaves are spread evenly; a parent sits above the middle of its children.
 */
function treePlot(plot) {
  const { nodes } = plot;
  const kids = nodes.map(() => []);
  nodes.forEach((node, i) => {
    if (node.parent >= 0) kids[node.parent].push(i);
  });
  const leaves = nodes.map((_, i) => i).filter((i) => !kids[i].length);
  const deepest = Math.max(1, ...nodes.map((node) => node.depth));
  const left = 122;
  const right = W - 20;
  const top = 30;
  const bottom = H - 58;
  const slot = (right - left) / Math.max(1, leaves.length);
  const xs = new Array(nodes.length).fill(0);
  leaves.forEach((i, k) => {
    xs[i] = left + slot * (k + 0.5);
  });
  for (let i = nodes.length - 1; i >= 0; i--) if (kids[i].length) xs[i] = kids[i].reduce((total, k) => total + xs[k], 0) / kids[i].length;
  const ys = nodes.map((node) => top + (node.depth * (bottom - top)) / deepest);
  const r = Math.max(3, Math.min(9, slot * 0.3));
  const leafCount = (i) => (kids[i].length ? kids[i].reduce((total, k) => total + leafCount(k), 0) : 1);
  const children = [
    ...plot.levels.map((label, depth) =>
      svgEl('text', { x: 10, y: top + (depth * (bottom - top)) / deepest, 'dominant-baseline': 'middle', class: 'sim-marker-label', text: label })
    ),
    ...nodes.map((node, i) =>
      node.parent >= 0 ? svgEl('line', { x1: xs[node.parent], y1: ys[node.parent], x2: xs[i], y2: ys[i], class: 'sim-tree-edge', style: { stroke: tone(node.tone) } }) : null
    ),
    ...nodes.flatMap((node, i) => {
      const room = slot * leafCount(i);
      const isLeaf = !kids[i].length;
      const root = node.parent < 0;
      return [
        svgEl('circle', { cx: xs[i], cy: ys[i], r: root ? 7 : r, class: root ? 'sim-vertex' : 'sim-data-dot', style: root ? {} : { fill: tone(node.tone) } }),
        node.label && room >= 26
          ? svgEl('text', {
              x: isLeaf ? xs[i] : xs[i] + r + 4,
              y: isLeaf ? ys[i] + r + 15 : ys[i] - r - 2,
              'text-anchor': isLeaf ? 'middle' : 'start',
              class: 'sim-tree-label',
              text: node.label
            })
          : null
      ];
    }),
    plot.caption ? svgEl('text', { x: (left + right) / 2, y: H - 12, 'text-anchor': 'middle', class: 'sim-measure-label', text: plot.caption }) : null
  ];
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children), plot.legend ? legendOf(plot.legend) : null]);
}

const SET_LAYOUTS = {
  2: {
    circles: [
      { x: 212, y: 186, r: 128 },
      { x: 348, y: 186, r: 128 }
    ],
    names: [
      { x: 120, y: 38, anchor: 'middle' },
      { x: 440, y: 38, anchor: 'middle' }
    ]
  },
  3: {
    circles: [
      { x: 222, y: 150, r: 106 },
      { x: 338, y: 150, r: 106 },
      { x: 280, y: 246, r: 106 }
    ],
    names: [
      { x: 132, y: 36, anchor: 'middle' },
      { x: 428, y: 36, anchor: 'middle' },
      { x: 398, y: 336, anchor: 'start' }
    ]
  }
};

/**
 * Places each element ({ value, in: 'ab' }) on a grid point inside exactly the
 * circles its key names, nearest the middle of its region first. The grid is made
 * finer until every region has room. Returns { spacing, spots }, or null.
 */
export function placeSetElements(sets, elements, box = { width: W, height: 360 }) {
  const layout = SET_LAYOUTS[sets];
  const letters = 'abc';
  for (const spacing of [28, 24, 20, 17, 14, 12]) {
    const margin = spacing * 0.5;
    const free = new Map();
    for (let y = 22; y <= box.height - 18; y += spacing) {
      for (let x = 22; x <= box.width - 22; x += spacing) {
        let key = '';
        let clear = true;
        layout.circles.forEach((c, i) => {
          const d = Math.hypot(x - c.x, y - c.y);
          if (Math.abs(d - c.r) < margin) clear = false;
          else if (d < c.r) key += letters[i];
        });
        // Keep the empty region clear of the set names and the universe label.
        if (!key && (y < 54 || (y > box.height - 34 && x < 150) || (sets === 3 && y > box.height - 44 && x > 380))) clear = false;
        if (!clear) continue;
        if (!free.has(key)) free.set(key, []);
        free.get(key).push({ x, y });
      }
    }
    const need = new Map();
    for (const e of elements) need.set(e.in, (need.get(e.in) || 0) + 1);
    if ([...need].every(([key, count]) => (free.get(key) || []).length >= count)) {
      const spots = new Map();
      for (const [key, points] of free) {
        const cx = points.reduce((t, p) => t + p.x, 0) / points.length;
        const cy = points.reduce((t, p) => t + p.y, 0) / points.length;
        spots.set(key, points.slice().sort((p, q) => Math.hypot(p.x - cx, p.y - cy) - Math.hypot(q.x - cx, q.y - cy)));
      }
      const used = new Map();
      return {
        spacing,
        spots: elements.map((e) => {
          const k = used.get(e.in) || 0;
          used.set(e.in, k + 1);
          return spots.get(e.in)[k];
        })
      };
    }
  }
  return null;
}

/** Which of the layout's circles a point is inside, as letters ('', 'a', 'bc', …): for tests. */
export function setRegionAt(sets, point) {
  return SET_LAYOUTS[sets].circles
    .map((c, i) => (Math.hypot(point.x - c.x, point.y - c.y) < c.r ? 'abc'[i] : ''))
    .join('');
}

/**
 * Elements as numbered dots inside two or three set circles:
 * `{ kind: 'setdots', sets: [{ label, tone }], elements: [{ value, in }], universe, summary }`,
 * where `in` names the circles an element is in ('a', 'bc', '' for none).
 */
function setDotsPlot(plot) {
  const layout = SET_LAYOUTS[plot.sets.length];
  const height = 360;
  const placed = placeSetElements(plot.sets.length, plot.elements, { width: W, height });
  const r = placed ? Math.min(13, placed.spacing * 0.46) : 10;
  const children = [
    svgEl('rect', { x: 6, y: 6, width: W - 12, height: height - 12, rx: 12, class: 'venn-universe' }),
    svgEl('text', { x: 18, y: height - 16, class: 'sim-marker-label', text: plot.universe }),
    ...layout.circles.map((c, i) => svgEl('circle', { cx: c.x, cy: c.y, r: c.r, class: 'sim-set-circle', style: { stroke: tone(plot.sets[i].tone), fill: tone(plot.sets[i].tone) } })),
    ...plot.sets.map((set, i) =>
      svgEl('text', { x: layout.names[i].x, y: layout.names[i].y, 'text-anchor': layout.names[i].anchor, class: 'sim-set-name', style: { fill: tone(set.tone) }, text: set.label })
    ),
    ...(placed
      ? plot.elements.map((e, i) =>
          svgEl('g', {}, [
            svgEl('circle', { cx: placed.spots[i].x, cy: placed.spots[i].y, r, class: 'sim-set-dot' }),
            svgEl('text', {
              x: placed.spots[i].x,
              y: placed.spots[i].y,
              'text-anchor': 'middle',
              'dominant-baseline': 'central',
              class: 'sim-set-value',
              style: { fontSize: `${Math.round(r * 1.05)}px` },
              text: String(e.value)
            })
          ])
        )
      : [])
  ];
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children, { height })]);
}

/**
 * The power set, one row per subset size:
 * `{ kind: 'subsets', columns: [{ label, items: [{ text, fresh }] }], summary }`.
 * Subsets holding the newest element are marked `fresh` (and say so to screen readers).
 */
function subsetsPlot(plot) {
  return el('div.sim-figure.sim-subsets', {}, [
    el(
      'dl.sim-subsets__rows',
      {},
      plot.columns.map((column) =>
        el('div.sim-subsets__row', {}, [
          el('dt.sim-subsets__head', { text: column.label }),
          el(
            'dd.sim-subsets__items',
            {},
            column.items.map((item) =>
              el('span', { class: `sim-subsets__item${item.fresh ? ' is-fresh' : ''}` }, [item.text, item.fresh ? el('span.sr-only', { text: ' (new)' }) : null])
            )
          )
        ])
      )
    ),
    el('p.sim-subsets__key', {}, [el('span.sim-subsets__item.is-fresh', { text: 'new' }), ' holds the newest element: each older subset, with it added'])
  ]);
}

/**
 * A paragraph read one sentence at a time:
 * `{ kind: 'passage', title, sentences: [{ text, state: 'read' | 'new' | 'unread' | 'skipped' }], summary }`.
 */
function passagePlot(plot) {
  const said = { new: ' (just read)', skipped: ' (left out)', unread: ' (not read yet)' };
  return el('div.sim-figure.sim-passage', {}, [
    plot.title ? el('p.sim-passage__title', { text: plot.title }) : null,
    el(
      'p.sim-passage__text',
      {},
      plot.sentences.flatMap((sentence, i) => [
        el(sentence.state === 'new' ? 'mark' : 'span', { class: `sim-passage__sentence is-${sentence.state}` }, [
          el('span.sim-passage__num', { text: String(i + 1), attrs: { 'aria-hidden': 'true' } }),
          sentence.text,
          said[sentence.state] ? el('span.sr-only', { text: said[sentence.state] }) : null
        ]),
        ' '
      ])
    )
  ]);
}

/**
 * Whole-number points on a line ax + by = c in the first quadrant:
 * `{ kind: 'lattice', xMax, yMax, line: { a, b, c }, points: [{ x, y }], excluded: [{ x, y }],
 * step: { from: [x, y], to: [x, y] } | null, summary }`. Grid lines mark the whole
 * numbers; solutions are filled dots, grid points on the line that do not count
 * (on an axis when only positive solutions count) are rings, and the step from one
 * solution to the next is drawn as a dashed right angle.
 */
function latticePlot(plot) {
  const left = 52;
  const right = W - 24;
  const top = 22;
  const bottom = H - 46;
  const sx = (x) => left + (x / plot.xMax) * (right - left);
  const sy = (y) => bottom - (y / plot.yMax) * (bottom - top);
  const gridStep = (m) => (m <= 24 ? 1 : 5);
  const labelStep = (m) => (m <= 10 ? 1 : m <= 24 ? 2 : m <= 40 ? 5 : 10);
  const grid = [];
  for (let x = 0; x <= plot.xMax; x += gridStep(plot.xMax)) {
    grid.push(svgEl('line', { x1: sx(x), x2: sx(x), y1: top, y2: bottom, class: 'sim-lattice-grid' }));
    if (x % labelStep(plot.xMax) === 0) grid.push(svgEl('text', { x: sx(x), y: bottom + 18, 'text-anchor': 'middle', class: 'chart-axis-label', text: show(x) }));
  }
  for (let y = 0; y <= plot.yMax; y += gridStep(plot.yMax)) {
    grid.push(svgEl('line', { x1: left, x2: right, y1: sy(y), y2: sy(y), class: 'sim-lattice-grid' }));
    if (y % labelStep(plot.yMax) === 0) grid.push(svgEl('text', { x: left - 8, y: sy(y), 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'chart-axis-label', text: show(y) }));
  }
  const { a, b, c } = plot.line;
  const axes = [
    svgEl('line', { x1: left, x2: right, y1: bottom, y2: bottom, class: 'sim-axis' }),
    svgEl('line', { x1: left, x2: left, y1: top, y2: bottom, class: 'sim-axis' }),
    svgEl('text', { x: (left + right) / 2, y: H - 8, 'text-anchor': 'middle', class: 'sim-axis-title', text: 'x' }),
    svgEl('text', { x: 14, y: (top + bottom) / 2, 'text-anchor': 'middle', class: 'sim-axis-title', text: 'y' })
  ];
  const line = svgEl('line', { x1: sx(0), y1: sy(c / b), x2: sx(c / a), y2: sy(0), class: 'sim-line', style: { stroke: tone('algebra') } });
  let step = [];
  if (plot.step) {
    const [x1, y1] = plot.step.from;
    const [x2, y2] = plot.step.to;
    step = [
      svgEl('path', { d: `M ${sx(x1)} ${sy(y1)} H ${sx(x2)} V ${sy(y2)}`, class: 'sim-lattice-step' }),
      svgEl('text', { x: (sx(x1) + sx(x2)) / 2, y: sy(y1) - 8, 'text-anchor': 'middle', class: 'sim-marker-label', text: `+${x2 - x1}` }),
      svgEl('text', { x: sx(x2) + 8, y: (sy(y1) + sy(y2)) / 2, 'dominant-baseline': 'middle', class: 'sim-marker-label', text: `−${y1 - y2}` })
    ];
  }
  const labelled = plot.points.length <= 6;
  const points = plot.points.flatMap((p) => [
    svgEl('circle', { cx: sx(p.x), cy: sy(p.y), r: 7, class: 'sim-data-dot sim-lattice-point', style: { fill: tone('geometry') } }),
    labelled
      ? svgEl('text', { x: sx(p.x) + (sx(p.x) > right - 70 ? -10 : 10), y: sy(p.y) - 10, 'text-anchor': sx(p.x) > right - 70 ? 'end' : 'start', class: 'sim-nl-label', text: `(${p.x}, ${p.y})` })
      : null
  ]);
  const excluded = (plot.excluded || []).map((p) => svgEl('circle', { cx: sx(p.x), cy: sy(p.y), r: 7, class: 'sim-lattice-excluded' }));
  return el('div.sim-figure', {}, [svgRoot(plot.summary, [...grid, ...axes, line, ...step, ...excluded, ...points])]);
}

/**
 * A letter sum worked column by column, and each letter's remaining digits:
 * `{ kind: 'cryptarithm', columns, done, rows: [{ sign, word }], carries: [text per worked column],
 * digits: { letter: digit | null }, candidates: [{ letter, digits, leading }], summary }`.
 * Worked columns are tinted, the latest one strongly; a letter with one digit left
 * shows it under the letter. Both parts are real tables, so screen readers can walk them.
 */
function cryptarithmPlot(plot) {
  // Left to right on screen: the highest place first.
  const cols = Array.from({ length: plot.columns }, (_, j) => plot.columns - 1 - j);
  const colClass = (i) => (i < plot.done ? (i === plot.done - 1 ? 'is-current' : 'is-done') : '');
  const letterAt = (word, i) => (i < word.length ? word[word.length - 1 - i] : '');
  const carryRow = el('tr.sim-crypt__carries', {}, [
    el('th', { attrs: { scope: 'row' }, text: 'carry' }),
    ...cols.map((i) => el('td', { class: colClass(i) }, [i >= 1 && i - 1 < plot.carries.length ? plot.carries[i - 1] : '']))
  ]);
  const wordRows = plot.rows.map((row, r) =>
    el('tr', { class: r === plot.rows.length - 1 ? 'sim-crypt__result' : '' }, [
      el('th', { attrs: { scope: 'row' }, text: row.sign || ' ' }),
      ...cols.map((i) => {
        const letter = letterAt(row.word, i);
        const digit = letter ? plot.digits[letter] : null;
        return el(
          'td',
          { class: colClass(i) },
          letter ? [el('span.sim-crypt__letter', { text: letter }), el('span.sim-crypt__digit', { text: digit === null ? '' : String(digit) })] : []
        );
      })
    ])
  );
  const sum = el('table.sim-crypt__sum', {}, [
    el('caption.sr-only', { text: 'The sum, column by column, with the carries above' }),
    el('tbody', {}, [carryRow, ...wordRows])
  ]);
  const digits = Array.from({ length: 10 }, (_, d) => d);
  const cands = el('table.sim-crypt__cands', {}, [
    el('caption', { text: 'Digits each letter can still be' }),
    el('thead', {}, [el('tr', {}, [el('th', { attrs: { scope: 'col' }, text: 'Letter' }), ...digits.map((d) => el('th', { attrs: { scope: 'col' }, text: String(d) }))])]),
    el(
      'tbody',
      {},
      plot.candidates.map((row) => {
        const allowed = new Set(row.digits);
        return el('tr', { class: row.digits.length === 1 ? 'is-fixed' : '' }, [
          el('th', { attrs: { scope: 'row' } }, [row.letter, row.leading ? el('span.sim-crypt__lead', { text: ' ≠ 0' }) : null]),
          ...digits.map((d) =>
            allowed.has(d)
              ? el('td.is-on', { text: String(d) })
              : el('td.is-off', {}, [el('span', { text: '·', attrs: { 'aria-hidden': 'true' } }), el('span.sr-only', { text: 'ruled out' })])
          )
        ]);
      })
    )
  ]);
  return el('div.sim-figure.sim-crypt', {}, [sum, el('div.sim-crypt__scroll', {}, [cands]), el('p.sr-only', { text: plot.summary })]);
}

export function drawPlot(plot) {
  if (plot.kind === 'lattice') return latticePlot(plot);
  if (plot.kind === 'cryptarithm') return cryptarithmPlot(plot);
  if (plot.kind === 'geometry') return geometryPlot(plot);
  if (plot.kind === 'stack') return stackPlot(plot);
  if (plot.kind === 'chart') return chartPlot(plot);
  if (plot.kind === 'table') return tablePlot(plot);
  if (plot.kind === 'candidates') return candidatesPlot(plot);
  if (plot.kind === 'xy') return xyPlot(plot);
  if (plot.kind === 'bars') return barPlot(plot);
  if (plot.kind === 'clock') return clockPlot(plot);
  if (plot.kind === 'seesaw') return seesawPlot(plot);
  if (plot.kind === 'tank') return tankPlot(plot);
  if (plot.kind === 'track') return trackPlot(plot);
  if (plot.kind === 'numberline') return numberLinePlot(plot);
  if (plot.kind === 'triangle') return triangleSvg(plot);
  if (plot.kind === 'circle') return circleSvg(plot);
  if (plot.kind === 'polygon') return polygonSvg(plot);
  if (plot.kind === 'dots') return dotPlot(plot);
  if (plot.kind === 'solids') return solidsPlot(plot);
  if (plot.kind === 'rects') return rectsPlot(plot);
  if (plot.kind === 'venn') return vennPlot(plot);
  if (plot.kind === 'wheel') return wheelPlot(plot);
  if (plot.kind === 'numberlines') return numberLinesPlot(plot);
  if (plot.kind === 'steps') return stepsPlot(plot);
  if (plot.kind === 'tree') return treePlot(plot);
  if (plot.kind === 'setdots') return setDotsPlot(plot);
  if (plot.kind === 'subsets') return subsetsPlot(plot);
  if (plot.kind === 'passage') return passagePlot(plot);
  const reasoning = drawReasoningPlot(plot);
  if (reasoning) return reasoning;
  return el('p.text-muted', { text: plot.summary || '' });
}
