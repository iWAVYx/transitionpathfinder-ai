// Per-role auth setup. Signs in one Playwright context per role that has
// credentials in the environment and persists its storageState to
// tests/e2e/.auth/<role>.json. Roles with missing creds are skipped so
// PRs without the full secret matrix still run whatever they have.

import { test as setup, expect, type Page } from "@playwright/test";
import { mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { authenticator } from "otplib";
import { ROLES, type RoleSpec } from "./helpers/roles";

const DASHBOARD_NOT_READY_PREFIX = "Seeded role account is not dashboard-ready";

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

function dashboardReadinessError(expected: string, got: string) {
  return `${DASHBOARD_NOT_READY_PREFIX}: expected ${expected}, got ${got}. Complete onboarding seed data or fix route guard.`;
}

async function assertDashboardReady(
  page: Page,
  role: RoleSpec,
  dumpDiagnostics?: (label: string) => Promise<void>,
) {
  await page
    .waitForURL(
      (url) =>
        pathMatchesExpected(url.pathname, role.dashboard) ||
        isRejectedDashboardPath(url.pathname),
      { timeout: 15_000 },
    )
    .catch(() => {});

  const finalUrl = page.url();
  const finalPath = new URL(finalUrl).pathname;
  if (isRejectedDashboardPath(finalPath) || !pathMatchesExpected(finalPath, role.dashboard)) {
    await dumpDiagnostics?.("dashboard-not-ready");
    throw new Error(dashboardReadinessError(role.dashboard, finalUrl));
  }
  await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
}

async function completeTwoFactorIfPresent(
  page: Page,
  role: RoleSpec,
  dumpDiagnostics?: (label: string) => Promise<void>,
) {
  if (!new URL(page.url()).pathname.startsWith("/login/2fa")) return;

  const envName = `E2E_${role.key.toUpperCase()}_TOTP_SECRET`;
  const secret = process.env[envName]?.replace(/\s+/g, "");
  if (!secret) {
    await dumpDiagnostics?.("2fa-secret-missing");
    throw new Error(`${role.key} requires 2FA but ${envName} is missing.`);
  }

  const otpInput = page
    .locator(
      [
        '[data-testid="totp-code"]',
        '[data-testid="two-factor-code"]',
        'input[name="code"]',
        'input[name="otp"]',
        'input[autocomplete="one-time-code"]',
      ].join(", "),
    )
    .first();

  try {
    await otpInput.waitFor({ state: "visible", timeout: 10_000 }).catch(async (waitErr) => {
      if (!new URL(page.url()).pathname.startsWith("/login/2fa")) return;
      throw waitErr;
    });
    if (!new URL(page.url()).pathname.startsWith("/login/2fa")) return;
    await otpInput.fill(authenticator.generate(secret));

    const verifyButton = page
      .locator('[data-testid="totp-submit"], [data-testid="verify-2fa"]')
      .or(page.getByRole("button", { name: /verify|continue|submit|confirm/i }))
      .first();

    await verifyButton.click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 20_000,
    });
    await page.waitForLoadState("networkidle").catch(() => {});
  } catch (twofaErr) {
    await dumpDiagnostics?.("2fa-challenge-failed");
    throw new Error(
      `2FA challenge failed for ${role.key} at ${page.url()}. ` +
        `Verify ${envName} matches the enrolled authenticator. ` +
        `Original: ${(twofaErr as Error).message}`,
    );
  }
}

