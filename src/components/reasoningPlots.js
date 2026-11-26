/**
 * Pictures for the logical-reasoning simulations, drawn as SVG (and tables for
 * the grid), dispatched from simPlots.js:
 *
 *   seats   people in a row or round a table; certain people sit in their seat,
 *           the rest wait below, with the clue list beside
 *   grid    a person × value table of ticks and crosses
 *   euler   three circles placed as the chosen relations say
 *   chain   five letters with the signs between them and the path highlighted
 *   tree    a family tree: squares for men, circles for women, diamonds unknown
 *
 * Every picture has a text summary for screen readers, and the lists (clues,
 * statements, conclusions) are real HTML lists. Things that have just changed
 * carry an `is-fresh` (or `is-conflict`) class, which components.css animates;
 * the animations switch off with the reduced-motion settings.
 */

import { el, svgEl } from '../utils/dom.js';

const W = 560;
const tone = (name) => `var(--cat-${name || 'reasoning'})`;

function svgRoot(summary, height, children) {
  return svgEl('svg', { viewBox: `0 0 ${W} ${height}`, class: 'sim-plot rp-svg', role: 'img', 'aria-label': summary }, children);
}

const STATE_WORDS = { applied: 'applied', new: 'just applied', pending: 'not yet applied', conflict: 'contradicts the others' };

/** An ordered list of clues or statements with their state. */
function clueList(items, title) {
  return el('div.rp-list', {}, [
    el('div.rp-list__title', { text: title }),
    el(
      'ol.rp-clues',
      {},
      items.map((item) =>
        el('li', { class: `rp-clue is-${item.state}${item.extra ? ' is-extra' : ''}` }, [
          el('span.rp-clue__text', { text: item.text }),
          el('span.sr-only', { text: ` (${STATE_WORDS[item.state]})` })
        ])
      )
    )
  ]);
}

/* ------------------------------ seats ------------------------------ */

function token(x, y, person, extraClass = '') {
  const width = Math.max(56, person.name.length * 8 + 18);
  return svgEl('g', { class: `rp-token${person.fresh ? ' is-fresh' : ''}${extraClass}`, transform: `translate(${x} ${y})` }, [
    svgEl('g', { class: 'rp-token__body' }, [
      svgEl('rect', { x: -width / 2, y: -15, width, height: 30, rx: 15, class: 'rp-token__shape' }),
      svgEl('text', { x: 0, y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'rp-token__name', text: person.name })
    ])
  ]);
}

function seatsPlot(plot) {
  const { layout, seatCount, people } = plot;
  const waiting = people.filter((p) => p.seat === null);
  const children = [];
  let height;
  if (layout === 'row') {
    const pitch = 84;
    const left = (W - pitch * (seatCount - 1)) / 2;
    const y = 96;
    children.push(svgEl('text', { x: W / 2, y: 28, 'text-anchor': 'middle', class: 'rp-caption', text: 'Everyone faces north ↑   (left end ← → right end)' }));
    for (let s = 0; s < seatCount; s++) {
      children.push(svgEl('rect', { x: left + s * pitch - 36, y: y - 22, width: 72, height: 44, rx: 10, class: 'rp-seat' }));
      children.push(svgEl('text', { x: left + s * pitch, y: y + 38, 'text-anchor': 'middle', class: 'rp-seat-number', text: `seat ${s + 1}` }));
    }
    for (const p of people) if (p.seat !== null) children.push(token(left + p.seat * pitch, y, p));
    height = 170;
  } else {
    const cx = W / 2;
    const cy = 150;
    const R = 112;
    children.push(svgEl('circle', { cx, cy, r: 58, class: 'rp-table' }));
    children.push(svgEl('text', { x: cx, y: cy - 6, 'text-anchor': 'middle', class: 'rp-caption', text: 'facing centre' }));
    children.push(svgEl('text', { x: cx, y: cy + 12, 'text-anchor': 'middle', class: 'rp-caption', text: 'left = clockwise ↻' }));
    const at = (s, radius = R) => {
      const t = -Math.PI / 2 + (2 * Math.PI * s) / seatCount;
      return [cx + radius * Math.cos(t), cy + radius * Math.sin(t)];
    };
    for (let s = 0; s < seatCount; s++) {
      const [x, y] = at(s);
      const [ax, ay] = at(s, 72);
      children.push(svgEl('circle', { cx: x, cy: y, r: 30, class: 'rp-seat' }));
      children.push(svgEl('line', { x1: at(s, 84)[0], y1: at(s, 84)[1], x2: ax, y2: ay, class: 'rp-facing' }));
    }
    for (const p of people) if (p.seat !== null) children.push(token(...at(p.seat), p));
    height = 290;
  }
  if (waiting.length) {
    const y = height + 26;
    children.push(svgEl('text', { x: 16, y: height + 2, class: 'rp-caption rp-caption--left', text: 'Seat not certain yet (seats still possible):' }));
    const pitch = Math.min(90, (W - 40) / waiting.length);
    waiting.forEach((p, i) => {
      children.push(token(20 + pitch / 2 + i * pitch, y, { ...p, name: `${p.name} ${p.options}` }, ' is-waiting'));
    });
    height += 56;
  }
  return el('div.sim-figure.rp-figure', {}, [svgRoot(plot.summary, height, children), clueList(plot.clues, 'Clues')]);
}

