/** Simulations for ratio, partnership, HCF and LCM, ages, calendars and fractions (Phase F). */

import { gcd, near, niceRange, ratioText, show } from './core.js';

const rupees = (value) => `₹${show(value, 2)}`;
const lcm = (a, b) => (a * b) / gcd(a, b);
const gcdAll = (list) => list.reduce((g, v) => gcd(g, v), 0);
const lcmAll = (list) => list.reduce((l, v) => lcm(l, v), 1);
const sum = (list) => list.reduce((total, v) => total + v, 0);

/** Whole numbers in lowest terms, as "3 : 2 : 1". */
export function ratioOf(list) {
  const g = gcdAll(list) || 1;
  return list.map((v) => show(v / g, 0)).join(' : ');
}

/** Prime factorisation as [[prime, power], ...]. */
export function primePowers(n) {
  const out = [];
  let m = n;
  for (let p = 2; p * p <= m; p++) {
    let k = 0;
    while (m % p === 0) {
      m /= p;
      k += 1;
    }
    if (k) out.push([p, k]);
  }
  if (m > 1) out.push([m, 1]);
  return out;
}

const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const powersText = (powers) =>
  powers.length ? powers.map(([p, k]) => `${p}${k === 1 ? '' : String(k).split('').map((d) => SUPERSCRIPTS[d]).join('')}`).join(' × ') : '1';

/** The highest power of each prime across several numbers (what the LCM keeps). */
function highestPowers(numbers) {
  const best = new Map();
  for (const n of numbers) for (const [p, k] of primePowers(n)) best.set(p, Math.max(best.get(p) || 0, k));
  return [...best.entries()].sort((x, y) => x[0] - y[0]);
}

/*
 * Layout for `rects` pictures. The renderer fits a picture into 500 × 282 px
 * (its 560 × 340 box less padding) at one scale for x and y. Laying a picture
 * out in those pixels lets labels keep the room they need at any setting.
 */
const BOX_W = 500;
const BOX_H = 282;

/** Content of contentW × contentH units with margins in px: the scale and the frame to pass on. */
function frame(contentW, contentH, { left = 0, right = 0, top = 0, bottom = 0 } = {}) {
  const s = Math.min((BOX_W - left - right) / contentW, (BOX_H - top - bottom) / contentH);
  return { s, x0: left / s, y0: top / s, width: contentW + (left + right) / s, height: contentH + (top + bottom) / s, px: (p) => p / s };
}

/** A picture as wide as contentW units, laid out in rows of fixed pixel height (at most 282 px in all). */
function strip(contentW, heightPx, { left = 0, right = 0 } = {}) {
  const s = (BOX_W - left - right) / contentW;
  return { s, x0: left / s, width: contentW + (left + right) / s, height: heightPx / s, px: (p) => p / s };
}

const PEOPLE = [
  { name: 'A', tone: 'arithmetic' },
  { name: 'B', tone: 'combinatorics' },
  { name: 'C', tone: 'data' }
];

/* ------------------------------ ratio ------------------------------ */

export const ratioBarModel = {
  id: 'ratio-bar-model',
  topicId: 'ratio-proportion',
  title: 'Split a total in a ratio',
  summary: 'Draw every share as equal blocks: find what one block is worth, and each share follows.',
  controls: [
    { id: 'total', label: 'Total to share', type: 'range', min: 100, max: 6000, step: 100, default: 1200, unit: '₹' },
    { id: 'a', label: "A's parts", type: 'range', min: 1, max: 9, step: 1, default: 2 },
    { id: 'b', label: "B's parts", type: 'range', min: 1, max: 9, step: 1, default: 3 },
    { id: 'c', label: "C's parts (0 = no C)", type: 'range', min: 0, max: 9, step: 1, default: 0 }
  ],
  compute({ total, a, b, c }) {
    const terms = c ? [a, b, c] : [a, b];
    const parts = sum(terms);
    const part = total / parts;
    const shares = terms.map((t) => t * part);
    const g = gcdAll(terms);
    const simplified = ratioOf(terms);

    // One row of blocks per person, scaled for at least 6 blocks a row, so blocks keep their size for small ratios.
    const rowGap = 0.5;
    const f = frame(Math.max(6, ...terms), terms.length + (terms.length - 1) * rowGap, { left: 40, right: 96, top: 8, bottom: 8 });
    const rects = [];
    const notes = [];
    terms.forEach((t, i) => {
      const y = f.y0 + i * (1 + rowGap);
      for (let k = 0; k < t; k++) rects.push({ x: f.x0 + k, y, w: 1, h: 1, tone: PEOPLE[i].tone, label: show(part, 2) });
      notes.push({ x: f.x0 - f.px(20), y: y + 0.5 + f.px(5), text: PEOPLE[i].name });
      notes.push({ x: f.x0 + t + f.px(10), y: y + 0.5 + f.px(5), text: rupees(shares[i]), anchor: 'start' });
    });

    return {
      numbers: { parts, part, shares },
      readouts: [
        { label: 'Ratio', value: g > 1 ? `${terms.join(' : ')} = ${simplified}` : terms.join(' : ') },
        { label: 'Blocks in all', value: `${terms.join(' + ')} = ${parts}` },
        { label: 'One block', value: `${rupees(total)} ÷ ${parts} = ${rupees(part)}` },
        { label: 'Shares', value: shares.map((s, i) => `${PEOPLE[i].name} ${rupees(s)}`).join(', ') }
      ],
      plot: {
        kind: 'rects',
        width: f.width,
        height: f.height,
        rects,
        notes,
        summary: `${rupees(total)} split ${terms.join(' : ')}: ${parts} blocks of ${rupees(part)}, so ${shares.map((s, i) => `${PEOPLE[i].name} gets ${rupees(s)}`).join(', ')}.`
      },
      insight:
        g > 1
          ? `${terms.join(' : ')} is the same split as ${simplified}: the blocks are cut smaller, but every share stays the same.`
          : `${parts} equal blocks make ${rupees(total)}, so one block is ${rupees(part)}. Each share is its number of blocks × ${rupees(part)}.`
    };
  },
  tasks: [
    {
      id: 'b-600',
      prompt: "Make B's share exactly ₹600.",
      check: (values, n) => near(n.shares[1], 600, 1e-9),
      solution: { total: 1500, a: 3, b: 2, c: 0 }
    },
    {
      id: 'four-hundred-more',
      prompt: "Make A's share exactly ₹400 more than B's.",
      check: (values, n) => near(n.shares[0] - n.shares[1], 400, 1e-9),
      solution: { total: 1600, a: 5, b: 3, c: 0 }
    },
    {
      id: 'hundred-a-block',
      prompt: 'Share ₹1,500 among three people so that one block is worth exactly ₹100.',
      check: (values, n) => values.total === 1500 && values.c > 0 && near(n.part, 100, 1e-9),
      solution: { total: 1500, a: 4, b: 5, c: 6 }
    }
  ]
};

