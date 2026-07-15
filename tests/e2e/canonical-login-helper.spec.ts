// Regression coverage for the canonical-login readiness helper.
//
// Each test synthesizes a /login response via page.route() so we can prove
// the helper's outcome contract without depending on the real deployed app:
//   - form appearing after a client-side delay resolves as `form`
//   - 200 with no form (and no error boundary) resolves as `timeout`
//   - a 404 on /login resolves as `not-found` — NOT a probe of alternates
//   - an already-authenticated redirect resolves as `already-authenticated`
//   - the recoverable-error boundary resolves as `error-boundary`
//
// The helper is exercised in isolation — no app auth state required — so
// this spec runs in every project without seeded credentials.

import { test, expect } from "@playwright/test";
import {
  waitForCanonicalLogin,
  type CanonicalLoginOutcome,
} from "./helpers/canonical-login";

const HOST = "http://localhost:9/"; // dummy origin; page.route intercepts

async function mount(page: import("@playwright/test").Page, html: string, status = 200) {
  await page.route("**/login", (route) =>
    route.fulfill({ status, contentType: "text/html", body: html }),
  );
  await page.route("**/dashboard", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>dashboard</body></html>" }),
  );
}

test.describe("waitForCanonicalLogin", () => {
  test.use({ baseURL: HOST });

  test("resolves as form when /login renders login-email after a short delay", async ({ page }) => {
    await mount(
      page,
      `<html><body>
        <div id="mount"></div>
        <script>
          setTimeout(() => {
            document.getElementById('mount').innerHTML =
              '<input data-testid="login-email" /><input data-testid="login-password" type="password" />';
          }, 400);
        </script>
      </body></html>`,
    );
    const outcome: CanonicalLoginOutcome = await waitForCanonicalLogin(page, { timeoutMs: 5_000 });
    expect(outcome.kind).toBe("form");
  });

  test("returns timeout when /login is 200 but never renders the form", async ({ page }) => {
    await mount(page, `<html><body><p>hello, no form here</p></body></html>`);
    const outcome = await waitForCanonicalLogin(page, { timeoutMs: 1_500 });
    expect(outcome.kind).toBe("timeout");
  });

  test("returns not-found when /login returns HTTP 404 and does not probe alternates", async ({ page }) => {
    let alternateHits = 0;
    await page.route("**/auth", (route) => {
      alternateHits += 1;
      return route.fulfill({ status: 200, contentType: "text/html", body: "<html></html>" });
    });
    await page.route("**/signin", (route) => {
      alternateHits += 1;
      return route.fulfill({ status: 200, contentType: "text/html", body: "<html></html>" });
    });
    await mount(page, `<html><body>not found</body></html>`, 404);
    const outcome = await waitForCanonicalLogin(page, { timeoutMs: 1_500 });
    expect(outcome.kind).toBe("not-found");
    expect(alternateHits).toBe(0);
  });

  test("resolves as already-authenticated when /login redirects away", async ({ page }) => {
    await page.route("**/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `<html><head><meta http-equiv="refresh" content="0;url=/dashboard" /></head><body></body></html>`,
      }),
    );
    await page.route("**/dashboard", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>dashboard</body></html>" }),
    );
    const outcome = await waitForCanonicalLogin(page, { timeoutMs: 5_000 });
    expect(outcome.kind).toBe("already-authenticated");
  });

  test("resolves as error-boundary when /login renders the recoverable error surface", async ({ page }) => {
    await mount(
      page,
      `<html><body><div data-testid="login-error-boundary">Something failed</div></body></html>`,
    );
    const outcome = await waitForCanonicalLogin(page, { timeoutMs: 2_000 });
    expect(outcome.kind).toBe("error-boundary");
  });
});
