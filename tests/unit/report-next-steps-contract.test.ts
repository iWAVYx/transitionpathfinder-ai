import { expect, it } from "vitest";
import { DEMO_STUDENTS } from "@/lib/demo-data";
import { prepareReportNextSteps } from "@/lib/report-next-steps-contract";
const legacy = () => structuredClone(DEMO_STUDENTS.maya.report);
it("preserves complete planning text, lists and measurement conditions without mutating the report", () => {
  const report = { ...legacy(), summary: "A report sentence. ".repeat(200) + "FINAL CONTEXT: two independent steps with written directions; proposed target four." };
  const before = structuredClone(report), parsed = JSON.parse(prepareReportNextSteps(report));
  expect(parsed.summary).toBe(report.summary); expect(parsed.thirty_day_plan).toEqual(report.thirty_day_plan); expect(report).toEqual(before);
});
it("includes current v2 planning context but omits unrelated IDs, identity metadata and unrecognized fields", () => {
  const report = { ...legacy(), schema_version: 2, plain_language_summary: "Current planning summary", student_snapshot: { display_name: "PRIVATE FULL NAME", grade: "11-12", school: "PRIVATE SCHOOL", last_updated: "2026-10-26" }, inputs_used: { profile: true, iep_doc_ids: ["11111111-1111-4111-8111-111111111111"] }, education_training_recs: [{ title: "An option", summary: "Preview the program", why: "A reported interest", sources: [{ kind: "profile", id: "PRIVATE-REFERENCE", label: "Reported profile" }], next_action: "Ask about access", owner_role: "family" }], unrelated: "PRIVATE UNKNOWN VALUE" };
  const json = prepareReportNextSteps(report), next = JSON.parse(json);
  expect(next.plain_language_summary).toBe("Current planning summary"); expect(next.student_snapshot.grade).toBe("11-12");
  for (const text of ["PRIVATE FULL NAME", "PRIVATE SCHOOL", "PRIVATE-REFERENCE", "PRIVATE UNKNOWN VALUE", "11111111-1111-4111-8111-111111111111"]) expect(json).not.toContain(text);
});
it.each([null, undefined, {}, { summary: "Only a summary" }, { ...legacy(), schema_version: 99 }])("rejects unsupported/incomplete input before preparing context %#", report => expect(() => prepareReportNextSteps(report)).toThrow("not ready for next-step suggestions"));
it.each(["x", "界"])("rejects an oversized UTF-8 context instead of truncating it (%s)", char => {
  expect(() => prepareReportNextSteps({ ...legacy(), summary: char.repeat(120000) })).toThrow("too long for next-step suggestions");
});
