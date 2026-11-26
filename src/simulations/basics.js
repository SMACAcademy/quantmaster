/** Simulations for indices and surds, unit conversions and algebraic expressions (Phase G). */

import { gcd } from './core.js';

/* ------------------------------- helpers ------------------------------- */

const MINUS = '−';
const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** An exponent as superscript: 7 → ⁷, −3 → ⁻³. */
const sup = (n) => String(n).replace('-', '⁻').replace(/\d/g, (d) => SUPERSCRIPT[d]);

/** Digits grouped the Indian way, as the rest of the app shows numbers: 1,00,00,000. */
function groupDigits(digits) {
  if (digits.length <= 3) return digits;
  const last = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const groups = [];
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) groups.unshift(rest);
  return `${groups.join(',')},${last}`;
}

/** A whole number as text, exactly (BigInt or Number). */
const whole = (value) => {
  const text = String(value);
  return text.startsWith('-') ? `${MINUS}${groupDigits(text.slice(1))}` : groupDigits(text);
};

/** n × 10^e (n a whole number, e any whole number) as an exact decimal: 35 × 10² → "3,500", 5 × 10⁻³ → "0.005". */
export function decimalText(n, e) {
  const negative = n < 0;
  let digits = String(Math.abs(n));
  if (e >= 0) digits += '0'.repeat(e);
  else {
    digits = digits.padStart(-e + 1, '0');
    const point = digits.length + e;
    const fraction = digits.slice(point).replace(/0+$/, '');
    digits = fraction ? `${groupDigits(digits.slice(0, point))}.${fraction}` : groupDigits(digits.slice(0, point));
    return `${negative ? MINUS : ''}${digits}`;
  }
  return `${negative ? MINUS : ''}${groupDigits(digits)}`;
}

/** A fraction p/q in lowest terms, with a positive bottom. */
function reduce(p, q) {
  const divisor = gcd(p, q) || 1;
  return q < 0 ? { p: -p / divisor, q: -q / divisor } : { p: p / divisor, q: q / divisor };
}

/** p/q exactly as a decimal when it ends (q has only 2s and 5s), else null. */
export function fractionDecimal(p, q) {
  let rest = q;
  let twos = 0;
  let fives = 0;
  while (rest % 2 === 0) {
    rest /= 2;
    twos += 1;
  }
  while (rest % 5 === 0) {
    rest /= 5;
    fives += 1;
  }
  if (rest !== 1) return null;
  const k = Math.max(twos, fives);
  return decimalText((p * 10 ** k) / q, -k);
}

/** p/q for display: "20", "12.5" or "125/9". */
const fractionText = ({ p, q }) => fractionDecimal(p, q) ?? `${whole(p)}/${q}`;

/** The layout below is in pixels: a `rects` plot of 500 × 282 units is drawn at one pixel a unit (simPlots.js). */
const BOX_W = 500;
const BOX_H = 282;
const fits = (text, w, h, px = 1) => w * px >= 7 * text.length + 6 && h * px >= 18;
const bestLabel = (w, h, px, options) => options.find((text) => fits(text, w, h, px)) || '';

/* ------------------------------ index laws ------------------------------ */

/** a^e as an exact fraction of BigInts (a negative exponent puts the power underneath). */
function power(a, e) {
  const big = BigInt(a) ** BigInt(Math.abs(e));
  return e >= 0 ? { num: big, den: 1n } : { num: 1n, den: big };
}

/** A power's value for display: the digits while they stay readable, else how many digits there are. */
const powerValue = (big) => {
  const digits = String(big);
  return digits.length <= 12 ? whole(big) : `a ${digits.length}-digit number`;
};
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const valueText = ({ num, den }) => (den === 1n ? powerValue(num) : `1/${powerValue(den)}`);

