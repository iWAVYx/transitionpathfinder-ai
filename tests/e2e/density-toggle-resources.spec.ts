import { test, expect, type Page } from "@playwright/test";

/**
 * Public-route density toggle persistence + application.
 *
 * Covers the Resource Library (/resources). Verifies that the
 * Compact/Comfortable toggle:
 *   - writes "compact" | "comfortable" to localStorage.tf.viewDensity
 *   - keeps aria-pressed in sync with current state
 *   - persists across a full page reload
 *   - visibly changes the rendered card density (padding shrinks under
 *     compact, expands under comfortable)
 *
 * No auth required.
 */

test.use({ viewport: { width: 1440, height: 900 } });

async function gotoResources(page: Page) {
  await page.goto("/resources", { waitUntil: "networkidle" });
  await page.getByTestId("resources-sticky-search").waitFor();
}

function compactBtn(page: Page) {
  // Buttons in the density toggle are simple <button>Compact</button> /
  // <button>Comfortable</button> inside the sticky toolbar.
  return page.getByRole("button", { name: /^Compact$/ }).first();
}

function comfortableBtn(page: Page) {
  return page.getByRole("button", { name: /^Comfortable$/ }).first();
}

async function readKey(page: Page, key: string) {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

async function firstResourceCardPadding(page: Page): Promise<number> {
  // Scroll the browse grid into view; ResourceCard root is a <article>
  // inside the results grid. Measure the closest article we can find.
  const card = page.locator("article").first();
  await card.scrollIntoViewIfNeeded();
  await card.waitFor({ state: "visible" });
  return await card.evaluate(
    (el) => parseFloat(getComputedStyle(el as HTMLElement).paddingLeft) || 0,
  );
}

test.describe("Resource Library density toggle", () => {
  test.beforeEach(async ({ page }) => {
    // Start each spec from a known-clean state so tests don't bleed.
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("tf.viewDensity");
      } catch {
        /* ignore */
      }
    });
  });

  test("persists compact ↔ comfortable across reloads and updates aria-pressed", async ({
    page,
  }) => {
    await gotoResources(page);

    // Default state is compact (per src/routes/resources.tsx).
    await expect(compactBtn(page)).toHaveAttribute("aria-pressed", "true");
    await expect(comfortableBtn(page)).toHaveAttribute("aria-pressed", "false");
    // The persistence effect writes once on mount.
    await expect
      .poll(() => readKey(page, "tf.viewDensity"))
      .toBe("compact");

    const compactPad = await firstResourceCardPadding(page);

    // Flip to comfortable.
    await comfortableBtn(page).click();
    await expect(comfortableBtn(page)).toHaveAttribute("aria-pressed", "true");
    await expect(compactBtn(page)).toHaveAttribute("aria-pressed", "false");
    await expect
      .poll(() => readKey(page, "tf.viewDensity"))
      .toBe("comfortable");

    const comfortablePad = await firstResourceCardPadding(page);
    // Compact uses p-3 (12px); comfortable uses p-5/sm:p-6 (20–24px).
    expect(comfortablePad).toBeGreaterThan(compactPad + 4);

    // Reload — comfortable must survive.
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("resources-sticky-search").waitFor();
    await expect(comfortableBtn(page)).toHaveAttribute("aria-pressed", "true");
    await expect(compactBtn(page)).toHaveAttribute("aria-pressed", "false");
    expect(await readKey(page, "tf.viewDensity")).toBe("comfortable");
    expect(await firstResourceCardPadding(page)).toBeGreaterThan(compactPad + 4);

    // Flip back to compact and reload one more time.
    await compactBtn(page).click();
    await expect(compactBtn(page)).toHaveAttribute("aria-pressed", "true");
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("resources-sticky-search").waitFor();
    await expect(compactBtn(page)).toHaveAttribute("aria-pressed", "true");
    expect(await readKey(page, "tf.viewDensity")).toBe("compact");
    expect(await firstResourceCardPadding(page)).toBeLessThan(compactPad + 4);
  });

  test("seeded localStorage value hydrates the toggle on first paint", async ({
    page,
  }) => {
    // Pre-seed comfortable before navigating.
    await page.addInitScript(() => {
      localStorage.setItem("tf.viewDensity", "comfortable");
    });
    await gotoResources(page);
    await expect(comfortableBtn(page)).toHaveAttribute("aria-pressed", "true");
    await expect(compactBtn(page)).toHaveAttribute("aria-pressed", "false");
  });
});
