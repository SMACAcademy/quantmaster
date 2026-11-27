/**
 * Formula revision — five modes, all built on active recall rather than reading.
 *
 * browse       : free flip-through, no scheduling pressure
 * recall       : prompt first, self-assess after revealing (default)
 * recognition  : pick the correct formula from lookalikes
 * application  : given a situation, choose the formula that applies
 * weak         : only the formulas you keep forgetting
 *
 * Any mode can be limited to one kind of card, formulas or shortcuts. For reading
 * everything at a glance instead (before an exam), see QuickSheetView.
 */

import { el, render } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { plural, shuffle } from '../utils/format.js';
import { navigate } from '../app/router.js';
import {
  badge,
  button,
  emptyState,
  linkButton,
  progressBar,
  segmented,
  statTile
} from '../components/ui.js';
import { createFormulaCard } from '../components/FormulaCard.js';
import {
  formulaRepository,
  levelRepository,
  topicRepository
} from '../repositories/contentRepository.js';
import { buildFormulaQueue, getFormulaStats } from '../services/sessionBuilder.js';
import {
  completeLevelAttempt,
  recordFormulaReview,
  recordFormulaSessionComplete
} from '../services/learningEngine.js';
import { getAllFormulaReviews } from '../repositories/progressRepository.js';
import { celebrate } from '../components/Celebration.js';
import { ensureAllContent, ensureTopicContent } from '../services/contentGate.js';
import { sheetPath } from './QuickSheetView.js';

const MODES = [
  { id: 'recall', label: 'Recall' },
  { id: 'recognition', label: 'Recognise' },
  { id: 'application', label: 'Apply' },
  { id: 'browse', label: 'Browse' },
  { id: 'weak', label: 'Weak' }
];

const KINDS = [
  { id: 'all', label: 'All cards' },
  { id: 'formula', label: 'Formulas' },
  { id: 'shortcut', label: 'Shortcuts' }
];
const KIND_WORDS = { all: 'formulas', formula: 'formulas', shortcut: 'shortcuts' };

