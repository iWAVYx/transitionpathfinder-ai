import { expect, it, vi } from "vitest";
import { writeReportContent } from "../../src/lib/report-content-write.server";
const report = "11111111-1111-4111-8111-111111111111";
it.each([null, [], "text", undefined])("invalid observed content %j stops before the RPC", async current => {
  const client = { rpc: vi.fn() };
  await expect(writeReportContent(client as any, report, current, { summary: "Changed" }, null, "save", null)).rejects.toThrow("Could not save the report.");
  expect(client.rpc).not.toHaveBeenCalled();
});
it("oversized summary fails without a database request or silent truncation", async () => {
  const client = { rpc: vi.fn() };
  await expect(writeReportContent(client as any, report, {}, {}, "x".repeat(501), "regenerate", null)).rejects.toThrow("Could not save the regenerated report.");
  expect(client.rpc).not.toHaveBeenCalled();
});
it("serialization failure does not send a partial payload or private error text", async () => {
  const cycle: any = {}; cycle.self = cycle;
  const client = { rpc: vi.fn() };
  await expect(writeReportContent(client as any, report, {}, cycle, null, "save", null)).rejects.toThrow("Could not save the report.");
  expect(client.rpc).not.toHaveBeenCalled();
});
it("stored content uses ordinary JSON normalization and retains explicit nulls", async () => {
  const client = { rpc: vi.fn().mockResolvedValue({ data: 1, error: null }) };
  expect(await writeReportContent(client as any, report, { summary: "Prior", unset: undefined }, { summary: null, unset: undefined }, null, "save", null)).toBe(1);
  expect(client.rpc).toHaveBeenCalledWith("save_pathway_report_content_for_student", { _report_id: report, _expected_student_id: null, _expected_content: { summary: "Prior" }, _next_content: { summary: null }, _change_summary: null });
});
it.each([undefined, "", "not-a-student", 42, {}])("invalid or missing student context %j stops before the RPC", async student => {
  const client = { rpc: vi.fn() };
  await expect(writeReportContent(client as any, report, {}, {}, null, "save", student as any)).rejects.toThrow("Could not save the report.");
  expect(client.rpc).not.toHaveBeenCalled();
});
it.each(["save", "regenerate"] as const)("%s carries the observed linked student and never falls back after a conflict", async operation => {
  const student = "22222222-2222-4222-8222-222222222222";
  const client = { rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "40001", message: "Private context" } }) };
  await expect(writeReportContent(client as any, report, {}, {}, null, operation, student)).rejects.toThrow("Reload");
  expect(client.rpc).toHaveBeenCalledExactlyOnceWith("save_pathway_report_content_for_student", { _report_id: report, _expected_student_id: student, _expected_content: {}, _next_content: {}, _change_summary: null });
});
