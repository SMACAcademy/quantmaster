/**
 * Must-know tables: squares, cubes, fractions as percentages, primes and the
 * rest, on one printable page with the navigation hidden (like the quick
 * sheets). Each table links to a 60-second speed drill (DrillView).
 */

import { el } from '../utils/dom.js';
import { button, linkButton } from '../components/ui.js';
import { MIXED, TABLES } from '../drills/tables.js';
import { bestScore } from '../drills/drill.js';

function bestText(tableId) {
  const best = bestScore(tableId);
  return best ? `Best: ${best.correct} in 60 s` : 'Not drilled yet';
}

function tableSection(table) {
  return el('section.sheet__topic.tables__table', { id: `table-${table.id}` }, [
    el('div.tables__head', {}, [
      el('div', {}, [
        el('h2.sheet__topic-name', { text: table.title }),
        el('p.text-sm.text-muted', { text: table.description })
      ]),
      el('div.tables__actions', {}, [
        el('span.text-xs.text-subtle', { text: bestText(table.id) }),
        linkButton('Drill', `/drill/${table.id}`, { variant: 'soft', size: 'sm', iconName: 'bolt' })
      ])
    ]),
    el(
      'dl.tables__grid',
      {},
      table.entries.map((entry) => el('div.tables__cell', {}, [el('dt', { text: entry.left }), el('dd', { text: entry.right })]))
    )
  ]);
}

export function TablesView() {
  const element = el('div.sheet', {}, [
    el('div.sheet__bar', {}, [
      linkButton('Done', '/revise', { variant: 'ghost', size: 'sm', iconName: 'arrowLeft' }),
      el('div.row', { style: { gap: '4px', marginRight: 'auto' } }, [
        linkButton('Formulas', '/sheet?kind=formula', { variant: 'ghost', size: 'sm' }),
        linkButton('Shortcuts', '/sheet?kind=shortcut', { variant: 'ghost', size: 'sm' })
      ]),
      linkButton('Mixed drill', `/drill/${MIXED.id}`, { variant: 'primary', size: 'sm', iconName: 'bolt' }),
      button('Print', { size: 'sm', onClick: () => window.print() })
    ]),
    el('header.sheet__head', {}, [
      el('h1', { text: 'Must-know tables' }),
      el('p.text-sm.text-muted', {
        text: 'The numbers that save the most time in an exam. Read them here, then test your recall with a 60-second drill.'
      }),
      el('div.sheet__scopes', { style: { marginTop: '12px' } }, TABLES.map((table) => el('a.chip', { href: `#/tables`, text: table.title, on: { click: (event) => {
        event.preventDefault();
        document.getElementById(`table-${table.id}`)?.scrollIntoView({ block: 'start' });
      } } })))
    ]),
    el('div.sheet__body', {}, TABLES.map(tableSection))
  ]);
  return { element, title: 'Must-know tables', focusMode: true, bare: true };
}
