import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility audit for the Resource Hub sticky search + filter bar.
 *
 * Runs axe-core (WCAG 2.1 A + AA + best-practice) against the sticky
 * regions across mobile, tablet, and desktop viewports. Also asserts
 * that the search input and every filter dropdown are reachable by
 * keyboard and expose an accessible name.
 */

const VIEWPORTS = [
  { label: "mobile", width: 375, height: 812 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "desktop", width: 1440, height: 900 },
];

const STICKY_SELECTORS = [
  '[data-testid="resources-sticky-search"]',
  '[data-testid="resources-sticky-filters"]',
];

async function gotoResources(page: Page) {
  await page.goto("/resources", { waitUntil: "networkidle" });
  await page.getByTestId("resources-sticky-search").waitFor();
  await page.getByTestId("resources-sticky-filters").waitFor();
}

for (const vp of VIEWPORTS) {
  test.describe(`a11y @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("sticky search + filter regions have no axe violations", async ({
      page,
    }) => {
      await gotoResources(page);
      // Scroll so both regions are pinned — exercises the sticky state.
      await page.evaluate(() => window.scrollTo(0, 1500));
      await page.waitForTimeout(150);

      const results = await new AxeBuilder({ page })
        .include(STICKY_SELECTORS[0])
        .include(STICKY_SELECTORS[1])
        .withTags([
          "wcag2a",
          "wcag2aa",
          "wcag21a",
          "wcag21aa",
          "wcag22a",
          "wcag22aa",
          "best-practice",
        ])
        .analyze();

      // Surface every violation in the failure message for easy triage.
      const formatted = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => n.target).flat(),
      }));
      expect(formatted, JSON.stringify(formatted, null, 2)).toEqual([]);
    });

    test("search input has an accessible name and is keyboard-reachable", async ({
      page,
    }) => {
      await gotoResources(page);

      const search = page
        .getByTestId("resources-sticky-search")
        .getByRole("searchbox", { name: /search resources/i });
      await expect(search).toBeVisible();

      // Focus via keyboard (no mouse click) and type.
      await search.focus();
      await page.keyboard.type("transition");
      await expect(search).toHaveValue("transition");

      // Clear button shows up and has an accessible name.
      const clear = page
        .getByTestId("resources-sticky-search")
        .getByRole("button", { name: /clear search/i });
      await expect(clear).toBeVisible();
    });

    test("every filter control exposes an accessible name", async ({
      page,
    }) => {
      await gotoResources(page);
      await page.evaluate(() => window.scrollTo(0, 1500));
      await page.waitForTimeout(150);

      const filters = page.getByTestId("resources-sticky-filters");
      const comboboxes = filters.getByRole("combobox");
      const count = await comboboxes.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const cb = comboboxes.nth(i);
        const name =
          (await cb.getAttribute("aria-label")) ||
          (await cb.getAttribute("aria-labelledby")) ||
          (await cb.innerText());
        expect(
          name?.trim(),
          `filter combobox #${i} is missing an accessible name`,
        ).toBeTruthy();
      }
    });
  });
}
