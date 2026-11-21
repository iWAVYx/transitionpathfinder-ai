import { reportHistoryAcceptanceTarget } from "./report-history-acceptance-policy";
export const IEP_EXTRACTION_BUDGET = {
  students: 0, intakes: 0, reports: 0, documents: 0, goals: 0, evidenceLinks: 0,
  extractionActions: 2, modelInvocationsMax: 2, sdkAttemptsMax: 6,
  screenshots: 2, pdfs: 0, testRetries: 0,
} as const;
export function iepExtractionLiveTarget(env: Record<string, string | undefined>) {
  if (env.RUN_IEP_EXTRACTION_LIVE_QA !== "true" || env.IEP_EXTRACTION_CONFIRMATION !== "synthetic-iep-only")
    throw Error("Explicit no-save IEP extraction authorization required");
  if (new URL(env.PLAYWRIGHT_BASE_URL ?? "").href !== "https://gentle-forward-reach.lovable.app/")
    throw Error("Refusing non-isolated IEP extraction application");
  const fileCount = Number(env.EXPECTED_RUNTIME_SOURCE_FILE_COUNT);
  if (!Number.isSafeInteger(fileCount) || fileCount < 1) throw Error("Verified file count required");
  const target = reportHistoryAcceptanceTarget({ ...env,
    PLAYWRIGHT_BASE_URL: "https://transitionforward-staging.caysi101.workers.dev/",
    RUN_REPORT_HISTORY_STAGING_QA: "true", REPORT_HISTORY_FIXTURE_CONFIRMATION: "disposable-report-history",
    REPORT_HISTORY_QA_RUN_ID: env.IEP_EXTRACTION_RUN_ID,
  });
  return { ...target, origin: "https://gentle-forward-reach.lovable.app", controlOrigin: target.origin, fileCount };
}
export function syntheticIepText(role: "parent" | "educator") {
  if (role !== "parent" && role !== "educator") throw Error("Unexpected IEP extraction role");
  return `Fictional IEP excerpt for ${role === "parent" ? "Avery" : "Rowan"}, grade 11-12. This is a synthetic test, not a real student's record.
Strengths: patient with animals and careful when sorting supplies. Interests: animal care and visual art.
Needs: written instructions and extra processing time. Accommodations explicitly documented: written checklists and a quiet workspace.
Assistive technology explicitly documented: text-to-speech for written instructions.
Current transition goal: a proposed draft target of completing four animal-care routine steps using a written checklist. The proposed target is not adopted by the team and is not evidence of progress.
Readiness evidence: a family-reported baseline of two routine steps with one verbal prompt and a written checklist, reported October 1, 2026. No longitudinal progress data or independently verified observation is supplied.
Family concern: access to quiet community practice. Student's recorded words: I want to work with animals.
No school names, last names, birth dates, addresses, contact details, current service commitments or eligibility decisions are supplied.`;
}
