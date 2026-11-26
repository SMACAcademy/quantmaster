/** Simulations for probability. */

import { seededRandom, show } from './core.js';

const EXPERIMENTS = {
  coin: { label: 'Heads on a coin', p: 1 / 2, theory: '1/2', trial: (rand) => rand() < 0.5 },
  six: { label: 'A six on a die', p: 1 / 6, theory: '1/6', trial: (rand) => Math.floor(rand() * 6) === 5 },
  seven: {
    label: 'Two dice totalling 7',
    p: 6 / 36,
    theory: '6/36 = 1/6',
    trial: (rand) => Math.floor(rand() * 6) + Math.floor(rand() * 6) + 2 === 7
  }
};

/** At most this many points are drawn, however many trials are run. */
const PLOT_POINTS = 200;

export const probabilityTrials = {
  id: 'probability-trials',
  topicId: 'probability',
  title: 'Probability in the long run',
  summary: 'Run an experiment many times and watch the share of successes settle at the theory.',
  controls: [
    {
      id: 'experiment',
      label: 'Experiment',
      type: 'choice',
      options: Object.entries(EXPERIMENTS).map(([id, { label }]) => ({ id, label })),
      default: 'coin'
    },
    { id: 'trials', label: 'Number of trials', type: 'range', min: 10, max: 5000, step: 10, default: 100 },
    { id: 'seed', label: 'Run again', type: 'reroll', default: 1 }
  ],
  compute({ experiment, trials, seed }) {
    const { p, theory, trial, label } = EXPERIMENTS[experiment];
    // Same seed and experiment, same run: the picture only changes when asked to.
    const rand = seededRandom(seed * 7919 + experiment.length * 104729);
    const every = Math.max(1, Math.floor(trials / PLOT_POINTS));
    const points = [];
    let hits = 0;
    for (let i = 1; i <= trials; i++) {
      if (trial(rand)) hits += 1;
      if (i % every === 0 || i === trials) points.push([i, (hits / i) * 100]);
    }
    const observed = (hits / trials) * 100;
    const expected = p * 100;
    const gap = observed - expected;
    return {
      numbers: { hits, observed, expected, gap },
      readouts: [
        { label: 'Successes', value: `${show(hits, 0)} of ${show(trials, 0)}` },
        { label: 'Observed share', value: `${show(observed, 1)}%` },
        { label: `Theory (${theory})`, value: `${show(expected, 1)}%` },
        { label: 'Off by', value: `${show(Math.abs(gap), 1)} percentage point${show(Math.abs(gap), 1) === '1' ? '' : 's'}` }
      ],
      plot: {
        kind: 'xy',
        x: { label: 'Trials so far', min: 0, max: trials },
        y: { label: 'Share of successes (%)', min: 0, max: 100 },
        series: [{ id: 'observed', label: 'Observed share', points, tone: 'combinatorics' }],
        guides: [{ axis: 'y', value: expected, label: `Theory ${show(expected, 1)}%` }],
        summary: `${label}: ${show(hits, 0)} successes in ${show(trials, 0)} trials, ${show(observed, 1)}% against a theory of ${show(expected, 1)}%.`
      },
      insight:
        trials < 200
          ? 'With few trials the share jumps around a lot. Run more and watch it settle.'
          : `After ${show(trials, 0)} trials the share is ${show(Math.abs(gap), 1)} points from the theory. Probability describes the long run, not the next few throws.`
    };
  },
  tasks: [
    {
      id: 'settle',
      prompt: 'Run 2,000 trials or more and land within 1 percentage point of the theory.',
      check: (values, n) => values.trials >= 2000 && Math.abs(n.gap) <= 1,
      solution: { experiment: 'coin', trials: 3000, seed: 1 }
    },
    {
      id: 'mislead',
      prompt: 'See a small sample mislead: with 50 trials or fewer, land at least 10 points away from the theory.',
      check: (values, n) => values.trials <= 50 && Math.abs(n.gap) >= 10,
      solution: { experiment: 'coin', trials: 20, seed: 1 }
    }
  ]
};
