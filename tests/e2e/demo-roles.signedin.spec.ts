// Per-role signed-in coverage for the public /demo experience.
//
// For each role with a saved storageState we:
//   - load every /demo/* step and the /demo/connection audit page
//   - assert the page renders (main landmark, no runtime errors)
//   - assert the demo role-view lens still works
//   - assert no /demo page links to a route forbidden for that role
//     (per FORBIDDEN_ROUTES, mirrored from src/lib/role-policy.ts)
//
// /demo is a public surface; signing in must not change that, and a signed-in
// role must not be offered cross-role links from inside the demo.
//
// Auto-skips per role when storageState is missing.

import { test, expect, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { ROLES, type RoleKey } from "./helpers/roles";

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

// Mirror of forbidden routes per role from role-leak-nav.signedin.spec.ts.
// Keep in sync with src/lib/role-policy.ts ROUTE_AUDIENCES.
const FORBIDDEN_ROUTES: Record<RoleKey, string[]> = {
  student: ["/caseload", "/teacher-portal", "/owner", "/admin", "/partners-manage", "/school", "/district"],
  parent: ["/caseload", "/teacher-portal", "/owner", "/admin", "/partners-manage", "/school", "/district"],
  educator: ["/owner", "/admin", "/partners-manage", "/district"],
  school_admin: ["/owner", "/admin", "/district", "/partners-manage", "/caseload"],
  district_admin: ["/owner", "/admin", "/partners-manage", "/caseload"],
  partner: [
    "/caseload",
    "/goals",
    "/documents",
    "/students",
    "/pathway",
    "/reports",
    "/ppt-prep",
    "/meetings",
    "/insights",
    "/analytics",
    "/owner",
    "/admin",
    "/school",
    "/district",
    "/bridgeforward",
  ],
  owner: [],
};

async function collectMainHrefs(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    return Array.from(main.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .map((a) => a.getAttribute("href") || "")
      .filter((h) => h.startsWith("/"));
  });
}

function isIgnorableConsoleError(error: { text: string; url: string }) {
  if (/favicon|manifest|sourcemap/i.test(error.text)) return true;

  // Google Fonts occasionally returns a transient 404 for an individual
  // generated woff2 asset. That third-party fetch should not make signed-in
  // role coverage fail, but app-owned 4xx/5xx requests and runtime errors must
  // remain release-blocking.
  if (
    error.url.startsWith("https://fonts.gstatic.com/") &&
    /failed to load resource/i.test(error.text)
  ) {
    return true;
  }

  return false;
}

for (const role of ROLES) {
  test.describe(`${role.label} /demo signed-in coverage`, () => {
    test.skip(
      () => !existsSync(role.storageState),
      `no storageState for ${role.key}`,
    );
    test.use({ storageState: role.storageState });

    for (const path of DEMO_ROUTES) {
      test(`renders ${path}`, async ({ page }) => {
        const errors: Array<{ text: string; url: string }> = [];
        page.on("pageerror", (e) => errors.push({ text: String(e), url: page.url() }));
        page.on("console", (m) => {
          if (m.type() === "error") {
            errors.push({ text: m.text(), url: m.location().url || page.url() });
          }
        });

        const resp = await page.goto(path, { waitUntil: "domcontentloaded" });
        expect(resp?.status() ?? 0, `status for ${path}`).toBeLessThan(400);

        // Demo is public — signing in must not redirect away from /demo.
        await expect(page).toHaveURL(
          new RegExp(path.replace(/\//g, "\\/") + "\\/?$"),
        );
        await expect(page.locator("main, [role=main]").first()).toBeVisible();

        expect(
          errors
            .filter((error) => !isIgnorableConsoleError(error))
            .map((error) => `${error.text}${error.url ? ` (${error.url})` : ""}`),
        ).toEqual([]);
      });
    }

    test("no demo link points at a route forbidden for this role", async ({ page }) => {
      const forbidden = FORBIDDEN_ROUTES[role.key];
      if (forbidden.length === 0) test.skip(true, "no forbidden routes for this role");

      for (const path of DEMO_ROUTES) {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        const hrefs = await collectMainHrefs(page);
        for (const href of hrefs) {
          for (const bad of forbidden) {
            const leaks =
              href === bad ||
              href.startsWith(`${bad}/`) ||
              href.startsWith(`${bad}?`);
            expect(
              leaks,
              `${role.key} on ${path} sees forbidden link ${href}`,
            ).toBeFalsy();
          }
        }
      }
    });

    test("role-view lens still switches while signed in", async ({ page }) => {
      await page.goto("/demo/report", { waitUntil: "domcontentloaded" });
      const tablist = page
        .getByRole("tablist", { name: /demo role view/i })
        .first();
      await expect(tablist).toBeVisible();
      const parent = tablist.getByRole("tab", { name: /parent/i });
      await parent.click();
      await expect(parent).toHaveAttribute("aria-selected", "true");

      await page.goto("/demo/hub", { waitUntil: "domcontentloaded" });
      const hubTablist = page
        .getByRole("tablist", { name: /demo role view/i })
        .first();
      await expect(
        hubTablist.getByRole("tab", { name: /parent/i }),
      ).toHaveAttribute("aria-selected", "true");
    });

    test("connection audit page renders with feature map", async ({ page }) => {
      await page.goto("/demo/connection", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: /demo feature connection checklist/i }),
      ).toBeVisible();
      const rows = page.locator("table tbody tr");
      expect(await rows.count()).toBeGreaterThan(5);
    });
  });
}
