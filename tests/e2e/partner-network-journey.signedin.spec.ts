/**
 * Workstream A — Partner Network end-to-end journey.
 *
 * Drives the full 8-step flow across three actors:
 *   1. Partner signs in and opens the partner workspace
 *   2. Partner org exists (created via workspace bootstrap if missing)
 *   3. Partner drafts an opportunity
 *   4. Partner submits for review (blocked by tier meter if at cap)
 *   5. Admin approves the pending opportunity
 *   6. Student pathway matcher surfaces it with an explainable-match panel
 *   7. Student saves the match
 *   8. Educator advances the lifecycle (saved → contacted → applied)
 *
 * CI-gated: requires the storageState matrix minted by
 * tests/e2e/auth-roles.setup.ts (partner.json, platform-admin.json,
 * educator.json, student.json) plus a seeded Nutmeg Public Schools student.
 * Auto-skips in the sandbox where LOVABLE_BROWSER_AUTH_STATUS=signed_out.
 */
import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const AUTH_DIR = join(process.cwd(), "playwright/.auth");
const STORAGE = {
  partner: join(AUTH_DIR, "partner.json"),
  admin: join(AUTH_DIR, "platform-admin.json"),
  educator: join(AUTH_DIR, "educator.json"),
  student: join(AUTH_DIR, "student.json"),
};
const SEED_STUDENT = join(process.cwd(), "playwright/.auth/shared-student-id.txt");

const missing = Object.entries(STORAGE)
  .filter(([, p]) => !existsSync(p))
  .map(([k]) => k);
const canRun =
  process.env.LOVABLE_BROWSER_AUTH_STATUS !== "signed_out" &&
  missing.length === 0 &&
  existsSync(SEED_STUDENT);

test.describe("partner network — full journey", () => {
  test.skip(!canRun, `Requires storage matrix (${missing.join(", ") || "ok"}) + seeded student.`);

  test("partner drafts, admin approves, student sees explainable match, educator advances lifecycle", async ({
    browser,
  }) => {
    const studentId = readFileSync(SEED_STUDENT, "utf8").trim();
    const oppTitle = `E2E Culinary Apprenticeship ${Date.now()}`;

    // Step 1-4: Partner drafts + submits.
    const partner = await browser.newContext({ storageState: STORAGE.partner });
    const partnerPage = await partner.newPage();
    await partnerPage.goto("/partners-manage/opportunities");
    await expect(partnerPage.getByTestId("partner-tier-meter")).toBeVisible();
    await partnerPage.goto("/partners-manage");
    await partnerPage.getByRole("button", { name: /create opportunity/i }).click();
    await partnerPage.getByLabel(/title/i).fill(oppTitle);
    await partnerPage.getByLabel(/description/i).fill("Hands-on culinary training for CT teens.");
    await partnerPage.getByRole("button", { name: /save.*draft/i }).click();
    await partnerPage.goto("/partners-manage/opportunities?status=draft");
    await expect(partnerPage.getByText(oppTitle)).toBeVisible();
    await partnerPage
      .getByRole("listitem")
      .filter({ hasText: oppTitle })
      .getByTestId("opportunity-submit")
      .click();
    await expect(partnerPage.getByText(/marked pending/i)).toBeVisible();
    await partner.close();

    // Step 5: Admin approves.
    const admin = await browser.newContext({ storageState: STORAGE.admin });
    const adminPage = await admin.newPage();
    await adminPage.goto("/owner/partner-submissions");
    await adminPage.getByRole("row", { name: new RegExp(oppTitle, "i") })
      .getByRole("button", { name: /approve/i })
      .click();
    await expect(adminPage.getByText(/approved/i).first()).toBeVisible();
    await admin.close();

    // Step 6-7: Student sees + saves.
    const student = await browser.newContext({ storageState: STORAGE.student });
    const studentPage = await student.newPage();
    await studentPage.goto(`/students/${studentId}?tab=partners`);
    const card = studentPage.getByRole("listitem").filter({ hasText: oppTitle });
    await expect(card).toBeVisible({ timeout: 15_000 });
    // Explainable-match: confidence chip + at least one reason bullet.
    await expect(card.getByText(/confidence/i)).toBeVisible();
    await expect(card.locator("li").first()).toBeVisible();
    await card.getByRole("button", { name: /save partner/i }).click();
    await expect(studentPage.getByText(/saved/i)).toBeVisible();
    await student.close();

    // Step 8: Educator advances lifecycle.
    const educator = await browser.newContext({ storageState: STORAGE.educator });
    const educatorPage = await educator.newPage();
    await educatorPage.goto(`/students/${studentId}?tab=opportunities`);
    const row = educatorPage.getByRole("row", { name: new RegExp(oppTitle, "i") });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /contacted/i }).click();
    await row.getByRole("button", { name: /applied/i }).click();
    await expect(row.getByText(/applied/i)).toBeVisible();
    await educator.close();
  });
});
