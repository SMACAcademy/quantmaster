/**
 * Renderer registry.
 *
 * Adding a question type = register a renderer here and an evaluator in
 * quizEngine. Nothing else in the UI needs to change.
 */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { shuffle } from '../utils/format.js';
import { describeCorrectAnswer } from '../services/quizEngine.js';

const registry = new Map();

/**
 * Types whose markup must be rebuilt when the response changes (selection state
 * lives in the DOM classes). Text inputs and selects hold their own state, so
 * re-rendering them mid-typing would steal focus and reset the caret.
 */
const RERENDER_ON_CHANGE = new Set([
  'single_choice',
  'formula_recognition',
  'formula_selection',
  'method_recognition',
  'statement_evaluation',
  'assertion_reason',
  'identify_error',
  'next_step',
  'estimate',
  'multiple_choice',
  'ordering'
]);

export function requiresFullRerender(type) {
  return RERENDER_ON_CHANGE.has(type);
}

export function registerRenderer(type, renderer) {
  registry.set(type, renderer);
}

export function getRenderer(type) {
  return registry.get(type) || registry.get('single_choice');
}

export function hasRenderer(type) {
  return registry.has(type);
}

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * @typedef {object} RenderContext
 * @property {any} response - current response value
 * @property {(value:any)=>void} setResponse
 * @property {boolean} submitted
 * @property {boolean|null} correct
 * @property {object} detail - evaluator detail for marking individual parts
 * @property {object} question
 */

/* --------------------------- choice (single) --------------------------- */

function optionStateClass({ submitted, isSelected, isCorrectOption }) {
  if (!submitted) return isSelected ? 'is-selected' : '';
  if (isCorrectOption) return 'is-correct';
  if (isSelected) return 'is-wrong';
  return 'is-muted';
}

function renderChoice(ctx) {
  const { question, response, setResponse, submitted } = ctx;
  const correctIds = question.correctAnswer || [];

  return el(
    'ul.options',
    { role: 'radiogroup', 'aria-label': 'Answer options' },
    question.options.map((option, index) => {
      const isSelected = response === option.id;
      const isCorrectOption = submitted && correctIds.includes(option.id);
      const stateClass = optionStateClass({ submitted, isSelected, isCorrectOption });
      return el('li', {}, [
        el(
          'button',
          {
            type: 'button',
            class: `option ${stateClass}`.trim(),
            role: 'radio',
            'aria-checked': String(isSelected),
            disabled: submitted,
            on: { click: () => setResponse(option.id) }
          },
          [
            el('span.option__key', { text: KEYS[index] || String(index + 1) }),
            el('span.option__text', { text: option.text }),
            el('span.option__mark', {}, [
              isCorrectOption
                ? icon('check', { size: 16 })
                : submitted && isSelected
                  ? icon('x', { size: 16 })
                  : null
            ])
          ]
        )
      ]);
    })
  );
}

/* --------------------------- choice (multiple) --------------------------- */

function renderMultiple(ctx) {
  const { question, response, setResponse, submitted } = ctx;
  const selected = Array.isArray(response) ? response : [];
  const correctIds = question.correctAnswer || [];

  return el('div', {}, [
    el('p.text-sm.text-subtle', {
      text: 'Select every correct option.',
      style: { marginBottom: '10px' }
    }),
    el(
      'ul.options',
      { role: 'group', 'aria-label': 'Answer options (multiple)' },
      question.options.map((option, index) => {
        const isSelected = selected.includes(option.id);
        const isCorrectOption = submitted && correctIds.includes(option.id);
        const stateClass = optionStateClass({ submitted, isSelected, isCorrectOption });
        return el('li', {}, [
          el(
            'button',
            {
              type: 'button',
              class: `option ${stateClass}`.trim(),
              role: 'checkbox',
              'aria-checked': String(isSelected),
              disabled: submitted,
              on: {
                click: () =>
                  setResponse(
                    isSelected ? selected.filter((id) => id !== option.id) : [...selected, option.id]
                  )
              }
            },
            [
              el('span.option__key', { text: KEYS[index] || String(index + 1) }),
              el('span.option__text', { text: option.text }),
              el('span.option__mark', {}, [
                isCorrectOption
                  ? icon('check', { size: 16 })
                  : submitted && isSelected
                    ? icon('x', { size: 16 })
                    : null
              ])
            ]
          )
        ]);
      })
    )
  ]);
}

/* --------------------------- numeric --------------------------- */

