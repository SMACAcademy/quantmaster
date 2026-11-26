/** Small presentational primitives shared across views. */

import { el } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { clamp } from '../utils/format.js';

export function badge(text, variant = '', options = {}) {
  return el(
    'span',
    { class: `badge ${variant ? `badge--${variant}` : ''}`.trim(), ...options },
    [options.icon ? icon(options.icon, { size: 12 }) : null, text]
  );
}

export function difficultyBadge(difficulty) {
  const label = { easy: 'Easy', medium: 'Medium', complex: 'Complex' }[difficulty] || difficulty;
  return badge(label, difficulty);
}

export function progressBar(percent, { variant = '', size = '', label = null } = {}) {
  const value = clamp(Math.round(percent || 0), 0, 100);
  const bar = el(
    'div',
    {
      class: `progress ${variant ? `progress--${variant}` : ''} ${size ? `progress--${size}` : ''}`.trim(),
      role: 'progressbar',
      'aria-valuenow': String(value),
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-label': label || `${value}% complete`
    },
    [el('div.progress__fill', { style: { width: `${value}%` } })]
  );
  return bar;
}

export function labelledProgress(leftText, rightText, percent, options = {}) {
  return el('div', {}, [
    el('div.progress__label', {}, [el('span', { text: leftText }), el('span', { text: rightText })]),
    progressBar(percent, options)
  ]);
}

export function ring(percent, { size = 56, color = 'var(--accent)', text = null } = {}) {
  const value = clamp(Math.round(percent || 0), 0, 100);
  return el(
    'div.ring',
    {
      style: { '--ring-size': `${size}px`, '--ring-value': String(value), '--ring-color': color },
      role: 'img',
      'aria-label': `${value}%`
    },
    [el('span.ring__value', { text: text ?? `${value}%` })]
  );
}

export function statTile(value, label, variant = '') {
  return el('div', { class: `stat-tile ${variant ? `stat-tile--${variant}` : ''}`.trim() }, [
    el('span.stat-tile__value', { text: String(value) }),
    el('span.stat-tile__label', { text: label })
  ]);
}

export function emptyState({ title, body, iconName = 'sparkles', action = null }) {
  return el('div.empty-state', {}, [
    el('div.empty-state__icon', {}, [icon(iconName, { size: 24 })]),
    el('h3', { text: title }),
    body ? el('p', { text: body }) : null,
    action
  ]);
}

export function sectionHead(title, { hint = null, action = null } = {}) {
  return el('div.section__head', {}, [
    el('h2.section__title', { text: title }),
    hint ? el('span.section__hint', { text: hint }) : null,
    action ? el('div.section__action', {}, [action]) : null
  ]);
}

export function section(title, children, options = {}) {
  return el('section.section', {}, [sectionHead(title, options), ...[].concat(children)]);
}

export function breadcrumbs(items) {
  const nodes = [];
  items.forEach((item, index) => {
    if (index > 0) nodes.push(el('span', { 'aria-hidden': 'true', text: '/' }));
    if (item.href) nodes.push(el('a', { href: `#${item.href}`, text: item.label }));
    else nodes.push(el('span', { text: item.label, 'aria-current': 'page' }));
  });
  return el('nav.breadcrumbs', { 'aria-label': 'Breadcrumb' }, nodes);
}

export function button(label, { variant = '', size = '', iconName = null, onClick, ...rest } = {}) {
  return el(
    'button',
    {
      type: 'button',
      class: `btn ${variant ? `btn--${variant}` : ''} ${size ? `btn--${size}` : ''}`.trim(),
      on: onClick ? { click: onClick } : {},
      ...rest
    },
    [iconName ? icon(iconName, { size: 17 }) : null, label ? el('span', { text: label }) : null]
  );
}

export function linkButton(label, href, options = {}) {
  const { variant = '', size = '', iconName = null, iconAfter = null, ...rest } = options;
  return el(
    'a',
    {
      href: `#${href}`,
      class: `btn ${variant ? `btn--${variant}` : ''} ${size ? `btn--${size}` : ''}`.trim(),
      ...rest
    },
    [
      iconName ? icon(iconName, { size: 17 }) : null,
      label ? el('span', { text: label }) : null,
      iconAfter ? icon(iconAfter, { size: 17 }) : null
    ]
  );
}

