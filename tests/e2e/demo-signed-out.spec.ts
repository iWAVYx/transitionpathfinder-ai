import { expect, test } from "@playwright/test";

/**
 * Verifies the public /demo experience for signed-out users:
 *  - every step route renders without auth
 *  - the role-view lens switches consistently
 *  - the /demo/connection audit page loads
 *  - no signed-in / protected route is reachable from demo links
 */

const DEMO_ROUTES = [
  "/demo",
  "/demo/intake",
  "/demo/voice",
  "/demo/documents",
  "/demo/report",
  "/demo/resources",
  "/demo/opportunities",
  "/demo/plan",
  "/demo/meeting",
  "/demo/calendar",
  "/demo/hub",
  "/demo/next",
  "/demo/connection",
];

// Routes that must remain auth-gated even when reached via demo navigation.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/students",
  "/reports",
  "/owner",
  "/admin",
  "/settings",
];

test.describe("public /demo experience (signed out)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of DEMO_ROUTES) {
    test(`renders ${path} without auth`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("pageerror", (err) => consoleErrors.push(String(err)));
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      const resp = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(resp?.status(), `status for ${path}`).toBeLessThan(400);

      // Did not get bounced to /login or /auth
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/") + "\\/?$"));

      // Main landmark present (page actually rendered, not a blank shell)
      await expect(page.locator("main, [role=main]").first()).toBeVisible();

      // No client-side runtime errors during load
      expect(
        consoleErrors.filter((e) => !/favicon|manifest|sourcemap/i.test(e)),
      ).toEqual([]);
    });
  }

  test("role-view lens switches and persists across steps", async ({ page }) => {
    await page.goto("/demo/intake", { waitUntil: "domcontentloaded" });

    const tablist = page.getByRole("tablist", { name: /demo role view/i }).first();
    await expect(tablist).toBeVisible();

    const educatorTab = tablist.getByRole("tab", { name: /educator/i });
    await educatorTab.click();
    await expect(educatorTab).toHaveAttribute("aria-selected", "true");

    // Navigate to another demo step — selection should persist via sessionStorage.
    await page.goto("/demo/report", { waitUntil: "domcontentloaded" });
    const nextTablist = page
      .getByRole("tablist", { name: /demo role view/i })
      .first();
    await expect(nextTablist).toBeVisible();
    await expect(
      nextTablist.getByRole("tab", { name: /educator/i }),
    ).toHaveAttribute("aria-selected", "true");

    // Switch to Parent on this step and confirm it sticks on the hub.
    await nextTablist.getByRole("tab", { name: /parent/i }).click();
    await page.goto("/demo/hub", { waitUntil: "domcontentloaded" });
    const hubTablist = page
      .getByRole("tablist", { name: /demo role view/i })
      .first();
    await expect(
      hubTablist.getByRole("tab", { name: /parent/i }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("connection audit page lists feature map", async ({ page }) => {
    await page.goto("/demo/connection", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /demo feature connection checklist/i }),
    ).toBeVisible();
    const rows = page.locator("table tbody tr");
    expect(await rows.count()).toBeGreaterThan(5);
  });

  test("no demo link leaks into a protected route", async ({ page }) => {
    for (const path of DEMO_ROUTES) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const hrefs = await page
        .locator("main a[href]")
        .evaluateAll((els) =>
          (els as HTMLAnchorElement[]).map((a) => a.getAttribute("href") || ""),
        );
      for (const href of hrefs) {
        if (!href.startsWith("/")) continue;
        for (const prefix of PROTECTED_PREFIXES) {
          expect(
            href.startsWith(prefix),
            `${path} links to protected route ${href}`,
          ).toBeFalsy();
        }
      }
    }
  });

  test("protected routes still redirect signed-out users", async ({ page }) => {
    for (const prefix of ["/dashboard", "/students", "/reports"]) {
      const resp = await page.goto(prefix, { waitUntil: "domcontentloaded" });
      expect(resp?.status() ?? 0).toBeLessThan(500);
      // Should be bounced to a public auth/login surface, not stay on the protected URL.
      await expect(page).not.toHaveURL(new RegExp(`${prefix}/?$`));
    }
  });
});
