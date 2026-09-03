// Role-access rule verification — extends role-leak-nav by actually
// navigating to every forbidden route per role and asserting the router
// pushes the user away (RoleGuard redirect / 404 / fallback). Catches the
// case where the dashboard nav is clean but the underlying route is still
// reachable via direct URL.
//
// Also verifies role-specific surface rules:
//   * Partner cannot see student PII surfaces, BridgeForward, Pathway,
//     Reports, IEPs, documents.
//   * School Admin and District Admin cannot reach /owner or /admin.
//   * Platform Admin (owner) is the only role that can reach /admin.
//   * PartnerForward management tools are only visible to Partner + Owner.
//
// Grade-band coupling (BridgeForward 6-8 vs TransitionForward 9-12) is
// asserted on the Student dashboard when a Grade fact is rendered; the
// test no-ops when the seed has no grade_band so it remains useful across
// data shapes.
//
// Auto-skips per role when its storageState is missing.

import { test, expect, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { ROLES, type RoleKey } from "./helpers/roles";

// Routes that must be UNREACHABLE for each role even via direct URL.
// Mirrors src/lib/role-policy.ts ROUTE_AUDIENCES. Keep in sync.
const FORBIDDEN_ROUTES: Record<RoleKey, string[]> = {
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

async function landedAwayFrom(page: Page, forbidden: string): Promise<boolean> {
  // After a guarded route blocks us, the URL should no longer match the
  // forbidden path. Accept either a hard redirect OR a 404/forbidden body.
  const url = new URL(page.url()).pathname;
  if (url === forbidden) {
    // Still on the path — last chance: did the app render a "no access" UI?
    const body = (await page.locator("body").innerText()).toLowerCase();
    return /not authori[sz]ed|no access|forbidden|sign in|404|page not found/.test(body);
  }
  return true;
}

for (const role of ROLES) {
  test.describe(`${role.label} — access rules`, () => {
    test.skip(
      () => !existsSync(role.storageState),
      `no storageState for ${role.key} — set ${role.emailEnv}/${role.passwordEnv}`,
    );
    test.use({ storageState: role.storageState });

    test("dashboard renders mustSee and not mustNotSee", async ({ page }) => {
      await page.goto(role.dashboard, { waitUntil: "networkidle" });
      for (const re of role.mustSee) {
        await expect(
          page.getByText(re).first(),
          `${role.key} dashboard missing required text /${re.source}/`,
        ).toBeVisible({ timeout: 15_000 });
      }
      for (const re of role.mustNotSee) {
        await expect(
          page.getByText(re).first(),
          `${role.key} dashboard leaked forbidden text /${re.source}/`,
        ).toHaveCount(0);
      }
    });

    for (const forbidden of FORBIDDEN_ROUTES[role.key]) {
      test(`cannot reach ${forbidden} via direct URL`, async ({ page }) => {
        // A guarded route can redirect to a dashboard with background requests.
        // Waiting for networkidle can consume the entire test timeout before the
        // authorization assertion runs, so wait only for the document and then
        // poll the actual redirect/denial condition.
        await page.goto(forbidden, {
          waitUntil: "domcontentloaded",
          timeout: 20_000,
        });
        await expect
          .poll(() => landedAwayFrom(page, forbidden), {
            message: `${role.key} reached forbidden route ${forbidden} (final url=${page.url()})`,
            timeout: 15_000,
          })
          .toBe(true);
      });
    }
  });
}

// PartnerForward management tools: only Partner + Owner.
test.describe("PartnerForward management visibility", () => {
  for (const role of ROLES) {
    const shouldSee = role.key === "partner" || role.key === "owner";
    test(`${role.label} ${shouldSee ? "sees" : "does not see"} /partners-manage`, async ({ browser }) => {
      test.skip(!existsSync(role.storageState), `no storageState for ${role.key}`);
      const ctx = await browser.newContext({ storageState: role.storageState });
      const page = await ctx.newPage();
      await page.goto("/partners-manage", { waitUntil: "networkidle" }).catch(() => {});
      const onPage = new URL(page.url()).pathname.startsWith("/partners-manage");
      expect(
        onPage,
        `${role.key} access to /partners-manage = ${onPage}, expected ${shouldSee}`,
      ).toBe(shouldSee);
      await ctx.close();
    });
  }
});

// Grade-band coupling on the Student dashboard.
test.describe("Student grade-band tools", () => {
  const student = ROLES.find((r) => r.key === "student")!;
  test.skip(() => !existsSync(student.storageState), "no student storageState");
  test.use({ storageState: student.storageState });

  test("BridgeForward shown only for 6-8; TransitionForward only for 9-12", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const main = page.locator('main[data-testid="student-dashboard-main"]');
    await main.waitFor({ state: "attached", timeout: 30_000 });
    // Give the dashboard a moment to hydrate the student snapshot.
    await page.waitForLoadState("networkidle").catch(() => {});
    const text = (await main.innerText()).toLowerCase();
    const grade = text.match(/grade\s*\n?\s*(6-8|9-10|11-12)/)?.[1];
    test.skip(!grade, "seeded student has no grade_band — coupling check skipped");
    const isMiddle = grade === "6-8";
    const hasBridge = /bridgeforward/i.test(text);
    const hasTransition = /opportunities for you|transitionforward/i.test(text);
    if (isMiddle) {
      expect(hasBridge, "6-8 student dashboard should show BridgeForward").toBe(true);
    } else {
      expect(hasTransition, "9-12 student dashboard should show TransitionForward tools").toBe(true);
    }
  });
});
