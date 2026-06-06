import { defineConfig } from "@playwright/test";

/**
 * Playwright config for end-to-end visual/layout tests.
 *
 * By default this spins up the Vite dev server on port 3000. Override the
 * target with PLAYWRIGHT_BASE_URL to test against the deployed preview, e.g.:
 *
 *   PLAYWRIGHT_BASE_URL=https://id-preview--<id>.lovable.app \
 *     npx playwright test
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const useExternal = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: useExternal
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
