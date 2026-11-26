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
 *
 * Flat-faced solids, on their own only, standing on a base of the given `base`:
 * triangle (equilateral, side a), square (side a), hexagon (regular, side a), or,
 * for a prism only, right-triangle (legs a and b):
 *   prism { base, a, b?, h }  ·  pyramid { base, a, h }  (a right, regular pyramid)
 *   pyramid-frustum { base, a, b, h }  (bottom side a, top side b < a)
 * Their hidden edges are worked out from which faces turn towards the viewer.
 *
 * Label keys: cube a, d · cuboid l, b, h, d · cylinder r, h · cone r, h, l ·
 * sphere r · hemisphere r · frustum R, r, h, l · prism a, b, h · pyramid a, h,
 * l, e · pyramid-frustum a, b, h, l (d = space diagonal, l = slant height of a
 * face or of the cone, e = lateral edge, b = the second leg or the top side).
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
  frustum: { sizes: ['R', 'r', 'h'], labels: ['R', 'r', 'h', 'l'] },
  // `bases` lists the bases each flat-faced solid can stand on, with any extra size that base needs.
  prism: { sizes: ['a', 'h'], labels: ['a', 'b', 'h'], alone: true, bases: { triangle: [], 'right-triangle': ['b'], square: [], hexagon: [] } },
  pyramid: { sizes: ['a', 'h'], labels: ['a', 'h', 'l', 'e'], alone: true, bases: { triangle: [], square: [], hexagon: [] } },
  'pyramid-frustum': { sizes: ['a', 'b', 'h'], labels: ['a', 'b', 'h', 'l'], alone: true, bases: { triangle: [], square: [], hexagon: [] } }
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
    const extraSizes = spec.bases?.[part.base] || [];
    if (spec.bases && !Object.hasOwn(spec.bases, part.base ?? '')) problems.push(`${where}: a ${part.shape} needs a base, one of ${Object.keys(spec.bases).join(', ')}`);
    if (!spec.bases && part.base !== undefined) problems.push(`${where}: only a prism, pyramid or pyramid-frustum has a base`);
    for (const key of [...spec.sizes, ...extraSizes]) {
      if (!(Number.isFinite(part[key]) && part[key] > 0)) problems.push(`${where}: ${part.shape} needs a positive ${key}`);
    }
    if (part.shape === 'prism' && part.base !== 'right-triangle' && (part.b !== undefined || part.labels?.b !== undefined)) {
      problems.push(`${where}: only a right-triangle prism has a second leg b`);
    }
    if (part.shape === 'pyramid-frustum' && part.b >= part.a) problems.push(`${where}: the top side b must be smaller than the base side a`);
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

/* ------------------------------ flat-faced solids ------------------------------ */

/**
 * A point (x, y, z) on the page, with z running back into the page: the same view
 * from slightly above that turns a circle into an ellipse ELLIPSE_RATIO tall.
 */
const project = ([x, y, z]) => [x, y + ELLIPSE_RATIO * z];
/** The direction towards the viewer (in front, z < 0, and above). A face is seen when its outward normal points this way. */
const TOWARDS_VIEWER = [0, ELLIPSE_RATIO, -1];
const RAD = Math.PI / 180;
/** Where a regular base's first corner sits (degrees round from the right, towards the back), chosen so two or three side faces show. */
const FIRST_CORNER = { triangle: 222, square: 250, hexagon: 15 };
const SIDES = { triangle: 3, square: 4, hexagon: 6 };
/** A right-triangle base is turned this far, so its two legs both show. */
const RIGHT_TRIANGLE_TURN = 20 * RAD;

/** The corners of a base, as [x, z] pairs, centred on the origin. */
export function baseCorners(base, a, b) {
  if (base === 'right-triangle') {
    const raw = [[0, 0], [a, 0], [0, b]].map(([x, z]) => [x - a / 3, z - b / 3]);
    const [c, s] = [Math.cos(RIGHT_TRIANGLE_TURN), Math.sin(RIGHT_TRIANGLE_TURN)];
    return raw.map(([x, z]) => [x * c - z * s, x * s + z * c]);
  }
  const n = SIDES[base];
  const R = a / (2 * Math.sin(Math.PI / n));
  return Array.from({ length: n }, (_, i) => {
    const t = (FIRST_CORNER[base] + (360 * i) / n) * RAD;
    return [R * Math.cos(t), R * Math.sin(t)];
  });
}

const sub = (p, q) => p.map((v, i) => v - q[i]);
const dot = (p, q) => p.reduce((sum, v, i) => sum + v * q[i], 0);
const mean = (pts) => pts[0].map((_, i) => pts.reduce((sum, p) => sum + p[i], 0) / pts.length);

/** A face's normal (Newell's method), turned to point away from the solid's centre. */
function outwardNormal(face, centre) {
  const n = [0, 0, 0];
  face.forEach((p, i) => {
    const q = face[(i + 1) % face.length];
    n[0] += (p[1] - q[1]) * (p[2] + q[2]);
    n[1] += (p[2] - q[2]) * (p[0] + q[0]);
    n[2] += (p[0] - q[0]) * (p[1] + q[1]);
  });
  return dot(n, sub(mean(face), centre)) < 0 ? n.map((v) => -v) : n;
}

/**
 * Every edge of a convex solid once, dashed when both faces that meet there turn
 * away from the viewer (so the outline and the near edges stay solid).
 * `faces` are lists of corner indices.
 */
