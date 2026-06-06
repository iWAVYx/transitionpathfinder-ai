import { test, expect, type Page } from "@playwright/test";
import { authenticator } from "otplib";

/**
 * Counterpart to reports-2fa-oauth-aal1: verifies that an enrolled user who
 * is ALREADY at aal2 and lands on /login (the OAuth callback drop point) is
 * forwarded straight to the redirect target — NOT bounced to /login/2fa
 * again. This prevents a regression where the post-auth effect would loop
 * already-verified users back through the challenge.
 *
 * Real Google consent can't be driven from Playwright, but the post-callback
 * state is indistinguishable from "password sign-in + TOTP challenge
 * satisfied": Supabase has a persisted aal2 session in localStorage. We
 * synthesize that, then revisit /login?redirect=/dashboard to simulate the
 * OAuth broker dropping the user back on /login.
 *
 * Required env (CI secrets):
 *   - E2E_USER_EMAIL
 *   - E2E_USER_PASSWORD
 *   - E2E_TOTP_SECRET   (used to satisfy the challenge and reach aal2)
 */

const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;
const TOTP_SECRET = process.env.E2E_TOTP_SECRET;

test.skip(
  !EMAIL || !PASSWORD || !TOTP_SECRET,
  "E2E_USER_EMAIL / E2E_USER_PASSWORD / E2E_TOTP_SECRET not set — OAuth-AAL2 spec skipped",
);

// Clean context — we want to drive the full sign-in + challenge ourselves
// so this spec is independent of the saved storageState.
test.use({ storageState: { cookies: [], origins: [] } });

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "tablet", width: 768, height: 1024 },
];

async function signInToAal2(page: Page) {
  await page.goto("/login");
  const panel = page.getByRole("tabpanel", { name: /sign in/i });
  await panel.getByLabel(/email/i).fill(EMAIL!);
  await panel.getByLabel(/password/i).fill(PASSWORD!);
  await panel.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/login\/2fa/, { timeout: 20_000 });

  const code = authenticator.generate(TOTP_SECRET!);
  const otp = page.getByLabel(/six-digit authenticator code/i);
  await otp.click();
  await page.keyboard.type(code, { delay: 30 });
  await page.getByRole("button", { name: /^verify$/i }).click();

  // Challenge satisfied → session escalates to aal2 and we leave /login/*.
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/login"),
    { timeout: 20_000 },
  );
  const hasSession = await page.evaluate(() =>
    Object.keys(window.localStorage).some((k) => k.includes("auth-token")),
  );
  expect(hasSession, "aal2 session should be in localStorage").toBe(true);
}

for (const vp of VIEWPORTS) {
  test.describe(`OAuth-style aal2 returnee @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("aal2 user landing on /login is forwarded to the redirect target, not /login/2fa", async ({
      page,
    }) => {
      await signInToAal2(page);

      // Simulate the Google OAuth callback dropping an already-aal2 user
      // back on /login?redirect=/dashboard. LoginPage's post-auth effect
      // must NOT bounce — it should forward straight to /dashboard.
      await page.goto("/login?redirect=%2Fdashboard");

      await page.waitForURL(
        (url) => !url.pathname.startsWith("/login"),
        { timeout: 15_000 },
      );
      const pathname = new URL(page.url()).pathname;
      expect(
        pathname,
        "aal2 user should never be sent back to /login/2fa",
      ).not.toMatch(/^\/login\/2fa/);
      expect(pathname, "aal2 user should land on the redirect target").toMatch(
        /^\/dashboard/,
      );

      // Sanity: the challenge UI must NOT be present.
      await expect(
        page.getByRole("heading", { name: /two-factor verification/i }),
      ).toHaveCount(0);
    });

    test("aal2 user can reach a protected route directly without re-challenge", async ({
      page,
    }) => {
      await signInToAal2(page);

      await page.goto("/dashboard");
      // Should stay on /dashboard (or wherever the onboarding gate sends a
      // not-yet-onboarded user) — but never /login/2fa.
      await page.waitForLoadState("networkidle");
      expect(new URL(page.url()).pathname).not.toMatch(/^\/login\/2fa/);
    });
  });
}
