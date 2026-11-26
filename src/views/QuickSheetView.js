/**
 * Quick sheets: every formula, every shortcut, every common trap, or the exam
 * strategy cards, on one page for a last read before an exam.
 *
 * Nothing here is scored, scheduled or rewarded, and the app's navigation is
 * hidden: the page holds the material and the few controls that choose what to
 * show. The flashcard modes in FormulaRevisionView remain the place to learn the
 * cards; this is the place to read them.
 */

import { el } from '../utils/dom.js';
import { plural } from '../utils/format.js';
import { navigate } from '../app/router.js';
import { button, chip, emptyState, linkButton, segmented, switchControl } from '../components/ui.js';
import { formulaRepository, topicRepository } from '../repositories/contentRepository.js';
import { STRATEGIES } from '../data/strategies.js';
import { getUserProgress } from '../repositories/progressRepository.js';
import { ensureAllContent, ensureTopicContent } from '../services/contentGate.js';

const KINDS = [
  { id: 'formula', label: 'Formulas' },
  { id: 'shortcut', label: 'Shortcuts' },
  { id: 'traps', label: 'Traps' },
  { id: 'strategy', label: 'Strategy' }
];
const NAMES = { formula: 'formula', shortcut: 'shortcut', traps: 'trap' };
const TITLES = { formula: 'Formula sheet', shortcut: 'Shortcut sheet', traps: 'Traps sheet', strategy: 'Exam strategy' };
const sheetKind = (value) => (KINDS.some((k) => k.id === value) ? value : 'formula');


/** Where a sheet lives; everything it shows is decided by the address, so it can be bookmarked. */
export function sheetPath({ kind = 'formula', topicId = null, scope = 'all', detail = null } = {}) {
  const query = new URLSearchParams({ kind });
  if (!topicId && scope !== 'all') query.set('scope', scope);
  if (detail !== null) query.set('detail', detail ? '1' : '0');
  return `${topicId ? `/sheet/${topicId}` : '/sheet'}?${query}`;
}

/** Topics the learner has worked on: any level attempted, or the topic opened. */
function studiedTopicIds() {
  const progress = getUserProgress();
  const ids = new Set(Object.keys(progress.topics || {}));
  for (const level of Object.values(progress.levels || {})) if (level.topicId) ids.add(level.topicId);
  return ids;
}

/**
 * The sections of a sheet: `[{ topic, cards }]` in catalogue order, leaving out
 * topics with nothing to show. `scope` is 'all', 'mine' or a category id. The
 * traps sheet lists every card (formula or shortcut) with a common mistake.
 */
export function buildSheet({ kind, topicId = null, scope = 'all', studied = new Set() }) {
  const topics = topicRepository.getAll().filter((topic) => {
    if (topicId) return topic.id === topicId;
    if (scope === 'all') return true;
    if (scope === 'mine') return studied.has(topic.id);
    return topic.category === scope;
  });
  const cardsFor = (topic) =>
    kind === 'traps' ? formulaRepository.getByTopic(topic.id).filter((card) => card.commonMistake) : formulaRepository.getByTopic(topic.id, kind);
  return topics.map((topic) => ({ topic, cards: cardsFor(topic) })).filter((section) => section.cards.length);
}

function trapItem(card, detail) {
  return el('article.sheet-item.sheet-item--trap', {}, [
    el('h3.sheet-item__title', { text: card.title }),
    el('p.sheet-item__trap', { text: card.commonMistake }),
    detail ? el('div.sheet-item__fix', {}, [el('span.text-xs.text-subtle', { text: 'Right way: ' }), card.formula]) : null
  ]);
}

function strategyItem(card) {
  return el('article.sheet-item.sheet-item--strategy', {}, [
    el('h3.sheet-item__title', { text: card.title }),
    el('p.sheet-item__rule', { text: card.rule }),
    el('p.sheet-item__example', { text: card.example }),
    el('p.sheet-item__mistake', { text: `Not when: ${card.whenNot}` })
  ]);
}

function sheetItem(card, detail) {
  return el('article.sheet-item', {}, [
    el('h3.sheet-item__title', { text: card.title }),
    el('div.sheet-item__formula', { text: card.formula }),
    detail && card.example ? el('p.sheet-item__example', { text: card.example }) : null,
    detail && card.commonMistake ? el('p.sheet-item__mistake', { text: `Watch out: ${card.commonMistake}` }) : null
  ]);
}

