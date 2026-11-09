import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  use: {
    baseURL: process.env.SITE_TEST_URL || 'http://127.0.0.1:8000',
    browserName: 'chromium',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' },
  },
});