/* ------------------------------ grid ------------------------------ */

function gridPlot(plot) {
  const MARK = { yes: '✓', no: '✗' };
  const WORD = { yes: 'yes', no: 'no' };
  const table = el('table.data-table.rp-grid', {}, [
    el('caption.sr-only', { text: plot.summary }),
    el('thead', {}, [
      el('tr', {}, [el('th', { attrs: { scope: 'col' } }), ...plot.blocks.map((b) => el('th.rp-grid__block', { attrs: { scope: 'colgroup', colspan: b.columns.length }, text: b.title }))]),
      el('tr', {}, [el('th', { attrs: { scope: 'col' }, text: '' }), ...plot.blocks.flatMap((b, bi) => b.columns.map((c, ci) => el('th', { class: `rp-grid__col${ci === 0 && bi > 0 ? ' is-first' : ''}`, attrs: { scope: 'col' }, text: c })))])
    ]),
    el(
      'tbody',
      {},
      plot.rows.map((name, r) =>
        el('tr', {}, [
          el('th', { attrs: { scope: 'row' }, text: name }),
          ...plot.blocks.flatMap((b, bi) =>
            b.columns.map((col, ci) => {
              const cell = plot.cells[bi][r][ci];
              return el(
                'td',
                {
                  class: `rp-cell${cell.mark ? ` is-${cell.mark}` : ''}${cell.mark && cell.source === 'forced' ? ' is-forced' : ''}${cell.fresh ? ' is-fresh' : ''}${ci === 0 && bi > 0 ? ' is-first' : ''}`,
                  attrs: { 'aria-label': `${name}, ${col}: ${cell.mark ? WORD[cell.mark] : 'open'}` }
                },
                [cell.mark ? el('span.rp-cell__mark', { attrs: { 'aria-hidden': 'true' }, text: MARK[cell.mark] }) : null]
              );
            })
          )
        ])
      )
    )
  ]);
  const key = el('p.rp-key', {}, [
    el('span.rp-key__item', {}, [el('span.rp-cell__mark.is-yes', { text: '✓' }), ' / ', el('span.rp-cell__mark.is-no', { text: '✗' }), ' stated by a clue']),
    el('span.rp-key__item', {}, [el('span.rp-key__forced', { text: '✓ ✗' }), ' forced by elimination'])
  ]);
  return el('div.sim-figure.rp-figure', {}, [el('div.data-table-wrap', {}, [table]), key, clueList(plot.clues, 'Clues')]);
}

/* ------------------------------ euler ------------------------------ */

