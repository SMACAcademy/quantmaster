/**
 * Inline SVG icon set (stroke-based, 24x24, currentColor).
 * Kept local so the app has zero icon-library dependency and works offline.
 */

const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  cards:
    '<rect x="2.5" y="6" width="13" height="15" rx="2.5"/><path d="M7 3h10a2.5 2.5 0 0 1 2.5 2.5v11"/>',
  target:
    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  alert:
    '<path d="M12 3.5 21 19.5H3z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  chart:
    '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
  settings:
    '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.46V21a2 2 0 1 1-4 0v-.11a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.46-1H3a2 2 0 1 1 0-4h.11a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 1-1.46V3a2 2 0 1 1 4 0v.11a1.6 1.6 0 0 0 1 1.46 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.46 1H21a2 2 0 1 1 0 4h-.11a1.6 1.6 0 0 0-1.46 1z"/>',
  flame:
    '<path d="M12 22c4.2 0 7-2.7 7-6.6 0-4.3-3.4-6.5-4.6-10.4-.2-.6-1-.7-1.3-.2-1 1.6-1.6 3.2-2.4 4.7-.5-.6-.9-1.3-1.1-2-.2-.6-1-.7-1.4-.2C6.6 9.3 5 11.6 5 15.4 5 19.3 7.8 22 12 22z"/><path d="M12 22c1.9 0 3.2-1.3 3.2-3.1 0-1.9-1.5-3-2.1-4.6-.1-.4-.7-.4-.9-.1-.8 1.2-3.4 2.6-3.4 4.7 0 1.8 1.3 3.1 3.2 3.1z"/>',
  bolt: '<path d="M13.5 2 4 14h6.5L10 22l9.5-12H13z"/>',
  snowflake:
    '<path d="M12 2.5v19"/><path d="M3.8 7.25 20.2 16.75"/><path d="M3.8 16.75 20.2 7.25"/><path d="m9.3 3.9 2.7 2 2.7-2"/><path d="m9.3 20.1 2.7-2 2.7 2"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  x: '<path d="m5 5 14 14"/><path d="m19 5-14 14"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  play: '<path d="M7 4.5 19.5 12 7 19.5z"/>',
  arrowRight: '<path d="M4.5 12h15"/><path d="m13 5.5 6.5 6.5-6.5 6.5"/>',
  arrowLeft: '<path d="M19.5 12h-15"/><path d="M11 5.5 4.5 12 11 18.5"/>',
  chevronRight: '<path d="m9 5 7 7-7 7"/>',
  chevronDown: '<path d="m5 9 7 7 7-7"/>',
  chevronUp: '<path d="m19 15-7-7-7 7"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5z"/>',
  lightbulb:
    '<path d="M9 17.5h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5.9 1.1 1 1.7h5.2c.1-.6.4-1.2 1-1.7A6 6 0 0 0 12 3z"/>',
  refresh:
    '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20.5 4v4.5H16"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/>',
  trophy:
    '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H5.5A1.5 1.5 0 0 0 4 7c0 2 1.6 3.6 3.6 3.9"/><path d="M16 5.5h2.5A1.5 1.5 0 0 1 20 7c0 2-1.6 3.6-3.6 3.9"/><path d="M12 13v4"/><path d="M8.5 20.5h7"/><path d="M10 17.5h4l.6 3h-5.2z"/>',
  sparkles:
    '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  brain:
    '<path d="M9.5 4.5A2.5 2.5 0 0 0 7 7a2.5 2.5 0 0 0-1.5 4.5A2.5 2.5 0 0 0 7 16a2.5 2.5 0 0 0 2.5 2.5A1.5 1.5 0 0 0 11 17V5.8a1.3 1.3 0 0 0-1.5-1.3z"/><path d="M14.5 4.5A2.5 2.5 0 0 1 17 7a2.5 2.5 0 0 1 1.5 4.5A2.5 2.5 0 0 1 17 16a2.5 2.5 0 0 1-2.5 2.5A1.5 1.5 0 0 1 13 17V5.8a1.3 1.3 0 0 1 1.5-1.3z"/>',
  moon: '<path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  filter: '<path d="M3 5.5h18l-7 8V20l-4 1.5v-8z"/>',
  download: '<path d="M12 3.5v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4.5 19.5h15"/>',
  upload: '<path d="M12 20.5v-11"/><path d="m7.5 13.5 4.5-4.5 4.5 4.5"/><path d="M4.5 4.5h15"/>',
  trash:
    '<path d="M4.5 6.5h15"/><path d="M9 6.5V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8v1.7"/><path d="M6.5 6.5 7.4 20a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-13.5"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4.5h11l-2 4 2 4H5z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  swap: '<path d="M7 4.5 3.5 8 7 11.5"/><path d="M3.5 8h13"/><path d="m17 12.5 3.5 3.5-3.5 3.5"/><path d="M20.5 16h-13"/>',
  layers:
    '<path d="m12 3 9 4.8-9 4.8-9-4.8z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/><path d="m3.5 16.8 8.5 4.5 8.5-4.5"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4M16 3v4"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r=".7" fill="currentColor"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.4 2.4 0 1 1 3.2 2.3c-.6.2-.8.7-.8 1.3v.5"/><circle cx="12" cy="16.4" r=".7" fill="currentColor"/>',
  award:
    '<circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.8-1 7.2 4.5-2.4 4.5 2.4-1-7.2"/>',
  pencil: '<path d="M16.5 3.7 20.3 7.5 8.8 19H5v-3.8z"/><path d="m14.2 6 3.8 3.8"/>',
  scale:
    '<path d="M12 4v16"/><path d="M6 20h12"/><path d="m4 9 3-4 3 4a3 3 0 0 1-6 0z"/><path d="m14 9 3-4 3 4a3 3 0 0 1-6 0z"/>'
};

/**
 * @param {string} name - key from PATHS
 * @param {object} [opts] - { size, className, strokeWidth, fill }
 * @returns {SVGElement}
 */
export function icon(name, opts = {}) {
  const { size = 20, className = '', strokeWidth = 1.75, fill = 'none', title } = opts;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', fill);
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(strokeWidth));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', title ? 'false' : 'true');
  svg.setAttribute('focusable', 'false');
  if (className) svg.setAttribute('class', className);
  if (title) {
    svg.setAttribute('role', 'img');
    const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    titleEl.textContent = title;
    svg.appendChild(titleEl);
  }
  svg.insertAdjacentHTML('beforeend', PATHS[name] || PATHS.info);
  return svg;
}

export function hasIcon(name) {
  return Object.prototype.hasOwnProperty.call(PATHS, name);
}
