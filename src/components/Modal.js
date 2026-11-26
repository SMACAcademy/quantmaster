/** Accessible modal dialogs: generic, confirm, and the achievement celebration. */

import { el, trapFocus, focusFirst } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { button } from './ui.js';
import { celebrate } from './Celebration.js';

let modalRoot = null;

export function initModals(node) {
  modalRoot = node;
}

/**
 * @returns {{close: Function, element: HTMLElement}}
 */
export function openModal({ title, body, actions = [], onClose = null, variant = '' }) {
  const previouslyFocused = document.activeElement;
  let releaseTrap = null;

  const close = () => {
    document.removeEventListener('keydown', onKeydown);
    if (releaseTrap) releaseTrap();
    backdrop.remove();
    if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    if (onClose) onClose();
  };

  const onKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  const dialog = el(
    'div',
    {
      class: `modal ${variant ? `modal--${variant}` : ''}`.trim(),
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': typeof title === 'string' ? title : 'Dialog'
    },
    [
      title
        ? el('div.modal__head', {}, [
            el('h2.modal__title', { text: title }),
            el(
              'button',
              {
                type: 'button',
                class: 'btn btn--icon btn--ghost btn--sm ml-auto',
                'aria-label': 'Close',
                on: { click: close }
              },
              [icon('x', { size: 16 })]
            )
          ])
        : null,
      typeof body === 'function' ? body(close) : body,
      actions.length
        ? el(
            'div.modal__actions',
            {},
            actions.map((action) =>
              button(action.label, {
                variant: action.variant || 'ghost',
                onClick: () => {
                  const result = action.onClick?.(close);
                  if (result !== false && action.closeOnClick !== false) close();
                }
              })
            )
          )
        : null
    ]
  );

  const backdrop = el('div.modal-backdrop', {
    on: {
      click: (event) => {
        if (event.target === backdrop) close();
      }
    }
  });
  backdrop.appendChild(dialog);
  modalRoot.appendChild(backdrop);

  releaseTrap = trapFocus(dialog);
  document.addEventListener('keydown', onKeydown);
  focusFirst(dialog);

  return { close, element: dialog };
}

export function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm
}) {
  return openModal({
    title,
    body: el('p.text-muted', { text: message }),
    actions: [
      { label: cancelLabel, variant: 'ghost' },
      {
        label: confirmLabel,
        variant: danger ? 'danger' : 'primary',
        onClick: () => onConfirm()
      }
    ]
  });
}

export function showAchievementModal(achievement) {
  celebrate({ intensity: 'medium' });
  return openModal({
    body: el('div.achievement-modal', {}, [
      el('div.achievement-medal', { text: achievement.glyph || '🏅' }),
      el('div.text-xs.text-subtle', { text: 'Achievement unlocked' }),
      el('h2', { text: achievement.name }),
      el('p.text-muted', { text: achievement.description })
    ]),
    actions: [{ label: 'Nice', variant: 'primary' }]
  });
}
