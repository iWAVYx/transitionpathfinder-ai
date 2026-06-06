import { test, expect, type Page } from "@playwright/test";

/**
 * Verifies that an enrolled user landing on /login with an aal1 session —
 * which is exactly the state Google OAuth returnees are in immediately
 * after the callback persists their session — is bounced to /login/2fa by
 * LoginPage's post-auth effect, NOT forwarded to the redirect target.
 *
 * We can't drive a real Google consent screen from Playwright, but the
 * post-callback state is indistinguishable from "password sign-in produced
 * an aal1 session": Supabase has persisted a session in localStorage and
 * the user has a verified TOTP factor. So we synthesize that state by
 * signing in with password (which lands on /login/2fa), then navigating
 * back to /login?redirect=/dashboard to simulate the OAuth callback
 * dropping the user on /login with the session already in place.
 *
 * Required env (CI secrets):
 *   - E2E_USER_EMAIL
 *   - E2E_USER_PASSWORD
 *   - E2E_TOTP_SECRET   (only used to confirm the account is enrolled;
 *                        we never satisfy the challenge in this spec)
 */

const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;
const TOTP_SECRET = process.env.E2E_TOTP_SECRET;

test.skip(
  !EMAIL || !PASSWORD || !TOTP_SECRET,
  "E2E_USER_EMAIL / E2E_USER_PASSWORD / E2E_TOTP_SECRET not set — OAuth-AAL1 spec skipped",
);

// Clean context — we want no pre-existing aal2 session.
test.use({ storageState: { cookies: [], origins: [] } });

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "tablet", width: 768, height: 1024 },
];

async function passwordSignInToAal1(page: Page) {
  await page.goto("/login");
  const panel = page.getByRole("tabpanel", { name: /sign in/i });
  await panel.getByLabel(/email/i).fill(EMAIL!);
  await panel.getByLabel(/password/i).fill(PASSWORD!);
  await panel.getByRole("button", { name: /sign in/i }).click();
  // Password accepted → enrolled account routes to /login/2fa. Session is
  // now persisted in localStorage at aal1.
  await page.waitForURL(/\/login\/2fa/, { timeout: 20_000 });
  const hasSession = await page.evaluate(() =>
    Object.keys(window.localStorage).some((k) => k.includes("auth-token")),
  );
  expect(hasSession, "aal1 session should be in localStorage").toBe(true);
}

for (const vp of VIEWPORTS) {
  test.describe(`OAuth-style aal1 returnee @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("aal1 user landing on /login is redirected to /login/2fa, not the redirect target", async ({
      page,
    }) => {
      await passwordSignInToAal1(page);

      // Simulate the Google OAuth callback: the broker drops the user back
      // on /login?redirect=... with the session already persisted. The
      // post-auth effect in LoginPage should detect aal1 + verified factor
      // and bounce to /login/2fa instead of forwarding to /dashboard.
      await page.goto("/login?redirect=%2Fdashboard");

      await page.waitForURL(/\/login\/2fa/, { timeout: 15_000 });
      const url = new URL(page.url());
      expect(url.pathname).toMatch(/^\/login\/2fa/);
      // Original redirect target must be preserved across the bounce.
      expect(url.searchParams.get("redirect")).toBe("/dashboard");

      // Challenge UI must be present and focused — proves we hit the real
      // 2FA route, not a transient loading state.
      await expect(
        page.getByRole("heading", { name: /two-factor verification/i }),
      ).toBeVisible();
      await expect(
        page.getByLabel(/six-digit authenticator code/i),
      ).toBeFocused();
    });

    test("aal1 user attempting a protected route is also bounced to /login/2fa", async ({
      page,
    }) => {
      await passwordSignInToAal1(page);

      // Defense-in-depth: even if a returnee skipped /login (e.g. bookmarked
      // /dashboard), the _authenticated gate must enforce aal2.
      await page.goto("/dashboard");
      await page.waitForURL(/\/login\/2fa/, { timeout: 15_000 });
      expect(new URL(page.url()).pathname).toMatch(/^\/login\/2fa/);
    });
  });
}
