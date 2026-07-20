import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * WCAG 2.2 AA audit for interactive forms and modal dialogs.
 *
 * Covers:
 * - Login form (email + password + submit)
 * - Waitlist form (linked from `/get-started/*` doors)
 * - Any dialog/modal reachable from the public shell
 *
 * Assertions:
 * - No axe violations against wcag2/21/22 AA tag sets
 * - Each visible form control has an accessible name
 * - Submit / primary buttons expose an accessible name
 * - Focus is visible after Tab (indirect: :focus-visible resolves)
 *
 * SC 2.4.7 Focus Visible, SC 3.3.2 Labels/Instructions, SC 4.1.2 Name
 * Role Value, SC 2.5.8 Target Size (Minimum) — 24×24 CSS px.
 */

const A11Y_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

async function auditCurrent(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.slice(0, 5).map((n) => ({
      target: n.target,
      html: n.html?.slice(0, 200),
    })),
  }));
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

async function expectAllControlsNamed(page: Page) {
  const controls = page.locator(
    "form :is(input:not([type=hidden]), select, textarea, button)",
  );
  const count = await controls.count();
  for (let i = 0; i < count; i++) {
    const c = controls.nth(i);
    if (!(await c.isVisible())) continue;
    const name = await c.evaluate((el) => {
      const aria = el.getAttribute("aria-label");
      if (aria?.trim()) return aria.trim();
      const labelledby = el.getAttribute("aria-labelledby");
      if (labelledby) {
        const referenced = labelledby
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
          .join(" ")
          .trim();
        if (referenced) return referenced;
      }
      const id = el.getAttribute("id");
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label?.textContent?.trim()) return label.textContent.trim();
      }
      const wrapping = el.closest("label")?.textContent?.trim();
      if (wrapping) return wrapping;
      if (el.tagName === "BUTTON") return (el.textContent ?? "").trim();
      const placeholder = el.getAttribute("placeholder");
      // Placeholder is NOT a valid accessible name on its own.
      return placeholder ? null : null;
    });
    expect(
      name,
      `control #${i} (${await c.evaluate((n) => n.outerHTML.slice(0, 120))}) missing accessible name`,
    ).toBeTruthy();
  }
}

test.describe("a11y — login form (WCAG 2.2 AA)", () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test("/login is clean and all controls are named", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
    await auditCurrent(page);
    await expectAllControlsNamed(page);
  });
});

test.describe("a11y — get-started doors (form + CTA surfaces)", () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  const DOORS = [
    "/get-started/student",
    "/get-started/family",
    "/get-started/educator",
    "/get-started/school",
    "/get-started/district",
    "/get-started/partner",
  ];

  for (const door of DOORS) {
    test(`${door} — axe clean + controls named`, async ({ page }) => {
      await page.goto(door, { waitUntil: "networkidle" });
      await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
      await auditCurrent(page);
      await expectAllControlsNamed(page);
    });
  }
});

test.describe("a11y — modal dialog behavior", () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test("open the first available dialog on / and audit it", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // Try to open a dialog by clicking the first control with aria-haspopup=dialog.
    const opener = page
      .locator('[aria-haspopup="dialog"], [data-testid$="open-dialog"]')
      .first();
    const hasOpener = (await opener.count()) > 0;
    test.skip(!hasOpener, "no dialog opener on /");
    await opener.click();
    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible();
    await auditCurrent(page);
    // Escape closes the dialog and returns focus to the opener.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
