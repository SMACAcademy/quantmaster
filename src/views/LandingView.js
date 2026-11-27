/**
 * Landing page: a scroll-driven flight through 3D models of quant and reasoning
 * ideas (trains, a filling tank, a round table, rising charts, a clock, coins,
 * a Venn diagram), with a card beside each one. First visits to the home
 * address land here; the 3D scene loads only on this page.
 *
 * With reduced motion, or without WebGL, the same content shows as a still page.
 */

import '../styles/landing.css';
import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { formatNumber } from '../utils/format.js';
import { navigate } from '../app/router.js';
import { prefersReducedMotion } from '../app/state.js';
import { topicRepository } from '../repositories/contentRepository.js';
import { authoredQuestionCount } from '../data/index.js';
import { SIMULATION_META } from '../simulations/meta.js';
import { MOCK_PATTERNS } from '../mock/patterns.js';
import { COMMUNITY, CREATOR, REPO_URL, hasCreator } from '../app/community.js';
import { puzzleCard } from '../components/PuzzleCard.js';
import { FINAL_STATION, STATIONS, markWelcomed, progressFromScroll } from '../landing/journey.js';

const external = { target: '_blank', rel: 'noopener noreferrer' };

function enterApp(path = '/') {
  markWelcomed();
  navigate(path);
}

