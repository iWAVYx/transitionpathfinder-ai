import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import type { Database, Json } from "../../../src/integrations/supabase/types";
import { ReportSchema } from "../../../src/lib/pathway-generation-contract";
import { DEMO_REPORT } from "../../../src/lib/demo-data";
import { writeReportContent } from "../../../src/lib/report-content-write.server";
import { ROLES } from "../helpers/roles";
import { linkedReportAccessTarget } from "../helpers/linked-report-access-policy";
import {
  cleanupLinkedAccessFixture,
  linkedAccessCleanupVerificationSql,
  type LinkedAccessFixture,
} from "../helpers/linked-report-access-cleanup";

test.skip(
  process.env.RUN_LINKED_REPORT_ACCESS_STAGING_QA !== "true",
  "Separate bounded fixture authorization required",
);
test.use({ trace: "off", screenshot: "off", video: "off" });
test.describe.configure({ mode: "serial", retries: 0 });
test("explicit editor/admin access cannot be manufactured or retained after revocation", async ({
  browser,
}, info) => {
  test.setTimeout(240_000);
  const target = linkedReportAccessTarget(process.env);
  const expectedFileCount = Number(process.env.EXPECTED_RUNTIME_SOURCE_FILE_COUNT);
  if (!Number.isSafeInteger(expectedFileCount) || expectedFileCount < 1) throw new Error("Verified source file count required before fixtures");
  for (const origin of [target.origin, "https://gentle-forward-reach.lovable.app"]) {
    const response = await fetch(`${origin}/api/public/env-health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    expect(response.ok).toBe(true);
    const h = await response.json();
    expect(h.runtime_source_fingerprint).toBe(process.env.EXPECTED_RUNTIME_SOURCE_FINGERPRINT);
    expect(h.runtime_source_file_count).toBe(expectedFileCount);
    expect(h.supabase_project_ref).toBe("qgrertkqbwanerqqemph");
    expect(h.stripe_mode).toBe("sandbox");
    expect(h.isolation?.ok).toBe(true);
    expect(h.is_production_target).toBe(false);
    if (origin === target.origin) expect(h.git_commit_sha).toBe(process.env.E2E_EXPECTED_BUILD_SHA);
  }
  const expected: Record<string, string> = {
    student: "student",
    parent: "parent",
    educator: "educator",
    school_admin: "schooladmin",
    district_admin: "districtadmin",
    partner: "partner",
    owner: "owner",
  };
  const clients: Array<{ role: string; id: string; client: SupabaseClient<Database> }> = [];
  const fixture: LinkedAccessFixture = {
    studentId: randomUUID(),
    intakeId: randomUUID(),
    reportId: randomUUID(),
    relationshipIds: [randomUUID(), randomUUID()],
    actorIds: [],
    marker: `QA Linked Access ${target.runId}`,
    studentAttempted: false,
    intakeAttempted: false,
    reportAttempted: false,
    relationshipsAttempted: false,
  };
  const evidence: Record<string, unknown> = {
    runId: target.runId,
    fixture,
    aiCalls: 0,
    shareLinks: 0,
    phases: [],
  };
  const contexts: Array<Awaited<ReturnType<typeof browser.newContext>>> = [];
  try {
    for (const role of ROLES) {
      const email = process.env[role.emailEnv] ?? "";
      if (email !== `e2e.${expected[role.key]}@staging.transitionforwardct.test`)
        throw Error("Non-synthetic identity refused");
      const client = createClient<Database>(target.backend, target.publicKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password: process.env[role.passwordEnv] ?? "",
      });
      if (error || !data.user || data.user.email !== email)
        throw Error(`Synthetic ${role.key} sign-in failed`);
      clients.push({ role: role.key, id: data.user.id, client });
    }
    const owner = clients.find((c) => c.role === "parent")!;
    const participants = [
      clients.find((c) => c.role === "educator")!,
      clients.find((c) => c.role === "owner")!,
    ];
    fixture.actorIds = [owner.id, ...participants.map((c) => c.id)];
    // Save the exact receipt before any attempted fixture write, including ambiguous responses.
    await writeFile(
      info.outputPath("linked-access-receipt.json"),
      JSON.stringify({ runId: target.runId, ...fixture }, null, 2),
    );
    await writeFile(
      info.outputPath("linked-access-cleanup-check.sql"),
      linkedAccessCleanupVerificationSql(fixture),
    );
    const initial = ReportSchema.parse({
      ...structuredClone(DEMO_REPORT),
      summary: `Fictional linked access initial ${target.runId}`,
    });
    let current = ReportSchema.parse({
      ...initial,
      summary: `Fictional linked access saved ${target.runId}`,
    });
    fixture.studentAttempted = true;
    expect(
      (
        await owner.client
          .from("students")
          .insert({
            id: fixture.studentId,
            owner_id: owner.id,
            first_name: fixture.marker,
            grade_band: "11-12",
            is_demo: true,
          })
      ).error,
    ).toBeNull();
    fixture.intakeAttempted = true;
    expect(
      (
        await owner.client
          .from("student_intakes")
          .insert({
            id: fixture.intakeId,
            user_id: owner.id,
            student_id: fixture.studentId,
            student_first_name: fixture.marker,
            submitter_role: "family",
            grade_band: "11-12",
          })
      ).error,
    ).toBeNull();
    fixture.reportAttempted = true;
    expect(
      (
        await owner.client
          .from("pathway_reports")
          .insert({
            id: fixture.reportId,
            user_id: owner.id,
            intake_id: fixture.intakeId,
            student_id: fixture.studentId,
            is_demo: true,
            model: "synthetic-no-ai-history",
            content: initial as unknown as Json,
          })
      ).error,
    ).toBeNull();
    expect(
      await writeReportContent(
        owner.client,
        fixture.reportId,
        initial,
        current,
        "Synthetic owner save",
        "save",
        fixture.studentId,
      ),
    ).toBe(1);
    const visibility = async (c: typeof owner, allowed: boolean) => {
      for (const [table, column, id] of [
        ["pathway_reports", "id", fixture.reportId],
        ["student_intakes", "id", fixture.intakeId],
        ["pathway_report_versions", "report_id", fixture.reportId],
      ] as const) {
        const r = await c.client.from(table).select("id").eq(column, id);
        expect(r.error).toBeNull();
        expect(r.data!.length > 0, `${c.role} ${table} visibility`).toBe(allowed);
      }
    };
    for (const c of clients.filter((c) => c.id !== owner.id)) {
      const rights = await c.client.rpc("can_edit_student", {
        _user_id: c.id,
        _student_id: fixture.studentId,
      });
      expect(rights.error).toBeNull();
      expect(rights.data).toBe(false);
      await visibility(c, false);
      const edit = await c.client
        .from("pathway_reports")
        .update({ content: initial as unknown as Json })
        .eq("id", fixture.reportId)
        .select("id");
      expect(Boolean(edit.error) || edit.data?.length === 0).toBe(true);
      await expect(
        writeReportContent(
          c.client,
          fixture.reportId,
          current,
          initial,
          "Denied nonowner save",
          "save",
          fixture.studentId,
        ),
      ).rejects.toThrow("Could not save the report.");
    }
    for (const [i, c] of participants.entries()) {
      fixture.relationshipsAttempted = true;
      expect(
        (
          await owner.client
            .from("student_relationships")
            .insert({
              id: fixture.relationshipIds[i],
              student_id: fixture.studentId,
              related_user_id: c.id,
              relationship_type: i === 0 ? "educator_case_manager" : "school_admin",
              permission_level: "view_summary",
              consent_status: "pending",
            })
        ).error,
      ).toBeNull();
      const row = () =>
        c.client
          .from("student_relationships")
          .update({ consent_status: "approved" })
          .eq("id", fixture.relationshipIds[i])
          .eq("student_id", fixture.studentId)
          .eq("related_user_id", c.id)
          .select("id");
      await visibility(c, false);
      let approval = await row();
      expect(approval.error).toBeNull();
      expect(approval.data).toHaveLength(1);
      await visibility(c, true);
      const self = await c.client
        .from("student_relationships")
        .update({ permission_level: "manage_plan" })
        .eq("id", fixture.relationshipIds[i])
        .eq("student_id", fixture.studentId)
        .select("id");
      expect(self.error?.code).toBe("42501");
      const viewerEdit = await c.client
        .from("pathway_reports")
        .update({ content: initial as unknown as Json })
        .eq("id", fixture.reportId)
        .select("id");
      expect(Boolean(viewerEdit.error) || viewerEdit.data?.length === 0).toBe(true);
      const transition = await owner.client
        .from("student_relationships")
        .update({ consent_status: "pending", permission_level: "manage_plan" })
        .eq("id", fixture.relationshipIds[i])
        .eq("student_id", fixture.studentId)
        .select("id");
      expect(transition.error).toBeNull();
      expect(transition.data).toHaveLength(1);
      await visibility(c, false);
      approval = await row();
      expect(approval.error).toBeNull();
      expect(approval.data).toHaveLength(1);
      await visibility(c, true);
      for (const identity of ["owner_id", "student_user_id"] as const) {
        const attempt = await c.client
          .from("students")
          .update({ [identity]: c.id })
          .eq("id", fixture.studentId)
          .select("id");
        expect(attempt.error?.code).toBe("42501");
      }
      const takeover = await c.client
        .from("pathway_reports")
        .update({ user_id: c.id })
        .eq("id", fixture.reportId)
        .select("id");
      expect(takeover.error?.code).toBe("42501");
      const unlink = await c.client
        .from("pathway_reports")
        .update({ student_id: null })
        .eq("id", fixture.reportId)
        .select("id");
      expect(unlink.error?.code).toBe("42501");
      await expect(
        writeReportContent(
          c.client,
          fixture.reportId,
          current,
          initial,
          "Denied nonowner save",
          "save",
          fixture.studentId,
        ),
      ).rejects.toThrow("Could not save the report.");
      const next = ReportSchema.parse({
        ...current,
        summary: `Fictional ${c.role} linked edit ${target.runId}`,
      });
      const edit = await c.client
        .from("pathway_reports")
        .update({ content: next as unknown as Json })
        .eq("id", fixture.reportId)
        .select("id");
      expect(edit.error).toBeNull();
      expect(edit.data).toHaveLength(1);
      const version = await owner.client
        .from("pathway_report_versions")
        .select("created_by,content")
        .eq("report_id", fixture.reportId)
        .order("version_number", { ascending: false })
        .limit(1);
      expect(version.error).toBeNull();
      expect(version.data?.[0]).toMatchObject({ created_by: c.id, content: current });
      current = next;
      // Educators can read the permitted report without gaining owner-only controls.
      // Owner Hub remains management-only; admin permission is checked through RLS.
      if (c.role === "educator") {
        const context = await browser.newContext({
          baseURL: target.origin,
          storageState: ROLES.find((r) => r.key === "educator")!.storageState,
        });
        contexts.push(context);
        const page = await context.newPage();
        await page.goto(`/reports/${fixture.reportId}`, { waitUntil: "domcontentloaded" });
        await expect(page.locator(".report-root")).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText(current.summary, { exact: true }).first()).toBeVisible();
        await expect(page.getByRole("button", { name: "Restore", exact: true })).toHaveCount(0);
        await expect(page.getByRole("button", { name: /regenerate/i })).toHaveCount(0);
      }
      const revoke = await owner.client
        .from("student_relationships")
        .update({ consent_status: "revoked" })
        .eq("id", fixture.relationshipIds[i])
        .eq("student_id", fixture.studentId)
        .select("id");
      expect(revoke.error).toBeNull();
      expect(revoke.data).toHaveLength(1);
      await visibility(c, false);
      const after = await c.client
        .from("pathway_reports")
        .update({ content: initial as unknown as Json })
        .eq("id", fixture.reportId)
        .select("id");
      expect(Boolean(after.error) || after.data?.length === 0).toBe(true);
      (evidence.phases as unknown[]).push({
        role: c.role,
        pendingDenied: true,
        viewerReadOnly: true,
        selfPromotionDenied: true,
        explicitEditorWrite: true,
        identitiesPinned: true,
        historyAttributed: true,
        revokedDenied: true,
      });
    }
    const history = await owner.client
      .from("pathway_report_versions")
      .select("id")
      .eq("report_id", fixture.reportId);
    expect(history.error).toBeNull();
    expect(history.data).toHaveLength(3);
    evidence.historyVersions = 3;
  } finally {
    const errors: string[] = [];
    const cleanupActors = fixture.actorIds
      .map((id) => clients.find((c) => c.id === id)!)
      .filter(Boolean);
    if (cleanupActors.length === 3)
      errors.push(...(await cleanupLinkedAccessFixture(cleanupActors, fixture)));
    else if (fixture.studentAttempted) errors.push("Missing exact cleanup actor context");
    for (const c of contexts)
      try {
        await c.close();
      } catch {
        errors.push("Reader context close failed");
      }
    await Promise.allSettled(clients.map((c) => c.client.auth.signOut({ scope: "local" })));
    evidence.cleanup = {
      errors,
      scope:
        "Exact fictional IDs and caller-RLS readback; independent privileged absence check still required",
    };
    await writeFile(
      info.outputPath("linked-report-access.json"),
      JSON.stringify(evidence, null, 2),
    );
    if (errors.length) throw Error(errors.join("; "));
  }
});
