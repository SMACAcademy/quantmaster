/**
 * The round-robin picture (simulations/reasoningTournament.js), plot kind `points`:
 *
 *   a crosstable (each row team's result against each column team: W, D or L),
 *   with points and places, as a real HTML table; and below it a strip with
 *   one block per match, as wide as the points that match gave out, so the
 *   total (and what the draws took off it) can be seen.
 *
 * Colours come from theme tokens (components.css, .points-*).
 */

import { el, svgEl } from '../utils/dom.js';

const WORDS = { W: 'won', D: 'drawn', L: 'lost' };

function crosstable(plot) {
  return el('table.data-table.points-table', {}, [
    el('caption', { text: 'Each row’s result against each column (W won, D drawn, L lost)' }),
    el('thead', {}, [
      el('tr', {}, [
        el('th', { attrs: { scope: 'col' }, text: 'Team' }),
        ...plot.teams.map((team) => el('th', { attrs: { scope: 'col', title: team.name } }, [el('span', { attrs: { 'aria-hidden': 'true' }, text: team.short }), el('span.sr-only', { text: `against ${team.name}` })])),
        el('th', { attrs: { scope: 'col' }, text: 'Points' }),
        el('th', { attrs: { scope: 'col' }, text: 'Place' })
      ])
    ]),
    el(
      'tbody',
      {},
      plot.teams.map((team, t) =>
        el('tr', {}, [
          el('th', { attrs: { scope: 'row' }, text: team.name }),
          ...plot.grid[t].map((cell) =>
            cell === null
              ? el('td.points-cell.is-self', {}, [el('span', { attrs: { 'aria-hidden': 'true' }, text: '—' }), el('span.sr-only', { text: 'no match' })])
              : el('td', { class: `points-cell is-${cell.toLowerCase()}` }, [el('span', { attrs: { 'aria-hidden': 'true' }, text: cell }), el('span.sr-only', { text: WORDS[cell] })])
          ),
          el('td.points-total', { text: String(team.points) }),
          el('td.points-place', { text: team.place })
        ])
      )
    )
  ]);
}

function strip(plot) {
  const W = 560;
  const H = 96;
  const left = 12;
  const width = W - 2 * left;
  const unit = width / plot.most;
  const children = [svgEl('rect', { x: left, y: 30, width, height: 34, rx: 6, class: 'points-room' })];
  let x = left;
  for (const m of plot.matches) {
    const w = m.given * unit;
    children.push(svgEl('rect', { x: x + 1, y: 31, width: Math.max(0, w - 2), height: 32, rx: 4, class: `points-block${m.drawn ? ' is-drawn' : ''}` }));
    children.push(svgEl('text', { x: x + w / 2, y: 51, 'text-anchor': 'middle', class: 'points-block__label', text: `${m.label} ${m.given}` }));
    x += w;
  }
  children.push(svgEl('text', { x: left, y: 20, class: 'rp-caption rp-caption--left', text: `Points given out by each match: ${plot.total} of at most ${plot.most}` }));
  children.push(svgEl('text', { x: left, y: 86, class: 'rp-caption rp-caption--left', text: plot.count === 1 ? 'Only one set of results gives this table' : `${plot.count} sets of results give this table` }));
  return svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'sim-plot rp-svg points-strip', role: 'img', 'aria-label': plot.summary }, children);
}

function pointsPlot(plot) {
  return el('div.sim-figure.rp-figure.points-fig', {}, [el('div.points-scroll', {}, [crosstable(plot)]), strip(plot)]);
}

export const tournamentPlots = { points: pointsPlot };
