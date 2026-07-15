// Canonical-login readiness helper. Extracted so regression tests can
// exercise it directly against synthetic fixtures.
//
// Contract:
//  - Navigates to /login (or the caller's variant) exactly once.
//  - Waits up to `timeoutMs` for one of these deterministic outcomes:
//      form: data-testid="login-email" visible
//      already-authenticated: navigated off /login
//      error-boundary: data-testid="login-error-boundary" visible
//      not-found: HTTP 404 from the /login response
//      timeout: none of the above resolved in time
//  - Never probes alternate paths (/auth, /signin, etc.). A missing /login
//    is reported as `not-found` so the caller can decide what to do.
//
// The helper accepts anything shaped like a Playwright Page — real specs
// pass a live Page, unit tests pass a stubbed one.

import type { Page } from "@playwright/test";

export type CanonicalLoginOutcome =
  | { kind: "form"; status: number | null; finalUrl: string }
  | { kind: "already-authenticated"; status: number | null; finalUrl: string }
  | { kind: "error-boundary"; status: number | null; finalUrl: string }
  | { kind: "not-found"; status: number; finalUrl: string }
  | { kind: "timeout"; status: number | null; finalUrl: string; inputs: unknown };

export interface CanonicalLoginOptions {
  path?: string;
  timeoutMs?: number;
}

function normalizePath(p: string) {
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

export async function waitForCanonicalLogin(
  page: Page,
  { path = "/login", timeoutMs = 15_000 }: CanonicalLoginOptions = {},
): Promise<CanonicalLoginOutcome> {
  let status: number | null = null;
  try {
    const resp = await page.goto(path, {
      waitUntil: "domcontentloaded",
      timeout: Math.max(timeoutMs, 20_000),
    });
    status = resp?.status() ?? null;
  } catch {
    // Fall through — the readiness race below still gets a chance.
  }
  if (status === 404) {
    return { kind: "not-found", status, finalUrl: page.url() };
  }

  const emailLoc = page.getByTestId("login-email").first();
  const errorLoc = page.getByTestId("login-error-boundary").first();
  return await Promise.race<Promise<CanonicalLoginOutcome>>([
    emailLoc
      .waitFor({ state: "visible", timeout: timeoutMs })
      .then((): CanonicalLoginOutcome => ({ kind: "form", status, finalUrl: page.url() })),
    page
      .waitForURL(
        (url) => {
          const p = normalizePath(url.pathname);
          return p !== "/login" && !p.startsWith("/login/");
        },
        { timeout: timeoutMs },
      )
      .then((): CanonicalLoginOutcome => ({
        kind: "already-authenticated",
        status,
        finalUrl: page.url(),
      })),
    errorLoc
      .waitFor({ state: "visible", timeout: timeoutMs })
      .then((): CanonicalLoginOutcome => ({
        kind: "error-boundary",
        status,
        finalUrl: page.url(),
      })),
  ]).catch(async () => {
    const inputs = await page
      .$$eval("input", (els) =>
        els.map((e) => ({
          id: (e as HTMLInputElement).id,
          name: (e as HTMLInputElement).name,
          type: (e as HTMLInputElement).type,
          testid: e.getAttribute("data-testid"),
        })),
      )
      .catch(() => []);
    return { kind: "timeout" as const, status, finalUrl: page.url(), inputs };
  });
}
