/**
 * Renders `question.figure` — geometry diagrams — as inline SVG.
 * `type: 'coordinate-plane'` is the graphed-plane renderer (Coordinate
 * Geometry); `type: 'diagram'` is the free-form 2D shape renderer (Lines and
 * Angles, Triangles, Quadrilaterals, Polygons, Circles); `type: 'venn'` draws
 * two- or three-set Venn diagrams (components/venn.js); `type: 'solid'` draws
 * 3D solids and stacks of them (components/solid.js, geometry in
 * utils/solidGeometry.js). This mirrors how Chart.js dispatches on bar/line/pie.
 */

import { el, svgEl } from '../utils/dom.js';
import { axisStep, makeTransform, clipLineToRect } from '../utils/planeGeometry.js';
import {
  computeBounds,
  bearingDeg,
  minorArc,
  angleArcPath,
  tickMarkSegments,
  chevronPoints,
  rightAngleMarkerPoints,
  sectorPath,
  regionPartPath
} from '../utils/diagramGeometry.js';
import { pointOnCircle } from '../utils/chartScale.js';
import { formatNumber } from '../utils/format.js';
import { renderVenn } from './venn.js';
import { renderSolid } from './solid.js';
import { renderClock, renderNumberLine } from './clockFigure.js';
import { renderDice, renderPaper } from './reasoningFigures.js';

const WIDTH = 340;
const HEIGHT = 340;
const MARGIN = 22;
const BOX = { left: MARGIN, top: MARGIN, width: WIDTH - 2 * MARGIN, height: HEIGHT - 2 * MARGIN };
/** Each figure's hatch pattern and clip paths need ids unique on the page. */
let defsCounter = 0;

function renderCoordinatePlane(figure) {
  const { xRange, yRange, points = [], segments = [], lines = [] } = figure;
  const { toX, toY } = makeTransform(xRange, yRange, BOX);
  const xStep = axisStep(xRange[0], xRange[1]);
  const yStep = axisStep(yRange[0], yRange[1]);
  const originX = Math.min(Math.max(0, xRange[0]), xRange[1]);
  const originY = Math.min(Math.max(0, yRange[0]), yRange[1]);
  const byId = new Map(points.map((p) => [p.id, p]));

  const gridlines = [];
  for (let x = Math.ceil(xRange[0] / xStep) * xStep; x <= xRange[1] + 1e-9; x += xStep) {
    gridlines.push(svgEl('line', { x1: toX(x), x2: toX(x), y1: toY(yRange[0]), y2: toY(yRange[1]), class: 'plane-gridline' }));
  }
  for (let y = Math.ceil(yRange[0] / yStep) * yStep; y <= yRange[1] + 1e-9; y += yStep) {
    gridlines.push(svgEl('line', { x1: toX(xRange[0]), x2: toX(xRange[1]), y1: toY(y), y2: toY(y), class: 'plane-gridline' }));
  }

  const axes = [
    svgEl('line', { x1: toX(xRange[0]), x2: toX(xRange[1]), y1: toY(originY), y2: toY(originY), class: 'plane-axis' }),
    svgEl('line', { x1: toX(originX), x2: toX(originX), y1: toY(yRange[0]), y2: toY(yRange[1]), class: 'plane-axis' })
  ];

  const tickLabels = [];
  for (let x = Math.ceil(xRange[0] / xStep) * xStep; x <= xRange[1] + 1e-9; x += xStep) {
    if (Math.abs(x) < 1e-9) continue;
    tickLabels.push(
      svgEl('text', { x: toX(x), y: toY(originY) + 13, class: 'plane-axis-label', 'text-anchor': 'middle', text: formatNumber(x) })
    );
  }
  for (let y = Math.ceil(yRange[0] / yStep) * yStep; y <= yRange[1] + 1e-9; y += yStep) {
    if (Math.abs(y) < 1e-9) continue;
    tickLabels.push(
      svgEl('text', { x: toX(originX) - 6, y: toY(y), class: 'plane-axis-label', 'text-anchor': 'end', 'dominant-baseline': 'middle', text: formatNumber(y) })
    );
  }

  const lineNodes = lines
    .map((line) => {
      const [fromId, toId] = line.through;
      const p1 = byId.get(fromId);
      const p2 = byId.get(toId);
      if (!p1 || !p2) return null;
      const clipped = clipLineToRect(p1, p2, xRange, yRange);
      if (!clipped) return null;
      const [a, b] = clipped;
      return svgEl('line', {
        x1: toX(a.x), y1: toY(a.y), x2: toX(b.x), y2: toY(b.y),
        class: `plane-line ${line.style === 'dashed' ? 'plane-line--dashed' : ''}`.trim()
      });
    })
    .filter(Boolean);

  const segmentNodes = segments
    .map((segment) => {
      const p1 = byId.get(segment.from);
      const p2 = byId.get(segment.to);
      if (!p1 || !p2) return null;
      return svgEl('line', {
        x1: toX(p1.x), y1: toY(p1.y), x2: toX(p2.x), y2: toY(p2.y),
        class: `plane-segment ${segment.style === 'dashed' ? 'plane-segment--dashed' : ''}`.trim()
      });
    })
    .filter(Boolean);

  const pointNodes = points.flatMap((p) => {
    const [dx, dy] = p.labelOffset || [8, -8];
    const nodes = [svgEl('circle', { cx: toX(p.x), cy: toY(p.y), r: 3.5, class: 'plane-point' })];
    if (p.label) {
      nodes.push(
        svgEl('text', { x: toX(p.x) + dx, y: toY(p.y) + dy, class: 'plane-point-label', text: p.label })
      );
    }
    return nodes;
  });

  return svgEl('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'chart-svg plane-svg', 'aria-hidden': 'true' }, [
    ...gridlines,
    ...axes,
    ...tickLabels,
    ...lineNodes,
    ...segmentNodes,
    ...pointNodes
  ]);
}

