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
 * and five for logical reasoning (seats, grid, euler, chain, tree), drawn by
 * reasoningPlots.js.
 *
 * Colours come from the --cat-* tokens, so every picture follows the theme.
 * Every plot carries a text summary for screen readers.
 */

import { el, svgEl } from '../utils/dom.js';
import { niceRange, show } from '../simulations/core.js';
import { pieSectorPath, pointOnCircle } from '../utils/chartScale.js';
import { solidDrawing } from '../utils/solidGeometry.js';
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

  const legend =
    plot.series.length > 1
      ? el(
          'ul.chart-legend',
          {},
          plot.series.map((series) =>
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
 * (each `parts` list as in a `figure.type: 'solid'`).
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
  const bottom = H - 56;
  const scale = Math.min(
    ...boxes.map((b) => (cellW - 40) / (b.maxX - b.minX || 1)),
    ...boxes.map((b) => (bottom - top) / (b.maxY - b.minY || 1))
  );
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
      svgEl('text', { x: cx, y: H - 32, 'text-anchor': 'middle', class: 'sim-marker-label', text: item.label }),
      item.caption ? svgEl('text', { x: cx, y: H - 14, 'text-anchor': 'middle', class: 'sim-marker-label', text: item.caption }) : null
    ];
  });
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children)]);
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
  return el('div.sim-figure', {}, [svgRoot(plot.summary, children)]);
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
            el('td', { class: columnClass(j), style: tint(cell.heat) }, [cell.text, cell.note ? el('span.sim-table__note', { text: cell.note }) : null])
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

export function drawPlot(plot) {
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
  const reasoning = drawReasoningPlot(plot);
  if (reasoning) return reasoning;
  return el('p.text-muted', { text: plot.summary || '' });
}
