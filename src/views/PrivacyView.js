/**
 * Privacy page. Plain statements of what is stored where. QuantMaster has no
 * accounts and no server of its own: everything stays in the learner's browser.
 */

import { el } from '../utils/dom.js';
import { linkButton, sectionHead } from '../components/ui.js';

const UPDATED = '26 November 2026';

const list = (items) => el('ul.privacy__list', {}, items.map((text) => el('li', { text })));

function block(title, children) {
  return el('section.section', {}, [sectionHead(title), el('div.card.privacy__card', {}, children)]);
}

export function PrivacyView() {
  const element = el('div.privacy', {}, [
    el('div.page-head', {}, [
      el('div.page-head__text', {}, [
        el('h1', { text: 'Privacy' }),
        el('p', {
          text: 'QuantMaster has no accounts and no server of its own. Everything you do stays in this browser on this device.'
        })
      ])
    ]),

    block('What is stored, and where', [
      el('p', {
        text: 'Your progress, answer history, mistakes, streak, achievements and settings are saved in this browser’s local storage. None of it is sent anywhere.'
      }),
      el('p', {
        text: 'If you switch on the daily reminder, it is scheduled by this browser on this device. If you share a result, it goes only where you send it, through your phone’s share sheet or the clipboard.'
      }),
      el('p.text-muted', {
        text: 'The app is served as static files by GitHub Pages. Like any website host, GitHub keeps standard technical logs of page requests; see GitHub’s own privacy statement.'
      })
    ]),

    block('What we never do', [
      list([
        'No accounts, sign-ups or passwords.',
        'No advertising, and no analytics or tracking scripts.',
        'No selling or sharing of your data: we never receive it.',
        'No cookies: the app keeps everything in your browser’s own storage instead.'
      ])
    ]),

    block('Moving or deleting your data', [
      list([
        'To keep a backup or move to another device: Settings → Export progress, then Import on the other device. The file is merged with that device’s progress, so nothing on either is lost.',
        'To delete it: Settings → Reset all progress, or clear this site’s data in your browser settings.'
      ])
    ]),

    el('p.text-xs.text-subtle', { text: `Last updated ${UPDATED}.` }),
    linkButton('Back to settings', '/settings', { variant: 'ghost' })
  ]);

  return { title: 'Privacy', element };
}
