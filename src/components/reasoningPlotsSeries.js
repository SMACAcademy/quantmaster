/**
 * The alphabet strip (plot kind `strip`, from simulations/reasoningSeries.js):
 * 26 numbered cells, A = 1 ... Z = 26 (and 27 − n from the Z end when asked),
 * the marked terms of a letter series, an arc from each term to the next with
 * the gap written on it, and below, the terms and gaps as a list.
 *
 *   { kind: 'strip', reverse, terms: [{ at, value, letter, order, state }], gaps, summary }
 *   state: 'shown' | 'new' | 'answer' | 'hidden'
 *
 * The picture has a text summary for screen readers; colours come from theme tokens.
 */

import { el, svgEl } from '../utils/dom.js';
import { ALPHABET } from '../utils/reasoning/series.js';

const W = 560;
const LEFT = 10;
const CELL = (W - 2 * LEFT) / 26;
const STRIP_Y = 118;
const signed = (k) => (k >= 0 ? `+${k}` : `−${-k}`);
const STATE_WORDS = { shown: 'marked', new: 'just marked', answer: 'the next term' };

function stripPlot(plot) {
  const height = plot.reverse ? 200 : 182;
  const cx = (p) => LEFT + (p - 0.5) * CELL;
  const visible = plot.terms.filter((t) => t.state !== 'hidden');
  const marked = new Map(visible.map((t) => [t.at, t]));
  const children = [];

  // Arcs from each term to the next, higher for longer jumps, the gap at the top.
  visible.slice(1).forEach((t, i) => {
    const from = visible[i];
    const x1 = cx(from.at);
    const x2 = cx(t.at);
    const rise = Math.min(92, 18 + Math.abs(x2 - x1) * 0.32);
    const top = STRIP_Y - 6 - rise;
    const mid = (x1 + x2) / 2;
    const gap = plot.reverse ? -(t.at - from.at) : t.at - from.at;
    children.push(svgEl('path', { d: `M ${x1} ${STRIP_Y - 4} Q ${mid} ${top - rise * 0.15} ${x2} ${STRIP_Y - 4}`, class: `strip-arc${t.state === 'answer' ? ' is-answer' : ''}` }));
    children.push(svgEl('text', { x: mid, y: STRIP_Y - 4 - rise * 0.6, 'text-anchor': 'middle', class: `strip-gap${t.state === 'answer' ? ' is-answer' : ''}`, text: signed(gap) }));
  });

  // The strip itself.
  [...ALPHABET].forEach((ch, i) => {
    const p = i + 1;
    const term = marked.get(p);
    const state = term ? ` is-${term.state}` : '';
    children.push(svgEl('rect', { x: LEFT + i * CELL, y: STRIP_Y, width: CELL, height: 26, rx: 3, class: `strip-cell${state}` }));
    children.push(svgEl('text', { x: cx(p), y: STRIP_Y + 13, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: `strip-letter${state}`, text: ch }));
    children.push(svgEl('text', { x: cx(p), y: STRIP_Y + 42, 'text-anchor': 'middle', class: `strip-num${plot.reverse ? ' is-muted' : ''}${term && !plot.reverse ? ' is-marked' : ''}`, text: String(p) }));
    if (plot.reverse) children.push(svgEl('text', { x: cx(p), y: STRIP_Y + 62, 'text-anchor': 'middle', class: `strip-num strip-num--rev${term ? ' is-marked' : ''}`, text: String(27 - p) }));
  });
  children.push(svgEl('text', { x: LEFT, y: 18, class: 'strip-caption', text: plot.reverse ? 'gaps counted from the Z end' : 'gap from each term to the next' }));
  if (plot.reverse) children.push(svgEl('text', { x: W - LEFT, y: STRIP_Y + 80, 'text-anchor': 'end', class: 'strip-caption', text: 'lower row: position from Z (27 − n)' }));

  const items = [];
  visible.forEach((t, i) => {
    if (i > 0) items.push(el('li.strip-list__gap', { 'aria-hidden': 'true', text: signed(plot.gaps[i - 1]) }));
    items.push(
      el('li', { class: `strip-list__term is-${t.state}` }, [
        el('span.strip-list__letter', { text: t.letter }),
        el('span.strip-list__value', { text: String(t.value) }),
        el('span.sr-only', { text: ` (${STATE_WORDS[t.state]}${i > 0 ? `, gap ${signed(plot.gaps[i - 1])}` : ''})` })
      ])
    );
  });
  if (visible.length < plot.terms.length) items.push(el('li.strip-list__term.is-hidden', {}, [el('span.strip-list__letter', { text: '?' }), el('span.sr-only', { text: ' (not yet marked)' })]));

  return el('div.sim-figure.rp-figure', {}, [
    // On a phone the 26 letters would be too small to read, so the strip keeps a minimum width and scrolls.
    el('div.strip-scroll', {}, [svgEl('svg', { viewBox: `0 0 ${W} ${height}`, class: 'sim-plot rp-svg strip-svg', role: 'img', 'aria-label': plot.summary }, children)]),
    el('ol.strip-list', { 'aria-label': 'Terms and the gaps between them' }, items)
  ]);
}

export const seriesPlots = { strip: stripPlot };
