import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Signed-in accessibility audit for the authenticated Pathway Report page
 * (`/reports/$reportId`). Mirrors the public demo report a11y suite so the
 * SAME `ReportView` component is checked in the real, signed-in shell —
 * including the auth-aware SiteHeader and report-detail toolbar that only
 * render when a user is logged in.
 *
 * Requires E2E_REPORT_ID at run time (a report ID the test user owns or has
 * access to). The whole suite is skipped when it's missing so PRs / forks
 * without secrets don't fail.
 */

const REPORT_ID = process.env.E2E_REPORT_ID;

const A11Y_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "best-practice",
];

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "desktop", width: 1440, height: 900 },
];

test.skip(!REPORT_ID, "E2E_REPORT_ID not set — signed-in report a11y skipped");

async function gotoSignedInReport(page: Page) {
  await page.goto(`/reports/${REPORT_ID}`, { waitUntil: "networkidle" });

  // _authenticated layout shows a "Loading…" splash while it hydrates the
  // session + onboarding check. Wait for the real report shell to appear.
  await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });

  // If the gate bounced us back to /login the storageState is stale —
  // fail fast with a clear message instead of running the audit on a
  // login screen.
  expect(
    new URL(page.url()).pathname,
    "Expected to land on /reports/$reportId, not /login. Refresh storageState (E2E_USER_EMAIL/E2E_USER_PASSWORD).",
  ).not.toMatch(/^\/login/);
}

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
) {
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => n.target).flat(),
  }));
}

for (const vp of VIEWPORTS) {
  test.describe(`signed-in report a11y @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("axe-core finds no violations on initial render", async ({ page }) => {
      await gotoSignedInReport(page);
      const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
      const formatted = formatViolations(results.violations);
      expect(formatted, JSON.stringify(formatted, null, 2)).toEqual([]);
    });

    test("axe-core finds no violations mid-scroll", async ({ page }) => {
      await gotoSignedInReport(page);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(200);
      const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
      const formatted = formatViolations(results.violations);
      expect(formatted, JSON.stringify(formatted, null, 2)).toEqual([]);
    });

    test("primary landmarks stay unique and labelled", async ({ page }) => {
      await gotoSignedInReport(page);

      // Auth-aware SiteHeader nav.
      await expect(page.getByRole("navigation", { name: /primary/i })).toBeVisible();

      // Single, named <main>.
      const mains = page.getByRole("main");
      expect(await mains.count()).toBe(1);

      // Desktop-only outline must NOT render on mobile/tablet.
      const outline = page.getByRole("complementary", { name: /outline/i });
      if (vp.width >= 1024) {
        await expect(outline).toBeVisible();
      } else {
        await expect(outline).toHaveCount(0);
      }
    });

    test("audience tabs and collapsible sections respond to keyboard", async ({
      page,
    }) => {
      await gotoSignedInReport(page);

      const tabs = page.getByRole("tablist").first().getByRole("tab");
      expect(await tabs.count()).toBeGreaterThan(1);
      const firstTab = tabs.first();
      await firstTab.scrollIntoViewIfNeeded();
      await firstTab.focus();
      await page.keyboard.press("ArrowRight");
      const focusedRole = await page.evaluate(() =>
        document.activeElement?.getAttribute("role"),
      );
      expect(focusedRole).toBe("tab");

      const toggle = page.locator('button[aria-expanded][aria-controls]').first();
      await toggle.scrollIntoViewIfNeeded();
      const initial = await toggle.getAttribute("aria-expanded");
      await toggle.click();
      const next = await toggle.getAttribute("aria-expanded");
      expect(next).not.toBe(initial);
    });
  });
}
