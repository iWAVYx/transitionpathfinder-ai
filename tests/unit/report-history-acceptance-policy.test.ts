import { DEMO_REPORT } from "../../src/lib/demo-data";
import { ReportSchema } from "../../src/lib/pathway-generation-contract";
import { expect, it } from "vitest";
import { reportHistoryAcceptanceTarget } from "../e2e/helpers/report-history-acceptance-policy";
const valid = {RUN_REPORT_HISTORY_STAGING_QA:"true",REPORT_HISTORY_FIXTURE_CONFIRMATION:"disposable-report-history",REPORT_HISTORY_QA_RUN_ID:"123-1",PLAYWRIGHT_BASE_URL:"https://transitionforward-staging.caysi101.workers.dev",STAGING_SUPABASE_URL:"https://qgrertkqbwanerqqemph.supabase.co",STAGING_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_synthetic",E2E_EXPECTED_BUILD_SHA:"a".repeat(40),EXPECTED_RUNTIME_SOURCE_FINGERPRINT:"b".repeat(64)};
it("allows only explicitly confirmed isolated caller-RLS targets",()=>expect(reportHistoryAcceptanceTarget(valid).origin).toBe(valid.PLAYWRIGHT_BASE_URL));
it.each(["RUN_REPORT_HISTORY_STAGING_QA","REPORT_HISTORY_FIXTURE_CONFIRMATION","REPORT_HISTORY_QA_RUN_ID","E2E_EXPECTED_BUILD_SHA","EXPECTED_RUNTIME_SOURCE_FINGERPRINT"])("refuses missing %s before fixture work",key=>expect(()=>reportHistoryAcceptanceTarget({...valid,[key]:""})).toThrow());
it.each(["https://transitionforwardct.com","https://gentle-forward-reach.lovable.app","https://transitionforward-staging.caysi101.workers.dev/?token=unexpected"])("refuses application target %s",target=>expect(()=>reportHistoryAcceptanceTarget({...valid,PLAYWRIGHT_BASE_URL:target})).toThrow());
it("refuses production backend",()=>expect(()=>reportHistoryAcceptanceTarget({...valid,STAGING_SUPABASE_URL:"https://lrqcntqyekucamifpffs.supabase.co"})).toThrow());
it("refuses a service key even if a public key is also present",()=>expect(()=>reportHistoryAcceptanceTarget({...valid,STAGING_SUPABASE_SERVICE_ROLE_KEY:"not-allowed"})).toThrow());
it.each(["sb_secret_forbidden","invalid",`header.${Buffer.from(JSON.stringify({role:"service_role"})).toString("base64url")}.signature`])("refuses non-public fixture key %s",key=>expect(()=>reportHistoryAcceptanceTarget({...valid,STAGING_SUPABASE_PUBLISHABLE_KEY:key})).toThrow());

it("uses a real renderable synthetic report contract for disposable history data",()=>{
  expect(ReportSchema.parse({...structuredClone(DEMO_REPORT),summary:"Synthetic owner earlier plan"}).summary).toBe("Synthetic owner earlier plan");
});
