/**
 * Prisms, pyramids and frustums (src/utils/prismPyramid.js): every formula held
 * to an independent calculation. Volumes are summed from thin slices (the area of
 * each cross-section times its thickness); surfaces and lengths are measured on
 * the solid itself, corner by corner. The measured solids, which the generators
 * use as their second route, are checked first against shapes known by heart.
 */

import { describe, it, expect } from 'vitest';

import {
  coneCut,
  coneFrustum,
  distance3,
  faceAreas,
  frustumVolume,
  meshVolume,
  prism,
  prismMesh,
  pyramidFrustumMesh,
  pyramidMesh,
  regularCorners,
  regularPolygon,
  regularPyramid,
  regularPyramidFrustum,
  rightTriangle,
  root3Coefficient
} from '../src/utils/prismPyramid.js';

const close = (a, b, tolerance = 1e-9) => Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(b));
const sum = (list) => list.reduce((s, v) => s + v, 0);

/** Area of a flat polygon by the shoelace formula. */
const shoelace = (corners) => Math.abs(sum(corners.map(([x, z], i) => x * corners[(i + 1) % corners.length][1] - corners[(i + 1) % corners.length][0] * z))) / 2;

/** ∫₀ʰ area(y) dy by the midpoint rule on many thin slices. */
function sliced(area, h, slices = 20000) {
  const dy = h / slices;
  let total = 0;
  for (let k = 0; k < slices; k++) total += area((k + 0.5) * dy) * dy;
  return total;
}

describe('the measured solids', () => {
  it('measure a cube, a cuboid and a tetrahedron correctly', () => {
    const square = [[0, 0], [2, 0], [2, 2], [0, 2]];
    const cube = prismMesh(square, 2);
    expect(close(meshVolume(cube), 8)).toBe(true);
    expect(close(sum(faceAreas(cube)), 24)).toBe(true);
    const box = prismMesh([[0, 0], [5, 0], [5, 3], [0, 3]], 4);
    expect(close(meshVolume(box), 60)).toBe(true);
    expect(close(sum(faceAreas(box)), 2 * (15 + 20 + 12))).toBe(true);
    // The corner of a unit cube: volume 1/6, three right-angled faces of ½ and one equilateral face of side √2.
    const corner = pyramidMesh([[0, 0], [1, 0], [0, 1]], 1);
    corner.vertices[3] = [0, 1, 0];
    expect(close(meshVolume(corner), 1 / 6)).toBe(true);
    expect(close(sum(faceAreas(corner)), 1.5 + (Math.sqrt(3) / 4) * 2)).toBe(true);
  });
});

describe('bases', () => {
  it('give a regular polygon the area the shoelace formula measures, and the right apothem and circumradius', () => {
    for (const n of [3, 4, 5, 6, 8]) {
      for (const a of [1, 4, 7.5]) {
        const p = regularPolygon(n, a);
        const corners = regularCorners(n, a);
        expect(close(p.area, shoelace(corners)), `n=${n} a=${a}`).toBe(true);
        expect(close(p.circumradius, Math.hypot(...corners[0]))).toBe(true);
        const mid = [(corners[0][0] + corners[1][0]) / 2, (corners[0][1] + corners[1][1]) / 2];
        expect(close(p.apothem, Math.hypot(...mid))).toBe(true);
        expect(close(p.perimeter, n * a)).toBe(true);
      }
    }
    expect(close(regularPolygon(3, 8).area, root3Coefficient.triangle(8) * Math.sqrt(3))).toBe(true); // 16√3
    expect(close(regularPolygon(6, 6).area, root3Coefficient.hexagon(6) * Math.sqrt(3))).toBe(true); // 54√3
    expect(close(regularPolygon(4, 5).area, 25)).toBe(true);
  });

  it('give a right triangle its area, perimeter and hypotenuse', () => {
    expect(rightTriangle(5, 12)).toEqual({ area: 30, perimeter: 30, hypotenuse: 13 });
    expect(close(rightTriangle(6, 8).area, shoelace([[0, 0], [6, 0], [0, 8]]))).toBe(true);
  });
});

