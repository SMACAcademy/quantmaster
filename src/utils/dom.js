/**
 * Tiny DOM helpers. The app builds real elements instead of innerHTML strings
 * so user/content text can never be interpreted as markup.
 */

/**
 * Create an element.
 * @param {string} tag - tag name, optionally with `.class` and `#id` shorthand (e.g. 'div.card.is-open').
 * @param {object} [props] - attributes/props. `class`, `text`, `html`, `dataset`, `style`,
 *   `on` (event map), `attrs` (raw attribute map) get special handling.
 * @param {Array|Node|string} [children]
 */
export function el(tag, props = {}, children = []) {
  const [name, ...classes] = String(tag).split('.');
  const [tagName, id] = name.split('#');
  const node = document.createElement(tagName || 'div');

  if (id) node.id = id;
  if (classes.length) node.classList.add(...classes);

  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    switch (key) {
      case 'class':
      case 'className':
        node.classList.add(...String(value).split(/\s+/).filter(Boolean));
        break;
      case 'text':
        node.textContent = String(value);
        break;
      case 'html':
        // Only ever used with app-authored markup (icons), never with content data.
        node.innerHTML = value;
        break;
      case 'dataset':
        Object.assign(node.dataset, value);
        break;
      case 'style':
        if (typeof value === 'string') node.setAttribute('style', value);
        else setStyles(node, value);
        break;
      case 'on':
        for (const [evt, handler] of Object.entries(value)) {
          if (typeof handler === 'function') node.addEventListener(evt, handler);
        }
        break;
      case 'attrs':
        for (const [attr, val] of Object.entries(value)) {
          if (val === null || val === undefined || val === false) continue;
          node.setAttribute(attr, val === true ? '' : String(val));
        }
        break;
      case 'value':
        node.value = value;
        break;
      case 'checked':
      case 'disabled':
      case 'selected':
        node[key] = Boolean(value);
        break;
      default:
        if (key.startsWith('aria-') || key.startsWith('data-') || key === 'role') {
          node.setAttribute(key, value === true ? '' : String(value));
        } else if (key in node) {
          node[key] = value;
        } else {
          node.setAttribute(key, String(value));
        }
    }
  }

  append(node, children);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Create an SVG element. Mirrors `el()` but uses the SVG namespace, since
 * `document.createElement` cannot produce elements that render as SVG.
 * @param {string} tag - SVG tag name (e.g. 'rect', 'path', 'g').
 * @param {object} [attrs] - attribute map. `text` sets textContent, `style`
 *   assigns to the element's CSSStyleDeclaration (so `var(--token)` colors work).
 * @param {Array|Node|string} [children]
 */
/**
 * Apply a style object. Custom properties (`--name`) need setProperty: assigning
 * them onto `node.style` like ordinary properties silently does nothing.
 */
function setStyles(node, styles) {
  for (const [name, value] of Object.entries(styles)) {
    if (name.startsWith('--')) node.style.setProperty(name, value);
    else node.style[name] = value;
  }
}

export function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'text') node.textContent = String(value);
    else if (key === 'style' && typeof value === 'object') setStyles(node, value);
    else node.setAttribute(key, String(value));
  }
  append(node, children);
  return node;
}

/** Append children of mixed types (nodes, strings, arrays, falsy skipped). */
export function append(parent, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false || child === '') continue;
    if (Array.isArray(child)) append(parent, child);
    else if (child instanceof Node) parent.appendChild(child);
    else parent.appendChild(document.createTextNode(String(child)));
  }
  return parent;
}

/** Replace all children of `parent` with `children`. */
export function render(parent, children) {
  parent.replaceChildren();
  append(parent, children);
  return parent;
}

/** A DocumentFragment from a list of nodes. */
export function frag(children) {
  const f = document.createDocumentFragment();
  append(f, children);
  return f;
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/** Event delegation helper; returns an unsubscribe function. */
export function delegate(root, eventName, selector, handler) {
  const listener = (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  };
  root.addEventListener(eventName, listener);
  return () => root.removeEventListener(eventName, listener);
}

/** Focus the first focusable element inside a container (for view transitions/modals). */
export function focusFirst(container) {
  const focusable = container.querySelector(
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable) focusable.focus();
}

/** Trap Tab focus inside a container. Returns a cleanup function. */
export function trapFocus(container) {
  const selector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const onKeydown = (event) => {
    if (event.key !== 'Tab') return;
    const items = Array.from(container.querySelectorAll(selector)).filter(
      (node) => node.offsetParent !== null
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  container.addEventListener('keydown', onKeydown);
  return () => container.removeEventListener('keydown', onKeydown);
}
