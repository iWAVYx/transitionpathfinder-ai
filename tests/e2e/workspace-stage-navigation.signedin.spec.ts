/**
 * Transition Workspace stage navigation.
 *
 * Every canonical TW stage declares a `signedInRoute` that a signed-in
 * user should land on when they open that stage from the workspace. This
 * spec walks WORKSPACE_STAGES for every seeded role and verifies:
 *
 *  - navigating to stage.signedInRoute renders a real <main>
 *  - the router does NOT bounce to /login, /auth, or a not-found boundary
 *
 * A role that legitimately cannot access a stage will be redirected to
 * its role fallback; we accept that as long as the destination still
 * renders a real page (not a guard bounce, not 404). What we're catching
 * here is the audit-report class of bug: a stage wired to a missing or
 * dead route.
 *
 * Auto-skips per role when the seeded storageState is missing.
 */

import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { ROLES } from "./helpers/roles";
import { WORKSPACE_STAGES } from "../../src/lib/workspace/stages";

function normalizePath(p: string) {
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

for (const role of ROLES) {
  test.describe(`${role.label} — TW stage navigation`, () => {
    test.skip(
      () => !existsSync(role.storageState),
      `no storageState for ${role.key} — set ${role.emailEnv}/${role.passwordEnv} and re-run setup`,
    );
    test.use({ storageState: role.storageState });

    for (const stage of WORKSPACE_STAGES) {
      test(`${role.key} → stage "${stage.id}" (${stage.signedInRoute})`, async ({ page }) => {
        await page.goto(stage.signedInRoute, { waitUntil: "domcontentloaded" });

        const finalPath = normalizePath(new URL(page.url()).pathname);
        expect(
          finalPath === "/login" ||
            finalPath.startsWith("/login/") ||
            finalPath === "/auth",
          `${role.key}: stage ${stage.id} bounced to ${finalPath}`,
        ).toBe(false);

        await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });

        const mainText = (await page.locator("main").innerText().catch(() => "")).toLowerCase();
        const isNotFound =
          mainText.includes("page not found") ||
          mainText.includes("route not found") ||
          /\b404\b/.test(mainText);
        expect(
          isNotFound,
          `${role.key}: stage ${stage.id} (${stage.signedInRoute}) landed on a not-found page at ${finalPath}`,
        ).toBe(false);
      });
    }
  });
}
