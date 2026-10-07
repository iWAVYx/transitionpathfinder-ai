import { expect, it } from "vitest";
import { projectSharedReport } from "../../src/lib/shared-report-projection";
import { DEMO_STUDENTS } from "../../src/lib/demo-data";
import { richerSharedFixture } from "../fixtures/shared-report";
const report = () => structuredClone(DEMO_STUDENTS.maya.report);
const id = "a1111111-1111-4111-8111-111111111111";
it.each(["family", "educator"] as const)("preserves the complete legacy document for %s", audience => {
  const original = report();
  expect(projectSharedReport(original, audience)).toEqual(original);
});
it.each(["family", "educator"] as const)("projects newer %s content without internal identifiers or raw manifests", audience => {
  const original = richerSharedFixture();
  const before = structuredClone(original);
  const projected = projectSharedReport(original, audience) as any;
  expect(projected.schema_version).toBe(2);
  expect(projected.student_snapshot).toEqual(original.student_snapshot);
  expect(projected.family_action_plan_v2).toEqual(original.family_action_plan_v2);
  expect(projected.inputs_used_summary).toMatchObject({ profile: true, student_voice_count: 1, iep_document_count: 1, goal_count: 2 });
  expect(projected.inputs_used).toBeUndefined();
  expect(projected.iep_plan_summary.present_levels).toBe("Recorded abilities");
  expect(JSON.stringify(projected)).not.toMatch(/a1111111|private-answer|Private notes|Hidden message|source_doc_ids|related_goal_id|resource_id|opportunity_id|partner_id/);
  expect(original).toEqual(before);
  for (const key of ["employment_pathway_recs", "resource_matches", "partner_matches"]) {
    expect(projected[key][0].sources).toEqual(audience === "family" ? [] : [{ kind: "profile", label: "A recorded profile observation" }]);
    if (audience === "family") expect(projected[key][0].source_count).toBe(1);
  }
  expect(projected.student_action_plan).toEqual(audience === "family" ? original.student_action_plan : undefined);
  expect(projected.educator_action_plan_v2).toEqual(audience === "educator" ? original.educator_action_plan_v2 : undefined);
  expect(projected.meeting_prep_questions).toHaveLength(audience === "family" ? 1 : 2);
  expect(Object.keys(projected.audience_messages)).toEqual([audience]);
  if (audience === "family") {
    expect(projected.plain_language_summary).toBe("Family summary");
    expect(projected.professional_summary).toBeUndefined();
    expect(JSON.stringify(projected)).not.toContain("Educator");
    expect(JSON.stringify(projected)).not.toContain("A recorded profile observation");
  } else {
    expect(projected.professional_summary).toBe("Educator summary");
    expect(projected.plain_language_summary).toBeUndefined();
    expect(JSON.stringify(projected)).not.toContain("Student steps");
  }
});
it.each(["family", "educator"] as const)("preserves the actual %s summary fallback", audience => {
  const original: any = richerSharedFixture();
  delete original[audience === "family" ? "plain_language_summary" : "professional_summary"];
  const projected: any = projectSharedReport(original, audience);
  expect(projected[audience === "family" ? "plain_language_summary" : "professional_summary"]).toBe(audience === "family" ? "Educator summary" : "Family summary");
});
it("strips unknown nested legacy fields", () => {
  const original: any = report(); original.career_pathways[0].private_record_id = id;
  expect(JSON.stringify(projectSharedReport(original, "family"))).not.toContain(id);
});
it("keeps legacy snapshots inside a newer report without casting them to identities", () => {
  const original = { ...report(), schema_version: 2 };
  expect(projectSharedReport(original, "family")?.student_snapshot).toEqual(original.student_snapshot);
});
it.each([null, [], {}, { ...report(), schema_version: 3 }, { ...report(), career_pathways: "invalid" },
  { ...report(), schema_version: 2, educator_action_plan_v2: { intro: "Malformed hidden plan" } },
  { ...report(), schema_version: 2, inputs_used: { iep_doc_ids: ["invalid-id"] } },
  { ...report(), student_snapshot: { private_notes: "invalid snapshot" } }])(
  "rejects malformed or unsupported source documents before projection", content => {
    expect(projectSharedReport(content, "family")).toBeNull();
  },
);
it("fails closed without a supported audience", () => {
  expect(projectSharedReport(report(), "student" as any)).toBeNull();
  expect(projectSharedReport(report(), undefined as any)).toBeNull();
});
