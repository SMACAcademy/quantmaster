/**
 * Simulations: Prisms, pyramids and frustums (mensuration-3d, Advanced unit).
 * Their meta.js entries keep this order.
 *
 * "Slice the top off a cone": cut a cone (or a square pyramid) parallel to its
 * base. The small top is similar to the whole, so it holds the cube of the height
 * ratio; the frustum keeps the rest, and the frustum formula gives the same number.
 * The three solids are drawn to one scale (the `solids` plot), above a bar chart
 * that sets the share of the height against the share of the volume.
 */

import { near, show } from './core.js';
import { coneFrustum, frustumVolume } from '../utils/prismPyramid.js';

export const frustumSlice = {
  id: 'frustum-slice',
  topicId: 'mensuration-3d',
  title: 'Slice the top off a cone',
  summary: 'Cut a cone or a square pyramid parallel to its base. The small top keeps only the cube of the height ratio, and the frustum keeps the rest.',
  controls: [
    {
      id: 'shape',
      label: 'Solid',
      type: 'choice',
      options: [
        { id: 'cone', label: 'Cone' },
        { id: 'pyramid', label: 'Square pyramid' }
      ],
      default: 'cone'
    },
    { id: 'R', label: 'Base radius R', type: 'range', min: 2, max: 14, step: 1, default: 6, unit: 'cm', showWhen: { shape: 'cone' } },
    { id: 'a', label: 'Base side a', type: 'range', min: 2, max: 20, step: 1, default: 8, unit: 'cm', showWhen: { shape: 'pyramid' } },
    { id: 'H', label: 'Height H of the whole solid', type: 'range', min: 4, max: 24, step: 1, default: 8, unit: 'cm' },
    { id: 'cut', label: 'Cut at this share of H, measured up from the base', type: 'range', min: 10, max: 90, step: 5, default: 25, unit: '%' }
  ],
  compute({ shape, R, a, H, cut }) {
    const cone = shape === 'cone';
    // The top piece is k of the height; everything about it is k times as long.
    const k = 1 - cut / 100;
    const bottom = cone ? R : a;
    const top = k * bottom;
    const h = H - k * H;
    const whole = cone ? (Math.PI * R * R * H) / 3 : (a * a * H) / 3;
    const small = cone ? (Math.PI * top * top * (k * H)) / 3 : (top * top * (k * H)) / 3;
    const frustum = whole - small;
    const formula = cone ? coneFrustum(R, top, h).volume : frustumVolume(a * a, top * top, h);
    // A cone's slant runs down its side; a pyramid's runs down the middle of a face, from apothem b/2 to a/2.
    const slant = cone ? Math.hypot(h, R - top) : Math.hypot(h, (a - top) / 2);
    const surface = cone ? Math.PI * slant * (R + top) : 2 * (a + top) * slant;
    const smallShare = small / whole;
    const frustumShare = frustum / whole;

    const name = cone ? 'cone' : 'pyramid';
    const cm3 = (v) => `${show(v, 2)} cm³`;
    const kText = show(k, 2);
    const solids = {
      kind: 'solids',
      fit: true,
      items: cone
        ? [
            { label: 'Whole cone', caption: cm3(whole), tone: 'data', parts: [{ shape: 'cone', r: R, h: H }] },
            { label: 'Frustum', caption: cm3(frustum), tone: 'geometry', parts: [{ shape: 'frustum', R, r: top, h }] },
            { label: 'Top cone, lifted off', caption: cm3(small), tone: 'combinatorics', parts: [{ shape: 'cone', r: top, h: k * H }] }
          ]
        : [
            { label: 'Whole pyramid', caption: cm3(whole), tone: 'data', parts: [{ shape: 'pyramid', base: 'square', a, h: H }] },
            { label: 'Frustum', caption: cm3(frustum), tone: 'geometry', parts: [{ shape: 'pyramid-frustum', base: 'square', a, b: top, h }] },
            { label: 'Top pyramid, lifted off', caption: cm3(small), tone: 'combinatorics', parts: [{ shape: 'pyramid', base: 'square', a: top, h: k * H }] }
          ],
      summary: cone
        ? `A cone of radius ${show(R)} cm and height ${show(H)} cm, cut ${show(h, 2)} cm above its base: a frustum with radii ${show(R)} and ${show(top, 2)} cm, and a small cone ${show(k * H, 2)} cm tall lifted off, all drawn to one scale.`
        : `A square pyramid of side ${show(a)} cm and height ${show(H)} cm, cut ${show(h, 2)} cm above its base: a frustum with sides ${show(a)} and ${show(top, 2)} cm, and a small pyramid ${show(k * H, 2)} cm tall lifted off, all drawn to one scale.`
    };
    const bars = {
      kind: 'bars',
      y: { label: '% of the whole', min: 0, max: 100 },
      bars: [
        { label: 'Top: % of height', value: 100 * k, tone: 'advanced' },
        { label: 'Top: % of volume', value: 100 * smallShare, tone: 'combinatorics' },
        { label: 'Frustum: % of volume', value: 100 * frustumShare, tone: 'geometry' }
      ],
      summary: `The top ${name} is ${show(100 * k, 2)}% of the height but only ${show(100 * smallShare, 2)}% of the volume; the frustum keeps ${show(100 * frustumShare, 2)}%.`
    };

    const readouts = cone
      ? [
          { label: 'Whole cone ⅓πR²H', value: cm3(whole) },
          { label: 'Top cone: (h′/H)³ × whole', value: `${show(k ** 3, 4)} × ${show(whole, 2)} = ${cm3(small)}` },
          { label: 'Frustum = whole − top', value: cm3(frustum) },
          { label: 'Frustum (πh/3)(R² + Rr + r²)', value: `h = ${show(h, 2)}, r = ${show(top, 2)}: ${cm3(formula)}` },
          { label: 'Slant height √(h² + (R − r)²)', value: `${show(slant, 2)} cm` },
          { label: 'Curved surface πl(R + r)', value: `${show(surface, 2)} cm²` }
        ]
      : [
          { label: 'Whole pyramid ⅓a²H', value: cm3(whole) },
          { label: 'Top pyramid: (h′/H)³ × whole', value: `${show(k ** 3, 4)} × ${show(whole, 2)} = ${cm3(small)}` },
          { label: 'Frustum = whole − top', value: cm3(frustum) },
          { label: 'Frustum (h/3)(A₁ + A₂ + √(A₁A₂))', value: `h = ${show(h, 2)}, top side ${show(top, 2)}: ${cm3(formula)}` },
          { label: 'Slant height of a face √(h² + ((a − b)/2)²)', value: `${show(slant, 2)} cm` },
          { label: 'Sloping faces ½ × (4a + 4b) × l', value: `${show(surface, 2)} cm²` }
        ];

    return {
      numbers: { shape, k, bottom, top, H, h, whole, small, frustum, formula, slant, surface, smallShare, frustumShare },
      readouts,
      plot: { kind: 'stack', plots: [solids, bars], summary: `${solids.summary} ${bars.summary}` },
      insight: near(k, 0.5)
        ? `Cutting halfway up leaves 7/8 in the frustum: the top ${name} is half as tall, half as wide and half as deep, so it holds only (1/2)³ = 1/8.`
        : `The top ${name} is ${kText} of the height, so it holds ${kText}³ = ${show(k ** 3, 4)} of the volume, and the frustum keeps ${show(frustumShare, 4)}. Big ${name} − small ${name} and the frustum formula agree: ${cm3(frustum)}.`
    };
  },
  tasks: [
    {
      id: 'seven-eighths',
      prompt: 'Cut the cone so that the frustum keeps exactly 7/8 of the volume.',
      check: (values, n) => n.shape === 'cone' && near(n.frustumShare, 7 / 8),
      solution: { shape: 'cone', cut: 50 }
    },
    {
      id: 'one-in-64',
      prompt: 'Leave only 1/64 of the volume in the small top. Where is the cut?',
      check: (values, n) => near(n.smallShare, 1 / 64),
      solution: { cut: 75 }
    },
    {
      id: 'slant-ten',
      prompt: 'Make a cone frustum whose slant height is exactly 10 cm.',
      check: (values, n) => n.shape === 'cone' && near(n.slant, 10, 1e-9),
      solution: { shape: 'cone', R: 12, H: 16, cut: 50 }
    },
    {
      id: 'pyramid-350',
      prompt: 'Switch to the square pyramid and make a frustum with sides 10 cm and 5 cm and height 6 cm. Do both routes give 350 cm³?',
      check: (values, n) => n.shape === 'pyramid' && near(n.bottom, 10) && near(n.top, 5) && near(n.h, 6),
      solution: { shape: 'pyramid', a: 10, H: 12, cut: 50 }
    }
  ]
};

export const frustumSims = [frustumSlice];