export function iconButton(iconName, { label, onClick, variant = 'ghost', size = '' } = {}) {
  return el(
    'button',
    {
      type: 'button',
      class: `btn btn--icon ${variant ? `btn--${variant}` : ''} ${size ? `btn--${size}` : ''}`.trim(),
      'aria-label': label,
      title: label,
      on: onClick ? { click: onClick } : {}
    },
    [icon(iconName, { size: 18 })]
  );
}

export function chip(label, { pressed = false, onClick, count = null } = {}) {
  return el(
    'button',
    {
      type: 'button',
      class: 'chip',
      'aria-pressed': String(pressed),
      on: onClick ? { click: onClick } : {}
    },
    [label, count !== null ? el('span.text-subtle', { text: String(count) }) : null]
  );
}

export function segmented(options, activeId, onChange) {
  return el(
    'div.segmented',
    { role: 'group' },
    options.map((option) =>
      el('button', {
        type: 'button',
        text: option.label,
        'aria-pressed': String(option.id === activeId),
        on: { click: () => onChange(option.id) }
      })
    )
  );
}

export function switchControl({ checked, label, onChange }) {
  const node = el('button', {
    type: 'button',
    class: 'switch',
    role: 'switch',
    'aria-checked': String(checked),
    'aria-label': label,
    on: {
      click: () => {
        const next = node.getAttribute('aria-checked') !== 'true';
        node.setAttribute('aria-checked', String(next));
        onChange(next);
      }
    }
  });
  return node;
}

export function settingRow({ title, description, control }) {
  return el('div.setting-row', {}, [
    el('div.setting-row__body', {}, [
      el('div.setting-row__title', { text: title }),
      description ? el('div.setting-row__desc', { text: description }) : null
    ]),
    control
  ]);
}

export function searchInput({ placeholder = 'Search…', value = '', onInput }) {
  return el('div.search-input', {}, [
    icon('search', { size: 16 }),
    el('input', {
      type: 'search',
      placeholder,
      value,
      'aria-label': placeholder,
      on: { input: (event) => onInput(event.target.value) }
    })
  ]);
}

export function actionTile({ title, description, iconName, href, tone = '', badgeText = null, onClick }) {
  const children = [
    el('div.action-tile__icon', {}, [icon(iconName, { size: 20 })]),
    el('div.action-tile__body', {}, [
      el('div.action-tile__title', {}, [title, badgeText ? badge(badgeText, 'accent') : null]),
      description ? el('div.action-tile__desc', { text: description }) : null
    ]),
    icon('chevronRight', { size: 18, className: 'text-subtle' })
  ];
  const classes = `action-tile ${tone ? `action-tile--${tone}` : ''}`.trim();
  if (href) return el('a', { href: `#${href}`, class: classes, style: { color: 'inherit' } }, children);
  return el('button', { type: 'button', class: classes, on: { click: onClick } }, children);
}

export function dataTable(table) {
  if (!table) return null;
  return el('div.data-table-wrap', {}, [
    el('table.data-table', {}, [
      table.caption ? el('caption', { text: table.caption }) : null,
      table.headers
        ? el('thead', {}, [el('tr', {}, table.headers.map((h) => el('th', { text: String(h) })))])
        : null,
      el(
        'tbody',
        {},
        (table.rows || []).map((row) => el('tr', {}, row.map((cell) => el('td', { text: String(cell) }))))
      )
    ])
  ]);
}

export function disclosure(label, contentFactory, { open = false } = {}) {
  let expanded = open;
  const panel = el('div.disclosure__panel', { hidden: !open }, open ? [contentFactory()] : []);
  const chevronSlot = el('span', { style: { display: 'grid' } }, [
    icon(expanded ? 'chevronUp' : 'chevronDown', { size: 16 })
  ]);
  const toggle = el(
    'button.disclosure__toggle',
    {
      type: 'button',
      'aria-expanded': String(expanded),
      on: {
        click: () => {
          expanded = !expanded;
          toggle.setAttribute('aria-expanded', String(expanded));
          if (expanded && !panel.childElementCount) panel.appendChild(contentFactory());
          panel.hidden = !expanded;
          chevronSlot.replaceChildren(icon(expanded ? 'chevronUp' : 'chevronDown', { size: 16 }));
        }
      }
    },
    [chevronSlot, label]
  );
  return el('div.disclosure', {}, [toggle, panel]);
}
