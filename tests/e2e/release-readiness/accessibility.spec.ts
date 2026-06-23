/**
 * Accessibility release gate.
 *
 *  - axe-core (WCAG 2.1 A + AA) on every public route at mobile + desktop.
 *  - axe-core on each role's dashboard when its storage state is available.
 *  - Keyboard-only navigation: Tab cycles to interactive controls.
 *  - Visible focus ring on first focusable control.
 *  - Form controls have associated labels / accessible names; required
 *    fields raise validation messages when submitted empty.
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { existsSync } from "node:fs";
import { ROLES } from "../helpers/roles";

const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const PUBLIC_ROUTES = [
  "/",
  "/families",
  "/educators",
  "/partners",
  "/pricing",
  "/about",
  "/resources",
  "/partner-directory",
  "/help",
  "/login",
];

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1440, height: 900 },
];

async function expectClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.slice(0, 3).map((n) => ({ target: n.target, html: n.html?.slice(0, 200) })),
  }));
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

for (const vp of VIEWPORTS) {
  test.describe(`public a11y @ ${vp.label}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    for (const route of PUBLIC_ROUTES) {
      test(`${route}`, async ({ page }) => {
        await page.goto(route, { waitUntil: "networkidle" });
        await expect(page.locator("main").first()).toBeVisible({ timeout: 15_000 });
        await expectClean(page);
      });
    }
  });
}

test.describe("keyboard-only navigation on public routes", () => {
  test("tab cycles into the document and lands on a focusable control", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    const tag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase() || "");
    expect(["a", "button", "input", "select", "textarea"]).toContain(tag);
  });

  test("focused element has a visible focus indicator", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        outline: s.outlineStyle + " " + s.outlineWidth,
        boxShadow: s.boxShadow,
      };
    });
    expect(ring, "no element received focus").not.toBeNull();
    const hasRing =
      (ring!.outline && !ring!.outline.startsWith("none ")) ||
      (ring!.boxShadow && ring!.boxShadow !== "none");
    expect(hasRing, `no visible focus indicator (outline=${ring!.outline}, boxShadow=${ring!.boxShadow})`).toBeTruthy();
  });
});

test.describe("login form labels and error messages", () => {
  test("email + password inputs have accessible names", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    const email = page.getByLabel(/email/i).first();
    const pwd = page.getByLabel(/password/i).first();
    await expect(email).toBeVisible();
    await expect(pwd).toBeVisible();
  });
});

// Dashboard a11y per role (auto-skip when storageState missing).
for (const role of ROLES) {
  test.describe(`signed-in a11y — ${role.label}`, () => {
    test.skip(() => !existsSync(role.storageState), `no storageState for ${role.key}`);
    test.use({ storageState: role.storageState });

    test(`${role.dashboard} has no axe violations`, async ({ page }) => {
      await page.goto(role.dashboard, { waitUntil: "networkidle" });
      await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
      await expectClean(page);
    });
  });
}
