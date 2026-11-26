/**
 * Trailing debounce with an optional max-wait forced flush.
 *
 * Used to collapse a burst of rapid calls (e.g. one progress update per
 * answered question during a quiz) into a single call after activity settles,
 * without ever waiting indefinitely if activity never stops.
 */

/**
 * @param {Function} fn - the function to debounce
 * @param {number} waitMs - quiet period required before `fn` fires
 * @param {object} [options]
 * @param {number} [options.maxWaitMs] - fire at most this long after the first
 *   pending call, even under continuous activity. Omit for no max wait.
 * @returns {{ call: Function, flush: Function, cancel: Function }}
 */
export function debounce(fn, waitMs, { maxWaitMs } = {}) {
  let timer = null;
  let maxTimer = null;
  let lastArgs = null;
  let lastThis = null;

  function clear() {
    if (timer) clearTimeout(timer);
    if (maxTimer) clearTimeout(maxTimer);
    timer = null;
    maxTimer = null;
  }

  function run() {
    const args = lastArgs;
    const context = lastThis;
    clear();
    lastArgs = null;
    lastThis = null;
    if (args) fn.apply(context, args);
  }

  function call(...args) {
    lastArgs = args;
    lastThis = this;

    if (timer) clearTimeout(timer);
    timer = setTimeout(run, waitMs);

    if (maxWaitMs && !maxTimer) {
      maxTimer = setTimeout(run, maxWaitMs);
    }
  }

  function flush() {
    if (lastArgs) run();
  }

  function cancel() {
    clear();
    lastArgs = null;
    lastThis = null;
  }

  return { call, flush, cancel };
}
