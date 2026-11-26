/** Topic card used on the dashboard and in the topic catalogue. */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { plural } from '../utils/format.js';
import { badge, progressBar } from './ui.js';
import { getTopicContentSummary } from '../repositories/contentRepository.js';
import { getTopicSummary } from '../services/learningEngine.js';

const STATUS_META = {
  not_started: { label: 'Not started', variant: 'outline' },
  in_progress: { label: 'In progress', variant: 'info' },
  revising: { label: 'Revising', variant: 'warning' },
  mastered: { label: 'Mastered', variant: 'success' }
};

export function topicCard(topic, { compact = false } = {}) {
  const summary = getTopicSummary(topic.id);
  const content = getTopicContentSummary(topic.id);
  const hasContent = content.levelCount > 0;
  const status = STATUS_META[summary.status] || STATUS_META.not_started;

  return el(
    'a',
    {
      href: `#/topics/${topic.id}`,
      class: `topic-card ${hasContent ? '' : 'is-locked'}`.trim(),
      style: { '--cat': `var(--cat-${topic.colorToken})`, color: 'inherit', textDecoration: 'none' },
      'aria-label': `${topic.name}, ${status.label}, mastery ${summary.mastery.score}%`
    },
    [
      el('div.topic-card__top', {}, [
        el('div.topic-card__icon', { text: topic.glyph, 'aria-hidden': 'true' }),
        el('div', { style: { minWidth: '0', flex: '1' } }, [
          el('div.topic-card__cat', { text: topic.categoryName }),
          el('div.topic-card__name', { text: topic.name })
        ]),
        hasContent
          ? badge(status.label, status.variant)
          : badge('Coming soon', 'outline')
      ]),
      compact ? null : el('p.topic-card__desc', { text: topic.description }),
      hasContent
        ? el('div', {}, [
            el('div.progress__label', {}, [
              el('span', { text: 'Mastery' }),
              el('span', { text: `${summary.mastery.score}%` })
            ]),
            progressBar(summary.mastery.score, { size: 'sm' })
          ])
        : null,
      el('div.topic-card__meta', {}, [
        hasContent
          ? el('span', {}, [icon('layers', { size: 13 }), plural(content.levelCount, 'level')])
          : null,
        hasContent
          ? el('span', {}, [icon('help', { size: 13 }), `${content.questionCount} questions`])
          : null,
        content.formulaCount
          ? el('span', {}, [icon('cards', { size: 13 }), `${content.formulaCount} formulas`])
          : null,
        summary.accuracy !== null
          ? el('span', {}, [icon('target', { size: 13 }), `${summary.accuracy}% accuracy`])
          : null,
        !hasContent ? el('span', { text: 'Content in progress' }) : null
      ])
    ]
  );
}

/** Small row used in "continue learning" contexts. */
export function topicProgressRow(topic) {
  const summary = getTopicSummary(topic.id);
  return el('div.hbar', {}, [
    el('span.hbar__name', { text: topic.name, title: topic.name }),
    progressBar(summary.mastery.score, { size: 'sm' }),
    el('span.hbar__value', { text: `${summary.mastery.score}%` })
  ]);
}
