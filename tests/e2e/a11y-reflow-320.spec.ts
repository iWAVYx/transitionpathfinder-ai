import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * WCAG 2.2 Reflow (SC 1.4.10) audit.
 *
 * Verifies primary public routes render at a 320 CSS-pixel viewport
 * width without requiring two-dimensional scrolling for content
 * (horizontal scroll is only allowed for content that inherently
 * needs it — data tables, maps, code blocks).
 *
 * Also runs axe-core at 320px so any layout-only violations that
 * only surface at the narrowest supported width are caught.
 */

const A11Y_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

const ROUTES = [
  "/",
  "/families",
  "/educators",
  "/pricing",
  "/about",
  "/resources",
  "/help",
  "/login",
  "/get-started",
  "/get-started/student",
  "/get-started/family",
  "/get-started/educator",
  "/get-started/school",
  "/get-started/district",
  "/get-started/partner",
];

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    // Allow explicit horizontally-scrollable regions (data tables, maps,
    // code blocks) — flag only unexpected overflow on the document itself.
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  // Tolerate 1px sub-pixel rounding.
  expect(
    overflow.scrollWidth - overflow.clientWidth,
    `horizontal overflow: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`,
  ).toBeLessThanOrEqual(1);
}

async function expectClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.slice(0, 5).map((n) => ({
      target: n.target,
      html: n.html?.slice(0, 200),
    })),
  }));
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

test.describe("public a11y @ reflow 320x800 (WCAG 2.2 SC 1.4.10)", () => {
  test.use({ viewport: { width: 320, height: 800 } });

  for (const path of ROUTES) {
    test(`${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
      await expectNoHorizontalOverflow(page);
      await expectClean(page);
    });
  }
});
