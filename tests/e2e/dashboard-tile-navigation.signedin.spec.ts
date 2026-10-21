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
import { captureSettledScrollPosition } from "./helpers/scroll-position";
import { dashboardTileHrefs } from "./helpers/dashboard-links";

function normalizePath(p: string) {
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

async function collectInternalTileHrefs(page: Page): Promise<string[]> {
  return page.locator("main").evaluate(dashboardTileHrefs);
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

const RETURN_TOOL_PATHS: Record<string, string> = {
  student: "/calendar",
  parent: "/calendar",
  educator: "/reports",
  school_admin: "/school/team",
  district_admin: "/district/schools",
  partner: "/partners-manage/profile",
  owner: "/owner/content",
};

for (const role of ROLES) {
  test.describe(`${role.label} — actual-source return`, () => {
    test.skip(() => !existsSync(role.storageState), `no storageState for ${role.key}`);
    test.use({ storageState: role.storageState });

    test(`${role.key}: tool return and browser history retain the actual dashboard source`, async ({ page }, testInfo) => {
      await page.goto(role.dashboard, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId(role.dashboardTestId)).toBeVisible({ timeout: 20_000 });
      const toolPath = RETURN_TOOL_PATHS[role.key];
      if (role.key === "district_admin") {
        // The loading dashboard has unscoped links before membership resolves.
        // Wait for the actual workspace and its matching scoped Schools link.
        await expect.poll(async () => {
          const districtId = new URL(page.url()).searchParams.get("district_id");
          if (!districtId) return false;
          return (await collectInternalTileHrefs(page)).some(value => {
            const link = new URL(value, page.url());
            return link.pathname === toolPath && link.searchParams.get("district_id") === districtId;
          });
        }, { timeout: 20_000, message: "District source and Schools link must share the resolved workspace" }).toBe(true);
      }
      let href = "";
      await expect.poll(async () => {
        href = (await collectInternalTileHrefs(page)).find(
          value => new URL(value, page.url()).pathname === toolPath,
        ) ?? "";
        return href;
      }, { timeout: 20_000, message: `No visible ${toolPath} dashboard link for ${role.key}` }).not.toBe("");

      // Capture the route after organization/role redirects have settled.
      // Retain real query/hash context rather than constructing a guessed home.
      const source = new URL(page.url());
      const sourceHref = `${source.pathname}${source.search}${source.hash}`;
      const destinationUrl = new URL(href, page.url()).href;
      const links = page.locator(`main a[href=${JSON.stringify(href)}]`);
      const visible = (await links.all()).reverse();
      const positions: Array<{ step: string; y: number; maximum: number }> = [];
      const readPosition = () => page.evaluate(() => ({
        y: window.scrollY,
        maximum: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
      }));
      let sourcePosition = 0;
      const assertSourcePosition = async (step: string) => {
        let matchingSamples = 0;
        const started = Date.now();
        const timeline: Array<{ elapsedMs: number; y: number; maximum: number }> = [];
        try {
        await expect.poll(async () => {
          const current = await readPosition();
          timeline.push({ elapsedMs: Date.now() - started, ...current });
          const delta = Math.abs(current.y - sourcePosition);
          matchingSamples = delta <= 2 ? matchingSamples + 1 : 0;
          return matchingSamples;
        }, {
          timeout: 10_000,
          intervals: [250],
          message: `${role.key}: ${step} must retain the captured dashboard position across three samples`,
        }).toBeGreaterThanOrEqual(3);
        } finally {
          positions.push({ step, ...await readPosition() });
          await testInfo.attach(`dashboard-scroll-attempt-${step}`, {
            contentType: "application/json",
            body: JSON.stringify({ role: role.key, expectedY: sourcePosition, positions, timeline }, null, 2),
          });
        }
      };
      let clicked = false;
      for (const link of visible) {
        if (await link.isVisible()) {
          // Measure after the browser makes the actual clicked control visible.
          // Prefer the last real matching link, often in the lower widget area.
          await link.scrollIntoViewIfNeeded();
          const captured = await captureSettledScrollPosition(page);
          sourcePosition = captured.y;
          positions.push({ step: "before-tool", ...captured });
          await testInfo.attach("dashboard-scroll-origin", {
            body: JSON.stringify({ role: role.key, sourceHref, ...captured,
              scrolledOrigin: captured.y > 2 }, null, 2),
            contentType: "application/json",
          });
          await link.click();
          clicked = true;
          break;
        }
      }
      expect(clicked, `No clickable dashboard link to ${href}`).toBe(true);
      await expect(page).toHaveURL(destinationUrl);
      await expect(page.locator('main:not([data-auth-state="route-pending"]):not([data-auth-state="session-loading"])')).toBeVisible({ timeout: 15_000 });
      // Owner Hub has its own management header, without the audience SiteHeader.
      // Require exactly one real source-aware return in that header as well.
      await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeLessThanOrEqual(2);
      const returnNav = role.key === "owner"
        ? page.getByRole("banner")
        : page.getByRole("navigation", { name: "Return to previous page", exact: true });
      await expect(returnNav).toHaveCount(1);
      const back = returnNav.getByRole("link", { name: /^Back to /i });
      await expect(back).toHaveCount(1);
      await expect(back).toHaveAttribute("href", sourceHref);
      await expect(back).not.toHaveText(/back to home/i);
      await back.click();
      await expect(page).toHaveURL(source.href);
      await expect(page.getByTestId(role.dashboardTestId)).toBeVisible();
      await assertSourcePosition("contextual-return");

      // The contextual control must revisit the old entry, not push a new
      // dashboard entry: browser Forward should still reach the same tool.
      await page.goForward({ waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(destinationUrl);
      await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeLessThanOrEqual(2);
      await expect(back).toHaveCount(1);
      await expect(back).toHaveAttribute("href", sourceHref);
      await page.goBack({ waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(source.href);
      await expect(page.getByTestId(role.dashboardTestId)).toBeVisible();
      await assertSourcePosition("browser-back-after-forward");
      await testInfo.attach("dashboard-scroll-results", {
        body: JSON.stringify({ role: role.key, sourceHref, tolerancePixels: 2, positions }, null, 2),
        contentType: "application/json",
      });
    });
  });
}
