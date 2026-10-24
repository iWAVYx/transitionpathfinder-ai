import { expect, test } from "@playwright/test";

// No account, role assignment, provider call or saved record is needed.
// A fresh document must escape the protected hydration tree before sign-in.
test.use({ storageState: { cookies: [], origins: [] }, trace: "off" });
const paths = [
  "/owner",
  "/owner/health",
  "/family/history",
  "/students",
  "/caseload",
  "/admin-school",
  "/district/overview",
  "/partners-manage",
];

for (const path of paths) {
  test(`signed-out ${path} reaches a responsive sign-in page`, async ({ page, baseURL }) => {
    const hostname = new URL(baseURL!).hostname;
    expect([
      "localhost",
      "127.0.0.1",
      "transitionforward-staging.caysi101.workers.dev",
      "gentle-forward-reach.lovable.app",
    ]).toContain(hostname);
    let crashed = false;
    page.on("crash", () => {
      crashed = true;
    });
    const requested = `${path}?context=fictional#section`;
    await page.goto(requested, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL((url) => url.pathname === "/login");
    expect(new URL(page.url()).searchParams.get("redirect")).toBe(requested);
    await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeEnabled();
    await expect(page.getByRole("heading", { name: "Good to see you again!" })).toBeVisible();
    expect(crashed).toBe(false);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeEnabled();
    expect(crashed).toBe(false);
  });
}
