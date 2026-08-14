import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const appPort = process.env.PLAYWRIGHT_APP_PORT || '3100';
const mockProviderPort = process.env.MOCK_PROVIDER_PORT || '3199';
const baseURL = externalBaseUrl || `http://127.0.0.1:${appPort}`;
const mockProviderURL = `http://127.0.0.1:${mockProviderPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL,
    serviceWorkers: 'block',
    timezoneId: 'America/Denver',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1180, height: 820 },
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : [
      {
        command: 'node tests/e2e/support/mock-provider-server.mjs',
        url: `${mockProviderURL}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          MOCK_PROVIDER_PORT: mockProviderPort,
        },
      },
      {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${appPort}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          SPACEX_API_BASE_URL: `${mockProviderURL}/spacex/v4`,
          LL2_API_BASE_URL: `${mockProviderURL}/ll2/2.3.0`,
        },
      },
    ],
});
