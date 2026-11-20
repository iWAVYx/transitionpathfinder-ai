import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import type { Database, Json } from "../../../src/integrations/supabase/types";
import { ReportSchema } from "../../../src/lib/pathway-generation-contract";
import { DEMO_REPORT } from "../../../src/lib/demo-data";
import { writeReportContent } from "../../../src/lib/report-content-write.server";
import { ROLES } from "../helpers/roles";
import { cleanupReportHistoryFixture } from "../helpers/report-history-fixture-cleanup";
import { reportHistoryAcceptanceTarget } from "../helpers/report-history-acceptance-policy";

test.skip(process.env.RUN_REPORT_HISTORY_STAGING_QA !== "true", "Separate disposable-fixture authorization required");
test.use({trace:"off",screenshot:"off",video:"off"});
test.describe.configure({ mode: "serial", retries: 0 });
// Match the existing report-reader readiness contract, rather than asserting
// content against the still-empty route shell after only the default five seconds.
async function expectLoadedReport(page:Page,summary:string,evidence:Record<string,unknown>,stage:string) {
  try {
    await expect(page.locator(".report-root")).toBeVisible({timeout:30_000});
    await expect(page.getByText(summary,{exact:true}).first()).toBeVisible();
  } catch(error) {
    const path=new URL(page.url()).pathname;
    evidence.readerFailure={stage,route:path.startsWith("/reports/")?"report":path.startsWith("/owner")?"owner":path.startsWith("/auth")?"auth":"other",
      reportRoots:await page.locator(".report-root").count(),
      headings:await page.getByRole("heading").count(),
      visibleTextLength:(await page.locator("body").innerText()).length};
    // No URL queries, console messages, cookies, storage state or private text.
    throw error;
  }
}
for (const ownerRole of ["parent", "educator"] as const) {
  test(`${ownerRole} restores, reopens and exports only its disposable report`, async ({ browser }, info) => {
    test.setTimeout(180_000);
    const target = reportHistoryAcceptanceTarget(process.env);
    const expectedFileCount = Number(process.env.EXPECTED_RUNTIME_SOURCE_FILE_COUNT);
    if (!Number.isSafeInteger(expectedFileCount) || expectedFileCount < 1) throw new Error("Verified source file count required before fixtures");
    for (const origin of [target.origin,"https://gentle-forward-reach.lovable.app"]) {
      const response = await fetch(`${origin}/api/public/env-health`,{cache:"no-store",signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error("Staging preflight failed before fixtures");
      const health = await response.json();
      if (origin === target.origin) expect(health.git_commit_sha).toBe(process.env.E2E_EXPECTED_BUILD_SHA);
      expect(health.runtime_source_fingerprint).toBe(process.env.EXPECTED_RUNTIME_SOURCE_FINGERPRINT);
      expect(health.runtime_source_file_count).toBe(expectedFileCount);
      expect(health.supabase_project_ref).toBe("qgrertkqbwanerqqemph");
      expect(health.stripe_mode).toBe("sandbox");
      expect(health.isolation?.ok).toBe(true);
      expect(health.is_production_target).toBe(false);
    }
    const expectedEmails: Record<string, string> = { student: "e2e.student", parent: "e2e.parent", educator: "e2e.educator", school_admin: "e2e.schooladmin", district_admin: "e2e.districtadmin", partner: "e2e.partner", owner: "e2e.owner" };
    const clients: Array<{role: string; id: string; client: SupabaseClient<Database>}> = [];
    const reportId = randomUUID(), intakeId = randomUUID(), versionId = randomUUID();
    let intakeCreated = false, reportCreated = false, intakeAttempted = false, reportAttempted = false;
    const marker = `QA History ${target.runId} ${ownerRole}`;
    let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;
    const reportAudience = ownerRole === "parent" ? "family" : "educator";
    const audienceTabName = ownerRole === "parent" ? "Family" : "Educator";
    const evidence: Record<string, unknown> = {role: ownerRole, reportAudience, runId: target.runId, reportId, intakeId, aiCalls: 0};
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
      const intermediate = ReportSchema.parse({...structuredClone(DEMO_REPORT),summary:`Synthetic ${ownerRole} saved plan ${target.runId}`});
      const earlier = ReportSchema.parse({...structuredClone(DEMO_REPORT),summary:`Synthetic ${ownerRole} earlier plan ${target.runId}`});
      intakeAttempted = true;
      const intake = await owner.client.from("student_intakes").insert({id:intakeId,user_id:owner.id,student_first_name:marker,submitter_role:ownerRole === "parent" ? "family" : "educator",grade_band:"11-12"});
      if (intake.error) throw new Error("Caller-RLS intake fixture failed");
      intakeCreated = true;
      reportAttempted = true;
      const report = await owner.client.from("pathway_reports").insert({id:reportId,intake_id:intakeId,user_id:owner.id,student_id:null,is_demo:true,model:"synthetic-no-ai-history",content:earlier as unknown as Json});
      if (report.error) throw new Error("Caller-RLS report fixture failed");
      reportCreated = true;
      // Real RPC and direct edit create truthful prior-content history; never seed a fabricated version.
      const retiredSave = await (owner.client as any).rpc("save_pathway_report_content_atomic", {
        _report_id:reportId,_expected_content:earlier,_next_content:intermediate,_change_summary:"Denied retired save",
      });
      expect(retiredSave.error?.code).toBe("42501");
      evidence.contextFreeRpcDenied = true;
      expect(await writeReportContent(owner.client,reportId,earlier,intermediate,"Synthetic initial save","save",null)).toBe(1);
      // Keep this actual browser on its observed intermediate revision while another
      // permitted write changes the report. No extra successful writes/versions added.
      const ownerRoleConfig = ROLES.find(r=>r.key === ownerRole)!;
      context = await browser.newContext({baseURL:target.origin,storageState:ownerRoleConfig.storageState});
      const stalePage = await context.newPage();
      await stalePage.goto(`/reports/${reportId}?audience=${reportAudience}`,{waitUntil:"domcontentloaded"});
      await expectLoadedReport(stalePage,intermediate.summary,evidence,"before-concurrent-edit");
      await expect(stalePage.getByRole("button",{name:"Restore",exact:true})).toHaveCount(1);
      const direct = await owner.client.from("pathway_reports").update({content:current as unknown as Json}).eq("id",reportId).eq("user_id",owner.id).select("id");
      if (direct.error || direct.data?.length !== 1) throw new Error("Exact direct owner edit failed");
      const beforeRestore = await owner.client.from("pathway_report_versions").select("id,version_number,content,created_by").eq("report_id",reportId).order("version_number");
      if(beforeRestore.error || beforeRestore.data.length !== 2) throw new Error("Truthful prior-content history failed");
      expect(beforeRestore.data.map(v=>v.content)).toEqual([earlier,intermediate]);
      expect(beforeRestore.data.every(v=>v.created_by===owner.id)).toBe(true);
      const forged = await owner.client.from("pathway_report_versions").insert({id:versionId,report_id:reportId,version_number:99,content:current as unknown as Json,created_by:clients.find(c=>c.id!==owner.id)!.id,change_summary:"Denied fictional fabrication"});
      expect(forged.error?.code).toBe("42501");
      for(const mutation of [
        owner.client.from("pathway_report_versions").update({content:current as unknown as Json}).eq("id",beforeRestore.data[0].id),
        owner.client.from("pathway_report_versions").delete().eq("id",beforeRestore.data[0].id),
      ]) expect((await mutation).error?.code).toBe("42501");
      evidence.rpcAndDirectEditHistory = true;
      evidence.clientHistoryFabricationDenied = true;
      evidence.linkedEditorAcceptance = "Unperformed: unlinked fixtures; no new relationship authorized";
      for (const other of clients.filter(c=>c.role !== ownerRole)) {
        const read = await other.client.from("pathway_reports").select("id").eq("id",reportId);
        if (read.error) throw new Error(`Could not verify ${other.role} read boundary`);
        expect(read.data,`${other.role} must not read this unlinked private report`).toEqual([]);
        const edit=await other.client.from("pathway_reports").update({content:earlier as unknown as Json}).eq("id",reportId).select("id");
        expect(Boolean(edit.error)||edit.data?.length===0).toBe(true);
        if (other.role === "owner") evidence.unrelatedOwnerReadDenied = true;
        await expect(writeReportContent(other.client,reportId,current,earlier,"Denied nonowner save","save",null)).rejects.toThrow("Could not save the report.");
        const forgedOther=await other.client.from("pathway_report_versions").insert({report_id:reportId,version_number:99,content:earlier as unknown as Json,created_by:other.id});
        expect(forgedOther.error?.code).toBe("42501");
      }
      const page = stalePage;
      await expectLoadedReport(page,intermediate.summary,evidence,"stale-owner-reader");
      await page.getByRole("button",{name:"Restore",exact:true}).last().click();
      await expect(page.getByText("This report has changed. Reload it before trying again.",{exact:true})).toBeVisible();
      const unchanged = await owner.client.from("pathway_reports").select("content").eq("id",reportId).single();
      if (unchanged.error) throw new Error("Stale-write readback failed");
      expect(unchanged.data.content).toEqual(current);
      const unchangedHistory = await owner.client.from("pathway_report_versions").select("id").eq("report_id",reportId);
      if (unchangedHistory.error) throw new Error("Stale-write history check failed");
      expect(unchangedHistory.data).toHaveLength(2);
      evidence.staleBrowserRestoreDeniedWithoutNewVersion = true;
      await page.reload({waitUntil:"domcontentloaded"});
      await expectLoadedReport(page,current.summary,evidence,"fresh-owner-reader");
      await expect(page.getByRole("tab",{name:audienceTabName,exact:true})).toHaveAttribute("aria-selected","true");
      const restore = page.getByRole("button",{name:"Restore",exact:true});
      await expect(restore).toHaveCount(2);
      await restore.last().click(); // One real save/restore request, no generator or sharing action.
      await expect(page.getByText(earlier.summary,{exact:true}).first()).toBeVisible();
      await page.reload({waitUntil:"domcontentloaded"});
      await expectLoadedReport(page,earlier.summary,evidence,"restored-report-reload");
      await expect(page.getByRole("tab",{name:audienceTabName,exact:true})).toHaveAttribute("aria-selected","true");
      const saved = await owner.client.from("pathway_reports").select("content").eq("id",reportId).single();
      if (saved.error) throw new Error("Saved content readback failed");
      expect((saved.data.content as Record<string,Json>).summary).toBe(earlier.summary);
      const history = await owner.client.from("pathway_report_versions").select("version_number,content,created_by").eq("report_id",reportId).order("version_number");
      if (history.error) throw new Error("Snapshot readback failed");
      expect(history.data).toHaveLength(3);
      expect(history.data[0].content).toEqual(earlier);
      expect(history.data[1].content).toEqual(intermediate);
      expect(history.data[2].content).toMatchObject({summary:current.summary});
      expect(history.data.every(v=>v.created_by===owner.id)).toBe(true);
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
