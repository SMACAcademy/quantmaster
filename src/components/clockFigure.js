/**
 * Clock faces (`figure.type === 'clock'`) and number lines
 * (`figure.type === 'numberline'`) for questions. The maths is in
 * utils/figureMath.js.
 *
 *   { type: 'clock', hour: 3, minute: 40, hands: 'both' }   // hands: both | none | hour | minute
 *   { type: 'numberline', min: -5, max: 5, ranges: [{ from: -2, to: null, fromOpen: true }],
 *     points: [{ value: 3, label: '3' }] }
 */

import { svgEl } from '../utils/dom.js';
import { pointOnCircle } from '../utils/chartScale.js';
import { formatNumber } from '../utils/format.js';
import { clockHandBearings, clockProblems, numberLineProblems, numberLineStep, numberLineTicks } from '../utils/figureMath.js';

export function renderClock(figure) {
  if (clockProblems(figure).length) return null;
  const size = 260;
  const c = size / 2;
  const r = 112;
  const { hour, minute } = clockHandBearings(figure.hour, figure.minute);
  const hands = figure.hands || 'both';
  const tick = (i) => {
    const outer = pointOnCircle(c, c, r - 4, i * 6);
    const inner = pointOnCircle(c, c, r - (i % 5 === 0 ? 16 : 9), i * 6);
    return svgEl('line', { x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y, class: i % 5 === 0 ? 'clock-tick clock-tick--hour' : 'clock-tick' });
  };
  const number = (n) => {
    const at = pointOnCircle(c, c, r - 30, n * 30);
    return svgEl('text', { x: at.x, y: at.y, class: 'clock-number', 'text-anchor': 'middle', 'dominant-baseline': 'central', text: String(n) });
  };
  const hand = (bearing, length, cls) => {
    const tip = pointOnCircle(c, c, length, bearing);
    return svgEl('line', { x1: c, y1: c, x2: tip.x, y2: tip.y, class: `clock-hand ${cls}` });
  };
  return svgEl('svg', { viewBox: `0 0 ${size} ${size}`, class: 'chart-svg clock-svg', 'aria-hidden': 'true' }, [
    svgEl('circle', { cx: c, cy: c, r, class: 'clock-face' }),
    ...Array.from({ length: 60 }, (_, i) => tick(i)),
    ...Array.from({ length: 12 }, (_, i) => number(i + 1)),
    hands === 'both' || hands === 'hour' ? hand(hour, r * 0.52, 'clock-hand--hour') : null,
    hands === 'both' || hands === 'minute' ? hand(minute, r * 0.8, 'clock-hand--minute') : null,
    svgEl('circle', { cx: c, cy: c, r: 4, class: 'clock-pin' })
  ]);
}

export function renderNumberLine(figure) {
  if (numberLineProblems(figure).length) return null;
  const width = 340;
  const height = 96;
  const left = 26;
  const right = width - 26;
  const axisY = 48;
  const { min, max } = figure;
  const sx = (v) => left + ((v - min) / (max - min)) * (right - left);
  const ticks = numberLineTicks(min, max, figure.step ?? numberLineStep(min, max));
  const nodes = [
    svgEl('line', { x1: left - 16, y1: axisY, x2: right + 16, y2: axisY, class: 'nl-axis' }),
    svgEl('path', { d: `M ${left - 18} ${axisY} l 8 -5 v 10 Z`, class: 'nl-arrow' }),
    svgEl('path', { d: `M ${right + 18} ${axisY} l -8 -5 v 10 Z`, class: 'nl-arrow' }),
    ...ticks.flatMap((v) => [
      svgEl('line', { x1: sx(v), y1: axisY - 5, x2: sx(v), y2: axisY + 5, class: 'nl-tick' }),
      svgEl('text', { x: sx(v), y: axisY + 22, class: 'nl-tick-label', 'text-anchor': 'middle', text: formatNumber(v).replace('-', '−') })
    ])
  ];
  // Ranges: a thick band; an endless side runs to the arrow; open ends are hollow dots.
  for (const range of figure.ranges || []) {
    const x1 = range.from === null ? left - 14 : sx(range.from);
    const x2 = range.to === null ? right + 14 : sx(range.to);
    nodes.push(svgEl('line', { x1, y1: axisY, x2, y2: axisY, class: 'nl-range' }));
    if (range.from !== null) nodes.push(svgEl('circle', { cx: x1, cy: axisY, r: 5.5, class: range.fromOpen ? 'nl-dot nl-dot--open' : 'nl-dot' }));
    if (range.to !== null) nodes.push(svgEl('circle', { cx: x2, cy: axisY, r: 5.5, class: range.toOpen ? 'nl-dot nl-dot--open' : 'nl-dot' }));
  }
  for (const p of figure.points || []) {
    nodes.push(svgEl('circle', { cx: sx(p.value), cy: axisY, r: 5.5, class: p.open ? 'nl-dot nl-dot--open' : 'nl-dot' }));
    if (p.label) nodes.push(svgEl('text', { x: sx(p.value), y: axisY - 14, class: 'nl-point-label', 'text-anchor': 'middle', text: p.label }));
  }
  return svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'chart-svg numberline-svg', 'aria-hidden': 'true' }, nodes);
}
