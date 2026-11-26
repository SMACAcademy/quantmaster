/** Simulations for triangles, circles, polygons and solids. */

import { near, show } from './core.js';

const RAD = Math.PI / 180;

export const triangleAngles = {
  id: 'triangle-angles',
  topicId: 'triangles',
  title: 'Angles of a triangle',
  summary: 'Choose two angles and the third is fixed: they always add to 180°. Watch the shape and its type change.',
  controls: [
    { id: 'angleA', label: 'Angle A', type: 'range', min: 10, max: 160, step: 5, default: 50, unit: '°' },
    { id: 'angleB', label: 'Angle B', type: 'range', min: 10, max: 160, step: 5, default: 60, unit: '°' }
  ],
  compute({ angleA: A, angleB: B }) {
    const C = 180 - A - B;
    if (C <= 0) {
      return {
        numbers: { C, valid: false },
        readouts: [
          { label: 'Angle C = 180° − A − B', value: `${show(C)}°: impossible` },
          { label: 'Why', value: `A + B is already ${show(A + B)}°` }
        ],
        plot: { kind: 'triangle', valid: false, summary: `Angles of ${A}° and ${B}° leave nothing for the third angle.` },
        insight: 'Two angles that add to 180° or more cannot be in a triangle: the third angle would be zero or negative.'
      };
    }
    // Sides from the sine rule, with the side opposite C fixed at 1.
    const a = Math.sin(A * RAD) / Math.sin(C * RAD);
    const b = Math.sin(B * RAD) / Math.sin(C * RAD);
    const c = 1;
    const points = [
      [0, 0],
      [c, 0],
      [b * Math.cos(A * RAD), b * Math.sin(A * RAD)]
    ];
    const angles = [A, B, C];
    const largest = Math.max(...angles);
    const byAngle = largest > 90 ? 'Obtuse' : largest === 90 ? 'Right-angled' : 'Acute';
    const equalPairs = [A === B, B === C, A === C].filter(Boolean).length;
    const bySide = equalPairs === 3 ? 'Equilateral' : equalPairs >= 1 ? 'Isosceles' : 'Scalene';
    const sides = [a, b, c];
    const hyp = Math.max(...sides);
    const others = sides.filter((s, i) => i !== sides.indexOf(hyp));
    return {
      numbers: { C, valid: true, a, b, c, byAngle, bySide },
      readouts: [
        { label: 'Angle C = 180° − A − B', value: `${show(C)}°` },
        { label: 'Exterior angle at C = A + B', value: `${show(A + B)}°` },
        { label: 'Type', value: `${byAngle}, ${bySide.toLowerCase()}` },
        largest === 90
          ? { label: 'Pythagoras: legs² sum vs hypotenuse²', value: `${show(others[0] ** 2 + others[1] ** 2, 4)} = ${show(hyp ** 2, 4)}` }
          : { label: 'Longest side is opposite', value: `the largest angle (${show(largest)}°)` }
      ],
      plot: {
        kind: 'triangle',
        valid: true,
        points,
        labels: ['A', 'B', 'C'],
        angles,
        right: angles.indexOf(90),
        summary: `A triangle with angles ${A}°, ${B}° and ${C}°: ${byAngle.toLowerCase()} and ${bySide.toLowerCase()}.`
      },
      insight:
        largest === 90
          ? 'A right angle: the square on the longest side equals the sum of the squares on the other two.'
          : `The exterior angle at C (${show(A + B)}°) equals the two interior angles opposite it, A + B.`
    };
  },
  tasks: [
    {
      id: 'equilateral',
      prompt: 'Make the triangle equilateral.',
      check: (values, n) => n.valid && n.bySide === 'Equilateral',
      solution: { angleA: 60, angleB: 60 }
    },
    {
      id: 'right',
      prompt: 'Make a right-angled triangle and check Pythagoras.',
      check: (values, n) => n.valid && n.byAngle === 'Right-angled',
      solution: { angleA: 30, angleB: 60 }
    },
    {
      id: 'isosceles-obtuse',
      prompt: 'Make a triangle that is both isosceles and obtuse.',
      check: (values, n) => n.valid && n.bySide === 'Isosceles' && n.byAngle === 'Obtuse',
      solution: { angleA: 30, angleB: 30 }
    }
  ]
};

/** Angle at P between the rays to A and B, in degrees. */
function angleAt(p, a, b) {
  const u = [a[0] - p[0], a[1] - p[1]];
  const v = [b[0] - p[0], b[1] - p[1]];
  const cos = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v));
  return Math.acos(Math.max(-1, Math.min(1, cos))) / RAD;
}

/** A point on the unit circle at `deg` clockwise from the top (y up). */
const onCircle = (deg) => [Math.sin(deg * RAD), Math.cos(deg * RAD)];

