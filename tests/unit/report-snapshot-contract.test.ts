import { expect, it } from "vitest";
import { getLegacyReportSnapshot } from "../../src/lib/report-snapshot-contract";
import { liveReportContents } from "../../src/lib/report-contents";
import { DEMO_STUDENTS } from "../../src/lib/demo-data";
it("preserves every valid legacy snapshot field", () => {
  const report = structuredClone(DEMO_STUDENTS.maya.report);
  expect(getLegacyReportSnapshot(report)).toEqual(report.student_snapshot);
});
it("does not invent legacy snapshot details for a regenerated identity block", () => {
  const report = { ...DEMO_STUDENTS.maya.report, schema_version: 2,
    student_snapshot: { display_name: "Maya Rivera", grade: "12", school: "Fictional school", plan_type: "IEP" },
  };
  const normalized = { ...report, student_snapshot: getLegacyReportSnapshot(report) };
  expect(normalized.student_snapshot).toBeUndefined();
  expect(liveReportContents(normalized, "Maya", { hasV2: true }).some(item => item.id === "sec-snapshot")).toBe(false);
  expect(report.student_snapshot.school).toBe("Fictional school");
});
it.each([null, {}, { student_snapshot: { grade_level: "12" } }, { student_snapshot: "invalid" }])(
  "omits unavailable or incompatible snapshots instead of creating placeholder evidence", report => {
    expect(getLegacyReportSnapshot(report)).toBeUndefined();
  },
);
