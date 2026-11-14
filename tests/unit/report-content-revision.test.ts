import { expect, it } from "vitest";
import {
  reportContentRevision,
  assertObservedReportRevision,
} from "@/lib/report-content-revision.server";
const report = {
  id: "report-a",
  student_id: "student-a",
  content: { summary: "Legacy report without a write marker", goals: ["One", "Two"] },
};
it("legacy JSON and object key ordering have a stable revision", async () => {
  const revision = await reportContentRevision(report);
  expect(revision).toMatch(/^[a-f0-9]{64}$/);
  expect(
    await reportContentRevision({
      ...report,
      content: { goals: ["One", "Two"], summary: report.content.summary },
    }),
  ).toBe(revision);
  await expect(assertObservedReportRevision(revision, report)).resolves.toBeUndefined();
});
it.each([
  { ...report, id: "other-report" },
  { ...report, student_id: "other-student" },
  { ...report, content: { ...report.content, goals: ["Two", "One"] } },
  { ...report, content: { ...report.content, summary: "Newer edit" } },
  { ...report, content: { ...report.content, section_updates: { write_id: "new-write" } } },
])("different report, student or content invalidates observed revision %#", async (current) => {
  await expect(
    assertObservedReportRevision(await reportContentRevision(report), current),
  ).rejects.toThrow("Reload");
});
