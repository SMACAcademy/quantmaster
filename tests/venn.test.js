/**
 * Venn diagrams: every number is drawn inside exactly the circles its region
 * names. (The SVG itself is checked in the browser, like the other figures.)
 */

import { describe, it, expect } from 'vitest';

import { VENN_LAYOUTS, VENN_REGIONS, circlesAt } from '../src/components/venn.js';

describe('Venn layouts', () => {
  for (const count of [2, 3]) {
    const layout = VENN_LAYOUTS[count];

    it(`puts each of the ${count}-set region labels inside exactly its own circles`, () => {
      for (const key of VENN_REGIONS[count]) {
        const expected = key === 'none' ? '' : key;
        expect(circlesAt(layout, layout.spots[key]), key).toBe(expected);
      }
    });

    it(`puts each ${count}-set name just outside its own circle, and everything inside the box`, () => {
      layout.names.forEach((spot, i) => {
        expect(circlesAt(layout, spot), 'outside every circle').toBe('');
        const nearest = layout.circles.map((c) => Math.hypot(spot.x - c.x, spot.y - c.y) - c.r);
        expect(nearest.indexOf(Math.min(...nearest)), 'closest to its own circle').toBe(i);
      });
      for (const spot of [...layout.names, ...Object.values(layout.spots)]) {
        expect(spot.x).toBeGreaterThan(6);
        expect(spot.x).toBeLessThan(layout.width - 6);
        expect(spot.y).toBeGreaterThan(6);
        expect(spot.y).toBeLessThan(layout.height - 6);
      }
    });
  }
});
