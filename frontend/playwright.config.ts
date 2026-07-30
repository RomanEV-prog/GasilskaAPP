import { defineConfig, devices } from '@playwright/test';

/**
 * Dimni test frontenda proti zgrajeni aplikaciji (vite preview).
 * Backend mora teči na http://localhost:4000 (dev ali CI zagon) —
 * aplikacija ga kliče prek absolutnega VITE_API_URL, proxy ni potreben.
 */
export default defineConfig({
  testDir: './tests',
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
