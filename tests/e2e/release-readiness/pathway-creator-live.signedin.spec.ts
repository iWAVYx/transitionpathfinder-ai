import { parsePathwayCreationFailureMetadata, type PathwayCreationFailure } from "../../../src/lib/pathway-creation-failure";
import { creatorTransportDiagnostics, creatorCompletionSurface } from "../helpers/pathway-creator-diagnostics";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import type { Database } from "../../../src/integrations/supabase/types";
import { ReportSchema } from "../../../src/lib/pathway-generation-contract";
import { PathwayReportV2 } from "../../../src/lib/pathway-v2";
import { pathwayCreatorTarget } from "../helpers/pathway-creator-policy";
import { creatorStudentInput } from "../helpers/pathway-creator-fixture";
import {
  cleanupCreator,
  creatorAbsenceSql,
  type CreatorScope,
} from "../helpers/pathway-creator-cleanup";
import { ROLES, type RoleSpec } from "../helpers/roles";
const roles = [ROLES.find((r) => r.key === "parent")!, ROLES.find((r) => r.key === "educator")!];
test.describe.configure({ mode: "serial", retries: 0 });
test.use({ trace: "off", video: "off", screenshot: "off" });
test.skip(
  process.env.RUN_PATHWAY_CREATOR_QA !== "true",
  "Explicit bounded Pathway creator acceptance not enabled",
);
async function login(page: Page, role: RoleSpec) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(process.env[role.emailEnv] ?? "");
  await page.getByTestId("login-password").fill(process.env[role.passwordEnv] ?? "");
  await page.getByTestId("login-submit").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
}
async function next(page: Page, step: string) {
  await page.getByTestId("pathway-continue").click();
  await expect(page.getByTestId("pathway-intake-form")).toHaveAttribute("data-pathway-step", step, {
    timeout: 20000,
  });
}
async function fill(page: Page, values: Record<string, string>) {
  for (const [name, value] of Object.entries(values))
    await page.locator(`[name="${name}"]`).fill(value);
}
for (const role of roles)
  test(`${role.key} creates and regenerates its own linked fictional Pathway report`, async ({
    browser,
  }, info) => {
    test.setTimeout(600000);
    const target = pathwayCreatorTarget(process.env);
    for (const origin of [target.controlOrigin, target.origin]) {
      const response = await fetch(origin + "/api/public/env-health", {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      expect(response.ok).toBe(true);
      const h = await response.json();
      expect(h.app_env).toBe("staging");
      expect(h.vite_app_env).toBe("staging");
      expect(h.supabase_project_ref).toBe("qgrertkqbwanerqqemph");
      expect(h.runtime_source_fingerprint).toBe(process.env.EXPECTED_RUNTIME_SOURCE_FINGERPRINT);
      expect(h.runtime_source_file_count).toBe(target.fileCount);
      expect(h.runtime_source_fingerprint_schema).toBe("transitionforward-runtime-source-v1");
      expect(h.runtime_source_fingerprint_algorithm).toBe("sha256");
      expect(h.is_production_target).toBe(false);
      expect(h.stripe_mode).toBe("sandbox");
      expect(h.isolation?.ok).toBe(true);
      if (origin === target.controlOrigin)
        expect(h.git_commit_sha).toBe(process.env.E2E_EXPECTED_BUILD_SHA);
      else expect(h.ai_gateway_configured).toBe(true);
    }
    const expectedEmail = `e2e.${role.key}@staging.transitionforwardct.test`;
    if (process.env[role.emailEnv] !== expectedEmail)
      throw Error("Only existing synthetic identities allowed");
    const client = createClient<Database>(target.backend, target.publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signed = await client.auth.signInWithPassword({
      email: expectedEmail,
      password: process.env[role.passwordEnv] ?? "",
    });
    if (signed.error || signed.data.user?.email !== expectedEmail)
      throw Error("Synthetic caller sign-in failed");
    const f: CreatorScope = {
      ownerId: signed.data.user.id,
      studentId: randomUUID(),
      intakeId: "",
      reportId: "",
      marker: `QA Pathway Creator ${target.runId} ${role.key}`,
      role: role.key as "parent" | "educator",
    };
    const receipt = async () => {
      await writeFile(info.outputPath("pathway-creator-scope.json"), JSON.stringify(f, null, 2));
      await writeFile(info.outputPath("pathway-creator-cleanup.sql"), creatorAbsenceSql(f));
    };
    await receipt();
    const context = await browser.newContext({ baseURL: target.origin });
    let operationPending = false;
    let phase = "login";
    let databaseErrorCode: string | null = null;
    let primaryFailure: unknown;
    let observedPage: Page | undefined;
    const transportDiagnostics = creatorTransportDiagnostics();
    try {
      const page = await context.newPage();
      observedPage = page;
      // Observe at most 16 same-origin POSTs during the existing generation actions.
      // No response/request body, URL, headers, console text or credentials are retained.
      const pendingPosts = new Set<import("@playwright/test").Request>();
      let observedPosts = 0;
      page.on("request", (request) => {
        if ((phase === "initial-generation" || phase === "regeneration") && observedPosts < 16 &&
            request.method() === "POST" && new URL(request.url()).origin === target.origin) {
          observedPosts++;
          pendingPosts.add(request);
          transportDiagnostics.started();
        }
      });
      page.on("response", (response) => {
        if (pendingPosts.has(response.request())) transportDiagnostics.response(response.status());
      });
      page.on("requestfinished", (request) => {
        if (pendingPosts.delete(request)) transportDiagnostics.finished();
      });
      page.on("requestfailed", (request) => {
        if (pendingPosts.delete(request)) transportDiagnostics.failed();
      });
      await login(page, role);
      phase = "create-synthetic-student";
      operationPending = true;
      const student = await client
        .from("students")
        .insert(creatorStudentInput(f))
        .select("id")
        .single();
      if (student.error || student.data?.id !== f.studentId) {
        databaseErrorCode = /^[A-Z0-9]{1,16}$/.test(student.error?.code ?? "")
          ? student.error!.code
          : null;
        throw Error(
          "Exact synthetic student creation not confirmed; database code=" +
            (databaseErrorCode ?? "unavailable"),
        );
      }
      operationPending = false;
      phase = "pathway-builder";
      await page.goto("/pathway");
      await expect(page.getByTestId("pathway-intake-form")).toHaveAttribute(
        "data-pathway-step",
        "role",
      );
      const inputRole = role.key === "parent" ? "family" : "educator";
      await page.getByTestId("pathway-role-" + inputRole).click();
      await next(page, "about");
      await page.getByTestId("pathway-connected-student").click();
      await page.getByRole("option").filter({ hasText: f.marker }).click();
      await expect(page.locator('[name="student_id"]')).toHaveValue(f.studentId);
      await expect(page.locator('[name="student_first_name"]')).toHaveValue(f.marker);
      await next(page, "strengths");
      await fill(page, {
        strengths: "Careful practical problem solving with a visual checklist.",
        interests: "Culinary arts and robotics.",
      });
      await next(page, "career");
      await fill(page, {
        career_goals: "Explore a culinary job site; no placement has been confirmed.",
        education_goals:
          "Compare accessible certificate programs; no enrollment has been confirmed.",
      });
      await next(page, "life");
      await fill(page, {
        needs: "Written steps for unfamiliar tasks.",
        life_skills: "Practice weekly budgeting.",
        supports: "Visual checklist.",
        learning_preferences: "Preview choices before deciding.",
        assistive_technology: "Speech-to-text for drafting.",
        accommodations: "Written directions.",
      });
      await next(page, "context");
      await fill(page, {
        services_received: "Current service records were not supplied for this fictional example.",
        communication_prefs: "Plain language in writing.",
        transportation_needs: "Explore travel-training options; no route has been verified.",
        desired_postsecondary_outcomes: "Explore paid part-time culinary work.",
        family_priorities: "Safety and self-advocacy.",
        student_worries: "Asking for help in a new setting.",
        family_concerns_extended: "How progress will be measured across settings.",
        upcoming_meetings: "No meeting date has been agreed.",
        information_to_verify: "Current services and available local training options.",
      });
      await next(page, "current");
      await fill(page, {
        current_goals:
          "Proposed target: four culinary work steps; reported baseline: two independent steps using a checklist.",
        teacher_observations:
          "Fictional dated observation: two independent steps with the visual checklist.",
        readiness_evidence: "No standardized readiness score supplied.",
        evidence_source_dates: "Fictional checklist observation dated 2026-10-25.",
        family_concerns: "Agree how prompting and independent steps are recorded.",
      });
      await next(page, "voices");
      await fill(page, {
        student_voice: "I want to learn at a culinary job site.",
        family_voice: "Build safe community independence.",
        educator_input: "Agree on measurement conditions and review dated evidence.",
      });
      operationPending = true;
      phase = "initial-generation";
      await page.getByTestId("pathway-generate").click();
      await page.waitForURL(/\/reports\/[0-9a-f-]+/i, { timeout: 240000 });
      f.reportId = new URL(page.url()).pathname.split("/").at(-1)!;
      expect(f.reportId).toMatch(/^[0-9a-f-]{36}$/i);
      operationPending = false;
      phase = "initial-report-verification";
      await receipt();
      await expect(page.getByTestId("pathway-report-page")).toBeVisible({ timeout: 30000 });
      const initial = await client
        .from("pathway_reports")
        .select("user_id,student_id,intake_id,model,content")
        .eq("id", f.reportId)
        .single();
      if (initial.error || !initial.data) throw Error("Initial saved report unavailable");
      expect(initial.data.user_id).toBe(f.ownerId);
      expect(initial.data.student_id).toBe(f.studentId);
      expect(initial.data.model).toBe("google/gemini-2.5-pro");
      f.intakeId = initial.data.intake_id!;
      await receipt();
      const intake = await client
        .from("student_intakes")
        .select("student_id,user_id,submitter_role,supports,educator_input")
        .eq("id", f.intakeId)
        .single();
      if (intake.error || !intake.data) throw Error("Exact intake unavailable");
      expect(intake.data).toMatchObject({
        student_id: f.studentId,
        user_id: f.ownerId,
        submitter_role: inputRole,
      });
      expect(intake.data.supports).toContain("Speech-to-text");
      expect(intake.data.educator_input).toContain("No standardized readiness score supplied");
      const v1 = ReportSchema.parse(initial.data.content);
      expect(v1.summary.trim().length).toBeGreaterThan(20);
      await page.reload();
      await expect(page.getByTestId("pathway-report-page")).toBeVisible({ timeout: 30000 });
      const before = await client
        .from("pathway_report_versions")
        .select("id")
        .eq("report_id", f.reportId);
      if (before.error) throw Error("Initial history unavailable");
      expect(before.data).toHaveLength(0);
      // Change only this disposable profile to verify regeneration uses the current linked profile.
      operationPending = true;
      phase = "update-disposable-profile";
      const updated = await client
        .from("students")
        .update({ grade_band: "post-secondary" })
        .eq("id", f.studentId)
        .eq("owner_id", f.ownerId)
        .eq("first_name", f.marker)
        .select("id")
        .single();
      if (updated.error || updated.data?.id !== f.studentId)
        throw Error("Exact profile update not confirmed");
      operationPending = false;
      operationPending = true;
      phase = "regeneration";
      await page.getByRole("button", { name: "Refresh Pathway Report", exact: true }).click();
      await expect(page.getByText(/^Regenerated \(v1\)\./).first()).toBeVisible({
        timeout: 240000,
      });
      operationPending = false;
      phase = "regenerated-report-verification";
      const regenerated = await client
        .from("pathway_reports")
        .select("content,student_id,intake_id,user_id")
        .eq("id", f.reportId)
        .single();
      if (regenerated.error || !regenerated.data) throw Error("Regenerated report unavailable");
      const content = regenerated.data.content as any;
      PathwayReportV2.parse(content);
      expect(content.schema_version).toBe(2);
      expect(content.student_snapshot.grade).toBe("post-secondary");
      expect(content.inputs_used.profile).toBe(true);
      expect(content.inputs_used.intake).toBe(true);
      expect(content.inputs_used.student_voice_keys).toEqual([]);
      expect(content.inputs_used.intake_student_voice).toBe(true);
      expect(content.missing_information_v2?.some((gap: any) => gap.blocks_section === "student_voice" && /haven.t been captured|no student voice/i.test(gap.topic))).not.toBe(true);
      expect(content.confidence.caveats?.some((note: string) => /no student voice/i.test(note))).not.toBe(true);
      expect(content.inputs_used.iep_doc_ids).toEqual([]);
      expect(content.inputs_used.goal_ids).toEqual([]);
      expect(content.confidence.overall).toBe("low");
      expect(content.confidence_level).toBe("low");
      expect(content.summary).toBe(content.plain_language_summary);
      expect(content.readiness_indicators).toBeUndefined();
      expect(regenerated.data).toMatchObject({
        student_id: f.studentId,
        intake_id: f.intakeId,
        user_id: f.ownerId,
      });
      const versions = await client
        .from("pathway_report_versions")
        .select("id,content,created_by,version_number")
        .eq("report_id", f.reportId);
      if (versions.error) throw Error("Regeneration history unavailable");
      expect(versions.data).toHaveLength(1);
      expect(versions.data![0]).toMatchObject({
        content: initial.data.content,
        created_by: f.ownerId,
        version_number: 1,
      });
      await writeFile(
        info.outputPath("pathway-generated-content.json"),
        JSON.stringify(
          {
            role: role.key,
            fixture: f,
            initial: initial.data.content,
            regenerated: content,
            manualGroundingReviewRequired: true,
          },
          null,
          2,
        ),
      );
      await page.reload();
      await expect(page.getByTestId("pathway-report-page")).toBeVisible({ timeout: 30000 });
      const audienceLabel = role.key === "parent" ? "Family" : "Educator";
      await page.getByRole("tab", { name: audienceLabel, exact: true }).click();
      await expect(page.getByRole("tab", { name: audienceLabel, exact: true })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await page.reload();
      await expect(page.getByRole("tab", { name: audienceLabel, exact: true })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      phase = "private-access-check";
      const other = roles.find((x) => x.key !== role.key)!;
      const denied = await browser.newContext({ baseURL: target.origin });
      try {
        const dp = await denied.newPage();
        await login(dp, other);
        await dp.goto("/reports/" + f.reportId);
        await expect(dp.getByTestId("pathway-report-page")).toHaveCount(0, { timeout: 30000 });
        await expect(dp.getByText("Report not found.", { exact: true })).toBeVisible({
          timeout: 30000,
        });
      } finally {
        await denied.close();
      }
      phase = "pdf-export";
      await page.emulateMedia({ media: "print" });
      await expect(
        page.getByRole("button", { name: "Refresh Pathway Report", exact: true }),
      ).toBeHidden();
      const watermark = page.locator("[data-document-watermark]").first();
      await expect(watermark).toBeVisible();
      expect(
        await watermark.evaluate(
          (el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
        ),
      ).toBe(true);
      const pdf = await page.pdf({
        path: info.outputPath(role.key + "-live-pathway.pdf"),
        format: "A4",
        printBackground: true,
      });
      expect(pdf.length).toBeGreaterThan(1000);
      await page.screenshot({
        path: info.outputPath(role.key + "-live-pathway.png"),
        fullPage: true,
      });
    } catch (error) {
      primaryFailure = error;
      throw error;
    } finally {
      const errors: unknown[] = [];
      if (primaryFailure) {
        let completionSurface: ReturnType<typeof creatorCompletionSurface> | null = null;
        let applicationFailure: PathwayCreationFailure | null = null;
        try {
          if (observedPage && !observedPage.isClosed()) {
            const visible = await observedPage.getByRole("alert")
              .filter({ hasText: "The report could not be completed" }).isVisible();
            completionSurface = creatorCompletionSurface(new URL(observedPage.url()).pathname, visible);
            const packet = await observedPage.locator("[data-pathway-failure]").count() === 1
              ? await observedPage.locator("[data-pathway-failure]").getAttribute("data-pathway-failure") : null;
            if (packet && packet.length <= 4096)
              applicationFailure = parsePathwayCreationFailureMetadata(JSON.parse(packet));
          }
        } catch { /* Closed/unavailable page stays unknown; no raw error is retained. */ }
        try {
          await writeFile(
            info.outputPath("pathway-failure-diagnostics.json"),
            JSON.stringify(
              {
                phase,
                databaseErrorCode,
                operationPending,
                primaryFailurePreserved: true,
                ...transportDiagnostics.snapshot(primaryFailure),
                completionSurface,
                applicationFailure,
                reconciliationRequired: operationPending,
              },
              null,
              2,
            ),
          );
        } catch (error) {
          errors.push(error);
        }
      }
      try {
        await context.close();
      } catch (e) {
        errors.push(e);
      }
      try {
        if (operationPending)
          throw Error(
            "Operation completion uncertain; retain exact scope for trusted reconciliation",
          );
        const result = await cleanupCreator(client, f, async (scope) => {
          await writeFile(
            info.outputPath("pathway-creator-cleanup-scope.json"),
            JSON.stringify(scope, null, 2),
          );
          await writeFile(info.outputPath("pathway-creator-cleanup.sql"), creatorAbsenceSql(scope));
        });
        await writeFile(
          info.outputPath("pathway-creator-cleanup-result.json"),
          JSON.stringify(result, null, 2),
        );
      } catch (e) {
        errors.push(e);
      } finally {
        try {
          const signedOut = await client.auth.signOut({ scope: "local" });
          if (signedOut.error) errors.push(signedOut.error);
        } catch (e) {
          errors.push(e);
        }
      }
      if (errors.length)
        throw new AggregateError(
          primaryFailure ? [primaryFailure, ...errors] : errors,
          `Bounded Pathway teardown requires review; phase=${phase}; database code=${databaseErrorCode ?? "unavailable"}; pending=${operationPending}; primary=${transportDiagnostics.snapshot(primaryFailure).primaryFailureKind}`,
        );
    }
  });
