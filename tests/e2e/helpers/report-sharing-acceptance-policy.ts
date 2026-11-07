import { reportHistoryAcceptanceTarget } from "./report-history-acceptance-policy";
export function reportSharingAcceptanceTarget(env: Record<string,string|undefined>) {
  if (env.RUN_REPORT_SHARING_STAGING_QA !== "true" || env.REPORT_SHARING_FIXTURE_CONFIRMATION !== "disposable-report-sharing") throw new Error("Explicit disposable report-sharing authorization is required");
  return reportHistoryAcceptanceTarget({...env,RUN_REPORT_HISTORY_STAGING_QA:"true",REPORT_HISTORY_FIXTURE_CONFIRMATION:"disposable-report-history",REPORT_HISTORY_QA_RUN_ID:env.REPORT_SHARING_QA_RUN_ID});
}
