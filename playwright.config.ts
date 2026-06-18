import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Playwright config for end-to-end visual/layout/a11y tests.
 *
 * By default this spins up the Vite dev server on port 3000. Override the
 * target with PLAYWRIGHT_BASE_URL to test against the deployed preview:
 *
 *   PLAYWRIGHT_BASE_URL=https://id-preview--<id>.lovable.app \
 *     npx playwright test
 *
 * Projects:
 *   - setup    Signs a real test user in via /login and saves storageState.
 *              Skipped automatically when E2E_USER_EMAIL / E2E_USER_PASSWORD /
 *              E2E_REPORT_ID are not set.
 *   - anon     Runs every spec EXCEPT *.signedin.spec.ts with no session.
 *   - authed   Runs *.signedin.spec.ts with the saved session attached.
 *              Depends on `setup`.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const useExternal = Boolean(process.env.PLAYWRIGHT_BASE_URL);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_STATE = path.join(__dirname, "tests/e2e/.auth/user.json");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      testIgnore: [/auth-roles\.setup\.ts/],
    },
    {
      name: "anon",
      use: { baseURL, trace: "retain-on-failure" },
      testIgnore: [/auth(-roles)?\.setup\.ts/, /\.signedin\.spec\.ts$/],
    },
    {
      name: "authed",
      use: { baseURL, trace: "retain-on-failure", storageState: STORAGE_STATE },
      testMatch: /\.signedin\.spec\.ts$/,
      testIgnore: [/dashboard-regression\.signedin\.spec\.ts$/],
      dependencies: ["setup"],
    },
    // Per-role dashboard regression. Storage state is selected inside the
    // spec via test.use({ storageState }) so a single project handles all
    // seven roles; missing-credential roles auto-skip.
    {
      name: "dashboard-setup",
      testMatch: /auth-roles\.setup\.ts/,
    },
    {
      name: "dashboard-regression",
      use: { baseURL, trace: "retain-on-failure" },
      testMatch: /dashboard-regression\.signedin\.spec\.ts$/,
      dependencies: ["dashboard-setup"],
    },
    // Role-leak nav guard + role-specific access rules. Same per-role
    // storage states as dashboard-regression; specs auto-skip per role
    // when storageState is missing.
    {
      name: "role-access",
      use: { baseURL, trace: "retain-on-failure" },
      testMatch: /(role-leak-nav|role-access-rules)\.signedin\.spec\.ts$/,
      dependencies: ["dashboard-setup"],
    },
  ],
  webServer: useExternal
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
