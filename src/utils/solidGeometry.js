/**
 * Pure geometry for 3D solid drawings (`figure.type === 'solid'`), in the
 * textbook style: circles seen from slightly above as ellipses, the back half
 * of every base and joint dashed, hidden cuboid edges dashed, and radius,
 * height and diagonal guides drawn as dashed lines with their labels.
 *
 * Works in model units (y up), drawn to scale. `components/solid.js` fits the
 * result into the SVG and draws it. Nothing here touches the DOM, so it is
 * unit-tested directly.
 *
 *   { type: 'solid', parts: [
 *       { shape: 'cylinder', r: 7, h: 10, labels: { r: '7 cm', h: '10 cm' } },
 *       { shape: 'cone', r: 7, h: 24, labels: { h: '24 cm', l: '?' } } ] }
 *
 * Parts stack from the bottom up on one vertical axis. Shapes and their sizes:
 *   cube { a }  ·  cuboid { l, b, h }       (on their own only)
 *   sphere { r }                             (on its own only)
 *   cylinder { r, h }  ·  cone { r, h, down? }  ·  hemisphere { r, down? }
 *   frustum { R, r, h }  (R at the bottom, r at the top)
 * `down: true` turns a cone point-down (an ice-cream cone) or a hemisphere
 * dome-down (a bowl); either can only be the bottom part.
 * Label keys: cube a, d · cuboid l, b, h, d · cylinder r, h · cone r, h, l ·
 * sphere r · hemisphere r · frustum R, r, h, l (d = space diagonal, l = slant).
 */

/** How flat a circle looks from slightly above: the ellipse's height ÷ width. */
export const ELLIPSE_RATIO = 0.3;
/** Cuboid depth: drawn at this angle, foreshortened by this factor. */
const DEPTH_ANGLE = (35 * Math.PI) / 180;
const DEPTH_SCALE = 0.55;
const STEPS = 48;

export const SOLID_SHAPES = {
  cube: { sizes: ['a'], labels: ['a', 'd'], alone: true },
  cuboid: { sizes: ['l', 'b', 'h'], labels: ['l', 'b', 'h', 'd'], alone: true },
  sphere: { sizes: ['r'], labels: ['r'], alone: true },
  cylinder: { sizes: ['r', 'h'], labels: ['r', 'h'] },
  cone: { sizes: ['r', 'h'], labels: ['r', 'h', 'l'], canPointDown: true },
  hemisphere: { sizes: ['r'], labels: ['r'], canPointDown: true },
  frustum: { sizes: ['R', 'r', 'h'], labels: ['R', 'r', 'h', 'l'] }
};

/** Problems with a figure's parts, as messages (empty when it can be drawn). */
export function solidProblems(figure) {
  const parts = figure?.parts;
  if (!Array.isArray(parts) || !parts.length) return ['solid figure needs a non-empty parts list'];
  const problems = [];
  parts.forEach((part, i) => {
    const spec = SOLID_SHAPES[part.shape];
    const where = `part ${i + 1}`;
    if (!spec) {
      problems.push(`${where}: shape must be one of ${Object.keys(SOLID_SHAPES).join(', ')}`);
      return;
    }
    if (spec.alone && parts.length > 1) problems.push(`${where}: a ${part.shape} cannot be stacked with other parts`);
    for (const key of spec.sizes) {
      if (!(Number.isFinite(part[key]) && part[key] > 0)) problems.push(`${where}: ${part.shape} needs a positive ${key}`);
    }
    if (part.down && !spec.canPointDown) problems.push(`${where}: only a cone or hemisphere can point down`);
    if (part.down && i !== 0) problems.push(`${where}: only the bottom part can point down`);
    if (part.shape === 'cone' && !part.down && i !== parts.length - 1) problems.push(`${where}: nothing can sit on the point of a cone`);
    if (part.shape === 'hemisphere' && !part.down && i !== parts.length - 1) problems.push(`${where}: nothing can sit on a dome`);
    for (const [key, text] of Object.entries(part.labels || {})) {
      if (!spec.labels.includes(key)) problems.push(`${where}: label "${key}" is not one of ${spec.labels.join(', ')} for a ${part.shape}`);
      if (typeof text !== 'string' || !text.trim()) problems.push(`${where}: label "${key}" must be non-empty text`);
    }
  });
  return problems;
}