function eulerPlot(plot) {
  const height = 260;
  const children = [];
  if (plot.circles.length) {
    const xs = plot.circles.flatMap((c) => [c.x - c.r, c.x + c.r]);
    const ys = plot.circles.flatMap((c) => [c.y - c.r, c.y + c.r]);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const scale = Math.min((W - 60) / (maxX - minX), (height - 50) / (maxY - minY));
    const sx = (x) => W / 2 + (x - (minX + maxX) / 2) * scale;
    const sy = (y) => height / 2 + 10 - (y - (minY + maxY) / 2) * scale;
    for (const c of plot.circles) {
      children.push(svgEl('circle', { cx: sx(c.x), cy: sy(c.y), r: c.r * scale, class: 'rp-set', style: { fill: tone(c.tone), stroke: tone(c.tone) } }));
    }
    // Labels above each circle; circles drawn on top of each other share one label row.
    const placed = [];
    for (const c of plot.circles) {
      let x = sx(c.x);
      const y = sy(c.y) - c.r * scale - 6;
      while (placed.some((p) => Math.abs(p.x - x) < 70 && Math.abs(p.y - y) < 14)) x += 72;
      placed.push({ x, y });
      children.push(svgEl('text', { x, y: Math.max(14, y), 'text-anchor': 'middle', class: 'rp-set-label', style: { fill: tone(c.tone) }, text: `${c.label}: ${c.name}` }));
    }
  } else {
    children.push(svgEl('text', { x: W / 2, y: height / 2, 'text-anchor': 'middle', class: 'rp-caption', text: plot.message }));
  }
  const statements = el(
    'ul.rp-statements',
    {},
    plot.statements.map((s, i) =>
      el('li', { class: `rp-statement${s.ok === false ? ' is-conflict' : s.ok ? ' is-ok' : ''}` }, [
        el('span', { text: `Statement ${i + 1}: ${s.text}` }),
        el('span.rp-badge', { text: s.ok === null ? 'cannot draw' : s.ok ? 'kept' : 'broken' })
      ])
    )
  );
  const conclusions = el(
    'ul.rp-statements',
    {},
    plot.conclusions.map((c) =>
      el('li', { class: `rp-statement${c.follows ? ' is-follows' : ' is-fails'}` }, [
        el('span', { text: `${c.label}. ${c.text}` }),
        el('span.rp-badge', { text: `${c.here === null ? '' : c.here ? 'true here · ' : 'false here · '}${c.follows ? (c.possible ? 'possible' : 'follows') : 'does not follow'}` })
      ])
    )
  );
  return el('div.sim-figure.rp-figure', {}, [
    svgRoot(plot.summary, height, children),
    el('p.rp-message', { text: plot.message }),
    el('div.rp-list__title', { text: 'Statements' }),
    statements,
    el('div.rp-list__title', { text: 'Conclusions' }),
    conclusions
  ]);
}

/* ------------------------------ chain ------------------------------ */

function chainPlot(plot) {
  const height = 160;
  const pitch = 116;
  const left = (W - pitch * (plot.letters.length - 1)) / 2;
  const x = (i) => left + i * pitch;
  const y = 70;
  const i = plot.letters.indexOf(plot.from);
  const j = plot.letters.indexOf(plot.to);
  const children = [];
  if (i !== j) {
    children.push(svgEl('rect', { x: x(Math.min(i, j)) - 30, y: y - 30, width: Math.abs(j - i) * pitch + 60, height: 60, rx: 30, class: `rp-path${plot.banner.ok ? ' is-ok' : ' is-broken'}` }));
  }
  plot.signs.forEach((sign, g) => {
    const state = plot.signStates[g];
    children.push(
      svgEl('text', { x: (x(g) + x(g + 1)) / 2, y: y + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: `rp-sign is-${state}`, text: sign })
    );
  });
  plot.letters.forEach((letter, k) => {
    const role = letter === plot.from ? ' is-from' : letter === plot.to ? ' is-to' : '';
    children.push(svgEl('circle', { cx: x(k), cy: y, r: 22, class: `rp-letter${role}` }));
    children.push(svgEl('text', { x: x(k), y: y + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'rp-letter__text', text: letter }));
  });
  children.push(svgEl('text', { x: W / 2, y: 136, 'text-anchor': 'middle', class: `rp-banner${plot.banner.ok ? ' is-ok' : ''}`, text: plot.banner.text }));
  return el('div.sim-figure.rp-figure', {}, [svgRoot(plot.summary, height, children)]);
}

