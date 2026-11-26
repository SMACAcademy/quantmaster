/** Simulations for work, pipes, trains, boats and proportion. */

import { gcd, hoursText, near, niceRange, show } from './core.js';

const lcm = (a, b) => (a * b) / gcd(a, b);
const minutesText = (minutes) => (Number.isFinite(minutes) ? `${show(minutes, 2)} min` : 'Never');

export const workTogether = {
  id: 'work-together',
  topicId: 'time-and-work',
  alsoTopicIds: ['work-and-wages'],
  title: 'Working together',
  summary: 'Add up what each worker does in a day, not the days: see why the LCM method works.',
  controls: [
    { id: 'daysA', label: 'A alone takes', type: 'range', min: 2, max: 40, step: 1, default: 12, unit: 'days' },
    { id: 'daysB', label: 'B alone takes', type: 'range', min: 2, max: 40, step: 1, default: 18, unit: 'days' },
    { id: 'daysC', label: 'C alone takes (0 = not working)', type: 'range', min: 0, max: 40, step: 1, default: 0, unit: 'days' }
  ],
  compute({ daysA, daysB, daysC }) {
    const workers = [
      { name: 'A', days: daysA, tone: 'arithmetic' },
      { name: 'B', days: daysB, tone: 'combinatorics' },
      ...(daysC ? [{ name: 'C', days: daysC, tone: 'data' }] : [])
    ];
    const job = workers.reduce((size, w) => lcm(size, w.days), 1);
    const perDay = workers.map((w) => job / w.days);
    const together = perDay.reduce((sum, units) => sum + units, 0);
    const time = job / together;
    const xMax = Math.max(...workers.map((w) => w.days));
    return {
      numbers: { job, together, time },
      readouts: [
        { label: 'Size of the job (LCM of the days)', value: `${show(job, 0)} units` },
        { label: 'Units per day', value: workers.map((w, i) => `${w.name} ${show(perDay[i], 0)}`).join(', ') },
        { label: 'Together per day', value: `${show(together, 0)} units` },
        { label: 'Time together', value: `${show(job, 0)} ÷ ${show(together, 0)} = ${show(time, 2)} days` }
      ],
      plot: {
        kind: 'xy',
        x: { label: 'Days', min: 0, max: xMax },
        y: { label: 'Job done (%)', min: 0, max: 100 },
        series: [
          ...workers.map((w) => ({ id: w.name, label: `${w.name} alone`, points: [[0, 0], [w.days, 100]], tone: w.tone, dashed: true })),
          { id: 'together', label: 'Together', points: [[0, 0], [time, 100]], tone: 'geometry' }
        ],
        guides: [{ axis: 'y', value: 100, label: '' }],
        markers: [{ x: time, y: 100, label: `Done in ${show(time, 2)} days`, tone: 'geometry' }],
        summary: `Working together, ${workers.map((w) => `${w.name} (${w.days} days)`).join(', ')} finish in ${show(time, 2)} days.`
      },
      insight: `Together they finish faster than the quickest worker alone. Add the daily work (${perDay.map((u) => show(u, 0)).join(' + ')} = ${show(together, 0)} units a day), never the days.`
    };
  },
  tasks: [
    {
      id: 'six-days',
      prompt: 'A takes 10 days. Choose B so that the two of them finish in exactly 6 days.',
      check: (values, n) => values.daysC === 0 && values.daysA === 10 && near(n.time, 6),
      solution: { daysA: 10, daysB: 15, daysC: 0 }
    },
    {
      id: 'half',
      prompt: 'With just A and B, finish in exactly half the time A takes alone.',
      check: (values, n) => values.daysC === 0 && near(n.time, values.daysA / 2),
      solution: { daysA: 12, daysB: 12, daysC: 0 }
    },
    {
      id: 'three',
      prompt: 'Add a third worker: A 10 days, B 15 days, C 30 days. How long together?',
      check: (values, n) => values.daysA === 10 && values.daysB === 15 && values.daysC === 30 && near(n.time, 5),
      solution: { daysA: 10, daysB: 15, daysC: 30 }
    }
  ]
};

