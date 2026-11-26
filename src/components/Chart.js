/**
 * Renders `question.chart` as inline SVG: bar, line, pie, combo (bars and
 * lines on one axis, each series saying `kind: 'bar' | 'line'`) and radar
 * (one spoke per category). No chart library —
 * colors come from the app's existing `--cat-*` category tokens, so charts
 * are theme-aware for free. See `src/utils/chartScale.js` for the pure math.
 */

import { el, svgEl } from '../utils/dom.js';
import { niceScale, scaleTicks, pieSectors, pieSectorPath, pointOnCircle } from '../utils/chartScale.js';
import { formatNumber } from '../utils/format.js';

const WIDTH = 640;
const HEIGHT = 320;
const MARGIN = { top: 24, right: 16, bottom: 40, left: 56 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const PLOT_BOTTOM = MARGIN.top + PLOT_HEIGHT;

/** Cycled for series/sectors that don't specify their own colorToken. */
const CAT_TOKENS = ['data', 'algebra', 'arithmetic', 'geometry', 'combinatorics', 'advanced'];

function seriesColor(index, colorToken) {
  return `var(--cat-${colorToken || CAT_TOKENS[index % CAT_TOKENS.length]})`;
}

function renderLegend(items) {
  return el(
    'ul.chart-legend',
    {},
    items.map((item) =>
      el('li.chart-legend__item', {}, [
        el('span.chart-legend__swatch', { style: { background: item.color } }),
        el('span', { text: item.label })
      ])
    )
  );
}

function renderAxisChart(chart, kind) {
  const categories = chart.categories || [];
  const series = chart.series || [];
  const dataMax = Math.max(0, ...series.flatMap((s) => s.data));
  // A combo chart prints the line's values above its points: leave room above the tallest one.
  const scale = niceScale(kind === 'combo' ? dataMax * 1.12 : dataMax);
  const valueToY = (value) => PLOT_BOTTOM - (value / scale.max) * PLOT_HEIGHT;
  const categoryWidth = PLOT_WIDTH / categories.length;

  const gridlines = scaleTicks(scale).map((tick) => {
    const y = valueToY(tick);
    return svgEl('g', {}, [
      svgEl('line', { x1: MARGIN.left, x2: MARGIN.left + PLOT_WIDTH, y1: y, y2: y, class: 'chart-gridline' }),
      svgEl('text', {
        x: MARGIN.left - 8,
        y,
        class: 'chart-axis-label',
        'text-anchor': 'end',
        'dominant-baseline': 'middle',
        text: formatNumber(tick)
      })
    ]);
  });

  const categoryLabels = categories.map((label, i) =>
    svgEl('text', {
      x: MARGIN.left + categoryWidth * (i + 0.5),
      y: PLOT_BOTTOM + 20,
      class: 'chart-axis-label',
      'text-anchor': 'middle',
      text: String(label)
    })
  );

  // Which series are bars and which are lines: all one kind, or each series' own kind in a combo.
  const kindOf = (s) => (kind === 'combo' ? (s.kind === 'line' ? 'line' : 'bar') : kind);
  const barSeries = series.map((s, si) => ({ s, si })).filter(({ s }) => kindOf(s) === 'bar');
  const lineSeries = series.map((s, si) => ({ s, si })).filter(({ s }) => kindOf(s) === 'line');

  let plotContent = [];
  if (barSeries.length) {
    const groupPad = categoryWidth * 0.16;
    const barGroupWidth = categoryWidth - groupPad;
    const gap = barSeries.length > 1 ? 4 : 0;
    const barWidth = (barGroupWidth - gap * (barSeries.length - 1)) / barSeries.length;
    plotContent = barSeries.flatMap(({ s, si }, bi) =>
      s.data.map((value, ci) => {
        const x = MARGIN.left + ci * categoryWidth + groupPad / 2 + bi * (barWidth + gap);
        const y = valueToY(value);
        return svgEl('g', {}, [
          svgEl('rect', {
            x,
            y,
            width: Math.max(barWidth, 0),
            height: Math.max(PLOT_BOTTOM - y, 0),
            rx: 2,
            class: 'chart-bar',
            style: { fill: seriesColor(si, s.colorToken) }
          }),
          // Exact values: questions ask for arithmetic the gridlines alone can't support.
          svgEl('text', {
            x: x + barWidth / 2,
            // In a combo the line runs near the bar tops, so the bar's value sits at its base.
            y: lineSeries.length ? PLOT_BOTTOM - 8 : y - 4,
            class: lineSeries.length ? 'chart-value-label chart-value-label--inside' : 'chart-value-label',
            'text-anchor': 'middle',
            text: formatNumber(value)
          })
        ]);
      })
    );
  }
  if (lineSeries.length) {
    const lines = lineSeries.map(({ s, si }) => {
      const color = seriesColor(si, s.colorToken);
      const points = s.data.map((value, ci) => ({
        x: MARGIN.left + categoryWidth * (ci + 0.5),
        y: valueToY(value)
      }));
      const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      // Value labels sit above each point, except the lowest series at that category goes
      // below, so two lines running close together don't print on top of each other.
      const isLowest = (ci) => lineSeries.length > 1 && lineSeries.every(({ s: other, si: oi }) => oi === si || other.data[ci] > s.data[ci]);
      return svgEl('g', {}, [
        svgEl('path', { d, class: 'chart-line', style: { stroke: color } }),
        ...points.map((p) => svgEl('circle', { cx: p.x, cy: p.y, r: 4, class: 'chart-point', style: { fill: color } })),
        ...points.map((p, ci) =>
          svgEl('text', {
            x: p.x,
            y: isLowest(ci) ? p.y + 16 : p.y - 9,
            class: barSeries.length ? 'chart-value-label chart-value-label--halo' : 'chart-value-label',
            'text-anchor': 'middle',
            text: formatNumber(s.data[ci])
          })
        )
      ]);
    });
    plotContent = [...plotContent, ...lines];
  }

  const svg = svgEl('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'chart-svg', 'aria-hidden': 'true' }, [
    ...gridlines,
    ...categoryLabels,
    ...plotContent
  ]);

  const legend = series.length > 1
    ? renderLegend(
        series.map((s, i) => ({
          label: kind === 'combo' ? `${s.label} (${kindOf(s) === 'line' ? 'line' : 'bars'})` : s.label,
          color: seriesColor(i, s.colorToken)
        }))
      )
    : null;

  return el('div.chart-body', {}, [svg, legend]);
}

