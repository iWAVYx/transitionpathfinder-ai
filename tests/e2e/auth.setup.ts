import { test as setup, expect } from "@playwright/test";
import { authenticator } from "otplib";
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

  // If the user has TOTP enrolled, the login flow lands on /login/2fa first.
  // Satisfy the challenge with the seeded secret so storageState ends up at
  // aal2 — otherwise every signed-in spec would be stuck behind the 2FA gate.
  const totpSecret = process.env.E2E_TOTP_SECRET;
  await page.waitForURL(
    (url) => !url.pathname.match(/^\/login$/),
    { timeout: 20_000 },
  );
  if (new URL(page.url()).pathname.startsWith("/login/2fa")) {
    setup.skip(
      !totpSecret,
      "Account requires 2FA but E2E_TOTP_SECRET is not set — signed-in suite skipped",
    );
    const code = authenticator.generate(totpSecret!);
    const otp = page.getByLabel(/six-digit authenticator code/i);
    await otp.click();
    await page.keyboard.type(code, { delay: 30 });
    await page.getByRole("button", { name: /^verify$/i }).click();
    await page.waitForURL(
      (url) => !url.pathname.startsWith("/login"),
      { timeout: 20_000 },
    );
  }

  // Sanity check: the session token is now in localStorage.
  const hasSession = await page.evaluate(() =>
    Object.keys(window.localStorage).some((k) => k.includes("auth-token")),
  );
  expect(hasSession, "Supabase session should be persisted in localStorage").toBe(true);

  await page.context().storageState({ path: STORAGE_STATE });
});
