/**
 * The picture for the reasoning data-sufficiency simulation (simulations/reasoningSufficiency.js):
 *
 *   arrangements  every row of seats the given information allows, each drawn as a
 *                 little row of initials; rows a switched-on statement rules out are
 *                 struck through (and say which statement did it); the seat asked about
 *                 is highlighted, and the answers still possible are listed below.
 *
 * The question and the statements are real HTML, and the drawing has a text summary
 * for screen readers. Colours come from theme tokens.
 */

import { el, svgEl } from '../utils/dom.js';

const W = 560;
const COLUMNS = 4;
const BOX = 26;
const GAP = 3;
const PITCH_Y = 46;

function arrangementsPlot(plot) {
  const { rows, seats, askSeat } = plot;
  const pitchX = (W - 20) / COLUMNS;
  const width = seats * BOX + (seats - 1) * GAP;
  const lines = Math.ceil(rows.length / COLUMNS);
  const height = lines * PITCH_Y + 8;
  const cells = rows.map((row, i) => {
    const x0 = 10 + (i % COLUMNS) * pitchX + (pitchX - width) / 2;
    const y0 = 8 + Math.floor(i / COLUMNS) * PITCH_Y;
    const boxes = row.seats.map((name, s) =>
      svgEl('g', { class: `arrangements-seat${s === askSeat ? ' is-ask' : ''}` }, [
        svgEl('rect', { x: x0 + s * (BOX + GAP), y: y0, width: BOX, height: BOX, rx: 5 }),
        svgEl('text', { x: x0 + s * (BOX + GAP) + BOX / 2, y: y0 + BOX / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', text: name.charAt(0) })
      ])
    );
    const strike = row.out
      ? [
          svgEl('line', { x1: x0 - 4, y1: y0 + BOX / 2, x2: x0 + width + 4, y2: y0 + BOX / 2, class: 'arrangements-strike' }),
          svgEl('text', { x: x0 + width / 2, y: y0 + BOX + 12, 'text-anchor': 'middle', class: 'arrangements-by', text: `out by ${row.by}` })
        ]
      : [];
    return svgEl('g', { class: `arrangements-row${row.out ? ' is-out' : ' is-in'}` }, [...boxes, ...strike]);
  });
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${height}`, class: 'sim-plot rp-svg arrangements-svg', role: 'img', 'aria-label': plot.summary }, cells);
  const legend = [...new Set(rows.flatMap((r) => r.seats))].map((name) => `${name.charAt(0)} = ${name}`).join(', ');
  return el('div.sim-figure.rp-figure.arrangements', {}, [
    el('div.arrangements__head', {}, [
      el('p.arrangements__question', { text: plot.question }),
      plot.given ? el('p.arrangements__given', { text: `Given: ${plot.given}` }) : null,
      el(
        'ul.arrangements__statements',
        {},
        plot.statements.map((s) =>
          el('li', { class: `arrangements__statement ${s.on ? 'is-on' : 'is-off'}` }, [
            el('span.arrangements__label', { text: s.label }),
            el('span', { text: ` ${s.text}` }),
            el('span.sr-only', { text: s.on ? ' (switched on)' : ' (switched off)' })
          ])
        )
      ),
      el('p.arrangements__legend', { text: `Each little row is one seating, left end first (${legend}); the seat asked about is outlined.` })
    ]),
    svg,
    el('p', { class: `arrangements__answers ${plot.enough ? 'is-enough' : 'is-open'}` }, [
      el('span.arrangements__badge', { text: plot.badge }),
      el('span', { text: ` Possible answers: ${plot.answers.join(', ') || 'none'}. ${plot.enough ? 'Sufficient.' : 'Not sufficient.'}` })
    ])
  ]);
}

export const sufficiencyPlots = { arrangements: arrangementsPlot };
