import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Sky & Peach palette contrast audit.
 *
 * The demo flow and Pathway Report opt into a scoped "demo-shell" /
 * "report-shell" token override so their visuals can diverge from the
 * marketing site without leaking across the rest of the app. This spec
 * locks in WCAG 2.1 AA color-contrast on every surface that consumes
 * those tokens — body copy, buttons, links, badges — across mobile and
 * desktop viewports.
 *
 * Pairs with `public-a11y.spec.ts` (full anonymous-route audit) and
 * `report-a11y.spec.ts` (signed-in report). This file is intentionally
 * narrowed to `color-contrast` + `link-in-text-block` so palette
 * regressions surface as their own CI signal, separate from structural
 * a11y issues.
 */

const CONTRAST_RULES = ["color-contrast", "link-in-text-block"];

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1366, height: 900 },
];

// Every public demo step + the standalone report view. Hub/report are
// the highest-density surfaces, so they catch the most token misuse.
const ROUTES = [
  "/demo",
  "/demo/intake",
  "/demo/documents",
  "/demo/report",
  "/demo/plan",
  "/demo/calendar",
  "/demo/meeting",
  "/demo/next",
  "/demo/hub",
  "/demo/resources",
  "/demo/opportunities",
  "/demo/connection",
];

async function expectContrastClean(page: Page) {
  const results = await new AxeBuilder({ page })
    .withRules(CONTRAST_RULES)
    .analyze();
  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.slice(0, 5).map((n) => ({
      target: n.target,
      html: n.html?.slice(0, 200),
      summary: n.failureSummary?.replace(/\n/g, " | ").slice(0, 300),
    })),
  }));
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

for (const vp of VIEWPORTS) {
  test.describe(`Sky & Peach contrast @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const path of ROUTES) {
      test(`${path}`, async ({ page }) => {
        await page.goto(path, { waitUntil: "networkidle" });
        await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
        await expectContrastClean(page);
      });
    }
  });
}