export const circleAngles = {
  id: 'circle-angles',
  topicId: 'circles',
  title: 'The angle at the centre is twice the angle at the edge',
  summary: 'Move the point P around the circle: the angle it makes with A and B never changes, until P crosses to the other arc.',
  controls: [
    { id: 'arc', label: 'Arc AB (angle at the centre)', type: 'range', min: 20, max: 340, step: 20, default: 100, unit: '°' },
    { id: 'p', label: 'Position of P', type: 'range', min: 0, max: 355, step: 5, default: 0, unit: '°' }
  ],
  compute({ arc, p }) {
    // The arc AB is centred on the bottom of the circle (180° clockwise from the top).
    const startA = 180 - arc / 2;
    const endB = 180 + arc / 2;
    const A = onCircle(startA);
    const B = onCircle(endB);
    const P = onCircle(p);
    const onArc = p > startA && p < endB;
    const touching = [startA, endB].some((deg) => Math.abs(((p - deg + 540) % 360) - 180) < 1);
    const measured = touching ? null : angleAt(P, A, B);
    const expected = onArc ? 180 - arc / 2 : arc / 2;
    return {
      numbers: { measured, expected, onArc, touching },
      readouts: [
        { label: 'Angle AOB at the centre', value: `${show(arc)}°` },
        { label: 'Angle APB at the edge (measured)', value: touching ? 'P is on A or B: move it' : `${show(measured, 1)}°` },
        {
          label: 'Rule',
          value: onArc ? `P is on the arc itself: 180° − ${show(arc)}°/2 = ${show(expected, 1)}°` : `Half the angle at the centre = ${show(expected, 1)}°`
        }
      ],
      plot: {
        kind: 'circle',
        a: A,
        b: B,
        p: P,
        arcFrom: startA,
        arcTo: endB,
        showP: !touching,
        summary: touching
          ? 'P sits on A or B, so there is no angle at P.'
          : `With a ${arc}° arc, the angle at P is ${show(measured, 1)}°.`
      },
      insight: touching
        ? 'Move P off A and B to see the angle.'
        : arc === 180 && !onArc
          ? 'AB is a diameter, so the angle at P is a right angle: the angle in a semicircle is 90°.'
          : onArc
            ? 'P now sits on the arc AB itself, so it looks at the other arc: the two possible angles add to 180°, as in a cyclic quadrilateral.'
            : 'Move P anywhere on the big arc: the angle stays the same. Angles in the same segment are equal.'
    };
  },
  tasks: [
    {
      id: 'semicircle',
      prompt: 'Make the angle at P exactly 90°.',
      check: (values, n) => n.measured !== null && near(n.measured, 90, 1e-6),
      solution: { arc: 180, p: 0 }
    },
    {
      id: 'thirty',
      prompt: 'Make the angle at P exactly 30°.',
      check: (values, n) => n.measured !== null && near(n.measured, 30, 1e-6),
      solution: { arc: 60, p: 0 }
    },
    {
      id: 'other-arc',
      prompt: 'Move P onto the arc AB and see the angle become 180° minus half the arc.',
      check: (values, n) => n.onArc && n.measured !== null,
      solution: { arc: 100, p: 180 }
    }
  ]
};

export const polygonAngles = {
  id: 'polygon-angles',
  topicId: 'polygons',
  title: 'Angles of a regular polygon',
  summary: 'Add sides and watch the interior angles open up while the exterior angles always total 360°.',
  controls: [{ id: 'n', label: 'Number of sides', type: 'range', min: 3, max: 20, step: 1, default: 5 }],
  compute({ n }) {
    const sum = (n - 2) * 180;
    const interior = sum / n;
    const exterior = 360 / n;
    const diagonals = (n * (n - 3)) / 2;
    return {
      numbers: { sum, interior, exterior, diagonals },
      readouts: [
        { label: 'Sum of interior angles (n − 2) × 180°', value: `${show(sum)}°` },
        { label: 'Each interior angle', value: `${show(interior, 2)}°` },
        { label: 'Each exterior angle 360° ÷ n', value: `${show(exterior, 2)}°` },
        { label: 'Diagonals n(n − 3) ÷ 2', value: show(diagonals) }
      ],
      plot: {
        kind: 'polygon',
        n,
        diagonals: n <= 12,
        interior,
        exterior,
        summary: `A regular ${n}-sided polygon: each interior angle ${show(interior, 2)}°, each exterior angle ${show(exterior, 2)}°, ${diagonals} diagonals.`
      },
      insight: `Interior + exterior = 180° at every corner (${show(interior, 2)}° + ${show(exterior, 2)}°). Walking round, you turn through the exterior angles once: 360° in all.`
    };
  },
  tasks: [
    { id: 'one-forty', prompt: 'Find the polygon whose interior angles are each 140°.', check: (values, n) => near(n.interior, 140), solution: { n: 9 } },
    { id: 'twenty', prompt: 'Find the polygon with exactly 20 diagonals.', check: (values, n) => n.diagonals === 20, solution: { n: 8 } },
    { id: 'twenty-four', prompt: 'Find the polygon whose exterior angles are each 24°.', check: (values, n) => near(n.exterior, 24), solution: { n: 15 } }
  ]
};

