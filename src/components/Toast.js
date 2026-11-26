/** Toast notifications. Subscribes to the event bus once at app start. */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { on, EVENTS } from '../app/eventBus.js';

const ICONS = {
  info: 'info',
  success: 'check',
  warning: 'alert',
  danger: 'alert',
  achievement: 'award'
};

let root = null;

export function initToasts(mountNode) {
  root = mountNode;
  on(EVENTS.toast, (payload) => showToast(payload));
}

export function showToast({ title, body = '', variant = 'info', duration = 3600 }) {
  if (!root) return;
  const node = el(`div.toast.toast--${variant}`, { role: 'status' }, [
    el('div.toast__icon', {}, [icon(ICONS[variant] || 'info', { size: 15 })]),
    el('div', {}, [
      el('div.toast__title', { text: title }),
      body ? el('div.toast__body', { text: body }) : null
    ])
  ]);
  root.appendChild(node);

  const remove = () => {
    node.classList.add('is-leaving');
    node.addEventListener('animationend', () => node.remove(), { once: true });
    setTimeout(() => node.remove(), 500);
  };
  const timer = setTimeout(remove, duration);
  node.addEventListener('click', () => {
    clearTimeout(timer);
    remove();
  });
  return node;
}
