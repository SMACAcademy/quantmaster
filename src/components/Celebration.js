/**
 * Celebration micro-interactions. Reserved for meaningful milestones
 * (level completion, achievements, streak marks) — never per question.
 */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { prefersReducedMotion } from '../app/state.js';

const COLORS = ['#7c8cff', '#34d399', '#fbbf24', '#c084fc', '#60a5fa', '#fb7185'];

export function celebrate({ intensity = 'medium' } = {}) {
  if (prefersReducedMotion()) return;
  const count = intensity === 'high' ? 90 : intensity === 'low' ? 24 : 54;
  const root = el('div.confetti-root', { 'aria-hidden': 'true' });

  for (let i = 0; i < count; i++) {
    const piece = el('div.confetti-piece', {
      style: {
        left: `${Math.random() * 100}%`,
        background: COLORS[i % COLORS.length],
        '--drift': `${(Math.random() - 0.5) * 260}px`,
        '--spin': `${360 + Math.random() * 720}deg`,
        '--fall': `${1.8 + Math.random() * 1.6}s`,
        animationDelay: `${Math.random() * 0.35}s`,
        opacity: String(0.7 + Math.random() * 0.3)
      }
    });
    root.appendChild(piece);
  }

  document.body.appendChild(root);
  setTimeout(() => root.remove(), 4200);
}

const MILESTONE_MESSAGES = {
  7: 'A full week of daily practice. The habit is forming.',
  30: 'A month without a break. This is how mastery is built.',
  100: 'One hundred days in a row. That is genuinely rare.',
  365: 'A whole year, every single day. Remarkable.'
};

let milestoneShowing = false;

/** True while a full-screen streak celebration is on screen (other pop-ups wait for it). */
export function milestoneActive() {
  return milestoneShowing;
}

/**
 * Full-screen celebration for the big streak milestones (7, 30, 100, 365 days).
 * Closes on a click, a key press or after a few seconds; `onDone` runs afterwards.
 * With reduced motion it still shows, just without the confetti and the burst.
 */
export function showStreakMilestone(days, { onDone } = {}) {
  milestoneShowing = true;
  const overlay = el('div.milestone-overlay', { role: 'dialog', 'aria-modal': 'true', 'aria-label': `${days}-day streak` }, [
    el('div.milestone-card', {}, [
      el('div.milestone-flame', {}, [icon('flame', { size: 56, fill: 'currentColor', strokeWidth: 1.2 })]),
      el('div.milestone-number', { text: String(days) }),
      el('div.milestone-label', { text: 'day streak' }),
      el('p.milestone-message', { text: MILESTONE_MESSAGES[days] || 'Another milestone. Keep going.' }),
      el('div.text-xs.text-subtle', { text: 'Tap anywhere to continue' })
    ])
  ]);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', close);
    overlay.classList.add('is-leaving');
    setTimeout(() => {
      overlay.remove();
      milestoneShowing = false;
      onDone?.();
    }, prefersReducedMotion() ? 0 : 260);
  };
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', close);
  setTimeout(close, 5200);

  document.body.appendChild(overlay);
  celebrate({ intensity: 'high' });
}

/** Floating "+12 XP" near an anchor element. */
export function floatXp(amount, anchor) {
  if (!amount || prefersReducedMotion()) return;
  const rect = anchor?.getBoundingClientRect?.();
  const node = el('div.xp-float', { text: `+${amount} XP` });
  node.style.left = `${rect ? rect.left + rect.width / 2 : window.innerWidth / 2}px`;
  node.style.top = `${rect ? rect.top : 120}px`;
  node.style.transform = 'translateX(-50%)';
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 1300);
}
