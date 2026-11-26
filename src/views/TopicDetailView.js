/** Topic detail: mastery, level progression, weak concepts and recent mistakes. */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { plural, relativeTime } from '../utils/format.js';
import { navigate } from '../app/router.js';
import { setActiveSession } from '../app/state.js';
import {
  badge,
  breadcrumbs,
  button,
  emptyState,
  linkButton,
  progressBar,
  ring,
  sectionHead,
  statTile
} from '../components/ui.js';
import { levelList } from '../components/LevelCard.js';
import {
  conceptRepository,
  formulaRepository,
  getTopicContentSummary,
  levelRepository,
  topicRepository
} from '../repositories/contentRepository.js';
import { getAllConceptProgress } from '../repositories/progressRepository.js';
import { getTopicSummary, getMistakes, touchTopic } from '../services/learningEngine.js';
import { getWeakConcepts } from '../services/masteryEngine.js';
import { getTopicRecommendation } from '../services/recommendationEngine.js';
import { buildConceptSession, buildFreshSession, buildSmartSession, getDueFormulas } from '../services/sessionBuilder.js';
import { masteryMap } from '../components/MasteryMap.js';
import { emit, EVENTS } from '../app/eventBus.js';
import { templatesForTopic, topicHasTemplates } from '../generators/gate.js';
import { ensureTopicContent } from '../services/contentGate.js';
import { sheetPath } from './QuickSheetView.js';
import { simulationCard } from './ExploreView.js';
import { simulationMetaForTopic } from '../simulations/meta.js';

