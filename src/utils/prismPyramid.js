/**
 * Pure maths for right prisms, right regular pyramids and frustums (the
 * mensuration-3d Advanced unit): the textbook formulas, and, as a second and
 * independent route, solids built corner by corner whose volume and surface are
 * measured directly (no formula for any particular shape). The generators check
 * their answers against the measured solids; tests/prismPyramid.test.js holds the
 * formulas to them and to sliced-up cross-sections.
 */

/* --------------------------------- bases --------------------------------- */

/** A regular n-gon of side a: area, perimeter, apothem (centre to the middle of a side) and circumradius (centre to a corner). */
export function regularPolygon(n, a) {
  const apothem = a / (2 * Math.tan(Math.PI / n));
  const circumradius = a / (2 * Math.sin(Math.PI / n));
  return { n, side: a, perimeter: n * a, area: (n * a * apothem) / 2, apothem, circumradius };
}

/** A right triangle with legs p and q. */
export function rightTriangle(p, q) {
  const hypotenuse = Math.hypot(p, q);
  return { area: (p * q) / 2, perimeter: p + q + hypotenuse, hypotenuse };
}

/** Equilateral triangle (√3/4)a² and regular hexagon (3√3/2)a², as multiples of √3: area = coefficient × √3. */
export const root3Coefficient = { triangle: (a) => (a * a) / 4, hexagon: (a) => (3 * a * a) / 2 };

/* --------------------------------- solids --------------------------------- */

/** Right prism: volume = base × h, lateral = perimeter × h, total = lateral + 2 × base. */
export function prism(baseArea, perimeter, h) {
  const lateral = perimeter * h;
  return { volume: baseArea * h, lateral, total: lateral + 2 * baseArea };
}

/**
 * Right pyramid on a regular n-gon of side a, height h: volume = ⅓ base × h;
 * slant height of a face √(h² + apothem²); lateral edge √(h² + circumradius²);
 * lateral surface ½ × perimeter × slant; total = lateral + base.
 */
export function regularPyramid(n, a, h) {
  const base = regularPolygon(n, a);
  const slant = Math.hypot(h, base.apothem);
  const edge = Math.hypot(h, base.circumradius);
  const lateral = (base.perimeter * slant) / 2;
  return { baseArea: base.area, volume: (base.area * h) / 3, slant, edge, lateral, total: lateral + base.area };
}

/** Frustum of any pyramid (or cone) with end areas A1, A2 and height h: (h/3)(A1 + A2 + √(A1 A2)). */
export const frustumVolume = (A1, A2, h) => (h / 3) * (A1 + A2 + Math.sqrt(A1 * A2));

/** Frustum of a right regular pyramid: bottom side a, top side b, height h. */
export function regularPyramidFrustum(n, a, b, h) {
  const bottom = regularPolygon(n, a);
  const top = regularPolygon(n, b);
  const slant = Math.hypot(h, bottom.apothem - top.apothem);
  const lateral = ((bottom.perimeter + top.perimeter) * slant) / 2;
  return { volume: frustumVolume(bottom.area, top.area, h), slant, lateral, total: lateral + bottom.area + top.area };
}

/**
 * Frustum of a cone with end radii R and r and height h, with the π given:
 * volume (πh/3)(R² + Rr + r²), slant √(h² + (R − r)²), curved surface πl(R + r),
 * total with both ends, and an open bucket (closed only at the narrower end).
 */
export function coneFrustum(R, r, h, pi = Math.PI) {
  const slant = Math.hypot(h, R - r);
  const curved = pi * slant * (R + r);
  return {
    volume: ((pi * h) / 3) * (R * R + R * r + r * r),
    slant,
    curved,
    total: curved + pi * (R * R + r * r),
    openBucket: curved + pi * Math.min(R, r) ** 2
  };
}

/**
 * A cone (radius R, height H) cut parallel to its base, leaving a small cone on
 * top whose height is k × H. The small cone is similar, so it holds k³ of the
 * volume; the frustum keeps 1 − k³.
 */