/* ------------------------------ building blocks ------------------------------ */

const line = (pts, dashed = false) => ({ pts, dashed });

/** Points along an ellipse arc of a horizontal circle (radius r, at height y), angles in radians. */
function arc(r, y, from, to) {
  const pts = [];
  const n = Math.max(2, Math.round((STEPS * Math.abs(to - from)) / (2 * Math.PI)));
  for (let i = 0; i <= n; i++) {
    const t = from + ((to - from) * i) / n;
    pts.push([r * Math.cos(t), y + ELLIPSE_RATIO * r * Math.sin(t)]);
  }
  return pts;
}

/** A horizontal circle seen from above: the front half solid; the back half solid too when `whole`, else dashed. */
function ring(r, y, whole) {
  return [line(arc(r, y, Math.PI, 2 * Math.PI)), line(arc(r, y, 0, Math.PI), !whole)];
}

/** Points along the outline of a vertical half-circle (the dome of a hemisphere or sphere). */
function dome(r, y, up) {
  const pts = [];
  for (let i = 0; i <= STEPS / 2; i++) {
    const t = (Math.PI * i) / (STEPS / 2);
    pts.push([r * Math.cos(t), y + (up ? 1 : -1) * r * Math.sin(t)]);
  }
  return pts;
}

const label = (text, x, y, dx, dy, anchor = 'middle') => ({ text, x, y, dx, dy, anchor });

/* --------------------------------- the shapes --------------------------------- */

function cuboid(l, b, h, labels) {
  const dx = b * DEPTH_SCALE * Math.cos(DEPTH_ANGLE);
  const dy = b * DEPTH_SCALE * Math.sin(DEPTH_ANGLE);
  const lines = [
    line([[0, 0], [l, 0], [l, h], [0, h], [0, 0]]),
    line([[0, h], [dx, h + dy], [l + dx, h + dy], [l, h]]),
    line([[l, 0], [l + dx, dy], [l + dx, h + dy]]),
    line([[0, 0], [dx, dy]], true),
    line([[dx, dy], [l + dx, dy]], true),
    line([[dx, dy], [dx, h + dy]], true)
  ];
  const fills = [[[0, h], [dx, h + dy], [l + dx, h + dy], [l, h]]];
  const out = [];
  if (labels.l) out.push(label(labels.l, l / 2, 0, 0, 16));
  if (labels.h) out.push(label(labels.h, 0, h / 2, -8, 4, 'end'));
  if (labels.b) out.push(label(labels.b, l + dx / 2, dy / 2, 10, 10, 'start'));
  if (labels.a) out.push(label(labels.a, l / 2, 0, 0, 16));
  if (labels.d) {
    lines.push(line([[0, 0], [l + dx, h + dy]], true));
    out.push(label(labels.d, (l + dx) / 2, (h + dy) / 2, 6, -6, 'start'));
  }
  return { lines, fills, labels: out };
}

