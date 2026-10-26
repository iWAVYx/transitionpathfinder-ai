import { reportHistoryAcceptanceTarget } from "./report-history-acceptance-policy";
export const REPORT_ASSIST_BUDGET = { students: 2, intakes: 2, reports: 2, historyVersions: 0, translationActions: 2, suggestionActions: 2, modelInvocationsMax: 4, sdkAttemptsMax: 12, screenshots: 2, pdfs: 0, testRetries: 0 } as const;
export function reportAssistLiveTarget(env: Record<string, string | undefined>) {
  if (env.RUN_REPORT_ASSIST_LIVE_QA !== "true" || env.REPORT_ASSIST_CONFIRMATION !== "disposable-report-assist") throw Error("Explicit bounded report-assist authorization required");
  if (new URL(env.PLAYWRIGHT_BASE_URL ?? "").href !== "https://gentle-forward-reach.lovable.app/") throw Error("Refusing non-isolated report-assist application");
  const fileCount = Number(env.EXPECTED_RUNTIME_SOURCE_FILE_COUNT);
  if (!Number.isSafeInteger(fileCount) || fileCount < 1) throw Error("Verified file count required");
  const target = reportHistoryAcceptanceTarget({ ...env, PLAYWRIGHT_BASE_URL: "https://transitionforward-staging.caysi101.workers.dev/", RUN_REPORT_HISTORY_STAGING_QA: "true", REPORT_HISTORY_FIXTURE_CONFIRMATION: "disposable-report-history", REPORT_HISTORY_QA_RUN_ID: env.REPORT_ASSIST_RUN_ID });
  return { ...target, origin: "https://gentle-forward-reach.lovable.app", controlOrigin: target.origin, fileCount };
}
