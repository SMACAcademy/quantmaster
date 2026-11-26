/**
 * Browser tests (tests/e2e). They run against a production build served by
 * `vite preview`, exactly as the static site is served.
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;
// A fixed loopback address, so nothing depends on how `localhost` resolves.
const HOST = '127.0.0.1';
export const BASE_URL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // On Windows, several test browsers launched in parallel intermittently stall on
  // their first requests (measured: about 1 run in 5 failed with 4 workers, none in
  // 16 runs with 1; the preview server itself was fine under far heavier load). So
  // Windows runs one at a time; Linux, including CI, runs in parallel.
  workers: process.platform === 'win32' ? 1 : process.env.CI ? 2 : 4,
  forbidOnly: Boolean(process.env.CI),
  // One retry absorbs a stalled machine; a test that needs it is reported as flaky.
  retries: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    // The service worker would cache responses between tests; the offline spec turns it back on.
    serviceWorkers: 'block'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] }, grep: /@phone/ }
  ],
  webServer: {
    command: `npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --host ${HOST} --port ${PORT} --strictPort`,
    url: BASE_URL,
    // Always build fresh, so a stale server can never make tests pass or fail wrongly.
    reuseExistingServer: false,
    timeout: 120_000
  }
});
