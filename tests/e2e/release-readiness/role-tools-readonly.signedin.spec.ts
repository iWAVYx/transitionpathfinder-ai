/** Open the real responsive menus; source-only/closed-menu scans are insufficient.
 * Existing isolated staging accounts only. Never click a tool's write/generate action.
 */
import { test, expect, type Page, type Locator } from "@playwright/test";
import { ROLES } from "../helpers/roles";
import { dashboardTileHrefs } from "../helpers/dashboard-links";
import { existsSync } from "node:fs";

const stagingOrigin = "https://transitionforward-staging.caysi101.workers.dev";
const stableLovable = "https://gentle-forward-reach.lovable.app";
const pathOf = (href: string) => new URL(href, stagingOrigin).pathname.replace(/\/+$/, "") || "/";
type Shortcut = { href: string; label: string };

test.skip(
  process.env.RUN_ROLE_TOOLS_READONLY !== "true",
  "Dedicated protected read-only scope required",
);
test.use({ trace: "off", video: "off", screenshot: "only-on-failure" });
test.describe.configure({ retries: 0 });
test.beforeAll(async () => {
  if (
    process.env.E2E_READ_ONLY !== "true" ||
    process.env.REQUIRE_ALL_ROLES !== "true" ||
    new URL(process.env.PLAYWRIGHT_BASE_URL ?? "").origin !== stagingOrigin
  )
    throw Error("Refusing non-isolated or writable menu audit");
  if (
    !/^[a-f0-9]{40}$/.test(process.env.E2E_EXPECTED_BUILD_SHA ?? "") ||
    !/^[a-f0-9]{64}$/.test(process.env.EXPECTED_RUNTIME_SOURCE_FINGERPRINT ?? "")
  )
    throw Error("Verified deployed source identity required");
  if (ROLES.some((role) => !existsSync(role.storageState)))
    throw Error("All seven existing role sessions are required");
  for (const origin of [stagingOrigin, stableLovable]) {
    const response = await fetch(`${origin}/api/public/env-health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    expect(response.ok, `${origin} health`).toBe(true);
    const health = await response.json();
    expect(health.app_env).toBe("staging");
    expect(health.supabase_project_ref).toBe("qgrertkqbwanerqqemph");
    expect(health.is_production_target).toBe(false);
    expect(health.stripe_mode).toBe("sandbox");
    expect(health.isolation?.ok).toBe(true);
    expect(health.runtime_source_fingerprint).toBe(process.env.EXPECTED_RUNTIME_SOURCE_FINGERPRINT);
    if (origin === stagingOrigin)
      expect(health.git_commit_sha).toBe(process.env.E2E_EXPECTED_BUILD_SHA);
  }
});

async function visibleLinks(scope: Locator): Promise<Shortcut[]> {
  return scope.locator("a[href]").evaluateAll((nodes) =>
    nodes
      .filter((node) => {
        const bounds = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      })
      .map((node) => ({
        href: node.getAttribute("href") ?? "",
        label: node.textContent?.trim() ?? "",
      })),
  );
}

async function openedTools(page: Page, mobile: boolean, owner: boolean) {
  if (!mobile) {
    await page.getByRole("button", { name: "Tools", exact: true }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    return (await visibleLinks(menu)).filter(
      (item) => !["/settings", "/help"].includes(pathOf(item.href)),
    );
  }
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Site navigation" });
  await expect(dialog).toBeVisible();
  const label = owner ? /^Website management$/i : /^Tools$/;
  const details = dialog
    .locator("details")
    .filter({ has: page.locator("summary").filter({ hasText: label }) });
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  return visibleLinks(details);
}

for (const role of ROLES) {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test.describe(`${role.label} opened Tools ${viewport.name}`, () => {
      test.use({
        storageState: role.storageState,
        viewport: { width: viewport.width, height: viewport.height },
      });
      test("shortcuts belong to dashboard features and render their intended tool", async ({
        page,
      }, info) => {
        test.setTimeout(180_000);
        await page.goto(role.dashboard, { waitUntil: "domcontentloaded" });
        await expect(page.getByTestId(role.dashboardTestId)).toBeVisible({ timeout: 30_000 });
        await expect
          .poll(
            () =>
              page
                .locator("main")
                .first()
                .evaluate(dashboardTileHrefs)
                .then((links) => links.length),
            { timeout: 30_000 },
          )
          .toBeGreaterThan(0);
        let dashboardPaths = new Set(
          (await page.locator("main").first().evaluate(dashboardTileHrefs)).map(pathOf),
        );
        // Owner Hub has its own management navigation, not the shared site header.
        // On public pages, this same signed-in Owner must still get management only.
        if (role.key === "owner") await page.goto("/resources", { waitUntil: "domcontentloaded" });
        const shortcuts = await openedTools(page, viewport.name === "mobile", role.key === "owner");
        if (role.key !== "owner") {
          // A route's nav can render before its async feature cards. Wait for
          // the actual required membership, never accept the first loading link.
          await expect
            .poll(
              async () => {
                dashboardPaths = new Set(
                  (await page.locator("main").first().evaluate(dashboardTileHrefs)).map(pathOf),
                );
                return shortcuts
                  .filter((item) => !dashboardPaths.has(pathOf(item.href)))
                  .map((item) => item.href);
              },
              {
                timeout: 30_000,
                message: `${role.key}: all menu shortcuts need rendered dashboard actions`,
              },
            )
            .toEqual([]);
        }
        expect(shortcuts.length).toBeGreaterThan(0);
        expect(new Set(shortcuts.map((item) => item.href)).size).toBe(shortcuts.length);
        for (const item of shortcuts) {
          expect(item.href, `${role.key}: internal menu destination`).toMatch(/^\/(?!\/)/);
          expect(item.label, `${role.key}: readable shortcut label`).not.toMatch(
            /\bundefined\b|\[object Object\]|\b[a-z]+_[a-z]+\b/,
          );
          expect(item.label.length).toBeGreaterThan(0);
          const target = pathOf(item.href);
          if (role.key === "owner")
            expect(target, "Owner shortcuts stay in website management").toMatch(/^\/owner\//);
          else
            expect(
              dashboardPaths.has(target),
              `${item.label} (${item.href}) has no existing rendered dashboard action`,
            ).toBe(true);
        }
        const destinations: Array<{ href: string; finalPath: string; passed: boolean }> = [];
        const failures: string[] = [];
        for (const item of shortcuts) {
          const destination = await page.context().newPage();
          try {
            await destination.goto(item.href, { waitUntil: "domcontentloaded" });
            const main = destination
              .locator(
                'main:not([data-auth-state="route-pending"]):not([data-auth-state="session-loading"]):not([data-auth-state="checking"])',
              )
              .first();
            await expect(main).toBeVisible({ timeout: 20_000 });
            await expect(main.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
            const finalPath = pathOf(destination.url());
            const target = pathOf(item.href);
            expect(finalPath, `${item.label} must not land on an unrelated fallback`).toBe(target);
            const text = await main.innerText();
            expect(text).not.toMatch(
              /page not found|route not found|something went wrong|(?:could not|couldn't|unable to) (?:load|open)|access denied|not authori[sz]ed/i,
            );
            destinations.push({ href: item.href, finalPath, passed: true });
          } catch (error) {
            failures.push(
              `${item.label}: ${item.href} → ${pathOf(destination.url())}: ${error instanceof Error ? error.message : "navigation failed"}`,
            );
            destinations.push({
              href: item.href,
              finalPath: pathOf(destination.url()),
              passed: false,
            });
          } finally {
            await destination.close();
          }
        }
        await info.attach("opened-tools-destinations.json", {
          body: JSON.stringify(
            {
              role: role.key,
              viewport: viewport.name,
              source: role.key === "owner" ? "/resources" : role.dashboard,
              shortcuts,
              destinations,
            },
            null,
            2,
          ),
          contentType: "application/json",
        });
        expect(failures, failures.join("\n")).toEqual([]);
      });
    });
  }
}
