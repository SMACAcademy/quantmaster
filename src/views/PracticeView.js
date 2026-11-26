/**
 * Practice hub: every practice mode in one place.
 * Also handles deep links like /practice?mode=smart&topic=percentages, which
 * build the session immediately and jump into the quiz.
 */

import { el, render } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { plural } from '../utils/format.js';
import { SESSION_PRESETS } from '../app/config.js';
import { navigate } from '../app/router.js';
import { setActiveSession } from '../app/state.js';
import { badge, button, emptyState, sectionHead, statTile } from '../components/ui.js';
import { topicRepository } from '../repositories/contentRepository.js';
import {
  buildDailyChallenge,
  buildExamSession,
  buildFreshSession,
  buildMistakesSession,
  buildPresetSession,
  buildSmartSession,
  getFormulaStats
} from '../services/sessionBuilder.js';
import { getMistakes } from '../services/learningEngine.js';
import { getWeakConcepts } from '../services/masteryEngine.js';
import { emit, EVENTS } from '../app/eventBus.js';
import { ensureAllContent } from '../services/contentGate.js';

export async function PracticeView(ctx) {
  const requestedMode = ctx.query.mode;
  const topicId = ctx.query.topic || null;

  if (requestedMode) {
    await ensureAllContent();
    const session = buildForMode(requestedMode, topicId);
    if (session) {
      setActiveSession(session);
      navigate('/quiz', { replace: true });
      return { element: el('div'), title: 'Practice' };
    }
    emit(EVENTS.toast, {
      title: 'Nothing to practise there yet',
      body: 'Answer a few questions first and this mode will fill up.',
      variant: 'warning'
    });
  }

  const topics = topicRepository.getPlayable();
  let selectedTopic = topicId;
  const weak = getWeakConcepts({ limit: 5 });
  const mistakes = getMistakes({ includeResolved: false });
  const formulaStats = getFormulaStats();

  const topicRow = el('div.row.row--wrap', { style: { marginBottom: '18px' } });

  function drawTopicRow() {
    render(topicRow, [
      el(
        'button',
        {
          type: 'button',
          class: 'chip',
          'aria-pressed': String(!selectedTopic),
          on: {
            click: () => {
              selectedTopic = null;
              drawTopicRow();
            }
          }
        },
        ['All topics']
      ),
      ...topics.map((topic) =>
        el(
          'button',
          {
            type: 'button',
            class: 'chip',
            'aria-pressed': String(selectedTopic === topic.id),
            on: {
              click: () => {
                selectedTopic = topic.id;
                drawTopicRow();
              }
            }
          },
          [topic.glyph, ' ', topic.name]
        )
      )
    ]);
  }
  drawTopicRow();

  // Sessions can draw on every topic, so make sure all question packs are loaded first.
  const launch = async (factory, fallbackMessage) => {
    await ensureAllContent();
    const session = factory();
    if (!session) {
      emit(EVENTS.toast, { title: fallbackMessage, variant: 'warning' });
      return;
    }
    setActiveSession(session);
    navigate('/quiz');
  };

  const root = el('div', {}, [
    el('div.page-head', {}, [
      el('div.page-head__text', {}, [
        el('h1', { text: 'Practice' }),
        el('p', { text: 'Pick how you want to work. Smart Practice is the one to use when unsure.' })
      ])
    ]),

    el('div.stat-grid', { style: { marginBottom: '24px' } }, [
      statTile(weak.length, 'Weak concepts', weak.length ? 'warning' : ''),
      statTile(mistakes.length, 'Open mistakes', mistakes.length ? 'danger' : ''),
      statTile(formulaStats.due, 'Formulas due'),
      statTile(topics.length, 'Topics ready')
    ]),

    el('section.section', {}, [
      sectionHead('Focus on', { hint: 'Applies to the modes below' }),
      topicRow
    ]),

    el('section.section', {}, [
      sectionHead('Practice modes'),
      el('div.grid.grid--cards', {}, [
        modeCard({
          title: 'Smart Practice',
          description:
            'Builds a set from your weak concepts, items due for review, and some new ground.',
          iconName: 'brain',
          primary: true,
          badgeText: 'Recommended',
          onStart: () =>
            launch(
              () => buildSmartSession({ topicId: selectedTopic, count: 10 }),
              'No questions available for that topic yet'
            )
        }),
        modeCard({
          title: 'Fresh Questions',
          description:
            'Unlimited practice with new numbers every time, weighted towards your weak concepts. Every question is checked before you see it.',
          iconName: 'sparkles',
          badgeText: 'Unlimited',
          onStart: () =>
            launch(
              () => buildFreshSession({ topicId: selectedTopic, count: 10 }),
              'Fresh questions are not available for that topic yet'
            )
        }),
        modeCard({
          title: 'Learn Mode',
          description: 'Untimed, hints available, full explanations. Good for new material.',
          iconName: 'book',
          onStart: () =>
            launch(
              () => buildSmartSession({ topicId: selectedTopic, count: 8 }),
              'Nothing to learn here yet'
            )
        }),
        modeCard({
          title: 'Retry My Mistakes',
          description: mistakes.length
            ? `${plural(mistakes.length, 'question')} you have not yet corrected.`
            : 'Nothing outstanding right now.',
          iconName: 'refresh',
          disabled: !mistakes.length,
          onStart: () =>
            launch(
              () => buildMistakesSession({ topicId: selectedTopic, count: 10 }),
              'No mistakes to retry'
            )
        }),
        modeCard({
          title: 'Daily Challenge',
          description: 'A fixed mixed set that changes once a day.',
          iconName: 'trophy',
          onStart: () => launch(() => buildDailyChallenge({ count: 8 }), 'No questions available')
        }),
        modeCard({
          title: 'Formula Revision',
          description: formulaStats.due
            ? `${plural(formulaStats.due, 'card')} due for review.`
            : `${formulaStats.total} cards available.`,
          iconName: 'cards',
          onStart: () =>
            navigate(selectedTopic ? `/revise/${selectedTopic}?mode=recall` : '/revise?mode=recall')
        }),
        modeCard({
          title: 'Mock tests',
          description: 'Full exam-pattern papers: IBPS/SBI, SSC CGL, CAT and campus, with the real clock and marking.',
          iconName: 'trophy',
          onStart: () => navigate('/mock')
        }),
        modeCard({
          title: 'Exam Simulation',
          description: 'Timed, no feedback until the end, results at the finish.',
          iconName: 'clock',
          onStart: () =>
            launch(
              () =>
                buildExamSession({
                  topicIds: selectedTopic ? [selectedTopic] : null,
                  count: 15
                }),
              'Not enough questions for an exam yet'
            )
        })
      ])
    ]),

    el('section.section', {}, [
      sectionHead('Session lengths', { hint: 'Every one ends with a summary' }),
      el(
        'div.grid.grid--cards',
        {},
        SESSION_PRESETS.map((preset) =>
          el('button.card.card--interactive', {
            type: 'button',
            on: {
              click: () =>
                launch(
                  () => buildPresetSession(preset.id, { topicId: selectedTopic }),
                  'Not enough content for that session yet'
                )
            }
          }, [
            el('div.row', {}, [
              el('div', { style: { flex: 1 } }, [
                el('div.card__title', { text: preset.name }),
                el('div.card__sub', { text: preset.description })
              ]),
              badge(`${preset.minutes} min`, 'outline')
            ]),
            el('div.text-xs.text-subtle', {
              style: { marginTop: '10px' },
              text: `${preset.questionCount} questions · ${preset.formulaCount} formula cards`
            })
          ])
        )
      )
    ]),

    weak.length
      ? el('section.section', {}, [
          sectionHead('Your weakest concepts right now'),
          el(
            'div.stack',
            {},
            weak.map((entry) =>
              el('div.row.card', {}, [
                el('div', { style: { flex: 1, minWidth: 0 } }, [
                  el('div.font-bold', { text: entry.concept.name }),
                  el('div.text-xs.text-subtle', {
                    text: `${entry.state.correctAttempts}/${entry.state.attempts} correct`
                  })
                ]),
                badge(`${Math.round(entry.score)}%`, 'danger'),
                button('Practise', {
                  variant: 'soft',
                  size: 'sm',
                  onClick: () =>
                    launch(
                      () =>
                        buildSmartSession({ topicId: entry.concept.topicId, count: 8 }),
                      'No questions for that concept yet'
                    )
                })
              ])
            )
          )
        ])
      : null
  ]);

  return { element: root, title: 'Practice' };
}

