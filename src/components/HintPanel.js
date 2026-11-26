/**
 * Progressive hints.
 *
 * Hints escalate from "which concept" to "here is the first step". Using one
 * costs a little XP but is never framed as failure — the wording and the styling
 * both treat asking for help as part of learning.
 */

import { el, render } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { button } from './ui.js';

const HINT_LABELS = [
  'Point me in the right direction',
  'Show me the formula or method',
  'Give me the first step',
  'Walk me further through it'
];

/**
 * @param {object} question
 * @param {object} options
 * @param {number} options.revealed - how many hints are already open
 * @param {(count:number)=>void} options.onReveal
 * @param {()=>void} options.onShowSolution
 */
export function hintPanel(question, { revealed = 0, onReveal, onShowSolution, disabled = false }) {
  const hints = (question.hints || []).slice().sort((a, b) => a.level - b.level);
  const container = el('div.hint-panel');

  function draw(count) {
    const shown = hints.slice(0, count);
    const next = hints[count];
    render(container, [
      el('div.hint-panel__head', {}, [
        icon('lightbulb', { size: 16 }),
        el('span', { text: hints.length ? 'Need a nudge?' : 'Stuck?' }),
        el('span.spacer'),
        count > 0
          ? el('span.text-xs.text-subtle', { text: `${count} of ${hints.length} hints used` })
          : null
      ]),
      shown.length
        ? el(
            'ul.hint-list',
            {},
            shown.map((hint, index) =>
              el('li.hint-item', {}, [
                el('span.hint-item__num', { text: String(index + 1) }),
                el('span.hint-item__text', { text: hint.text })
              ])
            )
          )
        : null,
      el('div.row.row--wrap', { style: { gap: '8px' } }, [
        next
          ? button(HINT_LABELS[count] || `Hint ${count + 1}`, {
              variant: 'soft',
              size: 'sm',
              iconName: 'lightbulb',
              disabled,
              onClick: () => {
                draw(count + 1);
                onReveal?.(count + 1);
              }
            })
          : null,
        onShowSolution
          ? button('Show full solution', {
              variant: 'ghost',
              size: 'sm',
              iconName: 'eye',
              disabled,
              onClick: () => onShowSolution()
            })
          : null
      ])
    ]);
  }

  draw(revealed);
  return container;
}
