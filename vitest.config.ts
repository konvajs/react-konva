import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [
        {
          browser: 'chromium',
        },
      ],
    },
    // Global test setup
    globals: true,
    // Coverage configuration
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      // Ensure test imports resolve correctly
      '@': '/src',
    },
  },
});
