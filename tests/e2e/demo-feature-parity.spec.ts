/**
 * Demo feature-page parity regression.
 *
 * For every (role, featureId) in the demo registry we assert:
 *   1. The dedicated page at /demo/feature/<role>/<slug> renders the
 *      shared DemoFeatureShell structure (breadcrumbs, sample-data
 *      badge, back-to-role-dashboard link, primary action, next-step
 *      card, feeds-into chips, secondary action).
 *   2. The primary action ("In your workspace: …") points at the SAME
 *      route (detail.primaryAction.to) that the real signed-in feature
 *      module opens — i.e. the demo CTA and the signed-in CTA share a
 *      target, so behavior matches with sample data.
 *   3. The secondary action ("Back to <Role> Dashboard") navigates
 *      back to /demo/<role> without dropping context.
 *
 * Runs anonymously — /demo/** is a public surface.
 */
import { test, expect } from "@playwright/test";
import { STUDENT_FEATURE_DETAILS } from "../../src/lib/demo/student/feature-details";
import { PARENT_FEATURE_DETAILS } from "../../src/lib/demo/parent/feature-details";
import { EDUCATOR_FEATURE_DETAILS } from "../../src/lib/demo/educator/feature-details";
import { SCHOOL_ADMIN_FEATURE_DETAILS } from "../../src/lib/demo/school-admin/feature-details";
import { DISTRICT_ADMIN_FEATURE_DETAILS } from "../../src/lib/demo/district-admin/feature-details";
import { PARTNER_FEATURE_DETAILS } from "../../src/lib/demo/partner/feature-details";
import { OWNER_FEATURE_DETAILS } from "../../src/lib/demo/owner/feature-details";

type Role =
  | "student"
  | "family"
  | "educator"
  | "school-admin"
  | "district-admin"
  | "partner"
  | "owner";

const ROLE_DASHBOARD: Record<Role, string> = {
  student: "/demo/student",
  family: "/demo/family",
  educator: "/demo/educator",
  "school-admin": "/demo/school-admin",
  "district-admin": "/demo/district-admin",
  partner: "/demo/partner",
  owner: "/demo/owner",
};

const REGISTRY: Record<Role, Record<string, { title: string; primaryAction?: { label: string; to: string } }>> = {
  student: STUDENT_FEATURE_DETAILS,
  family: PARENT_FEATURE_DETAILS,
  educator: EDUCATOR_FEATURE_DETAILS,
  "school-admin": SCHOOL_ADMIN_FEATURE_DETAILS,
  "district-admin": DISTRICT_ADMIN_FEATURE_DETAILS,
  partner: PARTNER_FEATURE_DETAILS,
  owner: OWNER_FEATURE_DETAILS,
};

for (const role of Object.keys(REGISTRY) as Role[]) {
  test.describe(`demo feature parity — ${role}`, () => {
    for (const [slug, detail] of Object.entries(REGISTRY[role])) {
      test(`${role}/${slug} renders shared shell and wired actions`, async ({ page }) => {
        const url = `/demo/feature/${role}/${slug}`;
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // (1) Shared shell landmarks
        await expect(page.locator("main")).toBeVisible();
        await expect(page.getByText(/Sample data/i).first()).toBeVisible();
        await expect(
          page.getByRole("heading", { level: 1, name: new RegExp(escapeRe(detail.title), "i") }),
        ).toBeVisible();

        const back = page.getByTestId("back-to-role-dashboard");
        await expect(back).toBeVisible();
        expect(await back.getAttribute("href")).toBe(ROLE_DASHBOARD[role]);

        // (2) New enrichment slots — Next Step, Connected To, Feeds Into
        await expect(page.getByTestId("demo-feature-next-step")).toBeVisible();
        await expect(page.getByTestId("demo-feature-connected-to")).toBeVisible();
        await expect(page.getByTestId("demo-feature-feeds-into")).toBeVisible();

        // (3) Primary action — same target as signed-in feature
        if (detail.primaryAction) {
          const primaries = page.getByTestId(/^demo-feature-primary-action/);
          await expect(primaries.first()).toBeVisible();
          const hrefs = await primaries.evaluateAll((els) =>
            els.map((el) => el.getAttribute("href")),
          );
          for (const href of hrefs) {
            expect(href, `primary action for ${role}/${slug}`).toBe(detail.primaryAction.to);
          }
          // header-level secondary action from augment layer
          await expect(page.getByTestId("demo-feature-secondary-action-header")).toBeVisible();
        }

        // (4) Footer "Back to …" behaves — clicking returns to role dashboard
        const secondary = page.getByTestId("demo-feature-secondary-action");
        await expect(secondary).toBeVisible();
        expect(await secondary.getAttribute("href")).toBe(ROLE_DASHBOARD[role]);
        await secondary.click();
        await page.waitForURL(`**${ROLE_DASHBOARD[role]}`);
        expect(new URL(page.url()).pathname).toBe(ROLE_DASHBOARD[role]);
      });
    }
  });
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