/* ------------------------------ partnership ------------------------------ */

export const partnershipShares = {
  id: 'partnership-shares',
  topicId: 'partnership',
  title: 'Profit by capital × months',
  summary: 'Each partner is a rectangle: capital up, months across. The profit splits in the ratio of the areas.',
  controls: [
    { id: 'capA', label: "A's capital", type: 'range', min: 5000, max: 60000, step: 5000, default: 30000, unit: '₹' },
    { id: 'monthsA', label: 'A invests for', type: 'range', min: 1, max: 12, step: 1, default: 12, unit: 'months' },
    { id: 'capB', label: "B's capital", type: 'range', min: 5000, max: 60000, step: 5000, default: 20000, unit: '₹' },
    { id: 'monthsB', label: 'B invests for', type: 'range', min: 1, max: 12, step: 1, default: 12, unit: 'months' },
    { id: 'capC', label: "C's capital (0 = no C)", type: 'range', min: 0, max: 60000, step: 5000, default: 0, unit: '₹' },
    { id: 'monthsC', label: 'C invests for', type: 'range', min: 1, max: 12, step: 1, default: 12, unit: 'months' },
    { id: 'profit', label: 'Profit to share', type: 'range', min: 1000, max: 100000, step: 1000, default: 50000, unit: '₹' }
  ],
  compute({ capA, monthsA, capB, monthsB, capC, monthsC, profit }) {
    const partners = [
      { ...PEOPLE[0], cap: capA, months: monthsA },
      { ...PEOPLE[1], cap: capB, months: monthsB },
      ...(capC ? [{ ...PEOPLE[2], cap: capC, months: monthsC }] : [])
    ];
    const areas = partners.map((p) => p.cap * p.months);
    const totalArea = sum(areas);
    const shares = areas.map((area) => (profit * area) / totalArea);
    const ratio = ratioOf(areas);

    // Each partner gets a 12-month slot; capital is drawn in ₹5,000 units so both sides share a scale.
    const unit = 5000;
    const slot = 12;
    const gap = 2;
    const tallest = Math.max(...partners.map((p) => p.cap / unit));
    const f = frame(partners.length * slot + (partners.length - 1) * gap, tallest, { top: 8, bottom: 48 });
    const rects = [];
    const notes = [];
    partners.forEach((p, i) => {
      const left = f.x0 + i * (slot + gap);
      const h = p.cap / unit;
      const y = f.y0 + tallest - h;
      // The months not invested show as a dashed outline: a late joiner's rectangle is narrower.
      if (p.months < 12) rects.push({ x: left, y, w: slot, h, tone: p.tone, dashed: true, faint: true });
      rects.push({ x: left + slot - p.months, y, w: p.months, h, tone: p.tone, label: p.name });
      notes.push({ x: left + slot / 2, y: f.y0 + tallest + f.px(20), text: `${p.name}: ${rupees(p.cap)} × ${p.months}` });
      notes.push({ x: left + slot / 2, y: f.y0 + tallest + f.px(40), text: `${rupees(shares[i])} · ${show((areas[i] / totalArea) * 100, 1)}%` });
    });

    const equalButDifferent = partners.some((p, i) => partners.some((q, j) => j > i && p.cap !== q.cap && areas[i] === areas[j]));
    const sameMonths = partners.every((p) => p.months === partners[0].months);
    return {
      numbers: { areas, shares, totalArea },
      readouts: [
        { label: 'Capital × months', value: partners.map((p, i) => `${p.name} ${show(areas[i], 0)}`).join(', ') },
        { label: 'Profit ratio', value: ratio },
        { label: 'Shares', value: partners.map((p, i) => `${p.name} ${rupees(shares[i])}`).join(', ') }
      ],
      plot: {
        kind: 'rects',
        width: f.width,
        height: f.height,
        rects,
        notes,
        summary: `Capital × months is ${partners.map((p, i) => `${p.name} ${show(areas[i], 0)}`).join(', ')}, so ${rupees(profit)} splits ${ratio}: ${partners
          .map((p, i) => `${p.name} ${rupees(shares[i])}`)
          .join(', ')}.`
      },
      insight: equalButDifferent
        ? 'Less money for longer earns as much as more money for less time: equal areas, equal shares.'
        : sameMonths
          ? `Everyone stayed ${partners[0].months} months, so only capital matters: the profit splits ${ratio}.`
          : `Every rupee earns the same each month, so the profit splits in the ratio of the areas, capital × months = ${ratio}.`
    };
  },
  tasks: [
    {
      id: 'equal',
      prompt: 'Give A and B equal shares even though they put in different amounts.',
      check: (values, n) => values.capA !== values.capB && near(n.shares[0], n.shares[1], 1e-6),
      solution: { capA: 30000, monthsA: 8, capB: 20000, monthsB: 12, capC: 0 }
    },
    {
      id: 'twice',
      prompt: "A and B put in the same capital. Make A's share exactly twice B's.",
      check: (values, n) => values.capA === values.capB && near(n.shares[0], 2 * n.shares[1], 1e-6),
      solution: { capA: 20000, monthsA: 12, capB: 20000, monthsB: 6, capC: 0 }
    },
    {
      id: 'small-but-biggest',
      prompt: 'Bring in C with the smallest capital of the three, yet give C the biggest share.',
      check: (values, n) =>
        values.capC > 0 && values.capC < values.capA && values.capC < values.capB && n.shares[2] > n.shares[0] && n.shares[2] > n.shares[1],
      solution: { capA: 30000, monthsA: 3, capB: 30000, monthsB: 3, capC: 10000, monthsC: 12 }
    }
  ]
};

