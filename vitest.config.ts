import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    env: {
      SPACEX_API_BASE_URL: 'https://api.spacexdata.com/v4',
    },
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/components/**/*.test.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['lib/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts'],
    },
  },
});
