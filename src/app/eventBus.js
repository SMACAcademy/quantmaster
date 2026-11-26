/** Minimal pub/sub used for cross-cutting UI signals (toasts, XP, achievements). */

const listeners = new Map();

export const EVENTS = {
  xpAwarded: 'xp:awarded',
  achievementUnlocked: 'achievement:unlocked',
  levelCompleted: 'level:completed',
  streakExtended: 'streak:extended',
  rankUp: 'rank:up',
  progressChanged: 'progress:changed',
  toast: 'ui:toast',
  routeChanged: 'route:changed'
};

export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => off(event, handler);
}

export function once(event, handler) {
  const unsub = on(event, (payload) => {
    unsub();
    handler(payload);
  });
  return unsub;
}

export function off(event, handler) {
  listeners.get(event)?.delete(handler);
}

export function emit(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  for (const handler of Array.from(set)) {
    try {
      handler(payload);
    } catch (error) {
      console.error(`[eventBus] handler failed for "${event}"`, error);
    }
  }
}

export function clearAll() {
  listeners.clear();
}
