/**
 * Proof-3 — Route & Entry-Door live crawl.
 *
 * Walks every /get-started/$role door, enumerates every declared CTA,
 * and follows it to prove: no dead links, no 404 bodies, no unexpected
 * cross-role redirect. Signed-out spec — matches the public entry
 * surface described in src/lib/routing/role-doors.ts.
 */
import { expect, test } from "@playwright/test";
import { ROLE_DOOR_SLUGS, ROLE_DOORS } from "@/lib/routing/role-doors";

const DEAD_BODY = /404|page not found|not authori[sz]ed/i;

test.describe("role doors — live crawl", () => {
  test("/get-started lists every canonical door", async ({ page }) => {
    await page.goto("/get-started", { waitUntil: "domcontentloaded" });
    for (const slug of ROLE_DOOR_SLUGS) {
      await expect(
        page.locator(`a[href="/get-started/${slug}"]`).first(),
      ).toBeVisible();
    }
  });

  for (const slug of ROLE_DOOR_SLUGS) {
    test(`door "${slug}" renders and every CTA resolves`, async ({ page }) => {
      const door = ROLE_DOORS[slug];

      await page.goto(`/get-started/${slug}`, { waitUntil: "domcontentloaded" });
      expect(new URL(page.url()).pathname).toBe(`/get-started/${slug}`);
      await expect(page.getByRole("heading", { name: door.headline })).toBeVisible();

      // De-dupe declared targets so signin/login isn't visited N times.
      const targets = Array.from(
        new Set(
          door.actions.map((a) => {
            const qs = a.search
              ? "?" +
                new URLSearchParams(a.search as Record<string, string>).toString()
              : "";
            return a.to + qs;
          }),
        ),
      );

      for (const target of targets) {
        const resp = await page.goto(target, { waitUntil: "domcontentloaded" });
        expect(resp?.status(), `${slug} → ${target} status`).toBeLessThan(400);
        const body = (await page.locator("body").innerText()).slice(0, 400);
        expect(body, `${slug} → ${target} body`).not.toMatch(DEAD_BODY);
      }
    });
  }
});