function renderNumeric(ctx) {
  const { question, response, setResponse, submitted, correct } = ctx;
  const unit = question.answer?.unit || '';
  const input = el('input', {
    class: 'input',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    placeholder: unit === '%' ? 'e.g. 25' : 'Your answer',
    value: response ?? '',
    disabled: submitted,
    'aria-label': 'Numerical answer',
    on: { input: (event) => setResponse(event.target.value) }
  });

  // Currency sits before the box (₹ [ ]); every other unit after it ([ ] m, [ ] %).
  const currency = unit.startsWith('₹') || unit.startsWith('$');
  return el('div.numeric-input', {}, [
    el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
      currency ? el('span.text-muted.font-bold', { text: unit[0] }) : null,
      input,
      unit && !currency ? el('span.text-muted.font-bold', { text: unit }) : currency && unit.length > 1 ? el('span.text-muted.font-bold', { text: unit.slice(1).trim() }) : null
    ]),
    submitted
      ? el('div.input-hint', { text: correct ? 'Correct' : `Correct answer: ${describeCorrectAnswer(question)}` })
      : el('div.input-hint', { text: 'Enter a number — no units or commas needed.' })
  ]);
}

/* --------------------------- matching --------------------------- */

function renderMatch(ctx) {
  const { question, response, setResponse, submitted, detail } = ctx;
  const current = response || {};
  // Seeded by question id so the right-hand options keep a stable order per question.
  const choices = shuffle(
    question.pairs.map((p) => p.right),
    question.id.length * 7
  );

  return el(
    'div.match-grid',
    {},
    question.pairs.map((pair, index) => {
      const row = detail?.rows?.[index];
      const stateClass = submitted ? (row?.correct ? 'is-correct' : 'is-wrong') : '';
      return el('div', { class: `match-row ${stateClass}`.trim() }, [
        el('div.match-row__left', { text: pair.left }),
        el(
          'select',
          {
            class: 'select',
            disabled: submitted,
            'aria-label': `Match for ${pair.left}`,
            on: {
              // Functional update: this renderer is not rebuilt between changes,
              // so `current` would be stale by the second selection.
              change: (event) =>
                setResponse((prev) => ({ ...(prev || {}), [index]: event.target.value }))
            }
          },
          [
            el('option', { value: '', text: 'Choose…', selected: !current[index] }),
            ...choices.map((choice) =>
              el('option', { value: choice, text: choice, selected: current[index] === choice })
            )
          ]
        ),
        submitted && !row?.correct
          ? el('div.text-xs.text-muted', { text: `Correct: ${pair.right}` })
          : null
      ]);
    })
  );
}

/* --------------------------- ordering --------------------------- */

function renderOrdering(ctx) {
  const { question, response, setResponse, submitted, detail } = ctx;
  const order =
    Array.isArray(response) && response.length === question.steps.length
      ? response
      : shuffle(question.steps.map((s) => s.id), question.id.length * 13);

  const byId = new Map(question.steps.map((s) => [s.id, s]));

  const move = (index, direction) => {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setResponse(next);
  };

  return el('div', {}, [
    el('p.text-sm.text-subtle', {
      text: 'Put the steps in the order you would carry them out.',
      style: { marginBottom: '10px' }
    }),
    el(
      'ol.order-list',
      {},
      order.map((stepId, index) => {
        const row = detail?.rows?.[index];
        const stateClass = submitted ? (row?.correct ? 'is-correct' : 'is-wrong') : '';
        return el('li', { class: `order-item ${stateClass}`.trim() }, [
          el('span.order-item__num', { text: String(index + 1) }),
          el('span.order-item__text', { text: byId.get(stepId)?.text || '' }),
          submitted
            ? null
            : el('span.order-item__moves', {}, [
                el(
                  'button',
                  {
                    type: 'button',
                    class: 'btn btn--icon btn--sm btn--ghost',
                    'aria-label': `Move step ${index + 1} up`,
                    disabled: index === 0,
                    on: { click: () => move(index, -1) }
                  },
                  [icon('chevronUp', { size: 15 })]
                ),
                el(
                  'button',
                  {
                    type: 'button',
                    class: 'btn btn--icon btn--sm btn--ghost',
                    'aria-label': `Move step ${index + 1} down`,
                    disabled: index === order.length - 1,
                    on: { click: () => move(index, 1) }
                  },
                  [icon('chevronDown', { size: 15 })]
                )
              ])
        ]);
      })
    )
  ]);
}

/* --------------------------- registration --------------------------- */

// Several question types are pedagogically distinct but share an interaction.
[
  'single_choice',
  'formula_recognition',
  'formula_selection',
  'method_recognition',
  'statement_evaluation',
  'assertion_reason',
  'identify_error',
  'next_step',
  'estimate'
].forEach((type) => registerRenderer(type, renderChoice));

registerRenderer('multiple_choice', renderMultiple);
registerRenderer('numerical_input', renderNumeric);
registerRenderer('match_following', renderMatch);
registerRenderer('ordering', renderOrdering);
