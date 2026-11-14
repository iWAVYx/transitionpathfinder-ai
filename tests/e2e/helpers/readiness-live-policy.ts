import { reportHistoryAcceptanceTarget } from "./report-history-acceptance-policy";
export const READINESS_LIVE_BUDGET = { students: 2, readinessRows: 1, generationActions: 2, modelInvocationsMax: 2, sdkAttemptsMax: 6, screenshots: 2, testRetries: 0 } as const;
export function readinessLiveTarget(env: Record<string, string | undefined>) {
  if (env.RUN_READINESS_LIVE_QA !== "true" || env.READINESS_FIXTURE_CONFIRMATION !== "disposable-readiness-live") throw Error("Explicit bounded Readiness authorization required");
  if (new URL(env.PLAYWRIGHT_BASE_URL ?? "").href !== "https://gentle-forward-reach.lovable.app/") throw Error("Refusing non-isolated Readiness application");
  const fileCount = Number(env.EXPECTED_RUNTIME_SOURCE_FILE_COUNT);
  if (!Number.isSafeInteger(fileCount) || fileCount < 1) throw Error("Verified file count required");
  const target = reportHistoryAcceptanceTarget({ ...env, PLAYWRIGHT_BASE_URL: "https://transitionforward-staging.caysi101.workers.dev/", RUN_REPORT_HISTORY_STAGING_QA: "true", REPORT_HISTORY_FIXTURE_CONFIRMATION: "disposable-report-history", REPORT_HISTORY_QA_RUN_ID: env.READINESS_QA_RUN_ID });
  return { ...target, origin: "https://gentle-forward-reach.lovable.app", controlOrigin: target.origin, fileCount };
}
