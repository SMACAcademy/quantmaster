/** Mistake review: what went wrong, why, and a one-tap way to fix it. */

import { el, render } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { plural, relativeTime } from '../utils/format.js';
import { MISTAKE_TYPES } from '../app/config.js';
import { navigate } from '../app/router.js';
import { setActiveSession } from '../app/state.js';
import {
  badge,
  button,
  chip,
  disclosure,
  emptyState,
  linkButton,
  sectionHead,
  statTile
} from '../components/ui.js';
import { solutionPanel } from '../components/SolutionPanel.js';
import { categoriseMistakes, getMistakes } from '../services/learningEngine.js';
import { buildMistakesSession } from '../services/sessionBuilder.js';
import { createSession } from '../services/quizEngine.js';

const FILTERS = [
  { id: 'unresolved', label: 'To fix' },
  { id: 'frequent', label: 'Frequently missed' },
  { id: 'recent', label: 'Recent' },
  { id: 'almost', label: 'Almost there' },
  { id: 'corrected', label: 'Corrected' }
];

export function MistakesView() {
  const all = getMistakes();
  const groups = categoriseMistakes(all);
  let filter = 'unresolved';

  const list = el('div.stack');
  const filterRow = el('div.row.row--wrap', { style: { marginBottom: '16px' } });

  function drawFilters() {
    render(
      filterRow,
      FILTERS.map((option) =>
        chip(option.label, {
          pressed: filter === option.id,
          count: groups[option.id].length,
          onClick: () => {
            filter = option.id;
            drawFilters();
            drawList();
          }
        })
      )
    );
  }

  function drawList() {
    const items = groups[filter];
    render(
      list,
      items.length
        ? items.map((entry) => mistakeRow(entry))
        : [
            emptyState({
              title:
                filter === 'corrected'
                  ? 'Nothing corrected yet'
                  : filter === 'unresolved'
                    ? 'No outstanding mistakes'
                    : 'Nothing in this group',
              body:
                filter === 'unresolved'
                  ? 'Either you have not made any yet, or you have already fixed them all.'
                  : 'Keep practising and this list will populate itself.',
              iconName: 'check'
            })
          ]
    );
  }

  const root = el('div', {}, [
    el('div.page-head', {}, [
      el('div.page-head__text', {}, [
        el('h1', { text: 'Mistakes' }),
        el('p', {
          text: 'A mistake you understand is worth more than a question you guessed right. These are queued for retry.'
        })
      ]),
      groups.unresolved.length
        ? button(`Retry ${Math.min(groups.unresolved.length, 10)} now`, {
            variant: 'primary',
            iconName: 'refresh',
            onClick: () => {
              const session = buildMistakesSession({ count: 10 });
              if (!session) return;
              setActiveSession(session);
              navigate('/quiz');
            }
          })
        : null
    ]),

    el('div.stat-grid', { style: { marginBottom: '22px' } }, [
      statTile(groups.unresolved.length, 'To fix', groups.unresolved.length ? 'danger' : ''),
      statTile(groups.frequent.length, 'Repeatedly missed', 'warning'),
      statTile(groups.corrected.length, 'Corrected', 'success'),
      statTile(all.length, 'Total logged')
    ]),

    filterRow,
    list
  ]);

  drawFilters();
  drawList();

  return { element: root, title: 'Mistakes' };
}

function mistakeRow(entry) {
  const { question, concept, topic, record } = entry;
  const mistakeLabel = record.mistakeType
    ? MISTAKE_TYPES.find((t) => t.id === record.mistakeType)?.label
    : null;

  return el('div', { class: `review-item ${record.resolved ? 'is-correct' : 'is-wrong'}` }, [
    el('div.review-item__icon', {}, [icon(record.resolved ? 'check' : 'x', { size: 15 })]),
    el('div.review-item__body', {}, [
      el('div.review-item__q', { text: question.question }),
      el('div.review-item__meta', { style: { marginBottom: '8px' } }, [
        topic ? el('span', { text: topic.name }) : null,
        concept ? el('span', { text: concept.name }) : null,
        el('span', { text: `wrong ${plural(record.timesWrong, 'time')}` }),
        el('span', { text: relativeTime(record.lastAttemptAt) }),
        record.resolved ? el('span', { text: 'corrected since' }) : null
      ]),
      mistakeLabel ? badge(mistakeLabel, 'outline') : null,
      el('div.row.row--wrap', { style: { gap: '8px', marginTop: '10px' } }, [
        button('Retry this', {
          variant: 'soft',
          size: 'sm',
          iconName: 'refresh',
          onClick: () => {
            const session = createSession({
              questions: [question],
              mode: 'revision',
              title: 'Retry question',
              subtitle: topic?.name || '',
              source: { type: 'mistakes', topicId: question.topicId },
              returnTo: '/mistakes'
            });
            setActiveSession(session);
            navigate('/quiz');
          }
        }),
        topic
          ? linkButton('Topic', `/topics/${topic.id}`, { variant: 'ghost', size: 'sm' })
          : null
      ]),
      el('div', { style: { marginTop: '10px' } }, [
        disclosure('Show explanation', () => solutionPanel(question, { compact: true }))
      ])
    ])
  ]);
}
