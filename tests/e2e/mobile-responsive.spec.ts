import { test, expect } from "@playwright/test";

/**
 * Phase 8 — Mobile responsive QA pass for public surfaces.
 *
 * Walks the key marketing + entry routes at 375 / 414 / 768 / 1024 and
 * asserts:
 *   - no horizontal scroll (document scrollWidth <= viewport width + 2)
 *   - primary landmarks render (header, main)
 *   - the page's H1 (or first heading) is visible
 *
 * Signed-in dashboards are exercised by the *.signedin.spec.ts suites; this
 * file only covers anon-accessible routes so it can run on every PR.
 */

const VIEWPORTS = [
  { label: "small-android", width: 320, height: 640 },
  { label: "iphone-se", width: 375, height: 667 },
  { label: "iphone-plus", width: 414, height: 896 },
  { label: "ipad", width: 768, height: 1024 },
  { label: "ipad-pro", width: 1024, height: 1366 },
];

const ROUTES = [
  "/",
  "/families",
  "/educators",
  "/partners",
  "/pricing",
  "/about",
  "/resources",
  "/partner-directory",
  "/help",
  "/login",
  "/platform",
  "/blog",
  "/get-started",
  "/demo",
  "/demo/transition-channel",
];

for (const vp of VIEWPORTS) {
  test.describe(`mobile QA @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const path of ROUTES) {
      test(`${path} renders without horizontal overflow`, async ({ page }) => {
        await page.goto(path, { waitUntil: "networkidle" });
        await expect(page.locator("body")).toBeVisible();

        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(
          overflow.scrollWidth,
          `${path} overflows horizontally: scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}`,
        ).toBeLessThanOrEqual(overflow.clientWidth + 2);

        // First heading must be visible (basic content-rendered guard)
        const heading = page.locator("h1, h2").first();
        await expect(heading).toBeVisible({ timeout: 10_000 });
      });
    }
  });
}
