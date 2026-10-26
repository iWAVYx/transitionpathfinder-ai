import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import type { Database } from "../../../src/integrations/supabase/types";
import { readinessLiveTarget } from "../helpers/readiness-live-policy";
import { cleanupReadiness, readinessAbsenceSql, type ReadinessScope } from "../helpers/readiness-live-cleanup";
import { creatorStudentInput } from "../helpers/pathway-creator-fixture";
import { ROLES } from "../helpers/roles";
test.describe.configure({ mode: "serial", retries: 0 });
test.use({ trace: "off", video: "off", screenshot: "off" });
test.skip(process.env.RUN_READINESS_LIVE_QA !== "true", "Explicit bounded Readiness acceptance not enabled");
for (const role of ROLES.filter(r => r.key === "parent" || r.key === "educator")) {
  test(`${role.key} generates grounded insights for its fictional student`, async ({ browser }, info) => {
    test.setTimeout(420000);
    const target = readinessLiveTarget(process.env);
    for (const origin of [target.controlOrigin, target.origin]) {
      const response = await fetch(origin + "/api/public/env-health", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      expect(response.ok).toBe(true); const h = await response.json();
      expect(h.app_env).toBe("staging"); expect(h.vite_app_env).toBe("staging"); expect(h.supabase_project_ref).toBe("qgrertkqbwanerqqemph"); expect(h.is_production_target).toBe(false); expect(h.is_production_project).toBe(false);
      expect(h.runtime_source_fingerprint).toBe(process.env.EXPECTED_RUNTIME_SOURCE_FINGERPRINT); expect(h.runtime_source_file_count).toBe(target.fileCount); expect(h.runtime_source_fingerprint_schema).toBe("transitionforward-runtime-source-v1"); expect(h.runtime_source_fingerprint_algorithm).toBe("sha256");
      expect(h.stripe_mode).toBe("sandbox"); expect(h.isolation?.ok).toBe(true);
      if (origin === target.controlOrigin) expect(h.git_commit_sha).toBe(process.env.E2E_EXPECTED_BUILD_SHA); else expect(h.ai_gateway_configured).toBe(true);
    }
    const email = `e2e.${role.key}@staging.transitionforwardct.test`;
    if (process.env[role.emailEnv] !== email) throw Error("Only existing synthetic accounts allowed");
    const client = createClient<Database>(target.backend, target.publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const signed = await client.auth.signInWithPassword({ email, password: process.env[role.passwordEnv] ?? "" });
    if (signed.error || signed.data.user?.email !== email) throw Error("Synthetic sign-in failed");
    const f: ReadinessScope = { ownerId: signed.data.user.id, studentId: randomUUID(), scoreId: role.key === "educator" ? randomUUID() : "", marker: `QA Readiness ${target.runId} ${role.key}`, role: role.key as "parent" | "educator" };
    const receipt = async () => { await writeFile(info.outputPath("readiness-scope.json"), JSON.stringify(f, null, 2)); await writeFile(info.outputPath("readiness-cleanup.sql"), readinessAbsenceSql(f)); };
    await receipt();
    const context = await browser.newContext({ baseURL: target.origin });
    let pending = false, created = false, primary: unknown;
    try {
      pending = true;
      const saved = await client.from("students").insert(creatorStudentInput(f)).select("id").single();
      if (saved.error || saved.data?.id !== f.studentId) throw Error("Student creation unconfirmed");
      created = true; pending = false;
      if (f.scoreId) {
        pending = true;
        const score = await client.from("readiness_scores").insert({ id: f.scoreId, student_id: f.studentId, category: "employment", score: 75.5, evidence: f.marker, updated_by_user_id: f.ownerId, is_demo: true }).select("id").single();
        if (score.error || score.data?.id !== f.scoreId) throw Error("Readiness creation unconfirmed");
        pending = false;
      }
      const page = await context.newPage();
      await page.goto("/login"); await page.getByTestId("login-email").fill(email); await page.getByTestId("login-password").fill(process.env[role.passwordEnv] ?? ""); await page.getByTestId("login-submit").click(); await page.waitForURL(u => !u.pathname.startsWith("/login"), { timeout: 30000 });
      await page.goto(`/students/${f.studentId}?tab=plan`);
      const section = page.locator("details").filter({ has: page.locator("summary").getByText("Readiness", { exact: true }) });
      await expect(section).toBeVisible({ timeout: 30000 });
      pending = true;
      await section.locator("summary").click(); // Exactly one automatic generation; no refresh/reload.
      await expect(section.getByRole("button", { name: "Refresh", exact: true })).toBeVisible({ timeout: 240000 });
      pending = false;
      await expect(section.getByRole("alert")).toHaveCount(0);
      if (f.scoreId) { await expect(section).toContainText("Steady"); await expect(section).toContainText("75.5"); await expect(section).toContainText("1 recorded readiness score"); }
      else { expect(await section.getByText("Not Assessed", { exact: true }).count()).toBeGreaterThanOrEqual(2); await expect(section).not.toContainText("recorded readiness score"); }
      await expect(section).not.toContainText("needs_focus"); await expect(section).not.toContainText("not_assessed");
      await section.screenshot({ path: info.outputPath(`${role.key}-readiness.png`) });
      for (const other of ROLES.filter(r => r.key !== role.key)) {
        const reader = createClient<Database>(target.backend, target.publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
        try {
          const otherEmail = `e2e.${other.key === "school_admin" ? "schooladmin" : other.key === "district_admin" ? "districtadmin" : other.key}@staging.transitionforwardct.test`;
          if (process.env[other.emailEnv] !== otherEmail) throw Error("Only existing synthetic access-check accounts allowed");
          const auth = await reader.auth.signInWithPassword({ email: otherEmail, password: process.env[other.passwordEnv] ?? "" });
          if (auth.error || !auth.data.user) throw Error("Access-check sign-in failed");
          const rows = await reader.from("students").select("id").eq("id", f.studentId);
          if (rows.error || rows.data?.length !== 0) throw Error("Private student denial unconfirmed");
        } finally { await reader.auth.signOut(); }
      }
      await writeFile(info.outputPath("readiness-result.json"), JSON.stringify({ role: role.key, completed: true, generationActions: 1, otherRoleReadDenials: 6, manualSourceReviewRequired: true }, null, 2));
    } catch (error) { primary = error; }
    finally {
      try { await context.close(); } catch { primary ??= Error("Browser close unconfirmed"); }
      try {
        if (pending) { await writeFile(info.outputPath("readiness-reconciliation-required.json"), JSON.stringify({ ...f, uncertainCompletion: true }, null, 2)); throw Error("Uncertain completion: exact trusted reconciliation required before deletion"); }
        if (created) { await receipt(); const result = await cleanupReadiness(client, f); await writeFile(info.outputPath("readiness-cleanup-result.json"), JSON.stringify(result, null, 2)); }
      } catch (cleanupError) { primary = primary ? new AggregateError([primary, cleanupError], "Readiness failed; exact cleanup verification required") : cleanupError; }
      finally { await client.auth.signOut(); }
    }
    if (primary) throw primary;
  });
}