/* ------------------------------ HCF and LCM ------------------------------ */

const divisors = (n) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);

export const hcfTiles = {
  id: 'hcf-tiles',
  topicId: 'hcf-lcm',
  title: 'The largest square tile',
  summary: 'Tile a rectangle with equal squares and no gaps. The biggest square that fits both sides is the HCF.',
  controls: [
    { id: 'length', label: 'Length', type: 'range', min: 2, max: 60, step: 1, default: 24 },
    { id: 'breadth', label: 'Breadth', type: 'range', min: 2, max: 60, step: 1, default: 18 },
    {
      id: 'tile',
      label: 'Tile',
      type: 'choice',
      options: [
        { id: 'largest', label: 'Largest (HCF)' },
        { id: 'smaller', label: 'A smaller common factor' }
      ],
      default: 'largest'
    }
  ],
  compute({ length: L, breadth: B, tile }) {
    const hcf = gcd(L, B);
    const smallestPrime = hcf > 1 ? primePowers(hcf)[0][0] : 1;
    const side = tile === 'smaller' ? hcf / smallestPrime : hcf;
    const cols = L / side;
    const rows = B / side;
    const count = cols * rows;
    const largestCount = (L / hcf) * (B / hcf);

    const f = frame(L, B, { left: 8, right: 56, top: 8, bottom: 28 });
    const rects = [];
    if (count <= 900) {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          // A checkerboard of the largest tiles: with smaller tiles, each colour patch is one HCF tile.
          const bigTile = (Math.floor((i * side) / hcf) + Math.floor((j * side) / hcf)) % 2;
          rects.push({
            x: f.x0 + i * side,
            y: f.y0 + j * side,
            w: side,
            h: side,
            tone: side < hcf && bigTile ? 'algebra' : 'geometry',
            faint: side === hcf && bigTile === 1,
            label: String(j * cols + i + 1)
          });
        }
      }
    } else {
      // Too many tiles to draw one by one: overlapping row and column strips draw the same grid.
      for (let j = 0; j < rows; j++) rects.push({ x: f.x0, y: f.y0 + j * side, w: L, h: side, tone: 'geometry', faint: true });
      for (let i = 0; i < cols; i++) rects.push({ x: f.x0 + i * side, y: f.y0, w: side, h: B, tone: 'geometry', faint: true });
    }
    const notes = [
      { x: f.x0 + L / 2, y: f.y0 + B + f.px(20), text: `${L}` },
      { x: f.x0 + L + f.px(8), y: f.y0 + B / 2 + f.px(5), text: `${B}`, anchor: 'start' }
    ];

    const common = divisors(hcf);
    let insight;
    if (hcf === 1) insight = `${L} and ${B} share no factor but 1, so only 1 × 1 tiles fit: ${count} of them.`;
    else if (tile === 'smaller')
      insight = `A ${side} × ${side} tile fits too, but each ${hcf} × ${hcf} tile breaks into ${smallestPrime * smallestPrime}: ${count} tiles instead of ${largestCount}.`;
    else insight = `${hcf} divides both ${L} and ${B}, and nothing bigger does, so the largest square tile is ${hcf} × ${hcf}: the HCF.`;

    return {
      numbers: { hcf, side, cols, rows, count, largestCount },
      readouts: [
        { label: 'In primes', value: `${L} = ${powersText(primePowers(L))}, ${B} = ${powersText(primePowers(B))}` },
        { label: 'Common factors', value: common.join(', ') },
        { label: 'HCF', value: String(hcf) },
        { label: 'Tiles', value: `${side} × ${side}: ${cols} × ${rows} = ${count}` }
      ],
      plot: {
        kind: 'rects',
        width: f.width,
        height: f.height,
        rects,
        notes,
        summary: `A ${L} by ${B} rectangle tiled with ${side} by ${side} squares: ${cols} across and ${rows} down, ${count} tiles.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'seven',
      prompt: 'Make the largest tile exactly 7 × 7, on a rectangle that is not a square.',
      check: (values, n) => values.tile === 'largest' && n.hcf === 7 && values.length !== values.breadth,
      solution: { length: 21, breadth: 14, tile: 'largest' }
    },
    {
      id: 'six-tiles',
      prompt: 'Find a rectangle that takes exactly 6 of the largest tiles, each bigger than 1 × 1.',
      check: (values, n) => values.tile === 'largest' && n.count === 6 && n.hcf > 1,
      solution: { length: 30, breadth: 20, tile: 'largest' }
    },
    {
      id: 'only-ones',
      prompt: 'Choose two sides that only 1 × 1 tiles can cover.',
      check: (values, n) => n.hcf === 1,
      solution: { length: 15, breadth: 8, tile: 'largest' }
    },
    {
      id: 'four-times',
      prompt: 'Switch to a smaller common factor so that it takes exactly 4 times as many tiles.',
      check: (values, n) => values.tile === 'smaller' && n.count === 4 * n.largestCount,
      solution: { length: 24, breadth: 18, tile: 'smaller' }
    }
  ]
};

export const lcmBells = {
  id: 'lcm-bells',
  topicId: 'hcf-lcm',
  title: 'When do the bells ring together?',
  summary: 'Bells ring every few seconds. They all ring together again only at a common multiple, first at the LCM.',
  controls: [
    { id: 'a', label: 'Bell A rings every', type: 'range', min: 2, max: 20, step: 1, default: 6, unit: 's' },
    { id: 'b', label: 'Bell B rings every', type: 'range', min: 2, max: 20, step: 1, default: 8, unit: 's' },
    { id: 'c', label: 'Bell C rings every (0 = no C)', type: 'range', min: 0, max: 20, step: 1, default: 0, unit: 's' }
  ],
  compute({ a, b, c }) {
    const intervals = c ? [a, b, c] : [a, b];
    const together = lcmAll(intervals);
    const pairLcm = lcm(a, b);
    const product = intervals.reduce((p, v) => p * v, 1);
    // Show a second joint ring as well when the rings stay sparse enough to see.
    const horizon = (2 * together) / Math.min(...intervals) <= 40 ? 2 * together : together;

    const rowPx = 44;
    const gapPx = 18;
    const topPx = 28;
    const rowsPx = intervals.length * rowPx + (intervals.length - 1) * gapPx;
    const f = strip(horizon, topPx + rowsPx + 34, { left: 84, right: 16 });
    const rects = [];
    const notes = [];
    intervals.forEach((every, i) => {
      const y = f.px(topPx + i * (rowPx + gapPx));
      const h = f.px(rowPx);
      const tone = PEOPLE[i].tone;
      rects.push({ x: f.x0, y, w: horizon, h, tone, faint: true });
      if (every * f.s >= 4) {
        for (let t = 0; t <= horizon; t += every) rects.push({ x: f.x0 + t - f.px(1.5), y: y + f.px(4), w: f.px(3), h: h - f.px(8), tone });
      } else {
        // Rings closer than 4 px apart merge into a band.
        rects.push({ x: f.x0, y: y + f.px(4), w: horizon, h: h - f.px(8), tone });
      }
      notes.push({ x: f.x0 - f.px(10), y: y + h / 2 + f.px(5), text: `Every ${every} s`, anchor: 'end' });
    });
    for (let t = 0; t <= horizon; t += together) {
      rects.push({ x: f.x0 + t - f.px(4), y: f.px(topPx - 6), w: f.px(8), h: f.px(rowsPx + 12), tone: 'geometry' });
    }
    const nearEnd = together > horizon * 0.75;
    notes.push({ x: f.x0 + together + (nearEnd ? f.px(4) : 0), y: f.px(16), text: `All together at ${together} s`, anchor: nearEnd ? 'end' : 'middle' });
    const axisY = f.px(topPx + rowsPx + 26);
    for (const t of niceRange(0, horizon, 6).ticks.filter((v) => v <= horizon)) notes.push({ x: f.x0 + t, y: axisY, text: show(t) });

    const minutes = together >= 60 ? ` (${Math.floor(together / 60)} min${together % 60 ? ` ${together % 60} s` : ''})` : '';
    return {
      numbers: { together, pairLcm, product, horizon },
      readouts: [
        { label: 'In primes', value: intervals.map((v) => `${v} = ${powersText(primePowers(v))}`).join(', ') },
        { label: 'LCM (highest powers)', value: `${powersText(highestPowers(intervals))} = ${together}` },
        { label: 'First together again', value: `${together} s${minutes}` },
        { label: 'Rings until then', value: intervals.map((v, i) => `${PEOPLE[i].name} ${together / v}`).join(', ') }
      ],
      plot: {
        kind: 'rects',
        width: f.width,
        height: f.height,
        rects,
        notes,
        summary: `Bells every ${intervals.join(', ')} seconds start together and next ring together at ${together} seconds.`
      },
      insight:
        together === product
          ? `${intervals.join(', ')} share no common factor, so they first meet again only at their product, ${together} s.`
          : `A joint ring needs a time every interval divides: the LCM, ${together} s. That is sooner than ${intervals.join(' × ')} = ${product} s because shared factors count once.`
    };
  },
  tasks: [
    {
      id: 'sixty',
      prompt: 'With two bells, make them first ring together after exactly 60 seconds.',
      check: (values, n) => values.c === 0 && n.together === 60,
      solution: { a: 12, b: 15, c: 0 }
    },
    {
      id: 'product',
      prompt: 'With two bells, make the first joint ring come only at the product of the intervals.',
      check: (values, n) => values.c === 0 && n.together === values.a * values.b,
      solution: { a: 4, b: 9, c: 0 }
    },
    {
      id: 'third',
      prompt: 'Add a third bell, different from both, without changing when they first ring together.',
      check: (values, n) => values.c > 0 && values.c !== values.a && values.c !== values.b && n.together === n.pairLcm,
      solution: { a: 6, b: 8, c: 12 }
    }
  ]
};

/* ------------------------------ ages ------------------------------ */

const yearsText = (t) => (t === 0 ? 'now' : t > 0 ? `in ${show(t, 2)} years` : `${show(-t, 2)} years ago`);

export const agesTimeline = {
  id: 'ages-timeline',
  topicId: 'problems-on-ages',
  title: 'Two ages on a timeline',
  summary: 'Both ages rise one year per year: the lines are parallel, so the gap never changes, but the ratio does.',
  controls: [
    { id: 'ageA', label: "A's age now", type: 'range', min: 1, max: 80, step: 1, default: 40, unit: 'years' },
    { id: 'ageB', label: "B's age now", type: 'range', min: 1, max: 80, step: 1, default: 10, unit: 'years' },
    { id: 'year', label: 'Years from now (negative = ago)', type: 'range', min: -20, max: 30, step: 1, default: 10 },
    { id: 'k', label: 'Compare A with k × B, k =', type: 'range', min: 2, max: 5, step: 1, default: 2 }
  ],
  compute({ ageA, ageB, year: t, k }) {
    const gap = ageA - ageB;
    const aT = ageA + t;
    const bT = ageB + t;
    const bothAlive = aT > 0 && bT > 0;
    // A = k × B when ageA + x = k(ageB + x).
    const kTime = (ageA - k * ageB) / (k - 1);
    const kValid = ageB + kTime > 0;

    const xMin = -20;
    const xMax = 30;
    const startA = Math.max(xMin, -ageA);
    const startB = Math.max(xMin, -ageB);
    // Headroom above the oldest age, so a marker's label at the top stays inside the plot.
    const y = niceRange(0, (Math.max(ageA, ageB) + xMax) * 1.12);
    const line = (start, at) => [[start, at(start)], [xMax, at(xMax)]];
    const pxPerYear = 268 / (y.max - y.min);
    const markers = [];
    if (aT >= 0 && bT >= 0 && Math.abs(aT - bT) * pxPerYear < 20) {
      markers.push({ x: t, y: Math.min(aT, bT), tone: 'combinatorics' });
      markers.push({ x: t, y: Math.max(aT, bT), label: `A ${aT}, B ${bT}`, tone: 'arithmetic' });
    } else {
      if (aT >= 0) markers.push({ x: t, y: aT, label: `A ${aT}`, tone: 'arithmetic' });
      if (bT >= 0) markers.push({ x: t, y: bT, label: `B ${bT}`, tone: 'combinatorics' });
    }
    if (kValid && kTime >= xMin && kTime <= xMax) markers.push({ x: kTime, y: ageA + kTime, tone: 'data' });
    // "Now" is written to the right of its line, so it is left out when the chosen year's line would cross it.
    const guides = [{ axis: 'x', value: 0, label: t > 0 && t < 5 ? '' : 'Now' }];
    if (t !== 0) guides.push({ axis: 'x', value: t, label: (t >= 4 && t <= 24) || t <= -8 ? (t > 0 ? `in ${t} y` : `${-t} y ago`) : '' });

    const when = t === 0 ? 'now' : t > 0 ? `in ${t} years` : `${-t} years ago`;
    return {
      numbers: { gap, aT, bT, kTime, kValid },
      readouts: [
        { label: 'Age gap', value: `${Math.abs(gap)} years, always` },
        { label: 'Ratio now (A : B)', value: ratioText(ageA, ageB) },
        {
          label: `Ages ${when}`,
          value: bothAlive ? `${aT} and ${bT}, ratio ${ratioText(aT, bT)}` : `${aT <= 0 ? 'A' : 'B'} not born yet`
        },
        { label: `A is ${k} × B's age`, value: kValid ? yearsText(kTime) : 'never' }
      ],
      plot: {
        kind: 'xy',
        x: { label: 'Years from now', min: xMin, max: xMax },
        y: { label: 'Age (years)', min: y.min, max: y.max },
        series: [
          { id: 'a', label: "A's age", points: line(startA, (x) => ageA + x), tone: 'arithmetic' },
          { id: 'b', label: "B's age", points: line(startB, (x) => ageB + x), tone: 'combinatorics' },
          { id: 'kb', label: `${k} × B's age`, points: line(startB, (x) => k * (ageB + x)), tone: 'data', dashed: true }
        ],
        guides,
        markers,
        summary: `A is ${ageA} and B is ${ageB} now; ${when} they are ${aT} and ${bT}. The gap stays ${Math.abs(gap)} years.`
      },
      insight:
        gap === 0
          ? 'Same age: the two lines lie on top of each other, and the ratio is 1 : 1 for life.'
          : `The lines are parallel, so the gap stays ${Math.abs(gap)} years for life, while the ratio ${ratioText(ageA, ageB)} drifts towards 1 : 1 as both grow older.`
    };
  },
  tasks: [
    {
      id: 'twice',
      prompt: 'Slide to the year when A is exactly twice as old as B.',
      check: (values, n) => n.bT > 0 && n.aT === 2 * n.bT,
      solution: { ageA: 40, ageB: 10, year: 20 }
    },
    {
      id: 'five-times-ago',
      prompt: 'Find ages and a year in the past when A was exactly 5 times as old as B.',
      check: (values, n) => values.year < 0 && n.bT > 0 && n.aT === 5 * n.bT,
      solution: { ageA: 30, ageB: 10, year: -5 }
    },
    {
      id: 'three-then-two',
      prompt: 'Make the ratio 3 : 1 now and 2 : 1 in ten years.',
      check: (values) => values.ageA === 3 * values.ageB && values.ageA + 10 === 2 * (values.ageB + 10),
      solution: { ageA: 30, ageB: 10, year: 10 }
    }
  ]
};

