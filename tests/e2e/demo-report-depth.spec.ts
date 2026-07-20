import { expect, test } from "@playwright/test";

/**
 * Workstream 2 depth proof — locks in the demo Pathway Report renderer
 * surfaces the depth data the engine already produces:
 *   - Next Steps (each with a review-by horizon badge)
 *   - Alternative Pathways
 *   - Conflicts (either a flagged conflict OR the explicit "no conflicts"
 *     acknowledgement — never absent)
 *
 * Proof-2 extension: the same depth contract MUST hold as the visitor
 * switches audience via the DemoRoleLens (student → family → educator).
 * Only the intro framing changes; the underlying evidence-derived depth
 * data is the same, so every audience frame must still expose every
 * depth section.
 */

const PROFILES = [
  { id: "jordan", minSteps: 4, minAlt: 1 },
  { id: "riley", minSteps: 4, minAlt: 1 },
  { id: "sam", minSteps: 4, minAlt: 1 },
] as const;

const AUDIENCES = ["student", "family", "educator"] as const;

async function assertDepth(
  page: import("@playwright/test").Page,
  minSteps: number,
  minAlt: number,
) {
  const steps = page.locator("[data-demo-next-step]");
  await expect(steps.first()).toBeVisible();
  const stepCount = await steps.count();
  expect(stepCount).toBeGreaterThanOrEqual(minSteps);
  for (let i = 0; i < stepCount; i++) {
    await expect(steps.nth(i)).toContainText(/Review in \d+ mo/);
  }

  const alt = page.locator("[data-demo-alt-pathway]");
  expect(await alt.count()).toBeGreaterThanOrEqual(minAlt);

  const conflictSurfaces = page.locator(
    '[data-demo-conflict], [data-demo-report-conflicts="none"]',
  );
  expect(await conflictSurfaces.count()).toBeGreaterThanOrEqual(1);
}

test.describe("demo Pathway Report — depth contract", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const p of PROFILES) {
    test(`${p.id} renders Next Steps, Alternatives, and Conflicts`, async ({ page }) => {
      await page.goto(`/demo/report?student=${p.id}`, { waitUntil: "domcontentloaded" });
      await assertDepth(page, p.minSteps, p.minAlt);
    });

    for (const audience of AUDIENCES) {
      test(`${p.id} — depth holds under ${audience} audience frame`, async ({ page }) => {
        // Seed the demo-role-view sessionStorage on the same origin BEFORE
        // navigating so useDemoRoleView hydrates directly into the target
        // audience — no click race, no flake.
        await page.goto(`/demo/report?student=${p.id}`, { waitUntil: "domcontentloaded" });
        await page.evaluate((role) => {
          window.sessionStorage.setItem("demo-role-view", role);
        }, audience);
        await page.reload({ waitUntil: "domcontentloaded" });

        const report = page.locator(`[data-demo-report-audience="${audience}"]`);
        await expect(report).toBeVisible();

        await assertDepth(page, p.minSteps, p.minAlt);
      });
    }
  }
});
