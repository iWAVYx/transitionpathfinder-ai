import { test, expect, type Page } from "@playwright/test";

/**
 * Signed-in density toggle persistence + application for the Pathway
 * Report surfaces:
 *
 *   /reports                    → uses `tf.viewDensity`
 *   /reports/$reportId          → uses `tf.reportDensity`
 *
 * Both pages render a Compact/Comfortable toggle. We verify the toggle
 * state syncs with localStorage, persists across reloads, and visibly
 * changes the page layout (container width on the report detail page,
 * card padding on the reports list).
 *
 * Skipped when E2E_REPORT_ID is not set, matching other signed-in specs.
 */

const REPORT_ID = process.env.E2E_REPORT_ID;

test.skip(!REPORT_ID, "E2E_REPORT_ID not set — density signed-in tests skipped");
test.use({ viewport: { width: 1440, height: 900 } });

function compactBtn(page: Page) {
  return page.getByRole("button", { name: /^Compact$/ }).first();
}

function comfortableBtn(page: Page) {
  return page.getByRole("button", { name: /^Comfortable$/ }).first();
}

async function readKey(page: Page, key: string) {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

async function gotoReportsList(page: Page) {
  await page.goto("/reports", { waitUntil: "networkidle" });
  await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
  expect(
    new URL(page.url()).pathname,
    "Expected /reports, not /login. Storage state may be stale.",
  ).not.toMatch(/^\/login/);
}

async function gotoReportDetail(page: Page) {
  await page.goto(`/reports/${REPORT_ID}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
  expect(
    new URL(page.url()).pathname,
    "Expected /reports/$reportId, not /login. Storage state may be stale.",
  ).not.toMatch(/^\/login/);
}

test.describe("Reports list (/reports) density toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("tf.viewDensity");
      } catch {
        /* ignore */
      }
    });
  });

  test("persists and applies compact ↔ comfortable", async ({ page }) => {
    await gotoReportsList(page);

    // If the user has zero reports the toggle (and cards) won't render.
    // Skip in that case rather than fail — the persistence path is
    // already covered by the resources spec; here we exercise the
    // signed-in surface only when content exists.
    const hasCards = (await page.locator("article, ul > li").count()) > 0;
    test.skip(!hasCards, "No reports for this user — list toggle not rendered");

    // Default is compact.
    await expect(compactBtn(page)).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() => readKey(page, "tf.viewDensity"))
      .toBe("compact");

    // Measure a card's padding under compact.
    const card = page.locator("ul > li").first();
    await card.waitFor({ state: "visible" });
    const compactPad = await card.evaluate(
      (el) => parseFloat(getComputedStyle(el as HTMLElement).paddingLeft) || 0,
    );

    // Flip to comfortable.
    await comfortableBtn(page).click();
    await expect(comfortableBtn(page)).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() => readKey(page, "tf.viewDensity"))
      .toBe("comfortable");

    const comfortablePad = await card.evaluate(
      (el) => parseFloat(getComputedStyle(el as HTMLElement).paddingLeft) || 0,
    );
    expect(comfortablePad).toBeGreaterThan(compactPad + 4);

    // Reload — comfortable survives.
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
    await expect(comfortableBtn(page)).toHaveAttribute("aria-pressed", "true");
    expect(await readKey(page, "tf.viewDensity")).toBe("comfortable");
  });
});

test.describe("Report detail (/reports/$reportId) density toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("tf.reportDensity");
      } catch {
        /* ignore */
      }
    });
  });

  test("persists and applies compact ↔ comfortable; widens wrapper", async ({
    page,
  }) => {
    await gotoReportDetail(page);

    // Default is compact (per ReportView.tsx).
    await expect(compactBtn(page)).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() => readKey(page, "tf.reportDensity"))
      .toBe("compact");

    // The link-to-student / share-panel sections are width-toggled by
    // the wrapping route. Measure the share panel's container width
    // under compact, then again under comfortable.
    const sharePanel = page.locator("#share-panel");
    await sharePanel.scrollIntoViewIfNeeded();
    const compactWidth = (await sharePanel.boundingBox())?.width ?? 0;
    expect(compactWidth).toBeGreaterThan(0);

    // Flip to comfortable.
    await comfortableBtn(page).click();
    await expect(comfortableBtn(page)).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() => readKey(page, "tf.reportDensity"))
      .toBe("comfortable");

    await sharePanel.scrollIntoViewIfNeeded();
    const comfortableWidth = (await sharePanel.boundingBox())?.width ?? 0;
    // Compact = max-w-[92rem] (~1472px); comfortable = max-w-4xl (~896px).
    // At a 1440px viewport the compact wrapper should be visibly wider.
    expect(compactWidth).toBeGreaterThan(comfortableWidth + 100);

    // Reload — comfortable survives in localStorage AND aria state.
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
    await expect(comfortableBtn(page)).toHaveAttribute("aria-pressed", "true");
    expect(await readKey(page, "tf.reportDensity")).toBe("comfortable");

    // Flip back to compact + reload one more time.
    await compactBtn(page).click();
    await expect(compactBtn(page)).toHaveAttribute("aria-pressed", "true");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
    await expect(compactBtn(page)).toHaveAttribute("aria-pressed", "true");
    expect(await readKey(page, "tf.reportDensity")).toBe("compact");
  });

  test("seeded tf.reportDensity hydrates ReportView on first paint", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("tf.reportDensity", "comfortable");
    });
    await gotoReportDetail(page);
    await expect(comfortableBtn(page)).toHaveAttribute("aria-pressed", "true");
    await expect(compactBtn(page)).toHaveAttribute("aria-pressed", "false");
  });
});
