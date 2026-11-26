/** Installable-app behaviour: after one visit, everything works with no network. */

import { expect, test } from './helpers.js';

test.use({ serviceWorkers: 'allow' });

test('after one visit the app, a lesson and practice all work offline', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to QuantMaster' })).toBeVisible();

  // Wait for the service worker to take control and finish precaching every file.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    while (!navigator.serviceWorker.controller) await new Promise((resolve) => setTimeout(resolve, 50));
  });
  const cached = await page.evaluate(async () => {
    const name = (await caches.keys()).find((key) => key.startsWith('quantmaster-'));
    return name ? (await (await caches.open(name)).keys()).length : 0;
  });
  expect(cached).toBeGreaterThan(70); // the app, 70 topic packs, the generators, icons

  await context.setOffline(true);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome to QuantMaster' })).toBeVisible();

  // A lesson: its topic pack comes from the cache.
  await page.goto('/#/topics/clocks/levels/clocks-level-0');
  await expect(page.locator('.lesson h1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark as understood' })).toBeVisible();

  // Generated practice: the generators chunk comes from the cache too.
  await page.goto('/#/practice?mode=fresh&topic=clocks');
  await expect(page).toHaveURL(/#\/quiz$/);
  await expect(page.locator('.question-card__stem')).toBeVisible();
});