export const tankFilling = {
  id: 'tank-filling',
  topicId: 'pipes-cisterns',
  title: 'Filling a tank',
  summary: 'Open inlets and a drain, and watch the water level at any minute.',
  controls: [
    { id: 'fillA', label: 'Pipe A fills the tank in', type: 'range', min: 5, max: 60, step: 5, default: 20, unit: 'min' },
    { id: 'fillB', label: 'Pipe B fills it in (0 = closed)', type: 'range', min: 0, max: 60, step: 5, default: 30, unit: 'min' },
    { id: 'emptyC', label: 'Drain C empties it in (0 = closed)', type: 'range', min: 0, max: 60, step: 5, default: 0, unit: 'min' },
    { id: 'minute', label: 'Minutes since opening', type: 'range', min: 0, max: 60, step: 1, default: 6, unit: 'min' }
  ],
  compute({ fillA, fillB, emptyC, minute }) {
    const net = 1 / fillA + (fillB ? 1 / fillB : 0) - (emptyC ? 1 / emptyC : 0);
    const fillTime = net > 0 ? 1 / net : Infinity;
    const level = Math.min(1, Math.max(0, net * minute));
    return {
      numbers: { net, fillTime, level },
      readouts: [
        { label: 'Net change per minute', value: `${net >= 0 ? '+' : '−'}${show(Math.abs(net) * 100, 2)}% of the tank` },
        { label: 'Time to fill', value: minutesText(fillTime) },
        { label: `Level after ${minute} min`, value: `${show(level * 100, 1)}%` }
      ],
      plot: {
        kind: 'tank',
        level,
        inlets: [
          { label: `A: fills in ${fillA} min`, open: true },
          { label: fillB ? `B: fills in ${fillB} min` : 'B: closed', open: Boolean(fillB) }
        ],
        outlet: { label: emptyC ? `C: empties in ${emptyC} min` : 'C: closed', open: Boolean(emptyC) },
        caption: `After ${minute} min: ${show(level * 100, 1)}% full`,
        summary: `The tank is ${show(level * 100, 1)}% full after ${minute} minutes${Number.isFinite(fillTime) ? ` and fills in ${show(fillTime, 2)} minutes` : ' and never fills'}.`
      },
      insight:
        net <= 0
          ? 'The drain removes at least as much as the pipes bring in, so the tank never fills.'
          : `Each minute the pipes add ${[fillA, fillB].filter(Boolean).map((m) => `1/${m}`).join(' + ')}${emptyC ? ` and the drain takes away 1/${emptyC}` : ''} of the tank, so it fills in ${show(fillTime, 2)} minutes.`
    };
  },
  tasks: [
    {
      id: 'twelve',
      prompt: 'Pipes A (20 min) and B (30 min) open, drain closed: find the minute the tank becomes full.',
      check: (values, n) => values.fillA === 20 && values.fillB === 30 && values.emptyC === 0 && values.minute === 12 && near(n.level, 1),
      solution: { fillA: 20, fillB: 30, emptyC: 0, minute: 12 }
    },
    {
      id: 'never',
      prompt: 'Open the drain fast enough that the tank never fills.',
      check: (values, n) => values.emptyC > 0 && n.net <= 1e-12,
      solution: { fillA: 30, fillB: 0, emptyC: 20 }
    },
    {
      id: 'half',
      prompt: 'Make the tank exactly half full at the 10-minute mark.',
      check: (values, n) => values.minute === 10 && near(n.level, 0.5),
      solution: { fillA: 20, fillB: 0, emptyC: 0, minute: 10 }
    }
  ]
};