export async function FormulaRevisionView(ctx) {
  // Flashcard text lives in the topic packs.
  await (ctx.params.topicId ? ensureTopicContent(ctx.params.topicId) : ensureAllContent());
  const topicId = ctx.params.topicId || ctx.query.topic || null;
  const topic = topicId ? topicRepository.getById(topicId) : null;
  // When launched from a formula_revision level, the deck is scoped to that level.
  const level = ctx.query.level ? levelRepository.getById(ctx.query.level) : null;
  let mode = MODES.some((m) => m.id === ctx.query.mode) ? ctx.query.mode : 'recall';
  // A level decides its own cards, so the kind filter only applies outside one.
  let kind = !level && ['formula', 'shortcut'].includes(ctx.query.kind) ? ctx.query.kind : 'all';
  const kindFilter = () => (kind === 'all' ? null : kind);

  let queue = [];
  let index = 0;
  let activeCard = null;
  const session = { reviewed: 0, known: 0, practice: 0, recallCorrect: 0 };

  const stage = el('div.revision-stage');
  const root = el('div', {}, [stage]);

  function loadQueue() {
    queue =
      level?.formulaIds?.length && mode !== 'weak'
        ? formulaRepository.getByIds(level.formulaIds)
        : buildFormulaQueue({ topicId, mode, limit: 20, kind: kindFilter() });
    index = 0;
    session.reviewed = 0;
    session.known = 0;
    session.practice = 0;
    session.recallCorrect = 0;
  }

  function setMode(next) {
    mode = next;
    updateAddress();
  }

  function setKind(next) {
    kind = next;
    updateAddress();
  }

  /** Keep the address in step with the mode and kind; the router then redraws the view from it. */
  function updateAddress() {
    const query = new URLSearchParams({ mode });
    if (kind !== 'all') query.set('kind', kind);
    if (level) query.set('level', level.id);
    navigate(`${topicId ? `/revise/${topicId}` : '/revise'}?${query}`, { replace: true });
  }

  function header() {
    const stats = getFormulaStats({ topicId, kind: kindFilter() });
    const heading = kind === 'shortcut' ? 'Shortcut revision' : 'Formula revision';
    return el('div', { style: { width: '100%' } }, [
      level
        ? null
        : el('div.row.row--wrap', { style: { marginBottom: '12px', justifyContent: 'space-between' } }, [
            segmented(KINDS, kind, setKind),
            el('div.row', { style: { gap: '4px' } }, [
              linkButton('Read as a sheet', sheetPath({ kind: kind === 'shortcut' ? 'shortcut' : 'formula', topicId }), {
                variant: 'ghost',
                size: 'sm',
                iconName: 'book'
              }),
              linkButton('Tables and drills', '/tables', { variant: 'ghost', size: 'sm', iconName: 'bolt' })
            ])
          ]),
      el('div.row.row--wrap', { style: { marginBottom: '12px' } }, [
        el('div', { style: { flex: '1', minWidth: '180px' } }, [
          el('h1', { text: topic ? `${topic.name} ${KIND_WORDS[kind]}` : heading }),
          el('p.text-sm.text-muted', {
            text: `${stats.due} due · ${stats.new} new · ${stats.retained} retained of ${stats.total}`
          })
        ]),
        segmented(MODES, mode, setMode)
      ]),
      el('p.text-sm.text-subtle', { text: modeDescription(mode) })
    ]);
  }

  function progressRow() {
    return el('div.revision-progress', {}, [
      el('div.progress__label', {}, [
        el('span', { text: `${Math.min(index + 1, queue.length)} of ${queue.length}` }),
        el('span', { text: `${session.known} known · ${session.practice} to practise` })
      ]),
      progressBar((index / Math.max(queue.length, 1)) * 100, { size: 'sm' })
    ]);
  }

  function advance() {
    index += 1;
    draw();
  }

  function rateCard(formula, grade) {
    recordFormulaReview({ formula, grade });
    session.reviewed += 1;
    if (grade === 'good' || grade === 'easy') session.known += 1;
    else session.practice += 1;
    advance();
  }

  /* ----------------------------- card modes ----------------------------- */

  function drawCardMode() {
    const formula = queue[index];
    const card = createFormulaCard(formula, { onRate: (grade) => rateCard(formula, grade) });
    activeCard = card;

    const reviewState = getAllFormulaReviews()[formula.id];

    render(stage, [
      header(),
      progressRow(),
      el('div.row.row--wrap', { style: { width: '100%', justifyContent: 'center' } }, [
        reviewState?.status ? badge(reviewState.status, statusTone(reviewState.status)) : badge('new', 'outline'),
        reviewState?.reviewCount
          ? badge(`${reviewState.reviewCount} reviews`, 'outline')
          : null,
        reviewState?.confidence ? badge(`${reviewState.confidence}% recall`, 'outline') : null
      ]),
      card.element,
      mode === 'browse'
        ? el('div.revision-controls', {}, [
            button('Previous', {
              iconName: 'arrowLeft',
              disabled: index === 0,
              onClick: () => {
                index = Math.max(0, index - 1);
                draw();
              }
            }),
            button('Flip', { variant: 'soft', iconName: 'refresh', onClick: () => card.flip() }),
            button('Next', {
              iconName: 'arrowRight',
              onClick: advance
            })
          ])
        : el('div.revision-controls', {}, [
            button('Need practice', {
              iconName: 'refresh',
              onClick: () => card.rate('again', 'left')
            }),
            button('Reveal', { variant: 'soft', iconName: 'eye', onClick: () => card.flip() }),
            button('I know this', {
              variant: 'success',
              iconName: 'check',
              onClick: () => card.rate('good', 'right')
            })
          ]),
      el('div.row', { style: { justifyContent: 'center', gap: '14px', flexWrap: 'wrap' } }, [
        el('span.keyhint', {}, [el('kbd', { text: 'Space' }), 'flip']),
        el('span.keyhint', {}, [el('kbd', { text: '←' }), 'need practice']),
        el('span.keyhint', {}, [el('kbd', { text: '→' }), 'know it']),
        el('span.text-xs.text-subtle', { text: 'or swipe the card' })
      ])
    ]);
    card.focus();
  }

  /* -------------------------- question modes -------------------------- */

  function drawQuestionMode() {
    const formula = queue[index];
    const distractors = formulaRepository.getDistractors(formula, 3);
    const options = shuffle(
      [
        { id: formula.id, text: formula.formula, correct: true },
        ...distractors.map((d) => ({ id: d.id, text: d.formula, correct: false }))
      ],
      formula.id.length * 11
    );

    const promptText =
      mode === 'application'
        ? formula.applicationPrompt || `Which formula applies here? (${formula.title})`
        : formula.prompt || formula.title;

    let answered = false;

    const optionsList = el(
      'ul.options',
      { role: 'radiogroup' },
      options.map((option, i) =>
        el('li', {}, [
          el(
            'button',
            {
              type: 'button',
              class: 'option',
              role: 'radio',
              'aria-checked': 'false',
              on: {
                click: (event) => {
                  if (answered) return;
                  answered = true;
                  const correct = option.correct;
                  recordFormulaReview({
                    formula,
                    grade: correct ? 'good' : 'again',
                    wasRecallQuestion: true,
                    correct
                  });
                  session.reviewed += 1;
                  if (correct) {
                    session.known += 1;
                    session.recallCorrect += 1;
                  } else {
                    session.practice += 1;
                  }
                  markOptions(optionsList, options, event.currentTarget, correct);
                  revealAnswerPanel(formula, correct);
                }
              }
            },
            [
              el('span.option__key', { text: ['A', 'B', 'C', 'D'][i] }),
              el('span.option__text', { text: option.text }),
              el('span.option__mark')
            ]
          )
        ])
      )
    );

    const answerSlot = el('div');

    function revealAnswerPanel(current, correct) {
      render(answerSlot, [
        el('div', { class: `feedback ${correct ? 'feedback--correct' : 'feedback--incorrect'}` }, [
          el('div.feedback__head', {}, [
            el('div.feedback__icon', {}, [icon(correct ? 'check' : 'refresh', { size: 18 })]),
            el('div', {}, [
              el('div.feedback__title', { text: correct ? 'Correct' : current.title }),
              el('div.feedback__sub', { text: current.explanation })
            ])
          ]),
          current.example ? el('div.flashcard__example', { text: current.example }) : null,
          current.commonMistake
            ? el('div.flashcard__mistake', { text: `Common mistake: ${current.commonMistake}` })
            : null,
          button(index >= queue.length - 1 ? 'Finish' : 'Next formula', {
            variant: 'primary',
            iconName: 'arrowRight',
            onClick: advance
          })
        ])
      ]);
      answerSlot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    render(stage, [
      header(),
      progressRow(),
      el('div.card', { style: { width: '100%' } }, [
        el('div.flashcard__eyebrow', {
          text: mode === 'application' ? 'Which formula applies?' : 'Pick the correct formula'
        }),
        el('h2', { style: { marginBlock: '8px 16px' }, text: promptText }),
        optionsList,
        answerSlot
      ])
    ]);
  }

  function markOptions(list, options, chosen, correct) {
    const buttons = Array.from(list.querySelectorAll('.option'));
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (options[i].correct) btn.classList.add('is-correct');
      else if (btn === chosen) btn.classList.add('is-wrong');
      else btn.classList.add('is-muted');
    });
    if (!correct) chosen.classList.add('animate-shake');
  }

  /* ----------------------------- completion ----------------------------- */

  function drawComplete() {
    let levelOutcome = null;
    if (session.reviewed) {
      recordFormulaSessionComplete({
        topicId,
        reviewed: session.reviewed,
        recalledCorrect: session.recallCorrect || session.known
      });
      if (level) {
        levelOutcome = completeLevelAttempt(level.id, {
          recalled: session.known,
          attempted: session.reviewed,
          total: queue.length,
          accuracy: session.reviewed
            ? Math.round((session.known / session.reviewed) * 100)
            : 0
        });
        if (levelOutcome.firstCompletion) celebrate({ intensity: 'low' });
      }
    }

    render(stage, [
      el('div.results__hero', { style: { width: '100%' } }, [
        el('div.achievement-medal', { text: '🧠', style: { fontSize: '34px', width: '72px', height: '72px' } }),
        el('h1', { text: 'Revision complete' }),
        el('p.text-muted', {
          text: `${plural(session.reviewed, 'card')} reviewed${
            session.practice ? ` · ${session.practice} marked for more practice` : ''
          }`
        }),
        levelOutcome
          ? badge(
              levelOutcome.passed ? 'Level complete' : 'Keep going to pass this level',
              levelOutcome.passed ? 'success' : 'warning'
            )
          : null
      ]),
      el('div.stat-grid', { style: { width: '100%' } }, [
        statTile(session.reviewed, 'Reviewed'),
        statTile(session.known, 'Confident', 'success'),
        statTile(session.practice, 'Need practice', session.practice ? 'warning' : '')
      ]),
      el('p.text-sm.text-muted.text-center', {
        text: 'Cards you found hard will come back sooner; the ones you knew are scheduled further out.'
      }),
      el('div.stack', { style: { width: '100%' } }, [
        levelOutcome?.passed && levelOutcome.nextLevel
          ? button(`Next: ${levelOutcome.nextLevel.title}`, {
              variant: 'primary',
              iconName: 'arrowRight',
              onClick: () =>
                navigate(
                  `/topics/${levelOutcome.nextLevel.topicId}/levels/${levelOutcome.nextLevel.id}`
                )
            })
          : null,
        session.practice
          ? button('Practise the hard ones again', {
              variant: levelOutcome?.passed && levelOutcome.nextLevel ? 'soft' : 'primary',
              iconName: 'refresh',
              onClick: () => {
                mode = 'weak';
                loadQueue();
                draw();
              }
            })
          : null,
        button('Apply these in questions', {
          variant: session.practice ? 'soft' : 'primary',
          iconName: 'target',
          onClick: () =>
            navigate(topicId ? `/practice?mode=smart&topic=${topicId}` : '/practice?mode=smart')
        }),
        linkButton('Back to dashboard', '/dashboard', { variant: 'ghost' })
      ])
    ]);
  }

  function draw() {
    if (!queue.length) {
      render(stage, [
        header(),
        emptyState({
          title: mode === 'weak' ? `No weak ${KIND_WORDS[kind]} yet` : kind === 'shortcut' ? 'No shortcut cards here' : 'No formula cards here',
          body:
            mode === 'weak'
              ? 'Cards appear here once you have answered some recall questions incorrectly.'
              : topic
                ? `${topic.name} does not have ${kind === 'shortcut' ? 'shortcut' : 'formula'} cards yet.`
                : 'There are no cards for this selection yet.',
          iconName: 'cards',
          action: button('Switch to all cards', {
            variant: 'soft',
            onClick: () => {
              mode = 'recall';
              navigate('/revise?mode=recall');
            }
          })
        })
      ]);
      return;
    }
    if (index >= queue.length) return drawComplete();
    if (mode === 'recognition' || mode === 'application') drawQuestionMode();
    else drawCardMode();
  }

  function onKeydown(event) {
    if (event.target.matches('input, textarea, select')) return;
    if (mode === 'recognition' || mode === 'application') {
      if (/^[1-4]$/.test(event.key)) {
        const options = stage.querySelectorAll('.option:not(:disabled)');
        const target = options[Number(event.key) - 1];
        if (target) {
          event.preventDefault();
          target.click();
        }
      }
      return;
    }
    if (!activeCard || index >= queue.length) return;
    if (event.key === ' ') {
      event.preventDefault();
      activeCard.flip();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (mode === 'browse') advance();
      else activeCard.rate('good', 'right');
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (mode === 'browse') {
        index = Math.max(0, index - 1);
        draw();
      } else {
        activeCard.rate('again', 'left');
      }
    }
  }

  loadQueue();
  draw();
  document.addEventListener('keydown', onKeydown);

  return {
    element: root,
    title: topic ? `${topic.name} ${KIND_WORDS[kind]}` : kind === 'shortcut' ? 'Shortcut revision' : 'Formula revision',
    cleanup: () => document.removeEventListener('keydown', onKeydown)
  };
}

function modeDescription(mode) {
  return {
    recall: 'Try to state the formula from memory, then reveal and rate yourself honestly.',
    recognition: 'Pick the right formula from similar-looking ones — this is where confusion shows up.',
    application: 'Given a situation, choose the formula that applies before doing any arithmetic.',
    browse: 'Flip through freely. Nothing is scheduled or scored in this mode.',
    weak: 'Only the formulas you have been getting wrong.'
  }[mode];
}

function statusTone(status) {
  return { retained: 'success', learning: 'accent', struggling: 'danger', new: 'outline' }[status] || '';
}