/** One spoke per category; each series is a closed shape, its distance from the centre the value. */
function renderRadar(chart) {
  const categories = chart.categories || [];
  const series = chart.series || [];
  const size = 360;
  const c = size / 2;
  const radius = 120;
  const scale = niceScale(Math.max(0, ...series.flatMap((s) => s.data)), 4);
  const spoke = (i) => (360 * i) / categories.length;
  const at = (i, value) => pointOnCircle(c, c, (value / scale.max) * radius, spoke(i));

  const rings = scaleTicks(scale)
    .filter((tick) => tick > 0)
    .map((tick) => {
      const points = categories.map((_, i) => at(i, tick));
      // Scale labels run between the first two spokes, clear of any value labels.
      const label = pointOnCircle(c, c, (tick / scale.max) * radius, 180 / categories.length);
      return svgEl('g', {}, [
        svgEl('polygon', { points: points.map((p) => `${p.x},${p.y}`).join(' '), class: 'chart-gridline chart-radar-ring' }),
        svgEl('text', { x: label.x, y: label.y, class: 'chart-axis-label chart-radar-scale', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: formatNumber(tick) })
      ]);
    });
  const spokes = categories.map((label, i) => {
    const end = at(i, scale.max);
    const labelAt = pointOnCircle(c, c, radius + 22, spoke(i));
    const anchor = Math.abs(labelAt.x - c) < 8 ? 'middle' : labelAt.x > c ? 'start' : 'end';
    return svgEl('g', {}, [
      svgEl('line', { x1: c, y1: c, x2: end.x, y2: end.y, class: 'chart-gridline' }),
      svgEl('text', { x: labelAt.x, y: labelAt.y, class: 'chart-axis-label', 'text-anchor': anchor, 'dominant-baseline': 'middle', text: String(label) })
    ]);
  });
  const shapes = series.map((s, si) => {
    const color = seriesColor(si, s.colorToken);
    const points = s.data.map((value, i) => at(i, value));
    return svgEl('g', {}, [
      svgEl('polygon', { points: points.map((p) => `${p.x},${p.y}`).join(' '), class: 'chart-radar-shape', style: { stroke: color, fill: color } }),
      ...points.map((p) => svgEl('circle', { cx: p.x, cy: p.y, r: 3.5, class: 'chart-point', style: { fill: color } })),
      ...points.map((p, i) => {
        // Labels sit outside each point along its spoke, each series a step further out,
        // so two series with close values do not print on top of each other.
        const out = pointOnCircle(c, c, (s.data[i] / scale.max) * radius + 12 + si * 13, spoke(i));
        return svgEl('text', { x: out.x, y: out.y, class: 'chart-value-label chart-radar-value', 'text-anchor': 'middle', 'dominant-baseline': 'middle', style: { fill: color }, text: formatNumber(s.data[i]) });
      })
    ]);
  });
  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, class: 'chart-svg chart-svg--radar', 'aria-hidden': 'true' }, [...rings, ...spokes, ...shapes]);
  const legend = series.length > 1 ? renderLegend(series.map((s, i) => ({ label: s.label, color: seriesColor(i, s.colorToken) }))) : null;
  return el('div.chart-body.chart-body--pie', {}, [svg, legend]);
}

function renderPie(chart) {
  const categories = chart.categories || [];
  const values = chart.series?.[0]?.data || [];
  const sectors = pieSectors(values);
  const cx = 160;
  const cy = 160;
  const radius = 130;

  const paths = sectors.map((sector, i) =>
    svgEl('path', {
      d: pieSectorPath(cx, cy, radius, sector.startAngle, sector.endAngle),
      class: 'chart-pie-sector',
      style: { fill: `var(--cat-${CAT_TOKENS[i % CAT_TOKENS.length]})` }
    })
  );

  const svg = svgEl('svg', { viewBox: '0 0 320 320', class: 'chart-svg chart-svg--pie', 'aria-hidden': 'true' }, paths);

  const legend = renderLegend(
    categories.map((label, i) => ({
      label: `${label} — ${formatNumber(Math.round(sectors[i]?.percent || 0))}%`,
      color: `var(--cat-${CAT_TOKENS[i % CAT_TOKENS.length]})`
    }))
  );

  return el('div.chart-body.chart-body--pie', {}, [svg, legend]);
}

export function chartWidget(chart) {
  if (!chart) return null;
  const body =
    chart.type === 'pie'
      ? renderPie(chart)
      : chart.type === 'radar'
        ? renderRadar(chart)
        : renderAxisChart(chart, ['line', 'combo'].includes(chart.type) ? chart.type : 'bar');
  return el('div.chart-wrap', {}, [
    chart.caption ? el('div.chart-caption', { text: chart.caption }) : null,
    body,
    chart.ariaSummary ? el('p.sr-only', { text: chart.ariaSummary }) : null
  ]);
}
