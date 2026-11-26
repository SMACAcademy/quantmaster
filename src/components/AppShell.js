/**
 * Application chrome: sidebar (desktop), top bar, bottom navigation (mobile).
 * Owns the live XP/streak indicators and keeps navigation state in sync.
 */

import { el, render } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { formatNumber } from '../utils/format.js';
import { on, EVENTS } from '../app/eventBus.js';
import { getSettings, updateSettings } from '../app/state.js';
import { getUserProgress } from '../repositories/progressRepository.js';
import { getRankProgress, getStreakStatus } from '../services/gamification.js';
import { getMistakes } from '../services/learningEngine.js';
import { iconButton } from './ui.js';
import { installSidebarButton } from './InstallPrompt.js';
import { PWA_EVENTS } from '../pwa/pwa.js';
import { COMMUNITY, CREATOR, REPO_URL, hasCreator } from '../app/community.js';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', href: '/', match: (p) => p === '/' },
  {
    id: 'topics',
    label: 'Topics',
    icon: 'grid',
    href: '/topics',
    match: (p) => p.startsWith('/topics')
  },
  {
    id: 'revise',
    label: 'Revise',
    icon: 'cards',
    href: '/revise',
    match: (p) => ['/revise', '/sheet', '/tables', '/drill'].some((prefix) => p.startsWith(prefix))
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: 'compass',
    href: '/explore',
    match: (p) => p.startsWith('/explore')
  },
  {
    id: 'practice',
    label: 'Practice',
    icon: 'target',
    href: '/practice',
    match: (p) => p.startsWith('/practice') || p.startsWith('/quiz') || p.startsWith('/mock')
  },
  {
    id: 'mistakes',
    label: 'Mistakes',
    icon: 'alert',
    href: '/mistakes',
    match: (p) => p.startsWith('/mistakes'),
    badge: () => getMistakes({ includeResolved: false }).length
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: 'chart',
    href: '/progress',
    match: (p) => p.startsWith('/progress')
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    href: '/settings',
    match: (p) => p.startsWith('/settings')
  },
  {
    id: 'about',
    label: 'About',
    icon: 'info',
    href: '/about',
    match: (p) => p.startsWith('/about')
  }
];

const MOBILE_NAV_IDS = ['dashboard', 'topics', 'practice', 'revise', 'progress'];

/** A small, quiet footer on every page: who made it, and where to join in. */
function siteFooter() {
  const external = { target: '_blank', rel: 'noopener noreferrer' };
  const dot = () => el('span', { 'aria-hidden': 'true', text: '·' });
  return el('footer.site-footer', {}, [
    hasCreator()
      ? el('span', {}, [
          'Made by ',
          CREATOR.linkedin
            ? el('a.site-footer__name', { href: CREATOR.linkedin, ...external, text: CREATOR.name })
            : el('a.site-footer__name', { href: '#/about', text: CREATOR.name })
        ])
      : null,
    hasCreator() ? dot() : null,
    el('a', { href: REPO_URL, ...external, text: 'Open source' }),
    dot(),
    el('a', { href: COMMUNITY.discussions, ...external, text: 'Discussions' }),
    dot(),
    el('a', { href: REPO_URL, ...external, text: 'Star on GitHub' }),
    dot(),
    el('a', { href: '#/about', text: 'About' })
  ]);
}

function brandMark() {
  return el('div.brand-mark', { text: 'Q', 'aria-hidden': 'true' });
}

function xpPill() {
  const progress = getUserProgress();
  const { rank } = getRankProgress(progress.xp.total);
  return el(
    'div.stat-pill.stat-pill--xp',
    { title: `${formatNumber(progress.xp.total)} XP · ${rank.name}` },
    [
      el('span.stat-pill__icon', {}, [icon('bolt', { size: 14, fill: 'currentColor', strokeWidth: 0 })]),
      el('span', { text: formatNumber(progress.xp.total) }),
      el('span.sr-only', { text: `experience points, rank ${rank.name}` })
    ]
  );
}

function streakPill() {
  const streak = getStreakStatus();
  const cold = !streak.activeToday;
  return el(
    'div',
    {
      class: `stat-pill stat-pill--streak ${cold ? 'is-cold' : ''}`.trim(),
      title:
        (streak.activeToday
          ? `${streak.current}-day streak — today counts`
          : streak.current
            ? `${streak.current}-day streak — practise today to keep it`
            : 'No streak yet — a short session starts one') +
        (streak.freezes ? `. ${streak.freezes} streak freeze${streak.freezes === 1 ? '' : 's'} saved.` : '')
    },
    [
      el('span.stat-pill__icon', {}, [
        icon('flame', { size: 14, fill: cold ? 'none' : 'currentColor', strokeWidth: 1.5 })
      ]),
      el('span', { text: String(streak.current) }),
      el('span.sr-only', { text: 'day practice streak' }),
      streak.freezes
        ? el('span.stat-pill__freeze', { 'aria-hidden': 'true' }, [icon('snowflake', { size: 12 }), String(streak.freezes)])
        : null,
      streak.freezes ? el('span.sr-only', { text: `, ${streak.freezes} streak freezes` }) : null
    ]
  );
}

