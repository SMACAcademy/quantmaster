/**
 * The puzzle of the week: one short question for everyone, the same all week.
 * Answer it here, then compare methods on GitHub Discussions or send it to a friend.
 * Whether you solved it is kept in this browser only.
 */

import { el, render } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { readJSON, writeJSON } from '../utils/storage.js';
import { emit, EVENTS } from '../app/eventBus.js';
import { COMMUNITY, checkPuzzleAnswer, newDiscussionUrl, weeklyPuzzle } from '../app/community.js';
import { button } from './ui.js';

const STORE_KEY = 'quantmaster:v1:puzzles';
const external = { target: '_blank', rel: 'noopener noreferrer' };

const readState = () => readJSON(STORE_KEY, {}) || {};
function saveState(id, patch) {
  const all = readState();
  all[id] = { ...(all[id] || {}), ...patch };
  writeJSON(STORE_KEY, all);
  return all[id];
}

/** The site's own address, for links people share. */
function siteUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

export function puzzleTitle(number, puzzle) {
  return `Puzzle of the week #${number}: ${puzzle.hook}`;
}

async function challengeFriend(number, puzzle) {
  const text = `QuantMaster puzzle of the week #${number}\n${puzzle.hook}\n\n${puzzle.question}\n\nCan you solve it? Check your answer here:`;
  const url = siteUrl();
  if (navigator.share) {
    try {
      await navigator.share({ title: 'QuantMaster puzzle', text, url });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    emit(EVENTS.toast, { title: 'Puzzle copied', body: 'Paste it to a friend or a study group. The answer is not included.', variant: 'success' });
  } catch (_) {
    emit(EVENTS.toast, { title: 'Could not share from this browser', variant: 'warning' });
  }
}

export function puzzleCard({ now = Date.now() } = {}) {
  const { number, puzzle } = weeklyPuzzle(now);
  if (!puzzle) return null;
  let state = readState()[puzzle.id] || {};
  let showHint = false;

  const body = el('div.puzzle__body');
  const card = el('section.card.puzzle', { 'aria-labelledby': 'puzzle-title' }, [
    el('div.row', { style: { alignItems: 'flex-start' } }, [
      el('div.action-tile__icon', {}, [icon('trophy', { size: 20 })]),
      el('div', { style: { flex: 1, minWidth: 0 } }, [
        el('div.text-xs.text-subtle', { text: `Puzzle of the week #${number} · same for everyone` }),
        el('h2#puzzle-title.puzzle__hook', { text: puzzle.hook })
      ])
    ]),
    body
  ]);

  const discussUrl = () =>
    newDiscussionUrl(
      'q-a',
      puzzleTitle(number, puzzle),
      `> ${puzzle.question}\n\nMy method:\n\n1. \n\nPuzzle from ${siteUrl()}`
    );

  function draw() {
    const solved = Boolean(state.solved);
    const revealed = solved || Boolean(state.revealed);
    const input = el('input.input.puzzle__input', {
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      placeholder: puzzle.unit ? `Your answer (${puzzle.unit})` : 'Your answer',
      'aria-label': 'Your answer'
    });
    const feedback = el('p.puzzle__feedback', { role: 'status' });

    const check = () => {
      if (!input.value.trim()) return input.focus();
      const tries = (state.tries || 0) + 1;
      if (checkPuzzleAnswer(puzzle, input.value)) {
        state = saveState(puzzle.id, { solved: true, tries, solvedAt: new Date().toISOString() });
        draw();
      } else {
        state = saveState(puzzle.id, { tries });
        feedback.textContent = tries === 1 ? 'Not quite. Try again, or take a hint.' : `Not yet (${tries} tries). The hint helps.`;
        feedback.className = 'puzzle__feedback is-wrong';
        input.select();
      }
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') check();
    });

    render(body, [
      el('p.puzzle__question', { text: puzzle.question }),
      solved
        ? el('p.puzzle__feedback.is-right', {
            text: `Solved: ${puzzle.answer}${puzzle.unit ? ` ${puzzle.unit}` : ''}${state.tries > 1 ? ` (in ${state.tries} tries)` : ' on the first try'}. Did you do it the quick way?`
          })
        : el('div.puzzle__answer', {}, [
            input,
            button('Check', { variant: 'primary', size: 'sm', onClick: check }),
            showHint || revealed
              ? null
              : button('Hint', {
                  variant: 'ghost',
                  size: 'sm',
                  iconName: 'lightbulb',
                  onClick: () => {
                    showHint = true;
                    draw();
                  }
                })
          ]),
      solved ? null : feedback,
      showHint && !revealed ? el('p.puzzle__hint', {}, [el('b', { text: 'Hint: ' }), puzzle.hint]) : null,
      revealed
        ? el('div.puzzle__method', {}, [
            el('div.solution__label', { text: 'One way to solve it' }),
            el('ol.solution-steps', {}, puzzle.method.map((step) => el('li', {}, [el('span', { text: step })])))
          ])
        : null,
      el('div.row.row--wrap.puzzle__actions', {}, [
        el('a.btn.btn--soft.btn--sm', { href: discussUrl(), ...external }, [
          icon('help', { size: 16 }),
          el('span', { text: solved ? 'Share your method' : 'Discuss it' })
        ]),
        button('Challenge a friend', { variant: 'ghost', size: 'sm', iconName: 'upload', onClick: () => challengeFriend(number, puzzle) }),
        puzzle.simulationId
          ? el('a.btn.btn--ghost.btn--sm', { href: `#/explore/${puzzle.simulationId}` }, [icon('compass', { size: 16 }), el('span', { text: 'See it move' })])
          : null,
        !revealed && (state.tries || 0) >= 2
          ? button('Show the method', {
              variant: 'ghost',
              size: 'sm',
              onClick: () => {
                state = saveState(puzzle.id, { revealed: true });
                draw();
              }
            })
          : null
      ]),
      el('p.text-xs.text-subtle', {}, [
        'A new puzzle every Monday. ',
        el('a', { href: COMMUNITY.puzzles, ...external, text: 'See how others solved it' }),
        ' (GitHub; a free account is needed to post).'
      ])
    ]);
  }

  draw();
  return card;
}
