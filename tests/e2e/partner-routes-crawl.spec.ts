/**
 * Workstream D — Partner routes health crawl.
 *
 * Walks every public partner-facing route (no auth required) and asserts:
 *   - HTTP 200
 *   - <main> is non-empty
 *   - h1 or role=heading present
 *   - no unhandled console errors during load
 *
 * Signed-out spec — public surfaces only. Authenticated partner routes are
 * covered by tests/e2e/partner-network-journey.signedin.spec.ts.
 */
import { test, expect } from "@playwright/test";

const PUBLIC_PARTNER_ROUTES = [
  "/partners",
  "/partner-network",
  "/partner-directory",
  "/partner-interest",
  "/partnerforward",
  "/partnerforward/incentives",
  "/hubs/partner",
  "/hubs/partner-network",
  "/demo/partner",
  "/demo/partner-network",
] as const;

// Console noise we intentionally ignore (third-party analytics, benign warnings).
const IGNORED_CONSOLE = [
  /favicon/i,
  /Manifest:/i,
  /googletag/i,
  /net::ERR_BLOCKED_BY_CLIENT/i,
];

test.describe("partner routes — public crawl", () => {
  for (const route of PUBLIC_PARTNER_ROUTES) {
    test(`GET ${route} renders`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        const text = msg.text();
        if (IGNORED_CONSOLE.some((r) => r.test(text))) return;
        errors.push(text);
      });

      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response, `${route}: no response`).toBeTruthy();
      expect(response!.status(), `${route}: HTTP status`).toBeLessThan(400);

      const main = page.locator("main, [role=main]").first();
      await expect(main, `${route}: <main> visible`).toBeVisible();
      const mainText = (await main.innerText()).trim();
      expect(mainText.length, `${route}: <main> non-empty`).toBeGreaterThan(20);

      const headings = page.getByRole("heading");
      expect(await headings.count(), `${route}: has at least one heading`).toBeGreaterThan(0);

      // Give the app one tick to flush async errors before assertion.
      await page.waitForTimeout(300);
      expect(errors, `${route}: console errors`).toEqual([]);
    });
  }
});
