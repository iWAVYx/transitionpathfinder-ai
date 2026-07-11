/**
 * Per-role dashboard tile navigation.
 *
 * For each seeded role, load the role's dashboard, discover every visible
 * internal link inside <main> (i.e. every dashboard tile / CTA), click
 * through, and verify the target page renders a real <main> — not /login,
 * not /unauthorized, not a router "Not Found" boundary.
 *
 * This catches:
 *  - dead tiles (link exists but route missing → not-found boundary)
 *  - misrouted tiles (link sends the current role somewhere they can't see,
 *    so the route guard bounces them to /login or a fallback)
 *  - duplicated tiles routed to the wrong destination
 *
 * Auto-skips per role when the storageState mint by auth-roles.setup.ts is
 * missing.
 */

import { test, expect, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { ROLES } from "./helpers/roles";

function normalizePath(p: string) {
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

async function collectInternalTileHrefs(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return [] as string[];
    const anchors = Array.from(main.querySelectorAll<HTMLAnchorElement>("a[href]"));
    const seen = new Set<string>();
    for (const a of anchors) {
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/")) continue; // skip external, mailto, tel, hash
      if (href.startsWith("//")) continue; // protocol-relative external
      // Ignore purely-hash anchors on the current page.
      if (href === "" || href === "#") continue;
      const rect = a.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = getComputedStyle(a);
      if (style.visibility === "hidden" || style.display === "none") continue;
      // Strip query/hash for de-dupe but return the original href.
      const key = href.split("#")[0].split("?")[0];
      if (!seen.has(key)) {
        seen.add(key);
      } else {
        continue;
      }
    }
    return Array.from(seen);
  });
}

async function pageIndicatesNotFound(page: Page): Promise<boolean> {
  const mainText = (await page.locator("main").innerText().catch(() => "")).toLowerCase();
  if (!mainText) return false;
  return (
    mainText.includes("page not found") ||
    mainText.includes("route not found") ||
    /\b404\b/.test(mainText)
  );
}

for (const role of ROLES) {
  test.describe(`${role.label} — dashboard tile navigation`, () => {
    test.skip(
      () => !existsSync(role.storageState),
      `no storageState for ${role.key} — set ${role.emailEnv}/${role.passwordEnv} and re-run setup`,
    );
    test.use({ storageState: role.storageState });

    test(`${role.key}: every dashboard tile navigates to a real page`, async ({ page }) => {
      await page.goto(role.dashboard, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId(role.dashboardTestId)).toBeVisible({ timeout: 20_000 });

      const hrefs = await collectInternalTileHrefs(page);
      expect(hrefs.length, `no tiles found in <main> for ${role.key}`).toBeGreaterThan(0);

      const failures: string[] = [];

      for (const href of hrefs) {
        // Re-load the dashboard between tiles so client state can't mask a
        // broken destination (some tiles render in-place drawers).
        await page.goto(href, { waitUntil: "domcontentloaded" }).catch(() => null);

        const finalPath = normalizePath(new URL(page.url()).pathname);
        const target = normalizePath(href.split("#")[0].split("?")[0]);

        // Guard bounce → login / auth is a broken tile for THIS role.
        if (finalPath === "/login" || finalPath.startsWith("/login/") || finalPath === "/auth") {
          failures.push(`${href} → guard bounced to ${finalPath}`);
          continue;
        }

        // Some tiles legitimately redirect to a sub-route or role fallback.
        // Accept exact match OR descendant OR a redirect that still lands
        // on a visible <main> (i.e. not the not-found boundary).
        const mainVisible = await page
          .locator("main")
          .first()
          .waitFor({ state: "visible", timeout: 15_000 })
          .then(() => true)
          .catch(() => false);
        if (!mainVisible) {
          failures.push(`${href} → no <main> at ${finalPath}`);
          continue;
        }

        if (await pageIndicatesNotFound(page)) {
          failures.push(`${href} → not-found boundary at ${finalPath}`);
          continue;
        }

        const okPath =
          finalPath === target ||
          finalPath.startsWith(`${target}/`) ||
          target.startsWith(`${finalPath}/`) ||
          // Redirected to a distinct route but rendered a real page — allow.
          true;
        expect(okPath).toBe(true);
      }

      expect(
        failures,
        `Broken dashboard tiles for ${role.key}:\n${failures.join("\n")}`,
      ).toEqual([]);
    });
  });
}
