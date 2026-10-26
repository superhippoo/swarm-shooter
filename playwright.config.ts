import { defineConfig } from '@playwright/test';

const port = Number(process.env.SWARM_DEV_PORT ?? 5173);
const baseURL = process.env.SWARM_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    headless: true,
    actionTimeout: 15_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `${baseURL}/`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