function renderDiagram(figure) {
  const points = figure.points || [];
  const byId = new Map(points.map((p) => [p.id, p]));

  // A circle/arc's extent reaches beyond its centre point, so the bounds must
  // account for its actual radius, not just the plotted points.
  const boundsPoints = [...points];
  const round = (shape) => ['circle', 'arc', 'sector', 'segment'].includes(shape.type);
  for (const shape of [...(figure.shapes || []), ...(figure.shaded || []).flatMap((region) => region.parts || [])]) {
    if (!round(shape)) continue;
    const c = byId.get(shape.center);
    if (!c || !Number.isFinite(shape.radius)) continue;
    if (shape.type === 'circle') {
      boundsPoints.push(
        { x: c.x - shape.radius, y: c.y },
        { x: c.x + shape.radius, y: c.y },
        { x: c.x, y: c.y - shape.radius },
        { x: c.x, y: c.y + shape.radius }
      );
      continue;
    }
    // Only the part of the circle that is drawn: points along the arc (a bearing θ,
    // clockwise from the top, is at (sin θ, cos θ) with y up), plus the centre of a sector.
    const from = shape.startAngle;
    const to = Math.min(shape.endAngle, from + 360);
    for (let k = 0; k <= 24; k++) {
      const t = ((from + ((to - from) * k) / 24) * Math.PI) / 180;
      boundsPoints.push({ x: c.x + shape.radius * Math.sin(t), y: c.y + shape.radius * Math.cos(t) });
    }
    if (shape.type === 'sector') boundsPoints.push(c);
  }

  const { xRange, yRange } = computeBounds(boundsPoints, 1.2);
  const { toX, toY, scale } = makeTransform(xRange, yRange, BOX);
  const toScreen = (id) => {
    const p = byId.get(id);
    return p ? { x: toX(p.x), y: toY(p.y) } : null;
  };

  const shapeNodes = (figure.shapes || []).flatMap((shape) => {
    const dashClass = shape.style === 'dashed' ? 'diagram-line--dashed' : '';
    if (shape.type === 'polygon') {
      const screenPoints = shape.points.map(toScreen).filter(Boolean);
      if (screenPoints.length < 3) return [];
      const d = `M ${screenPoints.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;
      return [svgEl('path', { d, class: `diagram-shape ${shape.fill ? 'diagram-shape--fill' : ''} ${dashClass}`.trim() })];
    }
    if (shape.type === 'segment') {
      const a = toScreen(shape.from);
      const b = toScreen(shape.to);
      if (!a || !b) return [];
      const line = svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: `diagram-line ${dashClass}`.trim() });
      if (!shape.label) return [line];
      // A length label beside the middle of the segment: `labelOffset` in pixels, or 16px to one side.
      const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const [dx, dy] = shape.labelOffset || [((b.y - a.y) / length) * 16, (-(b.x - a.x) / length) * 16];
      return [
        line,
        svgEl('text', {
          x: (a.x + b.x) / 2 + dx,
          y: (a.y + b.y) / 2 + dy,
          class: 'diagram-segment-label',
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          text: shape.label
        })
      ];
    }
    if (shape.type === 'circle') {
      const c = toScreen(shape.center);
      if (!c) return [];
      return [svgEl('circle', { cx: c.x, cy: c.y, r: shape.radius * scale, class: `diagram-shape ${dashClass}`.trim() })];
    }
    if (shape.type === 'arc') {
      const c = toScreen(shape.center);
      if (!c) return [];
      const r = shape.radius * scale;
      return [svgEl('path', { d: angleArcPath(c.x, c.y, r, shape.startAngle, shape.endAngle), class: `diagram-line ${dashClass}`.trim() })];
    }
    if (shape.type === 'sector') {
      const c = toScreen(shape.center);
      if (!c) return [];
      const d = sectorPath(c.x, c.y, shape.radius * scale, shape.startAngle, shape.endAngle);
      return [svgEl('path', { d, class: `diagram-shape ${shape.fill ? 'diagram-shape--fill' : ''} ${dashClass}`.trim() })];
    }
    return [];
  });

  // Shaded regions: by default a point is shaded when it lies inside an odd number of the
  // parts (so a square with a circle in it shades the corners, and two circles make a
  // ring); `mode: 'intersect'` shades only where every part overlaps (the "leaf").
  const uid = `fig-${(defsCounter += 1)}`;
  const defs = [];
  const shadeNodes = [];
  const shadeLabels = [];
  (figure.shaded || []).forEach((region, i) => {
    const paths = (region.parts || []).map((part) => regionPartPath(part, toScreen, scale));
    if (!paths.length || paths.some((d) => !d)) return;
    const fill = (d, extra = {}) => [
      svgEl('path', { d, class: 'diagram-shade', 'fill-rule': 'evenodd', ...extra }),
      svgEl('path', { d, class: 'diagram-shade-hatch', fill: `url(#${uid}-hatch)`, 'fill-rule': 'evenodd', ...extra })
    ];
    if (region.mode === 'intersect') {
      // Clip the first part by each of the others in turn.
      let nodes = fill(paths[0]);
      paths.slice(1).forEach((d, k) => {
        const clipId = `${uid}-clip-${i}-${k}`;
        defs.push(svgEl('clipPath', { id: clipId }, [svgEl('path', { d })]));
        nodes = [svgEl('g', { 'clip-path': `url(#${clipId})` }, nodes)];
      });
      shadeNodes.push(...nodes);
    } else {
      shadeNodes.push(...fill(paths.join(' ')));
    }
    const at = region.labelAt ? toScreen(region.labelAt) : null;
    if (at && region.label) {
      shadeLabels.push(
        svgEl('text', { x: at.x, y: at.y, class: 'diagram-shade-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: region.label })
      );
    }
  });
  if (shadeNodes.length) {
    defs.unshift(
      svgEl('pattern', { id: `${uid}-hatch`, width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, [
        svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 7, class: 'diagram-hatch-line' })
      ])
    );
  }

  const rightAngleNodes = (figure.rightAngles || []).flatMap(({ at, from, to }) => {
    const atS = toScreen(at);
    const fromS = toScreen(from);
    const toS = toScreen(to);
    if (!atS || !fromS || !toS) return [];
    const [p1, p2, p3] = rightAngleMarkerPoints(atS, fromS, toS);
    return [svgEl('path', { d: `M ${atS.x} ${atS.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`, class: 'diagram-mark' })];
  });

  const angleNodes = (figure.angles || []).flatMap(({ at, from, to, label, radius = 22, labelRadius }) => {
    const atS = toScreen(at);
    const fromS = toScreen(from);
    const toS = toScreen(to);
    if (!atS || !fromS || !toS) return [];
    const bearing1 = bearingDeg(fromS.x - atS.x, fromS.y - atS.y);
    const bearing2 = bearingDeg(toS.x - atS.x, toS.y - atS.y);
    const { startAngle, endAngle } = minorArc(bearing1, bearing2);
    const nodes = [svgEl('path', { d: angleArcPath(atS.x, atS.y, radius, startAngle, endAngle), class: 'diagram-mark' })];
    if (label) {
      // Long labels (e.g. "(3x + 10)°") need labelRadius to clear the arc and the lines.
      const mid = pointOnCircle(atS.x, atS.y, labelRadius ?? radius + 13, (startAngle + endAngle) / 2);
      nodes.push(svgEl('text', { x: mid.x, y: mid.y, class: 'diagram-angle-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: label }));
    }
    return nodes;
  });

  const tickNodes = (figure.ticks || []).flatMap(({ on, count = 1 }) => {
    const a = toScreen(on[0]);
    const b = toScreen(on[1]);
    if (!a || !b) return [];
    return tickMarkSegments(a, b, count).map((m) => svgEl('line', { x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2, class: 'diagram-mark' }));
  });

  const parallelNodes = (figure.parallels || []).flatMap(({ on, count = 1 }) => {
    const a = toScreen(on[0]);
    const b = toScreen(on[1]);
    if (!a || !b) return [];
    return chevronPoints(a, b, count).map((c) =>
      svgEl('polyline', { points: `${c.x1},${c.y1} ${c.x2},${c.y2} ${c.x3},${c.y3}`, class: 'diagram-mark diagram-mark--open' })
    );
  });

  const pointNodes = points
    .filter((p) => !p.hidden)
    .flatMap((p) => {
      const s = toScreen(p.id);
      const [dx, dy] = p.labelOffset || [9, -9];
      const label = p.label ?? p.id;
      const nodes = [svgEl('circle', { cx: s.x, cy: s.y, r: 3, class: 'diagram-point' })];
      if (label) nodes.push(svgEl('text', { x: s.x + dx, y: s.y + dy, class: 'diagram-point-label', text: label }));
      return nodes;
    });

  return svgEl('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'chart-svg plane-svg', 'aria-hidden': 'true' }, [
    defs.length ? svgEl('defs', {}, defs) : null,
    ...shadeNodes,
    ...shapeNodes,
    ...shadeLabels,
    ...rightAngleNodes,
    ...angleNodes,
    ...tickNodes,
    ...parallelNodes,
    ...pointNodes
  ]);
}

export function figureWidget(figure) {
  if (!figure) return null;
  const body =
    figure.type === 'coordinate-plane' ? renderCoordinatePlane(figure) :
    figure.type === 'diagram' ? renderDiagram(figure) :
    figure.type === 'venn' ? renderVenn(figure) :
    figure.type === 'solid' ? renderSolid(figure) :
    figure.type === 'clock' ? renderClock(figure) :
    figure.type === 'numberline' ? renderNumberLine(figure) :
    figure.type === 'dice' ? renderDice(figure) :
    figure.type === 'paper' ? renderPaper(figure) :
    null;
  if (!body) return null;
  return el('div.chart-wrap', {}, [
    figure.caption ? el('div.chart-caption', { text: figure.caption }) : null,
    el('div.chart-body.chart-body--pie', {}, [body]),
    figure.ariaSummary ? el('p.sr-only', { text: figure.ariaSummary }) : null
  ]);
}
