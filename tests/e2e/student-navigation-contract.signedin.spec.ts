/**
 * Proof-5 — Student navigation contract live loop.
 *
 * Signed-in end-to-end verification of the "Dashboard → Next Best Step →
 * Task → Dashboard" contract implemented in Workstream 5.
 *
 * The loop:
 *   1. Signed-in student lands on /hubs/student (Planning Hub).
 *   2. With no saved drafts, the Resume card is absent; the Next Actions
 *      card renders the fallback CTA — the loop never dead-ends.
 *   3. Seed a `student_workflow_drafts` row via Supabase REST as the same
 *      user (auth session pulled from Playwright storageState).
 *   4. Reload — the "Resume Where You Left Off" region appears with a
 *      Continue link matching the task's canonical return path.
 *   5. Click Continue → student lands on that route (no /login bounce, no
 *      not-found boundary).
 *   6. Cleanup: delete the seeded draft row.
 *
 * Auto-skips when the student storageState from auth-roles.setup.ts is
 * missing (fork PRs without the secret matrix stay green).
 */

import { test, expect, request, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { ROLES } from "./helpers/roles";

const student = ROLES.find((r) => r.key === "student")!;

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://lrqcntqyekucamifpffs.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  "";

const TASK_KEY = "student.voice";
const EXPECTED_RETURN = "/student-voice";

type StoredSession = { access_token: string; user: { id: string } };

function readSessionFromStorage(storagePath: string): StoredSession | null {
  const raw = readFileSync(storagePath, "utf8");
  const state = JSON.parse(raw) as {
    origins?: Array<{ localStorage: Array<{ name: string; value: string }> }>;
  };
  for (const origin of state.origins ?? []) {
    for (const item of origin.localStorage ?? []) {
      if (!item.name.startsWith("sb-") || !item.name.endsWith("-auth-token")) continue;
      try {
        const parsed = JSON.parse(item.value);
        const access = parsed?.access_token ?? parsed?.currentSession?.access_token;
        const user = parsed?.user ?? parsed?.currentSession?.user;
        if (access && user?.id) return { access_token: access, user: { id: user.id } };
      } catch {
        // fall through
      }
    }
  }
  return null;
}

async function seedDraft(api: APIRequestContext, session: StoredSession) {
  const res = await api.post(`${SUPABASE_URL}/rest/v1/student_workflow_drafts`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    data: {
      user_id: session.user.id,
      task_key: TASK_KEY,
      payload: { proof: "student-navigation-contract" },
      return_to: EXPECTED_RETURN,
    },
  });
  expect(res.ok(), `seed draft failed: ${res.status()} ${await res.text()}`).toBeTruthy();
}

async function deleteDraft(api: APIRequestContext, session: StoredSession) {
  await api.delete(
    `${SUPABASE_URL}/rest/v1/student_workflow_drafts?user_id=eq.${session.user.id}&task_key=eq.${TASK_KEY}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  );
}

test.describe("Proof-5 — Student navigation contract", () => {
  test.skip(
    () => !existsSync(student.storageState),
    `no storageState for student — set ${student.emailEnv}/${student.passwordEnv} and re-run auth-roles.setup.ts`,
  );
  test.skip(!SUPABASE_ANON_KEY, "missing Supabase publishable/anon key for REST seed");

  test.use({ storageState: student.storageState });

  let api: APIRequestContext;
  let session: StoredSession;
  let ctx: BrowserContext | null = null;

  test.beforeAll(async () => {
    const parsed = readSessionFromStorage(student.storageState);
    expect(parsed, "student storageState missing supabase auth token").toBeTruthy();
    session = parsed!;
    api = await request.newContext();
  });

  test.afterAll(async () => {
    if (session) await deleteDraft(api, session);
    await api?.dispose();
    await ctx?.close();
  });

  test("fallback CTA renders when no draft exists", async ({ page }) => {
    await deleteDraft(api, session); // ensure clean slate
    await page.goto("/hubs/student");
    await expect(page.locator("main")).toBeVisible();
    // Resume card must NOT be present.
    await expect(page.getByRole("region", { name: /resume where you left off/i })).toHaveCount(0);
    // But some Next-Best-Step affordance must exist so the loop never dead-ends.
    const bodyText = (await page.locator("main").innerText()).toLowerCase();
    expect(
      bodyText.includes("student voice") ||
        bodyText.includes("next best step") ||
        bodyText.includes("next actions"),
      "Planning Hub must expose a next-step affordance even with no drafts",
    ).toBeTruthy();
  });

  test("resume card appears after a draft is saved and Continue routes to the task", async ({ page }) => {
    await seedDraft(api, session);

    await page.goto("/hubs/student");
    const region = page.getByRole("region", { name: /resume where you left off/i });
    await expect(region).toBeVisible({ timeout: 10_000 });

    const continueLink = region.getByRole("link", { name: /continue/i });
    await expect(continueLink).toBeVisible();
    await expect(continueLink).toHaveAttribute("href", EXPECTED_RETURN);

    await continueLink.click();
    await page.waitForURL((url) => url.pathname === EXPECTED_RETURN, { timeout: 15_000 });

    // The landing page must render real content, not a not-found / login bounce.
    const landedPath = new URL(page.url()).pathname;
    expect(landedPath).toBe(EXPECTED_RETURN);
    const mainText = (await page.locator("main").innerText().catch(() => "")).toLowerCase();
    expect(mainText.length).toBeGreaterThan(0);
    expect(mainText).not.toContain("page not found");
    expect(mainText).not.toContain("route not found");
    expect(mainText).not.toContain("not authorized");
  });
});
