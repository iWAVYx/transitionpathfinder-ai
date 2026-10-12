import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ provider: vi.fn(() => { throw new Error("No provider requests in list checks"); }) }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, validator: () => builder, handler: (fn: any) => fn };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../../src/lib/ai-gateway.server", () => ({ createLovableAiGatewayProvider: state.provider }));
import { listPptPreps } from "@/lib/ppt.functions";
import { listMyReports } from "@/lib/pathway.functions";
afterEach(() => { vi.restoreAllMocks(); state.provider.mockClear(); });
function context(rows: any[], options: { failTable?: string; failFrom?: number; failBatch?: number; missingCount?: boolean } = {}) {
  const calls: { table: string; query: any; ids?: string[] }[] = [];
  let batch = 0;
  const from = vi.fn((table: string) => {
    const call: typeof calls[number] = { table, query: null };
    const query: any = {};
    for (const method of ["select", "eq", "order"]) query[method] = vi.fn(() => query);
    query.in = vi.fn((_field: string, ids: string[]) => { call.ids = ids; batch++; return query; });
    query.range = vi.fn(async (start: number, end: number) => {
      if (options.failTable === table && (options.failFrom === start || options.failBatch === batch))
        return { data: null, error: { message: "Unavailable" }, count: null };
      const data = table === "students"
        ? (call.ids ?? []).map(id => ({ id, first_name: "Fictional", last_name: id })) : rows;
      return { data: data.slice(start, end + 1), error: null, count: options.missingCount ? null : data.length };
    });
    call.query = query; calls.push(call); return query;
  });
  return { context: { userId: "synthetic-owner", supabase: { from } }, calls };
}
const prepRows = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `prep-${i}`, student_name: "Fictional Student", meeting_date: null, created_at: "2026-10-12T12:00:00Z" }));
const reportRows = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `report-${i}`, student_id: `student-${i}`, created_at: "2026-10-12T12:00:00Z", content: { summary: `Summary ${i}` }, student_intakes: { student_first_name: "Fictional", grade_band: "12" } }));
it("failed history reads remain distinct from a genuinely empty history", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const failed = context([], { failTable: "ppt_meeting_preps", failFrom: 0 });
  expect(await (listPptPreps as any)({ context: failed.context })).toEqual({ preps: [], loadFailed: true });
  const empty = context([]);
  expect(await (listPptPreps as any)({ context: empty.context })).toEqual({ preps: [], loadFailed: false });
  expect(state.provider).not.toHaveBeenCalled();
});
it("loads older meeting plans across database pages with the caller scope on every page", async () => {
  const rows = prepRows(1205); const input = context(rows);
  expect(await (listPptPreps as any)({ context: input.context })).toEqual({ preps: rows, loadFailed: false });
  expect(input.calls).toHaveLength(3);
  for (const { query } of input.calls) {
    expect(query.eq).toHaveBeenCalledWith("user_id", "synthetic-owner");
    expect(query.select).toHaveBeenCalledWith("id, student_name, meeting_date, created_at", { count: "exact" });
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.order).toHaveBeenCalledWith("id", { ascending: false });
  }
  expect(state.provider).not.toHaveBeenCalled();
});
it("does not expose a partial meeting history after a later page fails", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const input = context(prepRows(501), { failTable: "ppt_meeting_preps", failFrom: 500 });
  expect(await (listPptPreps as any)({ context: input.context })).toEqual({ preps: [], loadFailed: true });
});
it("retains older student reports and resolves every linked name in bounded batches", async () => {
  const rows = reportRows(605); const input = context(rows);
  const result = await (listMyReports as any)({ context: input.context });
  expect(result.loadFailed).toBe(false); expect(result.reports).toHaveLength(605);
  expect(result.reports[604]).toMatchObject({ id: "report-604", student_id: "student-604", summary: "Summary 604", linked_student_name: "Fictional student-604" });
  const reports = input.calls.filter(c => c.table === "pathway_reports");
  expect(reports).toHaveLength(2);
  for (const { query } of reports) {
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.order).toHaveBeenCalledWith("id", { ascending: false });
    expect(query.select.mock.calls[0][1]).toEqual({ count: "exact" });
  }
  const students = input.calls.filter(c => c.table === "students");
  expect(students.map(c => c.ids?.length)).toEqual([100, 100, 100, 100, 100, 100, 5]);
  for (const { query } of students) expect(query.select).toHaveBeenCalledWith("id, first_name, last_name", { count: "exact" });
  expect(state.provider).not.toHaveBeenCalled();
});
it.each([
  { failTable: "pathway_reports", failFrom: 500 },
  { failTable: "students", failBatch: 2 },
  { missingCount: true },
])("fails the report library honestly if complete records or linked names cannot load: %j", async (options) => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const input = context(reportRows(605), options);
  expect(await (listMyReports as any)({ context: input.context })).toEqual({ reports: [], loadFailed: true });
});
it("an empty report library does not query student names", async () => {
  const input = context([]);
  expect(await (listMyReports as any)({ context: input.context })).toEqual({ reports: [], loadFailed: false });
  expect(input.calls.map(c => c.table)).toEqual(["pathway_reports"]);
});
