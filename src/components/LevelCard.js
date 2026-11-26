/** A single row in a topic's level progression. */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { LEVEL_TYPE_META } from '../app/config.js';
import { badge } from './ui.js';
import { questionRepository, formulaRepository } from '../repositories/contentRepository.js';
import { getLevelStatus, getLevelState } from '../services/learningEngine.js';

export function levelItem(level, { onOpen } = {}) {
  const status = getLevelStatus(level);
  const state = getLevelState(level.id);
  const meta = LEVEL_TYPE_META[level.type] || { label: level.type, icon: 'play', tone: '' };
  const locked = status === 'locked';

  const itemCount =
    level.type === 'formula_revision'
      ? (level.formulaIds?.length ?? formulaRepository.getByTopic(level.topicId).length)
      : level.type === 'concept'
        ? (level.lesson?.blocks?.length ?? level.lessonBlockCount ?? 0)
        : questionRepository.getByLevel(level.id).length;

  const countLabel =
    level.type === 'formula_revision'
      ? `${itemCount} cards`
      : level.type === 'concept'
        ? 'Lesson'
        : `${itemCount} questions`;

  const marker = el('div.level-item__marker', {}, [
    status === 'completed'
      ? icon('check', { size: 16 })
      : locked
        ? icon('lock', { size: 15 })
        : el('span', { text: String(level.order) })
  ]);

  const classes = [
    'level-item',
    status === 'completed' ? 'is-complete' : '',
    status === 'in_progress' || status === 'available' ? '' : '',
    status === 'in_progress' ? 'is-current' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return el(
    'button',
    {
      type: 'button',
      class: classes,
      disabled: locked,
      'aria-label': `Level ${level.order}: ${level.title}${locked ? ' (locked)' : ''}`,
      on: { click: () => !locked && onOpen?.(level) }
    },
    [
      marker,
      el('div.level-item__body', {}, [
        el('div.level-item__title', {}, [
          level.title,
          badge(meta.label, meta.tone),
          status === 'in_progress' ? badge('Current', 'accent') : null
        ]),
        el('div.level-item__desc', { text: level.description }),
        el('div.level-item__meta', {}, [
          el('span', { text: countLabel }),
          level.estimatedMinutes ? el('span', { text: `~${level.estimatedMinutes} min` }) : null,
          state?.bestAccuracy
            ? el('span', { text: `Best ${state.bestAccuracy}%` })
            : null,
          level.timerSecondsPerQuestion ? el('span', { text: 'Timed option' }) : null
        ])
      ]),
      el('div.level-item__right', {}, [
        locked ? null : icon(status === 'completed' ? 'refresh' : 'chevronRight', { size: 18 })
      ])
    ]
  );
}

export function levelList(levels, { onOpen } = {}) {
  return el(
    'ul.level-list',
    {},
    levels.map((level) => el('li', {}, [levelItem(level, { onOpen })]))
  );
}
