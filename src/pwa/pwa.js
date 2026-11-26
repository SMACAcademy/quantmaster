/**
 * Installability and offline support: service worker registration, the install
 * prompt, installed-state detection, persistent storage and connectivity notices.
 */

import { emit, EVENTS } from '../app/eventBus.js';
import { readJSON, writeJSON } from '../utils/storage.js';

export const PWA_EVENTS = {
  installAvailable: 'pwa:install-available',
  installed: 'pwa:installed'
};

const DISMISS_KEY = 'quantmaster:v1:install-dismissed';

let deferredPrompt = null;

export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

export function isIos() {
  const ua = window.navigator.userAgent || '';
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/i.test(ua) || iPadOs;
}

/** Browser can show a native install prompt right now. */
export function canPromptInstall() {
  return Boolean(deferredPrompt) && !isStandalone();
}

/** iOS Safari has no prompt; the learner adds it via the Share menu. */
export function needsManualInstall() {
  return isIos() && !isStandalone();
}

export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice.outcome;
}

export function isInstallNudgeDismissed() {
  return Boolean(readJSON(DISMISS_KEY, false));
}

export function dismissInstallNudge() {
  writeJSON(DISMISS_KEY, true);
}

async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch (_) {
    // Best effort only; localStorage still works without it.
  }
}

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    emit(PWA_EVENTS.installAvailable);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    requestPersistentStorage();
    emit(PWA_EVENTS.installed);
    emit(EVENTS.toast, {
      title: 'QuantMaster installed',
      body: 'Open it from your home screen — it works offline too.',
      variant: 'success'
    });
  });

  // Installed apps are exactly the ones worth protecting from storage eviction.
  if (isStandalone()) requestPersistentStorage();

  window.addEventListener('offline', () => {
    emit(EVENTS.toast, {
      title: "You're offline",
      body: 'Everything still works, and your progress is saved on this device.',
      variant: 'info'
    });
  });

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    registerServiceWorker();
  }
}

function registerServiceWorker() {
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // First install takes control silently; later ones mean a new version landed.
    if (!hadController) return;
    emit(EVENTS.toast, {
      title: 'QuantMaster was updated',
      body: 'The new version will load next time you open the app.',
      variant: 'info',
      duration: 5000
    });
  });

  const register = () =>
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch((error) => console.warn('[pwa] service worker registration failed', error));

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
