import { expect, it } from "vitest";
import { prepareReportTranslation } from "../../src/lib/report-translation-contract";
import { DEMO_STUDENTS } from "../../src/lib/demo-data";
const legacy = () => structuredClone(DEMO_STUDENTS.maya.report);
const horizon = { thirty_day: ["First action"], ninety_day: ["Second action"], six_month: ["Third action"], one_year: ["Fourth action"] };
function rich() {
  return { ...legacy(), schema_version: 2,
    student_snapshot: { display_name: "Maya Rivera", grade: "12", school: "Fictional School", district: "Fictional District", case_manager: "Casey", plan_type: "IEP", last_updated: "2026-10-06", headline: "A supported plan" },
    employment_pathway_recs: [{ title: "Supported visit", summary: "An accessible career visit", why: "Based on an observation", sources: [{ kind: "profile", id: "private-source-id", label: "Recorded observation" }], related_goal_id: "private-goal-id", next_action: "Confirm the visit", owner_role: "case_manager", timeframe: "30_day", discuss_at_next_meeting: true }],
    resource_matches: [{ title: "Visit guide", url: "https://example.test/guide", resource_id: "00000000-0000-4000-8000-000000000001", why: "Helps prepare", sources: [{ kind: "profile", label: "Profile" }], next_action: "Read the guide", owner_role: "family" }],
    student_action_plan: { intro: "Student steps", horizons: horizon },
    family_action_plan_v2: { intro: "Family steps", horizons: horizon },
    educator_action_plan_v2: { intro: "Team steps", horizons: horizon },
    meeting_prep_questions: [{ question: "What should we review?", for_audience: "team", why: "Keep supports current" }],
    readiness_indicators: [{ domain: "Education", level: "progressing", note: "Recorded readiness note" }],
    confidence: { overall: "medium", rationale: "Some input is missing" },
    needs_review_flags: [{ section: "student_voice", reason: "Review the answers", owner_role: "educator" }],
    inputs_used: { iep_doc_ids: ["00000000-0000-4000-8000-000000000002"], student_voice_keys: ["private-answer-id"], generated_at: "2026-10-06T12:00:00Z" },
    unknown_private_data: { text: "Do not send to the provider" },
  };
}
const translated = (prepared: ReturnType<typeof prepareReportTranslation>) => ({ translations: prepared.texts.map(item => ({ id: item.id, text: `Translated: ${item.text}` })) });
it.each([legacy, rich])("translates all selected document text while preserving object structure and source data", fixture => {
  const source = fixture(); const before = structuredClone(source);
  const prepared = prepareReportTranslation(source); const output = prepared.apply(translated(prepared));
  expect(output.summary).toBe(`Translated: ${source.summary}`);
  expect(output.strengths_snapshot).toEqual(source.strengths_snapshot.map(text => `Translated: ${text}`));
  expect(output.thirty_day_plan.map(item => item.week)).toEqual(source.thirty_day_plan.map(item => item.week));
  expect(output.recommended_pathways?.map(item => item.type)).toEqual(source.recommended_pathways?.map(item => item.type));
  expect(output.readiness_scorecard?.map(item => item.level)).toEqual(source.readiness_scorecard?.map(item => item.level));
  expect(source).toEqual(before);
});
it("preserves names, machine values, identifiers, dates, URLs and unrecognized metadata in newer reports", () => {
  const source = rich(); const prepared = prepareReportTranslation(source); const output = prepared.apply(translated(prepared)) as any;
  expect(output.student_snapshot).toMatchObject({ display_name: "Maya Rivera", school: "Fictional School", case_manager: "Casey", grade: "12", last_updated: "2026-10-06", headline: "Translated: A supported plan" });
  expect(output.employment_pathway_recs[0]).toMatchObject({ owner_role: "case_manager", timeframe: "30_day", related_goal_id: "private-goal-id", discuss_at_next_meeting: true });
  expect(output.employment_pathway_recs[0].sources[0]).toEqual({ kind: "profile", id: "private-source-id", label: "Translated: Recorded observation" });
  expect(output.resource_matches[0].url).toBe(source.resource_matches[0].url);
  expect(output.resource_matches[0].resource_id).toBe(source.resource_matches[0].resource_id);
  expect(output.inputs_used).toEqual(source.inputs_used);
  expect(output.unknown_private_data).toEqual(source.unknown_private_data);
  expect(output.schema_version).toBe(2);
  expect(output.meeting_prep_questions[0].for_audience).toBe("team");
  expect(output.readiness_indicators[0].level).toBe("progressing");
  expect(output.confidence.overall).toBe("medium");
  expect(output.needs_review_flags[0].section).toBe("student_voice");
  const payload = JSON.stringify(prepared.texts);
  for (const privateValue of ["private-source-id", "private-goal-id", "private-answer-id", "Do not send to the provider", "Fictional School", "Maya Rivera", "https://example.test/guide"]) expect(payload).not.toContain(privateValue);
  for (const role of ["student_action_plan", "family_action_plan_v2", "educator_action_plan_v2"]) expect(output[role].horizons.one_year).toEqual(["Translated: Fourth action"]);
});
it.each(["missing", "duplicate", "unknown", "blank", "wrong-type", "extra-field"])("rejects %s output instead of creating a partial report", defect => {
  const prepared = prepareReportTranslation(legacy()); const output: any = translated(prepared);
  if (defect === "missing") output.translations.pop();
  if (defect === "duplicate") output.translations[1].id = output.translations[0].id;
  if (defect === "unknown") output.translations[0].id = 99999;
  if (defect === "blank") output.translations[0].text = " ";
  if (defect === "wrong-type") output.translations[0].text = 12;
  if (defect === "extra-field") output.translations[0].owner_role = "family";
  expect(() => prepared.apply(output)).toThrow();
});
it("matches translations by id even when the provider changes their ordering", () => {
  const prepared = prepareReportTranslation(legacy()); const output = translated(prepared);
  output.translations.reverse();
  expect(prepared.apply(output).summary).toBe(`Translated: ${legacy().summary}`);
});
it.each([null, {}, { ...legacy(), schema_version: 3 }])("rejects unsupported source reports before preparing provider data", source => {
  expect(() => prepareReportTranslation(source)).toThrow("This report is not ready for translation");
});
it("rejects oversized document text instead of truncating it", () => {
  expect(() => prepareReportTranslation({ ...legacy(), summary: "Long text ".repeat(15000) })).toThrow("too long");
});
