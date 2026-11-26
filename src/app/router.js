/**
 * Hash router.
 *
 * A view is `async (ctx) => ViewResult` where ViewResult is
 * `{ element, title?, focusMode?, bare?, nav?, onMount?, cleanup? }`.
 * `focusMode` drops the page padding; `bare` also hides the navigation.
 * The router owns mounting, teardown and scroll restoration.
 */

import { emit, EVENTS } from './eventBus.js';

const routes = [];
let outlet = null;
let notFoundView = null;
let currentView = null;
let currentPath = null;
let onNavigate = null;
let pendingToken = 0;

function compile(pattern) {
  const keys = [];
  const regexSource = pattern
    .replace(/\/+$/, '')
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1).replace(/\?$/, ''));
        return segment.endsWith('?') ? '(?:/([^/]+))?' : '/([^/]+)';
      }
      return segment ? `/${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` : '';
    })
    .join('');
  return { regex: new RegExp(`^${regexSource || '/'}/?$`, 'i'), keys };
}

export function route(pattern, view, meta = {}) {
  const { regex, keys } = compile(pattern);
  routes.push({ pattern, regex, keys, view, meta });
}

export function setNotFound(view) {
  notFoundView = view;
}

function parseHash() {
  const raw = window.location.hash.slice(1) || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = pathPart.replace(/\/+$/, '') || '/';
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  return { path, query, raw };
}

function match(path) {
  for (const entry of routes) {
    const result = entry.regex.exec(path);
    if (result) {
      const params = {};
      entry.keys.forEach((key, i) => {
        const value = result[i + 1];
        if (value !== undefined) params[key] = decodeURIComponent(value);
      });
      return { entry, params };
    }
  }
  return null;
}

/** Navigate programmatically. `replace` avoids adding a history entry. */
export function navigate(path, { replace = false } = {}) {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (window.location.hash === target) {
    handleRoute();
    return;
  }
  if (replace) {
    const url = `${window.location.pathname}${window.location.search}${target}`;
    window.history.replaceState(null, '', url);
    handleRoute();
  } else {
    window.location.hash = target;
  }
}

export function back(fallback = '/') {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback, { replace: true });
}

export function currentRoute() {
  return parseHash();
}

async function handleRoute() {
  const token = ++pendingToken;
  const { path, query } = parseHash();
  const matched = match(path);

  const view = matched ? matched.entry.view : notFoundView;
  const params = matched ? matched.params : {};
  const meta = matched ? matched.entry.meta : {};

  if (!view) return;

  const ctx = { path, params, query, meta, navigate, back };

  let result;
  try {
    result = await view(ctx);
  } catch (error) {
    console.error(`[router] view failed for "${path}"`, error);
    result = {
      title: 'Something went wrong',
      element: renderRouteError(error)
    };
  }

  // A newer navigation started while this view was loading.
  if (token !== pendingToken) return;

  if (currentView?.cleanup) {
    try {
      currentView.cleanup();
    } catch (error) {
      console.error('[router] cleanup failed', error);
    }
  }

  currentView = result;
  currentPath = path;

  outlet.replaceChildren(result.element);
  result.element.classList.add('view-enter');

  if (onNavigate) onNavigate({ ...ctx, result });
  emit(EVENTS.routeChanged, { path, query, params, result });

  if (!result.keepScroll) {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  if (result.onMount) {
    try {
      result.onMount(result.element);
    } catch (error) {
      console.error('[router] onMount failed', error);
    }
  }
}

export function startRouter({ mount, onNavigate: navHook }) {
  outlet = mount;
  onNavigate = navHook;
  window.addEventListener('hashchange', handleRoute);
  if (!window.location.hash) {
    window.history.replaceState(null, '', `${window.location.pathname}#/`);
  }
  handleRoute();
}

export function refresh() {
  handleRoute();
}

export function getCurrentPath() {
  return currentPath;
}

function renderRouteError(error) {
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';
  const h = document.createElement('h3');
  h.textContent = 'This screen failed to load';
  const p = document.createElement('p');
  p.textContent = error?.message || 'An unexpected error occurred.';
  const btn = document.createElement('button');
  btn.className = 'btn btn--primary';
  btn.textContent = 'Back to dashboard';
  btn.addEventListener('click', () => navigate('/'));
  wrap.append(h, p, btn);
  return wrap;
}
