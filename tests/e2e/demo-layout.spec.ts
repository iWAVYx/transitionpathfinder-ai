import { test, expect } from "@playwright/test";

/**
 * Demo page layout guardrails:
 *  - All 11 journey timeline steps render on a single row at desktop.
 *  - The page never produces horizontal page overflow at any tested viewport.
 *  - Timeline step widths are uniform on desktop.
 */

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "tablet", width: 820, height: 1180 },
  { label: "desktop", width: 1440, height: 900 },
];

for (const vp of VIEWPORTS) {
  test.describe(`/demo @ ${vp.label}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("has no horizontal page overflow", async ({ page }) => {
      await page.goto("/demo", { waitUntil: "networkidle" });
      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(m.sw).toBeLessThanOrEqual(m.cw + 2);
    });
  });
}

test.describe("/demo journey timeline @ desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("renders all 11 steps on a single row with uniform widths", async ({ page }) => {
    await page.goto("/demo", { waitUntil: "networkidle" });
    const steps = await page.evaluate(() => {
      const j = document.querySelector(".tf-journey");
      if (!j) return null;
      const items = [...j.querySelectorAll(".tf-journey-step")];
      return items.map((el) => {
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), width: Math.round(r.width) };
      });
    });
    expect(steps).not.toBeNull();
    expect(steps!.length).toBe(11);
    const uniqueTops = new Set(steps!.map((s) => s.top));
    expect(uniqueTops.size).toBe(1);
    const widths = steps!.map((s) => s.width);
    const min = Math.min(...widths);
    const max = Math.max(...widths);
    expect(max - min).toBeLessThanOrEqual(2);
  });
});
