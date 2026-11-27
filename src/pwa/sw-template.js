/* QuantMaster service worker.
 *
 * Built from this template by the quantmaster-pwa plugin in vite.config.js,
 * which fills in the cache version and the list of files to precache.
 *
 * Strategy:
 *   - everything in the build is precached on install, so the app works offline
 *     from the first visit onward
 *   - page loads are network-first (with a short timeout) so updates arrive
 *   - hashed assets and icons are cache-first
 */

const CACHE_PREFIX = 'quantmaster-';
const CACHE = `${CACHE_PREFIX}__CACHE_VERSION__`;
const PRECACHE = __PRECACHE_LIST__;
const NAVIGATION_TIMEOUT_MS = 3500;
// Every cached file is static, and assets are content-hashed, so the URL alone
// identifies the response. Without ignoreVary, a `Vary: Origin` or differing
// `Accept-Encoding` between the precache request and a page request is a cache
// miss, which offline means a broken page.
const CACHE_LOOKUP = { ignoreSearch: true, ignoreVary: true };

const scoped = (path) => new URL(path, self.registration.scope).toString();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map(scoped)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      withTimeout(fetch(request), NAVIGATION_TIMEOUT_MS)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(scoped('index.html'), copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(scoped('index.html'), CACHE_LOOKUP).then((cached) => cached || Response.error())
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request, CACHE_LOOKUP).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});

/* ---------------------------- daily reminder ----------------------------
 * The page keeps a small record in Cache Storage (see src/services/reminders.js):
 * { enabled, time: 'HH:MM', lastPracticeDay, notifiedDay, title, body }.
 * Where Periodic Background Sync is available (installed app on Chromium), this
 * worker checks it about twice a day and shows the reminder when the app is closed.
 * The cache name deliberately avoids CACHE_PREFIX so activation never deletes it.
 */
const REMINDER_CACHE = 'qm-reminders';
const REMINDER_STATE = scoped('__qm-reminder-state');

function localDayKey(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function maybeRemind() {
  const cache = await caches.open(REMINDER_CACHE);
  const response = await cache.match(REMINDER_STATE);
  if (!response) return;
  const state = await response.json();
  if (!state.enabled) return;

  const now = new Date();
  const today = localDayKey(now);
  const [h, m] = String(state.time || '19:00').split(':').map(Number);
  if (state.lastPracticeDay === today || state.notifiedDay === today) return;
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;

  // Someone looking at the app right now does not need a system notification.
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (windows.some((client) => client.visibilityState === 'visible')) return;

  await self.registration.showNotification(state.title, {
    body: state.body,
    tag: 'daily-reminder',
    icon: scoped('icons/icon-192.png')
  });
  await cache.put(
    REMINDER_STATE,
    new Response(JSON.stringify({ ...state, notifiedDay: today }), { headers: { 'Content-Type': 'application/json' } })
  );
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-reminder') event.waitUntil(maybeRemind());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.registration.scope));
      return open ? open.focus() : self.clients.openWindow(scoped('./#/dashboard'));
    })
  );
});
