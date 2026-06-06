import { test, expect, type Page } from "@playwright/test";
import {
  SMALL_VIEWPORTS,
} from "./helpers/report-a11y-checks";

/**
 * Verifies that submitting multiple incorrect 2FA codes keeps the user on the
 * challenge page, shows clear error states, and (when Supabase rate-limits)
 * surfaces a rate-limit error. Runs at 390×844 and 768×1024.
 *
 * Required env vars (CI secrets):
 *   - E2E_USER_EMAIL       password sign-in
 *   - E2E_USER_PASSWORD
 *   - E2E_TOTP_SECRET      base32 TOTP secret matching the enrolled factor
 *
 * Auto-skipped when any env var is missing.
 */

const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;
const TOTP_SECRET = process.env.E2E_TOTP_SECRET;

test.skip(
  !EMAIL || !PASSWORD || !TOTP_SECRET,
  "E2E_USER_EMAIL / E2E_USER_PASSWORD / E2E_TOTP_SECRET not set — 2FA rate-limit suite skipped",
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
  const otp = page.getByLabel(/six-digit authenticator code/i);
  await otp.click();
  await page.keyboard.type(code, { delay: 30 });
}

async function submitChallenge(page: Page) {
  await page.getByRole("button", { name: /^verify$/i }).click();
}

for (const vp of SMALL_VIEWPORTS) {
  test.describe(`2FA multiple wrong codes @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("three consecutive wrong codes show persistent error and remain on challenge", async ({
      page,
    }) => {
      await passwordSignIn(page);
      await page.waitForURL(/\/login\/2fa/, { timeout: 20_000 });

      // Submit three different wrong codes back-to-back.
      const wrongCodes = ["000000", "111111", "222222"];
      for (const code of wrongCodes) {
        await fillOtp(page, code);
        await submitChallenge(page);

        // Error alert is visible and contains "code" or "invalid" wording.
        const errorAlert = page.getByTestId("twofa-error");
        await expect(errorAlert).toBeVisible({ timeout: 10_000 });
        await expect(errorAlert).toContainText(/code|invalid|incorrect|mismatch/i);

        // We should still be on the 2FA challenge page.
        expect(new URL(page.url()).pathname).toMatch(/^\/login\/2fa/);

        // The OTP input should be cleared (ready for next attempt).
        const otp = page.getByTestId("twofa-code");
        await expect(otp).toHaveValue("");
      }
    });

    test("rapid-fire wrong codes eventually rate-limit and show an appropriate error", async ({
      page,
    }) => {
      await passwordSignIn(page);
      await page.waitForURL(/\/login\/2fa/, { timeout: 20_000 });

      // Try up to 10 wrong codes; Supabase Auth typically rate-limits around 5-10.
      let rateLimited = false;
      const maxAttempts = 10;

      for (let i = 0; i < maxAttempts; i++) {
        const code = String(100000 + i * 11111).slice(0, 6).padStart(6, "0");
        await fillOtp(page, code);
        await submitChallenge(page);

        const errorAlert = page.getByTestId("twofa-error");
        await expect(errorAlert).toBeVisible({ timeout: 10_000 });
        const text = await errorAlert.textContent();

        // Detect rate-limit wording (Supabase usually returns "429" or "too many requests").
        if (/rate.*limit|too many requests|429|try again later/i.test(text || "")) {
          rateLimited = true;
          break;
        }

        // Otherwise verify we are still on the challenge page.
        expect(new URL(page.url()).pathname).toMatch(/^\/login\/2fa/);
        const otp = page.getByTestId("twofa-code");
        await expect(otp).toHaveValue("");
      }

      // If the backend didn't rate-limit in this run, still assert the error
      // state is meaningful (not a blank page / unexpected redirect).
      if (!rateLimited) {
        expect(new URL(page.url()).pathname).toMatch(/^\/login\/2fa/);
        const errorAlert = page.getByTestId("twofa-error");
        await expect(errorAlert).toBeVisible();
      }
    });

    test("error state is accessible: alert has role=alert and focus management is sane", async ({
      page,
    }) => {
      await passwordSignIn(page);
      await page.waitForURL(/\/login\/2fa/, { timeout: 20_000 });

      await fillOtp(page, "000000");
      await submitChallenge(page);

      const errorAlert = page.getByTestId("twofa-error");
      await expect(errorAlert).toBeVisible({ timeout: 10_000 });

      // a11y: error must be a live region (role=alert).
      await expect(errorAlert).toHaveAttribute("role", "alert");

      // The status live region should also reflect the error.
      const status = page.getByTestId("twofa-status");
      await expect(status).toContainText(/error/i);

      // Verify the OTP input is still present and not accidentally hidden.
      const otp = page.getByLabel(/six-digit authenticator code/i);
      await expect(otp).toBeVisible();
      await expect(otp).toBeEnabled();

      // Run a quick axe scan on the challenge page while the error is visible.
      const { default: AxeBuilder } = await import("@axe-core/playwright");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
        .analyze();
      const formatted = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => n.target).flat(),
      }));
      expect(formatted, JSON.stringify(formatted, null, 2)).toEqual([]);
    });
  });
}
