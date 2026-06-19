// Per-role auth setup. Signs in one Playwright context per role that has
// credentials in the environment and persists its storageState to
// tests/e2e/.auth/<role>.json. Roles with missing creds are skipped so
// PRs without the full secret matrix still run whatever they have.

import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { authenticator } from "otplib";
import { ROLES, type RoleSpec } from "./helpers/roles";

for (const role of ROLES) {
  setup(`authenticate ${role.key}`, async ({ page }, testInfo) => {
    const email = process.env[role.emailEnv];
    const password = process.env[role.passwordEnv];
    setup.skip(
      !email || !password,
      `${role.emailEnv} / ${role.passwordEnv} not set — ${role.key} skipped`,
    );

    // Dump live diagnostics if anything below throws — the failure log
    // tells us where the page actually was instead of just "selector not found".
    const dumpDiagnostics = async (label: string) => {
      try {
        const url = page.url();
        const title = await page.title().catch(() => "<title unavailable>");
        const bodyText = (
          await page.locator("body").innerText({ timeout: 2_000 }).catch(() => "<body unavailable>")
        ).slice(0, 800);
        const inputIds = await page
          .$$eval("input", (els) =>
            els.map((e) => ({
              id: (e as HTMLInputElement).id,
              name: (e as HTMLInputElement).name,
              type: (e as HTMLInputElement).type,
              testid: e.getAttribute("data-testid"),
            })),
          )
          .catch(() => []);
        const shot = await page.screenshot({ fullPage: true }).catch(() => null);
        if (shot) {
          await testInfo.attach(`${role.key}-${label}.png`, {
            body: shot,
            contentType: "image/png",
          });
        }
        console.log(
          `[auth-setup ${role.key}] ${label}\n  url=${url}\n  title=${title}\n  inputs=${JSON.stringify(inputIds)}\n  body[0..800]=${bodyText}`,
        );
      } catch (e) {
        console.log(`[auth-setup ${role.key}] dumpDiagnostics threw: ${(e as Error).message}`);
      }
    };

    try {
      await page.goto("/login", { waitUntil: "domcontentloaded" });

      // Confirm we actually landed on /login (not redirected to marketing,
      // an error page, or an auth wall).
      const landedPath = new URL(page.url()).pathname;
      if (landedPath !== "/login") {
        await dumpDiagnostics("wrong-landing-route");
        throw new Error(
          `Expected /login but got ${landedPath} — login route may have moved or the app is redirecting.`,
        );
      }

      // Ensure the Sign In tab is active (it's the default, but be explicit
      // in case a future change flips defaults).
      const signinTab = page.getByRole("tab", { name: /sign in/i });
      if (await signinTab.count()) {
        const selected = await signinTab.first().getAttribute("aria-selected");
        if (selected !== "true") {
          await signinTab.first().click();
        }
      }

      const emailInput = page.getByTestId("login-email");
      try {
        await emailInput.waitFor({ state: "visible", timeout: 20_000 });
      } catch (e) {
        await dumpDiagnostics("email-input-not-found");
        throw new Error(
          `login-email not visible on /login after 20s — the rendered page does not contain the sign-in form. See attached screenshot and console diagnostics. Original: ${(e as Error).message}`,
        );
      }

      await emailInput.fill(email!);
      await page.getByTestId("login-password").fill(password!);
      await page.getByTestId("login-submit").click();

      await page.waitForURL(
        (url) => !url.pathname.match(/^\/login$/),
        { timeout: 30_000 },
      );

      if (new URL(page.url()).pathname.startsWith("/login/2fa")) {
        const totp = process.env[`E2E_${role.key.toUpperCase()}_TOTP_SECRET`];
        setup.skip(!totp, `2FA required but no TOTP secret for ${role.key}`);
        const code = authenticator.generate(totp!);
        await page.getByLabel(/six-digit authenticator code/i).click();
        await page.keyboard.type(code, { delay: 30 });
        await page.getByRole("button", { name: /^verify$/i }).click();
        await page.waitForURL(
          (url) => !url.pathname.startsWith("/login"),
          { timeout: 20_000 },
        );
      }

      const hasSession = await page.evaluate(() =>
        Object.keys(window.localStorage).some((k) => k.includes("auth-token")),
      );
      expect(hasSession, `${role.key} session should persist`).toBe(true);

      mkdirSync(dirname((role as RoleSpec).storageState), { recursive: true });
      await page.context().storageState({ path: role.storageState });
    } catch (err) {
      await dumpDiagnostics("failure");
      throw err;
    }
  });
}
