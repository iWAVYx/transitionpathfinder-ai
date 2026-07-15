// Per-role auth setup. Signs in one Playwright context per role that has
// credentials in the environment and persists its storageState to
// tests/e2e/.auth/<role>.json. Roles with missing creds are skipped so
// PRs without the full secret matrix still run whatever they have.

import { test as setup, expect, type Page } from "@playwright/test";
import { mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { authenticator } from "otplib";
import { ROLES, type RoleSpec } from "./helpers/roles";
import { DASHBOARD_TESTID_CONTRACT_VERSION } from "../../src/lib/dashboard-testids";

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

async function renderedDataTestIds(page: Page) {
  return page.locator("[data-testid]").evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-testid")).filter(Boolean),
  );
}

async function readBuildMarker(page: Page) {
  return page.evaluate(() => ({
    buildSha:
      document.querySelector('meta[name="app-build-sha"]')?.getAttribute("content") ??
      document.body.getAttribute("data-app-build-sha") ??
      null,
    buildTime: document.querySelector('meta[name="app-build-time"]')?.getAttribute("content") ?? null,
    dashboardTestIdContract:
      document.querySelector('meta[name="dashboard-testid-contract"]')?.getAttribute("content") ??
      document.body.getAttribute("data-dashboard-testid-contract") ??
      null,
  }));
}

async function assertDeploymentParity(page: Page, role: RoleSpec, dumpDiagnostics?: (label: string) => Promise<void>) {
  const marker = await readBuildMarker(page).catch(() => null);
  console.log(`[auth-setup ${role.key}] build-marker=`, marker);
  if (marker?.dashboardTestIdContract !== DASHBOARD_TESTID_CONTRACT_VERSION) {
    await dumpDiagnostics?.("deployed-build-missing-dashboard-testid-contract");
    throw new Error(
      `Deployed app is not serving the dashboard test-id contract. ` +
        `expected dashboard-testid-contract=${DASHBOARD_TESTID_CONTRACT_VERSION}, ` +
        `got ${marker?.dashboardTestIdContract ?? "null"}. ` +
        `Redeploy/publish the exact PLAYWRIGHT_BASE_URL host after the dashboard test ID changes.`,
    );
  }
  const expectedSha = process.env.GITHUB_SHA?.trim();
  if (expectedSha && marker.buildSha && marker.buildSha !== "dev" && marker.buildSha !== expectedSha) {
    await dumpDiagnostics?.("deployed-build-sha-mismatch");
    throw new Error(
      `Deployed app build SHA does not match the commit under test. ` +
        `expected ${expectedSha}, got ${marker.buildSha}. Redeploy/publish PLAYWRIGHT_BASE_URL.`,
    );
  }
}

async function assertDashboardReady(
  page: Page,
  role: RoleSpec,
  dumpDiagnostics?: (label: string) => Promise<void>,
) {
  // Wait for the URL to settle on the expected dashboard path (or a known
  // rejected path) without relying on `networkidle` — long-lived Supabase
  // subscriptions / polling keep the network busy forever.
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
  // <main> must be present in the shell immediately, even while data loads.
  await page.locator("main").first().waitFor({ state: "attached", timeout: 15_000 }).catch(async (err) => {
    await dumpDiagnostics?.("dashboard-main-missing");
    throw new Error(`<main> never attached on ${role.dashboard}: ${(err as Error).message}`);
  });
  // Role-specific dashboard test id confirms the right shell rendered, not
  // a redirect or error boundary. The element is on / inside <main> and
  // exists as soon as the shell mounts (before async data resolves).
  await page
    .locator(`main[data-testid="${role.dashboardTestId}"]`)
    .first()
    .waitFor({ state: "visible", timeout: 20_000 })
    .catch(async (err) => {
      const testIds = await renderedDataTestIds(page).catch(() => []);
      console.log(`[auth-setup ${role.key}] rendered data-testids=`, testIds);
      await dumpDiagnostics?.("dashboard-testid-missing");
      throw new Error(
        `data-testid="${role.dashboardTestId}" not visible on ${role.dashboard} within 20s: ${(err as Error).message}`,
      );
    });
  // Guard against an app-level error boundary swallowing the dashboard.
  const bodyText = await page.locator("body").innerText({ timeout: 2_000 }).catch(() => "");
  if (/something went wrong|application error|unexpected error/i.test(bodyText) &&
      !/dashboard/i.test(bodyText)) {
    await dumpDiagnostics?.("dashboard-error-boundary");
    throw new Error(`App-level error state detected on ${role.dashboard}.`);
  }
}


