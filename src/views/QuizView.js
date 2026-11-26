/**
 * The practice/quiz runner.
 *
 * Handles every practice mode: learn, practice, revision, challenge, smart and
 * exam. Mode differences (hints, instant feedback, timer) come from config, not
 * from branching UI code.
 */

import { el, render } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { formatClock } from '../utils/format.js';
import { MISTAKE_TYPES } from '../app/config.js';
import { navigate } from '../app/router.js';
import { getActiveSession, setLastResult, getSettings } from '../app/state.js';
import { emit, EVENTS } from '../app/eventBus.js';
import {
  advance,
  buildResult,
  currentQuestion,
  ensureOutcome,
  isLastQuestion,
  isResponseComplete,
  progressOf,
  revealSolution,
  skipQuestion,
  submitAnswer,
  toggleMarkForReview,
  useHint,
  allowRetry
} from '../services/quizEngine.js';
import {
  completeLevelAttempt,
  completeSession,
  recordFormulaReview,
  setMistakeType
} from '../services/learningEngine.js';
import { levelRepository } from '../repositories/contentRepository.js';
import { questionCard } from '../components/QuestionCard.js';
import { requiresFullRerender } from '../components/questionRenderers.js';
import { conceptHasTemplates, ensureGenerators, generateSimilar } from '../generators/gate.js';
import { hintPanel } from '../components/HintPanel.js';
import { solutionPanel, feedbackHeader } from '../components/SolutionPanel.js';
import { createFormulaCard } from '../components/FormulaCard.js';
import { badge, button, difficultyBadge, progressBar } from '../components/ui.js';
import { confirmDialog } from '../components/Modal.js';
import { celebrate } from '../components/Celebration.js';

