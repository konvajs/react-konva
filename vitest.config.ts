import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// Single browser config used by both `npm test` (dev React) and
// `npm run test:prod` (production React). Project mode is NOT used here:
// switching React's NODE_ENV-gated entry between dev and prod requires that
// vite's deps optimizer be invoked with the matching NODE_ENV at process start,
// which is not reliably overridable per-vitest-project. Instead, the prod run
// is a separate `NODE_ENV=production` vitest invocation that re-runs a curated
// subset of section files (see package.json `test:prod`). One config, two
// invocations — simpler and more robust than per-project cache + alias plumbing.
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: process.env.HEADLESS !== 'false',
      instances: [{ browser: 'chromium' }],
    },
    globals: true,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