export const trainCrossing = {
  id: 'train-crossing',
  topicId: 'trains',
  title: 'What a crossing really covers',
  summary: 'Draw the train to scale against a pole, a platform or another train, and see the distance it must cover.',
  controls: [
    {
      id: 'crossing',
      label: 'Crossing',
      type: 'choice',
      options: [
        { id: 'pole', label: 'A pole' },
        { id: 'platform', label: 'A platform' },
        { id: 'opposite', label: 'An oncoming train' },
        { id: 'same', label: 'A slower train ahead' }
      ],
      default: 'platform'
    },
    { id: 'trainLength', label: 'Train length', type: 'range', min: 50, max: 500, step: 10, default: 200, unit: 'm' },
    { id: 'speed', label: 'Train speed', type: 'range', min: 18, max: 180, step: 9, default: 72, unit: 'km/h' },
    { id: 'otherLength', label: 'Platform or other train length', type: 'range', min: 50, max: 500, step: 10, default: 300, unit: 'm' },
    { id: 'otherSpeed', label: 'Other train speed', type: 'range', min: 9, max: 144, step: 9, default: 36, unit: 'km/h' }
  ],
  compute({ crossing, trainLength, speed, otherLength, otherSpeed }) {
    const v = (speed * 5) / 18;
    const w = (otherSpeed * 5) / 18;
    const distance = trainLength + (crossing === 'pole' ? 0 : otherLength);
    const relative = crossing === 'opposite' ? v + w : crossing === 'same' ? v - w : v;
    const time = relative > 0 ? distance / relative : Infinity;
    const other =
      crossing === 'pole'
        ? { kind: 'pole', label: 'Pole' }
        : crossing === 'platform'
          ? { kind: 'platform', length: otherLength, label: `Platform ${otherLength} m` }
          : { kind: 'train', length: otherLength, label: `Other train ${otherLength} m, ${otherSpeed} km/h ${crossing === 'opposite' ? 'oncoming' : 'same way'}` };
    const relativeLabel = { pole: 'Speed', platform: 'Speed', opposite: 'Relative speed (add)', same: 'Relative speed (subtract)' }[crossing];
    return {
      numbers: { v, relative, distance, time },
      readouts: [
        { label: 'Train speed in m/s (× 5/18)', value: `${show(v, 2)} m/s` },
        { label: relativeLabel, value: `${show(relative, 2)} m/s` },
        { label: 'Distance to cover', value: crossing === 'pole' ? `${trainLength} m (the train itself)` : `${trainLength} + ${otherLength} = ${distance} m` },
        { label: 'Time to cross', value: Number.isFinite(time) ? `${show(time, 2)} s` : 'Never: not faster' }
      ],
      plot: {
        kind: 'track',
        train: { length: trainLength, label: `Train ${trainLength} m, ${speed} km/h` },
        other,
        distance,
        summary: `Covering ${distance} m at ${show(relative, 2)} m/s takes ${Number.isFinite(time) ? `${show(time, 2)} seconds` : 'forever'}.`
      },
      insight:
        crossing === 'pole'
          ? 'Passing a pole, only the train\'s own length has to go past.'
          : crossing === 'platform'
            ? 'The front must reach the far end and then the whole train must clear it: train length plus platform length.'
            : crossing === 'opposite'
              ? 'Coming towards each other, both lengths must pass at the sum of the speeds.'
              : 'Overtaking, both lengths must pass at only the difference of the speeds, which is why it takes so long.'
    };
  },
  tasks: [
    {
      id: 'pole',
      prompt: 'Make a 200 m train pass a pole in exactly 10 seconds.',
      check: (values, n) => values.crossing === 'pole' && values.trainLength === 200 && near(n.time, 10),
      solution: { crossing: 'pole', trainLength: 200, speed: 72 }
    },
    {
      id: 'twice',
      prompt: 'Pick a platform that takes exactly twice as long to cross as a pole would.',
      check: (values) => values.crossing === 'platform' && values.otherLength === values.trainLength,
      solution: { crossing: 'platform', trainLength: 200, otherLength: 200 }
    },
    {
      id: 'overtake',
      prompt: 'Overtake a train going the same way in exactly 50 seconds.',
      check: (values, n) => values.crossing === 'same' && near(n.time, 50),
      solution: { crossing: 'same', trainLength: 200, otherLength: 300, speed: 72, otherSpeed: 36 }
    }
  ]
};