export function coneCut(R, H, k, pi = Math.PI) {
  const whole = (pi * R * R * H) / 3;
  const small = whole * k ** 3;
  return { whole, small, frustum: whole - small, smallShare: k ** 3, frustumShare: 1 - k ** 3, r: k * R, smallHeight: k * H, frustumHeight: (1 - k) * H };
}

/* ------------------- measured solids: the independent route ------------------- */

/** Corners [x, z] of a regular n-gon of side a about the origin. */
export function regularCorners(n, a) {
  const R = a / (2 * Math.sin(Math.PI / n));
  return Array.from({ length: n }, (_, i) => [R * Math.cos((2 * Math.PI * i) / n), R * Math.sin((2 * Math.PI * i) / n)]);
}

const centroid2 = (corners) => corners.reduce(([x, z], [cx, cz]) => [x + cx / corners.length, z + cz / corners.length], [0, 0]);

/** A right prism over a base polygon (corners [x, z] in order), height h. Face 0 is the bottom, 1 the top. */
export function prismMesh(corners, h) {
  const n = corners.length;
  const vertices = [...corners.map(([x, z]) => [x, 0, z]), ...corners.map(([x, z]) => [x, h, z])];
  const faces = [corners.map((_, i) => i), corners.map((_, i) => n + i), ...corners.map((_, i) => [i, (i + 1) % n, n + ((i + 1) % n), n + i])];
  return { vertices, faces };
}

/** A pyramid over a base polygon with its apex h straight above the base's centroid. Face 0 is the base. */
export function pyramidMesh(corners, h) {
  const n = corners.length;
  const [cx, cz] = centroid2(corners);
  const vertices = [...corners.map(([x, z]) => [x, 0, z]), [cx, h, cz]];
  return { vertices, faces: [corners.map((_, i) => i), ...corners.map((_, i) => [i, (i + 1) % n, n])] };
}

/** A pyramid frustum: the base polygon, and above it at height h the same polygon shrunk by `scale` about its centroid. Faces 0 and 1 are the ends. */
export function pyramidFrustumMesh(corners, scale, h) {
  const n = corners.length;
  const [cx, cz] = centroid2(corners);
  const vertices = [...corners.map(([x, z]) => [x, 0, z]), ...corners.map(([x, z]) => [cx + (x - cx) * scale, h, cz + (z - cz) * scale])];
  const faces = [corners.map((_, i) => i), corners.map((_, i) => n + i), ...corners.map((_, i) => [i, (i + 1) % n, n + ((i + 1) % n), n + i])];
  return { vertices, faces };
}

const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];

/** Area of each face, measured by cutting it into triangles from its first corner. */
export function faceAreas(mesh) {
  return mesh.faces.map((face) => {
    let total = 0;
    for (let k = 1; k + 1 < face.length; k++) {
      const [p, q, s] = [face[0], face[k], face[k + 1]].map((i) => mesh.vertices[i]);
      total += Math.hypot(...cross(sub(q, p), sub(s, p))) / 2;
    }
    return total;
  });
}

/** Volume of a convex solid: cones from an inside point to every face (a face's area × its distance ÷ 3). */
export function meshVolume(mesh) {
  const inside = mesh.vertices.reduce((c, v) => c.map((x, i) => x + v[i] / mesh.vertices.length), [0, 0, 0]);
  let total = 0;
  for (const face of mesh.faces) {
    for (let k = 1; k + 1 < face.length; k++) {
      const [p, q, s] = [face[0], face[k], face[k + 1]].map((i) => mesh.vertices[i]);
      total += Math.abs(dot(cross(sub(q, p), sub(s, p)), sub(inside, p))) / 6;
    }
  }
  return total;
}

/** Straight-line distance between two corners of a solid. */
export const distance3 = (p, q) => Math.hypot(...sub(p, q));
