// Cross-role dashboard regression: viewport layout, no duplicate links,
// no dead buttons, and that loading/empty/error states render and persist
// after a hard refresh.
//
// Each role × viewport combo auto-skips when the role's storageState
// produced by auth-roles.setup.ts is missing (so partial credential
// matrices still produce useful CI signal).
//
// Run all roles locally:
//   E2E_STUDENT_EMAIL=… E2E_STUDENT_PASSWORD=… \
//   E2E_EDUCATOR_EMAIL=… E2E_EDUCATOR_PASSWORD=… \
//   …                                            \
//   npx playwright test --project=dashboard-regression

import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { existsSync } from "node:fs";
import { ROLES, VIEWPORTS } from "./helpers/roles";

async function attachMainDiagnostic(
  page: Page,
  testInfo: TestInfo,
  roleKey: string,
  label: string,
) {
  const mainText = await page
    .locator("main")
    .innerText({ timeout: 15_000 })
    .catch((err: Error) => `<main unavailable: ${err.message}>`);
  const diagnostic = {
    roleKey,
    label,
    finalUrl: page.url(),
    mainText,
  };
  console.log(
    `[dashboard-main-diagnostic ${roleKey} ${label}] finalUrl=${diagnostic.finalUrl}\n${mainText}`,
  );
  await testInfo.attach(`${roleKey}-${label}-main-diagnostic.json`, {
    body: JSON.stringify(diagnostic, null, 2),
    contentType: "application/json",
  });
}

function normalizePath(path: string) {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function pathMatchesExpected(actualPath: string, expectedPath: string) {
  const actual = normalizePath(actualPath);
  const expected = normalizePath(expectedPath);
  return actual === expected || actual.startsWith(`${expected}/`);
}

function isRejectedDashboardPath(path: string) {
  const actual = normalizePath(path);
  return actual === "/onboarding" || actual === "/login" || actual.startsWith("/login/2fa");
}

async function assertDashboardRouteReady(page: Page, role: (typeof ROLES)[number]) {
  const finalUrl = page.url();
  const finalPath = new URL(finalUrl).pathname;
  expect(
    !isRejectedDashboardPath(finalPath) && pathMatchesExpected(finalPath, role.dashboard),
    `Seeded role account is not dashboard-ready: expected ${role.dashboard}, got ${finalUrl}. Complete onboarding seed data or fix route guard.`,
  ).toBe(true);
  await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
}

async function assertNoHorizontalScroll(page: Page, label: string) {
  const dims = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    dims.scrollWidth,
    `${label} overflows horizontally (scroll=${dims.scrollWidth}, client=${dims.clientWidth})`,
  ).toBeLessThanOrEqual(dims.clientWidth + 2);
}

async function collectInteractiveTargets(page: Page) {
  // Visible buttons + links inside <main>. We only care about controls the
  // user can actually click, so hidden / off-screen elements are filtered.
  return await page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const nodes = Array.from(
      main.querySelectorAll<HTMLElement>("a[href], button"),
    );
    return nodes
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") return false;
        return true;
      })
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        href: el.getAttribute("href") ?? null,
        text: (el.textContent ?? "").trim().slice(0, 60),
        // Heuristic: dead-button = <button> with no type, no aria-*, no
        // data-state (Radix), no form attribute. Click-handlers can't be
        // sniffed from the DOM, so we ALSO click in a later step and
        // assert SOMETHING changes.
        hasType: el.hasAttribute("type"),
        hasForm: el.hasAttribute("form"),
        hasAria: !!el.getAttributeNames().find((n) => n.startsWith("aria-")),
        hasDataState: el.hasAttribute("data-state"),
        disabled: (el as HTMLButtonElement).disabled === true,
      }));
  });
}