export const indexLaws = {
  id: 'index-laws',
  topicId: 'surds-indices',
  title: 'The laws of indices, factor by factor',
  summary: 'Write powers out as rows of factors: multiplying joins them, dividing cancels them, and a power of a power repeats them.',
  controls: [
    {
      id: 'law',
      label: 'Law',
      type: 'choice',
      options: [
        { id: 'product', label: 'aᵐ × aⁿ' },
        { id: 'quotient', label: 'aᵐ ÷ aⁿ' },
        { id: 'power', label: '(aᵐ)ⁿ' }
      ],
      default: 'product'
    },
    { id: 'a', label: 'Base a', type: 'range', min: 2, max: 10, step: 1, default: 2 },
    { id: 'm', label: 'Exponent m', type: 'range', min: 1, max: 8, step: 1, default: 3 },
    { id: 'n', label: 'Exponent n', type: 'range', min: 1, max: 8, step: 1, default: 4 }
  ],
  compute({ law, a, m, n }) {
    const exponent = law === 'product' ? m + n : law === 'quotient' ? m - n : m * n;
    const value = power(a, exponent);
    const pm = `${a}${sup(m)}`;
    const pn = `${a}${sup(n)}`;
    const result = `${a}${sup(exponent)}`;
    const numbers = { law, a, m, n, exponent, num: String(value.num), den: String(value.den) };
    const label = String(a);
    const rects = [];
    const notes = [];
    const left = 70;
    // One factor of a: every law is drawn with the same cells, so the rows compare truly.
    const cell = (x, y, tone, extra = {}) => ({ x, y, w: 24, h: 32, tone, label, ...extra });
    const pitch = 26;
    const rowLabel = (y, text) => notes.push({ x: left - 10, y: y + 21, text, anchor: 'end' });

    if (law === 'product') {
      const rows = [24, 76, 150];
      for (let i = 0; i < m; i++) rects.push(cell(left + i * pitch, rows[0], 'algebra'));
      for (let i = 0; i < n; i++) rects.push(cell(left + i * pitch, rows[1], 'combinatorics'));
      for (let i = 0; i < m + n; i++) rects.push(cell(left + i * pitch, rows[2], i < m ? 'algebra' : 'combinatorics'));
      rowLabel(rows[0], pm);
      rowLabel(rows[1], `× ${pn}`);
      rowLabel(rows[2], `= ${result}`);
      notes.push({ x: left, y: rows[2] + 62, text: `${m} + ${n} = ${m + n} factors of ${a}, end to end`, anchor: 'start' });
      return {
        numbers,
        readouts: [
          { label: `${pm} × ${pn}`, value: `${valueText(power(a, m))} × ${valueText(power(a, n))} = ${valueText(value)}` },
          { label: 'Count the factors', value: `${m} + ${n} = ${m + n}` },
          { label: 'So', value: `${pm} × ${pn} = ${result}` }
        ],
        plot: {
          kind: 'rects',
          width: BOX_W,
          height: BOX_H,
          rects,
          notes,
          summary: `${m} factors of ${a} next to ${n} more make one row of ${m + n}: ${pm} × ${pn} = ${result} = ${valueText(value)}.`
        },
        insight: `Multiplying puts the two rows end to end, so nothing is lost or doubled: the exponents add, ${m} + ${n} = ${m + n}.`
      };
    }

    if (law === 'quotient') {
      const pairs = Math.min(m, n);
      const k = m - n;
      const top = 24;
      const bottom = 76;
      rects.push({ x: left - 2, y: 66, w: Math.max(m, n) * pitch, h: 3, tone: 'data' });
      for (let i = 0; i < m; i++) rects.push(cell(left + i * pitch, top, 'algebra', i < pairs ? { faint: true, dashed: true } : {}));
      for (let i = 0; i < n; i++) rects.push(cell(left + i * pitch, bottom, 'combinatorics', i < pairs ? { faint: true, dashed: true } : {}));
      rowLabel(top, pm);
      rowLabel(bottom, pn);
      notes.push({ x: left + Math.max(m, n) * pitch + 8, y: 72, text: `${pairs} pair${pairs === 1 ? '' : 's'} cancel`, anchor: 'start' });
      const below = 140;
      let what;
      if (k > 0) {
        for (let i = 0; i < k; i++) rects.push(cell(left + i * pitch, below, 'algebra'));
        rowLabel(below, `= ${result}`);
        what = `${k} factor${k === 1 ? '' : 's'} of ${a} stay on top`;
      } else if (k === 0) {
        rects.push(cell(left, below, 'geometry', { label: '1' }));
        rowLabel(below, `= ${a}⁰`);
        what = 'every factor cancels: what is left is 1';
      } else {
        rects.push(cell(left, below, 'geometry', { label: '1' }));
        rects.push({ x: left - 2, y: below + 42, w: -k * pitch, h: 3, tone: 'data' });
        for (let i = 0; i < -k; i++) rects.push(cell(left + i * pitch, below + 52, 'combinatorics'));
        notes.push({ x: left - 10, y: below + 48, text: `= ${result}`, anchor: 'end' });
        what = `${-k} factor${k === -1 ? '' : 's'} of ${a} stay underneath`;
      }
      notes.push({ x: left, y: 268, text: `${m} − ${n} = ${k < 0 ? MINUS + -k : k}: ${what}`, anchor: 'start' });
      let insight;
      if (k > 0) insight = `Each ${a} underneath cancels one on top: ${plural(pairs, 'pair')} go and ${plural(k, 'factor')} of ${a} stay. The exponents subtract.`;
      else if (k === 0) insight = `Everything cancels and 1 is left. That is why ${a}⁰ = 1: it is ${pm} ÷ ${pn}, any number divided by itself.`;
      else insight = `Only ${plural(pairs, 'pair')} cancel, leaving ${plural(-k, 'factor')} of ${a} underneath: ${result} = 1/${a}${sup(-k)}. A negative exponent means divide; the value is not negative.`;
      return {
        numbers,
        readouts: [
          { label: `${pm} ÷ ${pn}`, value: `${valueText(power(a, m))} ÷ ${valueText(power(a, n))} = ${valueText(value)}` },
          { label: 'Pairs that cancel', value: String(pairs) },
          { label: 'So', value: k < 0 ? `${pm} ÷ ${pn} = ${result} = 1/${a}${sup(-k)}` : `${pm} ÷ ${pn} = ${result}${k === 0 ? ' = 1' : ''}` }
        ],
        plot: {
          kind: 'rects',
          width: BOX_W,
          height: BOX_H,
          rects,
          notes,
          summary: `${m} factors of ${a} over ${n}: ${pairs} pairs cancel, so ${pm} ÷ ${pn} = ${result} = ${valueText(value)}.`
        },
        insight
      };
    }

    // (a^m)^n: n rows, each a copy of a^m.
    const pitchY = 30;
    const tone = (row) => (row % 2 ? 'combinatorics' : 'algebra');
    const gridTop = 12 + ((8 - n) * pitchY) / 2;
    for (let r = 0; r < n; r++) {
      for (let i = 0; i < m; i++) rects.push({ x: left + i * pitch, y: gridTop + r * pitchY, w: 24, h: 26, tone: tone(r), label });
      notes.push({ x: left - 10, y: gridTop + r * pitchY + 18, text: pm, anchor: 'end' });
    }
    const side = left + 8 * pitch + 24;
    const mid = 12 + 4 * pitchY;
    notes.push({ x: side, y: mid - 26, text: `${n} cop${n === 1 ? 'y' : 'ies'} of ${pm}`, anchor: 'start' });
    notes.push({ x: side, y: mid, text: `${n} × ${m} = ${m * n} factors of ${a}`, anchor: 'start' });
    notes.push({ x: side, y: mid + 26, text: `= ${result}`, anchor: 'start' });
    const same = m * n === m + n;
    return {
      numbers,
      readouts: [
        { label: `(${pm})${sup(n)}`, value: `${result} = ${valueText(value)}` },
        { label: 'Count the factors', value: `${n} rows of ${m} = ${m * n}` },
        { label: `Not the same as ${pm} × ${pn}`, value: same ? `here it is: ${m} × ${n} = ${m} + ${n}` : `that is ${a}${sup(m + n)}, with ${m} + ${n} = ${m + n} factors` }
      ],
      plot: {
        kind: 'rects',
        width: BOX_W,
        height: BOX_H,
        rects,
        notes,
        summary: `${n} rows of ${m} factors of ${a}: (${pm})${sup(n)} = ${result} = ${valueText(value)}.`
      },
      insight: same
        ? `(${pm})${sup(n)} and ${pm} × ${pn} agree only because ${m} × ${n} = ${m} + ${n}. Change m or n and they part: one multiplies the exponents, the other adds them.`
        : `A power of a power repeats the whole row: ${n} copies of ${m} factors is ${m * n} factors. The exponents multiply.`
    };
  },
  tasks: [
    {
      id: 'equal-one',
      prompt: 'Make aᵐ ÷ aⁿ equal 1.',
      check: (values, n) => n.law === 'quotient' && n.exponent === 0,
      solution: { law: 'quotient', m: 4, n: 4 }
    },
    {
      id: 'sixty-four',
      prompt: 'Make aᵐ × aⁿ equal 64.',
      check: (values, n) => n.law === 'product' && n.num === '64' && n.den === '1',
      solution: { law: 'product', a: 2, m: 2, n: 4 }
    },
    {
      id: 'one-eighth',
      prompt: 'Make aᵐ ÷ aⁿ equal 1/8.',
      check: (values, n) => n.law === 'quotient' && n.num === '1' && n.den === '8',
      solution: { law: 'quotient', a: 2, m: 1, n: 4 }
    },
    {
      id: 'agree',
      prompt: 'Find m and n where (aᵐ)ⁿ gives the same answer as aᵐ × aⁿ.',
      check: (values, n) => n.law === 'power' && n.m * n.n === n.m + n.n,
      solution: { law: 'power', m: 2, n: 2 }
    }
  ]
};

