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
      // Cloudflare preflight: production (transitionforwardct.com) sits behind
      // a Cloudflare challenge that blocks headless browsers. CI must point
      // PLAYWRIGHT_BASE_URL at an E2E/staging subdomain (e.g.
      // https://e2e.transitionforwardct.com) that is NOT behind the challenge.
      // If we detect the interstitial here, fail loudly with remediation steps
      // instead of timing out on a missing #login-email.
      const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "";
      if (/(^|\.)transitionforwardct\.com$/i.test(new URL(baseUrl || "http://x").hostname) &&
          !/^(e2e|staging)\./i.test(new URL(baseUrl || "http://x").hostname)) {
        console.warn(
          `[auth-setup ${role.key}] PLAYWRIGHT_BASE_URL=${baseUrl} looks like production. ` +
            `Use an E2E/staging subdomain (e2e.transitionforwardct.com or staging.transitionforwardct.com) ` +
            `that is exempt from the Cloudflare challenge.`,
        );
      }

      const probeResp = await page.goto("/", { waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => null);
      const probeBody = await page.locator("body").innerText({ timeout: 2_000 }).catch(() => "");
      const cfChallenge =
        /just a moment/i.test(probeBody) ||
        /cf-browser-verification|challenge-platform|cf-chl-/i.test(await page.content().catch(() => "")) ||
        probeResp?.status() === 403;
      if (cfChallenge) {
        await dumpDiagnostics("cloudflare-challenge");
        throw new Error(
          `Cloudflare challenge detected at ${baseUrl}. Playwright cannot solve "Just a moment...". ` +
            `Fix: point PLAYWRIGHT_BASE_URL (GitHub Actions secret E2E_BASE_URL) at an E2E/staging ` +
            `subdomain such as https://e2e.transitionforwardct.com or https://staging.transitionforwardct.com ` +
            `with the Cloudflare challenge disabled for that hostname. Do NOT run E2E against production.`,
        );
      }

      // Route discovery: probe candidate auth routes and report which one
      // actually serves the sign-in form (login-email testid). This lets us
      // confirm whether /login is canonical or the app has moved to /auth,
      // /signin, etc. Result is logged and attached to the report.
      const candidates = ["/login", "/auth", "/signin", "/sign-in", "/account/login"];

      const discovery: Array<{
        path: string;
        finalUrl: string;
        status: number | null;
        hasLoginEmail: boolean;
        hasAnyEmailInput: boolean;
      }> = [];
      for (const path of candidates) {
        try {
          const resp = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 20_000 });
          const finalUrl = page.url();
          const hasLoginEmail = await page
            .getByTestId("login-email")
            .first()
            .isVisible()
            .catch(() => false);
          const hasAnyEmailInput = await page
            .locator('input[type="email"], input[name="email" i], input[autocomplete="email"]')
            .first()
            .isVisible()
            .catch(() => false);
          discovery.push({
            path,
            finalUrl,
            status: resp?.status() ?? null,
            hasLoginEmail,
            hasAnyEmailInput,
          });
        } catch (e) {
          discovery.push({
            path,
            finalUrl: page.url(),
            status: null,
            hasLoginEmail: false,
            hasAnyEmailInput: false,
          });
        }
      }
      const report = JSON.stringify(discovery, null, 2);
      console.log(`[auth-setup ${role.key}] route-discovery:\n${report}`);
      await testInfo.attach(`${role.key}-route-discovery.json`, {
        body: report,
        contentType: "application/json",
      });

      const canonical = discovery.find((d) => d.hasLoginEmail);
      if (!canonical) {
        const anyEmail = discovery.find((d) => d.hasAnyEmailInput);
        await dumpDiagnostics("no-login-form-on-any-candidate");
        throw new Error(
          `No candidate route exposed data-testid="login-email". ` +
            `Closest match with an email input: ${anyEmail?.path ?? "none"} (final ${anyEmail?.finalUrl ?? "n/a"}). ` +
            `Full discovery: ${report}`,
        );
      }
      if (canonical.path !== "/login") {
        console.warn(
          `[auth-setup ${role.key}] sign-in form is served at ${canonical.path} (final ${canonical.finalUrl}), NOT /login. Update setup to use this route.`,
        );
      }

      // Navigate to the discovered canonical route for the actual sign-in.
      await page.goto(canonical.path, { waitUntil: "domcontentloaded" });

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
