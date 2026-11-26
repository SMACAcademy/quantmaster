/**
 * Level entry point. Dispatches by level type:
 *   concept          → a lesson with inline checks
 *   formula_revision → hands off to the revision deck, scoped to this level
 *   everything else  → a short briefing, then the quiz runner
 */

import { getSimulationMeta, loadSimulationKit } from '../simulations/meta.js';
import { el, render } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { plural } from '../utils/format.js';
import { LEVEL_TYPE_META } from '../app/config.js';
import { navigate } from '../app/router.js';
import { setActiveSession } from '../app/state.js';
import {
  badge,
  breadcrumbs,
  button,
  difficultyBadge,
  emptyState,
  linkButton,
  sectionHead
} from '../components/ui.js';
import { questionCard } from '../components/QuestionCard.js';
import { figureWidget } from '../components/Figure.js';
import { requiresFullRerender } from '../components/questionRenderers.js';
import { solutionPanel, feedbackHeader } from '../components/SolutionPanel.js';
import {
  formulaRepository,
  levelRepository,
  questionRepository,
  topicRepository
} from '../repositories/contentRepository.js';
import {
  completeConceptLesson,
  getLevelStatus,
  getLevelState,
  getPassCriteria,
  touchTopic
} from '../services/learningEngine.js';
import { buildLevelSession } from '../services/sessionBuilder.js';
import { evaluateAnswer, isResponseComplete } from '../services/quizEngine.js';
import { recordQuestionAttempt } from '../services/learningEngine.js';
import { celebrate } from '../components/Celebration.js';
import { ensureTopicContent } from '../services/contentGate.js';

export async function LevelView(ctx) {
  const level = levelRepository.getById(ctx.params.levelId);
  const topic = level ? topicRepository.getById(level.topicId) : null;
  // Lessons and level questions live in the topic's pack.
  if (topic) await ensureTopicContent(topic.id);

  if (!level || !topic) {
    return {
      title: 'Level not found',
      element: emptyState({
        title: 'Level not found',
        body: 'This level is not part of the current content set.',
        iconName: 'layers',
        action: linkButton('Back to topics', '/topics', { variant: 'primary' })
      })
    };
  }

  touchTopic(topic.id);

  const status = getLevelStatus(level);
  if (status === 'locked') {
    return {
      title: level.title,
      element: emptyState({
        title: 'Locked for now',
        body: `Finish ${level.prerequisiteLevelIds
          .map((id) => levelRepository.getById(id)?.title)
          .filter(Boolean)
          .join(', ')} first. Levels unlock in order so nothing is attempted before its foundations.`,
        iconName: 'lock',
        action: linkButton(`Back to ${topic.name}`, `/topics/${topic.id}`, { variant: 'primary' })
      })
    };
  }

  if (level.type === 'concept') return conceptLessonView(level, topic);
  if (level.type === 'formula_revision') return formulaLevelBriefing(level, topic);
  return practiceLevelBriefing(level, topic, status);
}

/* ------------------------------ lesson ------------------------------ */

function conceptLessonView(level, topic) {
  const blocks = level.lesson?.blocks || [];
  const completed = getLevelStatus(level) === 'completed';

  const root = el('div.lesson', {}, [
    breadcrumbs([
      { label: 'Topics', href: '/topics' },
      { label: topic.name, href: `/topics/${topic.id}` },
      { label: level.title }
    ]),
    el('div', {}, [
      el('div.row.row--wrap', { style: { gap: '8px', marginBottom: '8px' } }, [
        badge(LEVEL_TYPE_META.concept.label, 'info'),
        badge(`~${level.estimatedMinutes} min`, 'outline'),
        completed ? badge('Completed', 'success', { icon: 'check' }) : null
      ]),
      el('h1', { text: level.title }),
      el('p.text-muted', { style: { marginTop: '6px' }, text: level.description })
    ]),
    ...blocks.map((block) => lessonBlock(block)),
    el('div.lesson__block', {}, [
      el('h3', { text: 'Ready to use it?' }),
      el('p.text-muted', {
        text: 'The next level turns this idea into recall practice, which is where it actually sticks.'
      }),
      el('div.row.row--wrap', { style: { marginTop: '16px', gap: '10px' } }, [
        button(completed ? 'Continue' : 'Mark as understood', {
          variant: 'primary',
          iconName: 'check',
          onClick: () => {
            const { firstCompletion } = completeConceptLesson(level);
            if (firstCompletion) celebrate({ intensity: 'low' });
            const next = levelRepository.getNext(level.id);
            navigate(next ? `/topics/${topic.id}/levels/${next.id}` : `/topics/${topic.id}`);
          }
        }),
        linkButton('Back to topic', `/topics/${topic.id}`, { variant: 'ghost' })
      ])
    ])
  ]);

  return { element: root, title: level.title };
}