async function completeOnboardingIfPresent(
  page: Page,
  role: RoleSpec,
) {
  if (normalizePath(new URL(page.url()).pathname) !== "/onboarding") return;
  if (role.key === "owner") {
    throw new Error(dashboardReadinessError(role.dashboard, page.url()));
  }

  const roleLabels: Record<string, string> = {
    student: "Student",
    parent: "Parent or Guardian",
    educator: "Educator or Case Manager",
    school_admin: "School Administrator",
    district_admin: "School District Administrator",
    partner: "Partner Organization",
  };
  const requiredAnswers: Record<string, string[]> = {
    student: ["Middle school"],
    parent: ["Actively planning for the next IEP"],
    educator: ["Case manager", "1–10"],
    school_admin: ["High school", "0–50"],
    district_admin: ["1–3"],
    partner: ["Community-based organization"],
  };

  for (let step = 0; step < 8 && normalizePath(new URL(page.url()).pathname) === "/onboarding"; step += 1) {
    if (await page.getByText("Which best describes you?", { exact: true }).isVisible().catch(() => false)) {
      await page.getByText(roleLabels[role.key] ?? role.label, { exact: true }).click();
    }

    if (await page.locator("#you-first").isVisible().catch(() => false)) {
      await page.locator("#you-first").fill("E2E");
      await page.locator("#you-last").fill(role.key.replace(/_/g, " "));
    }

    for (const answer of requiredAnswers[role.key] ?? []) {
      const option = page.getByRole("button", { name: new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).first();
      if (await option.isVisible().catch(() => false)) await option.click();
    }

    if (await page.locator("#s-first").isVisible().catch(() => false)) {
      await page.locator("#s-first").fill("E2E Student");
      await page.locator("#s-last").fill(role.key.replace(/_/g, " "));
    }

    const finish = page.getByRole("button", { name: /finish & open dashboard/i }).first();
    if (await finish.isVisible().catch(() => false)) {
      await finish.click();
    } else {
      await page.getByRole("button", { name: /^continue/i }).first().click();
    }
    await page.waitForTimeout(750);
  }
}

async function ensureWorkspaceSeeded(page: Page, role: RoleSpec) {
  if (role.key === "school_admin") {
    const setupCard = page.getByRole("heading", { name: /set up your school/i }).first();
    if (await setupCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await page.locator("#org-name").fill("E2E Transition School");
      await page.locator("#org-city").fill("Hartford");
      await page.locator("#org-state").fill("CT");
      await page.getByRole("button", { name: /create school/i }).click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
  }

  if (role.key === "district_admin") {
    const setupCard = page.getByRole("heading", { name: /set up your district/i }).first();
    if (await setupCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await page.locator("#district-name").fill("E2E Transition District");
      await page.locator("#district-city").fill("Hartford");
      await page.locator("#district-state").fill("CT");
      await page.getByRole("button", { name: /create district/i }).click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
  }

  if (role.key === "partner") {
    const setupCard = page.getByRole("heading", { name: /set up your partner workspace/i }).first();
    if (await setupCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await page.getByPlaceholder(/capital community college/i).fill("E2E Transition Partner");
      await page.getByPlaceholder(/hartford/i).fill("Hartford");
      await page.getByRole("button", { name: /create workspace/i }).click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
  }
}

for (const role of ROLES) {
  setup(`authenticate ${role.key}`, async ({ page, browser }, testInfo) => {
    const email = process.env[role.emailEnv];
    const password = process.env[role.passwordEnv];
    setup.skip(
      !email || !password,
      `${role.emailEnv} / ${role.passwordEnv} not set — ${role.key} skipped`,
    );

    // Redirect/navigation chain recorder. Captures every top-level
    // response and frame navigation so a failure artifact shows exactly
    // what host/status sequence ran — e.g. e2e.* → 301 apex →
    // Cloudflare challenge. Populated for the lifetime of the test.
    type ChainEntry = {
      kind: "response" | "framenavigated" | "request";
      at: string;
      method?: string;
      url: string;
      host: string;
      status?: number;
      statusText?: string;
      location?: string | null;
      server?: string | null;
      cfRay?: string | null;
      resourceType?: string;
      fromRedirect?: string | null;
    };
    const chain: ChainEntry[] = [];
    const hostOf = (u: string) => {
      try { return new URL(u).hostname.toLowerCase(); } catch { return ""; }
    };
    page.on("request", (req) => {
      if (req.resourceType() !== "document") return;
      const redirectedFrom = req.redirectedFrom();
      chain.push({
        kind: "request",
        at: new Date().toISOString(),
        method: req.method(),
        url: req.url(),
        host: hostOf(req.url()),
        resourceType: req.resourceType(),
        fromRedirect: redirectedFrom ? redirectedFrom.url() : null,
      });
    });
    page.on("response", (resp) => {
      const req = resp.request();
      if (req.resourceType() !== "document") return;
      const headers = resp.headers();
      chain.push({
        kind: "response",
        at: new Date().toISOString(),
        method: req.method(),
        url: resp.url(),
        host: hostOf(resp.url()),
        status: resp.status(),
        statusText: resp.statusText(),
        location: headers["location"] ?? null,
        server: headers["server"] ?? null,
        cfRay: headers["cf-ray"] ?? null,
      });
    });
    page.on("framenavigated", (frame) => {
      if (frame !== page.mainFrame()) return;
      chain.push({
        kind: "framenavigated",
        at: new Date().toISOString(),
        url: frame.url(),
        host: hostOf(frame.url()),
      });
    });

    // Dump live diagnostics if anything below throws — the failure log
    // tells us where the page actually was instead of just "selector not found".
    const dumpDiagnostics = async (label: string) => {
      try {
        const url = page.url();
        const title = await page.title().catch(() => "<title unavailable>");
        const bodyText = (
          await page.locator("body").innerText({ timeout: 2_000 }).catch(() => "<body unavailable>")
        ).slice(0, 2_000);
        const htmlSnippet = (
          await page.content().catch(() => "<html unavailable>")
        ).slice(0, 20_000);
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
        await testInfo.attach(`${role.key}-${label}-redirect-chain.json`, {
          body: JSON.stringify(
            {
              configuredBaseUrl: process.env.PLAYWRIGHT_BASE_URL ?? null,
              finalUrl: url,
              chain,
            },
            null,
            2,
          ),
          contentType: "application/json",
        });
        await testInfo.attach(`${role.key}-${label}.html`, {
          body: htmlSnippet,
          contentType: "text/html",
        });
        const chainSummary = chain
          .filter((c) => c.kind === "response" || c.kind === "framenavigated")
          .map((c) =>
            c.kind === "response"
              ? `  → ${c.status} ${c.host}${new URL(c.url).pathname}${c.location ? `  [Location: ${c.location}]` : ""}${c.cfRay ? `  [cf-ray=${c.cfRay}]` : ""}`
              : `  ⇢ nav ${c.host}${(() => { try { return new URL(c.url).pathname; } catch { return ""; }})()}`,
          )
          .join("\n");
        console.log(
          `[auth-setup ${role.key}] ${label}\n  url=${url}\n  title=${title}\n  inputs=${JSON.stringify(inputIds)}\n  redirect-chain:\n${chainSummary}\n  body[0..2000]=${bodyText}`,
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

      // Reachability preflight: if the base host itself is unreachable
      // (DNS failure, TLS error, wrong domain), `page.goto` resolves to
      // chrome-error://chromewebdata/ and every candidate route looks
      // broken in the same opaque way. Probe "/" first and fail fast with
      // the actual navigation error.
      const configuredBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "(unset — using localhost)";
      console.log(`[auth-setup ${role.key}] configured baseURL=${configuredBaseUrl}`);
      let rootNavError: string | null = null;
      let rootStatus: number | null = null;
      try {
        const r = await page.goto("/", { waitUntil: "domcontentloaded", timeout: 20_000 });
        rootStatus = r?.status() ?? null;
      } catch (e) {
        rootNavError = (e as Error).message;
      }
      const rootFinalUrl = page.url();
      if (rootNavError || rootFinalUrl.startsWith("chrome-error://")) {
        await dumpDiagnostics("base-url-unreachable");
        throw new Error(
          `E2E base URL is unreachable from CI. configuredBaseURL=${configuredBaseUrl} ` +
            `finalUrl=${rootFinalUrl} status=${rootStatus ?? "n/a"} navError=${rootNavError ?? "none"}. ` +
            `Fix DNS / hosting / SSL for the staging hostname before re-running.`,
        );
      }

      // Production-redirect preflight: if the configured base URL is an
      // e2e./staging. subdomain but we landed on the bare apex
      // (transitionforwardct.com), Cloudflare/Lovable is canonical-redirecting
      // the staging host into production — which is exactly the case
      // Playwright cannot pass because production is behind the Cloudflare
      // challenge. Fail loudly with remediation steps instead of letting the
      // test continue and hit a 403 challenge page.
      try {
        const configuredHost = new URL(configuredBaseUrl).hostname.toLowerCase();
        const finalHost = new URL(rootFinalUrl).hostname.toLowerCase();
        const configuredIsStaging = /^(e2e|staging)\./.test(configuredHost);
        const finalIsApex =
          finalHost === "transitionforwardct.com" || finalHost === "www.transitionforwardct.com";
        if (configuredIsStaging && finalIsApex) {
          await dumpDiagnostics("e2e-redirected-to-production");
          throw new Error(
            `E2E domain is redirecting to protected production domain. ` +
              `configuredBaseURL=${configuredBaseUrl} (host=${configuredHost}) but ` +
              `finalUrl=${rootFinalUrl} (host=${finalHost}). Fix: in Cloudflare, ensure ` +
              `${configuredHost} is a CNAME to the Lovable target with proxy=DNS only ` +
              `(gray cloud) and remove any page/redirect rule sending it to the apex. In ` +
              `Lovable custom-domain settings, add ${configuredHost} as its own connected ` +
              `domain with SSL active so the app accepts that host without canonical ` +
              `redirect to transitionforwardct.com.`,
          );
        }
      } catch (e) {
        // URL() can throw on the "(unset — using localhost)" sentinel — only
        // rethrow our own preflight error, not URL parsing failures.
        if (e instanceof Error && e.message.startsWith("E2E domain is redirecting")) throw e;
      }


      // Route discovery: probe candidate auth routes and report which one
      // actually serves the sign-in form (login-email testid). Stops at
      // the first 200 page that has an email input — additional candidates
      // only run if earlier ones failed, so the diagnostics dump is rooted
      // at the page that actually matters (typically /login).
      const candidates = ["/login", "/auth", "/signin", "/sign-in", "/account/login"];

      type Discovery = {
        path: string;
        attemptedUrl: string;
        finalUrl: string;
        status: number | null;
        navError: string | null;
        hasLoginEmail: boolean;
        hasAnyEmailInput: boolean;
        inputs: Array<{ id: string; name: string; type: string; testid: string | null; autocomplete: string | null }>;
        missingTestId: boolean;
        stopped: "found-canonical" | "found-email-no-testid" | null;
      };
      const discovery: Discovery[] = [];
      const baseForJoin = configuredBaseUrl.startsWith("http") ? configuredBaseUrl : "http://localhost:3000";
      for (const path of candidates) {
        const attemptedUrl = new URL(path, baseForJoin).toString();
        let status: number | null = null;
        let navError: string | null = null;
        try {
          const resp = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 20_000 });
          status = resp?.status() ?? null;
        } catch (e) {
          navError = (e as Error).message;
        }
        const finalUrl = page.url();
        // Give client hydration a beat before checking visibility — the
        // tab-based form renders after the bundle boots, and an immediate
        // isVisible() can race React.
        const emailLoc = page.getByTestId("login-email").first();
        await emailLoc.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
        const hasLoginEmail = await emailLoc.isVisible().catch(() => false);
        const hasAnyEmailInput = await page
          .locator('input[type="email"], input[name="email" i], input[autocomplete="email"]')
          .first()
          .isVisible()
          .catch(() => false);
        const inputs = await page
          .$$eval("input", (els) =>
            els.map((e) => ({
              id: (e as HTMLInputElement).id,
              name: (e as HTMLInputElement).name,
              type: (e as HTMLInputElement).type,
              testid: e.getAttribute("data-testid"),
              autocomplete: (e as HTMLInputElement).autocomplete,
            })),
          )
          .catch(() => [] as Discovery["inputs"]);
        const missingTestId = hasAnyEmailInput && !hasLoginEmail;
        const stopped: Discovery["stopped"] = hasLoginEmail
          ? "found-canonical"
          : status === 200 && missingTestId
            ? "found-email-no-testid"
            : null;
        discovery.push({
          path, attemptedUrl, finalUrl, status, navError,
          hasLoginEmail, hasAnyEmailInput, inputs, missingTestId, stopped,
        });
        console.log(
          `[auth-setup ${role.key}] candidate ${path} → status=${status} finalUrl=${finalUrl} ` +
            `hasLoginEmail=${hasLoginEmail} hasAnyEmailInput=${hasAnyEmailInput} ` +
            `missingTestId=${missingTestId} inputs=${JSON.stringify(inputs)}`,
        );
        // Stop as soon as we either find the canonical form OR find a 200
        // page with an email input but no test id — both are actionable;
        // no point probing /auth, /signin, /account/login after that.
        if (stopped) break;
      }
      const report = JSON.stringify(discovery, null, 2);
      console.log(`[auth-setup ${role.key}] route-discovery:\n${report}`);
      await testInfo.attach(`${role.key}-route-discovery.json`, {
        body: report,
        contentType: "application/json",
      });

      const allChromeError = discovery.every((d) => d.finalUrl.startsWith("chrome-error://"));
      if (allChromeError) {
        await dumpDiagnostics("all-routes-chrome-error");
        throw new Error(
          `Every candidate route resolved to chrome-error:// — the CI browser cannot reach ` +
            `the base URL at all. configuredBaseURL=${configuredBaseUrl}. Check DNS, TLS, ` +
            `and that the staging subdomain is connected to the deployed app.`,
        );
      }

      const missingTestIdHit = discovery.find((d) => d.stopped === "found-email-no-testid");
      if (missingTestIdHit && !discovery.some((d) => d.hasLoginEmail)) {
        await dumpDiagnostics("login-form-missing-testid");
        throw new Error(
          `Sign-in form is rendered at ${missingTestIdHit.path} (status ${missingTestIdHit.status}, ` +
            `final ${missingTestIdHit.finalUrl}) but does not expose data-testid="login-email". ` +
            `Add data-testid="login-email" / "login-password" / "login-submit" to the email, password, ` +
            `and submit elements (the deployed build may be older than the source). Observed inputs: ` +
            `${JSON.stringify(missingTestIdHit.inputs)}.`,
        );
      }

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
      // Owner must complete aal2 against /admin so the saved state proves the
      // platform-admin dashboard is reachable, not merely a generic dashboard.
      const signInPath = role.key === "owner"
        ? `${canonical.path}?redirect=${encodeURIComponent(role.dashboard)}`
        : canonical.path;
      await page.goto(signInPath, { waitUntil: "domcontentloaded" });

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

      await completeTwoFactorIfPresent(page, role, dumpDiagnostics);

      const hasSession = await page.evaluate(() =>
        Object.keys(window.localStorage).some((k) => k.includes("auth-token")),
      );
      expect(hasSession, `${role.key} session should persist`).toBe(true);

      await completeOnboardingIfPresent(page, role);
      if (role.key === "owner") {
        await page.goto("/admin", { waitUntil: "networkidle" });
        await completeTwoFactorIfPresent(page, role, dumpDiagnostics);
        await assertDashboardReady(page, role, dumpDiagnostics);
      }
      await page.goto(role.dashboard, { waitUntil: "networkidle" });
      await completeOnboardingIfPresent(page, role);
      if (normalizePath(new URL(page.url()).pathname) !== normalizePath(role.dashboard)) {
        await page.goto(role.dashboard, { waitUntil: "networkidle" });
      }
      await ensureWorkspaceSeeded(page, role);
      await page.goto(role.dashboard, { waitUntil: "networkidle" });
      await assertDashboardReady(page, role, dumpDiagnostics);

      mkdirSync(dirname((role as RoleSpec).storageState), { recursive: true });
      await page.context().storageState({ path: role.storageState });
      const verifyContext = await browser.newContext({
        baseURL: String(testInfo.project.use.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"),
        storageState: role.storageState,
      });
      try {
        const verifyPage = await verifyContext.newPage();
        await verifyPage.goto(role.dashboard, { waitUntil: "networkidle" });
        await assertDashboardReady(verifyPage, role);
      } catch (verifyErr) {
        rmSync(role.storageState, { force: true });
        throw verifyErr;
      } finally {
        await verifyContext.close();
      }
    } catch (err) {
      await dumpDiagnostics("failure");
      throw err;
    }
  });
}
