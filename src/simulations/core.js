/**
 * Shared, DOM-free helpers for the interactive simulations ("Explore").
 *
 * A simulation is a plain object:
 *
 *   id, topicId, title, summary      what it is, and which topic it belongs to
 *   controls                         sliders and choices the learner changes:
 *     { id, label, type: 'range', min, max, step, default, unit? }
 *     { id, label, type: 'choice', options: [{ id, label }], default }
 *     { id, label, type: 'reroll', default }   a button that draws a fresh random run
 *   compute(values)                  -> { numbers, readouts, plot, insight }
 *     numbers   the raw results, for tests and for task checks
 *     readouts  [{ label, value }] shown beside the picture
 *     plot      what to draw (see components/simPlots.js for the kinds)
 *     insight   one sentence about what the current settings show
 *   tasks                            "Try this" challenges:
 *     { id, prompt, check(values, numbers) -> boolean, solution: { controlId: value } }
 *
 * Everything a simulation shows is worked out in compute(), so the maths is
 * tested without a browser (tests/simulations.test.js).
 */

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Snap to the control's step, counted from its minimum, and keep within range. */
export function snap(control, value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return control.default;
  const steps = Math.round((raw - control.min) / control.step);
  const snapped = control.min + steps * control.step;
  // Remove floating-point dust such as 0.30000000000000004.
  return clamp(Number(snapped.toFixed(10)), control.min, control.max);
}

/** The starting value of every control. */
export function initialValues(simulation) {
  return Object.fromEntries(simulation.controls.map((control) => [control.id, control.default]));
}

/** Any set of values, made valid for the simulation: unknown keys dropped, ranges snapped, choices checked. */
export function normaliseValues(simulation, values = {}) {
  const out = {};
  for (const control of simulation.controls) {
    const value = values[control.id];
    if (control.type === 'range') out[control.id] = value === undefined ? control.default : snap(control, value);
    else if (control.type === 'choice') out[control.id] = control.options.some((option) => option.id === value) ? value : control.default;
    else out[control.id] = Number.isInteger(value) && value > 0 ? value : control.default;
  }
  return out;
}

/** Run a simulation on any values, made valid first. */
export function run(simulation, values) {
  const valid = normaliseValues(simulation, values);
  return { values: valid, result: simulation.compute(valid) };
}

/** Tasks the current values satisfy. */
export function solvedTasks(simulation, values, numbers) {
  return simulation.tasks.filter((task) => task.check(values, numbers)).map((task) => task.id);
}

/**
 * An axis from `min` to `max` widened to round numbers, with ticks at a
 * friendly step (1, 2 or 5 times a power of ten).
 */
export function niceRange(min, max, ticks = 5) {
  let low = Number.isFinite(min) ? min : 0;
  let high = Number.isFinite(max) ? max : 1;
  if (high - low < 1e-9) {
    low -= 1;
    high += 1;
  }
  const raw = (high - low) / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / magnitude;
  const step = (residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1) * magnitude;
  const start = Math.floor(low / step + 1e-9) * step;
  const end = Math.ceil(high / step - 1e-9) * step;
  const values = [];
  for (let value = start; value <= end + step / 2; value += step) values.push(Number(value.toFixed(10)));
  return { min: start, max: end, step, ticks: values };
}

/** Deterministic random numbers in [0, 1) from a seed (mulberry32). */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Greatest common divisor of two whole numbers. */
export function gcd(a, b) {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) [x, y] = [y, x % y];
  return x;
}

/** A ratio of two non-negative numbers in lowest whole terms, as "a : b" (up to two decimals kept). */
export function ratioText(a, b) {
  const scale = 100;
  const x = Math.round(a * scale);
  const y = Math.round(b * scale);
  if (x === 0 && y === 0) return '0 : 0';
  const divisor = gcd(x, y) || 1;
  return `${x / divisor} : ${y / divisor}`;
}

/** A number for display: up to `decimals` places, trailing zeros dropped, thousands grouped. */
export function show(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(decimals));
  // A true minus sign, as the rest of the app writes it.
  return (Object.is(rounded, -0) ? 0 : rounded).toLocaleString('en-IN', { maximumFractionDigits: decimals }).replace(/^-/, '−');
}

/** A signed percentage for display, such as +21% or −4%. */
export function signedPercent(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(decimals));
  if (rounded === 0) return '0%';
  return `${rounded > 0 ? '+' : '−'}${show(Math.abs(rounded), decimals)}%`;
}

/** Hours as "2 h 30 min" (or minutes alone below an hour). */
export function hoursText(hours) {
  if (!Number.isFinite(hours) || hours < 0) return '—';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const near = (a, b, tolerance = 1e-9) => Math.abs(a - b) <= tolerance;
