/**
 * Per-role release-readiness journey:
 *  - lands on the correct dashboard
 *  - shows role-specific landmarks (data-testid contract)
 *  - has no duplicate in-main links
 *  - has no inert (no-op) buttons
 *  - preserves state after a hard refresh
 *
 * Each role auto-skips when its storageState is missing.
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { ROLES } from "../helpers/roles";

async function gotoDashboard(page: Page, route: string) {
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
}

for (const role of ROLES) {
  test.describe(`${role.label} — release journey`, () => {
    test.skip(() => !existsSync(role.storageState), `no storageState for ${role.key}`);
    test.use({ storageState: role.storageState });

    test("reaches the correct dashboard with role landmark", async ({ page }) => {
      await gotoDashboard(page, role.dashboard);
      const path = new URL(page.url()).pathname;
      expect(
        path === role.dashboard || path.startsWith(`${role.dashboard}/`),
        `${role.key} landed on ${path}, expected ${role.dashboard}`,
      ).toBe(true);
      await expect(page.locator(`[data-testid='${role.dashboardTestId}']`)).toBeVisible({
        timeout: 15_000,
      });
      for (const re of role.mustSee) {
        await expect(page.getByText(re).first()).toBeVisible({ timeout: 15_000 });
      }
    });

    test("main content has no duplicate visible in-app links", async ({ page }) => {
      await gotoDashboard(page, role.dashboard);
      const hrefs = await page
        .locator("main a[href^='/']:visible")
        .evaluateAll((els) =>
          els.map((e) => e.getAttribute("href") || "").filter((h) => h && h !== "/"),
        );
      const counts = new Map<string, number>();
      for (const h of hrefs) counts.set(h, (counts.get(h) ?? 0) + 1);
      const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([h]) => h);
      expect(dupes, `${role.key} dashboard has duplicate links: ${dupes.join(", ")}`).toEqual([]);
    });

    test("has no inert buttons", async ({ page }) => {
      await gotoDashboard(page, role.dashboard);
      // A button is "inert" if it has no onclick/href/form, no aria-controls,
      // no type=submit, and no visible text or aria-label.
      const inert = await page.locator("main button:not([disabled])").evaluateAll((btns) =>
        btns
          .map((b) => {
            const text = (b.textContent || "").trim();
            const aria = b.getAttribute("aria-label") || "";
            const type = b.getAttribute("type") || "";
            const controls = b.getAttribute("aria-controls") || "";
            const hasName = Boolean(text || aria);
            const looksActionable =
              type === "submit" ||
              Boolean(controls) ||
              Boolean((b as HTMLButtonElement).onclick) ||
              b.hasAttribute("data-state");
            return { html: b.outerHTML.slice(0, 160), hasName, looksActionable };
          })
          .filter((b) => !b.hasName && !b.looksActionable)
          .map((b) => b.html),
      );
      expect(inert, `${role.key} dashboard has inert buttons:\n${inert.join("\n")}`).toEqual([]);
    });

    test("hard refresh preserves dashboard state", async ({ page }) => {
      await gotoDashboard(page, role.dashboard);
      await page.reload({ waitUntil: "networkidle" });
      const path = new URL(page.url()).pathname;
      expect(path, "refresh should not bounce to /login").not.toMatch(/^\/login/);
      await expect(page.locator(`[data-testid='${role.dashboardTestId}']`)).toBeVisible({
        timeout: 15_000,
      });
    });
  });
}
