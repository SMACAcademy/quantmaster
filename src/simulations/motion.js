/** Simulations for speed, distance and time, and for clocks. */

import { hoursText, near, niceRange, show } from './core.js';

export const tsdMeeting = {
  id: 'tsd-meeting',
  topicId: 'time-speed-distance',
  alsoTopicIds: ['races'],
  title: 'When do two travellers meet?',
  summary: 'A distance–time graph of two travellers: where the lines cross, they meet.',
  controls: [
    {
      id: 'direction',
      label: 'Moving',
      type: 'choice',
      options: [
        { id: 'towards', label: 'Towards each other' },
        { id: 'chase', label: 'Same way (A chases B)' }
      ],
      default: 'towards'
    },
    { id: 'distance', label: 'Distance apart at the start', type: 'range', min: 20, max: 400, step: 10, default: 120, unit: 'km' },
    { id: 'speedA', label: 'Speed of A', type: 'range', min: 10, max: 120, step: 5, default: 40, unit: 'km/h' },
    { id: 'speedB', label: 'Speed of B', type: 'range', min: 10, max: 120, step: 5, default: 20, unit: 'km/h' }
  ],
  compute({ direction, distance: d, speedA: a, speedB: b }) {
    const towards = direction === 'towards';
    const relative = towards ? a + b : a - b;
    const meets = relative > 0;
    const time = meets ? d / relative : Infinity;
    const point = meets ? a * time : null; // km from A's start

    const tMax = meets ? Math.max(time * 1.3, 0.5) : (2 * d) / Math.max(a, b);
    const positionA = (t) => a * t;
    const positionB = (t) => (towards ? d - b * t : d + b * t);
    const yValues = [0, d, positionA(tMax), positionB(tMax)];
    const y = niceRange(Math.min(0, ...yValues), Math.max(...yValues));

    return {
      numbers: { relative, time, point, meets },
      readouts: [
        { label: towards ? 'Closing speed (add the speeds)' : 'Catching-up speed (subtract)', value: `${show(relative)} km/h` },
        { label: 'They meet after', value: meets ? hoursText(time) : 'Never: A is not faster' },
        { label: 'Meeting point', value: meets ? `${show(point, 1)} km from A's start` : '—' }
      ],
      plot: {
        kind: 'xy',
        x: { label: 'Time (hours)', min: 0, max: tMax },
        y: { label: "Distance from A's start (km)", min: y.min, max: y.max },
        series: [
          { id: 'a', label: 'A', points: [[0, 0], [tMax, positionA(tMax)]], tone: 'algebra' },
          { id: 'b', label: 'B', points: [[0, positionB(0)], [tMax, positionB(tMax)]], tone: 'combinatorics' }
        ],
        markers: meets ? [{ x: time, y: point, label: 'Meet', tone: 'geometry' }] : [],
        summary: meets
          ? `A at ${show(a)} km/h and B at ${show(b)} km/h, ${show(d)} km apart, meet after ${hoursText(time)}, ${show(point, 1)} km from A's start.`
          : `A at ${show(a)} km/h never catches B at ${show(b)} km/h.`
      },
      insight: towards
        ? 'Moving towards each other, the gap closes at the sum of the speeds: time = distance ÷ (a + b).'
        : meets
          ? 'Chasing, the gap closes only at the difference of the speeds: time = head start ÷ (a − b).'
          : 'In a chase the faster one must be behind. With A no faster than B, the lines never cross.'
    };
  },
  tasks: [
    {
      id: 'halfway',
      prompt: 'Moving towards each other, make them meet exactly halfway.',
      check: (values, n) => values.direction === 'towards' && n.meets && near(n.point, values.distance / 2),
      solution: { direction: 'towards', speedA: 30, speedB: 30 }
    },
    {
      id: 'three-hours',
      prompt: 'Moving towards each other from 120 km apart, make them meet after exactly 3 hours.',
      check: (values, n) => values.direction === 'towards' && values.distance === 120 && near(n.time, 3),
      solution: { direction: 'towards', distance: 120, speedA: 25, speedB: 15 }
    },
    {
      id: 'catch-up',
      prompt: 'In the chase, make A catch B within 2 hours.',
      check: (values, n) => values.direction === 'chase' && n.meets && n.time <= 2 + 1e-9,
      solution: { direction: 'chase', distance: 100, speedA: 80, speedB: 20 }
    }
  ]
};

/** Angle between the hands: |30h − 5.5m|, taking the smaller side of the dial. */
export function clockAngle(hour, minute) {
  const raw = Math.abs(30 * (hour % 12) - 5.5 * minute) % 360;
  return Math.min(raw, 360 - raw);
}

export const clockHands = {
  id: 'clock-angle',
  topicId: 'clocks',
  title: 'The angle between the hands',
  summary: 'Set any time and see why the hour hand is never exactly on the hour.',
  controls: [
    { id: 'hour', label: 'Hour', type: 'range', min: 1, max: 12, step: 1, default: 10 },
    { id: 'minute', label: 'Minutes', type: 'range', min: 0, max: 59, step: 1, default: 10 }
  ],
  compute({ hour, minute }) {
    const minuteHand = 6 * minute;
    const hourHand = (30 * (hour % 12) + 0.5 * minute) % 360;
    const angle = clockAngle(hour, minute);
    const time = `${hour}:${String(minute).padStart(2, '0')}`;
    return {
      numbers: { minuteHand, hourHand, angle },
      readouts: [
        { label: 'Minute hand (6° a minute)', value: `${show(minuteHand, 1)}°` },
        { label: 'Hour hand (30° an hour + 0.5° a minute)', value: `${show(hourHand, 1)}°` },
        { label: 'Angle between: |30h − 5.5m|', value: `${show(angle, 1)}°` }
      ],
      plot: {
        kind: 'clock',
        hourAngle: hourHand,
        minuteAngle: minuteHand,
        summary: `At ${time} the hands are ${show(angle, 1)}° apart.`
      },
      insight:
        minute === 0
          ? `On the hour the hour hand points exactly at ${hour}, so the angle is 30 × ${hour % 12 || 12} = ${show(clockAngle(hour, 0))}° the short way.`
          : `In ${minute} minutes the hour hand has crept ${show(0.5 * minute, 1)}° past the ${hour}. That creep is why answers like 16 4/11 minutes appear.`
    };
  },
  tasks: [
    {
      id: 'right-angle',
      prompt: 'Find a time when the hands are at right angles.',
      check: (values, n) => near(n.angle, 90),
      solution: { hour: 3, minute: 0 }
    },
    {
      id: 'straight',
      prompt: 'Find a time when the hands point in opposite directions.',
      check: (values, n) => near(n.angle, 180),
      solution: { hour: 6, minute: 0 }
    },
    {
      id: 'nearly-together',
      prompt: 'Just after 2 o\'clock, get the hands within 1° of each other.',
      check: (values, n) => values.hour === 2 && n.angle <= 1 + 1e-9,
      solution: { hour: 2, minute: 11 }
    }
  ]
};