/* ------------------------------ calendars ------------------------------ */

export const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Day of the week in the Gregorian calendar, 0 = Sunday (Sakamoto's method). */
export function weekday(year, month, day) {
  const offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const y = month < 3 ? year - 1 : year;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + offsets[month - 1] + day) % 7;
}

const DATES = {
  jan: { label: '1 January', month: 1, day: 1 },
  aug: { label: '15 August', month: 8, day: 15 }
};

export const calendarOddDays = {
  id: 'calendar-odd-days',
  topicId: 'calendars',
  title: 'Odd days move the weekday',
  summary: 'Step a date forward some years: each year adds 1 odd day, a 29 February adds another, and only the leftover after whole weeks counts.',
  // The start year is a century and a year within it: a single 1900–2100 slider would read "2,026".
  controls: [
    {
      id: 'century',
      label: 'Century',
      type: 'choice',
      options: [
        { id: '1900', label: '1900s' },
        { id: '2000', label: '2000s' },
        { id: '2100', label: '2100s' }
      ],
      default: '2000'
    },
    { id: 'yy', label: 'Start year within the century', type: 'range', min: 0, max: 99, step: 1, default: 26 },
    {
      id: 'date',
      label: 'Date',
      type: 'choice',
      options: [
        { id: 'jan', label: DATES.jan.label },
        { id: 'aug', label: DATES.aug.label }
      ],
      default: 'jan'
    },
    { id: 'years', label: 'Step forward', type: 'range', min: 1, max: 100, step: 1, default: 10, unit: 'years' }
  ],
  compute({ century, yy, date, years }) {
    const year = Number(century) + yy;
    const { label, month, day } = DATES[date];
    const start = weekday(year, month, day);
    // From the date in one year to the same date in the next, the 29 February crossed is this year's
    // for a January date and next year's for an August date.
    const leapYears = [];
    const steps = Array.from({ length: years }, (_, k) => {
      const februaryOf = month < 3 ? year + k : year + k + 1;
      const leap = isLeap(februaryOf);
      if (leap) leapYears.push(februaryOf);
      return leap ? 2 : 1;
    });
    const oddDays = sum(steps);
    const shift = oddDays % 7;
    const weeks = Math.floor(oddDays / 7);
    const end = (start + shift) % 7;

    const f = strip(7, 170, { left: 16, right: 16 });
    const cell = 7 / years;
    const stripY = f.px(28);
    const stripH = f.px(26);
    const rects = steps.map((odd, k) => ({
      x: f.x0 + k * cell,
      y: stripY,
      w: cell,
      h: stripH,
      tone: odd === 2 ? 'combinatorics' : 'arithmetic',
      faint: odd === 1,
      label: String(odd)
    }));
    const notes = [
      { x: f.x0, y: f.px(18), text: `${years} year${years === 1 ? '' : 's'}: ${oddDays} odd days (${leapYears.length} leap)`, anchor: 'start' },
      { x: f.x0, y: stripY + stripH + f.px(18), text: String(year), anchor: 'start' },
      { x: f.x0 + 7, y: stripY + stripH + f.px(18), text: String(year + years), anchor: 'end' }
    ];
    const weekY = f.px(96);
    const weekH = f.px(44);
    for (let d = 0; d < 7; d++) {
      const isStart = d === start;
      const isEnd = d === end;
      rects.push({
        x: f.x0 + d,
        y: weekY,
        w: 1,
        h: weekH,
        tone: isEnd ? 'geometry' : isStart ? 'arithmetic' : 'algebra',
        faint: !isStart && !isEnd,
        label: DAY_NAMES[d].slice(0, 3)
      });
    }
    const below = weekY + weekH + f.px(20);
    if (shift === 0) notes.push({ x: f.x0 + start + 0.5, y: below, text: 'same day' });
    else {
      notes.push({ x: f.x0 + start + 0.5, y: below, text: 'start' });
      notes.push({ x: f.x0 + end + 0.5, y: below, text: `+${shift}` });
    }

    const shown = leapYears.length <= 6 ? leapYears.join(', ') : `${leapYears.slice(0, 3).join(', ')} … ${leapYears[leapYears.length - 1]}`;
    return {
      numbers: { year, start, end, oddDays, shift, leapDays: leapYears.length },
      readouts: [
        { label: 'Start', value: `${label} ${year}: ${DAY_NAMES[start]}` },
        { label: '29 Februarys crossed', value: leapYears.length ? `${leapYears.length} (${shown})` : 'none' },
        { label: 'Odd days', value: `${years} + ${leapYears.length} = ${oddDays} = ${weeks} week${weeks === 1 ? '' : 's'} + ${shift}` },
        { label: 'End', value: `${label} ${year + years}: ${DAY_NAMES[end]}` }
      ],
      plot: {
        kind: 'rects',
        width: f.width,
        height: f.height,
        rects,
        notes,
        summary: `${label} ${year} is a ${DAY_NAMES[start]}. ${years} years on there are ${oddDays} odd days, a shift of ${shift}, so ${label} ${year + years} is a ${DAY_NAMES[end]}.`
      },
      insight:
        shift === 0
          ? `${oddDays} odd days make exactly ${weeks} weeks, so ${label} is a ${DAY_NAMES[start]} again.`
          : `A year moves a date on 1 weekday, or 2 if it crosses 29 February. ${oddDays} odd days = ${weeks} week${weeks === 1 ? '' : 's'} + ${shift}, so ${DAY_NAMES[start]} becomes ${DAY_NAMES[end]}.`
    };
  },
  tasks: [
    {
      id: 'six-years',
      prompt: 'Find a start year where the date falls on the same weekday exactly 6 years later.',
      check: (values, n) => values.years === 6 && n.shift === 0,
      solution: { century: '2000', yy: 26, date: 'jan', years: 6 }
    },
    {
      id: 'jump-two',
      prompt: 'Step forward one year and make the weekday jump by 2.',
      check: (values, n) => values.years === 1 && n.oddDays === 2,
      solution: { century: '2000', yy: 28, date: 'jan', years: 1 }
    },
    {
      id: 'century',
      prompt: 'Step forward 100 years and make the weekday move by exactly 5.',
      check: (values, n) => values.years === 100 && n.shift === 5,
      solution: { century: '2000', yy: 1, date: 'jan', years: 100 }
    },
    {
      id: 'not-28',
      prompt: 'The calendar usually repeats after 28 years. Find a start year where it does not.',
      check: (values, n) => values.years === 28 && n.shift !== 0,
      solution: { century: '1900', yy: 0, date: 'jan', years: 28 }
    }
  ]
};

