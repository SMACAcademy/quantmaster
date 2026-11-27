/**
 * Disclaimer: QuantMaster is a free study aid provided as is. Content is checked
 * carefully but mistakes can slip through; it is not official exam material or
 * financial advice; and anyone can report or correct a mistake in the open.
 * The same text is in DISCLAIMER.md at the root of the repository.
 */

import { el } from '../utils/dom.js';
import { linkButton, sectionHead } from '../components/ui.js';
import { COMMUNITY, REPO_URL, newIssueUrl } from '../app/community.js';

const UPDATED = '27 November 2026';
const external = { target: '_blank', rel: 'noopener noreferrer' };

const list = (items) => el('ul.privacy__list', {}, items.map((item) => el('li', {}, Array.isArray(item) ? item : [item])));

function block(title, children) {
  return el('section.section', {}, [sectionHead(title), el('div.card.privacy__card', {}, children)]);
}

export function DisclaimerView() {
  const element = el('div.privacy', {}, [
    el('div.page-head', {}, [
      el('div.page-head__text', {}, [
        el('h1', { text: 'Disclaimer' }),
        el('p', {
          text: 'QuantMaster is a free, open-source study aid, made in good faith and provided as is. Please read this before relying on it.'
        })
      ])
    ]),

    block('Mistakes can happen', [
      el('p', {
        text: 'Lessons, questions, answers, explanations, shortcuts and simulations are written and checked with care. Every generated question’s answer is worked out a second, independent way and thrown away if the two disagree, and thousands of automated tests run on every change. Even so, an error can slip through: a wrong answer, a misleading explanation, a figure that does not match its text, or an exam detail that has since changed.'
      }),
      el('p', {
        text: 'If something looks wrong, trust your own working and a standard textbook, and please tell us (below) so it can be fixed for everyone.'
      })
    ]),

    block('Not official exam material', [
      list([
        'QuantMaster is independent. It is not affiliated with, endorsed by or connected to IBPS, SBI, SSC, the IIMs (CAT), the Railway Recruitment Boards, any other exam body, or any employer or college that runs placement tests. Their names are used only to describe the exams the practice is meant for, and belong to their owners.',
        'Mock tests follow the published patterns as closely as we can, but patterns, syllabi, marking and timings change. Always check the official notification for your exam.',
        'A score in QuantMaster does not predict or guarantee a result in any real exam.'
      ])
    ]),

    block('Not financial, tax or professional advice', [
      el('p', {
        text: 'Questions on interest, profit and loss, GST, income tax, commission and similar topics are simplified for aptitude practice. Rates, slabs and rules shown may be illustrative or out of date. Do not use them for real financial, tax or legal decisions; ask a qualified professional.'
      })
    ]),

    block('No warranty, no liability', [
      el('p', {
        text: 'QuantMaster is provided “as is”, without warranty of any kind. To the fullest extent the law allows, its creator and contributors are not responsible for any loss, damage or consequence arising from using it or relying on its content, including exam results. You use it at your own risk.'
      }),
      el('p.text-muted', {}, [
        'The licences say the same: the code is under the ',
        el('a', { href: `${REPO_URL}/blob/main/LICENSE`, ...external, text: 'MIT licence' }),
        ' and the content under ',
        el('a', { href: `${REPO_URL}/blob/main/CONTENT-LICENSE.md`, ...external, text: 'CC BY-SA 4.0' }),
        ', and both disclaim warranties and liability.'
      ])
    ]),

    block('Found a mistake? Help fix it', [
      el('p', { text: 'Corrections are welcome and handled in the open. Every report is read, and a confirmed fix is released for everyone and credited to whoever found it.' }),
      el('ol.privacy__list', {}, [
        el('li', {}, [
          el('strong', { text: 'Report it. ' }),
          'Use “Report a problem with this question” under any solution (it fills in the topic and question for you), or ',
          el('a', { href: newIssueUrl('content-error.yml', 'Content error: '), ...external, text: 'open a content-error report' }),
          '. Say what is wrong and what it should be.'
        ]),
        el('li', {}, [
          el('strong', { text: 'Show the evidence. ' }),
          'Your working, a reference (a textbook, or the official notification for exam details), or a screenshot. Evidence lets a fix be checked and merged quickly.'
        ]),
        el('li', {}, [
          el('strong', { text: 'Or fix it yourself. ' }),
          'Edit the content on GitHub and open a pull request, describing the change and its evidence. Automated checks run on it, a maintainer reviews it, and once merged it is live within minutes. ',
          el('a', { href: COMMUNITY.contributing, ...external, text: 'How to contribute' }),
          '.'
        ])
      ])
    ]),

    el('p.text-xs.text-subtle', { text: `Last updated ${UPDATED}.` }),
    linkButton('About QuantMaster', '/about', { variant: 'ghost' })
  ]);

  return { title: 'Disclaimer', element };
}
