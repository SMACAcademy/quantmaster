/**
 * Interactive simulations (Explore). The pictures are drawn from compute(), so
 * these tests hold the maths to the topics' own formulas, check that no setting
 * produces nonsense, and check that every "Try this" challenge can be solved
 * (and is not already solved at the start).
 */

import { describe, it, expect } from 'vitest';

import { SIMULATIONS, getSimulation, simulationsForTopic } from '../src/simulations/index.js';
import { initialValues, niceRange, normaliseValues, ratioText, run, show, signedPercent, snap, solvedTasks } from '../src/simulations/core.js';
import { clockAngle } from '../src/simulations/motion.js';
import { levelRepository, topicRepository } from '../src/repositories/contentRepository.js';
import { SIMULATION_META, getSimulationMeta, simulationMetaForTopic } from '../src/simulations/meta.js';
import { rememberSolved, solvedCount } from '../src/simulations/progress.js';
import { resetProgress } from '../src/repositories/progressRepository.js';

const compute = (id, values) => run(getSimulation(id), { ...initialValues(getSimulation(id)), ...values }).result.numbers;

/** Every combination of each control's minimum, default and maximum (and every choice). */
function corners(simulation) {
  let combos = [{}];
  for (const control of simulation.controls) {
    const options =
      control.type === 'range'
        ? [...new Set([control.min, control.default, control.max])]
        : control.type === 'choice'
          ? control.options.map((option) => option.id)
          : [1, 2];
    combos = combos.flatMap((combo) => options.map((value) => ({ ...combo, [control.id]: value })));
  }
  return combos;
}

function allNumbers(value, out = []) {
  if (typeof value === 'number') out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => allNumbers(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => allNumbers(item, out));
  return out;
}

describe('the catalogue', () => {
  it('has unique ids, each tied to a real topic', () => {
    const ids = SIMULATIONS.map((simulation) => simulation.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const simulation of SIMULATIONS) expect(topicRepository.getById(simulation.topicId), simulation.id).not.toBeNull();
    expect(simulationsForTopic('clocks').map((s) => s.id)).toEqual(['clock-angle']);
    expect(getSimulation('nope')).toBeNull();
  });

  it('only lists real topics as other places a simulation suits', () => {
    for (const meta of SIMULATION_META) {
      for (const topicId of meta.alsoTopicIds || []) {
        expect(topicRepository.getById(topicId), `${meta.id}: ${topicId}`).not.toBeNull();
        expect(topicId, `${meta.id} lists its own topic`).not.toBe(meta.topicId);
        expect(simulationMetaForTopic(topicId).map((m) => m.id)).toContain(meta.id);
      }
    }
  });

  it('keeps the lightweight list (meta.js) in step with the models', () => {
    expect(SIMULATION_META).toEqual(
      SIMULATIONS.map((s) => ({
        id: s.id,
        topicId: s.topicId,
        ...(s.alsoTopicIds ? { alsoTopicIds: s.alsoTopicIds } : {}),
        title: s.title,
        summary: s.summary,
        taskIds: s.tasks.map((t) => t.id)
      }))
    );
    expect(getSimulationMeta('clock-angle').title).toBe('The angle between the hands');
    expect(simulationMetaForTopic('trains').map((m) => m.id)).toEqual(['train-crossing']);
  });

  it('remembers finished challenges on the device', () => {
    resetProgress();
    expect(solvedCount('polygon-angles', ['one-forty', 'twenty'])).toBe(0);
    rememberSolved('polygon-angles', ['twenty', 'retired-task']);
    expect(solvedCount('polygon-angles', ['one-forty', 'twenty'])).toBe(1);
  });

  it('puts every simulation in a lesson or at least on its topic page', () => {
    const inLessons = new Set(
      levelRepository
        .getAll()
        .flatMap((level) => level.lesson?.blocks || [])
        .filter((block) => block.type === 'simulation')
        .map((block) => block.simulationId)
    );
    for (const id of inLessons) expect(getSimulation(id), id).not.toBeNull();
    expect(inLessons.size).toBeGreaterThanOrEqual(23);
  });
});