/* ------------------------------ tree ------------------------------ */

function treePlot(plot) {
  const visible = plot.nodes.filter((n) => n.visible);
  const rows = Math.max(...plot.nodes.map((n) => n.y)) + 1;
  const height = 40 + rows * 86;
  const px = (n) => 60 + n.x * 88;
  const py = (n) => 44 + n.y * 86;
  const byId = new Map(plot.nodes.map((n) => [n.id, n]));
  const children = [];
  for (const edge of plot.edges) {
    if (edge.type === 'marriage') {
      const a = byId.get(edge.a);
      const b = byId.get(edge.b);
      for (const dy of [-3, 3]) children.push(svgEl('line', { x1: px(a), y1: py(a) + dy, x2: px(b), y2: py(b) + dy, class: 'rp-edge rp-edge--marriage' }));
    } else if (edge.type === 'child') {
      const parents = edge.parents.map((p) => byId.get(p));
      const child = byId.get(edge.child);
      const fromX = parents.reduce((s, p) => s + px(p), 0) / parents.length;
      const fromY = py(parents[0]) + (parents.length > 1 ? 0 : 20);
      const midY = (py(parents[0]) + py(child)) / 2 + 6;
      children.push(svgEl('path', { d: `M ${fromX} ${fromY} V ${midY} H ${px(child)} V ${py(child) - 21}`, class: 'rp-edge' }));
    } else if (edge.type === 'sibling') {
      const a = byId.get(edge.a);
      const b = byId.get(edge.b);
      const top = Math.min(py(a), py(b)) - 34;
      children.push(svgEl('path', { d: `M ${px(a)} ${py(a) - 21} V ${top} H ${px(b)} V ${py(b) - 21}`, class: 'rp-edge rp-edge--sibling' }));
    }
  }
  for (const n of visible) {
    const x = px(n);
    const y = py(n);
    const shape =
      n.gender === 'M'
        ? svgEl('rect', { x: -19, y: -19, width: 38, height: 38, rx: 4, class: 'rp-person' })
        : n.gender === 'F'
          ? svgEl('circle', { cx: 0, cy: 0, r: 20, class: 'rp-person' })
          : svgEl('rect', { x: -15, y: -15, width: 30, height: 30, transform: 'rotate(45)', class: 'rp-person is-unknown' });
    children.push(
      svgEl('g', { transform: `translate(${x} ${y})` }, [
        svgEl('g', { class: `rp-node${n.fresh ? ' is-fresh' : ''}${n.revealed ? ' is-revealed' : ''}${n.role ? ` is-${n.role}` : ''}` }, [
          shape,
          svgEl('text', { x: 0, y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'rp-person__name', text: n.id })
        ])
      ])
    );
  }
  if (!visible.length) children.push(svgEl('text', { x: W / 2, y: height / 2, 'text-anchor': 'middle', class: 'rp-caption', text: 'Read the first statement to start the tree.' }));
  const key = el('p.rp-key', {}, [
    el('span.rp-key__item', { text: '■ man' }),
    el('span.rp-key__item', { text: '● woman' }),
    el('span.rp-key__item', { text: '◆ gender not known' }),
    el('span.rp-key__item', { text: '═ married' })
  ]);
  return el('div.sim-figure.rp-figure', {}, [svgRoot(plot.summary, height, children), key, clueList(plot.statements, 'Statements')]);
}

export function drawReasoningPlot(plot) {
  if (plot.kind === 'seats') return seatsPlot(plot);
  if (plot.kind === 'grid') return gridPlot(plot);
  if (plot.kind === 'euler') return eulerPlot(plot);
  if (plot.kind === 'chain') return chainPlot(plot);
  if (plot.kind === 'tree') return treePlot(plot);
  return null;
}

export const REASONING_PLOT_KINDS = ['seats', 'grid', 'euler', 'chain', 'tree'];
