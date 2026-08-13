/**
 * Visual regression snapshots.
 *
 *  - Public marketing pages screenshot at mobile / tablet / desktop.
 *  - Per-role dashboard screenshots (when storage state is available).
 *  - Layout stability checks: dashboard cards / CTA groups / primary nav
 *    keep the same bounding-box count across two consecutive loads so
 *    layout shift regressions surface even without a baseline image.
 *
 * Baselines are generated on first run. Update intentionally with:
 *   bunx playwright test --project=release-public --update-snapshots
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { ROLES } from "../helpers/roles";

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "tablet", width: 820, height: 1180 },
  { label: "desktop", width: 1440, height: 900 },
] as const;

const PUBLIC_PAGES = ["/", "/families", "/educators", "/partners", "/pricing"];

async function settle(page: Page) {
  await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
  // Disable animations to keep snapshots deterministic.
  await page.addStyleTag({
    content: `*, *::before, *::after { animation: none !important; transition: none !important; }`,
  });

  // Visit the full document before taking a full-page screenshot. This triggers
  // lazy-loaded images and IntersectionObserver-based reveal sections so the
  // baseline represents the page a user sees while scrolling.
  await page.evaluate(async () => {
    const step = Math.max(300, Math.floor(window.innerHeight * 0.75));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    window.scrollTo(0, 0);
  });

  await expect
    .poll(
      () =>
        page.locator("img[src]").evaluateAll((images: HTMLImageElement[]) =>
          images
            .filter((image) => !image.complete || image.naturalWidth === 0)
            .map((image) => image.currentSrc || image.src),
        ),
      { message: "page contains unloaded or broken images", timeout: 15_000 },
    )
    .toEqual([]);
  await page.waitForTimeout(300);
}

for (const vp of VIEWPORTS) {
  test.describe(`public visual @ ${vp.label}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    for (const route of PUBLIC_PAGES) {
      test(`${route}`, async ({ page }) => {
        await page.goto(route, { waitUntil: "networkidle" });
        await settle(page);
        await expect(page).toHaveScreenshot(
          `${vp.label}${route === "/" ? "/home" : route}.png`.replace(/\//g, "_"),
          { fullPage: true, maxDiffPixelRatio: 0.02 },
        );
      });
    }
  });
}

for (const role of ROLES) {
  test.describe(`signed-in visual — ${role.label}`, () => {
    test.skip(() => !existsSync(role.storageState), `no storageState for ${role.key}`);
    test.use({ storageState: role.storageState });

    for (const vp of VIEWPORTS) {
      test(`${role.dashboard} @ ${vp.label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(role.dashboard, { waitUntil: "networkidle" });
        await settle(page);
        await expect(page).toHaveScreenshot(`${role.key}_${vp.label}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.02,
        });
      });

      test(`${role.key} layout is stable across reload @ ${vp.label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(role.dashboard, { waitUntil: "networkidle" });
        await settle(page);
        const baseline = await captureLayout(page);
        await page.reload({ waitUntil: "networkidle" });
        await settle(page);
        const next = await captureLayout(page);
        expect(next, "primary nav / CTAs / cards count drifted across reload").toEqual(baseline);
      });
    }
  });
}

async function captureLayout(page: Page) {
  return page.evaluate(() => {
    const navLinks = document.querySelectorAll("nav a[href]").length;
    const cards = document.querySelectorAll("main [data-card], main .card, main [class*='card']")
      .length;
    const ctas = document.querySelectorAll("main a[href], main button").length;
    return { navLinks, cards, ctas };
  });
}
