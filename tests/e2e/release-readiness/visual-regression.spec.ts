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

const RELEASE_FONT_QUERIES = [
  '300 16px "Karla Variable"',
  '400 16px "Karla Variable"',
  '500 16px "Karla Variable"',
  '600 16px "Karla Variable"',
  '700 16px "Karla Variable"',
  '400 16px "Cormorant Garamond Variable"',
  '500 16px "Cormorant Garamond Variable"',
  '600 16px "Cormorant Garamond Variable"',
  '700 16px "Cormorant Garamond Variable"',
  'italic 400 16px "Cormorant Garamond Variable"',
  'italic 500 16px "Cormorant Garamond Variable"',
] as const;

const RELEASE_FONT_NETWORK_ERROR = "RELEASE_FONT_NETWORK_ERROR";

async function openForVisualCapture(page: Page, route: string) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await page.goto(route, { waitUntil: "networkidle" });

    try {
      await settle(page, { requireReleaseFonts: true });
      return;
    } catch (error) {
      const isTransientFontFailure =
        error instanceof Error && error.message.includes(RELEASE_FONT_NETWORK_ERROR);

      if (!isTransientFontFailure || attempt === maxAttempts) {
        throw error;
      }

      // A rejected FontFace remains in the error state for the life of the
      // document. Start with a fresh document after a short backoff so a
      // transient fonts.gstatic.com failure gets another chance. Persistent
      // failures still fail closed after the bounded third attempt.
      await page.waitForTimeout(attempt * 1_000);
    }
  }
}

async function settle(page: Page, options: { requireReleaseFonts?: boolean } = {}) {
  await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });

  // The first visual test can reach screenshot capture before Google Fonts has
  // replaced its fallback faces. That changes text wrapping and accumulates
  // page-height drift even though the UI code is identical. Load the product's
  // primary faces explicitly and fail closed if the stylesheet did not
  // register them instead of accepting a fallback-font baseline.
  if (options.requireReleaseFonts) {
    const fontResult = await page.evaluate(async (queries) => {
      const loaded = await Promise.all(
        queries.map(async (query) => {
          try {
            return {
              query,
              faces: (await document.fonts.load(query, "TransitionForward release readiness"))
                .length,
              networkError: false,
            };
          } catch {
            return { query, faces: 0, networkError: true };
          }
        }),
      );
      await document.fonts.ready;
      return {
        missing: loaded
          .filter(({ faces, networkError }) => faces === 0 && !networkError)
          .map(({ query }) => query),
        networkErrors: loaded.filter(({ networkError }) => networkError).map(({ query }) => query),
      };
    }, RELEASE_FONT_QUERIES);

    if (fontResult.networkErrors.length > 0) {
      throw new Error(`${RELEASE_FONT_NETWORK_ERROR}: ${fontResult.networkErrors.join(", ")}`);
    }
    expect(fontResult.missing, "release typography faces did not load").toEqual([]);
  }

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
  // Scrolling can introduce additional below-fold font faces. Do not capture
  // until the browser has completed every font load requested by that layout.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(300);
}

for (const vp of VIEWPORTS) {
  test.describe(`public visual @ ${vp.label}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    for (const route of PUBLIC_PAGES) {
      test(`${route}`, async ({ page }) => {
        await openForVisualCapture(page, route);
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
        await openForVisualCapture(page, role.dashboard);
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
    const cards = document.querySelectorAll(
      "main [data-card], main .card, main [class*='card']",
    ).length;
    const ctas = document.querySelectorAll("main a[href], main button").length;
    return { navLinks, cards, ctas };
  });
}
