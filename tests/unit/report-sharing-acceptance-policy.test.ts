import {expect,it} from "vitest";
import {reportSharingAcceptanceTarget} from "../e2e/helpers/report-sharing-acceptance-policy";
const env={RUN_REPORT_SHARING_STAGING_QA:"true",REPORT_SHARING_FIXTURE_CONFIRMATION:"disposable-report-sharing",REPORT_SHARING_QA_RUN_ID:"123-1",PLAYWRIGHT_BASE_URL:"https://transitionforward-staging.caysi101.workers.dev",STAGING_SUPABASE_URL:"https://qgrertkqbwanerqqemph.supabase.co",STAGING_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_synthetic",E2E_EXPECTED_BUILD_SHA:"a".repeat(40),EXPECTED_RUNTIME_SOURCE_FINGERPRINT:"b".repeat(64)};
it("accepts only the explicit sharing scope with verified isolated identity",()=>expect(reportSharingAcceptanceTarget(env).runId).toBe("123-1"));
it.each(["RUN_REPORT_SHARING_STAGING_QA","REPORT_SHARING_FIXTURE_CONFIRMATION","REPORT_SHARING_QA_RUN_ID","E2E_EXPECTED_BUILD_SHA","EXPECTED_RUNTIME_SOURCE_FINGERPRINT"])("refuses missing %s before fixtures",name=>expect(()=>reportSharingAcceptanceTarget({...env,[name]:""})).toThrow());
it("does not reuse history fixture consent",()=>expect(()=>reportSharingAcceptanceTarget({...env,REPORT_SHARING_FIXTURE_CONFIRMATION:"disposable-report-history"})).toThrow());
it("rejects production and privileged fixture clients",()=>{
 expect(()=>reportSharingAcceptanceTarget({...env,STAGING_SUPABASE_URL:"https://lrqcntqyekucamifpffs.supabase.co"})).toThrow();
 expect(()=>reportSharingAcceptanceTarget({...env,STAGING_SUPABASE_SERVICE_ROLE_KEY:"not-allowed"})).toThrow();
});
