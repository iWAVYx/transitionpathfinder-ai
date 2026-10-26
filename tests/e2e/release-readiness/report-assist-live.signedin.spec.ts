import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import type { Database, Json } from "../../../src/integrations/supabase/types";
import { DEMO_REPORT } from "../../../src/lib/demo-data";
import { ReportSchema } from "../../../src/lib/pathway-generation-contract";
import { reportAssistLiveTarget } from "../helpers/report-assist-live-policy";
import { cleanupReportAssist, reportAssistAbsenceSql, type CreatorScope } from "../helpers/pathway-creator-cleanup";
import { creatorStudentInput } from "../helpers/pathway-creator-fixture";
import { ROLES } from "../helpers/roles";

test.describe.configure({ mode: "serial", retries: 0 });
test.use({ trace: "off", video: "off", screenshot: "off" });
test.skip(process.env.RUN_REPORT_ASSIST_LIVE_QA !== "true", "Explicit bounded report-assist acceptance not enabled");
for (const role of ROLES.filter(r => r.key === "parent" || r.key === "educator")) {
  test(`${role.key} translates and suggests next steps without rewriting its fictional report`, async ({ browser }, info) => {
    test.setTimeout(600000);
    const target = reportAssistLiveTarget(process.env);
    for (const origin of [target.controlOrigin, target.origin]) {
      const response = await fetch(origin + "/api/public/env-health", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      expect(response.ok).toBe(true); const h = await response.json();
      expect(h.app_env).toBe("staging"); expect(h.vite_app_env).toBe("staging"); expect(h.supabase_project_ref).toBe("qgrertkqbwanerqqemph"); expect(h.is_production_target).toBe(false); expect(h.is_production_project).toBe(false);
      expect(h.runtime_source_fingerprint).toBe(process.env.EXPECTED_RUNTIME_SOURCE_FINGERPRINT); expect(h.runtime_source_file_count).toBe(target.fileCount); expect(h.runtime_source_fingerprint_schema).toBe("transitionforward-runtime-source-v1"); expect(h.runtime_source_fingerprint_algorithm).toBe("sha256");
      expect(h.stripe_public_mode).toBe("sandbox"); expect(h.stripe_server_mode).toBe("sandbox"); expect(h.isolation?.ok).toBe(true);
      if (origin === target.controlOrigin) expect(h.git_commit_sha).toBe(process.env.E2E_EXPECTED_BUILD_SHA); else expect(h.ai_gateway_configured).toBe(true);
    }
    const email = `e2e.${role.key}@staging.transitionforwardct.test`;
    if (process.env[role.emailEnv] !== email) throw Error("Only existing synthetic accounts allowed");
    const client = createClient<Database>(target.backend, target.publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const auth = await client.auth.signInWithPassword({ email, password: process.env[role.passwordEnv] ?? "" });
    if (auth.error || auth.data.user?.email !== email) throw Error("Synthetic sign-in failed");
    const f: CreatorScope = { ownerId: auth.data.user.id, studentId: randomUUID(), intakeId: randomUUID(), reportId: randomUUID(), marker: `QA Report Assist ${target.runId} ${role.key}`, role: role.key as "parent" | "educator" };
    const summary = "Fictional report for translation and planning only. " + "The student reports interest in animal care and prefers written checklists and quiet workspaces. ".repeat(24) + "Family-reported baseline: 2 independent animal-care steps with written directions. Proposed target: 4 steps; no dated progress log or reviewed IEP was supplied. Ask the team how to measure independence; this target is not evidence of progress.";
    const source = ReportSchema.parse({ ...structuredClone(DEMO_REPORT), summary });
    const receipt = async () => { await writeFile(info.outputPath("assist-scope.json"), JSON.stringify(f, null, 2)); await writeFile(info.outputPath("assist-cleanup.sql"), reportAssistAbsenceSql(f)); };
    await receipt();
    const context = await browser.newContext({ baseURL: target.origin });
    let pending = false, created = false, primary: unknown;
    try {
      pending = true;
      const student = await client.from("students").insert({ ...creatorStudentInput(f), interests_summary: "Animal care and visual art.", strengths_summary: "Reported patience with animals.", support_needs_summary: "Written checklists and quiet workspaces." }).select("id").single();
      if (student.error || student.data?.id !== f.studentId) throw Error("Student creation unconfirmed");
      created = true; pending = false;
      pending = true;
      const intake = await client.from("student_intakes").insert({ id: f.intakeId, user_id: f.ownerId, student_id: f.studentId, student_first_name: f.marker, submitter_role: role.key === "parent" ? "family" : "educator", grade_band: "11-12", current_goals: "Family-reported baseline 2 independent animal-care steps with written directions; proposed target 4; no progress log supplied." }).select("id").single();
      if (intake.error || intake.data?.id !== f.intakeId) throw Error("Intake creation unconfirmed");
      pending = false; pending = true;
      const report = await client.from("pathway_reports").insert({ id: f.reportId, user_id: f.ownerId, student_id: f.studentId, intake_id: f.intakeId, is_demo: true, model: "synthetic-report-assist-fixture", content: source as unknown as Json }).select("id").single();
      if (report.error || report.data?.id !== f.reportId) throw Error("Report creation unconfirmed");
      pending = false;
      const before = await client.from("pathway_reports").select("*").eq("id", f.reportId).single();
      if (before.error || !before.data) throw Error("Source report snapshot unavailable");
      const initialHistory = await client.from("pathway_report_versions").select("id", { count: "exact", head: true }).eq("report_id", f.reportId);
      if (initialHistory.error || initialHistory.count !== 0) throw Error("Unexpected initial history");
      const page = await context.newPage();
      await page.goto("/login"); await page.getByTestId("login-email").fill(email); await page.getByTestId("login-password").fill(process.env[role.passwordEnv] ?? ""); await page.getByTestId("login-submit").click(); await page.waitForURL(u => !u.pathname.startsWith("/login"), { timeout: 30000 });
      await page.goto(`/reports/${f.reportId}?audience=family`);
      const heading = page.getByRole("heading", { name: "Pathway Assist", exact: true });
      await expect(heading).toBeVisible({ timeout: 30000 });
      const panel = heading.locator("..").locator("..");
      // Exactly one suggestion action followed by one translation; no refresh or generation fallback.
      pending = true;
      await panel.getByRole("button", { name: "Suggest next steps", exact: true }).click();
      await expect(panel.getByRole("button", { name: "Refresh suggestions", exact: true })).toBeVisible({ timeout: 240000 });
      pending = false;
      for (const title of ["This week", "This month", "Conversation starters", "Gently watch for"]) await expect(panel.getByText(title, { exact: true })).toBeVisible();
      const items = await panel.locator("li").allTextContents();
      expect(items.length).toBeGreaterThanOrEqual(7);
      expect(items.every(t => t.trim().length > 0)).toBe(true);
      await writeFile(info.outputPath("assist-next-steps.json"), JSON.stringify({ role: role.key, items, manualSourceReviewRequired: true }, null, 2));
      await panel.locator("select").selectOption("spanish");
      pending = true;
      await panel.getByRole("button", { name: "Translate", exact: true }).click();
      await expect(panel.getByRole("button", { name: "Back to English", exact: true })).toBeVisible({ timeout: 240000 });
      pending = false;
      await expect(panel).toContainText("Currently showing: Spanish");
      const translated = await page.locator("main").innerText();
      expect(translated).not.toContain(summary);
      expect(translated).toMatch(/\b2\b/); expect(translated).toMatch(/\b4\b/);
      await writeFile(info.outputPath("assist-translated-visible.txt"), translated);
      await panel.screenshot({ path: info.outputPath(`${role.key}-assist.png`) });
      await panel.getByRole("button", { name: "Back to English", exact: true }).click();
      await expect(page.locator("main")).toContainText(summary);
      const after = await client.from("pathway_reports").select("*").eq("id", f.reportId).single();
      if (after.error) throw Error("Source report readback unavailable");
      expect(after.data).toEqual(before.data);
      const history = await client.from("pathway_report_versions").select("id", { count: "exact", head: true }).eq("report_id", f.reportId);
      if (history.error || history.count !== 0) throw Error("Assistance unexpectedly created history");
      for (const other of ROLES.filter(r => r.key !== role.key)) {
        const reader = createClient<Database>(target.backend, target.publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
        try {
          const otherEmail = `e2e.${other.key === "school_admin" ? "schooladmin" : other.key === "district_admin" ? "districtadmin" : other.key}@staging.transitionforwardct.test`;
          if (process.env[other.emailEnv] !== otherEmail) throw Error("Only existing synthetic readers allowed");
          const signed = await reader.auth.signInWithPassword({ email: otherEmail, password: process.env[other.passwordEnv] ?? "" });
          if (signed.error || signed.data.user?.email !== otherEmail) throw Error("Reader sign-in unconfirmed");
          const rows = await reader.from("pathway_reports").select("id").eq("id", f.reportId);
          if (rows.error || rows.data?.length !== 0) throw Error("Private report denial unconfirmed");
        } finally { await reader.auth.signOut(); }
      }
      await writeFile(info.outputPath("assist-result.json"), JSON.stringify({ role: role.key, completed: true, translationActions: 1, suggestionActions: 1, sourceUnchanged: true, historyVersions: 0, otherRoleReadDenials: 6, manualMeaningReviewRequired: true }, null, 2));
    } catch (error) { primary = error; }
    finally {
      try { await context.close(); } catch { primary ??= Error("Browser close unconfirmed"); }
      try {
        if (pending) { await writeFile(info.outputPath("assist-reconciliation-required.json"), JSON.stringify({ ...f, uncertainCompletion: true }, null, 2)); throw Error("Uncertain completion: exact trusted reconciliation required before deletion"); }
        if (created) { const result = await cleanupReportAssist(client, f, async resolved => { await writeFile(info.outputPath("assist-resolved-scope.json"), JSON.stringify(resolved, null, 2)); }); await writeFile(info.outputPath("assist-cleanup-result.json"), JSON.stringify(result, null, 2)); }
      } catch (cleanupError) { primary = primary ? new AggregateError([primary, cleanupError], "Report assistance failed; exact cleanup verification required") : cleanupError; }
      finally { await client.auth.signOut(); }
    }
    if (primary) throw primary;
  });
}
