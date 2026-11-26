/**
 * A one-time, dismissible invitation after a few finished sessions: star the
 * project, tell a friend, or suggest what to add next. Never shown before
 * someone has found the app useful, and never again once dismissed.
 */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { readJSON, writeJSON } from '../utils/storage.js';
import { emit, EVENTS } from '../app/eventBus.js';
import { COMMUNITY, REPO_URL } from '../app/community.js';
import { button } from './ui.js';

const DISMISS_KEY = 'quantmaster:v1:community-nudge-dismissed';
export const NUDGE_AFTER_SESSIONS = 3;

const external = { target: '_blank', rel: 'noopener noreferrer' };

export function shouldShowCommunityNudge(sessionsCompleted) {
  return sessionsCompleted >= NUDGE_AFTER_SESSIONS && !readJSON(DISMISS_KEY, false);
}

async function tellAFriend() {
  const url = `${window.location.origin}${window.location.pathname}`;
  const text = 'I have been practising aptitude on QuantMaster: free, no sign-up, with hints and moving pictures for every topic. Try today\'s challenge:';
  if (navigator.share) {
    try {
      await navigator.share({ title: 'QuantMaster', text, url });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    emit(EVENTS.toast, { title: 'Link copied', body: 'Paste it into your study group.', variant: 'success' });
  } catch (_) {
    emit(EVENTS.toast, { title: 'Could not share from this browser', variant: 'warning' });
  }
}

export function communityNudgeCard() {
  const card = el('section.card.card--accent.community-nudge', { 'aria-label': 'Help QuantMaster grow' }, [
    el('div.row', { style: { alignItems: 'flex-start' } }, [
      el('div.action-tile__icon', {}, [icon('award', { size: 20 })]),
      el('div', { style: { flex: 1, minWidth: 0 } }, [
        el('div.card__title', { text: 'Finding QuantMaster useful?' }),
        el('p.card__sub', {
          text: 'It is free and made in the open. A GitHub star helps other aspirants find it, and your ideas decide which topic comes next.'
        })
      ])
    ]),
    el('div.row.row--wrap', { style: { marginTop: '12px', gap: '8px' } }, [
      el('a.btn.btn--primary.btn--sm', { href: REPO_URL, ...external }, [icon('award', { size: 16 }), el('span', { text: 'Star on GitHub' })]),
      button('Tell a friend', { variant: 'soft', size: 'sm', iconName: 'upload', onClick: tellAFriend }),
      el('a.btn.btn--ghost.btn--sm', { href: COMMUNITY.ideas, ...external }, [icon('lightbulb', { size: 16 }), el('span', { text: 'Suggest a topic' })]),
      button('Not now', {
        variant: 'ghost',
        size: 'sm',
        onClick: () => {
          writeJSON(DISMISS_KEY, true);
          card.remove();
        }
      })
    ])
  ]);
  return card;
}
