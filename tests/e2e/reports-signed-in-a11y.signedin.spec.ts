import { test, expect, type Page } from "@playwright/test";
import {
  A11Y_TAGS,
  expectNoAxeViolations,
  expectReportLandmarks,
  expectKeyboardFlows,
} from "./helpers/report-a11y-checks";
import AxeBuilder from "@axe-core/playwright";

/**
 * Signed-in accessibility audit for the authenticated Pathway Report page
 * (`/reports/$reportId`). Shares helpers with the 2FA spec so the post-2FA
 * audit covers the same surface.
 */

const REPORT_ID = process.env.E2E_REPORT_ID;

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

for (const vp of VIEWPORTS) {
  test.describe(`signed-in report a11y @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("axe-core finds no violations on initial render", async ({ page }) => {
      await gotoSignedInReport(page);
      await expectNoAxeViolations(page);
    });

    test("axe-core finds no violations mid-scroll", async ({ page }) => {
      await gotoSignedInReport(page);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(200);
      await expectNoAxeViolations(page);
    });

    test("primary landmarks stay unique and labelled", async ({ page }) => {
      await gotoSignedInReport(page);
      await expectReportLandmarks(page, vp.width);
    });

    test("audience tabs and collapsible sections respond to keyboard", async ({
      page,
    }) => {
      await gotoSignedInReport(page);
      await expectKeyboardFlows(page);
    });
  });
}

// Suppress unused-import warning — A11Y_TAGS is re-exported for downstream specs.
void A11Y_TAGS;
void AxeBuilder;