describe.each(SIMULATIONS.map((simulation) => [simulation.id, simulation]))('%s', (id, simulation) => {
  it('only hides controls behind a real choice and option', () => {
    for (const control of simulation.controls) {
      for (const [id, want] of Object.entries(control.showWhen || {})) {
        const choice = simulation.controls.find((c) => c.id === id);
        expect(choice?.type, `${control.id}: showWhen ${id}`).toBe('choice');
        for (const option of Array.isArray(want) ? want : [want]) {
          expect(choice.options.map((o) => o.id), `${control.id}: showWhen ${id}=${option}`).toContain(option);
        }
      }
    }
  });

  it('describes its controls properly', () => {
    for (const control of simulation.controls) {
      expect(control.label, control.id).toBeTruthy();
      if (control.type === 'range') {
        expect(control.min).toBeLessThan(control.max);
        expect(snap(control, control.default)).toBe(control.default);
        expect(Number.isInteger(Math.round((control.max - control.min) / control.step))).toBe(true);
      } else if (control.type === 'choice') {
        expect(control.options.some((option) => option.id === control.default)).toBe(true);
      }
    }
  });

  it('gives sensible output at every corner of its settings', () => {
    for (const values of corners(simulation)) {
      const { result } = run(simulation, values);
      const where = `${id} ${JSON.stringify(values)}`;
      const kinds = ['xy', 'bars', 'clock', 'seesaw', 'tank', 'track', 'numberline', 'triangle', 'circle', 'polygon', 'dots', 'solids', 'rects', 'venn', 'chart', 'table', 'candidates', 'geometry', 'wheel', 'numberlines', 'steps', 'tree', 'setdots', 'subsets', 'passage', 'seats', 'grid', 'euler', 'chain', 'family', 'walk', 'wheels', 'queue', 'cubes', 'fold', 'mirrorclock'];
      // A stack is several of the other kinds, one above the other.
      for (const plot of result.plot.kind === 'stack' ? result.plot.plots : [result.plot]) {
        expect(kinds, where).toContain(plot.kind);
        expect(plot.summary, where).toBeTruthy();
      }
      expect(result.plot.summary, where).toBeTruthy();
      expect(result.insight, where).toBeTruthy();
      for (const readout of result.readouts) {
        expect(readout.label, where).toBeTruthy();
        expect(String(readout.value), where).not.toMatch(/NaN|undefined|Infinity/);
      }
      // Everything the picture is drawn from is a finite number, so nothing is drawn off into infinity.
      expect(allNumbers(result.plot).every(Number.isFinite), where).toBe(true);
    }
  });

  it('has challenges that can be solved, none of them solved at the start', () => {
    const start = run(simulation, initialValues(simulation));
    expect(solvedTasks(simulation, start.values, start.result.numbers)).toEqual([]);
    expect(simulation.tasks.length).toBeGreaterThanOrEqual(2);
    for (const task of simulation.tasks) {
      const { values, result } = run(simulation, { ...initialValues(simulation), ...task.solution });
      // The solution must survive snapping to the sliders' steps.
      for (const [key, value] of Object.entries(task.solution)) expect(values[key], `${task.id}.${key}`).toBe(value);
      expect(task.check(values, result.numbers), task.id).toBe(true);
    }
  });
});

