import { expect, it } from "vitest";
import { projectSharedReport } from "../../src/lib/shared-report-projection";
import { DEMO_STUDENTS } from "../../src/lib/demo-data";
const report = () => structuredClone(DEMO_STUDENTS.maya.report);
it("preserves every valid legacy document field without modifying the stored source", () => {
  const original = report();
  expect(projectSharedReport(original)).toEqual(original);
});
it("strips undisplayed fields and internal source identifiers at the response boundary", () => {
  const original = { ...report(), private_notes: "Private notes", schema_version: 2,
    inputs_used: { iep_doc_ids: ["private-document-id"] },
    evidence_used: [{ student_voice_record_id: "private-answer-id" }],
    educator_action_plan_v2: { intro: "Undisplayed plan" },
  } as any;
  original.career_pathways[0].private_record_id = "private-nested-id";
  original.student_snapshot.private_notes = "Private snapshot notes";
  const projected = projectSharedReport(original);
  expect(projected).toBeTruthy();
  const serialized = JSON.stringify(projected);
  expect(serialized).not.toMatch(/private-|Private|Undisplayed|inputs_used|evidence_used|schema_version/);
  expect(projected?.career_pathways[0].title).toBe(original.career_pathways[0].title);
  expect(original.inputs_used.iep_doc_ids).toEqual(["private-document-id"]);
});
it("does not cast a regenerated identity snapshot into the legacy snapshot reader", () => {
  const original = { ...report(), schema_version: 2, student_snapshot: { display_name: "Maya", grade: "12" } };
  const projected = projectSharedReport(original);
  expect(projected?.summary).toBe(original.summary);
  expect(projected?.student_snapshot).toBeUndefined();
});
it.each([null, [], {}, { ...report(), career_pathways: "invalid" }, { ...report(), student_snapshot: { private_notes: "invalid snapshot" } }])(
  "rejects content that cannot safely render with the existing reader", content => {
    expect(projectSharedReport(content)).toBeNull();
  },
);
