/**
 * Draws `figure.type === 'solid'` (cubes, cuboids, cylinders, cones, spheres,
 * hemispheres, frustums and stacks of them; prisms, pyramids and pyramid
 * frustums) as SVG. The geometry, in model
 * units, comes from utils/solidGeometry.js; this file only fits it into the
 * box at one scale (so proportions stay true) and draws it.
 */

import { svgEl } from '../utils/dom.js';
import { solidDrawing } from '../utils/solidGeometry.js';

const WIDTH = 340;
const HEIGHT = 300;
/** Room around the solid for the labels, in pixels. */
const PAD = { left: 56, right: 64, top: 24, bottom: 30 };

export function renderSolid(figure) {
  const drawing = solidDrawing(figure);
  if (!drawing) return null;

  const all = [...drawing.lines.flatMap((l) => l.pts), ...drawing.labels.map((l) => [l.x, l.y])];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min((WIDTH - PAD.left - PAD.right) / (maxX - minX || 1), (HEIGHT - PAD.top - PAD.bottom) / (maxY - minY || 1));
  // Centre the drawing in the space left after the padding.
  const offX = PAD.left + (WIDTH - PAD.left - PAD.right - (maxX - minX) * scale) / 2;
  const offY = PAD.top + (HEIGHT - PAD.top - PAD.bottom - (maxY - minY) * scale) / 2;
  const sx = (x) => offX + (x - minX) * scale;
  const sy = (y) => offY + (maxY - y) * scale;
  const pts = (list) => list.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ');

  return svgEl('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'chart-svg solid-svg', 'aria-hidden': 'true' }, [
    ...drawing.fills.map((f) => svgEl('polygon', { points: pts(f), class: 'solid-face' })),
    ...drawing.lines.map((l) => svgEl('polyline', { points: pts(l.pts), class: `solid-edge${l.dashed ? ' solid-edge--hidden' : ''}` })),
    ...drawing.labels.map((l) =>
      svgEl('text', {
        x: (sx(l.x) + l.dx).toFixed(1),
        y: (sy(l.y) + l.dy).toFixed(1),
        'text-anchor': l.anchor,
        class: `solid-label${l.text.trim() === '?' ? ' solid-label--unknown' : ''}`,
        text: l.text
      })
    )
  ]);
}
