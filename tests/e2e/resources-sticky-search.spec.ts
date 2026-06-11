import { test, expect, type Page } from "@playwright/test";

/**
 * Verify the sticky search bar on /resources stays correctly aligned
 * (pinned beneath the site header, with the filter bar stacked directly
 * underneath it) across common viewport sizes and after scrolling.
 *
 * Assumptions encoded by src/routes/resources.tsx:
 *   - Site header is 64px tall (Tailwind `top-16` = 4rem = 64px)
 *   - Sticky search section uses `top-16`  (64px from viewport top)
 *   - Sticky filter bar    uses `top-36`  (144px from viewport top)
 */

const HEADER_OFFSET = 64; // matches `top-16`
const FILTER_OFFSET = 144; // matches `top-36`
const ALIGNMENT_TOLERANCE = 4; // px — allow sub-pixel + backdrop padding

const VIEWPORTS = [
  { label: "mobile-portrait", width: 375, height: 812 },
  { label: "mobile-landscape", width: 640, height: 360 },
  { label: "tablet-portrait", width: 768, height: 1024 },
  { label: "tablet-landscape", width: 1024, height: 768 },
  { label: "small-desktop", width: 1280, height: 720 },
  { label: "desktop", width: 1440, height: 900 },
  { label: "large-desktop", width: 1920, height: 1080 },
];

async function boxOf(page: Page, testId: string) {
  const el = page.getByTestId(testId);
  await el.waitFor({ state: "visible" });
  const box = await el.boundingBox();
  if (!box) throw new Error(`No bounding box for ${testId}`);
  return box;
}

async function gotoResources(page: Page) {
  await page.goto("/resources", { waitUntil: "networkidle" });
  // Wait for the sticky search section to be in the DOM
  await page.getByTestId("resources-sticky-search").waitFor();
}

async function openSearchIfCollapsed(page: Page, width: number) {
  // On mobile (< sm = 640px) the search input starts collapsed
  if (width < 640) {
    const toggle = page.getByTestId("resources-search-toggle");
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
    }
  }
}

for (const vp of VIEWPORTS) {
  test.describe(`sticky search @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("pins beneath header after scrolling and stacks above filter bar", async ({
      page,
    }) => {
      await gotoResources(page);

      // Scroll well past the hero so both sticky regions are pinned.
      await page.evaluate(() => window.scrollTo(0, 1500));
      // Allow the browser to settle layout after scroll.
      await page.waitForTimeout(150);

      await openSearchIfCollapsed(page, vp.width);

      const search = await boxOf(page, "resources-sticky-search");
      const filters = await boxOf(page, "resources-sticky-filters");

      // 1. Search bar is pinned at the header offset (within tolerance).
      expect(
        Math.abs(search.y - HEADER_OFFSET),
        `search.y=${search.y} expected≈${HEADER_OFFSET}`,
      ).toBeLessThanOrEqual(ALIGNMENT_TOLERANCE);

      // 2. Search bar is visible inside the viewport.
      expect(search.y).toBeGreaterThanOrEqual(0);
      expect(search.y + search.height).toBeLessThanOrEqual(vp.height);

      // 3. Filter bar is pinned at its own offset (within tolerance) on
      //    viewports tall enough to actually pin it. On very short
      //    viewports the filter bar may scroll off-screen below.
      if (vp.height >= FILTER_OFFSET + 80) {
        expect(
          Math.abs(filters.y - FILTER_OFFSET),
          `filters.y=${filters.y} expected≈${FILTER_OFFSET}`,
        ).toBeLessThanOrEqual(ALIGNMENT_TOLERANCE);

        // 4. Filter bar sits BELOW the search bar (no overlap).
        expect(filters.y).toBeGreaterThanOrEqual(search.y + search.height - 1);
      }

      // 5. Search bar spans the page width minus container padding —
      //    it should never collapse to zero or overflow the viewport.
      expect(search.width).toBeGreaterThan(vp.width * 0.5);
      expect(search.x).toBeGreaterThanOrEqual(0);
      expect(search.x + search.width).toBeLessThanOrEqual(vp.width + 1);
    });

    test("search input remains interactive while sticky", async ({ page }) => {
      await gotoResources(page);
      await page.evaluate(() => window.scrollTo(0, 1500));
      await page.waitForTimeout(150);

      await openSearchIfCollapsed(page, vp.width);

      const input = page
        .getByTestId("resources-sticky-search")
        .getByPlaceholder(/Search videos, podcasts/i);
      await input.fill("transition");
      await expect(input).toHaveValue("transition");
    });
  });
}
