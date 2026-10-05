import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import type { Database } from "../../../src/integrations/supabase/types";
import { ROLES } from "../helpers/roles";

const host = "gentle-forward-reach.lovable.app";
const enabled = process.env.RUN_PPT_LIVE_STAGING_QA === "true";
const roles = [ROLES.find(r => r.key === "parent")!, ROLES.find(r => r.key === "educator")!];
test.describe.configure({ mode: "serial", retries: 0 });
test.skip(!enabled, "Protected manual PPT acceptance is not enabled");
test.skip(enabled && roles.some(r => !existsSync(r.storageState)), "Synthetic sessions are missing");

for (const role of roles) {
  test(`${role.key} generates, saves, reopens and prints one synthetic PPT packet`, async ({ browser }, testInfo) => {
    const url = process.env.STAGING_SUPABASE_URL ?? "";
    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "";
    if (new URL(url).hostname !== "qgrertkqbwanerqqemph.supabase.co" || new URL(baseURL).hostname !== host) throw new Error("Refusing non-isolated PPT targets");
    const key = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("Protected staging fixture credential missing");
    const admin = createClient<Database>(url, key, {auth:{persistSession:false,autoRefreshToken:false}});
    const email = role.key === "parent" ? "e2e.parent@staging.transitionforwardct.test" : "e2e.educator@staging.transitionforwardct.test";
    const {data:profile,error:profileError} = await admin.from("profiles").select("id").eq("email",email).single();
    if (profileError || !profile) throw new Error("Synthetic PPT profile missing");
    const marker = `QA PPT ${process.env.PPT_QA_RUN_ID ?? "protected"} ${role.key}`;
    let intakeId = "", reportId = "", prepId = "";
    const context = await browser.newContext({baseURL,storageState:role.storageState});
    try {
      const {data:intake,error:ie} = await admin.from("student_intakes").insert({user_id:profile.id,student_first_name:marker,submitter_role:role.key === "parent" ? "family" : "educator",grade_band:"11-12",current_goals:"Complete four culinary work steps using a visual checklist; baseline two independent steps.",family_concerns:"Clarify how progress is measured across settings."}).select("id").single();
      if (ie || !intake) throw new Error("Synthetic intake creation failed");
      intakeId = intake.id;
      const {data:report,error:re} = await admin.from("pathway_reports").insert({user_id:profile.id,intake_id:intakeId,is_demo:true,model:"synthetic-ppt-fixture",content:{summary:"Synthetic planning context only, not a reviewed IEP.",student_voice:"I want to learn at a culinary job site.",strengths:["Careful practical problem solving"],supports:["Visual checklist and written directions"],information_to_verify:["No dated progress log or current service minutes supplied"]}}).select("id").single();
      if (re || !report) throw new Error("Synthetic report creation failed");
      reportId = report.id;
      const page = await context.newPage();
      await page.goto("/ppt-prep");
      await page.getByRole("combobox",{name:"Pathway Report to build from"}).click();
      await page.getByRole("option").filter({hasText:marker}).click();
      await page.getByLabel("What's on your mind going in?").fill(role.key === "parent" ? "Family: progress logs do not show how independent steps are measured; ask for evidence and student choice." : "Educator: agree on baseline, prompting conditions, data collection responsibilities and family input.");
      await page.getByLabel("What do you want to walk out with?").fill("Agree on a measurable culinary transition goal, supports, data collection owner and review date. Identify missing evidence rather than assume services.");
      // Exactly one click/request per role; no fallback generation or retry.
      await page.getByRole("button",{name:"Generate meeting prep",exact:true}).click();
      await page.waitForURL(/\/ppt-prep\?id=[0-9a-f-]+/i,{timeout:240_000});
      prepId = new URL(page.url()).searchParams.get("id") ?? "";
      expect(prepId).toMatch(/^[0-9a-f-]{36}$/i);
      const {data:packet,error:pe} = await admin.from("ppt_meeting_preps").select("id,user_id,report_id,agenda").eq("id",prepId).single();
      if (pe || !packet) throw new Error("Generated PPT was not persisted");
      expect(packet.user_id).toBe(profile.id); expect(packet.report_id).toBe(reportId);
      const a = packet.agenda as any;
      expect(a.agenda.length).toBeGreaterThanOrEqual(4); expect(a.agenda.length).toBeLessThanOrEqual(7);
      expect(a.questions_to_ask.length).toBeGreaterThanOrEqual(4);
      expect(a.evidence_to_bring.length).toBeGreaterThanOrEqual(3);
      expect(a.language_that_works.length).toBeGreaterThanOrEqual(3);
      expect(a.language_that_works.join(" ")).toMatch(/family/i);
      expect(a.language_that_works.join(" ")).toMatch(/educator/i);
      await page.reload();
      await expect(page.getByText(a.opening_note,{exact:true})).toBeVisible({timeout:30_000});
      await expect(page.getByRole("heading",{name:"Suggested Agenda"})).toBeVisible();
      const other = roles.find(r => r.key !== role.key)!;
      const denied = await browser.newContext({baseURL,storageState:other.storageState});
      try {
        const deniedPage = await denied.newPage(); await deniedPage.goto(`/ppt-prep?id=${prepId}`);
        await deniedPage.waitForURL(/\/ppt-prep\/?$/,{timeout:30_000});
        await expect(deniedPage.getByText(a.opening_note,{exact:true})).toHaveCount(0);
      } finally { await denied.close(); }
      await page.emulateMedia({media:"print"});
      await expect(page.getByRole("button",{name:"Print / save as PDF"})).toBeHidden();
      const pdf = await page.pdf({path:testInfo.outputPath(`${role.key}-synthetic-ppt.pdf`),format:"A4",printBackground:true});
      expect(pdf.length).toBeGreaterThan(1000);
      await page.screenshot({path:testInfo.outputPath(`${role.key}-synthetic-ppt-print.png`),fullPage:true});
    } finally {
      await context.close();
      if (reportId) {
        const {error} = await admin.from("ppt_meeting_preps").delete().eq("report_id",reportId).eq("user_id",profile.id); if(error)throw new Error("PPT fixture cleanup failed");
        const {count,error:ce} = await admin.from("ppt_meeting_preps").select("id",{count:"exact",head:true}).eq("report_id",reportId); if(ce || count !== 0)throw new Error("PPT cleanup audit failed");
        const {error:re} = await admin.from("pathway_reports").delete().eq("id",reportId).eq("user_id",profile.id); if(re)throw new Error("Report cleanup failed");
      }
      if(intakeId){const {error} = await admin.from("student_intakes").delete().eq("id",intakeId).eq("user_id",profile.id);if(error)throw new Error("Intake cleanup failed");}
    }
  });
}
