/**
 * Owner Hub sub-navigation permission guard.
 *
 * Mirrors the NAV array in src/components/owner/OwnerShell.tsx and asserts:
 *   1. Non-owner roles are BLOCKED from every /owner/* sub-nav URL
 *      (either bounced off /owner via the layout guard, or otherwise
 *      denied — never rendering the owner surface).
 *   2. The platform-admin (owner) role reaches every sub-nav URL without
 *      being redirected to a different page.
 *
 * Auto-skips per role when the corresponding storageState is missing so
 * PR forks without seeded credentials don't fail the suite.
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { ROLES } from "./helpers/roles";

// Keep in sync with NAV in src/components/owner/OwnerShell.tsx.
const OWNER_SUBNAV: string[] = [
  "/owner",
  "/owner/analytics",
  "/owner/activity",
  "/owner/users",
  "/owner/admins",
  "/owner/waitlist",
  "/owner/contacts",
  "/owner/organizations",
  "/owner/pilot-packages",
  "/owner/content",
  "/owner/media",
  "/owner/blog",
  "/owner/faqs",
  "/owner/testimonials",
  "/owner/resources",
  "/owner/resource-sources",
  "/owner/bridgeforward-sources",
  "/owner/resource-review",
  "/owner/import-audit",
  "/owner/partner-network",
  "/owner/partner-submissions",
  "/owner/opportunities",
  "/owner/outreach",
  "/owner/partnerforward-resources",
  "/owner/feedback",
  "/owner/issues",
  "/owner/beta-testers",
  "/owner/testing",
  "/owner/launch",
  "/owner/role-audit",
  "/owner/pitch",
  "/owner/demo",
  "/owner/health",
  "/owner/emails",
  "/owner/broadcasts",
  "/owner/iep-audit",
  "/owner/settings",
];

async function reachedOwnerSurface(page: Page, route: string): Promise<boolean> {
  const path = new URL(page.url()).pathname;
  if (!path.startsWith("/owner")) return false;
  if (path !== route && !path.startsWith(`${route}/`)) return false;
  const body = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
  if (/do not have permission|not authori[sz]ed|forbidden|sign in|checking admin access/.test(body)) {
    return false;
  }
  return true;
}

for (const role of ROLES) {
  if (role.key === "owner") continue;

  test.describe(`${role.label} — Owner Hub sub-nav is blocked`, () => {
    test.skip(() => !existsSync(role.storageState), `no storageState for ${role.key}`);
    test.use({ storageState: role.storageState });

    for (const route of OWNER_SUBNAV) {
      test(`cannot reach ${route}`, async ({ page }) => {
        await page.goto(route, { waitUntil: "networkidle" }).catch(() => {});
        const leaked = await reachedOwnerSurface(page, route);
        expect(
          leaked,
          `${role.key} rendered owner sub-nav page ${route} (url=${page.url()})`,
        ).toBe(false);
      });
    }
  });
}

test.describe("Platform Admin — Owner Hub sub-nav resolves without redirects", () => {
  const owner = ROLES.find((r) => r.key === "owner")!;
  test.skip(() => !existsSync(owner.storageState), "no owner storageState");
  test.use({ storageState: owner.storageState });

  for (const route of OWNER_SUBNAV) {
    test(`owner reaches ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "networkidle" });
      const path = new URL(page.url()).pathname;
      expect(
        path === route || path.startsWith(`${route}/`),
        `owner was redirected from ${route} to ${path}`,
      ).toBe(true);
      // Sanity: the owner shell landmark should render.
      await expect(page.locator("body")).toContainText(/Platform Admin/i);
    });
  }
});
