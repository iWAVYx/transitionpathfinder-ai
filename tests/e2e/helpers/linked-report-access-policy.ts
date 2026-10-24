import { reportHistoryAcceptanceTarget } from "./report-history-acceptance-policy";

export function linkedReportAccessTarget(env: Record<string, string | undefined>) {
  if (
    env.RUN_LINKED_REPORT_ACCESS_STAGING_QA !== "true" ||
    env.LINKED_REPORT_ACCESS_CONFIRMATION !== "disposable-linked-report-access"
  )
    throw new Error("Explicit linked-report fixture authorization required");
  return reportHistoryAcceptanceTarget({
    ...env,
    RUN_REPORT_HISTORY_STAGING_QA: "true",
    REPORT_HISTORY_FIXTURE_CONFIRMATION: "disposable-report-history",
    REPORT_HISTORY_QA_RUN_ID: env.LINKED_REPORT_ACCESS_RUN_ID,
  });
}