export const solidVolumes = {
  id: 'solid-volumes',
  topicId: 'mensuration-3d',
  title: 'Cone, sphere and cylinder',
  summary: 'Compare the volumes of a cone, a sphere and a cylinder with the same radius, and discover the 1 : 2 : 3.',
  controls: [
    { id: 'r', label: 'Radius r', type: 'range', min: 1, max: 10, step: 1, default: 3, unit: 'cm' },
    { id: 'h', label: 'Height h (cone and cylinder)', type: 'range', min: 1, max: 20, step: 1, default: 5, unit: 'cm' }
  ],
  compute({ r, h }) {
    // Volumes as multiples of π, so the ratios are exact.
    const cone = (r * r * h) / 3;
    const sphere = (4 * r ** 3) / 3;
    const cylinder = r * r * h;
    const piText = (k) => `${show(k, 2)}π ≈ ${show(k * Math.PI, 1)} cm³`;
    return {
      numbers: { cone, sphere, cylinder },
      readouts: [
        { label: 'Cone ⅓πr²h', value: piText(cone) },
        { label: 'Sphere (radius r) ⁴⁄₃πr³', value: piText(sphere) },
        { label: 'Cylinder πr²h', value: piText(cylinder) }
      ],
      plot: {
        // The three solids drawn to one scale, so a change in r or h is seen, not just read.
        kind: 'solids',
        items: [
          { label: 'Cone', caption: `${show(cone * Math.PI, 1)} cm³`, tone: 'data', parts: [{ shape: 'cone', r, h }] },
          { label: 'Sphere', caption: `${show(sphere * Math.PI, 1)} cm³`, tone: 'combinatorics', parts: [{ shape: 'sphere', r }] },
          { label: 'Cylinder', caption: `${show(cylinder * Math.PI, 1)} cm³`, tone: 'geometry', parts: [{ shape: 'cylinder', r, h }] }
        ],
        summary: `With r = ${r} cm and h = ${h} cm: cone ${show(cone * Math.PI, 1)}, sphere ${show(sphere * Math.PI, 1)}, cylinder ${show(cylinder * Math.PI, 1)} cubic centimetres.`
      },
      insight:
        h === 2 * r
          ? 'With h = 2r the sphere fits exactly inside the cylinder, and cone : sphere : cylinder = 1 : 2 : 3 (Archimedes).'
          : 'A cone always holds exactly a third of the cylinder with the same base and height.'
    };
  },
  tasks: [
    {
      id: 'archimedes',
      prompt: 'Make the volumes come out in the ratio 1 : 2 : 3.',
      check: (values, n) => near(n.sphere, 2 * n.cone) && near(n.cylinder, 3 * n.cone),
      solution: { r: 3, h: 6 }
    },
    {
      id: 'sphere-cylinder',
      prompt: 'Make the cylinder hold exactly as much as the sphere.',
      check: (values, n) => near(n.cylinder, n.sphere),
      solution: { r: 3, h: 4 }
    },
    {
      id: 'sphere-cone',
      prompt: 'Make the cone hold exactly as much as the sphere.',
      check: (values, n) => near(n.cone, n.sphere),
      solution: { r: 2, h: 8 }
    }
  ]
};

/** Exact forms at the standard angles, so 30° shows "1/2" rather than 0.5. */
const EXACT = {
  30: { sin: '1/2', cos: '√3/2', tan: '1/√3' },
  45: { sin: '1/√2', cos: '1/√2', tan: '1' },
  60: { sin: '√3/2', cos: '1/2', tan: '√3' }
};