async function completeTwoFactorIfPresent(
  page: Page,
  role: RoleSpec,
  dumpDiagnostics?: (label: string) => Promise<void>,
) {
  if (!new URL(page.url()).pathname.startsWith("/login/2fa")) return;

  const otpInput = page.getByTestId("totp-code").first();
  const otpCount = await page.getByTestId("totp-code").count().catch(() => 0);
  console.log(
    `[auth-setup ${role.key}] /login/2fa detected; data-testid=totp-code count=${otpCount}`,
  );
  await otpInput.waitFor({ state: "visible", timeout: 10_000 }).catch(async (waitErr) => {
    if (!new URL(page.url()).pathname.startsWith("/login/2fa")) return;
    await dumpDiagnostics?.("2fa-route-missing-totp-input");
    throw new Error(
      `/login/2fa did not render data-testid="totp-code" for ${role.key}. ` +
        `Do not diagnose TOTP secrets until the real 2FA input is visible. ` +
        `Original: ${(waitErr as Error).message}`,
    );
  });
  if (!new URL(page.url()).pathname.startsWith("/login/2fa")) return;

  const envName = `E2E_${role.key.toUpperCase()}_TOTP_SECRET`;
  const secret = process.env[envName]?.replace(/\s+/g, "");
  if (!secret) {
    await dumpDiagnostics?.("2fa-secret-missing");
    throw new Error(`${role.key} requires 2FA but ${envName} is missing.`);
  }

  try {
    console.log(`[auth-setup ${role.key}] data-testid=totp-code visible=true`);
    if (role.key === "owner") {
      await expect(page.getByTestId("totp-code")).toBeVisible();
      await expect(page.getByTestId("totp-submit")).toBeVisible();
      await expect(page.getByTestId("login-email")).toHaveCount(0);
      await expect(page.getByTestId("login-password")).toHaveCount(0);
      await expect(page.locator("#signin-email")).toHaveCount(0);
      await expect(page.locator("#signin-password")).toHaveCount(0);
    }
    await otpInput.fill(authenticator.generate(secret));

    const verifyButton = page.getByTestId("totp-submit").first();

    await verifyButton.click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 20_000,
    });
    await page.waitForLoadState("networkidle").catch(() => {});
    console.log(`[auth-setup ${role.key}] final URL after 2FA submit=${page.url()}`);
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

    // Console / page errors / failed requests for richer dashboard-setup
    // diagnostics. Collected for the lifetime of the test and dumped via
    // dumpDiagnostics on any failure.
    const consoleEvents: Array<{ type: string; text: string; at: string }> = [];
    const pageErrors: Array<{ message: string; stack?: string; at: string }> = [];
    const failedRequests: Array<{ url: string; method: string; failure: string; at: string }> = [];
    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error" || type === "warning") {
        consoleEvents.push({ type, text: msg.text().slice(0, 500), at: new Date().toISOString() });
      }
    });
    page.on("pageerror", (err) => {
      pageErrors.push({ message: err.message, stack: err.stack?.slice(0, 2_000), at: new Date().toISOString() });
    });
    page.on("requestfailed", (req) => {
      failedRequests.push({
        url: req.url(),
        method: req.method(),
        failure: req.failure()?.errorText ?? "unknown",
        at: new Date().toISOString(),
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
        const dataTestIds = await renderedDataTestIds(page).catch(() => []);
        const buildMarker = await readBuildMarker(page).catch(() => null);
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
              buildMarker,
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
        await testInfo.attach(`${role.key}-${label}-runtime.json`, {
          body: JSON.stringify(
            { consoleEvents, pageErrors, failedRequests: failedRequests.slice(-50) },
            null,
            2,
          ),
          contentType: "application/json",
        });
        const chainSummary = chain
          .filter((c) => c.kind === "response" || c.kind === "framenavigated")
          .map((c) =>
            c.kind === "response"
              ? `  → ${c.status} ${c.host}${new URL(c.url).pathname}${c.location ? `  [Location: ${c.location}]` : ""}${c.cfRay ? `  [cf-ray=${c.cfRay}]` : ""}`
              : `  ⇢ nav ${c.host}${(() => { try { return new URL(c.url).pathname; } catch { return ""; }})()}`,
          )
          .join("\n");
        const errSummary = [
          `  console-errors=${consoleEvents.filter((c) => c.type === "error").length}`,
          `  page-errors=${pageErrors.length}${pageErrors[0] ? ` first="${pageErrors[0].message.slice(0, 200)}"` : ""}`,
          `  failed-requests=${failedRequests.length}${failedRequests[0] ? ` first="${failedRequests[0].method} ${failedRequests[0].url} (${failedRequests[0].failure})"` : ""}`,
        ].join("\n");
        console.log(
          `[auth-setup ${role.key}] ${label}\n  url=${url}\n  title=${title}\n  build-marker=${JSON.stringify(buildMarker)}\n  data-testids=${JSON.stringify(dataTestIds)}\n  inputs=${JSON.stringify(inputIds)}\n${errSummary}\n  redirect-chain:\n${chainSummary}\n  body[0..2000]=${bodyText}`,
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

      await assertDeploymentParity(page, role, dumpDiagnostics);

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


      // Canonical-login readiness. /login is the single source of truth for
      // sign-in — never probe /auth, /signin, /sign-in, or /account/login
      // just because /login rendered slowly. Do NOT inspect the DOM
      // immediately after page.goto(): wait deterministically for one of
      //   (a) data-testid="login-email" visible,
      //   (b) redirect off /login (already-authenticated flow),
      //   (c) explicit login error boundary visible,
      // up to a bounded 15s per attempt. Retry once with a fresh page if
      // /login returns 200 but the form never appeared.
      const desiredSignInPath = role.key === "owner"
        ? `/login?redirect=${encodeURIComponent(role.dashboard)}`
        : "/login";

      type ReadyOutcome =
        | { kind: "form"; status: number | null; finalUrl: string }
        | { kind: "already-authenticated"; status: number | null; finalUrl: string }
        | { kind: "error-boundary"; status: number | null; finalUrl: string }
        | { kind: "not-found"; status: number; finalUrl: string }
        | { kind: "timeout"; status: number | null; finalUrl: string; inputs: unknown };

      const waitForCanonicalLogin = async (target: Page): Promise<ReadyOutcome> => {
        let status: number | null = null;
        try {
          const resp = await target.goto(desiredSignInPath, {
            waitUntil: "domcontentloaded",
            timeout: 20_000,
          });
          status = resp?.status() ?? null;
        } catch (e) {
          console.log(`[auth-setup ${role.key}] canonical /login goto threw: ${(e as Error).message}`);
        }
        if (status === 404) {
          return { kind: "not-found", status, finalUrl: target.url() };
        }

        const emailLoc = target.getByTestId("login-email").first();
        const errorLoc = target.getByTestId("login-error-boundary").first();
        const outcome = await Promise.race<Promise<ReadyOutcome>>([
          emailLoc
            .waitFor({ state: "visible", timeout: 15_000 })
            .then((): ReadyOutcome => ({ kind: "form", status, finalUrl: target.url() })),
          target
            .waitForURL(
              (url) => {
                const p = normalizePath(url.pathname);
                return p !== "/login" && !p.startsWith("/login/");
              },
              { timeout: 15_000 },
            )
            .then((): ReadyOutcome => ({
              kind: "already-authenticated",
              status,
              finalUrl: target.url(),
            })),
          errorLoc
            .waitFor({ state: "visible", timeout: 15_000 })
            .then((): ReadyOutcome => ({
              kind: "error-boundary",
              status,
              finalUrl: target.url(),
            })),
        ]).catch(async () => {
          const inputs = await target
            .$$eval("input", (els) =>
              els.map((e) => ({
                id: (e as HTMLInputElement).id,
                name: (e as HTMLInputElement).name,
                type: (e as HTMLInputElement).type,
                testid: e.getAttribute("data-testid"),
              })),
            )
            .catch(() => []);
          return { kind: "timeout" as const, status, finalUrl: target.url(), inputs };
        });
        return outcome;
      };

      let outcome = await waitForCanonicalLogin(page);
      let attempts = 1;
      // One clean retry on the same page (reload the canonical route) if
      // /login returned 200 but the form never showed. Absorbs transient
      // hydration / bundle-load stalls without hiding a real regression:
      // strict failure still fires after the retry.
      while (outcome.kind === "timeout" && attempts < 2) {
        console.log(
          `[auth-setup ${role.key}] canonical /login timed out (status=${outcome.status} finalUrl=${outcome.finalUrl}); retrying`,
        );
        outcome = await waitForCanonicalLogin(page);
        attempts += 1;
      }

      if (outcome.kind === "not-found") {
        await dumpDiagnostics("login-route-not-found");
        throw new Error(
          `Canonical /login returned HTTP 404. The app does not expose a sign-in route at /login. ` +
            `Restore /login or declare the correct canonical login route.`,
        );
      }
      if (outcome.kind === "error-boundary") {
        await dumpDiagnostics("login-error-boundary");
        throw new Error(
          `/login rendered its recoverable-error boundary (data-testid="login-error-boundary") at ${outcome.finalUrl}. ` +
            `The sign-in form is unavailable — investigate the underlying error.`,
        );
      }
      if (outcome.kind === "timeout") {
        await dumpDiagnostics("no-login-form-on-canonical");
        throw new Error(
          `Canonical /login returned status=${outcome.status} at ${outcome.finalUrl} but did not render ` +
            `data-testid="login-email" within 15s after ${attempts} attempt(s). Observed inputs: ` +
            `${JSON.stringify(outcome.inputs)}.`,
        );
      }
      if (outcome.kind === "already-authenticated") {
        console.log(
          `[auth-setup ${role.key}] canonical /login redirected to ${outcome.finalUrl} (already authenticated)`,
        );
      } else {
        console.log(
          `[auth-setup ${role.key}] canonical /login form ready at ${outcome.finalUrl} (attempts=${attempts})`,
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
        (url) => normalizePath(url.pathname) !== "/login",
        { timeout: 30_000 },
      );
      if (role.key === "owner") {
        const totpCount = await page.getByTestId("totp-code").count().catch(() => 0);
        const ownerTotpSecret = process.env.E2E_OWNER_TOTP_SECRET?.trim();
        const ownerTotpConfigured = Boolean(ownerTotpSecret);
        console.log(
          `[auth-setup owner] OWNER_TOTP_CONFIGURED=${ownerTotpConfigured} ` +
            `URL after password login=${page.url()} totp-code-count=${totpCount}`,
        );
        const onTwoFa = page.url().includes("/login/2fa");
        if (ownerTotpConfigured) {
          expect(onTwoFa, "owner with E2E_OWNER_TOTP_SECRET should route to /login/2fa after password login").toBe(true);
          expect(new URL(page.url()).searchParams.get("redirect")).toBe("/admin");
          await expect(page.getByRole("heading", { name: /two-factor verification/i })).toBeVisible();
          await expect(page.getByTestId("totp-code")).toBeVisible();
          await expect(page.getByTestId("totp-submit")).toBeVisible();
          await expect(page.getByTestId("login-email")).toHaveCount(0);
          await expect(page.getByTestId("login-password")).toHaveCount(0);
          await expect(page.locator("#signin-email")).toHaveCount(0);
          await expect(page.locator("#signin-password")).toHaveCount(0);
        } else {
          await dumpDiagnostics("owner-totp-secret-missing");
          throw new Error("E2E_OWNER_TOTP_SECRET is required for strict owner 2FA setup.");
        }
      }

      await completeTwoFactorIfPresent(page, role, dumpDiagnostics);
      if (role.key === "owner") {
        console.log(`[auth-setup owner] final URL after login=${page.url()}`);
      }

      const hasSession = await page.evaluate(() =>
        Object.keys(window.localStorage).some((k) => k.includes("auth-token")),
      );
      expect(hasSession, `${role.key} session should persist`).toBe(true);

      await completeOnboardingIfPresent(page, role);
      if (role.key === "owner") {
        await page.goto("/admin", { waitUntil: "domcontentloaded" });
        await completeTwoFactorIfPresent(page, role, dumpDiagnostics);
        await assertDashboardReady(page, role, dumpDiagnostics);
        const adminMainVisible = await page.locator("main").isVisible().catch(() => false);
        console.log(
          `[auth-setup owner] final URL after page.goto("/admin")=${page.url()} admin-main-visible=${adminMainVisible}`,
        );
      }
      await page.goto(role.dashboard, { waitUntil: "domcontentloaded" });
      await completeOnboardingIfPresent(page, role);
      if (normalizePath(new URL(page.url()).pathname) !== normalizePath(role.dashboard)) {
        await page.goto(role.dashboard, { waitUntil: "domcontentloaded" });
      }
      await ensureWorkspaceSeeded(page, role);
      await page.goto(role.dashboard, { waitUntil: "domcontentloaded" });
      await assertDashboardReady(page, role, dumpDiagnostics);

      mkdirSync(dirname((role as RoleSpec).storageState), { recursive: true });
      await page.context().storageState({ path: role.storageState });
      const verifyContext = await browser.newContext({
        baseURL: String(testInfo.project.use.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"),
        storageState: role.storageState,
      });
      try {
        const verifyPage = await verifyContext.newPage();
        await verifyPage.goto(role.dashboard, { waitUntil: "domcontentloaded" });
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
