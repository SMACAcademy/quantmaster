/**
 * Taking a mock test, as in the exam hall: one clock for the section, a
 * question palette, free movement, mark for review, and answers that can be
 * changed until the test is submitted (or the time runs out).
 */

import { el, render } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { formatClock } from '../utils/format.js';
import { navigate } from '../app/router.js';
import { emit, EVENTS } from '../app/eventBus.js';
import { button } from '../components/ui.js';
import { confirmDialog } from '../components/Modal.js';
import { questionCard } from '../components/QuestionCard.js';
import { requiresFullRerender } from '../components/questionRenderers.js';
import { analyseAttempt, counts, finishAttempt, goTo, paletteState, setResponse, toggleMark } from '../mock/mockEngine.js';
import { getActiveMock, recordMock, setActiveMock, setLastMockResult } from '../mock/history.js';
import { recordQuestionAttempt, completeSession } from '../services/learningEngine.js';

const STATE_LABEL = {
  'not-visited': 'Not visited',
  'not-answered': 'Not answered',
  answered: 'Answered',
  marked: 'Marked for review',
  'answered-marked': 'Answered and marked'
};

export function MockRunView() {
  const active = getActiveMock();
  if (!active) {
    navigate('/mock', { replace: true });
    return { element: el('div'), title: 'Mock tests' };
  }
  const { pattern, attempt } = active;
  let timerId = null;
  let done = false;

  const clock = el('div.mock__clock', { 'aria-label': 'Time left' });
  const stage = el('div.mock__stage');
  const palette = el('aside.mock__palette', { 'aria-label': 'Question palette' });

  function current() {
    return attempt.items[attempt.current];
  }

  function paintClock() {
    const left = Math.max(0, attempt.endsAt - Date.now());
    clock.textContent = formatClock(Math.ceil(left / 1000));
    clock.classList.toggle('is-warning', left <= 2 * 60 * 1000);
    if (left <= 0) submit({ timedOut: true });
  }

  function drawPalette() {
    const tally = counts(attempt);
    const sections = [];
    attempt.items.forEach((item, index) => {
      if (!sections.length || sections[sections.length - 1].label !== item.section) sections.push({ label: item.section, indexes: [] });
      sections[sections.length - 1].indexes.push(index);
    });
    render(palette, [
      el('div.mock__tally', {}, [
        el('span', { class: 'mock-dot mock-dot--answered', text: String(tally.answered) }),
        el('span.text-xs', { text: 'Answered' }),
        el('span', { class: 'mock-dot mock-dot--not-answered', text: String(tally.notAnswered) }),
        el('span.text-xs', { text: 'Not answered' }),
        el('span', { class: 'mock-dot mock-dot--marked', text: String(tally.marked) }),
        el('span.text-xs', { text: 'Marked' }),
        el('span', { class: 'mock-dot mock-dot--not-visited', text: String(tally.notVisited) }),
        el('span.text-xs', { text: 'Not visited' })
      ]),
      ...sections.map((section) =>
        el('div.mock__palette-section', {}, [
          el('div.text-xs.text-subtle', { text: section.label }),
          el(
            'div.mock__palette-grid',
            {},
            section.indexes.map((index) => {
              const state = paletteState(attempt, attempt.items[index].question);
              return el('button', {
                type: 'button',
                class: `mock-dot mock-dot--${state}${index === attempt.current ? ' is-current' : ''}`,
                text: String(index + 1),
                'aria-label': `Question ${index + 1}: ${STATE_LABEL[state]}`,
                'aria-current': index === attempt.current ? 'step' : null,
                on: { click: () => move(index) }
              });
            })
          )
        ])
      ),
      button('Submit test', { variant: 'primary', iconName: 'check', onClick: () => submit({}) })
    ]);
  }

  function drawQuestion() {
    const { question, section } = current();
    const response = attempt.responses[question.id] ?? null;
    const card = questionCard(question, {
      response,
      setResponse: (value) => {
        const next = typeof value === 'function' ? value(attempt.responses[question.id] ?? null) : value;
        setResponse(attempt, question.id, next);
        if (requiresFullRerender(question.type)) drawQuestion();
        drawPalette();
      },
      submitted: false
    });
    const last = attempt.current === attempt.items.length - 1;
    render(stage, [
      el('div.mock__question-head', {}, [
        el('strong', { text: `Question ${attempt.current + 1} of ${attempt.items.length}` }),
        el('span.text-xs.text-subtle', { text: section }),
        attempt.marked.has(question.id) ? el('span.mock__flag', {}, [icon('flag', { size: 14 }), 'Marked']) : null
      ]),
      card,
      el('div.mock__actions', {}, [
        button('Previous', { iconName: 'arrowLeft', disabled: attempt.current === 0, onClick: () => move(attempt.current - 1) }),
        button(attempt.marked.has(question.id) ? 'Unmark' : 'Mark for review', {
          variant: 'soft',
          iconName: 'flag',
          onClick: () => {
            toggleMark(attempt, question.id);
            drawQuestion();
            drawPalette();
          }
        }),
        button('Clear', {
          variant: 'ghost',
          onClick: () => {
            setResponse(attempt, question.id, null);
            drawQuestion();
            drawPalette();
          }
        }),
        button(last ? 'Review palette' : 'Next', {
          variant: 'primary',
          iconName: 'arrowRight',
          onClick: () => (last ? palette.scrollIntoView({ behavior: 'smooth' }) : move(attempt.current + 1))
        })
      ])
    ]);
  }

  function move(index) {
    goTo(attempt, index);
    drawQuestion();
    drawPalette();
  }

  function submit({ timedOut = false }) {
    if (done) return;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(timerId);
      finishAttempt(attempt);
      const analysis = analyseAttempt(pattern, attempt);
      // Every answer counts towards mastery and the mistakes list, as in any practice.
      for (const row of analysis.rows) {
        if (row.status === 'unanswered') continue;
        recordQuestionAttempt({ question: row.question, correct: row.status === 'correct', timeMs: row.timeMs, sessionId: attempt.id, mode: 'exam' });
      }
      completeSession({
        sessionId: attempt.id,
        finishedAt: new Date(attempt.finishedAt).toISOString(),
        mode: 'exam',
        title: pattern.name,
        total: analysis.total,
        attempted: analysis.attempted,
        correct: analysis.correct,
        accuracy: analysis.accuracy,
        xpEarned: 0,
        source: { type: 'mock', patternId: pattern.id }
      });
      recordMock({
        patternId: pattern.id,
        at: new Date(attempt.finishedAt).toISOString(),
        score: analysis.score,
        maxScore: analysis.maxScore,
        attempted: analysis.attempted,
        correct: analysis.correct,
        wrong: analysis.wrong,
        accuracy: analysis.accuracy,
        usedMs: analysis.usedMs
      });
      setLastMockResult({ pattern, analysis, timedOut });
      setActiveMock(null);
      if (timedOut) emit(EVENTS.toast, { title: 'Time is up', body: 'Your answers were submitted.', variant: 'warning' });
      navigate('/mock/result', { replace: true });
    };
    if (timedOut) return finish();
    const tally = counts(attempt);
    confirmDialog({
      title: 'Submit the test?',
      message: `${tally.answered} answered, ${tally.notAnswered + tally.notVisited} not answered, ${tally.marked} marked for review. You cannot change answers after submitting.`,
      confirmLabel: 'Submit',
      cancelLabel: 'Keep going',
      onConfirm: finish
    });
  }

  function confirmLeave() {
    confirmDialog({
      title: 'Leave the test?',
      message: 'This attempt will be discarded and nothing will be scored.',
      confirmLabel: 'Leave',
      cancelLabel: 'Stay',
      danger: true,
      onConfirm: () => {
        done = true;
        clearInterval(timerId);
        setActiveMock(null);
        navigate('/mock');
      }
    });
  }

  const element = el('div.mock', {}, [
    el('header.mock__bar', {}, [
      el('button', { type: 'button', class: 'btn btn--icon btn--ghost btn--sm', 'aria-label': 'Leave the test', on: { click: confirmLeave } }, [icon('x', { size: 18 })]),
      el('div.mock__title', { text: pattern.name }),
      icon('clock', { size: 16 }),
      clock
    ]),
    el('div.mock__layout', {}, [stage, palette])
  ]);

  drawQuestion();
  drawPalette();
  paintClock();
  timerId = setInterval(paintClock, 500);

  return {
    element,
    title: pattern.name,
    focusMode: true,
    bare: true,
    cleanup: () => clearInterval(timerId)
  };
}
