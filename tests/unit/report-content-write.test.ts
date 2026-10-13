import { expect, it, vi } from "vitest";
import { writeReportContent } from "../../src/lib/report-content-write.server";
const report = "11111111-1111-4111-8111-111111111111";
it.each([null, [], "text", undefined])("invalid observed content %j stops before the RPC", async current => {
  const client = { rpc: vi.fn() };
  await expect(writeReportContent(client as any, report, current, { summary: "Changed" }, null, "save")).rejects.toThrow("Could not save the report.");
  expect(client.rpc).not.toHaveBeenCalled();
});
it("oversized summary fails without a database request or silent truncation", async () => {
  const client = { rpc: vi.fn() };
  await expect(writeReportContent(client as any, report, {}, {}, "x".repeat(501), "regenerate")).rejects.toThrow("Could not save the regenerated report.");
  expect(client.rpc).not.toHaveBeenCalled();
});
it("serialization failure does not send a partial payload or private error text", async () => {
  const cycle: any = {}; cycle.self = cycle;
  const client = { rpc: vi.fn() };
  await expect(writeReportContent(client as any, report, {}, cycle, null, "save")).rejects.toThrow("Could not save the report.");
  expect(client.rpc).not.toHaveBeenCalled();
});
it("stored content uses ordinary JSON normalization and retains explicit nulls", async () => {
  const client = { rpc: vi.fn().mockResolvedValue({ data: 1, error: null }) };
  expect(await writeReportContent(client as any, report, { summary: "Prior", unset: undefined }, { summary: null, unset: undefined }, null, "save")).toBe(1);
  expect(client.rpc).toHaveBeenCalledWith("save_pathway_report_content_atomic", { _report_id: report, _expected_content: { summary: "Prior" }, _next_content: { summary: null }, _change_summary: null });
});