/** One round part between heights y0 and y0 + height; `first`/`last` decide which ellipses show. */
function roundPart(part, y0, first, last) {
  const L = part.labels || {};
  const lines = [];
  const fills = [];
  const labels = [];
  const flatTop = (r, y) => {
    if (last) {
      lines.push(...ring(r, y, true));
      fills.push(arc(r, y, 0, 2 * Math.PI));
    } else {
      lines.push(...ring(r, y, false));
    }
  };
  // The radius is a dashed line from the centre to the rim, labelled just outside the rim,
  // where it can never collide with the ellipse however small the circle is drawn.
  const radiusGuide = (r, y, text) => {
    lines.push(line([[0, y], [r, y]], true));
    labels.push(label(text, r, y, 8, 4, 'start'));
  };
  // The height is a dashed axis with its label centred on it (drawn with a halo, so it
  // reads cleanly over the line). Beside a sloping side it would read as the slant.
  const axisGuide = (yA, yB, text) => {
    lines.push(line([[0, yA], [0, yB]], true));
    if (text) labels.push(label(text, 0, (yA + yB) / 2, 0, 4));
  };

  if (part.shape === 'cylinder') {
    const { r, h } = part;
    if (first) lines.push(...ring(r, y0, false));
    lines.push(line([[-r, y0], [-r, y0 + h]]), line([[r, y0], [r, y0 + h]]));
    flatTop(r, y0 + h);
    if (L.r) radiusGuide(r, last ? y0 + h : y0, L.r);
    // Beside the left edge: radius labels sit at the right rim, so the two never meet.
    if (L.h) labels.push(label(L.h, -r, y0 + h / 2, -8, 4, 'end'));
    return { lines, fills, labels, height: h };
  }

  if (part.shape === 'cone') {
    const { r, h } = part;
    const base = part.down ? y0 + h : y0;
    const apex = part.down ? y0 : y0 + h;
    if (part.down) flatTop(r, base);
    else if (first) lines.push(...ring(r, base, false));
    lines.push(line([[-r, base], [0, apex], [r, base]]));
    if (L.r) radiusGuide(r, base, L.r);
    if (L.h) axisGuide(base, apex, L.h);
    if (L.l) labels.push(label(L.l, r / 2, (base + apex) / 2, 10, 0, 'start'));
    return { lines, fills, labels, height: h };
  }

  if (part.shape === 'hemisphere') {
    const { r } = part;
    if (part.down) {
      lines.push(line(dome(r, y0 + r, false)));
      flatTop(r, y0 + r);
      if (L.r) radiusGuide(r, y0 + r, L.r);
    } else {
      if (first) lines.push(...ring(r, y0, false));
      lines.push(line(dome(r, y0, true)));
      if (L.r) radiusGuide(r, y0, L.r);
    }
    return { lines, fills, labels, height: r };
  }

  if (part.shape === 'frustum') {
    const { R, r, h } = part;
    if (first) lines.push(...ring(R, y0, false));
    lines.push(line([[-R, y0], [-r, y0 + h]]), line([[R, y0], [r, y0 + h]]));
    flatTop(r, y0 + h);
    if (L.R) radiusGuide(R, y0, L.R);
    if (L.r) radiusGuide(r, y0 + h, L.r);
    if (L.h) axisGuide(y0, y0 + h, L.h);
    if (L.l) labels.push(label(L.l, (R + r) / 2, y0 + h / 2, 10, 0, 'start'));
    return { lines, fills, labels, height: h };
  }

  return { lines, fills, labels, height: 0 };
}

function sphere(r, labels) {
  const lines = [];
  const outline = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = (2 * Math.PI * i) / STEPS;
    outline.push([r * Math.cos(t), r + r * Math.sin(t)]);
  }
  lines.push(line(outline), ...ring(r, r, false));
  const out = [];
  if (labels.r) {
    lines.push(line([[0, r], [r, r]], true));
    out.push(label(labels.r, r, r, 8, 4, 'start'));
  }
  return { lines, fills: [], labels: out };
}

/**
 * The drawing for a solid figure, in model units (y up):
 * `{ lines: [{ pts, dashed }], fills: [pts], labels: [{ text, x, y, dx, dy, anchor }] }`,
 * or null if the figure cannot be drawn.
 */
export function solidDrawing(figure) {
  if (solidProblems(figure).length) return null;
  const parts = figure.parts;
  const only = parts[0];
  if (only.shape === 'cube') return cuboid(only.a, only.a, only.a, only.labels || {});
  if (only.shape === 'cuboid') return cuboid(only.l, only.b, only.h, only.labels || {});
  if (only.shape === 'sphere') return sphere(only.r, only.labels || {});

  const drawing = { lines: [], fills: [], labels: [] };
  let y = 0;
  parts.forEach((part, i) => {
    const piece = roundPart(part, y, i === 0, i === parts.length - 1);
    drawing.lines.push(...piece.lines);
    drawing.fills.push(...piece.fills);
    drawing.labels.push(...piece.labels);
    y += piece.height;
  });
  return drawing;
}

/** Total height of a stack of parts, in model units. */
export function solidHeight(figure) {
  return figure.parts.reduce((total, p) => {
    if (p.shape === 'cube') return total + p.a;
    if (p.shape === 'sphere') return total + 2 * p.r;
    if (p.shape === 'hemisphere') return total + p.r;
    return total + p.h;
  }, 0);
}