export const boatsStreams = {
  id: 'boats-streams',
  topicId: 'boats-streams',
  title: 'Rowing with and against the stream',
  summary: 'A current helps one way and hurts the other. See why the round trip always takes longer.',
  controls: [
    { id: 'boat', label: 'Boat speed in still water', type: 'range', min: 4, max: 30, step: 1, default: 10, unit: 'km/h' },
    { id: 'stream', label: 'Stream speed', type: 'range', min: 0, max: 10, step: 1, default: 2, unit: 'km/h' },
    { id: 'distance', label: 'Distance each way', type: 'range', min: 6, max: 60, step: 2, default: 24, unit: 'km' }
  ],
  compute({ boat: b, stream: s, distance: d }) {
    const down = b + s;
    const up = b - s;
    const canReturn = up > 0;
    const timeDown = d / down;
    const timeUp = canReturn ? d / up : Infinity;
    const total = timeDown + timeUp;
    const average = canReturn ? (2 * d) / total : 0;
    const still = (2 * d) / b;
    const sMax = Math.min(10, b - 0.5);
    const points = Array.from({ length: 61 }, (_, i) => {
      const x = (sMax * i) / 60;
      return [x, d / (b + x) + d / (b - x)];
    });
    const yMax = Math.min(points[points.length - 1][1], still * 4);
    return {
      numbers: { down, up, timeDown, timeUp, total, average, still },
      readouts: [
        { label: 'Downstream b + s', value: `${show(down)} km/h, ${hoursText(timeDown)}` },
        { label: 'Upstream b − s', value: canReturn ? `${show(up)} km/h, ${hoursText(timeUp)}` : 'Cannot go upstream' },
        { label: 'Round trip', value: canReturn ? hoursText(total) : '—' },
        { label: 'Average speed 2DU ÷ (D + U)', value: canReturn ? `${show(average, 2)} km/h` : '—' }
      ],
      plot: {
        kind: 'xy',
        x: { label: 'Stream speed (km/h)', min: 0, max: Math.max(1, sMax) },
        y: { label: 'Round-trip time (hours)', min: 0, max: Math.max(yMax, still * 1.2) },
        series: [{ id: 'total', label: 'Round trip', points, tone: 'arithmetic' }],
        guides: [{ axis: 'y', value: still, label: 'Still water' }],
        markers: canReturn && s <= sMax ? [{ x: s, y: total, label: 'Now', tone: 'combinatorics' }] : [],
        summary: canReturn
          ? `At ${b} km/h in a ${s} km/h stream, ${d} km each way takes ${hoursText(total)} in all.`
          : `A ${b} km/h boat cannot make headway against a ${s} km/h stream.`
      },
      insight: !canReturn
        ? 'The stream is at least as fast as the boat, so the boat is carried backwards upstream.'
        : s === 0
          ? 'In still water both legs take the same time.'
          : `The stream saves ${hoursText(d / b - timeDown)} downstream but costs ${hoursText(timeUp - d / b)} upstream, so the round trip is longer than in still water and the average is below ${b} km/h.`
    };
  },
  tasks: [
    {
      id: 'twice',
      prompt: 'Make the upstream leg take exactly twice as long as the downstream leg.',
      check: (values, n) => Number.isFinite(n.timeUp) && near(n.timeUp, 2 * n.timeDown),
      solution: { boat: 9, stream: 3 }
    },
    {
      id: 'fastest',
      prompt: 'Make the round trip as short as it can be.',
      check: (values) => values.stream === 0,
      solution: { stream: 0 }
    },
    {
      id: 'stuck',
      prompt: 'Make the stream so strong that the boat cannot get back.',
      check: (values, n) => n.up <= 0,
      solution: { boat: 4, stream: 6 }
    }
  ]
};

