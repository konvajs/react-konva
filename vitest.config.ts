import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// Single browser config. The dev/prod React build split is handled by the
// `test:prod` npm script invoking vitest with `NODE_ENV=production` on a
// curated subset of files — vite's deps optimizer respects that env at
// process start, which is more reliable than per-vitest-project overrides.
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