function polyhedronEdges(vertices, faces) {
  const centre = mean(vertices);
  const seen = faces.map((face) => dot(outwardNormal(face.map((i) => vertices[i]), centre), TOWARDS_VIEWER) > 1e-9);
  const edges = new Map();
  faces.forEach((face, f) => {
    face.forEach((i, k) => {
      const j = face[(k + 1) % face.length];
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      const edge = edges.get(key) || { i, j, seen: false };
      edge.seen = edge.seen || seen[f];
      edges.set(key, edge);
    });
  });
  return [...edges.values()].map((e) => line([project(vertices[e.i]), project(vertices[e.j])], !e.seen));
}

/** Index of the base edge nearest the viewer (its middle furthest forward), and that middle. */
function frontEdge(corners) {
  let best = 0;
  const mid = (k) => mean([corners[k], corners[(k + 1) % corners.length]]);
  corners.forEach((_, k) => {
    if (mid(k)[1] < mid(best)[1]) best = k;
  });
  return { k: best, mid: mid(best) };
}

const extremeCorner = (corners, sign) => corners.reduce((best, c) => (sign * c[0] > sign * best[0] ? c : best), corners[0]);

function flatSolid(part) {
  const L = part.labels || {};
  const corners = baseCorners(part.base, part.a, part.b);
  const n = corners.length;
  const at = ([x, z], y, scale = 1) => [x * scale, y, z * scale];
  const lines = [];
  const fills = [];
  const labels = [];
  const front = frontEdge(corners);
  const frontMid = (y, scale = 1) => project(at(front.mid, y, scale));

  if (part.shape === 'prism') {
    const { h } = part;
    const vertices = [...corners.map((c) => at(c, 0)), ...corners.map((c) => at(c, h))];
    const faces = [corners.map((_, i) => i), corners.map((_, i) => n + i), ...corners.map((_, i) => [i, (i + 1) % n, n + ((i + 1) % n), n + i])];
    lines.push(...polyhedronEdges(vertices, faces));
    fills.push(corners.map((c) => project(at(c, h))));
    if (part.base === 'right-triangle') {
      // a along the first leg (corners 0 → 1), b along the second (corners 0 → 2).
      if (L.a) labels.push(label(L.a, ...project(at(mean([corners[0], corners[1]]), 0)), 0, 16));
      if (L.b) labels.push(label(L.b, ...project(at(mean([corners[0], corners[2]]), 0)), -8, 8, 'end'));
    } else if (L.a) {
      labels.push(label(L.a, ...frontMid(0), 0, 16));
    }
    if (L.h) {
      const right = extremeCorner(corners, 1);
      labels.push(label(L.h, ...project(at(right, h / 2)), 8, 4, 'start'));
    }
    return { lines, fills, labels };
  }

  if (part.shape === 'pyramid') {
    const { h } = part;
    const apex = [0, h, 0];
    const vertices = [...corners.map((c) => at(c, 0)), apex];
    const faces = [corners.map((_, i) => i), ...corners.map((_, i) => [i, (i + 1) % n, n])];
    lines.push(...polyhedronEdges(vertices, faces));
    if (L.a) labels.push(label(L.a, ...frontMid(0), 0, 16));
    // The height runs up the axis; the slant height runs up the middle of the front face.
    if (L.h) {
      lines.push(line([project([0, 0, 0]), project(apex)], true));
      labels.push(label(L.h, ...project([0, 0.4 * h, 0]), 0, 4));
    }
    if (L.l) {
      const foot = at(front.mid, 0);
      lines.push(line([project(foot), project(apex)], true));
      if (L.h) lines.push(line([project([0, 0, 0]), project(foot)], true));
      const p = foot.map((v, i) => v + 0.6 * (apex[i] - v));
      labels.push(label(L.l, ...project(p), 8, 4, 'start'));
    }
    if (L.e) {
      const left = extremeCorner(corners, -1);
      labels.push(label(L.e, ...project(at(left, 0).map((v, i) => (v + apex[i]) / 2)), -8, 4, 'end'));
    }
    return { lines, fills, labels };
  }

  // pyramid-frustum: the top is the base shrunk by b/a, straight above it.
  const { a, b, h } = part;
  const s = b / a;
  const vertices = [...corners.map((c) => at(c, 0)), ...corners.map((c) => at(c, h, s))];
  const faces = [corners.map((_, i) => i), corners.map((_, i) => n + i), ...corners.map((_, i) => [i, (i + 1) % n, n + ((i + 1) % n), n + i])];
  lines.push(...polyhedronEdges(vertices, faces));
  fills.push(corners.map((c) => project(at(c, h, s))));
  if (L.a) labels.push(label(L.a, ...frontMid(0), 0, 16));
  if (L.b) labels.push(label(L.b, ...frontMid(h, s), 0, -6));
  if (L.h) {
    lines.push(line([project([0, 0, 0]), project([0, h, 0])], true));
    labels.push(label(L.h, ...project([0, 0.4 * h, 0]), 0, 4));
  }
  if (L.l) {
    lines.push(line([frontMid(0), frontMid(h, s)], true));
    const p = project(at(front.mid, h / 2, (1 + s) / 2));
    labels.push(label(L.l, ...p, 8, 4, 'start'));
  }
  return { lines, fills, labels };
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
  if (SOLID_SHAPES[only.shape].bases) return flatSolid(only);

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

/**
 * Where a point of a box appears in the drawing, with the same slant as the
 * cube and cuboid above: x along the front, y up, z going back (model units).
 * The cube-cutting simulation and the dice figures use it, so every box in the
 * app is drawn the same way.
 */
export function obliquePoint(x, y, z) {
  return [x + z * DEPTH_SCALE * Math.cos(DEPTH_ANGLE), y + z * DEPTH_SCALE * Math.sin(DEPTH_ANGLE)];
}
