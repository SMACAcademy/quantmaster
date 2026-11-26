/**
 * About: what QuantMaster is, how it teaches, who built it, and how to join in.
 */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { formatNumber } from '../utils/format.js';
import { linkButton, sectionHead } from '../components/ui.js';
import { formulaRepository, topicRepository } from '../repositories/contentRepository.js';
import { authoredQuestionCount } from '../data/index.js';
import { SIMULATION_META } from '../simulations/meta.js';
import { COMMUNITY, CREATOR, REPO_URL, hasCreator, weeklyPuzzle } from '../app/community.js';

const external = { target: '_blank', rel: 'noopener noreferrer' };

function stat(value, label, iconName) {
  return el('li.about-stat', {}, [
    el('span.about-stat__icon', { 'aria-hidden': 'true' }, [icon(iconName, { size: 20 })]),
    el('span', {}, [el('span.about-stat__value', { text: formatNumber(value) }), el('span.about-stat__label', { text: label })])
  ]);
}

function joinItem({ href, title, text, iconName }) {
  return el('li', {}, [
    el('a.card.about-join', { href, ...external }, [
      el('span.about-join__title', {}, [icon(iconName, { size: 18 }), el('span', { text: title })]),
      el('span.text-sm.text-muted', { text })
    ])
  ]);
}

function linkedInMark() {
  return el('span.linkedin-mark', { 'aria-hidden': 'true', text: 'in' });
}

function creatorCard() {
  if (!hasCreator()) return null;
  return el('section.card.about-creator', { 'aria-label': 'Who built QuantMaster' }, [
    el('span.about-creator__avatar', { 'aria-hidden': 'true', text: CREATOR.name.trim().charAt(0).toUpperCase() }),
    el('div.about-creator__text', {}, [
      el('div.text-xs.text-subtle', { text: 'Created by' }),
      el('h2.about-creator__name', { text: CREATOR.name }),
      CREATOR.headline ? el('div.about-creator__headline', { text: CREATOR.headline }) : null,
      CREATOR.summary ? el('p.text-sm', { text: CREATOR.summary }) : null,
      CREATOR.focus.length
        ? el('ul.about-creator__focus', { 'aria-label': 'Areas of work' }, CREATOR.focus.map((f) => el('li', { text: f })))
        : null,
      CREATOR.credentials ? el('p.text-xs.text-subtle', { text: CREATOR.credentials }) : null,
      el('p.text-xs.text-subtle', {}, [
        'Grown with ',
        el('a', { href: COMMUNITY.contributors, ...external, text: 'everyone who has contributed' }),
        ': every accepted change is credited on GitHub.'
      ])
    ]),
    CREATOR.linkedin
      ? el('a.btn.btn--soft.btn--sm.about-creator__connect', { href: CREATOR.linkedin, ...external }, [linkedInMark(), el('span', { text: 'Connect on LinkedIn' })])
      : null
  ]);
}

export function AboutView() {
  const topics = topicRepository.getAll().length;
  const { number } = weeklyPuzzle();

  const element = el('div.about', {}, [
    el('div.page-head', {}, [
      el('div.page-head__text', {}, [
        el('h1', { text: 'About QuantMaster' }),
        el('p', {
          text: 'Free practice for the quantitative aptitude and logical reasoning in CAT, bank, SSC, railway and campus placement exams. Every topic starts with a short lesson and a picture you can move, then questions with hints that teach the method, not just the answer.'
        })
      ])
    ]),
    el('div.row.row--wrap', { style: { gap: '8px', marginBottom: '24px' } }, [
      linkButton('Start practising', '/', { variant: 'primary', iconAfter: 'play' }),
      linkButton('Play with a simulation', '/explore', { variant: 'soft', iconName: 'compass' })
    ]),

    el('ul.about-stats', {}, [
      stat(topics, 'topics', 'grid'),
      stat(authoredQuestionCount(), 'written questions, plus generated ones', 'pencil'),
      stat(SIMULATION_META.length, 'interactive simulations', 'compass'),
      stat(formulaRepository.getAll().length, 'formula and shortcut cards', 'cards')
    ]),

    el('section.section', {}, [
      el('div.grid.grid--2', {}, [
        el('div.card', {}, [
          el('h2.card__title', { text: 'How it teaches' }),
          el('ul.privacy__list', {}, [
            el('li', { text: 'See it first: sliders and moving pictures for trains, tanks, clocks, interest and more.' }),
            el('li', { text: 'Hints come one at a time, so you get as much help as you need and no more.' }),
            el('li', { text: 'Mistakes come back until you answer them right; formulas come back just before you would forget them.' }),
            el('li', { text: 'A daily challenge, the same for everyone, and a puzzle of the week to argue about.' })
          ])
        ]),
        el('div.card', {}, [
          el('h2.card__title', { text: 'No account, no tracking' }),
          el('p.text-sm.text-muted', {
            text: 'QuantMaster is a static site. There is no sign-up and no database: your progress stays in your own browser, and the app keeps working offline once loaded.'
          }),
          el('a.text-sm', { href: '#/privacy', text: 'Read the privacy page' })
        ])
      ])
    ]),

    el('section.section', {}, [
      sectionHead('Join in', { hint: 'QuantMaster grows in the open' }),
      el('p.text-sm.text-muted', {
        style: { maxWidth: '62ch', marginBottom: '12px' },
        text: 'Solve the weekly puzzle with others, fix a question, or add the next topic. Every contribution is reviewed and credited.'
      }),
      el('ul.about-join-list', {}, [
        joinItem({
          href: COMMUNITY.puzzles,
          title: `Puzzle of the week #${number}`,
          text: 'A new puzzle every Monday. Post your method and see quicker ones.',
          iconName: 'trophy'
        }),
        joinItem({
          href: COMMUNITY.ideas,
          title: 'Suggest a topic or idea',
          text: 'Missing a topic from your exam? Want a simulation for something? Say so.',
          iconName: 'lightbulb'
        }),
        joinItem({
          href: COMMUNITY.contributing,
          title: 'Improve a question',
          text: 'Spotted a mistake or have a better method? Suggest a change or open a pull request.',
          iconName: 'pencil'
        }),
        joinItem({
          href: REPO_URL,
          title: 'Star the project',
          text: 'A star on GitHub helps other aspirants find QuantMaster. It is free and takes one click.',
          iconName: 'award'
        })
      ])
    ]),

    creatorCard(),

    el('p.text-sm.text-muted.about-source', {}, [
      el('a', { href: REPO_URL, ...external, text: 'Source code on GitHub' }),
      ' · MIT licence for the code, CC BY-SA 4.0 for the questions and lessons · Plain JavaScript, SVG and no framework'
    ])
  ]);

  return { title: 'About', element };
}
