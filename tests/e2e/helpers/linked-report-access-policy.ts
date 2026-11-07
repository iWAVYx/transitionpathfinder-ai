import { reportHistoryAcceptanceTarget } from "./report-history-acceptance-policy";

export function linkedReportAccessTarget(env: Record<string, string | undefined>) {
  const sharing = env.RUN_LINKED_REPORT_SHARE_LIFECYCLE_QA === "true";
  const confirmation = sharing ? "disposable-linked-report-sharing" : "disposable-linked-report-access";
  if (
    env.RUN_LINKED_REPORT_ACCESS_STAGING_QA !== "true" ||
    env.LINKED_REPORT_ACCESS_CONFIRMATION !== confirmation
  )
    throw new Error("Explicit linked-report fixture authorization required");
  return reportHistoryAcceptanceTarget({
    ...env,
    RUN_REPORT_HISTORY_STAGING_QA: "true",
    REPORT_HISTORY_FIXTURE_CONFIRMATION: "disposable-report-history",
    REPORT_HISTORY_QA_RUN_ID: env.LINKED_REPORT_ACCESS_RUN_ID,
  });
}
