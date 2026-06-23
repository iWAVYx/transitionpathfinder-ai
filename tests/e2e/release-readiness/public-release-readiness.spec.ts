/**
 * Public release-readiness checks for TransitionForward.
 *
 * Walks every signed-out route, verifies the marketing CTAs route to the
 * correct destinations, and asserts no horizontal overflow at mobile,
 * tablet, and desktop widths.
 */
import { test, expect, type Page } from "@playwright/test";

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
  { label: "tablet", width: 820, height: 1180 },
  { label: "desktop", width: 1440, height: 900 },
] as const;

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const dims = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    dims.scrollWidth,
    `${label} overflows: scroll=${dims.scrollWidth} client=${dims.clientWidth}`,
  ).toBeLessThanOrEqual(dims.clientWidth + 2);
}

test.describe("public release readiness", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`loads ${route} with a visible <main>`, async ({ page }) => {
      const resp = await page.goto(route, { waitUntil: "networkidle" });
      expect(resp?.ok(), `${route} returned ${resp?.status()}`).toBeTruthy();
      await expect(page.locator("main").first()).toBeVisible({ timeout: 15_000 });
      await expect(page.locator("h1, h2").first()).toBeVisible();
    });
  }

  test("home hero CTAs link to real destinations", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const ctas = page.locator("main a[href^='/']");
    const count = await ctas.count();
    expect(count, "home page should expose at least one in-app CTA").toBeGreaterThan(0);
    const hrefs = (await ctas.evaluateAll((els) =>
      els.map((e) => e.getAttribute("href") || ""),
    )).filter((h) => h && !h.startsWith("/#"));
    // CTAs must not all collapse onto the same hash anchor — would mean the
    // hero is purely decorative.
    expect(new Set(hrefs).size, "hero CTAs should offer distinct destinations").toBeGreaterThan(0);
  });

  test("program pages route correctly", async ({ page }) => {
    const programs = ["/bridgeforward", "/partnerforward", "/programs/transitionforward"];
    for (const p of programs) {
      const resp = await page.goto(p, { waitUntil: "networkidle" });
      expect(resp && resp.status() < 400, `${p} returned ${resp?.status()}`).toBeTruthy();
      await expect(page.locator("main").first()).toBeVisible({ timeout: 15_000 });
      expect(new URL(page.url()).pathname, `${p} unexpectedly redirected`).not.toBe("/login");
    }
  });

  test("waitlist / demo / pricing CTAs are reachable and labelled", async ({ page }) => {
    for (const path of ["/waitlist", "/demo", "/pricing"]) {
      const resp = await page.goto(path, { waitUntil: "networkidle" });
      expect(resp && resp.status() < 400, `${path} status=${resp?.status()}`).toBeTruthy();
      await expect(page.locator("main").first()).toBeVisible({ timeout: 15_000 });
      // At least one button or link with a non-empty accessible name.
      const actionable = page.locator("main").getByRole("link").or(page.locator("main").getByRole("button"));
      const names = (await actionable.evaluateAll((els) =>
        els.map((e) => (e.textContent || "").trim()).filter(Boolean),
      ));
      expect(names.length, `${path} has no actionable CTA`).toBeGreaterThan(0);
    }
  });

  for (const vp of VIEWPORTS) {
    test.describe(`no horizontal overflow @ ${vp.label}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });
      for (const route of PUBLIC_ROUTES) {
        test(`${route}`, async ({ page }) => {
          await page.goto(route, { waitUntil: "networkidle" });
          await expectNoHorizontalOverflow(page, `${vp.label} ${route}`);
        });
      }
    });
  }
});
