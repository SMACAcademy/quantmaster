/**
 * Pure maths for the clock-face and number-line figures (components/clockFigure.js
 * and components/numberLineFigure.js), kept free of the DOM so it is unit-tested.
 */

/**
 * Where the hands point at h:m, as bearings (degrees clockwise from 12).
 * The hour hand moves too: 30° an hour plus 0.5° a minute.
 */
export function clockHandBearings(hour, minute) {
  return { hour: ((hour % 12) * 30 + minute * 0.5) % 360, minute: (minute * 6) % 360 };
}

/** The smaller angle between the hands at h:m, in degrees. */
export function clockAngle(hour, minute) {
  const { hour: h, minute: m } = clockHandBearings(hour, minute);
  const d = Math.abs(h - m);
  return Math.min(d, 360 - d);
}

/** Problems with a clock figure, as messages (empty when it can be drawn). */
export function clockProblems(figure) {
  const problems = [];
  if (!Number.isInteger(figure.hour) || figure.hour < 1 || figure.hour > 12) problems.push('clock hour must be a whole number from 1 to 12');
  if (!Number.isFinite(figure.minute) || figure.minute < 0 || figure.minute >= 60) problems.push('clock minute must be from 0 to under 60');
  if (figure.hands !== undefined && !['both', 'none', 'hour', 'minute'].includes(figure.hands)) {
    problems.push('clock hands must be "both", "none", "hour" or "minute"');
  }
  return problems;
}

/** A tick step that gives between 5 and 12 ticks across [min, max]. */
export function numberLineStep(min, max) {
  const span = max - min;
  for (const step of [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000]) {
    if (span / step <= 12) return step;
  }
  return Math.pow(10, Math.ceil(Math.log10(span / 10)));
}

/** The tick values from min to max (inclusive) for a step, free of floating-point dust. */
export function numberLineTicks(min, max, step = numberLineStep(min, max)) {
  const ticks = [];
  const first = Math.ceil(min / step - 1e-9) * step;
  for (let v = first; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/**
 * Problems with a number-line figure:
 *   { type: 'numberline', min, max, step?, ranges: [{ from, to, fromOpen, toOpen }],
 *     points: [{ value, label, open }] }
 * A range with `from: null` runs off to the left (−∞), `to: null` to the right (+∞).
 */
export function numberLineProblems(figure) {
  const problems = [];
  const { min, max } = figure;
  if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min)) {
    return ['number line needs finite min and max, with max > min'];
  }
  if (figure.step !== undefined && !(Number.isFinite(figure.step) && figure.step > 0 && (max - min) / figure.step <= 40)) {
    problems.push('number line step must be positive and give at most 40 ticks');
  }
  const inside = (v) => v >= min - 1e-9 && v <= max + 1e-9;
  for (const r of figure.ranges || []) {
    if (r.from === undefined || r.to === undefined) {
      problems.push('a range needs both from and to (null for an endless side)');
      continue;
    }
    if (r.from !== null && !(Number.isFinite(r.from) && inside(r.from))) problems.push('a range must start on the line, or at null for −∞');
    if (r.to !== null && !(Number.isFinite(r.to) && inside(r.to))) problems.push('a range must end on the line, or at null for +∞');
    if (r.from !== null && r.to !== null && !(r.to > r.from)) problems.push('a range must end to the right of where it starts');
  }
  for (const p of figure.points || []) {
    if (!(Number.isFinite(p.value) && inside(p.value))) problems.push('every point must be a number on the line');
  }
  if (!(figure.ranges || []).length && !(figure.points || []).length) problems.push('a number line needs at least one range or point');
  return problems;
}