/* ------------------------------ unit ladder ------------------------------ */

/** The metric ladder, top to bottom, with each unit's size as a power of ten in millimetres. */
export const LADDER = [
  { id: 'km', name: 'kilometre', power: 6 },
  { id: 'hm', name: 'hectometre', power: 5 },
  { id: 'dam', name: 'decametre', power: 4 },
  { id: 'm', name: 'metre', power: 3 },
  { id: 'dm', name: 'decimetre', power: 2 },
  { id: 'cm', name: 'centimetre', power: 1 },
  { id: 'mm', name: 'millimetre', power: 0 }
];
const unitOptions = LADDER.map((unit) => ({ id: unit.id, label: unit.id }));
const inMetres = (power) => `${decimalText(1, power - 3)} m`;

export const unitLadder = {
  id: 'unit-ladder',
  topicId: 'unit-conversions',
  alsoTopicIds: ['time-speed-distance'],
  title: 'The unit ladder',
  summary: 'Step a length up or down the metric ladder, × 10 or ÷ 10 a step, and turn km/h into m/s through 1 km = 1000 m and 1 h = 3600 s.',
  controls: [
    {
      id: 'mode',
      label: 'Convert',
      type: 'choice',
      options: [
        { id: 'ladder', label: 'Lengths' },
        { id: 'speed', label: 'Speeds' }
      ],
      default: 'ladder'
    },
    { id: 'amount', label: 'Length', type: 'range', min: 0.1, max: 10, step: 0.1, default: 3.5, showWhen: { mode: 'ladder' } },
    { id: 'from', label: 'From', type: 'choice', options: unitOptions, default: 'km', showWhen: { mode: 'ladder' } },
    { id: 'to', label: 'To', type: 'choice', options: unitOptions, default: 'm', showWhen: { mode: 'ladder' } },
    { id: 'speed', label: 'Speed', type: 'range', min: 1, max: 180, step: 1, default: 54, showWhen: { mode: 'speed' } },
    {
      id: 'direction',
      label: 'Speed direction',
      type: 'choice',
      options: [
        { id: 'kmh', label: 'km/h → m/s' },
        { id: 'ms', label: 'm/s → km/h' }
      ],
      default: 'kmh',
      showWhen: { mode: 'speed' }
    }
  ],
  compute({ mode, amount, from, to, speed, direction }) {
    if (mode === 'speed') return speedConversion(speed, direction);

    // The length in tenths, a whole number: 3.5 → 35. Every value below is that times a power of ten, so it stays exact.
    const tenths = Math.round(amount * 10);
    const start = LADDER.findIndex((unit) => unit.id === from);
    const end = LADDER.findIndex((unit) => unit.id === to);
    const steps = end - start; // positive: down the ladder (smaller units)
    const at = (index) => decimalText(tenths, index - start - 1);
    const result = reduce(tenths * 10 ** Math.max(steps - 1, 0), 10 ** Math.max(1 - steps, 0));
    const factor = decimalText(1, Math.abs(steps));
    const answer = `${at(end)} ${to}`;

    const rungH = 32;
    const pitch = 38;
    const rungX = 60;
    const rungW = 150;
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    const rects = [
      { x: rungX - 10, y: 4, w: 6, h: LADDER.length * pitch, tone: 'data', faint: true },
      { x: rungX + rungW + 4, y: 4, w: 6, h: LADDER.length * pitch, tone: 'data', faint: true }
    ];
    const notes = [];
    LADDER.forEach((unit, i) => {
      const y = 8 + i * pitch;
      const onPath = i >= low && i <= high;
      const tone = i === start ? 'arithmetic' : i === end ? 'geometry' : onPath ? 'algebra' : 'data';
      const size = unit.id === 'm' ? 'm' : `${unit.id} = ${inMetres(unit.power)}`;
      rects.push({ x: rungX, y, w: rungW, h: rungH, tone, faint: !onPath, label: bestLabel(rungW, rungH, 1, [size, unit.id]) });
      if (onPath) notes.push({ x: rungX + rungW + 100, y: y + 21, text: `${i === end && steps ? '= ' : ''}${at(i)} ${unit.id}`, anchor: 'start' });
      if (i >= low && i < high) notes.push({ x: rungX + rungW + 22, y: y + pitch + 1, text: steps > 0 ? '× 10 ↓' : '÷ 10 ↑', anchor: 'start' });
    });

    const readouts = [
      {
        label: 'Steps',
        value: steps === 0 ? 'none: same unit' : `${Math.abs(steps)} ${steps > 0 ? 'down' : 'up'}: ${steps > 0 ? '×' : '÷'} ${factor}`
      },
      { label: 'Answer', value: `${at(start)} ${from} = ${answer}` },
      { label: 'In metres', value: `${at(LADDER.findIndex((unit) => unit.id === 'm'))} m` }
    ];
    let insight;
    if (steps > 0)
      insight = `Each step down is a unit 10 times smaller, so it takes 10 times as many: ${steps} step${steps === 1 ? '' : 's'} multiply by ${factor}. Smaller unit, bigger number.`;
    else if (steps < 0)
      insight = `Each step up is a unit 10 times bigger, so it takes a tenth as many: ${-steps} step${steps === -1 ? '' : 's'} divide by ${factor}. Bigger unit, smaller number.`;
    else insight = 'Same unit, same number. Pick a different "To" unit and count the steps between them.';

    return {
      numbers: { mode, steps, result, tenths },
      readouts,
      plot: {
        kind: 'rects',
        width: BOX_W,
        height: BOX_H,
        rects,
        notes,
        summary: `${at(start)} ${from} is ${answer}: ${steps === 0 ? 'no steps' : `${Math.abs(steps)} step${Math.abs(steps) === 1 ? '' : 's'} ${steps > 0 ? 'down the ladder, × 10 each' : 'up the ladder, ÷ 10 each'}`}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'thousand',
      prompt: 'Find a conversion that multiplies by 1,000 and gives exactly 2,500.',
      check: (values, n) => n.mode === 'ladder' && n.steps === 3 && n.result.p === 2500 && n.result.q === 1,
      solution: { mode: 'ladder', amount: 2.5, from: 'km', to: 'm' }
    },
    {
      id: 'one',
      prompt: 'Step down the ladder and land on exactly 1.',
      check: (values, n) => n.mode === 'ladder' && n.steps > 0 && n.result.p === 1 && n.result.q === 1,
      solution: { mode: 'ladder', amount: 0.1, from: 'm', to: 'dm' }
    },
    {
      id: 'tiny',
      prompt: 'Climb up the ladder until the answer is less than 0.01.',
      check: (values, n) => n.mode === 'ladder' && n.steps < 0 && n.result.p * 100 < n.result.q,
      solution: { mode: 'ladder', amount: 5, from: 'mm', to: 'm' }
    },
    {
      id: 'seventy-two',
      prompt: 'Convert 72 km/h to m/s.',
      check: (values, n) => n.mode === 'speed' && n.direction === 'kmh' && n.kmh.p === 72 && n.kmh.q === 1,
      solution: { mode: 'speed', direction: 'kmh', speed: 72 }
    },
    {
      id: 'ten-ms',
      prompt: 'Find the speed in km/h that is exactly 10 m/s.',
      check: (values, n) => n.mode === 'speed' && n.ms.p === 10 && n.ms.q === 1,
      solution: { mode: 'speed', direction: 'ms', speed: 10 }
    }
  ]
};

/** v km/h → m/s (× 1000 ÷ 3600 = × 5/18), or v m/s → km/h (× 3600 ÷ 1000 = × 18/5), drawn as a fraction rewritten. */
function speedConversion(v, direction) {
  const toMs = direction === 'kmh';
  const kmh = toMs ? reduce(v, 1) : reduce(18 * v, 5);
  const ms = toMs ? reduce(5 * v, 18) : reduce(v, 1);
  const kmhText = fractionText(kmh);
  const msText = fractionText(ms);
  const approx = fractionDecimal(ms.p, ms.q) === null ? ` ≈ ${(ms.p / ms.q).toFixed(2)}` : '';

  const rects = [];
  const notes = [];
  const col = [20, 186, 362];
  const w = [130, 140, 128];
  const top = 54;
  const bottom = 124;
  const box = (x, y, width, text, tone) => ({ x, y, w: width, h: 52, tone, label: bestLabel(width, 52, 1, [text]) });
  if (toMs) {
    rects.push(box(col[0], top, w[0], `${whole(v)} km`, 'arithmetic'), box(col[0], bottom, w[0], '1 h', 'data'));
    rects.push(box(col[1], top, w[1], `${whole(v * 1000)} m`, 'arithmetic'), box(col[1], bottom, w[1], '3,600 s', 'data'));
    rects.push(box(col[2], (top + bottom) / 2, w[2], `${msText} m/s`, 'geometry'));
    notes.push({ x: col[1] + w[1] / 2, y: top - 12, text: '1 km = 1,000 m' });
    notes.push({ x: col[1] + w[1] / 2, y: bottom + 74, text: '1 h = 3,600 s' });
    notes.push({ x: 250, y: 262, text: `× 1000 ÷ 3600 is × 5/18: ${whole(v)} × 5/18 = ${msText}${approx}` });
  } else {
    rects.push(box(col[0], top, w[0], `${whole(v)} m`, 'arithmetic'), box(col[0], bottom, w[0], '1 s', 'data'));
    rects.push(box(col[1], top, w[1], `${whole(v * 3600)} m`, 'arithmetic'), box(col[1], bottom, w[1], '3,600 s', 'data'));
    rects.push(box(col[2], (top + bottom) / 2, w[2], `${kmhText} km/h`, 'geometry'));
    notes.push({ x: col[1] + w[1] / 2, y: top - 12, text: '× 3,600 top and bottom' });
    notes.push({ x: col[1] + w[1] / 2, y: bottom + 74, text: '3,600 s = 1 h, 1,000 m = 1 km' });
    notes.push({ x: 250, y: 262, text: `× 3600 ÷ 1000 is × 18/5: ${whole(v)} × 18/5 = ${kmhText}` });
  }
  // Fraction bars, and the equals signs between the columns.
  rects.push({ x: col[0], y: top + 59, w: w[0], h: 3, tone: 'data' }, { x: col[1], y: top + 59, w: w[1], h: 3, tone: 'data' });
  notes.push({ x: (col[0] + w[0] + col[1]) / 2, y: top + 66, text: '=' }, { x: (col[1] + w[1] + col[2]) / 2, y: top + 66, text: '=' });

  return {
    numbers: { mode: 'speed', direction, kmh, ms },
    readouts: toMs
      ? [
          { label: 'Change both units', value: `${whole(v)} km = ${whole(v * 1000)} m, 1 h = 3,600 s` },
          { label: 'Speed', value: `${whole(v)} km/h = ${whole(v * 1000)}/3600 m/s = ${msText}${approx} m/s` },
          { label: 'Shortcut', value: `km/h → m/s: × 5/18` }
        ]
      : [
          { label: 'In one hour', value: `${whole(v)} m × 3,600 = ${whole(v * 3600)} m = ${kmhText} km` },
          { label: 'Speed', value: `${whole(v)} m/s = ${kmhText} km/h` },
          { label: 'Shortcut', value: `m/s → km/h: × 18/5` }
        ],
    plot: {
      kind: 'rects',
      width: BOX_W,
      height: BOX_H,
      rects,
      notes,
      summary: toMs
        ? `${v} km in 1 hour is ${v * 1000} m in 3,600 seconds, which is ${msText}${approx} m/s.`
        : `${v} m in 1 second is ${v * 3600} m in 3,600 seconds, which is ${kmhText} km/h.`
    },
    insight: toMs
      ? `A km/h is 1000 m per 3600 s, and 1000/3600 = 5/18. So multiply by 5/18, and the m/s figure is always smaller.`
      : `In an hour you go 3600 times as far, then 1000 m make a km: 3600/1000 = 18/5. So multiply by 18/5, and the km/h figure is always bigger.`
  };
}

/* ------------------------------ algebra tiles ------------------------------ */

/** "x² + 3x − 2" from coefficients [x², x, 1]. */
export function polyText([c2, c1, c0]) {
  const parts = [];
  for (const [coef, name] of [[c2, 'x²'], [c1, 'x'], [c0, '']]) {
    if (coef === 0) continue;
    const size = Math.abs(coef) === 1 && name ? '' : String(Math.abs(coef));
    if (!parts.length) parts.push(`${coef < 0 ? MINUS : ''}${size}${name}`);
    else parts.push(`${coef < 0 ? MINUS : '+'} ${size}${name}`);
  }
  return parts.length ? parts.join(' ') : '0';
}

const KINDS = [
  { name: 'x²', tone: 'algebra' },
  { name: 'x', tone: 'combinatorics' },
  { name: '1', tone: 'geometry' }
];

// Tile sizes in units: x is drawn 2.5 times the side of a 1-tile, so an x strip is 1 by 2.5.
const X = 2.5;
const GAP = 0.3;
const MAX = [4, 8, 10]; // the most tiles of each kind in one line (both expressions together)
const LEFT = 4.2;
const GROUP_GAP = 1.4;
const columns = [MAX[0], MAX[1], MAX[2] / 2];
const tileW = [X, 1, 1];
const groupX = [];
{
  let x = LEFT;
  for (let k = 0; k < 3; k++) {
    groupX.push(x);
    x += columns[k] * tileW[k] + (columns[k] - 1) * GAP + GROUP_GAP;
  }
}
const TILES_W = groupX[2] + columns[2] + (columns[2] - 1) * GAP + 0.3;
const ROW_A = 1.5;
const ROW_B = ROW_A + X + 0.8;
const ROW_SUM = ROW_B + X + 1.8;
const TILES_H = ROW_SUM + 2 * X + GAP + 2.7;
const PX = Math.min(BOX_W / TILES_W, BOX_H / TILES_H);

/** The i-th tile of a kind in a line starting at y: x² and x tiles side by side, 1-tiles two to a column. */
function tileAt(kind, i, y) {
  if (kind === 2) return { x: groupX[2] + Math.floor(i / 2) * (1 + GAP), y: y + 0.1 + (i % 2) * (1 + GAP), w: 1, h: 1 };
  return { x: groupX[kind] + i * (tileW[kind] + GAP), y, w: tileW[kind], h: X };
}

function tile(kind, i, y, negative, cancelled = false) {
  const place = tileAt(kind, i, y);
  const name = KINDS[kind].name;
  const options = negative ? [`${MINUS}${name}`, MINUS] : [name, '+'];
  return { ...place, tone: KINDS[kind].tone, faint: negative || cancelled, dashed: cancelled, label: bestLabel(place.w, place.h, PX, options) };
}

const coefficientControl = (id, label, min, max, value) => ({ id, label, type: 'range', min, max, step: 1, default: value });

export const algebraTiles = {
  id: 'algebra-tiles',
  topicId: 'algebraic-expressions',
  title: 'Algebra tiles: add two expressions',
  summary: 'Lay out two expressions as x², x and 1 tiles. Like tiles group together, and a tile and its negative cancel as a zero pair.',
  controls: [
    coefficientControl('a2', 'A: x² tiles', -2, 2, 1),
    coefficientControl('a1', 'A: x tiles', -4, 4, 3),
    coefficientControl('a0', 'A: 1-tiles', -5, 5, -2),
    coefficientControl('b2', 'B: x² tiles', -2, 2, 1),
    coefficientControl('b1', 'B: x tiles', -4, 4, -1),
    coefficientControl('b0', 'B: 1-tiles', -5, 5, 4)
  ],
  compute({ a2, a1, a0, b2, b1, b0 }) {
    const A = [a2, a1, a0];
    const B = [b2, b1, b0];
    const sum = A.map((c, k) => c + B[k]);
    const positives = A.map((c, k) => Math.max(c, 0) + Math.max(B[k], 0));
    const negatives = A.map((c, k) => Math.max(-c, 0) + Math.max(-B[k], 0));
    const pairs = positives.map((p, k) => Math.min(p, negatives[k]));
    const zeroPairs = pairs.reduce((total, p) => total + p, 0);
    const terms = sum.filter((c) => c !== 0).length;

    const rects = [];
    const notes = [];
    for (const [coefs, y] of [[A, ROW_A], [B, ROW_B]]) {
      coefs.forEach((c, k) => {
        for (let i = 0; i < Math.abs(c); i++) rects.push(tile(k, i, y, c < 0));
      });
    }
    // Together: positive tiles on one line, negative tiles under them, so each zero pair stands in a column.
    const negY = ROW_SUM + X + GAP;
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < positives[k]; i++) rects.push(tile(k, i, ROW_SUM, false, i < pairs[k]));
      for (let i = 0; i < negatives[k]; i++) rects.push(tile(k, i, negY, true, i < pairs[k]));
    }
    const nameX = LEFT - 12 / PX;
    const middle = (y, h) => y + h / 2 + 5 / PX;
    notes.push({ x: nameX, y: middle(ROW_A, X), text: 'A', anchor: 'end' });
    notes.push({ x: nameX, y: middle(ROW_B, X), text: 'B', anchor: 'end' });
    notes.push({ x: nameX, y: middle(ROW_SUM, 2 * X + GAP), text: 'A + B', anchor: 'end' });
    KINDS.forEach((kind, k) => {
      notes.push({ x: groupX[k], y: ROW_A - 8 / PX, text: kind.name === '1' ? '1-tiles' : `${kind.name} tiles`, anchor: 'start' });
      const total = polyText(KINDS.map((_, j) => (j === k ? sum[k] : 0)));
      notes.push({ x: groupX[k], y: negY + X + 18 / PX, text: `= ${total}`, anchor: 'start' });
      if (pairs[k]) notes.push({ x: groupX[k], y: negY + X + 36 / PX, text: `${pairs[k]} zero pair${pairs[k] === 1 ? '' : 's'}`, anchor: 'start' });
    });

    const sumText = polyText(sum);
    let insight;
    if (terms === 0 && A.some((c) => c !== 0)) insight = 'Every tile met its opposite, so A + B = 0: B is exactly the negative of A.';
    else if (zeroPairs > 0)
      insight = `A tile and its negative make 0, so ${zeroPairs} zero pair${zeroPairs === 1 ? '' : 's'} leave the mat. What stays is ${sumText}.`;
    else if (terms > 1) insight = `Nothing cancels here. Like tiles group, but x², x and 1-tiles have different shapes and never merge: ${sumText} stays ${terms} terms.`;
    else insight = `Nothing cancels here: like tiles just group, giving ${sumText}.`;

    return {
      numbers: { A, B, sum, pairs, zeroPairs, terms },
      readouts: [
        { label: 'A', value: polyText(A) },
        { label: 'B', value: polyText(B) },
        { label: 'Zero pairs', value: zeroPairs ? KINDS.map((kind, k) => (pairs[k] ? `${pairs[k]} × (${kind.name}, ${MINUS}${kind.name})` : '')).filter(Boolean).join(', ') : 'none' },
        { label: 'A + B', value: sumText }
      ],
      plot: {
        kind: 'rects',
        width: TILES_W,
        height: TILES_H,
        rects,
        notes,
        summary: `A = ${polyText(A)} and B = ${polyText(B)} as tiles. Put together, ${zeroPairs} zero pair${zeroPairs === 1 ? '' : 's'} cancel, leaving ${sumText}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'cancel-x',
      prompt: 'Keep x tiles in both expressions, but make the x terms cancel completely.',
      check: (values, n) => n.A[1] !== 0 && n.B[1] !== 0 && n.sum[1] === 0,
      solution: { b1: -3 }
    },
    {
      id: 'x-squared-plus-one',
      prompt: 'Make A + B exactly x² + 1.',
      check: (values, n) => n.sum[0] === 1 && n.sum[1] === 0 && n.sum[2] === 1,
      solution: { b2: 0, b1: -3, b0: 3 }
    },
    {
      id: 'zero',
      prompt: 'Make every tile cancel, so that A + B = 0.',
      check: (values, n) => n.terms === 0 && n.A.some((c) => c !== 0),
      solution: { b2: -1, b1: -3, b0: 2 }
    },
    {
      id: 'four-pairs',
      prompt: 'Make A + B exactly 2x, with at least four zero pairs cancelling on the way.',
      check: (values, n) => n.sum[0] === 0 && n.sum[1] === 2 && n.sum[2] === 0 && n.zeroPairs >= 4,
      solution: { b2: -1, b1: -1, b0: 2 }
    }
  ]
};

export const basicsSims = [indexLaws, unitLadder, algebraTiles];
