/**
 * The input-output conveyor (simulations/reasoningMachine.js):
 *
 *   conveyor  { rows: [{ label, tokens: [{ text, state: 'moved' | 'placed' | 'waiting', from }] }],
 *               rule, done, summary }
 *
 * One belt per step, the newest at the bottom. An element that moved in a step
 * is highlighted, with a line from where it stood in the step before; elements
 * already placed are tinted; the rest wait in their input order. The steps are
 * also given as an ordered list for screen readers.
 */

import { el, svgEl } from '../utils/dom.js';

const W = 600;
const LABEL = 78;
const ROW = 46;
const CHIP_H = 28;

const STATE_WORDS = { moved: 'moved in this step', placed: 'already placed', waiting: 'not yet placed' };

function conveyorPlot(plot) {
  const width = Math.max(1, ...plot.rows.map((r) => r.tokens.length));
  const pitch = Math.min(72, (W - LABEL - 12) / width);
  const chipW = pitch - 8;
  const x = (i) => LABEL + i * pitch;
  const y = (k) => 16 + k * ROW;
  const height = y(plot.rows.length) + 6;
  const children = [];
  plot.rows.forEach((row, k) => {
    const top = y(k);
    children.push(svgEl('rect', { x: LABEL - 6, y: top - 4, width: width * pitch + 4, height: CHIP_H + 8, rx: 8, class: `conveyor-belt${k === plot.rows.length - 1 ? ' is-current' : ''}` }));
    children.push(svgEl('text', { x: 4, y: top + CHIP_H / 2, 'dominant-baseline': 'central', class: 'conveyor-label', text: row.label }));
    row.tokens.forEach((token, i) => {
      if (token.state === 'moved' && token.from !== null && token.from !== i && k > 0) {
        children.push(
          svgEl('path', {
            d: `M ${x(token.from) + chipW / 2} ${y(k - 1) + CHIP_H} C ${x(token.from) + chipW / 2} ${top - 4}, ${x(i) + chipW / 2} ${y(k - 1) + CHIP_H + 4}, ${x(i) + chipW / 2} ${top}`,
            class: 'conveyor-move'
          })
        );
      }
      children.push(svgEl('rect', { x: x(i), y: top, width: chipW, height: CHIP_H, rx: 6, class: `conveyor-chip is-${token.state}` }));
      children.push(
        svgEl('text', {
          x: x(i) + chipW / 2,
          y: top + CHIP_H / 2,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          class: `conveyor-text is-${token.state}`,
          text: token.text
        })
      );
    });
  });
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${height}`, class: 'sim-plot rp-svg conveyor-svg', role: 'img', 'aria-label': plot.summary }, children);
  return el('div.sim-figure.rp-figure.conveyor', {}, [
    el('p.conveyor-rule', { text: plot.rule }),
    // On a phone the words would be too small to read, so the belt keeps a minimum width and scrolls.
    el('div.conveyor-scroll', {}, [svg]),
    el('ul.conveyor-legend', { 'aria-hidden': 'true' }, [
      el('li', {}, [el('span.conveyor-swatch.is-moved'), el('span', { text: 'moved in this step' })]),
      el('li', {}, [el('span.conveyor-swatch.is-placed'), el('span', { text: 'already placed' })]),
      el('li', {}, [el('span.conveyor-swatch.is-waiting'), el('span', { text: 'waiting, in input order' })])
    ]),
    el(
      'ol.sr-only',
      {},
      plot.rows.map((row) =>
        el('li', { text: `${row.label}: ${row.tokens.map((t) => (t.state === 'waiting' ? t.text : `${t.text} (${STATE_WORDS[t.state]})`)).join(', ')}` })
      )
    ),
    plot.done ? el('p.conveyor-done', { text: 'Arrangement complete' }) : null
  ]);
}

export const machinePlots = { conveyor: conveyorPlot };
