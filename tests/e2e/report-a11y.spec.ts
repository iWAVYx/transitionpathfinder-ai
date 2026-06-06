import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility audit for the demo Pathway Report page.
 *
 * Runs axe-core (WCAG 2.1 A + AA + best-practice) against the whole
 * report page across mobile, tablet, and desktop viewports, and exercises
 * the key keyboard flows (outline sidebar combobox, audience tabs,
 * collapsible report sections) to ensure they stay compliant in CI.
 */

const REPORT_URL = "/demo/report";

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "desktop", width: 1440, height: 900 },
];

const A11Y_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "best-practice",
];

async function gotoReport(page: Page) {
  await page.goto(REPORT_URL, { waitUntil: "networkidle" });
  // Main report heading should be present before we audit.
  await page.getByRole("main").waitFor();
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
  test.describe(`report a11y @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("initial render has no axe violations", async ({ page }) => {
      await gotoReport(page);

      const results = await new AxeBuilder({ page })
        .withTags(A11Y_TAGS)
        .analyze();

      const formatted = formatViolations(results.violations);
      expect(formatted, JSON.stringify(formatted, null, 2)).toEqual([]);
    });

    test("scrolled mid-page state has no axe violations", async ({ page }) => {
      await gotoReport(page);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(200);

      const results = await new AxeBuilder({ page })
        .withTags(A11Y_TAGS)
        .analyze();

      const formatted = formatViolations(results.violations);
      expect(formatted, JSON.stringify(formatted, null, 2)).toEqual([]);
    });
  });
}

test.describe("report a11y — key flow checks @ desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("outline sidebar exposes combobox/listbox semantics and live status", async ({
    page,
  }) => {
    await gotoReport(page);

    const outline = page.getByRole("complementary", { name: /outline/i });
    await expect(outline).toBeVisible();

    const search = outline.getByRole("combobox", { name: /search outline/i });
    await expect(search).toBeVisible();
    await expect(search).toHaveAttribute("aria-expanded", "true");
    await expect(search).toHaveAttribute("aria-controls", "report-outline-list");

    const listbox = page.locator("#report-outline-list");
    await expect(listbox).toHaveAttribute("role", "listbox");

    // Keyboard reachable + typing updates the live region.
    await search.focus();
    await page.keyboard.type("career");
    const status = page.locator("#report-outline-status");
    await expect(status).toHaveAttribute("aria-live", /polite|assertive/);
    await expect(status).not.toBeEmpty();

    // ArrowDown moves active option without losing focus on the input.
    await page.keyboard.press("ArrowDown");
    await expect(search).toBeFocused();
    const activeId = await search.getAttribute("aria-activedescendant");
    expect(activeId, "ArrowDown should set aria-activedescendant").toBeTruthy();

    // Escape clears the query.
    await page.keyboard.press("Escape");
    await expect(search).toHaveValue("");
  });

  test("audience tabs expose tab/tablist semantics", async ({ page }) => {
    await gotoReport(page);
    const tablist = page.getByRole("tablist").first();
    await expect(tablist).toBeVisible();
    const tabs = tablist.getByRole("tab");
    expect(await tabs.count()).toBeGreaterThan(1);
    for (let i = 0; i < (await tabs.count()); i++) {
      const tab = tabs.nth(i);
      const name = (await tab.getAttribute("aria-label")) || (await tab.innerText());
      expect(name?.trim(), `tab #${i} has accessible name`).toBeTruthy();
      expect(await tab.getAttribute("aria-selected")).toMatch(/true|false/);
    }
  });

  test("collapsible report sections toggle aria-expanded", async ({ page }) => {
    await gotoReport(page);
    // First section toggle button (rendered by ReportView block headers).
    const toggles = page.locator('button[aria-expanded][aria-controls]');
    const count = await toggles.count();
    expect(count, "report has collapsible section toggles").toBeGreaterThan(0);

    const first = toggles.first();
    const initial = await first.getAttribute("aria-expanded");
    await first.scrollIntoViewIfNeeded();
    await first.click();
    const next = await first.getAttribute("aria-expanded");
    expect(next).not.toBe(initial);
  });
});