function modeCard({ title, description, iconName, onStart, primary = false, badgeText, disabled }) {
  return el(
    'div',
    { class: `card ${primary ? 'card--accent' : ''}`.trim() },
    [
      el('div.row', { style: { marginBottom: '10px' } }, [
        el('div.action-tile__icon', {}, [icon(iconName, { size: 20 })]),
        el('div', { style: { flex: 1 } }, [el('div.card__title', { text: title })]),
        badgeText ? badge(badgeText, 'accent') : null
      ]),
      el('p.card__sub', { text: description }),
      el('div', { style: { marginTop: '14px' } }, [
        button(disabled ? 'Nothing due' : 'Start', {
          variant: primary ? 'primary' : 'soft',
          iconName: 'play',
          disabled,
          onClick: onStart
        })
      ])
    ]
  );
}

function buildForMode(mode, topicId) {
  switch (mode) {
    case 'smart':
      return buildSmartSession({ topicId, count: 10 });
    case 'fresh':
      return buildFreshSession({ topicId, count: 10 });
    case 'mistakes':
      return buildMistakesSession({ topicId, count: 10 });
    case 'daily':
      return buildDailyChallenge({ count: 8 });
    case 'exam':
      return buildExamSession({ topicIds: topicId ? [topicId] : null, count: 15 });
    default:
      return null;
  }
}
