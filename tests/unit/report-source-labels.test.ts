import { expect, it } from "vitest";
import { reportSourceLabels } from "../../src/lib/report-source-summary";
it("does not infer sources from generated content or missing metadata", () => {
  expect(reportSourceLabels({ student_snapshot: {}, goals: ["Goal"] })).toEqual(["The source list was not recorded for this report."]);
  for (const value of [null, [], "invalid"]) expect(reportSourceLabels({ inputs_used: value })).toEqual(["The source list was not recorded for this report."]);
});
it("uses recorded raw inputs without exposing identifiers", () => {
  const report = { inputs_used: { profile: true, intake: true, student_voice_keys: ["private-response"], goal_ids: ["private-goal"], readiness_category_count: 2 } };
  expect(reportSourceLabels(report)).toEqual(["Student Profile", "Pathway Builder Responses", "Student Voice", "Transition Goals", "Readiness Check"]);
  expect(report.inputs_used.student_voice_keys).toEqual(["private-response"]);
});
it("supports counts-only shared reports and rejects malformed counts", () => {
  expect(reportSourceLabels({ inputs_used_summary: { iep_document_count: 2, family_priorities_count: 1, readiness_at: "2026-10-07" } })).toEqual(["IEP Documents", "Readiness Check", "Family Priorities"]);
  expect(reportSourceLabels({ inputs_used_summary: { profile: "true", goal_count: -1, iep_document_count: Infinity, student_voice_count: 1.5, readiness_at: " " } })).toEqual(["No inputs are listed in this report’s recorded source list."]);
});
it("honors an explicit empty raw manifest over conflicting projected counts", () => {
  expect(reportSourceLabels({ inputs_used: {}, inputs_used_summary: { iep_document_count: 3 } })).toEqual(["No inputs are listed in this report’s recorded source list."]);
});
