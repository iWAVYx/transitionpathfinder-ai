import { reportHistoryAcceptanceTarget } from "./report-history-acceptance-policy";
export function pptLiveAcceptanceTarget(env: Record<string, string | undefined>) {
  if (
    env.RUN_PPT_LIVE_STAGING_QA !== "true" ||
    env.PPT_FIXTURE_CONFIRMATION !== "disposable-ppt-live"
  )
    throw Error("Explicit bounded PPT live authorization required");
  const app = new URL(env.PLAYWRIGHT_BASE_URL ?? "");
  if (app.href !== "https://gentle-forward-reach.lovable.app/")
    throw Error("Refusing non-isolated PPT application");
  const count = Number(env.EXPECTED_RUNTIME_SOURCE_FILE_COUNT);
  if (!Number.isSafeInteger(count) || count < 1) throw Error("Verified source file count required");
  const target = reportHistoryAcceptanceTarget({
    ...env,
    PLAYWRIGHT_BASE_URL: "https://transitionforward-staging.caysi101.workers.dev/",
    RUN_REPORT_HISTORY_STAGING_QA: "true",
    REPORT_HISTORY_FIXTURE_CONFIRMATION: "disposable-report-history",
    REPORT_HISTORY_QA_RUN_ID: env.PPT_QA_RUN_ID,
  });
  return { ...target, origin: app.origin, controlOrigin: target.origin, fileCount: count };
}
