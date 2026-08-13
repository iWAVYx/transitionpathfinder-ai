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

// Full-page screenshots include content that has not physically entered the
// viewport. Capture the product's supported reduced-motion state so scroll
// reveals render visibly and deterministically instead of freezing offscreen
// elements at their pre-animation opacity.
test.use({ reducedMotion: "reduce" });

async function settle(page: Page) {
  await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
  // Disable animations to keep snapshots deterministic.
  await page.addStyleTag({
    content: `*, *::before, *::after { animation: none !important; transition: none !important; }`,
  });

  // Traverse the full page in viewport-sized steps so IntersectionObserver
  // reveals reach the same completed state a user sees after scrolling. A
  // single jump to the bottom can skip elements between render frames and
  // leave meaningful sections at their pre-reveal opacity in a full-page shot.
  await page.evaluate(async () => {
    const step = Math.max(320, Math.floor(window.innerHeight * 0.65));
    const nextPaint = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await nextPaint();
    }
    window.scrollTo(0, 0);
    await nextPaint();
  });

  // Bring every rendered image into view individually. A fast document-wide
  // scroll can skip native loading="lazy" images between animation frames;
  // exercising each image mirrors a real user scroll and makes the gate prove
  // that the decoded pixels are actually available before snapshotting.
  const images = page.locator("img[src]:visible");
  for (let index = 0; index < (await images.count()); index += 1) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(async (element: HTMLImageElement) => {
      await element.decode().catch(() => undefined);
    });
  }
  await page.evaluate(() => window.scrollTo(0, 0));

  await expect
    .poll(
      () =>
        page.locator("img[src]").evaluateAll((images: HTMLImageElement[]) =>
          images
            .filter((image) => image.getClientRects().length > 0)
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
          { fullPage: true, maxDiffPixelRatio: 0.02, timeout: 20_000 },
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
          timeout: 20_000,
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
