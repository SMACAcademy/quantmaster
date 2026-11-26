/**
 * Formula flashcard: tap/click or Space to flip, drag or arrow keys to rate.
 *
 * Swiping is an accelerator, never the only route — every gesture has a button
 * and a keyboard equivalent, and the card exposes its state to screen readers.
 */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { prefersReducedMotion } from '../app/state.js';
import { conceptRepository, topicRepository } from '../repositories/contentRepository.js';

const SWIPE_THRESHOLD = 110;

function frontFace(formula, topic, concept) {
  return el('div.flashcard__face.flashcard__face--front', {}, [
    el('div.flashcard__eyebrow', {
      text: concept?.name || topic?.name || 'Formula'
    }),
    el('div.flashcard__prompt', { text: formula.prompt || formula.title }),
    el('div.flashcard__hint-tap', {}, [icon('eye', { size: 15 }), 'Recall it first, then reveal'])
  ]);
}

function backFace(formula) {
  return el('div.flashcard__face.flashcard__face--back', {}, [
    el('div.flashcard__eyebrow', { text: formula.title }),
    el('div.flashcard__formula', { text: formula.formula }),
    formula.variables?.length
      ? el('div.flashcard__section', {}, [
          el('h4', { text: 'Where' }),
          el(
            'ul.flashcard__vars',
            {},
            formula.variables.map((v) =>
              el('li', {}, [el('b', { text: v.symbol }), el('span', { text: v.meaning })])
            )
          )
        ])
      : null,
    formula.explanation
      ? el('div.flashcard__section', {}, [
          el('h4', { text: 'Why it works' }),
          el('p', { text: formula.explanation })
        ])
      : null,
    formula.example ? el('div.flashcard__example', { text: formula.example }) : null,
    formula.commonMistake
      ? el('div.flashcard__mistake', { text: `Common mistake: ${formula.commonMistake}` })
      : null
  ]);
}

/**
 * @param {object} formula
 * @param {object} options
 * @param {(grade:'again'|'good') => void} options.onRate
 * @param {(flipped:boolean) => void} [options.onFlipChange]
 */
export function createFormulaCard(formula, { onRate, onFlipChange } = {}) {
  const topic = topicRepository.getById(formula.topicId);
  const concept = formula.conceptId ? conceptRepository.getById(formula.conceptId) : null;

  let flipped = false;
  let dragging = false;
  let startX = 0;
  let currentX = 0;

  const knowTag = el('div.flashcard__swipe-tag.flashcard__swipe-tag--know', { text: 'Know it' });
  const practiceTag = el('div.flashcard__swipe-tag.flashcard__swipe-tag--practice', {
    text: 'Practise'
  });

  const card = el(
    'div.flashcard',
    {
      role: 'button',
      tabindex: '0',
      'aria-label': `Formula card: ${formula.prompt || formula.title}. Press Space to reveal.`,
      'aria-pressed': 'false'
    },
    [frontFace(formula, topic, concept), backFace(formula)]
  );

  const deck = el('div.flashcard-deck', {}, [card, knowTag, practiceTag]);

  function setFlipped(next) {
    flipped = next;
    card.classList.toggle('is-flipped', flipped);
    card.setAttribute('aria-pressed', String(flipped));
    card.setAttribute(
      'aria-label',
      flipped
        ? `${formula.title}. ${formula.formula}. Rate your recall with the buttons below.`
        : `Formula card: ${formula.prompt || formula.title}. Press Space to reveal.`
    );
    onFlipChange?.(flipped);
  }

  function toggle() {
    setFlipped(!flipped);
  }

  function resetTransform() {
    card.style.transform = flipped ? 'rotateY(180deg)' : '';
    knowTag.style.opacity = '0';
    practiceTag.style.opacity = '0';
  }

  function animateOut(direction, done) {
    if (prefersReducedMotion()) {
      done?.();
      return;
    }
    card.style.transition = 'transform 320ms var(--ease-out), opacity 320ms ease';
    card.style.transform = `translateX(${direction === 'right' ? 130 : -130}%) rotate(${
      direction === 'right' ? 18 : -18
    }deg)`;
    card.style.opacity = '0';
    setTimeout(() => done?.(), 300);
  }

  function rate(grade, direction) {
    animateOut(direction, () => onRate?.(grade));
  }

  // ---- pointer gestures (mouse + touch via pointer events) ----
  card.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    currentX = 0;
    card.classList.add('is-dragging');
    card.setPointerCapture(event.pointerId);
  });

  card.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    currentX = event.clientX - startX;
    const rotate = currentX / 22;
    card.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)${
      flipped ? ' rotateY(180deg)' : ''
    }`;
    knowTag.style.opacity = String(Math.max(0, Math.min(1, currentX / SWIPE_THRESHOLD)));
    practiceTag.style.opacity = String(Math.max(0, Math.min(1, -currentX / SWIPE_THRESHOLD)));
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    card.classList.remove('is-dragging');
    if (Math.abs(currentX) > SWIPE_THRESHOLD) {
      const direction = currentX > 0 ? 'right' : 'left';
      rate(direction === 'right' ? 'good' : 'again', direction);
    } else {
      resetTransform();
      // A tap (rather than a drag) flips the card.
      if (Math.abs(currentX) < 6) toggle();
    }
    currentX = 0;
  };

  card.addEventListener('pointerup', endDrag);
  card.addEventListener('pointercancel', () => {
    dragging = false;
    card.classList.remove('is-dragging');
    resetTransform();
  });

  card.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggle();
    }
  });

  return {
    element: deck,
    card,
    flip: toggle,
    setFlipped,
    isFlipped: () => flipped,
    rate,
    focus: () => card.focus()
  };
}

/** Static, non-interactive rendering used in solution panels and topic detail. */
export function formulaSummary(formula) {
  return el('div.card', { style: { padding: '14px' } }, [
    el('div.text-xs.text-subtle', { text: formula.title }),
    el('div.formula-inline', { text: formula.formula, style: { marginTop: '6px' } }),
    formula.commonMistake
      ? el('div.text-sm.text-muted', {
          style: { marginTop: '8px' },
          text: `Watch out: ${formula.commonMistake}`
        })
      : null
  ]);
}