function themeToggle() {
  const settings = getSettings();
  const isDark = document.documentElement.dataset.theme === 'dark';
  return iconButton(isDark ? 'sun' : 'moon', {
    label: isDark ? 'Switch to light theme' : 'Switch to dark theme',
    onClick: () => {
      const nowDark = document.documentElement.dataset.theme === 'dark';
      updateSettings({ theme: nowDark ? 'light' : 'dark' });
    }
  });
}

export function createAppShell() {
  const content = el('main#main-content.shell__content', { tabindex: '-1' });
  const topbarTitle = el('div.topbar__title', { text: 'Dashboard' });
  const topbarStats = el('div.topbar__stats');
  const navList = el('ul.nav-list');
  const bottomNavInner = el('div.bottom-nav__inner');
  const sidebarFooter = el('div.sidebar__footer');

  const shell = el('div.shell', {}, [
    el('aside.sidebar', {}, [
      el('a.sidebar__brand', { href: '#/', style: { color: 'inherit', textDecoration: 'none' } }, [
        brandMark(),
        el('div', {}, [
          el('div.brand-name', { text: 'QuantMaster' }),
          el('div.brand-tag', { text: 'Aptitude, properly learned' })
        ])
      ]),
      el('nav', { 'aria-label': 'Main' }, [navList]),
      sidebarFooter
    ]),
    el('div.shell__main', {}, [
      el('header.topbar', {}, [
        el('a.topbar__mobile-brand', { href: '#/', style: { color: 'inherit' } }, [brandMark()]),
        topbarTitle,
        el('div.topbar__spacer'),
        topbarStats
      ]),
      content,
      siteFooter()
    ]),
    el('nav.bottom-nav', { 'aria-label': 'Main' }, [bottomNavInner])
  ]);

  function renderNav(path = window.location.hash.slice(1).split('?')[0] || '/') {
    render(
      navList,
      NAV_ITEMS.filter((item) => !item.available || item.available()).map((item) => {
        const active = item.match(path);
        const count = item.badge ? item.badge() : 0;
        return el('li', {}, [
          el(
            'a.nav-link',
            { href: `#${item.href}`, ...(active ? { 'aria-current': 'page' } : {}) },
            [
              el('span.nav-icon', {}, [icon(item.icon, { size: 18 })]),
              el('span', { text: item.label }),
              count ? el('span.nav-badge', { text: String(count) }) : null
            ]
          )
        ]);
      })
    );

    render(
      bottomNavInner,
      MOBILE_NAV_IDS.map((id) => {
        const item = NAV_ITEMS.find((n) => n.id === id);
        const active = item.match(path);
        return el(
          'a.bottom-nav__link',
          { href: `#${item.href}`, ...(active ? { 'aria-current': 'page' } : {}) },
          [icon(item.icon, { size: 20 }), el('span', { text: item.label })]
        );
      })
    );
  }

  function renderStats() {
    render(topbarStats, [xpPill(), streakPill(), themeToggle()]);
    const progress = getUserProgress();
    const rank = getRankProgress(progress.xp.total);
    render(sidebarFooter, [
      installSidebarButton(),
      el('div.card', { style: { padding: '12px' } }, [
        el('div.text-xs.text-subtle', { text: 'Rank' }),
        el('div', { style: { fontWeight: '650' }, text: rank.rank.name }),
        el('div.progress.progress--sm', { style: { marginTop: '8px' } }, [
          el('div.progress__fill', { style: { width: `${rank.percent}%` } })
        ]),
        el('div.text-xs.text-subtle', {
          style: { marginTop: '6px' },
          text: rank.next ? `${formatNumber(rank.xpToNext)} XP to ${rank.next.name}` : 'Top rank reached'
        })
      ])
    ]);
  }

  on(EVENTS.progressChanged, () => {
    renderStats();
    renderNav();
  });
  on(PWA_EVENTS.installAvailable, renderStats);
  on(PWA_EVENTS.installed, renderStats);

  return {
    element: shell,
    content,
    setTitle(title) {
      topbarTitle.textContent = title;
      document.title = title === 'Dashboard' ? 'QuantMaster' : `${title} · QuantMaster`;
    },
    setFocusMode(enabled) {
      shell.classList.toggle('shell--focus', Boolean(enabled));
    },
    /** Hide the sidebar, top bar and bottom navigation, for pages that are only for reading. */
    setBare(enabled) {
      shell.classList.toggle('shell--bare', Boolean(enabled));
    },
    refresh(path) {
      renderNav(path);
      renderStats();
    }
  };
}