function scrollToStation(root, index) {
  const section = root.querySelector(`[data-station="${index}"]`);
  if (!section) return;
  const smooth = !prefersReducedMotion();
  const top = section.getBoundingClientRect().top + window.scrollY + section.offsetHeight / 2 - window.innerHeight / 2;
  window.scrollTo({ top: index === 0 ? 0 : Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
}

function brand() {
  return el('a.landing-brand', { href: '#/welcome', 'aria-label': 'QuantMaster home' }, [
    el('span.landing-brand__mark', { 'aria-hidden': 'true', text: 'Q' }),
    el('span', { text: 'QuantMaster' })
  ]);
}

function topBar(root) {
  return el('header.landing-bar', {}, [
    brand(),
    el(
      'nav.landing-bar__nav',
      { 'aria-label': 'Jump to a stop' },
      STATIONS.map((s, i) => (s.nav ? el('button.landing-bar__link', { type: 'button', text: s.nav, on: { click: () => scrollToStation(root, i) } }) : null))
    ),
    el('button.btn.btn--primary.btn--sm', { type: 'button', on: { click: () => enterApp('/') } }, [el('span', { text: 'Open QuantMaster' })])
  ]);
}

function rail(root) {
  return el(
    'nav.landing-rail',
    { 'aria-label': 'Journey progress' },
    STATIONS.map((s, i) =>
      el('button.landing-rail__dot', {
        type: 'button',
        style: { '--dot': s.color },
        'aria-label': s.nav ? `Fly to ${s.nav.toLowerCase()}` : i === 0 ? 'Back to the start' : 'Fly to the end',
        dataset: { index: String(i), tip: s.nav || (i === 0 ? 'Start' : 'Begin') },
        on: { click: () => scrollToStation(root, i) }
      })
    )
  );
}

function stat(value, labelText) {
  return el('li.landing-stat', {}, [
    el('span.landing-stat__value', { dataset: { count: String(value) }, text: formatNumber(value) }),
    el('span.landing-stat__label', { text: labelText })
  ]);
}

function hero(root) {
  return el('section.landing-section.landing-section--hero', { dataset: { station: '0', side: 'left' }, 'aria-labelledby': 'landing-title' }, [
    el('div.landing-card.landing-card--hero', {}, [
      el('p.landing-eyebrow', { text: 'Quantitative aptitude · Logical reasoning · Free' }),
      el('h1.landing-title#landing-title', {}, ['See the maths ', el('span.landing-gradient', { text: 'move' })]),
      el('p.landing-lead', {
        text: 'Trains that meet, tanks that fill, people who take their seats. QuantMaster turns every aptitude and reasoning topic into a picture you can play with, then teaches the method with hints that come one at a time. Built for CAT, bank, SSC, railway and campus placement exams.'
      }),
      el('div.landing-actions', {}, [
        el('button.btn.btn--primary.landing-cta', { type: 'button', on: { click: () => enterApp('/') } }, [el('span', { text: 'Start practising' }), icon('play', { size: 17 })]),
        el('button.btn.btn--soft', { type: 'button', on: { click: () => scrollToStation(root, 1) } }, [el('span', { text: 'Fly through it' }), el('span', { 'aria-hidden': 'true', text: '↓' })])
      ]),
      el('ul.landing-stats', {}, [
        stat(topicRepository.getAll().length, 'topics'),
        stat(SIMULATION_META.length, 'moving simulations'),
        stat(authoredQuestionCount(), 'written questions'),
        stat(MOCK_PATTERNS.length, 'exam-pattern mocks')
      ])
    ]),
    el('div.landing-scroll-cue', { 'aria-hidden': 'true' }, [el('span.landing-scroll-cue__mouse'), el('span', { text: 'Scroll to fly in' })])
  ]);
}

function stationSection(station, index) {
  const topics = (station.topics || []).map((id) => topicRepository.getById(id)).filter(Boolean);
  const sim = SIMULATION_META.find((s) => s.id === station.simulation);
  const cardSide = station.side === 'left' ? 'right' : 'left';
  return el(
    'section.landing-section',
    { dataset: { station: String(index), side: cardSide }, style: { '--station': station.color }, 'aria-labelledby': `landing-${station.id}` },
    [
      el('div.landing-card', {}, [
        el('p.landing-eyebrow', { text: station.eyebrow }),
        el(`h2.landing-card__title#landing-${station.id}`, { text: station.title }),
        el('p.landing-card__text', { text: station.text }),
        station.teaser
          ? el('details.landing-teaser', {}, [
              el('summary', {}, [
                el('span.landing-teaser__label', { text: 'Quick one' }),
                el('span.landing-teaser__q', { text: station.teaser.question }),
                el('span.landing-teaser__reveal', { text: 'Think, then tap to reveal' })
              ]),
              el('p.landing-teaser__a', { text: station.teaser.answer })
            ])
          : null,
        topics.length
          ? el('ul.landing-chips', { 'aria-label': 'Topics' }, topics.map((t) => el('li', {}, [el('a', { href: `#/topics/${t.id}`, text: t.name })])))
          : null,
        sim ? el('a.landing-card__link', { href: `#/explore/${sim.id}` }, [el('span', { text: 'Play with the simulation' }), el('span', { 'aria-hidden': 'true', text: '→' })]) : null
      ])
    ]
  );
}

const STEPS = [
  ['See it', 'Every topic opens with a moving picture. Drag a slider and watch the answer change.'],
  ['Learn the method', 'Short lessons, formula cards and shortcuts, brought back just before you would forget them.'],
  ['Practise with hints', 'Hints come one at a time. Questions you miss come back until you get them right.'],
  ['Prove it', 'Exam-pattern mock tests with the real clock and marking, and a daily challenge shared by everyone.']
];

function howItWorks() {
  return el('section.landing-section.landing-section--wide', { dataset: { station: String(FINAL_STATION), side: 'center' }, 'aria-labelledby': 'landing-how' }, [
    el('div.landing-card.landing-card--wide', {}, [
      el('p.landing-eyebrow', { text: 'Watch, then do' }),
      el('h2.landing-card__title#landing-how', { text: 'How QuantMaster teaches' }),
      el(
        'ol.landing-steps',
        {},
        STEPS.map(([title, text], i) =>
          el('li.landing-step', {}, [el('span.landing-step__num', { text: String(i + 1).padStart(2, '0') }), el('h3', { text: title }), el('p', { text })])
        )
      ),
      el('div.landing-mocks', {}, [
        el('span.landing-mocks__label', { text: 'Mock papers' }),
        el('ul.landing-chips', {}, MOCK_PATTERNS.map((p) => el('li', {}, [el('a', { href: '#/mock', text: p.name })])))
      ])
    ])
  ]);
}

function puzzleSection() {
  const card = puzzleCard();
  if (!card) return null;
  return el('section.landing-section.landing-section--wide', { dataset: { side: 'center' }, 'aria-label': 'Puzzle of the week' }, [
    el('div.landing-puzzle', {}, [
      el('p.landing-eyebrow', { text: 'Try one now' }),
      el('h2.landing-card__title', { text: 'This week’s puzzle' }),
      el('p.landing-card__text', { text: 'One puzzle for everyone, new every Monday. Answer it here, then compare methods with other learners.' }),
      card
    ])
  ]);
}

function finalCall() {
  return el('section.landing-section.landing-section--wide.landing-section--final', { dataset: { side: 'center' }, 'aria-labelledby': 'landing-final' }, [
    el('div.landing-card.landing-card--final', {}, [
      el('h2.landing-final#landing-final', {}, ['Your next mark ', el('span.landing-gradient', { text: 'starts here' })]),
      el('p.landing-card__text', {
        text: 'No sign-up, no ads, no tracking. Your progress stays in your own browser and the app keeps working offline.'
      }),
      el('div.landing-actions.landing-actions--center', {}, [
        el('button.btn.btn--primary.landing-cta', { type: 'button', on: { click: () => enterApp('/') } }, [el('span', { text: 'Start practising' }), icon('play', { size: 17 })]),
        el('a.btn.btn--soft', { href: REPO_URL, ...external }, [icon('award', { size: 17 }), el('span', { text: 'Star on GitHub' })]),
        el('a.btn.btn--ghost', { href: COMMUNITY.discussions, ...external }, [el('span', { text: 'Join the discussions' })])
      ]),
      hasCreator()
        ? el('p.landing-credit', {}, [
            'Created by ',
            el('a', { href: '#/about', text: CREATOR.name }),
            ', and grown by ',
            el('a', { href: COMMUNITY.contributors, ...external, text: 'everyone who contributes' }),
            '.'
          ])
        : null
    ]),
    el('footer.landing-footer', {}, [
      el('a', { href: REPO_URL, ...external, text: 'Open source' }),
      el('span', { 'aria-hidden': 'true', text: '·' }),
      el('span', { text: 'MIT code, CC BY-SA 4.0 questions' }),
      el('span', { 'aria-hidden': 'true', text: '·' }),
      el('a', { href: '#/privacy', text: 'Privacy' }),
      el('span', { 'aria-hidden': 'true', text: '·' }),
      el('a', { href: '#/about', text: 'About' })
    ])
  ]);
}

/** Count the hero numbers up from zero the first time they are seen. */
function countUp(root, animate) {
  if (!animate) return;
  root.querySelectorAll('.landing-stat__value').forEach((node) => {
    const target = Number(node.dataset.count);
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / 1400);
      node.textContent = formatNumber(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1 && node.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

export function LandingView() {
  const motion = !prefersReducedMotion();
  const root = el('div.landing');
  const canvas = motion ? el('canvas.landing__canvas', { 'aria-hidden': 'true' }) : null;
  root.classList.toggle('landing--static', !motion);

  root.append(
    ...[
      canvas,
      el('div.landing__veil', { 'aria-hidden': 'true' }),
      topBar(root),
      rail(root),
      el('div.landing__track', {}, [
        hero(root),
        ...STATIONS.map((s, i) => (s.title ? stationSection(s, i) : null)),
        howItWorks(),
        puzzleSection(),
        finalCall()
      ])
    ].filter(Boolean)
  );

  // Any link into the app counts as having seen the welcome.
  root.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#/"]');
    if (link && link.getAttribute('href') !== '#/welcome') markWelcomed();
  });

  let scene = null;
  let disposed = false;
  let anchors = [];
  let frame = 0;
  const dots = [...root.querySelectorAll('.landing-rail__dot')];

  const centreOf = (section) => section.getBoundingClientRect().top + window.scrollY + section.offsetHeight / 2 - window.innerHeight / 2;
  // One anchor per station, plus one at the closing section, where the camera
  // flies on through the Q.
  const measure = () => {
    anchors = STATIONS.map((_, i) => {
      if (i === 0) return 0;
      const section = root.querySelector(`[data-station="${i}"]`);
      return section ? centreOf(section) : 0;
    });
    const end = root.querySelector('.landing-section--final');
    if (end) anchors.push(Math.max(centreOf(end), anchors[anchors.length - 1] + 1));
  };

  const update = () => {
    frame = 0;
    const progress = progressFromScroll(window.scrollY, anchors);
    scene?.setProgress(progress);
    const active = Math.min(Math.round(progress), FINAL_STATION);
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === active));
    root.style.setProperty('--journey', String(Math.min(progress / FINAL_STATION, 1)));
    root.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const onResize = () => {
    measure();
    scene?.resize();
    update();
  };

  const reveal = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          reveal.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15 }
  );

  return {
    title: 'See the maths move',
    element: root,
    bare: true,
    focusMode: true,
    onMount() {
      root.querySelectorAll('.landing-card, .landing-puzzle').forEach((card) => reveal.observe(card));
      measure();
      update();
      countUp(root, motion);
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize);
      if (!canvas) return;
      import('../landing/scene.js')
        .then(({ canRenderWebGL, createLandingScene }) => {
          if (disposed) return;
          if (!canRenderWebGL()) {
            canvas.remove();
            root.classList.add('landing--static');
            return;
          }
          scene = createLandingScene(canvas);
          measure();
          scene.jump(progressFromScroll(window.scrollY, anchors));
          root.classList.add('landing--live');
        })
        .catch((error) => {
          console.warn('[landing] 3D scene unavailable', error);
          canvas.remove();
          root.classList.add('landing--static');
        });
    },
    cleanup() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      reveal.disconnect();
      scene?.dispose();
      scene = null;
    }
  };
}