describe('right prisms', () => {
  it('match the measured solid for every base', () => {
    const bases = [
      { corners: [[0, 0], [5, 0], [0, 12]], ...rightTriangle(5, 12) },
      { corners: regularCorners(3, 8), ...regularPolygon(3, 8) },
      { corners: regularCorners(6, 4), ...regularPolygon(6, 4) },
      { corners: regularCorners(4, 7), ...regularPolygon(4, 7) }
    ];
    for (const base of bases) {
      for (const h of [1, 10, 18]) {
        const p = prism(base.area, base.perimeter, h);
        const mesh = prismMesh(base.corners, h);
        const faces = faceAreas(mesh);
        expect(close(p.volume, meshVolume(mesh))).toBe(true);
        expect(close(p.lateral, sum(faces.slice(2)))).toBe(true);
        expect(close(p.total, sum(faces))).toBe(true);
      }
    }
    // The 5-12-13 prism of height 18: 540 + 2 × 30 = 600.
    expect(prism(30, 30, 18)).toEqual({ volume: 540, lateral: 540, total: 600 });
  });
});

describe('right regular pyramids', () => {
  it('hold a third of the prism, slice by slice', () => {
    for (const n of [3, 4, 6]) {
      for (const [a, h] of [[12, 8], [16, 15], [6, 8], [3, 20]]) {
        const p = regularPyramid(n, a, h);
        // A cut at height y is the base shrunk by (1 − y/h), so its area shrinks by the square.
        expect(close(p.volume, sliced((y) => p.baseArea * (1 - y / h) ** 2, h), 1e-6), `n=${n} a=${a} h=${h}`).toBe(true);
        expect(close(p.volume, meshVolume(pyramidMesh(regularCorners(n, a), h)))).toBe(true);
      }
    }
  });

  it('measure the slant height to the middle of a side and the lateral edge to a corner', () => {
    for (const n of [3, 4, 6]) {
      for (const [a, h] of [[12, 8], [10, Math.sqrt(119)], [6, 8]]) {
        const p = regularPyramid(n, a, h);
        const mesh = pyramidMesh(regularCorners(n, a), h);
        const apex = mesh.vertices[n];
        const [c0, c1] = [mesh.vertices[0], mesh.vertices[1]];
        expect(close(p.slant, distance3(apex, c0.map((v, i) => (v + c1[i]) / 2)))).toBe(true);
        expect(close(p.edge, distance3(apex, c0))).toBe(true);
        const faces = faceAreas(mesh);
        expect(close(p.lateral, sum(faces.slice(1)))).toBe(true);
        expect(close(p.total, sum(faces))).toBe(true);
        expect(p.edge).toBeGreaterThan(p.slant);
      }
    }
    // Base 12, height 8: slant 10 (from half the side, 6), lateral edge √136 (from half the diagonal, 6√2).
    const sq = regularPyramid(4, 12, 8);
    expect(close(sq.slant, 10)).toBe(true);
    expect(close(sq.edge, Math.sqrt(136))).toBe(true);
    // Base 16, height 15: slant 17, lateral surface ½ × 64 × 17 = 544, total 800, volume 1280.
    const big = regularPyramid(4, 16, 15);
    expect([big.slant, big.lateral, big.total, big.volume].map((v) => Math.round(v * 1e9) / 1e9)).toEqual([17, 544, 800, 1280]);
  });
});