function lessonBlock(block) {
  if (block.type === 'check') {
    const question = questionRepository.getById(block.questionId);
    return question ? inlineCheck(question) : null;
  }
  if (block.type === 'formula') {
    return el('div.lesson__block', {}, [
      block.title ? el('h3', { text: block.title }) : null,
      el('div.flashcard__formula', { style: { marginTop: '10px' }, text: block.body }),
      block.caption ? el('p.text-sm.text-subtle', { style: { marginTop: '10px' }, text: block.caption }) : null
    ]);
  }
  if (block.type === 'example') {
    return el('div.lesson__block', {}, [
      block.title ? el('h3', { text: block.title }) : null,
      el('div.lesson__example', { style: { marginTop: '10px' }, text: block.body })
    ]);
  }
  if (block.type === 'simulation') {
    const meta = getSimulationMeta(block.simulationId);
    if (!meta) return null;
    // The simulation code loads on demand; the title shows straight away.
    const slot = el('div.sim-loading', {}, [el('h3', { text: meta.title }), el('p.text-sm.text-muted', { text: meta.summary })]);
    loadSimulationKit()
      .then(({ getSimulation, simulationPanel }) => slot.replaceWith(simulationPanel(getSimulation(meta.id), { heading: 'h3' })))
      .catch(() => slot.append(el('p.text-sm.text-subtle', { text: 'The simulation could not load. Check your connection and reopen the lesson.' })));
    return el('div.lesson__block.lesson__block--simulation', {}, [
      el('div.row', { style: { marginBottom: '10px', gap: '6px' } }, [icon('compass', { size: 16 }), el('span.text-xs.text-subtle', { text: 'Try it yourself' })]),
      slot
    ]);
  }
  if (block.type === 'callout') {
    return el('div.lesson__callout', {}, [el('p', { text: block.body })]);
  }
  if (block.type === 'figure') {
    return el('div.lesson__block', {}, [
      block.title ? el('h3', { text: block.title }) : null,
      figureWidget(block.figure),
      block.body ? el('p', { style: { marginTop: '10px' }, text: block.body }) : null
    ]);
  }
  return el('div.lesson__block', {}, [
    block.title ? el('h3', { text: block.title }) : null,
    el('p', { text: block.body })
  ]);
}

/** A single check-for-understanding embedded in a lesson. */
function inlineCheck(question) {
  let response = null;
  let outcome = null;
  const container = el('div.lesson__block', {
    style: { borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border))' }
  });

  function draw() {
    render(container, [
      el('div.row', { style: { marginBottom: '12px' } }, [
        icon('help', { size: 16 }),
        el('span.text-xs.text-subtle', { text: 'Quick check' })
      ]),
      questionCard(question, {
        response,
        setResponse: (value) => {
          response = typeof value === 'function' ? value(response) : value;
          if (requiresFullRerender(question.type)) draw();
          else {
            const checkButton = container.querySelector('.btn');
            if (checkButton) checkButton.disabled = !isResponseComplete(question, response);
          }
        },
        submitted: Boolean(outcome),
        correct: outcome?.correct,
        detail: outcome?.detail || {}
      }),
      outcome
        ? el(
            'div',
            { class: `feedback ${outcome.correct ? 'feedback--correct' : 'feedback--incorrect'}` },
            [
              feedbackHeader({
                correct: outcome.correct,
                xp: outcome.xp,
                masteryDelta: outcome.masteryDelta
              }),
              solutionPanel(question, { showAnswer: !outcome.correct, compact: true })
            ]
          )
        : button('Check', {
            variant: 'soft',
            disabled: !isResponseComplete(question, response),
            onClick: () => {
              const evaluation = evaluateAnswer(question, response);
              const record = recordQuestionAttempt({
                question,
                correct: evaluation.correct,
                hintsUsed: 0,
                timeMs: 0,
                mode: 'learn'
              });
              outcome = { ...evaluation, ...record };
              draw();
            }
          })
    ]);
  }

  draw();
  return container;
}

/* --------------------------- formula level --------------------------- */

