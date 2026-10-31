import { afterEach, expect, it, vi } from "vitest";
import { runAdmittedDocumentOperation } from "../../src/lib/document-operation-admission.server";
import { runAdmittedSummaryOperation } from "../../supabase/functions/ai-job-processor/document-operation-admission";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
afterEach(() => vi.restoreAllMocks());
const scenarios = ["success", "paused", "missing-rpc", "lost-begin", "begin-error", "foreign-begin", "begin-token", "begin-extra", "revision-zero", "revision-string", "revision-unsafe", "work-error", "work-mark-lost", "work-mark-error", "lost-finish", "finish-error", "foreign-finish", "finish-state", "finish-extra", "missing-finish"];
it.each(scenarios)("worker and app preserve the same no-replay/hold protocol on %s", async mode => {
  vi.spyOn(crypto, "randomUUID").mockReturnValue(id(1));
  const results = [];
  for (const worker of [false, true]) {
    const calls: { name: string; args: Record<string, unknown> }[] = [];
    const work = vi.fn(async () => { if (mode.startsWith("work-")) throw Error("PRIVATE provider body"); return "verified"; });
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      if (name === "begin_document_operation") {
        if (mode === "lost-begin") throw Error("PRIVATE lost begin");
        if (["paused", "missing-rpc"].includes(mode)) return { data: null, error: { message: "PRIVATE control" } };
        return { data: { schema: "document-operation-admitted-v1", operation_id: mode === "foreign-begin" ? id(9) : id(1), receipt_id: mode === "begin-token" ? "invalid" : id(2), revision: mode === "revision-zero" ? 0 : mode === "revision-string" ? "2" : mode === "revision-unsafe" ? Number.MAX_SAFE_INTEGER + 1 : 2, ...(mode === "begin-extra" ? { private: "PRIVATE" } : {}) }, error: mode === "begin-error" ? { message: "PRIVATE" } : null };
      }
      if (["lost-finish", "work-mark-lost"].includes(mode)) throw Error("PRIVATE lost finish");
      return { data: mode === "missing-finish" ? null : { schema: "document-operation-finished-v1", operation_id: mode === "foreign-finish" ? id(9) : id(1), state: mode === "finish-state" ? "needs_review" : args._outcome, ...(mode === "finish-extra" ? { private: "PRIVATE" } : {}) }, error: ["finish-error", "work-mark-error"].includes(mode) ? { message: "PRIVATE" } : null };
    });
    let result: unknown;
    try { result = await (worker ? runAdmittedSummaryOperation({ rpc }, id(3), work) : runAdmittedDocumentOperation({ serviceClient: { rpc }, actorId: id(3), kind: "summary" }, work)); }
    catch (error: any) { result = { phase: error.phase, held: error.reconciliationRequired }; expect(String(error)).not.toContain("PRIVATE"); expect(error.cause).toBeUndefined(); }
    expect(work.mock.calls.every(args => args.length === 0)).toBe(true);
    expect(calls[0].args._operation_kind).toBe("summary");
    expect(calls.filter(call => call.name === "begin_document_operation")).toHaveLength(1);
    expect(calls.filter(call => call.name === "finish_document_operation").length).toBeLessThanOrEqual(1);
    results.push({ result, calls, workCalls: work.mock.calls.length });
  }
  expect(results[1]).toEqual(results[0]);
});
it.each(["invalid", "00000000-0000-0000-8000-000000000001", "PRIVATE actor"])("worker rejects malformed server actor %s before admission", async actor => {
  const rpc = vi.fn(), work = vi.fn(); await expect(runAdmittedSummaryOperation({ rpc }, actor, work)).rejects.toMatchObject({ phase: "admission" }); expect(rpc).not.toHaveBeenCalled(); expect(work).not.toHaveBeenCalled();
});
it("worker keeps provider work active until its callback actually settles", async () => {
  let resolve!: () => void;
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => ({ data: name === "begin_document_operation" ? { schema: "document-operation-admitted-v1", operation_id: args._operation_id, receipt_id: id(2), revision: 1 } : { schema: "document-operation-finished-v1", operation_id: args._operation_id, state: args._outcome }, error: null }));
  const work = vi.fn(() => new Promise<void>(done => { resolve = done; }));
  const pending = runAdmittedSummaryOperation({ rpc }, id(3), work); await vi.waitFor(() => expect(work).toHaveBeenCalledOnce()); expect(rpc).toHaveBeenCalledOnce(); resolve(); await pending; expect(rpc).toHaveBeenCalledTimes(2);
});
