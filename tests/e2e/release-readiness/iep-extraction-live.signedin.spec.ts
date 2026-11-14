import { test, expect, type Request } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { writeFile } from "node:fs/promises";
import type { Database } from "../../../src/integrations/supabase/types";
import { iepExtractionLiveTarget, syntheticIepText } from "../helpers/iep-extraction-live-policy";
import { creatorTransportDiagnostics, creatorFailureKind } from "../helpers/pathway-creator-diagnostics";
import { ROLES } from "../helpers/roles";

test.describe.configure({ mode: "serial", retries: 0 });
test.use({ trace: "off", video: "off", screenshot: "off" });
test.skip(process.env.RUN_IEP_EXTRACTION_LIVE_QA !== "true", "Explicit no-save IEP extraction acceptance not enabled");
for (const role of ROLES.filter(r => r.key === "parent" || r.key === "educator")) {
  test(`${role.key} reviews synthetic IEP text and fills an unsaved builder`, async ({ browser }, info) => {
    test.setTimeout(480000);
    const target = iepExtractionLiveTarget(process.env);
    for (const origin of [target.controlOrigin, target.origin]) {
      const response = await fetch(origin + "/api/public/env-health", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      expect(response.ok).toBe(true); const health = await response.json();
      expect(health.app_env).toBe("staging"); expect(health.vite_app_env).toBe("staging");
      expect(health.supabase_project_ref).toBe("qgrertkqbwanerqqemph"); expect(health.is_production_project).toBe(false); expect(health.is_production_target).toBe(false);
      expect(health.runtime_source_fingerprint).toBe(process.env.EXPECTED_RUNTIME_SOURCE_FINGERPRINT); expect(health.runtime_source_file_count).toBe(target.fileCount);
      expect(health.runtime_source_fingerprint_schema).toBe("transitionforward-runtime-source-v1"); expect(health.runtime_source_fingerprint_algorithm).toBe("sha256");
      expect(health.stripe_public_mode).toBe("sandbox"); expect(health.stripe_server_mode).toBe("sandbox"); expect(health.isolation?.ok).toBe(true);
      if (origin === target.controlOrigin) expect(health.git_commit_sha).toBe(process.env.E2E_EXPECTED_BUILD_SHA); else expect(health.ai_gateway_configured).toBe(true);
    }
    const email = `e2e.${role.key}@staging.transitionforwardct.test`;
    if (process.env[role.emailEnv] !== email) throw Error("Only existing synthetic accounts allowed");
    const client = createClient<Database>(target.backend, target.publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const signed = await client.auth.signInWithPassword({ email, password: process.env[role.passwordEnv] ?? "" });
    if (signed.error || signed.data.user?.email !== email) throw Error("Existing account sign-in unconfirmed");
    const ownerId = signed.data.user.id;
    async function savedIds() {
      const [students, intakes, reports] = await Promise.all([
        client.from("students").select("id").eq("owner_id", ownerId).order("id"),
        client.from("student_intakes").select("id").eq("user_id", ownerId).order("id"),
        client.from("pathway_reports").select("id").eq("user_id", ownerId).order("id"),
      ]);
      if ([students, intakes, reports].some(r => r.error || !r.data)) throw Error("Saved-row readback unavailable");
      return { students: students.data!.map(r => r.id), intakes: intakes.data!.map(r => r.id), reports: reports.data!.map(r => r.id) };
    }
    const context = await browser.newContext({ baseURL: target.origin });
    let phase = "setup", observing = false, pending = false, primary: unknown;
    const transport = creatorTransportDiagnostics();
    try {
      const before = await savedIds();
      const page = await context.newPage(); const observed = new Set<Request>();
      page.on("request", request => { if (observing && request.method() === "POST" && new URL(request.url()).origin === target.origin && observed.size < 16) { observed.add(request); transport.started(); } });
      page.on("response", response => { if (observed.has(response.request())) transport.response(response.status()); });
      page.on("requestfinished", request => { if (observed.delete(request)) transport.finished(); });
      page.on("requestfailed", request => { if (observed.delete(request)) transport.failed(); });
      phase = "browser-signin";
      await page.goto("/login"); await page.getByTestId("login-email").fill(email); await page.getByTestId("login-password").fill(process.env[role.passwordEnv] ?? ""); await page.getByTestId("login-submit").click();
      await page.waitForURL(u => !u.pathname.startsWith("/login"), { timeout: 30000 });
      phase = "builder-open"; await page.goto("/pathway");
      const next = page.getByTestId("pathway-continue");
      await expect(next).toBeEnabled({ timeout: 30000 }); await next.click();
      await expect(page.getByRole("button", { name: "Or paste IEP text", exact: true })).toBeVisible({ timeout: 30000 });
      const selector = page.getByTestId("pathway-connected-student");
      if (await selector.isVisible()) {
        await selector.click(); await page.getByRole("option").first().click();
        await expect(page.locator('fieldset:disabled')).toHaveCount(0, { timeout: 30000 });
      }
      phase = "privacy-review";
      await page.getByRole("button", { name: "Or paste IEP text", exact: true }).click();
      await page.getByPlaceholder("Paste the relevant pages of the IEP here…").fill(syntheticIepText(role.key as "parent" | "educator"));
      await page.getByRole("button", { name: "Read this text", exact: true }).click();
      const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
      const analyze = dialog.getByRole("button", { name: "Analyze privacy-safe text", exact: true });
      await expect(analyze).toBeDisabled(); await dialog.getByRole("checkbox", { name: "Confirm privacy review", exact: true }).check();
      phase = "extraction-wait"; observing = true; pending = true;
      await analyze.click();
      let outcome = "waiting";
      await expect.poll(async () => {
        if (await page.locator('[data-sonner-toast][data-type="error"]').count()) return outcome = "failed";
        return outcome = await page.getByText("We filled in what we could find. Please review every field before generating.", { exact: true }).isVisible() ? "complete" : "waiting";
      }, { timeout: 240000, intervals: [250, 500, 1000] }).not.toBe("waiting");
      if (outcome !== "complete") throw Error("IEP extraction returned an error; no repeat permitted");
      pending = false; observing = false; phase = "source-review";
      const field = (name: string) => page.locator(`[name="${name}"]`);
      // Read only in-memory form fields; never submit the final report form.
      await next.click();
      const strengths = await field("strengths").inputValue(); expect(strengths).toMatch(/animal|sort/i);
      const interests = await field("interests").inputValue(); expect(interests).toMatch(/animal|art/i);
      await next.click(); await next.click();
      const accommodations = await field("accommodations").inputValue(); expect(accommodations).toMatch(/written|checklist|quiet/i);
      const technology = await field("assistive_technology").inputValue(); expect(technology).toMatch(/text.to.speech/i);
      await next.click(); await next.click();
      const readiness = await field("readiness_evidence").inputValue();
      expect(readiness).toMatch(/\b(?:2|two)\b/i); expect(readiness).toMatch(/prompt/i); expect(readiness).toMatch(/written|checklist/i); expect(readiness).toMatch(/family/i);
      const goals = await field("current_goals").inputValue();
      expect(goals).toMatch(/\b(?:4|four)\b/i); expect(goals).toMatch(/propos|draft|not adopted/i);
      await writeFile(info.outputPath("iep-source-review.json"), JSON.stringify({ role: role.key, strengths, interests, readiness, accommodations, technology, goals, manualMeaningReviewRequired: true }, null, 2));
      await page.locator('form').filter({ has: field("current_goals") }).screenshot({ path: info.outputPath(`${role.key}-iep-form.png`) });
      phase = "no-save-readback";
      const after = await savedIds();
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        await writeFile(info.outputPath("iep-reconciliation-required.json"), JSON.stringify({ reason: "unexpected-saved-rows", ownerId, newStudentIds: after.students.filter(id => !before.students.includes(id)), newIntakeIds: after.intakes.filter(id => !before.intakes.includes(id)), newReportIds: after.reports.filter(id => !before.reports.includes(id)), deletionAuthorized: false }, null, 2));
        throw Error("Unexpected saved-row change; exact reconciliation required, no deletion authorized");
      }
      phase = "complete";
      await writeFile(info.outputPath("iep-result.json"), JSON.stringify({ role: role.key, completed: true, extractionActions: 1, privacyReviewRequired: true, savedStudentIntakeReportIdsUnchanged: true, noFixtureCreationOrCleanup: true, manualMeaningReviewRequired: true }, null, 2));
    } catch (error) {
      primary = error;
      try { await writeFile(info.outputPath("iep-primary-failure.json"), JSON.stringify({ phase, failureKind: creatorFailureKind(error), uncertainCompletion: pending }, null, 2)); }
      catch { /* Keep the primary failure if artifact writing is unavailable. */ }
    } finally {
      try { await writeFile(info.outputPath("iep-transport-result.json"), JSON.stringify({ phase, uncertainCompletion: pending, ...transport.snapshot(primary) }, null, 2)); }
      catch { primary ??= Error("Safe diagnostic receipt unavailable"); }
      try { await context.close(); } catch { primary ??= Error("Browser close unconfirmed"); }
      await client.auth.signOut();
    }
    if (primary) throw primary;
  });
}