function formulaLevelBriefing(level, topic) {
  const formulas = level.formulaIds?.length
    ? formulaRepository.getByIds(level.formulaIds)
    : formulaRepository.getByTopic(topic.id);
  const criteria = getPassCriteria(level);

  const root = el('div.lesson', {}, [
    breadcrumbs([
      { label: 'Topics', href: '/topics' },
      { label: topic.name, href: `/topics/${topic.id}` },
      { label: level.title }
    ]),
    el('div', {}, [
      el('div.row.row--wrap', { style: { gap: '8px', marginBottom: '8px' } }, [
        badge(LEVEL_TYPE_META.formula_revision.label, 'accent'),
        badge(`${formulas.length} cards`, 'outline'),
        badge(`~${level.estimatedMinutes} min`, 'outline')
      ]),
      el('h1', { text: level.title }),
      el('p.text-muted', { style: { marginTop: '6px' }, text: level.description })
    ]),
    el('div.lesson__block', {}, [
      el('h3', { text: 'How this works' }),
      el('p', {
        text: 'You will see a prompt first. Try to state the formula out loud or on paper before revealing it — the effort of recalling is what builds the memory. Then rate yourself honestly; cards you find hard come back sooner.'
      }),
      criteria.minimumRecalled
        ? el('p.text-sm.text-subtle', {
            style: { marginTop: '10px' },
            text: `To complete this level, mark at least ${criteria.minimumRecalled} cards as known.`
          })
        : null
    ]),
    el(
      'div.grid.grid--cards',
      {},
      formulas.slice(0, 6).map((formula) =>
        el('div.card', {}, [
          el('div.text-xs.text-subtle', { text: formula.title }),
          el('div.text-sm', { style: { marginTop: '6px' }, text: formula.prompt })
        ])
      )
    ),
    el('div.row.row--wrap', { style: { gap: '10px', marginTop: '8px' } }, [
      button('Start recall session', {
        variant: 'primary',
        size: 'lg',
        iconName: 'cards',
        onClick: () => navigate(`/revise/${topic.id}?mode=recall&level=${level.id}`)
      }),
      linkButton('Just browse the cards', `/revise/${topic.id}?mode=browse`, { variant: 'ghost' })
    ])
  ]);

  return { element: root, title: level.title };
}

/* --------------------------- practice level --------------------------- */

function practiceLevelBriefing(level, topic, status) {
  const questions = questionRepository.getByLevel(level.id);
  const meta = LEVEL_TYPE_META[level.type] || { label: level.type, icon: 'play' };
  const criteria = getPassCriteria(level);
  const state = getLevelState(level.id);
  let timed = false;

  if (!questions.length) {
    return {
      title: level.title,
      element: emptyState({
        title: 'No questions here yet',
        body: 'This level has no questions authored against it.',
        iconName: 'help',
        action: linkButton(`Back to ${topic.name}`, `/topics/${topic.id}`, { variant: 'primary' })
      })
    };
  }

  const start = () => {
    const session = buildLevelSession(level, { timed });
    if (!session) return;
    setActiveSession(session);
    navigate('/quiz');
  };

  const timedToggle = level.timerSecondsPerQuestion
    ? el(
        'button',
        {
          type: 'button',
          class: 'chip',
          'aria-pressed': 'false',
          on: {
            click: (event) => {
              timed = !timed;
              event.currentTarget.setAttribute('aria-pressed', String(timed));
            }
          }
        },
        [icon('clock', { size: 14 }), ` Timed (${level.timerSecondsPerQuestion}s per question)`]
      )
    : null;

  const root = el('div.lesson', {}, [
    breadcrumbs([
      { label: 'Topics', href: '/topics' },
      { label: topic.name, href: `/topics/${topic.id}` },
      { label: level.title }
    ]),
    el('div', {}, [
      el('div.row.row--wrap', { style: { gap: '8px', marginBottom: '8px' } }, [
        badge(meta.label, meta.tone),
        difficultyBadge(level.difficulty),
        badge(`${plural(questions.length, 'question')}`, 'outline'),
        badge(`~${level.estimatedMinutes} min`, 'outline'),
        status === 'completed' ? badge('Completed', 'success', { icon: 'check' }) : null
      ]),
      el('h1', { text: level.title }),
      el('p.text-muted', { style: { marginTop: '6px' }, text: level.description })
    ]),

    el('div.lesson__block', {}, [
      el('h3', { text: 'What counts as passing' }),
      el('p', {
        text: `Answer at least ${Math.min(
          criteria.minimumQuestionsAttempted,
          questions.length
        )} questions with ${criteria.minimumAccuracy}% accuracy. Hints are available and only reduce XP slightly — using one is better than guessing.`
      }),
      state?.attempts
        ? el('p.text-sm.text-subtle', {
            style: { marginTop: '10px' },
            text: `Attempted ${plural(state.attempts, 'time')} · best accuracy ${state.bestAccuracy}%`
          })
        : null
    ]),

    el('section', {}, [
      sectionHead('You will practise'),
      el(
        'div.row.row--wrap',
        {},
        Array.from(new Set(questions.map((q) => q.type))).map((type) =>
          badge(type.replace(/_/g, ' '), 'outline')
        )
      )
    ]),

    el('div.row.row--wrap', { style: { gap: '10px', marginTop: '18px' } }, [
      button(status === 'completed' ? 'Practise again' : 'Start level', {
        variant: 'primary',
        size: 'lg',
        iconName: 'play',
        onClick: start
      }),
      timedToggle,
      linkButton('Back to topic', `/topics/${topic.id}`, { variant: 'ghost' })
    ])
  ]);

  return { element: root, title: level.title };
}
