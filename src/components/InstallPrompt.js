/** Install-to-home-screen UI: sidebar button, one-time dashboard nudge, iOS instructions. */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { button } from './ui.js';
import { openModal } from './Modal.js';
import {
  canPromptInstall,
  dismissInstallNudge,
  isInstallNudgeDismissed,
  isStandalone,
  needsManualInstall,
  promptInstall
} from '../pwa/pwa.js';

export function installAvailable() {
  return !isStandalone() && (canPromptInstall() || needsManualInstall());
}

export async function startInstall() {
  if (canPromptInstall()) return promptInstall();
  if (needsManualInstall()) {
    showIosInstructions();
    return 'instructions';
  }
  return 'unavailable';
}

function showIosInstructions() {
  openModal({
    title: 'Add QuantMaster to your home screen',
    body: el('ol.stack', { style: { paddingLeft: '20px', gap: '10px' } }, [
      el('li', {}, [
        'Tap the ',
        el('b', { text: 'Share' }),
        ' button in Safari (the square with an arrow).'
      ]),
      el('li', {}, ['Scroll down and tap ', el('b', { text: 'Add to Home Screen' }), '.']),
      el('li', {}, ['Tap ', el('b', { text: 'Add' }), '. QuantMaster will open full-screen and work offline.'])
    ]),
    actions: [{ label: 'Got it', variant: 'primary' }]
  });
}

export function installSidebarButton() {
  if (!installAvailable()) return null;
  return button('Install app', {
    variant: 'soft',
    size: 'sm',
    iconName: 'download',
    style: { width: '100%' },
    onClick: startInstall
  });
}

/** Shown once, to learners who have already found the app useful. */
export function installNudgeCard({ onDismiss } = {}) {
  if (!installAvailable() || isInstallNudgeDismissed()) return null;

  const card = el('div.card.card--accent', {}, [
    el('div.row', { style: { alignItems: 'flex-start' } }, [
      el('div.action-tile__icon', {}, [icon('download', { size: 20 })]),
      el('div', { style: { flex: 1, minWidth: 0 } }, [
        el('div.card__title', { text: 'Put QuantMaster on your home screen' }),
        el('p.card__sub', {
          text: 'One tap to your daily session, full-screen, and it keeps working without internet.'
        })
      ])
    ]),
    el('div.row.row--wrap', { style: { marginTop: '12px', gap: '8px' } }, [
      button(needsManualInstall() ? 'Show me how' : 'Install', {
        variant: 'primary',
        size: 'sm',
        iconName: 'download',
        onClick: async () => {
          const outcome = await startInstall();
          if (outcome === 'accepted') card.remove();
        }
      }),
      button('Not now', {
        variant: 'ghost',
        size: 'sm',
        onClick: () => {
          dismissInstallNudge();
          card.remove();
          onDismiss?.();
        }
      })
    ])
  ]);
  return card;
}
