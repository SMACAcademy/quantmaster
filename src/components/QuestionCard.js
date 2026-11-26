/** Presents one question: stem, any supporting data, and its type-specific input. */

import { el } from '../utils/dom.js';
import { dataTable } from './ui.js';
import { chartWidget } from './Chart.js';
import { figureWidget } from './Figure.js';
import { getRenderer } from './questionRenderers.js';

export function questionCard(question, ctx) {
  const renderer = getRenderer(question.type);

  return el('div.question-card', {}, [
    question.context ? el('div.question-card__context', { text: question.context }) : null,
    question.table ? dataTable(question.table) : null,
    question.chart ? chartWidget(question.chart) : null,
    question.figure ? figureWidget(question.figure) : null,
    el('h2.question-card__stem', { text: question.question }),
    question.assertion
      ? el('div.stack', { style: { gap: '8px' } }, [
          el('div.question-card__context', { text: `Assertion (A): ${question.assertion}` }),
          el('div.question-card__context', { text: `Reason (R): ${question.reason}` })
        ])
      : null,
    renderer({ ...ctx, question })
  ]);
}