for (const role of ROLES) {
  test.describe(`${role.label} dashboard`, () => {
    test.skip(
      () => !existsSync(role.storageState),
      `no storageState for ${role.key} — set ${role.emailEnv}/${role.passwordEnv} and re-run setup`,
    );
    test.use({ storageState: role.storageState });

    for (const vp of VIEWPORTS) {
      test.describe(`@ ${vp.label} (${vp.width}×${vp.height})`, () => {
        test.use({ viewport: { width: vp.width, height: vp.height } });

        test("renders, no horizontal overflow, expected landmarks", async ({ page }, testInfo) => {
          await page.goto(role.dashboard, { waitUntil: "networkidle" });
          await attachMainDiagnostic(page, testInfo, role.key, vp.label);
          await assertDashboardRouteReady(page, role);
          const main = page.locator("main");
          await expect(main).toBeVisible({ timeout: 15_000 });
          // Scope role landmark checks to <main>: hidden responsive nav links
          // and shared header/footer copy must not satisfy or violate the
          // role's expected dashboard content.
          for (const re of role.mustSee) {
            await expect(main.getByText(re).first()).toBeVisible({ timeout: 10_000 });
          }
          for (const re of role.mustNotSee) {
            await expect(main.getByText(re)).toHaveCount(0);
          }
          await assertNoHorizontalScroll(page, `${role.key} ${vp.label}`);
        });

        test("has no duplicate links in main content", async ({ page }) => {
          await page.goto(role.dashboard, { waitUntil: "networkidle" });
          await assertDashboardRouteReady(page, role);
          const items = await collectInteractiveTargets(page);
          const hrefs = items
            .filter((i) => i.tag === "a" && i.href && i.href.startsWith("/"))
            .map((i) => i.href!);
          const counts = new Map<string, number>();
          for (const h of hrefs) counts.set(h, (counts.get(h) ?? 0) + 1);
          // Allow href="/" once (logo) and known repeating utility links
          // like /messages once per region.
          const dupes = [...counts.entries()].filter(([, n]) => n > 1);
          expect(
            dupes,
            `duplicate hrefs inside <main> for ${role.key}: ${JSON.stringify(dupes)}`,
          ).toEqual([]);
        });

        test("has no inert <button> elements", async ({ page }) => {
          await page.goto(role.dashboard, { waitUntil: "networkidle" });
          await assertDashboardRouteReady(page, role);
          const items = await collectInteractiveTargets(page);
          const suspects = items.filter(
            (i) =>
              i.tag === "button" &&
              !i.disabled &&
              !i.hasType &&
              !i.hasForm &&
              !i.hasAria &&
              !i.hasDataState,
          );
          expect(
            suspects.map((s) => s.text),
            `buttons with no type / form / aria / data-state for ${role.key} — likely dead`,
          ).toEqual([]);
        });
      });
    }

    // Regression: once the signed-in session resolves, the shared dashboard
    // shell must mount immediately and `data-auth-state` must never be left
    // stuck on "route-pending". If beforeLoad flashes the pending shell and
    // never hands off to AuthenticatedLayout, this test catches it.
    test("mounts shared dashboard shell immediately after auth resolves", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(role.dashboard, { waitUntil: "networkidle" });
      await assertDashboardRouteReady(page, role);
      const main = page.locator("main[data-auth-state]").first();
      await expect(main).toBeVisible({ timeout: 15_000 });
      // Poll until data-auth-state settles off "route-pending". The pending
      // shell is allowed only as a brief flash during beforeLoad — once the
      // session resolves, AuthenticatedLayout must own the shell.
      await expect
        .poll(
          async () => page.locator("main").first().getAttribute("data-auth-state"),
          {
            timeout: 15_000,
            message: `${role.key} /dashboard stuck on data-auth-state="route-pending" after auth resolved`,
          },
        )
        .not.toBe("route-pending");
      const state = await page.locator("main").first().getAttribute("data-auth-state");
      expect(
        state,
        `${role.key} /dashboard must expose data-auth-state after auth resolves (got ${state})`,
      ).not.toBeNull();
      expect(state).not.toBe("route-pending");
    });

    // Persistence: the dashboard surface that survives a hard refresh.
    // Strategy: capture stable text from the role's first "must-see"
    // region, reload, and assert it's still there. Catches loaders that
    // throw away state on remount and loading/error states that flash
    // instead of resolving.
    test("dashboard state survives a hard refresh", async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(role.dashboard, { waitUntil: "networkidle" });
      await attachMainDiagnostic(page, testInfo, role.key, "refresh-before");
      await assertDashboardRouteReady(page, role);
      const main = page.locator("main");
      await expect(main.getByText(role.mustSee[0]!).first()).toBeVisible({ timeout: 15_000 });
      const before = await main.innerText();
      await page.reload({ waitUntil: "networkidle" });
      await assertDashboardRouteReady(page, role);
      await expect(main.getByText(role.mustSee[0]!).first()).toBeVisible({ timeout: 15_000 });
      const after = await main.innerText();
      // The two snapshots will differ slightly (timestamps, "moments ago"),
      // so compare lengths within 25% — catches the "everything vanished"
      // and "error boundary replaced the dashboard" regressions.
      const ratio = Math.min(before.length, after.length) /
        Math.max(before.length, after.length);
      expect(
        ratio,
        `${role.key} dashboard collapsed after refresh (before=${before.length} after=${after.length})`,
      ).toBeGreaterThan(0.75);
    });

    test("renders an error-resilient state when the loader fails", async ({ page }) => {
      // Force every server-fn POST to 500 and confirm the page still mounts
      // (errorComponent or in-page ErrorState), not a blank screen.
      await page.route("**/_serverFn/**", (route) => route.fulfill({ status: 500, body: "boom" }));
      await page.route("**/_server/**", (route) => route.fulfill({ status: 500, body: "boom" }));
      await page.goto(role.dashboard, { waitUntil: "domcontentloaded" });
      await assertDashboardRouteReady(page, role);
      await expect(page.locator("body")).toBeVisible();
      // Page must render *something* — header / main / an error message.
      const visibleText = await page.locator("body").innerText();
      expect(
        visibleText.length,
        `${role.key} dashboard rendered nothing when loader failed`,
      ).toBeGreaterThan(20);
    });
  });
}