/* ------------------------------ fractions ------------------------------ */

/** A fraction in lowest terms, as "3/4", "−1/12" or "2". */
export function fractionText(num, den) {
  const g = gcd(num, den) || 1;
  const n = Math.abs(num) / g;
  const d = den / g;
  return `${num < 0 ? '−' : ''}${d === 1 ? n : `${n}/${d}`}`;
}

export const fractionBars = {
  id: 'fraction-bars',
  topicId: 'fractions',
  title: 'Fractions as bars',
  summary: 'Cut two bars into equal parts. To compare, add or subtract, cut both into the same number of parts first.',
  controls: [
    { id: 'n1', label: 'A: numerator', type: 'range', min: 1, max: 12, step: 1, default: 3 },
    { id: 'd1', label: 'A: denominator', type: 'range', min: 2, max: 12, step: 1, default: 4 },
    { id: 'n2', label: 'B: numerator', type: 'range', min: 1, max: 12, step: 1, default: 5 },
    { id: 'd2', label: 'B: denominator', type: 'range', min: 2, max: 12, step: 1, default: 6 },
    {
      id: 'op',
      label: 'Do',
      type: 'choice',
      options: [
        { id: 'compare', label: 'Compare' },
        { id: 'add', label: 'Add' },
        { id: 'subtract', label: 'Subtract' }
      ],
      default: 'compare'
    }
  ],
  compute({ n1, d1, n2, d2, op }) {
    const L = lcm(d1, d2);
    const N1 = n1 * (L / d1);
    const N2 = n2 * (L / d2);
    const resultN = op === 'add' ? N1 + N2 : N1 - N2;
    const comparison = Math.sign(N1 - N2);
    const A = fractionText(n1, d1);
    const Bf = fractionText(n2, d2);

    // Rows of parts: [{ label, den, segments: [{ count, tone, faint, dashed }] }].
    const rows = [
      { label: `A ${n1}/${d1}`, den: d1, segments: [{ count: n1, tone: 'arithmetic' }] },
      { label: `B ${n2}/${d2}`, den: d2, segments: [{ count: n2, tone: 'combinatorics' }] }
    ];
    if (d1 !== d2) {
      rows.push({ label: `A ${N1}/${L}`, den: L, segments: [{ count: N1, tone: 'arithmetic' }] });
      rows.push({ label: `B ${N2}/${L}`, den: L, segments: [{ count: N2, tone: 'combinatorics' }] });
    }
    if (op === 'add') {
      rows.push({ label: `= ${N1 + N2}/${L}`, den: L, segments: [{ count: N1, tone: 'arithmetic' }, { count: N2, tone: 'combinatorics' }] });
    } else if (op === 'subtract') {
      // What is left is solid; the parts taken away stay as dashed outlines.
      rows.push(
        N1 >= N2
          ? { label: `= ${N1 - N2}/${L}`, den: L, segments: [{ count: N1 - N2, tone: 'geometry' }, { count: N2, tone: 'combinatorics', faint: true, dashed: true }] }
          : { label: `= −${N2 - N1}/${L}`, den: L, segments: [{ count: N1, tone: 'arithmetic', faint: true, dashed: true }, { count: N2 - N1, tone: 'data' }] }
      );
    }
    const filled = (row) => sum(row.segments.map((s) => s.count));
    const wholesOf = (row) => Math.max(1, Math.ceil(filled(row) / row.den));
    const wholes = Math.max(...rows.map(wholesOf));

    const rowPx = 30;
    const gapPx = 14;
    const f = strip(wholes, 8 + rows.length * rowPx + (rows.length - 1) * gapPx + 8, { left: 76, right: 12 });
    const rects = [];
    const notes = [];
    rows.forEach((row, r) => {
      const y = f.px(8 + r * (rowPx + gapPx));
      const h = f.px(rowPx);
      const part = 1 / row.den;
      const total = wholesOf(row) * row.den;
      const baseTone = row.segments[row.segments.length - 1].tone;
      if (part * f.s >= 4) {
        let k = 0;
        for (const seg of row.segments) {
          for (let i = 0; i < seg.count; i++, k++) rects.push({ x: f.x0 + k * part, y, w: part, h, tone: seg.tone, faint: seg.faint, dashed: seg.dashed });
        }
        for (; k < total; k++) rects.push({ x: f.x0 + k * part, y, w: part, h, tone: baseTone, faint: true });
      } else {
        // Parts thinner than 4 px: one block per segment, then the empty rest of the bar.
        let x = 0;
        for (const seg of row.segments) {
          if (seg.count) rects.push({ x: f.x0 + x, y, w: seg.count * part, h, tone: seg.tone, faint: seg.faint, dashed: seg.dashed });
          x += seg.count * part;
        }
        if (x < wholesOf(row) - 1e-9) rects.push({ x: f.x0 + x, y, w: wholesOf(row) - x, h, tone: baseTone, faint: true });
      }
      // A dark divider where one whole ends and the next begins.
      for (let w = 1; w < wholesOf(row); w++) rects.push({ x: f.x0 + w - f.px(1), y: y - f.px(4), w: f.px(2), h: h + f.px(8), tone: 'algebra' });
      notes.push({ x: f.x0 - f.px(10), y: y + h / 2 + f.px(5), text: row.label, anchor: 'end' });
    });

    const readouts = [
      { label: 'Common denominator', value: d1 === d2 ? `${d1} already` : `LCM(${d1}, ${d2}) = ${L}` },
      { label: 'Rewritten', value: `${n1}/${d1} = ${N1}/${L}, ${n2}/${d2} = ${N2}/${L}` }
    ];
    let insight;
    if (op === 'compare') {
      readouts.push({ label: 'Cross-multiply', value: `${n1} × ${d2} = ${n1 * d2}, ${n2} × ${d1} = ${n2 * d1}` });
      readouts.push({ label: 'Bigger', value: comparison === 0 ? 'Equal' : comparison > 0 ? `A, ${A}` : `B, ${Bf}` });
      if (comparison === 0) insight = `${n1}/${d1} and ${n2}/${d2} are the same amount, cut differently: both are ${N1}/${L}.`;
      else if (d1 === d2) insight = `The parts are the same size already, so just compare ${n1} with ${n2}.`;
      else insight = `Cut both into ${L} equal parts, the LCM of ${d1} and ${d2}, and count: ${N1} against ${N2}, so ${comparison > 0 ? A : Bf} is bigger.`;
    } else {
      const sign = op === 'add' ? '+' : '−';
      const raw = `${resultN < 0 ? '−' : ''}${Math.abs(resultN)}/${L}`;
      const simplest = fractionText(resultN, L);
      readouts.push({ label: op === 'add' ? 'Sum' : 'Difference', value: `${N1}/${L} ${sign} ${N2}/${L} = ${raw}${simplest === raw ? '' : ` = ${simplest}`}` });
      insight =
        op === 'add'
          ? `Only parts of the same size can be added: ${N1}/${L} + ${N2}/${L} = ${fractionText(resultN, L)}. Adding tops and bottoms, ${n1 + n2}/${d1 + d2}, would be wrong.`
          : `Rewrite both over ${L}, then take away like parts: ${N1}/${L} − ${N2}/${L} = ${fractionText(resultN, L)}.`;
    }

    return {
      numbers: { lcd: L, N1, N2, resultN, comparison, value1: n1 / d1, value2: n2 / d2 },
      readouts,
      plot: {
        kind: 'rects',
        width: f.width,
        height: f.height,
        rects,
        notes,
        summary:
          op === 'compare'
            ? `${n1}/${d1} is ${N1}/${L} and ${n2}/${d2} is ${N2}/${L}, so ${comparison === 0 ? 'they are equal' : `${comparison > 0 ? A : Bf} is bigger`}.`
            : `${n1}/${d1} ${op === 'add' ? 'plus' : 'minus'} ${n2}/${d2} is ${N1}/${L} ${op === 'add' ? '+' : '−'} ${N2}/${L} = ${fractionText(resultN, L)}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'equal',
      prompt: 'Find two fractions with different denominators that are exactly equal.',
      check: (values) => values.d1 !== values.d2 && values.n1 * values.d2 === values.n2 * values.d1,
      solution: { n1: 2, d1: 3, n2: 4, d2: 6, op: 'compare' }
    },
    {
      id: 'make-one',
      prompt: 'Add two fractions with different denominators to make exactly 1.',
      check: (values) => values.op === 'add' && values.d1 !== values.d2 && values.n1 * values.d2 + values.n2 * values.d1 === values.d1 * values.d2,
      solution: { n1: 3, d1: 4, n2: 2, d2: 8, op: 'add' }
    },
    {
      id: 'twelfth',
      prompt: 'Subtract one fraction from another to leave exactly 1/12.',
      check: (values) => values.op === 'subtract' && 12 * (values.n1 * values.d2 - values.n2 * values.d1) === values.d1 * values.d2,
      solution: { n1: 3, d1: 4, n2: 2, d2: 3, op: 'subtract' }
    },
    {
      id: 'smaller-top',
      prompt: 'Compare two fractions where the bigger one has the smaller numerator.',
      check: (values, n) =>
        values.op === 'compare' && ((values.n1 < values.n2 && n.comparison > 0) || (values.n2 < values.n1 && n.comparison < 0)),
      solution: { n1: 2, d1: 3, n2: 3, d2: 5, op: 'compare' }
    }
  ]
};

export const numberSims = [ratioBarModel, partnershipShares, hcfTiles, lcmBells, agesTimeline, calendarOddDays, fractionBars];
