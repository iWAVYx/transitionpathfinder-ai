// Worker-local, SDK-free counterpart of the application admission adapter.
// No app-source imports, provider retries, hold expiry or cleanup capability.
// Current source/claim authority must be verified before calling this adapter.
const uuid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
type RpcClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
export class SummaryAdmissionError extends Error {
  readonly reconciliationRequired = true;
  constructor(readonly phase: "admission" | "work" | "completion") {
    super("This document summary needs review before another attempt.");
    this.name = "SummaryAdmissionError";
  }
}
function exact(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key))) throw new Error();
  return value as Record<string, unknown>;
}
function identity(value: unknown): string {
  if (typeof value !== "string" || !uuid.test(value)) throw new Error();
  return value;
}
/** The metadata service capability and receipt never enter the work callback.
 * Lost begin means no work/finish. Work errors get one needs_review finish;
 * uncertain finish never retries or reports success, even after a real commit. */
export async function runAdmittedSummaryOperation<T>(serviceClient: unknown, actorId: string, work: () => Promise<T>): Promise<T> {
  let operation: string, actor: string, receipt: string;
  const client = serviceClient as RpcClient;
  try {
    actor = identity(actorId);
    if (typeof work !== "function") throw new Error();
    operation = identity(crypto.randomUUID());
    const result = await client.rpc("begin_document_operation", {
      _operation_id: operation, _actor_id: actor, _operation_kind: "summary",
    });
    const row = exact(result.data, ["schema", "operation_id", "receipt_id", "revision"]);
    if (result.error || row.schema !== "document-operation-admitted-v1" || identity(row.operation_id) !== operation ||
        !Number.isSafeInteger(row.revision) || (row.revision as number) < 1) throw new Error();
    receipt = identity(row.receipt_id);
  } catch { throw new SummaryAdmissionError("admission"); }
  const finish = async (outcome: "completed" | "needs_review") => {
    const result = await client.rpc("finish_document_operation", {
      _operation_id: operation, _actor_id: actor, _receipt_id: receipt, _outcome: outcome,
    });
    const row = exact(result.data, ["schema", "operation_id", "state"]);
    if (result.error || row.schema !== "document-operation-finished-v1" || identity(row.operation_id) !== operation || row.state !== outcome) throw new Error();
  };
  let value: T;
  try { value = await work(); }
  catch {
    try { await finish("needs_review"); } catch { /* Retain active work for trusted reconciliation. */ }
    throw new SummaryAdmissionError("work");
  }
  try { await finish("completed"); } catch { throw new SummaryAdmissionError("completion"); }
  return value;
}
