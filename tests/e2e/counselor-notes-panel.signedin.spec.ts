// Counselor UI slice — signed-in Playwright proof for Proof-7's deferred UI
// check. Drives the three-actor matrix through the shipped panel:
//   contributor educator writes a counselor_scope note and reads it back;
//   peer educator opens the same student and sees an empty list;
//   platform admin opens the same student and sees the note.
//
// Auto-skips without the storageStates minted by auth-roles.setup.ts so fork
// PRs without the secret matrix stay green. Runs in CI where those
// storageStates + a seeded shared student are available.

import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const STORAGE_DIR = path.resolve(process.cwd(), "playwright/.auth");
const educator = path.join(STORAGE_DIR, "educator.json");
const peerEducator = path.join(STORAGE_DIR, "educator-peer.json");
const admin = path.join(STORAGE_DIR, "platform-admin.json");
const sharedStudentIdFile = path.join(STORAGE_DIR, "shared-student-id.txt");

const haveMatrix =
  fs.existsSync(educator) &&
  fs.existsSync(peerEducator) &&
  fs.existsSync(admin) &&
  fs.existsSync(sharedStudentIdFile);

test.describe("counselor-scope notes UI — three-actor matrix", () => {
  test.skip(!haveMatrix, "Counselor storageState matrix + shared student not seeded");

  const studentId = haveMatrix
    ? fs.readFileSync(sharedStudentIdFile, "utf8").trim()
    : "";
  const marker = `counselor-ui-proof ${Date.now()}`;

  test("contributor educator writes and reads back", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: educator });
    const page = await ctx.newPage();
    await page.goto(`/students/${studentId}`);

    const panel = page.getByTestId("counselor-notes-panel");
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: /Private Counselor Notes/i }).click();

    await page.getByLabel("Note").fill(marker);
    await page.getByTestId("counselor-note-submit").click();

    const list = page.getByTestId("counselor-notes-list");
    await expect(list).toBeVisible();
    await expect(list.getByText(marker)).toBeVisible();
    await ctx.close();
  });

  test("peer educator sees empty list (RLS filters silently)", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: peerEducator });
    const page = await ctx.newPage();
    await page.goto(`/students/${studentId}`);

    await page
      .getByTestId("counselor-notes-panel")
      .getByRole("button", { name: /Private Counselor Notes/i })
      .click();

    await expect(page.getByTestId("counselor-notes-empty")).toBeVisible();
    await expect(page.getByText(marker)).toHaveCount(0);
    await ctx.close();
  });

  test("platform admin sees the contributor's note", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: admin });
    const page = await ctx.newPage();
    await page.goto(`/students/${studentId}`);

    await page
      .getByTestId("counselor-notes-panel")
      .getByRole("button", { name: /Private Counselor Notes/i })
      .click();

    const list = page.getByTestId("counselor-notes-list");
    await expect(list).toBeVisible();
    await expect(list.getByText(marker)).toBeVisible();
    await ctx.close();
  });
});
