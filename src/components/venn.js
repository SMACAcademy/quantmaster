/**
 * Venn diagrams for `figure.type === 'venn'`: two or three labelled circles in
 * a box for the whole group, with a count (or "?") written in each region.
 *
 *   { type: 'venn', sets: ['Cricket', 'Football'], universe: 'U = 50 students',
 *     regions: { a: 20, b: 15, ab: 8, none: '?' } }
 *
 * Region keys name the circles a region is inside: `a`, `b`, `c` alone, the
 * pairs `ab`, `ac`, `bc`, all three `abc`, and `none` for outside every
 * circle. A region left out is drawn empty. The layouts are fixed: every
 * number sits inside exactly the circles its key names, and every set name sits
 * just outside its own circle (a test checks both), so nothing can appear to
 * belong to the wrong region.
 */

import { svgEl } from '../utils/dom.js';
import { formatNumber } from '../utils/format.js';

export const VENN_REGIONS = {
  2: ['a', 'b', 'ab', 'none'],
  3: ['a', 'b', 'c', 'ab', 'ac', 'bc', 'abc', 'none']
};

export const VENN_LAYOUTS = {
  2: {
    width: 340,
    height: 250,
    circles: [
      { x: 125, y: 130, r: 80 },
      { x: 215, y: 130, r: 80 }
    ],
    names: [
      { x: 88, y: 40 },
      { x: 252, y: 40 }
    ],
    spots: { a: { x: 92, y: 135 }, b: { x: 248, y: 135 }, ab: { x: 170, y: 135 }, none: { x: 300, y: 232 } }
  },
  3: {
    width: 340,
    height: 270,
    circles: [
      { x: 135, y: 110, r: 70 },
      { x: 205, y: 110, r: 70 },
      { x: 170, y: 170, r: 70 }
    ],
    names: [
      { x: 74, y: 36 },
      { x: 266, y: 36 },
      { x: 170, y: 256 }
    ],
    spots: {
      a: { x: 105, y: 95 },
      b: { x: 235, y: 95 },
      c: { x: 170, y: 207 },
      ab: { x: 170, y: 82 },
      ac: { x: 128, y: 152 },
      bc: { x: 212, y: 152 },
      abc: { x: 170, y: 130 },
      none: { x: 305, y: 255 }
    }
  }
};

const LETTERS = ['a', 'b', 'c'];

/** Which circles (by letter) a point lies inside. */
export function circlesAt(layout, point) {
  return layout.circles
    .map((c, i) => (Math.hypot(point.x - c.x, point.y - c.y) < c.r ? LETTERS[i] : null))
    .filter(Boolean)
    .join('');
}

const show = (value) => (typeof value === 'number' ? formatNumber(value) : String(value));

export function renderVenn(figure) {
  const count = figure.sets.length;
  const layout = VENN_LAYOUTS[count];
  if (!layout) return null;
  const regions = figure.regions || {};
  return svgEl('svg', { viewBox: `0 0 ${layout.width} ${layout.height}`, class: 'chart-svg venn-svg', 'aria-hidden': 'true' }, [
    svgEl('rect', { x: 6, y: 6, width: layout.width - 12, height: layout.height - 12, rx: 10, class: 'venn-universe' }),
    figure.universe ? svgEl('text', { x: 16, y: layout.height - 16, class: 'venn-universe-label', text: figure.universe }) : null,
    ...layout.circles.map((c, i) => svgEl('circle', { cx: c.x, cy: c.y, r: c.r, class: `venn-circle venn-circle--${i + 1}` })),
    ...figure.sets.map((name, i) =>
      svgEl('text', { x: layout.names[i].x, y: layout.names[i].y, class: 'venn-set-label', 'text-anchor': 'middle', text: name })
    ),
    ...VENN_REGIONS[count]
      .filter((key) => regions[key] !== undefined && regions[key] !== null)
      .map((key) =>
        svgEl('text', {
          x: layout.spots[key].x,
          y: layout.spots[key].y,
          class: `venn-value${regions[key] === '?' ? ' venn-value--unknown' : ''}`,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          text: show(regions[key])
        })
      )
  ]);
}
