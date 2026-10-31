import { reportHistoryAcceptanceTarget } from "./report-history-acceptance-policy";
export const EVIDENCE_LIVE_BUDGET = { students: 2, evidenceLinksMax: 24, extractionActions: 2, modelInvocationsMax: 2, sdkAttemptsMax: 6, duplicateRpcChecks: 2, screenshots: 2, uploads: 0, reports: 0, testRetries: 0 } as const;
export const EVIDENCE_SOURCE_LABEL = "BridgeForward intake answers";
export function evidenceLiveTarget(env: Record<string, string | undefined>) {
 if (env.RUN_EVIDENCE_LIVE_QA !== "true" || env.EVIDENCE_FIXTURE_CONFIRMATION !== "disposable-evidence-live") throw Error("Explicit bounded evidence authorization required");
 if (new URL(env.PLAYWRIGHT_BASE_URL ?? "").href !== "https://gentle-forward-reach.lovable.app/") throw Error("Refusing non-isolated evidence application");
 const fileCount=Number(env.EXPECTED_RUNTIME_SOURCE_FILE_COUNT);
 if (!Number.isSafeInteger(fileCount) || fileCount<1) throw Error("Verified file count required");
 const target=reportHistoryAcceptanceTarget({...env,PLAYWRIGHT_BASE_URL:"https://transitionforward-staging.caysi101.workers.dev/",RUN_REPORT_HISTORY_STAGING_QA:"true",REPORT_HISTORY_FIXTURE_CONFIRMATION:"disposable-report-history",REPORT_HISTORY_QA_RUN_ID:env.EVIDENCE_QA_RUN_ID});
 return {...target,origin:"https://gentle-forward-reach.lovable.app",controlOrigin:target.origin,fileCount};
}
export const syntheticEvidenceText = "Fictional middle-school planning notes. The family reports a baseline of two familiar routine steps with a written checklist and one verbal prompt on October 1, 2026. A four-step target is a proposed draft, not adopted by the team and not measured progress. Written directions and a quiet workspace are listed supports. Text-to-speech is listed as assistive technology; actual use has not been observed. The student reports an interest in animal care and art. No longitudinal progress data or verified program placement is provided.";
