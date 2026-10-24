import { expect, it } from "vitest";
import { reportSectionHistory } from "../../src/lib/report-section-history";
import { recordGeneratedSections } from "../../src/lib/report-section-updates";
import { liveReportContents } from "../../src/lib/report-contents";
import { getLegacyReportSnapshot } from "../../src/lib/report-snapshot-contract";
import { projectSharedReport } from "../../src/lib/shared-report-projection";
import { richerSharedFixture } from "../fixtures/shared-report";
const at = "2026-10-12T18:00:00.000Z";
const items = (r: any, audience: "student" | "family" | "educator") => liveReportContents({ ...r, student_snapshot: getLegacyReportSnapshot(r) }, "Maya", { hasV2: true, audience });
it("does not infer section dates from global report/input dates", () => {
  const source = { ...richerSharedFixture(), inputs_used: { generated_at: at } };
  const rows = reportSectionHistory(source, items(source, "family"), "family", true);
  expect(rows.length).toBeGreaterThan(10);
  expect(rows.every(row => row.recordedAt === undefined)).toBe(true);
});
it("distinguishes recorded newer updates from retained goals with unknown history", () => {
  const old = richerSharedFixture();
  const source = recordGeneratedSections(old, { spin: { strengths: ["Current strength"] }, confidence: { overall: "low" } }, at);
  const rows = reportSectionHistory(source, items(source, "family"), "family", true);
  expect(rows.find(row => row.field === "postsecondary_goals")!.recordedAt).toBeUndefined();
  expect(rows.find(row => row.field === "confidence")).toMatchObject({ operation: "generated", recordedAt: at });
  expect(rows.find(row => row.field === "spin_analysis")!.label).toContain("Detailed Profile");
  expect(rows.find(row => row.field === "spin")!.label).toContain("Profile Summary");
});
it.each(["student", "family", "educator"] as const)("%s history follows actual visible sections, not every stored field", audience => {
  const source = recordGeneratedSections(undefined, richerSharedFixture(), at);
  const rows = reportSectionHistory(source, items(source, audience), audience, true);
  expect(rows.some(row => row.field === "educator_action_plan_v2")).toBe(audience === "educator");
  expect(rows.some(row => row.field === "student_action_plan")).toBe(audience !== "educator");
  expect(rows.some(row => row.field === "teacher_action_plan")).toBe(false);
  expect(rows.find(row => row.label === "At a Glance Summary")!.field).toBe(audience === "educator" ? "professional_summary" : "plain_language_summary");
});
it.each(["family", "educator"] as const)("shared %s history respects fixed projection and never exposes write markers or private IDs", audience => {
  const source = recordGeneratedSections(undefined, richerSharedFixture(), at);
  const projected = projectSharedReport(source, audience)!;
  const rows = reportSectionHistory(projected, items(projected, audience), audience, true);
  expect(JSON.stringify(rows)).not.toMatch(/write_id|a1111111|private-answer|source_doc_ids/);
  expect(rows.find(row => row.field === "inputs_used")!.recordedAt).toBeUndefined();
  expect(rows.some(row => row.field === "educator_action_plan_v2")).toBe(audience === "educator");
});
it("does not attribute an externally supplied action plan or live student/partner responses to stored report dates", () => {
  const source = recordGeneratedSections(undefined, richerSharedFixture(), at);
  const visible = [...items(source, "student"), { id: "sec-your-voice", label: "Your Voice" }, { id: "sec-partner-suggestions", label: "Partner Suggestions" }];
  const rows = reportSectionHistory(source, visible, "student", true, true);
  expect(rows.some(row => row.field === "thirty_day_plan")).toBe(false);
  expect(rows.some(row => /Your Voice|Partner Suggestions/.test(row.label))).toBe(false);
});
it("uses the actual recorded summary fallback and deduplicates repeated source rows", () => {
  const source = recordGeneratedSections(undefined, { ...richerSharedFixture(), plain_language_summary: " ", professional_summary: "Recorded fallback" }, at);
  const visible = items(source, "family");
  const rows = reportSectionHistory(source, [...visible, ...visible], "family", true);
  expect(rows[0].field).toBe("professional_summary");
  expect(new Set(rows.map(row => row.field)).size).toBe(rows.length);
});