export const trigTriangle = {
  id: 'trig-triangle',
  topicId: 'trigonometry',
  title: 'Sine, cosine and tangent in a triangle',
  summary: 'Turn the angle and watch the sides change. The ratios depend only on the angle, never on the size.',
  controls: [
    { id: 'angle', label: 'Angle θ', type: 'range', min: 5, max: 85, step: 1, default: 35, unit: '°' },
    { id: 'hyp', label: 'Hypotenuse', type: 'range', min: 5, max: 20, step: 1, default: 10 }
  ],
  compute({ angle, hyp }) {
    const sin = Math.sin(angle * RAD);
    const cos = Math.cos(angle * RAD);
    const tan = sin / cos;
    const opposite = hyp * sin;
    const adjacent = hyp * cos;
    const exact = EXACT[angle];
    const ratio = (name, value, top, bottom) => ({
      label: `${name} θ = ${top} ÷ ${bottom}`,
      value: `${show(value, 3)}${exact ? ` = ${exact[name]}` : ''}`
    });
    return {
      numbers: { sin, cos, tan },
      readouts: [
        { label: 'Opposite, adjacent', value: `${show(opposite, 2)}, ${show(adjacent, 2)}` },
        ratio('sin', sin, 'opp', 'hyp'),
        ratio('cos', cos, 'adj', 'hyp'),
        ratio('tan', tan, 'opp', 'adj'),
        { label: 'sin²θ + cos²θ', value: show(sin * sin + cos * cos, 3) }
      ],
      plot: {
        kind: 'triangle',
        valid: true,
        points: [
          [0, 0],
          [adjacent, 0],
          [adjacent, opposite]
        ],
        labels: ['θ', '', ''],
        angles: [angle, 90, 90 - angle],
        right: 1,
        summary: `A right triangle with θ = ${angle}° and hypotenuse ${hyp}: opposite ${show(opposite, 2)}, adjacent ${show(adjacent, 2)}.`
      },
      insight:
        angle === 45
          ? 'At 45° the two legs are equal, so sin θ = cos θ and tan θ = 1.'
          : `Change the hypotenuse: every side scales, but sin θ = ${show(sin, 3)} stays put. At ${90 - angle}° the sine and cosine would swap.`
    };
  },
  tasks: [
    { id: 'equal', prompt: 'Make sin θ equal to cos θ.', check: (values, n) => near(n.sin, n.cos), solution: { angle: 45 } },
    { id: 'root-three', prompt: 'Make tan θ = √3.', check: (values, n) => near(n.tan, Math.sqrt(3), 1e-9), solution: { angle: 60 } },
    { id: 'half', prompt: 'Make the opposite side exactly half the hypotenuse.', check: (values, n) => near(n.sin, 0.5, 1e-9), solution: { angle: 30 } }
  ]
};

export const heightsObserver = {
  id: 'heights-observer',
  topicId: 'heights-distances',
  title: 'How tall is the tower?',
  summary: 'Stand somewhere, look up at the top, and the angle and the distance tell you the height.',
  controls: [
    { id: 'distance', label: 'Distance from the foot', type: 'range', min: 10, max: 100, step: 5, default: 40, unit: 'm' },
    { id: 'angle', label: 'Angle of elevation', type: 'range', min: 10, max: 80, step: 1, default: 35, unit: '°' }
  ],
  compute({ distance, angle }) {
    const tan = Math.tan(angle * RAD);
    const height = distance * tan;
    const sight = Math.hypot(distance, height);
    return {
      numbers: { height, sight, tan },
      readouts: [
        { label: `Height = ${distance} × tan ${angle}°`, value: `${show(height, 2)} m` },
        { label: `tan ${angle}°`, value: `${show(tan, 3)}${EXACT[angle] ? ` = ${EXACT[angle].tan}` : ''}` },
        { label: 'Line of sight', value: `${show(sight, 2)} m` }
      ],
      plot: {
        kind: 'triangle',
        valid: true,
        points: [
          [0, 0],
          [distance, 0],
          [distance, height]
        ],
        labels: ['You', '', 'Top'],
        angles: [angle, 90, 90 - angle],
        right: 1,
        summary: `From ${distance} m away at ${angle}°, the tower is ${show(height, 2)} m tall.`
      },
      insight:
        angle === 45
          ? 'At 45° the tower is exactly as tall as you are far from it.'
          : angle > 45
            ? 'Above 45° the tower is taller than your distance from it: the tangent is more than 1.'
            : 'Below 45° the tower is shorter than your distance from it: the tangent is less than 1.'
    };
  },
  tasks: [
    { id: 'equal', prompt: 'Make the tower exactly as tall as your distance from it.', check: (values, n) => near(n.height, values.distance, 1e-9), solution: { angle: 45 } },
    { id: 'thirty-sixty', prompt: 'Standing 30 m away, find the angle at which the tower is 30√3 m (about 51.96 m) tall.', check: (values, n) => values.distance === 30 && near(n.height, 30 * Math.sqrt(3), 1e-9), solution: { distance: 30, angle: 60 } },
    { id: 'hundred', prompt: 'See a 100 m tower at 45°. Where must you stand?', check: (values, n) => near(n.height, 100, 1e-9) && values.angle === 45, solution: { distance: 100, angle: 45 } }
  ]
};