describe('frustums', () => {
  it('give a cone frustum the volume of its slices, and of the big cone minus the small one', () => {
    for (const [R, r, h] of [[28, 7, 45], [14, 7, 24], [7, 14, 24], [10, 4, 8], [21, 7, 18], [5, 4.99, 3]]) {
      const f = coneFrustum(R, r, h);
      const radius = (y) => R + ((r - R) * y) / h;
      expect(close(f.volume, sliced((y) => Math.PI * radius(y) ** 2, h), 1e-6), `${R} ${r} ${h}`).toBe(true);
      // Extend the sides to the apex: the big cone has height h × R/(R − r), the small one h × r/(R − r).
      const [big, small] = [Math.max(R, r), Math.min(R, r)];
      const H = (h * big) / (big - small);
      const cone = (rad, ht) => (Math.PI * rad * rad * ht) / 3;
      expect(close(f.volume, cone(big, H) - cone(small, H - h), 1e-9)).toBe(true);
      // Curved surface: the big cone's πRL minus the small cone's πrℓ, with slants from the apex.
      const L = Math.hypot(H, big);
      const ell = Math.hypot(H - h, small);
      expect(close(f.curved, Math.PI * big * L - Math.PI * small * ell, 1e-9)).toBe(true);
      expect(close(f.slant, L - ell, 1e-9)).toBe(true);
      expect(close(f.total, f.curved + Math.PI * (R * R + r * r))).toBe(true);
      expect(close(f.openBucket, f.curved + Math.PI * small * small)).toBe(true);
    }
  });

  it('works the classic numbers with π = 22/7', () => {
    // The tub: radii 28 and 7, height 45 → 48 510 cm³ = 48.51 litres.
    expect(Math.round(coneFrustum(28, 7, 45, 22 / 7).volume * 1e6) / 1e6).toBe(48510);
    // The bucket: radii 14 (top) and 7 (bottom), depth 24 → slant 25, curved 1650, open bucket 1804, closed 2420.
    const bucket = coneFrustum(7, 14, 24, 22 / 7);
    expect([bucket.slant, bucket.curved, bucket.openBucket, bucket.total].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([25, 1650, 1804, 2420]);
  });

  it('give a pyramid frustum (h/3)(A₁ + A₂ + √(A₁A₂)), matching its slices and the measured solid', () => {
    for (const n of [3, 4, 6]) {
      for (const [a, b, h] of [[12, 6, 9], [10, 4, 4], [8, 7, 2]]) {
        const f = regularPyramidFrustum(n, a, b, h);
        const width = (y) => a + ((b - a) * y) / h;
        expect(close(f.volume, sliced((y) => regularPolygon(n, width(y)).area, h), 1e-6)).toBe(true);
        const mesh = pyramidFrustumMesh(regularCorners(n, a), b / a, h);
        expect(close(f.volume, meshVolume(mesh))).toBe(true);
        const faces = faceAreas(mesh);
        expect(close(f.lateral, sum(faces.slice(2)))).toBe(true);
        expect(close(f.total, sum(faces))).toBe(true);
      }
    }
    // Square 12 → 6, height 9: 3 × (144 + 36 + 72) = 756, which is the 18-high pyramid (864) minus the 9-high one (108).
    expect(frustumVolume(144, 36, 9)).toBe(756);
    expect(regularPyramid(4, 12, 18).volume - regularPyramid(4, 6, 9).volume).toBeCloseTo(756, 9);
  });
});

describe('a cone cut parallel to its base', () => {
  it('leaves k³ of the volume in the small cone, the rest in a frustum of the same volume as the formula', () => {
    for (const R of [3, 7, 14]) {
      for (const H of [6, 12, 30]) {
        for (let k = 0.05; k < 1; k += 0.05) {
          const cut = coneCut(R, H, k);
          // The small cone measured on its own: radius kR, height kH.
          expect(close(cut.small, (Math.PI * (k * R) ** 2 * (k * H)) / 3)).toBe(true);
          expect(close(cut.frustum, coneFrustum(R, k * R, (1 - k) * H).volume, 1e-9)).toBe(true);
          expect(close(cut.smallShare + cut.frustumShare, 1)).toBe(true);
        }
      }
    }
    // Cut halfway up: the top holds 1/8, the frustum 7/8.
    expect(coneCut(7, 24, 0.5).frustumShare).toBe(7 / 8);
    // Trisecting the height: cumulative 1, 8, 27, so the pieces are 1 : 7 : 19.
    const tops = [1 / 3, 2 / 3, 1].map((k) => coneCut(3, 9, k).small);
    const pieces = [tops[0], tops[1] - tops[0], tops[2] - tops[1]].map((v) => Math.round((v / tops[0]) * 1e9) / 1e9);
    expect(pieces).toEqual([1, 7, 19]);
  });
});
