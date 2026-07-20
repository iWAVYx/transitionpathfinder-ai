import { expect, test } from "@playwright/test";

/**
 * Workstream 2 depth proof — locks in the demo Pathway Report renderer
 * surfaces the depth data the engine already produces:
 *   - Next Steps (each with a review-by horizon badge)
 *   - Alternative Pathways
 *   - Conflicts (either a flagged conflict OR the explicit "no conflicts"
 *     acknowledgement — never absent)
 *
 * Runs signed-out against the public /demo/report route across all three
 * fictional profiles.
 */

const PROFILES = [
  { id: "jordan", minSteps: 4, minAlt: 1 },
  { id: "riley", minSteps: 4, minAlt: 1 },
  { id: "sam", minSteps: 4, minAlt: 1 },
] as const;

test.describe("demo Pathway Report — depth contract", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const p of PROFILES) {
    test(`${p.id} renders Next Steps, Alternatives, and Conflicts`, async ({ page }) => {
      await page.goto(`/demo/report?student=${p.id}`, { waitUntil: "domcontentloaded" });

      const steps = page.locator("[data-demo-next-step]");
      await expect(steps.first()).toBeVisible();
      const stepCount = await steps.count();
      expect(stepCount).toBeGreaterThanOrEqual(p.minSteps);

      // Every Next Step ships with a "Review in N mo" badge — the review-by horizon.
      for (let i = 0; i < stepCount; i++) {
        await expect(steps.nth(i)).toContainText(/Review in \d+ mo/);
      }

      const alt = page.locator("[data-demo-alt-pathway]");
      expect(await alt.count()).toBeGreaterThanOrEqual(p.minAlt);

      // Either a real conflict entry OR the explicit "no conflicts" marker — never nothing.
      const conflictSurfaces = page.locator(
        '[data-demo-conflict], [data-demo-report-conflicts="none"]',
      );
      expect(await conflictSurfaces.count()).toBeGreaterThanOrEqual(1);
    });
  }
});
