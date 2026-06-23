/**
 * Role-based access control verification for release readiness.
 *
 * Mirrors src/lib/role-policy.ts ROUTE_AUDIENCES and asserts every role
 * is bounced away from routes it should not access — even via direct URL.
 *
 * Pairs with role-leak-nav / role-access-rules but is scoped to the
 * release suite so the readiness gate runs end-to-end on its own.
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { ROLES, type RoleKey } from "../helpers/roles";

const FORBIDDEN: Record<RoleKey, string[]> = {
  student: ["/caseload", "/teacher-portal", "/admin", "/partners-manage", "/school/overview", "/district/overview"],
  parent: ["/caseload", "/teacher-portal", "/admin", "/partners-manage", "/school/overview", "/district/overview"],
  educator: ["/admin", "/partners-manage", "/district/overview"],
  school_admin: ["/admin", "/district/overview", "/partners-manage", "/caseload"],
  district_admin: ["/admin", "/partners-manage", "/caseload"],
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
    "/admin",
    "/school/overview",
    "/district/overview",
    "/bridgeforward/intake",
  ],
  owner: [],
};

async function blockedFrom(page: Page, route: string): Promise<boolean> {
  await page.goto(route, { waitUntil: "networkidle" }).catch(() => {});
  const path = new URL(page.url()).pathname;
  if (path !== route && !path.startsWith(`${route}/`)) return true;
  const body = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
  return /not authori[sz]ed|no access|forbidden|sign in|404|page not found/.test(body);
}

for (const role of ROLES) {
  const list = FORBIDDEN[role.key];
  if (list.length === 0) continue;
  test.describe(`${role.label} — access control`, () => {
    test.skip(() => !existsSync(role.storageState), `no storageState for ${role.key}`);
    test.use({ storageState: role.storageState });

    for (const route of list) {
      test(`blocked from ${route}`, async ({ page }) => {
        const ok = await blockedFrom(page, route);
        expect(ok, `${role.key} reached forbidden ${route} (url=${page.url()})`).toBe(true);
      });
    }
  });
}

test.describe("admin-only routes require platform admin", () => {
  const adminRoutes = ["/admin"];
  for (const role of ROLES) {
    if (role.key === "owner") continue;
    test(`${role.label} cannot reach /admin`, async ({ browser }) => {
      test.skip(!existsSync(role.storageState), `no storageState for ${role.key}`);
      const ctx = await browser.newContext({ storageState: role.storageState });
      const page = await ctx.newPage();
      for (const route of adminRoutes) {
        const ok = await blockedFrom(page, route);
        expect(ok, `${role.key} reached admin route ${route}`).toBe(true);
      }
      await ctx.close();
    });
  }

  test("owner can reach /admin", async ({ browser }) => {
    const owner = ROLES.find((r) => r.key === "owner")!;
    test.skip(!existsSync(owner.storageState), "no owner storageState");
    const ctx = await browser.newContext({ storageState: owner.storageState });
    const page = await ctx.newPage();
    await page.goto("/admin", { waitUntil: "networkidle" });
    expect(new URL(page.url()).pathname).toMatch(/^\/admin/);
    await ctx.close();
  });
});

test.describe("partners cannot access student private routes", () => {
  const partner = ROLES.find((r) => r.key === "partner")!;
  test.skip(() => !existsSync(partner.storageState), "no partner storageState");
  test.use({ storageState: partner.storageState });

  for (const route of ["/students", "/goals", "/documents", "/reports", "/pathway"]) {
    test(`partner blocked from ${route}`, async ({ page }) => {
      const ok = await blockedFrom(page, route);
      expect(ok, `partner reached private route ${route}`).toBe(true);
    });
  }
});