describe('the maths matches the topics', () => {
  it('compound vs simple interest', () => {
    const n = compute('ci-vs-si', { principal: 10000, rate: 10, years: 2, compounding: 'yearly' });
    expect(n.si).toBeCloseTo(12000, 9);
    expect(n.ci).toBeCloseTo(12100, 9);
    expect(n.gap).toBeCloseTo(10000 * 0.1 ** 2, 9); // the CI − SI shortcut
    const half = compute('ci-vs-si', { principal: 8000, rate: 10, years: 1, compounding: 'half-yearly' });
    expect(half.ci).toBeCloseTo(8000 * 1.05 ** 2, 9); // A = P(1 + R/200)^(2T)
    const doubling = compute('ci-vs-si', { rate: 8, years: 5 }).doubling;
    expect(Math.abs(doubling - 72 / 8)).toBeLessThan(0.1); // close to the rule of 72
  });

  it('successive percentage changes', () => {
    expect(compute('successive-change', { first: 10, second: -10 }).net).toBeCloseTo(-1, 9);
    expect(compute('successive-change', { first: 25, second: -20 }).net).toBeCloseTo(0, 9);
    const n = compute('successive-change', { first: 20, second: 30 });
    expect(n.net).toBeCloseTo(20 + 30 + 6, 9);
    expect(n.final).toBeCloseTo(156, 9);
    // Undoing +25% takes −20%, the fraction-pairs shortcut.
    expect(compute('successive-change', { first: 25, second: 0 }).undo).toBeCloseTo(-20, 9);
  });

  it('markup and discount', () => {
    const n = compute('markup-discount', { markup: 25, discount: 20 });
    expect(n.selling).toBeCloseTo(100, 9);
    expect(n.breakEven).toBeCloseTo(20, 9);
    expect(compute('markup-discount', { markup: 20, discount: 20 }).profit).toBeCloseTo(-4, 9); // equal markup and discount lose m²/100 %
    expect(compute('markup-discount', { markup: 40, discount: 10 }).profit).toBeCloseTo(26, 9);
  });

  it('alligation', () => {
    const n = compute('alligation-seesaw', { strength1: 20, amount1: 2, strength2: 50, amount2: 1 });
    expect(n.mean).toBeCloseTo(30, 9);
    // (higher − mean) : (mean − lower) = 20 : 10 = 2 : 1 = amounts of the weaker to the stronger.
    expect(n.weakerShare / n.strongerShare).toBeCloseTo(2, 9);
    expect(ratioText(n.weakerShare, n.strongerShare)).toBe('2 : 1');
  });

  it('meeting and chasing', () => {
    const towards = compute('tsd-meeting', { direction: 'towards', distance: 120, speedA: 40, speedB: 20 });
    expect(towards.time).toBeCloseTo(2, 9);
    expect(towards.point).toBeCloseTo(80, 9);
    const chase = compute('tsd-meeting', { direction: 'chase', distance: 100, speedA: 80, speedB: 30 });
    expect(chase.time).toBeCloseTo(2, 9);
    expect(chase.point).toBeCloseTo(160, 9);
    expect(compute('tsd-meeting', { direction: 'chase', speedA: 20, speedB: 40 }).meets).toBe(false);
  });

  it('clock angles', () => {
    expect(clockAngle(3, 0)).toBe(90);
    expect(clockAngle(6, 0)).toBe(180);
    expect(clockAngle(12, 0)).toBe(0);
    expect(clockAngle(10, 10)).toBe(115);
    expect(clockAngle(4, 20)).toBe(10);
    expect(clockAngle(2, 11)).toBeCloseTo(0.5, 9);
    // Hands overlap at 16 4/11 minutes past 3: the gap there is zero.
    expect(Math.abs(30 * 3 - 5.5 * (180 / 11))).toBeCloseTo(0, 9);
  });

  it('quadratic roots, sum and product', () => {
    const n = compute('quadratic-roots', { a: 1, b: -5, c: 6 });
    expect(n.roots).toEqual([2, 3]);
    expect(n.sum).toBe(5);
    expect(n.product).toBe(6);
    expect(n.vertex).toEqual({ x: 2.5, y: -0.25 });
    expect(compute('quadratic-roots', { a: 1, b: 4, c: 4 }).roots).toEqual([-2]);
    expect(compute('quadratic-roots', { a: 1, b: 0, c: 4 }).roots).toEqual([]);
    expect(compute('quadratic-roots', { a: 0, b: 2, c: -4 }).roots).toEqual([2]); // a straight line
    expect(compute('quadratic-roots', { a: 2, b: -3, c: -2 }).roots).toEqual([-0.5, 2]);
  });

  it('probability runs are repeatable and settle near the theory', () => {
    const once = compute('probability-trials', { experiment: 'six', trials: 1000, seed: 3 });
    const again = compute('probability-trials', { experiment: 'six', trials: 1000, seed: 3 });
    expect(again).toEqual(once);
    expect(compute('probability-trials', { experiment: 'six', trials: 1000, seed: 4 })).not.toEqual(once);
    for (let seed = 1; seed <= 20; seed++) {
      for (const experiment of ['coin', 'six', 'seven']) {
        expect(Math.abs(compute('probability-trials', { experiment, trials: 5000, seed }).gap), `${experiment} ${seed}`).toBeLessThan(2.5);
      }
    }
    expect(compute('probability-trials', { experiment: 'seven' }).expected).toBeCloseTo(100 / 6, 9);
  });
});

