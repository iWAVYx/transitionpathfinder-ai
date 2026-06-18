// Role-leak nav guard: ensures every signed-in role's rendered UI does not
// expose links to routes the role is not allowed to access per
// src/lib/role-policy.ts ROUTE_AUDIENCES. Catches duplicated cards leaking
// across roles (e.g. partner seeing /caseload, parent seeing /admin) even
// when the visible text doesn't trip the existing mustNotSee text checks.
//
// Auto-skips per role when storageState is missing.

import { test, expect, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { ROLES, type RoleKey } from "./helpers/roles";

// Hard-coded mirror of forbidden routes per role. Keep in sync with
// src/lib/role-policy.ts. We don't import the TS module to avoid pulling
// the app's build graph into the test runner.
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
  // Platform admin is allowed everywhere; nothing forbidden.
  owner: [],
};

async function collectHrefs(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const root = document.body;
    const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"));
    return anchors
      .map((a) => a.getAttribute("href") || "")
      .filter((h) => h.startsWith("/"));
  });
}

for (const role of ROLES) {
  const forbidden = FORBIDDEN_ROUTES[role.key];
  if (forbidden.length === 0) continue;

  test.describe(`${role.label} role-leak nav guard`, () => {
    test.skip(
      () => !existsSync(role.storageState),
      `no storageState for ${role.key}`,
    );
    test.use({ storageState: role.storageState });

    test("dashboard nav does not expose forbidden routes", async ({ page }) => {
      await page.goto(role.dashboard, { waitUntil: "networkidle" });
      await expect(page.locator("body")).toBeVisible();
      const hrefs = await collectHrefs(page);
      const leaks = forbidden.filter((bad) =>
        hrefs.some((h) => h === bad || h.startsWith(`${bad}/`) || h.startsWith(`${bad}?`)),
      );
      expect(
        leaks,
        `${role.key} dashboard exposed forbidden routes: ${JSON.stringify(leaks)}`,
      ).toEqual([]);
    });
  });
}