export async function QuickSheetView(ctx) {
  const topicId = ctx.params.topicId || null;
  // Examples and common mistakes live in the topic packs.
  await (topicId ? ensureTopicContent(topicId) : ensureAllContent());

  const kind = sheetKind(ctx.query.kind);
  const scope = ctx.query.scope || 'all';
  // A shortcut means little without its worked example, so those start switched on.
  const detail = ctx.query.detail ? ctx.query.detail === '1' : kind === 'shortcut';
  const strategy = kind === 'strategy';
  const topic = topicId ? topicRepository.getById(topicId) : null;
  const go = (changes) => navigate(sheetPath({ kind, topicId, scope, detail, ...changes }), { replace: true });

  const studied = studiedTopicIds();
  const sections = strategy ? [] : buildSheet({ kind, topicId, scope, studied });
  const total = strategy ? STRATEGIES.length : sections.reduce((sum, section) => sum + section.cards.length, 0);
  const title = `${topic && !strategy ? `${topic.name}: ` : ''}${TITLES[kind]}`;

  const bar = el('div.sheet__bar', {}, [
    linkButton('Done', topic ? `/topics/${topic.id}` : '/revise', { variant: 'ghost', size: 'sm', iconName: 'arrowLeft' }),
    segmented(KINDS, kind, (next) => go({ kind: next, detail: null })),
    strategy
      ? null
      : el('label.sheet__toggle', {}, [
          el('span', { text: kind === 'traps' ? 'Right way' : 'Examples' }),
          switchControl({
            checked: detail,
            label: kind === 'traps' ? 'Show the right way next to each trap' : 'Show examples and common mistakes',
            onChange: (next) => go({ detail: next })
          })
        ]),
    linkButton('Tables', '/tables', { variant: 'ghost', size: 'sm' }),
    button('Print', { size: 'sm', onClick: () => window.print() })
  ]);

  const scopes = topic
    ? [chip('All topics', { onClick: () => navigate(sheetPath({ kind, detail })) })]
    : [
        chip('All topics', { pressed: scope === 'all', onClick: () => go({ scope: 'all' }) }),
        studied.size ? chip('Topics I have studied', { pressed: scope === 'mine', onClick: () => go({ scope: 'mine' }) }) : null,
        ...topicRepository
          .getCategories()
          .map((category) => chip(category.name, { pressed: scope === category.id, onClick: () => go({ scope: category.id }) }))
      ];

  const sectionNodes = sections.map(({ topic: sectionTopic, cards }) =>
    el('section.sheet__topic', { id: `sheet-${sectionTopic.id}` }, [
      el('h2.sheet__topic-name', {}, [sectionTopic.name, el('span.sheet__count', { text: String(cards.length) })]),
      el('div.sheet__grid', {}, cards.map((card) => (kind === 'traps' ? trapItem(card, detail) : sheetItem(card, detail))))
    ])
  );

  const jump =
    sections.length > 4
      ? el(
          'select.select.sheet__jump',
          {
            'aria-label': 'Jump to a topic',
            on: {
              change: (event) => {
                document.getElementById(`sheet-${event.target.value}`)?.scrollIntoView({ block: 'start' });
                event.target.value = '';
              }
            }
          },
          [el('option', { value: '', text: 'Jump to a topic…' }), ...sections.map(({ topic: t }) => el('option', { value: t.id, text: t.name }))]
        )
      : null;

  const element = el('div.sheet', {}, [
    bar,
    el('header.sheet__head', {}, [
      el('h1', { text: title }),
      el('p.text-sm.text-muted', {
        text: total
          ? strategy
            ? `${total} ways to reach or check an answer faster, whatever the topic. Just for reading: nothing here is scored.`
            : `${plural(total, NAMES[kind])} across ${plural(sections.length, 'topic')}. Just for reading: nothing here is scored.`
          : 'Just for reading: nothing here is scored.'
      }),
      strategy ? null : el('div.sheet__filters', {}, [el('div.sheet__scopes', {}, scopes), jump])
    ]),
    strategy
      ? el('div.sheet__body', {}, [el('div.sheet__grid.sheet__grid--wide', {}, STRATEGIES.map(strategyItem))])
      : total
      ? el('div.sheet__body', {}, sectionNodes)
      : emptyState({
          title: kind === 'shortcut' ? 'No shortcuts here yet' : 'No formulas here',
          body:
            scope === 'mine'
              ? 'Nothing from the topics you have studied so far. Try all topics.'
              : kind === 'shortcut'
                ? 'Shortcuts have not been written for this selection yet. The formula sheet covers every topic.'
                : 'This selection has no formula cards.',
          iconName: 'cards',
          action: button(kind === 'shortcut' ? 'Open the formula sheet' : 'Show all topics', {
            variant: 'soft',
            onClick: () => navigate(sheetPath({ kind: 'formula' }))
          })
        })
  ]);

  return { element, title, focusMode: true, bare: true };
}