describe('the maths matches the topics (second batch)', () => {
  it('working together', () => {
    const two = compute('work-together', { daysA: 12, daysB: 18, daysC: 0 });
    expect(two.job).toBe(36);
    expect(two.time).toBeCloseTo((12 * 18) / (12 + 18), 9); // ab ÷ (a + b)
    expect(compute('work-together', { daysA: 12, daysB: 15, daysC: 20 }).time).toBeCloseTo(5, 9);
  });

  it('pipes and a drain', () => {
    expect(compute('tank-filling', { fillA: 20, fillB: 30, emptyC: 0 }).fillTime).toBeCloseTo(12, 9);
    const leak = compute('tank-filling', { fillA: 10, fillB: 0, emptyC: 15 });
    expect(leak.fillTime).toBeCloseTo((10 * 15) / (15 - 10), 9); // ab ÷ (b − a)
    expect(compute('tank-filling', { fillA: 20, fillB: 0, emptyC: 20 }).fillTime).toBe(Infinity);
    expect(compute('tank-filling', { fillA: 20, fillB: 0, emptyC: 0, minute: 60 }).level).toBe(1); // capped at full
  });

  it('train crossings', () => {
    expect(compute('train-crossing', { crossing: 'pole', trainLength: 150, speed: 54 }).time).toBeCloseTo(10, 9);
    expect(compute('train-crossing', { crossing: 'platform', trainLength: 200, speed: 72, otherLength: 300 }).time).toBeCloseTo(25, 9);
    const opposite = compute('train-crossing', { crossing: 'opposite', trainLength: 120, otherLength: 80, speed: 54, otherSpeed: 36 });
    expect(opposite.time).toBeCloseTo(200 / 25, 9);
    expect(compute('train-crossing', { crossing: 'same', speed: 36, otherSpeed: 36 }).time).toBe(Infinity);
  });

  it('boats and streams', () => {
    const n = compute('boats-streams', { boat: 10, stream: 2, distance: 24 });
    expect([n.down, n.up, n.total]).toEqual([12, 8, 5]);
    expect(n.average).toBeCloseTo((2 * 12 * 8) / (12 + 8), 9); // 2DU ÷ (D + U)
    expect(compute('boats-streams', { boat: 9, stream: 3 }).timeUp).toBeCloseTo(2 * compute('boats-streams', { boat: 9, stream: 3 }).timeDown, 9);
  });

  it('direct and inverse proportion', () => {
    expect(compute('proportion-curves', { kind: 'direct', k: 6, x: 3 })).toMatchObject({ y: 18, doubled: 36, constant: 6 });
    expect(compute('proportion-curves', { kind: 'inverse', k: 24, x: 4 })).toMatchObject({ y: 6, doubled: 3, constant: 24 });
  });

  it('two lines', () => {
    expect(compute('two-lines', { m1: 1, c1: 1, m2: -1, c2: 5 })).toMatchObject({ x: 2, y: 3, parallel: false });
    expect(compute('two-lines', { m1: 2, c1: 1, m2: 2, c2: -3 })).toMatchObject({ parallel: true, same: false });
    expect(compute('two-lines', { m1: 0.5, c1: 0, m2: -2, c2: 5 })).toMatchObject({ x: 2, y: 1 });
  });

  it('inequalities, including the flip', () => {
    expect(compute('inequality-line', { a: 2, b: 3, sign: '<', c: 9 })).toMatchObject({ boundary: 3, finalSign: '<' });
    expect(compute('inequality-line', { a: -2, b: 0, sign: '<', c: -4 })).toMatchObject({ boundary: 2, finalSign: '>' });
    expect(compute('inequality-line', { a: -3, b: 1, sign: '≥', c: 7 })).toMatchObject({ boundary: -2, finalSign: '≤' });
    expect(compute('inequality-line', { a: 0, b: 6, sign: '<', c: 5 }).none).toBe(true);
  });

  it('progressions', () => {
    expect(compute('ap-pairing', { first: 1, d: 1, n: 12 }).sum).toBe(78);
    expect(compute('ap-pairing', { first: 3, d: 4, n: 10 }).sum).toBe((10 / 2) * (2 * 3 + 9 * 4));
    const n = compute('ap-vs-gp', { first: 3, d: 2, r: 2, n: 6 });
    expect(n.ap[5]).toBe(3 + 5 * 2);
    expect(n.gp[5]).toBe(3 * 2 ** 5);
    expect(n.gpSum).toBeCloseTo(3 * (2 ** 6 - 1), 9);
    expect(compute('ap-vs-gp', { first: 4, r: 0.5 }).infinite).toBeCloseTo(8, 9);
    expect(compute('ap-vs-gp', { first: 5, r: 1, n: 7 }).gpSum).toBe(35);
  });

  it('logarithms', () => {
    expect(compute('log-curves', { base: 2, x: 8 }).log).toBeCloseTo(3, 12);
    expect(compute('log-curves', { base: 4, x: 2 }).log).toBeCloseTo(0.5, 12);
    expect(compute('log-curves', { base: 0.5, x: 4 }).log).toBeCloseTo(-2, 12);
    expect(compute('log-curves', { base: 1 }).valid).toBe(false);
  });

  it('triangle angles and sides', () => {
    const t = compute('triangle-angles', { angleA: 30, angleB: 60 });
    expect(t.C).toBe(90);
    // Sides from the sine rule obey Pythagoras when C is the right angle.
    expect(t.a ** 2 + t.b ** 2).toBeCloseTo(t.c ** 2, 12);
    expect(compute('triangle-angles', { angleA: 30, angleB: 30 })).toMatchObject({ bySide: 'Isosceles', byAngle: 'Obtuse' });
    expect(compute('triangle-angles', { angleA: 100, angleB: 80 }).valid).toBe(false);
  });

  it('the inscribed angle is half the angle at the centre', () => {
    for (const arc of [40, 100, 180, 260]) {
      for (const p of [0, 20, 340]) {
        const n = compute('circle-angles', { arc, p });
        if (n.touching) continue;
        expect(n.measured, `arc ${arc} p ${p}`).toBeCloseTo(arc / 2, 9);
      }
      const onArc = compute('circle-angles', { arc, p: 180 });
      expect(onArc.measured).toBeCloseTo(180 - arc / 2, 9);
    }
  });

  it('polygon angles', () => {
    expect(compute('polygon-angles', { n: 6 })).toMatchObject({ sum: 720, interior: 120, exterior: 60, diagonals: 9 });
    expect(compute('polygon-angles', { n: 3 }).diagonals).toBe(0);
  });

  it('cone, sphere and cylinder', () => {
    const n = compute('solid-volumes', { r: 3, h: 6 });
    expect([n.cone, n.sphere, n.cylinder]).toEqual([18, 36, 54]); // × π: 1 : 2 : 3
  });

  it('mean, median, mode and spread', () => {
    const n = compute('mean-median-mode', { v1: 20, v2: 40, v3: 40, v4: 50, v5: 100 });
    expect(n).toMatchObject({ mean: 50, median: 40, modes: [40] });
    const base = compute('spread-transform', { last: 11 });
    expect(base.sd).toBeCloseTo(Math.sqrt(6), 12);
    expect(base.meanDeviation).toBeCloseTo(2, 12);
    const shifted = compute('spread-transform', { last: 11, add: 7 });
    expect(shifted.sd).toBeCloseTo(base.sd, 12);
    expect(shifted.mean).toBe(15);
    const scaled = compute('spread-transform', { last: 11, multiply: 2.5 });
    expect(scaled.sd).toBeCloseTo(2.5 * base.sd, 12);
    expect(scaled.variance).toBeCloseTo(6.25 * 6, 12);
  });
});