export async function QuizView() {
  // "Practise a similar one" needs the generators; they are usually loaded already.
  await ensureGenerators().catch(() => {});
  const session = getActiveSession();
  if (!session) {
    navigate('/practice', { replace: true });
    return { element: el('div'), title: 'Practice' };
  }

  const showTimer = Boolean(session.timerSecondsPerQuestion);
  let phase = session.formulaCards?.length ? 'formulas' : 'questions';
  let formulaIndex = 0;
  let activeFormulaCard = null;
  let response = null;
  let timerId = null;
  let secondsLeft = session.timerSecondsPerQuestion || 0;

  const counter = el('div.quiz__counter');
  const progressSlot = el('div.quiz__progress');
  const timerNode = el('div.quiz__timer', { hidden: !showTimer });
  const body = el('div.quiz__body');
  const stageStrip = el('div.quiz__stage-strip');

  const header = el('header.quiz__header', {}, [
    el('div.quiz__header-row', {}, [
      el(
        'button',
        {
          type: 'button',
          class: 'btn btn--icon btn--ghost btn--sm',
          'aria-label': 'Exit session',
          on: { click: confirmExit }
        },
        [icon('x', { size: 18 })]
      ),
      counter,
      progressSlot,
      timerNode
    ])
  ]);

  const root = el('div.quiz', {}, [header, body]);

  /* ------------------------------ chrome ------------------------------ */

  function updateHeader() {
    if (phase === 'formulas') {
      counter.textContent = `Card ${formulaIndex + 1}/${session.formulaCards.length}`;
      render(progressSlot, [
        progressBar((formulaIndex / session.formulaCards.length) * 100, { size: 'sm' })
      ]);
      return;
    }
    const { answered, total } = progressOf(session);
    counter.textContent = `${session.index + 1}/${total}`;
    render(progressSlot, [progressBar((answered / total) * 100, { size: 'sm' })]);
  }

  /* --------------------------- formula phase --------------------------- */

  function renderFormulaPhase() {
    const formula = session.formulaCards[formulaIndex];
    if (!formula) {
      phase = 'questions';
      renderPhase();
      return;
    }

    const card = createFormulaCard(formula, {
      onRate: (grade) => {
        recordFormulaReview({ formula, grade });
        formulaIndex += 1;
        renderPhase();
      }
    });
    activeFormulaCard = card;

    render(body, [
      el('div.revision-stage', {}, [
        el('div.row', { style: { width: '100%', justifyContent: 'space-between' } }, [
          badge('Warm-up · formula recall', 'accent'),
          el('span.text-xs.text-subtle', {
            text: `${formulaIndex + 1} of ${session.formulaCards.length}`
          })
        ]),
        card.element,
        el('div.revision-controls', {}, [
          button('Need practice', {
            variant: '',
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
        el('div.row', { style: { justifyContent: 'center', gap: '14px' } }, [
          el('span.keyhint', {}, [el('kbd', { text: 'Space' }), 'flip']),
          el('span.keyhint', {}, [el('kbd', { text: '←' }), 'practise']),
          el('span.keyhint', {}, [el('kbd', { text: '→' }), 'know it'])
        ])
      ])
    ]);
    card.focus();
    updateHeader();
  }

  /* --------------------------- question phase --------------------------- */

  function renderQuestionPhase() {
    const question = currentQuestion(session);
    if (!question) return finish();

    const outcome = ensureOutcome(session, question.id);
    const submitted = outcome.submitted;
    const instantFeedback = session.modeConfig.instantFeedback;
    const showFeedback = submitted && instantFeedback;

    render(stageStrip, [
      difficultyBadge(question.difficulty),
      question.generated
        ? badge('Fresh numbers', 'accent', { icon: 'sparkles', title: 'Generated for you — a new variation every time' })
        : question.learningStage
          ? badge(question.learningStage, 'outline')
          : null,
      session.markedForReview.has(question.id) ? badge('Marked', 'warning', { icon: 'flag' }) : null,
      el('span.flex-1'),
      el('span.text-xs.text-subtle', { text: session.title })
    ]);

    const card = questionCard(question, {
      response,
      setResponse: (value) => {
        response = typeof value === 'function' ? value(response) : value;
        // Text inputs and selects keep their own DOM state; re-rendering them
        // mid-entry would steal focus, so only the action bar is refreshed.
        if (requiresFullRerender(question.type)) renderQuestionPhase();
        else refreshSubmitState(question);
      },
      submitted,
      correct: outcome.correct,
      detail: outcome.detail
    });

    const canSubmit = isResponseComplete(question, response);

    const actions = el('div.quiz__actions', {}, [
      submitted && instantFeedback
        ? button(isLastQuestion(session) ? 'Finish session' : 'Next question', {
            variant: 'primary',
            iconName: 'arrowRight',
            onClick: goNext
          })
        : button('Submit answer', {
            variant: 'primary',
            iconName: 'check',
            disabled: !canSubmit,
            onClick: onSubmit
          }),
      !submitted
        ? button('Skip', {
            variant: 'ghost',
            onClick: () => {
              skipQuestion(session);
              response = null;
              renderPhase();
            }
          })
        : null,
      !submitted
        ? el(
            'button',
            {
              type: 'button',
              class: 'btn btn--icon btn--ghost',
              'aria-label': 'Mark for review',
              'aria-pressed': String(session.markedForReview.has(question.id)),
              on: {
                click: () => {
                  toggleMarkForReview(session, question.id);
                  renderQuestionPhase();
                }
              }
            },
            [icon('flag', { size: 17 })]
          )
        : null
    ]);

    render(body, [
      stageStrip,
      card,
      !submitted && session.modeConfig.hints && (question.hints?.length || question.explanation)
        ? hintPanel(question, {
            revealed: outcome.hintsUsed,
            onReveal: () => useHint(session, question.id),
            onShowSolution: () => {
              revealSolution(session, question.id);
              renderQuestionPhase();
            }
          })
        : null,
      outcome.revealedSolution && !submitted
        ? el('div.feedback', {}, [
            el('div.feedback__head', {}, [
              el('div.feedback__icon', {}, [icon('book', { size: 18 })]),
              el('div', {}, [
                el('div.feedback__title', { text: 'Worked solution' }),
                el('div.feedback__sub', {
                  text: 'Read it through, then answer to lock the method in.'
                })
              ])
            ]),
            solutionPanel(question, { showAnswer: false })
          ])
        : null,
      showFeedback ? feedbackBlock(question, outcome) : null,
      actions
    ]);

    updateHeader();
    startTimer();
  }

  /**
   * After a wrong answer, offer the same idea with new numbers — the fastest way
   * to check the explanation actually landed. Inserted as the next question.
   */
  function similarQuestionButton(question, outcome) {
    if (outcome.similarAdded || !conceptHasTemplates(question.conceptId)) return null;
    return button('Try a similar question', {
      variant: 'soft',
      size: 'sm',
      iconName: 'sparkles',
      onClick: () => {
        const similar = generateSimilar(question);
        if (!similar) {
          emit(EVENTS.toast, { title: 'No variation available right now', variant: 'warning' });
          return;
        }
        outcome.similarAdded = true;
        session.questions.splice(session.index + 1, 0, similar);
        goNext();
      }
    });
  }

  function refreshSubmitState(question) {
    const submitButton = body.querySelector('.quiz__actions .btn--primary');
    if (submitButton) submitButton.disabled = !isResponseComplete(question, response);
  }

  function feedbackBlock(question, outcome) {
    const wrapper = el(
      'div',
      { class: `feedback ${outcome.correct ? 'feedback--correct' : 'feedback--incorrect'}` },
      [
        feedbackHeader({
          correct: outcome.correct,
          xp: outcome.xp,
          wasPreviouslyWrong: outcome.correctedMistake,
          masteryDelta: outcome.masteryDelta
        }),
        solutionPanel(question, { showAnswer: !outcome.correct }),
        !outcome.correct ? mistakeTagger(question) : null,
        !outcome.correct
          ? el('div.row.row--wrap', { style: { gap: '8px' } }, [
              outcome.attempts < 2
                ? button('Try it again', {
                    variant: 'soft',
                    size: 'sm',
                    iconName: 'refresh',
                    onClick: () => {
                      allowRetry(session, question.id);
                      response = null;
                      renderQuestionPhase();
                    }
                  })
                : null,
              similarQuestionButton(question, outcome)
            ])
          : null
      ]
    );
    if (!outcome.correct) wrapper.classList.add('animate-shake');
    return wrapper;
  }

  function mistakeTagger(question) {
    return el('div', {}, [
      el('div.solution__label', { text: 'What went wrong? (optional)' }),
      el(
        'div.mistake-tags',
        {},
        MISTAKE_TYPES.map((type) =>
          el(
            'button',
            {
              type: 'button',
              class: 'chip',
              'aria-pressed': 'false',
              on: {
                click: (event) => {
                  setMistakeType(question.id, type.id);
                  const group = event.currentTarget.parentElement;
                  group
                    .querySelectorAll('.chip')
                    .forEach((chip) =>
                      chip.setAttribute('aria-pressed', String(chip === event.currentTarget))
                    );
                }
              }
            },
            [type.label]
          )
        )
      )
    ]);
  }

  /* ------------------------------ actions ------------------------------ */

  function onSubmit() {
    const question = currentQuestion(session);
    if (!question || !isResponseComplete(question, response)) return;
    stopTimer();
    const outcome = submitAnswer(session, response);

    if (!session.modeConfig.instantFeedback) {
      response = null;
      if (!advance(session)) return finish();
      renderPhase();
      return;
    }

    if (outcome.correctedMistake) {
      emit(EVENTS.toast, {
        title: 'Mistake corrected',
        body: 'You got this one wrong before. That is real progress.',
        variant: 'success'
      });
    }
    renderQuestionPhase();
  }

  function goNext() {
    response = null;
    if (!advance(session)) return finish();
    renderPhase();
  }

  function finish() {
    stopTimer();
    const result = buildResult(session);
    completeSession(result);

    if (session.source?.type === 'level' && session.source.levelId) {
      const { passed, firstCompletion, nextLevel } = completeLevelAttempt(
        session.source.levelId,
        result
      );
      result.levelPassed = passed;
      result.levelFirstCompletion = firstCompletion;
      result.nextLevel = nextLevel;
      result.level = levelRepository.getById(session.source.levelId);
      if (firstCompletion) celebrate({ intensity: 'medium' });
    }

    setLastResult(result);
    navigate('/results', { replace: true });
  }

  function confirmExit() {
    const { answered } = progressOf(session);
    if (!answered || !getSettings().confirmBeforeExit) {
      navigate(session.returnTo || '/');
      return;
    }
    confirmDialog({
      title: 'Leave this session?',
      message:
        'Your answers so far are already saved, but the session summary will not be shown.',
      confirmLabel: 'Leave',
      cancelLabel: 'Keep practising',
      danger: true,
      onConfirm: () => navigate(session.returnTo || '/')
    });
  }

  /* ------------------------------ timer ------------------------------ */

  function startTimer() {
    stopTimer();
    if (!showTimer) return;
    const outcome = ensureOutcome(session, currentQuestion(session).id);
    if (outcome.submitted) {
      timerNode.textContent = '';
      return;
    }
    secondsLeft = session.timerSecondsPerQuestion;
    paintTimer();
    timerId = setInterval(() => {
      secondsLeft -= 1;
      paintTimer();
      if (secondsLeft <= 0) {
        stopTimer();
        const question = currentQuestion(session);
        if (isResponseComplete(question, response)) onSubmit();
        else {
          skipQuestion(session);
          response = null;
          renderPhase();
        }
      }
    }, 1000);
  }

  function paintTimer() {
    timerNode.textContent = formatClock(Math.max(0, secondsLeft));
    timerNode.classList.toggle('is-warning', secondsLeft <= 10);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  /* ---------------------------- keyboard ---------------------------- */

  function onKeydown(event) {
    if (event.target.matches('input, textarea, select')) return;

    if (phase === 'formulas') {
      if (!activeFormulaCard) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        activeFormulaCard.rate('good', 'right');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        activeFormulaCard.rate('again', 'left');
      } else if (event.key === ' ') {
        event.preventDefault();
        activeFormulaCard.flip();
      }
      return;
    }

    const question = currentQuestion(session);
    if (!question) return;
    const outcome = ensureOutcome(session, question.id);

    if (event.key === 'Enter') {
      event.preventDefault();
      if (outcome.submitted && session.modeConfig.instantFeedback) goNext();
      else if (isResponseComplete(question, response)) onSubmit();
      return;
    }

    if (!outcome.submitted && /^[1-6]$/.test(event.key) && question.options?.length) {
      const index = Number(event.key) - 1;
      const option = question.options[index];
      if (!option) return;
      event.preventDefault();
      if (question.type === 'multiple_choice') {
        const current = Array.isArray(response) ? response : [];
        response = current.includes(option.id)
          ? current.filter((id) => id !== option.id)
          : [...current, option.id];
      } else {
        response = option.id;
      }
      renderQuestionPhase();
      return;
    }

    if (event.key.toLowerCase() === 'h' && !outcome.submitted && session.modeConfig.hints) {
      const hintButton = body.querySelector('.hint-panel .btn--soft');
      if (hintButton) {
        event.preventDefault();
        hintButton.click();
      }
    }
  }

  function renderPhase() {
    if (phase === 'formulas') renderFormulaPhase();
    else renderQuestionPhase();
  }

  document.addEventListener('keydown', onKeydown);
  renderPhase();

  return {
    element: root,
    title: session.title,
    focusMode: true,
    cleanup: () => {
      stopTimer();
      document.removeEventListener('keydown', onKeydown);
    }
  };
}
