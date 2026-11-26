/**
 * The `tiles` picture for the mathematical-operations simulation
 * (simulations/reasoningOperations.js): the expression as printed, a row of
 * tiles, and below it the expression actually worked, with every sign tile
 * that changed (by the key, or by an interchange) highlighted and joined to
 * the tile it came from. The key is a real list beside it.
 *
 *   { kind: 'tiles', printed: [{ text, sign }], worked: [{ text, sign, changed }],
 *     rhs: number | null, verdict: 'true' | 'false' | null,
 *     key: [{ from, to }], active, rule, summary }
 *
 * Drawn above the `steps` plot in a stack. Colours come from theme tokens.
 */

import { el, svgEl } from '../utils/dom.js';

const W = 560;

function tilesPlot(plot) {
  const tail = plot.rhs === null ? [] : [{ text: '=', sign: false, eq: true }, { text: String(plot.rhs), sign: false }];
  const top = [...plot.printed, ...tail];
  const bottom = [...plot.worked, ...tail];
  const n = top.length;
  const pitch = Math.min(54, (W - 16) / n);
  const size = pitch - 6;
  const left = (W - pitch * n) / 2 + 3;
  const x = (i) => left + i * pitch;
  const rowTop = 30;
  const rowBottom = 128;
  const height = rowBottom + size + 12;

  const tile = (item, i, y, row) => {
    const classes = ['tiles-tile'];
    if (item.sign) classes.push('tiles-tile--sign');
    if (item.eq) classes.push('tiles-tile--eq');
    if (row === 'bottom' && item.changed) classes.push('is-changed');
    return svgEl('g', { class: classes.join(' ') }, [
      svgEl('rect', { x: x(i), y, width: size, height: size, rx: 8, class: 'tiles-tile__box' }),
      svgEl('text', { x: x(i) + size / 2, y: y + size / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'tiles-tile__text', text: item.text })
    ]);
  };

  const children = [
    svgEl('text', { x: left, y: rowTop - 10, class: 'tiles-label', text: 'As printed' }),
    svgEl('text', { x: left, y: rowBottom - 10, class: 'tiles-label', text: plot.active ? 'Worked with' : 'Worked as printed' })
  ];
  // Links from each sign tile to the tile below it: bold where the sign changed.
  top.forEach((item, i) => {
    if (!item.sign) return;
    const changed = bottom[i].changed;
    children.push(
      svgEl('line', {
        x1: x(i) + size / 2,
        y1: rowTop + size + 4,
        x2: x(i) + size / 2,
        y2: rowBottom - 20,
        class: `tiles-link${changed ? ' is-changed' : ''}`
      })
    );
  });
  top.forEach((item, i) => children.push(tile(item, i, rowTop, 'top')));
  bottom.forEach((item, i) => children.push(tile(item, i, rowBottom, 'bottom')));

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${height}`, class: 'sim-plot tiles-svg', role: 'img', 'aria-label': plot.summary }, children);

  const legend = plot.key.length
    ? el('div.tiles-key', {}, [
        el('div.tiles-key__title', { text: plot.active ? 'Key (on)' : 'Key (off)' }),
        el(
          'ul.tiles-key__list',
          {},
          plot.key.map(({ from, to }) =>
            el('li', { class: `tiles-key__item${plot.active ? ' is-on' : ''}` }, [
              el('span.tiles-key__from', { text: from }),
              el('span.tiles-key__arrow', { text: ' means ' }),
              el('span.tiles-key__to', { text: to }),
              el('span.sr-only', { text: plot.active ? ' (applied)' : ' (not applied yet)' })
            ])
          )
        )
      ])
    : el('div.tiles-key', {}, [
        el('div.tiles-key__title', { text: 'Interchange' }),
        el('p.tiles-key__rule', { text: plot.rule }),
        plot.verdict
          ? el('p', { class: `tiles-verdict is-${plot.verdict}`, text: plot.verdict === 'true' ? 'The equation is correct.' : 'The equation is not correct yet.' })
          : null
      ]);

  return el('div.sim-figure.tiles-figure', {}, [svg, legend]);
}

export const operationsPlots = { tiles: tilesPlot };
