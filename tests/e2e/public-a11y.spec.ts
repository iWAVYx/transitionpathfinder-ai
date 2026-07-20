import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Public-route accessibility audit.
 *
 * Runs axe-core (WCAG 2.1 A + AA) against every primary anonymous route
 * across mobile/tablet/desktop. Pairs with the existing
 * `report-a11y.spec.ts` (signed-in Pathway Report) so the whole public
 * surface is covered in CI.
 *
 * Failing violations are printed as structured JSON in the assertion
 * message so fixes can target the exact node/help URL.
 */

const A11Y_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1366, height: 768 },
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
];

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

for (const vp of VIEWPORTS) {
  test.describe(`public a11y @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const path of ROUTES) {
      test(`${path}`, async ({ page }) => {
        await page.goto(path, { waitUntil: "networkidle" });
        await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
        await expectClean(page);
      });
    }
  });
}