export async function TopicDetailView(ctx) {
  const topic = topicRepository.getById(ctx.params.topicId);
  // Level question counts, mistakes and the practice buttons need this topic's questions.
  if (topic) await ensureTopicContent(topic.id);
  if (!topic) {
    return {
      title: 'Topic not found',
      element: emptyState({
        title: 'Topic not found',
        body: 'That topic does not exist in the catalogue.',
        iconName: 'compass',
        action: linkButton('Back to topics', '/topics', { variant: 'primary' })
      })
    };
  }

  touchTopic(topic.id);

  const summary = getTopicSummary(topic.id);
  const content = getTopicContentSummary(topic.id);
  const concepts = conceptRepository.getByTopic(topic.id);
  const conceptProgress = getAllConceptProgress();
  const weak = getWeakConcepts({ topicId: topic.id, limit: 4 });
  const mistakes = getMistakes({ topicId: topic.id, includeResolved: false }).slice(0, 4);
  const dueFormulas = getDueFormulas({ topicId: topic.id });
  const recommendation = getTopicRecommendation(topic.id);
  const hasContent = content.levelCount > 0;

  const root = el('div', {}, [
    breadcrumbs([{ label: 'Topics', href: '/topics' }, { label: topic.name }]),

    el('div.page-head', {}, [
      el('div.page-head__text', {}, [
        el('div.row', { style: { gap: '10px', marginBottom: '6px' } }, [
          el('div.topic-card__icon', {
            text: topic.glyph,
            style: { '--cat': `var(--cat-${topic.colorToken})` }
          }),
          el('div', {}, [
            el('div.topic-card__cat', { text: topic.categoryName }),
            el('h1', { text: topic.name })
          ])
        ]),
        el('p', { text: topic.description })
      ]),
      hasContent
        ? el('div.row', { style: { gap: '14px' } }, [
            ring(summary.mastery.score, { size: 72 }),
            el('div', {}, [
              el('div.text-xs.text-subtle', { text: 'Mastery' }),
              el('div.font-bold', { text: summary.mastery.label.label }),
              el('div.text-xs.text-subtle', {
                text: `${summary.mastery.covered}/${summary.mastery.total} concepts touched`
              })
            ])
          ])
        : badge('Content coming soon', 'outline')
    ]),

    topic.whyItMatters
      ? el('div.lesson__callout', { style: { marginBottom: '24px' } }, [
          el('div.text-xs.text-subtle', { text: 'Why this topic matters' }),
          el('p', { text: topic.whyItMatters })
        ])
      : null,

    hasContent
      ? el('div.stat-grid', { style: { marginBottom: '24px' } }, [
          statTile(`${summary.completedLevels}/${summary.totalLevels}`, 'Levels done'),
          statTile(summary.questionsAnswered, 'Questions solved'),
          statTile(summary.accuracy === null ? '—' : `${summary.accuracy}%`, 'Accuracy', 'success'),
          statTile(
            topicHasTemplates(topic.id) ? `${content.questionCount} + ∞` : content.questionCount,
            topicHasTemplates(topic.id)
              ? `Questions (${templatesForTopic(topic.id).length} generators)`
              : 'In question bank'
          ),
          statTile(content.formulaCount, 'Formula cards')
        ])
      : null,

    hasContent
      ? el('div.row.row--wrap', { style: { marginBottom: '28px', gap: '10px' } }, [
          button(recommendation.title, {
            variant: 'primary',
            iconName: recommendation.icon,
            onClick: () => navigate(recommendation.route)
          }),
          content.formulaCount
            ? linkButton(
                dueFormulas.length
                  ? `Revise formulas (${dueFormulas.length} due)`
                  : 'Revise formulas',
                `/revise/${topic.id}?mode=recall`,
                { variant: 'soft', iconName: 'cards' }
              )
            : null,
          button('Smart practice', {
            variant: 'ghost',
            iconName: 'target',
            onClick: () => {
              const session = buildSmartSession({ topicId: topic.id, count: 10 });
              if (!session) return;
              setActiveSession(session);
              navigate('/quiz');
            }
          }),
          topicHasTemplates(topic.id)
            ? button('Fresh questions', {
                variant: 'ghost',
                iconName: 'sparkles',
                title: 'Unlimited practice with new numbers every time',
                onClick: () => {
                  const session = buildFreshSession({ topicId: topic.id, count: 10 });
                  if (!session) return;
                  setActiveSession(session);
                  navigate('/quiz');
                }
              })
            : null
        ])
      : null,

    hasContent
      ? el('section.section', {}, [
          sectionHead('Level progression', {
            hint: `${plural(summary.totalLevels, 'level')} · complete one to unlock the next`
          }),
          levelList(summary.levels, {
            onOpen: (level) => navigate(`/topics/${topic.id}/levels/${level.id}`)
          })
        ])
      : emptyState({
          title: `${topic.name} is not built out yet`,
          body: 'The topic is in the catalogue with its metadata, but levels and questions have not been authored. Adding JSON files for it is all that is needed — no code changes.',
          iconName: 'layers',
          action: linkButton('Browse ready topics', '/topics', { variant: 'primary' })
        }),

    concepts.length
      ? el('section.section', {}, [
          sectionHead('Mastery map', {
            hint: 'Mastery is tracked per concept, not per topic'
          }),
          masteryMap({
            concepts,
            levels: levelRepository.getByTopic(topic.id),
            conceptProgress,
            onPractise: (concept) => {
              const session = buildConceptSession({ conceptId: concept.id });
              if (!session) {
                emit(EVENTS.toast, { title: 'No questions for that concept yet', variant: 'warning' });
                return;
              }
              setActiveSession(session);
              navigate('/quiz');
            }
          })
        ])
      : null,

    weak.length
      ? el('section.section', {}, [
          sectionHead('Needs attention', { hint: 'Lowest-scoring concepts first' }),
          el(
            'div.stack',
            {},
            weak.map((entry) =>
              el('div.card', {}, [
                el('div.row', {}, [
                  el('div', { style: { flex: 1, minWidth: 0 } }, [
                    el('div.card__title', { text: entry.concept.name }),
                    el('div.card__sub', { text: entry.concept.description })
                  ]),
                  badge(`${Math.round(entry.score)}%`, 'danger')
                ]),
                el('div', { style: { marginTop: '10px' } }, [
                  progressBar(entry.score, { size: 'sm', variant: 'warning' })
                ]),
                el('div.text-xs.text-subtle', {
                  style: { marginTop: '6px' },
                  text: `${entry.state.correctAttempts}/${entry.state.attempts} correct · last seen ${relativeTime(entry.state.lastAttemptedAt)}`
                })
              ])
            )
          )
        ])
      : null,

    mistakes.length
      ? el('section.section', {}, [
          sectionHead('Recent mistakes', {
            action: linkButton('All mistakes', '/mistakes', { variant: 'ghost', size: 'sm' })
          }),
          el(
            'div.stack',
            {},
            mistakes.map((entry) =>
              el('div.review-item.is-wrong', {}, [
                el('div.review-item__icon', {}, [icon('x', { size: 15 })]),
                el('div.review-item__body', {}, [
                  el('div.review-item__q', { text: entry.question.question }),
                  el('div.review-item__meta', {}, [
                    entry.concept ? el('span', { text: entry.concept.name }) : null,
                    el('span', { text: `${plural(entry.record.timesWrong, 'time')} wrong` }),
                    el('span', { text: relativeTime(entry.record.lastAttemptAt) })
                  ])
                ])
              ])
            )
          )
        ])
      : null,

    simulationMetaForTopic(topic.id).length
      ? el('section.section', {}, [
          sectionHead('Explore', { hint: 'Play with the idea' }),
          el('div.grid.grid--cards', {}, simulationMetaForTopic(topic.id).map((meta) => simulationCard(meta, { showTopic: false })))
        ])
      : null,

    cardSection('Formulas', 'formula'),
    cardSection('Shortcuts', 'shortcut')
  ]);

  /** A preview of the topic's formulas or shortcuts, with ways to revise them or read them all. */
  function cardSection(heading, kind) {
    const cards = formulaRepository.getByTopic(topic.id, kind);
    if (!cards.length) return null;
    return el('section.section', {}, [
      sectionHead(heading, {
        hint: cards.length > 6 ? `6 of ${cards.length}` : null,
        action: el('div.row', { style: { gap: '4px' } }, [
          linkButton('Read all', sheetPath({ kind, topicId: topic.id }), { variant: 'ghost', size: 'sm' }),
          kind === 'formula' ? linkButton('Traps', sheetPath({ kind: 'traps', topicId: topic.id }), { variant: 'ghost', size: 'sm' }) : null,
          linkButton('Revise', `/revise/${topic.id}?mode=recall&kind=${kind}`, { variant: 'ghost', size: 'sm' })
        ])
      }),
      el(
        'div.grid.grid--cards',
        {},
        cards.slice(0, 6).map((formula) =>
          el('div.card', {}, [
            el('div.text-xs.text-subtle', { text: formula.title }),
            el('div.formula-inline', { style: { marginTop: '8px' }, text: formula.formula })
          ])
        )
      )
    ]);
  }

  return { element: root, title: topic.name };
}
