import { reportHistoryAcceptanceTarget } from "./report-history-acceptance-policy";
export const PATHWAY_CREATOR_BUDGET = {
  roles: 2,
  initialInvocations: 2,
  regenerationInvocations: 2,
  modelInvocationsMax: 6,
  sdkAttemptsMax: 18,
  students: 2,
  intakes: 2,
  reports: 2,
  historyVersions: 2,
  pdfs: 2,
} as const;
export function pathwayCreatorTarget(env: Record<string, string | undefined>) {
  if (
    env.RUN_PATHWAY_CREATOR_QA !== "true" ||
    env.PATHWAY_CREATOR_CONFIRMATION !== "disposable-pathway-creator"
  )
    throw Error("Explicit bounded Pathway creator authorization required");
  if (new URL(env.PLAYWRIGHT_BASE_URL ?? "").href !== "https://gentle-forward-reach.lovable.app/")
    throw Error("Refusing non-isolated Pathway application");
  const fileCount = Number(env.EXPECTED_RUNTIME_SOURCE_FILE_COUNT);
  if (!Number.isSafeInteger(fileCount) || fileCount < 1)
    throw Error("Verified file count required");
  const target = reportHistoryAcceptanceTarget({
    ...env,
    PLAYWRIGHT_BASE_URL: "https://transitionforward-staging.caysi101.workers.dev/",
    RUN_REPORT_HISTORY_STAGING_QA: "true",
    REPORT_HISTORY_FIXTURE_CONFIRMATION: "disposable-report-history",
    REPORT_HISTORY_QA_RUN_ID: env.PATHWAY_CREATOR_RUN_ID,
  });
  return {
    ...target,
    origin: "https://gentle-forward-reach.lovable.app",
    controlOrigin: target.origin,
    fileCount,
  };
}
