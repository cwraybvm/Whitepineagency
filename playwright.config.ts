import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Next.js loads .env then .env.local (later overrides earlier); mirror that
// here so tests see the same ADMIN_PASSWORD/OPENAI_API_KEY/DATABASE_URL the
// dev server itself uses.
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/e2e/report' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
