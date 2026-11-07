import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { pptLiveAcceptanceTarget } from "../helpers/ppt-live-acceptance-policy";
import { cleanupPptExact, pptExactAbsenceSql } from "../helpers/ppt-live-exact-cleanup";
import type { Database } from "../../../src/integrations/supabase/types";
import { ROLES, type RoleSpec } from "../helpers/roles";

const enabled = process.env.RUN_PPT_LIVE_STAGING_QA === "true";
const roles = [ROLES.find((r) => r.key === "parent")!, ROLES.find((r) => r.key === "educator")!];
test.describe.configure({ mode: "serial", retries: 0 });
test.use({ trace: "off", video: "off", screenshot: "off" });
test.skip(!enabled, "Protected manual PPT acceptance is not enabled");
test.skip(
  enabled && roles.some((r) => !existsSync(r.storageState)),
  "Synthetic sessions are missing",
);

async function signInPptRole(page: Page, role: RoleSpec) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(process.env[role.emailEnv] ?? "");
  await page.getByTestId("login-password").fill(process.env[role.passwordEnv] ?? "");
  await page.getByTestId("login-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
}

for (const role of roles) {
  test(`${role.key} generates, saves, reopens and prints one synthetic PPT packet`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const target = pptLiveAcceptanceTarget(process.env);
    for (const origin of [target.controlOrigin, target.origin]) {
      const response = await fetch(`${origin}/api/public/env-health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      expect(response.ok).toBe(true);
      const h = await response.json();
      expect(h.runtime_source_fingerprint).toBe(process.env.EXPECTED_RUNTIME_SOURCE_FINGERPRINT);
      expect(h.runtime_source_file_count).toBe(target.fileCount);
      expect(h.app_env).toBe("staging");
      expect(h.vite_app_env).toBe("staging");
      expect(h.runtime_source_fingerprint_schema).toBe("transitionforward-runtime-source-v1");
      expect(h.runtime_source_fingerprint_algorithm).toBe("sha256");
      expect(h.supabase_project_ref).toBe("qgrertkqbwanerqqemph");
      expect(h.stripe_mode).toBe("sandbox");
      expect(h.isolation?.ok).toBe(true);
      expect(h.is_production_target).toBe(false);
      if (origin === target.controlOrigin)
        expect(h.git_commit_sha).toBe(process.env.E2E_EXPECTED_BUILD_SHA);
      else expect(h.ai_gateway_configured).toBe(true);
    }
    const baseURL = target.origin;
    const client = createClient<Database>(target.backend, target.publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const email =
      role.key === "parent"
        ? "e2e.parent@staging.transitionforwardct.test"
        : "e2e.educator@staging.transitionforwardct.test";
    if (process.env[role.emailEnv] !== email) throw Error("Non-synthetic PPT identity refused");
    const session = await client.auth.signInWithPassword({
      email,
      password: process.env[role.passwordEnv] ?? "",
    });
    if (session.error || !session.data.user || session.data.user.email !== email)
      throw Error("Synthetic PPT sign-in failed");
    const profile = { id: session.data.user.id };
    const runId = target.runId;
    const marker = `QA PPT ${runId} ${role.key}`;
    const intakeId = randomUUID(),
      reportId = randomUUID();
    let prepId = "";
    let generationStarted = false;
    const fixtureScope = () => ({ ownerId: profile.id, intakeId, reportId, prepId, marker });
    await writeFile(
      testInfo.outputPath("ppt-planned-fixture-scope.json"),
      JSON.stringify(fixtureScope(), null, 2),
    );
    await writeFile(
      testInfo.outputPath("ppt-exact-cleanup-check.sql"),
      pptExactAbsenceSql(fixtureScope()),
    );
    const context = await browser.newContext({ baseURL });
    try {
      const page = await context.newPage();
      await signInPptRole(page, role);
      const { data: intake, error: ie } = await client
        .from("student_intakes")
        .insert({
          id: intakeId,
          user_id: profile.id,
          student_first_name: marker,
          submitter_role: role.key === "parent" ? "family" : "educator",
          grade_band: "11-12",
          current_goals:
            "Complete four culinary work steps using a visual checklist; baseline two independent steps.",
          family_concerns: "Clarify how progress is measured across settings.",
        })
        .select("id")
        .single();
      if (ie || !intake) throw new Error("Synthetic intake creation failed");
      expect(intake.id).toBe(intakeId);
      const { data: report, error: re } = await client
        .from("pathway_reports")
        .insert({
          id: reportId,
          user_id: profile.id,
          intake_id: intakeId,
          is_demo: true,
          model: "synthetic-ppt-fixture",
          content: {
            summary: "Synthetic planning context only, not a reviewed IEP.",
            student_voice: "I want to learn at a culinary job site.",
            strengths: ["Careful practical problem solving"],
            supports: ["Visual checklist and written directions"],
            information_to_verify: ["No dated progress log or current service minutes supplied"],
          },
        })
        .select("id")
        .single();
      if (re || !report) throw new Error("Synthetic report creation failed");
      expect(report.id).toBe(reportId);
      await page.goto("/ppt-prep");
      await page.getByRole("combobox", { name: "Pathway Report to build from" }).click();
      await page.getByRole("option").filter({ hasText: marker }).click();
      await page
        .getByLabel("What's on your mind going in?")
        .fill(
          role.key === "parent"
            ? "Family: progress logs do not show how independent steps are measured; ask for evidence and student choice."
            : "Educator: agree on baseline, prompting conditions, data collection responsibilities and family input.",
        );
      await page
        .getByLabel("What do you want to walk out with?")
        .fill(
          "Agree on a measurable culinary transition goal, supports, data collection owner and review date. Identify missing evidence rather than assume services.",
        );
      // Exactly one click/request per role; no fallback generation or retry.
      generationStarted = true;
      await page.getByRole("button", { name: "Generate meeting prep", exact: true }).click();
      await page.waitForURL(/\/ppt-prep\?id=[0-9a-f-]+/i, { timeout: 240_000 });
      prepId = new URL(page.url()).searchParams.get("id") ?? "";
      expect(prepId).toMatch(/^[0-9a-f-]{36}$/i);
      await writeFile(
        testInfo.outputPath("ppt-exact-cleanup-check.sql"),
        pptExactAbsenceSql(fixtureScope()),
      );
      const { data: packet, error: pe } = await client
        .from("ppt_meeting_preps")
        .select("id,user_id,report_id,agenda")
        .eq("id", prepId)
        .single();
      if (pe || !packet) throw new Error("Generated PPT was not persisted");
      expect(packet.user_id).toBe(profile.id);
      expect(packet.report_id).toBe(reportId);
      const a = packet.agenda as any;
      expect(a.agenda.length).toBeGreaterThanOrEqual(4);
      expect(a.agenda.length).toBeLessThanOrEqual(7);
      expect(a.questions_to_ask.length).toBeGreaterThanOrEqual(4);
      expect(a.evidence_to_bring.length).toBeGreaterThanOrEqual(3);
      expect(a.language_that_works.length).toBeGreaterThanOrEqual(3);
      expect(a.language_that_works.join(" ")).toMatch(/family/i);
      expect(a.language_that_works.join(" ")).toMatch(/educator/i);
      for (const topic of a.agenda) {
        expect(topic.title.trim().length).toBeGreaterThan(0);
        expect(topic.purpose.trim().length).toBeGreaterThan(0);
        expect(topic.minutes).toBeGreaterThanOrEqual(2);
        expect(topic.minutes).toBeLessThanOrEqual(20);
      }
      for (const list of [a.questions_to_ask, a.evidence_to_bring, a.language_that_works])
        for (const item of list) expect(item.trim().length).toBeGreaterThan(0);
      await writeFile(
        testInfo.outputPath("ppt-generated-packet.json"),
        JSON.stringify(
          {
            role: role.key,
            fixture: fixtureScope(),
            agenda: a,
            manualGroundingAndSpeakerReviewRequired: true,
          },
          null,
          2,
        ),
      );
      await page.reload();
      await expect(page.getByText(a.opening_note, { exact: true })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByRole("heading", { name: "Your Meeting Plan", exact: true })).toBeVisible();
      const other = roles.find((r) => r.key !== role.key)!;
      const denied = await browser.newContext({ baseURL });
      try {
        const deniedPage = await denied.newPage();
        await signInPptRole(deniedPage, other);
        await deniedPage.goto(`/ppt-prep?id=${prepId}`);
        await deniedPage.waitForURL(/\/ppt-prep\/?$/, { timeout: 30_000 });
        await expect(deniedPage.getByText(a.opening_note, { exact: true })).toHaveCount(0);
      } finally {
        await denied.close();
      }
      await page.emulateMedia({ media: "print" });
      await expect(page.getByRole("button", { name: "Print / save as PDF" })).toBeHidden();
      const pdf = await page.pdf({
        path: testInfo.outputPath(`${role.key}-synthetic-ppt.pdf`),
        format: "A4",
        printBackground: true,
      });
      expect(pdf.length).toBeGreaterThan(1000);
      await page.screenshot({
        path: testInfo.outputPath(`${role.key}-synthetic-ppt-print.png`),
        fullPage: true,
      });
    } finally {
      const cleanupErrors: unknown[] = [];
      try {
        await context.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
      try {
        if (generationStarted && !prepId) {
          throw new Error(
            "PPT completion is uncertain; retain exact fixtures for trusted reconciliation before cleanup",
          );
        }
        const result = await cleanupPptExact(client, fixtureScope(), async (receipt) => {
          await writeFile(
            testInfo.outputPath("ppt-exact-cleanup-scope.json"),
            JSON.stringify({ ...fixtureScope(), ...receipt }, null, 2),
          );
        });
        await writeFile(
          testInfo.outputPath("ppt-exact-cleanup-result.json"),
          JSON.stringify({ ...result, independentPrivilegedAbsenceRequired: true }, null, 2),
        );
      } catch (error) {
        cleanupErrors.push(error);
      } finally {
        try {
          const { error } = await client.auth.signOut({ scope: "local" });
          if (error) cleanupErrors.push(error);
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      if (cleanupErrors.length)
        throw new AggregateError(
          cleanupErrors,
          "PPT teardown failed; exact cleanup requires review",
        );
    }
  });
}
