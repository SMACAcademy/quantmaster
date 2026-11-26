/**
 * Optional daily practice reminder.
 *
 * Everything happens on the device: no account and no server.
 *
 * How it reaches the learner:
 *   - While QuantMaster is open in a tab (even in the background), a timer fires at
 *     the chosen time and shows a notification if today's practice isn't done yet.
 *   - Where the browser supports Periodic Background Sync (installed app on
 *     Chromium, e.g. Android), the service worker also checks roughly twice a day
 *     and shows the same notification when the app is closed.
 * Browsers without either simply never show it; Settings explains that honestly.
 *
 * The page and the service worker share one small state record in Cache Storage
 * (the worker cannot read localStorage), which also stops both from notifying on
 * the same day.
 */

import { on, EVENTS } from '../app/eventBus.js';
import { getSettings, settingsStore, updateSettings } from '../app/state.js';
import { dayKey } from '../utils/format.js';
import { getStreakStatus } from './gamification.js';

export const REMINDER_CACHE = 'qm-reminders';
const STATE_PATH = '__qm-reminder-state';
const PERIODIC_TAG = 'daily-reminder';
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

let timer = null;

/* ------------------------------ pure logic ------------------------------ */

/** "19:30" -> minutes after midnight. */
export function minutesOf(time) {
  const [h, m] = String(time || '19:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Milliseconds from `now` until the next time the clock reads `time` (today if still ahead). */
export function msUntilNext(time, now = new Date()) {
  const target = new Date(now);
  target.setHours(0, minutesOf(time), 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target - now;
}

/** Whether a reminder is due now for this shared state. */
export function shouldRemind(state, now = new Date()) {
  if (!state?.enabled) return false;
  const today = dayKey(now);
  if (state.lastPracticeDay === today || state.notifiedDay === today) return false;
  return now.getHours() * 60 + now.getMinutes() >= minutesOf(state.time);
}

export function reminderMessage({ streak = 0, freezes = 0 } = {}) {
  if (streak > 0) {
    return {
      title: `Keep your ${streak}-day streak going`,
      body:
        freezes > 0
          ? 'Five questions is enough to count today.'
          : 'Five questions is enough to count today. You have no streak freeze left to cover a missed day.'
    };
  }
  return { title: 'Time for a little practice', body: 'A few questions today keeps your skills fresh.' };
}

/* ----------------------------- browser support ----------------------------- */

export function remindersSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission() {
  return remindersSupported() ? Notification.permission : 'unsupported';
}

const stateUrl = () => new URL(`${import.meta.env.BASE_URL}${STATE_PATH}`, window.location.origin).toString();

function currentState(extra = {}) {
  const settings = getSettings();
  const streak = getStreakStatus();
  return {
    enabled: Boolean(settings.reminderEnabled) && notificationPermission() === 'granted',
    time: settings.reminderTime,
    lastPracticeDay: streak.activeToday ? dayKey() : null,
    ...reminderMessage({ streak: streak.current, freezes: streak.freezes }),
    ...extra
  };
}

async function readState() {
  if (!('caches' in window)) return null;
  const response = await (await caches.open(REMINDER_CACHE)).match(stateUrl());
  return response ? response.json() : null;
}

async function writeState(state) {
  if (!('caches' in window)) return;
  const cache = await caches.open(REMINDER_CACHE);
  await cache.put(stateUrl(), new Response(JSON.stringify(state), { headers: { 'Content-Type': 'application/json' } }));
}

/** Refresh the shared record from settings and progress, keeping the day already notified. */
async function syncState() {
  try {
    const previous = await readState();
    await writeState(currentState({ notifiedDay: previous?.notifiedDay ?? null }));
  } catch (error) {
    console.warn('[reminders] could not save reminder state', error);
  }
}

async function showReminder({ title, body }) {
  const options = { body, tag: PERIODIC_TAG, icon: `${import.meta.env.BASE_URL}icons/icon-192.png` };
  const registration = await navigator.serviceWorker?.getRegistration?.();
  if (registration) return registration.showNotification(title, options);
  return new Notification(title, options);
}

/** Timer callback: notify if due, then schedule the next one. */
async function checkNow() {
  try {
    const previous = await readState();
    const state = currentState({ notifiedDay: previous?.notifiedDay ?? null });
    if (shouldRemind(state)) {
      // Someone looking at the app right now does not need a system notification.
      if (document.visibilityState !== 'visible') await showReminder(state);
      await writeState({ ...state, notifiedDay: dayKey() });
    }
  } catch (error) {
    console.warn('[reminders] check failed', error);
  }
  schedule();
}

function schedule() {
  clearTimeout(timer);
  timer = null;
  const settings = getSettings();
  if (!settings.reminderEnabled || notificationPermission() !== 'granted') return;
  timer = setTimeout(checkNow, msUntilNext(settings.reminderTime));
}

async function registerPeriodicCheck(enabled) {
  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (!registration?.periodicSync) return;
    if (!enabled) {
      await registration.periodicSync.unregister(PERIODIC_TAG);
      return;
    }
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (status.state === 'granted') {
      await registration.periodicSync.register(PERIODIC_TAG, { minInterval: TWELVE_HOURS });
    }
  } catch (_) {
    // Not available in this browser; the in-tab timer still works.
  }
}

/* ------------------------------- public API ------------------------------- */

/** Ask for permission and switch reminders on. Resolves to the permission state. */
export async function enableReminders() {
  if (!remindersSupported()) return 'unsupported';
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission === 'granted') updateSettings({ reminderEnabled: true });
  return permission;
}

export function disableReminders() {
  updateSettings({ reminderEnabled: false });
}

/** Called once at boot. Cheap when reminders are off. */
export function initReminders() {
  if (!remindersSupported()) return;
  let lastKey = null;
  const refresh = () => {
    const settings = getSettings();
    const key = `${settings.reminderEnabled}|${settings.reminderTime}`;
    if (key === lastKey) return;
    lastKey = key;
    syncState();
    schedule();
    registerPeriodicCheck(settings.reminderEnabled && notificationPermission() === 'granted');
  };
  refresh();
  settingsStore.subscribe(refresh);

  // Practising today (or a streak change) updates what the next reminder says, or cancels it.
  let pending = null;
  on(EVENTS.progressChanged, () => {
    if (!getSettings().reminderEnabled) return;
    clearTimeout(pending);
    pending = setTimeout(syncState, 1500);
  });
}
