import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Playwright "setup" project. Signs in a real test user via the live login
 * form and persists the browser context (cookies + localStorage, where the
 * Supabase session lives) to disk. Signed-in spec files then mount that
 * storageState so each test starts already authenticated.
 *
 * Requires three env vars at run time (e.g. set as GitHub Action secrets):
 *   - E2E_USER_EMAIL
 *   - E2E_USER_PASSWORD
 *   - E2E_REPORT_ID  (used by the signed-in specs; surfaced here so missing
 *                     config skips the whole flow rather than auth'ing for
 *                     nothing)
 *
 * When the vars are absent the setup is skipped so local devs and PRs from
 * forks (which can't see secrets) don't fail the suite.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STORAGE_STATE = path.join(__dirname, ".auth/user.json");

setup("authenticate test user", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  const reportId = process.env.E2E_REPORT_ID;

  setup.skip(
    !email || !password || !reportId,
    "E2E_USER_EMAIL / E2E_USER_PASSWORD / E2E_REPORT_ID not set — signed-in suite skipped",
  );

  await page.goto("/login");

  // Sign-in tab is selected by default. Use field-level locators so the
  // Sign-up tab's identically-named inputs don't match.
  const signInPanel = page.getByRole("tabpanel", { name: /sign in/i });
  await signInPanel.getByLabel(/email/i).fill(email!);
  await signInPanel.getByLabel(/password/i).fill(password!);
  await signInPanel.getByRole("button", { name: /sign in/i }).click();

  // The _authenticated layout redirects to /dashboard (or /onboarding) once
  // Supabase finishes hydrating. Either is fine — we just need to leave
  // /login so the session has been persisted to localStorage.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });

  // Sanity check: the session token is now in localStorage.
  const hasSession = await page.evaluate(() =>
    Object.keys(window.localStorage).some((k) => k.includes("auth-token")),
  );
  expect(hasSession, "Supabase session should be persisted in localStorage").toBe(true);

  await page.context().storageState({ path: STORAGE_STATE });
});