export const proportionCurves = {
  id: 'proportion-curves',
  topicId: 'direct-inverse-proportion',
  alsoTopicIds: ['ratio-proportion'],
  title: 'Direct or inverse?',
  summary: 'Double x and see what happens to y: a straight line through zero, or a curve that never touches the axes.',
  controls: [
    {
      id: 'kind',
      label: 'Relationship',
      type: 'choice',
      options: [
        { id: 'direct', label: 'Direct: y = kx' },
        { id: 'inverse', label: 'Inverse: y = k/x' }
      ],
      default: 'direct'
    },
    { id: 'k', label: 'Constant k', type: 'range', min: 1, max: 24, step: 1, default: 6 },
    { id: 'x', label: 'x', type: 'range', min: 1, max: 12, step: 1, default: 3 }
  ],
  compute({ kind, k, x }) {
    const direct = kind === 'direct';
    const f = (t) => (direct ? k * t : k / t);
    const y = f(x);
    const doubled = f(2 * x);
    const points = direct
      ? [[0, 0], [12, k * 12]]
      : Array.from({ length: 116 }, (_, i) => {
          const t = 0.5 + (11.5 * i) / 115;
          return [t, k / t];
        });
    const yMax = direct ? k * 12 : k / 0.5;
    const markers = [{ x, y, label: `(${x}, ${show(y, 2)})`, tone: 'combinatorics' }];
    if (2 * x <= 12) markers.push({ x: 2 * x, y: doubled, label: `(${2 * x}, ${show(doubled, 2)})`, tone: 'geometry' });
    return {
      numbers: { y, doubled, constant: direct ? y / x : x * y },
      readouts: [
        { label: 'y', value: show(y, 3) },
        { label: 'When x doubles, y becomes', value: `${show(doubled, 3)} (${direct ? 'doubles' : 'halves'})` },
        { label: direct ? 'What stays fixed: y ÷ x' : 'What stays fixed: x × y', value: show(k) }
      ],
      plot: {
        kind: 'xy',
        x: { label: 'x', min: 0, max: 12 },
        y: { label: 'y', min: 0, max: niceRange(0, yMax).max },
        series: [{ id: 'curve', label: direct ? `y = ${k}x` : `y = ${k}/x`, points, tone: direct ? 'arithmetic' : 'algebra' }],
        markers,
        summary: `${direct ? 'Direct' : 'Inverse'} proportion with k = ${k}: at x = ${x}, y = ${show(y, 3)}.`
      },
      insight: direct
        ? 'Direct proportion: a straight line through the origin. y ÷ x is the same everywhere on it.'
        : 'Inverse proportion: as x grows, y shrinks, and x × y is the same everywhere on the curve (men × days, speed × time).'
    };
  },
  tasks: [
    {
      id: 'inverse-six',
      prompt: 'In inverse proportion, make y = 6 when x = 4.',
      check: (values, n) => values.kind === 'inverse' && values.x === 4 && near(n.y, 6),
      solution: { kind: 'inverse', k: 24, x: 4 }
    },
    {
      id: 'direct-twenty',
      prompt: 'In direct proportion, make y = 20 when x = 5.',
      check: (values, n) => values.kind === 'direct' && values.x === 5 && near(n.y, 20),
      solution: { kind: 'direct', k: 4, x: 5 }
    },
    {
      id: 'halve',
      prompt: 'Find the relationship where doubling x halves y.',
      check: (values) => values.kind === 'inverse',
      solution: { kind: 'inverse' }
    }
  ]
};