describe('helpers', () => {
  it('snaps values to a slider', () => {
    const control = { min: 1, max: 30, step: 0.5, default: 10 };
    expect(snap(control, 10.3)).toBe(10.5);
    expect(snap(control, 99)).toBe(30);
    expect(snap(control, 'x')).toBe(10);
    expect(snap({ min: 0, max: 1, step: 0.1 }, 0.30000000000000004)).toBe(0.3);
  });

  it('keeps unknown settings out', () => {
    const simulation = getSimulation('ci-vs-si');
    expect(normaliseValues(simulation, { compounding: 'monthly', extra: 1 })).toEqual(initialValues(simulation));
  });

  it('picks round axis ranges, including negative ones', () => {
    expect(niceRange(0, 16105)).toMatchObject({ min: 0, max: 20000, step: 5000 });
    expect(niceRange(-15, 15)).toMatchObject({ min: -20, max: 20, step: 10 });
    expect(niceRange(-10, 10)).toMatchObject({ min: -10, max: 10, step: 5 });
    expect(niceRange(-42.5, 40)).toMatchObject({ min: -60, max: 40, step: 20 });
    expect(niceRange(5, 5).min).toBeLessThan(5);
  });

  it('formats numbers the way the app writes them', () => {
    expect(show(-3)).toBe('−3');
    expect(show(16105.1)).toBe('16,105.1');
    expect(signedPercent(21)).toBe('+21%');
    expect(signedPercent(-4)).toBe('−4%');
    expect(ratioText(30, 10)).toBe('3 : 1');
    expect(ratioText(2.5, 1)).toBe('5 : 2');
  });
});
