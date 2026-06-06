import { test, expect, type Page } from "@playwright/test";

/**
 * Signed-in session lifecycle audit. Exercises the authenticated report
 * page (`/reports/$reportId`) at mobile + tablet + desktop and verifies:
 *
 *   1. Explicit sign-out from the header navigates away from the
 *      protected route and clears the Supabase session from
 *      localStorage. Re-visiting the protected URL bounces to /login.
 *   2. Session expiry mid-visit (simulated by wiping the auth keys from
 *      localStorage and reloading) bounces the user to /login with a
 *      ?redirect= param pointing back to the report.
 *
 * Skipped automatically when E2E_REPORT_ID is missing so PRs without
 * secrets don't fail. Uses the storageState saved by auth.setup.ts.
 */

const REPORT_ID = process.env.E2E_REPORT_ID;

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "desktop", width: 1440, height: 900 },
];

test.skip(!REPORT_ID, "E2E_REPORT_ID not set — signed-in session lifecycle suite skipped");

async function gotoSignedInReport(page: Page) {
  await page.goto(`/reports/${REPORT_ID}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
  expect(
    new URL(page.url()).pathname,
    "storageState appears stale (redirected to /login)",
  ).not.toMatch(/^\/login/);
}

async function clickSignOut(page: Page, isMobile: boolean) {
  if (isMobile) {
    // Mobile/tablet header collapses primary nav + sign-out behind a hamburger.
    await page.getByRole("button", { name: /open menu/i }).click();
  }
  // Both desktop inline button and mobile sheet button have the same name.
  await page.getByRole("button", { name: /sign out/i }).click();
}

async function hasSupabaseSession(page: Page) {
  return page.evaluate(() =>
    Object.keys(window.localStorage).some((k) => k.includes("auth-token")),
  );
}

for (const vp of VIEWPORTS) {
  test.describe(`session lifecycle @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    const isSmall = vp.width < 1024;

    test("explicit sign-out clears session and protects the route", async ({
      page,
    }) => {
      await gotoSignedInReport(page);
      expect(await hasSupabaseSession(page)).toBe(true);

      await clickSignOut(page, isSmall);

      // After signOut() the layout's effect or router invalidation should
      // navigate away from the protected URL.
      await page.waitForURL(
        (url) => !url.pathname.startsWith(`/reports/${REPORT_ID}`),
        { timeout: 15_000 },
      );
      expect(await hasSupabaseSession(page)).toBe(false);

      // Hitting the protected URL again must now bounce to /login.
      await page.goto(`/reports/${REPORT_ID}`, { waitUntil: "networkidle" });
      await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/login/);
    });

    test("expired session mid-visit redirects to /login with redirect param", async ({
      page,
    }) => {
      await gotoSignedInReport(page);
      expect(await hasSupabaseSession(page)).toBe(true);

      // Simulate the Supabase refresh token being rejected / expired by
      // wiping every auth key, then reloading the protected page.
      await page.evaluate(() => {
        Object.keys(window.localStorage)
          .filter((k) => k.includes("auth-token") || k.startsWith("sb-"))
          .forEach((k) => window.localStorage.removeItem(k));
      });

      await page.reload({ waitUntil: "networkidle" });

      // The _authenticated gate must bounce to /login and preserve where
      // the user was trying to go via ?redirect=.
      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
        .toMatch(/^\/login/);
      const redirectParam = new URL(page.url()).searchParams.get("redirect");
      expect(redirectParam, "login route should remember the protected URL").toContain(
        `/reports/${REPORT_ID}`,
      );

      // Login page must still render its main landmark — basic a11y guard
      // so the redirect target is not a blank screen.
      await expect(page.getByRole("main")).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: /primary/i }),
      ).toBeVisible();
    });
  });
}
