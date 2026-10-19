import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import type { Database, Json } from "../../../src/integrations/supabase/types";
import { ReportSchema } from "../../../src/lib/pathway-generation-contract";
import { DEMO_REPORT } from "../../../src/lib/demo-data";
import { ROLES } from "../helpers/roles";
import { cleanupReportHistoryFixture } from "../helpers/report-history-fixture-cleanup";
import { reportHistoryAcceptanceTarget } from "../helpers/report-history-acceptance-policy";

test.skip(process.env.RUN_REPORT_HISTORY_STAGING_QA !== "true", "Separate disposable-fixture authorization required");
test.describe.configure({ mode: "serial", retries: 0 });
for (const ownerRole of ["parent", "educator"] as const) {
  test(`${ownerRole} restores, reopens and exports only its disposable report`, async ({ browser }, info) => {
    test.setTimeout(180_000);
    const target = reportHistoryAcceptanceTarget(process.env);
    const response = await fetch(`${target.origin}/api/public/env-health`);
    if (!response.ok) throw new Error("Staging preflight failed before fixtures");
    const health = await response.json();
    expect(health.git_commit_sha).toBe(process.env.E2E_EXPECTED_BUILD_SHA);
    expect(health.runtime_source_fingerprint).toBe(process.env.EXPECTED_RUNTIME_SOURCE_FINGERPRINT);
    expect(health.supabase_project_ref).toBe("qgrertkqbwanerqqemph");
    expect(health.stripe_mode).toBe("sandbox");
    expect(health.isolation?.ok).toBe(true);
    expect(health.is_production_target).toBe(false);
    const expectedEmails: Record<string, string> = { student: "e2e.student", parent: "e2e.parent", educator: "e2e.educator", school_admin: "e2e.schooladmin", district_admin: "e2e.districtadmin", partner: "e2e.partner", owner: "e2e.owner" };
    const clients: Array<{role: string; id: string; client: SupabaseClient<Database>}> = [];
    const reportId = randomUUID(), intakeId = randomUUID(), versionId = randomUUID();
    let intakeCreated = false, reportCreated = false, intakeAttempted = false, reportAttempted = false;
    const marker = `QA History ${target.runId} ${ownerRole}`;
    let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;
    const evidence: Record<string, unknown> = {role: ownerRole, runId: target.runId, reportId, intakeId, aiCalls: 0};
    try {
      for (const role of ROLES) {
        const email = process.env[role.emailEnv] ?? "";
        if (email !== `${expectedEmails[role.key]}@staging.transitionforwardct.test`) throw new Error("Non-synthetic identity refused");
        const client = createClient<Database>(target.backend, target.publicKey, {auth: {persistSession:false, autoRefreshToken:false}});
        const {data,error} = await client.auth.signInWithPassword({email,password:process.env[role.passwordEnv] ?? ""});
        if (error || !data.user || data.user.email !== email) throw new Error(`Synthetic ${role.key} sign-in failed`);
        clients.push({role:role.key,id:data.user.id,client});
      }
      const owner = clients.find(c=>c.role === ownerRole)!;
      const current = ReportSchema.parse({...structuredClone(DEMO_REPORT),summary:`Synthetic ${ownerRole} current plan ${target.runId}`});
      const earlier = ReportSchema.parse({...structuredClone(DEMO_REPORT),summary:`Synthetic ${ownerRole} earlier plan ${target.runId}`});
      intakeAttempted = true;
      const intake = await owner.client.from("student_intakes").insert({id:intakeId,user_id:owner.id,student_first_name:marker,submitter_role:ownerRole === "parent" ? "family" : "educator",grade_band:"11-12"});
      if (intake.error) throw new Error("Caller-RLS intake fixture failed");
      intakeCreated = true;
      reportAttempted = true;
      const report = await owner.client.from("pathway_reports").insert({id:reportId,intake_id:intakeId,user_id:owner.id,student_id:null,is_demo:true,model:"synthetic-no-ai-history",content:current as unknown as Json});
      if (report.error) throw new Error("Caller-RLS report fixture failed");
      reportCreated = true;
      const version = await owner.client.from("pathway_report_versions").insert({id:versionId,report_id:reportId,version_number:1,content:earlier as unknown as Json,created_by:owner.id,change_summary:"Synthetic fixture earlier version"});
      if (version.error) throw new Error("Caller-RLS version fixture failed");
      for (const other of clients.filter(c=>c.role !== ownerRole)) {
        const read = await other.client.from("pathway_reports").select("id").eq("id",reportId);
        if (read.error) throw new Error(`Could not verify ${other.role} read boundary`);
        expect(read.data,`${other.role} must not read this unlinked private report`).toEqual([]);
      }
      const role = ROLES.find(r=>r.key === ownerRole)!;
      context = await browser.newContext({baseURL:target.origin,storageState:role.storageState});
      const page = await context.newPage();
      await page.goto(`/reports/${reportId}`,{waitUntil:"domcontentloaded"});
      await expect(page.getByText(current.summary,{exact:true}).first()).toBeVisible();
      const restore = page.getByRole("button",{name:"Restore",exact:true});
      await expect(restore).toHaveCount(1);
      await restore.click(); // One real save/restore request, no generator or sharing action.
      await expect(page.getByText(earlier.summary,{exact:true}).first()).toBeVisible();
      await page.reload({waitUntil:"domcontentloaded"});
      await expect(page.getByText(earlier.summary,{exact:true}).first()).toBeVisible();
      const saved = await owner.client.from("pathway_reports").select("content").eq("id",reportId).single();
      if (saved.error) throw new Error("Saved content readback failed");
      expect((saved.data.content as Record<string,Json>).summary).toBe(earlier.summary);
      const history = await owner.client.from("pathway_report_versions").select("version_number,content,created_by").eq("report_id",reportId).order("version_number");
      if (history.error) throw new Error("Snapshot readback failed");
      expect(history.data).toHaveLength(2);
      expect(history.data[0].content).toEqual(earlier);
      expect(history.data[1].content).toEqual(current);
      expect(history.data[1].created_by).toBe(owner.id);
      evidence.versionNumbers = history.data.map(v=>v.version_number);
      await page.emulateMedia({media:"print"});
      expect(await page.locator("body").innerText()).toContain(earlier.summary);
      await expect(page.getByRole("button",{name:"Restore",exact:true}).first()).toBeHidden();
      const mark = page.locator("[data-document-watermark]").first();
      await expect(mark).toBeVisible();
      expect(await mark.evaluate(el=>(el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
      expect(await mark.evaluate(el=>{ const s=getComputedStyle(el); return {position:s.position,top:s.top,right:s.right}; })).toEqual({position:"fixed",top:"0px",right:"0px"});
      await page.pdf({path:info.outputPath(`${ownerRole}-history-report.pdf`),format:"A4",printBackground:true});
      await page.screenshot({path:info.outputPath(`${ownerRole}-history-report-print.png`),fullPage:true});
      evidence.pdfCreated = true; // Visual/page-by-page acceptance remains separate.
    } finally {
      const owner = clients.find(c=>c.role === ownerRole);
      const errors: string[] = [];
      if (owner) errors.push(...await cleanupReportHistoryFixture(owner.client,{reportId,intakeId,ownerId:owner.id,reportCreated,intakeCreated,reportAttempted,intakeAttempted,marker}));
      try { await context?.close(); } catch { errors.push("Browser context did not close cleanly"); }
      await Promise.allSettled(clients.map(c=>c.client.auth.signOut({scope:"local"})));
      evidence.cleanup = {errors,scope:"Exact IDs; caller-RLS readback, not privileged global row-count proof"};
      const output = info.outputPath(`${ownerRole}-history-acceptance.json`);
      await writeFile(output,JSON.stringify(evidence,null,2));
      await info.attach("history-acceptance.json",{path:output,contentType:"application/json"});
      if (errors.length) throw new Error(errors.join("; "));
    }
  });
}
