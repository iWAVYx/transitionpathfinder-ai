// Per-role auth setup. Signs in one Playwright context per role that has
// credentials in the environment and persists its storageState to
// tests/e2e/.auth/<role>.json. Roles with missing creds are skipped so
// PRs without the full secret matrix still run whatever they have.
//
// Required env vars per role (any subset is fine):
//   E2E_STUDENT_EMAIL          E2E_STUDENT_PASSWORD
//   E2E_PARENT_EMAIL           E2E_PARENT_PASSWORD
//   E2E_EDUCATOR_EMAIL         E2E_EDUCATOR_PASSWORD
//   E2E_SCHOOL_ADMIN_EMAIL     E2E_SCHOOL_ADMIN_PASSWORD
//   E2E_DISTRICT_ADMIN_EMAIL   E2E_DISTRICT_ADMIN_PASSWORD
//   E2E_PARTNER_EMAIL          E2E_PARTNER_PASSWORD
//   E2E_OWNER_EMAIL            E2E_OWNER_PASSWORD
//
// If the seeded user has TOTP enrolled, add E2E_<ROLE>_TOTP_SECRET.

import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { authenticator } from "otplib";
import { ROLES, type RoleSpec } from "./helpers/roles";

for (const role of ROLES) {
  setup(`authenticate ${role.key}`, async ({ page }) => {
    const email = process.env[role.emailEnv];
    const password = process.env[role.passwordEnv];
    setup.skip(
      !email || !password,
      `${role.emailEnv} / ${role.passwordEnv} not set — ${role.key} skipped`,
    );

    await page.goto("/login");
    const panel = page.getByRole("tabpanel", { name: /sign in/i });
    await panel.getByLabel(/email/i).fill(email!);
    await panel.getByLabel(/password/i).fill(password!);
    await panel.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(
      (url) => !url.pathname.match(/^\/login$/),
      { timeout: 20_000 },
    );

    // Handle TOTP if the account requires it.
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
  });
}
