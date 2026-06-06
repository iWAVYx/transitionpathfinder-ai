import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Shared report-page accessibility key-flow assertions. Used by both
 * `reports-signed-in-a11y.signedin.spec.ts` and
 * `reports-2fa-challenge.signedin.spec.ts` so the post-2FA audit covers
 * the same surface as the regular signed-in audit.
 */

export const A11Y_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "best-practice",
];

export const SMALL_VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "tablet", width: 768, height: 1024 },
];

export function formatViolations(
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

export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
  const formatted = formatViolations(results.violations);
  expect(formatted, JSON.stringify(formatted, null, 2)).toEqual([]);
}

export async function expectReportLandmarks(page: Page, viewportWidth: number) {
  await expect(page.getByRole("navigation", { name: /primary/i })).toBeVisible();
  const mains = page.getByRole("main");
  expect(await mains.count()).toBe(1);
  const outline = page.getByRole("complementary", { name: /outline/i });
  if (viewportWidth >= 1024) {
    await expect(outline).toBeVisible();
  } else {
    await expect(outline).toHaveCount(0);
  }
}

export async function expectKeyboardFlows(page: Page) {
  const tabs = page.getByRole("tablist").first().getByRole("tab");
  expect(await tabs.count()).toBeGreaterThan(1);
  const firstTab = tabs.first();
  await firstTab.scrollIntoViewIfNeeded();
  await firstTab.focus();
  await page.keyboard.press("ArrowRight");
  const focusedRole = await page.evaluate(() =>
    document.activeElement?.getAttribute("role"),
  );
  expect(focusedRole).toBe("tab");

  const toggle = page.locator('button[aria-expanded][aria-controls]').first();
  await toggle.scrollIntoViewIfNeeded();
  const initial = await toggle.getAttribute("aria-expanded");
  await toggle.click();
  const next = await toggle.getAttribute("aria-expanded");
  expect(next).not.toBe(initial);
}
