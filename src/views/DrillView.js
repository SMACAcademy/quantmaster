/**
 * A 60-second speed drill on one must-know table (or all of them): answer as
 * many as you can. A right answer moves straight on; a wrong one shows the
 * answer for a moment. The navigation is hidden while drilling. The best score
 * per table is kept on this device; drills earn no XP.
 */

import { el, render } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { button, emptyState, linkButton, statTile } from '../components/ui.js';
import { getTable } from '../drills/tables.js';
import { DRILL_SECONDS, bestScore, isCorrect, questionStream, recordDrill } from '../drills/drill.js';

const MISS_PAUSE_MS = 900;

export function DrillView(ctx) {
  const table = getTable(ctx.params.tableId);
  if (!table) {
    return {
      title: 'Not found',
      element: emptyState({
        title: 'That drill does not exist',
        body: 'The link may be out of date.',
        iconName: 'bolt',
        action: linkButton('All tables', '/tables', { variant: 'primary' })
      })
    };
  }

  const stage = el('div.drill');
  let timer = null;
  let pause = null;
  let state = null;

  function stop() {
    clearInterval(timer);
    clearTimeout(pause);
    timer = null;
  }

  function intro() {
    const best = bestScore(table.id);
    render(stage, [
      el('div.drill__intro', {}, [
        el('div.drill__badge', {}, [icon('bolt', { size: 28 })]),
        el('h1', { text: table.title }),
        el('p.text-muted', { text: `${DRILL_SECONDS} seconds. Answer as many as you can. Press Enter to submit a typed answer.` }),
        best ? el('p.text-sm.text-subtle', { text: `Your best: ${best.correct} correct out of ${best.attempted}.` }) : null,
        el('div.row.row--wrap', { style: { gap: '10px', justifyContent: 'center' } }, [
          button('Start', { variant: 'primary', size: 'lg', iconName: 'play', onClick: start }),
          linkButton('Back to tables', '/tables', { variant: 'ghost' })
        ])
      ])
    ]);
  }

  function start() {
    const next = questionStream(table.items);
    state = { next, item: next(), correct: 0, attempted: 0, missed: [], endsAt: Date.now() + DRILL_SECONDS * 1000, locked: false };
    draw();
    timer = setInterval(tick, 200);
  }

  function remaining() {
    return Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
  }

  function tick() {
    const clock = stage.querySelector('.drill__clock');
    const fill = stage.querySelector('.drill__time-fill');
    const left = remaining();
    if (clock) clock.textContent = `${left}s`;
    if (fill) fill.style.width = `${(Math.max(0, state.endsAt - Date.now()) / (DRILL_SECONDS * 1000)) * 100}%`;
    if (left <= 0) finish();
  }

  function answer(response) {
    if (state.locked) return;
    const item = state.item;
    state.attempted += 1;
    if (isCorrect(item, response)) {
      state.correct += 1;
      state.item = state.next();
      draw('right');
      return;
    }
    state.missed.push({ prompt: item.prompt, reveal: item.reveal, given: response });
    state.locked = true;
    draw('wrong');
    pause = setTimeout(() => {
      if (!timer) return;
      state.locked = false;
      state.item = state.next();
      draw();
    }, MISS_PAUSE_MS);
  }

  function draw(flash = null) {
    const item = state.item;
    const choice = item.answer.type === 'choice';
    const input = choice
      ? null
      : el('input.input.drill__input', {
          type: 'text',
          inputmode: 'decimal',
          autocomplete: 'off',
          'aria-label': 'Your answer',
          disabled: state.locked,
          on: {
            keydown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (event.target.value.trim()) answer(event.target.value);
              }
            }
          }
        });
    render(stage, [
      el('div.drill__top', {}, [
        el('span.drill__title', { text: table.title }),
        el('span.drill__score', { text: `${state.correct} correct` }),
        el('span.drill__clock', { text: `${remaining()}s`, 'aria-label': 'Seconds left' }),
        button('Stop', { variant: 'ghost', size: 'sm', onClick: finish })
      ]),
      el('div.drill__time', {}, [el('div.drill__time-fill', { style: { width: `${(Math.max(0, state.endsAt - Date.now()) / (DRILL_SECONDS * 1000)) * 100}%` } })]),
      el('div', { class: `drill__card${flash ? ` drill__card--${flash}` : ''}` }, [
        el('div.drill__prompt', { text: item.prompt, 'aria-live': 'polite' }),
        choice
          ? el(
              'div.drill__choices',
              {},
              item.answer.options.map((option, i) =>
                button(option, {
                  variant: 'soft',
                  disabled: state.locked,
                  'aria-keyshortcuts': String(i + 1),
                  onClick: () => answer(option)
                })
              )
            )
          : input,
        flash === 'wrong'
          ? el('div.drill__reveal', { role: 'status' }, [icon('x', { size: 16 }), `Answer: ${state.missed[state.missed.length - 1].reveal}`])
          : el('div.drill__hint.text-xs.text-subtle', { text: choice ? 'Click an answer or press its number.' : 'Type the answer and press Enter.' })
      ])
    ]);
    input?.focus();
  }

  function finish() {
    if (!state || !timer) return;
    stop();
    const newBest = recordDrill(table.id, state);
    const accuracy = state.attempted ? Math.round((state.correct / state.attempted) * 100) : 0;
    const best = bestScore(table.id);
    render(stage, [
      el('div.drill__intro', {}, [
        el('h1', { text: newBest ? 'New best!' : 'Time!' }),
        el('div.stat-grid', { style: { width: '100%' } }, [
          statTile(state.correct, 'Correct', 'success'),
          statTile(state.attempted, 'Attempted'),
          statTile(`${accuracy}%`, 'Accuracy'),
          statTile(best ? best.correct : 0, 'Best')
        ]),
        state.missed.length
          ? el('div.drill__missed', {}, [
              el('h2', { text: 'Worth another look' }),
              el(
                'ul',
                {},
                state.missed.map((miss) => el('li', {}, [el('span', { text: miss.prompt }), el('strong', { text: miss.reveal })]))
              )
            ])
          : null,
        el('div.row.row--wrap', { style: { gap: '10px', justifyContent: 'center' } }, [
          button('Again', { variant: 'primary', iconName: 'refresh', onClick: start }),
          linkButton('Back to tables', '/tables', { variant: 'ghost' })
        ])
      ])
    ]);
  }

  function onKeydown(event) {
    if (!timer || state.locked || state.item.answer.type !== 'choice') return;
    const index = Number(event.key) - 1;
    const option = state.item.answer.options[index];
    if (option !== undefined) {
      event.preventDefault();
      answer(option);
    }
  }

  intro();
  document.addEventListener('keydown', onKeydown);
  return {
    element: el('div.sheet', {}, [stage]),
    title: `${table.title}: drill`,
    focusMode: true,
    bare: true,
    cleanup: () => {
      stop();
      document.removeEventListener('keydown', onKeydown);
    }
  };
}
