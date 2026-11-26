import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { contentSplitPlugin } from './scripts/contentSplitPlugin.js';

// Deployment settings come from the environment so the same code builds for
// local preview and for production (CI sets SITE_URL from a repo variable).
const BASE_PATH = process.env.BASE_PATH || '/';
const SITE_URL = (process.env.SITE_URL || 'http://localhost:4173/').replace(/\/?$/, '/');

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

/**
 * Generates dist/sw.js from src/pwa/sw-template.js after the build is written,
 * precaching every emitted file. The cache version is a hash of their contents,
 * so any change to the app produces a new cache and old ones are cleaned up.
 * Also fills the absolute site URL into index.html for share-preview tags.
 */
function quantmasterPwa() {
  let outDir = 'dist';
  return {
    name: 'quantmaster-pwa',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    transformIndexHtml(html) {
      return html.replaceAll('__SITE_URL__', SITE_URL);
    },
    writeBundle() {
      const files = listFiles(outDir)
        .map((file) => relative(outDir, file).split(sep).join('/'))
        .filter((file) => !file.endsWith('.map') && file !== 'sw.js')
        .sort();

      const hash = createHash('sha256');
      for (const file of files) hash.update(file).update(readFileSync(join(outDir, file)));
      const version = hash.digest('hex').slice(0, 12);

      const template = readFileSync('src/pwa/sw-template.js', 'utf8');
      const worker = template
        .replace('__CACHE_VERSION__', version)
        .replace('__PRECACHE_LIST__', JSON.stringify(files, null, 2));
      writeFileSync(join(outDir, 'sw.js'), worker);
    }
  };
}

/**
 * Adds a Content-Security-Policy to the built page. GitHub Pages cannot send
 * security headers, so the policy travels in a <meta> tag. Everything the app
 * loads is its own; the one inline script (the theme set before first paint) is
 * allowed by its SHA-256 hash, computed here so the policy always matches it.
 * Styles set from JavaScript are not affected by style-src; 'unsafe-inline'
 * there covers the few style attributes in the markup.
 */
function contentSecurityPolicy() {
  return {
    name: 'quantmaster-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          (m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`
        );
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`.trim(),
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "connect-src 'self'",
          "font-src 'self'",
          "manifest-src 'self'",
          "worker-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'"
        ].join('; ');
        return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${policy}" />`);
      }
    }
  };
}

export default defineConfig({
  base: BASE_PATH,
  publicDir: 'public',
  plugins: [contentSplitPlugin(), quantmasterPwa(), contentSecurityPolicy()],
  server: {
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Question content ships as one lazily loaded chunk per topic (see
    // scripts/contentSplitPlugin.js); the service worker still precaches every
    // chunk, so the whole app works offline after one visit.
    chunkSizeWarningLimit: 900
  },
  test: {
    // Tests use the synchronous repositories directly, so load every topic pack first.
    setupFiles: ['tests/setup.js'],
    // tests/e2e holds the Playwright browser tests (npm run test:e2e).
    exclude: ['tests/e2e/**', 'node_modules/**']
  }
});
