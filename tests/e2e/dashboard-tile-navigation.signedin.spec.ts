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
  const mainText = (
    await page
      .locator("main")
      .first()
      .innerText()
      .catch(() => "")
  ).toLowerCase();
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

      // The role test id is present on the dashboard's intentional loading
      // shell. Poll for navigable content so we test the completed dashboard,
      // not the brief async state while roles and workspace data resolve.
      await expect
        .poll(async () => (await collectInternalTileHrefs(page)).length, {
          message: `no navigable dashboard tiles loaded in <main> for ${role.key}`,
          timeout: 20_000,
          intervals: [250, 500, 1_000],
        })
        .toBeGreaterThan(0);

      const hrefs = await collectInternalTileHrefs(page);
      const failures: string[] = [];

      for (const href of hrefs) {
        // Probe every destination in its own page. Reusing one page made a
        // renderer/page crash cascade into false failures for every href that
        // followed it, hiding which tile actually failed.
        const destination = await page.context().newPage();
        try {
          const navigationError = await destination
            .goto(href, { waitUntil: "domcontentloaded" })
            .then(() => null)
            .catch((error: unknown) =>
              error instanceof Error ? error.message : "navigation failed",
            );

          if (destination.isClosed()) {
            failures.push(
              `${href} → page closed during navigation${navigationError ? ` (${navigationError})` : ""}`,
            );
            continue;
          }

          const finalPath = normalizePath(new URL(destination.url()).pathname);

          // Guard bounce → login / auth is a broken tile for THIS role.
          if (finalPath === "/login" || finalPath.startsWith("/login/") || finalPath === "/auth") {
            failures.push(`${href} → guard bounced to ${finalPath}`);
            continue;
          }

          if (navigationError) {
            failures.push(`${href} → navigation failed at ${finalPath} (${navigationError})`);
            continue;
          }

          // A route-pending/session-loading landmark is only a transition,
          // not proof that the destination rendered. Wait for a completed
          // route-owned <main> so an indefinitely pending guard still fails.
          const main = destination
            .locator(
              'main:not([data-auth-state="route-pending"]):not([data-auth-state="session-loading"])',
            )
            .first();
          const mainVisible = await main
            .waitFor({ state: "visible", timeout: 15_000 })
            .then(() => true)
            .catch(() => false);
          if (!mainVisible) {
            failures.push(`${href} → no completed <main> at ${finalPath}`);
            continue;
          }

          if (await pageIndicatesNotFound(destination)) {
            failures.push(`${href} → not-found boundary at ${finalPath}`);
          }
        } finally {
          if (!destination.isClosed()) await destination.close();
        }
      }

      expect(failures, `Broken dashboard tiles for ${role.key}:\n${failures.join("\n")}`).toEqual(
        [],
      );
    });
  });
}
