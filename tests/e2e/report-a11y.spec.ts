import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility audit for the current public demo Pathway Report.
 *
 * The demo report is now a static, age-aware report surface rather than the
 * older ReportView outline/collapsible reader. These checks intentionally
 * validate the current contract: clean axe results, unique page landmarks,
 * accessible role tabs, and accessible demo-student switching.
 */

const REPORT_URL = "/demo/report";

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "desktop", width: 1440, height: 900 },
];

const A11Y_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "best-practice",
];

async function gotoReport(page: Page) {
  await page.goto(REPORT_URL, { waitUntil: "networkidle" });
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[data-demo-report-profile]")).toBeVisible();
}

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
) {
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => n.target).flat(),
  }));
}

for (const vp of VIEWPORTS) {
  test.describe(`report a11y @ ${vp.label} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("initial render has no axe violations", async ({ page }) => {
      await gotoReport(page);

      const results = await new AxeBuilder({ page })
        .withTags(A11Y_TAGS)
        .analyze();

      const formatted = formatViolations(results.violations);
      expect(formatted, JSON.stringify(formatted, null, 2)).toEqual([]);
    });

    test("scrolled mid-page state has no axe violations", async ({ page }) => {
      await gotoReport(page);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(200);

      const results = await new AxeBuilder({ page })
        .withTags(A11Y_TAGS)
        .analyze();

      const formatted = formatViolations(results.violations);
      expect(formatted, JSON.stringify(formatted, null, 2)).toEqual([]);
    });
  });
}

test.describe("report a11y — current interaction contract", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("role lens exposes accessible tab semantics", async ({ page }) => {
    await gotoReport(page);

    const tablist = page.getByRole("tablist", { name: /demo role view/i });
    await expect(tablist).toBeVisible();

    const tabs = tablist.getByRole("tab");
    expect(await tabs.count()).toBeGreaterThan(1);

    const selected = tabs.filter({ has: page.locator('[aria-selected="true"]') });
    expect(await selected.count()).toBeLessThanOrEqual(1);

    for (let i = 0; i < (await tabs.count()); i++) {
      const tab = tabs.nth(i);
      await expect(tab).toHaveAttribute("aria-selected", /true|false/);
      expect((await tab.innerText()).trim()).toBeTruthy();
    }
  });

  test("demo student switcher exposes listbox and option semantics", async ({ page }) => {
    await gotoReport(page);

    const switcher = page.getByRole("button", { name: /demo student:/i });
    await expect(switcher).toBeVisible();
    await expect(switcher).toHaveAttribute("aria-haspopup", "listbox");
    await expect(switcher).toHaveAttribute("aria-expanded", "false");

    await switcher.click();
    await expect(switcher).toHaveAttribute("aria-expanded", "true");

    const listbox = page.getByRole("listbox", { name: /select a demo student/i });
    await expect(listbox).toBeVisible();
    const options = listbox.getByRole("option");
    expect(await options.count()).toBeGreaterThan(1);

    for (let i = 0; i < (await options.count()); i++) {
      await expect(options.nth(i)).toHaveAttribute("aria-selected", /true|false/);
    }

    await page.keyboard.press("Escape");
    await expect(listbox).toHaveCount(0);
    await expect(switcher).toHaveAttribute("aria-expanded", "false");
  });

  test("report framing uses non-nested note semantics", async ({ page }) => {
    await gotoReport(page);

    await expect(
      page.getByRole("note", { name: /audience framing/i }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.locator("main aside")).toHaveCount(0);
  });
});

for (const vp of VIEWPORTS) {
  test.describe(`report landmarks @ ${vp.label}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("main report landmarks stay unique and labelled", async ({ page }) => {
      await gotoReport(page);

      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator("[data-demo-report-profile]")).toHaveAttribute(
        "aria-label",
        /pathway report/i,
      );
      await expect(
        page.getByRole("tablist", { name: /demo role view/i }),
      ).toBeVisible();
    });
  });
}
