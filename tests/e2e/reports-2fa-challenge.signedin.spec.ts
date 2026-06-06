import { test, expect, type Page } from "@playwright/test";
import { authenticator } from "otplib";
import {
  SMALL_VIEWPORTS,
  expectNoAxeViolations,
  expectReportLandmarks,
  expectKeyboardFlows,
} from "./helpers/report-a11y-checks";

/**
 * Verifies that the 2FA challenge is required during sign-in for an account
 * that has TOTP enrolled, and that the report-a11y key flows only run AFTER
 * the challenge is satisfied. Runs at 390×844 and 768×1024.
 *
 * Required env vars (CI secrets):
 *   - E2E_USER_EMAIL       password sign-in
 *   - E2E_USER_PASSWORD
 *   - E2E_REPORT_ID        report the test user can access
 *   - E2E_TOTP_SECRET      base32 TOTP secret matching the enrolled factor
 *                          (seed once via tests/e2e/scripts/enroll-totp.ts)
 *
 * The whole file is auto-skipped when any of these are missing, so PRs and
 * forks without secrets stay green.
 *
 * Note: this spec deliberately starts from a CLEAN context (no
 * storageState) so it exercises the real /login → /login/2fa lifecycle,
 * unlike the other *.signedin.spec.ts files that mount the saved session.
 */

const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;
const REPORT_ID = process.env.E2E_REPORT_ID;
const TOTP_SECRET = process.env.E2E_TOTP_SECRET;

test.skip(
  !EMAIL || !PASSWORD || !REPORT_ID || !TOTP_SECRET,
  "E2E_USER_EMAIL / E2E_USER_PASSWORD / E2E_REPORT_ID / E2E_TOTP_SECRET not set — 2FA suite skipped",
);

// Override the `authed` project's storageState — we want a clean slate.
test.use({ storageState: { cookies: [], origins: [] } });

async function passwordSignIn(page: Page) {
  await page.goto("/login");
  const panel = page.getByRole("tabpanel", { name: /sign in/i });
  await panel.getByLabel(/email/i).fill(EMAIL!);
  await panel.getByLabel(/password/i).fill(PASSWORD!);
  await panel.getByRole("button", { name: /sign in/i }).click();
}

async function fillOtp(page: Page, code: string) {
  // input-otp listens on a single hidden input element. Focus the OTP group
  // and type — the keystrokes are routed to that input.
  const otp = page.getByLabel(/six-digit authenticator code/i);
  await otp.click();
  await page.keyboard.type(code, { delay: 30 });
}

for (const vp of SMALL_VIEWPORTS) {
  test.describe(`2FA challenge @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("password sign-in routes to /login/2fa and gates protected routes", async ({
      page,
    }) => {
      await passwordSignIn(page);

      // After password is accepted we should land on /login/2fa, NOT on a
      // protected page.
      await page.waitForURL(/\/login\/2fa/, { timeout: 20_000 });
      expect(new URL(page.url()).pathname).toMatch(/^\/login\/2fa/);

      // Challenge UI is announced + focused.
      await expect(
        page.getByRole("heading", { name: /two-factor verification/i }),
      ).toBeVisible();
      await expect(
        page.getByLabel(/six-digit authenticator code/i),
      ).toBeFocused();

      // Try to reach the protected report directly — should bounce back to
      // /login/2fa because aal2 is not yet satisfied.
      await page.goto(`/reports/${REPORT_ID}`);
      await page.waitForURL(/\/login\/2fa/, { timeout: 15_000 });
      expect(new URL(page.url()).pathname).toMatch(/^\/login\/2fa/);
    });

    test("wrong code stays on challenge; correct code unlocks report and passes a11y", async ({
      page,
    }) => {
      await passwordSignIn(page);
      await page.waitForURL(/\/login\/2fa/, { timeout: 20_000 });

      // Wrong code → inline error, still on /login/2fa.
      await fillOtp(page, "000000");
      await page.getByRole("button", { name: /^verify$/i }).click();
      await expect(page.getByTestId("twofa-error")).toBeVisible({
        timeout: 10_000,
      });
      expect(new URL(page.url()).pathname).toMatch(/^\/login\/2fa/);

      // Correct code from the seeded TOTP secret.
      const valid = authenticator.generate(TOTP_SECRET!);
      await fillOtp(page, valid);
      await page.getByRole("button", { name: /^verify$/i }).click();

      // Should leave the 2fa challenge after success.
      await page.waitForURL(
        (url) => !url.pathname.startsWith("/login"),
        { timeout: 20_000 },
      );

      // Now visit the report and run the shared a11y key-flow checks.
      await page.goto(`/reports/${REPORT_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
      expect(
        new URL(page.url()).pathname,
        "Expected to land on /reports/$reportId after 2FA, not /login",
      ).not.toMatch(/^\/login/);

      await expectNoAxeViolations(page);
      await expectReportLandmarks(page, vp.width);
      await expectKeyboardFlows(page);
    });
  });
}
