import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { captureSettledScrollPosition } from "./helpers/scroll-position";

// Explicitly anonymous even if a caller configures another project's session.
// No forms, generation, saved records or authenticated destinations are opened.
test.use({ storageState: { cookies: [], origins: [] }, trace: "off" });

async function position(page: Page) {
  return page.evaluate(() => ({
    y: window.scrollY,
    maximum: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
  }));
}

async function journey(page: Page, testInfo: TestInfo, sourcePath: string, accepts: (path: string) => boolean) {
  await page.goto(sourcePath, { waitUntil: "domcontentloaded" });
  const main = page.locator("main").first();
  await expect(main).toBeVisible();
  let candidates: string[] = [];
  await expect.poll(async () => {
    const hrefs = await main.locator("a[href]").evaluateAll(elements => elements.map(el => el.getAttribute("href") ?? ""));
    candidates = hrefs.filter(href => href.startsWith("/") && !href.startsWith("//") && accepts(new URL(href, page.url()).pathname));
    return candidates.length;
  }, { timeout: 20_000 }).toBeGreaterThan(0);

  // Let dashboard-owned default sample selection settle before recording it.
  if (/^\/demo\/(student|family|educator)$/.test(sourcePath)) {
    await expect.poll(() => new URL(page.url()).searchParams.get("student")).toBeTruthy();
  }
  const organizationParameter = ({ "/demo/school-admin": "school", "/demo/district-admin": "district", "/demo/partner": "plan" } as Record<string, string>)[sourcePath];
  if (organizationParameter) {
    await expect.poll(() => new URL(page.url()).searchParams.get(organizationParameter)).toBeTruthy();
  }
  let selected = "";
  let before = { y: 0, maximum: 0 };
  let source = "";
  for (const href of [...candidates].reverse()) {
    const links = main.locator(`a[href=${JSON.stringify(href)}]`);
    for (const link of (await links.all()).reverse()) {
      if (!(await link.isVisible())) continue;
      await link.scrollIntoViewIfNeeded();
      before = await captureSettledScrollPosition(page);
      source = page.url();
      selected = href;
      await testInfo.attach("anonymous-origin", { contentType: "application/json", body: JSON.stringify({ sourcePath, source: new URL(source).pathname + new URL(source).search + new URL(source).hash, selected, ...before, lowerPageOrigin: before.y > 100 }) });
      await link.click();
      break;
    }
    if (selected) break;
  }
  expect(selected, "An actual visible public/demo link must be clicked").not.toBe("");
  const expectedDestination = new URL(selected, source);
  // Known dashboard defaults are canonicalized by the real receiving tool.
  for (const [role, key, fallback] of [["school-admin", "school", "comprehensive"], ["district-admin", "district", "regional-network"], ["partner", "plan", "free"]]) {
    if (expectedDestination.pathname.startsWith(`/demo/feature/${role}/`) && !expectedDestination.searchParams.has(key)) {
      expectedDestination.searchParams.set(key, new URL(source).searchParams.get(key) ?? fallback);
    }
  }
  const destination = expectedDestination.href;
  await expect(page).toHaveURL(destination);
  await expect(page.locator("main").first()).toBeVisible();
  const expectArrival = async () => {
    await expect.poll(() => position(page).then(p => p.y), { timeout: 10_000 }).toBeLessThanOrEqual(2);
  };
  await expectArrival();
  const back = page.getByRole("link", { name: /^Back to /i });
  await expect(back).toHaveCount(1);
  const sourceUrl = new URL(source);
  await expect(back).toHaveAttribute("href", sourceUrl.pathname + sourceUrl.search + sourceUrl.hash);
  if (!sourceUrl.pathname.startsWith("/demo/")) {
    await expect(back).not.toHaveText(/dashboard|owner hub/i);
  }
  const readings: Array<{ step: string; y: number; maximum: number }> = [];
  const restored = async (step: string) => {
    await expect(page).toHaveURL(source);
    let samples = 0;
    const started = Date.now();
    const timeline: Array<{ elapsedMs: number; y: number; maximum: number }> = [];
    try {
    await expect.poll(async () => {
      const current = await position(page);
      timeline.push({ elapsedMs: Date.now() - started, ...current });
      samples = Math.abs(current.y - before.y) <= 2 ? samples + 1 : 0;
      return samples;
    }, { timeout: 10_000, intervals: [250] }).toBeGreaterThanOrEqual(3);
    } finally {
      readings.push({ step, ...await position(page) });
      await testInfo.attach(`anonymous-scroll-attempt-${step}`, {
        contentType: "application/json", body: JSON.stringify({ sourcePath, before, readings, timeline }, null, 2),
      });
    }
  };
  await back.click();
  await restored("contextual-return");
  await page.goForward({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(destination);
  await expectArrival();
  await expect(back).toHaveCount(1);
  await expect(back).toHaveAttribute("href", sourceUrl.pathname + sourceUrl.search + sourceUrl.hash);
  await page.goBack({ waitUntil: "domcontentloaded" });
  await restored("browser-back-after-forward");
  await testInfo.attach("anonymous-return-results", { contentType: "application/json", body: JSON.stringify({ sourcePath, before, readings, tolerancePixels: 2 }) });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test.describe(`signed-out source-aware navigation ${viewport.width}px`, () => {
    test.use({ viewport });
    test("Home returns to Home", async ({ page }, info) => {
      await journey(page, info, "/", path => path === "/platform");
    });
    test("Home guided flows open at the top and return to Home", async ({ page }, info) => {
      await journey(page, info, "/", path => path.startsWith("/pathways/"));
    });
    test("Platform returns to its original section", async ({ page }, info) => {
      await journey(page, info, "/platform#perspectives", path => path === "/demo/intake");
    });
    for (const role of ["student", "family", "educator", "school-admin", "district-admin", "partner", "owner"]) {
      test(`${role} demo retains its real source`, async ({ page }, info) => {
        await journey(page, info, `/demo/${role}`, path => path.startsWith(`/demo/feature/${role}/`)
          || (["student", "family", "educator"].includes(role) && ["/demo/calendar", "/demo/report"].includes(path)));
      });
    }
    test("direct public entry does not invent a dashboard return", async ({ page }) => {
      await page.goto("/platform", { waitUntil: "domcontentloaded" });
      await expect(page.locator("main").first()).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Return to previous page", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /^Back to .*Dashboard/i })).toHaveCount(0);
    });
  });
}
