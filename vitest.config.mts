import { configDefaults, defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// Separate processes select the development and production React builds.
const browser = process.env.BROWSER || 'chromium';
if (browser !== 'chromium' && browser !== 'firefox' && browser !== 'webkit') {
  throw new Error(`Unsupported BROWSER: ${browser}`);
}
export default defineConfig({
  optimizeDeps: {
    include: ['react-dom/server'],
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      '.bench-tools/**',
    ],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: process.env.HEADLESS !== 'false',
      instances: [{ browser }],
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
