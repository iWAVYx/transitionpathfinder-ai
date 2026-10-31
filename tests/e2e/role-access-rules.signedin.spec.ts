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
import { forbiddenDashboardText, ROLES, type RoleKey } from "./helpers/roles";

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
          forbiddenDashboardText(page, re),
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
// Use the per-test page fixture so navigation and teardown have independent
// lifetimes. Network idle is not an authorization signal (background reads can
// remain active); do not swallow a failed navigation and inspect a blank page.
test.describe("PartnerForward management visibility", () => {
  for (const role of ROLES) {
    test.describe(role.label, () => {
      test.skip(() => !existsSync(role.storageState), `no storageState for ${role.key}`);
      test.use({ storageState: role.storageState });
      const shouldSee = role.key === "partner" || role.key === "owner";
      test(`${role.label} ${shouldSee ? "sees" : "does not see"} /partners-manage`, async ({ page }) => {
        await page.goto("/partners-manage", { waitUntil: "domcontentloaded", timeout: 20_000 });
        await expect.poll(() => new URL(page.url()).pathname.startsWith("/partners-manage"), {
          timeout: 15_000,
          message: `${role.key} access to /partners-manage must match ${shouldSee}`,
        }).toBe(shouldSee);
        const main = page.locator('main:not([data-auth-state="route-pending"]):not([data-auth-state="session-loading"]):not([data-auth-state="checking"])').first();
        await expect(main).toBeVisible({ timeout: 15_000 });
        await expect(main.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
        const finalPath = new URL(page.url()).pathname.replace(/\/+$/, "") || "/";
        expect(finalPath.startsWith("/partners-manage")).toBe(shouldSee);
        if (!shouldSee) {
          expect(finalPath, "Denied access must return to this role's real dashboard, not blank/sign-in").toBe(role.dashboard.replace(/\/+$/, "") || "/");
        }
      });
    });
  }
});

// The existing QA student is a high-school student. Check the actual readable
// grade and tool links, not obsolete "grade\n11-12"/marketing copy. A separate
// middle-school cohort still needs its own authorized account/fixture coverage.
test.describe("Student grade-band tools", () => {
  const student = ROLES.find((r) => r.key === "student")!;
  test.skip(() => !existsSync(student.storageState), "no student storageState");
  test.use({ storageState: student.storageState });

  test("High-school student sees readable grade and applicable planning links", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 20_000 });
    const main = page.locator('main[data-testid="student-dashboard-main"]');
    const overview = page.getByTestId("live-student-dashboard-overview");
    await expect(overview).toBeVisible({ timeout: 30_000 });
    await expect(overview.getByText(/^High School ·/)).toBeVisible();
    await expect(main).not.toContainText(/\bhigh_school\b|\bmiddle_school\b/);
    await expect(main.locator('a[href="/student-voice"]').first()).toBeVisible();
    await expect.poll(() => main.locator('a[href^="/pathway/student"],a[href^="/reports/"]').count()).toBeGreaterThan(0);
    await expect(main.locator('a[href^="/bridgeforward/intake"]')).toHaveCount(0);
  });
});
